'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'
import type { Shop, ShopHours, Service } from '@/types'

type Tab = 'shop' | 'hours' | 'services' | 'ai' | 'phone'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
type Day = typeof DAYS[number]

const DAY_LABELS: Record<Day, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

const VOICES = [
  { id: 'nova',    name: 'Nova',    desc: 'Friendly & warm female voice' },
  { id: 'alloy',   name: 'Alloy',   desc: 'Professional neutral voice' },
  { id: 'echo',    name: 'Echo',    desc: 'Clear & calm male voice' },
  { id: 'shimmer', name: 'Shimmer', desc: 'Energetic & bright female voice' },
]

function inputStyle(focused: boolean): React.CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    background: 'var(--card-raised)',
    border: `1px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 14,
    color: 'var(--text)',
    outline: 'none',
    transition: 'border-color 0.15s',
  }
}

function SaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      style={{
        background: 'var(--accent)',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        padding: '10px 22px',
        fontSize: 14,
        fontWeight: 600,
        cursor: saving ? 'not-allowed' : 'pointer',
        opacity: saving ? 0.7 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        transition: 'background 0.15s, opacity 0.15s',
      }}
    >
      {saving && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
          <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
          <path d="M7 1.5A5.5 5.5 0 0112.5 7" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )}
      {saving ? 'Saving...' : 'Save changes'}
    </button>
  )
}

export default function SettingsPage() {
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('shop')
  const [saving, setSaving] = useState(false)
  const { show } = useToast()

  // Shop Info fields
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  // Hours
  const [hours, setHours] = useState<ShopHours>({
    monday: { open: true, from: '08:00', to: '17:00' },
    tuesday: { open: true, from: '08:00', to: '17:00' },
    wednesday: { open: true, from: '08:00', to: '17:00' },
    thursday: { open: true, from: '08:00', to: '17:00' },
    friday: { open: true, from: '08:00', to: '17:00' },
    saturday: { open: false, from: '09:00', to: '14:00' },
    sunday: { open: false, from: '09:00', to: '14:00' },
  })

  // Services
  const [services, setServices] = useState<Service[]>([])

  // AI & Voice
  const [voice, setVoice] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [emergencyContactName, setEmergencyContactName] = useState('')

  // Focus states
  const [focused, setFocused] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('shops').select('*').eq('owner_id', user.id).single()
      if (data) {
        setShop(data)
        setName(data.name ?? '')
        setAddress(data.address ?? '')
        setPhone(data.phone ?? '')
        setEmail(data.email ?? '')
        setHours(data.hours ?? {})
        setServices(data.services ?? [])
        setVoice(data.ai_voice ?? 'nova')
        setEmergencyContact(data.emergency_contact ?? '')
        setEmergencyContactName(data.emergency_contact_name ?? '')
      }
      setLoading(false)
    }
    load()
  }, [])

  function reprovisionAgent() {
    fetch('/api/provision-shop', { method: 'POST' })
      .then(res => { if (!res.ok) res.text().then(t => console.error('Re-provision failed:', t)) })
      .catch(e => console.error('Re-provision error:', e))
  }

  async function save(fields: Partial<Shop>, reprovision = false) {
    if (!shop) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('shops').update(fields).eq('id', shop.id)
    setSaving(false)
    if (error) {
      show('Failed to save changes', 'error')
    } else {
      show(reprovision ? 'Saved & AI updated' : 'Saved successfully', 'success')
      setShop(prev => prev ? { ...prev, ...fields } : prev)
      if (reprovision) reprovisionAgent()
    }
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: 'shop',     label: 'Shop Info' },
    { value: 'hours',    label: 'Hours' },
    { value: 'services', label: 'Services' },
    { value: 'ai',       label: 'AI & Voice' },
    { value: 'phone',    label: 'Phone Setup' },
  ]

  if (loading) {
    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ width: 140, height: 28, background: 'var(--surface)', borderRadius: 6, marginBottom: 8, animation: 'shimmer 1.6s infinite linear', backgroundSize: '800px 100%', backgroundImage: 'linear-gradient(90deg, var(--surface) 0px, var(--card-raised) 200px, var(--surface) 400px)' }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-space)', fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
          Settings
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Manage your shop, hours, services, and AI configuration
        </p>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 28, flexWrap: 'wrap',
        borderBottom: '1px solid var(--border)', paddingBottom: 0,
      }}>
        {tabs.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderBottom: tab === t.value ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'transparent',
              color: tab === t.value ? 'var(--accent)' : 'var(--muted)',
              fontSize: 14,
              fontWeight: tab === t.value ? 600 : 400,
              cursor: 'pointer',
              transition: 'color 0.15s',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '28px 32px',
        maxWidth: 620,
      }}>

        {/* ── Tab 1: Shop Info ── */}
        {tab === 'shop' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-space)', fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
              Shop Information
            </h2>
            {[
              { label: 'Shop Name', value: name, set: setName, key: 'name', placeholder: 'Your Auto Shop' },
              { label: 'Address', value: address, set: setAddress, key: 'address', placeholder: '123 Main St, City, FL 32801' },
              { label: 'Phone Number', value: phone, set: setPhone, key: 'phone', placeholder: '(407) 555-0100' },
              { label: 'Email', value: email, set: setEmail, key: 'email', placeholder: 'hello@yourshop.com' },
            ].map(field => (
              <div key={field.key}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-mid)', marginBottom: 6 }}>
                  {field.label}
                </label>
                <input
                  type="text"
                  value={field.value}
                  onChange={e => field.set(e.target.value)}
                  placeholder={field.placeholder}
                  onFocus={() => setFocused(field.key)}
                  onBlur={() => setFocused(null)}
                  style={inputStyle(focused === field.key)}
                />
              </div>
            ))}
            <div style={{ marginTop: 8 }}>
              <SaveButton onClick={() => save({ name, address, phone, email }, true)} saving={saving} />
            </div>
          </div>
        )}

        {/* ── Tab 2: Hours ── */}
        {tab === 'hours' && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-space)', fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>
              Business Hours
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {DAYS.map(day => {
                const dh = hours[day] ?? { open: false, from: '08:00', to: '17:00' }
                return (
                  <div key={day} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px',
                    background: 'var(--card-raised)',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    opacity: dh.open ? 1 : 0.6,
                  }}>
                    {/* Toggle */}
                    <button
                      onClick={() => setHours(prev => ({
                        ...prev,
                        [day]: { ...(prev[day] ?? { from: '08:00', to: '17:00' }), open: !dh.open },
                      }))}
                      style={{
                        width: 36, height: 20,
                        borderRadius: 10,
                        background: dh.open ? 'var(--accent)' : 'var(--border)',
                        border: 'none',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'background 0.15s',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{
                        position: 'absolute',
                        top: 2, left: dh.open ? 18 : 2,
                        width: 16, height: 16,
                        borderRadius: '50%',
                        background: '#fff',
                        transition: 'left 0.15s',
                      }} />
                    </button>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', width: 34, flexShrink: 0 }}>
                      {DAY_LABELS[day]}
                    </span>
                    {dh.open ? (
                      <>
                        <input
                          type="time"
                          value={dh.from ?? '08:00'}
                          onChange={e => setHours(prev => ({ ...prev, [day]: { ...dh, from: e.target.value } }))}
                          style={{ ...inputStyle(false), width: 100, padding: '6px 10px', fontSize: 13 }}
                        />
                        <span style={{ fontSize: 13, color: 'var(--muted)' }}>to</span>
                        <input
                          type="time"
                          value={dh.to ?? '17:00'}
                          onChange={e => setHours(prev => ({ ...prev, [day]: { ...dh, to: e.target.value } }))}
                          style={{ ...inputStyle(false), width: 100, padding: '6px 10px', fontSize: 13 }}
                        />
                      </>
                    ) : (
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>Closed</span>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 20 }}>
              <SaveButton onClick={() => save({ hours }, true)} saving={saving} />
            </div>
          </div>
        )}

        {/* ── Tab 3: Services ── */}
        {tab === 'services' && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-space)', fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>
              Services
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {services.map((svc, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px auto',
                  gap: 8,
                  alignItems: 'center',
                  background: 'var(--card-raised)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '10px 12px',
                }}>
                  <input
                    type="text"
                    value={svc.name}
                    onChange={e => setServices(prev => prev.map((s, idx) => idx === i ? { ...s, name: e.target.value } : s))}
                    placeholder="Service name"
                    onFocus={() => setFocused(`svc-name-${i}`)}
                    onBlur={() => setFocused(null)}
                    style={{ ...inputStyle(focused === `svc-name-${i}`), padding: '7px 10px', fontSize: 13 }}
                  />
                  <input
                    type="text"
                    value={svc.price ?? ''}
                    onChange={e => setServices(prev => prev.map((s, idx) => idx === i ? { ...s, price: e.target.value } : s))}
                    placeholder="$0"
                    onFocus={() => setFocused(`svc-price-${i}`)}
                    onBlur={() => setFocused(null)}
                    style={{ ...inputStyle(focused === `svc-price-${i}`), padding: '7px 10px', fontSize: 13 }}
                  />
                  <button
                    onClick={() => setServices(prev => prev.filter((_, idx) => idx !== i))}
                    style={{
                      background: 'transparent', border: 'none',
                      color: 'var(--muted)', cursor: 'pointer',
                      fontSize: 18, lineHeight: 1, padding: '4px 6px',
                      transition: 'color 0.15s',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => setServices(prev => [...prev, { name: '', price: '', description: '' }])}
                style={{
                  background: 'transparent',
                  border: '1px dashed var(--border)',
                  borderRadius: 8,
                  padding: '10px',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'border-color 0.15s, color 0.15s',
                  marginTop: 4,
                }}
              >
                + Add service
              </button>
            </div>
            <div style={{ marginTop: 20 }}>
              <SaveButton onClick={() => save({ services }, true)} saving={saving} />
            </div>
          </div>
        )}

        {/* ── Tab 4: AI & Voice ── */}
        {tab === 'ai' && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-space)', fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>
              AI & Voice
            </h2>

            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>Select your AI receptionist voice</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
              {VOICES.map(v => {
                const selected = voice === v.id
                return (
                  <button
                    key={v.id}
                    onClick={() => setVoice(v.id)}
                    style={{
                      background: selected ? 'var(--accent-dim)' : 'var(--card-raised)',
                      border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 10,
                      padding: '14px 16px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, color: selected ? 'var(--accent)' : 'var(--text)', marginBottom: 4 }}>
                      {v.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{v.desc}</div>
                  </button>
                )
              })}
            </div>

            <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />

            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>Emergency Contact</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-mid)', marginBottom: 6 }}>
                  Contact Name
                </label>
                <input
                  type="text"
                  value={emergencyContactName}
                  onChange={e => setEmergencyContactName(e.target.value)}
                  placeholder="John Smith"
                  onFocus={() => setFocused('ec-name')}
                  onBlur={() => setFocused(null)}
                  style={inputStyle(focused === 'ec-name')}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-mid)', marginBottom: 6 }}>
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={emergencyContact}
                  onChange={e => setEmergencyContact(e.target.value)}
                  placeholder="(407) 555-0199"
                  onFocus={() => setFocused('ec-phone')}
                  onBlur={() => setFocused(null)}
                  style={inputStyle(focused === 'ec-phone')}
                />
              </div>
            </div>
            <div style={{ marginTop: 20 }}>
              <SaveButton
                onClick={() => save({
                  ai_voice: voice,
                  emergency_contact: emergencyContact,
                  emergency_contact_name: emergencyContactName,
                }, true)}
                saving={saving}
              />
            </div>
          </div>
        )}

        {/* ── Tab 5: Phone Setup ── */}
        {tab === 'phone' && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-space)', fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>
              Phone Setup
            </h2>

            {/* Assigned number */}
            <div style={{
              background: 'var(--card-raised)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '18px 20px',
              marginBottom: 24,
            }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Your AI Receptionist Number
              </div>
              <div style={{ fontFamily: 'var(--font-space)', fontSize: 26, fontWeight: 700, color: shop?.twilio_number ? 'var(--text)' : 'var(--muted)' }}>
                {shop?.twilio_number ?? 'Not yet assigned'}
              </div>
              {shop?.twilio_number && (
                <a
                  href={`tel:${shop.twilio_number}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    marginTop: 10, fontSize: 13, color: 'var(--accent)',
                    textDecoration: 'none', fontWeight: 500,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2.5 1.5h2.5l1 2.5-1.5 1A8 8 0 008 8.5l1-1.5 2.5 1v2.5a1 1 0 01-1 1C4.5 11.5 1.5 4.5 1.5 2.5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                  </svg>
                  Make a test call →
                </a>
              )}
            </div>

            {/* Forwarding instructions */}
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
              Call Forwarding Instructions
            </h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 14 }}>
              Forward your shop&apos;s existing phone number to your AI receptionist number so every call is answered automatically.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { step: '1', text: 'Log in to your phone carrier\'s portal or call their support line' },
                { step: '2', text: `Set up "Unconditional Call Forwarding" to ${shop?.twilio_number ?? 'your AI number'}` },
                { step: '3', text: 'Alternatively, set "Forward when busy" and "Forward when unanswered" — this lets your staff answer first' },
                { step: '4', text: 'Make a test call to verify it\'s working' },
              ].map(item => (
                <div key={item.step} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  background: 'var(--card-raised)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '12px 14px',
                }}>
                  <span style={{
                    width: 22, height: 22,
                    borderRadius: '50%',
                    background: 'var(--accent-dim)',
                    border: '1px solid var(--accent)',
                    color: 'var(--accent)',
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {item.step}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6 }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
