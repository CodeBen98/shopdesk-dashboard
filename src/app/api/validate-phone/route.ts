// POST /api/validate-phone
// Uses Twilio Lookup v2 (free tier for basic validation) to confirm a phone
// number is dialable before it ever becomes a transferCall destination.
// See shopdesk/design-docs/2026-04-23-live-transfer-to-owner.md P3 finding.
//
// Body:   { phone: string }
// Returns {
//   valid: boolean,
//   e164?: string,         // canonical form when valid
//   reason?: string,       // user-facing message when invalid
//   warning?: string       // non-blocking note when we fail-open
// }
//
// Fails OPEN on Twilio error: if Lookup is down or misconfigured, we return
// valid=true with a warning rather than block onboarding on a third-party
// outage. The normalizeToE164 format check still blocks obvious garbage.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeToE164 } from '@/lib/shopPrompt'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const LOOKUP_TIMEOUT_MS = 5000

export async function POST(request: Request) {
  // Auth gate so this isn't a free enumeration API.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ valid: false, reason: 'Unauthorized' }, { status: 401 })

  let body: { phone?: string }
  try {
    body = await request.json() as { phone?: string }
  } catch {
    return NextResponse.json({ valid: false, reason: 'Invalid request body' }, { status: 400 })
  }

  const e164 = normalizeToE164(body.phone)
  if (!e164) {
    return NextResponse.json({ valid: false, reason: 'Please enter a valid 10-digit US phone number.' })
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return NextResponse.json({ valid: true, e164, warning: 'Twilio not configured — accepting based on format only.' })
  }

  const auth = 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')
  const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(e164)}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS)
  try {
    const res = await fetch(url, { headers: { Authorization: auth }, signal: controller.signal })
    if (res.status === 404) {
      return NextResponse.json({ valid: false, reason: "This doesn't look like a real, dialable phone number. Double-check the digits." })
    }
    if (!res.ok) {
      const snippet = (await res.text()).slice(0, 200)
      console.error(`[validate-phone] Twilio Lookup ${res.status}:`, snippet)
      return NextResponse.json({ valid: true, e164, warning: 'Could not verify with Twilio — accepting based on format only.' })
    }
    const data = await res.json() as { valid?: boolean; phone_number?: string }
    if (data.valid === false) {
      return NextResponse.json({ valid: false, reason: 'This phone number is not valid.' })
    }
    return NextResponse.json({ valid: true, e164: data.phone_number ?? e164 })
  } catch (err) {
    console.error('[validate-phone] error:', err)
    return NextResponse.json({ valid: true, e164, warning: 'Could not verify (network error) — accepting based on format only.' })
  } finally {
    clearTimeout(timer)
  }
}
