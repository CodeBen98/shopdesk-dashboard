'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

const STAGES = [
  'Building your shop profile...',
  'Configuring AI voice...',
  'Setting up phone routing...',
  'Almost ready...',
]

export function StepProvision({ userId, onNext, onBack, onShopUpdate }: StepProps) {
  const [stageIndex, setStageIndex] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    STAGES.forEach((_, i) => {
      if (i === 0) return
      timers.push(setTimeout(() => setStageIndex(i), i * 1000))
    })

    timers.push(
      setTimeout(async () => {
        const supabase = createClient()
        await supabase.from('shops').update({
          onboarding_step: 'forwarding',
          vapi_agent_id: 'pending',
        }).eq('owner_id', userId)
        onShopUpdate({ vapi_agent_id: 'pending' })
        setDone(true)
        onNext()
      }, STAGES.length * 1000)
    )

    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{
      ...card,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Shimmer glow behind card while provisioning */}
      {!done && (
        <div style={{
          position: 'absolute',
          inset: -2,
          borderRadius: 18,
          background: 'radial-gradient(ellipse at center, rgba(15,118,149,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
          animation: 'pulse-dot 2s ease-in-out infinite',
          zIndex: 0,
        }} />
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        <button onClick={onBack} style={backBtn}>← Back</button>

        <h2 style={titleStyle}>Setting up your account</h2>
        <p style={subtitleStyle}>This only takes a moment…</p>

        {/* Timeline */}
        <div style={{ position: 'relative', paddingLeft: 28, marginBottom: 32 }}>
          {/* Vertical line */}
          <div style={{
            position: 'absolute',
            left: 7,
            top: 8,
            bottom: 8,
            width: 2,
            background: 'var(--border)',
            borderRadius: 1,
          }} />

          {STAGES.map((stage, i) => {
            const isCompleted = i < stageIndex
            const isCurrent = i === stageIndex
            return (
              <div key={stage} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20, position: 'relative' }}>
                {/* Dot */}
                <div style={{
                  position: 'absolute',
                  left: -21,
                  top: 3,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: isCompleted ? 'var(--accent)' : isCurrent ? 'var(--accent)' : 'var(--card)',
                  border: `2px solid ${isCompleted || isCurrent ? 'var(--accent)' : 'var(--border)'}`,
                  transition: 'background 0.3s, border-color 0.3s',
                  animation: isCurrent && !done ? 'pulse-dot 1.2s ease-in-out infinite' : 'none',
                  flexShrink: 0,
                }} />

                {/* Text */}
                <div style={{ paddingLeft: 4 }}>
                  <span style={{
                    fontSize: 15,
                    color: isCompleted ? 'var(--accent)' : isCurrent ? 'var(--text)' : 'var(--muted)',
                    fontWeight: isCompleted || isCurrent ? 600 : 400,
                    transition: 'color 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    {isCompleted && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                        <circle cx="7" cy="7" r="7" fill="var(--accent)" fillOpacity="0.15"/>
                        <path d="M4 7l2 2 4-4" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {stage}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
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
