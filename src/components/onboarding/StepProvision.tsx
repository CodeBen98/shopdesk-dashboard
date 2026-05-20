'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

const STAGES = [
  'Creating your AI receptionist...',
  'Teaching it your business name and hours...',
  'Setting up your dedicated phone number...',
  'Almost done. Final checks...',
]

export function StepProvision({ shop, userId, onNext, onBack, onShopUpdate }: StepProps) {
  const [stageIndex, setStageIndex] = useState(0)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []

    // Advance visual stages while API call runs
    STAGES.forEach((_, i) => {
      if (i === 0) return
      timers.push(setTimeout(() => {
        if (!cancelled) setStageIndex(i)
      }, i * 1200))
    })

    // Call real provision API
    const provision = async () => {
      try {
        const industryConfig = shop?.industry_config as { vehicleTypes?: string[] } | null
        const res = await fetch('/api/provision-shop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicleTypes: industryConfig?.vehicleTypes || [],
            ownerName: shop?.emergency_contact_name || '',
          }),
        })
        const data = await res.json()

        if (!res.ok) {
          if (!cancelled) setError(data.error ?? `Setup hit an error (${res.status}). Please try again, and if it still fails we will finish it with you live.`)
          return
        }

        if (!cancelled) {
          // Re-fetch full shop row so forwarding step gets the real twilio_number
          try {
            const supabase = createClient()
            const { data: freshShop } = await supabase
              .from('shops')
              .select('*')
              .eq('owner_id', userId)
              .single()
            if (freshShop) onShopUpdate(freshShop)
            else onShopUpdate({ vapi_agent_id: data.agentId })
          } catch {
            onShopUpdate({ vapi_agent_id: data.agentId })
          }
          setDone(true)
          // Small delay so user sees the last stage complete
          setTimeout(() => { if (!cancelled) onNext() }, 1500)
        }
      } catch {
        if (!cancelled) setError('Network error. Please try again. If it still does not go through, we will finish setup with you live.')
      }
    }

    provision()

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
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

        <h2 style={titleStyle}>Setting up your AI receptionist</h2>
        <p style={subtitleStyle}>We are creating your setup now. This usually finishes in under a minute.</p>

        {error && (
          <div style={{
            background: 'var(--danger-dim)',
            border: '1px solid var(--danger)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 24,
            fontSize: 14,
            color: 'var(--danger)',
          }}>
            {error}
            <button onClick={() => { setError(''); setStageIndex(0); setDone(false) }}
              style={{ marginLeft: 12, background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', textDecoration: 'underline', fontSize: 14 }}>
              Try again
            </button>
          </div>
        )}

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
  fontSize: 'clamp(1.4rem, 3vw, 1.8rem)',
  fontWeight: 800,
  letterSpacing: '-0.3px',
  color: 'var(--text)',
  marginBottom: 8,
}
const subtitleStyle: React.CSSProperties = {
  fontSize: 15,
  color: 'var(--muted)',
  lineHeight: 1.6,
  marginBottom: 32,
}
