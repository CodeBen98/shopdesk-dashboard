'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

const DEMO_NUMBER = '(407) 555-0123'

const VOICE_LABELS: Record<string, string> = {
  cindy:      'Cindy, Smooth and Welcoming',
  jacqueline: 'Jacqueline, Confident and Warm',
  james:      'James, Calm and Authoritative',
  marcus:     'Marcus, Direct and Trustworthy',
}

const CONFETTI = [
  { color: 'var(--accent)', left: '8%', delay: '0s', size: 8, duration: '1.4s' },
  { color: '#22c55e', left: '20%', delay: '0.1s', size: 6, duration: '1.6s' },
  { color: '#f59e0b', left: '35%', delay: '0.2s', size: 10, duration: '1.3s' },
  { color: '#a855f7', left: '50%', delay: '0.05s', size: 7, duration: '1.5s' },
  { color: '#ef4444', left: '65%', delay: '0.15s', size: 9, duration: '1.4s' },
  { color: '#0ea5e9', left: '78%', delay: '0.25s', size: 6, duration: '1.6s' },
  { color: '#f97316', left: '90%', delay: '0.3s', size: 8, duration: '1.3s' },
  { color: 'var(--accent)', left: '45%', delay: '0.08s', size: 5, duration: '1.7s' },
]

export function StepGoLive({ shop, userId, onBack }: StepProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleGoLive() {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('shops').update({
      onboarding_complete: true,
      status: 'live',
      onboarding_step: 'go_live',
    }).eq('owner_id', userId)
    router.push('/dashboard')
  }

  const shopName = shop?.name ?? 'Your Business'
  const phoneNumber = shop?.twilio_number ?? DEMO_NUMBER
  const voiceLabel = VOICE_LABELS[shop?.ai_voice ?? ''] ?? shop?.ai_voice ?? 'Not selected'

  return (
    <div style={{ position: 'relative', maxWidth: 560, margin: '0 auto' }}>
      {/* Confetti dots */}
      {CONFETTI.map((c, i) => (
        <div key={i} style={{
          position: 'absolute',
          bottom: '60%',
          left: c.left,
          width: c.size,
          height: c.size,
          borderRadius: '50%',
          background: c.color,
          animation: `confetti-fly ${c.duration} ${c.delay} ease-out forwards`,
          pointerEvents: 'none',
          zIndex: 10,
        }} />
      ))}

      <div style={{ ...card, textAlign: 'center' }}>
        <button onClick={onBack} style={{ ...backBtn, textAlign: 'left' }}>← Back</button>

        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(15,118,149,0.12)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, marginLeft: 'auto', marginRight: 'auto' }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path d="M10 20l8 8 12-16" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
              style={{ strokeDasharray: 40, strokeDashoffset: 0, animation: 'checkmark-draw 0.6s ease forwards' }}
            />
          </svg>
        </div>
        <h2 style={{
          fontFamily: 'var(--font-space)',
          fontSize: 'clamp(1.8rem, 4vw, 2.2rem)',
          fontWeight: 800,
          color: 'var(--text)',
          marginBottom: 8,
          letterSpacing: '-0.5px',
        }}>
          You&apos;re live!
        </h2>
        <p style={{ fontSize: 16, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.6 }}>
          ShopDesk is answering missed calls for <strong style={{ color: 'var(--text)' }}>{shopName}</strong>. We handle it from here.
        </p>

        {/* Summary card */}
        <div style={{
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.25)',
          borderRadius: 12,
          padding: 24,
          marginBottom: 32,
          textAlign: 'left',
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
            What We Set Up
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SummaryRow label="Business" value={shopName} />
            <SummaryRow label="Phone Number" value={phoneNumber} />
            <SummaryRow label="AI Voice" value={voiceLabel} />
          </div>
        </div>

        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          textAlign: 'left',
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            What happens now
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SummaryRow label="Calls" value="Your number rings first, then ShopDesk answers missed calls" />
            <SummaryRow label="Bookings" value="New appointments show up in your dashboard and calendar" />
            <SummaryRow label="Results" value="Your call log and bookings appear here as they come in" />
          </div>
        </div>

        <button
          onClick={handleGoLive}
          disabled={loading}
          className="step-btn-primary"
          style={{
            fontSize: 16,
            padding: '16px 24px',
            boxShadow: loading ? 'none' : '0 4px 16px rgba(15,118,149,0.3)',
            marginTop: 0,
          }}
        >
          {loading ? 'Setting up...' : 'See Your Results →'}
        </button>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 14, color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{value}</span>
    </div>
  )
}

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  padding: '40px 48px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
  animation: 'card-enter 0.35s ease',
  position: 'relative',
  zIndex: 1,
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
