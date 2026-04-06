import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VAPI_API_KEY = process.env.VAPI_API_KEY!
const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID!
const BOOKING_WEBHOOK_URL = process.env.BOOKING_WEBHOOK_URL || 'https://shopdesk-booking-production.up.railway.app/book'

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
}): string {
  const receptionistName = voiceNames[shop.ai_voice] ?? 'Sarah'
  const serviceList = shop.services.map(s =>
    `  - ${s.name}${s.price ? ` ($${s.price})` : ''}${s.description ? ` — ${s.description}` : ''}`
  ).join('\n')
  const hoursText = formatHours(shop.hours)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return `[Identity]
You are ${receptionistName}, the virtual receptionist at ${shop.name}.
You know this shop inside and out. You are warm, helpful, and professional.

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
Emergency contact: ${shop.emergency_contact_name || 'the shop owner'} at ${shop.emergency_contact || 'the shop'}.

[Error Handling]
Booking fails: take their number, promise a callback within the hour.
Outside scope: take their number, have a tech call them back.

Today is ${today}.`
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

export async function POST() {
  try {
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
    })

    const receptionistName = voiceNames[shop.ai_voice] ?? 'Sarah'
    const voice = voiceMap[shop.ai_voice] ?? voiceMap.patricia

    const agentPayload = {
      name: shop.name,
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
      // Update existing agent for this shop
      const updated = await vapiRequest(`/assistant/${shop.vapi_agent_id}`, 'PATCH', agentPayload)
      agentId = updated.id
    } else {
      // Create a brand new agent for this shop
      const created = await vapiRequest('/assistant', 'POST', agentPayload)
      agentId = created.id
    }

    // Assign this agent to the Twilio phone number
    await vapiRequest(`/phone-number/${VAPI_PHONE_NUMBER_ID}`, 'PATCH', {
      assistantId: agentId,
    })

    // Save to DB
    await supabase.from('shops').update({
      vapi_agent_id: agentId,
      onboarding_step: 'forwarding',
    }).eq('owner_id', user.id)

    return NextResponse.json({ success: true, agentId })

  } catch (err) {
    console.error('Provision error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
