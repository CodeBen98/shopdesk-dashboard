'use client'

import { useState } from 'react'
import { Shop, OnboardingStep } from '@/types'
import { ProgressBar } from './ProgressBar'
import { WelcomeStep } from './WelcomeStep'
import { StepShopInfo } from './StepShopInfo'
import { StepAutoFillChoice } from './StepAutoFillChoice'
import { StepAutoFillReview } from './StepAutoFillReview'
import { StepHours } from './StepHours'
import { StepServices } from './StepServices'
import { StepNotifications } from './StepNotifications'
import { StepEmergency } from './StepEmergency'
import { StepCalendar } from './StepCalendar'
import { StepVoice } from './StepVoice'
import { StepProvision } from './StepProvision'
import { StepForwarding } from './StepForwarding'
import { StepTestCall } from './StepTestCall'
import { StepGoLive } from './StepGoLive'
import { PlanSelectionStep } from './PlanSelectionStep'

const STEPS: OnboardingStep[] = [
  'plan_selection', 'welcome', 'shop_info', 'auto_fill_choice', 'auto_fill_review',
  'hours', 'services', 'notifications', 'emergency',
  'calendar', 'voice', 'provision', 'forwarding', 'test_call', 'go_live',
]

// Steps that count toward the visible progress bar
const DISPLAY_STEPS: OnboardingStep[] = [
  'plan_selection', 'welcome', 'shop_info', 'hours', 'services', 'notifications', 'emergency',
  'calendar', 'voice', 'provision', 'forwarding', 'test_call', 'go_live',
]

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
  const initialStep: OnboardingStep = shop?.onboarding_step ?? 'plan_selection'
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(initialStep)
  const [shopData, setShopData] = useState<Shop | null>(shop)

  const STEP_NAMES: Record<string, string> = {
    plan_selection: 'Choose Your Plan',
    welcome: 'Welcome',
    shop_info: 'Your Shop',
    auto_fill_choice: 'Auto-Fill',
    auto_fill_review: 'Review Info',
    hours: 'Business Hours',
    services: 'Services',
    notifications: 'Alert Number',
    emergency: 'Breakdown Contact',
    calendar: 'Google Calendar',
    voice: 'AI Voice',
    provision: 'Setting Up',
    forwarding: 'Call Forwarding',
    test_call: 'Test Call',
    go_live: 'Go Live',
  }

  const stepIndex = STEPS.indexOf(currentStep)
  const displayStepIndex = DISPLAY_STEPS.indexOf(currentStep)
  // For steps not in DISPLAY_STEPS (auto_fill_choice, auto_fill_review), show the
  // same number as the nearest preceding display step
  const displayStep = displayStepIndex >= 0 ? displayStepIndex + 1 : (() => {
    for (let i = stepIndex - 1; i >= 0; i--) {
      const idx = DISPLAY_STEPS.indexOf(STEPS[i])
      if (idx >= 0) return idx + 1
    }
    return 1
  })()

  function onNext() {
    const nextIndex = stepIndex + 1
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex])
    }
  }

  function onBack() {
    const prevIndex = stepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex])
    }
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
      <ProgressBar currentStep={displayStep} totalSteps={13} stepName={STEP_NAMES[currentStep]} />
      <div className="onboard-content" style={{ padding: '40px 16px' }}>
        {currentStep === 'plan_selection' && <PlanSelectionStep {...commonProps} />}
        {currentStep === 'welcome' && <WelcomeStep {...commonProps} />}
        {currentStep === 'shop_info' && <StepShopInfo {...commonProps} />}
        {currentStep === 'auto_fill_choice' && <StepAutoFillChoice {...commonProps} />}
        {currentStep === 'auto_fill_review' && <StepAutoFillReview {...commonProps} />}
        {currentStep === 'hours' && <StepHours {...commonProps} />}
        {currentStep === 'services' && <StepServices {...commonProps} />}
        {currentStep === 'notifications' && <StepNotifications {...commonProps} />}
        {currentStep === 'emergency' && <StepEmergency {...commonProps} />}
        {currentStep === 'calendar' && <StepCalendar {...commonProps} />}
        {currentStep === 'voice' && <StepVoice {...commonProps} />}
        {currentStep === 'provision' && <StepProvision {...commonProps} />}
        {currentStep === 'forwarding' && <StepForwarding {...commonProps} />}
        {currentStep === 'test_call' && <StepTestCall {...commonProps} />}
        {currentStep === 'go_live' && <StepGoLive {...commonProps} />}
      </div>
    </div>
  )
}
