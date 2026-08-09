import { API_URL } from '@/lib/api-base-url'
import { getActiveAccessToken } from '@/lib/auth-client'

export interface InstitutionOption {
  id: string
  name: string
  type: string
  code: string | null
  parentId: string | null
}

interface InstitutionsResponse {
  items: InstitutionOption[]
}

interface ApiErrorPayload {
  detail?: unknown
}

function readMessage(payload: ApiErrorPayload | null, fallback: string): string {
  if (typeof payload?.detail === 'string' && payload.detail.trim()) return payload.detail
  if (payload?.detail && typeof payload.detail === 'object' && 'message' in payload.detail) {
    const message = (payload.detail as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

export async function listInstitutions(input?: {
  type?: string
  search?: string
  limit?: number
}): Promise<InstitutionOption[]> {
  const token = getActiveAccessToken()
  if (!token) throw new Error('Session expirée. Veuillez vous reconnecter.')

  const params = new URLSearchParams()
  params.set('limit', String(input?.limit || 500))
  if (input?.type?.trim()) params.set('type', input.type.trim())
  if (input?.search?.trim()) params.set('search', input.search.trim())

  const response = await fetch(`${API_URL}/api/v1/institutions?${params.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
    cache: 'no-store',
  })

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    // Deterministic fallback below.
  }

  if (!response.ok) {
    throw new Error(
      readMessage(
        payload && typeof payload === 'object' ? payload as ApiErrorPayload : null,
        'Impossible de charger les institutions.',
      ),
    )
  }

  const result = payload as InstitutionsResponse
  return Array.isArray(result.items) ? result.items : []
}
