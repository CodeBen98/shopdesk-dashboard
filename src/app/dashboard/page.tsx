import { formatDateTime, formatDuration } from '@/lib/utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
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
  if (isAdmin(user)) redirect('/admin')

  const { data: existingShop } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  let shop = existingShop

  if (!shop) {
    const { data: createdShop } = await supabase.from('shops').insert({ owner_id: user.id, name: '', hours: {
      monday:    { open: true,  from: '09:00', to: '17:00' },
      tuesday:   { open: true,  from: '09:00', to: '17:00' },
      wednesday: { open: true,  from: '09:00', to: '17:00' },
      thursday:  { open: true,  from: '09:00', to: '17:00' },
      friday:    { open: true,  from: '09:00', to: '17:00' },
      saturday:  { open: false, from: '09:00', to: '17:00' },
      sunday:    { open: false, from: '09:00', to: '17:00' },
    } }).select('*').single()
    shop = createdShop
  }

  if (!shop) redirect('/auth/login')

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

  const setupTasks = [
    { label: 'Add business details', done: Boolean(shop.name && shop.phone && shop.address) },
    { label: 'Choose industry', done: Boolean(shop.industry) },
    { label: 'Add hours and services', done: Boolean(shop.services?.length) },
    { label: 'Connect calendar', done: Boolean(shop.google_refresh_token) },
    { label: 'Choose voice and provision agent', done: Boolean(shop.vapi_agent_id && shop.twilio_number) },
    { label: 'Test and go live', done: Boolean(shop.onboarding_complete) },
  ]
  const completedSetupTasks = setupTasks.filter(task => task.done).length
  const setupComplete = completedSetupTasks === setupTasks.length

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

      {!setupComplete && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(15,118,149,0.16), rgba(255,255,255,0.04))',
          border: '1px solid rgba(15,118,149,0.28)',
          borderRadius: 16,
          padding: '22px 24px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(240px, 0.8fr)',
          gap: 20,
          marginBottom: 28,
        }} className="setup-card">
          <div>
            <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Setup in progress
            </div>
            <h2 style={{ fontFamily: 'var(--font-space)', fontSize: '1.35rem', lineHeight: 1.2, margin: '0 0 8px', color: 'var(--text)' }}>
              Set up your AI receptionist inside the dashboard.
            </h2>
            <p style={{ color: 'var(--text-mid)', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px', maxWidth: 620 }}>
              Add your business details, choose an industry, connect your calendar, pick a voice, and test the agent before going live.
            </p>
            <Link
              href="/dashboard/setup"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--accent)',
                color: 'white',
                borderRadius: 10,
                padding: '11px 16px',
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Continue setup →
            </Link>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 700, marginBottom: 10 }}>
              {completedSetupTasks} of {setupTasks.length} complete
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {setupTasks.map(task => (
                <div key={task.label} style={{ display: 'flex', alignItems: 'center', gap: 8, color: task.done ? 'var(--text)' : 'var(--muted)', fontSize: 13 }}>
                  <span style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: task.done ? 'var(--success)' : 'rgba(255,255,255,0.06)',
                    color: task.done ? '#04110b' : 'var(--muted)',
                    fontSize: 11,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}>
                    {task.done ? '✓' : '·'}
                  </span>
                  {task.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
            background: setupComplete ? 'var(--success)' : 'var(--warning)',
            boxShadow: setupComplete ? '0 0 0 3px var(--success-dim)' : '0 0 0 3px var(--warning-dim)',
            flexShrink: 0,
          }} />
          <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{setupComplete ? 'AI Receptionist is Live' : 'AI Receptionist setup is not complete'}</span>
          {shop.twilio_number && (
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>· {shop.twilio_number}</span>
          )}
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>· {lastCallText}</span>
        </div>
        {shop.twilio_number ? (
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
        ) : (
          <Link href="/dashboard/setup" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
            Finish setup →
          </Link>
        )}
      </div>

      {/* Stats strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
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

        {/* Bookings */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Appointments Booked
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: totalBookings > 0 ? 'var(--text)' : 'var(--muted)', fontFamily: 'var(--font-space)', lineHeight: 1, marginBottom: 6, letterSpacing: '-0.5px' }}>
            {totalBookings > 0 ? totalBookings.toLocaleString() : '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {totalBookings > 0 ? 'booked by your AI receptionist' : 'updates after first booking'}
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
      <style>{`
        @media (max-width: 900px) {
          .setup-card { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
