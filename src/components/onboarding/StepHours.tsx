'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShopHours, DayHours } from '@/types'
import { StepProps } from './OnboardingWizard'

const TEAL = '#0F7695'

const DAYS: { key: keyof ShopHours; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
]

const DEFAULT_HOURS: ShopHours = {
  monday: { open: true, from: '08:00', to: '17:00' },
  tuesday: { open: true, from: '08:00', to: '17:00' },
  wednesday: { open: true, from: '08:00', to: '17:00' },
  thursday: { open: true, from: '08:00', to: '17:00' },
  friday: { open: true, from: '08:00', to: '17:00' },
  saturday: { open: false, from: '08:00', to: '17:00' },
  sunday: { open: false, from: '08:00', to: '17:00' },
}

export function StepHours({ shop, userId, onNext, onShopUpdate }: StepProps) {
  const [hours, setHours] = useState<ShopHours>(shop?.hours ?? DEFAULT_HOURS)
  const [loading, setLoading] = useState(false)

  function updateDay(key: keyof ShopHours, patch: Partial<DayHours>) {
    setHours(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  async function handleSubmit() {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('shops').update({
      hours,
      onboarding_step: 'services',
    }).eq('owner_id', userId)
    onShopUpdate({ hours })
    setLoading(false)
    onNext()
  }

  return (
    <div style={card}>
      <h2 style={titleStyle}>Set your business hours</h2>
      <p style={subtitleStyle}>Your AI receptionist will use these to greet callers appropriately.</p>

      <div style={{ marginBottom: '24px' }}>
        {DAYS.map(({ key, label }) => {
          const day = hours[key]
          return (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 0',
                borderBottom: '1px solid #f3f4f6',
              }}
            >
              <div style={{ width: '100px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                {label}
              </div>

              <button
                onClick={() => updateDay(key, { open: !day.open })}
                style={{
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: day.open ? TEAL : '#e5e7eb',
                  color: day.open ? '#fff' : '#6b7280',
                  minWidth: '60px',
                }}
              >
                {day.open ? 'Open' : 'Closed'}
              </button>

              {day.open && (
                <>
                  <input
                    type="time"
                    value={day.from}
                    onChange={e => updateDay(key, { from: e.target.value })}
                    style={timeInput}
                  />
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>to</span>
                  <input
                    type="time"
                    value={day.to}
                    onChange={e => updateDay(key, { to: e.target.value })}
                    style={timeInput}
                  />
                </>
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
const timeInput: React.CSSProperties = { padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', color: '#111827' }
const primaryBtn: React.CSSProperties = { background: TEAL, color: '#fff', padding: '12px 28px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '15px', width: '100%' }
