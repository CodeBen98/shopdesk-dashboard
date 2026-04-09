'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

export function StepEmergency({ shop, userId, onNext, onBack, onShopUpdate }: StepProps) {
  const [contactName, setContactName] = useState(shop?.emergency_contact_name ?? '')
  const [contactPhone, setContactPhone] = useState(shop?.emergency_contact ?? '')
  const [smsConsent, setSmsConsent] = useState(shop?.sms_consent ?? false)
  const [errors, setErrors] = useState<{ name?: string; phone?: string; sms?: string }>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    const errs: { name?: string; phone?: string; sms?: string } = {}
    if (!contactName.trim()) errs.name = 'Contact name is required'
    if (!contactPhone.trim()) errs.phone = 'Phone number is required'
    if (!smsConsent) errs.sms = 'You must agree to receive SMS notifications to continue'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    const supabase = createClient()
    await supabase.from('shops').update({
      emergency_contact_name: contactName.trim(),
      emergency_contact: contactPhone.trim(),
      sms_consent: true,
      onboarding_step: 'calendar',
    }).eq('owner_id', userId)
    onShopUpdate({ emergency_contact_name: contactName.trim(), emergency_contact: contactPhone.trim(), sms_consent: true })
    setLoading(false)
    onNext()
  }

  return (
    <div style={card}>
      <button onClick={onBack} style={backBtn}>← Back</button>

      <div style={{ marginBottom: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2L2 19h18L11 2z" stroke="var(--danger)" strokeWidth="1.5" strokeLinejoin="round"/><path d="M11 9v4M11 15.5v.5" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </div>
      </div>
      <h2 style={titleStyle}>Emergency contact</h2>
      <p style={subtitleStyle}>
        Who gets alerted when a caller reports an emergency: overheating, brake failure, or stranded.
      </p>

      <div style={fieldStyle}>
        <label style={labelStyle}>Contact Name *</label>
        <input
          value={contactName}
          onChange={e => { setContactName(e.target.value); setErrors(p => ({ ...p, name: undefined })) }}
          className="step-input"
          style={errors.name ? { borderColor: 'var(--danger)' } : {}}
          placeholder="e.g. Mike Johnson"
          autoCapitalize="words"
        />
        {errors.name && <p style={errorStyle}>{errors.name}</p>}
      </div>

      <div style={{ ...fieldStyle, marginBottom: 28 }}>
        <label style={labelStyle}>Phone Number *</label>
        <div style={{ display: 'flex', border: `1px solid ${errors.phone ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 8, overflow: 'hidden', background: 'var(--card)' }}>
          <div style={{ padding: '10px 12px', borderRight: '1px solid var(--border)', fontSize: 14, color: 'var(--text-mid)', background: 'var(--card-raised)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            🇺🇸 +1
          </div>
          <input
            value={contactPhone}
            onChange={e => { setContactPhone(e.target.value); setErrors(p => ({ ...p, phone: undefined })) }}
            style={{ border: 'none', background: 'transparent', flex: 1, padding: '10px 14px', color: 'var(--text)', outline: 'none', fontSize: 14, fontFamily: 'inherit' }}
            placeholder="(407) 555-1234"
            type="tel"
          />
        </div>
        {errors.phone && <p style={errorStyle}>{errors.phone}</p>}
      </div>

      <div style={{ marginBottom: 28 }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
          <div
            onClick={() => { setSmsConsent(v => !v); setErrors(p => ({ ...p, sms: undefined })) }}
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              border: `2px solid ${errors.sms ? 'var(--danger)' : smsConsent ? 'var(--accent)' : 'var(--border)'}`,
              background: smsConsent ? 'var(--accent)' : 'var(--card)',
              flexShrink: 0,
              marginTop: 2,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            {smsConsent && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6 }}>
            I agree to receive SMS booking alerts and emergency notifications from ShopDesk.{' '}
            Msg &amp; data rates may apply. Reply STOP to opt out at any time.{' '}
            <a href="https://shopdesk.site/sms-consent" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
              View our SMS Consent Policy
            </a>
          </span>
        </label>
        {errors.sms && <p style={{ ...errorStyle, marginTop: 8 }}>{errors.sms}</p>}
      </div>

      <button onClick={handleSubmit} disabled={loading} className="step-btn-primary" style={{ width: 'auto', minWidth: 200, padding: '13px 32px', display: 'block', marginLeft: 'auto', marginTop: 8 }}>
        {loading ? 'Saving...' : 'Continue →'}
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
  marginBottom: 32,
}
const fieldStyle: React.CSSProperties = { marginBottom: 20 }
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--muted)',
  marginBottom: 8,
}
const errorStyle: React.CSSProperties = { fontSize: 12, color: 'var(--danger)', marginTop: 4 }
