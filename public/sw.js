const VERSION = 'findtrail-v2.4.15-peaceful-breath-cue-2026-09-20'
const STATIC_CACHE = `${VERSION}-static`
const RUNTIME_CACHE = `${VERSION}-runtime`
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, '')
const scoped = (path) => `${BASE_PATH}${path}` || '/'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/social-preview.png', '/home-memory-trail.webp', '/findtrail-natural-feather-v2.webp', '/findtrail-reset-lake.webp'].map(scoped)

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
  event.waitUntil(precacheAppShell().then(() => self.skipWaiting()))
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
