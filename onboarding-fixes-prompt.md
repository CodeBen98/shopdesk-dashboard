# Onboarding Wizard — Production Fixes

Read every file carefully before changing anything. Fix only what's described. Do not rewrite working code.

## Fix 1: StepShopInfo — src/components/onboarding/StepShopInfo.tsx

Add required validation and format validation:
- Shop name: required (already done, keep it)
- Phone: REQUIRED. Add error if empty. Add basic format check: must contain at least 10 digits (strip non-digits to count). Error: "Phone number is required" / "Please enter a valid phone number"
- Address: REQUIRED. Error: "Address is required" — callers ask where the shop is
- Email: optional, but if filled must match basic email pattern (xxx@xxx.xx). Error: "Please enter a valid email address"
- Owner name: ADD a new field between shop name and address: "Owner / Manager Name" (required). Label: "OWNER NAME *". Placeholder: "e.g. Bill, Mike, Sarah". Error: "Owner name is required". Save to: shops.emergency_contact_name IF emergency_contact_name is empty (pre-fill it). Also save to a new field... actually save it as part of the shop name context — add it to the DB update as `owner_name` column... wait, there's no owner_name column. Instead: save it to a JS variable and pass it through onShopUpdate as a note. Actually — the simplest approach: add an `owner_name` text field that saves alongside the other fields. Check the shops table — if there's no owner_name column, save it in the `emergency_contact_name` field as a pre-fill only if that field is currently empty. Label it clearly: "Owner / Manager Name — we'll use this so your AI can say 'I'll have [name] call you back'"

Actually — simplest correct approach:
- Add owner_name as a state variable
- Save it to Supabase only if the shops table has an `owner_name` column — check src/lib/supabase or types. If not in types, skip DB save but pass it through onShopUpdate so provision can use it from shop state
- In the provision API (src/app/api/provision-shop/route.ts), use owner_name in the system prompt if it exists on the shop object

Looking at types/index.ts: Shop type doesn't have owner_name. So: save owner_name to the `email` field? No. Best option: save it to the notes or a custom field. Actually just add it to the system prompt via the emergency_contact_name field if it's pre-filled from this step.

SIMPLEST CORRECT APPROACH (do this):
1. Add "Owner / Manager Name *" field to StepShopInfo, state variable `ownerName`
2. Validate: required
3. On submit: update shops table with `emergency_contact_name: ownerName` ONLY if current shop.emergency_contact_name is empty
4. Pass through onShopUpdate: `{ emergency_contact_name: ownerName }` only if was empty
5. This pre-fills the emergency contact name, which is used in the provision prompt

Also add: "What vehicles do you work on?" — a multi-select chip group:
Options: All Makes & Models, Domestic (Ford/GM/Chrysler), European (BMW/Mercedes/Audi/VW), Japanese (Toyota/Honda/Nissan), Korean (Hyundai/Kia), Trucks & SUVs, Diesel
Default: none selected (they must pick at least one)
Required: at least 1 must be selected. Error: "Please select at least one vehicle type"
Save to: Supabase has no column for this. Save as JSON in the `services` field? No. Save as part of a text note? 

SIMPLEST: Save vehicle types as a comma-separated string in the shop's `address` field? No, that's wrong.

OK — the cleanest approach without schema changes: add vehicle types to the system prompt by saving them to `onboarding_step` temporarily? No.

REAL SOLUTION: save vehicle_types as a Supabase update to a column that can hold it. Check if there's a `notes` or `meta` column in schema... there isn't.

FINAL DECISION: Skip saving vehicle types to DB for now (no schema change mid-session). Instead: add the vehicle type selection UI, save the selection to localStorage with key `shopdesk_vehicle_types`, and read it in StepProvision when calling the provision API — pass it as a query param or request body field. Update /api/provision-shop to accept an optional `vehicleTypes` string in the request body and include it in the system prompt.

Actually even simpler: just add the vehicle types to the provision API call body from the client. StepProvision already calls fetch('/api/provision-shop', { method: 'POST' }). Change it to POST with a JSON body that includes vehicleTypes read from localStorage.

