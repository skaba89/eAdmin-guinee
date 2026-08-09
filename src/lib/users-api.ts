import { getActiveAccessToken } from '@/lib/auth-client'
import { getApiBaseUrl } from '@/lib/api-base-url'

export type BackendRole =
  | 'CITOYEN'
  | 'AGENT'
  | 'MAIRIE'
  | 'AGENCE'
  | 'ADMIN'
  | 'CHEF_SERVICE'
  | 'DIRECTEUR'
  | 'MINISTRE'
  | 'SUPER_ADMIN'

export interface ManagedUser {
  id: string
  email: string
  full_name: string
  role: BackendRole
  institution: string | null
  tenant_id: string | null
  institution_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PaginatedUsers {
  items: ManagedUser[]
  total: number
  page: number
  page_size: number
  total_pages: number
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

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getActiveAccessToken()
  if (!token) throw new Error('Session expirée. Veuillez vous reconnecter.')

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
  })

  if (response.status === 204) return undefined as T

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    // Keep deterministic fallback below.
  }

  if (!response.ok) {
    throw new Error(
      readMessage(
        payload && typeof payload === 'object' ? payload as ApiErrorPayload : null,
        'Impossible de traiter la gestion des utilisateurs.',
      ),
    )
  }
  return payload as T
}

export async function listManagedUsers(input?: {
  search?: string
  role?: BackendRole | ''
  page?: number
  pageSize?: number
}): Promise<PaginatedUsers> {
  const params = new URLSearchParams()
  params.set('page', String(input?.page || 1))
  params.set('page_size', String(input?.pageSize || 100))
  if (input?.search?.trim()) params.set('search', input.search.trim())
  if (input?.role) params.set('role', input.role)
  return apiFetch<PaginatedUsers>(`/api/v1/users?${params.toString()}`)
}

export async function createManagedUser(input: {
  email: string
  password: string
  fullName: string
  role: BackendRole
  institution?: string
  tenantId?: string
  institutionId?: string
}): Promise<ManagedUser> {
  return apiFetch<ManagedUser>('/api/v1/users', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      full_name: input.fullName.trim(),
      role: input.role,
      institution: input.institution?.trim() || null,
      tenant_id: input.tenantId?.trim() || null,
      institution_id: input.institutionId?.trim() || null,
    }),
  })
}

export async function updateManagedUser(
  userId: string,
  input: {
    email?: string
    fullName?: string
    role?: BackendRole
    institution?: string
    institutionId?: string
  },
): Promise<ManagedUser> {
  return apiFetch<ManagedUser>(`/api/v1/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: JSON.stringify({
      email: input.email?.trim().toLowerCase(),
      full_name: input.fullName?.trim(),
      role: input.role,
      institution: input.institution?.trim() || null,
      institution_id: input.institutionId?.trim() || null,
    }),
  })
}

export async function deactivateManagedUser(userId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  })
}
