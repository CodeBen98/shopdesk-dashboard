# ShopDesk Dashboard

ShopDesk gives local service businesses (auto repair, HVAC, plumbing, salons and more) an **AI phone receptionist** that answers calls 24/7, answers questions about the business, and books appointments. This repo is the **owner-facing web app**: sign-up, guided onboarding, provisioning of the AI voice agent and phone number, and a dashboard for calls, bookings and customers.

The booking backend the voice agent calls during a live conversation lives in [`shopdesk-booking`](../shopdesk-booking).

## How it works

```
Caller ──► Twilio number ──► Vapi voice agent (AI receptionist)
                                   │  prompt built from the shop's profile
                                   ├──► shopdesk-booking (FastAPI) ──► Google Calendar, SMS, email
                                   └──► /api/vapi-webhook ──► Supabase (calls, bookings, customers)
                                                                 ▲
Shop owner ──► ShopDesk Dashboard (this app, Next.js) ───────────┘
```

1. **Onboarding wizard.** The owner pastes their website or connects their **Google Business Profile**. ShopDesk scrapes and summarises the business (hours, services, tone of voice) with Claude into a structured profile the owner reviews and edits.
2. **Provisioning.** ShopDesk buys a local **Twilio** number (matching the shop's area code), creates a **Vapi** voice assistant with a system prompt generated from the shop profile and industry template, and wires up the booking tools.
3. **Live calls.** The AI receptionist answers, captures caller details, books appointments through the booking service, and can transfer emergencies to the owner.
4. **Dashboard.** Call log with summaries, bookings, customers and settings. Changes to the profile re-sync to the voice agent.

## Features

- Email/password auth with Supabase, plus password reset
- Multi-step onboarding: website/GBP auto-fill, hours, services, voice selection, call forwarding, test call, go-live
- Industry templates (10+ verticals) that adapt intake questions, urgency triggers and "never claim" rules
- Prompt-injection sanitising of all owner-supplied text before it reaches the AI
- Signed Vapi webhooks (HMAC, constant-time comparison)
- Admin panel for provisioning, pausing, cancelling and deleting shops
- Transactional emails with Resend
- Row-level security on every table in Supabase
- Strict security headers (CSP, HSTS, frame-ancestors, etc.)

## Tech stack

| Area | Tools |
|---|---|
| Frontend / server | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Data and auth | Supabase (Postgres, Auth, RLS); SQL migrations in `supabase/` |
| Voice and telephony | Vapi (AI voice agent), Twilio (numbers, SMS) |
| AI | Anthropic Claude for business-profile synthesis; structured output validated with Zod |
| Integrations | Google Business Profile and Google Calendar (OAuth), Firecrawl, Google Places |
| Quality | ESLint, TypeScript strict mode, Vitest, GitHub Actions CI |
| Hosting | Vercel |

## Project structure

```
src/
  app/
    auth/              login, sign-up, password reset
    onboard/           onboarding wizard entry
    dashboard/         calls, bookings, customers, settings
    admin/             internal admin panel
    api/               provisioning, Vapi webhook, enrichment, Google OAuth, admin actions
  components/          UI, including onboarding/ (one component per wizard step)
  lib/
    shopPrompt.ts      builds the AI receptionist's system prompt and booking tools
    enrichment/        website and Google Business Profile harvesting + Claude synthesis
    industries/        per-industry templates
    supabase/          browser, server and admin clients
  lib/__tests__/       unit tests
supabase/
  schema.sql           tables and row-level security policies
  migrations/          incremental migrations
```

## Running locally

**Requirements:** Node.js 20+ and a Supabase project (the free tier works).

```bash
git clone <this repo>
cd shopdesk-dashboard
npm ci
cp .env.local.example .env.local   # then fill in your own keys
npm run dev                         # http://localhost:3000
```

Set up the database by running `supabase/schema.sql` and then the files in `supabase/migrations/` in your Supabase project. Voice, telephony and enrichment features need their own API keys (see `.env.local.example`); the app builds and the auth and dashboard pages run without them.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (Vitest) |

CI runs lint, typecheck, tests and a production build on every push and pull request.

## Security notes

- Secrets live only in environment variables (Vercel and Render in production); `.gitignore` blocks every `.env*` file except the example.
- Webhooks from Vapi are verified with an HMAC signature before any processing.
- All tables use row-level security, so owners can only read their own shop's data; privileged operations use the service role on the server only.

## Author

Built by **Slarve Benoit** ([@CodeBen98](https://github.com/CodeBen98)).
