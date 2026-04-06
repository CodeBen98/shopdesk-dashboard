'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

const TEAL = '#0F7695'

const VOICES = [
  { id: 'patricia', name: 'Patricia', tagline: 'Warm & Professional', emoji: '👩' },
  { id: 'james', name: 'James', tagline: 'Calm & Authoritative', emoji: '👨' },
  { id: 'sofia', name: 'Sofia', tagline: 'Friendly & Energetic', emoji: '👩‍💼' },
  { id: 'marcus', name: 'Marcus', tagline: 'Direct & Trustworthy', emoji: '🧑‍💼' },
]

export function StepVoice({ shop, userId, onNext, onShopUpdate }: StepProps) {
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
      <h2 style={titleStyle}>Choose your AI voice</h2>
      <p style={subtitleStyle}>This is the voice your customers will hear when they call.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '28px' }}>
        {VOICES.map(voice => {
          const isSelected = selected === voice.id
          return (
            <div
              key={voice.id}
              onClick={() => setSelected(voice.id)}
              style={{
                border: `2px solid ${isSelected ? TEAL : '#e5e7eb'}`,
                borderRadius: '10px',
                padding: '16px',
                cursor: 'pointer',
                background: isSelected ? '#f0f9ff' : '#fff',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{voice.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#111827', marginBottom: '2px' }}>
                {voice.name}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                {voice.tagline}
              </div>
              <button
                onClick={e => { e.stopPropagation(); /* placeholder — no audio yet */ }}
                style={{
                  background: isSelected ? TEAL : '#f3f4f6',
                  color: isSelected ? '#fff' : '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                ▶ Play
              </button>
              {isSelected && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: TEAL, fontWeight: 600 }}>
                  ✓ Selected
                </div>
              )}
            </div>
          )
        })}
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
const primaryBtn: React.CSSProperties = { background: TEAL, color: '#fff', padding: '12px 28px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '15px', width: '100%' }
