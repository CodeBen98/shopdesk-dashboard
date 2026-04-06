'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShopHours } from '@/types'
import { StepProps } from './OnboardingWizard'

const TEAL = '#0F7695'

export function StepAutoFillChoice({ shop, userId, onNext, onSkipTo, onShopUpdate }: StepProps) {
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
        if (data.website !== null && data.website !== undefined) {
          updates.website = data.website
        }
        await supabase.from('shops').update(updates).eq('owner_id', userId)
        onShopUpdate({
          hours: data.hours as ShopHours,
          ...((!shop?.phone && data.phone) ? { phone: data.phone } : {}),
          onboarding_step: 'auto_fill_review',
        })
        onSkipTo('auto_fill_review')
      } else {
        setNotFoundMsg("We couldn't find your shop online. No worries — you can fill it in manually.")
        setTimeout(() => {
          onSkipTo('hours')
        }, 2000)
      }
    } catch {
      setNotFoundMsg("We couldn't find your shop online. No worries — you can fill it in manually.")
      setTimeout(() => {
        onSkipTo('hours')
      }, 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={card}>
      <h2 style={titleStyle}>Want us to set up your profile automatically?</h2>
      <p style={subtitleStyle}>
        We'll look up <strong>{shop?.name ?? 'your shop'}</strong> online and pre-fill your hours, services, and contact
        info. You can review and edit everything before continuing.
      </p>

      <div style={cardsRow}>
        {/* Auto-fill card */}
        <button
          onClick={() => setSelected('auto')}
          style={{
            ...optionCard,
            border: selected === 'auto' ? `2px solid ${TEAL}` : '2px solid #e5e7eb',
          }}
        >
          <div style={optionIcon}>⚡</div>
          <div style={optionBadgeWrap}>
            <span style={badge}>Recommended</span>
          </div>
          <div style={optionTitle}>Auto-fill my profile</div>
          <div style={optionDesc}>
            We'll look up your shop online and fill in your hours, phone, and more. Takes about 10 seconds.
          </div>
        </button>

        {/* Manual card */}
        <button
          onClick={() => setSelected('manual')}
          style={{
            ...optionCard,
            border: selected === 'manual' ? `2px solid ${TEAL}` : '2px solid #e5e7eb',
          }}
        >
          <div style={optionIcon}>✏️</div>
          <div style={{ height: '24px' }} /> {/* spacer to align with badge row */}
          <div style={optionTitle}>I'll fill it in myself</div>
          <div style={optionDesc}>
            Enter your hours, services, and contact info step by step.
          </div>
        </button>
      </div>

      {notFoundMsg && (
        <p style={notFoundStyle}>{notFoundMsg}</p>
      )}

      <button onClick={handleContinue} disabled={loading || !!notFoundMsg} style={primaryBtn}>
        {loading ? 'Looking up your shop...' : 'Continue →'}
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
const cardsRow: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginBottom: '24px',
  flexWrap: 'wrap',
}
const optionCard: React.CSSProperties = {
  flex: '1 1 180px',
  background: '#fff',
  borderRadius: '10px',
  padding: '20px 16px',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'border-color 0.15s',
  outline: 'none',
}
const optionIcon: React.CSSProperties = { fontSize: '28px', marginBottom: '8px' }
const optionBadgeWrap: React.CSSProperties = { marginBottom: '8px', minHeight: '24px' }
const badge: React.CSSProperties = {
  background: '#d1fae5',
  color: '#065f46',
  fontSize: '11px',
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: '99px',
  display: 'inline-block',
}
const optionTitle: React.CSSProperties = { fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '6px' }
const optionDesc: React.CSSProperties = { fontSize: '13px', color: '#6b7280', lineHeight: '1.5' }
const notFoundStyle: React.CSSProperties = { fontSize: '14px', color: '#374151', background: '#f3f4f6', borderRadius: '8px', padding: '12px', marginBottom: '16px' }
const primaryBtn: React.CSSProperties = { background: TEAL, color: '#fff', padding: '12px 28px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '15px', width: '100%' }
