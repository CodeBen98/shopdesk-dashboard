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
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status === 'paused'
    ? { bg: 'var(--warning-dim)', color: 'var(--warning)', label: 'Paused' }
    : status === 'live'
    ? { bg: 'var(--success-dim)', color: 'var(--success)', label: 'Live' }
    : { bg: 'rgba(255,255,255,0.06)', color: 'var(--muted)', label: status ?? 'Not provisioned' }

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

      {shops.map(shop => (
        <div key={shop.id} style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 10,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 16,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                {shop.name || '(unnamed)'}
              </span>
              <StatusBadge status={shop.status} />
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{shop.address}</div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                <span style={{ color: 'var(--text-mid)' }}>SD number </span>
                {shop.twilio_number ?? 'none'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                <span style={{ color: 'var(--text-mid)' }}>Agent </span>
                {shop.vapi_agent_id ? shop.vapi_agent_id.slice(0, 14) + '...' : 'none'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                <span style={{ color: 'var(--text-mid)' }}>Step </span>
                {shop.onboarding_step ?? 'n/a'}
              </span>
            </div>
          </div>

          <div style={{ flexShrink: 0 }}>
            {shop.status === 'paused' ? (
              <button
                onClick={() => toggle(shop.id, 'unpause')}
                disabled={toggling === shop.id || !shop.vapi_agent_id}
                style={{
                  background: 'var(--success)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: toggling === shop.id ? 'wait' : 'pointer',
                  opacity: toggling === shop.id ? 0.6 : 1,
                  fontFamily: 'inherit',
                  transition: 'opacity 0.15s',
                }}
              >
                {toggling === shop.id ? 'Restoring...' : 'Restore'}
              </button>
            ) : (
              <button
                onClick={() => toggle(shop.id, 'pause')}
                disabled={toggling === shop.id || !shop.vapi_agent_id}
                style={{
                  background: 'var(--warning-dim)',
                  color: 'var(--warning)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: 8,
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: toggling === shop.id || !shop.vapi_agent_id ? 'not-allowed' : 'pointer',
                  opacity: toggling === shop.id || !shop.vapi_agent_id ? 0.5 : 1,
                  fontFamily: 'inherit',
                  transition: 'opacity 0.15s',
                }}
              >
                {toggling === shop.id ? 'Pausing...' : 'Pause'}
              </button>
            )}
          </div>
        </div>
      ))}
    </>
  )
}
