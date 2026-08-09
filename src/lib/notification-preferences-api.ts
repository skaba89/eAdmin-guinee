import { API_URL } from '@/lib/api-base-url'
import { getActiveAccessToken } from '@/lib/auth-client'

export interface NotificationPreferences {
  email: {
    address: string
    enabled: boolean
  }
  mobile: {
    phoneE164: string | null
    phoneMasked: string | null
    verified: boolean
    verifiedAt: string | null
    smsEnabled: boolean
    whatsappEnabled: boolean
    smsProviderConfigured: boolean
    whatsappProviderConfigured: boolean
  }
  consent: {
    version: string | null
    currentVersion: string
    current: boolean
    updatedAt: string | null
  }
}

export interface MobileVerificationChallenge {
  challengeId: string
  channel: 'sms' | 'whatsapp'
  phoneMasked: string
  expiresAt: string
  message: string
}

interface ApiErrorPayload {
  detail?: unknown
  remainingAttempts?: number
}

export class NotificationPreferencesApiError extends Error {
  status: number
  remainingAttempts?: number

  constructor(message: string, status: number, remainingAttempts?: number) {
    super(message)
    this.name = 'NotificationPreferencesApiError'
    this.status = status
    this.remainingAttempts = remainingAttempts
  }
}

function readErrorMessage(payload: ApiErrorPayload | null, fallback: string): string {
  if (typeof payload?.detail === 'string' && payload.detail.trim()) return payload.detail
  if (payload?.detail && typeof payload.detail === 'object' && 'message' in payload.detail) {
    const message = (payload.detail as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

async function authenticatedRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getActiveAccessToken()
  if (!token) {
    throw new NotificationPreferencesApiError('Votre session a expiré. Reconnectez-vous.', 401)
  }

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
  })

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    // Keep a deterministic fallback for proxy/provider errors that are not JSON.
  }

  if (!response.ok) {
    const errorPayload = payload && typeof payload === 'object' ? payload as ApiErrorPayload : null
    throw new NotificationPreferencesApiError(
      readErrorMessage(errorPayload, 'Impossible de traiter les préférences de notification.'),
      response.status,
      errorPayload?.remainingAttempts,
    )
  }

  return payload as T
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return authenticatedRequest<NotificationPreferences>('/api/v1/notification-preferences/me')
}

export async function startMobileVerification(
  phone: string,
  channel: 'sms' | 'whatsapp',
): Promise<MobileVerificationChallenge> {
  return authenticatedRequest<MobileVerificationChallenge>(
    '/api/v1/notification-preferences/mobile-verification/start',
    {
      method: 'POST',
      body: JSON.stringify({ phone, channel }),
    },
  )
}

export async function confirmMobileVerification(
  challengeId: string,
  code: string,
): Promise<NotificationPreferences> {
  return authenticatedRequest<NotificationPreferences>(
    '/api/v1/notification-preferences/mobile-verification/confirm',
    {
      method: 'POST',
      body: JSON.stringify({ challenge_id: challengeId, code }),
    },
  )
}

export async function updateNotificationPreferences(input: {
  emailEnabled?: boolean
  smsEnabled?: boolean
  whatsappEnabled?: boolean
  confirmMobileConsent?: boolean
}): Promise<NotificationPreferences> {
  return authenticatedRequest<NotificationPreferences>(
    '/api/v1/notification-preferences/me',
    {
      method: 'PATCH',
      body: JSON.stringify({
        email_enabled: input.emailEnabled,
        sms_enabled: input.smsEnabled,
        whatsapp_enabled: input.whatsappEnabled,
        confirm_mobile_consent: input.confirmMobileConsent ?? false,
      }),
    },
  )
}
