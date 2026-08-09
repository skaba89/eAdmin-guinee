export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface BackendUser {
  id: string
  email: string
  full_name: string
  role: string
  frontend_role: string
  institution?: string | null
  is_active: boolean
  mfa_enabled: boolean
  created_at: string
}

export interface JwtPayload {
  sub?: string
  role?: string
  frontend_role?: string
  tenant_id?: string
  institution_id?: string
  mfa_required?: boolean
  mfa_verified?: boolean
  type?: string
  exp?: number
}

export interface MfaSetupResponse {
  secret: string
  qr_code_uri: string
  backup_codes: string[]
}

export interface SsoStatus {
  enabled: boolean
  provider: string | null
  issuer_configured: boolean
  pkce: string
  state_server_side: boolean
  nonce_required: boolean
  auto_provision: boolean
  local_authorization_authoritative: boolean
}

export interface SsoExchangeResult extends AuthTokens {
  mfa_required: boolean
  return_to: string
}

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '')

const ACTIVE_ACCESS_KEY = 'eadmin.access_token'
const ACTIVE_REFRESH_KEY = 'eadmin.refresh_token'
const PENDING_ACCESS_KEY = 'eadmin.mfa_pending_access_token'
const PENDING_REFRESH_KEY = 'eadmin.mfa_pending_refresh_token'

function readErrorDetail(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail?: unknown }).detail
    if (typeof detail === 'string' && detail.trim()) return detail
    if (detail && typeof detail === 'object' && 'message' in detail) {
      const message = (detail as { message?: unknown }).message
      if (typeof message === 'string' && message.trim()) return message
    }
  }
  return fallback
}

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    // Keep the fallback when the server returns a non-JSON error.
  }

  if (!response.ok) {
    throw new Error(readErrorDetail(payload, fallback))
  }

  return payload as T
}

export function decodeJwtPayload(token: string): JwtPayload {
  try {
    const [, payload] = token.split('.')
    if (!payload) return {}
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return JSON.parse(atob(padded)) as JwtPayload
  } catch {
    return {}
  }
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const form = new URLSearchParams()
  form.set('username', email.trim().toLowerCase())
  form.set('password', password)

  const response = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    credentials: 'include',
  })

  return parseResponse<AuthTokens>(response, 'Connexion impossible. Vérifiez vos identifiants.')
}

export async function getSsoStatus(): Promise<SsoStatus> {
  const response = await fetch(`${API_URL}/api/v1/auth/sso/status`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  })
  return parseResponse<SsoStatus>(response, 'Impossible de vérifier la disponibilité du SSO.')
}

export function getSsoLoginUrl(frontendOrigin: string, returnTo = '/'): string {
  const params = new URLSearchParams()
  params.set('frontend_origin', frontendOrigin)
  params.set('return_to', returnTo)
  return `${API_URL}/api/v1/auth/sso/oidc/login?${params.toString()}`
}

export async function exchangeSsoCode(exchangeCode: string): Promise<SsoExchangeResult> {
  const response = await fetch(`${API_URL}/api/v1/auth/sso/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exchange_code: exchangeCode }),
    credentials: 'include',
    cache: 'no-store',
  })
  return parseResponse<SsoExchangeResult>(
    response,
    'La connexion SSO a expiré ou n’est plus valide. Veuillez recommencer.',
  )
}

export async function getCurrentUser(accessToken: string): Promise<BackendUser> {
  const response = await fetch(`${API_URL}/api/v1/auth/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: 'include',
    cache: 'no-store',
  })

  return parseResponse<BackendUser>(response, 'Impossible de charger le profil utilisateur.')
}

export async function verifyMfa(accessToken: string, code: string): Promise<AuthTokens> {
  const response = await fetch(`${API_URL}/api/v1/auth/verify-mfa`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
    credentials: 'include',
  })

  const result = await parseResponse<AuthTokens & { message?: string }>(
    response,
    'Code MFA invalide ou expiré.',
  )

  return {
    access_token: result.access_token,
    refresh_token: result.refresh_token,
    token_type: result.token_type || 'bearer',
  }
}

export async function setupMfa(accessToken: string): Promise<MfaSetupResponse> {
  const response = await fetch(`${API_URL}/api/v1/auth/setup-mfa`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: 'include',
  })

  return parseResponse<MfaSetupResponse>(response, 'Impossible de configurer le MFA.')
}

export async function logout(accessToken: string | null): Promise<void> {
  if (!accessToken) return

  try {
    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    })
  } catch {
    // Local cleanup must always succeed, even when the API is unreachable.
  }
}

export function storeActiveTokens(tokens: AuthTokens): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(ACTIVE_ACCESS_KEY, tokens.access_token)
  sessionStorage.setItem(ACTIVE_REFRESH_KEY, tokens.refresh_token)
  sessionStorage.removeItem(PENDING_ACCESS_KEY)
  sessionStorage.removeItem(PENDING_REFRESH_KEY)
}

export function storePendingTokens(tokens: AuthTokens): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(PENDING_ACCESS_KEY, tokens.access_token)
  sessionStorage.setItem(PENDING_REFRESH_KEY, tokens.refresh_token)
  sessionStorage.removeItem(ACTIVE_ACCESS_KEY)
  sessionStorage.removeItem(ACTIVE_REFRESH_KEY)
}

export function getActiveAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(ACTIVE_ACCESS_KEY)
}

export function getActiveRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(ACTIVE_REFRESH_KEY)
}

export function getPendingAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(PENDING_ACCESS_KEY)
}

export function clearAuthTokens(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(ACTIVE_ACCESS_KEY)
  sessionStorage.removeItem(ACTIVE_REFRESH_KEY)
  sessionStorage.removeItem(PENDING_ACCESS_KEY)
  sessionStorage.removeItem(PENDING_REFRESH_KEY)
}
