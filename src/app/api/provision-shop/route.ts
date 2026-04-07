import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VAPI_API_KEY = process.env.VAPI_API_KEY!
const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID!
const BOOKING_WEBHOOK_URL = process.env.BOOKING_WEBHOOK_URL || 'https://shopdesk-booking-production.up.railway.app/book'
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!
const SHARED_TWILIO_NUMBER = process.env.TWILIO_PHONE_NUMBER || '(407) 555-0123'
const TEST_MODE = process.env.SHOPDESK_TEST_MODE === 'true'

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

    return { sid: buyData.sid, phoneNumber: buyData.phone_number }
  } catch (err) {
    console.error('buyTwilioNumber error:', err)
    return null
  }
}

// Register a Twilio number with Vapi so Vapi can receive calls on it
async function registerNumberWithVapi(twilioSid: string, assistantId: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.vapi.ai/phone-number', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'twilio',
        number: '', // will be filled from twilioSid
        twilioAccountSid: TWILIO_ACCOUNT_SID,
        twilioAuthToken: TWILIO_AUTH_TOKEN,
        assistantId,
        // Use the Twilio SID to link
        numberE164CheckEnabled: false,
      }),
    })
    if (!res.ok) {
      // Fallback: just patch the existing shared number
      return null
    }
    const data = await res.json()
    return data.id
  } catch {
    return null
  }
}

const voiceNames: Record<string, string> = {
  patricia: 'Sarah',
  james: 'James',
  sofia: 'Sofia',
  marcus: 'Marcus',
}

const voiceMap: Record<string, { provider: string; voiceId: string; model: string }> = {
  patricia: { provider: 'cartesia', voiceId: 'e5a6cd18-d552-4192-9533-82a08cac8f23', model: 'sonic-2' },
  james:    { provider: 'cartesia', voiceId: '42b39f37-515f-4eee-8546-73e841679c1d', model: 'sonic-2' },
  sofia:    { provider: 'cartesia', voiceId: '90c7d657-9599-4cd0-9ed2-2568359e4d1a', model: 'sonic-2' },
  marcus:   { provider: 'cartesia', voiceId: '9301949d-b7cd-40d9-a246-5a4430992d6b', model: 'sonic-2' },
}

function formatHours(hours: Record<string, { open: boolean; from: string; to: string }>): string {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  return days.map(day => {
    const h = hours[day]
    if (!h || !h.open) return `  ${day.charAt(0).toUpperCase() + day.slice(1)}: Closed`
    return `  ${day.charAt(0).toUpperCase() + day.slice(1)}: ${h.from} to ${h.to}`
  }).join('\n')
}

