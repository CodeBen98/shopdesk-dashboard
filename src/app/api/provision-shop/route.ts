import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildSystemPrompt, voiceNames, voiceMap, BOOKING_TOOLS, normalizeToE164 } from '@/lib/shopPrompt'
import { sendProvisioningStarted, sendProvisioningComplete } from '@/lib/email'

const VAPI_API_KEY = process.env.VAPI_API_KEY!
const BOOKING_WEBHOOK_URL = process.env.BOOKING_WEBHOOK_URL || 'https://shopdesk-booking.onrender.com/book'
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!


// Extract area code from a phone number string
function extractAreaCode(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  // Strip leading country code (1 for US)
  const local = digits.startsWith('1') && digits.length === 11 ? digits.slice(1) : digits
  return local.slice(0, 3) || '407' // default to Orlando
}

// Buy a new Twilio number matching the shop's area code, with geographic fallback
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

    // 1. Exact area code match (e.g. 407 for Orlando)
    let numberToBuy = await searchNumbers({ AreaCode: areaCode })
    if (numberToBuy) console.log(`Found exact area code match: ${areaCode}`)

    // 2. Geographically near the shop's number (finds adjacent area codes in same metro)
    if (!numberToBuy && shopPhone) {
      const digits = shopPhone.replace(/\D/g, '')
      const e164 = digits.startsWith('1') && digits.length === 11 ? `+${digits}` : `+1${digits}`
      numberToBuy = await searchNumbers({ NearNumber: e164, Distance: '50' })
      if (numberToBuy) console.log(`Found nearby number for ${areaCode} using NearNumber`)
    }

    // 3. Last resort: any available US number
    if (!numberToBuy) {
      numberToBuy = await searchNumbers({})
      if (numberToBuy) console.log(`Warning: no local number found for ${areaCode}, using any US number`)
    }

    if (!numberToBuy) return null

    // Purchase the number
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

    // Register number with A2P messaging service for SMS compliance
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID
    if (messagingServiceSid && buyData.sid) {
      try {
        await fetch(`https://messaging.twilio.com/v1/Services/${messagingServiceSid}/PhoneNumbers`, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ PhoneNumberSid: buyData.sid }).toString(),
        })
        console.log('Number registered to A2P messaging service:', buyData.phone_number)
      } catch (smsErr) {
        console.error('Failed to register number to messaging service (non-fatal):', smsErr)
      }
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
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { raw: text } }
  if (!res.ok) {
    console.error(`Vapi ${method} ${path} failed ${res.status}:`, text.slice(0, 500))
    throw new Error(`Vapi ${res.status}: ${text.slice(0, 200)}`)
  }
  return data
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { vehicleTypes, ownerName } = body as { vehicleTypes?: string[]; ownerName?: string }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (shopError || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // Rate limit: block re-provisioning within 2 minutes using an atomic update.
    // We only proceed if provision_attempted_at is null or older than 2 minutes.
    const twoMinAgo = new Date(Date.now() - 120_000).toISOString()
    const { data: claimed } = await supabase
      .from('shops')
      .update({ provision_attempted_at: new Date().toISOString() })
      .eq('owner_id', user.id)
      .or(`provision_attempted_at.is.null,provision_attempted_at.lt.${twoMinAgo}`)
      .select('id')
      .single()

    if (!claimed) {
      return NextResponse.json({ error: 'Please wait a moment before trying again.' }, { status: 429 })
    }

    // Email 1: notify business that setup has started
    if (user.email && shop.name) {
      sendProvisioningStarted({ to: user.email, shopName: shop.name }).catch(err =>
        console.error('sendProvisioningStarted failed (non-fatal):', err)
      )
    }

    const systemPrompt = buildSystemPrompt({
      name: shop.name,
      address: shop.address,
      phone: shop.phone,
      hours: shop.hours,
      services: shop.services,
      emergency_contact: shop.emergency_contact,
      emergency_contact_name: shop.emergency_contact_name,
      ai_voice: shop.ai_voice,
      industry: shop.industry,
      enrichment: shop.enrichment,
    }, { vehicleTypes, ownerName })

    const receptionistName = voiceNames[shop.ai_voice] ?? 'Sarah'
    const voice = voiceMap[shop.ai_voice] ?? voiceMap.patricia

    // Prefer the owner-reviewed enrichment greeting when available. Fall back
    // to the generic template for shops that skipped enrichment.
    const enrichmentGreeting = shop.enrichment?.owner_reviewed
      ? shop.enrichment.recommended_first_message
      : null
    const firstMessage = enrichmentGreeting && enrichmentGreeting.trim().length > 0
      ? enrichmentGreeting
          .replace(/\{receptionist\}/gi, receptionistName)
          .replace(/\{shop\}/gi, shop.name)
      : `Thank you for calling ${shop.name}. This is ${receptionistName}, how can I help you today?`

    const webhookUrl = 'https://app.shopdesk.site/api/vapi-webhook'
    const webhookSecret = process.env.VAPI_WEBHOOK_SECRET
    if (!webhookSecret) {
      return NextResponse.json({ error: 'Server misconfiguration: webhook secret not set.' }, { status: 500 })
    }

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
          ownerName || shop.emergency_contact_name,
          webhookSecret,
        ),
      },
      voice: {
        provider: voice.provider,
        voiceId: voice.voiceId,
        model: voice.model,
      },
      firstMessage,
    }

    let agentId: string

    if (shop.vapi_agent_id && shop.vapi_agent_id !== 'pending') {
      // Shop already has an agent — update it in place
      const updated = await vapiRequest(`/assistant/${shop.vapi_agent_id}`, 'PATCH', agentPayload)
      agentId = updated.id
    } else {
      // No saved agent ID for this shop — always create a fresh one to avoid cross-shop collisions.
      const created = await vapiRequest('/assistant', 'POST', agentPayload)
      agentId = created.id
    }

    // Assign phone number to agent — always production mode, one dedicated number per shop
    let assignedNumber = ''

    if (shop.twilio_number) {
      // Shop already has a dedicated number — reuse it, just update the agent assignment
      console.log('Reusing existing shop number:', shop.twilio_number)
      assignedNumber = shop.twilio_number
      const vapiNumbers = await vapiRequest('/phone-number?limit=100', 'GET')
      const numList = Array.isArray(vapiNumbers) ? vapiNumbers : vapiNumbers.results ?? []
      const match = numList.find((n: { number?: string; id: string }) => n.number === shop.twilio_number)
      if (match) {
        await vapiRequest(`/phone-number/${match.id}`, 'PATCH', { assistantId: agentId, serverUrl: webhookUrl })
      }
    } else {
      // Buy a new dedicated number for this shop
      const areaCode = extractAreaCode(shop.phone || '')
      console.log('Buying new number for area code', areaCode)
      const purchased = await buyTwilioNumber(areaCode, shop.phone)

      if (purchased) {
        assignedNumber = purchased.phoneNumber
        console.log('Bought number:', assignedNumber, 'SID:', purchased.sid)
        // Register with Vapi
        await vapiRequest('/phone-number', 'POST', {
          provider: 'twilio',
          twilioAccountSid: TWILIO_ACCOUNT_SID,
          twilioAuthToken: TWILIO_AUTH_TOKEN,
          number: purchased.phoneNumber,
          assistantId: agentId,
          serverUrl: webhookUrl,
        })
      } else {
        console.error('Number purchase failed — shop provisioning incomplete')
        return NextResponse.json({ error: 'Failed to purchase phone number. Please try again.' }, { status: 500 })
      }
    }

    // Save to DB
    await supabase.from('shops').update({
      vapi_agent_id: agentId,
      twilio_number: assignedNumber,
      onboarding_step: 'forwarding',
    }).eq('owner_id', user.id)

    // Email 2: you're live, here's how to activate forwarding
    if (user.email && shop.name) {
      sendProvisioningComplete({ to: user.email, shopName: shop.name, twilioNumber: assignedNumber }).catch(err =>
        console.error('sendProvisioningComplete failed (non-fatal):', err)
      )
    }

    return NextResponse.json({ success: true, agentId })

  } catch (err) {
    console.error('Provision error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Full provision error:', msg)
    return NextResponse.json({ error: msg.slice(0, 500) }, { status: 500 })
  }
}
