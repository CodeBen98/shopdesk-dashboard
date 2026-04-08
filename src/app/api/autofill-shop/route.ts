import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY!

const SERVICE_MAP: Record<string, string[]> = {
  car_repair: ['Oil Change', 'Brake Service', 'Engine Diagnostics', 'Tire Rotation', 'AC Repair', 'Transmission Service', 'Battery Replacement', 'Alignment', 'General Auto Repair'],
  car_wash: ['Car Wash', 'Detailing'],
  gas_station: ['Oil Change', 'Tire Service', 'Basic Maintenance'],
  tire_dealer: ['Tire Sales', 'Tire Rotation', 'Wheel Alignment', 'Flat Tire Repair'],
}

function inferServices(types: string[]): string[] {
  for (const type of types) {
    if (SERVICE_MAP[type]) return SERVICE_MAP[type]
  }
  return ['Oil Change', 'Brake Service', 'Engine Diagnostics', 'Tire Rotation', 'AC Repair', 'Transmission Service', 'Battery Replacement', 'Alignment', 'General Auto Repair']
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

  // Parse hours
  const dayMap: Record<number, string> = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' }
  const hours: Record<string, { open: boolean; from: string; to: string }> = {}
  for (const d of Object.values(dayMap)) hours[d] = { open: false, from: '', to: '' }

  const periods = place.regularOpeningHours?.periods ?? []
  let hasHours = false
  for (const period of periods) {
    const dayNum = period.open?.day
    if (dayNum === undefined) continue
    const dayName = dayMap[dayNum]
    if (!dayName) continue
    const fmt = (t: { hour: number; minute: number }) => {
      const h = t.hour; const m = t.minute
      const suffix = h < 12 ? 'AM' : 'PM'
      const h12 = h % 12 || 12
      return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
    }
    hours[dayName] = { open: true, from: fmt(period.open), to: period.close ? fmt(period.close) : '5:00 PM' }
    hasHours = true
  }

  // Fallback hours if Google has none
  if (!hasHours) {
    for (const d of ['monday','tuesday','wednesday','thursday','friday']) {
      hours[d] = { open: true, from: '8:00 AM', to: '5:00 PM' }
    }
    hours['saturday'] = { open: true, from: '9:00 AM', to: '2:00 PM' }
  }

  const types = place.types ?? []
  const services = inferServices(types).map((name: string) => ({ name, price: null, description: null }))

  const shopData = {
    name: place.displayName?.text ?? '',
    address: place.formattedAddress ?? '',
    phone: place.nationalPhoneNumber ?? '',
    hours,
    services,
  }

  // If save=true, write directly to Supabase and trigger reprovision
  if (save) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase.from('shops').update(shopData).eq('owner_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Trigger reprovision
    const baseUrl = new URL(request.url).origin
    fetch(`${baseUrl}/api/provision-shop`, { method: 'POST' }).catch(() => {})

    return NextResponse.json({ success: true, ...shopData })
  }

  return NextResponse.json(shopData)
}