function buildSystemPrompt(shop: {
  name: string
  address: string
  phone: string
  hours: Record<string, { open: boolean; from: string; to: string }>
  services: Array<{ name: string; price?: string | null; description?: string | null }>
  emergency_contact: string
  emergency_contact_name: string
  ai_voice: string
}, extras?: { vehicleTypes?: string[]; ownerName?: string }): string {
  const receptionistName = voiceNames[shop.ai_voice] ?? 'Sarah'
  const serviceList = shop.services.map(s =>
    `  - ${s.name}${s.price ? ` ($${s.price})` : ''}${s.description ? ` — ${s.description}` : ''}`
  ).join('\n')
  const hoursText = formatHours(shop.hours)
  // Note: do not hardcode date — Claude knows the current date natively
  const ownerName = extras?.ownerName || shop.emergency_contact_name || 'the shop owner'
  const vehicleTypes = extras?.vehicleTypes && extras.vehicleTypes.length > 0 ? extras.vehicleTypes : null

  return `[Identity]
You are ${receptionistName}, the virtual receptionist at ${shop.name}.
You know this shop inside and out. You are warm, helpful, and professional.
${extras?.ownerName ? `The owner/manager is ${extras.ownerName}. When customers ask to speak to someone, say you'll have ${extras.ownerName} call them back.` : ''}
Never say you are an AI. If asked, say you are the virtual receptionist for ${shop.name}.

[Style]
- Warm, genuine, direct. Real person energy.
- Maximum 2 short sentences per turn. Phone call rules.
- Natural contractions. No filler words like "Certainly" or "Absolutely".
- ONE question per turn. Never combine questions.
- Skip questions already answered in conversation.
- Did not understand: "Sorry, could you repeat that?"
- Never invent prices or times.

[Shop Info]
${shop.name} | ${shop.address}${shop.phone ? ` | ${shop.phone}` : ''}
Hours:
${hoursText}
${vehicleTypes ? `Vehicle types serviced: ${vehicleTypes.join(', ')}` : ''}
Services:
${serviceList || '  - General auto repair and maintenance'}

[Common Questions]
Pricing: prices vary by vehicle and service. We give a quote before any work begins — no surprises.
Check engine: we run a diagnostic scan to find out what's going on, usually takes about an hour.
Safe to drive: if you're hearing grinding, seeing smoke, or the car is overheating — do not drive it. For warning lights, get in as soon as you can.

[Booking Flow]
1. Find out what they need help with.
2. Collect: name, phone number, vehicle (year/make/model), service needed, preferred day and time — ONE question at a time.
3. Once you have everything, call the bookAppointment function.
4. After the function returns success, confirm the booking details back to the customer.
5. Ask if there is anything else.
6. When done, say a warm goodbye and call the endCall function.

Do NOT call endCall until the customer says they are done.
Do NOT say goodbye until you are ready to call endCall immediately after.

[Urgency]
Emergency keywords (overheating, smoke, brake failure, stranded, steering failure, won't start): respond with concern and safety first. Ask if they are safe. Then offer to book or take their number for a callback.
Urgent (warning lights, unusual sounds): acknowledge urgency, try to get them in same day or next day.

[Escalation]
Wants to speak to someone: take their name and phone number, call bookAppointment as a callback request, then say goodbye and call endCall.
Emergency contact: ${ownerName} at ${shop.emergency_contact || 'the shop'}.

[Error Handling]
Booking fails: take their number, promise a callback within the hour.
Outside scope: take their number, have a tech call them back.

When a customer mentions a day like "tomorrow" or "Monday", use your knowledge of the current date to confirm the specific date before booking.`
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

    const agentPayload = {
      name: shop.name,
      serverUrl: webhookUrl,
      model: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.7,
        tools: [
          {
            type: 'function',
            server: { url: BOOKING_WEBHOOK_URL },
            function: {
              name: 'bookAppointment',
              strict: true,
              description: 'Book a confirmed appointment. Call this once you have ALL required fields. Do not call with empty or missing fields.',
              parameters: {
                type: 'object',
                required: ['customer_name', 'customer_phone', 'vehicle_year', 'vehicle_make', 'vehicle_model', 'service', 'appointment_time'],
                properties: {
                  customer_name:    { type: 'string', description: 'Customer full name as spoken' },
                  customer_phone:   { type: 'string', description: 'Customer phone number as spoken' },
                  vehicle_year:     { type: 'string', description: 'Vehicle year, e.g. 2018' },
                  vehicle_make:     { type: 'string', description: 'Vehicle make, e.g. Honda' },
                  vehicle_model:    { type: 'string', description: 'Vehicle model, e.g. Accord' },
                  service:          { type: 'string', description: 'Service requested or issue description' },
                  appointment_time: { type: 'string', description: 'Day and time confirmed by customer, e.g. Thursday April 3 at 10am' },
                },
              },
            },
          },
          {
            type: 'endCall',
            function: {
              name: 'endCall',
              description: 'End the call. Only use after booking is confirmed and customer has said goodbye.',
            },
          },
        ],
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
      // No agent yet — check if one already exists in Vapi with this shop name
      // This handles the case where the shop row was deleted and re-onboarded
      const existingAgents = await vapiRequest('/assistant?limit=100', 'GET')
      const agents = Array.isArray(existingAgents) ? existingAgents : existingAgents.results ?? []
      const match = agents.find((a: { name?: string; id: string }) =>
        a.name?.toLowerCase() === shop.name.toLowerCase()
      )

      if (match) {
        // Found an existing agent with the same shop name — update it
        const updated = await vapiRequest(`/assistant/${match.id}`, 'PATCH', agentPayload)
        agentId = updated.id
      } else {
        // Truly new shop — create a fresh agent
        const created = await vapiRequest('/assistant', 'POST', agentPayload)
        agentId = created.id
      }
    }

    // Assign phone number to agent
    let assignedNumber = SHARED_TWILIO_NUMBER

    if (TEST_MODE) {
      // TEST MODE: use shared number, just point it to this agent
      console.log('TEST MODE: using shared number', SHARED_TWILIO_NUMBER)
      await vapiRequest(`/phone-number/${VAPI_PHONE_NUMBER_ID}`, 'PATCH', {
        assistantId: agentId,
      })
    } else {
      // PRODUCTION MODE: provision a dedicated number per shop
      if (shop.twilio_number && shop.twilio_number !== SHARED_TWILIO_NUMBER) {
        // Shop already has their own number — reuse it, just update the agent assignment
        console.log('Reusing existing shop number:', shop.twilio_number)
        assignedNumber = shop.twilio_number
        // Find the Vapi phone number ID for this number and update it
        const vapiNumbers = await vapiRequest('/phone-number?limit=100', 'GET')
        const numList = Array.isArray(vapiNumbers) ? vapiNumbers : vapiNumbers.results ?? []
        const match = numList.find((n: { number?: string; id: string }) => n.number === shop.twilio_number)
        if (match) {
          await vapiRequest(`/phone-number/${match.id}`, 'PATCH', { assistantId: agentId })
        }
      } else {
        // Buy a new dedicated number for this shop
        const areaCode = extractAreaCode(shop.phone || '')
        console.log('PRODUCTION MODE: buying new number for area code', areaCode)
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
          })
        } else {
          // Fallback to shared number if purchase failed
          console.error('Number purchase failed, falling back to shared number')
          await vapiRequest(`/phone-number/${VAPI_PHONE_NUMBER_ID}`, 'PATCH', { assistantId: agentId })
        }
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
