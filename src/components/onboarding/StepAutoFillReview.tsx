'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Enrichment, Service, Shop, ShopHours } from '@/types'
import { StepProps } from './OnboardingWizard'

function formatHoursSummary(hours: ShopHours | undefined): string {
  if (!hours) return 'Not available'

  const DAY_NAMES: { key: keyof ShopHours; short: string }[] = [
    { key: 'monday', short: 'Mon' },
    { key: 'tuesday', short: 'Tue' },
    { key: 'wednesday', short: 'Wed' },
    { key: 'thursday', short: 'Thu' },
    { key: 'friday', short: 'Fri' },
    { key: 'saturday', short: 'Sat' },
    { key: 'sunday', short: 'Sun' },
  ]

  type Group = { days: string[]; from: string; to: string; open: boolean }
  const groups: Group[] = []
  for (const { key, short } of DAY_NAMES) {
    const d = hours[key]
    const last = groups[groups.length - 1]
    if (last && last.open === d.open && last.from === d.from && last.to === d.to) {
      last.days.push(short)
    } else {
      groups.push({ days: [short], from: d.from, to: d.to, open: d.open })
    }
  }

  return groups
    .map(g => {
      const range = g.days.length > 1 ? `${g.days[0]}-${g.days[g.days.length - 1]}` : g.days[0]
      if (!g.open) return `${range} Closed`
      return `${range} ${formatTime12(g.from)}-${formatTime12(g.to)}`
    })
    .join(', ')
}

