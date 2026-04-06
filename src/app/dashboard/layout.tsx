'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Toast } from '@/components/Toast'
import { createClient } from '@/lib/supabase/client'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [shopName, setShopName] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserEmail(user.email ?? null)
      const { data: shop } = await supabase
        .from('shops')
        .select('name')
        .eq('owner_id', user.id)
        .single()
      if (shop?.name) setShopName(shop.name)
    }
    load()
  }, [])

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 49,
          }}
        />
      )}

      {/* Sidebar — always visible on desktop, toggled on mobile */}
      <div
        className={`sidebar-wrapper${mobileOpen ? ' sidebar-open' : ''}`}
      >
        <Sidebar
          shopName={shopName}
          userEmail={userEmail}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
      </div>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(o => !o)}
        aria-label="Toggle sidebar"
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 60,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          width: 40,
          height: 40,
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text)',
        }}
        className="hamburger-btn"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Main content */}
      <main style={{
        marginLeft: 240,
        minHeight: '100vh',
        background: 'var(--bg)',
        padding: '32px',
      }} className="dashboard-main">
        {children}
      </main>

      {/* Global toast container */}
      <Toast />

      <style>{`
        @media (max-width: 768px) {
          .hamburger-btn { display: flex !important; }
          .dashboard-main { margin-left: 0 !important; padding: 24px 16px !important; padding-top: 72px !important; }
          .sidebar-wrapper { display: none; }
          .sidebar-wrapper.sidebar-open { display: block; }
        }
      `}</style>
    </>
  )
}
