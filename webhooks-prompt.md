# ShopDesk — Webhook Integration (Vapi call logging + Booking Supabase sync)

## Overview

Two things to build:

1. `/api/vapi-webhook` — Next.js API route that receives Vapi end-of-call events and writes to Supabase `calls` table
2. Update Railway booking service to also write to Supabase `bookings` table after creating a calendar event

---

## Part 1: Vapi Webhook — src/app/api/vapi-webhook/route.ts

### What Vapi sends (POST, end-of-call report)

Vapi sends a POST to our webhook URL when a call ends. The payload structure:

```json
{
  "message": {
    "type": "end-of-call-report",
    "call": {
      "id": "uuid",
      "assistantId": "uuid",
      "phoneNumberId": "uuid",
      "customer": {
        "number": "+14075551234",
        "name": "John Smith"
      },
      "startedAt": "2026-04-06T21:57:49.584Z",
      "endedAt": "2026-04-06T22:00:23.420Z",
      "durationSeconds": 154,
      "endedReason": "assistant-ended-call",
      "transcript": "AI: Thank you... User: Hi...",
      "summary": "John Smith called to book...",
      "stereoRecordingUrl": "https://..."
    }
  }
}
```

### What to write to Supabase

Table: `calls`
Schema (from supabase/schema.sql):
- id: uuid (generate)
- shop_id: uuid — look up from shops table WHERE vapi_agent_id = call.assistantId
- caller_phone: text — from call.customer.number
- caller_name: text | null — from call.customer.name
- started_at: timestamptz — from call.startedAt
- ended_at: timestamptz | null — from call.endedAt
- duration_seconds: integer | null — from call.durationSeconds
- outcome: text — derive from transcript/endedReason:
  - if endedReason contains 'assistant-ended-call' AND transcript contains 'booked' or 'scheduled' or 'confirmed' → 'booked'
  - if transcript contains 'emergency' or 'overheating' or 'stranded' or 'smoke' or 'brake' and 'failed' → 'emergency'
  - if endedReason contains 'customer-ended-call' and durationSeconds < 30 → 'missed'
  - default → 'info_only'
- transcript: text | null — from call.transcript
- recording_url: text | null — from call.stereoRecordingUrl
- vapi_call_id: text — from call.id (unique)
- summary: text | null — from call.summary (store in transcript field or add summary column — just use transcript field for now, prefix with summary then full transcript)

