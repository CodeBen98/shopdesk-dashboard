# ShopDesk — Production UI Polish Pass

You are doing a full design polish of the ShopDesk dashboard. The goal is Linear/Vercel/Stripe level quality. Read every file carefully before touching anything.

## Design Principles to Apply Everywhere

### Spacing System (4px grid — non-negotiable)
- 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px only
- No random values like 13px, 22px, 37px
- Consistent padding inside cards: 24px on desktop, 16px on mobile

### Typography Hierarchy
- Page titles: Space Grotesk, 24px, weight 700, color var(--text)
- Section headers: Space Grotesk, 16px, weight 600, color var(--text)
- Labels: Inter, 11px, weight 600, UPPERCASE, letter-spacing 0.06em, color var(--muted)
- Body: Inter, 14px, weight 400, color var(--text-mid)
- Caption/meta: Inter, 12px, color var(--muted)

### Interactive States (apply to ALL interactive elements)
- Buttons: `transition: all 0.15s ease` — hover slightly lighter/darker
- Inputs on focus: `border-color: var(--accent)`, `box-shadow: 0 0 0 3px rgba(15,118,149,0.15)`, `outline: none`
- Clickable rows: `cursor: pointer`, hover `background: var(--card-raised)`
- Links: `color: var(--accent)`, hover `opacity: 0.8`
- Disabled: `opacity: 0.5`, `cursor: not-allowed`

### Cards
- background: var(--surface)
- border: 1px solid var(--border)
- border-radius: 12px
- No box-shadow on dark theme (border is enough)
- padding: 24px inside

### Inputs (apply EVERYWHERE — every single input, select, textarea)
```css
background: var(--card);
border: 1px solid var(--border);
border-radius: 8px;
padding: 10px 14px;
font-size: 14px;
color: var(--text);
width: 100%;
box-sizing: border-box;
outline: none;
transition: border-color 0.15s, box-shadow 0.15s;
font-family: inherit;
```
On focus: `border-color: var(--accent); box-shadow: 0 0 0 3px rgba(15,118,149,0.12);`

### Buttons Primary
```css
background: var(--accent);
color: #fff;
border: none;
border-radius: 8px;
padding: 10px 20px;
font-size: 14px;
font-weight: 600;
cursor: pointer;
transition: opacity 0.15s;
font-family: inherit;
```
Hover: `opacity: 0.9`

### Buttons Secondary/Ghost
```css
background: transparent;
color: var(--text-mid);
border: 1px solid var(--border);
border-radius: 8px;
padding: 9px 20px;
font-size: 14px;
font-weight: 500;
cursor: pointer;
transition: background 0.15s, border-color 0.15s;
font-family: inherit;
```
Hover: `background: var(--card); border-color: rgba(255,255,255,0.15)`

---

## Files to Update

### 1. src/app/dashboard/settings/page.tsx — MAJOR REWORK

The settings page is the most important — shop owners live here. Currently it has basic tabs and basic inputs. Needs to feel like Stripe's settings panel.

**Tab navigation redesign:**
- Current: pill buttons in a row
- New: Underline tabs style — just text links with an animated teal underline indicator that slides between active tabs
- Each tab label: smaller text (13px), weight 500, color var(--muted) when inactive, var(--text) when active
- Active indicator: 2px solid var(--accent) bottom border, transition on change

**Each settings section:**
- Card with section title at top left (16px Space Grotesk 600)
- Description below title in var(--muted) 13px
- Save button at bottom RIGHT of the card (not full width)
- Save button should say "Save changes" not just "Save"
- Loading state: button shows spinner + "Saving..."
- Success: button briefly shows "✓ Saved" in green then reverts

**Shop Info tab:**
- Two-column grid for name/phone, address/email on desktop (1 col on mobile)
- Each input has a proper label above it (uppercase, small, muted)
- Phone field: show a phone icon inside the input (left side)

**Hours tab:**
- Each day row: day name (fixed 100px width, 14px weight 500) → toggle button (Open/Closed pill) → time inputs (only shown if open)
- Toggle button: when Open = teal bg, white text. When Closed = var(--card) bg, muted text
- Time inputs: side by side with "to" text between them
- "Copy Mon to all weekdays" button: small, secondary style, above the days list
- Row separator: subtle 1px var(--border) between each day
- Closed days: entire row muted opacity 0.5

**Services tab:**
- Each service card: clean white card with service name bold on left, price in teal on right, description below in muted
- Remove button: small, appears on hover (trash icon or × text)
- Quick-add chips: redesign as small rounded tags with + prefix, teal border on hover
- "+ Add Custom Service" button: dashed border style, full width, centered text

