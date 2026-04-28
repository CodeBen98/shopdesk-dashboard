'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { INDUSTRY_TEMPLATES, IndustryId } from '@/lib/industries/templates'

type Phase = 'intake' | 'provisioning' | 'forwarding'

const DEFAULT_HOURS = {
  monday:    { open: true,  from: '09:00', to: '17:00' },
  tuesday:   { open: true,  from: '09:00', to: '17:00' },
  wednesday: { open: true,  from: '09:00', to: '17:00' },
  thursday:  { open: true,  from: '09:00', to: '17:00' },
  friday:    { open: true,  from: '09:00', to: '17:00' },
  saturday:  { open: false, from: '09:00', to: '17:00' },
  sunday:    { open: false, from: '09:00', to: '17:00' },
}

const INDUSTRY_OPTIONS: { id: IndustryId; label: string }[] = [
  { id: 'auto_repair',  label: 'Auto repair' },
  { id: 'hvac',         label: 'HVAC' },
  { id: 'plumbing',     label: 'Plumbing' },
  { id: 'roofing',      label: 'Roofing' },
  { id: 'landscaping',  label: 'Landscaping' },
  { id: 'towing',       label: 'Towing' },
  { id: 'salon_spa',    label: 'Salon & spa' },
  { id: 'pet_grooming', label: 'Pet grooming' },
  { id: 'cleaning',     label: 'Cleaning' },
  { id: 'real_estate',  label: 'Real estate' },
]

type ExistingShop = {
  name?: string | null
  phone?: string | null
  industry?: string | null
  twilio_number?: string | null
  vapi_agent_id?: string | null
}

