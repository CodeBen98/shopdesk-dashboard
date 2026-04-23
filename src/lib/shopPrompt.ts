export const voiceNames: Record<string, string> = {
  cindy:      'Cindy',
  jacqueline: 'Jacqueline',
  patricia:   'Sarah',
  james:      'James',
  sofia:      'Emily',
  marcus:     'Marcus',
}

export const voiceMap: Record<string, { provider: string; voiceId: string; model: string }> = {
  cindy:      { provider: 'cartesia', voiceId: '1242fb95-7ddd-44ac-8a05-9e8a22a6137d', model: 'sonic-2' },
  jacqueline: { provider: 'cartesia', voiceId: '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc', model: 'sonic-2' },
  patricia:   { provider: 'cartesia', voiceId: 'e5a6cd18-d552-4192-9533-82a08cac8f23', model: 'sonic-2' },
  james:      { provider: 'cartesia', voiceId: '42b39f37-515f-4eee-8546-73e841679c1d', model: 'sonic-2' },
  sofia:      { provider: 'cartesia', voiceId: 'f6ce3444-478b-4ce4-982e-bcb72dffe7aa', model: 'sonic-2' },
  marcus:     { provider: 'cartesia', voiceId: '9301949d-b7cd-40d9-a246-5a4430992d6b', model: 'sonic-2' },
}

