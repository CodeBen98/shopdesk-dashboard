Add an "auto-fill" feature to the onboarding wizard. After the shop enters their name and address in StepShopInfo, show them a choice: auto-fill their profile from online data, or fill manually.

## Overview

After StepShopInfo saves name + address, instead of going directly to "hours", go to a new step: "auto_fill_choice". From there, either:
- Auto: call our API, get Google Places data, show a review/confirm screen, then continue to hours (pre-populated)
- Manual: skip straight to hours (existing flow)

## Step A: Update OnboardingStep type

In src/types/index.ts, add 'auto_fill_choice' and 'auto_fill_review' to the OnboardingStep union type.

## Step B: Google Places API route

Create src/app/api/gather-shop/route.ts

POST endpoint. Body: { name: string, address: string }

Logic:
1. Use Google Places Text Search API to find the shop:
   GET https://maps.googleapis.com/maps/api/place/textsearch/json?query={name}+{address}&key={GOOGLE_PLACES_API_KEY}
2. Take the first result, get the place_id
3. Use Place Details API to get full details:
   GET https://maps.googleapis.com/maps/api/place/details/json?place_id={place_id}&fields=name,formatted_address,formatted_phone_number,website,opening_hours,types&key={GOOGLE_PLACES_API_KEY}
4. Parse opening_hours.periods into our ShopHours format (Mon-Sun, open/closed, from/to times)
   - periods[].open.day: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
   - periods[].open.time: "0800" format → "08:00"
   - periods[].close.time: "1700" format → "17:00"
   - If a day has no period entry, it's closed
5. Return JSON:
{
  found: boolean,
  name: string,
  address: string,
  phone: string,
  website: string | null,
  hours: ShopHours, // our format
  raw_types: string[] // from Google places types
}

Use GOOGLE_PLACES_API_KEY from process.env (it's in .env.local already as GOOGLE_PLACES_API_KEY).

If Google returns no results or errors, return { found: false }.

## Step C: New onboarding step components

### src/components/onboarding/StepAutoFillChoice.tsx

Shows after StepShopInfo. 

UI:
- Title: "Want us to set up your profile automatically?"
- Subtitle: "We'll look up [shop name] online and pre-fill your hours, services, and contact info. You can review and edit everything before continuing."
- Two option cards side by side (stack on mobile):

Card 1 — Auto-fill:
  - Icon: ⚡ (or a bolt SVG)
  - Title: "Auto-fill my profile"
  - Description: "We'll look up your shop online and fill in your hours, phone, and more. Takes about 10 seconds."
  - Badge: "Recommended"
  - Teal border when selected

Card 2 — Manual:
  - Icon: ✏️
  - Title: "I'll fill it in myself"
  - Description: "Enter your hours, services, and contact info step by step."
  - Gray border

Below cards: big "Continue →" button (teal)

On "Continue":
- If auto-fill selected: set loading state "Looking up your shop...", call POST /api/gather-shop with name+address, then:
  - If found: save pre-populated data to Supabase (hours, phone if empty), advance to 'auto_fill_review'
  - If not found: show message "We couldn't find your shop online. No worries — you can fill it in manually." and advance to 'hours' after 2 seconds
- If manual selected: update onboarding_step to 'hours', call onNext()

Default selection: auto-fill

### src/components/onboarding/StepAutoFillReview.tsx

Shows the data we found. Let them see and confirm before moving on.

UI:
- Title: "Here's what we found 👀"
- Subtitle: "Review the info below. You can edit anything on the next steps."
- Info cards showing what was found:
  - Shop name (with green checkmark if found)
  - Phone number (with green checkmark if found, or "Not found" in gray)
  - Address (with green checkmark)
  - Hours summary (e.g. "Mon-Fri 8am-5pm, Sat 9am-2pm, Sun Closed")
  - Website if found

- Button: "Looks good, continue →" (teal) → advances to 'hours'
- Link below: "Edit manually instead" → advances to 'hours' (same destination, just different wording)

Both paths advance to 'hours'. The hours step will already be pre-populated from Supabase.

## Step D: Update OnboardingWizard.tsx

1. Add 'auto_fill_choice' and 'auto_fill_review' to the STEPS array — insert after 'shop_info':
   'shop_info', 'auto_fill_choice', 'auto_fill_review', 'hours', 'services', ...

   Wait — but if manual is selected we skip auto_fill_review. Handle this by:
   - When manual is selected: skip auto_fill_review, go directly to 'hours' by jumping 2 steps
   - When auto-fill + found: go to auto_fill_review normally
   - When auto-fill + not found: skip to 'hours'
   
   Add an `onSkipTo` prop to StepProps: (step: OnboardingStep) => void
   This lets steps jump to a specific step instead of just next.

2. Import and render StepAutoFillChoice and StepAutoFillReview

3. Update StepShopInfo: change onboarding_step saved to 'auto_fill_choice' (not 'hours')

4. Update the progress bar: total steps stays 10 (auto_fill_choice and auto_fill_review are "sub-steps" of step 1 — don't increment the counter for them, or just show them as part of step 1 progress)
   Simplest: keep STEPS array for rendering but progress bar only counts the original 10. Pass a separate displayStep prop.

## Step E: Update StepProps interface

Add onSkipTo to StepProps in OnboardingWizard.tsx:
```
export interface StepProps {
  shop: Shop | null
  userId: string
  onNext: () => void
  onSkipTo: (step: OnboardingStep) => void
  onShopUpdate: (updated: Partial<Shop>) => void
}
```

Update OnboardingWizard to implement onSkipTo:
```
function onSkipTo(step: OnboardingStep) {
  setCurrentStep(step)
}
```

Pass onSkipTo to all steps via commonProps.

## Important notes
- Read node_modules/next/dist/docs/ if unsure about any Next.js 14/16 API
- All step components are 'use client'
- API route: use Next.js route handler format (export async function POST)
- Do not break any existing steps
- Keep the same card styling as other steps (white bg, shadow, max-w-512px centered, padding 32px)
- The GOOGLE_PLACES_API_KEY is already in .env.local

When completely finished, run this command:
openclaw system event --text "Done: Auto-fill feature built — StepAutoFillChoice, StepAutoFillReview, /api/gather-shop" --mode now
