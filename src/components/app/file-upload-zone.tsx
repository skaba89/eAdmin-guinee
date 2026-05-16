'use client'

import { useState, useRef, useCallback, type DragEvent } from 'react'
import { Upload, FileText, X, AlertCircle, Image, File, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

// ─── GUINEA BRAND COLORS ─────────────────────────────────────────────────────
const GUINEA_RED = '#CE1126'
const GUINEA_YELLOW = '#FCD116'
const GUINEA_GREEN = '#009460'
const GUINEA_NAVY = '#0B2E58'

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export interface FileUploadItem {
  id: string
  file: File
  name: string
  size: number
  type: string
  preview?: string
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
}

export interface FileUploadZoneProps {
  /** File category: justificatif, document_produit, or complement */
  category: 'justificatif' | 'document_produit' | 'complement'
  /** Whether to allow multiple files */
  multiple?: boolean
  /** Max file size in bytes (default 10MB) */
  maxSize?: number
  /** Accepted file types (default: PDF, JPG, PNG, DOC, DOCX) */
  acceptedTypes?: string[]
  /** Label for the upload zone */
  label?: string
  /** Description text */
  description?: string
  /** Currently uploaded files to display (from the store) */
  existingFiles?: Array<{
    id: string
    name: string
    size: number
    type: string
    uploadedAt: string
    category: string
  }>
  /** Callback when files are added */
  onFilesAdded: (files: File[]) => void
  /** Callback when an existing file is removed */
  onFileRemoved?: (fileId: string) => void
  /** Whether the upload zone is disabled */
  disabled?: boolean
  /** Compact mode for inline usage */
  compact?: boolean
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function getFileTypeIcon(type: string) {
  if (type.startsWith('image/')) return Image
  if (type === 'application/pdf') return FileText
  return File
}

function getFileTypeLabel(type: string): string {
  if (type === 'application/pdf') return 'PDF'
  if (type === 'image/jpeg' || type === 'image/jpg') return 'JPG'
  if (type === 'image/png') return 'PNG'
  if (type === 'application/msword') return 'DOC'
  if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'DOCX'
  return type.split('/').pop()?.toUpperCase() || 'Fichier'
}

function getCategoryConfig(category: string) {
  switch (category) {
    case 'justificatif':
      return {
        label: 'Justificatif',
        color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
        borderColor: 'border-sky-300 dark:border-sky-700',
        iconColor: 'text-sky-600 dark:text-sky-400',
        bgColor: 'bg-sky-50 dark:bg-sky-900/20',
        accentColor: GUINEA_NAVY,
      }
    case 'document_produit':
      return {
        label: 'Document produit',
        color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        borderColor: 'border-emerald-300 dark:border-emerald-700',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
        accentColor: GUINEA_GREEN,
      }
    case 'complement':
      return {
        label: 'Complément',
        color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        borderColor: 'border-orange-300 dark:border-orange-700',
        iconColor: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        accentColor: GUINEA_RED,
      }
    default:
      return {
        label: 'Fichier',
        color: 'bg-muted text-muted-foreground',
        borderColor: 'border-muted',
        iconColor: 'text-muted-foreground',
        bgColor: 'bg-muted/50',
        accentColor: GUINEA_NAVY,
      }
  }
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export function FileUploadZone({
  category,
  multiple = true,
  maxSize = MAX_FILE_SIZE,
  acceptedTypes = ALLOWED_MIME_TYPES,
  label,
  description,
  existingFiles = [],
  onFilesAdded,
  onFileRemoved,
  disabled = false,
  compact = false,
}: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState('')
  const [pendingFiles, setPendingFiles] = useState<FileUploadItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const catConfig = getCategoryConfig(category)
  const defaultLabel = label || `Ajouter des ${category === 'justificatif' ? 'justificatifs' : category === 'document_produit' ? 'documents produits' : 'pièces complémentaires'}`
  const defaultDescription = description || 'Glissez-déposez vos fichiers ici ou cliquez pour sélectionner'

  // ─── VALIDATE FILES ────────────────────────────────────────────────────
  const validateFiles = useCallback((fileList: FileList | File[]): File[] => {
    const validFiles: File[] = []
    let errorMsg = ''

    const files = Array.from(fileList)

    for (const f of files) {
      // Check MIME type
      if (!acceptedTypes.includes(f.type) && !ALLOWED_EXTENSIONS.some(ext => f.name.toLowerCase().endsWith(ext))) {
        errorMsg = `Type non supporté : "${f.name}". Formats acceptés : PDF, JPG, PNG, DOC, DOCX.`
        continue
      }
      // Check file size
      if (f.size > maxSize) {
        errorMsg = `Fichier trop volumineux : "${f.name}" (${formatFileSize(f.size)}). Maximum ${formatFileSize(maxSize)}.`
        continue
      }
      // Check for duplicates
      const existingNames = [
        ...existingFiles.map(ef => ef.name),
        ...pendingFiles.map(pf => pf.name),
      ]
      if (existingNames.includes(f.name)) {
        errorMsg = `Un fichier avec le nom "${f.name}" est déjà ajouté.`
        continue
      }
      validFiles.push(f)
    }

    if (errorMsg) setError(errorMsg)
    else setError('')

    return validFiles
  }, [acceptedTypes, maxSize, existingFiles, pendingFiles])

  // ─── SIMULATE UPLOAD PROGRESS ──────────────────────────────────────────
  const simulateUpload = useCallback((files: File[]) => {
    const newItems: FileUploadItem[] = files.map(f => ({
      id: `pf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file: f,
      name: f.name,
      size: f.size,
      type: f.type,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
      progress: 0,
      status: 'uploading' as const,
    }))

    setPendingFiles(prev => [...prev, ...newItems])

    // Simulate progress for each file
    newItems.forEach((item) => {
      let progress = 0
      const interval = setInterval(() => {
        progress += Math.random() * 25 + 10
        if (progress >= 100) {
          progress = 100
          clearInterval(interval)
          setPendingFiles(prev =>
            prev.map(pf =>
              pf.id === item.id ? { ...pf, progress: 100, status: 'done' as const } : pf
            )
          )
          // After all files are done, call onFilesAdded
          setPendingFiles(prev => {
            const allDone = prev.filter(pf => pf.id.startsWith(item.id.split('-').slice(0, 3).join('-')) || true)
            const doneFiles = prev.filter(pf => pf.status === 'done')
            // Check if this was the last one to finish
            const newItemsIds = newItems.map(ni => ni.id)
            const allNewDone = newItemsIds.every(nid => prev.find(p => p.id === nid && p.status === 'done'))
            if (allNewDone) {
              // All new files uploaded - trigger callback
              setTimeout(() => {
                onFilesAdded(files)
                setPendingFiles([])
              }, 300)
            }
            return prev
          })
        } else {
          setPendingFiles(prev =>
            prev.map(pf =>
              pf.id === item.id ? { ...pf, progress: Math.min(progress, 99) } : pf
            )
          )
        }
      }, 200 + Math.random() * 300)
    })
  }, [onFilesAdded])

  // ─── DRAG & DROP HANDLERS ──────────────────────────────────────────────
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragOver(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    if (disabled) return

    const files = e.dataTransfer.files
    if (files.length === 0) return

    const validFiles = validateFiles(files)
    if (validFiles.length > 0) {
      simulateUpload(validFiles)
    }
  }, [disabled, validateFiles, simulateUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const validFiles = validateFiles(e.target.files)
    if (validFiles.length > 0) {
      simulateUpload(validFiles)
    }
    // Reset input
    e.target.value = ''
  }, [validateFiles, simulateUpload])

  const handleRemovePending = useCallback((fileId: string) => {
    setPendingFiles(prev => prev.filter(f => f.id !== fileId))
  }, [])

  // ─── RENDER ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Category header */}
      {!compact && (
        <div className="flex items-center gap-2">
          <div className={`h-1.5 w-1.5 rounded-full`} style={{ backgroundColor: catConfig.accentColor }} />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {catConfig.label}
          </span>
        </div>
      )}

      {/* Drop zone */}
      <div
        className={`
          relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isDragOver
            ? 'border-[#0B2E58] dark:border-[#3B7DD8] bg-[#0B2E58]/5 dark:bg-[#3B7DD8]/10 scale-[1.01]'
            : `border-muted-foreground/25 hover:border-[#0B2E58]/40 dark:hover:border-[#3B7DD8]/40 hover:bg-muted/30`
          }
          ${compact ? 'p-3' : 'p-6'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        {/* Guinea tricolor stripe at top of drop zone */}
        <div className="flex gap-0 absolute top-0 left-0 right-0 h-0.5 rounded-t-xl overflow-hidden">
          <div className="flex-1" style={{ backgroundColor: GUINEA_RED }} />
          <div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} />
          <div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={ALLOWED_EXTENSIONS.join(',')}
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled}
        />

        <div className={`flex flex-col items-center gap-2 text-center ${compact ? '' : 'py-2'}`}>
          {isDragOver ? (
            <>
              <div className="p-3 rounded-full bg-[#0B2E58]/10 dark:bg-[#3B7DD8]/20 animate-pulse">
                <Upload className="size-6 text-[#0B2E58] dark:text-[#3B7DD8]" />
              </div>
              <p className="text-sm font-semibold text-[#0B2E58] dark:text-[#3B7DD8]">
                Déposez vos fichiers ici
              </p>
            </>
          ) : (
            <>
              <div className={`p-2.5 rounded-full ${catConfig.bgColor}`}>
                <Upload className={`size-5 ${catConfig.iconColor}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {defaultLabel}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {defaultDescription}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground/70">
                PDF, JPG, PNG, DOC, DOCX — Max {formatFileSize(maxSize)} par fichier
              </p>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
          <AlertCircle className="size-3.5 text-red-500 shrink-0" />
          <p className="text-xs text-red-600 dark:text-red-400 flex-1">{error}</p>
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 shrink-0" onClick={() => setError('')}>
            <X className="size-3" />
          </Button>
        </div>
      )}

      {/* Pending files (uploading) */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Téléversement en cours ({pendingFiles.filter(f => f.status === 'done').length}/{pendingFiles.length})…
          </p>
          {pendingFiles.map(pf => {
            const FileIcon = getFileTypeIcon(pf.type)
            return (
              <div key={pf.id} className={`p-2.5 rounded-lg border ${catConfig.borderColor} ${catConfig.bgColor}`}>
                <div className="flex items-center gap-2.5">
                  {/* Image preview or file icon */}
                  {pf.preview ? (
                    <div className="size-9 rounded-md overflow-hidden shrink-0 border">
                      <img src={pf.preview} alt={pf.name} className="size-full object-cover" />
                    </div>
                  ) : (
                    <div className={`p-1.5 rounded-md ${catConfig.bgColor} shrink-0`}>
                      <FileIcon className={`size-4 ${catConfig.iconColor}`} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium truncate">{pf.name}</p>
                      {pf.status === 'done' && <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />}
                      {pf.status === 'uploading' && <Loader2 className="size-3.5 animate-spin text-[#0B2E58] dark:text-[#3B7DD8] shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {getFileTypeLabel(pf.type)} — {formatFileSize(pf.size)}
                      </span>
                    </div>
                    {pf.status === 'uploading' && (
                      <Progress value={pf.progress} className="h-1 mt-1.5" />
                    )}
                  </div>
                  {pf.status !== 'done' && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => handleRemovePending(pf.id)}>
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Existing files from store */}
      {existingFiles.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Fichiers joints ({existingFiles.length})
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {existingFiles.map(ef => {
              const FileIcon = getFileTypeIcon(ef.type)
              const efCatConfig = getCategoryConfig(ef.category)
              return (
                <div key={ef.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
                  <div className={`p-1.5 rounded-md ${efCatConfig.bgColor} shrink-0`}>
                    <FileIcon className={`size-3.5 ${efCatConfig.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{ef.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{getFileTypeLabel(ef.type)}</span>
                      <span>•</span>
                      <span>{formatFileSize(ef.size)}</span>
                      <span>•</span>
                      <span>{new Date(ef.uploadedAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  <Badge className={`text-[8px] px-1.5 py-0 h-4 shrink-0 ${efCatConfig.color}`}>
                    {efCatConfig.label}
                  </Badge>
                  {onFileRemoved && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                      onClick={() => onFileRemoved(ef.id)}
                    >
                      <X className="size-3" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
