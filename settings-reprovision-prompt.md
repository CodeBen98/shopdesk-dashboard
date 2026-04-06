# Settings → Re-provision Vapi Agent

When a shop owner saves changes in the Settings page (hours, services, AI voice, emergency contact), the Vapi agent should be updated automatically with the new system prompt.

## What to add to src/app/dashboard/settings/page.tsx

The settings page has 5 tabs with save buttons. After any successful save to Supabase, call a re-provision endpoint to update the Vapi agent.

### Step 1: Add a re-provision helper function at the top of the component

```typescript
async function reprovisionAgent() {
  try {
    const res = await fetch('/api/provision-shop', { method: 'POST' })
    if (!res.ok) {
      console.error('Re-provision failed:', await res.text())
    }
  } catch (e) {
    console.error('Re-provision error:', e)
  }
}
```

### Step 2: Call reprovisionAgent after saves that affect the AI

Call reprovisionAgent() after saving these tabs (NOT after shop info email save — those don't affect the AI):
- Hours save → call reprovisionAgent() after successful Supabase update
- Services save → call reprovisionAgent() after successful Supabase update  
- AI & Voice save → call reprovisionAgent() after successful Supabase update (voice + emergency contact)
- Shop Info save → also call reprovisionAgent() (shop name/address/phone affect the AI greeting)

### Step 3: Update the save toast message

When saving tabs that trigger re-provision, change the success toast message to:
"Saved & AI updated" instead of "Saved successfully"

Show a brief loading indicator during the re-provision call (the save toast can stay visible while it runs in background).

### Step 4: Make reprovision non-blocking

The reprovision takes a few seconds. Don't await it before showing the success toast. Fire and forget — just log errors. The user sees "Saved & AI updated" immediately, the actual Vapi update happens in background.

Pattern:
```typescript
// Save to Supabase first
const { error } = await supabase.from('shops').update({...}).eq(...)
if (error) { show('Save failed', 'error'); return }

// Show success immediately
show('Saved & AI updated', 'success')

// Reprovision in background (non-blocking)
reprovisionAgent() // no await
```

## Read the existing settings page carefully before editing

The settings page (src/app/dashboard/settings/page.tsx) already has:
- useToast hook for notifications
- 5 tabs: shop_info, hours, services, ai_voice, phone_setup
- Individual save functions for each tab
- Supabase update calls

Just add the reprovisionAgent function and wire it to the relevant save functions. Do not rewrite anything else.

## Files to update
- src/app/dashboard/settings/page.tsx only

When done:
openclaw system event --text "Done: Settings re-provision wired — agent updates automatically when shop changes hours/services/voice" --mode now
