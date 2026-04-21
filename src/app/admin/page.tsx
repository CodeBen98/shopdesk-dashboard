import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { AdminShopList } from './AdminShopList'

export const metadata: Metadata = { title: 'Admin | ShopDesk' }

const ADMIN_EMAIL = 'slarve@shopdesk.site'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')
  if (user.email !== ADMIN_EMAIL) redirect('/dashboard')

  const { data: shops } = await supabase
    .from('shops')
    .select('id, name, address, phone, status, vapi_agent_id, twilio_number, onboarding_step, created_at')
    .order('created_at', { ascending: false })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 4, height: 28, background: 'var(--accent)', borderRadius: 2 }} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 2 }}>
              <span style={{ fontFamily: 'var(--font-space)', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.02em', color: 'var(--text)' }}>SHOP</span>
              <span style={{ fontFamily: 'var(--font-space)', fontWeight: 500, fontSize: '0.78rem', letterSpacing: '0.04em', color: 'var(--muted)' }}>DESK</span>
            </div>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Admin Panel</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Internal use only. Pause or restore any shop.</p>
        </div>

        <AdminShopList initialShops={shops ?? []} />
      </div>
    </div>
  )
}
