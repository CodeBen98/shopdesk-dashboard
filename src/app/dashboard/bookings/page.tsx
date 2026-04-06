'use client'

import { useState, useEffect } from 'react'
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

function formatDateTime(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('upcoming')
  const [shopId, setShopId] = useState<string | null>(null)
  const { show } = useToast()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: shop } = await supabase
        .from('shops').select('id').eq('owner_id', user.id).single()
      if (shop) {
        setShopId(shop.id)
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
    const supabase = createClient()
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (error) {
      show('Failed to update booking', 'error')
    } else {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: status as Booking['status'] } : b))
      show(status === 'completed' ? 'Marked as complete' : 'Booking cancelled', 'success')
    }
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-space)', fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
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
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date / Time', 'Customer', 'Phone', 'Vehicle', 'Service', 'Status', 'SMS', ''].map(h => (
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
                {filtered.map((booking: Booking) => (
                  <tr
                    key={booking.id}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--card-raised)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {formatDateTime(booking.appointment_at)}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                      {booking.customer_name ?? '—'}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-mid)', fontFamily: 'monospace' }}>
                      {booking.customer_phone ?? '—'}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-mid)' }}>
                      {booking.vehicle ?? '—'}
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
                    <td style={{ padding: '13px 16px' }}>
                      {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                        <div style={{ display: 'flex', gap: 6, whiteSpace: 'nowrap' }}>
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
                          <button
                            onClick={() => updateStatus(booking.id, 'cancelled')}
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
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
