'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

const VOICES = [
  { id: 'patricia', name: 'Patricia', tagline: 'Warm and Professional',  initial: 'P', color: '#0F7695' },
  { id: 'james',    name: 'James',    tagline: 'Calm and Authoritative', initial: 'J', color: '#6366f1' },
  { id: 'sofia',    name: 'Sofia',    tagline: 'Friendly and Energetic', initial: 'S', color: '#f59e0b' },
  { id: 'marcus',   name: 'Marcus',   tagline: 'Direct and Trustworthy', initial: 'M', color: '#10b981' },
]

export function StepVoice({ userId, onNext, onBack, onShopUpdate }: StepProps) {
  // No default -- user must pick one
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  async function playPreview(voiceId: string, e: React.MouseEvent) {
    e.stopPropagation()

    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (playingId === voiceId) {
      setPlayingId(null)
      return
    }

    setLoadingPreview(voiceId)
    try {
      const res = await fetch(`/api/voice-preview?voice=${voiceId}`)
      if (!res.ok) throw new Error('Preview failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      setPlayingId(voiceId)
      setLoadingPreview(null)
      audio.play()
      audio.onended = () => {
        setPlayingId(null)
        URL.revokeObjectURL(url)
      }
    } catch {
      setLoadingPreview(null)
    }
  }

  async function handleSubmit() {
    if (!selected) return
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
      <p style={subtitleStyle}>
        Preview each voice and select the one your customers will hear.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
        {VOICES.map(voice => {
          const isSelected = selected === voice.id
          const isPlaying = playingId === voice.id
          const isLoadingThis = loadingPreview === voice.id

          return (
            <div
              key={voice.id}
              onClick={() => setSelected(voice.id)}
              style={{
                border: isSelected ? '2px solid var(--accent)' : '2px solid var(--border)',
                borderRadius: 12,
                padding: '20px 16px 16px',
                cursor: 'pointer',
                background: isSelected ? 'rgba(15,118,149,0.06)' : 'var(--card)',
                boxShadow: isSelected ? '0 0 0 4px rgba(15,118,149,0.15)' : 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: voice.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 12,
                fontSize: 20, fontWeight: 700, color: '#fff',
                fontFamily: 'var(--font-space)',
              }}>
                {voice.initial}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>
                {voice.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-mid)', marginBottom: 12 }}>
                {voice.tagline}
              </div>

              {/* Preview button */}
              <button
                onClick={(e) => playPreview(voice.id, e)}
                disabled={!!loadingPreview}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: isPlaying ? 'rgba(34,197,94,0.15)' : isSelected ? 'var(--accent)' : 'var(--card-raised)',
                  color: isPlaying ? 'var(--success)' : isSelected ? '#fff' : 'var(--text-mid)',
                  border: `1px solid ${isPlaying ? 'var(--success)' : isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 12,
                  cursor: loadingPreview ? 'wait' : 'pointer',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  width: '100%',
                  justifyContent: 'center',
                }}
              >
                {isLoadingThis ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                      <circle cx="6" cy="6" r="4" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2"/>
                      <path d="M6 2A4 4 0 0110 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Loading...
                  </>
                ) : isPlaying ? (
                  <>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                      <rect x="2" y="2" width="6" height="6" rx="1"/>
                    </svg>
                    Stop
                  </>
                ) : (
                  <>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                      <path d="M2 1.5l6 3.5-6 3.5V1.5z"/>
                    </svg>
                    Preview
                  </>
                )}
              </button>

              <div style={{ marginTop: 8, fontSize: 12, color: isSelected ? 'var(--accent)' : 'transparent', fontWeight: 600, textAlign: 'center', visibility: isSelected ? 'visible' : 'hidden' }}>
                ✓ Selected
              </div>
            </div>
          )
        })}
      </div>

      {/* Must pick instruction */}
      {!selected && (
        <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', marginBottom: 16 }}>
          Preview and select a voice to continue
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!selected || loading}
        style={{
          background: selected ? 'var(--accent)' : 'var(--card-raised)',
          color: selected ? '#fff' : 'var(--muted)',
          padding: '13px 32px',
          borderRadius: 10,
          border: selected ? 'none' : '1px solid var(--border)',
          cursor: selected ? 'pointer' : 'not-allowed',
          fontWeight: 600,
          fontSize: 15,
          width: 'auto',
          minWidth: 200,
          display: 'block',
          marginLeft: 'auto',
          transition: 'background 0.15s, opacity 0.15s',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Saving...' : selected ? `Continue with ${VOICES.find(v => v.id === selected)?.name} →` : 'Select a voice to continue'}
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
  background: 'none', border: 'none', color: 'var(--muted)',
  fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 24,
  display: 'block', fontFamily: 'inherit',
}
const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-space)', fontSize: 24, fontWeight: 700,
  color: 'var(--text)', marginBottom: 8,
}
const subtitleStyle: React.CSSProperties = {
  fontSize: 15, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 32,
}
