'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

const HIGHLIGHTS = [
  'We set up your receptionist with your name, hours, and services',
  'Customers call your number, we answer when you can\'t',
  'Every booking goes straight to your Google Calendar',
  'You get an email every time we book an appointment',
]

export function WelcomeStep({ userId, onNext, onShopUpdate }: StepProps) {
  const [loading, setLoading] = useState(false)

  async function handleStart() {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('shops').update({
      onboarding_step: 'shop_info',
    }).eq('owner_id', userId)
    onShopUpdate({ onboarding_step: 'shop_info' })
    setLoading(false)
    onNext()
  }

  return (
    <div style={card}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'var(--accent-dim)',
          border: '1px solid rgba(15,118,149,0.25)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-space)',
          fontSize: 'clamp(1.9rem, 4vw, 2.4rem)',
          fontWeight: 800,
          color: 'var(--text)',
          marginBottom: 10,
          lineHeight: 1.15,
          letterSpacing: '-0.5px',
        }}>
          Welcome to ShopDesk
        </h1>
        <p style={{
          fontSize: 16,
          color: 'var(--muted)',
          lineHeight: 1.6,
          maxWidth: 380,
          margin: '0 auto',
        }}>
          We're setting everything up. You'll be live and answering calls in about 8 minutes.
        </p>
      </div>

      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 32,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        {HIGHLIGHTS.map((text) => (
          <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'rgba(15,118,149,0.12)',
              border: '1.5px solid var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: 1,
            }}>
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.55 }}>{text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={handleStart}
        disabled={loading}
        className="step-btn-primary"
        style={{ width: '100%', padding: '15px 32px', fontSize: 16 }}
      >
        {loading ? 'Starting...' : "Let's get started →"}
      </button>
    </div>
  )
}

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  padding: '48px 48px 40px',
  maxWidth: 520,
  margin: '0 auto',
  boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
  animation: 'card-enter 0.35s ease',
}
