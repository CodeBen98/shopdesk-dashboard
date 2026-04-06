'use client'

import { StepProps } from './OnboardingWizard'
import { ShopHours } from '@/types'

function formatHoursSummary(hours: ShopHours | undefined): string {
  if (!hours) return 'Not available'

  const DAY_NAMES: { key: keyof ShopHours; short: string }[] = [
    { key: 'monday', short: 'Mon' },
    { key: 'tuesday', short: 'Tue' },
    { key: 'wednesday', short: 'Wed' },
    { key: 'thursday', short: 'Thu' },
    { key: 'friday', short: 'Fri' },
    { key: 'saturday', short: 'Sat' },
    { key: 'sunday', short: 'Sun' },
  ]

  type Group = { days: string[]; from: string; to: string; open: boolean }
  const groups: Group[] = []
  for (const { key, short } of DAY_NAMES) {
    const d = hours[key]
    const last = groups[groups.length - 1]
    if (last && last.open === d.open && last.from === d.from && last.to === d.to) {
      last.days.push(short)
    } else {
      groups.push({ days: [short], from: d.from, to: d.to, open: d.open })
    }
  }

  return groups
    .map(g => {
      const range = g.days.length > 1 ? `${g.days[0]}-${g.days[g.days.length - 1]}` : g.days[0]
      if (!g.open) return `${range} Closed`
      return `${range} ${formatTime12(g.from)}-${formatTime12(g.to)}`
    })
    .join(', ')
}

function formatTime12(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`
}

export function StepAutoFillReview({ shop, onBack, onSkipTo }: StepProps) {
  const hoursSummary = formatHoursSummary(shop?.hours)

  function advance() {
    onSkipTo('hours')
  }

  return (
    <div style={card}>
      <button onClick={onBack} style={backBtn}>← Back</button>

      <h2 style={titleStyle}>Here&apos;s what we found 👀</h2>
      <p style={subtitleStyle}>Review the info below. You can edit anything on the next steps.</p>

      <div style={infoList}>
        <InfoRow label="Shop name" value={shop?.name} />
        <InfoRow label="Phone" value={shop?.phone || undefined} placeholder="Not found" />
        <InfoRow label="Address" value={shop?.address} />
        <InfoRow label="Hours" value={hoursSummary} />
        {shop && 'website' in shop && (shop as Record<string, unknown>).website ? (
          <InfoRow label="Website" value={String((shop as Record<string, unknown>).website)} />
        ) : null}
      </div>

      <button onClick={advance} className="step-btn-primary" style={{ marginTop: 0 }}>
        Looks good, continue →
      </button>
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <button onClick={advance} style={linkBtn}>
          Edit manually instead
        </button>
      </div>
    </div>
  )
}

function InfoRow({ label, value, placeholder }: { label: string; value?: string; placeholder?: string }) {
  const found = !!value
  return (
    <div style={infoRow}>
      <div style={infoLabel}>{label}</div>
      <div style={infoValueWrap}>
        {found ? (
          <>
            <span style={checkmark}>✓</span>
            <span style={infoValue}>{value}</span>
          </>
        ) : (
          <span style={notFound}>{placeholder ?? 'Not found'}</span>
        )}
      </div>
    </div>
  )
}

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  padding: '40px 48px',
  maxWidth: 560,
  margin: '0 auto',
  boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
  animation: 'card-enter 0.35s ease',
}
const backBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--muted)',
  fontSize: 14,
  cursor: 'pointer',
  padding: 0,
  marginBottom: 24,
  display: 'block',
  fontFamily: 'inherit',
}
const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-space)',
  fontSize: 24,
  fontWeight: 700,
  color: 'var(--text)',
  marginBottom: 8,
}
const subtitleStyle: React.CSSProperties = {
  fontSize: 15,
  color: 'var(--muted)',
  lineHeight: 1.6,
  marginBottom: 28,
}
const infoList: React.CSSProperties = { marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 8 }
const infoRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  padding: '12px 16px',
  background: 'var(--card)',
  borderRadius: 8,
  border: '1px solid var(--border)',
}
const infoLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--muted)',
  minWidth: 80,
  paddingTop: 1,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}
const infoValueWrap: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 6, flex: 1 }
const checkmark: React.CSSProperties = { color: 'var(--success)', fontWeight: 700, fontSize: 14, flexShrink: 0 }
const infoValue: React.CSSProperties = { fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }
const notFound: React.CSSProperties = { fontSize: 14, color: 'var(--muted)' }
const linkBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--muted)',
  fontSize: 14,
  cursor: 'pointer',
  textDecoration: 'underline',
  fontFamily: 'inherit',
}
