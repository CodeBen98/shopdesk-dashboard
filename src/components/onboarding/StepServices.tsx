'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Service } from '@/types'
import { StepProps } from './OnboardingWizard'

const TEAL = '#0F7695'

const SUGGESTIONS = [
  'Oil Change', 'Brake Service', 'Tire Rotation', 'Engine Diagnostics',
  'AC Repair', 'Transmission Service', 'Alignment', 'Battery Replacement',
]

function emptyService(): Service {
  return { name: '', price: null, description: null }
}

export function StepServices({ shop, userId, onNext, onShopUpdate }: StepProps) {
  const [services, setServices] = useState<Service[]>(
    shop?.services && shop.services.length > 0 ? shop.services : []
  )
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<number, string>>({})

  function addService(name = '') {
    setServices(prev => [...prev, { ...emptyService(), name }])
  }

  function removeService(index: number) {
    setServices(prev => prev.filter((_, i) => i !== index))
    setErrors(prev => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }

  function updateService(index: number, patch: Partial<Service>) {
    setServices(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s))
    if (patch.name !== undefined) {
      setErrors(prev => { const next = { ...prev }; delete next[index]; return next })
    }
  }

  function addSuggestion(name: string) {
    if (!services.find(s => s.name === name)) {
      addService(name)
    }
  }

  async function handleSubmit() {
    const newErrors: Record<number, string> = {}
    services.forEach((s, i) => {
      if (!s.name.trim()) newErrors[i] = 'Service name is required'
    })
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setLoading(true)
    const cleaned = services.map(s => ({
      name: s.name.trim(),
      price: s.price?.trim() || null,
      description: s.description?.trim() || null,
    }))
    const supabase = createClient()
    await supabase.from('shops').update({
      services: cleaned,
      onboarding_step: 'emergency',
    }).eq('owner_id', userId)
    onShopUpdate({ services: cleaned })
    setLoading(false)
    onNext()
  }

  return (
    <div style={card}>
      <h2 style={titleStyle}>What services do you offer?</h2>
      <p style={subtitleStyle}>Your AI will mention these when callers ask what you do.</p>

      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Quick add:</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {SUGGESTIONS.map(s => {
            const added = services.some(sv => sv.name === s)
            return (
              <button
                key={s}
                onClick={() => !added && addSuggestion(s)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  border: `1px solid ${added ? TEAL : '#d1d5db'}`,
                  background: added ? '#e0f2fe' : '#f9fafb',
                  color: added ? TEAL : '#374151',
                  fontSize: '13px',
                  cursor: added ? 'default' : 'pointer',
                  fontWeight: added ? 600 : 400,
                }}
              >
                {added ? '✓ ' : '+ '}{s}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        {services.map((service, i) => (
          <div
            key={i}
            style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Service {i + 1}</span>
              <button
                onClick={() => removeService(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '13px' }}
              >
                Remove
              </button>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <input
                value={service.name}
                onChange={e => updateService(i, { name: e.target.value })}
                style={{ ...inputStyle, ...(errors[i] ? { borderColor: '#ef4444' } : {}) }}
                placeholder="Service name *"
              />
              {errors[i] && <p style={errorStyle}>{errors[i]}</p>}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={service.price ?? ''}
                onChange={e => updateService(i, { price: e.target.value || null })}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Price (e.g. $49.99)"
              />
              <input
                value={service.description ?? ''}
                onChange={e => updateService(i, { description: e.target.value || null })}
                style={{ ...inputStyle, flex: 2 }}
                placeholder="Short description"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => addService()}
        style={{
          width: '100%',
          padding: '10px',
          border: `2px dashed ${TEAL}`,
          borderRadius: '8px',
          background: 'transparent',
          color: TEAL,
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '24px',
        }}
      >
        + Add Service
      </button>

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
const subtitleStyle: React.CSSProperties = { fontSize: '14px', color: '#6b7280', marginBottom: '20px' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: '#111827' }
const errorStyle: React.CSSProperties = { fontSize: '12px', color: '#ef4444', marginTop: '4px' }
const primaryBtn: React.CSSProperties = { background: TEAL, color: '#fff', padding: '12px 28px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '15px', width: '100%' }
