'use client'

import { useState } from 'react'

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
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status === 'paused'
    ? { bg: 'var(--warning-dim)', color: 'var(--warning)', label: 'Paused' }
    : status === 'live'
    ? { bg: 'var(--success-dim)', color: 'var(--success)', label: 'Live' }
    : { bg: 'rgba(255,255,255,0.06)', color: 'var(--muted)', label: 'Not live' }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      background: s.bg,
      color: s.color,
    }}>
      {s.label}
    </span>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
      <span style={{ color: 'var(--text-mid)', marginRight: 4 }}>{label}</span>
      {value || <span style={{ opacity: 0.4 }}>none</span>}
    </span>
  )
}

export function AdminShopList({ initialShops }: { initialShops: Shop[] }) {
  const [shops, setShops] = useState<Shop[]>(initialShops)
  const [toggling, setToggling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        return
      }
      setShops(prev => prev.map(s => s.id === shopId ? { ...s, status: data.status } : s))
    } catch {
      setError('Network error. Try again.')
    } finally {
      setToggling(null)
    }
  }

  if (shops.length === 0) {
    return <p style={{ color: 'var(--muted)', fontSize: 14 }}>No shops yet.</p>
  }

  const provisioned = shops.filter(s => s.vapi_agent_id)
  const unprovisioned = shops.filter(s => !s.vapi_agent_id)

  return (
    <>
      {error && (
        <div style={{
          background: 'var(--danger-dim)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 10,
          padding: '12px 16px',
          color: 'var(--danger)',
          fontSize: 13,
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {provisioned.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            Provisioned ({provisioned.length})
          </p>
          {provisioned.map(shop => <ShopCard key={shop.id} shop={shop} toggling={toggling} onToggle={toggle} />)}
        </>
      )}

      {unprovisioned.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: provisioned.length > 0 ? 24 : 0, marginBottom: 10 }}>
            In onboarding ({unprovisioned.length})
          </p>
          {unprovisioned.map(shop => <ShopCard key={shop.id} shop={shop} toggling={toggling} onToggle={toggle} />)}
        </>
      )}
    </>
  )
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
      padding: '18px 22px',
      marginBottom: 8,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 16,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
            {shop.name || '(no name yet)'}
          </span>
          <StatusBadge status={shop.status} />
        </div>

        {shop.owner_email && (
          <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 6 }}>{shop.owner_email}</div>
        )}

        {shop.address && (
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>{shop.address}</div>
        )}

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <Field label="Step" value={shop.onboarding_step ?? ''} />
          <Field label="SD number" value={shop.twilio_number ?? ''} />
          {isProvisioned && (
            <Field label="Agent" value={shop.vapi_agent_id!.slice(0, 14) + '...'} />
          )}
        </div>
      </div>

      <div style={{ flexShrink: 0 }}>
        {!isProvisioned ? (
          <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>Not provisioned</span>
        ) : isPaused ? (
          <button
            onClick={() => onToggle(shop.id, 'unpause')}
            disabled={isBusy}
            style={{
              background: 'var(--success)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: isBusy ? 'wait' : 'pointer',
              opacity: isBusy ? 0.6 : 1,
              fontFamily: 'inherit',
              transition: 'opacity 0.15s',
            }}
          >
            {isBusy ? 'Restoring...' : 'Restore'}
          </button>
        ) : (
          <button
            onClick={() => onToggle(shop.id, 'pause')}
            disabled={isBusy}
            style={{
              background: 'var(--warning-dim)',
              color: 'var(--warning)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 8,
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: isBusy ? 'wait' : 'pointer',
              opacity: isBusy ? 0.5 : 1,
              fontFamily: 'inherit',
              transition: 'opacity 0.15s',
            }}
          >
            {isBusy ? 'Pausing...' : 'Pause'}
          </button>
        )}
      </div>
    </div>
  )
}
