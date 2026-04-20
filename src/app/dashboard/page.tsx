import { formatDateTime, formatDuration } from '@/lib/utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Call, Booking } from '@/types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Overview | ShopDesk' }

function OutcomeBadge({ outcome }: { outcome: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    booked:     { bg: 'var(--success-dim)',  color: 'var(--success)',  label: 'Booked' },
    missed:     { bg: 'rgba(255,255,255,0.06)', color: 'var(--muted)', label: 'No Booking' },
    info_only:  { bg: 'rgba(255,255,255,0.07)', color: 'var(--muted)', label: 'Info Only' },
    emergency:  { bg: 'var(--warning-dim)',  color: 'var(--warning)',  label: 'Emergency' },
  }
  const s = styles[outcome] ?? styles.info_only
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 8px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      background: s.bg,
      color: s.color,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: shop } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!shop) {
    await supabase.from('shops').insert({ owner_id: user.id, name: '', hours: {
      monday:    { open: true,  from: '09:00', to: '17:00' },
      tuesday:   { open: true,  from: '09:00', to: '17:00' },
      wednesday: { open: true,  from: '09:00', to: '17:00' },
      thursday:  { open: true,  from: '09:00', to: '17:00' },
      friday:    { open: true,  from: '09:00', to: '17:00' },
      saturday:  { open: false, from: '09:00', to: '17:00' },
      sunday:    { open: false, from: '09:00', to: '17:00' },
    } })
    redirect('/onboard')
  }
  if (!shop.onboarding_complete) redirect('/onboard')

  const [callsResult, bookingsResult, missedResult, recentCallsResult, upcomingResult, lastCallResult] = await Promise.all([
    supabase.from('calls').select('id', { count: 'exact' }).eq('shop_id', shop.id),
    supabase.from('bookings').select('id', { count: 'exact' }).eq('shop_id', shop.id),
    supabase.from('calls').select('id', { count: 'exact' }).eq('shop_id', shop.id).eq('outcome', 'missed'),
    supabase.from('calls').select('*').eq('shop_id', shop.id).order('started_at', { ascending: false }).limit(10),
    supabase.from('bookings').select('*').eq('shop_id', shop.id).eq('status', 'scheduled')
      .order('appointment_at', { ascending: true })
      .limit(5),
    supabase.from('calls').select('started_at').eq('shop_id', shop.id).order('started_at', { ascending: false }).limit(1),
  ])

  const totalCalls = callsResult.count ?? 0
  const totalBookings = bookingsResult.count ?? 0
  const missedCalls = missedResult.count ?? 0
  const allTimeRevenue = totalBookings * 650
  const recentCalls: Call[] = recentCallsResult.data ?? []
  const upcomingBookings: Booking[] = upcomingResult.data ?? []

  const lastCallRow = lastCallResult.data?.[0]
  const lastCallText = lastCallRow
    ? `Last call: ${formatDateTime(lastCallRow.started_at)}`
    : 'Waiting for first call'

  let headerSub: string
  if (totalCalls === 0) {
    headerSub = "You're live! Make a test call to confirm everything works."
  } else if (totalBookings === 0) {
    headerSub = "Your AI is handling calls. No bookings yet — check your forwarding setup."
  } else {
    headerSub = "Your AI receptionist is live. Here's what's happening."
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-space)', fontSize: 'clamp(1.5rem, 3vw, 1.9rem)', fontWeight: 800, color: 'var(--text)', marginBottom: 4, letterSpacing: '-0.5px' }}>
          Overview
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          {headerSub}
        </p>
      </div>

      {/* AI Status banner */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: 'var(--success)',
            boxShadow: '0 0 0 3px var(--success-dim)',
            flexShrink: 0,
          }} />
          <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>AI Receptionist is Live</span>
          {shop.twilio_number && (
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>· {shop.twilio_number}</span>
          )}
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>· {lastCallText}</span>
        </div>
        {shop.twilio_number && (
          <a
            href={`tel:${shop.twilio_number}`}
            style={{
              fontSize: 13,
              color: 'var(--accent)',
              textDecoration: 'none',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            Make a test call →
          </a>
        )}
      </div>

      {/* Stats strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16,
        marginBottom: 32,
      }}>
        {/* Calls Handled */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Calls Handled
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-space)', lineHeight: 1, marginBottom: 6, letterSpacing: '-0.5px' }}>
            {totalCalls.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>(all time)</div>
        </div>

        {/* Bookings Made */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Bookings Made
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-space)', lineHeight: 1, marginBottom: 6, letterSpacing: '-0.5px' }}>
            {totalBookings.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>(all time)</div>
        </div>

        {/* Missed Opportunities */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Missed Opportunities
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-space)', lineHeight: 1, marginBottom: 6, letterSpacing: '-0.5px' }}>
            {missedCalls.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>callers who did not book</div>
        </div>

        {/* Revenue Recovered */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 5 }}>
            Revenue Recovered
            <span
              title="Estimated at $650 average repair order (AAPEX 2024 industry average). Actual results vary."
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 14, height: 14, borderRadius: '50%',
                border: '1px solid var(--muted)',
                fontSize: 10, fontWeight: 700,
                cursor: 'help', flexShrink: 0, lineHeight: 1,
              }}
            >
              i
            </span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: allTimeRevenue > 0 ? 'var(--text)' : 'var(--muted)', fontFamily: 'var(--font-space)', lineHeight: 1, marginBottom: 6 }}>
            {allTimeRevenue > 0 ? `$${allTimeRevenue.toLocaleString()}` : '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {allTimeRevenue > 0 ? 'est. at $650/booking, industry avg' : 'updates after first booking'}
          </div>
        </div>

        {/* AI Status */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            AI Status
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: 'var(--success)',
              boxShadow: '0 0 0 3px var(--success-dim)',
              flexShrink: 0,
            }} />
            <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-space)', lineHeight: 1, letterSpacing: '-0.5px' }}>
              Live 24/7
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>always on</div>
        </div>
      </div>

      {/* Two column layout: recent calls + upcoming bookings */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        gap: 20,
        alignItems: 'stretch',
      }} className="dashboard-grid">
        {/* Recent Calls */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-space)', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
              Recent Calls
            </h2>
            <Link href="/dashboard/calls" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
              View all →
            </Link>
          </div>

          {recentCalls.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ margin: '0 auto 12px', opacity: 0.4 }}>
                <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M13 14h4l2.5 5-2.5 2c1.5 2.5 5 6 7.5 7.5l2-2.5 5 2.5v4a2 2 0 01-2 2C17.6 34.5 6 22.9 6 9a2 2 0 012-2h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-mid)', marginBottom: 6 }}>No calls yet</div>
              <div style={{ fontSize: 13 }}>Your AI receptionist is ready. Make a test call to</div>
              {shop.twilio_number && (
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginTop: 4 }}>
                  {shop.twilio_number}
                </div>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Time', 'Caller', 'Duration', 'Outcome', ''].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', fontSize: 11, color: 'var(--muted)',
                      fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                      paddingBottom: 10, borderBottom: '1px solid var(--border)',
                      paddingRight: 12,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentCalls.map((call: Call) => (
                  <tr key={call.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 12px 12px 0', fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {formatDateTime(call.started_at)}
                    </td>
                    <td style={{ padding: '12px 12px 12px 0', fontSize: 13, color: 'var(--text)' }}>
                      {call.caller_name || call.caller_phone || 'Unknown'}
                    </td>
                    <td style={{ padding: '12px 12px 12px 0', fontSize: 13, color: 'var(--muted)' }}>
                      {formatDuration(call.duration_seconds)}
                    </td>
                    <td style={{ padding: '12px 12px 12px 0' }}>
                      <OutcomeBadge outcome={call.outcome ?? 'info_only'} />
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'right' }}>
                      <Link href={`/dashboard/calls?expand=${call.id}`} style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Upcoming Bookings */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-space)', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
              Upcoming Bookings
            </h2>
            <Link href="/dashboard/bookings" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
              View all →
            </Link>
          </div>

          {upcomingBookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--muted)' }}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ margin: '0 auto 12px', opacity: 0.4 }}>
                <rect x="3" y="6" width="30" height="27" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10 3v6M26 3v6M3 15h30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-mid)' }}>No upcoming bookings</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {upcomingBookings.map((booking: Booking) => (
                <div key={booking.id} style={{
                  padding: '12px 14px',
                  background: 'var(--card-raised)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                    {booking.customer_name || 'Unknown customer'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                    {booking.service || 'Service not specified'}
                    {booking.vehicle && ` · ${booking.vehicle}`}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
                    {formatDateTime(booking.appointment_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 1200px) {
          .dashboard-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
