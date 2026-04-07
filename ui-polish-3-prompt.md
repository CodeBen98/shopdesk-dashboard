# UI Polish Pass 3 — Remaining Wizard Issues

Read every file carefully before changing anything. Fix only what's listed.

## Fix 1: StepShopInfo.tsx — Welcome header positioning

The welcome header (badge + heading + subtitle) currently renders ABOVE the card div, as a sibling. This causes it to appear above the progress bar on some screen sizes. 

Move the welcome header INSIDE the card as the first content, above the "Tell us about your shop" subtitle. Remove the outer wrapper div and put everything in one card.

New structure:
```
<div style={card}>
  {/* Welcome badge */}
  <div style={{ display: 'inline-flex', ... }}>Welcome to ShopDesk</div>
  
  {/* Main heading */}
  <h1 style={{ fontSize: 28, fontWeight: 800, ... }}>Set up your AI receptionist</h1>
  
  {/* Subtitle */}  
  <p style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 32 }}>Takes less than 5 minutes. Your AI will be answering calls today.</p>
  
  {/* Fields below */}
  ...
</div>
```

Also: the heading uses "Let's" — change to "Set up your AI receptionist" (no contraction). Check current file and fix if still present.

## Fix 2: StepHours.tsx — Copy button and Sunday toggle

1. **Copy button placement:** Currently the copy button is somewhere near Monday row. Move it to be a small text link directly BELOW the subtitle, left-aligned, BEFORE the days list:
```tsx
<button onClick={copyWeekdaysFromMonday} style={{
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--accent)', fontSize: 12, fontWeight: 600,
  padding: 0, marginBottom: 16, fontFamily: 'inherit',
  textDecoration: 'underline',
}}>
  Copy Monday hours to all weekdays
</button>
```

2. **Sunday/Saturday Closed toggle:** When a day is closed (open: false), the row should still show the "Closed" toggle button — not plain text, not invisible. Check the current JSX. The button should always render. If the current code conditionally hides it, fix that.

Current code probably has something like `{dh.open && (<time inputs>)}` — that's fine. But the toggle button itself should ALWAYS be there.

## Fix 3: StepVoice.tsx — Verify SVG play/stop icons

Check the current preview button in StepVoice. If it still shows ▶ or ■ as text characters (not SVG), replace them with proper SVG:

Play SVG (10x10):
```tsx
<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
  <path d="M2 1.5l6 3.5-6 3.5V1.5z"/>
</svg>
```

Stop SVG (10x10):
```tsx  
<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
  <rect x="2" y="2" width="6" height="6" rx="1"/>
</svg>
```

## Fix 4: All steps — Continue button not full width

Check every step component. The Continue/primary action button should be:
```tsx
style={{
  background: 'var(--accent)',
  color: '#fff',
  padding: '13px 32px',
  borderRadius: 10,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 15,
  width: 'auto',
  minWidth: 200,
  display: 'block',
  marginLeft: 'auto',  // right-aligned
  marginTop: 8,
  transition: 'opacity 0.15s',
  fontFamily: 'inherit',
}}
```

Apply to: StepShopInfo, StepHours, StepServices, StepEmergency, StepTestCall
Do NOT change: StepGoLive (keep full width), StepCalendar Connect button (keep full width), StepForwarding (keep full width with disabled state)
StepVoice continue button: keep full width but add `marginLeft: 0` if it had auto

## Fix 5: StepAutoFillChoice.tsx — Card equal heights

The two option cards (Auto-fill and Manual) have different heights because one has more content. Fix:
- Add `display: 'flex', flexDirection: 'column'` to each card
- Cards container: add `alignItems: 'stretch'`
- Both cards should stretch to the same height

## Fix 6: Minor copy fixes

In StepAutoFillChoice:
- Check if heading is still "Want us to set up your profile automatically?" — change to "Auto-fill your profile"
- Check if "I'll fill it in myself" still exists — change to "Fill in manually"

In StepEmergency subtitle:
- Check for em dash — replace with colon or period

## Files to update:
- src/components/onboarding/StepShopInfo.tsx
- src/components/onboarding/StepHours.tsx  
- src/components/onboarding/StepVoice.tsx
- src/components/onboarding/StepAutoFillChoice.tsx
- src/components/onboarding/StepEmergency.tsx
- src/components/onboarding/StepServices.tsx
- src/components/onboarding/StepTestCall.tsx

## Rules
- Do NOT change data logic, API calls, or Supabase saves
- Do NOT change StepProvision, StepForwarding, StepGoLive, StepCalendar
- Keep all existing CSS variables
- Read each file fully before editing

When done:
openclaw system event --text "Done: UI polish pass 3 — welcome header, copy button, button sizing, card heights, SVG icons" --mode now
