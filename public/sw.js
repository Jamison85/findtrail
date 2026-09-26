const VERSION = 'findtrail-v2.12.1-water-2026-09-26'
const STATIC_CACHE = `${VERSION}-static`
const RUNTIME_CACHE = `${VERSION}-runtime`
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, '')
const scoped = (path) => `${BASE_PATH}${path}` || '/'
const WATER_VIDEO = scoped('/findtrail-reset-water.mp4')
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/social-preview.png', '/home-memory-trail.webp', '/findtrail-natural-feather-v2.webp', '/findtrail-reset-lake.webp', '/findtrail-reset-water.mp4'].map(scoped)

async function cachedVideoRange(request) {
  const response = await caches.match(WATER_VIDEO)
  if (!response) return fetch(request)

  const range = request.headers.get('range')?.match(/^bytes=(\d*)-(\d*)$/)
  if (!range) return response
  const bytes = await response.arrayBuffer()
  const size = bytes.byteLength
  const suffix = range[1] === '' && range[2] !== ''
  const start = suffix ? Math.max(0, size - Number(range[2])) : Number(range[1])
  const end = suffix ? size - 1 : range[2] ? Math.min(size - 1, Number(range[2])) : size - 1
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= size || end < start) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
  }

  return new Response(bytes.slice(start, end + 1), {
    status: 206,
    headers: {
      'Accept-Ranges': 'bytes',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Content-Type': response.headers.get('Content-Type') || 'video/mp4',
    },
  })
}

async function precacheAppShell() {
  const cache = await caches.open(STATIC_CACHE)
  await cache.addAll(APP_SHELL)

  // Vite fingerprints production assets. Discover those URLs from the built
  // index so a first successful visit is enough for a complete offline launch.
  const indexResponse = await fetch(scoped('/index.html'), { cache: 'reload' })
  if (!indexResponse.ok) throw new Error('Could not cache the app shell')
  const html = await indexResponse.clone().text()
  const assetUrls = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => new URL(match[1], self.registration.scope))
    .filter((url) => url.origin === self.location.origin && url.pathname.startsWith(`${BASE_PATH}/assets/`))
    .map((url) => url.href)
  await cache.addAll([...new Set(assetUrls)])
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheAppShell())
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key)))),
      self.clients.claim(),
    ]),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return

  if (new URL(event.request.url).pathname === WATER_VIDEO && event.request.headers.has('range')) {
    event.respondWith(cachedVideoRange(event.request))
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (response.ok) await (await caches.open(RUNTIME_CACHE)).put(event.request, response.clone())
          return response
        })
        .catch(async () => (await caches.match(event.request)) || (await caches.match(scoped('/index.html'))) || Response.error()),
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then(async (response) => {
      if (response.ok && ['script', 'style', 'image', 'font'].includes(event.request.destination)) {
        await (await caches.open(RUNTIME_CACHE)).put(event.request, response.clone())
      }
      return response
    })),
  )
})
