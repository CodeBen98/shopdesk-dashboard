'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

const VOICES = [
  { id: 'patricia', name: 'Patricia', tagline: 'Warm & Professional', emoji: '👩' },
  { id: 'james', name: 'James', tagline: 'Calm & Authoritative', emoji: '👨' },
  { id: 'sofia', name: 'Sofia', tagline: 'Friendly & Energetic', emoji: '👩‍💼' },
  { id: 'marcus', name: 'Marcus', tagline: 'Direct & Trustworthy', emoji: '🧑‍💼' },
]

export function StepVoice({ shop, userId, onNext, onBack, onShopUpdate }: StepProps) {
  const [selected, setSelected] = useState(shop?.ai_voice ?? 'patricia')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('shops').update({
      ai_voice: selected,
      onboarding_step: 'provision',
    }).eq('owner_id', userId)
    onShopUpdate({ ai_voice: selected })
    setLoading(false)
    onNext()
  }

  return (
    <div style={card}>
      <button onClick={onBack} style={backBtn}>← Back</button>

      <h2 style={titleStyle}>Choose your AI voice</h2>
      <p style={subtitleStyle}>This is the voice your customers will hear when they call.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
        {VOICES.map(voice => {
          const isSelected = selected === voice.id
          return (
            <div
              key={voice.id}
              onClick={() => setSelected(voice.id)}
              className="option-card-anim"
              style={{
                border: isSelected ? '2px solid var(--accent)' : '2px solid var(--border)',
                borderRadius: 12,
                padding: 16,
                cursor: 'pointer',
                background: isSelected ? 'rgba(15,118,149,0.06)' : 'var(--card)',
                boxShadow: isSelected ? '0 0 0 4px rgba(15,118,149,0.15)' : 'none',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{voice.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>
                {voice.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                {voice.tagline}
              </div>
              <button
                onClick={e => e.stopPropagation()}
                className="preview-btn"
                style={{
                  background: isSelected ? 'var(--accent)' : 'var(--card-raised)',
                  color: isSelected ? '#fff' : 'var(--text-mid)',
                  border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 6,
                  padding: '5px 10px',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  position: 'relative',
                }}
              >
                ▶ Preview
              </button>
              {isSelected && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                  ✓ Selected
                </div>
              )}
            </div>
          )
        })}
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
