'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShopHours, DayHours } from '@/types'
import { StepProps } from './OnboardingWizard'
import { DEFAULT_SHOP_HOURS } from '@/lib/utils'

const DAYS: { key: keyof ShopHours; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
]

const WEEKDAYS: (keyof ShopHours)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

const DEFAULT_HOURS: ShopHours = DEFAULT_SHOP_HOURS as ShopHours //
  monday: { open: true, from: '09:00', to: '17:00' },
  tuesday: { open: true, from: '09:00', to: '17:00' },
  wednesday: { open: true, from: '09:00', to: '17:00' },
  thursday: { open: true, from: '09:00', to: '17:00' },
  friday: { open: true, from: '09:00', to: '17:00' },
  saturday: { open: false, from: '09:00', to: '17:00' },
  sunday: { open: false, from: '09:00', to: '17:00' },
}

export function StepHours({ shop, userId, onNext, onBack, onShopUpdate }: StepProps) {
  const [hours, setHours] = useState<ShopHours>(shop?.hours ?? DEFAULT_HOURS)
  const [timeErrors, setTimeErrors] = useState<Partial<Record<keyof ShopHours, string>>>({})
  const [saveError, setSaveError] = useState('')
  const [loading, setLoading] = useState(false)

  function updateDay(key: keyof ShopHours, patch: Partial<DayHours>) {
    setHours(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }))
    setTimeErrors(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  function copyWeekdaysFromMonday() {
    const mon = hours.monday
    setHours(prev => ({
      ...prev,
      tuesday: { ...prev.tuesday, from: mon.from, to: mon.to },
      wednesday: { ...prev.wednesday, from: mon.from, to: mon.to },
      thursday: { ...prev.thursday, from: mon.from, to: mon.to },
      friday: { ...prev.friday, from: mon.from, to: mon.to },
    }))
    setTimeErrors(prev => {
      const next = { ...prev }
      delete next.tuesday; delete next.wednesday; delete next.thursday; delete next.friday
      return next
    })
  }

  const allWeekdaysOpen = WEEKDAYS.every(k => hours[k].open)

  async function handleSubmit() {
    const newTimeErrors: Partial<Record<keyof ShopHours, string>> = {}
    DAYS.forEach(({ key }) => {
      const day = hours[key]
      if (day.open && day.to <= day.from) {
        newTimeErrors[key] = 'Closing time must be after opening time'
      }
    })
    if (Object.keys(newTimeErrors).length > 0) {
      setTimeErrors(newTimeErrors)
      return
    }

    setLoading(true)
    setSaveError('')
    const supabase = createClient()
    const { error: saveErr } = await supabase.from('shops').update({
      hours,
      onboarding_step: 'services',
    }).eq('owner_id', userId)
    if (saveErr) {
      setSaveError('Failed to save. Please try again.')
      setLoading(false)
      return
    }
    onShopUpdate({ hours })
    setLoading(false)
    onNext()
  }

  return (
    <div style={card}>
      <button onClick={onBack} style={backBtn}>← Back</button>

      <h2 style={titleStyle}>Set your business hours</h2>
      <p style={subtitleStyle}>Your AI receptionist will use these to greet callers appropriately.</p>

      {allWeekdaysOpen && (
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <button
            type="button"
            onClick={copyWeekdaysFromMonday}
            style={{
              background: 'var(--accent-dim)',
              border: '1px solid rgba(15,118,149,0.3)',
              borderRadius: 8,
              color: 'var(--accent)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '6px 14px',
              fontFamily: 'inherit',
            }}
          >
            Copy Mon hours to Tue–Fri
          </button>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        {DAYS.map(({ key, label }) => {
          const day = hours[key]
          return (
            <div key={key}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 0',
                  borderBottom: timeErrors[key] ? 'none' : '1px solid var(--border)',
                }}
              >
                <div style={{ width: 104, fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                  {label}
                </div>

                <button
                  onClick={() => updateDay(key, { open: !day.open })}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 9999,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    background: day.open ? 'var(--accent)' : 'var(--card)',
                    color: day.open ? '#fff' : 'var(--muted)',
                    minWidth: 64,
                    transition: 'background 0.15s, color 0.15s',
                    fontFamily: 'inherit',
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
                      style={timeErrors[key] ? { ...timeInput, borderColor: 'var(--danger)' } : timeInput}
                    />
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>to</span>
                    <input
                      type="time"
                      value={day.to}
                      onChange={e => updateDay(key, { to: e.target.value })}
                      style={timeErrors[key] ? { ...timeInput, borderColor: 'var(--danger)' } : timeInput}
                    />
                  </>
                )}
              </div>
              {timeErrors[key] && (
                <p style={{ fontSize: 12, color: 'var(--danger)', margin: '4px 0 8px 120px', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  {timeErrors[key]}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {saveError && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 12 }}>{saveError}</p>}

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
const timeInput: React.CSSProperties = {
  padding: '7px 10px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 13,
  color: 'var(--text)',
  background: 'var(--card)',
  outline: 'none',
  fontFamily: 'inherit',
}
