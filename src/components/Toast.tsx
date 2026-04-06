'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

type ToastType = 'success' | 'error' | 'warning'

interface ToastItem {
  id: number
  message: string
  type: ToastType
  leaving: boolean
}

let addToastGlobal: ((message: string, type: ToastType) => void) | null = null

export function Toast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counterRef = useRef(0)

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 300)
  }, [])

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = ++counterRef.current
    setToasts(prev => [...prev, { id, message, type, leaving: false }])
    setTimeout(() => removeToast(id), 3000)
  }, [removeToast])

  useEffect(() => {
    addToastGlobal = addToast
    return () => { addToastGlobal = null }
  }, [addToast])

  const colorMap: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
    success: { bg: 'var(--success-dim)', border: 'var(--success)', text: 'var(--success)', icon: '✓' },
    error: { bg: 'var(--danger-dim)', border: 'var(--danger)', text: 'var(--danger)', icon: '✕' },
    warning: { bg: 'var(--warning-dim)', border: 'var(--warning)', text: 'var(--warning)', icon: '!' },
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      pointerEvents: 'none',
    }}>
      {toasts.map(toast => {
        const colors = colorMap[toast.type]
        return (
          <div
            key={toast.id}
            style={{
              background: 'var(--card-raised)',
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              minWidth: 260,
              maxWidth: 360,
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              animation: toast.leaving ? 'slideOutRight 0.3s ease forwards' : 'slideInRight 0.3s ease forwards',
              pointerEvents: 'auto',
            }}
          >
            <span style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              color: colors.text,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}>
              {colors.icon}
            </span>
            <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500, flex: 1 }}>
              {toast.message}
            </span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: '2px 4px',
                fontSize: 16,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}

export function useToast() {
  const show = useCallback((message: string, type: ToastType = 'success') => {
    if (addToastGlobal) {
      addToastGlobal(message, type)
    }
  }, [])

  return { show }
}
