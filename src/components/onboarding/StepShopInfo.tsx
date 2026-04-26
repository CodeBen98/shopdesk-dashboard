'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'
import { INDUSTRY_TEMPLATES, normalizeIndustry, type IndustryId } from '@/lib/industries/templates'

const VEHICLE_OPTIONS = [
  'All Makes and Models',
  'Domestic (Ford/GM/Chrysler)',
  'European (BMW/Mercedes/Audi/VW)',
  'Japanese (Toyota/Honda/Nissan)',
  'Korean (Hyundai/Kia)',
  'Trucks and SUVs',
  'Diesel',
]

export function StepShopInfo({ shop, userId, onNext, onBack, onShopUpdate }: StepProps) {
  const [name, setName] = useState(shop?.name ?? '')
  const [phone, setPhone] = useState(shop?.phone ?? '')
  const [address, setAddress] = useState(shop?.address ?? '')
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState(shop?.owner_phone ?? '')
  const [ownerSmsConsent, setOwnerSmsConsent] = useState(shop?.owner_phone_sms_consent ?? false)
  const [email, setEmail] = useState(shop?.email ?? '')
  const [industry, setIndustry] = useState<IndustryId>(normalizeIndustry(shop?.industry))
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([])

  const [errors, setErrors] = useState<{
    name?: string
    phone?: string
    address?: string
    ownerName?: string
    ownerPhone?: string
    ownerSmsConsent?: string
    email?: string
    vehicleTypes?: string
    industry?: string
  }>({})
  const [saveError, setSaveError] = useState('')
  const [loading, setLoading] = useState(false)

  function toggleVehicleType(type: string) {
    setVehicleTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
    setErrors(p => ({ ...p, vehicleTypes: undefined }))
  }

  async function handleSubmit() {
    const errs: typeof errors = {}
    if (!name.trim()) errs.name = 'Shop name is required'
    const phoneDigits = phone.replace(/\D/g, '')
    if (!phone.trim()) errs.phone = 'Business phone is required'
    else if (phoneDigits.length < 10) errs.phone = 'Please enter a valid phone number'
    if (!address.trim()) errs.address = 'Address is required'
    if (!ownerName.trim()) errs.ownerName = 'Owner name is required'
    const normalizedOwnerPhone = ownerPhone.trim()
    const ownerPhoneDigits = normalizedOwnerPhone.replace(/\D/g, '')
    if (normalizedOwnerPhone && ownerPhoneDigits.length < 10) errs.ownerPhone = 'Please enter a valid mobile number'
    if (ownerSmsConsent && !normalizedOwnerPhone) errs.ownerSmsConsent = 'Enter a mobile number if you want SMS alerts'
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address'
    }
    if (industry === 'auto_repair' && vehicleTypes.length === 0) errs.vehicleTypes = 'Please select at least one vehicle type'

    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    setSaveError('')
    const supabase = createClient()
    const smsOptIn = !!normalizedOwnerPhone && ownerSmsConsent

    const patch: Record<string, unknown> = {
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      owner_phone: normalizedOwnerPhone || null,
      owner_phone_sms_consent: smsOptIn,
      industry,
      industry_config: shop?.industry_config ?? {},
      onboarding_step: 'auto_fill_choice',
    }
    if (!shop?.emergency_contact_name) {
      patch.emergency_contact_name = ownerName.trim()
    }

    const { error: saveErr } = await supabase.from('shops').update(patch).eq('owner_id', userId)
    if (saveErr) {
      setSaveError('Failed to save. Please try again.')
      setLoading(false)
      return
    }

    localStorage.setItem('shopdesk_onboarding_extras', JSON.stringify({
      vehicleTypes,
      ownerName: ownerName.trim(),
    }))

    const shopUpdate: Record<string, unknown> = {
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      owner_phone: normalizedOwnerPhone || null,
      owner_phone_sms_consent: smsOptIn,
      industry,
      industry_config: shop?.industry_config ?? {},
    }
    if (!shop?.emergency_contact_name) {
      shopUpdate.emergency_contact_name = ownerName.trim()
    }
    onShopUpdate(shopUpdate)
    setLoading(false)
    onNext()
  }

  return (
    <div style={card}>
      <button onClick={onBack} style={backBtn}>← Back</button>
      <h2 style={title}>Tell us about your business</h2>
      <p style={subtitle}>Your AI uses this to introduce your business and choose the right call-handling playbook.</p>

      {/* Shop Name */}
      <div style={field}>
        <label style={labelStyle}>Business Name *</label>
        <input
          value={name}
          onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: undefined })) }}
          className="step-input"
          style={errors.name ? { borderColor: 'var(--danger)', boxSizing: 'border-box' } : { boxSizing: 'border-box' }}
          placeholder="e.g. Mike's Auto Repair, ClearFlow Plumbing"
        />
        {errors.name && <p style={errorStyle}>{errors.name}</p>}
      </div>

      {/* Business Phone */}
      <div style={field}>
        <label style={labelStyle}>Business Phone *</label>
        <div style={{ display: 'flex', border: `1px solid ${errors.phone ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 8, overflow: 'hidden', background: 'var(--card)' }}>
          <div style={{ padding: '10px 12px', borderRight: '1px solid var(--border)', fontSize: 14, color: 'var(--text-mid)', background: 'var(--card-raised)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            🇺🇸 +1
          </div>
          <input
            value={phone}
            onChange={e => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: undefined })) }}
            style={{ border: 'none', background: 'transparent', flex: 1, padding: '10px 14px', color: 'var(--text)', outline: 'none', fontSize: 14, fontFamily: 'inherit' }}
            placeholder="(407) 555-1234"
            type="tel"
          />
        </div>
        <p style={helperStyle}>This is your business&apos;s main number, the one customers call.</p>
        {errors.phone && <p style={errorStyle}>{errors.phone}</p>}
      </div>

      {/* Address */}
      <div style={field}>
        <label style={labelStyle}>Address *</label>
        <input
          value={address}
          onChange={e => { setAddress(e.target.value); setErrors(p => ({ ...p, address: undefined })) }}
          className="step-input"
          style={errors.address ? { borderColor: 'var(--danger)', boxSizing: 'border-box' } : { boxSizing: 'border-box' }}
          placeholder="Street address, City, State ZIP"
          autoComplete="street-address"
          data-1p-ignore
        />
        {errors.address && <p style={errorStyle}>{errors.address}</p>}
      </div>
      {/* Industry */}
      <div style={field}>
        <label style={labelStyle}>Industry *</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
          {Object.values(INDUSTRY_TEMPLATES).map(template => {
            const selected = industry === template.id
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => { setIndustry(template.id); setErrors(p => ({ ...p, industry: undefined, vehicleTypes: undefined })) }}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                  background: selected ? 'var(--accent-dim)' : 'var(--card)',
                  color: selected ? 'var(--accent)' : 'var(--text-mid)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{template.label}</div>
                <div style={{ fontSize: 11, lineHeight: 1.35, color: selected ? 'var(--accent)' : 'var(--muted)' }}>{template.shortDescription}</div>
              </button>
            )
          })}
        </div>
        <p style={helperStyle}>This controls the AI&apos;s intake questions, urgency rules, and service suggestions. Auto repair remains the default template.</p>
        {errors.industry && <p style={errorStyle}>{errors.industry}</p>}
      </div>


      {/* Owner / Manager Name */}
      <div style={field}>
        <label style={labelStyle}>Owner / Manager Name *</label>
        <input
          value={ownerName}
          onChange={e => { setOwnerName(e.target.value); setErrors(p => ({ ...p, ownerName: undefined })) }}
          className="step-input"
          style={errors.ownerName ? { borderColor: 'var(--danger)', boxSizing: 'border-box' } : { boxSizing: 'border-box' }}
          placeholder="e.g. Bill, Mike, Sarah"
          autoCapitalize="words"
        />
        <p style={helperStyle}>Your AI will mention this when appropriate.</p>
        {errors.ownerName && <p style={errorStyle}>{errors.ownerName}</p>}
      </div>

      {/* Owner Mobile */}
      <div style={field}>
        <label style={labelStyle}>Owner Mobile (optional)</label>
        <div style={{ display: 'flex', border: `1px solid ${errors.ownerPhone ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 8, overflow: 'hidden', background: 'var(--card)' }}>
          <div style={{ padding: '10px 12px', borderRight: '1px solid var(--border)', fontSize: 14, color: 'var(--text-mid)', background: 'var(--card-raised)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            🇺🇸 +1
          </div>
          <input
            value={ownerPhone}
            onChange={e => { setOwnerPhone(e.target.value); setErrors(p => ({ ...p, ownerPhone: undefined })) }}
            style={{ border: 'none', background: 'transparent', flex: 1, padding: '10px 14px', color: 'var(--text)', outline: 'none', fontSize: 14, fontFamily: 'inherit' }}
            placeholder="(407) 555-1234"
            type="tel"
          />
        </div>
        <p style={helperStyle}>Add this if you want booking alerts and urgent shop notifications by text. Different from your shop number.</p>
        {errors.ownerPhone && <p style={errorStyle}>{errors.ownerPhone}</p>}
      </div>

      {/* SMS Opt-in */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
          <div
            onClick={() => { setOwnerSmsConsent(v => !v); setErrors(p => ({ ...p, ownerSmsConsent: undefined })) }}
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              border: `2px solid ${errors.ownerSmsConsent ? 'var(--danger)' : ownerSmsConsent ? 'var(--accent)' : 'var(--border)'}`,
              background: ownerSmsConsent ? 'var(--accent)' : 'var(--card)',
              flexShrink: 0,
              marginTop: 2,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            {ownerSmsConsent && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6 }}>
            I agree to receive SMS booking alerts and urgent shop notifications at this number. Consent is optional. Msg &amp; data rates may apply. Reply STOP to opt out. Reply HELP for help.{' '}
            <a href="https://shopdesk.site/sms-consent" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
              SMS Policy
            </a>
            {' '}·{' '}
            <a href="https://shopdesk.site/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
              Terms
            </a>
            {' '}·{' '}
            <a href="https://shopdesk.site/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
              Privacy
            </a>
          </span>
        </label>
        {errors.ownerSmsConsent && <p style={{ ...errorStyle, marginTop: 8 }}>{errors.ownerSmsConsent}</p>}
      </div>

      {/* Email */}
      <div style={field}>
        <label style={labelStyle}>Email</label>
        <input
          value={email}
          onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })) }}
          className="step-input"
          style={errors.email ? { borderColor: 'var(--danger)', boxSizing: 'border-box' } : { boxSizing: 'border-box' }}
          placeholder="shop@example.com"
          type="email"
        />
        <p style={helperStyle}>For booking confirmations and account updates.</p>
        {errors.email && <p style={errorStyle}>{errors.email}</p>}
      </div>

      {industry === 'auto_repair' && (
        <div style={{ ...field, marginBottom: 28 }}>
          <label style={labelStyle}>What vehicles do you work on? *</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {VEHICLE_OPTIONS.map(type => {
              const selected = vehicleTypes.includes(type)
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleVehicleType(type)}
                  style={{
                    position: 'relative',
                    padding: '6px 14px',
                    borderRadius: 9999,
                    border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                    background: selected ? 'var(--accent-dim)' : 'var(--card)',
                    color: selected ? 'var(--accent)' : 'var(--text-mid)',
                    fontSize: 13,
                    cursor: 'pointer',
                    fontWeight: selected ? 600 : 400,
                    transition: 'border-color 0.15s, background 0.15s',
                    fontFamily: 'inherit',
                  }}
                >
                  {type}
                </button>
              )
            })}
          </div>
          {errors.vehicleTypes && <p style={errorStyle}>{errors.vehicleTypes}</p>}
        </div>
      )}

      {saveError && <p style={{ ...errorStyle, marginBottom: 12 }}>{saveError}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="step-btn-primary"
        style={{ width: 'auto', minWidth: 200, padding: '13px 32px', display: 'block', marginLeft: 'auto', marginTop: 8 }}
      >
        {loading ? 'Saving...' : 'Continue →'}
      </button>
    </div>
  )
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
const title: React.CSSProperties = {
  fontFamily: 'var(--font-space)',
  fontSize: 'clamp(1.4rem, 3vw, 1.8rem)',
  fontWeight: 800,
  letterSpacing: '-0.3px',
  color: 'var(--text)',
  marginBottom: 8,
}
const subtitle: React.CSSProperties = {
  fontSize: 15,
  color: 'var(--muted)',
  lineHeight: 1.6,
  marginBottom: 32,
}
const field: React.CSSProperties = { marginBottom: 20 }
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--muted)',
  marginBottom: 8,
}
const helperStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--muted)',
  marginTop: 6,
  lineHeight: 1.5,
}
const errorStyle: React.CSSProperties = { fontSize: 12, color: 'var(--danger)', marginTop: 4 }
