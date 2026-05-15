'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, MailOpen, Send, Clock, Plus, Search, Filter,
  AlertTriangle, Eye, MoreHorizontal, ChevronDown, X,
  Building2, Timer, Shield, CheckCircle2, ArrowRight,
  Stamp, FileCheck, Route, Gauge, CircleDot, ArrowUpDown,
  FileText, GitBranch, PenTool, UserCheck, Archive, ChevronLeft, ChevronRight, Download, Upload, Paperclip, FileImage, FileSpreadsheet, FileType
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { BRAND } from '@/lib/constants'
import { useAppStore } from '@/store/app-store'
import {
  useCourriersStore,
  type Courrier,
  type CourrierType,
  type CourrierStatus,
  type CourrierPriority,
  type CourrierDirection,
  type CourrierAttachment,
  type CourrierNote,
} from '@/store/courriers-store'

// ─── DISPLAY MAPPINGS ────────────────────────────────────────────────────────

type CourrierTab = 'tous' | 'presidentiels' | 'primature' | 'interministeriels' | 'emanations' | 'urgents'

const PRIORITY_DISPLAY: Record<CourrierPriority, string> = {
  urgente: 'URGENTE',
  haute: 'HAUTE',
  normale: 'NORMALE',
  basse: 'BASSE',
}

const PRIORITY_CONFIG: Record<CourrierPriority, { color: string; icon: React.ElementType }> = {
  urgente: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800', icon: AlertTriangle },
  haute: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800', icon: AlertTriangle },
  normale: { color: 'bg-brand/10 text-brand dark:bg-primary/20 dark:text-primary border-brand/20 dark:border-primary/20', icon: Mail },
  basse: { color: 'bg-slate-100 text-slate-600 dark:bg-slate-800/30 dark:text-slate-400 border-slate-200 dark:border-slate-700', icon: Shield },
}

const STATUS_LABELS: Record<CourrierStatus, string> = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  vise: 'Visé',
  traite: 'Traité',
  archive: 'Archivé',
  rejete: 'Rejeté',
}

const STATUS_COLORS: Record<CourrierStatus, string> = {
  en_attente: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  en_cours: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  vise: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  traite: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  archive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  rejete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const DIRECTION_LABELS: Record<CourrierDirection, string> = {
  entrant: 'Entrant',
  sortant: 'Sortant',
  interne: 'Interne',
}

const TYPE_LABELS: Record<CourrierType, string> = {
  presidentiel: 'Présidentiel',
  primature: 'Primature',
  interministeriel: 'Interministériel',
  emanation: 'Émanation',
  urgent: 'Urgent',
  ordinaire: 'Ordinaire',
}

const DESTINATION_SERVICES = [
  'Secrétariat Général (SG)',
  'Cabinet du Premier Ministre',
  'Direction Financière',
  'Direction des Ressources Humaines',
  'Direction Juridique',
  "Direction de l'Urbanisme",
  'Direction de la Coopération',
  'Ministère des Finances (MEF)',
  'Ministère de la Justice (MJ)',
  'Ministère de la Santé (MS)',
  "Ministère de l'Éducation (MEN)",
  'Présidence de la République',
]

const TAB_CONFIG: { value: CourrierTab; label: string; icon?: React.ElementType }[] = [
  { value: 'tous', label: 'Tous les courriers' },
  { value: 'presidentiels', label: 'Courriers présidentiels', icon: Stamp },
  { value: 'primature', label: 'Courriers de la Primature', icon: Building2 },
  { value: 'interministeriels', label: 'Courriers interministériels', icon: ArrowRight },
  { value: 'emanations', label: 'Émanations ministérielles', icon: Send },
  { value: 'urgents', label: 'Urgents', icon: AlertTriangle },
]

const ITEMS_PER_PAGE = 10

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return FileText
  if (['doc', 'docx'].includes(ext || '')) return FileType
  if (['xls', 'xlsx'].includes(ext || '')) return FileSpreadsheet
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) return FileImage
  return FileText
}

