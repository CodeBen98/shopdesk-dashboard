'use client'

import { useState, useEffect } from 'react'
import { formatDateTime, formatDuration } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { SkeletonRow } from '@/components/Skeleton'
import type { Call } from '@/types'

type OutcomeFilter = 'all' | 'booked' | 'info_only' | 'missed' | 'emergency'

function OutcomeBadge({ outcome }: { outcome: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    booked:    { bg: 'var(--success-dim)',          color: 'var(--success)',  label: 'Booked' },
    missed:    { bg: 'rgba(255,255,255,0.06)',        color: 'var(--muted)',    label: 'No Booking' },
    info_only: { bg: 'rgba(255,255,255,0.06)',       color: 'var(--muted)',    label: 'Info Only' },
    emergency: { bg: 'var(--warning-dim)',           color: 'var(--warning)',  label: 'Emergency' },
  }
  const s = map[outcome] ?? map.info_only
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

const PAGE_SIZE = 20

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [shopId, setShopId] = useState<string | null>(null)

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
          .from('calls')
          .select('*')
          .eq('shop_id', shop.id)
          .order('started_at', { ascending: false })
        setCalls(data ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const filtered = calls.filter(c =>
    outcomeFilter === 'all' ? true : c.outcome === outcomeFilter
  )
  const displayed = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = displayed.length < filtered.length

  const outcomes: { value: OutcomeFilter; label: string }[] = [
    { value: 'all',       label: 'All' },
    { value: 'booked',    label: 'Booked' },
    { value: 'info_only', label: 'Info Only' },
    { value: 'missed',    label: 'No Booking' },
    { value: 'emergency', label: 'Emergency' },
  ]

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-space)', fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
          Call Log
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Every call your AI receptionist handled
        </p>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {outcomes.map(o => (
          <button
            key={o.value}
            onClick={() => { setOutcomeFilter(o.value); setPage(1) }}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              border: '1px solid',
              borderColor: outcomeFilter === o.value ? 'var(--accent)' : 'var(--border)',
              background: outcomeFilter === o.value ? 'var(--accent-dim)' : 'transparent',
              color: outcomeFilter === o.value ? 'var(--accent)' : 'var(--text-mid)',
              fontSize: 13,
              fontWeight: outcomeFilter === o.value ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {o.label}
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
            {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ margin: '0 auto 14px', opacity: 0.35 }}>
              <circle cx="22" cy="22" r="20" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M15 17h5l3 6-3 3c2 3 6 7 9 9l3-3 6 3v5a3 3 0 01-3 3C19.5 43 1 24.5 1 4a3 3 0 013-3h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>No calls found</div>
            <div style={{ fontSize: 13 }}>
              {outcomeFilter === 'all'
                ? 'Your AI receptionist is ready. Make a test call to (407) 555-0123.'
                : 'Try selecting a different filter above.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date / Time', 'Caller Phone', 'Caller Name', 'Duration', 'Outcome', 'Details'].map(h => (
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
                {displayed.map((call: Call) => (
                  <>
                    <tr
                      key={call.id}
                      onClick={() => setExpandedId(expandedId === call.id ? null : call.id)}
                      style={{
                        borderBottom: expandedId === call.id ? 'none' : '1px solid var(--border)',
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                        background: expandedId === call.id ? 'var(--card-raised)' : 'transparent',
                      }}
                      onMouseEnter={e => { if (expandedId !== call.id) (e.currentTarget as HTMLTableRowElement).style.background = 'var(--card-raised)' }}
                      onMouseLeave={e => { if (expandedId !== call.id) (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                    >
                      <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {formatDateTime(call.started_at)}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-mid)', fontFamily: 'monospace' }}>
                        {call.caller_phone ?? '—'}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text)' }}>
                        {call.caller_name ?? '—'}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--muted)' }}>
                        {formatDuration(call.duration_seconds)}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <OutcomeBadge outcome={call.outcome ?? 'info_only'} />
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{
                          fontSize: 12, color: 'var(--accent)', fontWeight: 500,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          {expandedId === call.id ? '▲ Hide' : '▼ View'}
                        </span>
                      </td>
                    </tr>
                    {expandedId === call.id && (
                      <tr key={`${call.id}-details`} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td colSpan={6} style={{ padding: '0 16px 16px', background: 'var(--card-raised)' }}>
                          {/* Recording player */}
                          {call.recording_url && (
                            <div style={{
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 8,
                              padding: '12px 16px',
                              marginBottom: 12,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                            }}>
                              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Recording
                              </div>
                              <audio
                                controls
                                src={call.recording_url}
                                style={{
                                  flex: 1,
                                  height: 36,
                                  borderRadius: 4,
                                }}
                              />
                            </div>
                          )}
                          {/* Transcript */}
                          <div style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            padding: '14px 16px',
                          }}>
                            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                              Transcript
                            </div>
                            <div style={{
                              fontSize: 13,
                              color: call.transcript ? 'var(--text-mid)' : 'var(--muted)',
                              lineHeight: 1.7,
                              whiteSpace: 'pre-wrap',
                              maxHeight: 240,
                              overflowY: 'auto',
                            }}>
                              {call.transcript ?? 'No transcript available.'}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Load more */}
        {!loading && hasMore && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <button
              onClick={() => setPage(p => p + 1)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '8px 20px',
                fontSize: 13,
                color: 'var(--text-mid)',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
