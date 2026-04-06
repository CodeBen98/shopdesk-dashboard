'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

const TEAL = '#0F7695'

export function StepEmergency({ shop, userId, onNext, onShopUpdate }: StepProps) {
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
      <div style={{ marginBottom: '16px' }}>
        <span style={{ fontSize: '32px' }}>🚨</span>
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
          style={{ ...inputStyle, ...(errors.name ? { borderColor: '#ef4444' } : {}) }}
          placeholder="e.g. Mike Johnson"
        />
        {errors.name && <p style={errorStyle}>{errors.name}</p>}
      </div>

      <div style={{ ...fieldStyle, marginBottom: '28px' }}>
        <label style={labelStyle}>Phone Number *</label>
        <input
          value={contactPhone}
          onChange={e => { setContactPhone(e.target.value); setErrors(p => ({ ...p, phone: undefined })) }}
          style={{ ...inputStyle, ...(errors.phone ? { borderColor: '#ef4444' } : {}) }}
          placeholder="+1 (407) 555-1234"
          type="tel"
        />
        {errors.phone && <p style={errorStyle}>{errors.phone}</p>}
      </div>

      <button onClick={handleSubmit} disabled={loading} style={primaryBtn}>
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
const fieldStyle: React.CSSProperties = { marginBottom: '16px' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: '#111827' }
const errorStyle: React.CSSProperties = { fontSize: '12px', color: '#ef4444', marginTop: '4px' }
const primaryBtn: React.CSSProperties = { background: TEAL, color: '#fff', padding: '12px 28px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '15px', width: '100%' }
