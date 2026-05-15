'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Upload, Filter, MoreHorizontal, FileText, FileCheck,
  Archive, Download, Eye, Trash2, Plus, ChevronDown, Tag,
  Lock, Shield, Brain, Building2, Calendar, X, FolderOpen,
  CheckCircle2, Clock, AlertCircle, BookOpen, FileSignature,
  ScrollText, BarChart3, MapPin, Library, Mail, GitBranch, PenTool, UserCheck,
  ChevronLeft, ChevronRight, AlertTriangle, FileImage, FileSpreadsheet, FileType, Paperclip,
  RotateCcw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { BRAND } from '@/lib/constants'
import { useAppStore } from '@/store/app-store'
import {
  useGedStore,
  type GedDocument,
  type DocumentClassification,
  type DocumentStatus,
  type DocumentCategory,
} from '@/store/ged-store'

// ─── Display‑label mappings (store values → French UI labels) ────────────────

const CLASSIFICATION_LABELS: Record<DocumentClassification, string> = {
  public: 'PUBLIC',
  interne: 'DIFFUSION LIMITÉE',
  confidentiel: 'CONFIDENTIEL',
  secret: 'SECRET',
}

const STATUS_LABELS: Record<DocumentStatus, string> = {
  brouillon: 'Brouillon',
  en_cours: 'En cours',
  valide: 'Validé',
  archive: 'Archivé',
  rejete: 'Rejeté',
}

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  etat_civil: 'État civil',
  justice: 'Justice',
  identification: 'Identification',
  urbanisme: 'Urbanisme',
  entreprise: 'Entreprise',
  education: 'Éducation',
  sante: 'Santé',
  residence: 'Résidence',
  administratif: 'Administratif',
  financier: 'Financier',
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Primature',
  admin_general: 'Présidence',
  mairie: 'Mairie',
  ministere: 'Ministère',
  agence: 'Agence',
}

// ─── Visual config objects (keyed by store values) ────────────────────────────

const CLASSIFICATION_CONFIG: Record<DocumentClassification, { color: string; icon: React.ElementType }> = {
  public: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: BookOpen },
  interne: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: AlertCircle },
  confidentiel: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: Lock },
  secret: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Shield },
}

const STATUS_CONFIG: Record<DocumentStatus, { color: string; icon: React.ElementType }> = {
  brouillon: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', icon: FileText },
  en_cours: { color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400', icon: Clock },
  valide: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  archive: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', icon: Lock },
  rejete: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertCircle },
}

// ─── Tab definitions (now based on DocumentCategory) ─────────────────────────

const CATEGORY_TABS: { value: string; label: string; icon?: React.ElementType }[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'administratif', label: 'Administratif' },
  { value: 'financier', label: 'Financier' },
  { value: 'etat_civil', label: 'État civil' },
  { value: 'justice', label: 'Justice' },
  { value: 'urbanisme', label: 'Urbanisme' },
  { value: 'entreprise', label: 'Entreprise' },
  { value: 'education', label: 'Éducation' },
  { value: 'sante', label: 'Santé' },
  { value: 'confidentiel', label: 'Documents confidentiels', icon: Shield },
]

// ─── Constants ────────────────────────────────────────────────────────────────

const REGIONS = [
  { value: 'toutes', label: 'Toutes les régions' },
  { value: 'conakry', label: 'Conakry' },
  { value: 'kindia', label: 'Kindia' },
  { value: 'kankan', label: 'Kankan' },
  { value: 'nzerekore', label: 'Nzérékoré' },
  { value: 'labe', label: 'Labé' },
  { value: 'faranah', label: 'Faranah' },
  { value: 'boke', label: 'Boké' },
  { value: 'mamou', label: 'Mamou' },
]

const SIDEBAR_COLORS = [
  'bg-brand dark:bg-primary', 'bg-gold', 'bg-emerald-500', 'bg-sky-500',
  'bg-red-500', 'bg-violet-500', 'bg-teal-500', 'bg-orange-500',
  'bg-pink-500', 'bg-cyan-500',
]

const PAGE_SIZE = 10

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return FileText
  if (['doc', 'docx'].includes(ext || '')) return FileType
  if (['xls', 'xlsx'].includes(ext || '')) return FileSpreadsheet
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) return FileImage
  return FileText
}

/** Derive a short official-looking reference from GedDocument data. */
const getDocReference = (doc: GedDocument): string => {
  const catPrefix: Record<DocumentCategory, string> = {
    etat_civil: 'EC', justice: 'JU', identification: 'ID',
    urbanisme: 'UR', entreprise: 'EN', education: 'ED',
    sante: 'SA', residence: 'RE', administratif: 'AD', financier: 'FI',
  }
  const year = doc.createdAt.slice(0, 4)
  const seq = doc.id.replace(/^(ged-demo-|ged-)/, '').padStart(3, '0').toUpperCase()
  return `${catPrefix[doc.category]}/${year}/${seq}`
}

/** Get display institution from createdByRole. */
const getInstitutionLabel = (doc: GedDocument): string =>
  ROLE_LABELS[doc.createdByRole] || doc.createdByRole

// ─── Component ────────────────────────────────────────────────────────────────

