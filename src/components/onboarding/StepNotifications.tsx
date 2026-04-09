'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

const ALERTS = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 1.5C5.96 1.5 3.5 3.96 3.5 7v4.5L2 13h14l-1.5-1.5V7c0-3.04-2.46-5.5-5.5-5.5z" stroke="var(--accent)" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M7 14.5a2 2 0 004 0" stroke="var(--accent)" strokeWidth="1.4"/>
      </svg>
    ),
    label: 'New booking',
    desc: 'Instant text when your AI books an appointment',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7" stroke="var(--accent)" strokeWidth="1.4"/>
        <path d="M9 5v4l2.5 2.5" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    label: 'Appointment reminder',
    desc: 'Text the morning of each upcoming appointment',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2L1.5 15.5h15L9 2z" stroke="var(--danger)" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M9 8v3M9 12.5v.5" stroke="var(--danger)" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    label: 'Emergency alert',
    desc: 'Immediate text if a caller reports a breakdown or emergency',
    danger: true,
  },
]

export function StepNotifications({ userId, onNext, onBack }: StepProps) {
  const [loading, setLoading] = useState(false)

  async function handleContinue() {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('shops').update({
      onboarding_step: 'emergency',
    }).eq('owner_id', userId)
    setLoading(false)
    onNext()
  }

  return (
    <div style={card}>
      <button onClick={onBack} style={backBtn}>← Back</button>

      <h2 style={titleStyle}>Alerts — how we keep you in the loop</h2>
      <p style={subtitleStyle}>
        We send texts to the mobile number you gave us. Here's exactly what to expect:
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {ALERTS.map(item => (
          <div key={item.label} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 16,
            padding: '16px 18px',
            background: 'var(--card)',
            border: `1px solid ${item.danger ? 'rgba(239,68,68,0.15)' : 'var(--border)'}`,
            borderRadius: 10,
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: item.danger ? 'var(--danger-dim)' : 'var(--accent-dim)',
              border: `1px solid ${item.danger ? 'rgba(239,68,68,0.2)' : 'rgba(15,118,149,0.2)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {item.icon}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                {item.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleContinue}
        disabled={loading}
        className="step-btn-primary"
        style={{ width: 'auto', minWidth: 200, padding: '13px 32px', display: 'block', marginLeft: 'auto' }}
      >
        {loading ? 'Saving...' : 'Got it, continue →'}
      </button>
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
