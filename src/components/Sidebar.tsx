'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

interface SidebarProps {
  shopName: string | null
  userEmail: string | null
  mobileOpen: boolean
  onClose: () => void
}

const navItems = [
  {
    label: 'Overview',
    href: '/dashboard',
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="11" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="1" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    label: 'Calls',
    href: '/dashboard/calls',
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.5 2h3l1.5 3.5-1.75 1.25C7.2 8.25 9.75 10.8 11.25 11.75L12.5 10l3.5 1.5v3C16 15.88 15.5 16 15 16 7.82 16 2 10.18 2 3c0-.5.12-1 1.5-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: 'Bookings',
    href: '/dashboard/bookings',
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="3.5" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M6 2v3M12 2v3M2 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="6" cy="12" r="1" fill="currentColor"/>
        <circle cx="9" cy="12" r="1" fill="currentColor"/>
        <circle cx="12" cy="12" r="1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    label: 'Customers',
    href: '/dashboard/customers',
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 16c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.697 3.697l1.414 1.414M12.889 12.889l1.414 1.414M14.303 3.697l-1.414 1.414M5.111 12.889l-1.414 1.414" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export function Sidebar({ shopName, userEmail, mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [emergencyCount, setEmergencyCount] = useState(0)

  useEffect(() => {
    async function checkEmergencies() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
      if (!shop) return
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from('calls')
        .select('id', { count: 'exact' })
        .eq('shop_id', shop.id)
        .eq('outcome', 'emergency')
        .gte('started_at', since)
      setEmergencyCount(count ?? 0)
    }
    checkEmergencies()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  function isActive(item: typeof navItems[0]) {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 49,
            display: 'none',
          }}
          className="mobile-backdrop"
        />
      )}

      <aside style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 240,
        height: '100vh',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{
          padding: '24px 20px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 4, height: 30, background: 'var(--accent)', borderRadius: 2, flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 2 }}>
              <span style={{ fontFamily: 'var(--font-space)', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.02em', color: 'var(--text)' }}>SHOP</span>
              <span style={{ fontFamily: 'var(--font-space)', fontWeight: 500, fontSize: '0.78rem', letterSpacing: '0.04em', color: 'var(--muted)' }}>DESK</span>
            </div>
          </div>
          {shopName && (
            <p style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 500, marginTop: 6, marginLeft: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {shopName}
            </p>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 12px 0' }}>
          {navItems.map(item => {
            const active = isActive(item)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 10px',
                  borderRadius: 8,
                  marginBottom: 2,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--accent)' : 'var(--text-mid)',
                  background: active ? 'rgba(15,118,149,0.08)' : 'transparent',
                  borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
                  transition: 'background 0.15s, color 0.15s',
                  position: 'relative',
                }}
              >
                <span style={{ color: active ? 'var(--accent)' : 'var(--muted)', flexShrink: 0, opacity: active ? 1 : 0.7, position: 'relative' }}>
                  {item.icon}
                  {item.label === 'Calls' && emergencyCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: -3, right: -3,
                      width: 8, height: 8,
                      borderRadius: '50%',
                      background: '#ef4444',
                    }} />
                  )}
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom: user + sign out */}
        <div style={{
          padding: '20px 16px',
          borderTop: '1px solid var(--border)',
        }}>
          {userEmail && (
            <p style={{
              fontSize: 12,
              color: 'var(--muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: 10,
              padding: '0 4px',
            }}>
              {userEmail}
            </p>
          )}
          <button
            onClick={handleSignOut}
            style={{
              width: '100%',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              color: 'var(--muted)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'border-color 0.15s, color 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 12H2a1 1 0 01-1-1V3a1 1 0 011-1h3M10 10l3-3-3-3M13 7H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
