import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'
import { AdminShopList } from './AdminShopList'

export const metadata: Metadata = { title: 'Admin | ShopDesk' }

const ADMIN_EMAIL = 'slarve@shopdesk.site'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')
  if (user.email !== ADMIN_EMAIL) redirect('/dashboard')

  const admin = createAdminClient()

  const { data: shops } = await supabase
    .from('shops')
    .select('id, owner_id, name, address, phone, status, vapi_agent_id, twilio_number, onboarding_step, created_at')
    .order('created_at', { ascending: false })

  // Fetch owner emails for all shops
  const ownerIds = [...new Set((shops ?? []).map(s => s.owner_id).filter(Boolean))]
  const emailMap: Record<string, string> = {}

  if (ownerIds.length > 0) {
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 })
    for (const u of users?.users ?? []) {
      if (ownerIds.includes(u.id)) emailMap[u.id] = u.email ?? ''
    }
  }

  const shopsWithEmail = (shops ?? []).map(s => ({
    ...s,
    owner_email: emailMap[s.owner_id] ?? '',
  }))

  const liveCount = shopsWithEmail.filter(s => s.status === 'live').length
  const pausedCount = shopsWithEmail.filter(s => s.status === 'paused').length
  const totalCount = shopsWithEmail.length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 940, margin: '0 auto' }}>

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
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Total', value: totalCount, color: 'var(--text)' },
              { label: 'Live', value: liveCount, color: 'var(--success)' },
              { label: 'Paused', value: pausedCount, color: 'var(--warning)' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '12px 20px',
                textAlign: 'center',
                minWidth: 70,
              }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, letterSpacing: '-0.5px' }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <AdminShopList initialShops={shopsWithEmail} />
      </div>
    </div>
  )
}
