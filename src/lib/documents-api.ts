import { getActiveAccessToken } from '@/lib/auth-client'

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '')

export type DocumentStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'ARCHIVED' | 'REJECTED'
export type DocumentClassification = 'PUBLIC' | 'DIFFUSION LIMITÉE' | 'CONFIDENTIEL' | 'SECRET'
export type DocumentType = 'Décret' | 'Arrêté' | 'Circulaire' | 'Note de service' | 'Rapport' | 'Ordonnance' | 'Autre'

export interface GedDocument {
  id: string
  title: string
  description?: string | null
  file_path?: string | null
  file_type?: string | null
  file_size?: number | null
  version: number
  status: DocumentStatus
  tags?: Record<string, unknown> | null
  owner_id: string
  institution_id?: string | null
  created_at: string
  updated_at: string
  file_hash?: string
  server_stored?: boolean
  digest_source?: string
}

export interface DocumentVersion {
  version_id: string
  version_number: number
  file_hash: string
  change_summary?: string | null
  change_type: string
  file_size: number
  changed_by: string
  changed_by_id: string
  metadata?: Record<string, unknown> | null
  created_at?: string | null
}

export interface PaginatedDocuments {
  items: GedDocument[]
  total: number
  page: number
  page_size: number
  total_pages: number
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
    // Fall through to a generic error if the response is not JSON.
  }

  if (!response.ok) {
    const detail = payload && typeof payload === 'object' && 'detail' in payload
      ? (payload as { detail?: unknown }).detail
      : null
    if (typeof detail === 'string') throw new Error(detail)
    if (detail && typeof detail === 'object' && 'message' in detail) {
      const message = (detail as { message?: unknown }).message
      if (typeof message === 'string') throw new Error(message)
    }
    throw new Error('Une erreur est survenue lors de la communication avec la GED.')
  }

  return payload as T
}

export async function listDocuments(params?: {
  page?: number
  pageSize?: number
  search?: string
  status?: DocumentStatus | ''
}): Promise<PaginatedDocuments> {
  const query = new URLSearchParams()
  query.set('page', String(params?.page || 1))
  query.set('page_size', String(params?.pageSize || 100))
  if (params?.search) query.set('search', params.search)
  if (params?.status) query.set('status', params.status)
  return apiFetch<PaginatedDocuments>(`/api/v1/documents?${query.toString()}`)
}

export async function importDocument(input: {
  file: File
  reference: string
  title: string
  documentType: DocumentType
  classification: DocumentClassification
  description?: string
}): Promise<GedDocument> {
  const form = new FormData()
  form.set('file', input.file)
  form.set('reference', input.reference)
  form.set('title', input.title)
  form.set('document_type', input.documentType)
  form.set('classification', input.classification)
  form.set('description', input.description || '')
  return apiFetch<GedDocument>('/api/v1/documents/import', {
    method: 'POST',
    body: form,
  })
}

export async function updateDocument(
  documentId: string,
  input: { title?: string; description?: string; status?: DocumentStatus; tags?: Record<string, unknown> },
): Promise<GedDocument> {
  return apiFetch<GedDocument>(`/api/v1/documents/${documentId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function archiveDocument(documentId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/documents/${documentId}`, { method: 'DELETE' })
}

export async function listDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
  const payload = await apiFetch<{ versions: DocumentVersion[] }>(`/api/v1/documents/${documentId}/versions`)
  return payload.versions
}

export async function downloadDocumentVersion(documentId: string, versionNumber: number): Promise<void> {
  const payload = await apiFetch<{ url: string; expires_minutes: number }>(
    `/api/v1/documents/${documentId}/versions/${versionNumber}/download`,
  )
  window.location.assign(payload.url)
}

export async function restoreDocumentVersion(documentId: string, versionNumber: number): Promise<void> {
  await apiFetch(`/api/v1/documents/${documentId}/versions/restore`, {
    method: 'POST',
    body: JSON.stringify({ version_number: versionNumber }),
  })
}