export function GedPage() {
  // ── Store ─────────────────────────────────────────────────────────────────
  const store = useGedStore()
  const {
    addDocument,
    updateDocument,
    deleteDocument,
    archiveDocument,
    restoreDocument,
    reclassifyDocument,
    addTag,
    removeTag,
    setSearchQuery,
    setFilterCategory,
    setFilterClassification,
    getFilteredDocuments,
    getStats,
    searchQuery,
    filterCategory,
    filterClassification,
    documents,
  } = store

  // ── Local UI state ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('tous')
  const [institutionFilter, setInstitutionFilter] = useState<string>('tous')
  const [regionFilter, setRegionFilter] = useState<string>('toutes')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  const [uploadDialog, setUploadDialog] = useState(false)
  const [successToast, setSuccessToast] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const navigate = useAppStore((s) => s.navigate)

  // Upload form state
  const [newDoc, setNewDoc] = useState({
    title: '',
    description: '',
    category: 'administratif' as DocumentCategory,
    classification: 'public' as DocumentClassification,
    createdByRole: 'admin_general',
  })

  // File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Dialog states
  const [viewDoc, setViewDoc] = useState<GedDocument | null>(null)
  const [reclassifyDoc, setReclassifyDoc] = useState<GedDocument | null>(null)
  const [reclassifyValue, setReclassifyValue] = useState<DocumentClassification>('public')
  const [deleteDoc, setDeleteDoc] = useState<GedDocument | null>(null)
  const [exportDialog, setExportDialog] = useState(false)
  const [newTagDoc, setNewTagDoc] = useState<GedDocument | null>(null)
  const [newTagValue, setNewTagValue] = useState('')

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(''), 4000)
  }, [])

  // ── Sync tab → store filterCategory ──────────────────────────────────────
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab)
    setCurrentPage(1)
    if (tab === 'tous' || tab === 'confidentiel') {
      setFilterCategory('all')
    } else {
      setFilterCategory(tab as DocumentCategory)
    }
  }, [setFilterCategory])

  // ── Store-based filtered docs, then apply local filters ──────────────────
  const storeFiltered = useMemo(() => getFilteredDocuments(), [documents, searchQuery, filterCategory, filterClassification])

  const filteredDocs = useMemo(() => {
    return storeFiltered.filter(doc => {
      // Tab filter: "confidentiel" tab shows confidentiel + secret only
      if (activeTab === 'confidentiel') {
        if (doc.classification !== 'confidentiel' && doc.classification !== 'secret') return false
      }
      // Institution / role filter
      if (institutionFilter !== 'tous') {
        if (getInstitutionLabel(doc) !== institutionFilter) return false
      }
      // Date range filter
      const docDate = doc.createdAt.slice(0, 10)
      if (dateFrom && docDate < dateFrom) return false
      if (dateTo && docDate > dateTo) return false
      return true
    })
  }, [storeFiltered, activeTab, institutionFilter, dateFrom, dateTo])

  // ── Pagination ───────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / PAGE_SIZE))
  const paginatedDocs = filteredDocs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value)
    setCurrentPage(1)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const handleClassificationFilterChange = (value: string) => {
    setFilterClassification(value === 'tous' ? 'all' : (value as DocumentClassification))
    setCurrentPage(1)
  }

  // ── Stats from store ─────────────────────────────────────────────────────
  const storeStats = useMemo(() => getStats(), [documents])

  const stats = useMemo(() => {
    const confidentialCount = documents.filter(d => d.classification === 'confidentiel' || d.classification === 'secret').length
    const totalSizeMB = storeStats.totalSize / (1024 * 1024)
    const digitizationRate = storeStats.total > 0 ? Math.min(100, (storeStats.byStatus.valide / storeStats.total) * 100) : 0
    return [
      { label: 'Documents officiels', value: storeStats.total.toLocaleString('fr-FR'), icon: FileText, color: 'text-brand dark:text-primary', bg: 'bg-brand/5 dark:bg-primary/10' },
      { label: 'Catégories actives', value: String(Object.keys(storeStats.byCategory).length), icon: ScrollText, color: 'text-gold dark:text-gold', bg: 'bg-gold/5 dark:bg-gold/10' },
      { label: 'Documents validés', value: storeStats.byStatus.valide.toLocaleString('fr-FR'), icon: BookOpen, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
      { label: 'Documents confidentiels', value: confidentialCount.toLocaleString('fr-FR'), icon: Lock, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
      { label: 'En cours de traitement', value: storeStats.byStatus.en_cours.toLocaleString('fr-FR'), icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
      { label: 'Taux de validation', value: `${digitizationRate.toFixed(1)}%`, icon: BarChart3, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', isProgress: true, progressValue: digitizationRate },
    ]
  }, [storeStats, documents])

  // ── File upload ──────────────────────────────────────────────────────────
  const handleFileSelect = useCallback((file: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg',
      'image/jpg',
    ]
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|xls|xlsx|png|jpg|jpeg)$/i)) {
      showToast('Format de fichier non supporté. Utilisez PDF, DOC, DOCX, XLS, XLSX, PNG ou JPG.')
      return
    }
    setUploadFile(file)
    setUploadProgress(0)
  }, [showToast])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }, [handleFileSelect])

  const uploadDocument = () => {
    if (!newDoc.title) return

    if (uploadFile) {
      setIsUploading(true)
      setUploadProgress(0)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + Math.random() * 20
        })
      }, 200)

      const reader = new FileReader()
      reader.onload = () => {
        clearInterval(progressInterval)
        setUploadProgress(100)
        const base64Data = reader.result as string
        setTimeout(() => {
          const created = addDocument({
            title: newDoc.title,
            description: newDoc.description || newDoc.title,
            category: newDoc.category,
            classification: newDoc.classification,
            status: 'en_cours',
            fileName: uploadFile.name,
            fileType: uploadFile.type || 'application/octet-stream',
            fileSize: uploadFile.size,
            fileData: base64Data,
            createdBy: 'Utilisateur connecté',
            createdByRole: newDoc.createdByRole,
            tags: [],
          })
          setNewDoc({ title: '', description: '', category: 'administratif', classification: 'public', createdByRole: 'admin_general' })
          setUploadFile(null)
          setUploadProgress(0)
          setIsUploading(false)
          setUploadDialog(false)
          showToast(`Document ${getDocReference(created)} importé avec succès (${uploadFile.name})`)
        }, 400)
      }
      reader.readAsDataURL(uploadFile)
    } else {
      const created = addDocument({
        title: newDoc.title,
        description: newDoc.description || newDoc.title,
        category: newDoc.category,
        classification: newDoc.classification,
        status: 'en_cours',
        fileName: 'document-sans-fichier.pdf',
        fileType: 'application/pdf',
        fileSize: 0,
        createdBy: 'Utilisateur connecté',
        createdByRole: newDoc.createdByRole,
        tags: [],
      })
      setNewDoc({ title: '', description: '', category: 'administratif', classification: 'public', createdByRole: 'admin_general' })
      setUploadDialog(false)
      showToast(`Document ${getDocReference(created)} importé avec succès`)
    }
  }

  // ── Dropdown actions ─────────────────────────────────────────────────────
  const handleConsulter = (doc: GedDocument) => {
    setViewDoc(doc)
  }

  const generateOfficialDocument = (doc: GedDocument): string => {
    const ref = getDocReference(doc)
    const institution = getInstitutionLabel(doc)
    const classLabel = CLASSIFICATION_LABELS[doc.classification]
    const statusLabel = STATUS_LABELS[doc.status]
    const catLabel = CATEGORY_LABELS[doc.category]
    const dateStr = doc.createdAt.slice(0, 10)

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${catLabel} n°${ref} — République de Guinée</title>
  <style>
    @page { size: A4; margin: 2cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Georgia, serif; color: #1a1a1a; line-height: 1.6; padding: 2cm; max-width: 21cm; margin: 0 auto; }
    .tricolor { display: flex; width: 100%; height: 6px; margin-bottom: 20px; }
    .tricolor-red { flex: 1; background-color: #CE1126; }
    .tricolor-yellow { flex: 1; background-color: #FCD116; }
    .tricolor-green { flex: 1; background-color: #009460; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0B2E58; padding-bottom: 20px; }
    .header h1 { font-size: 11pt; letter-spacing: 3px; text-transform: uppercase; color: #0B2E58; margin-bottom: 4px; }
    .header .motto { font-size: 9pt; color: #666; letter-spacing: 1px; }
    .header .institution { font-size: 10pt; color: #0B2E58; font-weight: bold; margin-top: 8px; }
    .doc-title { text-align: center; margin: 30px 0 20px; }
    .doc-title h2 { font-size: 14pt; color: #0B2E58; text-transform: uppercase; letter-spacing: 1px; }
    .doc-title .ref { font-size: 11pt; color: #333; margin-top: 4px; }
    .content { text-align: justify; margin: 20px 0; font-size: 12pt; }
    .content p { margin-bottom: 12px; text-indent: 1.5cm; }
    .metadata { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 20px 0; font-size: 10pt; }
    .metadata .label { color: #666; font-style: italic; }
    .metadata .value { font-weight: 600; }
    .signature { margin-top: 60px; text-align: right; }
    .signature .date { font-size: 10pt; color: #333; }
    .signature .signataire { font-size: 11pt; font-weight: bold; color: #0B2E58; margin-top: 8px; }
    .signature .line { width: 200px; border-bottom: 1px dashed #999; margin-top: 40px; margin-left: auto; }
    .signature .label-sign { font-size: 9pt; color: #666; margin-top: 4px; }
    .classification { text-align: center; margin-top: 30px; padding: 6px 16px; border: 2px solid #CE1126; display: inline-block; font-size: 10pt; font-weight: bold; color: #CE1126; letter-spacing: 2px; }
    .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 10px; font-size: 8pt; color: #999; text-align: center; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="tricolor">
    <div class="tricolor-red"></div>
    <div class="tricolor-yellow"></div>
    <div class="tricolor-green"></div>
  </div>
  <div class="header">
    <h1>République de Guinée</h1>
    <div class="motto">Travail — Justice — Solidarité</div>
    <div class="institution">${institution}</div>
  </div>
  <div class="doc-title">
    <h2>${catLabel}</h2>
    <div class="ref">n°${ref}</div>
  </div>
  <div class="content">
    <p><strong>${doc.title}</strong></p>
    <p>Conformément aux dispositions constitutionnelles et aux textes réglementaires en vigueur en République de Guinée, le présent document est émis pour pleine et entière application par l'institution susvisée et tous les services concernés.</p>
    <p>Les mesures prévues par le présent ${catLabel.toLowerCase()} entrent en vigueur à compter de la date de sa signature. Tous les ministères, institutions et organismes concernés sont tenus de veiller à sa stricte application dans les meilleurs délais.</p>
    <p>Le présent ${catLabel.toLowerCase()} sera publié au Journal Officiel de la République de Guinée et notifié à toutes les parties prenantes concernées.</p>
  </div>
  <div class="metadata">
    <div><span class="label">Classification :</span> <span class="value">${classLabel}</span></div>
    <div><span class="label">Statut :</span> <span class="value">${statusLabel}</span></div>
    <div><span class="label">Catégorie :</span> <span class="value">${catLabel}</span></div>
    <div><span class="label">Date :</span> <span class="value">${dateStr}</span></div>
  </div>
  <div style="text-align: center;">
    <div class="classification">${classLabel}</div>
  </div>
  <div class="signature">
    <div class="date">Fait à Conakry, le ${dateStr}</div>
    <div class="signataire">${institution}</div>
    <div class="line"></div>
    <div class="label-sign">Signature & Cachet officiel</div>
  </div>
  <div class="footer">
    Ce document est généré par le système eAdministration Suite de la République de Guinée — ${ref} — ${new Date().toLocaleDateString('fr-FR')}
  </div>
</body>
</html>`
  }

  const handleTelecharger = (doc: GedDocument) => {
    const ref = getDocReference(doc)
    showToast(`Téléchargement de ${ref} en cours...`)
    setTimeout(() => {
      const htmlContent = generateOfficialDocument(doc)
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${ref.replace(/\//g, '-')}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 600)
  }

  const handleDownloadOriginal = (doc: GedDocument) => {
    if (!doc.fileData || !doc.fileName) return
    const a = document.createElement('a')
    a.href = doc.fileData
    a.download = doc.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    showToast(`Fichier original ${doc.fileName} téléchargé`)
  }

  const handleArchiver = (doc: GedDocument) => {
    archiveDocument(doc.id, 'Archivage depuis la GED')
    showToast(`Document ${getDocReference(doc)} archivé avec succès`)
  }

  const handleRestaurer = (doc: GedDocument) => {
    restoreDocument(doc.id)
    showToast(`Document ${getDocReference(doc)} restauré avec succès`)
  }

  const handleReclassifier = (doc: GedDocument) => {
    setReclassifyDoc(doc)
    setReclassifyValue(doc.classification)
  }

  const confirmReclassify = () => {
    if (!reclassifyDoc) return
    reclassifyDocument(reclassifyDoc.id, reclassifyValue)
    showToast(`Document ${getDocReference(reclassifyDoc)} reclassifié en ${CLASSIFICATION_LABELS[reclassifyValue]}`)
    setReclassifyDoc(null)
  }

  const handleSupprimer = (doc: GedDocument) => {
    setDeleteDoc(doc)
  }

  const confirmDelete = () => {
    if (!deleteDoc) return
    const ref = getDocReference(deleteDoc)
    deleteDocument(deleteDoc.id)
    showToast(`Document ${ref} supprimé`)
    setDeleteDoc(null)
  }

  // ── AI Classification (demo) ─────────────────────────────────────────────
  const handleAiClassification = () => {
    const classifications: DocumentClassification[] = ['public', 'interne', 'confidentiel', 'secret']
    const nonSecretDocs = documents.filter(d => d.classification === 'public' || d.classification === 'interne')
    const count = Math.min(Math.floor(Math.random() * 3) + 1, nonSecretDocs.length)
    const indicesToReclassify = new Set<number>()
    while (indicesToReclassify.size < count) {
      indicesToReclassify.add(Math.floor(Math.random() * nonSecretDocs.length))
    }
    Array.from(indicesToReclassify).forEach(i => {
      const newClass = classifications[Math.floor(Math.random() * classifications.length)]
      reclassifyDocument(nonSecretDocs[i].id, newClass)
    })
    showToast(`${count} documents reclassifiés par l'IA`)
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => setExportDialog(true)
  const confirmExport = () => {
    showToast(`${filteredDocs.length} documents exportés vers les Archives Nationales`)
    setExportDialog(false)
  }

  // ── Reset filters ─────────────────────────────────────────────────────────
  const resetFilters = () => {
    setFilterClassification('all')
    setInstitutionFilter('tous')
    setRegionFilter('toutes')
    setDateFrom('')
    setDateTo('')
    setCurrentPage(1)
  }

  const hasActiveFilters = filterClassification !== 'all' || institutionFilter !== 'tous' || regionFilter !== 'toutes' || dateFrom !== '' || dateTo !== ''

  const uniqueInstitutions = useMemo(() => [...new Set(documents.map(d => getInstitutionLabel(d)))], [documents])

  // ── Sidebar: institution counts ──────────────────────────────────────────
  const institutionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    documents.forEach(d => {
      const inst = getInstitutionLabel(d)
      counts[inst] = (counts[inst] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count], i) => ({ name, count, color: SIDEBAR_COLORS[i % SIDEBAR_COLORS.length] }))
  }, [documents])

  // ── Pagination helper ────────────────────────────────────────────────────
  const getPageNumbers = () => {
    const pages: number[] = []
    for (let i = 1; i <= totalPages; i++) pages.push(i)
    return pages
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand/10 dark:bg-primary/20">
            <Library className="h-6 w-6 text-brand dark:text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-brand dark:text-primary">Gestion Électronique des Documents Officiels</h2>
            <p className="text-sm text-muted-foreground">Archivage souverain de la documentation de l&apos;État — Conformément au Code administratif</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card className="glass-card hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs text-muted-foreground leading-tight">{stat.label}</span>
                </div>
                <p className="text-xl font-bold">{stat.value}</p>
                {stat.isProgress && (
                  <Progress value={stat.progressValue} className="h-1.5 mt-2" />
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="shadow-sm border-[#C8A45C]/20 dark:border-[#D4B878]/20 bg-gradient-to-r from-[#0B2E58]/[0.02] to-[#C8A45C]/[0.02] dark:from-[#3B7DD8]/[0.05] dark:to-[#D4B878]/[0.03]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">Actions rapides</CardTitle>
            <CardDescription className="text-xs">Raccourcis vers les modules liés</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Nouveau courrier', icon: Mail, color: 'bg-[#0B2E58] hover:bg-[#0B2E58]/90 text-white', onClick: () => navigate('courriers') },
                { label: 'Lancer un workflow', icon: GitBranch, color: 'bg-[#C8A45C] hover:bg-[#C8A45C]/90 text-[#0B2E58]', onClick: () => navigate('workflow') },
                { label: 'Demander signature', icon: PenTool, color: 'bg-emerald-600 hover:bg-emerald-600/90 text-white', onClick: () => navigate('signatures') },
                { label: 'Demandes citoyennes', icon: UserCheck, color: 'bg-[#3B7DD8] hover:bg-[#3B7DD8]/90 text-white', onClick: () => navigate('service-requests') },
              ].map(action => (
                <Button key={action.label} className={`${action.color} h-auto flex-col gap-2 rounded-xl py-4 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02]`} onClick={action.onClick}>
                  <action.icon className="size-5" />
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Document Category Tabs */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
                {CATEGORY_TABS.map(tab => (
                  <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs data-[state=active]:bg-brand data-[state=active]:text-white dark:data-[state=active]:bg-primary">
                    {tab.icon && <tab.icon className="h-3 w-3" />}
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 border-gold/30 text-gold hover:bg-gold/5" onClick={handleAiClassification}>
                  <Brain className="h-3.5 w-3.5" />
                  Classification automatique par IA
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 border-brand/30 text-brand hover:bg-brand/5 dark:border-primary/30 dark:text-primary dark:hover:bg-primary/5" onClick={handleExport}>
                  <Archive className="h-3.5 w-3.5" />
                  Export vers les Archives Nationales
                </Button>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par titre, description, fichier, catégorie..."
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtres avancés
                <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>
              <Button size="sm" className="gap-2 bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90" onClick={() => setUploadDialog(true)}>
                <Upload className="h-4 w-4" />
                Importer un document
              </Button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-3 pt-3 mt-3 border-t">
                    <Select value={filterClassification === 'all' ? 'tous' : filterClassification} onValueChange={handleClassificationFilterChange}>
                      <SelectTrigger className="w-[220px]">
                        <Shield className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="Classification" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tous">Toutes classifications</SelectItem>
                        <SelectItem value="public">PUBLIC</SelectItem>
                        <SelectItem value="interne">DIFFUSION LIMITÉE</SelectItem>
                        <SelectItem value="confidentiel">CONFIDENTIEL</SelectItem>
                        <SelectItem value="secret">SECRET</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={institutionFilter} onValueChange={handleFilterChange(setInstitutionFilter)}>
                      <SelectTrigger className="w-[220px]">
                        <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="Institution" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tous">Toutes les institutions</SelectItem>
                        {uniqueInstitutions.map(inst => (
                          <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={regionFilter} onValueChange={handleFilterChange(setRegionFilter)}>
                      <SelectTrigger className="w-[160px]">
                        <MapPin className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="Région" />
                      </SelectTrigger>
                      <SelectContent>
                        {REGIONS.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input type="date" className="w-[160px]" placeholder="Date début" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setCurrentPage(1) }} />
                    <Input type="date" className="w-[160px]" placeholder="Date fin" value={dateTo} onChange={e => { setDateTo(e.target.value); setCurrentPage(1) }} />

                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={resetFilters}>
                        <X className="h-3 w-3 mr-1" />
                        Réinitialiser
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Tabs>
        </CardContent>
      </Card>

      {/* Main Content: Table + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Documents Table */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-semibold">Référence</TableHead>
                      <TableHead className="text-xs font-semibold min-w-[300px]">Titre</TableHead>
                      <TableHead className="text-xs font-semibold">Catégorie</TableHead>
                      <TableHead className="text-xs font-semibold hidden lg:table-cell">Institution</TableHead>
                      <TableHead className="text-xs font-semibold hidden md:table-cell">Taille</TableHead>
                      <TableHead className="text-xs font-semibold">Classification</TableHead>
                      <TableHead className="text-xs font-semibold">Statut</TableHead>
                      <TableHead className="text-xs font-semibold w-10">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDocs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          <FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
                          <p className="text-sm">Aucun document trouvé</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedDocs.map((doc, i) => {
                        const classConfig = CLASSIFICATION_CONFIG[doc.classification]
                        const statusConfig = STATUS_CONFIG[doc.status]
                        const ClassIcon = classConfig.icon
                        const StatusIcon = statusConfig.icon
                        const ref = getDocReference(doc)
                        return (
                          <motion.tr
                            key={doc.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className="hover:bg-muted/50 transition-colors group"
                          >
                            <TableCell>
                              <span className="font-mono text-xs font-medium text-brand dark:text-primary">{ref}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-start gap-2">
                                <FileText className="h-4 w-4 text-brand dark:text-primary shrink-0 mt-0.5" />
                                <span className="text-sm leading-tight line-clamp-2">{doc.title}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-medium">{CATEGORY_LABELS[doc.category]}</Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="flex items-center gap-1.5">
                                <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-xs text-muted-foreground truncate max-w-[150px]">{getInstitutionLabel(doc)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className="text-xs text-muted-foreground">{formatFileSize(doc.fileSize)}</span>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${classConfig.color}`}>
                                <ClassIcon className="h-3 w-3" />
                                {CLASSIFICATION_LABELS[doc.classification]}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.color}`}>
                                <StatusIcon className="h-3 w-3" />
                                {STATUS_LABELS[doc.status]}
                              </span>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem className="gap-2" onClick={() => handleConsulter(doc)}>
                                    <Eye className="h-4 w-4" /> Consulter
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="gap-2" onClick={() => handleTelecharger(doc)}>
                                    <Download className="h-4 w-4" /> Télécharger
                                  </DropdownMenuItem>
                                  {doc.status === 'archive' ? (
                                    <DropdownMenuItem className="gap-2" onClick={() => handleRestaurer(doc)}>
                                      <RotateCcw className="h-4 w-4" /> Restaurer
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem className="gap-2" onClick={() => handleArchiver(doc)}>
                                      <Archive className="h-4 w-4" /> Archiver
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem className="gap-2" onClick={() => handleReclassifier(doc)}>
                                    <Tag className="h-4 w-4" /> Reclassifier
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="gap-2 text-red-600" onClick={() => handleSupprimer(doc)}>
                                    <Trash2 className="h-4 w-4" /> Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </motion.tr>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between p-4 border-t">
                <span className="text-xs text-muted-foreground">
                  {filteredDocs.length} document(s) affiché(s) sur {documents.length}
                  {totalPages > 1 && ` — Page ${currentPage} sur ${totalPages}`}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    <ChevronLeft className="h-3 w-3" />
                    Précédent
                  </Button>
                  {getPageNumbers().map(page => (
                    <Button
                      key={page}
                      variant="outline"
                      size="sm"
                      className={`text-xs ${page === currentPage ? 'bg-brand text-white dark:bg-primary' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    Suivant
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Document count by institution */}
        <div className="lg:col-span-1">
          <Card className="glass-card sticky top-24">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-brand dark:text-primary" />
                Documents par institution
              </CardTitle>
              <CardDescription className="text-xs">Répartition des documents officiels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {institutionCounts.map(inst => {
                const maxCount = Math.max(...institutionCounts.map(i => i.count))
                const pct = (inst.count / maxCount) * 100
                return (
                  <div key={inst.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium truncate max-w-[160px]">{inst.name}</span>
                      <span className="text-xs font-bold text-brand dark:text-primary">{inst.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        className={`h-full rounded-full ${inst.color}`}
                      />
                    </div>
                  </div>
                )
              })}
              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Total</span>
                <span className="text-xs font-bold text-brand dark:text-primary">{documents.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-gold" />
                Classification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(['public', 'interne', 'confidentiel', 'secret'] as DocumentClassification[]).map(cls => {
                const count = documents.filter(d => d.classification === cls).length
                const config = CLASSIFICATION_CONFIG[cls]
                return (
                  <div key={cls} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${config.color} px-2 py-0.5 rounded-full`}>
                      <config.icon className="h-3 w-3" />
                      {CLASSIFICATION_LABELS[cls]}
                    </span>
                    <span className="text-xs font-bold">{count}</span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success Toast */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-white text-sm font-medium shadow-lg"
          >
            <CheckCircle2 className="h-4 w-4" />
            {successToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Document Dialog */}
      <Dialog open={uploadDialog} onOpenChange={(open) => { setUploadDialog(open); if (!open) { setUploadFile(null); setUploadProgress(0); setIsUploading(false) } }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-brand dark:text-primary" />
              Importer un document réglementaire
            </DialogTitle>
            <DialogDescription>Ajouter un nouveau document officiel à la GED</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Drag & Drop File Upload Zone */}
            <div className="space-y-2">
              <Label>Fichier (optionnel)</Label>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all cursor-pointer ${
                  dragActive
                    ? 'border-brand bg-brand/5 dark:border-primary dark:bg-primary/10'
                    : uploadFile
                      ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-900/10'
                      : 'border-muted-foreground/25 hover:border-brand/50 hover:bg-brand/5 dark:hover:border-primary/50 dark:hover:bg-primary/5'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileSelect(e.target.files[0])
                  }}
                />
                {uploadFile ? (
                  <div className="flex items-center gap-3 w-full">
                    <div className="p-2.5 rounded-lg bg-brand/10 dark:bg-primary/20">
                      {(() => { const FIcon = getFileIcon(uploadFile.name); return <FIcon className="h-6 w-6 text-brand dark:text-primary" /> })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{uploadFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(uploadFile.size)} — {uploadFile.type || 'Type inconnu'}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={(e) => { e.stopPropagation(); setUploadFile(null); setUploadProgress(0) }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Glissez-déposez un fichier ici ou <span className="text-brand dark:text-primary underline">parcourir</span>
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">PDF, DOC, DOCX, XLS, XLSX, PNG, JPG</p>
                  </>
                )}
              </div>
              {isUploading && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Chargement en cours...</span>
                    <span className="font-medium text-brand dark:text-primary">{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-1.5" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Titre du document</Label>
              <Input
                placeholder="Ex: Décret n°D/2026/... portant organisation..."
                value={newDoc.title}
                onChange={e => setNewDoc(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Description courte du document..."
                value={newDoc.description}
                onChange={e => setNewDoc(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={newDoc.category} onValueChange={(v) => setNewDoc(prev => ({ ...prev, category: v as DocumentCategory }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(CATEGORY_LABELS) as [DocumentCategory, string][]).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Classification</Label>
                <Select value={newDoc.classification} onValueChange={(v) => setNewDoc(prev => ({ ...prev, classification: v as DocumentClassification }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">PUBLIC</SelectItem>
                    <SelectItem value="interne">DIFFUSION LIMITÉE</SelectItem>
                    <SelectItem value="confidentiel">CONFIDENTIEL</SelectItem>
                    <SelectItem value="secret">SECRET</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Institution / Rôle</Label>
              <Select value={newDoc.createdByRole} onValueChange={(v) => setNewDoc(prev => ({ ...prev, createdByRole: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(ROLE_LABELS) as [string, string][]).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadDialog(false); setUploadFile(null); setUploadProgress(0) }}>Annuler</Button>
            <Button className="bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90 gap-2" onClick={uploadDocument} disabled={!newDoc.title || isUploading}>
              <Upload className="h-4 w-4" />
              {isUploading ? 'Chargement...' : 'Importer le document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Consultation Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={(open) => { if (!open) setViewDoc(null) }}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-brand dark:text-primary" />
              Consultation du document
            </DialogTitle>
            <DialogDescription>Détails et aperçu du document officiel</DialogDescription>
          </DialogHeader>
          {viewDoc && (() => {
            const ref = getDocReference(viewDoc)
            return (
              <div className="space-y-4">
                {/* Document metadata */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Référence</Label>
                    <p className="text-sm font-mono font-semibold text-brand dark:text-primary">{ref}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Catégorie</Label>
                    <Badge variant="outline" className="text-xs font-medium">{CATEGORY_LABELS[viewDoc.category]}</Badge>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Institution</Label>
                    <p className="text-sm">{getInstitutionLabel(viewDoc)}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Classification</Label>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${CLASSIFICATION_CONFIG[viewDoc.classification].color}`}>
                      {(() => { const Ic = CLASSIFICATION_CONFIG[viewDoc.classification].icon; return <Ic className="h-3 w-3" /> })()}
                      {CLASSIFICATION_LABELS[viewDoc.classification]}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Statut</Label>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[viewDoc.status].color}`}>
                      {(() => { const Ic = STATUS_CONFIG[viewDoc.status].icon; return <Ic className="h-3 w-3" /> })()}
                      {STATUS_LABELS[viewDoc.status]}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Date</Label>
                    <p className="text-sm">{viewDoc.createdAt.slice(0, 10)}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Taille</Label>
                    <p className="text-sm">{formatFileSize(viewDoc.fileSize)}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Créé par</Label>
                    <p className="text-sm">{viewDoc.createdBy}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Version</Label>
                    <p className="text-sm">v{viewDoc.version}</p>
                  </div>
                </div>

                {/* Description */}
                {viewDoc.description && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <p className="text-sm">{viewDoc.description}</p>
                  </div>
                )}

                {/* Tags */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Étiquettes</Label>
                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => { setNewTagDoc(viewDoc); setNewTagValue('') }}>
                      <Plus className="h-3 w-3" /> Ajouter
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {viewDoc.tags.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">Aucune étiquette</span>
                    ) : (
                      viewDoc.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
                          {tag}
                          <button
                            className="hover:text-red-500 transition-colors rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 p-0.5"
                            onClick={() => { removeTag(viewDoc.id, tag); setViewDoc({ ...viewDoc, tags: viewDoc.tags.filter(t => t !== tag) }) }}
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                {/* Uploaded file info */}
                {viewDoc.fileName && (
                  <div className="rounded-lg border border-brand/20 dark:border-primary/20 bg-brand/5 dark:bg-primary/5 p-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-brand/10 dark:bg-primary/20">
                        {(() => { const FIcon = getFileIcon(viewDoc.fileName); return <FIcon className="h-5 w-5 text-brand dark:text-primary" /> })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{viewDoc.fileName}</p>
                        <p className="text-xs text-muted-foreground">{viewDoc.fileType} — {formatFileSize(viewDoc.fileSize)}</p>
                      </div>
                      <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                )}

                {/* Archive info */}
                {viewDoc.status === 'archive' && viewDoc.archiveDate && (
                  <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 p-3 space-y-1">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Document archivé</p>
                    <p className="text-xs text-amber-600/80 dark:text-amber-300/80">Date d&apos;archivage : {viewDoc.archiveDate.slice(0, 10)}</p>
                    {viewDoc.archiveReason && <p className="text-xs text-amber-600/80 dark:text-amber-300/80">Motif : {viewDoc.archiveReason}</p>}
                  </div>
                )}

                <Separator />

                {/* Simulated document preview */}
                <div className="border rounded-lg p-6 bg-white dark:bg-gray-900 shadow-inner">
                  {/* Republic of Guinea header */}
                  <div className="text-center space-y-1 mb-6">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <div className="w-8 h-5 bg-[#CE1126] rounded-sm" />
                      <div className="w-8 h-5 bg-[#FCD116] rounded-sm" />
                      <div className="w-8 h-5 bg-[#009460] rounded-sm" />
                    </div>
                    <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">République de Guinée</p>
                    <p className="text-[10px] text-muted-foreground">Travail — Justice — Solidarité</p>
                    <Separator className="my-2" />
                  </div>

                  {/* Document content */}
                  <div className="space-y-4 text-sm leading-relaxed">
                    <div className="text-center">
                      <p className="font-bold text-base">{CATEGORY_LABELS[viewDoc.category]} n°{ref}</p>
                    </div>
                    <p className="text-justify first-letter:text-3xl first-letter:font-bold first-letter:float-left first-letter:mr-1 first-letter:mt-1">
                      {viewDoc.title}
                    </p>
                    <p className="text-justify text-muted-foreground">
                      Conformément aux dispositions constitutionnelles et aux textes réglementaires en vigueur en République de Guinée, le présent document est émis pour pleine et entière application par l&apos;institution susvisée et tous les services concernés.
                    </p>
                    <p className="text-justify text-muted-foreground">
                      Les mesures prévues par le présent {CATEGORY_LABELS[viewDoc.category].toLowerCase()} entrent en vigueur à compter de la date de sa signature. Tous les ministères, institutions et organismes concernés sont tenus de veiller à sa stricte application dans les meilleurs délais.
                    </p>
                  </div>

                  {/* Signature area */}
                  <div className="mt-8 flex justify-end">
                    <div className="text-center space-y-1">
                      <p className="text-xs text-muted-foreground">Fait à Conakry, le {viewDoc.createdAt.slice(0, 10)}</p>
                      <p className="text-sm font-semibold">{getInstitutionLabel(viewDoc)}</p>
                      <div className="w-32 border-b border-dashed border-muted-foreground/30 mx-auto mt-4" />
                      <p className="text-[10px] text-muted-foreground">Signature & Cachet</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setViewDoc(null)}>Fermer</Button>
            {viewDoc && viewDoc.fileName && viewDoc.fileData && (
              <Button variant="outline" className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20" onClick={() => handleDownloadOriginal(viewDoc)}>
                <Download className="h-4 w-4" />
                Fichier original
              </Button>
            )}
            {viewDoc && (
              <Button className="bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90 gap-2" onClick={() => { handleTelecharger(viewDoc); setViewDoc(null) }}>
                <Download className="h-4 w-4" />
                Télécharger en PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reclassify Dialog */}
      <Dialog open={!!reclassifyDoc} onOpenChange={(open) => { if (!open) setReclassifyDoc(null) }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-gold" />
              Reclassifier le document
            </DialogTitle>
            <DialogDescription>
              {reclassifyDoc && `Modifier la classification de ${getDocReference(reclassifyDoc)}`}
            </DialogDescription>
          </DialogHeader>
          {reclassifyDoc && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Classification actuelle</Label>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${CLASSIFICATION_CONFIG[reclassifyDoc.classification].color}`}>
                  {(() => { const Ic = CLASSIFICATION_CONFIG[reclassifyDoc.classification].icon; return <Ic className="h-3 w-3" /> })()}
                  {CLASSIFICATION_LABELS[reclassifyDoc.classification]}
                </span>
              </div>
              <div className="space-y-2">
                <Label>Nouvelle classification</Label>
                <Select value={reclassifyValue} onValueChange={(v) => setReclassifyValue(v as DocumentClassification)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">PUBLIC</SelectItem>
                    <SelectItem value="interne">DIFFUSION LIMITÉE</SelectItem>
                    <SelectItem value="confidentiel">CONFIDENTIEL</SelectItem>
                    <SelectItem value="secret">SECRET</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReclassifyDoc(null)}>Annuler</Button>
            <Button className="bg-gold hover:bg-gold/90 text-[#0B2E58] gap-2" onClick={confirmReclassify}>
              <CheckCircle2 className="h-4 w-4" />
              Reclassifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Tag Dialog */}
      <Dialog open={!!newTagDoc} onOpenChange={(open) => { if (!open) setNewTagDoc(null) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-brand dark:text-primary" />
              Ajouter une étiquette
            </DialogTitle>
            <DialogDescription>
              {newTagDoc && `Ajouter une étiquette au document ${getDocReference(newTagDoc)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nouvelle étiquette..."
              value={newTagValue}
              onChange={e => setNewTagValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newTagValue.trim() && newTagDoc) {
                  addTag(newTagDoc.id, newTagValue.trim())
                  setViewDoc(prev => prev && prev.id === newTagDoc.id ? { ...prev, tags: [...prev.tags, newTagValue.trim()] } : prev)
                  setNewTagValue('')
                  setNewTagDoc(null)
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTagDoc(null)}>Annuler</Button>
            <Button
              className="bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90 gap-2"
              disabled={!newTagValue.trim()}
              onClick={() => {
                if (newTagValue.trim() && newTagDoc) {
                  addTag(newTagDoc.id, newTagValue.trim())
                  setViewDoc(prev => prev && prev.id === newTagDoc.id ? { ...prev, tags: [...prev.tags, newTagValue.trim()] } : prev)
                  setNewTagValue('')
                  setNewTagDoc(null)
                }
              }}
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDoc} onOpenChange={(open) => { if (!open) setDeleteDoc(null) }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Le document sera définitivement supprimé de la GED.
            </DialogDescription>
          </DialogHeader>
          {deleteDoc && (
            <div className="py-4">
              <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-red-600" />
                  <span className="font-mono text-sm font-semibold text-red-700 dark:text-red-400">{getDocReference(deleteDoc)}</span>
                </div>
                <p className="text-sm text-red-700/80 dark:text-red-300/80">{deleteDoc.title}</p>
                <p className="text-xs text-red-600/60 dark:text-red-400/60">{CATEGORY_LABELS[deleteDoc.category]} — {getInstitutionLabel(deleteDoc)} — {deleteDoc.createdAt.slice(0, 10)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDoc(null)}>Annuler</Button>
            <Button variant="destructive" className="gap-2" onClick={confirmDelete}>
              <Trash2 className="h-4 w-4" />
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export to National Archives Dialog */}
      <Dialog open={exportDialog} onOpenChange={setExportDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-brand dark:text-primary" />
              Export vers les Archives Nationales
            </DialogTitle>
            <DialogDescription>
              Confirmez l&apos;export des documents affichés vers les Archives Nationales de la République de Guinée.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg border border-brand/20 dark:border-primary/20 bg-brand/5 dark:bg-primary/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Documents à exporter</span>
                <span className="text-lg font-bold text-brand dark:text-primary">{filteredDocs.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Les {filteredDocs.length} documents actuellement affichés seront transférés aux Archives Nationales conformément au Code administratif.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialog(false)}>Annuler</Button>
            <Button className="bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90 gap-2" onClick={confirmExport}>
              <Archive className="h-4 w-4" />
              Confirmer l&apos;export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
