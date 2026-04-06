Build a complete multi-step onboarding wizard for this Next.js 14 / TypeScript / Tailwind / Supabase app.

The onboarding wizard lives at `/onboard` route. After signup, if `onboarding_complete = false` on the shop record, redirect to `/onboard`. The middleware already handles auth — add onboarding redirect logic.

## The 10 Steps (in order)

OnboardingStep type is already defined in src/types/index.ts:
shop_info → hours → services → emergency → calendar → voice → provision → forwarding → test_call → go_live

### Step 1: shop_info
Fields: shop name (required), address, phone, email
Save to: shops table (name, address, phone, email)

### Step 2: hours
Weekly schedule — Mon-Sun. Each day: toggle open/closed, from/to time pickers.
Default: Mon-Fri 8am-5pm open, Sat-Sun closed.
Save to: shops.hours (jsonb)

### Step 3: services
Add services the shop offers. Each service: name (required), price (optional), description (optional).
UI: list of service cards, "+ Add Service" button, remove button on each.
Preloaded suggestions (clickable chips to add fast): Oil Change, Brake Service, Tire Rotation, Engine Diagnostics, AC Repair, Transmission Service, Alignment, Battery Replacement
Save to: shops.services (jsonb array)

### Step 4: emergency
Emergency contact — who gets alerted if a caller says "overheating", "stranded", "brakes failed", etc.
Fields: emergency_contact_name, emergency_contact (phone number)
Save to: shops table

### Step 5: calendar
Google Calendar integration. Show a "Connect Google Calendar" button that initiates OAuth.
For now: placeholder UI with button that says "Connect Google Calendar" (we will wire the OAuth later).
If they skip: show "Skip for now" link, set google_calendar_id = null, proceed.

### Step 6: voice
Pick AI voice. Show 4 voice options as cards:
- Patricia (Warm & Professional) — default
- James (Calm & Authoritative)
- Sofia (Friendly & Energetic)
- Marcus (Direct & Trustworthy)
Each card: name, description, a play button (placeholder, no audio yet).
Save to: shops.ai_voice

### Step 7: provision
Automated step, no user input. Show animated progress:
"Building your shop profile..." -> "Configuring AI voice..." -> "Setting up phone routing..." -> "Almost ready..."
Each stage ~1 second with setTimeout. Auto-advance when done.
Save: shops.onboarding_step = "forwarding", shops.vapi_agent_id = "pending"

### Step 8: forwarding
Show the shop their dedicated number (shops.twilio_number — if null show "(407) 555-0123" as demo).
Instructions:
1. Go to your phone carrier settings (or call them)
2. Set up "Forward unanswered calls" to: [their number] (big, copyable)
3. Test it by calling your shop number and not answering
Confirmation checkbox "I have set up forwarding" before Next button activates.

### Step 9: test_call
"Make a test call." Show the number. Instructions: "Call your shop number right now. Let it ring 4 times without answering. Your AI receptionist should pick up."
Two buttons: "It worked! 🎉" advances to go_live. "I had a problem" stays on same step and shows: "Email us at support@shopdesk.ai and we will sort it out within the hour."

### Step 10: go_live
Celebration screen. "You are live!"
Show summary: shop name, phone number, AI voice selected.
Big teal button "Go to Dashboard" -> redirects to /dashboard
Set shops.onboarding_complete = true, shops.status = "live"

## Routing & State

- Route: /onboard
- On each step: save shops.onboarding_step = current step name before advancing
- On page load: read shops.onboarding_step from DB, resume from that step
- Progress bar at top: step X of 10

## Middleware update
In src/middleware.ts: after auth check, if user has a shop with onboarding_complete = false, redirect to /onboard (unless already on /onboard or /auth/* routes).

## Design
- Primary teal: #0F7695
- Clean white background, subtle shadows
- Step cards: white, max-w-lg centered
- Progress bar: teal fill, gray track
- Primary button: teal bg white text
- Secondary/skip: gray or text link
- Required field errors: red border

## DB calls
Use src/lib/supabase/client.ts (client-side) for all writes.
Pattern:
```
const supabase = createClient()
await supabase.from("shops").update({ field: value, onboarding_step: "next_step" }).eq("owner_id", userId)
```
Get userId from supabase.auth.getUser()

## Files to create
- src/app/onboard/page.tsx — server component, fetches initial shop data, renders wizard
- src/app/onboard/layout.tsx — minimal layout, no sidebar, just progress bar + centered content
- src/components/onboarding/OnboardingWizard.tsx — client component, manages step state
- src/components/onboarding/ProgressBar.tsx
- src/components/onboarding/StepShopInfo.tsx
- src/components/onboarding/StepHours.tsx
- src/components/onboarding/StepServices.tsx
- src/components/onboarding/StepEmergency.tsx
- src/components/onboarding/StepCalendar.tsx
- src/components/onboarding/StepVoice.tsx
- src/components/onboarding/StepProvision.tsx
- src/components/onboarding/StepForwarding.tsx
- src/components/onboarding/StepTestCall.tsx
- src/components/onboarding/StepGoLive.tsx

## Notes
- Read node_modules/next/dist/docs/ if unsure about any Next.js 14 API
- Step components: use client
- onboard/page.tsx: server component fetches shop, passes to OnboardingWizard
- Do not break existing auth pages or dashboard redirect

When completely finished, run this command to notify:
openclaw system event --text "Done: Onboarding wizard built — 10 steps at /onboard" --mode now
