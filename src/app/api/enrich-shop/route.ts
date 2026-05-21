// POST /api/enrich-shop
// Harvests first-party data about the authenticated owner's shop, runs
// synthesis via Claude Sonnet 4.6, and stores both raw + synthesized output
// in the shops row. The raw cache enables cheap re-runs of synthesis without
// re-paying third-party APIs.
//
// Optional query params:
//   ?skip_synthesis=1  — harvest-only (debug / staged rollout)
//
// See shopdesk/design-docs/2026-04-23-enrichment-engine.md.

import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { harvestShop } from '@/lib/enrichment/harvest'
import { synthesizeShop, type SynthesisOutput } from '@/lib/enrichment/synthesize'
import type { Enrichment } from '@/types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .select('id, name, address, industry, website_url, enrichment')
    .eq('owner_id', user.id)
    .single()

  if (shopError || !shop) {
    return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
  }
  if (!shop.name) {
    return NextResponse.json({ error: 'Shop name required before enrichment' }, { status: 400 })
  }

  // Rate limit: 60 seconds between enrichment attempts per owner. Atomic
  // compare-and-swap via update-where — if enriched_at is null or older
  // than 60s, claim the lock by writing a fresh timestamp. Concurrent
  // requests lose the race and get 429. Bounds cost amplification from
  // authenticated users looping enrichment. Same pattern as provision-shop.
  const sixtySecondsAgo = new Date(Date.now() - 60_000).toISOString()
  const { data: claimed } = await supabase
    .from('shops')
    .update({ enriched_at: new Date().toISOString() })
    .eq('owner_id', user.id)
    .or(`enriched_at.is.null,enriched_at.lt.${sixtySecondsAgo}`)
    .select('id')
    .single()

  if (!claimed) {
    return NextResponse.json(
      { error: 'Enrichment was just run. Please wait a minute before trying again.' },
      { status: 429 },
    )
  }

  // Optional override from the request body — lets admin or debug tools
  // re-harvest with a different name/address combination without updating
  // the shop row.
  let overrideName: string | undefined
  let overrideAddress: string | undefined
  try {
    const body = await request.json().catch(() => ({})) as { name?: string; address?: string }
    overrideName = body.name
    overrideAddress = body.address
  } catch {
    // body is optional — ignore
  }

  const { searchParams } = new URL(request.url)
  const skipSynthesis = searchParams.get('skip_synthesis') === '1'

  const harvestStart = Date.now()
  const raw = await harvestShop({
    shopName: overrideName ?? shop.name,
    shopAddress: overrideAddress ?? shop.address,
    websiteUrl: (shop as { website_url?: string | null }).website_url ?? undefined,
  })
  const harvestMs = Date.now() - harvestStart

  // Persist raw first so synthesis failures don't lose what we paid to fetch.
  const { error: rawError } = await supabase
    .from('shops')
    .update({ enrichment_raw: raw })
    .eq('id', shop.id)
  if (rawError) {
    console.error('[enrich-shop] failed to persist enrichment_raw:', rawError)
    return NextResponse.json({ error: 'Failed to save enrichment' }, { status: 500 })
  }

  const sources = {
    places: Boolean(raw.places),
    website: Boolean(raw.website),
    serpapi: Boolean(raw.serpapi),
  }

  if (skipSynthesis) {
    return NextResponse.json({
      success: true,
      stage: 'harvest-only',
      duration_ms: { harvest: harvestMs },
      sources,
    })
  }

  // Synthesis. Failures here must not take out the route — the raw cache is
  // already persisted, so the owner can re-run synthesis later.
  let synthesized: SynthesisOutput | null = null
  let synthesisError: string | null = null
  const synthStart = Date.now()
  try {
    synthesized = await synthesizeShop(raw, { industry: shop.industry })
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      synthesisError = `Anthropic ${err.status}: ${err.message}`
    } else {
      synthesisError = err instanceof Error ? err.message : 'unknown synthesis error'
    }
    console.error('[enrich-shop] synthesis failed:', synthesisError)
  }
  const synthMs = Date.now() - synthStart

  if (synthesized) {
    const existingDescription = (shop.enrichment as { businessDescription?: string } | null)?.businessDescription ?? null
    const enrichment: Enrichment = {
      ...synthesized,
      synthesized_at: new Date().toISOString(),
      owner_reviewed: false,
      owner_reviewed_at: null,
      website_scraped: Boolean(raw.website),
      ...(existingDescription ? { businessDescription: existingDescription } : {}),
    }
    const { error: enrichError } = await supabase
      .from('shops')
      .update({ enrichment, enriched_at: new Date().toISOString() })
      .eq('id', shop.id)
    if (enrichError) {
      console.error('[enrich-shop] failed to persist enrichment:', enrichError)
      return NextResponse.json({ error: 'Failed to save synthesis' }, { status: 500 })
    }
  }

  return NextResponse.json({
    success: synthesized !== null,
    stage: synthesized ? 'complete' : 'harvest-only (synthesis failed)',
    duration_ms: { harvest: harvestMs, synthesis: synthMs },
    sources,
    confidence: synthesized?.confidence.overall ?? null,
    synthesis_error: synthesisError,
  })
}
