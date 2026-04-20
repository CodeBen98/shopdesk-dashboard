'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://app.shopdesk.site/auth/reset-password',
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
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
              <div style={{ width: 4, height: 32, background: 'var(--accent)', borderRadius: 2 }} />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 2 }}>
                <span style={{ fontFamily: 'var(--font-space)', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.02em', color: 'var(--text)' }}>SHOP</span>
                <span style={{ fontFamily: 'var(--font-space)', fontWeight: 500, fontSize: '0.88rem', letterSpacing: '0.04em', color: 'var(--muted)' }}>DESK</span>
              </div>
            </div>
            <h2 style={{ fontFamily: 'var(--font-space)', fontSize: 32, fontWeight: 800, color: 'var(--text)', lineHeight: 1.15, letterSpacing: '-0.5px', marginBottom: 32 }}>
              We&apos;ve got you covered
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.6 }}>
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </div>
        </div>

        <div className="auth-right">
          <div style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40, justifyContent: 'center' }}>
              <div style={{ width: 4, height: 28, background: 'var(--accent)', borderRadius: 2 }} />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 2 }}>
                <span style={{ fontFamily: 'var(--font-space)', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.02em', color: 'var(--text)' }}>SHOP</span>
                <span style={{ fontFamily: 'var(--font-space)', fontWeight: 500, fontSize: '0.78rem', letterSpacing: '0.04em', color: 'var(--muted)' }}>DESK</span>
              </div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px' }}>
              <h1 style={{ fontFamily: 'var(--font-space)', fontSize: 24, fontWeight: 800, marginBottom: 6, color: 'var(--text)', letterSpacing: '-0.3px' }}>
                Reset your password
              </h1>
              <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>
                Enter your email to receive a reset link
              </p>

              {error && (
                <div style={{ background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 14, color: 'var(--danger)' }}>
                  {error}
                </div>
              )}

              {success ? (
                <div style={{ background: 'rgba(15,118,149,0.1)', border: '1px solid var(--accent)', borderRadius: 8, padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 15, color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}>Check your email</p>
                  <p style={{ fontSize: 14, color: 'var(--text-mid)' }}>We sent a reset link to <strong>{email}</strong></p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@yourshop.com"
                      required
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      style={inputStyle('email')}
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
                    {loading ? 'Sending...' : 'Send reset link'}
                  </button>
                </form>
              )}
            </div>

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
