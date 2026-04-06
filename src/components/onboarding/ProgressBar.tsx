'use client'

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const percent = (currentStep / totalSteps) * 100

  return (
    <>
      <style>{`
        .progress-bar-root {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          height: 64px;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          padding: 0 24px;
          gap: 16px;
        }
        .progress-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          text-decoration: none;
        }
        .progress-circles {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
        }
        .progress-step-text {
          flex-shrink: 0;
          font-size: 13px;
          color: var(--muted);
          white-space: nowrap;
        }
        .progress-mobile-bar {
          display: none;
        }
        @media (max-width: 768px) {
          .progress-bar-root {
            height: 52px;
            padding: 0 16px;
          }
          .progress-circles {
            display: none;
          }
          .progress-mobile-bar {
            display: flex;
            flex: 1;
            flex-direction: column;
            gap: 4px;
          }
          .progress-mobile-track {
            height: 3px;
            background: var(--border);
            border-radius: 9999px;
            overflow: hidden;
          }
        }
      `}</style>
      <div className="progress-bar-root">
        {/* Logo */}
        <div className="progress-logo">
          <div style={{ width: 4, height: 20, background: 'var(--accent)', borderRadius: 2, flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-space)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
            ShopDesk
          </span>
        </div>

        {/* Desktop: step circles */}
        <div className="progress-circles">
          {Array.from({ length: totalSteps }, (_, i) => {
            const stepNum = i + 1
            const isCompleted = stepNum < currentStep
            const isCurrent = stepNum === currentStep
            const isFuture = stepNum > currentStep

            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                {/* Connecting line before (not for first) */}
                {i > 0 && (
                  <div style={{
                    width: 20,
                    height: 2,
                    background: isCompleted || isCurrent ? 'var(--accent)' : 'var(--border)',
                    transition: 'background 0.3s',
                  }} />
                )}
                {/* Circle */}
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: 11,
                  fontWeight: 700,
                  transition: 'background 0.3s, border-color 0.3s',
                  ...(isCompleted ? {
                    background: 'var(--accent)',
                    border: '2px solid var(--accent)',
                    color: '#fff',
                  } : isCurrent ? {
                    background: 'transparent',
                    border: '2px solid var(--accent)',
                    color: 'var(--accent)',
                  } : {
                    background: 'var(--card)',
                    border: '2px solid var(--border)',
                    color: 'var(--muted)',
                  }),
                }}>
                  {isCompleted ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    stepNum
                  )}
                </div>
                {/* Connecting line after (not for last) */}
                {i < totalSteps - 1 && (
                  <div style={{
                    width: 20,
                    height: 2,
                    background: isCompleted ? 'var(--accent)' : 'var(--border)',
                    transition: 'background 0.3s',
                  }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Mobile: text + thin bar */}
        <div className="progress-mobile-bar">
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Step {currentStep} of {totalSteps}</span>
          <div className="progress-mobile-track">
            <div style={{
              height: '100%',
              width: `${percent}%`,
              background: 'var(--accent)',
              borderRadius: 9999,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* Desktop: step label */}
        <span className="progress-step-text">Step {currentStep} of {totalSteps}</span>
      </div>
      {/* Spacer so content doesn't go under fixed bar */}
      <div style={{ height: 64 }} />
    </>
  )
}
