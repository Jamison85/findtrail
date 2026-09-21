interface AiBinding {
  run(
    model: '@cf/myshell-ai/melotts',
    input: { prompt: string; lang: 'en' },
    options: { returnRawResponse: true },
  ): Promise<Response>
}

interface AssetBinding {
  fetch(request: Request): Promise<Response>
}

interface Env {
  AI: AiBinding
  ASSETS: AssetBinding
}

const TTS_MODEL = '@cf/myshell-ai/melotts'
const MAX_SPEECH_CHARACTERS = 600

function sameOriginBrowserRequest(request: Request): boolean {
  const expectedOrigin = new URL(request.url).origin
  const origin = request.headers.get('origin')
  const fetchSite = request.headers.get('sec-fetch-site')

  if (origin && origin !== expectedOrigin) return false
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') return false

  // Normal browser/PWA requests provide at least one of these headers.
  // Reject bare server-to-server requests so this endpoint is less attractive
  // as a free public TTS proxy.
  return Boolean(origin || fetchSite)
}

async function createSpeech(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } })
  }
  if (!sameOriginBrowserRequest(request)) return new Response('Forbidden', { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const text = typeof body === 'object' && body !== null && 'text' in body
    ? String((body as { text: unknown }).text).trim()
    : ''

  if (!text) return new Response('Text is required', { status: 400 })
  if (text.length > MAX_SPEECH_CHARACTERS) return new Response('Text is too long', { status: 413 })

  try {
    const audio = await env.AI.run(TTS_MODEL, { prompt: text, lang: 'en' }, { returnRawResponse: true })
    if (!audio.ok || !audio.body) return new Response('Voice service unavailable', { status: 502 })

    return new Response(audio.body, {
      status: 200,
      headers: {
        'content-type': audio.headers.get('content-type') ?? 'audio/mpeg',
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff',
      },
    })
  } catch {
    return new Response('Voice service unavailable', { status: 502 })
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/tts') return createSpeech(request, env)
    return env.ASSETS.fetch(request)
  },
}
