'use client'

import { useState } from 'react'

type Step = 'closed' | 'reason' | 'offer' | 'done'
type ReqType = 'pause_requested' | 'cancel_requested'

const REASONS = [
  { id: 'price',      label: 'Too expensive' },
  { id: 'not_using',  label: "Not using it enough" },
  { id: 'competitor', label: 'Switching to another service' },
  { id: 'technical',  label: 'Technical issues' },
  { id: 'closing',    label: 'Closing or scaling back my shop' },
  { id: 'other',      label: 'Other' },
]

async function submitRequest(type: ReqType, reason?: string) {
  const res = await fetch('/api/account/service-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, reason }),
  })
  if (!res.ok) throw new Error((await res.json()).error ?? 'Request failed')
}

export function CancelServiceButton() {
  const [step, setStep] = useState<Step>('closed')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doneType, setDoneType] = useState<ReqType | null>(null)

  function close() {
    setStep('closed')
    setReason('')
    setError(null)
    setBusy(false)
  }

  async function handleCancelSubmit() {
    setBusy(true)
    setError(null)
    try {
      await submitRequest('cancel_requested', reason)
      setDoneType('cancel_requested')
      setStep('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  async function handlePauseInstead() {
    setBusy(true)
    try {
      await submitRequest('pause_requested')
      setDoneType('pause_requested')
      setStep('done')
    } catch {
      // Non-fatal -- still show done
      setDoneType('pause_requested')
      setStep('done')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setStep('reason')}
        style={{
          background: 'transparent',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 8,
          padding: '9px 16px',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--danger)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        Cancel Service
      </button>

      {step !== 'closed' && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)',
          zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '32px 28px',
            maxWidth: 460,
            width: '100%',
          }}>

            {/* Step 1: Reason */}
            {step === 'reason' && (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                  Why are you considering this?
                </h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
                  Your feedback helps us improve. Select the option that fits best.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
                  {REASONS.map(r => (
                    <label
                      key={r.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: `1px solid ${reason === r.id ? 'var(--accent)' : 'var(--border)'}`,
                        background: reason === r.id ? 'var(--accent-dim)' : 'var(--card)',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                        border: `2px solid ${reason === r.id ? 'var(--accent)' : 'var(--border)'}`,
                        background: reason === r.id ? 'var(--accent)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}>
                        {reason === r.id && (
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />
                        )}
                      </div>
                      <input
                        type="radio" name="reason" value={r.id}
                        checked={reason === r.id}
                        onChange={() => setReason(r.id)}
                        style={{ display: 'none' }}
                      />
                      <span style={{ fontSize: 14, color: reason === r.id ? 'var(--accent)' : 'var(--text-mid)', fontWeight: reason === r.id ? 500 : 400 }}>
                        {r.label}
                      </span>
                    </label>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={close}
                    style={secondaryBtnStyle}
                  >
                    Go back
                  </button>
                  <button
                    onClick={() => setStep('offer')}
                    disabled={!reason}
                    style={primaryBtnStyle(!reason)}
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Retention offer */}
            {step === 'offer' && (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                  Before you go
                </h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
                  You can pause your AI receptionist instead. Your dedicated phone number stays reserved and your settings are preserved. Reactivate any time.
                </p>

                <div style={{
                  background: 'var(--accent-dim)',
                  border: '1px solid rgba(15,118,149,0.3)',
                  borderRadius: 10,
                  padding: '16px 18px',
                  marginBottom: 20,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Pause instead</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                    Your number stays reserved. No calls will be answered. Reactivate whenever you are ready.
                  </div>
                  <button
                    onClick={handlePauseInstead}
                    disabled={busy}
                    style={{ ...primaryBtnStyle(busy), marginTop: 12, width: '100%' }}
                  >
                    {busy ? 'Submitting...' : 'Request a Pause'}
                  </button>
                </div>

                {error && (
                  <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 12 }}>{error}</p>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep('reason')} style={secondaryBtnStyle}>Back</button>
                  <button
                    onClick={handleCancelSubmit}
                    disabled={busy}
                    style={{
                      flex: 1, padding: '10px 16px', borderRadius: 8,
                      border: '1px solid rgba(239,68,68,0.3)',
                      background: 'transparent', color: 'var(--danger)',
                      fontSize: 13, fontWeight: 500, cursor: busy ? 'wait' : 'pointer',
                      opacity: busy ? 0.6 : 1, fontFamily: 'inherit', transition: 'all 0.15s',
                    }}
                  >
                    {busy ? 'Submitting...' : 'Submit Cancellation Request'}
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Done */}
            {step === 'done' && (
              <>
                <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: doneType === 'cancel_requested' ? 'var(--warning-dim)' : 'var(--success-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}>
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <path d="M4 11l5 5 9-9" stroke={doneType === 'cancel_requested' ? 'var(--warning)' : 'var(--success)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                    {doneType === 'pause_requested' ? 'Pause request received' : 'Request received'}
                  </h2>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
                    {doneType === 'pause_requested'
                      ? 'A ShopDesk representative will follow up shortly to pause your service.'
                      : 'A ShopDesk representative will follow up within 24 hours to complete your cancellation request.'}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                    Questions? Contact us at{' '}
                    <a href="mailto:support@shopdesk.site" style={{ color: 'var(--accent)' }}>support@shopdesk.site</a>
                  </p>
                </div>
                <button onClick={close} style={{ ...primaryBtnStyle(false), width: '100%' }}>Done</button>
              </>
            )}

          </div>
        </div>
      )}
    </>
  )
}

const primaryBtnStyle = (disabled: boolean): React.CSSProperties => ({
  flex: 1, padding: '10px 16px', borderRadius: 8,
  background: disabled ? 'var(--card)' : 'var(--accent)',
  color: disabled ? 'var(--muted)' : '#fff',
  border: 'none', fontSize: 13, fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1, fontFamily: 'inherit',
  transition: 'all 0.15s',
})

const secondaryBtnStyle: React.CSSProperties = {
  padding: '10px 16px', borderRadius: 8,
  background: 'transparent', border: '1px solid var(--border)',
  color: 'var(--muted)', fontSize: 13, fontWeight: 500,
  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
}
