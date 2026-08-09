/* eAdmin Guinée service worker — privacy-preserving offline shell. */

const VERSION = 'eadmin-pwa-v2-local-images'
const STATIC_CACHE = `${VERSION}-static`
const PUBLIC_API_CACHE = `${VERSION}-public-api`
const NAVIGATION_CACHE = `${VERSION}-navigation`
const PUBLIC_CATALOG_PATHS = new Set([
  '/api/v1/public/service-catalog',
])

const PRECACHE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/site.webmanifest',
  '/logo-128.png',
  '/logo-256.png',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  // Keep the public URLs used by landing/login. Next rewrites these locally to
  // the correctly typed JPEG assets before the service worker caches them.
  '/guinea-hero-conakry.png',
  '/guinea-mosque-conakry.png',
  '/guinea-fouta-djallon.png',
  '/guinea-nimba-mountains.png',
  '/guinea-niger-river.png',
  '/guinea-culture-dance.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith('eadmin-pwa-') && ![
          STATIC_CACHE,
          PUBLIC_API_CACHE,
          NAVIGATION_CACHE,
        ].includes(key))
        .map((key) => caches.delete(key)),
    )),
  )
  self.clients.claim()
})

function hasAuthorization(request) {
  return request.headers.has('Authorization')
}

function isPrivateApi(requestUrl) {
  return requestUrl.pathname.startsWith('/api/v1/')
    && !PUBLIC_CATALOG_PATHS.has(requestUrl.pathname)
}

function isStaticAsset(requestUrl) {
  return requestUrl.pathname.startsWith('/_next/static/')
    || requestUrl.pathname.startsWith('/images/')
    || requestUrl.pathname.endsWith('.png')
    || requestUrl.pathname.endsWith('.jpg')
    || requestUrl.pathname.endsWith('.jpeg')
    || requestUrl.pathname.endsWith('.webp')
    || requestUrl.pathname.endsWith('.svg')
    || requestUrl.pathname.endsWith('.woff2')
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok && response.type !== 'opaque') {
    await cache.put(request, response.clone())
  }
  return response
}

async function staleWhileRevalidatePublic(request) {
  const cache = await caches.open(PUBLIC_API_CACHE)
  const cached = await cache.match(request)
  const networkPromise = fetch(request)
    .then(async (response) => {
      const contentType = response.headers.get('content-type') || ''
      if (
        response.ok
        && response.type !== 'opaque'
        && contentType.includes('application/json')
        && !response.headers.has('set-cookie')
      ) {
        await cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => null)

  if (cached) {
    void networkPromise
    return cached
  }

  const network = await networkPromise
  if (network) return network
  return new Response(
    JSON.stringify({ detail: 'Catalogue public indisponible hors connexion.' }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    },
  )
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(NAVIGATION_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok && response.type === 'basic') {
      await cache.put('/', response.clone())
    }
    return response
  } catch {
    return (await cache.match('/'))
      || (await caches.open(STATIC_CACHE)).match('/')
      || new Response('eAdmin Guinée est temporairement hors connexion.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Never cache authenticated requests, private APIs, or browser extension data.
  if (hasAuthorization(request) || isPrivateApi(url)) {
    event.respondWith(fetch(request))
    return
  }

  if (PUBLIC_CATALOG_PATHS.has(url.pathname)) {
    event.respondWith(staleWhileRevalidatePublic(request))
    return
  }

  if (request.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  if (url.origin === self.location.origin && isStaticAsset(url)) {
    event.respondWith(cacheFirst(request))
  }
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
