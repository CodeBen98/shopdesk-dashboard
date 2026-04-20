'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { formatDateTime, formatDuration } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { SkeletonRow } from '@/components/Skeleton'
import type { Call } from '@/types'

type OutcomeFilter = 'all' | 'booked' | 'info_only' | 'missed' | 'emergency'
type DateFilter = 'today' | 'week' | 'month' | 'all'

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

function renderTranscript(transcript: string) {
  const speakerRe = /^(AI|assistant|Agent|User|Caller):\s*/i
  const hasLabels = transcript.split('\n').some(l => speakerRe.test(l.trim()))

  if (!hasLabels) {
    return transcript.split('\n').filter(l => l.trim()).map((line, i) => (
      <p key={i} style={{ margin: '0 0 6px', color: 'var(--text-mid)', fontSize: 13 }}>{line}</p>
    ))
  }

  return transcript.split('\n').map((line, i) => {
    const match = line.match(/^(AI|assistant|Agent|User|Caller):\s*(.*)$/i)
    if (!match) {
      if (!line.trim()) return null
      return <div key={i} style={{ color: 'var(--text-mid)', fontSize: 13, marginBottom: 4 }}>{line}</div>
    }
    const [, speaker, text] = match
    const isAI = /^(AI|assistant|Agent)$/i.test(speaker)
    return (
      <div key={i} style={{ marginBottom: 6, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
          color: isAI ? 'var(--accent)' : 'var(--text-mid)',
          minWidth: 44, paddingTop: 2, flexShrink: 0,
        }}>
          {isAI ? 'AI' : 'Caller'}
        </span>
        <span style={{ color: isAI ? 'var(--accent)' : 'var(--text-mid)', fontSize: 13, lineHeight: 1.5 }}>{text}</span>
      </div>
    )
  })
}

function getDateBoundary(filter: DateFilter): string | null {
  const now = new Date()
  if (filter === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0); return start.toISOString()
  }
  if (filter === 'week') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  }
  if (filter === 'month') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  }
  return null
}

const PAGE_SIZE = 20

