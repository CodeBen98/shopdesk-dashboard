import { NextResponse } from 'next/server'

export async function GET() {
  const res = await fetch(`https://api.vapi.ai/phone-number/${process.env.VAPI_PHONE_NUMBER_ID}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      serverUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/vapi-webhook`,
    }),
  })
  const data = await res.json()
  return NextResponse.json({ ok: res.ok, serverUrl: data.serverUrl })
}
