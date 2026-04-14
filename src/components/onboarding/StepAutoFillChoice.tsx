'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShopHours } from '@/types'
import { StepProps } from './OnboardingWizard'

export function StepAutoFillChoice({ shop, userId, onBack, onSkipTo, onShopUpdate }: StepProps) {
  const [selected, setSelected] = useState<'auto' | 'manual'>('auto')
  const [loading, setLoading] = useState(false)
  const [notFoundMsg, setNotFoundMsg] = useState('')

  async function handleContinue() {
    if (selected === 'manual') {
      const supabase = createClient()
      await supabase.from('shops').update({ onboarding_step: 'hours' }).eq('owner_id', userId)
      onShopUpdate({ onboarding_step: 'hours' })
      onSkipTo('hours')
      return
    }

    setLoading(true)
    setNotFoundMsg('')

    try {
      const res = await fetch('/api/gather-shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: shop?.name ?? '', address: shop?.address ?? '' }),
      })
      const data = await res.json()

      if (data.found) {
        const supabase = createClient()
        const updates: Record<string, unknown> = {
          hours: data.hours as ShopHours,
          onboarding_step: 'auto_fill_review',
        }
        if (!shop?.phone && data.phone) {
          updates.phone = data.phone
        }
        const { error } = await supabase.from('shops').update(updates).eq('owner_id', userId)
        if (error) {
          throw error
        }
        onShopUpdate({
          hours: data.hours as ShopHours,
          ...((!shop?.phone && data.phone) ? { phone: data.phone } : {}),
          onboarding_step: 'auto_fill_review',
        })
        onSkipTo('auto_fill_review')
      } else {
        setNotFoundMsg("We couldn't find your shop online. No worries, you can fill it in manually.")
        setTimeout(() => {
          onSkipTo('hours')
        }, 2000)
      }
    } catch {
      setNotFoundMsg("We couldn't find your shop online. No worries, you can fill it in manually.")
      setTimeout(() => {
        onSkipTo('hours')
      }, 2000)
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
        {loading ? 'Looking up your shop...' : 'Continue →'}
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
  fontSize: 24,
  fontWeight: 700,
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