export function IntakeForm({ userId, existingShop }: { userId: string; existingShop: ExistingShop | null }) {
  const router = useRouter()

  const initialPhase: Phase = existingShop?.vapi_agent_id ? 'forwarding' : 'intake'

  const [phase, setPhase]       = useState<Phase>(initialPhase)
  const [name, setName]         = useState(existingShop?.name || '')
  const [phone, setPhone]       = useState(existingShop?.phone || '')
  const [industry, setIndustry] = useState<IndustryId>((existingShop?.industry as IndustryId) || 'auto_repair')
  const [shopNumber, setShopNumber] = useState<string | null>(existingShop?.twilio_number || null)
  const [error, setError]       = useState<string | null>(null)
  const [copied, setCopied]     = useState(false)
  const [forwarded, setForwarded] = useState(false)
  const [goingLive, setGoingLive] = useState(false)

  // Cycle through status messages while provisioning
  const STATUS_MSGS = [
    'Assigning your phone number...',
    'Building your AI receptionist...',
    `Configuring for ${INDUSTRY_TEMPLATES[industry]?.label ?? 'your industry'}...`,
    'Almost ready...',
  ]
  const [statusIdx, setStatusIdx] = useState(0)
  useEffect(() => {
    if (phase !== 'provisioning') return
    const iv = setInterval(() => setStatusIdx(i => (i + 1) % STATUS_MSGS.length), 4000)
    return () => clearInterval(iv)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    setError(null)
    setPhase('provisioning')

    try {
      const supabase = createClient()
      const template = INDUSTRY_TEMPLATES[industry]

      const { error: saveErr } = await supabase.from('shops').update({
        name: name.trim(),
        phone: phone.trim(),
        industry,
        services: template.serviceSuggestions.slice(0, 6),
        hours: DEFAULT_HOURS,
        ai_voice: 'jacqueline',
        onboarding_step: 'provision',
      }).eq('owner_id', userId)

      if (saveErr) throw new Error(saveErr.message)

      const res = await fetch('/api/provision-shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Setup failed. Please try again.')
      }

      const { data: updated } = await supabase
        .from('shops')
        .select('twilio_number')
        .eq('owner_id', userId)
        .single()

      setShopNumber(updated?.twilio_number || null)
      setPhase('forwarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed. Please try again.')
      setPhase('intake')
    }
  }

  async function handleGoLive() {
    setGoingLive(true)
    const supabase = createClient()
    await supabase.from('shops').update({
      onboarding_complete: true,
      status: 'live',
      onboarding_step: 'go_live',
    }).eq('owner_id', userId)
    router.push('/dashboard')
  }

  function copyNumber() {
    if (!shopNumber) return
    navigator.clipboard.writeText(shopNumber).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const rawDigits = (shopNumber || '').replace(/\D/g, '')

  const carriers = [
    { name: 'AT&T',          code: `*72${rawDigits}`, note: null },
    { name: 'Verizon',       code: `*71${rawDigits}`, note: null },
    { name: 'T-Mobile',      code: `**67*${rawDigits}#`, note: null },
    { name: 'Other / Landline', code: null, note: 'Settings → Phone → Forward When Unanswered → enter your ShopDesk number.' },
  ]

  // ── PROVISIONING ──────────────────────────────────────────────────────────
  if (phase === 'provisioning') {
    return (
      <div style={card}>
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            border: '3px solid var(--accent)', borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 28px',
          }} />
          <h2 style={{ fontFamily: 'var(--font-space)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', marginBottom: 12, letterSpacing: '-0.5px' }}>
            Setting up your receptionist...
          </h2>
          <p style={{ fontSize: 15, color: 'var(--accent)', fontWeight: 600, marginBottom: 8, minHeight: 24, transition: 'opacity 0.3s' }}>
            {STATUS_MSGS[statusIdx]}
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            Takes about 30 seconds. Do not close this tab.
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── FORWARDING ────────────────────────────────────────────────────────────
  if (phase === 'forwarding') {
    return (
      <div style={{ ...card, maxWidth: 560 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(15,118,149,0.12)', border: '2px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M8 16l7 7 10-13" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: 'var(--font-space)', fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 800, color: 'var(--text)', marginBottom: 8, letterSpacing: '-0.5px' }}>
            You&apos;re live. One last step.
          </h2>
          <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.6 }}>
            Forward unanswered calls from your business phone to your ShopDesk number. When you do not pick up, we do.
          </p>
        </div>

        {/* ShopDesk number */}
        <div style={{
          background: 'var(--card)', border: '2px solid var(--accent)',
          borderRadius: 12, padding: '20px 24px', textAlign: 'center', marginBottom: 24,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 10 }}>
            Your ShopDesk number
          </p>
          <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.04em', marginBottom: 14, fontFamily: 'monospace' }}>
            {shopNumber ?? 'Assigning...'}
          </p>
          {shopNumber && (
            <button onClick={copyNumber} style={{
              background: copied ? 'rgba(34,197,94,0.15)' : 'var(--accent-dim)',
              color: copied ? 'var(--success)' : 'var(--accent)',
              border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(15,118,149,0.3)'}`,
              borderRadius: 8, padding: '8px 20px', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
            }}>
              {copied ? '✓ Copied!' : 'Copy Number'}
            </button>
          )}
        </div>

        {/* Carrier shortcuts */}
        <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 10 }}>
          Common carrier shortcuts
        </p>
        <style>{`.carrier-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px; } @media(max-width:480px){.carrier-grid{grid-template-columns:1fr;}}`}</style>
        <div className="carrier-grid">
          {carriers.map(c => (
            <div key={c.name} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{c.name}</div>
              {c.code ? (
                <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--accent)', fontWeight: 600, background: 'var(--accent-dim)', border: '1px solid rgba(15,118,149,0.2)', borderRadius: 6, padding: '6px 10px', wordBreak: 'break-all' }}>
                  Dial: {c.code}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{c.note}</div>
              )}
            </div>
          ))}
        </div>

        {/* Confirmation + CTA */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={forwarded}
            onChange={e => setForwarded(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 14, color: 'var(--text-mid)', fontWeight: 500 }}>I have set up call forwarding</span>
        </label>

        <button
          onClick={handleGoLive}
          disabled={goingLive}
          className="step-btn-primary"
          style={{ width: '100%', padding: '15px 32px', fontSize: 16, opacity: goingLive ? 0.7 : 1 }}
        >
          {goingLive ? 'Setting up...' : 'See My Results →'}
        </button>

        <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
          You can finish call forwarding later from your dashboard.
        </p>
      </div>
    )
  }

  // ── INTAKE FORM ───────────────────────────────────────────────────────────
  return (
    <div style={card}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'var(--accent-dim)', border: '1px solid rgba(15,118,149,0.25)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 style={{ fontFamily: 'var(--font-space)', fontSize: 'clamp(1.6rem, 4vw, 2.1rem)', fontWeight: 800, color: 'var(--text)', marginBottom: 10, lineHeight: 1.15, letterSpacing: '-0.5px' }}>
          Tell us about your business
        </h1>
        <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
          That&apos;s all we need. We set up your AI receptionist automatically.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={labelStyle}>Business name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Rick's Auto Repair"
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Business phone number</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="(407) 555-1234"
            required
            style={inputStyle}
          />
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 5 }}>
            We use this to buy a local ShopDesk number in your area code.
          </p>
        </div>

        <div>
          <label style={labelStyle}>What kind of business?</label>
          <select
            value={industry}
            onChange={e => setIndustry(e.target.value as IndustryId)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {INDUSTRY_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#ef4444',
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="step-btn-primary"
          style={{ width: '100%', padding: '15px 32px', fontSize: 16, marginTop: 8 }}
        >
          Set up my receptionist →
        </button>
      </form>
    </div>
  )
}

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  padding: '48px 48px 40px',
  maxWidth: 480,
  margin: '0 auto',
  boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
  animation: 'card-enter 0.35s ease',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-mid)',
  marginBottom: 7,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '12px 14px',
  fontSize: 15,
  color: 'var(--text)',
  outline: 'none',
  fontFamily: 'inherit',
  appearance: 'none',
}
