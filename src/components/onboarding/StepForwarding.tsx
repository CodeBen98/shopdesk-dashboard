'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

// Demo line callers can ring to hear the AI receptionist (set in the deployment environment).
const DEMO_NUMBER = process.env.NEXT_PUBLIC_DEMO_NUMBER || '(407) 555-0123'

export function StepForwarding({ shop, userId, onBack }: StepProps) {
  const router = useRouter()
  const displayNumber = shop?.twilio_number ?? DEMO_NUMBER
  const rawDigits = displayNumber.replace(/\D/g, '')

  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  function copyNumber() {
    navigator.clipboard.writeText(displayNumber).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleGoLive() {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('shops').update({
      onboarding_complete: true,
      status: 'live',
      onboarding_step: 'forwarding',
    }).eq('owner_id', userId)
    router.push('/dashboard')
  }

  const carriers = [
    { name: 'AT&T',           code: `*72${rawDigits}`,    note: null },
    { name: 'Verizon',        code: `*71${rawDigits}`,    note: null },
    { name: 'T-Mobile',       code: `**67*${rawDigits}#`, note: null },
    { name: 'Other / Landline', code: null, note: 'Go to your phone settings → Forward Unanswered Calls → enter your ShopDesk number. Or call your carrier.' },
  ]

  return (
    <div style={card}>
      <button onClick={onBack} style={backBtn}>← Back</button>

      {/* Live badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{
          width: 10, height: 10, borderRadius: '50%',
          background: 'var(--success)',
          boxShadow: '0 0 0 4px var(--success-dim)',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>
          Your receptionist is live
        </span>
      </div>

      <h2 style={titleStyle}>One last step: activate call forwarding</h2>
      <p style={subtitleStyle}>
        Forward your business number to ShopDesk so we pick up every call you miss. Takes about 30 seconds.
      </p>

      {/* Phone number */}
      <div style={{
        background: 'var(--card)',
        border: '2px solid var(--accent)',
        borderRadius: 12,
        padding: '20px 24px',
        textAlign: 'center',
        marginBottom: 28,
      }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 10 }}>
          Your ShopDesk number
        </p>
        <p style={{
          fontSize: 30, fontWeight: 800, color: 'var(--accent)',
          letterSpacing: '0.03em', marginBottom: 14, fontFamily: 'monospace',
        }}>
          {displayNumber}
        </p>
        <button
          onClick={copyNumber}
          style={{
            background: copied ? 'rgba(34,197,94,0.15)' : 'var(--accent-dim)',
            color: copied ? 'var(--success)' : 'var(--accent)',
            border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(15,118,149,0.3)'}`,
            borderRadius: 8, padding: '8px 20px',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s', fontFamily: 'inherit',
          }}
        >
          {copied ? '✓ Copied!' : 'Copy Number'}
        </button>
      </div>

      {/* Carrier shortcuts */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 12 }}>
          Common carrier shortcuts
        </p>
        <style>{`.carrier-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media(max-width:540px){.carrier-grid{grid-template-columns:1fr}}`}</style>
        <div className="carrier-grid">
          {carriers.map(carrier => (
            <div key={carrier.name} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '14px 16px',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                {carrier.name}
              </div>
              {carrier.code ? (
                <div style={{
                  fontFamily: 'monospace', fontSize: 13, color: 'var(--accent)',
                  fontWeight: 600, background: 'var(--accent-dim)',
                  border: '1px solid rgba(15,118,149,0.2)', borderRadius: 6,
                  padding: '6px 10px', wordBreak: 'break-all',
                }}>
                  Dial: {carrier.code}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                  {carrier.note}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.5 }}>
        You can also activate forwarding later from your dashboard. We&apos;ll remind you if it&apos;s not set up.
      </p>

      <button
        onClick={handleGoLive}
        disabled={loading}
        className="step-btn-primary"
        style={{
          width: '100%', padding: '15px 24px', fontSize: 16,
          boxShadow: '0 4px 16px rgba(15,118,149,0.3)',
        }}
      >
        {loading ? 'Saving...' : 'Go to Dashboard →'}
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
  background: 'none', border: 'none', color: 'var(--muted)',
  fontSize: 14, cursor: 'pointer', padding: 0,
  marginBottom: 24, display: 'block', fontFamily: 'inherit',
}
const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-space)',
  fontSize: 'clamp(1.4rem, 3vw, 1.8rem)',
  fontWeight: 800, letterSpacing: '-0.3px',
  color: 'var(--text)', marginBottom: 8,
}
const subtitleStyle: React.CSSProperties = {
  fontSize: 15, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24,
}
