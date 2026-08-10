import { API_URL } from '@/lib/api-base-url'
import { getActiveAccessToken, getCurrentUser } from '@/lib/auth-client'
import { getStableIdempotencyKey } from '@/lib/idempotency-client'
import type {
  CitizenRequest,
  ProcessingNote,
  RequestStatus,
  SatisfactionRating,
  UploadedDocument,
} from '@/store/citizen-requests-store'

// The current page/store API launches document persistence and the PRETE status
// mutation back-to-back. Track the authoritative server-side document render per
// request so PRETE is never sent before that write has succeeded. A rejected
// render is deliberately propagated and prevents the status request from leaving
// the browser.
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

type FastApiValidationError = {
  loc?: unknown
  msg?: unknown
}

const FIELD_LABELS: Record<string, string> = {
  service_id: 'démarche',
  target_institution_id: 'institution destinataire',
  citizen_name: 'nom',
  citizen_first_name: 'prénom',
  citizen_nin: 'NIN',
  citizen_phone: 'téléphone',
  citizen_email: 'e-mail',
  citizen_address: 'adresse',
  motif: 'motif',
  delivery_mode: 'mode de livraison',
}

function formatValidationDetail(detail: unknown): string | null {
  if (!Array.isArray(detail)) return null

  const messages = detail.flatMap((entry): string[] => {
    if (!entry || typeof entry !== 'object') return []
    const validation = entry as FastApiValidationError
    const loc = Array.isArray(validation.loc) ? validation.loc : []
    const rawField = [...loc].reverse().find((part) => typeof part === 'string' && part !== 'body')
    const field = typeof rawField === 'string' ? rawField : 'champ'
    const label = FIELD_LABELS[field] || field
    const msg = typeof validation.msg === 'string' && validation.msg.trim()
      ? validation.msg.trim()
      : 'valeur invalide'
    return [`${label} : ${msg}`]
  })

  return messages.length ? `Données de la demande invalides — ${messages.join(' ; ')}` : null
}

function normalizeRequired(value: string, label: string, minLength = 1): string {
  const normalized = value.trim()
  if (normalized.length < minLength) {
    throw new Error(
      minLength > 1
        ? `${label} doit contenir au moins ${minLength} caractères.`
        : `${label} est obligatoire.`,
    )
  }
  return normalized
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
    const validationMessage = formatValidationDetail(detail)
    const message = validationMessage || (typeof detail === 'string'
      ? detail
      : 'Une erreur est survenue lors de la communication avec eAdmin.')
    throw new Error(message)
  }

  return payload as T
}

function attachRequestContext(request: CitizenRequest): CitizenRequest {
  // Persisted attachments intentionally contain no browser data URL. Attach the
  // already-authorized parent request id locally so shared download/preview
  // helpers can request a five-minute backend URL on demand.
  return {
    ...request,
    uploadedDocuments: (request.uploadedDocuments || []).map((document) => ({
      ...document,
      requestId: request.id,
    })),
  }
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
  return payload.items.map(attachRequestContext)
}

export async function createRequest(input: CreateServiceRequestInput): Promise<CitizenRequest> {
  const token = getActiveAccessToken()
  if (!token) throw new Error('Session expirée. Veuillez vous reconnecter.')

  // The backend persists the authenticated identity e-mail, not the editable
  // form hint. Still send a valid value because the compatibility request model
  // validates citizen_email before the endpoint can apply that authority rule.
  const currentUser = await getCurrentUser(token)

  // Canonicalize exactly the payload sent to the backend. This also prevents an
  // opaque FastAPI 422 caused by whitespace-only or undersized form values.
  const requestPayload = {
    service_id: normalizeRequired(input.serviceId, 'La démarche'),
    target_institution_id: normalizeRequired(input.targetInstitutionId, 'L’institution destinataire'),
    citizen_name: normalizeRequired(input.citizenName, 'Le nom'),
    citizen_first_name: normalizeRequired(input.citizenFirstName, 'Le prénom'),
    citizen_nin: normalizeRequired(input.citizenNIN, 'Le NIN', 3),
    citizen_phone: normalizeRequired(input.citizenPhone, 'Le téléphone', 3),
    citizen_email: currentUser.email.trim().toLowerCase(),
    citizen_address: normalizeRequired(input.citizenAddress, 'L’adresse', 3),
    motif: normalizeRequired(input.motif, 'Le motif', 3),
    mairie: input.mairie?.trim() || null,
    delivery_mode: input.deliveryMode,
  }
  const idempotencyKey = await getStableIdempotencyKey(requestPayload)

  const created = await apiFetch<CitizenRequest>('/api/v1/service-requests', {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(requestPayload),
  })
  return attachRequestContext(created)
}

export async function updateStatus(id: string, status: RequestStatus, note?: string): Promise<CitizenRequest> {
  if (status === 'prete') {
    const pendingDocumentWrite = pendingGeneratedDocumentWrites.get(id)
    if (pendingDocumentWrite) {
      await pendingDocumentWrite
    }
  }

  const updated = await apiFetch<CitizenRequest>(`/api/v1/service-requests/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, note: note || null }),
  })
  return attachRequestContext(updated)
}

export async function assignRequest(id: string, agent: string): Promise<CitizenRequest> {
  const updated = await apiFetch<CitizenRequest>(`/api/v1/service-requests/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify({ agent_name: agent, agent_id: null }),
  })
  return attachRequestContext(updated)
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
  const updated = await apiFetch<CitizenRequest>(`/api/v1/service-requests/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify({
      delivery_mode: deliveryMode,
      delivery_location: deliveryLocation || null,
    }),
  })
  return attachRequestContext(updated)
}

export async function saveGeneratedDocument(
  id: string,
  legacyDocument?: unknown,
): Promise<CitizenRequest> {
  // Compatibility only: an older component may still pass a browser-composed
  // document object. It is deliberately discarded and never crosses the API.
  void legacyDocument
  const write = apiFetch<CitizenRequest>(`/api/v1/service-requests/${id}/generated-document`, {
    method: 'POST',
  }).then(attachRequestContext)

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
  const uploaded = await apiFetch<UploadedDocument>(`/api/v1/service-requests/${requestId}/attachments`, {
    method: 'POST',
    body: form,
  })
  return {
    ...uploaded,
    requestId,
  } as UploadedDocument
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
  const updated = await apiFetch<CitizenRequest>(`/api/v1/service-requests/${id}/satisfaction`, {
    method: 'POST',
    body: JSON.stringify({ rating: rating.rating, comment: rating.comment }),
  })
  return attachRequestContext(updated)
}
