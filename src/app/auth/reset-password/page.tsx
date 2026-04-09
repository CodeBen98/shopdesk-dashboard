'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [exchanging, setExchanging] = useState(true)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const hasExchanged = useRef(false)

  useEffect(() => {
    if (hasExchanged.current) return
    hasExchanged.current = true
    
    const code = searchParams.get('code')
    if (!code) {
      queueMicrotask(() => {
        setError('Invalid or expired reset link. Please request a new one.')
        setExchanging(false)
      })
      return
    }
    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error: authError }) => {
      queueMicrotask(() => {
        if (authError) setError('This reset link has expired. Please request a new one.')
        setExchanging(false)
      })
    })
  }, [searchParams])
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 1500)
    }
  }

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%',
    boxSizing: 'border-box',
    background: 'var(--card)',
    border: `1px solid ${focusedField === field ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}`,
    borderRadius: 8,
    padding: '12px 14px',
    fontSize: 15,
    color: 'var(--text)',
    outline: 'none',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  })

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px' }}>
      <h1 style={{ fontFamily: 'var(--font-space)', fontSize: 22, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
        Set new password
      </h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>
        Choose a strong password for your account
      </p>

      {error && (
        <div style={{ background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 14, color: 'var(--danger)' }}>
          {error}
          {error.includes('expired') && (
            <span> <Link href="/auth/forgot-password" style={{ color: 'var(--accent)' }}>Request a new link</Link></span>
          )}
        </div>
      )}

      {success ? (
        <div style={{ background: 'rgba(15,118,149,0.1)', border: '1px solid var(--accent)', borderRadius: 8, padding: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: 15, color: 'var(--accent)', fontWeight: 600 }}>Password updated! Redirecting...</p>
        </div>
      ) : exchanging ? (
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Verifying reset link...</p>
      ) : !error && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>New Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              style={inputStyle('password')}
            />
          </div>
          <div>
            <label style={labelStyle}>Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              onFocus={() => setFocusedField('confirm')}
              onBlur={() => setFocusedField(null)}
              style={inputStyle('confirm')}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '13px',
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: 'inherit',
            }}
          >
            {loading && <Spinner />}
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <>
      <style>{`
        .auth-split { display: flex; min-height: 100vh; }
        .auth-left { width: 40%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 40px; background: linear-gradient(160deg, var(--bg) 0%, #0c1e2d 100%); border-right: 1px solid var(--border); }
        .auth-right { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; background: var(--bg); }
        @media (max-width: 768px) { .auth-left { display: none; } .auth-right { width: 100%; } }
      `}</style>

      <div className="auth-split">
        <div className="auth-left">
          <div style={{ maxWidth: 320, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
              <div style={{ width: 5, height: 32, background: 'var(--accent)', borderRadius: 3 }} />
              <span style={{ fontFamily: 'var(--font-space)', fontWeight: 700, fontSize: 26, color: 'var(--text)' }}>ShopDesk</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-space)', fontSize: 32, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>
              Almost back in
            </h2>
          </div>
        </div>

        <div className="auth-right">
          <div style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40, justifyContent: 'center' }}>
              <div style={{ width: 4, height: 24, background: 'var(--accent)', borderRadius: 2 }} />
              <span style={{ fontFamily: 'var(--font-space)', fontWeight: 700, fontSize: 22, color: 'var(--text)' }}>ShopDesk</span>
            </div>

            <Suspense fallback={<div style={{ color: 'var(--muted)' }}>Loading...</div>}>
              <ResetPasswordForm />
            </Suspense>

            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
              <Link href="/auth/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                ← Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--muted)',
  marginBottom: 6,
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
      <path d="M8 2A6 6 0 0114 8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}
