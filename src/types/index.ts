import type { IndustryId } from '@/lib/industries/templates'

export type Shop = {
  id: string
  owner_id: string
  name: string
  address: string
  phone: string
  email: string | null
  industry: IndustryId | null
  industry_config: Record<string, unknown>
  hours: ShopHours
  services: Service[]
  emergency_contact: string
  emergency_contact_name: string
  twilio_number: string | null
  vapi_agent_id: string | null
  google_calendar_id: string | null
  google_refresh_token: string | null
  ai_voice: string
  status: 'onboarding' | 'live' | 'paused' | 'pause_requested' | 'cancel_requested' | 'cancelling' | 'cancelled' | 'deleted'
  cancel_reason: string | null
  cancel_requested_at: string | null
  cancelled_at: string | null
  deleted_at: string | null
  plan: 'trial' | 'starter' | 'professional' | 'growth'
  plan_tier: 'starter' | 'pro' | 'growth'
  is_founding_member: boolean
  trial_started_at: string
  trial_ends_at: string | null
  onboarding_complete: boolean
  onboarding_step: OnboardingStep
  sms_consent: boolean
  owner_phone: string | null
  owner_phone_sms_consent: boolean
  enrichment_raw: EnrichmentRaw | null
  enrichment: Enrichment | null
  enriched_at: string | null
  created_at: string
}

export type EnrichmentRaw = {
  places?: unknown             // Google Places API v1 raw response
  website?: { url: string; markdown: string } | null
  serpapi?: unknown | null     // Reserved for v1.1 (owner replies, GBP services)
  harvested_at: string
}

export type Enrichment = {
  services: Array<{ name: string; price: string | null; description: string | null }>
  shop_identity: {
    key_people: Array<{ name: string; role: string | null }>
    years_in_business: number | null
    certifications: string[]
    differentiators: string[]
  }
  shop_voice: {
    tone: string
    formality_level: 'very casual' | 'casual' | 'casual-professional' | 'professional' | 'very professional'
    customer_address_style: string
    signature_phrases: string[]
    unique_selling_points: string[]
    values: string[]
  }
  recommended_first_message: string
  confidence: {
    overall: 'high' | 'medium' | 'low'
    notes: string
  }
  synthesized_at: string
  owner_reviewed: boolean
  owner_reviewed_at: string | null
}

export type ShopHours = {
  monday: DayHours
  tuesday: DayHours
  wednesday: DayHours
  thursday: DayHours
  friday: DayHours
  saturday: DayHours
  sunday: DayHours
}

export type DayHours = {
  open: boolean
  from: string // e.g. "08:00"
  to: string   // e.g. "17:00"
}

export type Service = {
  name: string
  price: string | null
  description: string | null
}

export type Call = {
  id: string
  shop_id: string
  caller_phone: string
  caller_name: string | null
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  outcome: 'booked' | 'info_only' | 'missed' | 'emergency' | 'voicemail'
  transcript: string | null
  recording_url: string | null
  vapi_call_id: string | null
  created_at: string
}

export type Booking = {
  id: string
  shop_id: string
  call_id: string | null
  customer_name: string
  customer_phone: string
  vehicle: string | null
  service: string | null
  appointment_at: string
  notes: string | null
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  sms_sent: boolean
  created_at: string
}

export type Customer = {
  id: string
  shop_id: string
  name: string
  phone: string
  vehicle: string | null
  last_visit: string | null
  visit_count: number
  created_at: string
}

export type JobStatus = {
  id: string
  shop_id: string
  customer_name: string
  customer_phone: string
  vehicle: string
  status: 'in_progress' | 'ready_for_pickup'
  notes: string | null
  updated_at: string
  created_at: string
}

export type OnboardingStep =
  | 'plan_selection'
  | 'welcome'
  | 'shop_info'
  | 'auto_fill_choice'
  | 'auto_fill_review'
  | 'hours'
  | 'services'
  | 'notifications'
  | 'emergency'
  | 'calendar'
  | 'voice'
  | 'provision'
  | 'forwarding'
  | 'test_call'
  | 'go_live'
