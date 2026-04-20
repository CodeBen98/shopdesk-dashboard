'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SkeletonRow } from '@/components/Skeleton'
import type { Customer } from '@/types'

function formatDate(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    document.title = 'Customers | ShopDesk'
  }, [])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: shop } = await supabase
        .from('shops').select('id').eq('owner_id', user.id).single()
      if (shop) {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('shop_id', shop.id)
          .order('last_visit', { ascending: false })
        setCustomers(data ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const q = search.toLowerCase().trim()
  const filtered = q
    ? customers.filter(c =>
        (c.name ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q)
      )
    : customers

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-space)', fontSize: 'clamp(1.5rem, 3vw, 1.9rem)', fontWeight: 800, color: 'var(--text)', marginBottom: 4, letterSpacing: '-0.5px' }}>
            Customers
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            {loading ? '' : `${customers.length} total customer${customers.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: 260 }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{
            position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--muted)', pointerEvents: 'none',
          }}>
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: 'var(--surface)',
              border: `1px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 8,
              padding: '9px 14px 9px 34px',
              fontSize: 14,
              color: 'var(--text)',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
          />
        </div>
      </div>

      {/* Table card */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '24px' }}>
            {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ margin: '0 auto 14px', opacity: 0.35 }}>
              <circle cx="17" cy="14" r="8" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3 40c0-8 6.268-12 14-12s14 4 14 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="33" cy="13" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M29 34c1-4 4-6 8-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 6 }}>
              {q ? 'No customers match your search' : 'No customers yet'}
            </div>
            <div style={{ fontSize: 13 }}>
              {q ? 'Try a different name or phone number.' : 'Customers appear here after their first call.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Phone', 'Vehicle', 'Last Visit', 'Total Visits'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '12px 16px',
                      fontSize: 11, color: 'var(--muted)',
                      fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer: Customer) => (
                  <tr
                    key={customer.id}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--card-raised)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '13px 16px', fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                      {customer.name ?? '—'}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-mid)', fontFamily: 'monospace' }}>
                      {customer.phone ?? '—'}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-mid)' }}>
                      {customer.vehicle ?? '—'}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--muted)' }}>
                      {formatDate(customer.last_visit)}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-mid)', textAlign: 'center' }}>
                      {customer.visit_count ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
