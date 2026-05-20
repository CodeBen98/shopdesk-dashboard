export type IndustryId =
  | 'auto_repair'
  | 'hvac'
  | 'plumbing'
  | 'roofing'
  | 'landscaping'
  | 'towing'
  | 'salon_spa'
  | 'pet_grooming'
  | 'cleaning'
  | 'real_estate'
  | 'other'

export type IndustryTemplate = {
  id: IndustryId
  label: string
  shortDescription: string
  serviceExamples: string[]
  serviceSuggestions: string[]
  intakeFields: Array<{
    key: string
    label: string
    required: boolean
    promptInstruction?: string
  }>
  urgencyTriggers: string[]
  commonQuestions: string[]
  disallowedClaims: string[]
  promptSection: string
}

export const DEFAULT_INDUSTRY: IndustryId = 'other'

export const INDUSTRY_TEMPLATES: Record<IndustryId, IndustryTemplate> = {
  auto_repair: {
    id: 'auto_repair',
    label: 'Auto repair',
    shortDescription: 'Vehicle repair shops, mechanics, and maintenance garages.',
    serviceExamples: ['Oil changes', 'Brake repair', 'Diagnostics', 'AC repair', 'Tire service'],
    serviceSuggestions: ['Oil Change', 'Brake Service', 'Tire Rotation', 'Engine Diagnostics', 'AC Repair', 'Transmission Service', 'Battery Replacement', 'Wheel Alignment', 'Suspension', 'Exhaust'],
    intakeFields: [
      { key: 'name', label: 'Customer name', required: true },
      { key: 'phone', label: 'Phone number', required: true },
      { key: 'vehicle', label: 'Vehicle year, make, and model', required: true },
      { key: 'issue', label: 'Vehicle issue or requested service', required: true },
      { key: 'preferred_time', label: 'Preferred appointment time', required: true },
    ],
    urgencyTriggers: ['vehicle will not start', 'brake failure', 'overheating', 'smoke', 'unsafe to drive', 'accident damage'],
    commonQuestions: ['hours', 'location', 'pricing', 'appointment availability', 'diagnostic fees', 'tow-in options'],
    disallowedClaims: ['Do not diagnose the exact repair without inspection.', 'Do not quote final repair prices unless the business provided them.'],
    promptSection: 'Ask for the vehicle year, make, and model before booking when the caller needs repair or maintenance. Capture the issue in plain language and avoid diagnosing beyond general triage.',
  },
  hvac: {
    id: 'hvac',
    label: 'HVAC',
    shortDescription: 'Heating, cooling, air conditioning, and ventilation contractors.',
    serviceExamples: ['AC repair', 'Heating repair', 'Tune-ups', 'Install estimates', 'Indoor air quality'],
    serviceSuggestions: ['AC Repair', 'Heating Repair', 'System Tune-Up', 'New Installation', 'Duct Cleaning', 'Thermostat Service', 'Emergency Service', 'Maintenance Plan'],
    intakeFields: [
      { key: 'name', label: 'Customer name', required: true },
      { key: 'phone', label: 'Phone number', required: true },
      { key: 'address', label: 'Service address', required: true },
      { key: 'system_type', label: 'System type', required: false },
      { key: 'issue', label: 'Heating or cooling issue', required: true },
    ],
    urgencyTriggers: ['no cooling', 'no heat', 'burning smell', 'electrical smell', 'water leak', 'elderly or infant in home'],
    commonQuestions: ['service area', 'same-day availability', 'diagnostic fee', 'maintenance plans'],
    disallowedClaims: ['Do not promise same-day repair unless availability is confirmed.', 'Do not give electrical safety advice beyond escalation.'],
    promptSection: 'Capture the service address, heating or cooling issue, system type if known, and whether the situation is urgent before booking.',
  },
  plumbing: {
    id: 'plumbing',
    label: 'Plumbing',
    shortDescription: 'Residential and commercial plumbing services.',
    serviceExamples: ['Leak repair', 'Drain cleaning', 'Water heater repair', 'Fixture installation', 'Emergency plumbing'],
    serviceSuggestions: ['Drain Cleaning', 'Leak Repair', 'Water Heater Repair', 'Fixture Installation', 'Toilet Repair', 'Pipe Repair', 'Emergency Service', 'Sewer Line'],
    intakeFields: [
      { key: 'name', label: 'Customer name', required: true },
      { key: 'phone', label: 'Phone number', required: true },
      { key: 'address', label: 'Service address', required: true },
      { key: 'issue', label: 'Plumbing issue', required: true },
      { key: 'active_leak', label: 'Active leak or flooding', required: false },
    ],
    urgencyTriggers: ['active leak', 'flooding', 'sewer backup', 'no water', 'burst pipe', 'water heater leaking'],
    commonQuestions: ['emergency availability', 'service area', 'diagnostic fee', 'water shutoff basics'],
    disallowedClaims: ['Do not instruct risky repairs. Tell callers with flooding or sewage backup that the team should contact them urgently.'],
    promptSection: 'Ask whether there is active leaking, flooding, or sewage backup. Capture the address and issue clearly for dispatch.',
  },
  roofing: {
    id: 'roofing',
    label: 'Roofing',
    shortDescription: 'Roof repair, replacement, inspection, and leak calls.',
    serviceExamples: ['Roof repair', 'Leak inspection', 'Replacement estimate', 'Storm damage', 'Gutter service'],
    serviceSuggestions: ['Roof Repair', 'Leak Inspection', 'Storm Damage', 'Replacement Estimate', 'Gutter Service', 'Skylight Repair', 'Roof Inspection', 'Emergency Tarping'],
    intakeFields: [
      { key: 'name', label: 'Customer name', required: true },
      { key: 'phone', label: 'Phone number', required: true },
      { key: 'address', label: 'Property address', required: true },
      { key: 'issue', label: 'Roofing issue', required: true },
      { key: 'leak', label: 'Active leak', required: false },
    ],
    urgencyTriggers: ['active leak', 'storm damage', 'tree impact', 'ceiling collapse', 'water entering home'],
    commonQuestions: ['inspection availability', 'insurance claims', 'estimate timing', 'service area'],
    disallowedClaims: ['Do not promise insurance coverage outcomes.', 'Do not tell callers to climb on the roof.'],
    promptSection: 'Capture the property address, issue, and whether water is actively entering the building. Never suggest climbing onto the roof.',
  },
  landscaping: {
    id: 'landscaping',
    label: 'Landscaping',
    shortDescription: 'Lawn care, landscaping, maintenance, and outdoor services.',
    serviceExamples: ['Lawn care', 'Landscape design', 'Tree trimming', 'Irrigation', 'Cleanup'],
    serviceSuggestions: ['Lawn Mowing', 'Landscape Design', 'Tree Trimming', 'Irrigation Service', 'Cleanup', 'Sod Installation', 'Fertilization', 'Mulching'],
    intakeFields: [
      { key: 'name', label: 'Customer name', required: true },
      { key: 'phone', label: 'Phone number', required: true },
      { key: 'address', label: 'Property address', required: true },
      { key: 'service', label: 'Service needed', required: true },
      { key: 'frequency', label: 'One-time or recurring', required: false },
    ],
    urgencyTriggers: ['storm cleanup', 'fallen tree blocking access', 'irrigation flooding'],
    commonQuestions: ['service area', 'recurring pricing', 'estimate scheduling', 'property size'],
    disallowedClaims: ['Do not quote exact prices unless provided by the business.'],
    promptSection: 'Capture the property address, service needed, and whether the caller wants one-time or recurring service.',
  },
  towing: {
    id: 'towing',
    label: 'Towing',
    shortDescription: 'Towing, roadside assistance, and vehicle transport.',
    serviceExamples: ['Local towing', 'Roadside assistance', 'Jump starts', 'Lockouts', 'Vehicle transport'],
    serviceSuggestions: ['Local Tow', 'Long Distance Tow', 'Jump Start', 'Lockout Service', 'Flat Tire', 'Fuel Delivery', 'Winch Out', 'Vehicle Transport'],
    intakeFields: [
      { key: 'name', label: 'Customer name', required: true },
      { key: 'phone', label: 'Phone number', required: true },
      { key: 'vehicle', label: 'Vehicle', required: true },
      { key: 'pickup_location', label: 'Pickup location', required: true },
      { key: 'destination', label: 'Destination', required: false },
    ],
    urgencyTriggers: ['stranded on highway', 'accident', 'unsafe location', 'child or pet locked in car'],
    commonQuestions: ['ETA', 'pricing', 'service area', 'payment methods'],
    disallowedClaims: ['Do not promise an ETA unless dispatch provided one. Escalate unsafe roadside situations.'],
    promptSection: 'Capture exact pickup location, destination if known, vehicle, and whether the caller is in a safe place.',
  },
  salon_spa: {
    id: 'salon_spa',
    label: 'Salon and spa',
    shortDescription: 'Hair salons, barbers, nail salons, medspa-lite, and wellness studios.',
    serviceExamples: ['Haircut', 'Color', 'Nails', 'Facials', 'Massage'],
    serviceSuggestions: ['Haircut', 'Color Treatment', 'Highlights', 'Blowout', 'Facial', 'Massage', 'Manicure', 'Pedicure', 'Nail Art', 'Waxing'],
    intakeFields: [
      { key: 'name', label: 'Customer name', required: true },
      { key: 'phone', label: 'Phone number', required: true },
      { key: 'service', label: 'Service', required: true },
      { key: 'provider', label: 'Preferred provider', required: false },
      { key: 'preferred_time', label: 'Preferred appointment time', required: true },
    ],
    urgencyTriggers: ['same-day request', 'wedding or event timing', 'allergic reaction'],
    commonQuestions: ['pricing', 'availability', 'provider schedule', 'cancellation policy'],
    disallowedClaims: ['Do not provide medical advice for reactions. Escalate health concerns.'],
    promptSection: 'Capture requested service, provider preference if any, and preferred appointment window before booking.',
  },
  pet_grooming: {
    id: 'pet_grooming',
    label: 'Pet grooming',
    shortDescription: 'Pet grooming, bathing, trimming, and grooming salons.',
    serviceExamples: ['Bath', 'Full groom', 'Nail trim', 'De-shedding', 'Breed-specific cuts'],
    serviceSuggestions: ['Full Groom', 'Bath Only', 'Nail Trim', 'De-shedding', 'Teeth Brushing', 'Ear Cleaning', 'Breed Cut', 'Puppy Package'],
    intakeFields: [
      { key: 'name', label: 'Customer name', required: true },
      { key: 'phone', label: 'Phone number', required: true },
      { key: 'pet', label: 'Pet type and breed', required: true },
      { key: 'service', label: 'Service needed', required: true },
      { key: 'notes', label: 'Temperament or health notes', required: false },
    ],
    urgencyTriggers: ['injury', 'severe matting', 'aggressive behavior concerns', 'medical condition'],
    commonQuestions: ['pricing by breed', 'vaccination requirements', 'availability', 'drop-off timing'],
    disallowedClaims: ['Do not give veterinary advice. Escalate medical concerns to the owner/team.'],
    promptSection: 'Capture pet type, breed, grooming service, and any temperament or health notes.',
  },
  cleaning: {
    id: 'cleaning',
    label: 'Cleaning services',
    shortDescription: 'House cleaning, office cleaning, move-out cleaning, and recurring service.',
    serviceExamples: ['Standard clean', 'Deep clean', 'Move-out clean', 'Office cleaning', 'Recurring cleaning'],
    serviceSuggestions: ['Standard Clean', 'Deep Clean', 'Move-Out Clean', 'Move-In Clean', 'Office Cleaning', 'Post-Construction Clean', 'Recurring Service'],
    intakeFields: [
      { key: 'name', label: 'Customer name', required: true },
      { key: 'phone', label: 'Phone number', required: true },
      { key: 'address', label: 'Service address', required: true },
      { key: 'property_size', label: 'Property size', required: false },
      { key: 'service', label: 'Cleaning service', required: true },
    ],
    urgencyTriggers: ['same-day turnover', 'biohazard', 'flood cleanup', 'unsafe conditions'],
    commonQuestions: ['pricing', 'recurring plans', 'availability', 'supplies', 'service area'],
    disallowedClaims: ['Do not accept hazardous cleanup unless the business explicitly offers it.'],
    promptSection: 'Capture address, cleaning type, property size if known, and preferred schedule.',
  },
  real_estate: {
    id: 'real_estate',
    label: 'Real estate',
    shortDescription: 'Agents, property managers, leasing offices, and real estate teams.',
    serviceExamples: ['Buyer inquiry', 'Seller consultation', 'Showing request', 'Rental inquiry', 'Property management'],
    serviceSuggestions: ['Buyer Consultation', 'Seller Consultation', 'Showing Request', 'Rental Inquiry', 'Property Management', 'Investment Property'],
    intakeFields: [
      { key: 'name', label: 'Customer name', required: true },
      { key: 'phone', label: 'Phone number', required: true },
      { key: 'intent', label: 'Buying, selling, renting, or management', required: true },
      { key: 'area', label: 'Property address or area', required: false },
      { key: 'timeline', label: 'Timeline', required: false },
    ],
    urgencyTriggers: ['locked out tenant', 'active leak', 'no AC', 'safety issue', 'showing today'],
    commonQuestions: ['availability', 'property details', 'showing times', 'application process'],
    disallowedClaims: ['Do not give legal, lending, or fair-housing advice. Escalate sensitive questions.'],
    promptSection: 'Capture caller intent, target property or area, timeline, and best callback details. Escalate legal, lending, or compliance questions.',
  },
  other: {
    id: 'other',
    label: 'Service business',
    shortDescription: 'Any service business not listed above.',
    serviceExamples: [],
    serviceSuggestions: [],
    intakeFields: [
      { key: 'name', label: 'Customer name', required: true },
      { key: 'phone', label: 'Phone number', required: true },
      { key: 'request', label: 'How can we help you?', required: true },
      { key: 'preferred_time', label: 'Preferred time', required: false },
    ],
    urgencyTriggers: ['caller safety', 'urgent situation', 'explicit request for human'],
    commonQuestions: ['hours', 'services offered', 'pricing', 'availability'],
    disallowedClaims: ['Do not invent prices, availability, or service guarantees.'],
    promptSection: 'Adapt to whatever this business does. Capture the caller\'s name, phone number, and what they need. Ask clarifying questions as needed. One question at a time.',
  },
}

export function normalizeIndustry(value: string | null | undefined): IndustryId {
  if (value && value in INDUSTRY_TEMPLATES) return value as IndustryId
  return 'other'
}

export function getIndustryTemplate(value: string | null | undefined): IndustryTemplate {
  return INDUSTRY_TEMPLATES[normalizeIndustry(value)]
}
