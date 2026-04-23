// POST /api/enrich-shop
// Harvests first-party data about the authenticated owner's shop and stores
// it in shops.enrichment_raw. Synthesis is a separate step (Ship 2) — this
// route is harvest-only so the raw cache is always available for cheap re-runs.
// See shopdesk/design-docs/2026-04-23-enrichment-engine.md.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { harvestShop } from '@/lib/enrichment/harvest'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .select('id, name, address')
    .eq('owner_id', user.id)
    .single()

  if (shopError || !shop) {
    return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
  }
  if (!shop.name) {
    return NextResponse.json({ error: 'Shop name required before enrichment' }, { status: 400 })
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

  const started = Date.now()
  const raw = await harvestShop({
    shopName: overrideName ?? shop.name,
    shopAddress: overrideAddress ?? shop.address,
  })
  const duration = Date.now() - started

  const { error: updateError } = await supabase
    .from('shops')
    .update({ enrichment_raw: raw })
    .eq('id', shop.id)

  if (updateError) {
    console.error('[enrich-shop] failed to persist enrichment_raw:', updateError)
    return NextResponse.json({ error: 'Failed to save enrichment' }, { status: 500 })
  }

  const sources = {
    places: raw.places ? true : false,
    website: raw.website ? true : false,
    serpapi: raw.serpapi ? true : false,
  }

  return NextResponse.json({
    success: true,
    duration_ms: duration,
    sources,
  })
}
