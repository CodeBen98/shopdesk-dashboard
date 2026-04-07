'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

export function StepCalendar({ shop, userId, onNext, onBack, onShopUpdate }: StepProps) {
  const [skipping, setSkipping] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [connected, setConnected] = useState(!!shop?.google_calendar_id)

  // Check if returning from OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const calendarStatus = params.get('calendar')
    if (calendarStatus === 'connected') {
      setConnected(true)
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
      // Auto-advance after a brief moment
      setTimeout(() => onNext(), 1500)
    } else if (calendarStatus === 'error') {
      setSaveError('Could not connect Google Calendar. You can skip and connect later from Settings.')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  function handleConnect() {
    // Redirect to OAuth flow
    window.location.href = '/api/auth/google-calendar'
  }

  async function handleSkip() {
    setSkipping(true)
    setSaveError('')
    const supabase = createClient()
    const { error: saveErr } = await supabase.from('shops').update({
      google_calendar_id: null,
      onboarding_step: 'voice',
    }).eq('owner_id', userId)
    if (saveErr) {
      setSaveError('Failed to save. Please try again.')
      setSkipping(false)
      return
    }
    onShopUpdate({ google_calendar_id: null })
    setSkipping(false)
    onNext()
  }

  return (
    <div style={card}>
      <button onClick={onBack} style={backBtn}>← Back</button>

      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64,
          background: connected ? 'rgba(34,197,94,0.1)' : 'var(--accent-dim)',
          borderRadius: 16,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${connected ? 'rgba(34,197,94,0.3)' : 'rgba(15,118,149,0.2)'}`,
        }}>
          {connected ? (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="12" stroke="var(--success)" strokeWidth="1.5"/>
              <path d="M8 14l4 4 8-8" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="5" width="24" height="22" rx="3" stroke="var(--accent)" strokeWidth="1.5"/>
              <path d="M8 2v6M20 2v6M2 12h24" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
        </div>
      </div>

      <h2 style={{ ...titleStyle, textAlign: 'center' }}>
        {connected ? 'Google Calendar connected' : 'Connect Google Calendar'}
      </h2>
      <p style={{ ...subtitleStyle, textAlign: 'center' }}>
        {connected
          ? 'Appointments will be booked directly into your Google Calendar.'
          : 'Let your AI book appointments directly into your calendar. No double-booking, ever.'
        }
      </p>

      {!connected && (
        <ul style={{ margin: '0 0 24px', paddingLeft: 20, fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.8 }}>
          <li>Automatically block off booked time slots</li>
          <li>Customers get calendar invites</li>
          <li>See all appointments in one place</li>
        </ul>
      )}

      {saveError && (
        <p style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 16, textAlign: 'center' }}>
          {saveError}
        </p>
      )}

      {connected ? (
        <button onClick={onNext} className="step-btn-primary" style={{ width: 'auto', minWidth: 200, display: 'block', marginLeft: 'auto', padding: '13px 32px' }}>
          Continue →
        </button>
      ) : (
        <>
          <button onClick={handleConnect} style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            background: '#fff',
            color: '#3c4043',
            border: '1px solid #dadce0',
            borderRadius: 8,
            padding: '12px 24px',
            fontSize: 15,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
            marginBottom: 16,
          }}>
            <GoogleIcon />
            Sign in with Google
          </button>

          <div style={{ textAlign: 'center' }}>
            <button
              onClick={handleSkip}
              disabled={skipping}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-mid)', fontSize: 14, fontFamily: 'inherit',
                textDecoration: 'underline',
              }}
            >
              {skipping ? 'Skipping...' : 'Skip for now'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
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
  background: 'none', border: 'none', color: 'var(--muted)',
  fontSize: 14, cursor: 'pointer', padding: 0,
  marginBottom: 24, display: 'block', fontFamily: 'inherit',
}
const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-space)', fontSize: 24, fontWeight: 700,
  color: 'var(--text)', marginBottom: 8,
}
const subtitleStyle: React.CSSProperties = {
  fontSize: 15, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 28,
}
