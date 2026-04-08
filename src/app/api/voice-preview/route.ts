import { NextResponse } from 'next/server'

const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY!

const VOICE_IDS: Record<string, string> = {
  cindy:      '1242fb95-7ddd-44ac-8a05-9e8a22a6137d',
  jacqueline: '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc',
  james:      '42b39f37-515f-4eee-8546-73e841679c1d',
  marcus:     '9301949d-b7cd-40d9-a246-5a4430992d6b',
}

const PREVIEW_TEXT: Record<string, string> = {
  cindy:      "Thank you for calling. This is Cindy. How can I help you today?",
  jacqueline: "Thank you for calling. This is Jacqueline. How can I help you today?",
  james:      "Thank you for calling. This is James. How can I help you today?",
  marcus:     "Thank you for calling. This is Marcus. How can I help you today?",
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const voice = searchParams.get('voice')

  if (!voice || !VOICE_IDS[voice]) {
    return NextResponse.json({ error: 'Invalid voice' }, { status: 400 })
  }

  const res = await fetch('https://api.cartesia.ai/tts/bytes', {
    method: 'POST',
    headers: {
      'Cartesia-Version': '2024-06-10',
      'X-API-Key': CARTESIA_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_id: 'sonic-2',
      voice: { mode: 'id', id: VOICE_IDS[voice] },
      transcript: PREVIEW_TEXT[voice],
      output_format: { container: 'mp3', encoding: 'mp3', sample_rate: 44100 },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: 500 })
  }

  const audioBuffer = await res.arrayBuffer()
  return new NextResponse(audioBuffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
