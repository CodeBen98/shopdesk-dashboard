'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

// Rotating progress messages during the enrichment wait. The whole pipeline
// takes 10-30 sec on a shop with a website, so a single "Loading..." feels
// broken. These cycle while the request is in-flight.
const PROGRESS_MESSAGES = [
  'Finding your shop on Google…',
  'Reading your website…',
  'Building your agent profile…',
  'Almost done…',
]

export function StepAutoFillChoice({ shop, userId, onBack, onSkipTo, onShopUpdate }: StepProps) {
  const [selected, setSelected] = useState<'auto' | 'manual'>('auto')
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

    setLoading(true)
    setProgressIdx(0)
    setNotFoundMsg('')

    try {
      // Kicks off harvest (Google Places + Jina website scrape) and
      // synthesis (Claude Sonnet 4.6). Persists enrichment_raw + enrichment
      // on the shops row. See shopdesk/design-docs/2026-04-23-enrichment-engine.md.
      const res = await fetch('/api/enrich-shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json() as {
        success?: boolean
        sources?: { places?: boolean; website?: boolean }
        confidence?: 'high' | 'medium' | 'low' | null
        synthesis_error?: string | null
      }

      // If the harvest itself found no Google match, fall back to manual.
      const foundAnything = data.sources?.places || data.sources?.website
      if (!foundAnything) {
        setNotFoundMsg("We couldn't find your shop online. No worries, you can fill it in manually.")
        setTimeout(() => { onSkipTo('hours') }, 2000)
        return
      }

      // Advance to the review step even if synthesis failed — the raw data
      // is still useful, and the review page will show a graceful fallback.
      const supabase = createClient()
      await supabase.from('shops').update({ onboarding_step: 'auto_fill_review' }).eq('owner_id', userId)
      onShopUpdate({ onboarding_step: 'auto_fill_review' })
      onSkipTo('auto_fill_review')
    } catch {
      setNotFoundMsg("We couldn't find your shop online. No worries, you can fill it in manually.")
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
        We found <strong style={{ color: 'var(--text)' }}>{shop?.name ?? 'your shop'}</strong> online and can pre-fill your hours and contact info. You review before continuing.
      </p>

      <div style={cardsRow}>
        {/* Auto-fill card */}
        <button
          onClick={() => setSelected('auto')}
          className="option-card-anim"
          style={{
            ...optionCard,
            border: selected === 'auto' ? '2px solid var(--accent)' : '2px solid var(--border)',
            background: selected === 'auto' ? 'rgba(15,118,149,0.06)' : 'var(--card)',
            boxShadow: selected === 'auto' ? '0 0 0 4px rgba(15,118,149,0.15)' : 'none',
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M10 2L3 10h7l-2 6 8-9h-7l1-5z" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ marginBottom: 8 }}>
            <span style={badge}>RECOMMENDED</span>
          </div>
          <div style={optionTitle}>Auto-fill my profile</div>
          <div style={optionDesc}>
            We&apos;ll look up your shop online and fill in your hours, phone, and more. Takes about 10 seconds
          </div>
        </button>

        {/* Manual card */}
        <button
          onClick={() => setSelected('manual')}
          className="option-card-anim"
          style={{
            ...optionCard,
            border: selected === 'manual' ? '2px solid rgba(255,255,255,0.3)' : '2px solid var(--border)',
            background: 'var(--card)',
            boxShadow: 'none',
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--card-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M13 2l3 3-10 10H3v-3L13 2z" stroke="var(--text-mid)" strokeWidth="1.5" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ height: 24, marginBottom: 8 }} />
          <div style={optionTitle}>Fill in manually</div>
          <div style={optionDesc}>
            Enter your hours, services, and contact info step by step.
          </div>
        </button>
      </div>

      {notFoundMsg && (
        <p style={notFoundStyle}>{notFoundMsg}</p>
      )}

      <button onClick={handleContinue} disabled={loading || !!notFoundMsg} className="step-btn-primary" style={{ width: 'auto', minWidth: 200, padding: '13px 32px', display: 'block', marginLeft: 'auto' }}>
        {loading ? PROGRESS_MESSAGES[progressIdx] : 'Continue →'}
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
const cardsRow: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  marginBottom: 24,
  flexWrap: 'wrap',
  alignItems: 'stretch',
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
