const VERSION = 'findtrail-v2.12.4-final-polish-2026-10-02'
const STATIC_CACHE = `${VERSION}-static`
const RUNTIME_CACHE = `${VERSION}-runtime`
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, '')
const scoped = (path) => `${BASE_PATH}${path}` || '/'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/home-memory-trail.webp', '/findtrail-natural-feather-v2.webp', '/findtrail-reset-lake.webp', '/findtrail-water-impact.mp4'].map(scoped)

async function waterVideoResponse(request) {
  const cached = await caches.match(request.url, { ignoreVary: true })
  if (!cached) return fetch(request)
  const range = request.headers.get('range')
  if (!range) return cached
  const match = /^bytes=(\d*)-(\d*)$/.exec(range)
  if (!match) return fetch(request)
  const data = await cached.arrayBuffer()
  const start = match[1] ? Number(match[1]) : Math.max(0, data.byteLength - Number(match[2]))
  const end = match[1] && match[2] ? Math.min(Number(match[2]), data.byteLength - 1) : data.byteLength - 1
  if (start > end || start >= data.byteLength) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${data.byteLength}` } })
  }
  return new Response(data.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${data.byteLength}`,
      'Accept-Ranges': 'bytes',
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
      caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('findtrail-') && ![STATIC_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key)))),
      self.clients.claim(),
    ]),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return

  if (new URL(event.request.url).pathname === scoped('/findtrail-water-impact.mp4')) {
    event.respondWith(waterVideoResponse(event.request))
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (response.ok) await (await caches.open(RUNTIME_CACHE)).put(event.request, response.clone())
          return response
        })
        .catch(async () => (await caches.match(event.request, { ignoreVary: true })) || (await caches.match(scoped('/index.html'), { ignoreVary: true })) || Response.error()),
    )
    return
  }

  event.respondWith(
    caches.match(event.request, { ignoreVary: true }).then((cached) => cached || fetch(event.request).then(async (response) => {
      if (response.ok && ['script', 'style', 'image', 'font'].includes(event.request.destination)) {
        await (await caches.open(RUNTIME_CACHE)).put(event.request, response.clone())
      }
      return response
    })),
  )
})
