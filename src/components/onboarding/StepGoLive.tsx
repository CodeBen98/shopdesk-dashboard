'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

const TEAL = '#0F7695'
const DEMO_NUMBER = '(407) 555-0123'

const VOICE_LABELS: Record<string, string> = {
  patricia: 'Patricia — Warm & Professional',
  james: 'James — Calm & Authoritative',
  sofia: 'Sofia — Friendly & Energetic',
  marcus: 'Marcus — Direct & Trustworthy',
}

export function StepGoLive({ shop, userId }: StepProps) {
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

  const shopName = shop?.name ?? 'Your Shop'
  const phoneNumber = shop?.twilio_number ?? DEMO_NUMBER
  const voiceLabel = VOICE_LABELS[shop?.ai_voice ?? 'patricia'] ?? shop?.ai_voice ?? 'Patricia'

  return (
    <div style={{ ...card, textAlign: 'center' }}>
      <div style={{ fontSize: '56px', marginBottom: '8px' }}>🎉</div>
      <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>
        You&apos;re live!
      </h2>
      <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '32px', lineHeight: '1.6' }}>
        Your AI receptionist is ready to take calls for <strong>{shopName}</strong>.
      </p>

      <div style={{
        background: '#f0fdf4',
        border: '1px solid #86efac',
        borderRadius: '10px',
        padding: '24px',
        marginBottom: '32px',
        textAlign: 'left',
      }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
          Your Setup Summary
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <SummaryRow label="Shop" value={shopName} />
          <SummaryRow label="Phone Number" value={phoneNumber} />
          <SummaryRow label="AI Voice" value={voiceLabel} />
        </div>
      </div>

      <button onClick={handleGoLive} disabled={loading} style={primaryBtn}>
        {loading ? 'Setting up...' : 'Go to Dashboard →'}
      </button>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '14px', color: '#4b5563' }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{value}</span>
    </div>
  )
}

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
  padding: '48px 32px',
  maxWidth: '512px',
  margin: '0 auto',
}
const primaryBtn: React.CSSProperties = { background: TEAL, color: '#fff', padding: '14px 28px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '16px', width: '100%' }
