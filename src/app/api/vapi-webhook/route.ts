import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { captureAndRecord } from '@/lib/monitoring'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function normalizePhone(phone: string | null | undefined): string {
  const raw = (phone ?? '').trim()
  if (!raw) return ''

  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (raw.startsWith('+')) return raw
  return digits || raw
}

function laterIso(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a) return b ?? null
  if (!b) return a
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b
}

async function syncCustomerRecord(params: {
  shopId: string
  phone: string
  name?: string | null
  vehicle?: string | null
  interactionAt?: string | null
}) {
  const phone = normalizePhone(params.phone)
  if (!params.shopId || !phone) return

  const supabase = getSupabase()
  const { data: existing } = await supabase
    .from('customers')
    .select('id, name, vehicle, last_visit, visit_count')
    .eq('shop_id', params.shopId)
    .eq('phone', phone)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('customers')
      .update({
        name: params.name || existing.name,
        vehicle: params.vehicle || existing.vehicle,
        last_visit: laterIso(existing.last_visit, params.interactionAt),
        visit_count: Math.max(existing.visit_count ?? 1, 1),
      })
      .eq('id', existing.id)
    return
  }

  await supabase.from('customers').insert({
    shop_id: params.shopId,
    name: params.name?.trim() || 'Unknown Customer',
    phone,
    vehicle: params.vehicle || null,
    last_visit: params.interactionAt || new Date().toISOString(),
    visit_count: 1,
  })
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
    console.log(`vapi-webhook event: type=${type} status=${msg?.status ?? 'none'} callId=${msg?.call?.id ?? 'none'}`)

    if (type === 'status-update' && msg?.status === 'in-progress') {
      const call = msg.call
      if (!call?.id) return NextResponse.json({ received: true })

      const shop = await findShop(call.assistantId)
      if (!shop) return NextResponse.json({ received: true })

      const { data: existing } = await getSupabase()
        .from('calls').select('id, caller_phone').eq('vapi_call_id', call.id).single()
      if (existing) return NextResponse.json({ received: true })

      const callerPhone = normalizePhone(call.customer?.number)
      await getSupabase().from('calls').insert({
        shop_id: shop.id,
        caller_phone: callerPhone,
        caller_name: call.customer?.name ?? null,
        started_at: call.startedAt ?? new Date().toISOString(),
        outcome: 'info_only',
        vapi_call_id: call.id,
      })

      await syncCustomerRecord({
        shopId: shop.id,
        phone: callerPhone,
        name: call.customer?.name ?? null,
        interactionAt: call.startedAt ?? new Date().toISOString(),
      })

      return NextResponse.json({ received: true, type: 'status-update-in-progress' })
    }

    if (type === 'end-of-call-report') {
      const call = msg.call
      if (!call?.id) return NextResponse.json({ received: true })

      const transcript = msg.artifact?.transcript ?? call.transcript ?? ''
      const reason = msg.endedReason ?? call.endedReason ?? ''

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
        } catch {}
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

      const { data: existing } = await getSupabase()
        .from('calls').select('id, caller_phone').eq('vapi_call_id', call.id).single()
      const existingPhone = normalizePhone((existing as { caller_phone?: string } | null)?.caller_phone ?? '')
      const callerPhone = normalizePhone(call.customer?.number) || existingPhone

      let shopId: string | null = null

      if (existing) {
        const updatePayload: Record<string, unknown> = {
          ended_at: call.endedAt ?? null,
          duration_seconds: duration || null,
          outcome,
          transcript: fullTranscript || null,
          recording_url: msg.artifact?.recording?.stereoUrl ?? call.stereoRecordingUrl ?? null,
          caller_phone: callerPhone || '',
        }
        if (call.customer?.name) {
          updatePayload.caller_name = call.customer.name
        }
        await getSupabase().from('calls').update(updatePayload).eq('vapi_call_id', call.id)
      } else {
        const shop = await findShop(call.assistantId)
        if (!shop) return NextResponse.json({ received: true })
        shopId = shop.id

        await getSupabase().from('calls').insert({
          shop_id: shop.id,
          caller_phone: callerPhone,
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

      let callUuid = existing?.id
      if (!callUuid) {
        const { data: inserted } = await getSupabase()
          .from('calls').select('id, shop_id').eq('vapi_call_id', call.id).maybeSingle()
        callUuid = inserted?.id
        shopId = shopId ?? inserted?.shop_id ?? null
      }

      const shopForCall = shopId ? { id: shopId } : await findShop(call.assistantId)
      let resolvedCustomerName = call.customer?.name ?? null

      if (callUuid && shopForCall?.id) {
        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
        const { data: booking } = await getSupabase()
          .from('bookings')
          .select('customer_name, customer_phone, vehicle, id')
          .eq('shop_id', shopForCall.id)
          .gte('created_at', tenMinAgo)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (booking?.customer_name) {
          resolvedCustomerName = booking.customer_name
          await getSupabase().from('calls')
            .update({
              caller_name: booking.customer_name,
              caller_phone: callerPhone || normalizePhone(booking.customer_phone) || '',
            })
            .eq('id', callUuid)
          await getSupabase().from('bookings')
            .update({ call_id: callUuid })
            .eq('id', booking.id)

          await syncCustomerRecord({
            shopId: shopForCall.id,
            phone: callerPhone || booking.customer_phone,
            name: booking.customer_name,
            vehicle: booking.vehicle,
            interactionAt: endedAt ?? startedAt ?? new Date().toISOString(),
          })
        }
      }

      if (shopForCall?.id && callerPhone) {
        await syncCustomerRecord({
          shopId: shopForCall.id,
          phone: callerPhone,
          name: resolvedCustomerName,
          interactionAt: endedAt ?? startedAt ?? new Date().toISOString(),
        })
      }

      return NextResponse.json({ received: true, type: 'end-of-call-report', outcome })
    }

    return NextResponse.json({ received: true, type: type ?? 'unknown' })

  } catch (err) {
    console.error('vapi-webhook error:', err)
    await captureAndRecord({
      source: 'dashboard-api',
      eventType: 'vapi_webhook_error',
      severity: 'critical',
      message: 'Vapi webhook route failed',
      payload: {},
      error: err,
    })
    return NextResponse.json({ received: true })
  }
}