function formatTime12(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`
}

export function StepAutoFillReview({ shop, userId, onBack, onSkipTo, onShopUpdate }: StepProps) {
  // The just-run enrich-shop call wrote enrichment to the shop row, but the
  // client state hasn't been updated. Re-fetch on mount so we render fresh.
  const [fullShop, setFullShop] = useState<Shop | null>(shop)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Editable local copies of the two most owner-impactful fields.
  const [greeting, setGreeting] = useState('')
  const [services, setServices] = useState<Service[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from('shops').select('*').eq('owner_id', userId).single()
        if (cancelled) return
        if (error) throw error
        const s = data as Shop
        setFullShop(s)
        setGreeting(s.enrichment?.recommended_first_message ?? '')
        // Seed editable services from enrichment (or from shop.services if
        // enrichment already merged down in a prior session).
        const seed = s.enrichment?.services && s.enrichment.services.length > 0
          ? s.enrichment.services.map(svc => ({
              name: svc.name,
              price: svc.price,
              description: svc.description,
            }))
          : s.services
        setServices(seed ?? [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load enrichment')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [userId])

  const enrichment: Enrichment | null = fullShop?.enrichment ?? null
  const confidence = enrichment?.confidence.overall ?? null
  const hoursSummary = formatHoursSummary(fullShop?.hours)

  async function confirmAndAdvance() {
    if (!fullShop) return
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const nowIso = new Date().toISOString()
      const updatedEnrichment: Enrichment | null = enrichment
        ? {
            ...enrichment,
            recommended_first_message: greeting,
            services,
            owner_reviewed: true,
            owner_reviewed_at: nowIso,
          }
        : null
      const patch: Record<string, unknown> = {
        services,
        onboarding_step: 'hours',
      }
      if (updatedEnrichment) patch.enrichment = updatedEnrichment
      const { error } = await supabase.from('shops').update(patch).eq('owner_id', userId)
      if (error) throw error
      onShopUpdate({ services, ...(updatedEnrichment ? { enrichment: updatedEnrichment } : {}), onboarding_step: 'hours' })
      onSkipTo('hours')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function updateService(idx: number, patch: Partial<Service>) {
    setServices(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }
  function removeService(idx: number) {
    setServices(prev => prev.filter((_, i) => i !== idx))
  }
  function addService() {
    setServices(prev => [...prev, { name: '', price: null, description: null }])
  }

  if (loading) {
    return (
      <div style={card}>
        <p style={{ color: 'var(--muted)', textAlign: 'center' }}>Loading your agent profile…</p>
      </div>
    )
  }

  return (
    <div style={card}>
      <button onClick={onBack} style={backBtn}>← Back</button>

      <h2 style={titleStyle}>Review your agent profile</h2>
      <p style={subtitleStyle}>
        We built this from what we found online. Check it, edit anything that&apos;s off, then continue. You can always change it later.
      </p>

      {confidence && <ConfidenceBadge level={confidence} notes={enrichment?.confidence.notes} />}

      <Section label="Shop basics">
        <InfoRow label="Name" value={fullShop?.name} />
        <InfoRow label="Phone" value={fullShop?.phone || undefined} placeholder="Not found" />
        <InfoRow label="Address" value={fullShop?.address} />
        <InfoRow label="Hours" value={hoursSummary} />
      </Section>

      {enrichment && (
        <>
          <Section label="Greeting (what your AI says when answering)">
            <textarea
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              rows={3}
              style={textarea}
              placeholder="e.g. Thank you for calling — how can I help you today?"
            />
            <p style={hintText}>
              This is the first sentence your customers will hear. Make it sound like you.
            </p>
          </Section>

          <Section label="Services">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {services.length === 0 && (
                <p style={hintText}>No services yet. Add the ones you offer.</p>
              )}
              {services.map((svc, i) => (
                <div key={i} style={serviceRow}>
                  <input
                    value={svc.name}
                    onChange={(e) => updateService(i, { name: e.target.value })}
                    placeholder="Service name"
                    style={serviceInput}
                  />
                  <input
                    value={svc.price ?? ''}
                    onChange={(e) => updateService(i, { price: e.target.value || null })}
                    placeholder="Price (optional)"
                    style={priceInput}
                  />
                  <button onClick={() => removeService(i)} style={removeBtn} aria-label="Remove">×</button>
                </div>
              ))}
              <button onClick={addService} style={addServiceBtn}>+ Add service</button>
            </div>
          </Section>

          <VoiceSection enrichment={enrichment} />
          <IdentitySection enrichment={enrichment} />
        </>
      )}

      {!enrichment && (
        <Section label="Profile">
          <p style={{ ...hintText, color: 'var(--text-mid)' }}>
            We couldn&apos;t build a full agent profile from online sources. That&apos;s OK — the next few steps will let you fill in the rest.
          </p>
        </Section>
      )}

      {error && <p style={errorText}>{error}</p>}

      <button onClick={confirmAndAdvance} disabled={saving} className="step-btn-primary" style={{ marginTop: 16 }}>
        {saving ? 'Saving…' : 'Looks good, continue →'}
      </button>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, textAlign: 'center' }}>
        You can edit everything later in Settings.
      </p>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 20 }}>
      <div style={sectionLabel}>{label}</div>
      <div>{children}</div>
    </div>
  )
}

function InfoRow({ label, value, placeholder }: { label: string; value?: string; placeholder?: string }) {
  const found = !!value
  return (
    <div style={infoRow}>
      <div style={infoLabel}>{label}</div>
      <div style={infoValueWrap}>
        {found ? (
          <span style={infoValue}>{value}</span>
        ) : (
          <span style={notFound}>{placeholder ?? 'Not found'}</span>
        )}
      </div>
    </div>
  )
}

function ConfidenceBadge({ level, notes }: { level: 'high' | 'medium' | 'low'; notes?: string }) {
  const label = level === 'high' ? 'Strong match' : level === 'medium' ? 'Partial match' : 'Weak match'
  const bg = level === 'high' ? 'rgba(34,197,94,0.12)' : level === 'medium' ? 'rgba(234,179,8,0.12)' : 'rgba(239,68,68,0.12)'
  const color = level === 'high' ? 'var(--success)' : level === 'medium' ? '#ca8a04' : '#ef4444'
  return (
    <div style={{ background: bg, color, padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 20 }}>
      <strong style={{ fontWeight: 700 }}>{label}.</strong> {notes || 'Review everything carefully before continuing.'}
    </div>
  )
}

function VoiceSection({ enrichment }: { enrichment: Enrichment }) {
  const v = enrichment.shop_voice
  const hasAny = v.tone || v.signature_phrases.length > 0 || v.unique_selling_points.length > 0
  if (!hasAny) return null
  return (
    <Section label="Shop personality (how your AI will sound)">
      <div style={traitGrid}>
        {v.tone && <Trait label="Tone" value={v.tone} />}
        {v.formality_level && <Trait label="Formality" value={v.formality_level} />}
        {v.customer_address_style && <Trait label="Addresses customers as" value={v.customer_address_style} />}
      </div>
      {v.signature_phrases.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={miniLabel}>Phrases we noticed</div>
          <div style={tagRow}>{v.signature_phrases.map((p, i) => <span key={i} style={tag}>&ldquo;{p}&rdquo;</span>)}</div>
        </div>
      )}
      {v.unique_selling_points.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={miniLabel}>What you emphasize</div>
          <ul style={bulletList}>{v.unique_selling_points.map((u, i) => <li key={i} style={bulletItem}>{u}</li>)}</ul>
        </div>
      )}
    </Section>
  )
}

function IdentitySection({ enrichment }: { enrichment: Enrichment }) {
  const id = enrichment.shop_identity
  const hasAny = id.key_people.length > 0 || id.certifications.length > 0 || id.years_in_business != null
  if (!hasAny) return null
  return (
    <Section label="Shop identity">
      {id.key_people.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={miniLabel}>Team</div>
          <div style={tagRow}>
            {id.key_people.map((p, i) => (
              <span key={i} style={tag}>{p.name}{p.role ? ` (${p.role})` : ''}</span>
            ))}
          </div>
        </div>
      )}
      {id.years_in_business != null && (
        <Trait label="Years in business" value={String(id.years_in_business)} />
      )}
      {id.certifications.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={miniLabel}>Certifications</div>
          <ul style={bulletList}>{id.certifications.map((c, i) => <li key={i} style={bulletItem}>{c}</li>)}</ul>
        </div>
      )}
    </Section>
  )
}

function Trait({ label, value }: { label: string; value: string }) {
  return (
    <div style={traitCard}>
      <div style={miniLabel}>{label}</div>
      <div style={traitValue}>{value}</div>
    </div>
  )
}

// -- styles --------------------------------------------------------------

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  padding: '40px 48px',
  maxWidth: 640,
  margin: '0 auto',
  boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
  animation: 'card-enter 0.35s ease',
}
const backBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--muted)', fontSize: 14, cursor: 'pointer',
  padding: 0, marginBottom: 24, display: 'block', fontFamily: 'inherit',
}
const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-space)', fontSize: 'clamp(1.4rem, 3vw, 1.8rem)',
  fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--text)', marginBottom: 8,
}
const subtitleStyle: React.CSSProperties = {
  fontSize: 15, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20,
}
const sectionLabel: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8,
}
const infoRow: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px',
  background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 6,
}
const infoLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--muted)', minWidth: 70, paddingTop: 2,
  textTransform: 'uppercase', letterSpacing: '0.04em',
}
const infoValueWrap: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', flex: 1 }
const infoValue: React.CSSProperties = { fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }
const notFound: React.CSSProperties = { fontSize: 14, color: 'var(--muted)' }
const textarea: React.CSSProperties = {
  width: '100%', padding: 12, fontSize: 14, background: 'var(--card)',
  border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)',
  fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5,
}
const hintText: React.CSSProperties = {
  fontSize: 12, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5,
}
const serviceRow: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center' }
const serviceInput: React.CSSProperties = {
  flex: 2, padding: '8px 10px', fontSize: 13, background: 'var(--card)',
  border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontFamily: 'inherit',
}
const priceInput: React.CSSProperties = {
  flex: 1, padding: '8px 10px', fontSize: 13, background: 'var(--card)',
  border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontFamily: 'inherit',
}
const removeBtn: React.CSSProperties = {
  background: 'none', border: '1px solid var(--border)', color: 'var(--muted)',
  width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 16, lineHeight: 1,
}
const addServiceBtn: React.CSSProperties = {
  background: 'none', border: '1px dashed var(--border)', color: 'var(--accent)',
  padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
}
const traitGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8,
}
const traitCard: React.CSSProperties = {
  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px',
}
const miniLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4,
}
const traitValue: React.CSSProperties = {
  fontSize: 14, color: 'var(--text)', textTransform: 'capitalize',
}
const tagRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
const tag: React.CSSProperties = {
  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 9999,
  padding: '4px 10px', fontSize: 12, color: 'var(--text)',
}
const bulletList: React.CSSProperties = { margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 2 }
const bulletItem: React.CSSProperties = { fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }
const errorText: React.CSSProperties = {
  fontSize: 13, color: '#ef4444', marginTop: 12, padding: '8px 12px',
  background: 'rgba(239,68,68,0.08)', borderRadius: 6,
}
