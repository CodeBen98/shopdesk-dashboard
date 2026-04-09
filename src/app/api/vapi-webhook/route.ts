import { NextResponse } from 'next/server'
import crypto from 'crypto'

function verifyVapiSignature(body: string, signature: string | null): boolean {
  const secret = process.env.VAPI_WEBHOOK_SECRET
  if (!secret) return true // Skip verification if no secret configured
  if (!signature) return false
  
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
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
    const bodyText = await request.text()
    console.log("[vapi-webhook] Incoming request"); const signature = request.headers.get('x-vapi-signature')
    
    if (false && !verifyVapiSignature(bodyText, signature)) {
      console.error('[vapi-webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    
    const body = JSON.parse(bodyText)
    const msg = body.message
    const type = msg?.type
    // Log every event type for debugging
    console.log(`vapi-webhook event: type=${type} callId=${msg?.call?.id ?? 'none'}`)

    // call-started: create the call record with basic info
    if (type === 'call-started') {
      const call = msg.call
      if (!call?.id) return NextResponse.json({ received: true })

      const shop = await findShop(call.assistantId)
      if (!shop) return NextResponse.json({ received: true })

      // Check for duplicate
      const { data: existing } = await getSupabase()
        .from('calls').select('id, caller_phone').eq('vapi_call_id', call.id).single()
      const existing_phone = (existing as { caller_phone?: string } | null)?.caller_phone ?? ''
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

      // Per Vapi docs: transcript is in msg.artifact.transcript for end-of-call-report
      const transcript = msg.artifact?.transcript ?? call.transcript ?? ''
      const reason = msg.endedReason ?? call.endedReason ?? ''

      // endedAt and durationSeconds are often null in webhook payload — fetch from Vapi API as fallback
      let startedAt = call.startedAt ?? null
      let endedAt = call.endedAt ?? null
      const VAPI_KEY = process.env.VAPI_API_KEY ?? ''
      if ((!endedAt || !call.durationSeconds) && VAPI_KEY) {
        try {
          const vapiRes = await fetch(`https://api.vapi.ai/call/${call.id}`, {
            headers: { 'Authorization': `Bearer ${VAPI_KEY}` }
          })
          if (vapiRes.ok) {
            const vapiCall = await vapiRes.json()
            startedAt = vapiCall.startedAt ?? startedAt
            endedAt = vapiCall.endedAt ?? endedAt
          }
        } catch { /* non-fatal */ }
      }
      const calculatedDuration = (startedAt && endedAt)
        ? Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000)
        : 0
      const duration = call.durationSeconds ?? calculatedDuration
      const outcome = deriveOutcome(transcript, reason, duration)

      const summary = msg.artifact?.summary ?? call.summary ?? ''
      const fullTranscript = summary
        ? `SUMMARY: ${summary}\n\nTRANSCRIPT:\n${transcript}`
        : transcript

      // Try to update existing record first
      const { data: existing } = await getSupabase()
        .from('calls').select('id, caller_phone').eq('vapi_call_id', call.id).single()
      const existing_phone = (existing as { caller_phone?: string } | null)?.caller_phone ?? ''

      if (existing) {
        const updatePayload: Record<string, unknown> = {
          ended_at: call.endedAt ?? null,
          duration_seconds: duration || null,
          outcome,
          transcript: fullTranscript || null,
          recording_url: msg.artifact?.recording?.stereoUrl ?? call.stereoRecordingUrl ?? null,
          caller_phone: call.customer?.number || existing_phone || '',
        }
        // Only set caller_name if Vapi provides one — don't overwrite booking webhook's value with null
        if (call.customer?.name) {
          updatePayload.caller_name = call.customer.name
        }
        await getSupabase().from('calls').update(updatePayload).eq('vapi_call_id', call.id)
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
          recording_url: msg.artifact?.recording?.stereoUrl ?? call.stereoRecordingUrl ?? null,
          vapi_call_id: call.id,
        })
      }

      // Get the call UUID (either from existing or by querying after insert)
      let callUuid = existing?.id
      if (!callUuid) {
        const { data: inserted } = await getSupabase()
          .from('calls').select('id').eq('vapi_call_id', call.id).maybeSingle()
        callUuid = inserted?.id
      }

      // Backfill caller_name from most recent booking for this shop (within last 10 minutes)
      const callerPhone = call.customer?.number ?? ''
      console.log('[vapi-webhook] Backfill check - callUuid:', callUuid, 'assistantId:', call.assistantId)
      if (callUuid) {
        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
        const shopForCall = await findShop(call.assistantId)
        console.log('[vapi-webhook] Shop for backfill:', shopForCall?.id, 'tenMinAgo:', tenMinAgo)
        const { data: booking, error: bookingErr } = await getSupabase()
          .from('bookings')
          .select('customer_name, id')
          .eq('shop_id', shopForCall?.id ?? '')
          .gte('created_at', tenMinAgo)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        console.log('[vapi-webhook] Booking query result:', booking, 'error:', bookingErr)
        if (booking?.customer_name) {
          // Update call with customer name AND link booking to call
          const { error: callUpdateErr } = await getSupabase().from('calls')
            .update({ caller_name: booking.customer_name })
            .eq('id', callUuid)
          console.log('[vapi-webhook] Call update result - name:', booking.customer_name, 'error:', callUpdateErr)
          await getSupabase().from('bookings')
            .update({ call_id: callUuid })
            .eq('id', booking.id)
        }
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
