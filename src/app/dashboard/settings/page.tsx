'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'
import { CancelServiceButton } from '@/components/CancelServiceButton'
import { getIndustryTemplate, INDUSTRY_TEMPLATES, normalizeIndustry, type IndustryId } from '@/lib/industries/templates'
import type { Shop, ShopHours, Service } from '@/types'

type Tab = 'shop' | 'hours' | 'services' | 'ai' | 'phone' | 'integrations'
type SaveStatus = 'idle' | 'saving' | 'saved'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
type Day = typeof DAYS[number]

const DAY_LABELS: Record<Day, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
  friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
}

const VOICES = [
  { id: 'cindy',      initial: 'C', color: '#0F7695', name: 'Cindy',      desc: 'Smooth and welcoming' },
  { id: 'jacqueline', initial: 'J', color: '#8b5cf6', name: 'Jacqueline', desc: 'Confident and warm' },
  { id: 'james',      initial: 'J', color: '#6366f1', name: 'James',      desc: 'Calm and authoritative' },
  { id: 'marcus',     initial: 'M', color: '#10b981', name: 'Marcus',     desc: 'Direct and trustworthy' },
]

// serviceSuggestions are derived from the shop's industry template at render time

function inputStyle(focused: boolean): React.CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    background: 'var(--card)',
    border: `1px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
    boxShadow: focused ? '0 0 0 3px rgba(15,118,149,0.12)' : 'none',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 14,
    color: 'var(--text)',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    fontFamily: 'inherit',
  }
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--muted)',
  marginBottom: 6,
}

function SaveButton({
  onClick,
  status,
  savingText = 'Saving...',
  savedText = '✓ Saved',
}: {
  onClick: () => void
  status: SaveStatus
  savingText?: string
  savedText?: string
}) {
  const saved = status === 'saved'
  const saving = status === 'saving'
  return (
    <button
      onClick={onClick}
      disabled={saving || saved}
      style={{
        background: saved ? 'var(--success-dim)' : 'var(--accent)',
        color: saved ? 'var(--success)' : '#fff',
        border: saved ? '1px solid rgba(34,197,94,0.3)' : 'none',
        borderRadius: 8,
        padding: '10px 22px',
        fontSize: 14,
        fontWeight: 600,
        cursor: saving || saved ? 'not-allowed' : 'pointer',
        opacity: saving ? 0.7 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        transition: 'all 0.15s',
        fontFamily: 'inherit',
      }}
    >
      {saving && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
          <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
          <path d="M7 1.5A5.5 5.5 0 0112.5 7" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )}
      {saved ? savedText : saving ? savingText : 'Save changes'}
    </button>
  )
}

export default function SettingsPage() {
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('shop')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const { show } = useToast()

  // Shop Info fields
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  // Hours
  const [hours, setHours] = useState<ShopHours>({
    monday:    { open: true,  from: '08:00', to: '17:00' },
    tuesday:   { open: true,  from: '08:00', to: '17:00' },
    wednesday: { open: true,  from: '08:00', to: '17:00' },
    thursday:  { open: true,  from: '08:00', to: '17:00' },
    friday:    { open: true,  from: '08:00', to: '17:00' },
    saturday:  { open: false, from: '09:00', to: '14:00' },
    sunday:    { open: false, from: '09:00', to: '14:00' },
  })

  // Services
  const [industry, setIndustry] = useState<IndustryId>('other')
  const [services, setServices] = useState<Service[]>([])

  // AI & Voice
  const [voice, setVoice] = useState('')
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const [loadingVoice, setLoadingVoice] = useState<string | null>(null)
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null)
  const [emergencyContact, setEmergencyContact] = useState('')
  const [emergencyContactName, setEmergencyContactName] = useState('')

  // Focus states
  const [focused, setFocused] = useState<string | null>(null)

  // Owner mobile
  const [ownerPhone, setOwnerPhone] = useState('')
  const [ownerPhoneSmsConsent, setOwnerPhoneSmsConsent] = useState(false)

  // Phone copy state
  const [phoneCopied, setPhoneCopied] = useState(false)

  useEffect(() => {
    document.title = 'Settings | ShopDesk'
  }, [])

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
        setOwnerPhone(data.owner_phone ?? '')
        setOwnerPhoneSmsConsent(data.owner_phone_sms_consent ?? false)
        setHours(data.hours ?? {})
        setIndustry(normalizeIndustry(data.industry))
        setServices(data.services ?? [])
        setVoice(data.ai_voice ?? 'patricia')
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
    const normalizedFields: Partial<Shop> = { ...fields }
    if ('owner_phone' in normalizedFields || 'owner_phone_sms_consent' in normalizedFields) {
      const ownerPhoneValue = typeof normalizedFields.owner_phone === 'string'
        ? normalizedFields.owner_phone.trim()
        : (typeof shop.owner_phone === 'string' ? shop.owner_phone.trim() : '')
      normalizedFields.owner_phone = ownerPhoneValue || null
      normalizedFields.owner_phone_sms_consent = !!ownerPhoneValue && !!normalizedFields.owner_phone_sms_consent
    }
    setSaveStatus('saving')
    const supabase = createClient()
    const { error } = await supabase.from('shops').update(normalizedFields).eq('id', shop.id)
    if (error) {
      setSaveStatus('idle')
      show('Failed to save changes', 'error')
    } else {
      setSaveStatus('saved')
      setShop(prev => prev ? { ...prev, ...normalizedFields } : prev)
      if (reprovision) reprovisionAgent()
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }

  function copyMonToWeekdays() {
    const mon = hours.monday
    setHours(prev => ({
      ...prev,
      tuesday:   { ...prev.tuesday,   from: mon.from, to: mon.to },
      wednesday: { ...prev.wednesday, from: mon.from, to: mon.to },
      thursday:  { ...prev.thursday,  from: mon.from, to: mon.to },
      friday:    { ...prev.friday,    from: mon.from, to: mon.to },
    }))
  }

  function copyPhoneNumber() {
    if (!shop?.twilio_number) return
    navigator.clipboard.writeText(shop.twilio_number).then(() => {
      setPhoneCopied(true)
      setTimeout(() => setPhoneCopied(false), 2000)
    })
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: 'shop',     label: 'Business Info' },
    { value: 'hours',    label: 'Hours' },
    { value: 'services', label: 'Services' },
    { value: 'ai',       label: 'AI & Voice' },
    { value: 'phone',    label: 'Phone Setup' },
    { value: 'integrations', label: 'Integrations' },
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

  async function playVoicePreview(voiceId: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause()
      voiceAudioRef.current = null
    }
    if (playingVoice === voiceId) {
      setPlayingVoice(null)
      return
    }
    setLoadingVoice(voiceId)
    try {
      const res = await fetch(`/api/voice-preview?voice=${voiceId}`)
      if (!res.ok) throw new Error('Preview failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      voiceAudioRef.current = audio
      setPlayingVoice(voiceId)
      setLoadingVoice(null)
      audio.play()
      audio.onended = () => {
        setPlayingVoice(null)
        URL.revokeObjectURL(url)
      }
    } catch {
      setLoadingVoice(null)
    }
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-space)', fontSize: 'clamp(1.5rem, 3vw, 1.9rem)', fontWeight: 800, color: 'var(--text)', marginBottom: 4, letterSpacing: '-0.5px' }}>
          Settings
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Manage your business info, hours, services, and AI configuration
        </p>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 28, flexWrap: 'wrap',
        borderBottom: '1px solid var(--border)',
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
              color: tab === t.value ? 'var(--text)' : 'var(--muted)',
              fontSize: 13,
              fontWeight: tab === t.value ? 600 : 500,
              cursor: 'pointer',
              transition: 'color 0.15s',
              marginBottom: -1,
              fontFamily: 'inherit',
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
        padding: '24px',
        maxWidth: 620,
      }}>

        {/* ── Tab 1: Shop Info ── */}
        {tab === 'shop' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 className="section-header">Business Information</h2>
              <p className="section-desc">Your AI receptionist uses this to introduce your business.</p>
            </div>

            {/* Name + Phone */}
            <div className="form-grid-2">
              <div>
                <label style={labelStyle}>Business Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your Business Name"
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused(null)}
                  style={inputStyle(focused === 'name')}
                />
              </div>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--muted)', display: 'flex', alignItems: 'center', pointerEvents: 'none',
                  }}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M2.5 1.5h2.5l1 2.5-1.5 1A8 8 0 008 8.5l1-1.5 2.5 1v2.5a1 1 0 01-1 1C4.5 11.5 1.5 4.5 1.5 2.5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="(407) 555-0100"
                    onFocus={() => setFocused('phone')}
                    onBlur={() => setFocused(null)}
                    style={{ ...inputStyle(focused === 'phone'), paddingLeft: 34 }}
                  />
                </div>
              </div>
            </div>

            {/* Address + Email */}
            <div className="form-grid-2">
              <div>
                <label style={labelStyle}>Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="123 Main St, City, FL 32801"
                  onFocus={() => setFocused('address')}
                  onBlur={() => setFocused(null)}
                  style={inputStyle(focused === 'address')}
                />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="hello@yourshop.com"
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  style={inputStyle(focused === 'email')}
                />
              </div>
            </div>

            {/* Owner Mobile + SMS consent */}
            <div>
              <label style={labelStyle}>Your Mobile Number (optional)</label>
              <input
                type="tel"
                value={ownerPhone}
                onChange={e => setOwnerPhone(e.target.value)}
                placeholder="(407) 555-0100"
                onFocus={() => setFocused('owner-phone')}
                onBlur={() => setFocused(null)}
                style={inputStyle(focused === 'owner-phone')}
              />
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                Add this if you want booking alerts and urgent notifications by text. Different from your business phone.
              </p>
              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 10, cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={ownerPhoneSmsConsent}
                  onChange={e => setOwnerPhoneSmsConsent(e.target.checked)}
                  style={{ marginTop: 2, accentColor: 'var(--accent)', flexShrink: 0 }}
                />
                <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                  I agree to receive SMS booking alerts and urgent notifications at this number. Consent is optional. Msg and data rates may apply. Reply STOP to opt out. Reply HELP for help. <a href="https://shopdesk.site/sms-consent" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>SMS Policy</a> · <a href="https://shopdesk.site/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Terms</a> · <a href="https://shopdesk.site/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Privacy</a>
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <SaveButton onClick={() => save({ name, address, phone, email, owner_phone: ownerPhone, owner_phone_sms_consent: !!ownerPhone.trim() && ownerPhoneSmsConsent }, true)} status={saveStatus} />
            </div>
          </div>
        )}

        {/* ── Tab 2: Hours ── */}
        {tab === 'hours' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 className="section-header">Business Hours</h2>
                <p className="section-desc" style={{ marginBottom: 0 }}>Set when your business is open. Your AI will use these when answering calls.</p>
              </div>
              <button
                onClick={copyMonToWeekdays}
                style={{
                  background: 'transparent',
                  color: 'var(--accent)',
                  border: '1px solid rgba(15,118,149,0.3)',
                  borderRadius: 8,
                  padding: '7px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Copy Monday to weekdays
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              {DAYS.map((day, idx) => {
                const dh = hours[day] ?? { open: false, from: '09:00', to: '17:00' }
                return (
                  <div key={day} style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '14px 20px',
                    borderBottom: idx < DAYS.length - 1 ? '1px solid var(--border)' : 'none',
                    background: dh.open ? 'transparent' : 'rgba(0,0,0,0.1)',
                    flexWrap: 'wrap',
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: dh.open ? 'var(--text)' : 'var(--muted)', width: 100, flexShrink: 0 }}>
                      {DAY_LABELS[day]}
                    </span>
                    <button
                      onClick={() => setHours(prev => ({
                        ...prev,
                        [day]: { ...(prev[day] ?? { from: '09:00', to: '17:00' }), open: !dh.open },
                      }))}
                      style={{
                        padding: '5px 14px',
                        borderRadius: 9999,
                        border: dh.open ? 'none' : '1px solid var(--border)',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        background: dh.open ? 'var(--accent)' : 'transparent',
                        color: dh.open ? '#fff' : 'var(--muted)',
                        minWidth: 72,
                        transition: 'all 0.15s',
                        fontFamily: 'inherit',
                        flexShrink: 0,
                      }}
                    >
                      {dh.open ? 'Open' : 'Closed'}
                    </button>
                    {dh.open ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <input
                          type="time"
                          value={dh.from ?? '09:00'}
                          onChange={e => setHours(prev => ({ ...prev, [day]: { ...dh, from: e.target.value } }))}
                          style={{ ...inputStyle(false), width: 130, padding: '7px 10px', fontSize: 13 }}
                        />
                        <span style={{ fontSize: 13, color: 'var(--muted)' }}>to</span>
                        <input
                          type="time"
                          value={dh.to ?? '17:00'}
                          onChange={e => setHours(prev => ({ ...prev, [day]: { ...dh, to: e.target.value } }))}
                          style={{ ...inputStyle(false), width: 130, padding: '7px 10px', fontSize: 13 }}
                        />
                      </div>
                    ) : (
                      <span style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>Closed all day</span>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <SaveButton onClick={() => save({ hours }, true)} status={saveStatus} />
            </div>
          </div>
        )}

        {/* ── Tab 3: Services ── */}
        {tab === 'services' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 className="section-header">Services</h2>
              <p className="section-desc">Your AI mentions these when callers ask what you offer.</p>
            </div>

            {/* Industry selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Business Type</label>
              <select
                value={industry}
                onChange={e => setIndustry(e.target.value as IndustryId)}
                style={{
                  ...inputStyle(focused === 'industry'),
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: 32,
                  cursor: 'pointer',
                }}
                onFocus={() => setFocused('industry')}
                onBlur={() => setFocused(null)}
              >
                {Object.values(INDUSTRY_TEMPLATES).map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Quick-add chips */}
            {getIndustryTemplate(industry).serviceSuggestions.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 8 }}>
                  Quick Add
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {getIndustryTemplate(industry).serviceSuggestions.map(s => {
                    const added = services.some(sv => sv.name === s)
                    return (
                      <button
                        key={s}
                        onClick={() => !added && setServices(prev => [...prev, { name: s, price: '', description: '' }])}
                        className={added ? 'quick-add-chip quick-add-chip--added' : 'quick-add-chip'}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 9999,
                          border: `1px solid ${added ? 'var(--accent)' : 'var(--border)'}`,
                          background: added ? 'var(--accent-dim)' : 'transparent',
                          color: added ? 'var(--accent)' : 'var(--text-mid)',
                          fontSize: 12,
                          cursor: added ? 'default' : 'pointer',
                          fontWeight: added ? 600 : 400,
                          transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                          fontFamily: 'inherit',
                        }}
                      >
                        {added ? '✓ ' : '+ '}{s}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}


            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
              {services.map((svc, i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <input
                      type="text"
                      value={svc.name}
                      onChange={e => setServices(prev => prev.map((s, idx) => idx === i ? { ...s, name: e.target.value } : s))}
                      placeholder="Service name"
                      onFocus={() => setFocused(`svc-name-${i}`)}
                      onBlur={() => setFocused(null)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text)',
                        fontFamily: 'inherit',
                        flex: 1,
                        padding: 0,
                        boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="text"
                        value={svc.price ?? ''}
                        onChange={e => setServices(prev => prev.map((s, idx) => idx === i ? { ...s, price: e.target.value } : s))}
                        placeholder="Price"
                        onFocus={() => setFocused(`svc-price-${i}`)}
                        onBlur={() => setFocused(null)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--accent)',
                          fontFamily: 'inherit',
                          textAlign: 'right',
                          width: 80,
                          padding: 0,
                          boxSizing: 'border-box',
                        }}
                      />
                      <button
                        onClick={() => setServices(prev => prev.filter((_, idx) => idx !== i))}
                        style={{
                          background: 'transparent', border: 'none',
                          color: 'var(--muted)', cursor: 'pointer',
                          fontSize: 18, lineHeight: 1, padding: '2px 4px',
                          transition: 'color 0.15s',
                          fontFamily: 'inherit',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={svc.description ?? ''}
                    onChange={e => setServices(prev => prev.map((s, idx) => idx === i ? { ...s, description: e.target.value } : s))}
                    placeholder="Short description (optional)"
                    onFocus={() => setFocused(`svc-desc-${i}`)}
                    onBlur={() => setFocused(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderTop: '1px solid var(--border)',
                      outline: 'none',
                      fontSize: 12,
                      color: 'var(--muted)',
                      fontFamily: 'inherit',
                      width: '100%',
                      padding: '8px 0 0',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => setServices(prev => [...prev, { name: '', price: '', description: '' }])}
              style={{
                background: 'transparent',
                border: '1px dashed var(--border)',
                borderRadius: 10,
                padding: '12px',
                color: 'var(--muted)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                width: '100%',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'border-color 0.15s, color 0.15s',
                fontFamily: 'inherit',
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
              Add Custom Service
            </button>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <SaveButton onClick={() => save({ industry, services }, true)} status={saveStatus} />
            </div>
          </div>
        )}

        {/* ── Tab 4: AI & Voice ── */}
        {tab === 'ai' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 className="section-header">AI & Voice</h2>
              <p className="section-desc">Select your AI receptionist voice and configure emergency escalation.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
              {VOICES.map(v => {
                const selected = voice === v.id
                return (
                  <button
                    key={v.id}
                    onClick={() => setVoice(v.id)}
                    style={{
                      background: selected ? 'var(--accent-dim)' : 'var(--card)',
                      border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 10,
                      padding: '16px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: v.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 12, fontSize: 20, fontWeight: 700, color: '#fff',
                      fontFamily: 'var(--font-space)',
                    }}>
                      {v.initial}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: selected ? 'var(--accent)' : 'var(--text)', marginBottom: 4 }}>
                      {v.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{v.desc}</div>
                    <button
                      onClick={(e) => playVoicePreview(v.id, e)}
                      disabled={!!loadingVoice}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 500,
                        color: playingVoice === v.id ? 'var(--success)' : 'var(--muted)',
                        background: playingVoice === v.id ? 'rgba(34,197,94,0.1)' : 'var(--card-raised)',
                        border: `1px solid ${playingVoice === v.id ? 'var(--success)' : 'var(--border)'}`,
                        borderRadius: 6,
                        padding: '3px 8px',
                        cursor: loadingVoice ? 'wait' : 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s',
                      }}
                    >
                      {loadingVoice === v.id ? (
                        'Loading...'
                      ) : playingVoice === v.id ? (
                        <>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                            <rect x="2" y="2" width="6" height="6" rx="1"/>
                          </svg>
                          Stop
                        </>
                      ) : (
                        <>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <polygon points="3,2 8,5 3,8" stroke="currentColor" strokeWidth="1.2" fill="currentColor" strokeLinejoin="round"/>
                          </svg>
                          Preview
                        </>
                      )}
                    </button>
                  </button>
                )
              })}
            </div>

            <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />

            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 4 }}>
              Emergency Escalation Contact
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
              Who gets a text if a caller reports an urgent situation or emergency.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Contact Name</label>
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
                <label style={labelStyle}>Contact Phone</label>
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
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              <SaveButton
                onClick={() => save({
                  ai_voice: voice,
                  emergency_contact: emergencyContact,
                  emergency_contact_name: emergencyContactName,
                }, true)}
                status={saveStatus}
                savingText="Updating AI..."
                savedText="✓ AI updated"
              />
              <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>
                Saving will automatically update your AI receptionist within 30 seconds.
              </p>
            </div>
          </div>
        )}

        {/* ── Tab 5: Phone Setup ── */}
        {tab === 'phone' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 className="section-header">Phone Setup</h2>
              <p className="section-desc">Forward your business number to this AI receptionist line.</p>
            </div>

            {/* Assigned number */}
            <div style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '20px 24px',
              marginBottom: 24,
            }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Your AI Receptionist Number
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: 28,
                  fontWeight: 700,
                  color: shop?.twilio_number ? 'var(--accent)' : 'var(--muted)',
                  letterSpacing: '0.02em',
                }}>
                  {shop?.twilio_number ?? 'Not yet assigned'}
                </div>
                {shop?.twilio_number && (
                  <button
                    onClick={copyPhoneNumber}
                    style={{
                      background: phoneCopied ? 'var(--success-dim)' : 'var(--card-raised)',
                      border: `1px solid ${phoneCopied ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                      borderRadius: 8,
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 500,
                      color: phoneCopied ? 'var(--success)' : 'var(--text-mid)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    {phoneCopied ? (
                      <>✓ Copied</>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                          <path d="M3 8H2a1 1 0 01-1-1V2a1 1 0 011-1h5a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>
              {shop?.twilio_number && (
                <a
                  href={`tel:${shop.twilio_number}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    marginTop: 12, fontSize: 13, color: 'var(--accent)',
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
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 12 }}>
              Call Forwarding Instructions
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.7, marginBottom: 16 }}>
              Forward your existing business number to your AI receptionist number so every call is answered automatically.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { step: '1', text: 'Log in to your phone carrier\'s portal or call their support line' },
                { step: '2', text: `Set up "Unconditional Call Forwarding" to ${shop?.twilio_number ?? 'your AI number'}` },
                { step: '3', text: 'Alternatively, set "Forward when busy" and "Forward when unanswered" so this lets your staff answer first' },
                { step: '4', text: 'Make a test call to verify it\'s working' },
              ].map(item => (
                <div key={item.step} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span style={{
                    width: 24, height: 24,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {item.step}
                  </span>
                  <span style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6, paddingTop: 2 }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Integrations Tab ── */}
        {tab === 'integrations' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 className="section-header">Integrations</h2>
              <p className="section-desc">Manage your connected services.</p>
            </div>

            {/* Google Calendar */}
            <div style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '20px 24px',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'var(--surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20,
                  }}>📅</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>Google Calendar</div>
                    <div style={{ fontSize: 13, color: shop?.google_refresh_token ? '#22c55e' : 'var(--muted)' }}>
                      {shop?.google_refresh_token ? '✓ Connected' : 'Not connected'}
                    </div>
                  </div>
                </div>
                <a
                  href="/api/auth/google-calendar?from=settings"
                  style={{
                    background: 'var(--card-raised)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--text)',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {shop?.google_refresh_token ? 'Reconnect' : 'Connect'}
                </a>
              </div>
              <p style={{ marginTop: 14, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                When connected, ShopDesk automatically adds every booking to your Google Calendar and checks availability in real time.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Danger Zone */}
      <div style={{
        maxWidth: 620,
        marginTop: 32,
        background: 'var(--surface)',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 12,
        padding: '24px',
      }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Danger Zone
        </h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
          Need to pause or cancel your ShopDesk service? Submit a request and a representative will follow up within 24 hours.
        </p>
        <CancelServiceButton />
      </div>

    </div>
  )
}
