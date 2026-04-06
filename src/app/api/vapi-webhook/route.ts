import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
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
  } catch (err) {
    console.error('vapi-webhook error:', err)
    return NextResponse.json({ received: true })
  }
}
