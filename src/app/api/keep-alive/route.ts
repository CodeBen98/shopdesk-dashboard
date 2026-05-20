import { NextResponse } from 'next/server'

const BOOKING_SERVICE_URL = process.env.BOOKING_WEBHOOK_URL
  ? process.env.BOOKING_WEBHOOK_URL.replace(/\/book$/, '')
  : 'https://shopdesk-booking.onrender.com'

export async function GET() {
  try {
    const res = await fetch(`${BOOKING_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(10_000),
    })
    return NextResponse.json({ ok: res.ok, status: res.status })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 502 })
  }
}
