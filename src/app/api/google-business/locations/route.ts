import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listGBPLocations, refreshGBPToken } from '@/lib/enrichment/harvest-gbp'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: shop } = await supabase
    .from('shops')
    .select('id, gbp_access_token, gbp_refresh_token, gbp_token_expiry')
    .eq('owner_id', user.id)
    .single()

  const gbpShop = shop as {
    id: string
    gbp_access_token?: string | null
    gbp_refresh_token?: string | null
    gbp_token_expiry?: string | null
  } | null

  if (!gbpShop?.gbp_refresh_token) {
    return NextResponse.json({ error: 'Google Business Profile not connected' }, { status: 400 })
  }

  // Refresh token if expired
  let accessToken = gbpShop.gbp_access_token ?? ''
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000)
  if (!accessToken || !gbpShop.gbp_token_expiry || new Date(gbpShop.gbp_token_expiry) < fiveMinFromNow) {
    const refreshed = await refreshGBPToken(gbpShop.gbp_refresh_token)
    if (!refreshed) return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 })
    accessToken = refreshed.accessToken
    await supabase.from('shops').update({
      gbp_access_token: refreshed.accessToken,
      gbp_token_expiry: refreshed.expiry,
    }).eq('id', gbpShop.id)
  }

  const locations = await listGBPLocations(accessToken)
  return NextResponse.json({ locations })
}
