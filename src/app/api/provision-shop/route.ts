import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VAPI_API_KEY = process.env.VAPI_API_KEY!
const VAPI_AGENT_ID = process.env.VAPI_AGENT_ID || 'e8a8e086-7098-42d7-b842-26ea577aedf2'
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!

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
  const voiceNames: Record<string, string> = {
    patricia: 'Sarah',
    james: 'James',
    sofia: 'Sofia',
    marcus: 'Marcus',
  }
  const receptionistName = voiceNames[shop.ai_voice] ?? 'Sarah'
  const serviceList = shop.services.map(s => `  - ${s.name}${s.price ? ` ($${s.price})` : ''}`).join('\n')
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
2. Collect: name, phone number, vehicle (year/make/model), service needed, preferred day and time — ONE question at a time with a natural pause between each.
3. Once you have everything, call the bookAppointment function.
4. After the function returns success, confirm the booking details back to the customer.
5. Ask if there is anything else.
6. When they are done, say a warm goodbye and call the endCall function.

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

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get shop data
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (shopError || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // Step 1: Build system prompt from shop data
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

    // Step 2: Voice mapping
    const voiceNames: Record<string, string> = {
      patricia: 'Sarah', james: 'James', sofia: 'Sofia', marcus: 'Marcus',
    }

    // Vapi voice IDs
    const voiceMap: Record<string, { provider: string; voiceId: string }> = {
      patricia: { provider: 'cartesia', voiceId: '79a125e8-cd45-4c13-8a67-188112f4dd22' }, // Sonic Cindy
      james:    { provider: 'cartesia', voiceId: '638efaaa-4d0c-442e-b701-3fae16aad012' }, // Sonic James
      sofia:    { provider: 'cartesia', voiceId: '573e3144-a684-4e72-ac2b-9b2063a50b53' }, // Sonic Sofia
      marcus:   { provider: 'cartesia', voiceId: 'b9de4a89-2257-424b-94c2-db18ba68c81a' }, // Sonic Marcus
    }
    const voice = voiceMap[shop.ai_voice] ?? voiceMap.patricia

    // Step 3: Push to Vapi
    const vapiResponse = await fetch(`https://api.vapi.ai/assistant/${VAPI_AGENT_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: shop.name,
        model: {
          provider: 'anthropic',
          model: 'claude-sonnet-4-5',
          messages: [{ role: 'system', content: systemPrompt }],
          temperature: 0.7,
        },
        voice: {
          provider: voice.provider,
          voiceId: voice.voiceId,
        },
        firstMessage: `Thank you for calling ${shop.name}. This is ${voiceNames[shop.ai_voice] ?? 'Sarah'}, how can I help you today?`,
      }),
    })

    if (!vapiResponse.ok) {
      const err = await vapiResponse.text()
      console.error('Vapi error:', err)
      return NextResponse.json({ error: 'Failed to update AI agent', details: err }, { status: 500 })
    }

    const vapiData = await vapiResponse.json()

    // Step 4: Save to DB
    await supabase.from('shops').update({
      vapi_agent_id: VAPI_AGENT_ID,
      onboarding_step: 'forwarding',
    }).eq('owner_id', user.id)

    return NextResponse.json({
      success: true,
      agentId: vapiData.id ?? VAPI_AGENT_ID,
      prompt: systemPrompt,
    })

  } catch (err) {
    console.error('Provision error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
