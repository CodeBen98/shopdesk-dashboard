// First-party data harvesting for shop enrichment.
// Pulls Google Places v1 (structured fields + reviews) and the shop's website
// (via Jina AI Reader) in parallel. SerpAPI is stubbed for v1.1 — when the
// env var is set, owner replies and GBP Services will flow in without code changes.
// See shopdesk/design-docs/2026-04-23-enrichment-engine.md.

import type { EnrichmentRaw } from '@/types'

const PLACES_FIELD_MASK = [
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.regularOpeningHours',
  'places.websiteUri',
  'places.editorialSummary',
  'places.primaryType',
  'places.types',
  'places.rating',
  'places.userRatingCount',
  'places.reviews',
  'places.priceLevel',
].join(',')

type HarvestInput = {
  shopName: string
  shopAddress?: string
}

type PlaceRecord = {
  websiteUri?: string
  [key: string]: unknown
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function harvestPlaces(input: HarvestInput): Promise<PlaceRecord | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.warn('[enrichment.harvest] GOOGLE_PLACES_API_KEY not set — skipping Places')
    return null
  }
  const textQuery = `${input.shopName} ${input.shopAddress ?? ''}`.trim()
  const start = Date.now()
  try {
    const res = await fetchWithTimeout('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': PLACES_FIELD_MASK,
      },
      body: JSON.stringify({ textQuery, pageSize: 1 }),
    })
    const dur = Date.now() - start
    if (!res.ok) {
      const body = await res.text()
      console.error(`[enrichment.harvest] places ${res.status} (${dur}ms):`, body.slice(0, 300))
      return null
    }
    const data = await res.json() as { places?: PlaceRecord[] }
    console.log(`[enrichment.harvest] places ok (${dur}ms)`)
    return data.places?.[0] ?? null
  } catch (err) {
    console.error('[enrichment.harvest] places error:', err)
    return null
  }
}

async function harvestWebsite(url: string): Promise<{ url: string; markdown: string } | null> {
  if (!url) return null
  // Jina AI Reader — https://jina.ai/reader. Free tier, no key required for
  // low volume. Converts any URL to clean markdown and handles JS-heavy sites.
  const reader = `https://r.jina.ai/${url}`
  const start = Date.now()
  try {
    const res = await fetchWithTimeout(reader, {
      headers: {
        Accept: 'text/plain',
        ...(process.env.JINA_API_KEY ? { Authorization: `Bearer ${process.env.JINA_API_KEY}` } : {}),
      },
    }, 20000)
    const dur = Date.now() - start
    if (!res.ok) {
      console.error(`[enrichment.harvest] website ${res.status} (${dur}ms) url=${url}`)
      return null
    }
    const markdown = await res.text()
    console.log(`[enrichment.harvest] website ok (${dur}ms) len=${markdown.length}`)
    // Cap size so we never blow up the LLM context. Most small-shop sites
    // produce well under 50KB of markdown; cap protects the edge case.
    return { url, markdown: markdown.slice(0, 80_000) }
  } catch (err) {
    console.error('[enrichment.harvest] website error:', err)
    return null
  }
}

async function harvestSerpApi(_input: HarvestInput): Promise<unknown | null> {
  // Reserved for v1.1. When SERPAPI_KEY is set, this will pull owner replies
  // to Google reviews and the Google Business Profile Services tab. Today
  // we return null so the synthesis step treats owner-reply signal as absent.
  if (!process.env.SERPAPI_KEY) return null
  console.log('[enrichment.harvest] SerpAPI key present but integration not yet implemented')
  return null
}

export async function harvestShop(input: HarvestInput): Promise<EnrichmentRaw> {
  const places = await harvestPlaces(input)
  const websiteUri = places?.websiteUri
  const [website, serpapi] = await Promise.all([
    websiteUri ? harvestWebsite(websiteUri) : Promise.resolve(null),
    harvestSerpApi(input),
  ])
  return {
    places: places ?? undefined,
    website: website ?? null,
    serpapi: serpapi ?? null,
    harvested_at: new Date().toISOString(),
  }
}
