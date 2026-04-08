import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY!

const DEFAULT_AUTO_SERVICES = [
  { name: 'Oil Change', price: null, description: null },
  { name: 'Brake Service', price: null, description: null },
  { name: 'Engine Diagnostics', price: null, description: null },
  { name: 'Tire Rotation', price: null, description: null },
  { name: 'AC Repair', price: null, description: null },
  { name: 'Transmission Service', price: null, description: null },
  { name: 'Battery Replacement', price: null, description: null },
  { name: 'Wheel Alignment', price: null, description: null },
  { name: 'General Auto Repair', price: null, description: null },
]

// Convert Google's {hour, minute} to HH:MM 24hr format for <input type="time">
function toTimeInput(t: { hour: number; minute: number }): string {
  return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`
}

// Also return human-readable for Vapi system prompt display
function toHumanTime(t: { hour: number; minute: number }): string {
  const h = t.hour; const m = t.minute
  const suffix = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  const save = searchParams.get('save') === 'true'

  if (!q) return NextResponse.json({ error: 'Missing query' }, { status: 400 })

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.regularOpeningHours,places.types',
    },
    body: JSON.stringify({ textQuery: q }),
  })

  if (!res.ok) return NextResponse.json({ error: 'Places API error' }, { status: 500 })
  const data = await res.json()
  const place = data.places?.[0]
  if (!place) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const dayMap: Record<number, string> = {
    0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
    4: 'thursday', 5: 'friday', 6: 'saturday'
  }
  const hours: Record<string, { open: boolean; from: string; to: string }> = {}
  for (const d of Object.values(dayMap)) hours[d] = { open: false, from: '', to: '' }

  const periods = place.regularOpeningHours?.periods ?? []
  let hasHours = false

  for (const period of periods) {
    const dayNum = period.open?.day
    if (dayNum === undefined) continue
    const dayName = dayMap[dayNum]
    if (!dayName || !period.open) continue

    // 24-hour shops have no close time
    if (!period.close) {
      hours[dayName] = { open: true, from: '00:00', to: '23:59' }
      hasHours = true
      continue
    }

    const from = toTimeInput(period.open)
    const to = toTimeInput(period.close)

    if (from && to) {
      hours[dayName] = { open: true, from, to }
      hasHours = true
    }
  }

  // Fallback hours if Google has none
  if (!hasHours) {
    for (const d of ['monday','tuesday','wednesday','thursday','friday']) {
      hours[d] = { open: true, from: '08:00', to: '17:00' }
    }
    hours['saturday'] = { open: true, from: '09:00', to: '14:00' }
  }

  const shopData = {
    name: place.displayName?.text ?? '',
    address: place.formattedAddress ?? '',
    phone: place.nationalPhoneNumber ?? '',
    hours,
    services: DEFAULT_AUTO_SERVICES,
  }

  if (save) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase.from('shops').update(shopData).eq('owner_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const baseUrl = new URL(request.url).origin
    fetch(`${baseUrl}/api/provision-shop`, { method: 'POST' }).catch(() => {})

    return NextResponse.json({ success: true, ...shopData })
  }

  return NextResponse.json(shopData)
}
