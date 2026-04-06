'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

export function StepShopInfo({ shop, userId, onNext, onSkipTo: _onSkipTo, onShopUpdate }: StepProps) {
  const [name, setName] = useState(shop?.name ?? '')
  const [address, setAddress] = useState(shop?.address ?? '')
  const [phone, setPhone] = useState(shop?.phone ?? '')
  const [email, setEmail] = useState(shop?.email ?? '')
  const [nameError, setNameError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!name.trim()) {
      setNameError('Shop name is required')
      return
    }
    setLoading(true)
    const supabase = createClient()
    await supabase.from('shops').update({
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      onboarding_step: 'auto_fill_choice',
    }).eq('owner_id', userId)
    onShopUpdate({ name: name.trim(), address: address.trim(), phone: phone.trim(), email: email.trim() || null })
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
          padding: '4px 14px',
          marginBottom: 16,
        }}>
          <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>Welcome to ShopDesk</span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-space)',
          fontSize: 28,
          fontWeight: 800,
          color: 'var(--text)',
          marginBottom: 10,
          lineHeight: 1.2,
        }}>
          Let&apos;s set up your AI receptionist
        </h1>
        <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.6 }}>
          Takes less than 5 minutes. We&apos;ll have your AI answering calls today.
        </p>
      </div>

      <div style={card}>
        <h2 style={title}>Tell us about your shop</h2>
        <p style={subtitle}>This helps your AI receptionist introduce your business correctly.</p>

        <div style={field}>
          <label style={label}>Shop Name *</label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setNameError('') }}
            className="step-input"
            style={nameError ? { borderColor: 'var(--danger)' } : {}}
            placeholder="e.g. Mike's Auto Repair"
          />
          {nameError && <p style={errorStyle}>{nameError}</p>}
        </div>

        <div style={field}>
          <label style={label}>Address</label>
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            className="step-input"
            placeholder="123 Main St, Orlando, FL 32801"
          />
        </div>

        <div style={field}>
          <label style={label}>Phone Number</label>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="step-input"
            placeholder="+1 (407) 555-1234"
          />
        </div>

        <div style={{ ...field, marginBottom: 28 }}>
          <label style={label}>Email</label>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="step-input"
            placeholder="shop@example.com"
            type="email"
          />
        </div>

        <button onClick={handleSubmit} disabled={loading} className="step-btn-primary">
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
const label: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--muted)',
  marginBottom: 8,
}
const errorStyle: React.CSSProperties = { fontSize: 12, color: 'var(--danger)', marginTop: 4 }
