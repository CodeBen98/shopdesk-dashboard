'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Shop = {
  id: string
  name: string
  address: string
  phone: string
  status: string | null
  vapi_agent_id: string | null
  twilio_number: string | null
  onboarding_step: string | null
  created_at: string
  owner_email: string
  last_call_at: string | null
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status === 'paused'
    ? { bg: 'var(--warning-dim)', color: 'var(--warning)', label: 'Paused' }
    : status === 'live'
    ? { bg: 'var(--success-dim)', color: 'var(--success)', label: 'Live' }
    : { bg: 'rgba(255,255,255,0.06)', color: 'var(--muted)', label: 'Onboarding' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 600,
      background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  )
}

function formatDate(iso: string | null) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatRelative(iso: string | null) {
  if (!iso) return 'No calls yet'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(iso)
}

function ShopCard({ shop, toggling, onToggle }: {
  shop: Shop
  toggling: string | null
  onToggle: (id: string, action: 'pause' | 'unpause') => void
}) {
  const isProvisioned = !!shop.vapi_agent_id
  const isPaused = shop.status === 'paused'
  const isBusy = toggling === shop.id

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '20px 24px',
      marginBottom: 8,
    }}>
      {/* Top row: name + status + action */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              {shop.name || '(no name yet)'}
            </span>
            <StatusBadge status={shop.status} />
          </div>
          {shop.owner_email && (
            <div style={{ fontSize: 13, color: 'var(--accent)', marginBottom: 2 }}>{shop.owner_email}</div>
          )}
          {shop.address && (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{shop.address}</div>
          )}
        </div>

        <div style={{ flexShrink: 0, paddingTop: 2 }}>
          {!isProvisioned ? (
            <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>Not provisioned</span>
          ) : isPaused ? (
            <button onClick={() => onToggle(shop.id, 'unpause')} disabled={isBusy} style={btnStyle('success', isBusy)}>
              {isBusy ? 'Restoring...' : 'Restore'}
            </button>
          ) : (
            <button onClick={() => onToggle(shop.id, 'pause')} disabled={isBusy} style={btnStyle('warning', isBusy)}>
              {isBusy ? 'Pausing...' : 'Pause'}
            </button>
          )}
        </div>
      </div>

      {/* Detail row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '8px 20px',
        paddingTop: 12,
        borderTop: '1px solid var(--border-soft)',
      }}>
        <Detail label="Phone" value={shop.phone || 'none'} />
        <Detail label="SD number" value={shop.twilio_number || 'none'} />
        <Detail label="Last call" value={formatRelative(shop.last_call_at)} />
        <Detail label="Joined" value={formatDate(shop.created_at)} />
        {shop.vapi_agent_id && (
          <Detail label="Agent ID" value={shop.vapi_agent_id.slice(0, 16) + '...'} mono />
        )}
        {shop.onboarding_step && shop.status !== 'live' && (
          <Detail label="Step" value={shop.onboarding_step} />
        )}
      </div>
    </div>
  )
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text-mid)', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
    </div>
  )
}

function btnStyle(variant: 'success' | 'warning', busy: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    border: 'none', borderRadius: 8, padding: '8px 18px',
    fontSize: 13, fontWeight: 600, cursor: busy ? 'wait' : 'pointer',
    opacity: busy ? 0.6 : 1, fontFamily: 'inherit',
    transition: 'opacity 0.15s',
  }
  if (variant === 'success') return { ...base, background: 'var(--success)', color: '#fff' }
  return { ...base, background: 'var(--warning-dim)', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.3)' }
}

export function AdminShopList({ initialShops }: { initialShops: Shop[] }) {
  const [shops, setShops] = useState<Shop[]>(initialShops)
  const [toggling, setToggling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  async function toggle(shopId: string, action: 'pause' | 'unpause') {
    setToggling(shopId)
    setError(null)
    try {
      const res = await fetch('/api/admin/toggle-shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, action }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      setShops(prev => prev.map(s => s.id === shopId ? { ...s, status: data.status } : s))
    } catch {
      setError('Network error. Try again.')
    } finally {
      setToggling(null)
    }
  }

  const provisioned = shops.filter(s => s.vapi_agent_id)
  const onboarding = shops.filter(s => !s.vapi_agent_id)

  return (
    <>
      {/* Sign out */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <button
          onClick={handleSignOut}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '7px 14px',
            fontSize: 13,
            color: 'var(--muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            fontFamily: 'inherit',
            transition: 'border-color 0.15s, color 0.15s',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M5 12H2a1 1 0 01-1-1V3a1 1 0 011-1h3M10 10l3-3-3-3M13 7H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Sign out
        </button>
      </div>

      {error && (
        <div style={{
          background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 10, padding: '12px 16px', color: 'var(--danger)',
          fontSize: 13, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {shops.length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>No customer shops yet.</p>
      )}

      {provisioned.length > 0 && (
        <>
          <SectionLabel label="Live shops" count={provisioned.length} />
          {provisioned.map(s => <ShopCard key={s.id} shop={s} toggling={toggling} onToggle={toggle} />)}
        </>
      )}

      {onboarding.length > 0 && (
        <>
          <SectionLabel label="In onboarding" count={onboarding.length} top={provisioned.length > 0} />
          {onboarding.map(s => <ShopCard key={s.id} shop={s} toggling={toggling} onToggle={toggle} />)}
        </>
      )}
    </>
  )
}

function SectionLabel({ label, count, top }: { label: string; count: number; top?: boolean }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 600, color: 'var(--muted)',
      letterSpacing: '0.08em', textTransform: 'uppercase',
      marginBottom: 10, marginTop: top ? 28 : 0,
    }}>
      {label} ({count})
    </p>
  )
}
