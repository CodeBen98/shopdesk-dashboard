'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

const VEHICLE_OPTIONS = [
  'All Makes and Models',
  'Domestic (Ford/GM/Chrysler)',
  'European (BMW/Mercedes/Audi/VW)',
  'Japanese (Toyota/Honda/Nissan)',
  'Korean (Hyundai/Kia)',
  'Trucks and SUVs',
  'Diesel',
]

export function StepShopInfo({ shop, userId, onNext, onSkipTo: _onSkipTo, onShopUpdate }: StepProps) {
  const [name, setName] = useState(shop?.name ?? '')
  const [ownerName, setOwnerName] = useState('')
  const [address, setAddress] = useState(shop?.address ?? '')
  const [phone, setPhone] = useState(shop?.phone ?? '')
  const [email, setEmail] = useState(shop?.email ?? '')
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([])
  const [nameError, setNameError] = useState('')
  const [ownerNameError, setOwnerNameError] = useState('')
  const [addressError, setAddressError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [vehicleTypesError, setVehicleTypesError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [loading, setLoading] = useState(false)

  function toggleVehicleType(type: string) {
    setVehicleTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
    setVehicleTypesError('')
  }

  async function handleSubmit() {
    let valid = true
    if (!name.trim()) { setNameError('Shop name is required'); valid = false }
    if (!ownerName.trim()) { setOwnerNameError('Owner name is required'); valid = false }
    if (!address.trim()) { setAddressError('Address is required'); valid = false }
    const digits = phone.replace(/\D/g, '')
    if (!phone.trim()) { setPhoneError('Phone number is required'); valid = false }
    else if (digits.length < 10) { setPhoneError('Please enter a valid phone number'); valid = false }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Please enter a valid email address'); valid = false
    }
    if (vehicleTypes.length === 0) { setVehicleTypesError('Please select at least one vehicle type'); valid = false }
    if (!valid) return

    setLoading(true)
    setSaveError('')
    const supabase = createClient()

    const patch: Record<string, unknown> = {
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
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

    const shopUpdate: Partial<typeof shop> = {
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
    }
    if (!shop?.emergency_contact_name) {
      shopUpdate.emergency_contact_name = ownerName.trim()
    }
    onShopUpdate(shopUpdate)
    setLoading(false)
    onNext()
  }

  return (
    <div>
      {/* Welcome header above card */}
      <div style={{ textAlign: 'center', marginBottom: 28, animation: 'card-enter 0.35s ease' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'var(--accent-dim)',
          border: '1px solid rgba(15,118,149,0.3)',
          borderRadius: 9999,
          padding: '3px 10px',
          marginBottom: 16,
        }}>
          <span style={{ color: 'var(--accent)', fontSize: 10, fontWeight: 600, letterSpacing: '0.04em' }}>Welcome to ShopDesk</span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-space)',
          fontSize: 32,
          fontWeight: 800,
          color: 'var(--text)',
          marginBottom: 10,
          lineHeight: 1.2,
        }}>
          Set up your AI receptionist
        </h1>
        <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 440, margin: '0 auto' }}>
          Takes less than 5 minutes. Your AI will be answering calls today.
        </p>
      </div>

      <div style={card}>
        <h2 style={title}>Tell us about your shop</h2>
        <p style={subtitle}>This helps your AI receptionist introduce your business correctly.</p>

        {/* Shop Name + Phone side by side */}
        <div className="form-grid-2" style={{ marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>Shop Name *</label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setNameError('') }}
              className="step-input"
              style={nameError ? { borderColor: 'var(--danger)', boxSizing: 'border-box' } : { boxSizing: 'border-box' }}
              placeholder="e.g. Mike's Auto Repair"
            />
            {nameError && <p style={errorStyle}>{nameError}</p>}
          </div>
          <div>
            <label style={labelStyle}>Phone Number *</label>
            <div style={{ display: 'flex', border: `1px solid ${phoneError ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 8, overflow: 'hidden', background: 'var(--card)' }}>
              <div style={{ padding: '10px 12px', borderRight: '1px solid var(--border)', fontSize: 14, color: 'var(--text-mid)', background: 'var(--card-raised)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                🇺🇸 +1
              </div>
              <input
                value={phone}
                onChange={e => { setPhone(e.target.value); setPhoneError('') }}
                style={{ border: 'none', background: 'transparent', flex: 1, padding: '10px 14px', color: 'var(--text)', outline: 'none', fontSize: 14, fontFamily: 'inherit' }}
                placeholder="(407) 555-1234"
              />
            </div>
            {phoneError && <p style={errorStyle}>{phoneError}</p>}
          </div>
        </div>

        <div style={field}>
          <label style={labelStyle}>Address *</label>
          <input
            value={address}
            onChange={e => { setAddress(e.target.value); setAddressError('') }}
            className="step-input"
            style={addressError ? { borderColor: 'var(--danger)', boxSizing: 'border-box' } : { boxSizing: 'border-box' }}
            placeholder="Street address, City, State ZIP"
            autoComplete="street-address"
            data-1p-ignore
          />
          {addressError && <p style={errorStyle}>{addressError}</p>}
        </div>

        {/* Owner Name + Email side by side */}
        <div className="form-grid-2" style={{ marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>Owner / Manager Name *</label>
            <input
              value={ownerName}
              onChange={e => { setOwnerName(e.target.value); setOwnerNameError('') }}
              className="step-input"
              style={ownerNameError ? { borderColor: 'var(--danger)', boxSizing: 'border-box' } : { boxSizing: 'border-box' }}
              placeholder="e.g. Bill, Mike, Sarah"
            />
            {ownerNameError && <p style={errorStyle}>{ownerNameError}</p>}
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailError('') }}
              className="step-input"
              style={emailError ? { borderColor: 'var(--danger)', boxSizing: 'border-box' } : { boxSizing: 'border-box' }}
              placeholder="shop@example.com"
              type="email"
            />
            {emailError && <p style={errorStyle}>{emailError}</p>}
          </div>
        </div>

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
                  {selected && (
                    <span style={{
                      position: 'absolute',
                      top: -5,
                      right: -5,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: 9,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                    }}>✓</span>
                  )}
                  {type}
                </button>
              )
            })}
          </div>
          {vehicleTypesError && <p style={errorStyle}>{vehicleTypesError}</p>}
        </div>

        {saveError && <p style={{ ...errorStyle, marginBottom: 12 }}>{saveError}</p>}

        <button onClick={handleSubmit} disabled={loading} className="step-btn-primary" style={{ width: 'auto', minWidth: 200, padding: '13px 32px', display: 'block', marginLeft: 'auto' }}>
          {loading ? 'Saving...' : 'Continue →'}
        </button>
      </div>
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
  fontSize: 24,
  fontWeight: 700,
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
const errorStyle: React.CSSProperties = { fontSize: 12, color: 'var(--danger)', marginTop: 4 }
