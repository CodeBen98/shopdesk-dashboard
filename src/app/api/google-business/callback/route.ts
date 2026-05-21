import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { harvestGBP } from '@/lib/enrichment/harvest-gbp'
import { synthesizeShop } from '@/lib/enrichment/synthesize'
import type { Enrichment, EnrichmentRaw } from '@/types'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.shopdesk.site'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // User denied consent
  if (error || !code) {
    console.warn('[gbp-callback] OAuth denied or missing code:', error)
    return NextResponse.redirect(`${APP_URL}/dashboard?gbp=denied`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${APP_URL}/dashboard?gbp=error`)
  }

  // Verify the authenticated user matches the state parameter (CSRF guard)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== state) {
    return NextResponse.redirect(`${APP_URL}/dashboard?gbp=error`)
  }

  const redirectUri = process.env.GOOGLE_REDIRECT_URI ||
    `${APP_URL}/api/google-business/callback`

  // Exchange authorization code for tokens
  let accessToken: string
  let refreshToken: string
  let expiresIn: number
  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    })
    const tokenData = await tokenRes.json() as {
      access_token?: string
      refresh_token?: string
      expires_in?: number
      error?: string
    }
    if (!tokenData.access_token || !tokenData.refresh_token) {
      console.error('[gbp-callback] token exchange failed:', tokenData.error)
      return NextResponse.redirect(`${APP_URL}/dashboard?gbp=error`)
    }
    accessToken = tokenData.access_token
    refreshToken = tokenData.refresh_token
    expiresIn = tokenData.expires_in ?? 3600
  } catch (err) {
    console.error('[gbp-callback] token exchange error:', err)
    return NextResponse.redirect(`${APP_URL}/dashboard?gbp=error`)
  }

  const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString()

  // Fetch the shop
  const { data: shop } = await supabase
    .from('shops')
    .select('id, name, address, industry, website_url, enrichment')
    .eq('owner_id', user.id)
    .single()

  if (!shop) {
    return NextResponse.redirect(`${APP_URL}/dashboard?gbp=error`)
  }

  // Pull GBP location data
  const { data: gbpData, refreshed } = await harvestGBP({
    accessToken,
    refreshToken,
    expiry: tokenExpiry,
  })

  const finalAccessToken = refreshed?.accessToken ?? accessToken
  const finalExpiry = refreshed?.expiry ?? tokenExpiry

  // Persist OAuth tokens + location name
  await supabase.from('shops').update({
    gbp_refresh_token: refreshToken,
    gbp_access_token: finalAccessToken,
    gbp_token_expiry: finalExpiry,
    gbp_location_name: gbpData?.locationName ?? null,
    // Backfill shop fields from GBP when not already set
    ...(gbpData?.phone && !shop.address ? { phone: gbpData.phone } : {}),
    ...(gbpData?.address && !shop.address ? { address: gbpData.address } : {}),
    ...(gbpData?.websiteUri && !(shop as { website_url?: string | null }).website_url
      ? { website_url: gbpData.websiteUri }
      : {}),
    ...(gbpData?.hours ? { hours: gbpData.hours } : {}),
  }).eq('owner_id', user.id)

  // Build EnrichmentRaw and run synthesis using the GBP data
  const raw: EnrichmentRaw = {
    gbp: gbpData ?? null,
    harvested_at: new Date().toISOString(),
  }

  await supabase.from('shops').update({ enrichment_raw: raw }).eq('id', shop.id)

  let synthesized = null
  try {
    synthesized = await synthesizeShop(raw, { industry: shop.industry })
  } catch (err) {
    console.error('[gbp-callback] synthesis error (non-fatal):', err)
  }

  if (synthesized) {
    const existingDescription =
      (shop.enrichment as { businessDescription?: string } | null)?.businessDescription ?? null
    const enrichment: Enrichment = {
      ...synthesized,
      synthesized_at: new Date().toISOString(),
      owner_reviewed: false,
      owner_reviewed_at: null,
      website_scraped: false,  // GBP path — no website scrape
      ...(existingDescription ? { businessDescription: existingDescription } : {}),
    }
    await supabase.from('shops').update({
      enrichment,
      enriched_at: new Date().toISOString(),
      onboarding_step: 'auto_fill_review',
    }).eq('owner_id', user.id)
  } else {
    await supabase.from('shops').update({
      onboarding_step: 'auto_fill_review',
    }).eq('owner_id', user.id)
  }

  return NextResponse.redirect(`${APP_URL}/dashboard?gbp=connected`)
}
