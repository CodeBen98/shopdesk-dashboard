'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

const TEAL = '#0F7695'
const DEMO_NUMBER = '(407) 555-0123'

export function StepTestCall({ shop, userId, onNext }: StepProps) {
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
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📞</div>
      <h2 style={titleStyle}>Make a test call</h2>
      <p style={subtitleStyle}>
        Call your shop number right now. Let it ring 4 times without answering.
        Your AI receptionist should pick up.
      </p>

      <div style={{
        background: '#f0f9ff',
        border: `2px solid ${TEAL}`,
        borderRadius: '10px',
        padding: '20px',
        marginBottom: '32px',
        display: 'inline-block',
        minWidth: '200px',
      }}>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>Call this number</p>
        <p style={{ fontSize: '24px', fontWeight: 800, color: '#111827' }}>{displayNumber}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button onClick={handleSuccess} disabled={loading} style={primaryBtn}>
          {loading ? 'Saving...' : 'It worked! 🎉'}
        </button>
        <button
          onClick={() => setShowProblem(p => !p)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '14px', padding: '8px' }}
        >
          I had a problem
        </button>
      </div>

      {showProblem && (
        <div style={{
          marginTop: '20px',
          background: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'left',
        }}>
          <p style={{ fontSize: '14px', color: '#92400e', margin: 0 }}>
            Email us at{' '}
            <strong>support@shopdesk.ai</strong>
            {' '}and we will sort it out within the hour.
          </p>
        </div>
      )}
    </div>
  )
}

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
  padding: '40px 32px',
  maxWidth: '512px',
  margin: '0 auto',
}
const titleStyle: React.CSSProperties = { fontSize: '22px', fontWeight: 700, color: '#111827', marginBottom: '10px' }
const subtitleStyle: React.CSSProperties = { fontSize: '14px', color: '#6b7280', marginBottom: '28px', lineHeight: '1.6' }
const primaryBtn: React.CSSProperties = { background: TEAL, color: '#fff', padding: '14px 28px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '16px', width: '100%' }
