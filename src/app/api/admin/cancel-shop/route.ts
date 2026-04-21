import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildSystemPrompt, voiceNames, voiceMap, BOOKING_TOOLS } from '@/lib/shopPrompt'
import { sendCancellationNotice } from '@/lib/email'

const ADMIN_EMAIL = 'slarve@shopdesk.site'
const VAPI_API_KEY = process.env.VAPI_API_KEY!
const BOOKING_WEBHOOK_URL = process.env.BOOKING_WEBHOOK_URL || 'https://shopdesk-booking-production.up.railway.app/book'

const CANCELLING_PROMPT = `[Identity]
You are a virtual receptionist for this shop.
This shop is in the process of cancelling their service and is no longer accepting bookings via this line.

[Instructions]
Let the caller know the shop is not currently taking bookings through this line.
Ask them to call the shop's main number directly.
End the call politely after one exchange.`

async function vapiPatch(agentId: string, body: object) {
  const res = await fetch(`https://api.vapi.ai/assistant/${agentId}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${VAPI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Vapi PATCH failed ${res.status}`)
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { shopId } = await request.json() as { shopId: string }
    if (!shopId) return NextResponse.json({ error: 'Missing shopId' }, { status: 400 })

    const admin = createAdminClient()
    const { data: shop } = await admin.from('shops').select('*').eq('id', shopId).single()
    if (!shop) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

    // Deactivate Vapi agent if provisioned
    if (shop.vapi_agent_id) {
      await vapiPatch(shop.vapi_agent_id, {
        model: {
          provider: 'anthropic',
          model: 'claude-sonnet-4-6',
          messages: [{ role: 'system', content: CANCELLING_PROMPT }],
          temperature: 0.3,
          tools: [],
        },
      })
    }

    // 30-day cancellation window
    const cancelledAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    await admin.from('shops').update({
      status: 'cancelling',
      cancelled_at: cancelledAt,
    }).eq('id', shopId)

    // Send cancellation notice email
    try {
      const { data: ownerUser } = await admin.auth.admin.getUserById(shop.owner_id)
      if (ownerUser?.user?.email) {
        await sendCancellationNotice({
          to: ownerUser.user.email,
          shopName: shop.name,
          deleteDate: cancelledAt,
        })
      }
    } catch (emailErr) {
      console.error('Cancellation email failed (non-fatal):', emailErr)
    }

    return NextResponse.json({ success: true, cancelled_at: cancelledAt })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// Restore -- undo cancellation (admin changes their mind)
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { shopId } = await request.json() as { shopId: string }
    const admin = createAdminClient()
    const { data: shop } = await admin.from('shops').select('*').eq('id', shopId).single()
    if (!shop) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Restore full Vapi prompt
    if (shop.vapi_agent_id) {
      const systemPrompt = buildSystemPrompt({
        name: shop.name, address: shop.address, phone: shop.phone,
        hours: shop.hours, services: shop.services,
        emergency_contact: shop.emergency_contact,
        emergency_contact_name: shop.emergency_contact_name,
        ai_voice: shop.ai_voice,
      })
      const voice = voiceMap[shop.ai_voice] ?? voiceMap.patricia
      const receptionistName = voiceNames[shop.ai_voice] ?? 'Sarah'
      await vapiPatch(shop.vapi_agent_id, {
        model: {
          provider: 'anthropic', model: 'claude-sonnet-4-6',
          messages: [{ role: 'system', content: systemPrompt }],
          temperature: 0.7,
          tools: BOOKING_TOOLS(BOOKING_WEBHOOK_URL, shop.id),
        },
        voice: { provider: voice.provider, voiceId: voice.voiceId, model: voice.model },
        firstMessage: `Thank you for calling ${shop.name}. This is ${receptionistName}, how can I help you today?`,
      })
    }

    await admin.from('shops').update({
      status: 'live',
      cancelled_at: null,
      cancel_reason: null,
      cancel_requested_at: null,
    }).eq('id', shopId)

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
