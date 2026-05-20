'use client'

import { useState } from 'react'
import { Shop, OnboardingStep } from '@/types'
import { ProgressBar } from './ProgressBar'
import { StepShopInfo } from './StepShopInfo'
import { StepAutoFillChoice } from './StepAutoFillChoice'
import { StepAutoFillReview } from './StepAutoFillReview'
import { StepHours } from './StepHours'
import { StepVoice } from './StepVoice'
import { StepProvision } from './StepProvision'
import { StepForwarding } from './StepForwarding'

const STEPS: OnboardingStep[] = [
  'shop_info', 'auto_fill_choice', 'auto_fill_review',
  'hours', 'voice', 'provision', 'forwarding',
]

// These are the steps that appear in the numbered progress bar
const DISPLAY_STEPS: OnboardingStep[] = [
  'shop_info', 'hours', 'voice', 'provision', 'forwarding',
]

// Old step values that no longer exist in the trimmed flow
const LEGACY_STEPS = new Set([
  'plan_selection', 'welcome', 'services', 'notifications',
  'emergency', 'calendar', 'test_call', 'go_live',
])

export interface StepProps {
  shop: Shop | null
  userId: string
  onNext: () => void
  onBack?: () => void
  onSkipTo: (step: OnboardingStep) => void
  onShopUpdate: (updated: Partial<Shop>) => void
}

interface OnboardingWizardProps {
  shop: Shop | null
  userId: string
}

export function OnboardingWizard({ shop, userId }: OnboardingWizardProps) {
  const stored = shop?.onboarding_step as OnboardingStep | null
  const initialStep: OnboardingStep =
    stored && STEPS.includes(stored) && !LEGACY_STEPS.has(stored)
      ? stored
      : 'shop_info'

  const [currentStep, setCurrentStep] = useState<OnboardingStep>(initialStep)
  const [shopData, setShopData] = useState<Shop | null>(shop)

  const STEP_NAMES: Record<string, string> = {
    shop_info:        'Your Business',
    auto_fill_choice: 'Auto-Fill',
    auto_fill_review: 'Review Info',
    hours:            'Business Hours',
    voice:            'AI Voice',
    provision:        'Setting Up',
    forwarding:       'Activate & Go Live',
  }

  const stepIndex = STEPS.indexOf(currentStep)
  const displayStepIndex = DISPLAY_STEPS.indexOf(currentStep)
  const displayStep = displayStepIndex >= 0 ? displayStepIndex + 1 : (() => {
    for (let i = stepIndex - 1; i >= 0; i--) {
      const idx = DISPLAY_STEPS.indexOf(STEPS[i])
      if (idx >= 0) return idx + 1
    }
    return 1
  })()

  function onNext() {
    const nextIndex = stepIndex + 1
    if (nextIndex < STEPS.length) setCurrentStep(STEPS[nextIndex])
  }

  function onBack() {
    const prevIndex = stepIndex - 1
    if (prevIndex >= 0) setCurrentStep(STEPS[prevIndex])
  }

  function onSkipTo(step: OnboardingStep) {
    setCurrentStep(step)
  }

  function onShopUpdate(updated: Partial<Shop>) {
    setShopData(prev => prev ? { ...prev, ...updated } : (updated as Shop))
  }

  const commonProps: StepProps = { shop: shopData, userId, onNext, onBack, onSkipTo, onShopUpdate }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <ProgressBar currentStep={displayStep} totalSteps={5} stepName={STEP_NAMES[currentStep]} />
      <div className="onboard-content" style={{ padding: '40px 16px' }}>
        {currentStep === 'shop_info'        && <StepShopInfo {...commonProps} />}
        {currentStep === 'auto_fill_choice' && <StepAutoFillChoice {...commonProps} />}
        {currentStep === 'auto_fill_review' && <StepAutoFillReview {...commonProps} />}
        {currentStep === 'hours'            && <StepHours {...commonProps} />}
        {currentStep === 'voice'            && <StepVoice {...commonProps} />}
        {currentStep === 'provision'        && <StepProvision {...commonProps} />}
        {currentStep === 'forwarding'       && <StepForwarding {...commonProps} />}
      </div>
    </div>
  )
}