### Implementation

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key for server-side writes (no RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const body = await request.json()
  const msg = body.message
  
  if (msg?.type !== 'end-of-call-report') {
    return NextResponse.json({ received: true })
  }
  
  const call = msg.call
  if (!call?.id) return NextResponse.json({ received: true })

  // Find shop by vapi_agent_id
  const { data: shop } = await supabase
    .from('shops')
    .select('id')
    .eq('vapi_agent_id', call.assistantId)
    .single()

  if (!shop) {
    console.error('No shop found for agent:', call.assistantId)
    return NextResponse.json({ received: true })
  }

  // Derive outcome
  const transcript = call.transcript ?? ''
  const reason = call.endedReason ?? ''
  let outcome = 'info_only'
  if (transcript.match(/your.*booked|booked for|appointment.*confirmed|you.*re all set/i)) {
    outcome = 'booked'
  } else if (transcript.match(/overheating|stranded|smoke|brake.*fail|won.*t start/i)) {
    outcome = 'emergency'
  } else if (reason.includes('customer-ended-call') && (call.durationSeconds ?? 0) < 20) {
    outcome = 'missed'
  }

  // Check for duplicate (vapi_call_id is unique)
  const { data: existing } = await supabase
    .from('calls')
    .select('id')
    .eq('vapi_call_id', call.id)
    .single()

  if (existing) return NextResponse.json({ received: true, duplicate: true })

  // Insert call record
  await supabase.from('calls').insert({
    shop_id: shop.id,
    caller_phone: call.customer?.number ?? '',
    caller_name: call.customer?.name ?? null,
    started_at: call.startedAt,
    ended_at: call.endedAt ?? null,
    duration_seconds: call.durationSeconds ?? null,
    outcome,
    transcript: call.summary
      ? `SUMMARY: ${call.summary}\n\nTRANSCRIPT:\n${transcript}`
      : transcript,
    recording_url: call.stereoRecordingUrl ?? null,
    vapi_call_id: call.id,
  })

  return NextResponse.json({ received: true, outcome })
}
```

### After creating the route

Register the webhook URL in Vapi. Make an API call to update the phone number's server URL:

```
PATCH https://api.vapi.ai/phone-number/{VAPI_PHONE_NUMBER_ID}
{
  "serverUrl": "https://app.shopdesk.site/api/vapi-webhook"
}
```

Do this in the route file itself using a one-time setup, OR create a separate setup script. Actually — create a separate Next.js API route at `/api/setup-vapi-webhook` that when called (GET) registers the webhook URL with Vapi. This way it can be triggered manually once.

---

## Part 2: Update Railway Booking Service

The Railway booking service lives at:
/Users/openclawsandbox/.openclaw/workspace/shopdesk/booking-service/booking_webhook.py

After successfully creating a Google Calendar event, also write to Supabase bookings table.

### Add to booking_webhook.py

At the top, add:
```python
import httpx
import os

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
```

Add a helper function:
```python
async def save_booking_to_supabase(shop_id: str, customer_name: str, customer_phone: str,
                                    vehicle: str, service: str, appointment_time: str,
                                    calendar_link: str = "", call_id: str = "") -> None:
    """Write booking to Supabase bookings table."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        logger.warning("Supabase env vars not set — skipping DB write")
        return
    try:
        # Parse appointment_time string to ISO format
        # appointment_time comes as "Thursday April 9 at 10am" — try to parse it
        from dateutil import parser as dateparser
        try:
            appt_dt = dateparser.parse(appointment_time)
            appt_iso = appt_dt.isoformat() if appt_dt else None
        except Exception:
            appt_iso = None

        payload = {
            "shop_id": shop_id,
            "customer_name": customer_name,
            "customer_phone": customer_phone,
            "vehicle": vehicle,
            "service": service,
            "appointment_at": appt_iso or appointment_time,
            "status": "scheduled",
            "sms_sent": False,
            "notes": f"Calendar: {calendar_link}" if calendar_link else None,
        }
        if call_id:
            # Try to find the call record by vapi_call_id
            pass  # skip call_id linking for now

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{SUPABASE_URL}/rest/v1/bookings",
                json=payload,
                headers={
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal",
                },
                timeout=10,
            )
            if resp.status_code not in (200, 201):
                logger.error(f"Supabase booking insert failed: {resp.status_code} {resp.text}")
            else:
                logger.info(f"Booking saved to Supabase for {customer_name}")
    except Exception as e:
        logger.error(f"save_booking_to_supabase error: {e}")
```

Then in the `book_appointment` function, after the calendar event is created successfully, add:
```python
# Write to Supabase
shop_id = os.getenv("DEFAULT_SHOP_ID", "")  # We'll set this in Railway
if shop_id:
    await save_booking_to_supabase(
        shop_id=shop_id,
        customer_name=name,
        customer_phone=phone,
        vehicle=vehicle_str,
        service=issue,
        appointment_time=appointment_time,
        calendar_link=cal_link or "",
    )
```

Also add `python-dateutil` and `httpx` to requirements.txt if not already there.

### Railway env vars needed
- SUPABASE_URL = https://urkurmhmyeylpeuvzxym.supabase.co
- SUPABASE_SERVICE_KEY = (the service role key from Supabase dashboard > Settings > API)
- DEFAULT_SHOP_ID = (the UUID of the 535 Auto Care shop row in Supabase)

---

## Part 3: Register Vapi Webhook

After creating /api/vapi-webhook, create /api/setup-vapi-webhook/route.ts:

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  const res = await fetch(`https://api.vapi.ai/phone-number/${process.env.VAPI_PHONE_NUMBER_ID}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      serverUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/vapi-webhook`,
    }),
  })
  const data = await res.json()
  return NextResponse.json({ ok: res.ok, serverUrl: data.serverUrl })
}
```

---

## Files to create/update:
- src/app/api/vapi-webhook/route.ts (NEW)
- src/app/api/setup-vapi-webhook/route.ts (NEW)
- /Users/openclawsandbox/.openclaw/workspace/shopdesk/booking-service/booking_webhook.py (UPDATE — add Supabase write)
- /Users/openclawsandbox/.openclaw/workspace/shopdesk/booking-service/requirements.txt (UPDATE — add httpx, python-dateutil if missing)

## Env vars needed in Vercel (add if not present):
- SUPABASE_SERVICE_ROLE_KEY (already there per the env list)
- NEXT_PUBLIC_APP_URL=https://app.shopdesk.site (already there)
- VAPI_PHONE_NUMBER_ID (already there)
- VAPI_API_KEY (already there)

## Important
- The vapi-webhook route must use SUPABASE_SERVICE_ROLE_KEY (service role, bypasses RLS) not the anon key
- The webhook must always return 200 even on errors — Vapi will retry on non-200
- Do NOT break existing booking_webhook.py functionality — add the Supabase write as a non-blocking async call (wrap in try/except, never raise)
- Read existing booking_webhook.py carefully before editing

When completely done:
openclaw system event --text "Done: Vapi webhook + booking Supabase sync — calls and bookings now write to DB" --mode now
