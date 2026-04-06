'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

export function StepEmergency({ shop, userId, onNext, onBack, onShopUpdate }: StepProps) {
  const [contactName, setContactName] = useState(shop?.emergency_contact_name ?? '')
  const [contactPhone, setContactPhone] = useState(shop?.emergency_contact ?? '')
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    const errs: { name?: string; phone?: string } = {}
    if (!contactName.trim()) errs.name = 'Contact name is required'
    if (!contactPhone.trim()) errs.phone = 'Phone number is required'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    const supabase = createClient()
    await supabase.from('shops').update({
      emergency_contact_name: contactName.trim(),
      emergency_contact: contactPhone.trim(),
      onboarding_step: 'calendar',
    }).eq('owner_id', userId)
    onShopUpdate({ emergency_contact_name: contactName.trim(), emergency_contact: contactPhone.trim() })
    setLoading(false)
    onNext()
  }

  return (
    <div style={card}>
      <button onClick={onBack} style={backBtn}>← Back</button>

      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 32 }}>🚨</span>
      </div>
      <h2 style={titleStyle}>Emergency contact</h2>
      <p style={subtitleStyle}>
        Who should be alerted if a caller reports an emergency — overheating, brakes failed, stranded, etc.?
      </p>

      <div style={fieldStyle}>
        <label style={labelStyle}>Contact Name *</label>
        <input
          value={contactName}
          onChange={e => { setContactName(e.target.value); setErrors(p => ({ ...p, name: undefined })) }}
          className="step-input"
          style={errors.name ? { borderColor: 'var(--danger)' } : {}}
          placeholder="e.g. Mike Johnson"
        />
        {errors.name && <p style={errorStyle}>{errors.name}</p>}
      </div>

      <div style={{ ...fieldStyle, marginBottom: 28 }}>
        <label style={labelStyle}>Phone Number *</label>
        <input
          value={contactPhone}
          onChange={e => { setContactPhone(e.target.value); setErrors(p => ({ ...p, phone: undefined })) }}
          className="step-input"
          style={errors.phone ? { borderColor: 'var(--danger)' } : {}}
          placeholder="+1 (407) 555-1234"
          type="tel"
        />
        {errors.phone && <p style={errorStyle}>{errors.phone}</p>}
      </div>

      <button onClick={handleSubmit} disabled={loading} className="step-btn-primary">
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
