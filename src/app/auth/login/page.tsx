'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setShowOverlay(true)
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 800)
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    } else {
      setShowOverlay(true)
    }
  }

  function inputStyle(field: string): React.CSSProperties {
    return {
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
    }
  }

  return (
    <>
      <style>{`
        .auth-split { display: flex; min-height: 100vh; }
        .auth-left { width: 40%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 40px; background: linear-gradient(160deg, var(--bg) 0%, #0c1e2d 100%); border-right: 1px solid var(--border); position: relative; overflow: hidden; }
        .auth-right { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; background: var(--bg); background-image: radial-gradient(circle at 20% 50%, rgba(15,118,149,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(15,118,149,0.03) 0%, transparent 40%); }
        @media (max-width: 768px) {
          .auth-left { display: none; }
          .auth-right { width: 100%; }
        }
      `}</style>

      {/* Full-page success overlay */}
      {showOverlay && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'var(--bg)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 4, height: 26, background: 'var(--accent)', borderRadius: 2 }} />
            <span style={{ fontFamily: 'var(--font-space)', fontWeight: 700, fontSize: 24, color: 'var(--text)' }}>
              ShopDesk
            </span>
          </div>
          <p style={{ fontSize: 15, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            Taking you to your dashboard
            <span style={{ display: 'inline-flex', gap: 3 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: 'var(--muted)',
                  animation: `dotPulse 1.4s ${i * 0.2}s infinite ease-in-out`,
                }} />
              ))}
            </span>
          </p>
        </div>
      )}

      <div className="auth-split">
        {/* Left brand panel */}
        <div className="auth-left">
          <div style={{ maxWidth: 320, width: '100%' }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
              <div style={{ width: 5, height: 32, background: 'var(--accent)', borderRadius: 3 }} />
              <span style={{ fontFamily: 'var(--font-space)', fontWeight: 700, fontSize: 26, color: 'var(--text)' }}>
                ShopDesk
              </span>
            </div>

            {/* Tagline */}
            <h2 style={{ fontFamily: 'var(--font-space)', fontSize: 32, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2, marginBottom: 20 }}>
              See every saved call in one place
            </h2>

            {/* Proof points */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 48 }}>
              {[
                'Review recordings, transcripts, and caller details',
                'See which calls booked and which ones did not',
                'Update hours, services, forwarding, and voice settings',
              ].map(point => (
                <div key={point} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'var(--accent-dim)',
                    border: '1px solid var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 700 }}>✓</span>
                  </div>
                  <span style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.4 }}>{point}</span>
                </div>
              ))}
            </div>

            {/* Social proof */}
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
              Built for independent auto repair shops that want a clear operational dashboard, not another generic SaaS inbox.
            </p>
          </div>
        </div>

        {/* Right form panel */}
        <div className="auth-right">
          <div style={{ width: '100%', maxWidth: 420, animation: 'fadeIn 0.3s ease' }}>

            {/* Mobile-only logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40, justifyContent: 'center' }}>
              <div style={{ width: 4, height: 24, background: 'var(--accent)', borderRadius: 2 }} />
              <span style={{ fontFamily: 'var(--font-space)', fontWeight: 700, fontSize: 22, color: 'var(--text)' }}>
                ShopDesk
              </span>
            </div>

            {/* Card */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '32px',
            }}>
              <h1 style={{ fontFamily: 'var(--font-space)', fontSize: 22, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
                Welcome back
              </h1>
              <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>
                Sign in to review calls, bookings, and your live setup
              </p>

              {error && (
                <div style={{
                  background: 'var(--danger-dim)',
                  border: '1px solid var(--danger)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 20,
                  fontSize: 14,
                  color: 'var(--danger)',
                }}>
                  {error}
                </div>
              )}

              {/* Google */}
              <button
                onClick={handleGoogle}
                disabled={googleLoading || loading}
                className="auth-btn-primary"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  background: 'var(--card)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8,
                  padding: '14px 16px',
                  fontSize: 15,
                  fontWeight: 500,
                  color: 'var(--text)',
                  cursor: (googleLoading || loading) ? 'not-allowed' : 'pointer',
                  marginBottom: 20,
                  transition: 'border-color 0.15s, opacity 0.15s, box-shadow 0.15s',
                  opacity: (googleLoading || loading) ? 0.7 : 1,
                }}
              >
                {googleLoading ? <Spinner /> : <GoogleIcon />}
                {googleLoading ? 'Loading...' : 'Continue with Google'}
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.05em' }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

                <div>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      style={{ ...inputStyle('password'), paddingRight: 42 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      style={{
                        position: 'absolute', right: 12, top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none',
                        color: 'var(--muted)', cursor: 'pointer',
                        padding: 0, display: 'flex',
                      }}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  <div style={{ textAlign: 'right', marginTop: 6 }}>
                    <Link href="/auth/forgot-password" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="auth-btn-primary"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '13px',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: (loading || googleLoading) ? 'not-allowed' : 'pointer',
                    marginTop: 4,
                    opacity: (loading || googleLoading) ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'opacity 0.15s, box-shadow 0.15s',
                    fontFamily: 'inherit',
                  }}
                >
                  {loading && <Spinner />}
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            </div>

            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                Create one
              </Link>
            </p>

            <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--muted)' }}>
              <Link href="https://shopdesk.site" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
                ← Back to shopdesk.site
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

function EyeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <path d="M1 8.5S4 3.5 8.5 3.5 16 8.5 16 8.5s-3 5-7.5 5S1 8.5 1 8.5z" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="8.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <path d="M2 2l13 13M7 4.2A7.4 7.4 0 018.5 4C13 4 16 8.5 16 8.5a13 13 0 01-2 2.6M9.9 12.7A7.3 7.3 0 018.5 13C4 13 1 8.5 1 8.5a13 13 0 013-3.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M6.6 6.6a2 2 0 002.8 2.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
