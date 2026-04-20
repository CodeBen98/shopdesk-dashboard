import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const REDIRECT_URI = 'https://app.shopdesk.site/api/auth/google-calendar/callback'
const GOOGLE_CALENDAR_STATE_COOKIE = 'shopdesk_google_calendar_state'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const stateCookie = request.headers.get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${GOOGLE_CALENDAR_STATE_COOKIE}=`))
    ?.split('=')
    .slice(1)
    .join('=')

  const cookieParts = stateCookie ? decodeURIComponent(stateCookie).split(':') : []
  const [userId, expectedState, from] = cookieParts
  const returnTo = from === 'settings' ? 'https://app.shopdesk.site/dashboard/settings?tab=integrations&calendar=connected' : 'https://app.shopdesk.site/onboard?calendar=connected'
  const errorReturn = from === 'settings' ? 'https://app.shopdesk.site/dashboard/settings?tab=integrations&calendar=error' : 'https://app.shopdesk.site/onboard?calendar=error'

  if (error || !code || !state || !userId || !expectedState || state !== expectedState) {
    const response = NextResponse.redirect(errorReturn)
    response.cookies.delete(GOOGLE_CALENDAR_STATE_COOKIE)
    return response
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }).toString(),
    })

    const tokens = await tokenRes.json()
    if (!tokenRes.ok || !tokens.refresh_token) {
      console.error('Token exchange failed:', tokens)
      const response = NextResponse.redirect(errorReturn)
      response.cookies.delete(GOOGLE_CALENDAR_STATE_COOKIE)
      return response
    }

    // Use 'primary' directly — fetching /calendars/primary requires broader scope
    // and triggers Google's unverified app warning. 'primary' is a reliable alias
    // for all personal and Workspace accounts.
    const calendarId = 'primary'

    // Verify the token actually works before saving it.
    // This catches scope mismatches and permission issues immediately during
    // onboarding rather than silently failing on the first real booking.
    const verifyRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=1`,
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    )
    if (!verifyRes.ok) {
      console.error('Calendar token verification failed:', await verifyRes.text())
      const response = NextResponse.redirect(errorReturn + '&reason=verify_failed')
      response.cookies.delete(GOOGLE_CALENDAR_STATE_COOKIE)
      return response
    }

    // Only advance onboarding_step when connecting from the wizard, not when reconnecting from Settings
    const updatePayload: Record<string, string> = {
      google_refresh_token: tokens.refresh_token,
      google_calendar_id: calendarId,
    }
    if (from !== 'settings') {
      updatePayload.onboarding_step = 'voice'
    }

    const { error: updateError } = await getSupabase()
      .from('shops')
      .update(updatePayload)
      .eq('owner_id', userId)

    if (updateError) {
      console.error('Failed to save Google Calendar credentials:', updateError)
      const response = NextResponse.redirect(errorReturn)
      response.cookies.delete(GOOGLE_CALENDAR_STATE_COOKIE)
      return response
    }

    const response = NextResponse.redirect(returnTo)
    response.cookies.delete(GOOGLE_CALENDAR_STATE_COOKIE)
    return response
  } catch (err) {
    console.error('Google Calendar callback error:', err)
    const response = NextResponse.redirect(errorReturn)
    response.cookies.delete(GOOGLE_CALENDAR_STATE_COOKIE)
    return response
  }
}
