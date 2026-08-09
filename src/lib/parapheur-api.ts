import { API_URL } from '@/lib/api-base-url'
import { getActiveAccessToken } from '@/lib/auth-client'

export type ParapheurAction = 'sign' | 'approve' | 'viser' | 'stamp' | 'reject'

export interface PendingParapheurItem {
  step_id: string
  circuit_id: string
  document_id: string
  document_title: string
  action_type: Exclude<ParapheurAction, 'reject'>
  circuit_name: string
  order: number
  created_at?: string | null
  requested_by: string
}

export interface AdvanceParapheurResult {
  circuit_id: string
  step_id: string
  action: ParapheurAction
  circuit_status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled'
  current_step: number
  total_steps: number
  signature_hash?: string | null
  completed_at?: string | null
  comment?: string | null
}

export interface VerificationResult {
  is_valid: boolean
  signature_id: string
  signer?: {
    name: string
    role: string
  } | null
  action_type?: string | null
  circuit_status?: string | null
  completed_at?: string | null
  document_id?: string | null
  document_version?: number | null
  document_hash?: string | null
  evidence_timestamp?: string | null
  evidence_type?: string | null
  evidence_algorithm?: string | null
  qualified_pki?: boolean
  reason: string
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getActiveAccessToken()
  if (!token) throw new Error('Session expirée. Veuillez vous reconnecter.')

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  if (init.body !== undefined) headers.set('Content-Type', 'application/json')

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
    // Fall through to the status-aware error below.
  }

  if (!response.ok) {
    const detail = payload && typeof payload === 'object' && 'detail' in payload
      ? (payload as { detail?: unknown }).detail
      : null
    throw new Error(typeof detail === 'string' ? detail : 'Le parapheur est momentanément indisponible.')
  }

  return payload as T
}

export async function listPending(): Promise<PendingParapheurItem[]> {
  return apiFetch<PendingParapheurItem[]>('/api/v1/documents/parapheur/pending')
}

export async function advance(
  item: Pick<PendingParapheurItem, 'circuit_id' | 'step_id'>,
  action: ParapheurAction,
  comment?: string,
): Promise<AdvanceParapheurResult> {
  return apiFetch<AdvanceParapheurResult>(
    `/api/v1/documents/parapheur/${encodeURIComponent(item.circuit_id)}/advance`,
    {
      method: 'POST',
      body: JSON.stringify({
        step_id: item.step_id,
        action,
        comment: comment?.trim() || null,
      }),
    },
  )
}

export async function verify(
  circuitId: string,
  signatureHash: string,
): Promise<VerificationResult> {
  return apiFetch<VerificationResult>(
    `/api/v1/documents/parapheur/${encodeURIComponent(circuitId)}/verify/${encodeURIComponent(signatureHash.trim())}`,
  )
}
