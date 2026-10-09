'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

// Demo line callers can ring to hear the AI receptionist (set in the deployment environment).
const DEMO_NUMBER = process.env.NEXT_PUBLIC_DEMO_NUMBER || '(407) 555-0123'

export function StepTestCall({ shop, userId, onNext, onBack }: StepProps) {
  const displayNumber = shop?.twilio_number ?? DEMO_NUMBER
  const [showProblem, setShowProblem] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSuccess() {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('shops').update({
      onboarding_step: 'go_live',
    }).eq('owner_id', userId)
    setLoading(false)
    onNext()
  }

  return (
    <div style={{ ...card, textAlign: 'center' }}>
      <button onClick={onBack} style={{ ...backBtn, textAlign: 'left' }}>← Back</button>

      <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--accent-dim)', border: '1px solid rgba(15,118,149,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, marginLeft: 'auto', marginRight: 'auto' }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M5 5h6l2.5 6L10 13c1.5 2.5 5 5.5 7.5 7l2.5-3.5 6 2.5v6a2 2 0 01-2 2C11.5 27 1 16.5 1 5a2 2 0 012-2h2z" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round"/></svg>
      </div>
      <h2 style={titleStyle}>Make a test call</h2>
      <p style={subtitleStyle}>
        Call your business number right now and let it ring 4 times without answering. Your AI receptionist should pick up. During early setup, we usually verify this live with you before moving on.
      </p>

      <div style={{
        background: 'var(--card)',
        border: '2px solid var(--accent)',
        borderRadius: 12,
        padding: 24,
        marginBottom: 32,
        display: 'inline-block',
        minWidth: 200,
      }}>
        <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 8 }}>
          Call this number
        </p>
        <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', fontFamily: 'monospace' }}>{displayNumber}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <button onClick={handleSuccess} disabled={loading} className="step-btn-primary" style={{ marginTop: 8, width: 'auto', minWidth: 200, padding: '13px 32px' }}>
          {loading ? 'Saving...' : 'It worked, continue'}
        </button>
        <button
          onClick={() => setShowProblem(p => !p)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14, padding: 8, fontFamily: 'inherit', width: 'auto', minWidth: 200 }}
        >
          I had a problem
        </button>
      </div>

      {showProblem && (
        <div style={{
          marginTop: 20,
          background: 'var(--warning-dim)',
          border: '1px solid var(--warning)',
          borderRadius: 8,
          padding: 16,
          textAlign: 'left',
        }}>
          <p style={{ fontSize: 14, color: 'var(--warning)', margin: 0 }}>
            No problem. We will troubleshoot the forwarding and test call with you live before you finish setup. If needed, contact <strong>support@shopdesk.site</strong> and we will help immediately.
          </p>
        </div>
      )}
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
  width: '100%',
  fontFamily: 'inherit',
}
const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-space)',
  fontSize: 'clamp(1.4rem, 3vw, 1.8rem)',
  fontWeight: 800,
  letterSpacing: '-0.3px',
  color: 'var(--text)',
  marginBottom: 10,
}
const subtitleStyle: React.CSSProperties = {
  fontSize: 15,
  color: 'var(--muted)',
  lineHeight: 1.6,
  marginBottom: 28,
}
