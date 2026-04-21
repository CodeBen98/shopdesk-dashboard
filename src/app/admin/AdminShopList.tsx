'use client'

import { useState } from 'react'
import { signOutAction } from './actions'

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
  cancel_reason: string | null
  cancel_requested_at: string | null
  cancelled_at: string | null
}

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  live:             { bg: 'var(--success-dim)',          color: 'var(--success)',  label: 'Live' },
  paused:           { bg: 'var(--warning-dim)',           color: 'var(--warning)',  label: 'Paused' },
  pause_requested:  { bg: 'rgba(245,158,11,0.2)',         color: '#f59e0b',         label: 'Pause Requested' },
  cancel_requested: { bg: 'rgba(239,68,68,0.12)',         color: 'var(--danger)',   label: 'Cancel Requested' },
  cancelling:       { bg: 'rgba(239,68,68,0.08)',         color: 'var(--danger)',   label: 'Cancelling' },
  cancelled:        { bg: 'rgba(239,68,68,0.06)',         color: 'var(--danger)',   label: 'Cancelled' },
  deleted:          { bg: 'rgba(255,255,255,0.04)',       color: 'var(--muted)',    label: 'Deleted' },
  onboarding:       { bg: 'rgba(255,255,255,0.06)',       color: 'var(--muted)',    label: 'Onboarding' },
}

