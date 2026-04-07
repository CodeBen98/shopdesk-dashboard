import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const REDIRECT_URI = 'https://app.shopdesk.site/api/auth/google-calendar/callback'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const userId = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code || !userId) {
    return NextResponse.redirect('https://app.shopdesk.site/onboard?calendar=error')
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

    return NextResponse.redirect('https://app.shopdesk.site/onboard?calendar=connected')
  } catch (err) {
    console.error('Google Calendar callback error:', err)
    return NextResponse.redirect('https://app.shopdesk.site/onboard?calendar=error')
  }
}
