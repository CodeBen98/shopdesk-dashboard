import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { captureAndRecord, recordMonitoringEvent } from '@/lib/monitoring'

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

  const [userId, expectedState] = stateCookie ? decodeURIComponent(stateCookie).split(':') : []

  if (error || !code || !state || !userId || !expectedState || state !== expectedState) {
    await recordMonitoringEvent({
      source: 'dashboard-api',
      eventType: 'google_calendar_callback_state_error',
      severity: 'critical',
      shopId: null,
      message: 'Google Calendar callback failed state validation',
      payload: { hasCode: Boolean(code), hasState: Boolean(state), hasUserId: Boolean(userId), hasExpectedState: Boolean(expectedState), error },
    })
    const response = NextResponse.redirect('https://app.shopdesk.site/onboard?calendar=error')
    response.cookies.delete(GOOGLE_CALENDAR_STATE_COOKIE)
    return response
  }

  try {
    // Exchange code for tokens
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
      await recordMonitoringEvent({
        source: 'dashboard-api',
        eventType: 'google_calendar_token_exchange_failed',
        severity: 'critical',
        shopId: null,
        message: 'Google Calendar token exchange failed',
        payload: { tokenStatus: tokenRes.status, tokenBody: tokens },
      })
      return NextResponse.redirect('https://app.shopdesk.site/onboard?calendar=error')
    }

    // Get the Google Calendar ID (user's primary calendar email)
    const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    })
    const calData = await calRes.json()
    const calendarId = calData.id || 'primary'

    // Save refresh token + calendar ID to shop
    await getSupabase()
      .from('shops')
      .update({
        google_refresh_token: tokens.refresh_token,
        google_calendar_id: calendarId,
        onboarding_step: 'voice',
      })
      .eq('owner_id', userId)

    const response = NextResponse.redirect('https://app.shopdesk.site/onboard?calendar=connected')
    response.cookies.delete(GOOGLE_CALENDAR_STATE_COOKIE)
    return response
  } catch (err) {
    console.error('Google Calendar callback error:', err)
    await captureAndRecord({
      source: 'dashboard-api',
      eventType: 'google_calendar_callback_error',
      severity: 'critical',
      shopId: null,
      message: 'Google Calendar callback failed',
      payload: {},
      error: err,
    })
    const response = NextResponse.redirect('https://app.shopdesk.site/onboard?calendar=error')
    response.cookies.delete(GOOGLE_CALENDAR_STATE_COOKIE)
    return response
  }
}
