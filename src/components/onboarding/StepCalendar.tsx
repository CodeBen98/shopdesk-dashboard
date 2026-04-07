'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

export function StepCalendar({ shop: _shop, userId, onNext, onBack, onShopUpdate }: StepProps) {
  const [loading, setLoading] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const [comingSoon, setComingSoon] = useState(false)
  const [saveError, setSaveError] = useState('')

  async function handleConnect() {
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    setLoading(false)
    setComingSoon(true)
    setTimeout(() => handleSkip(), 2000)
  }

  async function handleSkip() {
    setSkipping(true)
    setSaveError('')
    const supabase = createClient()
    const { error: saveErr } = await supabase.from('shops').update({
      google_calendar_id: null,
      onboarding_step: 'voice',
    }).eq('owner_id', userId)
    if (saveErr) {
      setSaveError('Failed to save. Please try again.')
      setSkipping(false)
      return
    }
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
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="2" y="5" width="24" height="22" rx="3" stroke="var(--accent)" strokeWidth="1.5"/><path d="M8 2v6M20 2v6M2 12h24" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
      </div>
      <h2 style={{ ...titleStyle, textAlign: 'center' }}>Connect Google Calendar</h2>
      <p style={{ ...subtitleStyle, textAlign: 'center' }}>
        Let your AI book appointments directly into your calendar. No double-booking, ever.
      </p>

      <ul style={{ margin: '0 0 24px', paddingLeft: 20, fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.8 }}>
        <li>Automatically block off booked slots</li>
        <li>Send calendar invites to customers</li>
        <li>See all appointments in one place</li>
      </ul>

      <button onClick={handleConnect} disabled={loading || skipping || comingSoon} className="step-btn-primary">
        {loading ? 'Connecting...' : 'Connect Google Calendar'}
      </button>

      {comingSoon && (
        <p style={{
          fontSize: 14,
          color: 'var(--text-mid)',
          marginTop: 12,
          lineHeight: 1.6,
          textAlign: 'center',
        }}>
          Google Calendar integration is coming soon. We&apos;ll notify you when it&apos;s ready. For now, your AI will take appointment requests and notify you.
        </p>
      )}

      {saveError && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8, textAlign: 'center' }}>{saveError}</p>}

      <div style={{ textAlign: 'right', marginTop: 16 }}>
        <button
          onClick={handleSkip}
          disabled={skipping || loading}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-mid)', fontSize: 14, fontFamily: 'inherit', textDecoration: 'underline', width: 'auto', minWidth: 200, padding: '13px 32px', display: 'block', marginLeft: 'auto' }}
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
