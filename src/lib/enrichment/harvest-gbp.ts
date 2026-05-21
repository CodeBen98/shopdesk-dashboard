// Google Business Profile API harvest.
// Uses the owner's OAuth access token (stored on their shop row) to fetch
// authoritative, owner-verified business data — name, hours, phone, website,
// description, and categories. This data is more reliable than website scraping
// because it comes from the owner's own Google Business profile.
//
// Token refresh is handled here transparently: if the stored access token is
// expired (or within 5 minutes of expiry), we refresh it and return the new
// tokens so the caller can persist them.

import type { GBPLocationData } from '@/types'

const GBP_INFO_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1'
const GBP_ACCT_BASE = 'https://mybusinessaccountmanagement.googleapis.com/v1'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

const LOCATION_READ_MASK = [
  'name', 'title', 'phoneNumbers', 'categories',
  'storefrontAddress', 'websiteUri', 'regularHours',
  'businessDescription', 'profile',
].join(',')

type RawPeriod = {
  openDay: string
  openTime?: { hours?: number; minutes?: number }
  closeDay?: string
  closeTime?: { hours?: number; minutes?: number }
}

type RawLocation = {
  name?: string
  title?: string
  phoneNumbers?: { primaryPhone?: string }
  categories?: {
    primaryCategory?: { displayName?: string }
    additionalCategories?: { displayName?: string }[]
  }
  storefrontAddress?: {
    addressLines?: string[]
    locality?: string
    administrativeArea?: string
    postalCode?: string
    regionCode?: string
  }
  websiteUri?: string
  regularHours?: { periods?: RawPeriod[] }
  businessDescription?: string
  profile?: { description?: string }
}

export type RefreshedTokens = {
  accessToken: string
  expiry: string  // ISO timestamp
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 15000): Promise<Response> {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ac.signal })
  } finally {
    clearTimeout(t)
  }
}

// Converts GBP period array to ShopDesk hours format.
// Days not present in periods are treated as closed.
function convertHours(periods: RawPeriod[]): Record<string, { open: boolean; from: string; to: string }> {
  const GBP_DAYS: Record<string, string> = {
    MONDAY: 'monday', TUESDAY: 'tuesday', WEDNESDAY: 'wednesday',
    THURSDAY: 'thursday', FRIDAY: 'friday', SATURDAY: 'saturday', SUNDAY: 'sunday',
  }
  const result: Record<string, { open: boolean; from: string; to: string }> = {}
  for (const sd of Object.values(GBP_DAYS)) {
    result[sd] = { open: false, from: '09:00', to: '17:00' }
  }
  for (const p of periods) {
    const day = GBP_DAYS[p.openDay]
    if (!day) continue
    const oh = p.openTime?.hours ?? 9
    const om = p.openTime?.minutes ?? 0
    const ch = p.closeTime?.hours ?? 17
    const cm = p.closeTime?.minutes ?? 0
    result[day] = {
      open: true,
      from: `${String(oh).padStart(2, '0')}:${String(om).padStart(2, '0')}`,
      to: `${String(ch).padStart(2, '0')}:${String(cm).padStart(2, '0')}`,
    }
  }
  return result
}

function formatGBPAddress(addr: RawLocation['storefrontAddress']): string {
  if (!addr) return ''
  const lines = addr.addressLines?.join(', ') ?? ''
  const city = addr.locality ?? ''
  const state = addr.administrativeArea ?? ''
  const zip = addr.postalCode ?? ''
  return [lines, city, state, zip].filter(Boolean).join(', ')
}

export async function refreshGBPToken(
  refreshToken: string,
): Promise<RefreshedTokens | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  try {
    const res = await fetchWithTimeout(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    })
    if (!res.ok) {
      console.error('[harvest-gbp] token refresh failed:', res.status)
      return null
    }
    const data = await res.json() as { access_token?: string; expires_in?: number }
    if (!data.access_token) return null
    const expiry = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString()
    return { accessToken: data.access_token, expiry }
  } catch (err) {
    console.error('[harvest-gbp] token refresh error:', err)
    return null
  }
}

