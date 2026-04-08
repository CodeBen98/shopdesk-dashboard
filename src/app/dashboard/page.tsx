import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Call, Booking } from '@/types'

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

function formatDuration(seconds: number | null) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDateTime(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: 'America/New_York',
  })
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
    // Trigger failed — create shop row and send to onboarding
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

  const [callsResult, bookingsResult, missedResult, recentCallsResult, upcomingResult] = await Promise.all([
    supabase.from('calls').select('id', { count: 'exact' }).eq('shop_id', shop.id),
    supabase.from('bookings').select('id', { count: 'exact' }).eq('shop_id', shop.id),
    supabase.from('calls').select('id', { count: 'exact' }).eq('shop_id', shop.id).eq('outcome', 'missed'),
    supabase.from('calls').select('*').eq('shop_id', shop.id).order('started_at', { ascending: false }).limit(10),
    supabase.from('bookings').select('*').eq('shop_id', shop.id)
      .gte('appointment_at', new Date().toISOString())
      .order('appointment_at', { ascending: true })
      .limit(5),
  ])

  const totalCalls = callsResult.count ?? 0
  const totalBookings = bookingsResult.count ?? 0
  const missedCalls = missedResult.count ?? 0
  const revenueRecovered = totalBookings * 650
  const recentCalls: Call[] = recentCallsResult.data ?? []
  const upcomingBookings: Booking[] = upcomingResult.data ?? []

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-space)', fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
          Overview
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Your AI receptionist is live. Here&apos;s what&apos;s happening.
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
        {[
          { label: 'Calls Handled', value: totalCalls.toLocaleString(), sub: 'all time' },
          { label: 'Bookings Made', value: totalBookings.toLocaleString(), sub: 'all time' },
          { label: 'No Booking', value: missedCalls.toLocaleString(), sub: 'caller didn\'t book' },
          { label: 'Revenue Recovered', value: `$${revenueRecovered.toLocaleString()}`, sub: 'est. at $650/booking' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '20px 24px',
          }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {stat.label}
            </div>
            <div style={{
              fontSize: 30,
              fontWeight: 700,
              color: 'var(--text)',
              fontFamily: 'var(--font-space)',
              lineHeight: 1,
              marginBottom: 6,
            }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{stat.sub}</div>
          </div>
        ))}
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
                      <Link href="/dashboard/calls" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
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
        @media (max-width: 1100px) {
          .dashboard-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
