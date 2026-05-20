'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepProps } from './OnboardingWizard'

type PlanTier = 'starter' | 'pro' | 'growth'

const PLANS: {
  tier: PlanTier
  name: string
  foundingPrice: number
  regularPrice: number
  minutes: string
  overage: string
  features: string[]
  popular?: boolean
}[] = [
  {
    tier: 'starter',
    name: 'Starter',
    foundingPrice: 79,
    regularPrice: 99,
    minutes: '150 min/month',
    overage: '$0.50/min overage',
    features: [
      'AI answers every unanswered call 24/7',
      'Google Calendar booking',
      'Call log + transcripts + recordings',
      'SMS confirmation to every caller',
      '4 AI voice options',
      'Email alerts on every booking',
    ],
  },
  {
    tier: 'pro',
    name: 'Pro',
    foundingPrice: 159,
    regularPrice: 199,
    minutes: '400 min/month',
    overage: '$0.45/min overage',
    popular: true,
    features: [
      'Everything in Starter',
      'Priority support',
      'Advanced call analytics',
      'Dedicated onboarding assistance',
    ],
  },
  {
    tier: 'growth',
    name: 'Growth',
    foundingPrice: 319,
    regularPrice: 399,
    minutes: '1,000 min/month',
    overage: '$0.40/min overage',
    features: [
      'Everything in Pro',
      'Multi-location up to 3 shops',
      'Dedicated onboarding call',
      'Custom AI voice',
    ],
  },
]

export function PlanSelectionStep({ userId, onNext, onShopUpdate }: StepProps) {
  const [selected, setSelected] = useState<PlanTier | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSelect(tier: PlanTier) {
    setSelected(tier)
    setError('')
    setLoading(true)

    const supabase = createClient()
    const now = new Date()
    const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    const { error: saveErr } = await supabase
      .from('shops')
      .update({
        plan_tier: tier,
        is_founding_member: true,
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnds.toISOString(),
        onboarding_step: 'welcome',
      })
      .eq('owner_id', userId)

    if (saveErr) {
      setError('Failed to save plan. Please try again.')
      setLoading(false)
      return
    }

    onShopUpdate({
      plan_tier: tier,
      is_founding_member: true,
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEnds.toISOString(),
    })
    setLoading(false)
    onNext()
  }

  return (
    <div style={outerWrap}>
      <style>{`
        .plan-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 24px; }
        @media (max-width: 860px) { .plan-grid { grid-template-columns: 1fr; max-width: 480px; margin-left: auto; margin-right: auto; } }
      `}</style>
      {/* Founding member banner */}
      <div style={banner}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="#f59e0b" strokeWidth="1.4"/>
            <path d="M5 7V5a3 3 0 016 0v2" stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        <span style={bannerText}>
          <strong>Founding Member Pricing, Limited Spots.</strong> Lock in these rates forever. Prices increase when early access ends.
        </span>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={heading}>Choose your plan</h1>
        <p style={subheading}>Start your 14-day free trial today. No credit card required.</p>
      </div>

      {/* Plan cards */}
      <div className="plan-grid">
        {PLANS.map((plan) => {
          const isSelected = selected === plan.tier
          const isPro = plan.popular

          return (
            <div
              key={plan.tier}
              style={{
                ...card,
                border: isPro
                  ? `2px solid #0F7695`
                  : isSelected
                  ? `2px solid #0F7695`
                  : '2px solid var(--border)',
                background: isPro ? 'var(--card-raised)' : 'var(--surface)',
                position: 'relative',
              }}
            >
              {isPro && (
                <div style={popularBadge}>Most Popular</div>
              )}

              <div style={planName}>{plan.name}</div>

              <div style={priceRow}>
                <span style={foundingPrice}>${plan.foundingPrice}<span style={perMo}>/mo</span></span>
                <span style={regularPrice}>${plan.regularPrice}/mo</span>
              </div>

              <div style={callsLabel}>{plan.minutes}</div>
              <div style={overageLabel}>{plan.overage}</div>

              <div style={divider} />

              <ul style={featureList}>
                {plan.features.map((f) => (
                  <li key={f} style={featureItem}>
                    <span style={checkIcon}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {error && isSelected && (
                <p style={errorStyle}>{error}</p>
              )}

              <button
                onClick={() => handleSelect(plan.tier)}
                disabled={loading && selected === plan.tier}
                className="step-btn-primary"
                style={{
                  width: '100%',
                  marginTop: 24,
                  padding: '13px 0',
                  opacity: loading && selected !== plan.tier ? 0.5 : 1,
                }}
              >
                {loading && selected === plan.tier ? 'Saving...' : 'Start Free Trial'}
              </button>
            </div>
          )
        })}
      </div>

      <p style={footnote}>14-day free trial · No credit card required · Cancel anytime</p>
    </div>
  )
}

const outerWrap: React.CSSProperties = {
  maxWidth: 1000,
  margin: '0 auto',
  animation: 'card-enter 0.35s ease',
}

const banner: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  background: 'rgba(245,158,11,0.12)',
  border: '1px solid rgba(245,158,11,0.35)',
  borderRadius: 10,
  padding: '12px 18px',
  marginBottom: 32,
}

const bannerText: React.CSSProperties = {
  fontSize: 14,
  color: '#f59e0b',
  lineHeight: 1.5,
}

const heading: React.CSSProperties = {
  fontFamily: 'var(--font-space)',
  fontSize: 'clamp(1.8rem, 4vw, 2.4rem)' as string,
  fontWeight: 800,
  color: 'var(--text)',
  marginBottom: 8,
  letterSpacing: '-0.5px',
  lineHeight: 1.15,
}

const subheading: React.CSSProperties = {
  fontSize: 15,
  color: 'var(--muted)',
}


const card: React.CSSProperties = {
  borderRadius: 14,
  padding: '28px 24px 24px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
  display: 'flex',
  flexDirection: 'column',
  transition: 'border-color 0.15s',
}

const popularBadge: React.CSSProperties = {
  position: 'absolute',
  top: -13,
  left: '50%',
  transform: 'translateX(-50%)',
  background: '#0F7695',
  color: '#fff',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  padding: '3px 12px',
  borderRadius: 9999,
  whiteSpace: 'nowrap',
}

const planName: React.CSSProperties = {
  fontFamily: 'var(--font-space)',
  fontSize: 18,
  fontWeight: 700,
  color: 'var(--text)',
  marginBottom: 12,
}

const priceRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 10,
  marginBottom: 4,
}

const foundingPrice: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 800,
  color: '#0F7695',
  lineHeight: 1,
}

const perMo: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 500,
  color: '#0F7695',
}

const regularPrice: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--muted)',
  textDecoration: 'line-through',
}

const callsLabel: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text-mid)',
  fontWeight: 500,
  marginBottom: 4,
}

const overageLabel: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--muted)',
  marginBottom: 16,
}

const divider: React.CSSProperties = {
  height: 1,
  background: 'var(--border)',
  marginBottom: 16,
}

const featureList: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  flex: 1,
}

const featureItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  fontSize: 13,
  color: 'var(--text-mid)',
  lineHeight: 1.4,
}

const checkIcon: React.CSSProperties = {
  color: '#0F7695',
  fontWeight: 700,
  flexShrink: 0,
  fontSize: 12,
  marginTop: 1,
}

const footnote: React.CSSProperties = {
  textAlign: 'center',
  fontSize: 13,
  color: 'var(--muted)',
}

const errorStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--danger)',
  marginTop: 8,
}
