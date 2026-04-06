'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
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
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.5 2h3l1.5 3.5-1.75 1.25C7.2 8.25 9.75 10.8 11.25 11.75L12.5 10l3.5 1.5v3C16 15.88 15.5 16 15 16 7.82 16 2 10.18 2 3c0-.5.12-1 1.5-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: 'Bookings',
    href: '/dashboard/bookings',
    exact: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
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
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M1 16c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M13 8c1.657 0 3 .895 3 2.5V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="13" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    exact: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.697 3.697l1.414 1.414M12.889 12.889l1.414 1.414M14.303 3.697l-1.414 1.414M5.111 12.889l-1.414 1.414" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export function Sidebar({ shopName, userEmail, mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 4, height: 22, background: 'var(--accent)', borderRadius: 2, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-space)', fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>
              ShopDesk
            </span>
          </div>
          {shopName && (
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, marginLeft: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                  padding: '9px 10px',
                  borderRadius: 8,
                  marginBottom: 2,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--accent)' : 'var(--text-mid)',
                  background: active ? 'var(--accent-dim)' : 'transparent',
                  borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                <span style={{ color: active ? 'var(--accent)' : 'var(--muted)', flexShrink: 0 }}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom: user + sign out */}
        <div style={{
          padding: '16px 12px',
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
