import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function deriveOutcome(transcript: string, reason: string, duration: number): string {
  if (transcript.match(/you.*re all set|booked for|appointment.*confirmed|locked.*in|all set.*oil|all set.*brake/i)) {
    return 'booked'
  }
  if (transcript.match(/overheating|stranded|smoke|brake.*fail|won.*t start|on the side/i)) {
    return 'emergency'
  }
  if (duration < 15 || reason.includes('customer-ended-call') && duration < 20) {
    return 'missed'
  }
  return 'info_only'
}

async function findShop(assistantId: string) {
  const { data } = await getSupabase()
    .from('shops')
    .select('id')
    .eq('vapi_agent_id', assistantId)
    .single()
  return data
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const msg = body.message
    const type = msg?.type

    // call-started: create the call record with basic info
    if (type === 'call-started') {
      const call = msg.call
      if (!call?.id) return NextResponse.json({ received: true })

      const shop = await findShop(call.assistantId)
      if (!shop) return NextResponse.json({ received: true })

      // Check for duplicate
      const { data: existing } = await supabase
        .from('calls').select('id').eq('vapi_call_id', call.id).single()
      if (existing) return NextResponse.json({ received: true })

      await getSupabase().from('calls').insert({
        shop_id: shop.id,
        caller_phone: call.customer?.number ?? '',
        caller_name: call.customer?.name ?? null,
        started_at: call.startedAt ?? new Date().toISOString(),
        outcome: 'info_only',
        vapi_call_id: call.id,
      })
      return NextResponse.json({ received: true, type: 'call-started' })
    }

    // end-of-call-report: update with full details
    if (type === 'end-of-call-report') {
      const call = msg.call
      if (!call?.id) return NextResponse.json({ received: true })

      const transcript = call.transcript ?? ''
      const reason = call.endedReason ?? ''
      const duration = call.durationSeconds ?? 0
      const outcome = deriveOutcome(transcript, reason, duration)

      const fullTranscript = call.summary
        ? `SUMMARY: ${call.summary}\n\nTRANSCRIPT:\n${transcript}`
        : transcript

      // Try to update existing record first
      const { data: existing } = await supabase
        .from('calls').select('id').eq('vapi_call_id', call.id).single()

      if (existing) {
        await getSupabase().from('calls').update({
          ended_at: call.endedAt ?? null,
          duration_seconds: duration || null,
          outcome,
          transcript: fullTranscript || null,
          recording_url: call.stereoRecordingUrl ?? null,
          caller_name: call.customer?.name ?? null,
          caller_phone: call.customer?.number ?? '',
        }).eq('vapi_call_id', call.id)
      } else {
        // No existing record — create from scratch
        const shop = await findShop(call.assistantId)
        if (!shop) return NextResponse.json({ received: true })

        await getSupabase().from('calls').insert({
          shop_id: shop.id,
          caller_phone: call.customer?.number ?? '',
          caller_name: call.customer?.name ?? null,
          started_at: call.startedAt ?? new Date().toISOString(),
          ended_at: call.endedAt ?? null,
          duration_seconds: duration || null,
          outcome,
          transcript: fullTranscript || null,
          recording_url: call.stereoRecordingUrl ?? null,
          vapi_call_id: call.id,
        })
      }

      return NextResponse.json({ received: true, type: 'end-of-call-report', outcome })
    }

    // All other event types — acknowledge and ignore
    return NextResponse.json({ received: true, type: type ?? 'unknown' })

  } catch (err) {
    console.error('vapi-webhook error:', err)
    // Always return 200 so Vapi doesn't retry endlessly
    return NextResponse.json({ received: true })
  }
}
