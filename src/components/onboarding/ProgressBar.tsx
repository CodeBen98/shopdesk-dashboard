'use client'

const TEAL = '#0F7695'

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const percent = (currentStep / totalSteps) * 100

  return (
    <div style={{ padding: '16px 24px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ maxWidth: '512px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>
            Step {currentStep} of {totalSteps}
          </span>
          <span style={{ fontSize: '14px', color: TEAL, fontWeight: 600 }}>
            {Math.round(percent)}%
          </span>
        </div>
        <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${percent}%`,
              background: TEAL,
              borderRadius: '9999px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>
    </div>
  )
}