function StatusBadge({ status }: { status: string | null }) {
  const s = STATUS_CONFIG[status ?? ''] ?? { bg: 'rgba(255,255,255,0.06)', color: 'var(--muted)', label: status ?? 'Unknown' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
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

function daysUntil(iso: string | null) {
  if (!iso) return null
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return days
}

function Detail({ label, value, mono, danger }: { label: string; value: string; mono?: boolean; danger?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 13, color: danger ? 'var(--danger)' : 'var(--text-mid)', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
    </div>
  )
}

function ActionBtn({ label, onClick, variant, disabled, small }: {
  label: string
  onClick: () => void
  variant: 'success' | 'warning' | 'danger' | 'ghost'
  disabled?: boolean
  small?: boolean
}) {
  const styles: Record<string, React.CSSProperties> = {
    success: { background: 'var(--success)', color: '#fff', border: 'none' },
    warning: { background: 'var(--warning-dim)', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.3)' },
    danger:  { background: 'var(--danger-dim)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' },
    ghost:   { background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)' },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles[variant],
        borderRadius: 8,
        padding: small ? '6px 12px' : '8px 16px',
        fontSize: small ? 12 : 13,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'inherit',
        transition: 'opacity 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

function DeleteConfirmModal({ shop, onConfirm, onCancel, busy }: {
  shop: Shop
  onConfirm: () => void
  onCancel: () => void
  busy: boolean
}) {
  const [typed, setTyped] = useState('')
  const match = shop.name && shop.name !== '[deleted]' ? shop.name : shop.owner_email
  const confirmed = typed.trim().toLowerCase() === match.toLowerCase()

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid rgba(239,68,68,0.4)',
        borderRadius: 16, padding: '28px', maxWidth: 440, width: '100%',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--danger)', marginBottom: 8 }}>
          Permanently delete this account
        </h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.6 }}>
          This will:
        </p>
        <ul style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 2, paddingLeft: 18 }}>
          <li>Release the Twilio phone number</li>
          <li>Delete the Vapi AI assistant</li>
          <li>Anonymize all personal data</li>
          <li>Delete the owner&apos;s login account</li>
        </ul>
        <p style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 8 }}>
          Type <strong style={{ color: 'var(--text)' }}>{match}</strong> to confirm:
        </p>
        <input
          type="text"
          value={typed}
          onChange={e => setTyped(e.target.value)}
          placeholder={match}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 14px', fontSize: 14,
            color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
            marginBottom: 20,
          }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} disabled={busy} style={{
            flex: 1, padding: '10px', borderRadius: 8, background: 'transparent',
            border: '1px solid var(--border)', color: 'var(--muted)',
            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!confirmed || busy}
            style={{
              flex: 1, padding: '10px', borderRadius: 8,
              background: confirmed && !busy ? 'var(--danger)' : 'var(--card)',
              border: 'none', color: confirmed && !busy ? '#fff' : 'var(--muted)',
              fontSize: 13, fontWeight: 600, cursor: !confirmed || busy ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'all 0.15s',
            }}
          >
            {busy ? 'Deleting...' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminShopList({ initialShops }: { initialShops: Shop[] }) {
  const [shops, setShops] = useState<Shop[]>(initialShops)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Shop | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function callApi(url: string, method: string, body: object) {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Request failed')
    return data
  }

  async function handleToggle(shopId: string, action: 'pause' | 'unpause') {
    setBusyId(shopId)
    setError(null)
    try {
      const data = await callApi('/api/admin/toggle-shop', 'POST', { shopId, action })
      setShops(prev => prev.map(s => s.id === shopId ? { ...s, status: data.status } : s))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusyId(null)
    }
  }

  async function handleCancel(shopId: string) {
    setBusyId(shopId)
    setError(null)
    try {
      const data = await callApi('/api/admin/cancel-shop', 'POST', { shopId })
      setShops(prev => prev.map(s => s.id === shopId ? { ...s, status: 'cancelling', cancelled_at: data.cancelled_at } : s))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusyId(null)
    }
  }

  async function handleRestoreFromCancel(shopId: string) {
    setBusyId(shopId)
    setError(null)
    try {
      await callApi('/api/admin/cancel-shop', 'DELETE', { shopId })
      setShops(prev => prev.map(s => s.id === shopId ? { ...s, status: 'live', cancelled_at: null } : s))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteBusy(true)
    setError(null)
    try {
      const data = await callApi('/api/admin/delete-shop', 'POST', { shopId: deleteTarget.id })
      if (data.warnings?.length) setError(`Deleted with warnings: ${data.warnings.join('; ')}`)
      setShops(prev => prev.filter(s => s.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeleteBusy(false)
    }
  }

  // Segment shops
  const requests = shops.filter(s => s.status === 'pause_requested' || s.status === 'cancel_requested')
  const cancelling = shops.filter(s => s.status === 'cancelling' || s.status === 'cancelled')
  const active = shops.filter(s => s.vapi_agent_id && !['pause_requested', 'cancel_requested', 'cancelling', 'cancelled', 'deleted'].includes(s.status ?? ''))
  const onboarding = shops.filter(s => !s.vapi_agent_id && !['deleted'].includes(s.status ?? ''))

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <button onClick={() => signOutAction()} style={{
          background: 'transparent', border: '1px solid var(--border)', borderRadius: 8,
          padding: '7px 14px', fontSize: 13, color: 'var(--muted)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'inherit',
        }}>
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
        }}>{error}</div>
      )}

      {shops.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 14 }}>No customer shops yet.</p>}

      {requests.length > 0 && (
        <>
          <SectionLabel label="Action needed" count={requests.length} color="var(--danger)" />
          {requests.map(s => (
            <ShopCard key={s.id} shop={s} busyId={busyId}
              onToggle={handleToggle} onCancel={handleCancel}
              onRestoreCancel={handleRestoreFromCancel}
              onDelete={() => setDeleteTarget(s)} />
          ))}
        </>
      )}

      {active.length > 0 && (
        <>
          <SectionLabel label="Active shops" count={active.length} top={requests.length > 0} />
          {active.map(s => (
            <ShopCard key={s.id} shop={s} busyId={busyId}
              onToggle={handleToggle} onCancel={handleCancel}
              onRestoreCancel={handleRestoreFromCancel}
              onDelete={() => setDeleteTarget(s)} />
          ))}
        </>
      )}

      {cancelling.length > 0 && (
        <>
          <SectionLabel label="Cancelling" count={cancelling.length} top={active.length > 0 || requests.length > 0} />
          {cancelling.map(s => (
            <ShopCard key={s.id} shop={s} busyId={busyId}
              onToggle={handleToggle} onCancel={handleCancel}
              onRestoreCancel={handleRestoreFromCancel}
              onDelete={() => setDeleteTarget(s)} />
          ))}
        </>
      )}

      {onboarding.length > 0 && (
        <>
          <SectionLabel label="In onboarding" count={onboarding.length} top />
          {onboarding.map(s => (
            <ShopCard key={s.id} shop={s} busyId={busyId}
              onToggle={handleToggle} onCancel={handleCancel}
              onRestoreCancel={handleRestoreFromCancel}
              onDelete={() => setDeleteTarget(s)} />
          ))}
        </>
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          shop={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          busy={deleteBusy}
        />
      )}
    </>
  )
}

