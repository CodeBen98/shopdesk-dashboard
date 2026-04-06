# ShopDesk Dashboard — Full Production Build

You are building a production-grade SaaS dashboard for ShopDesk — an AI receptionist for auto repair shops. The existing code has a skeleton structure. Your job is to make it look and feel like a real, polished product.

Read the existing files carefully before changing anything. Understand what exists, then upgrade it.

## Design System (apply everywhere)

### Colors (already in globals.css — use these CSS vars everywhere)
- Background: `var(--bg)` (#04070f)
- Surface (cards): `var(--surface)` (#0b141e)
- Card raised: `var(--card-raised)` (#121f2d)
- Border: `var(--border)` (rgba white 8%)
- Accent/primary: `var(--accent)` (#0F7695)
- Text: `var(--text)` (#f4f5f7)
- Muted text: `var(--muted)` (#7a8899)
- Mid text: `var(--text-mid)` (#c3cad5)
- Success: `var(--success)` (#22c55e)
- Danger: `var(--danger)` (#ef4444)
- Warning: `var(--warning)` (#f59e0b)

### Typography
- Headings: `var(--font-space)` (Space Grotesk), bold
- Body: Inter (default body font)
- Sizes: page title 24-28px, section headers 16-18px, body 14-15px, labels 12-13px

### Components (consistent across all pages)
- Cards: `background: var(--surface)`, `border: 1px solid var(--border)`, `border-radius: 12px`, `padding: 20-24px`
- Buttons primary: `background: var(--accent)`, white text, `border-radius: 8px`, `padding: 10px 20px`, `font-weight: 600`
- Buttons secondary: `background: transparent`, `border: 1px solid var(--border)`, `color: var(--text-mid)`
- Inputs: `background: var(--card)`, `border: 1px solid var(--border)`, `border-radius: 8px`, `padding: 10px 14px`, `color: var(--text)`, `box-sizing: border-box`
- Status badges: pill shape, small, colored bg + text (success/warning/danger/muted)
- Tables: no outer border, row hover `background: var(--card-raised)`, header row `color: var(--muted)` smaller text
- Dividers: `1px solid var(--border)`

### Loading States (REQUIRED on every async action)
- Button loading: disable + show spinner (inline SVG spin animation) + text changes to "Loading..."
- Page loading: show skeleton cards (gray shimmer blocks where content will be) — NOT a spinner in the middle
- Auth transitions: after login/signup success, show brief "Signing you in..." overlay before redirect
- Data loading: skeleton rows in tables, skeleton stat numbers

### Transitions & Micro-interactions
- Buttons: `transition: background 0.15s, opacity 0.15s` — slightly lighter on hover
- Cards: subtle `transition: border-color 0.15s` on hover where clickable
- Input focus: `border-color: var(--accent)` on focus (use onFocus/onBlur handlers)
- Page enters: simple `opacity` fade-in on mount (use CSS animation)
- Sidebar active item: teal left border + teal text

---

## 1. Auth Pages — Polish Login & Signup

### Loading state on form submit
Both login and signup: when form is submitted or Google button clicked:
- Disable the button immediately
- Show a spinning circle SVG next to the button text
- Change text: "Sign in" → "Signing in..." / "Create account" → "Creating account..."
- On success: show a full-page overlay: dark bg, centered ShopDesk logo, "Taking you to your dashboard..." with a subtle animated dot-dot-dot
- Hold overlay for 800ms then let the redirect happen (so it doesn't flash)

### Input focus states
On focus: border changes to `var(--accent)`. Implement via React state (focusedField) and conditional style.

### Password visibility toggle
Add a show/hide eye icon button inside the password input (right side). Toggle between type="password" and type="text".

### Page fade-in
Wrap the entire page content in a div with CSS animation: `@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }` applied with `animation: fadeIn 0.3s ease`.
Add this keyframe to globals.css.

---

## 2. Dashboard Layout — Sidebar + Shell

### Create src/app/dashboard/layout.tsx

This is a client component (needs useState for mobile sidebar toggle).

**Sidebar** (fixed left, 240px wide, full height):
- Background: `var(--surface)`, right border: `1px solid var(--border)`
- Top: ShopDesk logo (teal bar + "ShopDesk" text), shop name below in muted small text
- Nav items (with icons):
  - Overview (grid icon) → /dashboard
  - Calls (phone icon) → /dashboard/calls
  - Bookings (calendar icon) → /dashboard/bookings
  - Customers (users icon) → /dashboard/customers
  - Settings (gear icon) → /dashboard/settings
- Active state: teal left border (3px), teal text, slightly lighter bg
- Bottom of sidebar: user email in muted text + Sign out button
- Mobile: hide sidebar, show hamburger menu button in top bar

**Icons**: use simple inline SVG icons (no icon library needed — draw them inline). Keep them 18x18px.

**Main content area**: `margin-left: 240px` on desktop, full width on mobile. `padding: 32px`. Renders `{children}`.

**Top bar** (inside main area, above children):
- Just a subtle border-bottom line separating it from content, or omit entirely if sidebar handles navigation well.

**Mobile hamburger**: fixed top-left button that toggles sidebar open/close. Sidebar overlays content on mobile.

**Responsive breakpoint**: below 768px, collapse sidebar.

Fetch the shop name server-side or pass it as a prop. Since this is client component, fetch it client-side on mount via supabase.auth.getUser() + shops query.

### Sign out
Move the logout button into the sidebar bottom. Remove it from dashboard/page.tsx header.

---

## 3. Dashboard Home — src/app/dashboard/page.tsx

**Real stats from Supabase** (server component, fetch in parallel):
```
const [callsResult, bookingsResult, missedResult] = await Promise.all([
  supabase.from('calls').select('id, outcome', { count: 'exact' }).eq('shop_id', shop.id),
  supabase.from('bookings').select('id', { count: 'exact' }).eq('shop_id', shop.id),
  supabase.from('calls').select('id', { count: 'exact' }).eq('shop_id', shop.id).eq('outcome', 'missed'),
])
```

**Stats strip** (4 cards in a row):
- Total Calls Answered
- Bookings Made  
- Missed Calls
- Est. Revenue Recovered (bookings × $650 avg repair order — show formula tooltip on hover)

**Recent Calls table** (last 10):
- Columns: Time, Caller, Duration, Outcome (badge), Action (View)
- Outcome badges: booked=green, missed=red, info_only=gray, emergency=orange
- Empty state: illustrated empty state — phone icon, "No calls yet", "Your AI receptionist is ready. Make a test call to (407) 555-0123."

**Upcoming Bookings** (next 5):
- Show appointment time, customer name, vehicle, service
- Empty state: calendar icon, "No upcoming bookings"

**AI Status card** (top right or full width banner):
- Green dot + "AI Receptionist is Live" 
- Shows the shop's phone number
- "Make a test call →" link

---

## 4. Calls Page — src/app/dashboard/calls/page.tsx

Create this file. Server component.

**Header**: "Call Log" title + subtitle "Every call your AI receptionist handled"

**Filter bar**: 
- Filter by outcome: All / Booked / Info Only / Missed / Emergency (tab-style buttons)
- Date range: "Today" / "This week" / "This month" (simple toggle, default this month)

**Calls table**:
- Columns: Date/Time, Caller Phone, Caller Name, Duration, Outcome (badge), Transcript (expandable)
- Click on a row → expand inline to show full transcript
- If transcript is null → "No transcript available"
- Pagination: show 20 per page, "Load more" button

**Empty state**: same pattern — icon, message, CTA to make test call.

For now, fetch all calls for the shop and display them. No complex filtering needed yet (keep it simple).

---

## 5. Bookings Page — src/app/dashboard/bookings/page.tsx

Create this file. Server component.

**Header**: "Bookings" + subtitle "Appointments booked by your AI receptionist"

**Upcoming vs Past tabs**: default to Upcoming

**Bookings table**:
- Columns: Date/Time, Customer, Phone, Vehicle, Service, Status (badge), SMS Sent (checkmark or x)
- Status badges: scheduled=blue, confirmed=green, completed=gray, cancelled=red, no_show=orange
- Row actions: Mark Complete, Cancel (simple buttons, client-side mutations)

**Empty state**: calendar icon, "No bookings yet"

---

## 6. Settings Page — src/app/dashboard/settings/page.tsx

Create this file. This is the most important page for shop owners to manage their setup.

**Sections** (use tabbed or accordion layout — tabs preferred):

Tab 1: Shop Info
- Edit: name, address, phone, email
- Save button — shows loading state, success toast on save

Tab 2: Hours
- Same hours editor as onboarding wizard (Mon-Sun, toggle + time picker)
- Save button

Tab 3: Services  
- Same services editor as onboarding wizard (add/remove/edit)
- Save button

Tab 4: AI & Voice
- Voice selection (same 4 cards as onboarding)
- Emergency contact name + phone
- Save button

Tab 5: Phone Setup
- Shows their Twilio number (or demo number if not yet assigned)
- Call forwarding instructions (same as onboarding step 8)
- "Make a test call" link

**Toast notifications**: When save succeeds, show a toast in bottom-right corner: green bg, checkmark, "Saved successfully" — auto-dismiss after 3 seconds. When save fails: red toast.

Create a reusable Toast component at src/components/Toast.tsx.

**All saves**: update Supabase shops table for that owner_id.

---

## 7. Customers Page — src/app/dashboard/customers/page.tsx

Create this file. Simple for now.

**Header**: "Customers"

**Table**:
- Columns: Name, Phone, Vehicle, Last Visit, Total Visits
- Search input at top (filter by name or phone — client-side filter)
- Empty state: users icon, "No customers yet. Customers appear here after their first call."

---

## 8. Global: Toast Component

Create src/components/Toast.tsx — a client component.
- Fixed bottom-right, z-index 9999
- Slide in from right on appear, slide out on dismiss
- Props: message, type (success | error | warning)
- Auto-dismiss after 3000ms
- Export a useToast hook that pages can use

---

## 9. Global: Loading Skeleton Component

Create src/components/Skeleton.tsx
- Props: width, height, borderRadius
- Shimmer animation: `@keyframes shimmer { 0% { background-position: -200px 0 } 100% { background-position: 200px 0 } }`
- Background: linear gradient from var(--surface) to var(--card-raised) to var(--surface)
- Use this in all loading states across pages

Add the shimmer keyframe to globals.css.

---

## File Summary

Files to CREATE:
- src/app/dashboard/layout.tsx (sidebar shell)
- src/app/dashboard/calls/page.tsx
- src/app/dashboard/bookings/page.tsx  
- src/app/dashboard/customers/page.tsx
- src/app/dashboard/settings/page.tsx
- src/components/Toast.tsx
- src/components/Skeleton.tsx
- src/components/Sidebar.tsx (extracted sidebar for cleanliness)

Files to UPDATE:
- src/app/globals.css (add fadeIn, shimmer keyframes)
- src/app/dashboard/page.tsx (real stats, better layout, remove logout button)
- src/app/auth/login/page.tsx (loading overlay, input focus states, password toggle, fade-in)
- src/app/auth/signup/page.tsx (same improvements)

## Critical Rules
- Read node_modules/next/dist/docs/ if unsure about Next.js 16 APIs
- Server components for data fetching, client components for interactivity
- All inputs: box-sizing border-box always
- No external UI libraries — inline styles + CSS vars only
- Keep dark theme throughout — do NOT use white/light backgrounds inside dashboard pages
- Dashboard pages: dark bg, dark cards — match the existing globals.css dark theme
- The onboarding wizard uses light bg (#f9fafb) — that's intentional, keep it
- Never hardcode colors — always use CSS vars from globals.css
- Every page needs a proper empty state (not just a blank table)

When completely finished, run:
openclaw system event --text "Done: Full dashboard build — sidebar, calls, bookings, customers, settings, auth polish, loading states" --mode now
