import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_TYPES = ['pause_requested', 'cancel_requested'] as const
type RequestType = typeof VALID_TYPES[number]

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { type, reason } = body as { type: RequestType; reason?: string }
  if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  if (reason !== undefined && (typeof reason !== 'string' || reason.length > 200)) {
    return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
  }

  // Try full update with new columns, fall back to status-only if migration hasn't run yet
  const fullUpdate = {
    status: type,
    ...(reason ? { cancel_reason: reason } : {}),
    ...(type === 'cancel_requested' ? { cancel_requested_at: new Date().toISOString() } : {}),
  }

  const { error } = await supabase.from('shops').update(fullUpdate).eq('owner_id', user.id)

  if (error) {
    // Columns may not exist yet -- fall back to status only
    const { error: fallbackError } = await supabase
      .from('shops')
      .update({ status: type })
      .eq('owner_id', user.id)
    if (fallbackError) return NextResponse.json({ error: fallbackError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
