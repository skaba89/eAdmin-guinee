'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileCheck2,
  FileText,
  History,
  Library,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatFileSize } from '@/lib/document-utils'
import {
  archiveDocument,
  downloadDocumentVersion,
  getGedStatistics,
  importDocument,
  listDocuments,
  listDocumentVersions,
  restoreDocumentVersion,
  updateDocument,
  type DocumentClassification,
  type DocumentStatus,
  type DocumentType,
  type DocumentVersion,
  type GedDocument,
  type GedStatistics,
} from '@/lib/documents-api'
import { useAppStore } from '@/store/app-store'

const PAGE_SIZE = 25

const DOCUMENT_TYPES: DocumentType[] = [
  'Décret',
  'Arrêté',
  'Circulaire',
  'Note de service',
  'Rapport',
  'Ordonnance',
  'Autre',
]

const CLASSIFICATIONS: DocumentClassification[] = [
  'PUBLIC',
  'DIFFUSION LIMITÉE',
  'CONFIDENTIEL',
  'SECRET',
]

const STATUS_LABELS: Record<DocumentStatus, string> = {
  DRAFT: 'Brouillon',
  PENDING_REVIEW: 'En validation',
  APPROVED: 'Approuvé',
  ARCHIVED: 'Archivé',
  REJECTED: 'Rejeté',
}

const STATUS_STYLES: Record<DocumentStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  PENDING_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  ARCHIVED: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
}

const CLASSIFICATION_STYLES: Record<DocumentClassification, string> = {
  PUBLIC: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'DIFFUSION LIMITÉE': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  CONFIDENTIEL: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  SECRET: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
}

function tagString(document: GedDocument, key: string, fallback = ''): string {
  const value = document.tags?.[key]
  return typeof value === 'string' ? value : fallback
}

function documentReference(document: GedDocument): string {
  return tagString(document, 'reference', `GED-${document.id.slice(0, 8).toUpperCase()}`)
}

function documentType(document: GedDocument): DocumentType {
  const value = tagString(document, 'document_type', 'Autre')
  return DOCUMENT_TYPES.includes(value as DocumentType) ? value as DocumentType : 'Autre'
}

