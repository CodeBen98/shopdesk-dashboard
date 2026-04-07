# Onboarding Wizard — Full Fix Pass 2

Read every file carefully before touching anything. Fix only what's listed. Do not rewrite working logic.

## GLOBAL FIXES (apply to ALL step components)

### 1. Continue button — not full width
All step components have `width: '100%'` on their primary Continue button. Change all of them to:
```
width: 'auto'
minWidth: 200
padding: '13px 32px'
display: 'block'
marginLeft: 'auto'  // right-aligned
```
This applies to: StepShopInfo, StepHours, StepServices, StepEmergency, StepCalendar (keep Connect full width, change Skip), StepVoice, StepForwarding, StepTestCall.
StepGoLive: keep full width — it's the final CTA.
StepProvision: no button.

### 2. Hide browser clock icon on time inputs
In globals.css, add:
```css
input[type="time"]::-webkit-calendar-picker-indicator {
  display: none;
}
input[type="time"] {
  -webkit-appearance: none;
}
```

### 3. Custom checkbox styling
In globals.css, add:
```css
input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid var(--border);
  border-radius: 4px;
  background: var(--card);
  cursor: pointer;
  position: relative;
  transition: background 0.15s, border-color 0.15s;
  flex-shrink: 0;
}
input[type="checkbox"]:checked {
  background: var(--accent);
  border-color: var(--accent);
}
input[type="checkbox"]:checked::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 0px;
  width: 5px;
  height: 9px;
  border: 2px solid white;
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}
```

---

## STEP-BY-STEP FIXES

### StepShopInfo.tsx

1. **Heading:** Change "Let's set up your AI receptionist" → "Set up your AI receptionist"
2. **Subtitle:** Change "Takes less than 5 minutes. We'll have your AI answering calls today." → "Takes less than 5 minutes. Your AI will be answering calls today."
3. **Owner name helper text:** Remove the helper text entirely. The label "Owner / Manager Name" is enough. Remove: `"We'll use this so your AI can say 'I'll have [name] call you back'"`
4. **Vehicle chips:** Change "All Makes & Models" → "All Makes and Models", "Trucks & SUVs" → "Trucks and SUVs", "Korean (Hyundai/Kia)" keep as is (slash is fine in parentheses)
5. **Phone input — country code:** Wrap phone input in a row with a +1 flag prefix:
   - Show a non-editable "+1 🇺🇸" prefix div on the left (inside the input wrapper)
   - The actual input handles the rest of the number
   - Style: the prefix and input share one bordered container
   ```tsx
   <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--card)' }}>
     <div style={{ padding: '10px 12px', borderRight: '1px solid var(--border)', fontSize: 14, color: 'var(--text-mid)', background: 'var(--card-raised)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
       🇺🇸 +1
     </div>
     <input ... style={{ border: 'none', background: 'transparent', flex: 1, padding: '10px 14px', color: 'var(--text)', outline: 'none', fontSize: 14 }} />
   </div>
   ```
6. **Address input — Google Places autocomplete:** Add a data-1p-ignore attribute and placeholder "Street address, City, State ZIP". For now a plain input is fine but add `autoComplete="street-address"` to hint browsers.
7. **Continue button:** Apply global fix (right-aligned, auto width)

### StepAutoFillChoice.tsx

1. **Heading:** Change "Want us to set up your profile automatically?" → "Auto-fill your profile"
2. **Subtitle:** Keep the bold shop name, shorten: "We found [shop name] online. We can pre-fill your hours and contact info — review everything before continuing." (keep em dash here for readability, this is an exception)
   Actually no em dashes. → "We found [shop name] online and can pre-fill your hours and contact info. You review before continuing."
3. **"I'll fill it in myself"** → "Fill in manually"
4. **Cards equal height:** Add `alignItems: 'stretch'` to the cards container, and add `flex: 1` to each card button, with `display: 'flex', flexDirection: 'column'`.
5. **Remove period** from "Takes about 10 seconds."  → "Takes about 10 seconds"
6. **Continue button:** Apply global fix

### StepAutoFillReview.tsx

1. **Heading:** Change "Here's what we found 👀" → "Here is what we found"
2. **Checkmarks:** Replace the ✓ text character with a proper SVG circle-check:
   ```tsx
   <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
     <circle cx="8" cy="8" r="7" fill="rgba(34,197,94,0.12)" stroke="var(--success)" strokeWidth="1.5"/>
     <path d="M5 8l2 2 4-4" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
   </svg>
   ```
   Replace everywhere `<span style={checkmark}>✓</span>` is used.

### StepHours.tsx

1. **"Copy to Tue-Fri" button placement:** Move it OUT of the Monday row. Place it above the days list as a small secondary link, left-aligned:
   ```
   style: background transparent, color var(--accent), border none, fontSize 12, fontWeight 600, cursor pointer, padding 0, marginBottom 16
   ```
   Text: "Copy Monday hours to all weekdays"
2. **Sunday/Saturday Closed state:** When a day is closed, still show the Open/Closed toggle button (do not show just plain text). The current code shows the button. If it's showing plain text, ensure the button renders regardless of `dh.open` state. The button should always show.
3. **Subtitle copy:** Change "Your AI receptionist will use these to greet callers appropriately." → "Your AI uses these to answer calls at the right times."
4. **Continue button:** Apply global fix

### StepServices.tsx

1. **Price placeholder:** Change `"Price (e.g. $49.99)"` → `"Price (optional)"`
2. **Remove button:** Replace the text "Remove" with a small SVG trash icon:
   ```tsx
   <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
     <path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.5 7.5h7L11 4" stroke="var(--danger)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
   </svg>
   ```
   Button: background none, border none, cursor pointer, color var(--danger), padding 4px, display flex
