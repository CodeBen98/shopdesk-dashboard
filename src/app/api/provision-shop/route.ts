import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildSystemPrompt, voiceNames, voiceMap, BOOKING_TOOLS } from '@/lib/shopPrompt'

const VAPI_API_KEY = process.env.VAPI_API_KEY!
const BOOKING_WEBHOOK_URL = process.env.BOOKING_WEBHOOK_URL || 'https://shopdesk-booking-production.up.railway.app/book'
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!


// Extract area code from a phone number string
function extractAreaCode(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  // Strip leading country code (1 for US)
  const local = digits.startsWith('1') && digits.length === 11 ? digits.slice(1) : digits
  return local.slice(0, 3) || '407' // default to Orlando
}

// Buy a new Twilio number matching the shop's area code
async function buyTwilioNumber(areaCode: string): Promise<{ sid: string; phoneNumber: string } | null> {
  try {
    // Search for available numbers in area code
    const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/US/Local.json?AreaCode=${areaCode}&SmsEnabled=true&VoiceEnabled=true`
    const searchRes = await fetch(searchUrl, {
      headers: { 'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64') }
    })
    const searchData = await searchRes.json()
    const available = searchData.available_phone_numbers ?? []

    // If no numbers in area code, try any US number
    let numberToBuy = available[0]?.phone_number
    if (!numberToBuy) {
      const fallbackUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/US/Local.json?SmsEnabled=true&VoiceEnabled=true`
      const fallbackRes = await fetch(fallbackUrl, {
        headers: { 'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64') }
      })
      const fallbackData = await fallbackRes.json()
      numberToBuy = fallbackData.available_phone_numbers?.[0]?.phone_number
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

    const systemPrompt = buildSystemPrompt({
      name: shop.name,
      address: shop.address,
      phone: shop.phone,
      hours: shop.hours,
      services: shop.services,
      emergency_contact: shop.emergency_contact,
      emergency_contact_name: shop.emergency_contact_name,
      ai_voice: shop.ai_voice,
    }, { vehicleTypes, ownerName })

    const receptionistName = voiceNames[shop.ai_voice] ?? 'Sarah'
    const voice = voiceMap[shop.ai_voice] ?? voiceMap.patricia

    const webhookUrl = 'https://app.shopdesk.site/api/vapi-webhook'
    const webhookSecret = process.env.VAPI_WEBHOOK_SECRET ?? ''

    const agentPayload = {
      name: shop.name,
      serverUrl: webhookUrl,
      serverUrlSecret: webhookSecret,
      model: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.7,
        tools: BOOKING_TOOLS(BOOKING_WEBHOOK_URL, shop.id),
      },
      voice: {
        provider: voice.provider,
        voiceId: voice.voiceId,
        model: voice.model,
      },
      firstMessage: `Thank you for calling ${shop.name}. This is ${receptionistName}, how can I help you today?`,
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
      const purchased = await buyTwilioNumber(areaCode)

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

    return NextResponse.json({ success: true, agentId })

  } catch (err) {
    console.error('Provision error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Full provision error:', msg)
    return NextResponse.json({ error: msg.slice(0, 500) }, { status: 500 })
  }
}
