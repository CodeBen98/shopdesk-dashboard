'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

const DEMO_NUMBER = '(407) 555-0123'

export function StepForwarding({ shop, userId, onNext, onBack }: StepProps) {
  const displayNumber = shop?.twilio_number ?? DEMO_NUMBER
  // Strip to digits only for use in dial codes
  const rawDigits = displayNumber.replace(/\D/g, '')

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

  const carriers = [
    {
      name: 'AT&T',
      code: `*72${rawDigits}`,
      example: `*72+${rawDigits} then press Call`,
      note: null,
    },
    {
      name: 'Verizon',
      code: `*71${rawDigits}`,
      example: null,
      note: null,
    },
    {
      name: 'T-Mobile',
      code: `**67*${rawDigits}#`,
      example: null,
      note: null,
    },
    {
      name: 'Other / Landline',
      code: null,
      example: null,
      note: 'Call your carrier or go to your phone settings → Forward Unanswered Calls → enter your ShopDesk number.',
    },
  ]

  return (
    <div style={card}>
      <button onClick={onBack} style={backBtn}>← Back</button>

      <h2 style={titleStyle}>Forward your shop's calls to ShopDesk</h2>
      <p style={subtitleStyle}>
        When your shop phone rings and you don't answer, ShopDesk picks up. Here's how to set that up:
      </p>

      {/* Phone number display */}
      <div style={{
        background: 'var(--card)',
        border: '2px solid var(--accent)',
        borderRadius: 12,
        padding: '20px 24px',
        textAlign: 'center',
        marginBottom: 28,
      }}>
        <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 10 }}>
          Your dedicated ShopDesk number
        </p>
        <p style={{
          fontSize: 30,
          fontWeight: 800,
          color: 'var(--accent)',
          letterSpacing: '0.03em',
          marginBottom: 14,
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

      {/* Carrier cards */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 12 }}>
          Quick setup by carrier — takes 30 seconds:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {carriers.map(carrier => (
            <div key={carrier.name} style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '14px 16px',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                {carrier.name}
              </div>
              {carrier.code ? (
                <>
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: 13,
                    color: 'var(--accent)',
                    fontWeight: 600,
                    background: 'var(--accent-dim)',
                    border: '1px solid rgba(15,118,149,0.2)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    marginBottom: carrier.example ? 6 : 0,
                    wordBreak: 'break-all',
                  }}>
                    Dial: {carrier.code}
                  </div>
                  {carrier.example && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                      Example: {carrier.example}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                  {carrier.note}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation checkbox */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer' }}>
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

      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.5 }}>
        You can always change this later. Call forwarding works on any smartphone.
      </p>

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
  maxWidth: 580,
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