3. **Continue button:** Apply global fix

### StepEmergency.tsx

1. **Subtitle:** Change "Who should be alerted if a caller reports an emergency — overheating, brakes failed, stranded, etc.?" → "Who gets alerted when a caller reports an emergency: overheating, brake failure, or stranded."
2. **Input autocapitalize:** Add `autoCapitalize="words"` to the Contact Name input
3. **Phone input:** Same +1 🇺🇸 prefix treatment as StepShopInfo phone field
4. **Continue button:** Apply global fix

### StepCalendar.tsx

1. **Subtitle:** Change "Let your AI receptionist book appointments directly into your calendar — no double-booking, ever." → "Let your AI book appointments directly into your calendar. No double-booking, ever."
2. **Remove the bordered box** around the bullet points. Just show bullets with no outer border or background. Keep the bullet content.
3. **"Skip for now" link:** Make it slightly more visible — change color from var(--muted) to var(--text-mid), add `textDecoration: 'underline'`

### StepVoice.tsx

1. **Subtitle:** Change "This is the voice your customers will hear when they call. Preview each one before choosing." → "Preview each voice and select the one your customers will hear."
2. **▶ Preview button:** Replace ▶ text character with a proper SVG play icon:
   ```tsx
   <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
     <path d="M2 1.5l6 3.5-6 3.5V1.5z"/>
   </svg>
   ```
   For Stop: a square SVG:
   ```tsx
   <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
     <rect x="2" y="2" width="6" height="6" rx="1"/>
   </svg>
   ```
3. **Disabled button contrast:** When no voice selected, the Continue button says "Select a voice to continue" in var(--muted) on var(--card-raised) background. Add `border: '1px solid var(--border)'` to make it more visible as a disabled state.

### StepProvision.tsx

1. **Slow down auto-advance:** After the API call succeeds and `setDone(true)`, wait 1500ms before calling `onNext()` instead of 600ms. This gives users time to see all stages complete.
   Change: `setTimeout(() => { if (!cancelled) onNext() }, 600)`
   To: `setTimeout(() => { if (!cancelled) onNext() }, 1500)`

### StepForwarding.tsx

1. **"HOW TO SET IT UP:" label:** Remove the colon → "HOW TO SET IT UP"
2. **Custom checkbox:** Already handled by global CSS. No code change needed here.
3. **← Back button position:** Ensure back button is INSIDE the card div, not outside/above it. Check current JSX structure — if `<button onClick={onBack}>` is outside the card div, move it to be the first child inside the card.

### StepTestCall.tsx

1. **Phone number en dash fix:** The number "(407) 555-0123" — make sure it uses a regular hyphen (-) not an en dash (–). Check the DEMO_NUMBER constant and any string that contains the phone number.
2. **"It worked!" → "It worked"** — remove exclamation mark
3. **Button text:** `{loading ? 'Saving...' : 'It worked'}` (no exclamation)
4. **Continue button:** Apply global fix — auto width, right-aligned. Both buttons (It worked + I had a problem) should be auto-width, stacked vertically, centered.

### StepGoLive.tsx

1. **Replace 🎉 emoji** with a custom animated SVG checkmark:
   ```tsx
   <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(15,118,149,0.12)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, marginLeft: 'auto', marginRight: 'auto' }}>
     <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
       <path d="M10 20l8 8 12-16" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
         style={{ strokeDasharray: 40, strokeDashoffset: 0, animation: 'checkmark-draw 0.6s ease forwards' }}
       />
     </svg>
   </div>
   ```
   Add to globals.css:
   ```css
   @keyframes checkmark-draw {
     from { stroke-dashoffset: 40; }
     to { stroke-dashoffset: 0; }
   }
   ```
2. **Voice label em dash:** The VOICE_LABELS object has entries like "Patricia — Warm & Professional". Fix ALL of them:
   - "Patricia — Warm & Professional" → "Patricia, Warm and Professional"
   - "James — Calm & Authoritative" → "James, Calm and Authoritative"
   - "Sofia — Friendly & Energetic" → "Sofia, Friendly and Energetic"
   - "Marcus — Direct & Trustworthy" → "Marcus, Direct and Trustworthy"
3. **Summary card label color:** Change the "YOUR SETUP SUMMARY" label color from `'#4ade80'` to `'var(--success)'` for consistency.
4. **"You're live!"** → keep as is (this is the one celebration exception)

---

## Files to update:
- src/app/globals.css — time input CSS, checkbox CSS, checkmark-draw keyframe
- src/components/onboarding/StepShopInfo.tsx
- src/components/onboarding/StepAutoFillChoice.tsx
- src/components/onboarding/StepAutoFillReview.tsx
- src/components/onboarding/StepHours.tsx
- src/components/onboarding/StepServices.tsx
- src/components/onboarding/StepEmergency.tsx
- src/components/onboarding/StepCalendar.tsx
- src/components/onboarding/StepVoice.tsx
- src/components/onboarding/StepProvision.tsx
- src/components/onboarding/StepForwarding.tsx
- src/components/onboarding/StepTestCall.tsx
- src/components/onboarding/StepGoLive.tsx

## Rules
- Do NOT change any data logic, API calls, or Supabase interactions
- Do NOT change StepAutoFillReview data display logic
- Only fix what is listed above
- Keep all existing CSS variables
- No external libraries
- box-sizing: border-box on all inputs

When done:
openclaw system event --text "Done: Onboarding fixes pass 2 — copy, buttons, emojis, SVG icons, phone prefix, checkmarks, continue button sizing" --mode now
