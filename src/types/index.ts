export type Shop = {
  id: string
  owner_id: string
  name: string
  address: string
  phone: string
  email: string | null
  hours: ShopHours
  services: Service[]
  emergency_contact: string
  emergency_contact_name: string
  twilio_number: string | null
  vapi_agent_id: string | null
  google_calendar_id: string | null
  ai_voice: string
  status: 'onboarding' | 'live' | 'paused'
  plan: 'trial' | 'starter' | 'professional' | 'growth'
  trial_ends_at: string | null
  created_at: string
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
  | 'shop_info'
  | 'hours'
  | 'services'
  | 'emergency'
  | 'calendar'
  | 'voice'
  | 'provision'
  | 'forwarding'
  | 'test_call'
  | 'go_live'