// Resolves a valid access token — refreshes automatically if expired or near expiry.
// Returns { accessToken, refreshed } where refreshed is non-null when the token was renewed.
async function resolveAccessToken(opts: {
  accessToken: string | null
  refreshToken: string
  expiry: string | null
}): Promise<{ accessToken: string; refreshed: RefreshedTokens | null } | null> {
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000)
  const isValid = opts.accessToken &&
    opts.expiry &&
    new Date(opts.expiry) > fiveMinFromNow

  if (isValid && opts.accessToken) {
    return { accessToken: opts.accessToken, refreshed: null }
  }

  const refreshed = await refreshGBPToken(opts.refreshToken)
  if (!refreshed) return null
  return { accessToken: refreshed.accessToken, refreshed }
}

async function gbpGet(path: string, accessToken: string): Promise<unknown> {
  const res = await fetchWithTimeout(path, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const body = await res.text()
    console.error(`[harvest-gbp] GET ${path} → ${res.status}:`, body.slice(0, 300))
    return null
  }
  return res.json()
}

// Fetch the best-matching location for this shop from the owner's GBP account.
// If locationName is provided, fetches that specific location directly.
// Otherwise fetches the first account's first location.
export async function harvestGBP(opts: {
  accessToken: string | null
  refreshToken: string
  expiry: string | null
  locationName?: string | null
}): Promise<{ data: GBPLocationData | null; refreshed: RefreshedTokens | null }> {
  const resolved = await resolveAccessToken(opts)
  if (!resolved) return { data: null, refreshed: null }
  const { accessToken, refreshed } = resolved

  try {
    let locationName = opts.locationName

    if (!locationName) {
      // Discover accounts → take first account's first location
      const accounts = await gbpGet(`${GBP_ACCT_BASE}/accounts`, accessToken) as {
        accounts?: { name: string }[]
      } | null
      const accountName = accounts?.accounts?.[0]?.name
      if (!accountName) {
        console.warn('[harvest-gbp] no GBP accounts found for this token')
        return { data: null, refreshed }
      }

      const locList = await gbpGet(
        `${GBP_INFO_BASE}/${accountName}/locations?readMask=name,title&pageSize=1`,
        accessToken,
      ) as { locations?: { name: string }[] } | null
      locationName = locList?.locations?.[0]?.name ?? null
      if (!locationName) {
        console.warn('[harvest-gbp] no GBP locations found under account', accountName)
        return { data: null, refreshed }
      }
    }

    const raw = await gbpGet(
      `${GBP_INFO_BASE}/${locationName}?readMask=${LOCATION_READ_MASK}`,
      accessToken,
    ) as RawLocation | null
    if (!raw) return { data: null, refreshed }

    const categories: string[] = []
    if (raw.categories?.primaryCategory?.displayName) {
      categories.push(raw.categories.primaryCategory.displayName)
    }
    for (const c of raw.categories?.additionalCategories ?? []) {
      if (c.displayName) categories.push(c.displayName)
    }

    const data: GBPLocationData = {
      locationName,
      title: raw.title,
      phone: raw.phoneNumbers?.primaryPhone ?? undefined,
      websiteUri: raw.websiteUri,
      description: raw.businessDescription ?? raw.profile?.description ?? undefined,
      categories: categories.length > 0 ? categories : undefined,
      hours: raw.regularHours?.periods ? convertHours(raw.regularHours.periods) : undefined,
      address: formatGBPAddress(raw.storefrontAddress),
    }

    console.log('[harvest-gbp] ok — location:', locationName, '| has description:', !!data.description, '| has hours:', !!data.hours)
    return { data, refreshed }
  } catch (err) {
    console.error('[harvest-gbp] error:', err)
    return { data: null, refreshed }
  }
}

// Fetch all locations for an account (used in the location picker UI).
export async function listGBPLocations(accessToken: string): Promise<
  { name: string; title: string; address: string }[]
> {
  const accounts = await gbpGet(`${GBP_ACCT_BASE}/accounts`, accessToken) as {
    accounts?: { name: string }[]
  } | null
  const accountName = accounts?.accounts?.[0]?.name
  if (!accountName) return []

  const locList = await gbpGet(
    `${GBP_INFO_BASE}/${accountName}/locations?readMask=name,title,storefrontAddress&pageSize=20`,
    accessToken,
  ) as { locations?: RawLocation[] } | null

  return (locList?.locations ?? []).map(l => ({
    name: l.name ?? '',
    title: l.title ?? '',
    address: formatGBPAddress(l.storefrontAddress),
  }))
}
