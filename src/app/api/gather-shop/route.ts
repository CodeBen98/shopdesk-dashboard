import { NextResponse } from 'next/server'
import { ShopHours } from '@/types'

const DAYS: (keyof ShopHours)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function formatTime(t: string): string {
  // "0800" → "08:00"
  return t.slice(0, 2) + ':' + t.slice(2, 4)
}

function buildHours(periods: Array<{ open: { day: number; time: string }; close?: { day: number; time: string } }>): ShopHours {
  const hours: ShopHours = {
    sunday:    { open: false, from: '09:00', to: '17:00' },
    monday:    { open: false, from: '09:00', to: '17:00' },
    tuesday:   { open: false, from: '09:00', to: '17:00' },
    wednesday: { open: false, from: '09:00', to: '17:00' },
    thursday:  { open: false, from: '09:00', to: '17:00' },
    friday:    { open: false, from: '09:00', to: '17:00' },
    saturday:  { open: false, from: '09:00', to: '17:00' },
  }
  for (const period of periods) {
    const dayName = DAYS[period.open.day]
    if (!dayName) continue
    hours[dayName] = {
      open: true,
      from: formatTime(period.open.time),
      to: period.close ? formatTime(period.close.time) : '17:00',
    }
  }
  return hours
}

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ found: false })
  }

  let body: { name?: string; address?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ found: false })
  }

  const { name, address } = body
  if (!name) {
    return NextResponse.json({ found: false })
  }

  try {
    const query = encodeURIComponent(`${name} ${address ?? ''}`.trim())
    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`
    )
    const searchData = await searchRes.json()

    if (!searchData.results || searchData.results.length === 0) {
      return NextResponse.json({ found: false })
    }

    const placeId: string = searchData.results[0].place_id

    const detailsRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,opening_hours,types&key=${apiKey}`
    )
    const detailsData = await detailsRes.json()
    const result = detailsData.result

    if (!result) {
      return NextResponse.json({ found: false })
    }

    const hours = result.opening_hours?.periods
      ? buildHours(result.opening_hours.periods)
      : buildHours([])

    return NextResponse.json({
      found: true,
      name: result.name ?? name,
      address: result.formatted_address ?? address ?? '',
      phone: result.formatted_phone_number ?? '',
      website: result.website ?? null,
      hours,
      raw_types: result.types ?? [],
    })
  } catch {
    return NextResponse.json({ found: false })
  }
}
