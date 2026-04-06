# ShopDesk — Auth + Onboarding Visual Redesign

You are redesigning the auth pages (login, signup) and the onboarding wizard to be world-class. Think Linear, Vercel, Supabase, Stripe — that level of polish. Read every file carefully before changing anything.

## THE STANDARD

This needs to look like a real funded startup's product. Every detail matters:
- Consistent spacing (multiples of 4px)
- Smooth transitions on everything interactive
- Typography hierarchy clear at a glance
- Brand presence — the teal accent (#0F7695) used intentionally
- Empty/loading states are beautiful, not afterthoughts
- Mobile looks as good as desktop

---

## PART 1: AUTH PAGES — Login & Signup

### Overall Layout Change

Right now both pages are just centered cards on a dark bg. Upgrade to a two-column split layout on desktop:

**Left column (40% width):** Brand panel
- Dark bg: var(--surface) with subtle gradient (linear-gradient from var(--bg) to #0c1e2d)
- Large ShopDesk logo (teal bar + bold wordmark) centered
- Tagline below: "Never miss a call again."
- Below tagline: 3 proof points with checkmark icons:
  ✓ 24/7 AI receptionist for your shop
  ✓ Books appointments while you sleep
  ✓ Set up in under 10 minutes
- Bottom: subtle "Trusted by auto shops across Florida" with small shop icons or just text
- This panel is hidden on mobile (display: none below 768px)

**Right column (60% width):** Form panel
- Background: var(--bg)
- Centered content, max-width 420px
- Same form as before but now has more breathing room

### Form improvements
- Google button: make it more prominent — slightly larger, more padding (14px vertical), border slightly more visible (rgba white 15%)
- Divider "or" — make it more subtle
- Input labels: uppercase, letter-spacing 0.05em, font-size 11px, color var(--muted)
- Inputs: slightly taller (12px vertical padding), softer border by default (rgba white 6%), brighter on focus (var(--accent) at full opacity)
- Primary button: add a subtle glow on hover: `box-shadow: 0 0 0 3px rgba(15,118,149,0.3)`
- "Forgot password" link: move it below the password input, right-aligned, smaller (12px)

### Subtle background texture on right panel
Add very subtle noise/grain texture to the right panel bg using CSS:
```css
background-image: radial-gradient(circle at 20% 50%, rgba(15,118,149,0.05) 0%, transparent 50%),
                  radial-gradient(circle at 80% 20%, rgba(15,118,149,0.03) 0%, transparent 40%);
```

---

## PART 2: ONBOARDING WIZARD — Full Visual Overhaul

### Background & Layout

Replace the plain `#f9fafb` with the dark theme — same as the dashboard:
- background: var(--bg)
- Step cards: var(--surface) with var(--border), same as dashboard cards
- This makes the whole app feel cohesive — no jarring white page in the middle

### Progress Bar (ProgressBar.tsx) — Complete Rebuild

Replace the current plain bar with a step-indicator style:

**Design:**
- Fixed at top, full width
- Background: var(--surface), bottom border: 1px solid var(--border)
- Left side: ShopDesk logo (teal bar + "ShopDesk" wordmark) — 16px font
- Center: Row of 10 numbered circles connected by lines
  - Completed steps: filled teal circle (var(--accent)) with white checkmark
  - Current step: teal ring (border 2px solid var(--accent)), teal number inside
  - Future steps: dark circle (var(--card)), muted number
  - Connecting lines: teal for completed, var(--border) for upcoming
  - On mobile: hide the circles, just show "Step X of 10" text + thin progress bar
- Right side: "Step X of 10" text in var(--muted), 13px

Height: 64px on desktop, 52px on mobile

### Step Cards — Style System

All step components use this exact card style (update each one):
```
background: var(--surface)
border: 1px solid var(--border)
border-radius: 16px
padding: 40px 48px (desktop) / 28px 24px (mobile — use @media or inline check)
max-width: 560px
margin: 40px auto
box-shadow: 0 4px 24px rgba(0,0,0,0.3)
```

Step title: Space Grotesk, 24px, fontWeight 700, color var(--text)
Step subtitle: 15px, color var(--muted), lineHeight 1.6, marginBottom 32px

Labels: 12px, uppercase, letterSpacing 0.06em, fontWeight 600, color var(--muted), marginBottom 8px

Inputs (all steps):
```
background: var(--card)
border: 1px solid var(--border)
border-radius: 8px
padding: 12px 16px
font-size: 15px
color: var(--text)
box-sizing: border-box
width: 100%
transition: border-color 0.15s
```
On focus: border-color: var(--accent)

Primary button (all steps):
```
background: var(--accent)
color: #fff
padding: 13px 24px
border-radius: 10px
border: none
font-size: 15px
font-weight: 600
width: 100%
cursor: pointer
margin-top: 8px
transition: opacity 0.15s, box-shadow 0.15s
```
On hover: `box-shadow: 0 0 0 3px rgba(15,118,149,0.25)`
Disabled: `opacity: 0.5, cursor: not-allowed`

### StepShopInfo — Specific Improvements
- Add a welcome header ABOVE the card (outside the card, centered):
  Small teal badge: "Welcome to ShopDesk"
  Large heading below: "Let's set up your AI receptionist"
  Subtitle: "Takes less than 5 minutes. We'll have your AI answering calls today."
- This sets the tone for the whole onboarding

### StepAutoFillChoice — Specific Improvements
- Make the two option cards more dramatic:
  - Each card: border-radius 12px, padding 24px
  - Auto-fill card: when selected, teal border (2px solid var(--accent)) + subtle teal glow: `box-shadow: 0 0 0 4px rgba(15,118,149,0.15)`
  - Manual card: when selected, white border
  - Add a small "RECOMMENDED" badge on the auto-fill card: teal bg, white text, 10px, uppercase, pill shape
  - Animation on card click: brief scale(0.98) then back

### StepVoice — Specific Improvements
- Voice cards: same glow effect on selection as StepAutoFillChoice
- Add a "▶ Preview" button that shows a tooltip "Audio preview coming soon" (no actual audio needed yet)

### StepProvision — Specific Improvements
- The animated progress steps: use a left-border timeline style
  - Each step: has a dot on the left, connected by a vertical line
  - Completed steps: teal dot, teal line, teal checkmark icon
  - Current step: pulsing teal dot (CSS pulse animation), faded text
  - Future steps: gray dot, gray line
- Add a subtle shimmer/glow behind the whole card while provisioning

### StepGoLive — Specific Improvements
- Full celebration treatment:
  - Confetti-like colored dots animation (CSS only — 6-8 small circles that fly up and fade)
  - The summary card: dark green bg (rgba(34,197,94,0.08)), green border
  - Big "🎉 You're live!" heading: 32px, Space Grotesk
  - The Go to Dashboard button: extra large (16px font, 16px vertical padding), slight upward shadow

### StepForwarding — Specific Improvements
- The phone number to forward to: display in a special "copy" component
  - Large monospace number, teal color, with a copy-to-clipboard button
  - On copy: button turns green briefly with checkmark "Copied!"

### All steps — back button
Add a subtle "← Back" text link in the top-left of each step card (except shop_info). 
On click: go to previous step (implement `onBack` prop in StepProps and OnboardingWizard — same pattern as onSkipTo but goes backwards in STEPS array).

---

## PART 3: GLOBALS

Add to globals.css:
```css
@keyframes pulse-dot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.7; }
}

@keyframes confetti-fly {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(-120px) rotate(360deg); opacity: 0; }
}

@keyframes card-enter {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
```

Apply `animation: card-enter 0.35s ease` to every step card on mount — makes step transitions feel smooth.

---

## Files to update:
- src/app/auth/login/page.tsx — two-column layout, form improvements
- src/app/auth/signup/page.tsx — same two-column layout
- src/app/onboard/layout.tsx — set background to var(--bg)
- src/components/onboarding/ProgressBar.tsx — full rebuild with step circles
- src/components/onboarding/OnboardingWizard.tsx — add onBack prop
- src/components/onboarding/StepShopInfo.tsx — welcome header above card, dark card style
- src/components/onboarding/StepAutoFillChoice.tsx — glow effects, better cards
- src/components/onboarding/StepHours.tsx — dark card style
- src/components/onboarding/StepServices.tsx — dark card style
- src/components/onboarding/StepEmergency.tsx — dark card style
- src/components/onboarding/StepCalendar.tsx — dark card style
- src/components/onboarding/StepVoice.tsx — glow on selection, preview button
- src/components/onboarding/StepProvision.tsx — timeline style, shimmer
- src/components/onboarding/StepForwarding.tsx — copy button on phone number
- src/components/onboarding/StepTestCall.tsx — dark card style
- src/components/onboarding/StepGoLive.tsx — celebration, confetti
- src/components/onboarding/StepAutoFillReview.tsx — dark card style
- src/app/globals.css — add new keyframes

## Critical rules
- Never use white (#fff or #ffffff) as a background inside the wizard or dashboard — always dark theme
- Never use external libraries
- All CSS vars from globals.css — no hardcoded colors except the Google button colors (they must stay Google brand colors)
- box-sizing: border-box on every input
- Read node_modules/next/dist/docs/ if unsure about Next.js 16

When completely done:
openclaw system event --text "Done: Auth + onboarding redesign — two-column auth, dark wizard, polished step cards, new progress bar" --mode now
