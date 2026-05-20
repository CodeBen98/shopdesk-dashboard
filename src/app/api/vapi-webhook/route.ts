import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET ?? ''

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

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

function verifySignature(request: Request, rawBody: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.error('CRITICAL: VAPI_WEBHOOK_SECRET is not set — rejecting all webhook requests')
    return false
  }

  const receivedRaw = [
    request.headers.get('x-vapi-signature'),
    request.headers.get('x-vapi-signature-256'),
    request.headers.get('vapi-signature'),
    request.headers.get('x-signature'),
  ].find(Boolean)

  if (!receivedRaw) return false

  const receivedCandidates = receivedRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const hex = createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex')
  const b64 = createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('base64')

  const expected = [hex, `sha256=${hex}`, b64, `sha256=${b64}`]

  return receivedCandidates.some((candidate) => expected.some((exp) => safeEqual(candidate, exp)))
}

async function syncCustomerRecord(params: {
  shopId: string
  phone: string
  name?: string | null
  vehicle?: string | null
  industry?: string | null
  intake?: Record<string, unknown> | null
  interactionAt?: string | null
  incrementVisitCount?: boolean
}) {
  const phone = normalizePhone(params.phone)
  if (!params.shopId || !phone) return

  const shouldIncrementVisitCount = params.incrementVisitCount ?? true
  const supabase = getSupabase()
  const { data: existing } = await supabase
    .from('customers')
    .select('id, name, vehicle, last_visit, visit_count, industry, intake')
    .eq('shop_id', params.shopId)
    .eq('phone', phone)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('customers')
      .update({
        name: params.name || existing.name,
        vehicle: params.vehicle || existing.vehicle,
        industry: params.industry || existing.industry || 'other',
        intake: { ...(existing.intake ?? {}), ...(params.intake ?? {}) },
        last_visit: laterIso(existing.last_visit, params.interactionAt),
        visit_count: shouldIncrementVisitCount ? (existing.visit_count ?? 0) + 1 : (existing.visit_count ?? 1),
      })
      .eq('id', existing.id)
    return
  }

  await supabase.from('customers').insert({
    shop_id: params.shopId,
    name: params.name?.trim() || 'Unknown Customer',
    phone,
    vehicle: params.vehicle || null,
    industry: params.industry || 'auto_repair',
    intake: params.intake ?? {},
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
    const rawBody = await request.text()

    if (!verifySignature(request, rawBody)) {
      return NextResponse.json({ error: 'Unauthorized webhook signature' }, { status: 401 })
    }

    let body: Record<string, unknown>
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const msg = (body as { message?: Record<string, unknown> }).message
    const type = msg?.type as string | undefined
    const call = msg?.call as Record<string, unknown> | undefined

    console.log(`vapi-webhook event: type=${type ?? 'unknown'} status=${String(msg?.status ?? 'none')} callId=${String(call?.id ?? 'none')}`)

    if (type === 'status-update' && msg?.status === 'in-progress') {
      const callId = call?.id as string | undefined
      const assistantId = call?.assistantId as string | undefined
      if (!callId) return NextResponse.json({ received: true })

      const shop = await findShop(assistantId ?? '')
      if (!shop) return NextResponse.json({ received: true })

      const { data: existing, error: existingErr } = await getSupabase()
        .from('calls')
        .select('id, caller_phone')
        .eq('vapi_call_id', callId)
        .maybeSingle()
      if (existingErr) throw existingErr
      if (existing) return NextResponse.json({ received: true })

      const customer = call?.customer as Record<string, unknown> | undefined
      const callerPhone = normalizePhone(customer?.number as string | undefined)

      await getSupabase().from('calls').insert({
        shop_id: shop.id,
        caller_phone: callerPhone,
        caller_name: (customer?.name as string | undefined) ?? null,
        started_at: (call?.startedAt as string | undefined) ?? new Date().toISOString(),
        outcome: 'info_only',
        vapi_call_id: callId,
      })

      await syncCustomerRecord({
        shopId: shop.id,
        phone: callerPhone,
        name: (customer?.name as string | undefined) ?? null,
        interactionAt: (call?.startedAt as string | undefined) ?? new Date().toISOString(),
      })

      return NextResponse.json({ received: true, type: 'status-update-in-progress' })
    }

    if (type === 'end-of-call-report') {
      const callId = call?.id as string | undefined
      const assistantId = call?.assistantId as string | undefined
      if (!callId) return NextResponse.json({ received: true })

      const artifact = (msg?.artifact as Record<string, unknown> | undefined) ?? {}
      const transcript = (artifact?.transcript as string | undefined) ?? (call?.transcript as string | undefined) ?? ''
      const reason = (msg?.endedReason as string | undefined) ?? (call?.endedReason as string | undefined) ?? ''

      let startedAt = (call?.startedAt as string | undefined) ?? null
      let endedAt = (call?.endedAt as string | undefined) ?? null
      const VAPI_KEY = process.env.VAPI_API_KEY ?? ''
      if ((!endedAt || !call?.durationSeconds) && VAPI_KEY) {
        try {
          const vapiRes = await fetch(`https://api.vapi.ai/call/${callId}`, {
            headers: { Authorization: `Bearer ${VAPI_KEY}` },
          })
          if (vapiRes.ok) {
            const vapiCall = await vapiRes.json()
            startedAt = vapiCall.startedAt ?? startedAt
            endedAt = vapiCall.endedAt ?? endedAt
          }
        } catch {
          // Fall back to values in webhook payload.
        }
      }
      const calculatedDuration = (startedAt && endedAt)
        ? Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000)
        : 0
      const duration = (call?.durationSeconds as number | undefined) ?? calculatedDuration
      const outcome = deriveOutcome(transcript, reason, duration)

      const summary = (artifact?.summary as string | undefined) ?? (call?.summary as string | undefined) ?? ''
      const fullTranscript = summary
        ? `SUMMARY: ${summary}\n\nTRANSCRIPT:\n${transcript}`
        : transcript

      const { data: existing, error: existingErr } = await getSupabase()
        .from('calls')
        .select('id, caller_phone, shop_id')
        .eq('vapi_call_id', callId)
        .maybeSingle()
      if (existingErr) throw existingErr

      const existingPhone = normalizePhone((existing as { caller_phone?: string } | null)?.caller_phone ?? '')
      const customer = call?.customer as Record<string, unknown> | undefined
      const callerPhone = normalizePhone((customer?.number as string | undefined) ?? '') || existingPhone

      let shopId: string | null = existing?.shop_id ?? null

      if (existing) {
        const updatePayload: Record<string, unknown> = {
          ended_at: endedAt ?? null,
          duration_seconds: duration || null,
          outcome,
          transcript: fullTranscript || null,
          recording_url: ((artifact?.recording as Record<string, unknown> | undefined)?.stereoUrl as string | undefined) ?? (call?.stereoRecordingUrl as string | undefined) ?? null,
          caller_phone: callerPhone || '',
        }
        if (customer?.name) {
          updatePayload.caller_name = customer.name as string
        }
        await getSupabase().from('calls').update(updatePayload).eq('vapi_call_id', callId)
      } else {
        const shop = await findShop(assistantId ?? '')
        if (!shop) return NextResponse.json({ received: true })
        shopId = shop.id

        await getSupabase().from('calls').insert({
          shop_id: shop.id,
          caller_phone: callerPhone,
          caller_name: (customer?.name as string | undefined) ?? null,
          started_at: startedAt ?? new Date().toISOString(),
          ended_at: endedAt ?? null,
          duration_seconds: duration || null,
          outcome,
          transcript: fullTranscript || null,
          recording_url: ((artifact?.recording as Record<string, unknown> | undefined)?.stereoUrl as string | undefined) ?? (call?.stereoRecordingUrl as string | undefined) ?? null,
          vapi_call_id: callId,
        })
      }

      let callUuid = existing?.id
      if (!callUuid) {
        const { data: inserted } = await getSupabase()
          .from('calls')
          .select('id, shop_id')
          .eq('vapi_call_id', callId)
          .maybeSingle()
        callUuid = inserted?.id
        shopId = shopId ?? inserted?.shop_id ?? null
      }

      const shopForCall = shopId ? { id: shopId } : await findShop((assistantId ?? ''))
      let resolvedCustomerName = (customer?.name as string | undefined) ?? null

      if (callUuid && shopForCall?.id && callerPhone) {
        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
        const { data: recentBookings } = await getSupabase()
          .from('bookings')
          .select('customer_name, customer_phone, vehicle, id, industry, intake')
          .eq('shop_id', shopForCall.id)
          .is('call_id', null)
          .gte('created_at', tenMinAgo)
          .order('created_at', { ascending: false })
          .limit(10)

        const booking = (recentBookings ?? []).find((b) => normalizePhone(b.customer_phone) === callerPhone)

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
            .is('call_id', null)

          await syncCustomerRecord({
            shopId: shopForCall.id,
            phone: callerPhone || booking.customer_phone,
            name: booking.customer_name,
            vehicle: booking.vehicle,
            industry: booking.industry,
            intake: booking.intake,
            interactionAt: endedAt ?? startedAt ?? new Date().toISOString(),
            incrementVisitCount: false,
          })
        }
      }

      if (shopForCall?.id && callerPhone) {
        await syncCustomerRecord({
          shopId: shopForCall.id,
          phone: callerPhone,
          name: resolvedCustomerName,
          interactionAt: endedAt ?? startedAt ?? new Date().toISOString(),
          incrementVisitCount: !existing,
        })
      }

      return NextResponse.json({ received: true, type: 'end-of-call-report', outcome })
    }

    return NextResponse.json({ received: true, type: type ?? 'unknown' })
  } catch (err) {
    console.error('vapi-webhook error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
