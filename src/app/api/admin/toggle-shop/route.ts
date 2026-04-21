import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildSystemPrompt, voiceNames, voiceMap, BOOKING_TOOLS } from '@/lib/shopPrompt'

const ADMIN_EMAIL = 'slarve@shopdesk.site'
const VAPI_API_KEY = process.env.VAPI_API_KEY!
const BOOKING_WEBHOOK_URL = process.env.BOOKING_WEBHOOK_URL || 'https://shopdesk-booking-production.up.railway.app/book'

const PAUSED_PROMPT = `[Identity]
You are a virtual receptionist for this shop.
The shop is temporarily unavailable for booking via this line.

[Instructions]
Apologize briefly and let the caller know the shop is temporarily unavailable.
Ask them to call back later or try the shop's main number.
Do NOT offer to book or collect any information.
End the call politely after one exchange.`

async function vapiPatch(agentId: string, body: object) {
  const res = await fetch(`https://api.vapi.ai/assistant/${agentId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Vapi PATCH failed ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { shopId, action } = await request.json() as { shopId: string; action: 'pause' | 'unpause' }

    if (!shopId || !['pause', 'unpause'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: shop, error: shopError } = await admin
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single()

    if (shopError || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    if (!shop.vapi_agent_id || shop.vapi_agent_id === 'pending') {
      return NextResponse.json({ error: 'Shop has no provisioned agent' }, { status: 400 })
    }

    if (action === 'pause') {
      await vapiPatch(shop.vapi_agent_id, {
        model: {
          provider: 'anthropic',
          model: 'claude-sonnet-4-6',
          messages: [{ role: 'system', content: PAUSED_PROMPT }],
          temperature: 0.3,
          tools: [],
        },
      })
      await admin.from('shops').update({ status: 'paused' }).eq('id', shopId)
      return NextResponse.json({ success: true, status: 'paused' })
    }

    // Unpause: rebuild full prompt from shop data
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

    await vapiPatch(shop.vapi_agent_id, {
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
    })

    await admin.from('shops').update({ status: 'live' }).eq('id', shopId)
    return NextResponse.json({ success: true, status: 'live' })

  } catch (err) {
    console.error('toggle-shop error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg.slice(0, 500) }, { status: 500 })
  }
}
