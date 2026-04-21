import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendDeletionConfirmation } from '@/lib/email'

const ADMIN_EMAIL = 'slarve@shopdesk.site'
const VAPI_API_KEY = process.env.VAPI_API_KEY!
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!

const twilioAuth = () => 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')

async function releaseTwilioNumber(phoneNumber: string) {
  const searchRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(phoneNumber)}`,
    { headers: { Authorization: twilioAuth() } }
  )
  const searchData = await searchRes.json()
  const sid = searchData.incoming_phone_numbers?.[0]?.sid
  if (!sid) {
    console.warn('No Twilio SID found for', phoneNumber, '-- may already be released')
    return
  }
  const deleteRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers/${sid}.json`,
    { method: 'DELETE', headers: { Authorization: twilioAuth() } }
  )
  if (!deleteRes.ok && deleteRes.status !== 404) {
    throw new Error(`Twilio release failed: ${deleteRes.status}`)
  }
  console.log('Released Twilio number:', phoneNumber)
}

async function deleteVapiAssistant(agentId: string) {
  const res = await fetch(`https://api.vapi.ai/assistant/${agentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${VAPI_API_KEY}` },
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`Vapi delete failed: ${res.status}`)
  }
  console.log('Deleted Vapi assistant:', agentId)
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
    if (shop.status === 'deleted') return NextResponse.json({ error: 'Already deleted' }, { status: 400 })

    const errors: string[] = []

    // 1. Release Twilio number
    if (shop.twilio_number) {
      try { await releaseTwilioNumber(shop.twilio_number) }
      catch (e) { errors.push(`Twilio: ${e instanceof Error ? e.message : e}`) }
    }

    // 2. Delete Vapi assistant
    if (shop.vapi_agent_id) {
      try { await deleteVapiAssistant(shop.vapi_agent_id) }
      catch (e) { errors.push(`Vapi: ${e instanceof Error ? e.message : e}`) }
    }

    // 3. Anonymize shop row (GDPR -- clear all personal data, keep record for accounting)
    await admin.from('shops').update({
      name: '[deleted]',
      address: null,
      phone: null,
      email: null,
      owner_phone: null,
      emergency_contact: null,
      emergency_contact_name: null,
      services: [],
      hours: {},
      ai_voice: null,
      twilio_number: null,
      vapi_agent_id: null,
      google_refresh_token: null,
      google_calendar_id: null,
      status: 'deleted',
      deleted_at: new Date().toISOString(),
    }).eq('id', shopId)

    // 4. Capture email + send confirmation BEFORE deleting auth user
    let ownerEmail: string | undefined
    try {
      const { data: ownerUser } = await admin.auth.admin.getUserById(shop.owner_id)
      ownerEmail = ownerUser?.user?.email
    } catch { /* non-fatal */ }

    if (ownerEmail) {
      try {
        await sendDeletionConfirmation({ to: ownerEmail, shopName: shop.name })
      } catch (emailErr) {
        console.error('Deletion email failed (non-fatal):', emailErr)
      }
    }

    // 5. Delete Supabase auth account
    try {
      await admin.auth.admin.deleteUser(shop.owner_id)
      console.log('Deleted auth user:', shop.owner_id)
    } catch (e) {
      errors.push(`Auth delete: ${e instanceof Error ? e.message : e}`)
    }

    return NextResponse.json({
      success: true,
      warnings: errors.length > 0 ? errors : undefined,
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('delete-shop error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
