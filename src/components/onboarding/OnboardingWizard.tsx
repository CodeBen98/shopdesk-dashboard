'use client'

import { useState } from 'react'
import { Shop, OnboardingStep } from '@/types'
import { ProgressBar } from './ProgressBar'
import { StepShopInfo } from './StepShopInfo'
import { StepHours } from './StepHours'
import { StepServices } from './StepServices'
import { StepEmergency } from './StepEmergency'
import { StepCalendar } from './StepCalendar'
import { StepVoice } from './StepVoice'
import { StepProvision } from './StepProvision'
import { StepForwarding } from './StepForwarding'
import { StepTestCall } from './StepTestCall'
import { StepGoLive } from './StepGoLive'

const STEPS: OnboardingStep[] = [
  'shop_info', 'hours', 'services', 'emergency', 'calendar',
  'voice', 'provision', 'forwarding', 'test_call', 'go_live',
]

export interface StepProps {
  shop: Shop | null
  userId: string
  onNext: () => void
  onShopUpdate: (updated: Partial<Shop>) => void
}

interface OnboardingWizardProps {
  shop: Shop | null
  userId: string
}

export function OnboardingWizard({ shop, userId }: OnboardingWizardProps) {
  const initialStep: OnboardingStep = shop?.onboarding_step ?? 'shop_info'
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(initialStep)
  const [shopData, setShopData] = useState<Shop | null>(shop)

  const stepIndex = STEPS.indexOf(currentStep)

  function onNext() {
    const nextIndex = stepIndex + 1
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex])
    }
  }

  function onShopUpdate(updated: Partial<Shop>) {
    setShopData(prev => prev ? { ...prev, ...updated } : (updated as Shop))
  }

  const commonProps: StepProps = { shop: shopData, userId, onNext, onShopUpdate }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <ProgressBar currentStep={stepIndex + 1} totalSteps={10} />
      <div style={{ padding: '40px 16px' }}>
        {currentStep === 'shop_info' && <StepShopInfo {...commonProps} />}
        {currentStep === 'hours' && <StepHours {...commonProps} />}
        {currentStep === 'services' && <StepServices {...commonProps} />}
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
