'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

const PROGRESS_MESSAGES = [
  'Finding your business on Google…',
  'Reading your website…',
  'Building your agent profile…',
  'Almost done…',
]

export function StepAutoFillChoice({ shop, userId, onBack, onSkipTo, onShopUpdate }: StepProps) {
  const [selected, setSelected] = useState<'gbp' | 'auto' | 'manual'>('gbp')
  const [loading, setLoading] = useState(false)
  const [progressIdx, setProgressIdx] = useState(0)
  const [notFoundMsg, setNotFoundMsg] = useState('')

  useEffect(() => {
    if (!loading) return
    const id = setInterval(() => {
      setProgressIdx(i => Math.min(i + 1, PROGRESS_MESSAGES.length - 1))
    }, 5000)
    return () => clearInterval(id)
  }, [loading])

  async function handleContinue() {
    if (selected === 'manual') {
      const supabase = createClient()
      await supabase.from('shops').update({ onboarding_step: 'hours' }).eq('owner_id', userId)
      onShopUpdate({ onboarding_step: 'hours' })
      onSkipTo('hours')
      return
    }

    if (selected === 'gbp') {
      // Redirect to Google OAuth — the callback handles enrichment and redirects back
      window.location.href = '/api/google-business/auth'
      return
    }

    setLoading(true)
    setProgressIdx(0)
    setNotFoundMsg('')

    try {
      const res = await fetch('/api/enrich-shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json() as {
        success?: boolean
        sources?: { places?: boolean; website?: boolean; gbp?: boolean }
        confidence?: 'high' | 'medium' | 'low' | null
        synthesis_error?: string | null
      }

      const foundAnything = data.sources?.places || data.sources?.website || data.sources?.gbp
      if (!foundAnything) {
        setNotFoundMsg("We couldn't find your business online. No worries, you can fill it in manually.")
        setTimeout(() => { onSkipTo('hours') }, 2000)
        return
      }

      const supabase = createClient()
      await supabase.from('shops').update({ onboarding_step: 'auto_fill_review' }).eq('owner_id', userId)
      onShopUpdate({ onboarding_step: 'auto_fill_review' })
      onSkipTo('auto_fill_review')
    } catch {
      setNotFoundMsg("We couldn't find your business online. No worries, you can fill it in manually.")
      setTimeout(() => { onSkipTo('hours') }, 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={card}>
      <button onClick={onBack} style={backBtn}>← Back</button>

      <h2 style={titleStyle}>Auto-fill your profile</h2>
      <p style={subtitleStyle}>
        We found <strong style={{ color: 'var(--text)' }}>{shop?.name ?? 'your business'}</strong> online and can pre-fill your hours and contact info. You review before continuing.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {/* Google Business Profile card */}
        <button
          onClick={() => setSelected('gbp')}
          className="option-card-anim"
          style={{
            ...optionCard,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            padding: '18px 20px',
            border: selected === 'gbp' ? '2px solid var(--accent)' : '2px solid var(--border)',
            background: selected === 'gbp' ? 'rgba(15,118,149,0.06)' : 'var(--card)',
            boxShadow: selected === 'gbp' ? '0 0 0 4px rgba(15,118,149,0.15)' : 'none',
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={optionTitle}>Connect Google Business</span>
              <span style={badge}>MOST ACCURATE</span>
            </div>
            <div style={optionDesc}>Pull your verified hours, description, and categories directly from Google. No scraping — always accurate.</div>
          </div>
        </button>

        {/* Auto-fill card */}
        <button
          onClick={() => setSelected('auto')}
          className="option-card-anim"
          style={{
            ...optionCard,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            padding: '18px 20px',
            border: selected === 'auto' ? '2px solid var(--accent)' : '2px solid var(--border)',
            background: selected === 'auto' ? 'rgba(15,118,149,0.06)' : 'var(--card)',
            boxShadow: selected === 'auto' ? '0 0 0 4px rgba(15,118,149,0.15)' : 'none',
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M10 2L3 10h7l-2 6 8-9h-7l1-5z" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ marginBottom: 3 }}><span style={optionTitle}>Auto-fill from web</span></div>
            <div style={optionDesc}>We&apos;ll scan your website and Google listing. Quick, no login needed — may miss some details.</div>
          </div>
        </button>

        {/* Manual card */}
        <button
          onClick={() => setSelected('manual')}
          className="option-card-anim"
          style={{
            ...optionCard,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            padding: '18px 20px',
            border: selected === 'manual' ? '2px solid rgba(255,255,255,0.3)' : '2px solid var(--border)',
            background: 'var(--card)',
            boxShadow: 'none',
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--card-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M13 2l3 3-10 10H3v-3L13 2z" stroke="var(--text-mid)" strokeWidth="1.5" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ marginBottom: 3 }}><span style={optionTitle}>Fill in manually</span></div>
            <div style={optionDesc}>Enter your hours, services, and contact info step by step.</div>
          </div>
        </button>
      </div>

      {notFoundMsg && (
        <p style={notFoundStyle}>{notFoundMsg}</p>
      )}

      <button onClick={handleContinue} disabled={loading || !!notFoundMsg} className="step-btn-primary" style={{ width: 'auto', minWidth: 200, padding: '13px 32px', display: 'block', marginLeft: 'auto' }}>
        {loading
          ? PROGRESS_MESSAGES[progressIdx]
          : selected === 'gbp'
            ? 'Connect with Google →'
            : 'Continue →'}
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
  transition: 'color 0.15s',
  fontFamily: 'inherit',
}
const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-space)',
  fontSize: 'clamp(1.4rem, 3vw, 1.8rem)',
  fontWeight: 800,
  letterSpacing: '-0.3px',
  color: 'var(--text)',
  marginBottom: 8,
}
const subtitleStyle: React.CSSProperties = {
  fontSize: 15,
  color: 'var(--muted)',
  lineHeight: 1.6,
  marginBottom: 28,
}
const optionCard: React.CSSProperties = {
  flex: 1,
  borderRadius: 12,
  padding: '24px',
  cursor: 'pointer',
  textAlign: 'left',
  outline: 'none',
  display: 'flex',
  flexDirection: 'column',
}
const badge: React.CSSProperties = {
  background: 'var(--accent)',
  color: '#fff',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.06em',
  padding: '3px 10px',
  borderRadius: 9999,
  display: 'inline-block',
}
const optionTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: 'var(--text)',
  marginBottom: 6,
}
const optionDesc: React.CSSProperties = { fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }
const notFoundStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--text-mid)',
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: 12,
  marginBottom: 16,
}
