'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

const DEMO_NUMBER = '(407) 555-0123'

export function StepForwarding({ shop, userId, onNext, onBack }: StepProps) {
  const displayNumber = shop?.twilio_number ?? DEMO_NUMBER
  const [confirmed, setConfirmed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  function copyNumber() {
    navigator.clipboard.writeText(displayNumber).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleNext() {
    if (!confirmed) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('shops').update({
      onboarding_step: 'test_call',
    }).eq('owner_id', userId)
    setLoading(false)
    onNext()
  }

  return (
    <div style={card}>
      <button onClick={onBack} style={backBtn}>← Back</button>

      <h2 style={titleStyle}>Set up call forwarding</h2>
      <p style={subtitleStyle}>
        Forward unanswered calls from your shop number to your dedicated ShopDesk number below.
      </p>

      {/* Phone number display */}
      <div style={{
        background: 'var(--card)',
        border: '2px solid var(--accent)',
        borderRadius: 12,
        padding: '24px',
        textAlign: 'center',
        marginBottom: 28,
      }}>
        <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 10 }}>
          Your dedicated ShopDesk number
        </p>
        <p style={{
          fontSize: 32,
          fontWeight: 800,
          color: 'var(--accent)',
          letterSpacing: '0.03em',
          marginBottom: 16,
          fontFamily: 'monospace',
        }}>
          {displayNumber}
        </p>
        <button
          onClick={copyNumber}
          style={{
            background: copied ? 'rgba(34,197,94,0.15)' : 'var(--accent-dim)',
            color: copied ? 'var(--success)' : 'var(--accent)',
            border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(15,118,149,0.3)'}`,
            borderRadius: 8,
            padding: '8px 20px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s, border-color 0.2s',
            fontFamily: 'inherit',
          }}
        >
          {copied ? '✓ Copied!' : 'Copy Number'}
        </button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 12 }}>
          How to set it up
        </p>
        <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2, fontSize: 14, color: 'var(--text-mid)' }}>
          <li>Go to your phone carrier&apos;s settings (or call them)</li>
          <li>Enable <strong style={{ color: 'var(--text)' }}>&quot;Forward unanswered calls&quot;</strong></li>
          <li>Enter the number above as the forwarding destination</li>
          <li>Test it by calling your shop number and not answering</li>
        </ol>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={e => setConfirmed(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }}
        />
        <span style={{ fontSize: 14, color: 'var(--text-mid)', fontWeight: 500 }}>
          I have set up call forwarding
        </span>
      </label>

      <button
        onClick={handleNext}
        disabled={!confirmed || loading}
        className="step-btn-primary"
        style={{ opacity: confirmed ? 1 : 0.5, cursor: confirmed ? 'pointer' : 'not-allowed', width: 'auto', minWidth: 200, padding: '13px 32px', display: 'block', marginLeft: 'auto' }}
      >
        {loading ? 'Saving...' : 'Continue →'}
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
  marginBottom: 24,
}