**AI & Voice tab:**
- Voice selection: 2x2 grid of cards (same as onboarding)
- Each voice card: larger emoji (40px), name, tagline, preview button
- Emergency contact: grouped below voice selection with clear divider and section label "Emergency Contact"
- After saving, show: "AI receptionist is being updated..." then "✓ AI updated"

**Phone Setup tab:**
- Hero number display: large monospace font, teal color, copy button
- Instructions as numbered steps with circular number badges (teal bg, white text, 24px diameter)
- Step text: 14px, var(--text-mid)

### 2. src/components/onboarding/StepShopInfo.tsx

**Welcome header:**
- Make the badge smaller and more refined: 10px text, tighter padding
- Main heading: bigger (32px) and more impactful
- Subheading: 15px, max-width 440px, centered

**Form layout:**
- Name + Phone side by side on desktop (50/50 grid gap 16px)
- Address full width
- Owner name + Email side by side
- Vehicle types: redesign chips — remove the checkmark prefix, use a ✓ badge in top-right corner of selected chips instead
- Vehicle type chips: 13px, border-radius 9999px, padding 6px 14px

### 3. src/components/onboarding/StepHours.tsx

- Day rows: cleaner, more space between them (16px gap not border)
- Toggle: pill shape, smoother transition
- Time inputs: styled properly (dark bg, dark text, same input style as everywhere else)
- "Copy" button: position it better — right side of the Monday row, small secondary button

### 4. src/components/onboarding/StepServices.tsx

- Quick-add chips: better visual — use a + icon before text, slight teal tint on hover
- Service cards: more polished — clear hierarchy, name large, price secondary, description small
- The dashed "Add Service" button: increase the dash gap, center the + icon + text

### 5. src/app/globals.css — Add Missing Utilities

Add these CSS classes that can be used across components:

```css
/* Focus ring for all inputs */
input:focus, select:focus, textarea:focus {
  border-color: var(--accent) !important;
  box-shadow: 0 0 0 3px rgba(15,118,149,0.12) !important;
  outline: none !important;
}

/* Smooth transitions on interactive elements */
button, a, input, select {
  transition: all 0.15s ease;
}

/* Underline tab indicator animation */
@keyframes tab-slide {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

/* Page section spacing */
.section-header {
  font-family: var(--font-space);
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
}

.section-desc {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 24px;
}
```

### 6. src/components/Sidebar.tsx

- Logo area: add a subtle bottom border separating it from nav
- Nav items: add more vertical padding (12px top/bottom instead of 8px)
- Active item: the teal left border should be 3px, and the background should be slightly more visible: `rgba(15,118,149,0.08)`
- Icons: make them 16px, slightly more muted when inactive
- Bottom section (email + sign out): add a top border separator, give it more breathing room
- Shop name below logo: truncate with ellipsis if too long, 12px, muted

## Critical Rules
- Keep dark theme throughout — no white backgrounds inside dashboard
- No external libraries
- All CSS vars only — no hardcoded colors
- Every input needs box-sizing: border-box
- Keep all existing functionality — only improve appearance
- Read each file fully before editing
- Do not break the onboarding wizard flow

When done:
openclaw system event --text "Done: Full UI polish — settings redesign, onboarding polish, inputs, typography, spacing" --mode now

## CRITICAL ADDITIONAL RULES (apply everywhere)

### No Emojis — Replace with SVG Icons
Emojis look unprofessional in a B2B SaaS product. Replace ALL emojis with clean inline SVGs:
- 🚨 (emergency) → warning triangle SVG
- 📅 (calendar) → calendar SVG
- 📞 (phone) → phone SVG
- 🎉 (go live) → keep this ONE exception, it's a celebration moment
- 👩 👨 👩‍💼 🧑‍💼 (voices) → remove entirely, just use colored initials circles (P, J, S, M) in teal/slate/purple/green
- ⚡ (auto-fill) → bolt SVG
- ✏️ (manual) → pencil SVG
- Any other emojis → replace with simple SVG or remove entirely

### No Em Dashes
Never use — (em dash) in any copy. Rewrite the sentence instead.
Wrong: "Warm — Professional"
Right: "Warm and Professional"

### Copy Tone — Professional SaaS
- No exclamation marks except in celebration moments (go live)
- No "Happy to help!" type phrases
- Short, clear, confident
- "Set your business hours" not "Set your business hours so your AI knows when you're open!"
- "Choose a voice" not "Pick the perfect voice for your shop!"

### Voice Card Labels (replace emoji with initials circles)
Each voice card should have a colored circle with the initial instead of emoji:
- Patricia: circle with "P", color #0F7695 (teal)
- James: circle with "J", color #6366f1 (indigo)  
- Sofia: circle with "S", color #f59e0b (amber)
- Marcus: circle with "M", color #10b981 (emerald)
Circle: 48px diameter, white initial, font-size 20px, font-weight 700
