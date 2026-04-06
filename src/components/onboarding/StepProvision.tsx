'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

const TEAL = '#0F7695'

const STAGES = [
  'Building your shop profile...',
  'Configuring AI voice...',
  'Setting up phone routing...',
  'Almost ready...',
]

export function StepProvision({ userId, onNext, onShopUpdate }: StepProps) {
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
    <div style={{ ...card, textAlign: 'center' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          width: '72px',
          height: '72px',
          margin: '0 auto 16px',
          borderRadius: '50%',
          border: `4px solid ${TEAL}`,
          borderTopColor: 'transparent',
          animation: done ? 'none' : 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>

      <h2 style={titleStyle}>Setting up your account</h2>

      <div style={{ minHeight: '28px', marginBottom: '32px' }}>
        {STAGES.map((stage, i) => (
          <p
            key={stage}
            style={{
              fontSize: '15px',
              color: i === stageIndex ? TEAL : '#9ca3af',
              fontWeight: i === stageIndex ? 600 : 400,
              margin: '6px 0',
              transition: 'color 0.3s',
            }}
          >
            {i < stageIndex ? '✓ ' : i === stageIndex ? '→ ' : ''}{stage}
          </p>
        ))}
      </div>

      <p style={{ fontSize: '13px', color: '#9ca3af' }}>This only takes a moment…</p>
    </div>
  )
}

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
  padding: '48px 32px',
  maxWidth: '512px',
  margin: '0 auto',
}
const titleStyle: React.CSSProperties = { fontSize: '22px', fontWeight: 700, color: '#111827', marginBottom: '20px' }
