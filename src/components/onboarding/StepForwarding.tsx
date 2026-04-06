'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

const TEAL = '#0F7695'
const DEMO_NUMBER = '(407) 555-0123'

export function StepForwarding({ shop, userId, onNext }: StepProps) {
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
      <h2 style={titleStyle}>Set up call forwarding</h2>
      <p style={subtitleStyle}>
        Forward unanswered calls from your shop number to your dedicated ShopDesk number below.
      </p>

      <div style={{
        background: '#f0f9ff',
        border: `2px solid ${TEAL}`,
        borderRadius: '10px',
        padding: '20px',
        textAlign: 'center',
        marginBottom: '28px',
      }}>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Your dedicated ShopDesk number</p>
        <p style={{ fontSize: '28px', fontWeight: 800, color: '#111827', letterSpacing: '0.5px', marginBottom: '12px' }}>
          {displayNumber}
        </p>
        <button
          onClick={copyNumber}
          style={{
            background: copied ? '#16a34a' : TEAL,
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {copied ? '✓ Copied!' : 'Copy Number'}
        </button>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
          How to set it up:
        </p>
        <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: '2', fontSize: '14px', color: '#4b5563' }}>
          <li>Go to your phone carrier&apos;s settings (or call them)</li>
          <li>Enable <strong>&quot;Forward unanswered calls&quot;</strong></li>
          <li>Enter the number above as the forwarding destination</li>
          <li>Test it by calling your shop number and not answering</li>
        </ol>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={e => setConfirmed(e.target.checked)}
          style={{ width: '18px', height: '18px', accentColor: TEAL, cursor: 'pointer' }}
        />
        <span style={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>
          I have set up call forwarding
        </span>
      </label>

      <button
        onClick={handleNext}
        disabled={!confirmed || loading}
        style={{
          ...primaryBtn,
          opacity: confirmed ? 1 : 0.5,
          cursor: confirmed ? 'pointer' : 'not-allowed',
        }}
      >
        {loading ? 'Saving...' : 'Continue →'}
      </button>
    </div>
  )
}

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
  padding: '32px',
  maxWidth: '512px',
  margin: '0 auto',
}
const titleStyle: React.CSSProperties = { fontSize: '22px', fontWeight: 700, color: '#111827', marginBottom: '8px' }
const subtitleStyle: React.CSSProperties = { fontSize: '14px', color: '#6b7280', marginBottom: '24px' }
const primaryBtn: React.CSSProperties = { background: TEAL, color: '#fff', padding: '12px 28px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '15px', width: '100%' }
