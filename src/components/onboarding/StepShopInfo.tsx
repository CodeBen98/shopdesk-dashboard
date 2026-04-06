'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

const TEAL = '#0F7695'

export function StepShopInfo({ shop, userId, onNext, onShopUpdate }: StepProps) {
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
      onboarding_step: 'hours',
    }).eq('owner_id', userId)
    onShopUpdate({ name: name.trim(), address: address.trim(), phone: phone.trim(), email: email.trim() || null })
    setLoading(false)
    onNext()
  }

  return (
    <div style={card}>
      <h2 style={title}>Tell us about your shop</h2>
      <p style={subtitle}>This helps your AI receptionist introduce your business correctly.</p>

      <div style={field}>
        <label style={label}>Shop Name *</label>
        <input
          value={name}
          onChange={e => { setName(e.target.value); setNameError('') }}
          style={{ ...input, ...(nameError ? { borderColor: '#ef4444' } : {}) }}
          placeholder="e.g. Mike's Auto Repair"
        />
        {nameError && <p style={error}>{nameError}</p>}
      </div>

      <div style={field}>
        <label style={label}>Address</label>
        <input
          value={address}
          onChange={e => setAddress(e.target.value)}
          style={input}
          placeholder="123 Main St, Orlando, FL 32801"
        />
      </div>

      <div style={field}>
        <label style={label}>Phone Number</label>
        <input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          style={input}
          placeholder="+1 (407) 555-1234"
        />
      </div>

      <div style={{ ...field, marginBottom: '28px' }}>
        <label style={label}>Email</label>
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={input}
          placeholder="shop@example.com"
          type="email"
        />
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
const title: React.CSSProperties = { fontSize: '22px', fontWeight: 700, color: '#111827', marginBottom: '8px' }
const subtitle: React.CSSProperties = { fontSize: '14px', color: '#6b7280', marginBottom: '24px' }
const field: React.CSSProperties = { marginBottom: '16px' }
const label: React.CSSProperties = { display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }
const input: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: '#111827' }
const error: React.CSSProperties = { fontSize: '12px', color: '#ef4444', marginTop: '4px' }
const primaryBtn: React.CSSProperties = { background: TEAL, color: '#fff', padding: '12px 28px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '15px', width: '100%' }
