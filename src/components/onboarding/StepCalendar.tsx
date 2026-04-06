'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

const TEAL = '#0F7695'

export function StepCalendar({ shop: _shop, userId, onNext, onShopUpdate }: StepProps) {
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
      <div style={{ marginBottom: '16px', textAlign: 'center' }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: '#e0f2fe',
          borderRadius: '16px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
        }}>
          📅
        </div>
      </div>
      <h2 style={{ ...titleStyle, textAlign: 'center' }}>Connect Google Calendar</h2>
      <p style={{ ...subtitleStyle, textAlign: 'center' }}>
        Let your AI receptionist book appointments directly into your calendar — no double-booking, ever.
      </p>

      <div style={{
        background: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#374151', lineHeight: '1.8' }}>
          <li>Automatically block off booked slots</li>
          <li>Send calendar invites to customers</li>
          <li>See all appointments in one place</li>
        </ul>
      </div>

      <button onClick={handleConnect} disabled={loading || skipping} style={primaryBtn}>
        {loading ? 'Connecting...' : 'Connect Google Calendar'}
      </button>

      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <button
          onClick={handleSkip}
          disabled={skipping || loading}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '14px' }}
        >
          {skipping ? 'Skipping...' : 'Skip for now'}
        </button>
      </div>
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
const primaryBtn: React.CSSProperties = { background: TEAL, color: '#fff', padding: '12px 28px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '15px', width: '100%' }
