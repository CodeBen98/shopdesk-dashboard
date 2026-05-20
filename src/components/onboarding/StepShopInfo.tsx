'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

export function StepShopInfo({ shop, userId, onNext, onShopUpdate }: StepProps) {
  const [name, setName] = useState(shop?.name ?? '')
  const [phone, setPhone] = useState(shop?.phone ?? '')
  const [address, setAddress] = useState(shop?.address ?? '')
  const [websiteUrl, setWebsiteUrl] = useState(shop?.website_url ?? '')
  const [businessDescription, setBusinessDescription] = useState(
    (shop?.enrichment as { businessDescription?: string } | null)?.businessDescription ?? ''
  )
  const [ownerName, setOwnerName] = useState(shop?.emergency_contact_name ?? '')
  const [ownerPhone, setOwnerPhone] = useState(shop?.owner_phone ?? '')
  const [ownerSmsConsent, setOwnerSmsConsent] = useState(shop?.owner_phone_sms_consent ?? false)
  const [email, setEmail] = useState(shop?.email ?? '')

  const [errors, setErrors] = useState<{
    name?: string
    phone?: string
    address?: string
    ownerName?: string
    ownerPhone?: string
    ownerSmsConsent?: string
    email?: string
  }>({})
  const [saveError, setSaveError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    const errs: typeof errors = {}
    if (!name.trim()) errs.name = 'Business name is required'
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

    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    setSaveError('')
    const supabase = createClient()
    const smsOptIn = !!normalizedOwnerPhone && ownerSmsConsent

    const enrichmentPatch = businessDescription.trim()
      ? { ...(shop?.enrichment ?? {}), businessDescription: businessDescription.trim() }
      : shop?.enrichment ?? null

    const now = new Date().toISOString()
    const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const patch: Record<string, unknown> = {
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      owner_phone: normalizedOwnerPhone || null,
      owner_phone_sms_consent: smsOptIn,
      emergency_contact_name: ownerName.trim(),
      website_url: websiteUrl.trim() || null,
      industry: 'other',
      onboarding_step: 'auto_fill_choice',
      ...(enrichmentPatch ? { enrichment: enrichmentPatch } : {}),
      ...(shop?.trial_started_at ? {} : {
        trial_started_at: now,
        trial_ends_at: trialEnd,
        plan_tier: 'pro',
      }),
    }

    const { error: saveErr } = await supabase.from('shops').update(patch).eq('owner_id', userId)
    if (saveErr) {
      setSaveError('Failed to save. Please try again.')
      setLoading(false)
      return
    }

    onShopUpdate({
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      owner_phone: normalizedOwnerPhone || null,
      owner_phone_sms_consent: smsOptIn,
      emergency_contact_name: ownerName.trim(),
      website_url: websiteUrl.trim() || null,
      industry: 'other',
      ...(enrichmentPatch ? { enrichment: enrichmentPatch as import('@/types').Enrichment } : {}),
    })
    setLoading(false)
    onNext()
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
          color: 'var(--accent)', background: 'var(--accent-dim)',
          border: '1px solid rgba(15,118,149,0.2)', borderRadius: 9999, padding: '4px 12px',
        }}>
          14-day free trial · no credit card
        </span>
      </div>
      <h2 style={title}>Tell us about your business</h2>
      <p style={subtitle}>Your AI uses this to introduce your business and answer callers accurately.</p>

      {/* Business Name */}
      <div style={field}>
        <label style={labelStyle}>Business Name *</label>
        <input
          value={name}
          onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: undefined })) }}
          className="step-input"
          style={errors.name ? { borderColor: 'var(--danger)', boxSizing: 'border-box' } : { boxSizing: 'border-box' }}
          placeholder="e.g. Rivera's HVAC, ClearFlow Plumbing, Paws & Groom"
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
        <p style={helperStyle}>This is your main number — the one customers call.</p>
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

      {/* Website */}
      <div style={field}>
        <label style={labelStyle}>Website <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
        <input
          value={websiteUrl}
          onChange={e => setWebsiteUrl(e.target.value)}
          className="step-input"
          style={{ boxSizing: 'border-box' }}
          placeholder="https://yourbusiness.com"
          type="url"
        />
        <p style={helperStyle}>We&apos;ll use this to pre-fill your business info in the next step.</p>
      </div>

      {/* Business Description */}
      <div style={field}>
        <label style={labelStyle}>What does your business do? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
        <textarea
          value={businessDescription}
          onChange={e => setBusinessDescription(e.target.value)}
          className="step-input"
          style={{ resize: 'vertical', lineHeight: 1.5 } as React.CSSProperties}
          rows={3}
          placeholder="e.g. HVAC contractor serving Orlando — repairs, maintenance, and new installations for residential and commercial."
        />
        <p style={helperStyle}>Your AI will use this to understand your business and answer callers accurately.</p>
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
        <label style={labelStyle}>Owner Mobile <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
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
        <p style={helperStyle}>Add this if you want booking alerts and urgent call notifications by text. Different from your ShopDesk number.</p>
        {errors.ownerPhone && <p style={errorStyle}>{errors.ownerPhone}</p>}
      </div>

      {/* SMS Opt-in */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
          <div
            onClick={() => { setOwnerSmsConsent(v => !v); setErrors(p => ({ ...p, ownerSmsConsent: undefined })) }}
            style={{
              width: 18, height: 18, borderRadius: 4,
              border: `2px solid ${errors.ownerSmsConsent ? 'var(--danger)' : ownerSmsConsent ? 'var(--accent)' : 'var(--border)'}`,
              background: ownerSmsConsent ? 'var(--accent)' : 'var(--card)',
              flexShrink: 0, marginTop: 2, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
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
            I agree to receive SMS booking alerts and urgent notifications at this number. Consent is optional. Msg &amp; data rates may apply. Reply STOP to opt out. Reply HELP for help.{' '}
            <a href="https://shopdesk.site/sms-consent" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>SMS Policy</a>
            {' '}·{' '}
            <a href="https://shopdesk.site/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Terms</a>
            {' '}·{' '}
            <a href="https://shopdesk.site/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Privacy</a>
          </span>
        </label>
        {errors.ownerSmsConsent && <p style={{ ...errorStyle, marginTop: 8 }}>{errors.ownerSmsConsent}</p>}
      </div>

      {/* Email */}
      <div style={field}>
        <label style={labelStyle}>Email <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
        <input
          value={email}
          onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })) }}
          className="step-input"
          style={errors.email ? { borderColor: 'var(--danger)', boxSizing: 'border-box' } : { boxSizing: 'border-box' }}
          placeholder="owner@yourbusiness.com"
          type="email"
        />
        <p style={helperStyle}>For booking confirmations and account updates.</p>
        {errors.email && <p style={errorStyle}>{errors.email}</p>}
      </div>

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
