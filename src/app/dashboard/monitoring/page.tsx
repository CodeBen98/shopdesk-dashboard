import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatDateTime } from '@/lib/utils'
import type { MonitoringEvent } from '@/types'

export const metadata: Metadata = { title: 'Monitoring | ShopDesk' }

function SeverityBadge({ severity }: { severity: MonitoringEvent['severity'] }) {
  const styles = {
    critical: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: 'Critical' },
    warning: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Warning' },
    info: { bg: 'rgba(255,255,255,0.06)', color: 'var(--muted)', label: 'Info' },
  } as const

  const s = styles[severity] ?? styles.info

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

export default async function MonitoringPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: shop } = await supabase
    .from('shops')
    .select('id, name, onboarding_complete')
    .eq('owner_id', user.id)
    .single()

  if (!shop) redirect('/onboard')
  if (!shop.onboarding_complete) redirect('/onboard')

  const { data: events } = await supabase
    .from('monitoring_events')
    .select('*')
    .or(`shop_id.eq.${shop.id},shop_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(50)

  const rows = (events ?? []) as MonitoringEvent[]
  const criticalCount = rows.filter((e) => e.severity === 'critical' && !e.resolved_at).length
  const warningCount = rows.filter((e) => e.severity === 'warning' && !e.resolved_at).length

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-space)', fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
          Monitoring
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Critical failures, warnings, and system health signals for {shop.name || 'your shop'}
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16,
        marginBottom: 28,
      }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Open Critical
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: criticalCount ? '#ef4444' : 'var(--text)', fontFamily: 'var(--font-space)' }}>
            {criticalCount}
          </div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Open Warnings
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: warningCount ? '#f59e0b' : 'var(--text)', fontFamily: 'var(--font-space)' }}>
            {warningCount}
          </div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Recent Events
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-space)' }}>
            {rows.length}
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: 'var(--font-space)', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
            Recent Monitoring Events
          </h2>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            Sentry shows stack traces, this page shows structured operational failures
          </span>
        </div>

        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-mid)', marginBottom: 6 }}>No monitoring events yet</div>
            <div style={{ fontSize: 13 }}>Once the migration is applied and live traffic hits the app, failures and warnings will show up here.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rows.map((event) => (
              <div key={event.id} style={{
                padding: '14px 16px',
                background: 'var(--card-raised)',
                border: '1px solid var(--border)',
                borderRadius: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <SeverityBadge severity={event.severity} />
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{event.message}</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{formatDateTime(event.created_at)}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                  {event.source} · {event.event_type}
                  {event.resolved_at ? ` · Resolved ${formatDateTime(event.resolved_at)}` : ' · Open'}
                </div>
                {event.payload ? (
                  <pre style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: 12,
                    color: 'var(--text-mid)',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: 12,
                  }}>
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
