'use client'

import { useState, useEffect } from 'react'
import { formatDateTime } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { SkeletonRow } from '@/components/Skeleton'
import { useToast } from '@/components/Toast'
import type { Booking } from '@/types'

type Tab = 'upcoming' | 'past'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    scheduled:  { bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa',         label: 'Scheduled' },
    confirmed:  { bg: 'var(--success-dim)',      color: 'var(--success)',  label: 'Confirmed' },
    completed:  { bg: 'rgba(255,255,255,0.06)',  color: 'var(--muted)',    label: 'Completed' },
    cancelled:  { bg: 'var(--danger-dim)',       color: 'var(--danger)',   label: 'Cancelled' },
    no_show:    { bg: 'var(--warning-dim)',      color: 'var(--warning)',  label: 'No Show' },
  }
  const s = map[status] ?? map.scheduled
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

function nyDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(date)
}

function isTodayNY(dateStr: string): boolean {
  return nyDateKey(new Date()) === nyDateKey(new Date(dateStr))
}

function isTodayOrPast(dateStr: string): boolean {
  const todayNy = nyDateKey(new Date())
  const apptNy = nyDateKey(new Date(dateStr))
  return apptNy <= todayNy
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('upcoming')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null)
  const { show } = useToast()

  useEffect(() => {
    document.title = 'Bookings | ShopDesk'
  }, [])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: shop } = await supabase
        .from('shops').select('id').eq('owner_id', user.id).single()
      if (shop) {
        const { data } = await supabase
          .from('bookings')
          .select('*')
          .eq('shop_id', shop.id)
          .order('appointment_at', { ascending: true })
        setBookings(data ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const now = new Date().toISOString()
  const filtered = bookings.filter(b =>
    tab === 'upcoming'
      ? (b.appointment_at ?? '') >= now && b.status !== 'cancelled' && b.status !== 'completed'
      : (b.appointment_at ?? '') < now || b.status === 'cancelled' || b.status === 'completed'
  )

  async function updateStatus(id: string, status: string) {
    const res = await fetch('/api/bookings/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: id, status }),
    })
    if (!res.ok) {
      show('Failed to update booking', 'error')
    } else {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: status as Booking['status'] } : b))
      setPendingCancelId(null)
      show(status === 'completed' ? 'Marked as complete' : 'Booking cancelled', 'success')
    }
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-space)', fontSize: 'clamp(1.5rem, 3vw, 1.9rem)', fontWeight: 800, color: 'var(--text)', marginBottom: 4, letterSpacing: '-0.5px' }}>
          Bookings
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Appointments booked by your AI receptionist
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface)', borderRadius: 10, padding: 4, width: 'fit-content', border: '1px solid var(--border)' }}>
        {(['upcoming', 'past'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '7px 20px',
              borderRadius: 7,
              border: 'none',
              background: tab === t ? 'var(--card-raised)' : 'transparent',
              color: tab === t ? 'var(--text)' : 'var(--muted)',
              fontSize: 13,
              fontWeight: tab === t ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Table card */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '24px' }}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ margin: '0 auto 14px', opacity: 0.35 }}>
              <rect x="4" y="8" width="36" height="32" rx="4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M14 4v8M30 4v8M4 20h36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 6 }}>No bookings yet</div>
            <div style={{ fontSize: 13 }}>
              {tab === 'upcoming' ? 'No upcoming appointments scheduled.' : 'No past appointments found.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date / Time', 'Customer', 'Details', 'Service', 'Status', 'Confirmation Sent', ''].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '12px 16px',
                      fontSize: 11, color: 'var(--muted)',
                      fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((booking: Booking) => {
                  const isToday = isTodayNY(booking.appointment_at)
                  const todayOrPast = isTodayOrPast(booking.appointment_at)
                  const isExpanded = expandedId === booking.id
                  const isPendingCancel = pendingCancelId === booking.id
                  const isDone = booking.status === 'completed' || booking.status === 'cancelled'

                  return (
                    <>
                      <tr
                        key={booking.id}
                        onClick={() => { if (!isPendingCancel) setExpandedId(isExpanded ? null : booking.id) }}
                        style={{
                          borderBottom: isExpanded ? 'none' : '1px solid var(--border)',
                          transition: 'background 0.1s',
                          cursor: 'pointer',
                          background: isExpanded ? 'var(--card-raised)' : 'transparent',
                        }}
                        onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLTableRowElement).style.background = 'var(--card-raised)' }}
                        onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                      >
                        <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                          <span>{formatDateTime(booking.appointment_at)}</span>
                          {isToday && (
                            <span style={{
                              marginLeft: 8,
                              display: 'inline-block',
                              background: 'var(--accent)',
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 20,
                              verticalAlign: 'middle',
                            }}>
                              Today
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{booking.customer_name ?? '—'}</div>
                          {booking.customer_phone && (
                            <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>{booking.customer_phone}</div>
                          )}
                        </td>
                        <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-mid)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {booking.vehicle || (typeof booking.intake?.details === 'string' ? booking.intake.details : '—')}
                        </td>
                        <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-mid)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {booking.service ?? '—'}
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <StatusBadge status={booking.status ?? 'scheduled'} />
                        </td>
                        <td style={{ padding: '13px 16px', fontSize: 18, textAlign: 'center' }}>
                          {booking.sms_sent ? (
                            <span style={{ color: 'var(--success)' }}>✓</span>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: 13 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '13px 16px' }} onClick={e => e.stopPropagation()}>
                          {isPendingCancel ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>Cancel this booking?</span>
                              <button
                                onClick={() => updateStatus(booking.id, 'cancelled')}
                                style={{
                                  padding: '4px 10px', borderRadius: 6,
                                  border: '1px solid var(--danger)',
                                  background: 'transparent',
                                  color: 'var(--danger)', fontSize: 12,
                                  fontWeight: 500, cursor: 'pointer',
                                }}
                              >
                                Confirm Cancel
                              </button>
                              <button
                                onClick={() => setPendingCancelId(null)}
                                style={{
                                  padding: '4px 10px', borderRadius: 6,
                                  border: '1px solid var(--border)',
                                  background: 'transparent',
                                  color: 'var(--muted)', fontSize: 12,
                                  fontWeight: 500, cursor: 'pointer',
                                }}
                              >
                                Never mind
                              </button>
                            </div>
                          ) : !isDone ? (
                            <div style={{ display: 'flex', gap: 6, whiteSpace: 'nowrap' }}>
                              {todayOrPast && (
                                <button
                                  onClick={() => updateStatus(booking.id, 'completed')}
                                  style={{
                                    padding: '5px 10px', borderRadius: 6,
                                    border: '1px solid var(--success)',
                                    background: 'transparent',
                                    color: 'var(--success)', fontSize: 12,
                                    fontWeight: 500, cursor: 'pointer',
                                    transition: 'background 0.15s',
                                  }}
                                >
                                  Complete
                                </button>
                              )}
                              <button
                                onClick={() => setPendingCancelId(booking.id)}
                                style={{
                                  padding: '5px 10px', borderRadius: 6,
                                  border: '1px solid var(--border)',
                                  background: 'transparent',
                                  color: 'var(--muted)', fontSize: 12,
                                  fontWeight: 500, cursor: 'pointer',
                                  transition: 'background 0.15s',
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : null}
                          {/* Expand chevron */}
                          <span style={{
                            fontSize: 11, color: 'var(--muted)', marginLeft: 8,
                            display: 'inline-block', cursor: 'pointer',
                          }}
                            onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                          >
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${booking.id}-details`} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td colSpan={7} style={{ padding: '0 16px 16px', background: 'var(--card-raised)' }}>
                            <div style={{
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 8,
                              padding: '14px 16px',
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                              gap: 16,
                            }}>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 4 }}>Service</div>
                                <div style={{ fontSize: 13, color: 'var(--text)' }}>{booking.service ?? '—'}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 4 }}>Vehicle</div>
                                <div style={{ fontSize: 13, color: 'var(--text)' }}>{booking.vehicle ?? '—'}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 4 }}>Phone</div>
                                {booking.customer_phone ? (
                                  <a href={`tel:${booking.customer_phone}`} style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontFamily: 'monospace' }}>
                                    {booking.customer_phone}
                                  </a>
                                ) : <div style={{ fontSize: 13, color: 'var(--muted)' }}>—</div>}
                              </div>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 4 }}>Confirmation</div>
                                <div style={{ fontSize: 13, color: booking.sms_sent ? 'var(--success)' : 'var(--muted)' }}>
                                  {booking.sms_sent ? 'SMS sent' : 'Not sent'}
                                </div>
                              </div>
                              {booking.notes && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 4 }}>Notes</div>
                                  <div style={{ fontSize: 13, color: 'var(--text-mid)' }}>{booking.notes}</div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
