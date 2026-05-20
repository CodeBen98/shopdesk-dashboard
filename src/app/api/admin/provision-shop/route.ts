import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildSystemPrompt, voiceNames, voiceMap, BOOKING_TOOLS, normalizeToE164 } from '@/lib/shopPrompt'
import { isAdmin } from '@/lib/admin'

const VAPI_API_KEY        = process.env.VAPI_API_KEY!
const BOOKING_WEBHOOK_URL = process.env.BOOKING_WEBHOOK_URL || 'https://shopdesk-booking.onrender.com/book'
const TWILIO_ACCOUNT_SID  = process.env.TWILIO_ACCOUNT_SID!
const TWILIO_AUTH_TOKEN   = process.env.TWILIO_AUTH_TOKEN!

function extractAreaCode(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const local = digits.startsWith('1') && digits.length === 11 ? digits.slice(1) : digits
  return local.slice(0, 3) || '407'
}

async function buyTwilioNumber(areaCode: string, shopPhone?: string): Promise<{ sid: string; phoneNumber: string } | null> {
  try {
    const auth = 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')
    const base = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/US/Local.json`

    async function searchNumbers(params: Record<string, string>): Promise<string | null> {
      const qs = new URLSearchParams({ SmsEnabled: 'true', VoiceEnabled: 'true', ...params }).toString()
      const res = await fetch(`${base}?${qs}`, { headers: { Authorization: auth } })
      const data = await res.json()
      return data.available_phone_numbers?.[0]?.phone_number ?? null
    }

    let numberToBuy = await searchNumbers({ AreaCode: areaCode })

    if (!numberToBuy && shopPhone) {
      const digits = shopPhone.replace(/\D/g, '')
      const e164 = digits.startsWith('1') && digits.length === 11 ? `+${digits}` : `+1${digits}`
      numberToBuy = await searchNumbers({ NearNumber: e164, Distance: '50' })
    }

    if (!numberToBuy) numberToBuy = await searchNumbers({})
    if (!numberToBuy) return null

    const buyRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ PhoneNumber: numberToBuy }).toString(),
    })
    const buyData = await buyRes.json()
    if (!buyRes.ok) throw new Error(`Twilio buy failed: ${JSON.stringify(buyData)}`)

    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID
    if (messagingServiceSid && buyData.sid) {
      await fetch(`https://messaging.twilio.com/v1/Services/${messagingServiceSid}/PhoneNumbers`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ PhoneNumberSid: buyData.sid }).toString(),
      }).catch(err => console.error('A2P registration failed (non-fatal):', err))
    }

    return { sid: buyData.sid, phoneNumber: buyData.phone_number }
  } catch (err) {
    console.error('buyTwilioNumber error:', err)
    return null
  }
}

async function vapiRequest(path: string, method: string, body?: object) {
  const res = await fetch(`https://api.vapi.ai${path}`, {
    method,
    headers: { 'Authorization': `Bearer ${VAPI_API_KEY}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { raw: text } }
  if (!res.ok) throw new Error(`Vapi ${res.status}: ${text.slice(0, 200)}`)
  return data
}

// POST /api/admin/provision-shop
// Body: { shopId: string }
// Provisions (or re-provisions) any shop by ID. Admin-only.
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { shopId } = await request.json()
    if (!shopId) return NextResponse.json({ error: 'shopId required' }, { status: 400 })

    const admin = createAdminClient()
    const { data: shop, error: shopErr } = await admin
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single()

    if (shopErr || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    if (!shop.name) {
      return NextResponse.json({ error: 'Shop has no name — complete intake first' }, { status: 400 })
    }

    const webhookUrl = 'https://app.shopdesk.site/api/vapi-webhook'
    const webhookSecret = process.env.VAPI_WEBHOOK_SECRET
    if (!webhookSecret) return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })

    const systemPrompt = buildSystemPrompt({
      name: shop.name,
      address: shop.address,
      phone: shop.phone,
      hours: shop.hours,
      services: shop.services,
      emergency_contact: shop.emergency_contact,
      emergency_contact_name: shop.emergency_contact_name,
      ai_voice: shop.ai_voice || 'jacqueline',
      industry: shop.industry,
      enrichment: shop.enrichment,
    }, {})

    const receptionistName = voiceNames[shop.ai_voice ?? 'jacqueline'] ?? 'Jacqueline'
    const voice = voiceMap[shop.ai_voice ?? 'jacqueline'] ?? voiceMap.jacqueline
    const firstMessage = `Thank you for calling ${shop.name}. This is ${receptionistName}, how can I help you today?`

    const agentPayload = {
      name: shop.name,
      serverUrl: webhookUrl,
      serverUrlSecret: webhookSecret,
      model: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.7,
        tools: BOOKING_TOOLS(
          BOOKING_WEBHOOK_URL,
          shop.id,
          normalizeToE164(shop.emergency_contact),
          shop.emergency_contact_name,
          webhookSecret,
        ),
      },
      voice: { provider: voice.provider, voiceId: voice.voiceId, model: voice.model },
      firstMessage,
    }

    let agentId: string
    if (shop.vapi_agent_id && shop.vapi_agent_id !== 'pending') {
      const updated = await vapiRequest(`/assistant/${shop.vapi_agent_id}`, 'PATCH', agentPayload)
      agentId = updated.id
    } else {
      const created = await vapiRequest('/assistant', 'POST', agentPayload)
      agentId = created.id
    }

    let assignedNumber = shop.twilio_number || ''

    if (!assignedNumber) {
      const areaCode = extractAreaCode(shop.phone || '')
      const purchased = await buyTwilioNumber(areaCode, shop.phone)

      if (!purchased) {
        return NextResponse.json({ error: 'Failed to purchase phone number' }, { status: 500 })
      }

      assignedNumber = purchased.phoneNumber

      await vapiRequest('/phone-number', 'POST', {
        provider: 'twilio',
        twilioAccountSid: TWILIO_ACCOUNT_SID,
        twilioAuthToken: TWILIO_AUTH_TOKEN,
        number: purchased.phoneNumber,
        assistantId: agentId,
        serverUrl: webhookUrl,
      })
    } else {
      const vapiNumbers = await vapiRequest('/phone-number?limit=100', 'GET')
      const numList = Array.isArray(vapiNumbers) ? vapiNumbers : vapiNumbers.results ?? []
      const match = numList.find((n: { number?: string; id: string }) => n.number === assignedNumber)
      if (match) {
        await vapiRequest(`/phone-number/${match.id}`, 'PATCH', { assistantId: agentId, serverUrl: webhookUrl })
      }
    }

    await admin.from('shops').update({
      vapi_agent_id: agentId,
      twilio_number: assignedNumber,
      status: 'live',
      onboarding_complete: true,
      provision_attempted_at: new Date().toISOString(),
    }).eq('id', shopId)

    return NextResponse.json({ success: true, agentId, twilio_number: assignedNumber })
  } catch (err) {
    console.error('Admin provision error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg.slice(0, 500) }, { status: 500 })
  }
}
