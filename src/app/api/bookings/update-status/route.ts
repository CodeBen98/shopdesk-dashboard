import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_TRANSITIONS: Record<string, string[]> = {
  scheduled:  ['completed', 'cancelled'],
  confirmed:  ['completed', 'cancelled'],
  completed:  [],
  cancelled:  [],
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { bookingId, status } = await request.json() as { bookingId: string; status: string }
    if (!bookingId || typeof bookingId !== 'string') {
      return NextResponse.json({ error: 'Invalid bookingId' }, { status: 400 })
    }

    // Fetch the booking -- RLS ensures only the shop owner can see it
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, status, shop_id')
      .eq('id', bookingId)
      .single()

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const allowed = VALID_TRANSITIONS[booking.status] ?? []
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: `Cannot transition from ${booking.status} to ${status}` }, { status: 400 })
    }

    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[bookings/update-status] failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
