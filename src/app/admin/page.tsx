import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'
import { AdminShopList } from './AdminShopList'
import { isAdmin, ADMIN_EMAIL } from '@/lib/admin'

export const metadata: Metadata = { title: 'Admin | ShopDesk' }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')
  if (!isAdmin(user)) redirect('/dashboard')

  const admin = createAdminClient()

  // All shops via service role (bypasses RLS)
  const { data: allShops } = await admin
    .from('shops')
    .select('id, owner_id, name, address, phone, status, vapi_agent_id, twilio_number, onboarding_step, created_at, cancel_reason, cancel_requested_at, cancelled_at')
    .order('created_at', { ascending: false })

  // All user emails
  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap: Record<string, string> = {}
  for (const u of usersData?.users ?? []) emailMap[u.id] = u.email ?? ''

  // Exclude admin's own account
  const shops = (allShops ?? []).filter(s => emailMap[s.owner_id] !== ADMIN_EMAIL)
  const shopIds = shops.map(s => s.id)

  // Last call per shop
  const lastCallMap: Record<string, string> = {}
  if (shopIds.length > 0) {
    const { data: calls } = await admin
      .from('calls')
      .select('shop_id, started_at')
      .in('shop_id', shopIds)
      .order('started_at', { ascending: false })

    for (const c of calls ?? []) {
      if (!lastCallMap[c.shop_id]) lastCallMap[c.shop_id] = c.started_at
    }
  }

  const shopsWithMeta = shops.map(s => ({
    ...s,
    owner_email: emailMap[s.owner_id] ?? '',
    last_call_at: lastCallMap[s.id] ?? null,
    cancel_reason: s.cancel_reason ?? null,
    cancel_requested_at: s.cancel_requested_at ?? null,
    cancelled_at: s.cancelled_at ?? null,
  }))

  const liveCount = shopsWithMeta.filter(s => s.status === 'live').length
  const pausedCount = shopsWithMeta.filter(s => s.status === 'paused').length
  const totalCount = shopsWithMeta.length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 4, height: 28, background: 'var(--accent)', borderRadius: 2 }} />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 2 }}>
                <span style={{ fontFamily: 'var(--font-space)', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.02em', color: 'var(--text)' }}>SHOP</span>
                <span style={{ fontFamily: 'var(--font-space)', fontWeight: 500, fontSize: '0.78rem', letterSpacing: '0.04em', color: 'var(--muted)' }}>DESK</span>
              </div>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Admin Panel</h1>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Internal use only.</p>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            {[
              { label: 'Total shops', value: totalCount, color: 'var(--text)' },
              { label: 'Live', value: liveCount, color: 'var(--success)' },
              { label: 'Paused', value: pausedCount, color: 'var(--warning)' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '12px 20px',
                textAlign: 'center',
                minWidth: 72,
              }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: stat.color, letterSpacing: '-0.5px' }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <AdminShopList initialShops={shopsWithMeta} />
      </div>
    </div>
  )
}
