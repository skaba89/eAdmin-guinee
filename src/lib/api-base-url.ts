const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim()

function localBrowserApiUrl(): string {
  if (typeof window === 'undefined') return ''

  const hostname = window.location.hostname.toLowerCase()
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return 'http://localhost:8000'
  }

  return ''
}

/**
 * Browser API origin used by every frontend client.
 *
 * - NEXT_PUBLIC_API_URL always wins when configured.
 * - A browser actually opened on localhost/127.0.0.1 may safely recover to the
 *   local FastAPI service on port 8000. This also protects local production
 *   builds/stale containers from posting /api/v1/* back to Next.js on :3000.
 * - Development server-side code may also fall back to the local FastAPI service.
 * - Non-local production never falls back to localhost. Render Docker builds
 *   additionally fail fast when the public API URL is missing or not HTTPS.
 */
export const API_URL = (
  configuredApiUrl
  || localBrowserApiUrl()
  || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '')
).replace(/\/$/, '')
