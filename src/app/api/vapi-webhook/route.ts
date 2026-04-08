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
      const { data: existing } = await getSupabase()
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
      // Vapi sends end-of-call data at msg level (not msg.call)
      const callId = msg.call?.id ?? msg.id
      if (!callId) return NextResponse.json({ received: true })

      const transcript = msg.transcript ?? msg.call?.transcript ?? ''
      const reason = msg.endedReason ?? msg.call?.endedReason ?? ''
      const duration = msg.durationSeconds ?? msg.call?.durationSeconds ?? 0
      const outcome = deriveOutcome(transcript, reason, duration)
      const summary = msg.summary ?? msg.call?.summary ?? ''

      const fullTranscript = summary
        ? `SUMMARY: ${summary}\n\nTRANSCRIPT:\n${transcript}`
        : transcript

      const endedAt = msg.endedAt ?? msg.call?.endedAt ?? null
      const recordingUrl = msg.stereoRecordingUrl ?? msg.call?.stereoRecordingUrl ?? null
      const callerName = msg.customer?.name ?? msg.call?.customer?.name ?? null
      const callerPhone = msg.customer?.number ?? msg.call?.customer?.number ?? ''
      const assistantId = msg.assistantId ?? msg.call?.assistantId

      // Try to update existing record first
      const { data: existing } = await getSupabase()
        .from('calls').select('id').eq('vapi_call_id', callId).single()

      if (existing) {
        await getSupabase().from('calls').update({
          ended_at: endedAt,
          duration_seconds: duration || null,
          outcome,
          transcript: fullTranscript || null,
          recording_url: recordingUrl,
          caller_name: callerName,
          caller_phone: callerPhone,
        }).eq('vapi_call_id', callId)
      } else {
        const shop = await findShop(assistantId)
        if (!shop) return NextResponse.json({ received: true })

        await getSupabase().from('calls').insert({
          shop_id: shop.id,
          caller_phone: callerPhone,
          caller_name: callerName,
          started_at: msg.startedAt ?? msg.call?.startedAt ?? new Date().toISOString(),
          ended_at: endedAt,
          duration_seconds: duration || null,
          outcome,
          transcript: fullTranscript || null,
          recording_url: recordingUrl,
          vapi_call_id: callId,
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
