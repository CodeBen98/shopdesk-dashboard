'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

export function StepCalendar({ shop: _shop, userId, onNext, onBack, onShopUpdate }: StepProps) {
  const [loading, setLoading] = useState(false)
  const [skipping, setSkipping] = useState(false)

  async function handleConnect() {
    // OAuth wiring comes later — placeholder
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    setLoading(false)
    alert('Google Calendar OAuth will be wired up soon. Skipping for now.')
    await handleSkip()
  }

  async function handleSkip() {
    setSkipping(true)
    const supabase = createClient()
    await supabase.from('shops').update({
      google_calendar_id: null,
      onboarding_step: 'voice',
    }).eq('owner_id', userId)
    onShopUpdate({ google_calendar_id: null })
    setSkipping(false)
    onNext()
  }

  return (
    <div style={card}>
      <button onClick={onBack} style={backBtn}>← Back</button>

      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <div style={{
          width: 64,
          height: 64,
          background: 'var(--accent-dim)',
          borderRadius: 16,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          border: '1px solid rgba(15,118,149,0.2)',
        }}>
          📅
        </div>
      </div>
      <h2 style={{ ...titleStyle, textAlign: 'center' }}>Connect Google Calendar</h2>
      <p style={{ ...subtitleStyle, textAlign: 'center' }}>
        Let your AI receptionist book appointments directly into your calendar — no double-booking, ever.
      </p>

      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
      }}>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.8 }}>
          <li>Automatically block off booked slots</li>
          <li>Send calendar invites to customers</li>
          <li>See all appointments in one place</li>
        </ul>
      </div>

      <button onClick={handleConnect} disabled={loading || skipping} className="step-btn-primary">
        {loading ? 'Connecting...' : 'Connect Google Calendar'}
      </button>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button
          onClick={handleSkip}
          disabled={skipping || loading}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14, fontFamily: 'inherit' }}
        >
          {skipping ? 'Skipping...' : 'Skip for now'}
        </button>
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
