import { NextResponse } from 'next/server'

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY!

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  if (!q) return NextResponse.json({ error: 'Missing query' }, { status: 400 })

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.regularOpeningHours',
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
  for (const d of Object.values(dayMap)) {
    hours[d] = { open: false, from: '', to: '' }
  }

  const periods = place.regularOpeningHours?.periods ?? []
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
    hours[dayName] = {
      open: true,
      from: fmt(period.open),
      to: period.close ? fmt(period.close) : '5:00 PM',
    }
  }

  return NextResponse.json({
    name: place.displayName?.text ?? '',
    address: place.formattedAddress ?? '',
    phone: place.nationalPhoneNumber ?? '',
    hours,
  })
}