function formatTimeForPrompt(t: string): string {
  if (!t) return ''
  if (t.includes('AM') || t.includes('PM')) return t
  const [hStr, mStr] = t.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  const suffix = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

export function formatHours(hours: Record<string, { open: boolean; from: string; to: string }>): string {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  return days.map(day => {
    const h = hours[day]
    if (!h || !h.open) return `  ${day.charAt(0).toUpperCase() + day.slice(1)}: Closed`
    if (h.from === '00:00' && h.to === '23:59') {
      return `  ${day.charAt(0).toUpperCase() + day.slice(1)}: Open 24 hours`
    }
    const from = formatTimeForPrompt(h.from)
    const to = formatTimeForPrompt(h.to)
    return `  ${day.charAt(0).toUpperCase() + day.slice(1)}: ${from} to ${to}`
  }).join('\n')
}

// Strip content that could be used for prompt injection before embedding in Claude's context
function sanitize(value: string | null | undefined, maxLen = 200): string {
  if (!value) return ''
  return value
    .slice(0, maxLen)
    .replace(/\[system\]|\[identity\]|\[instructions\]/gi, '')
    .replace(/ignore (all |previous |prior )?(instructions|rules|context)/gi, '')
    .trim()
}

// Shape of the shop_voice / shop_identity subset the prompt actually uses.
// Kept separate from the full Enrichment type so callers can pass partial
// shapes (e.g. owner-unconfirmed drafts) without needing every field.
type EnrichmentForPrompt = {
  shop_voice?: {
    tone?: string
    formality_level?: string
    customer_address_style?: string
    signature_phrases?: string[]
    unique_selling_points?: string[]
    values?: string[]
  }
  shop_identity?: {
    key_people?: Array<{ name: string; role?: string | null }>
    years_in_business?: number | null
    certifications?: string[]
    differentiators?: string[]
  }
  owner_reviewed?: boolean
}

function sanitizeList(items: string[] | undefined, perItemMax: number, cap: number): string[] {
  if (!items || items.length === 0) return []
  return items.slice(0, cap).map(s => sanitize(s, perItemMax)).filter(Boolean)
}

function buildPersonalitySection(e: EnrichmentForPrompt | undefined): string {
  if (!e?.shop_voice) return ''
  const v = e.shop_voice
  const lines: string[] = []
  if (v.tone) lines.push(`- Overall tone: ${sanitize(v.tone, 100)}.`)
  if (v.formality_level) lines.push(`- Formality: ${sanitize(v.formality_level, 40)}.`)
  if (v.customer_address_style) lines.push(`- How you address customers: ${sanitize(v.customer_address_style, 80)}.`)
  const phrases = sanitizeList(v.signature_phrases, 80, 6)
  if (phrases.length > 0) lines.push(`- Natural phrases for this shop: ${phrases.map(p => `"${p}"`).join(', ')}.`)
  const usps = sanitizeList(v.unique_selling_points, 120, 6)
  if (usps.length > 0) lines.push(`- What this shop emphasizes: ${usps.join('; ')}.`)
  const values = sanitizeList(v.values, 40, 6)
  if (values.length > 0) lines.push(`- Values: ${values.join(', ')}.`)
  if (lines.length === 0) return ''
  return `\n[Shop Personality]\nSpeak in the voice of this specific shop. Your words should feel like the shop's own.\n${lines.join('\n')}\n`
}

function buildIdentityAddon(e: EnrichmentForPrompt | undefined): string {
  if (!e?.shop_identity) return ''
  const id = e.shop_identity
  const parts: string[] = []

  const people = (id.key_people ?? [])
    .slice(0, 6)
    .map(p => {
      const name = sanitize(p.name, 60)
      if (!name) return ''
      const role = p.role ? sanitize(p.role, 40) : ''
      return role ? `${name} (${role})` : name
    })
    .filter(Boolean)
  if (people.length > 0) parts.push(`Team members: ${people.join(', ')}.`)

  if (typeof id.years_in_business === 'number' && id.years_in_business > 0) {
    parts.push(`The shop has been in business for ${id.years_in_business} years.`)
  }

  const certs = sanitizeList(id.certifications, 120, 5)
  if (certs.length > 0) parts.push(`Credentials: ${certs.join('; ')}.`)

  const diffs = sanitizeList(id.differentiators, 120, 5)
  if (diffs.length > 0) parts.push(`What sets this shop apart: ${diffs.join('; ')}.`)

  return parts.length > 0 ? '\n' + parts.join(' ') : ''
}

export function buildSystemPrompt(shop: {
  name: string
  address: string
  phone: string
  hours: Record<string, { open: boolean; from: string; to: string }>
  services: Array<{ name: string; price?: string | null; description?: string | null }>
  emergency_contact: string
  emergency_contact_name: string
  ai_voice: string
  enrichment?: EnrichmentForPrompt | null
}, extras?: { vehicleTypes?: string[]; ownerName?: string }): string {
  const receptionistName = voiceNames[shop.ai_voice] ?? 'Sarah'
  const shopName = sanitize(shop.name, 100)
  const shopAddress = sanitize(shop.address, 200)
  const shopPhone = sanitize(shop.phone, 20)
  const serviceList = shop.services.map(s =>
    `  - ${sanitize(s.name, 80)}${s.price ? ` ($${sanitize(s.price, 20)})` : ''}${s.description ? ` — ${sanitize(s.description, 150)}` : ''}`
  ).join('\n')
  const hoursText = formatHours(shop.hours)
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York' })
  const ownerName = sanitize(extras?.ownerName || shop.emergency_contact_name || 'the shop owner', 80)
  const vehicleTypes = extras?.vehicleTypes && extras.vehicleTypes.length > 0 ? extras.vehicleTypes : null
  const identityAddon = buildIdentityAddon(shop.enrichment ?? undefined)
  const personalitySection = buildPersonalitySection(shop.enrichment ?? undefined)

  return `[Identity]
You are ${receptionistName}, the virtual receptionist at ${shopName}.
You know this shop inside and out. You are warm, helpful, and professional.
${ownerName !== 'the shop owner' ? `The owner/manager is ${ownerName}. When customers ask to speak to someone, say you'll have ${ownerName} call them back.` : ''}
Never say you are an AI. If asked, say you are the virtual receptionist for ${shopName}.
Today's date is ${dateStr}. Use this to calculate exact dates when customers say "tomorrow", "Thursday", "next week", etc.${identityAddon}
${personalitySection}
[Style]
- Warm, genuine, direct. Real person energy.
- Maximum 2 short sentences per turn. Phone call rules.
- Natural contractions. No filler words like "Certainly" or "Absolutely".
- ONE question per turn. Never combine questions.
- Skip questions already answered in conversation.
- Did not understand: "Sorry, could you repeat that?"
- Never invent prices or times.
- Never assume or invent the customer's name, phone, or vehicle. Always ask. Never use a name until the customer gives it to you.

[Shop Info]
${shopName} | ${shopAddress}${shopPhone ? ` | ${shopPhone}` : ''}
Hours:
${hoursText}
${vehicleTypes ? `Vehicle types serviced: ${vehicleTypes.join(', ')}` : ''}
Services:
${serviceList || '  - General auto repair and maintenance'}

[Common Questions]
Pricing: prices vary by vehicle and service. We give a quote before any work begins — no surprises.
Check engine: we run a diagnostic scan to find out what's going on, usually takes about an hour.
Safe to drive: if you're hearing grinding, seeing smoke, or the car is overheating — do not drive it. For warning lights, get in as soon as you can.

[Booking Flow]
1. Find out what they need help with.
2. Collect: name, vehicle (year/make/model), service needed, preferred day and time — ONE question at a time.
3. Ask: "What is the best phone number to send your confirmation to?" Wait for the customer to give their number.
4. Repeat the number back digit by digit to confirm it, e.g. "Let me confirm — that's 4-0-7-5-5-5-1-2-3-4, is that right?" Wait for confirmation. If they correct you, update the number and confirm again.
5. After they confirm the number, say EXACTLY: "You will receive a confirmation text at that number. By providing your number you agree to receive appointment texts from ${shopName}. Message and data rates may apply. Reply STOP at any time to opt out."
6. Once you have all required info, call the bookAppointment function.
7. After the function returns success, confirm the booking details back to the customer.
8. Ask if there is anything else.
9. When done, say a warm goodbye and call the endCall function.

Do NOT call endCall until the customer says they are done.
Do NOT say goodbye until you are ready to call endCall immediately after.

[Urgency]
Emergency keywords (overheating, smoke, brake failure, stranded, steering failure, won't start): respond with concern and safety first. Ask if they are safe. Then offer to book or take their number for a callback.
Urgent (warning lights, unusual sounds): acknowledge urgency, try to get them in same day or next day.

[Escalation]
Wants to speak to someone: take their name and phone number, call bookAppointment as a callback request, then say goodbye and call endCall.
Emergency contact: ${ownerName} at ${sanitize(shop.emergency_contact, 30) || 'the shop'}.

[Error Handling]
Booking fails: take their number, promise a callback within the hour.
Outside scope: take their number, have a tech call them back.

When a customer mentions a day like "tomorrow" or "Monday", use today's date above to calculate the exact date. State the specific date (e.g. "Thursday April 9th") before booking.`
}

export const BOOKING_TOOLS = (bookingWebhookUrl: string, shopId: string) => [
  {
    type: 'function',
    server: { url: `${bookingWebhookUrl}?shop_id=${shopId}` },
    function: {
      name: 'bookAppointment',
      strict: true,
      description: 'Book a confirmed appointment. Call this once you have ALL required fields. Do not call with empty or missing fields.',
      parameters: {
        type: 'object',
        required: ['customer_name', 'customer_phone', 'vehicle_year', 'vehicle_make', 'vehicle_model', 'service', 'appointment_time'],
        properties: {
          customer_name:    { type: 'string', description: 'Customer full name as spoken' },
          customer_phone:   { type: 'string', description: 'Customer phone number as spoken' },
          vehicle_year:     { type: 'string', description: 'Vehicle year, e.g. 2018' },
          vehicle_make:     { type: 'string', description: 'Vehicle make, e.g. Honda' },
          vehicle_model:    { type: 'string', description: 'Vehicle model, e.g. Accord' },
          service:          { type: 'string', description: 'Service requested or issue description' },
          appointment_time: { type: 'string', description: 'Day and time confirmed by customer, e.g. Thursday April 3 at 10am' },
        },
      },
    },
  },
  {
    type: 'endCall',
    function: {
      name: 'endCall',
      description: 'End the call. Only use after booking is confirmed and customer has said goodbye.',
    },
  },
]