Implementation:
- StepShopInfo: save selected vehicle types to localStorage('shopdesk_onboarding_extras') as JSON: { vehicleTypes: [...], ownerName: '...' }
- StepProvision: read from localStorage before calling API, include in POST body
- /api/provision-shop: read vehicleTypes and ownerName from request body, include in system prompt

## Fix 2: StepHours — src/components/onboarding/StepHours.tsx

- Change DEFAULT hours to 9am-5pm (not 8am) — most auto shops open at 9
- Add "Copy to all weekdays" button: appears when Mon-Fri are all open. Clicking sets Tue-Fri to same hours as Monday.
- Add closing time validation: if `to` time <= `from` time on any open day, show error: "Closing time must be after opening time"
- Show validation error inline next to the offending row

## Fix 3: StepServices — src/components/onboarding/StepServices.tsx

- Require at least 1 service. If user clicks Continue with 0 services, show error: "Please add at least one service so your AI knows what you offer"
- Show this error above the Continue button

## Fix 4: StepCalendar — src/components/onboarding/StepCalendar.tsx

- Remove the `alert()` from handleConnect entirely
- Replace with a nice "coming soon" inline state:
  When they click "Connect Google Calendar": show a message below the button: "📅 Google Calendar integration is coming soon. We'll notify you when it's ready. For now, your AI will take appointment requests and notify you." — auto-advance to next step after 2 seconds
- Keep "Skip for now" as is

## Fix 5: provision API — src/app/api/provision-shop/route.ts

- Change POST handler to read request body: `const body = await request.json().catch(() => ({}))`
- Extract: `const { vehicleTypes, ownerName } = body`
- Add vehicleTypes to system prompt under [Shop Info]: "Vehicle types serviced: {vehicleTypes.join(', ')}" — only if vehicleTypes exists and has items
- Add ownerName context: if ownerName exists, add to [Identity] section: "The owner/manager is {ownerName}. When customers ask to speak to someone, say you'll have {ownerName} call them back."
- Also: use ownerName in [Escalation] section instead of the emergency_contact_name if ownerName is provided

## Fix 6: StepProvision — src/components/onboarding/StepProvision.tsx

- Before calling fetch('/api/provision-shop'), read from localStorage:
  ```
  const extras = JSON.parse(localStorage.getItem('shopdesk_onboarding_extras') || '{}')
  ```
- Include in POST body: `{ vehicleTypes: extras.vehicleTypes || [], ownerName: extras.ownerName || '' }`
- After successful provision, clear localStorage: `localStorage.removeItem('shopdesk_onboarding_extras')`

## Fix 7: Global — Supabase error handling

In ALL step components, the `await supabase.from('shops').update(...)` calls currently ignore errors. Add basic error handling to each:

Pattern to add after each supabase update:
```typescript
const { error: saveError } = await supabase.from('shops').update({...}).eq('owner_id', userId)
if (saveError) {
  // show error, don't advance
  setLoading(false)
  // each step needs a general `saveError` state string
  return
}
```

Add a `saveError` state to each step component. Show it as a red message above the Continue button if set.

## File summary

Files to update:
- src/components/onboarding/StepShopInfo.tsx — phone required, address required, email format, owner name field, vehicle types chips, save extras to localStorage
- src/components/onboarding/StepHours.tsx — default 9am, copy weekdays button, close>open validation
- src/components/onboarding/StepServices.tsx — require at least 1 service
- src/components/onboarding/StepCalendar.tsx — remove alert(), coming soon inline message
- src/components/onboarding/StepProvision.tsx — read localStorage, pass vehicleTypes+ownerName to API
- src/app/api/provision-shop/route.ts — read body, use vehicleTypes and ownerName in prompt

## Rules
- Do NOT change working code that isn't listed above
- Do NOT change StepVoice, StepEmergency, StepForwarding, StepTestCall, StepGoLive
- Keep all existing CSS variable usage
- box-sizing: border-box on all inputs
- No external libraries

When completely done:
openclaw system event --text "Done: Onboarding production fixes — validation, owner name, vehicle types, hours defaults, services required, calendar alert removed" --mode now
