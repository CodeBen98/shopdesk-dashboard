// US time zones a shop can operate in. Must match the shops_timezone_check constraint.
export const SHOP_TIMEZONES = [
  { id: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
  { id: 'America/Denver', label: 'Mountain (Denver)' },
  { id: 'America/Phoenix', label: 'Arizona (Phoenix, no DST)' },
  { id: 'America/Chicago', label: 'Central (Chicago)' },
  { id: 'America/New_York', label: 'Eastern (New York)' },
  { id: 'America/Anchorage', label: 'Alaska (Anchorage)' },
  { id: 'Pacific/Honolulu', label: 'Hawaii (Honolulu)' },
] as const

export type ShopTimezone = (typeof SHOP_TIMEZONES)[number]['id']

export const DEFAULT_TIMEZONE: ShopTimezone = 'America/New_York'

export function isShopTimezone(tz: unknown): tz is ShopTimezone {
  return SHOP_TIMEZONES.some((z) => z.id === tz)
}

/** Shop's time zone, falling back to the default for old rows or bad values. */
export function shopTimezone(tz: unknown): ShopTimezone {
  return isShopTimezone(tz) ? tz : DEFAULT_TIMEZONE
}

/** Best guess from the browser, used to pre-fill onboarding. */
export function detectTimezone(): ShopTimezone {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (isShopTimezone(tz)) return tz
    // Map common aliases to the zone we store.
    const aliases: Record<string, ShopTimezone> = {
      'US/Pacific': 'America/Los_Angeles',
      'US/Mountain': 'America/Denver',
      'US/Arizona': 'America/Phoenix',
      'US/Central': 'America/Chicago',
      'US/Eastern': 'America/New_York',
      'America/Detroit': 'America/New_York',
      'America/Indiana/Indianapolis': 'America/New_York',
      'America/Boise': 'America/Denver',
    }
    return aliases[tz] ?? DEFAULT_TIMEZONE
  } catch {
    return DEFAULT_TIMEZONE
  }
}
