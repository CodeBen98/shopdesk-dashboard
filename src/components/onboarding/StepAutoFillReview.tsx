'use client'

import { StepProps } from './OnboardingWizard'
import { ShopHours } from '@/types'

const TEAL = '#0F7695'

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

  // Group consecutive days with the same open/from/to
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

export function StepAutoFillReview({ shop, onSkipTo }: StepProps) {
  const hoursSummary = formatHoursSummary(shop?.hours)

  function advance() {
    onSkipTo('hours')
  }

  return (
    <div style={card}>
      <h2 style={titleStyle}>Here's what we found 👀</h2>
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

      <button onClick={advance} style={primaryBtn}>
        Looks good, continue →
      </button>
      <div style={{ textAlign: 'center', marginTop: '12px' }}>
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
  background: '#fff',
  borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
  padding: '32px',
  maxWidth: '512px',
  margin: '0 auto',
}
const titleStyle: React.CSSProperties = { fontSize: '22px', fontWeight: 700, color: '#111827', marginBottom: '8px' }
const subtitleStyle: React.CSSProperties = { fontSize: '14px', color: '#6b7280', marginBottom: '24px' }
const infoList: React.CSSProperties = { marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '12px' }
const infoRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }
const infoLabel: React.CSSProperties = { fontSize: '13px', fontWeight: 600, color: '#374151', minWidth: '80px', paddingTop: '1px' }
const infoValueWrap: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: '6px', flex: 1 }
const checkmark: React.CSSProperties = { color: '#10b981', fontWeight: 700, fontSize: '14px', flexShrink: 0 }
const infoValue: React.CSSProperties = { fontSize: '13px', color: '#111827', lineHeight: '1.5' }
const notFound: React.CSSProperties = { fontSize: '13px', color: '#9ca3af' }
const primaryBtn: React.CSSProperties = { background: TEAL, color: '#fff', padding: '12px 28px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '15px', width: '100%' }
const linkBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#6b7280', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }
