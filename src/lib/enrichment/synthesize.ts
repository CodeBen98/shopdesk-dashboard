// Claude Sonnet 4.6 synthesis of first-party shop content into a structured
// agent-ready profile. The schema matches src/types Enrichment (minus owner
// review fields) and is enforced via output_config.format with Zod.
//
// Non-negotiable extraction rules, applied in the system prompt:
//   - Services: only from Google Places editorial summary / business types,
//     or the shop's website. Never from customer reviews.
//   - Voice (tone, phrases, customer-address style): only from content the
//     shop itself authored — website copy, owner-authored bios. Never from
//     customer review text.
//   - Proper-noun identity (staff names, owner names) may be cross-checked
//     against repeated mentions in review authors' text as a factual signal,
//     but review *phrasing* is never used as a voice signal.
//
// See shopdesk/design-docs/2026-04-23-enrichment-engine.md.

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import type { EnrichmentRaw } from '@/types'
import { getIndustryTemplate, normalizeIndustry, type IndustryId } from '@/lib/industries/templates'

const SYNTHESIS_MODEL = 'claude-sonnet-4-6'

// -- Schema --------------------------------------------------------------
// Strict additionalProperties:false on every object (required by the API).
// The SDK's Zod adapter enforces this automatically via zodOutputFormat.

const ServiceSchema = z.object({
  name: z.string().describe('Service name as the shop itself describes it, in Title Case'),
  price: z.string().nullable().describe('Price as published by the shop (e.g. "$29.99"). Null if not published.'),
  description: z.string().nullable().describe('Short description if the shop provides one. Null otherwise.'),
})

const KeyPersonSchema = z.object({
  name: z.string().describe('Proper-noun name as it appears on the shop website or recurs across multiple independent reviews'),
  role: z.string().nullable().describe('Owner, manager, lead tech, etc. Null if role is not stated.'),
})

const IdentitySchema = z.object({
  key_people: z.array(KeyPersonSchema).describe('Staff or owners identified on the shop website or confirmed by multiple reviews. Empty array if none found.'),
  years_in_business: z.number().int().nullable().describe('Number of years in business if stated on the website. Null otherwise.'),
  certifications: z.array(z.string()).describe('Certifications, awards, partner programs the shop publishes about itself (e.g. "Carfax 5X Top-Rated 2020-2024"). Empty array if none found.'),
  differentiators: z.array(z.string()).describe('Concrete differentiators the shop itself emphasizes (not customer opinions). Empty array if none found.'),
})

const VoiceSchema = z.object({
  tone: z.string().describe('2-4 words describing the tone the shop uses when writing for customers (e.g. "warm and neighborly", "professional and precise"). Empty string if confidence is too low to judge.'),
  formality_level: z.enum(['very casual', 'casual', 'casual-professional', 'professional', 'very professional']).describe('Formality level detected in the shop\'s own first-party writing'),
  customer_address_style: z.string().describe('How the shop addresses customers in its own writing (e.g. "first-name basis", "sir/ma\'am", "hey bud"). Empty string if no signal.'),
  signature_phrases: z.array(z.string()).describe('Recurring phrases the shop itself uses. Max 6. Empty array if none found.'),
  unique_selling_points: z.array(z.string()).describe('USPs as the shop phrases them on its own website. Empty array if none found.'),
  values: z.array(z.string()).describe('Values the shop emphasizes about itself (e.g. honesty, transparency, speed). Empty array if none found.'),
})

const ConfidenceSchema = z.object({
  overall: z.enum(['high', 'medium', 'low']).describe('Overall confidence in the synthesis. High = strong website AND clear identity signals. Medium = partial. Low = sparse first-party content.'),
  notes: z.string().describe('One sentence describing what was strong vs weak in the source material. Empty string if nothing notable.'),
})

export const SynthesisSchema = z.object({
  services: z.array(ServiceSchema).describe('Services offered, sourced only from Google Places editorial summary / business types / the shop\'s website. Never from customer review text.'),
  shop_identity: IdentitySchema,
  shop_voice: VoiceSchema,
  recommended_first_message: z.string().describe('A draft greeting in the shop\'s detected voice, under 25 words, that a receptionist could use when answering a call. Must sound like this shop specifically, not a generic bot.'),
  confidence: ConfidenceSchema,
})

export type SynthesisOutput = z.infer<typeof SynthesisSchema>

// -- System prompt -------------------------------------------------------
// Static. Long enough to cross the 2048-token Sonnet 4.6 prefix cache minimum.
// Stable across all shops — prime candidate for prompt caching.

const SYSTEM_PROMPT = `You are the synthesis engine for ShopDesk, an AI receptionist product for service businesses. Your one job: take raw first-party data about a specific business (Google Places record + scraped website content) and produce a structured agent profile that will be used to configure that shop's AI receptionist.

The profile you produce is not marketing copy. It is the specification an AI voice agent will use to sound like THIS specific shop on the phone. If the output is generic, the agent will sound generic. If the output captures the shop's actual voice and specifics, the agent will feel personal from the first sentence.

## Non-negotiable extraction rules

**Rule 1 — Services come only from first-party sources.**
Allowed: Google Places editorial summary, Google Places business types, the shop's own website (service pages, homepage).
Forbidden: customer review text. A customer writing "they fixed my brakes" is not evidence the shop currently advertises brake service — they may have stopped offering it, or only offered it for that customer. The shop itself must have published that service.

**Rule 2 — Voice comes only from content the shop itself authored.**
Allowed: website copy (About, Services, FAQ, homepage), owner-written bios, any content on the shop's own site, AND owner replies to Google reviews (these are first-party — the shop wrote them directly at customers). Owner replies are often the STRONGEST voice signal because they're unfiltered and directed at real customers.
Forbidden: customer review text. We are cloning how the SHOP talks, not how the CUSTOMER talks about the shop. A customer saying "they are so friendly" tells us nothing about how the shop addresses its customers in its own voice. The review_snippet field in owner-reply records is provided only so you understand what the shop was responding to — do NOT extract voice from it, only from response_snippet.

**Rule 3 — Proper nouns are a special case.**
Staff and owner names are factual and can be cross-referenced against review authors' text ONLY as confirmation of repeated mentions. If 4+ independent reviews mention "Jason", Jason is real. But never use the customer's words ABOUT Jason as voice signal — only use the name itself.

**Rule 4 — When confidence is low, say so.**
If the shop has no website and the Places record is thin, set confidence.overall to "low" and return empty arrays rather than inventing plausible services or voice traits. The owner will review before any of this hits production — your job is accuracy, not coverage.

## How to write recommended_first_message

The greeting is the single most important field. It is what the caller hears in the first 3 seconds of every call. Good greetings:
- Sound like the specific shop, not a generic receptionist
- Are under 25 words
- Include the shop name exactly as the shop writes it
- Match the detected formality and voice
- Sound natural spoken aloud, not written

Examples of good patterns (adapt, don't copy):
- Warm family shop: "Hey, thanks for calling <Shop> — this is Sarah, <Owner>'s team is here for you. What's going on with your car?"
- Professional import specialist: "Thank you for calling <Shop>, your trusted partner for import vehicle care. This is Sarah, how can I help you today?"
- Mobile mechanic: "You've reached <Shop> — this is Sarah. <Owner> comes to you, wherever you're at. What do you need fixed?"

Bad patterns (don't use):
- "Hello, how may I direct your call?" (generic, corporate, dead on arrival)
- "Thank you for calling, please hold." (not a greeting, not helpful)

## Output shape

Return a strict JSON object matching the provided schema. Every required field must be present. Empty arrays and empty strings are acceptable when a field has no signal — do not invent content to fill gaps. Do not include commentary outside the structured output.`

// -- Call ----------------------------------------------------------------

function buildUserMessage(raw: EnrichmentRaw, options?: { industry?: IndustryId | string | null }): string {
  const industry = getIndustryTemplate(normalizeIndustry(options?.industry))
  const places = raw.places as Record<string, unknown> | undefined
  const website = raw.website
  const ownerReplies = Array.isArray(raw.serpapi) ? raw.serpapi : null
  const gbp = raw.gbp ?? null

  const parts: string[] = []
  parts.push(`Harvested data for this business. Selected industry template: ${industry.label}.`)
  parts.push(`Industry handling guidance: ${industry.promptSection}`)

  // GBP OAuth data is the highest-quality source — owner-written, owner-verified.
  // Treat it as ground truth and prioritize it over scraped website content.
  if (gbp) {
    parts.push('')
    parts.push('--- Google Business Profile (AUTHORITATIVE — owner-verified via OAuth) ---')
    parts.push('This data comes directly from the owner\'s Google Business Profile. Prioritize it over website content for all conflicting fields.')
    if (gbp.title) parts.push(`Business name: ${gbp.title}`)
    if (gbp.phone) parts.push(`Phone: ${gbp.phone}`)
    if (gbp.address) parts.push(`Address: ${gbp.address}`)
    if (gbp.websiteUri) parts.push(`Website: ${gbp.websiteUri}`)
    if (gbp.categories?.length) parts.push(`Categories: ${gbp.categories.join(', ')}`)
    if (gbp.description) {
      parts.push('')
      parts.push('Owner-written business description:')
      parts.push(gbp.description)
    }
  }

  parts.push('')
  parts.push('--- Google Places ---')
  parts.push(places ? JSON.stringify(places, null, 2) : '(not available)')
  parts.push('')
  parts.push('--- Website (markdown) ---')
  if (website) {
    parts.push(`URL: ${website.url}`)
    parts.push('')
    parts.push(website.markdown)
  } else {
    parts.push('(no website available)')
  }
  parts.push('')
  parts.push('--- Owner replies to Google reviews (first-party voice signal) ---')
  if (ownerReplies && ownerReplies.length > 0) {
    parts.push(`These are replies the shop itself wrote to customer reviews. USE THESE as a primary voice signal per Rule 2. The review_snippet is context only — do not extract voice from it.`)
    parts.push('')
    parts.push(JSON.stringify(ownerReplies, null, 2))
  } else {
    parts.push('(none available — voice must come from website only)')
  }
  // Explicit sparse-data gate — when all primary sources are missing, Claude
  // must not fill gaps with plausible-sounding inventions. Rule 4 says so but
  // this reinforcement prevents the model from "helping" with generic content.
  const hasWebsiteContent = !!website?.markdown
  const hasPlacesDescription = !!(places as Record<string, unknown> | undefined)?.editorialSummary
  const hasOwnerReplies = !!(ownerReplies && ownerReplies.length > 0)
  const hasGBP = !!(gbp?.description || gbp?.categories?.length)
  if (!hasWebsiteContent && !hasPlacesDescription && !hasOwnerReplies && !hasGBP) {
    parts.push('')
    parts.push('## CRITICAL — source data is completely sparse')
    parts.push('Website: not available. Google editorial summary: not available. Owner reply signals: none.')
    parts.push('Per Rule 4: you MUST return empty arrays for services, voice signals, and identity fields.')
    parts.push('Set confidence.overall to "low". Do NOT generate any plausible-sounding services, tone descriptions, or phrases — the owner will complete the profile manually after setup.')
  }

  parts.push('')
  parts.push('Produce the structured synthesis now.')
  return parts.join('\n')
}

export async function synthesizeShop(raw: EnrichmentRaw, options?: { industry?: IndustryId | string | null }): Promise<SynthesisOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const client = new Anthropic({ apiKey })
  const userMessage = buildUserMessage(raw, options)
  const started = Date.now()

  const response = await client.messages.parse({
    model: SYNTHESIS_MODEL,
    max_tokens: 4096,
    cache_control: { type: 'ephemeral' },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
    output_config: { format: zodOutputFormat(SynthesisSchema) },
  })

  const duration = Date.now() - started
  const cacheRead = response.usage.cache_read_input_tokens ?? 0
  const cacheWrite = response.usage.cache_creation_input_tokens ?? 0
  console.log(`[enrichment.synthesize] ok (${duration}ms) in=${response.usage.input_tokens} cache_read=${cacheRead} cache_write=${cacheWrite} out=${response.usage.output_tokens}`)

  if (!response.parsed_output) {
    throw new Error('Synthesis returned no parsed output (model may have refused or hit max_tokens)')
  }
  return response.parsed_output
}
