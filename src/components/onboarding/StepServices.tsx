'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Service } from '@/types'
import { StepProps } from './OnboardingWizard'

const SUGGESTIONS = [
  'Oil Change', 'Brake Service', 'Tire Rotation', 'Engine Diagnostics',
  'AC Repair', 'Transmission Service', 'Alignment', 'Battery Replacement',
]

function emptyService(): Service {
  return { name: '', price: null, description: null }
}

export function StepServices({ shop, userId, onNext, onBack, onShopUpdate }: StepProps) {
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
      <button onClick={onBack} style={backBtn}>← Back</button>

      <h2 style={titleStyle}>What services do you offer?</h2>
      <p style={subtitleStyle}>Your AI will mention these when callers ask what you do.</p>

      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 10 }}>
          Quick add:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SUGGESTIONS.map(s => {
            const added = services.some(sv => sv.name === s)
            return (
              <button
                key={s}
                onClick={() => !added && addSuggestion(s)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 9999,
                  border: `1px solid ${added ? 'var(--accent)' : 'var(--border)'}`,
                  background: added ? 'var(--accent-dim)' : 'var(--card)',
                  color: added ? 'var(--accent)' : 'var(--text-mid)',
                  fontSize: 13,
                  cursor: added ? 'default' : 'pointer',
                  fontWeight: added ? 600 : 400,
                  transition: 'border-color 0.15s, background 0.15s',
                  fontFamily: 'inherit',
                }}
              >
                {added ? '✓ ' : '+ '}{s}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        {services.map((service, i) => (
          <div
            key={i}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>Service {i + 1}</span>
              <button
                onClick={() => removeService(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 13, fontFamily: 'inherit' }}
              >
                Remove
              </button>
            </div>
            <div style={{ marginBottom: 8 }}>
              <input
                value={service.name}
                onChange={e => updateService(i, { name: e.target.value })}
                className="step-input"
                style={errors[i] ? { borderColor: 'var(--danger)' } : {}}
                placeholder="Service name *"
              />
              {errors[i] && <p style={errorStyle}>{errors[i]}</p>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={service.price ?? ''}
                onChange={e => updateService(i, { price: e.target.value || null })}
                className="step-input"
                style={{ flex: 1 }}
                placeholder="Price (e.g. $49.99)"
              />
              <input
                value={service.description ?? ''}
                onChange={e => updateService(i, { description: e.target.value || null })}
                className="step-input"
                style={{ flex: 2 }}
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
          border: '2px dashed var(--accent)',
          borderRadius: 8,
          background: 'transparent',
          color: 'var(--accent)',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 24,
          fontFamily: 'inherit',
          transition: 'background 0.15s',
        }}
      >
        + Add Service
      </button>

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
  marginBottom: 28,
}
const errorStyle: React.CSSProperties = { fontSize: 12, color: 'var(--danger)', marginTop: 4 }
