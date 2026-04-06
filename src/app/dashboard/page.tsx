import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: shop } = await supabase
    .from('shops')
    .select('name, status, plan, trial_ends_at')
    .eq('owner_id', user.id)
    .single()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      padding: '40px 32px',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
          <div style={{ width: 4, height: 24, background: 'var(--accent)', borderRadius: 2 }} />
          <span style={{ fontFamily: 'var(--font-space)', fontWeight: 700, fontSize: 20, color: 'var(--text)' }}>
            ShopDesk
          </span>
          {shop?.name && (
            <>
              <span style={{ color: 'var(--muted)', fontSize: 14, marginLeft: 8 }}>·</span>
              <span style={{ color: 'var(--muted)', fontSize: 14 }}>{shop.name}</span>
            </>
          )}
        </div>

        <h1 style={{ fontFamily: 'var(--font-space)', fontSize: 28, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 15 }}>
          Your AI receptionist is live. Here&apos;s what&apos;s happening.
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 40,
      }}>
        {[
          { label: 'Calls Answered', value: '0', sub: 'this month' },
          { label: 'Bookings Made', value: '0', sub: 'this month' },
          { label: 'Missed Calls', value: '0', sub: 'this month' },
          { label: 'Revenue Recovered', value: '$0', sub: 'est. this month' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '20px 24px',
          }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>{stat.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-space)', lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '24px',
        marginBottom: 24,
      }}>
        <h2 style={{ fontFamily: 'var(--font-space)', fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>
          Recent Calls
        </h2>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
          No calls yet. Your AI receptionist is ready and waiting.
        </div>
      </div>

      {/* Quick Links */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Call Log', href: '/dashboard/calls' },
          { label: 'Bookings', href: '/dashboard/bookings' },
          { label: 'Customers', href: '/dashboard/customers' },
          { label: 'Settings', href: '/dashboard/settings' },
        ].map(link => (
          <a key={link.label} href={link.href} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '10px 20px',
            fontSize: 14,
            color: 'var(--text-mid)',
            textDecoration: 'none',
            fontWeight: 500,
            transition: 'border-color 0.15s',
          }}>
            {link.label}
          </a>
        ))}
      </div>
    </div>
  )
}
