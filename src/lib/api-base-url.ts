const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim()

/**
 * Browser API origin used by every frontend client.
 *
 * - Development may fall back to the local FastAPI service.
 * - Production never falls back to localhost. A missing production value uses
 *   the current origin so a configuration issue is visible as an HTTP error
 *   instead of attempting to contact the user's own machine.
 * - Render Docker builds additionally fail fast in the Dockerfile when the
 *   public API URL is missing or not HTTPS.
 */
export const API_URL = (
  configuredApiUrl
  || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '')
).replace(/\/$/, '')
