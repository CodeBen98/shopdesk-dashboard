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
    booked:    { bg: 'var(--success-dim)',         color: 'var(--success)', label: 'Booked' },
    missed:    { bg: 'rgba(255,255,255,0.06)',      color: 'var(--muted)',   label: 'No Booking' },
    info_only: { bg: 'rgba(255,255,255,0.07)',      color: 'var(--muted)',   label: 'Info Only' },
    emergency: { bg: 'var(--warning-dim)',          color: 'var(--warning)', label: 'Emergency' },
  }
  const s = styles[outcome] ?? styles.info_only
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 8px', borderRadius: 20,
      fontSize: 12, fontWeight: 600,
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
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

  // Send new (or incomplete) accounts through the wizard.
  // Exception: manually provisioned accounts that have a vapi_agent_id skip the wizard gate.
  if (!existingShop?.onboarding_complete && !existingShop?.vapi_agent_id) redirect('/onboard')
  if (!existingShop) redirect('/auth/login')

  const shop = existingShop

  const [callsResult, bookingsResult, missedResult, recentCallsResult, upcomingResult] = await Promise.all([
    supabase.from('calls').select('id', { count: 'exact' }).eq('shop_id', shop.id),
    supabase.from('bookings').select('id', { count: 'exact' }).eq('shop_id', shop.id),
    supabase.from('calls').select('id', { count: 'exact' }).eq('shop_id', shop.id).eq('outcome', 'missed'),
    supabase.from('calls').select('*').eq('shop_id', shop.id).order('started_at', { ascending: false }).limit(10),
    supabase.from('bookings').select('*').eq('shop_id', shop.id).eq('status', 'scheduled')
      .order('appointment_at', { ascending: true }).limit(5),
  ])

  const totalCalls    = callsResult.count ?? 0
  const totalBookings = bookingsResult.count ?? 0
  const missedCalls   = missedResult.count ?? 0
  const recentCalls: Call[]      = recentCallsResult.data ?? []
  const upcomingBookings: Booking[] = upcomingResult.data ?? []

  const isProvisioned  = Boolean(shop.vapi_agent_id && shop.twilio_number)
  const hasServices    = Array.isArray(shop.services) && shop.services.length > 0
  const hasCalendar    = Boolean(shop.google_refresh_token)
  const isFirstVisit   = totalCalls === 0

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-space)', fontSize: 'clamp(1.5rem, 3vw, 1.9rem)', fontWeight: 800, color: 'var(--text)', marginBottom: 4, letterSpacing: '-0.5px' }}>
          Overview
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          {isFirstVisit
            ? "You're set up. Forward your calls and we handle the rest."
            : totalBookings === 0
              ? "We're answering calls. No bookings yet — confirm call forwarding is active."
              : "We're answering your calls. Here's what we recovered."}
        </p>
      </div>

      {isFirstVisit ? (
        /* ────────────────────────────────────────────────
           EMPTY STATE: you're live, nothing happened yet
        ──────────────────────────────────────────────── */
        <>
          {/* Hero: number + activation checklist */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '32px',
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <span style={{
                width: 9, height: 9, borderRadius: '50%',
                background: isProvisioned ? 'var(--success)' : 'var(--warning)',
                boxShadow: isProvisioned ? '0 0 0 3px var(--success-dim)' : '0 0 0 3px var(--warning-dim)',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: isProvisioned ? 'var(--success)' : 'var(--warning)' }}>
                {isProvisioned ? 'Receptionist is live' : 'Setup incomplete'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'start' }} className="setup-card">
              {/* Left: checklist */}
              <div>
                <h2 style={{ fontFamily: 'var(--font-space)', fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)', fontWeight: 800, color: 'var(--text)', marginBottom: 8, letterSpacing: '-0.3px' }}>
                  {isProvisioned ? 'Three steps to your first booking' : 'Finish setting up your receptionist'}
                </h2>
                <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24 }}>
                  Once forwarding is active, every missed call becomes an answered one.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    {
                      done: isProvisioned,
                      label: 'Receptionist configured',
                      desc: 'Your AI voice agent is live and ready to answer',
                      link: null,
                      linkLabel: null,
                    },
                    {
                      done: false,
                      label: 'Activate call forwarding',
                      desc: 'Forward unanswered calls to your ShopDesk number',
                      link: '/dashboard/settings?tab=phone',
                      linkLabel: 'View instructions →',
                    },
                    {
                      done: false,
                      label: 'Make a test call',
                      desc: 'Call your number directly to hear your receptionist',
                      link: shop.twilio_number ? `tel:${shop.twilio_number}` : null,
                      linkLabel: shop.twilio_number ? `Call ${shop.twilio_number} →` : null,
                    },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                        background: item.done ? 'var(--success)' : 'var(--card)',
                        border: `2px solid ${item.done ? 'var(--success)' : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {item.done && (
                          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                            <path d="M1 5l3.5 3.5L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: item.done ? 'var(--text-mid)' : 'var(--text)', textDecoration: item.done ? 'line-through' : 'none', marginBottom: 2 }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{item.desc}</div>
                        {item.link && item.linkLabel && !item.done && (
                          <a href={item.link} style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', marginTop: 4, display: 'inline-block' }}>
                            {item.linkLabel}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: number card */}
              {shop.twilio_number && (
                <div style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '20px 24px',
                  textAlign: 'center',
                  minWidth: 200,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 10 }}>
                    Your receptionist number
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.02em', marginBottom: 16 }}>
                    {shop.twilio_number}
                  </div>
                  <a
                    href={`tel:${shop.twilio_number}`}
                    style={{
                      display: 'block', textAlign: 'center',
                      background: 'var(--accent)', color: '#fff',
                      borderRadius: 8, padding: '9px 16px',
                      fontSize: 13, fontWeight: 700, textDecoration: 'none',
                      marginBottom: 8,
                    }}
                  >
                    Make a test call
                  </a>
                  <p style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                    Call this number to hear your AI receptionist
                  </p>
                </div>
              )}
            </div>

            {/* Optional setup nudges */}
            {(!hasServices || !hasCalendar) && (
              <div style={{
                borderTop: '1px solid var(--border)',
                marginTop: 24, paddingTop: 20,
                display: 'flex', gap: 12, flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', alignSelf: 'center' }}>
                  Optional:
                </span>
                {!hasServices && (
                  <Link href="/dashboard/settings" style={{
                    fontSize: 12, color: 'var(--text-mid)', textDecoration: 'none',
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '5px 12px', fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    + Add your services
                  </Link>
                )}
                {!hasCalendar && (
                  <a href="/api/auth/google-calendar" style={{
                    fontSize: 12, color: 'var(--text-mid)', textDecoration: 'none',
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '5px 12px', fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    📅 Connect Google Calendar
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Empty calls / bookings panels */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }} className="dashboard-grid">
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px' }}>
              <h2 style={{ fontFamily: 'var(--font-space)', fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>Recent Calls</h2>
              <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--muted)' }}>
                <svg width="36" height="36" viewBox="0 0 40 40" fill="none" style={{ margin: '0 auto 10px', opacity: 0.3 }}>
                  <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M13 14h4l2.5 5-2.5 2c1.5 2.5 5 6 7.5 7.5l2-2.5 5 2.5v4a2 2 0 01-2 2C17.6 34.5 6 22.9 6 9a2 2 0 012-2h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 4 }}>No calls yet</div>
                <div style={{ fontSize: 13 }}>Calls appear here as soon as forwarding is active</div>
              </div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px' }}>
              <h2 style={{ fontFamily: 'var(--font-space)', fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>Upcoming Bookings</h2>
              <div style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--muted)' }}>
                <svg width="32" height="32" viewBox="0 0 36 36" fill="none" style={{ margin: '0 auto 10px', opacity: 0.3 }}>
                  <rect x="3" y="6" width="30" height="27" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10 3v6M26 3v6M3 15h30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 4 }}>No bookings yet</div>
                <div style={{ fontSize: 13 }}>Bookings your AI schedules appear here</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ────────────────────────────────────────────────
           ACTIVE STATE: calls are coming in
        ──────────────────────────────────────────────── */
        <>
          {/* Status bar */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12, marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{
                width: 9, height: 9, borderRadius: '50%',
                background: 'var(--success)', boxShadow: '0 0 0 3px var(--success-dim)', flexShrink: 0,
              }} />
              <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>ShopDesk is Live</span>
              {shop.twilio_number && (
                <span style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'monospace' }}>{shop.twilio_number}</span>
              )}
            </div>
            {shop.twilio_number && (
              <a href={`tel:${shop.twilio_number}`} style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                Make a test call →
              </a>
            )}
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Calls Handled',       value: totalCalls,    sub: 'all time' },
              { label: 'Bookings Made',        value: totalBookings, sub: 'all time' },
              { label: 'Missed Opportunities', value: missedCalls,   sub: 'no booking taken' },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-space)', lineHeight: 1, marginBottom: 6, letterSpacing: '-0.5px' }}>
                  {stat.value.toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* Two column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'stretch' }} className="dashboard-grid">
            {/* Recent Calls */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontFamily: 'var(--font-space)', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Recent Calls</h2>
                <Link href="/dashboard/calls" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>View all →</Link>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Time', 'Caller', 'Duration', 'Outcome', ''].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', fontSize: 11, color: 'var(--muted)',
                        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                        paddingBottom: 10, borderBottom: '1px solid var(--border)', paddingRight: 12,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentCalls.map((call: Call) => (
                    <tr key={call.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 12px 12px 0', fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDateTime(call.started_at)}</td>
                      <td style={{ padding: '12px 12px 12px 0', fontSize: 13, color: 'var(--text)' }}>{call.caller_name || call.caller_phone || 'Unknown'}</td>
                      <td style={{ padding: '12px 12px 12px 0', fontSize: 13, color: 'var(--muted)' }}>{formatDuration(call.duration_seconds)}</td>
                      <td style={{ padding: '12px 12px 12px 0' }}><OutcomeBadge outcome={call.outcome ?? 'info_only'} /></td>
                      <td style={{ padding: '12px 0', textAlign: 'right' }}>
                        <Link href={`/dashboard/calls?expand=${call.id}`} style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Upcoming Bookings */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontFamily: 'var(--font-space)', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Upcoming Bookings</h2>
                <Link href="/dashboard/bookings" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>View all →</Link>
              </div>
              {upcomingBookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--muted)' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 4 }}>No upcoming bookings</div>
                  <div style={{ fontSize: 13 }}>Appointments appear here when your AI books them</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {upcomingBookings.map((booking: Booking) => (
                    <div key={booking.id} style={{ padding: '12px 14px', background: 'var(--card-raised)', border: '1px solid var(--border)', borderRadius: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                        {booking.customer_name || 'Unknown customer'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                        {booking.service || 'Service not specified'}
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
        </>
      )}

      <style>{`
        @media (max-width: 1200px) { .dashboard-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 900px)  { .setup-card    { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
