// Shared document utilities used by citizen and institution interfaces.
// Administrative output is server-authoritative: this module can download an
// already-rendered document, but it must never manufacture official content.

import type {
  UploadedDocument,
  GeneratedDocument,
  CitizenRequest,
} from '@/store/citizen-requests-store'

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / 1048576).toFixed(1)} Mo`
}

export function getFileTypeIcon(type: string): { icon: string; color: string } {
  if (type.includes('pdf')) return { icon: 'PDF', color: 'text-red-500' }
  if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')) {
    return { icon: 'IMG', color: 'text-blue-500' }
  }
  if (type.includes('word') || type.includes('doc')) return { icon: 'DOC', color: 'text-blue-700' }
  if (type.includes('sheet') || type.includes('xls')) return { icon: 'XLS', color: 'text-emerald-600' }
  return { icon: 'FIC', color: 'text-gray-500' }
}

export const ACCEPTED_FILE_TYPES = '.pdf,.doc,.docx,.jpg,.jpeg,.png'
export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]
export const MAX_FILE_SIZE = 10 * 1024 * 1024
export const MAX_TOTAL_SIZE = 50 * 1024 * 1024

export function processFile(file: File, requiredDocName: string): Promise<UploadedDocument> {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED_MIME_TYPES.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|jpg|jpeg|png)$/i)) {
      reject(new Error(
        `Type de fichier non supporté : ${file.name}. Formats acceptés : PDF, DOC, DOCX, JPG, PNG`,
      ))
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error(
        `Fichier trop volumineux : ${file.name} (${formatFileSize(file.size)}). Maximum : 10 Mo`,
      ))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      resolve({
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        data: reader.result as string,
        uploadedAt: new Date().toISOString(),
        requiredDocName,
        verified: false,
      })
    }
    reader.onerror = () => reject(new Error(`Erreur lors de la lecture du fichier : ${file.name}`))
    reader.readAsDataURL(file)
  })
}

/**
 * Local-file helper only. Persisted attachments deliberately contain no data
 * URL and must be retrieved through the authenticated short-lived backend URL.
 */
export function downloadUploadedFile(doc: UploadedDocument) {
  if (!doc.data?.startsWith('data:')) {
    throw new Error(
      'Cette pièce est stockée côté serveur. Utilisez le téléchargement authentifié de la demande.',
    )
  }
  const link = document.createElement('a')
  link.href = doc.data
  link.download = doc.name
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Local preview only. Opening the data URL directly avoids document.write and
 * prevents filename/content interpolation into a newly-created HTML document.
 */
export function previewUploadedFile(doc: UploadedDocument) {
  if (!doc.data?.startsWith('data:')) {
    throw new Error(
      'Cette pièce est stockée côté serveur. Utilisez l’aperçu authentifié de la demande.',
    )
  }
  const preview = window.open(doc.data, '_blank', 'noopener,noreferrer')
  if (preview) preview.opener = null
}

export function downloadGeneratedDocument(doc: GeneratedDocument) {
  if (!doc.renderedServerSide) {
    throw new Error(
      'Ce document ne porte pas la preuve de rendu serveur attendue et ne peut pas être téléchargé comme document administratif.',
    )
  }
  const blob = new Blob([doc.htmlContent], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = doc.fileName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Download only the persisted server-rendered document associated with a
 * request. There is intentionally no browser-side fallback generator.
 */
export function downloadCitizenDocument(req: CitizenRequest) {
  if (!req.generatedDocument) {
    throw new Error(
      'Aucun document administratif rendu par le serveur n’est disponible pour cette demande.',
    )
  }
  downloadGeneratedDocument(req.generatedDocument)
}