function CallsContent() {
  const searchParams = useSearchParams()
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('month')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})

  useEffect(() => {
    document.title = 'Calls | ShopDesk'
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

  // Auto-expand from query param
  useEffect(() => {
    const expandParam = searchParams.get('expand')
    if (expandParam) {
      setExpandedId(expandParam)
      setDateFilter('all') // ensure the call is visible
    }
  }, [searchParams])

  // Scroll to expanded row
  useEffect(() => {
    if (expandedId && rowRefs.current[expandedId]) {
      setTimeout(() => {
        rowRefs.current[expandedId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [expandedId])

  const dateBoundary = getDateBoundary(dateFilter)
  const filtered = calls.filter(c => {
    if (outcomeFilter !== 'all' && c.outcome !== outcomeFilter) return false
    if (dateBoundary && c.started_at < dateBoundary) return false
    return true
  })
  const displayed = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = displayed.length < filtered.length

  const outcomes: { value: OutcomeFilter; label: string }[] = [
    { value: 'all',       label: 'All' },
    { value: 'booked',    label: 'Booked' },
    { value: 'info_only', label: 'Info Only' },
    { value: 'missed',    label: 'Missed' },
    { value: 'emergency', label: 'Emergency' },
  ]

  const dateFilters: { value: DateFilter; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week',  label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all',   label: 'All Time' },
  ]

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-space)', fontSize: 'clamp(1.5rem, 3vw, 1.9rem)', fontWeight: 800, color: 'var(--text)', marginBottom: 4, letterSpacing: '-0.5px' }}>
          Call Log
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Every call your AI receptionist handled
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {dateFilters.map(d => (
          <button
            key={d.value}
            onClick={() => { setDateFilter(d.value); setPage(1) }}
            style={{
              padding: '6px 13px',
              borderRadius: 8,
              border: '1px solid',
              borderColor: dateFilter === d.value ? 'var(--accent)' : 'var(--border)',
              background: dateFilter === d.value ? 'var(--accent-dim)' : 'transparent',
              color: dateFilter === d.value ? 'var(--accent)' : 'var(--text-mid)',
              fontSize: 13,
              fontWeight: dateFilter === d.value ? 600 : 400,
              cursor: 'pointer',
              transition: 'border-color 0.15s, background 0.15s, color 0.15s',
              fontFamily: 'inherit',
            }}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {outcomes.map(o => (
          <button
            key={o.value}
            onClick={() => { setOutcomeFilter(o.value); setPage(1) }}
            style={{
              padding: '6px 13px',
              borderRadius: 8,
              border: '1px solid',
              borderColor: outcomeFilter === o.value ? 'var(--accent)' : 'var(--border)',
              background: outcomeFilter === o.value ? 'var(--accent-dim)' : 'transparent',
              color: outcomeFilter === o.value ? 'var(--accent)' : 'var(--text-mid)',
              fontSize: 13,
              fontWeight: outcomeFilter === o.value ? 600 : 400,
              cursor: 'pointer',
              transition: 'border-color 0.15s, background 0.15s, color 0.15s',
              fontFamily: 'inherit',
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
              {outcomeFilter === 'all' && dateFilter === 'all'
                ? 'Your AI receptionist is ready. Make a test call to get started.'
                : 'Try selecting a different filter above.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date / Time', 'Caller', 'Duration', 'Outcome', 'Details'].map(h => (
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
                      ref={el => { rowRefs.current[call.id] = el }}
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
                      <td style={{ padding: '13px 16px' }}>
                        {call.caller_name ? (
                          <>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{call.caller_name}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>{call.caller_phone ?? ''}</div>
                          </>
                        ) : (
                          <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'monospace' }}>{call.caller_phone ?? '—'}</div>
                        )}
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
                          {expandedId === call.id ? (
                            <>
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M2 7l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Hide
                            </>
                          ) : (
                            <>
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M2 3l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              View
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                    {expandedId === call.id && (
                      <tr key={`${call.id}-details`} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td colSpan={5} style={{ padding: '0 16px 16px', background: 'var(--card-raised)' }}>
                          {/* Call-back button for missed/info_only */}
                          {(call.outcome === 'missed' || call.outcome === 'info_only') && call.caller_phone && (
                            <div style={{ marginBottom: 12 }}>
                              <a
                                href={`tel:${call.caller_phone}`}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 6,
                                  padding: '6px 14px', borderRadius: 7,
                                  border: '1px solid var(--accent)',
                                  color: 'var(--accent)', fontSize: 13, fontWeight: 500,
                                  textDecoration: 'none', transition: 'background 0.15s',
                                }}
                              >
                                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                                  <path d="M2.5 1.5h2.5l1 2.5-1.5 1A8 8 0 008 8.5l1-1.5 2.5 1v2.5a1 1 0 01-1 1C4.5 11.5 1.5 4.5 1.5 2.5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                                </svg>
                                Call back: {call.caller_phone}
                              </a>
                            </div>
                          )}

                          {/* Recording player */}
                          {call.recording_url && (
                            <div style={{
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 8,
                              padding: '12px 16px',
                              marginBottom: 12,
                            }}>
                              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <rect x="4" y="1" width="4" height="6" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                                  <path d="M2 6a4 4 0 008 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                  <path d="M6 10v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                </svg>
                                Listen to recording
                              </div>
                              <audio
                                controls
                                src={call.recording_url}
                                style={{ width: '100%', height: 36, borderRadius: 4, accentColor: 'var(--accent)' } as React.CSSProperties}
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
                              maxHeight: 240,
                              overflowY: 'auto',
                              lineHeight: 1.7,
                            }}>
                              {call.transcript
                                ? renderTranscript(call.transcript)
                                : <span style={{ fontSize: 13, color: 'var(--muted)' }}>No transcript available.</span>
                              }
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

export default function CallsPage() {
  return (
    <Suspense>
      <CallsContent />
    </Suspense>
  )
}