function documentClassification(document: GedDocument): DocumentClassification {
  const value = tagString(document, 'classification', 'PUBLIC')
  return CLASSIFICATIONS.includes(value as DocumentClassification)
    ? value as DocumentClassification
    : 'PUBLIC'
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function GedPage() {
  const user = useAppStore((state) => state.user)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [documents, setDocuments] = useState<GedDocument[]>([])
  const [statistics, setStatistics] = useState<GedStatistics>({
    total: 0,
    archived: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    sensitive: 0,
    acts: 0,
  })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'ALL'>('ALL')
  const [classificationFilter, setClassificationFilter] = useState<DocumentClassification | 'ALL'>('ALL')
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'ALL'>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [importOpen, setImportOpen] = useState(false)
  const [importBusy, setImportBusy] = useState(false)
  const [importForm, setImportForm] = useState<{
    reference: string
    title: string
    documentType: DocumentType
    classification: DocumentClassification
    description: string
    file: File | null
  }>({
    reference: '',
    title: '',
    documentType: 'Note de service',
    classification: 'PUBLIC',
    description: '',
    file: null,
  })

  const [selectedDocument, setSelectedDocument] = useState<GedDocument | null>(null)
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [versionsBusy, setVersionsBusy] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<GedDocument | null>(null)
  const [classificationTarget, setClassificationTarget] = useState<GedDocument | null>(null)
  const [nextClassification, setNextClassification] = useState<DocumentClassification>('PUBLIC')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [result, stats] = await Promise.all([
        listDocuments({
          page,
          pageSize: PAGE_SIZE,
          search,
          status: statusFilter === 'ALL' ? '' : statusFilter,
          classification: classificationFilter === 'ALL' ? '' : classificationFilter,
          documentType: typeFilter === 'ALL' ? '' : typeFilter,
        }),
        getGedStatistics(),
      ])
      setDocuments(result.items)
      setTotal(result.total)
      setTotalPages(Math.max(1, result.total_pages))
      setStatistics(stats)
      if (page > Math.max(1, result.total_pages)) setPage(Math.max(1, result.total_pages))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Impossible de charger la GED.')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, classificationFilter, typeFilter])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1)
      setSearch(searchInput.trim())
    }, 350)
    return () => window.clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 4500)
    return () => window.clearTimeout(timeout)
  }, [notice])

  const statsCards = useMemo(() => [
    { label: 'Documents visibles', value: statistics.total, icon: FileText },
    { label: 'Décrets & arrêtés', value: statistics.acts, icon: FileCheck2 },
    { label: 'En validation', value: statistics.pending, icon: Clock },
    { label: 'Approuvés', value: statistics.approved, icon: ShieldCheck },
    { label: 'Sensibles', value: statistics.sensitive, icon: Lock },
    { label: 'Archivés', value: statistics.archived, icon: Archive },
  ], [statistics])

  const resetImport = () => {
    setImportForm({
      reference: '',
      title: '',
      documentType: 'Note de service',
      classification: 'PUBLIC',
      description: '',
      file: null,
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const submitImport = async () => {
    if (!importForm.reference.trim() || !importForm.title.trim() || !importForm.file) {
      setError('Référence officielle, objet et fichier sont obligatoires.')
      return
    }
    setImportBusy(true)
    setError('')
    try {
      const created = await importDocument({
        file: importForm.file,
        reference: importForm.reference.trim(),
        title: importForm.title.trim(),
        documentType: importForm.documentType,
        classification: importForm.classification,
        description: importForm.description.trim(),
      })
      setNotice(`Document ${documentReference(created)} importé et hashé côté serveur.`)
      setImportOpen(false)
      resetImport()
      setPage(1)
      await load()
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Import GED impossible.')
    } finally {
      setImportBusy(false)
    }
  }

  const openVersions = async (document: GedDocument) => {
    setSelectedDocument(document)
    setVersionsOpen(true)
    setVersionsBusy(true)
    setError('')
    try {
      setVersions(await listDocumentVersions(document.id))
    } catch (versionError) {
      setVersions([])
      setError(versionError instanceof Error ? versionError.message : 'Historique indisponible.')
    } finally {
      setVersionsBusy(false)
    }
  }

  const downloadCurrent = async (document: GedDocument) => {
    setError('')
    try {
      await downloadDocumentVersion(document.id, document.version)
      setNotice(`Lien sécurisé généré pour ${documentReference(document)}.`)
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Téléchargement indisponible.')
    }
  }

  const restoreVersion = async (versionNumber: number) => {
    if (!selectedDocument) return
    setVersionsBusy(true)
    setError('')
    try {
      await restoreDocumentVersion(selectedDocument.id, versionNumber)
      setNotice(`Version ${versionNumber} restaurée comme nouvelle version de ${documentReference(selectedDocument)}.`)
      setVersions(await listDocumentVersions(selectedDocument.id))
      await load()
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : 'Restauration impossible.')
    } finally {
      setVersionsBusy(false)
    }
  }

  const confirmArchive = async () => {
    if (!archiveTarget) return
    setError('')
    try {
      await archiveDocument(archiveTarget.id)
      setNotice(`${documentReference(archiveTarget)} archivé. Le document reste traçable dans la GED.`)
      setArchiveTarget(null)
      await load()
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'Archivage impossible.')
    }
  }

  const confirmClassification = async () => {
    if (!classificationTarget) return
    setError('')
    try {
      await updateDocument(classificationTarget.id, {
        tags: {
          ...(classificationTarget.tags || {}),
          classification: nextClassification,
        },
      })
      setNotice(`${documentReference(classificationTarget)} reclassifié en ${nextClassification}.`)
      setClassificationTarget(null)
      await load()
    } catch (classificationError) {
      setError(classificationError instanceof Error ? classificationError.message : 'Reclassification impossible.')
    }
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setStatusFilter('ALL')
    setClassificationFilter('ALL')
    setTypeFilter('ALL')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-brand/10 p-2.5 dark:bg-primary/20">
            <Library className="h-6 w-6 text-brand dark:text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-brand dark:text-primary">Gestion Électronique des Documents</h2>
            <p className="text-sm text-muted-foreground">
              Documents réels du périmètre {user?.institution || 'institutionnel'} — stockage serveur, versions et empreintes SHA-256.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          {user?.role !== 'citizen' && (
            <Button onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importer un document
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
          <CardContent className="py-3 text-sm text-red-700 dark:text-red-300">{error}</CardContent>
        </Card>
      )}
      {notice && (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
          <CardContent className="py-3 text-sm text-emerald-700 dark:text-emerald-300">{notice}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {statsCards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{label}</span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{value.toLocaleString('fr-FR')}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Recherche et filtres</CardTitle>
          <CardDescription>Les filtres sont appliqués côté serveur dans le périmètre RLS de l’utilisateur connecté.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_200px_190px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Référence, titre ou description…"
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => { setStatusFilter(value as DocumentStatus | 'ALL'); setPage(1) }}
            >
              <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={classificationFilter}
              onValueChange={(value) => { setClassificationFilter(value as DocumentClassification | 'ALL'); setPage(1) }}
            >
              <SelectTrigger><SelectValue placeholder="Classification" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes classifications</SelectItem>
                {CLASSIFICATIONS.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={(value) => { setTypeFilter(value as DocumentType | 'ALL'); setPage(1) }}
            >
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les types</SelectItem>
                {DOCUMENT_TYPES.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" onClick={clearFilters}>Réinitialiser</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Documents</CardTitle>
              <CardDescription>{total.toLocaleString('fr-FR')} document(s) correspondant aux critères.</CardDescription>
            </div>
            <Badge variant="outline">Page {page} / {totalPages}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-52 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement de la GED…
            </div>
          ) : documents.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-center">
              <Library className="h-9 w-9 text-muted-foreground" />
              <div>
                <p className="font-medium">Aucun document réel dans ce périmètre</p>
                <p className="text-sm text-muted-foreground">Importez un premier fichier ou modifiez les filtres.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Taille</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((document) => {
                    const classification = documentClassification(document)
                    return (
                      <TableRow key={document.id}>
                        <TableCell className="font-mono text-xs">{documentReference(document)}</TableCell>
                        <TableCell className="min-w-72">
                          <p className="font-medium">{document.title}</p>
                          {document.description && (
                            <p className="mt-1 max-w-md truncate text-xs text-muted-foreground">{document.description}</p>
                          )}
                        </TableCell>
                        <TableCell>{documentType(document)}</TableCell>
                        <TableCell>
                          <Badge className={CLASSIFICATION_STYLES[classification]}>{classification}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_STYLES[document.status]}>{STATUS_LABELS[document.status]}</Badge>
                        </TableCell>
                        <TableCell>v{document.version}</TableCell>
                        <TableCell>{formatFileSize(document.file_size || 0)}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{formatDate(document.updated_at)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => void downloadCurrent(document)} title="Télécharger la version courante">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => void openVersions(document)} title="Historique des versions">
                              <History className="h-4 w-4" />
                            </Button>
                            {user?.role !== 'citizen' && document.status !== 'ARCHIVED' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setClassificationTarget(document)
                                  setNextClassification(classification)
                                }}
                                title="Reclassifier"
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </Button>
                            )}
                            {user?.role !== 'citizen' && document.status !== 'ARCHIVED' && (
                              <Button size="sm" variant="ghost" onClick={() => setArchiveTarget(document)} title="Archiver">
                                <Archive className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <p className="text-xs text-muted-foreground">{PAGE_SIZE} éléments maximum par page.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Précédent
              </Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                Suivant <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={importOpen} onOpenChange={(open) => { setImportOpen(open); if (!open && !importBusy) resetImport() }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Importer un document officiel</DialogTitle>
            <DialogDescription>
              Le fichier sera contrôlé côté serveur, stocké dans le stockage objet et son SHA-256 sera calculé sur les octets réellement reçus.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="ged-reference">Référence officielle</Label>
              <Input id="ged-reference" value={importForm.reference} onChange={(event) => setImportForm((value) => ({ ...value, reference: event.target.value }))} placeholder="Ex. A/2026/045/MEF/CAB" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ged-title">Objet / titre</Label>
              <Input id="ged-title" value={importForm.title} onChange={(event) => setImportForm((value) => ({ ...value, title: event.target.value }))} placeholder="Objet officiel du document" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={importForm.documentType} onValueChange={(value) => setImportForm((form) => ({ ...form, documentType: value as DocumentType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DOCUMENT_TYPES.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Classification</Label>
                <Select value={importForm.classification} onValueChange={(value) => setImportForm((form) => ({ ...form, classification: value as DocumentClassification }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CLASSIFICATIONS.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ged-description">Description</Label>
              <Input id="ged-description" value={importForm.description} onChange={(event) => setImportForm((value) => ({ ...value, description: event.target.value }))} placeholder="Description facultative" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ged-file">Fichier</Label>
              <Input
                ref={fileInputRef}
                id="ged-file"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                onChange={(event) => setImportForm((value) => ({ ...value, file: event.target.files?.[0] || null }))}
              />
              {importForm.file && (
                <p className="text-xs text-muted-foreground">{importForm.file.name} — {formatFileSize(importForm.file.size)}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importBusy}>Annuler</Button>
            <Button onClick={() => void submitImport()} disabled={importBusy || !importForm.file || !importForm.reference.trim() || !importForm.title.trim()}>
              {importBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Importer et sécuriser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historique des versions</DialogTitle>
            <DialogDescription>
              {selectedDocument ? `${documentReference(selectedDocument)} — ${selectedDocument.title}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] space-y-3 overflow-y-auto py-2">
            {versionsBusy ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement…</div>
            ) : versions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucune version disponible.</p>
            ) : versions.map((version) => (
              <Card key={version.version_id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">v{version.version_number}</Badge>
                        <span className="text-sm font-medium">{version.change_summary || version.change_type}</span>
                      </div>
                      <p className="mt-2 font-mono text-[11px] text-muted-foreground">SHA-256 {version.file_hash}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatFileSize(version.file_size)} · {version.changed_by} · {formatDate(version.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => selectedDocument && void downloadDocumentVersion(selectedDocument.id, version.version_number)}>
                        <Download className="mr-1 h-4 w-4" /> Télécharger
                      </Button>
                      {selectedDocument && version.version_number !== selectedDocument.version && user?.role !== 'citizen' && (
                        <Button size="sm" variant="outline" onClick={() => void restoreVersion(version.version_number)} disabled={versionsBusy}>
                          Restaurer
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(archiveTarget)} onOpenChange={(open) => { if (!open) setArchiveTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archiver le document ?</DialogTitle>
            <DialogDescription>
              {archiveTarget ? `${documentReference(archiveTarget)} restera conservé et traçable, mais passera au statut Archivé.` : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveTarget(null)}>Annuler</Button>
            <Button onClick={() => void confirmArchive()}>Archiver</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(classificationTarget)} onOpenChange={(open) => { if (!open) setClassificationTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la classification</DialogTitle>
            <DialogDescription>
              La décision reste humaine et est enregistrée côté serveur. Aucune classification automatique n’est simulée dans le navigateur.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Select value={nextClassification} onValueChange={(value) => setNextClassification(value as DocumentClassification)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CLASSIFICATIONS.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClassificationTarget(null)}>Annuler</Button>
            <Button onClick={() => void confirmClassification()}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