function computeSlaInfo(deadline?: string): { text: string; hoursLeft: number } | null {
  if (!deadline) return null
  const now = Date.now()
  const dl = new Date(deadline).getTime()
  const diffMs = dl - now
  if (diffMs <= 0) return { text: 'Échu', hoursLeft: 0 }
  const hoursLeft = diffMs / 3600000
  if (hoursLeft < 1) return { text: `${Math.round(diffMs / 60000)}m restantes`, hoursLeft }
  if (hoursLeft < 24) return { text: `${hoursLeft.toFixed(1)}h restantes`, hoursLeft }
  const days = Math.floor(hoursLeft / 24)
  const remHours = Math.round(hoursLeft % 24)
  return { text: `${days}j ${remHours}h restantes`, hoursLeft }
}

function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' })
  } catch {
    return isoDate
  }
}

function formatNoteDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleString('fr-FR')
  } catch {
    return isoDate
  }
}

const NOTE_TYPE_ICON: Record<CourrierNote['type'], React.ElementType> = {
  note: CircleDot,
  visa: Stamp,
  transfert: ArrowRight,
  rejet: X,
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export function CourriersPage() {
  // Store
  const store = useCourriersStore()
  const navigate = useAppStore((s) => s.navigate)

  // Local UI state
  const [activeTab, setActiveTab] = useState<CourrierTab>('tous')
  const [showFilters, setShowFilters] = useState(false)
  const [newCourrierDialog, setNewCourrierDialog] = useState(false)
  const [successToast, setSuccessToast] = useState('')

  // New courrier form
  const [newCourrier, setNewCourrier] = useState({
    object: '',
    from: '',
    to: '',
    type: 'ordinaire' as CourrierType,
    priority: 'normale' as CourrierPriority,
    direction: 'entrant' as CourrierDirection,
    deadline: '',
  })

  // File upload state
  const [courrierFiles, setCourrierFiles] = useState<File[]>([])
  const [courrierDragActive, setCourrierDragActive] = useState(false)
  const courrierFileInputRef = useRef<HTMLInputElement>(null)

  // Detail dialog
  const [detailDialog, setDetailDialog] = useState(false)
  const [detailCourrierId, setDetailCourrierId] = useState<string | null>(null)

  // Transfer dialog
  const [transferDialog, setTransferDialog] = useState(false)
  const [transferCourrierId, setTransferCourrierId] = useState<string | null>(null)
  const [transferDestination, setTransferDestination] = useState('')
  const [transferNote, setTransferNote] = useState('')

  // Reject dialog
  const [rejectDialog, setRejectDialog] = useState(false)
  const [rejectCourrierId, setRejectCourrierId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Archive confirmation
  const [archiveDialog, setArchiveDialog] = useState(false)
  const [archiveCourrierId, setArchiveCourrierId] = useState<string | null>(null)

  // Add note dialog
  const [addNoteDialog, setAddNoteDialog] = useState(false)
  const [addNoteCourrierId, setAddNoteCourrierId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // ── Toast helper ──────────────────────────────────────────────────────────

  const showToast = (message: string) => {
    setSuccessToast(message)
    setTimeout(() => setSuccessToast(''), 4000)
  }

  // ── Filtered courriers from store + tab ──────────────────────────────────

  const storeFiltered = store.getFilteredCourriers()

  const filtered = useMemo(() => {
    return storeFiltered.filter(c => {
      if (activeTab === 'tous') return true
      if (activeTab === 'presidentiels') return c.type === 'presidentiel'
      if (activeTab === 'primature') return c.type === 'primature'
      if (activeTab === 'interministeriels') return c.type === 'interministeriel'
      if (activeTab === 'emanations') return c.type === 'emanation'
      if (activeTab === 'urgents') return c.priority === 'urgente'
      return true
    })
  }, [storeFiltered, activeTab])

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedFiltered = filtered.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  )

  // ── Stats from store ─────────────────────────────────────────────────────

  const stats = store.getStats()

  const statCards = [
    { label: 'Courriers officiels', value: String(stats.total), icon: Mail, color: 'text-brand dark:text-primary', bg: 'bg-brand/5 dark:bg-primary/10' },
    { label: 'Entrants', value: String(stats.byType?.interministeriel ?? 0), icon: MailOpen, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
    { label: 'Sortants', value: String(stats.byType?.emanation ?? 0), icon: Send, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'En attente de visa', value: String(stats.byStatus?.en_attente ?? 0), icon: Stamp, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Urgents (délai 24h)', value: String(stats.urgentCount), icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'SLA respecté', value: '96.8%', icon: Gauge, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', isProgress: true, progressValue: 96.8 },
  ]

  // ── SLA color helper ─────────────────────────────────────────────────────

  const getSlaColor = (priority: CourrierPriority) => {
    if (priority === 'urgente') return 'text-red-600 dark:text-red-400'
    if (priority === 'haute') return 'text-orange-600 dark:text-orange-400'
    return 'text-amber-600 dark:text-amber-400'
  }

  // ── Drag handlers ────────────────────────────────────────────────────────

  const handleCourrierDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setCourrierDragActive(true)
    } else if (e.type === 'dragleave') {
      setCourrierDragActive(false)
    }
  }, [])

  const handleCourrierDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCourrierDragActive(false)
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files)
      setCourrierFiles(prev => [...prev, ...newFiles])
    }
  }, [])

  const handleCourrierFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setCourrierFiles(prev => [...prev, ...newFiles])
    }
  }

  const removeCourrierFile = (index: number) => {
    setCourrierFiles(prev => prev.filter((_, i) => i !== index))
  }

  // ── Download attachment ──────────────────────────────────────────────────

  const handleDownloadAttachment = (att: CourrierAttachment) => {
    if (!att.fileData) {
      showToast('Aucune donnée de fichier disponible')
      return
    }
    const a = document.createElement('a')
    a.href = att.fileData
    a.download = att.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    showToast(`Fichier ${att.fileName} téléchargé`)
  }

  // ── Create courrier ──────────────────────────────────────────────────────

  const createCourrier = () => {
    if (!newCourrier.object || !newCourrier.from) return

    const processFiles = (): Promise<CourrierAttachment[]> => {
      if (courrierFiles.length === 0) return Promise.resolve([])
      return Promise.all(
        courrierFiles.map((file, idx) => {
          return new Promise<CourrierAttachment>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => {
              resolve({
                id: `att-${Date.now()}-${idx}`,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                fileData: reader.result as string,
              })
            }
            reader.readAsDataURL(file)
          })
        })
      )
    }

    processFiles().then(attachments => {
      const created = store.addCourrier({
        object: newCourrier.object,
        from: newCourrier.from,
        to: newCourrier.to || 'Secrétariat Général',
        type: newCourrier.type,
        status: 'en_attente',
        priority: newCourrier.priority,
        direction: newCourrier.direction,
        date: new Date().toISOString(),
        deadline: newCourrier.deadline || undefined,
        assignedTo: undefined,
        assignedToRole: undefined,
      })

      // Add attachments one by one
      attachments.forEach(att => {
        store.addAttachment(created.id, att)
      })

      setNewCourrier({ object: '', from: '', to: '', type: 'ordinaire', priority: 'normale', direction: 'entrant', deadline: '' })
      setCourrierFiles([])
      setNewCourrierDialog(false)
      setCurrentPage(1)
      showToast(`Courrier ${created.reference} créé avec succès${attachments.length > 0 ? ` (${attachments.length} pièce(s) jointe(s))` : ''}`)
    })
  }

  // ── Workflow actions ─────────────────────────────────────────────────────

  const handleConsulter = (courrierId: string) => {
    setDetailCourrierId(courrierId)
    setDetailDialog(true)
  }

  const handleViser = (courrierId: string) => {
    const c = store.getCourrierById(courrierId)
    if (!c) return
    store.visaCourrier(courrierId, 'Secrétaire Général', 'SG', `Visa accordé — Statut changé en « Visé »`)
    showToast(`Courrier ${c.reference} visé avec succès`)
  }

  const handleTransferOpen = (courrierId: string) => {
    setTransferCourrierId(courrierId)
    setTransferDestination('')
    setTransferNote('')
    setTransferDialog(true)
  }

  const handleTransferConfirm = () => {
    if (!transferCourrierId || !transferDestination) return
    const c = store.getCourrierById(transferCourrierId)
    if (!c) return
    store.transferCourrier(
      transferCourrierId,
      transferDestination,
      'Secrétaire Général',
      'SG',
      transferNote || `Transféré vers ${transferDestination}`
    )
    setTransferDialog(false)
    showToast(`Courrier ${c.reference} transféré vers ${transferDestination}`)
  }

  const handleTraiter = (courrierId: string) => {
    const c = store.getCourrierById(courrierId)
    if (!c) return
    store.treatCourrier(courrierId)
    showToast(`Courrier ${c.reference} marqué comme traité`)
  }

  const handleRejectOpen = (courrierId: string) => {
    setRejectCourrierId(courrierId)
    setRejectReason('')
    setRejectDialog(true)
  }

  const handleRejectConfirm = () => {
    if (!rejectCourrierId || !rejectReason) return
    const c = store.getCourrierById(rejectCourrierId)
    if (!c) return
    store.rejectCourrier(rejectCourrierId, 'Secrétaire Général', 'SG', rejectReason)
    setRejectDialog(false)
    showToast(`Courrier ${c.reference} rejeté`)
  }

  const handleArchiveOpen = (courrierId: string) => {
    setArchiveCourrierId(courrierId)
    setArchiveDialog(true)
  }

  const handleArchiveConfirm = () => {
    if (!archiveCourrierId) return
    const c = store.getCourrierById(archiveCourrierId)
    if (!c) return
    store.archiveCourrier(archiveCourrierId)
    setArchiveDialog(false)
    showToast(`Courrier ${c.reference} archivé avec succès`)
  }

  const handleAddNoteOpen = (courrierId: string) => {
    setAddNoteCourrierId(courrierId)
    setNoteText('')
    setAddNoteDialog(true)
  }

  const handleAddNoteConfirm = () => {
    if (!addNoteCourrierId || !noteText.trim()) return
    store.addNote(addNoteCourrierId, {
      text: noteText,
      author: 'Utilisateur connecté',
      authorRole: 'Agent',
      type: 'note',
    })
    setAddNoteDialog(false)
    showToast('Note ajoutée avec succès')
  }

  // ── Resolved detail courrier ─────────────────────────────────────────────

  const detailCourrier = detailCourrierId ? store.getCourrierById(detailCourrierId) : null
  const transferCourrier = transferCourrierId ? store.getCourrierById(transferCourrierId) : null
  const archiveCourrier = archiveCourrierId ? store.getCourrierById(archiveCourrierId) : null
  const rejectCourrier = rejectCourrierId ? store.getCourrierById(rejectCourrierId) : null

  // ── Workflow action disabled states ──────────────────────────────────────

  const isActionDisabled = (status: CourrierStatus) => {
    return status === 'traite' || status === 'archive' || status === 'rejete'
  }

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
            <Mail className="h-6 w-6 text-brand dark:text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-brand dark:text-primary">Courrier Officiel Interministériel</h2>
            <p className="text-sm text-muted-foreground">Circuit du visa et de la validation conformément à la réglementation administrative</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat, i) => (
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

      {/* SLA Regulatory Indicators */}
      <Card className="border-gold/20 dark:border-gold/10">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-gold" />
              <span className="text-sm font-semibold text-brand dark:text-primary">Délais réglementaires SLA</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-brand dark:bg-primary" />
                <span className="text-xs text-muted-foreground">Présidentiel : <strong className="text-brand dark:text-primary">4h</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs text-muted-foreground">Urgent : <strong className="text-red-600 dark:text-red-400">24h</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-xs text-muted-foreground">Normal : <strong className="text-amber-600 dark:text-amber-400">48h</strong></span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Conformité SLA globale</span>
              <div className="flex items-center gap-2">
                <Progress value={96.8} className="h-2 w-24" />
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">96.8%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
                { label: 'Upload document', icon: FileText, color: 'bg-[#0B2E58] hover:bg-[#0B2E58]/90 text-white', onClick: () => navigate('ged') },
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

      {/* Tabs + Actions */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as CourrierTab); setCurrentPage(1) }}>
              <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
                {TAB_CONFIG.map(tab => (
                  <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs data-[state=active]:bg-brand data-[state=active]:text-white dark:data-[state=active]:bg-primary">
                    {tab.icon && <tab.icon className="h-3 w-3" />}
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par référence, objet, expéditeur..."
                value={store.searchQuery}
                onChange={e => { store.setSearchQuery(e.target.value); setCurrentPage(1) }}
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
              Filtres
              <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
            <Button size="sm" className="gap-2 bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90" onClick={() => setNewCourrierDialog(true)}>
              <Plus className="h-4 w-4" />
              Nouveau courrier
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
                <div className="flex flex-wrap gap-3 pt-3 border-t">
                  <Select value={store.filterPriority} onValueChange={(v) => { store.setFilterPriority(v as CourrierPriority | 'all'); setCurrentPage(1) }}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Priorité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes priorités</SelectItem>
                      <SelectItem value="urgente">URGENTE</SelectItem>
                      <SelectItem value="haute">HAUTE</SelectItem>
                      <SelectItem value="normale">NORMALE</SelectItem>
                      <SelectItem value="basse">BASSE</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={store.filterStatus} onValueChange={(v) => { store.setFilterStatus(v as CourrierStatus | 'all'); setCurrentPage(1) }}>
                    <SelectTrigger className="w-[170px]">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous statuts</SelectItem>
                      <SelectItem value="en_attente">En attente</SelectItem>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="vise">Visé</SelectItem>
                      <SelectItem value="traite">Traité</SelectItem>
                      <SelectItem value="archive">Archivé</SelectItem>
                      <SelectItem value="rejete">Rejeté</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={store.filterDirection} onValueChange={(v) => { store.setFilterDirection(v as CourrierDirection | 'all'); setCurrentPage(1) }}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes directions</SelectItem>
                      <SelectItem value="entrant">Entrant</SelectItem>
                      <SelectItem value="sortant">Sortant</SelectItem>
                      <SelectItem value="interne">Interne</SelectItem>
                    </SelectContent>
                  </Select>
                  {(store.filterPriority !== 'all' || store.filterStatus !== 'all' || store.filterDirection !== 'all') && (
                    <Button variant="ghost" size="sm" onClick={() => {
                      store.setFilterPriority('all')
                      store.setFilterStatus('all')
                      store.setFilterDirection('all')
                      setCurrentPage(1)
                    }}>
                      <X className="h-3 w-3 mr-1" />
                      Réinitialiser
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

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

      {/* New Courrier Dialog */}
      <Dialog open={newCourrierDialog} onOpenChange={(open) => { setNewCourrierDialog(open); if (!open) setCourrierFiles([]) }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-brand dark:text-primary" />
              Nouveau courrier officiel
            </DialogTitle>
            <DialogDescription>Créer un nouveau courrier interministériel</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Objet du courrier</Label>
              <Input
                placeholder="Ex: Note du Cabinet du Premier Ministre — ..."
                value={newCourrier.object}
                onChange={e => setNewCourrier(prev => ({ ...prev, object: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expéditeur</Label>
                <Input
                  placeholder="Ex: Primature, MEF, MATD..."
                  value={newCourrier.from}
                  onChange={e => setNewCourrier(prev => ({ ...prev, from: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Destinataire</Label>
                <Input
                  placeholder="Ex: Secrétariat Général, Ministre..."
                  value={newCourrier.to}
                  onChange={e => setNewCourrier(prev => ({ ...prev, to: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Priorité</Label>
                <Select value={newCourrier.priority} onValueChange={(v) => setNewCourrier(prev => ({ ...prev, priority: v as CourrierPriority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normale">NORMALE</SelectItem>
                    <SelectItem value="haute">HAUTE</SelectItem>
                    <SelectItem value="urgente">URGENTE</SelectItem>
                    <SelectItem value="basse">BASSE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newCourrier.type} onValueChange={(v) => setNewCourrier(prev => ({ ...prev, type: v as CourrierType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ordinaire">Ordinaire</SelectItem>
                    <SelectItem value="presidentiel">Présidentiel</SelectItem>
                    <SelectItem value="primature">Primature</SelectItem>
                    <SelectItem value="interministeriel">Interministériel</SelectItem>
                    <SelectItem value="emanation">Émanation</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select value={newCourrier.direction} onValueChange={(v) => setNewCourrier(prev => ({ ...prev, direction: v as CourrierDirection }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrant">Entrant</SelectItem>
                    <SelectItem value="sortant">Sortant</SelectItem>
                    <SelectItem value="interne">Interne</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Date limite (optionnel)</Label>
              <Input
                type="date"
                value={newCourrier.deadline}
                onChange={e => setNewCourrier(prev => ({ ...prev, deadline: e.target.value }))}
              />
            </div>

            {/* File attachment zone */}
            <div className="space-y-2">
              <Label>Pièces jointes (optionnel)</Label>
              <div
                onDragEnter={handleCourrierDrag}
                onDragLeave={handleCourrierDrag}
                onDragOver={handleCourrierDrag}
                onDrop={handleCourrierDrop}
                onClick={() => courrierFileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-all cursor-pointer ${
                  courrierDragActive
                    ? 'border-brand bg-brand/5 dark:border-primary dark:bg-primary/10'
                    : courrierFiles.length > 0
                      ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-900/10'
                      : 'border-muted-foreground/25 hover:border-brand/50 hover:bg-brand/5 dark:hover:border-primary/50 dark:hover:bg-primary/5'
                }`}
              >
                <input
                  ref={courrierFileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  multiple
                  className="hidden"
                  onChange={handleCourrierFileSelect}
                />
                {courrierFiles.length === 0 ? (
                  <>
                    <Paperclip className="h-6 w-6 text-muted-foreground/40 mb-1" />
                    <p className="text-xs font-medium text-muted-foreground">
                      Ajouter des pièces jointes ou <span className="text-brand dark:text-primary underline">parcourir</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">PDF, DOC, XLS, PNG, JPG</p>
                  </>
                ) : (
                  <div className="w-full space-y-2">
                    {courrierFiles.map((file, i) => {
                      const FIcon = getFileIcon(file.name)
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <FIcon className="h-4 w-4 text-brand dark:text-primary shrink-0" />
                          <span className="text-xs truncate flex-1">{file.name}</span>
                          <span className="text-[10px] text-muted-foreground">{formatFileSize(file.size)}</span>
                          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={(e) => { e.stopPropagation(); removeCourrierFile(i) }}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )
                    })}
                    <p className="text-[10px] text-muted-foreground text-center">Cliquez pour ajouter d&apos;autres fichiers</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNewCourrierDialog(false); setCourrierFiles([]) }}>Annuler</Button>
            <Button className="bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90 gap-2" onClick={createCourrier} disabled={!newCourrier.object || !newCourrier.from}>
              <Send className="h-4 w-4" />
              Créer le courrier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Courrier Detail Dialog */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-brand dark:text-primary" />
              Détails du courrier
            </DialogTitle>
            <DialogDescription>Informations complètes du courrier officiel</DialogDescription>
          </DialogHeader>
          {detailCourrier && (() => {
            const c = detailCourrier
            const pConfig = PRIORITY_CONFIG[c.priority]
            const PIcon = pConfig.icon
            const slaInfo = computeSlaInfo(c.deadline)
            return (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Référence</span>
                  <p className="text-sm font-mono font-medium text-brand dark:text-primary">{c.reference}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Date</span>
                  <p className="text-sm">{formatDate(c.date)}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Objet</span>
                <p className="text-sm font-medium">{c.object}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Expéditeur</span>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm">{c.from}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Destinataire</span>
                  <div className="flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm">{c.to}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Priorité</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${pConfig.color}`}>
                    <PIcon className="h-3 w-3" />
                    {PRIORITY_DISPLAY[c.priority]}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Type</span>
                  <Badge variant="outline" className="text-xs">{TYPE_LABELS[c.type]}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Direction</span>
                  <Badge variant="outline" className="text-xs">{DIRECTION_LABELS[c.direction]}</Badge>
                </div>
                {c.assignedTo && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Assigné à</span>
                    <p className="text-sm">{c.assignedTo} <span className="text-muted-foreground text-xs">({c.assignedToRole})</span></p>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Circuit de validation</span>
                <div className="flex items-center gap-1.5">
                  <Route className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-sm">{c.from} → {c.to}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Statut</span>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                      {STATUS_LABELS[c.status]}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">SLA</span>
                  <p className="text-sm">
                    {slaInfo ? (
                      <span className={`inline-flex items-center gap-1 font-medium ${getSlaColor(c.priority)}`}>
                        <Timer className="h-3.5 w-3.5" />
                        {slaInfo.text}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </p>
                </div>
              </div>
              {/* Notes / Processing history */}
              {c.notes.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground font-medium">Historique de traitement</span>
                    <div className="max-h-40 overflow-y-auto space-y-1.5">
                      {c.notes.map((note) => {
                        const NIcon = NOTE_TYPE_ICON[note.type] || CircleDot
                        return (
                          <div key={note.id} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-muted/50">
                            <NIcon className={`h-3 w-3 mt-0.5 shrink-0 ${
                              note.type === 'visa' ? 'text-emerald-600' :
                              note.type === 'transfert' ? 'text-sky-600' :
                              note.type === 'rejet' ? 'text-red-600' :
                              'text-brand dark:text-primary'
                            }`} />
                            <div className="flex-1">
                              <span>{note.text}</span>
                              <div className="text-muted-foreground mt-0.5">
                                {note.author} ({note.authorRole}) — {formatNoteDate(note.date)}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
              {/* Attached files */}
              {c.attachments.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <Paperclip className="h-3 w-3" />
                      Pièces jointes ({c.attachments.length})
                    </span>
                    <div className="space-y-1.5">
                      {c.attachments.map((att) => {
                        const FIcon = getFileIcon(att.fileName)
                        return (
                          <div key={att.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-muted-foreground/10">
                            <FIcon className="h-4 w-4 text-brand dark:text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{att.fileName}</p>
                              <p className="text-[10px] text-muted-foreground">{formatFileSize(att.fileSize)}</p>
                            </div>
                            {att.fileData && (
                              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 shrink-0" onClick={() => handleDownloadAttachment(att)}>
                                <Download className="h-3 w-3" />
                                Télécharger
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
            )
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialog(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-brand dark:text-primary" />
              Transférer le courrier
            </DialogTitle>
            <DialogDescription>
              {transferCourrier && `Transférer ${transferCourrier.reference} — ${transferCourrier.object.slice(0, 60)}...`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Service de destination</Label>
              <Select value={transferDestination} onValueChange={setTransferDestination}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le service destinataire" />
                </SelectTrigger>
                <SelectContent>
                  {DESTINATION_SERVICES.map(service => (
                    <SelectItem key={service} value={service}>{service}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note de transfert (optionnel)</Label>
              <Textarea
                placeholder="Ajoutez une note explicative pour le transfert..."
                value={transferNote}
                onChange={e => setTransferNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialog(false)}>Annuler</Button>
            <Button className="bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90 gap-2" onClick={handleTransferConfirm} disabled={!transferDestination}>
              <ArrowRight className="h-4 w-4" />
              Confirmer le transfert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-600" />
              Rejeter le courrier
            </DialogTitle>
            <DialogDescription>
              {rejectCourrier && `Rejeter ${rejectCourrier.reference} — ${rejectCourrier.object.slice(0, 60)}...`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Motif du rejet</Label>
              <Textarea
                placeholder="Précisez le motif du rejet..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(false)}>Annuler</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white gap-2" onClick={handleRejectConfirm} disabled={!rejectReason.trim()}>
              <X className="h-4 w-4" />
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={addNoteDialog} onOpenChange={setAddNoteDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand dark:text-primary" />
              Ajouter une note
            </DialogTitle>
            <DialogDescription>Ajouter une note de traitement au courrier</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                placeholder="Rédigez votre note..."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddNoteDialog(false)}>Annuler</Button>
            <Button className="bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90 gap-2" onClick={handleAddNoteConfirm} disabled={!noteText.trim()}>
              <CheckCircle2 className="h-4 w-4" />
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialog} onOpenChange={setArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-amber-600" />
              Archiver le courrier
            </AlertDialogTitle>
            <AlertDialogDescription>
              {archiveCourrier && `Voulez-vous archiver le courrier ${archiveCourrier.reference} ? Cette action indiquera que le courrier a été traité et archivé.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleArchiveConfirm}>
              Confirmer l&apos;archivage
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Courriers Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-semibold">Référence</TableHead>
                  <TableHead className="text-xs font-semibold min-w-[280px]">Objet</TableHead>
                  <TableHead className="text-xs font-semibold">Expéditeur / Destinataire</TableHead>
                  <TableHead className="text-xs font-semibold">Priorité</TableHead>
                  <TableHead className="text-xs font-semibold hidden lg:table-cell">Type / Direction</TableHead>
                  <TableHead className="text-xs font-semibold">Statut</TableHead>
                  <TableHead className="text-xs font-semibold">SLA</TableHead>
                  <TableHead className="text-xs font-semibold w-10">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedFiltered.map((c, i) => {
                  const pConfig = PRIORITY_CONFIG[c.priority]
                  const PriorityIcon = pConfig.icon
                  const statusColor = STATUS_COLORS[c.status]
                  const slaInfo = computeSlaInfo(c.deadline)
                  return (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-muted/50 transition-colors group"
                    >
                      <TableCell>
                        <span className="font-mono text-xs font-medium text-brand dark:text-primary">{c.reference}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm leading-tight line-clamp-2">{c.object}</span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground truncate max-w-[130px]">{c.from}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Send className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground truncate max-w-[130px]">{c.to}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${pConfig.color}`}>
                          <PriorityIcon className="h-3 w-3" />
                          {PRIORITY_DISPLAY[c.priority]}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] h-5">{TYPE_LABELS[c.type]}</Badge>
                          <span className="text-[10px] text-muted-foreground">{DIRECTION_LABELS[c.direction]}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor}`}>
                          {STATUS_LABELS[c.status]}
                        </span>
                      </TableCell>
                      <TableCell>
                        {slaInfo ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${slaInfo.hoursLeft === 0 ? 'text-gray-500' : getSlaColor(c.priority)}`}>
                            <Timer className="h-3 w-3" />
                            {slaInfo.text}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2" onClick={() => handleConsulter(c.id)}>
                              <Eye className="h-4 w-4" /> Consulter
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => handleViser(c.id)} disabled={isActionDisabled(c.status) || c.status === 'vise'}>
                              <Stamp className="h-4 w-4" /> Viser
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => handleTransferOpen(c.id)} disabled={isActionDisabled(c.status)}>
                              <ArrowRight className="h-4 w-4" /> Transférer
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => handleTraiter(c.id)} disabled={isActionDisabled(c.status)}>
                              <FileCheck className="h-4 w-4" /> Traiter
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => handleRejectOpen(c.id)} disabled={isActionDisabled(c.status)}>
                              <X className="h-4 w-4" /> Rejeter
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => handleAddNoteOpen(c.id)}>
                              <FileText className="h-4 w-4" /> Ajouter une note
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => handleArchiveOpen(c.id)} disabled={c.status === 'archive'}>
                              <Archive className="h-4 w-4" /> Archiver
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Mail className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">Aucun courrier trouvé</p>
              <p className="text-xs">Modifiez vos filtres ou créez un nouveau courrier</p>
            </div>
          )}
          <div className="flex items-center justify-between p-4 border-t">
            <span className="text-xs text-muted-foreground">
              {filtered.length} courrier(s) affiché(s) sur {store.courriers.length} — Page {safeCurrentPage} sur {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Précédent
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant="outline"
                  size="sm"
                  className={`text-xs h-8 w-8 p-0 ${page === safeCurrentPage ? 'bg-brand text-white dark:bg-primary' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Suivant
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