function ShopCard({ shop, busyId, onToggle, onCancel, onRestoreCancel, onDelete }: {
  shop: Shop
  busyId: string | null
  onToggle: (id: string, action: 'pause' | 'unpause') => void
  onCancel: (id: string) => void
  onRestoreCancel: (id: string) => void
  onDelete: () => void
}) {
  const busy = busyId === shop.id
  const isProvisioned = !!shop.vapi_agent_id
  const s = shop.status
  const daysLeft = daysUntil(shop.cancelled_at)
  const isRequest = s === 'pause_requested' || s === 'cancel_requested'

  return (
    <div style={{
      background: isRequest ? 'rgba(239,68,68,0.04)' : 'var(--surface)',
      border: `1px solid ${isRequest ? 'rgba(239,68,68,0.25)' : 'var(--border)'}`,
      borderRadius: 12, padding: '18px 22px', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
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
          {shop.cancel_reason && (
            <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>
              Reason: {shop.cancel_reason.replace('_', ' ')}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, alignItems: 'flex-end' }}>
          {!isProvisioned ? (
            <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>Not provisioned</span>
          ) : (
            <>
              {/* Primary action based on status */}
              {s === 'pause_requested' && (
                <ActionBtn label="Execute Pause" variant="warning" disabled={busy} onClick={() => onToggle(shop.id, 'pause')} />
              )}
              {s === 'cancel_requested' && (
                <ActionBtn label="Start 30-day Cancel" variant="danger" disabled={busy} onClick={() => onCancel(shop.id)} />
              )}
              {s === 'live' && (
                <ActionBtn label={busy ? 'Pausing...' : 'Pause'} variant="warning" disabled={busy} onClick={() => onToggle(shop.id, 'pause')} />
              )}
              {s === 'paused' && (
                <ActionBtn label={busy ? 'Restoring...' : 'Restore'} variant="success" disabled={busy} onClick={() => onToggle(shop.id, 'unpause')} />
              )}
              {(s === 'cancelling') && daysLeft !== null && (
                <span style={{ fontSize: 12, color: 'var(--danger)' }}>
                  {daysLeft > 0 ? `${daysLeft}d until deletion` : 'Grace period ended'}
                </span>
              )}
              {(s === 'cancelling' || s === 'cancelled' || s === 'cancel_requested') && (
                <ActionBtn label="Undo Cancel" variant="ghost" small disabled={busy} onClick={() => onRestoreCancel(shop.id)} />
              )}

              {/* Delete always available */}
              <ActionBtn label="Delete" variant="danger" small disabled={busy} onClick={onDelete} />
            </>
          )}
        </div>
      </div>

      {/* Detail grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '8px 20px', paddingTop: 12, borderTop: '1px solid var(--border-soft)',
      }}>
        <Detail label="Phone" value={shop.phone || 'none'} />
        <Detail label="SD number" value={shop.twilio_number || 'none'} />
        <Detail label="Last call" value={formatRelative(shop.last_call_at)} />
        <Detail label="Joined" value={formatDate(shop.created_at)} />
        {shop.cancel_requested_at && (
          <Detail label="Cancel requested" value={formatDate(shop.cancel_requested_at)} danger />
        )}
        {shop.cancelled_at && (
          <Detail label="Hard delete after" value={formatDate(shop.cancelled_at)} danger />
        )}
        {shop.vapi_agent_id && (
          <Detail label="Agent ID" value={shop.vapi_agent_id.slice(0, 16) + '...'} mono />
        )}
      </div>
    </div>
  )
}

function SectionLabel({ label, count, top, color }: { label: string; count: number; top?: boolean; color?: string }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 600, color: color ?? 'var(--muted)',
      letterSpacing: '0.08em', textTransform: 'uppercase',
      marginBottom: 10, marginTop: top ? 28 : 0,
    }}>
      {label} ({count})
    </p>
  )
}
