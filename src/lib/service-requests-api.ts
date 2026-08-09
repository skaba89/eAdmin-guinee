import { getActiveAccessToken } from '@/lib/auth-client'
import { getStableIdempotencyKey } from '@/lib/idempotency-client'
import type {
  CitizenRequest,
  GeneratedDocument,
  ProcessingNote,
  RequestStatus,
  SatisfactionRating,
  UploadedDocument,
} from '@/store/citizen-requests-store'

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '')

// The current page/store API launches document persistence and the PRETE status
// mutation back-to-back. Track the authoritative document write per request so
// PRETE is never sent before that write has succeeded. A rejected write is
// deliberately propagated and prevents the status request from leaving the browser.
const pendingGeneratedDocumentWrites = new Map<string, Promise<CitizenRequest>>()

export interface InstitutionOption {
  id: string
  name: string
  type: string
  code?: string | null
  parentId?: string | null
}

export interface CreateServiceRequestInput {
  serviceId: string
  targetInstitutionId: string
  citizenName: string
  citizenFirstName: string
  citizenNIN: string
  citizenPhone: string
  citizenEmail: string
  citizenAddress: string
  motif: string
  mairie?: string
  deliveryMode: CitizenRequest['deliveryMode']
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getActiveAccessToken()
  if (!token) throw new Error('Session expirée. Veuillez vous reconnecter.')

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  if (!(init.body instanceof FormData) && init.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_URL}${path}`, {
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
    // Use fallback message below.
  }

  if (!response.ok) {
    const detail = payload && typeof payload === 'object' && 'detail' in payload
      ? (payload as { detail?: unknown }).detail
      : null
    const message = typeof detail === 'string'
      ? detail
      : 'Une erreur est survenue lors de la communication avec eAdmin.'
    throw new Error(message)
  }

  return payload as T
}

export async function listInstitutions(search?: string): Promise<InstitutionOption[]> {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  params.set('limit', '500')
  const payload = await apiFetch<{ items: InstitutionOption[] }>(
    `/api/v1/institutions?${params.toString()}`,
  )
  return payload.items
}

export async function listRequests(): Promise<CitizenRequest[]> {
  const payload = await apiFetch<{ items: CitizenRequest[] }>(
    '/api/v1/service-requests?page=1&page_size=200',
  )
  return payload.items
}

export async function createRequest(input: CreateServiceRequestInput): Promise<CitizenRequest> {
  // Canonicalize exactly the payload sent to the backend. The derived key is
  // kept in sessionStorage only, so a mobile reconnect can safely retry the
  // same mutation without storing any citizen business data offline.
  const requestPayload = {
    service_id: input.serviceId,
    target_institution_id: input.targetInstitutionId,
    citizen_name: input.citizenName,
    citizen_first_name: input.citizenFirstName,
    citizen_nin: input.citizenNIN,
    citizen_phone: input.citizenPhone,
    citizen_email: input.citizenEmail,
    citizen_address: input.citizenAddress,
    motif: input.motif,
    mairie: input.mairie || null,
    delivery_mode: input.deliveryMode,
  }
  const idempotencyKey = await getStableIdempotencyKey(requestPayload)

  return apiFetch<CitizenRequest>('/api/v1/service-requests', {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(requestPayload),
  })
}

export async function updateStatus(id: string, status: RequestStatus, note?: string): Promise<CitizenRequest> {
  if (status === 'prete') {
    const pendingDocumentWrite = pendingGeneratedDocumentWrites.get(id)
    if (pendingDocumentWrite) {
      await pendingDocumentWrite
    }
  }

  return apiFetch<CitizenRequest>(`/api/v1/service-requests/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, note: note || null }),
  })
}

export async function assignRequest(id: string, agent: string): Promise<CitizenRequest> {
  return apiFetch<CitizenRequest>(`/api/v1/service-requests/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify({ agent_name: agent, agent_id: null }),
  })
}

export async function addNote(
  id: string,
  note: Omit<ProcessingNote, 'id' | 'date'>,
): Promise<ProcessingNote> {
  return apiFetch<ProcessingNote>(`/api/v1/service-requests/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify({ text: note.text, note_type: note.type }),
  })
}

export async function completeRequest(
  id: string,
  deliveryMode: CitizenRequest['deliveryMode'],
  deliveryLocation?: string,
): Promise<CitizenRequest> {
  return apiFetch<CitizenRequest>(`/api/v1/service-requests/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify({
      delivery_mode: deliveryMode,
      delivery_location: deliveryLocation || null,
    }),
  })
}

export async function saveGeneratedDocument(id: string, document: GeneratedDocument): Promise<CitizenRequest> {
  const write = apiFetch<CitizenRequest>(`/api/v1/service-requests/${id}/generated-document`, {
    method: 'POST',
    body: JSON.stringify({
      title: document.title,
      html_content: document.htmlContent,
      file_name: document.fileName,
    }),
  })

  pendingGeneratedDocumentWrites.set(id, write)
  try {
    return await write
  } finally {
    if (pendingGeneratedDocumentWrites.get(id) === write) {
      pendingGeneratedDocumentWrites.delete(id)
    }
  }
}

export async function uploadAttachment(
  requestId: string,
  file: File,
  requiredDocName: string,
): Promise<UploadedDocument> {
  const form = new FormData()
  form.set('file', file)
  form.set('required_doc_name', requiredDocName)
  return apiFetch<UploadedDocument>(`/api/v1/service-requests/${requestId}/attachments`, {
    method: 'POST',
    body: form,
  })
}

export async function verifyAttachment(requestId: string, attachmentId: string): Promise<void> {
  await apiFetch(`/api/v1/service-requests/${requestId}/attachments/${attachmentId}/verify`, {
    method: 'POST',
  })
}

export async function removeAttachment(requestId: string, attachmentId: string): Promise<void> {
  await apiFetch(`/api/v1/service-requests/${requestId}/attachments/${attachmentId}`, {
    method: 'DELETE',
  })
}

export async function getAttachmentDownloadUrl(requestId: string, attachmentId: string): Promise<string> {
  const payload = await apiFetch<{ url: string }>(
    `/api/v1/service-requests/${requestId}/attachments/${attachmentId}/download`,
  )
  return payload.url
}

export async function rateRequest(id: string, rating: SatisfactionRating): Promise<CitizenRequest> {
  return apiFetch<CitizenRequest>(`/api/v1/service-requests/${id}/satisfaction`, {
    method: 'POST',
    body: JSON.stringify({ rating: rating.rating, comment: rating.comment }),
  })
}
