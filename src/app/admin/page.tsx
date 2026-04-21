'use client'

import { useEffect, useState } from 'react'

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
    : { bg: 'rgba(255,255,255,0.06)', color: 'var(--muted)', label: status ?? 'Unknown' }

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

export default function AdminPage() {
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  async function loadShops() {
    const res = await fetch('/api/admin/shops')
    if (res.status === 401 || res.status === 403) {
      window.location.href = '/auth/login'
      return
    }
    if (!res.ok) {
      setError('Failed to load shops.')
      setLoading(false)
      return
    }
    const data = await res.json()
    setShops(data.shops ?? [])
    setLoading(false)
  }

  useEffect(() => { loadShops() }, [])

  async function toggle(shopId: string, action: 'pause' | 'unpause') {
    setToggling(shopId)
    try {
      const res = await fetch('/api/admin/toggle-shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, action }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(`Error: ${data.error}`)
        return
      }
      setShops(prev => prev.map(s => s.id === shopId ? { ...s, status: data.status } : s))
    } catch {
      alert('Network error. Try again.')
    } finally {
      setToggling(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 4, height: 28, background: 'var(--accent)', borderRadius: 2 }} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 2 }}>
              <span style={{ fontFamily: 'var(--font-space)', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.02em', color: 'var(--text)' }}>SHOP</span>
              <span style={{ fontFamily: 'var(--font-space)', fontWeight: 500, fontSize: '0.78rem', letterSpacing: '0.04em', color: 'var(--muted)' }}>DESK</span>
            </div>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginTop: 16, marginBottom: 4 }}>Admin Panel</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Developer-only. Pause or restore shops.</p>
        </div>

        {loading && (
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Loading...</p>
        )}

        {error && (
          <div style={{
            background: 'var(--danger-dim)',
            border: '1px solid var(--danger)',
            borderRadius: 10,
            padding: '16px 20px',
            color: 'var(--danger)',
            fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {!loading && !error && shops.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>No shops found.</p>
        )}

        {shops.map(shop => (
          <div key={shop.id} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 16,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{shop.name || '(unnamed)'}</span>
                <StatusBadge status={shop.status} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>{shop.address}</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  <span style={{ color: 'var(--text-mid)' }}>Phone:</span> {shop.twilio_number ?? 'none'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  <span style={{ color: 'var(--text-mid)' }}>Agent:</span> {shop.vapi_agent_id ? shop.vapi_agent_id.slice(0, 12) + '...' : 'none'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  <span style={{ color: 'var(--text-mid)' }}>Step:</span> {shop.onboarding_step ?? 'n/a'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {shop.status === 'paused' ? (
                <button
                  onClick={() => toggle(shop.id, 'unpause')}
                  disabled={toggling === shop.id || !shop.vapi_agent_id}
                  style={{
                    background: 'var(--success)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: toggling === shop.id ? 0.5 : 1,
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
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
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
      </div>
    </div>
  )
}
