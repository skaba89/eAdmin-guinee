'use client'

import { useState, useRef, useCallback } from 'react'
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

type CourrierPriority = 'URGENT' | 'IMPORTANT' | 'NORMAL' | 'CONFIDENTIEL'
type CourrierStatus = 'En attente de visa SG' | 'En cours de validation' | 'Diffusée' | 'Transmis au Ministre' | 'En attente visa SG' | 'Visa obtenu' | 'Visé' | 'En cours' | 'Traité' | 'Archivé' | 'En attente' | 'Diffusé' | 'En commission'
type CourrierTab = 'tous' | 'presidentiels' | 'primature' | 'interministeriels' | 'emanations' | 'urgents'

interface PieceJointe {
  name: string
  type: string
  size: string
  data: string
}

interface Courrier {
  id: string
  reference: string
  objet: string
  expediteur: string
  priority: CourrierPriority
  circuit: string
  statut: CourrierStatus
  sla: string
  slaHours?: number
  date: string
  notes?: string[]
  piecesJointes?: PieceJointe[]
}

const COURRIERS: Courrier[] = [
  { id: '1', reference: 'CR-2026-8721', objet: 'Note du Cabinet du Premier Ministre — Préparation du Conseil des Ministres', expediteur: 'Primature', priority: 'URGENT', circuit: 'SG → Cabinet PM → Conseil des Ministres', statut: 'En attente de visa SG', sla: '3h 45m restantes', slaHours: 4, date: '2026-05-09' },
  { id: '2', reference: 'CR-2026-8720', objet: "Demande d'avis budgétaire — Projet de décret financier", expediteur: 'MEF → MATD', priority: 'IMPORTANT', circuit: 'Direction Financière → SG → Ministre', statut: 'En cours de validation', sla: '18h 20m restantes', slaHours: 48, date: '2026-05-08' },
  { id: '3', reference: 'CR-2026-8719', objet: 'Circulaire de rentrée administrative 2026-2027', expediteur: 'MEFNA', priority: 'NORMAL', circuit: 'Rédaction → Visa SG → Diffusion', statut: 'Diffusée', sla: '', date: '2026-05-07' },
  { id: '4', reference: 'CR-2026-8718', objet: "Rapport d'inspection — Services déconcentrés de Kindia", expediteur: 'MATD', priority: 'IMPORTANT', circuit: 'Inspection → Direction → SG → Ministre', statut: 'Transmis au Ministre', sla: '36h restantes', slaHours: 48, date: '2026-05-06' },
  { id: '5', reference: 'CR-2026-8717', objet: "Demande d'autorisation de mission à l'étranger", expediteur: 'MPTEN', priority: 'NORMAL', circuit: 'Service → Direction → SG → Ministre', statut: 'En attente visa SG', sla: '42h restantes', slaHours: 48, date: '2026-05-05' },
  { id: '6', reference: 'CR-2026-8716', objet: "Projet d'arrêté — Organisation de la Journée de l'Indépendance", expediteur: 'Présidence', priority: 'URGENT', circuit: 'Cabinet Présidentiel → SGG → Président', statut: 'Visa obtenu', sla: '', date: '2026-05-05' },
  { id: '7', reference: 'CR-2026-8715', objet: "Communication — Résultats de l'appel d'offres marché public", expediteur: 'MEF', priority: 'CONFIDENTIEL', circuit: 'Commission → Direction Marchés → Contrôle Financier', statut: 'En cours', sla: '24h restantes', slaHours: 48, date: '2026-05-04' },
  { id: '8', reference: 'CR-2026-8714', objet: "Note de service — Affectation des cadres de la fonction publique", expediteur: 'MFP', priority: 'NORMAL', circuit: 'Direction RH → SG → Ministre', statut: 'Traité', sla: '', date: '2026-05-03' },
  { id: '9', reference: 'CR-2026-8713', objet: "Demande d'avis juridique — Contentieux minier", expediteur: 'MJ → MMG', priority: 'IMPORTANT', circuit: 'Service Juridique → Direction → SG → Ministre', statut: 'En attente', sla: '12h restantes', slaHours: 48, date: '2026-05-03' },
  { id: '10', reference: 'CR-2026-8712', objet: 'Rapport épidémiologique hebdomadaire', expediteur: 'MS', priority: 'NORMAL', circuit: 'Direction Santé → SG → Diffusion', statut: 'Diffusé', sla: '', date: '2026-05-02' },
  { id: '11', reference: 'CR-2026-8711', objet: 'Projet de loi — Code du numérique révisé', expediteur: 'MPTEN → AN', priority: 'CONFIDENTIEL', circuit: 'Rédaction → Commission → Assemblée → Promulgation', statut: 'En commission', sla: '72h restantes', slaHours: 96, date: '2026-05-01' },
  { id: '12', reference: 'CR-2026-8710', objet: 'Invitation — Conseil interministériel du 15 mai 2026', expediteur: 'Primature', priority: 'URGENT', circuit: 'SG → Cabinet PM → Tous les Ministères', statut: 'Diffusée', sla: '', date: '2026-05-01' },
]

const DESTINATION_SERVICES = [
  'Secrétariat Général (SG)',
  'Cabinet du Premier Ministre',
  'Direction Financière',
  'Direction des Ressources Humaines',
  'Direction Juridique',
  'Direction de l\'Urbanisme',
  'Direction de la Coopération',
  'Ministère des Finances (MEF)',
  'Ministère de la Justice (MJ)',
  'Ministère de la Santé (MS)',
  'Ministère de l\'Éducation (MEN)',
  'Présidence de la République',
]

const PRIORITY_CONFIG: Record<CourrierPriority, { color: string; icon: React.ElementType }> = {
  URGENT: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800', icon: AlertTriangle },
  IMPORTANT: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800', icon: AlertTriangle },
  NORMAL: { color: 'bg-brand/10 text-brand dark:bg-primary/20 dark:text-primary border-brand/20 dark:border-primary/20', icon: Mail },
  CONFIDENTIEL: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800', icon: Shield },
}

const STATUS_COLORS: Record<string, string> = {
  'En attente de visa SG': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'En cours de validation': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  'Diffusée': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Transmis au Ministre': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  'En attente visa SG': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Visa obtenu': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Visé': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'En cours': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  'Traité': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Archivé': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  'En attente': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Diffusé': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'En commission': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
}

const TAB_CONFIG: { value: CourrierTab; label: string; icon?: React.ElementType }[] = [
  { value: 'tous', label: 'Tous les courriers' },
  { value: 'presidentiels', label: 'Courriers présidentiels', icon: Stamp },
  { value: 'primature', label: 'Courriers de la Primature', icon: Building2 },
  { value: 'interministeriels', label: 'Courriers interministériels', icon: ArrowRight },
  { value: 'emanations', label: 'Émanations ministérielles', icon: Send },
  { value: 'urgents', label: 'Urgents', icon: AlertTriangle },
]

const ITEMS_PER_PAGE = 10

export function CourriersPage() {
  const [activeTab, setActiveTab] = useState<CourrierTab>('tous')
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('tous')
  const [showFilters, setShowFilters] = useState(false)
  const [newCourrierDialog, setNewCourrierDialog] = useState(false)
  const [courriers, setCourriers] = useState(COURRIERS)
  const [newCourrier, setNewCourrier] = useState({ objet: '', expediteur: '', priority: 'NORMAL' as CourrierPriority, circuit: '' })
  const [successToast, setSuccessToast] = useState('')
  const navigate = useAppStore((s) => s.navigate)

  // File upload state
  const [courrierFiles, setCourrierFiles] = useState<File[]>([])
  const [courrierDragActive, setCourrierDragActive] = useState(false)
  const courrierFileInputRef = useRef<HTMLInputElement>(null)

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Get file icon
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return FileText
    if (['doc', 'docx'].includes(ext || '')) return FileType
    if (['xls', 'xlsx'].includes(ext || '')) return FileSpreadsheet
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) return FileImage
    return FileText
  }

  // Drag handlers
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

  // Download attached file
  const handleDownloadPieceJointe = (pj: PieceJointe) => {
    const a = document.createElement('a')
    a.href = pj.data
    a.download = pj.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    showToast(`Fichier ${pj.name} téléchargé`)
  }

  // Detail dialog
  const [detailDialog, setDetailDialog] = useState(false)
  const [detailCourrier, setDetailCourrier] = useState<Courrier | null>(null)

  // Transfer dialog
  const [transferDialog, setTransferDialog] = useState(false)
  const [transferCourrier, setTransferCourrier] = useState<Courrier | null>(null)
  const [transferDestination, setTransferDestination] = useState('')
  const [transferNote, setTransferNote] = useState('')

  // Archive confirmation
  const [archiveDialog, setArchiveDialog] = useState(false)
  const [archiveCourrier, setArchiveCourrier] = useState<Courrier | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  const showToast = (message: string) => {
    setSuccessToast(message)
    setTimeout(() => setSuccessToast(''), 4000)
  }

  const createCourrier = () => {
    if (!newCourrier.objet || !newCourrier.expediteur) return
    const id = String(courriers.length + 1)
    const ref = `CR-2026-${8722 + courriers.length}`

    // Process attached files
    const processFiles = (): Promise<PieceJointe[]> => {
      if (courrierFiles.length === 0) return Promise.resolve([])
      return Promise.all(
        courrierFiles.map(file => {
          return new Promise<PieceJointe>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => {
              resolve({
                name: file.name,
                type: file.type,
                size: formatFileSize(file.size),
                data: reader.result as string,
              })
            }
            reader.readAsDataURL(file)
          })
        })
      )
    }

    processFiles().then(piecesJointes => {
      const created: Courrier = {
        id,
        reference: ref,
        objet: newCourrier.objet,
        expediteur: newCourrier.expediteur,
        priority: newCourrier.priority,
        circuit: newCourrier.circuit || 'Rédaction → Visa SG → Ministre',
        statut: 'En attente',
        sla: '48h restantes',
        slaHours: 48,
        date: new Date().toISOString().slice(0, 10),
        piecesJointes,
      }
      setCourriers(prev => [created, ...prev])
      setNewCourrier({ objet: '', expediteur: '', priority: 'NORMAL', circuit: '' })
      setCourrierFiles([])
      setNewCourrierDialog(false)
      setCurrentPage(1)
      showToast(`Courrier ${ref} créé avec succès${piecesJointes.length > 0 ? ` (${piecesJointes.length} pièce(s) jointe(s))` : ''}`)
    })
  }

  const handleConsulter = (courrier: Courrier) => {
    setDetailCourrier(courrier)
    setDetailDialog(true)
  }

  const handleViser = (courrier: Courrier) => {
    setCourriers(prev => prev.map(c =>
      c.id === courrier.id
        ? { ...c, statut: 'Visé' as CourrierStatus, sla: '', notes: [...(c.notes || []), `[${new Date().toLocaleString('fr-FR')}] Visa accordé — Statut changé en « Visé »`] }
        : c
    ))
    showToast(`Courrier ${courrier.reference} visé avec succès`)
  }

  const handleTransferOpen = (courrier: Courrier) => {
    setTransferCourrier(courrier)
    setTransferDestination('')
    setTransferNote('')
    setTransferDialog(true)
  }

  const handleTransferConfirm = () => {
    if (!transferCourrier || !transferDestination) return
    setCourriers(prev => prev.map(c =>
      c.id === transferCourrier.id
        ? {
            ...c,
            statut: 'Transmis au Ministre' as CourrierStatus,
            circuit: `${c.circuit} → ${transferDestination}`,
            notes: [...(c.notes || []), `[${new Date().toLocaleString('fr-FR')}] Transféré vers ${transferDestination}${transferNote ? ` — Note: ${transferNote}` : ''}`],
          }
        : c
    ))
    setTransferDialog(false)
    showToast(`Courrier ${transferCourrier.reference} transféré vers ${transferDestination}`)
  }

  const handleTraiter = (courrier: Courrier) => {
    setCourriers(prev => prev.map(c =>
      c.id === courrier.id
        ? { ...c, statut: 'Traité' as CourrierStatus, sla: '', notes: [...(c.notes || []), `[${new Date().toLocaleString('fr-FR')}] Courrier traité`] }
        : c
    ))
    showToast(`Courrier ${courrier.reference} marqué comme traité`)
  }

  const handleArchiveOpen = (courrier: Courrier) => {
    setArchiveCourrier(courrier)
    setArchiveDialog(true)
  }

  const handleArchiveConfirm = () => {
    if (!archiveCourrier) return
    setCourriers(prev => prev.map(c =>
      c.id === archiveCourrier.id
        ? { ...c, statut: 'Archivé' as CourrierStatus, sla: '', notes: [...(c.notes || []), `[${new Date().toLocaleString('fr-FR')}] Courrier archivé`] }
        : c
    ))
    setArchiveDialog(false)
    showToast(`Courrier ${archiveCourrier.reference} archivé avec succès`)
  }

  const filtered = courriers.filter(c => {
    const matchTab = activeTab === 'tous' ||
      (activeTab === 'presidentiels' && c.expediteur.includes('Présidence')) ||
      (activeTab === 'primature' && c.expediteur.includes('Primature')) ||
      (activeTab === 'interministeriels' && c.expediteur.includes('→')) ||
      (activeTab === 'emanations' && !c.expediteur.includes('→') && !c.expediteur.includes('Présidence') && !c.expediteur.includes('Primature')) ||
      (activeTab === 'urgents' && c.priority === 'URGENT')
    const matchSearch = c.objet.toLowerCase().includes(search.toLowerCase()) ||
      c.reference.toLowerCase().includes(search.toLowerCase()) ||
      c.expediteur.toLowerCase().includes(search.toLowerCase())
    const matchPriority = priorityFilter === 'tous' || c.priority === priorityFilter
    return matchTab && matchSearch && matchPriority
  })

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginatedFiltered = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const statCards = [
    { label: 'Courriers officiels', value: '14 250', icon: Mail, color: 'text-brand dark:text-primary', bg: 'bg-brand/5 dark:bg-primary/10' },
    { label: 'Entrants (interministériels)', value: '8 730', icon: MailOpen, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
    { label: 'Sortants (émanations)', value: '5 520', icon: Send, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'En attente de visa', value: '412', icon: Stamp, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Urgents (délai 24h)', value: '87', icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'SLA respecté', value: '96.8%', icon: Gauge, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', isProgress: true, progressValue: 96.8 },
  ]

  const getSlaColor = (sla: string, priority: CourrierPriority) => {
    if (!sla) return 'text-muted-foreground'
    if (priority === 'URGENT') return 'text-red-600 dark:text-red-400'
    return 'text-amber-600 dark:text-amber-400'
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
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
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
                  <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setCurrentPage(1) }}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Priorité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous">Toutes priorités</SelectItem>
                      <SelectItem value="URGENT">URGENT</SelectItem>
                      <SelectItem value="IMPORTANT">IMPORTANT</SelectItem>
                      <SelectItem value="NORMAL">NORMAL</SelectItem>
                      <SelectItem value="CONFIDENTIEL">CONFIDENTIEL</SelectItem>
                    </SelectContent>
                  </Select>
                  {priorityFilter !== 'tous' && (
                    <Button variant="ghost" size="sm" onClick={() => { setPriorityFilter('tous'); setCurrentPage(1) }}>
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
                value={newCourrier.objet}
                onChange={e => setNewCourrier(prev => ({ ...prev, objet: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expéditeur</Label>
                <Input
                  placeholder="Ex: Primature, MEF, MATD..."
                  value={newCourrier.expediteur}
                  onChange={e => setNewCourrier(prev => ({ ...prev, expediteur: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Priorité</Label>
                <Select value={newCourrier.priority} onValueChange={(v) => setNewCourrier(prev => ({ ...prev, priority: v as CourrierPriority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">NORMAL</SelectItem>
                    <SelectItem value="IMPORTANT">IMPORTANT</SelectItem>
                    <SelectItem value="URGENT">URGENT</SelectItem>
                    <SelectItem value="CONFIDENTIEL">CONFIDENTIEL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Circuit de validation (optionnel)</Label>
              <Input
                placeholder="Ex: SG → Cabinet PM → Conseil des Ministres"
                value={newCourrier.circuit}
                onChange={e => setNewCourrier(prev => ({ ...prev, circuit: e.target.value }))}
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
            <Button className="bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90 gap-2" onClick={createCourrier} disabled={!newCourrier.objet || !newCourrier.expediteur}>
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
          {detailCourrier && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Référence</span>
                  <p className="text-sm font-mono font-medium text-brand dark:text-primary">{detailCourrier.reference}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Date</span>
                  <p className="text-sm">{detailCourrier.date}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Objet</span>
                <p className="text-sm font-medium">{detailCourrier.objet}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Expéditeur</span>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm">{detailCourrier.expediteur}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Priorité</span>
                  <div>
                    {(() => {
                      const pConfig = PRIORITY_CONFIG[detailCourrier.priority]
                      const PIcon = pConfig.icon
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${pConfig.color}`}>
                          <PIcon className="h-3 w-3" />
                          {detailCourrier.priority}
                        </span>
                      )
                    })()}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Circuit de validation</span>
                <div className="flex items-center gap-1.5">
                  <Route className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-sm">{detailCourrier.circuit}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Statut</span>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[detailCourrier.statut] || 'bg-gray-100 text-gray-700'}`}>
                      {detailCourrier.statut}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">SLA</span>
                  <p className="text-sm">
                    {detailCourrier.sla ? (
                      <span className={`inline-flex items-center gap-1 font-medium ${getSlaColor(detailCourrier.sla, detailCourrier.priority)}`}>
                        <Timer className="h-3.5 w-3.5" />
                        {detailCourrier.sla}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </p>
                </div>
              </div>
              {detailCourrier.notes && detailCourrier.notes.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground font-medium">Historique de traitement</span>
                    <div className="max-h-40 overflow-y-auto space-y-1.5">
                      {detailCourrier.notes.map((note, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-muted/50">
                          <CircleDot className="h-3 w-3 mt-0.5 text-brand dark:text-primary shrink-0" />
                          <span>{note}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {/* Attached files */}
              {detailCourrier.piecesJointes && detailCourrier.piecesJointes.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <Paperclip className="h-3 w-3" />
                      Pièces jointes ({detailCourrier.piecesJointes.length})
                    </span>
                    <div className="space-y-1.5">
                      {detailCourrier.piecesJointes.map((pj, idx) => {
                        const FIcon = getFileIcon(pj.name)
                        return (
                          <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-muted-foreground/10">
                            <FIcon className="h-4 w-4 text-brand dark:text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{pj.name}</p>
                              <p className="text-[10px] text-muted-foreground">{pj.size}</p>
                            </div>
                            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 shrink-0" onClick={() => handleDownloadPieceJointe(pj)}>
                              <Download className="h-3 w-3" />
                              Télécharger
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
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
              {transferCourrier && `Transférer ${transferCourrier.reference} — ${transferCourrier.objet.slice(0, 60)}...`}
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
                  <TableHead className="text-xs font-semibold hidden lg:table-cell">Circuit</TableHead>
                  <TableHead className="text-xs font-semibold">Statut</TableHead>
                  <TableHead className="text-xs font-semibold">SLA</TableHead>
                  <TableHead className="text-xs font-semibold w-10">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedFiltered.map((c, i) => {
                  const pConfig = PRIORITY_CONFIG[c.priority]
                  const PriorityIcon = pConfig.icon
                  const statusColor = STATUS_COLORS[c.statut] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
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
                        <span className="text-sm leading-tight line-clamp-2">{c.objet}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground truncate max-w-[130px]">{c.expediteur}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${pConfig.color}`}>
                          <PriorityIcon className="h-3 w-3" />
                          {c.priority}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1 max-w-[200px]">
                          <Route className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-[10px] text-muted-foreground truncate">{c.circuit}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor}`}>
                          {c.statut}
                        </span>
                      </TableCell>
                      <TableCell>
                        {c.sla ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${getSlaColor(c.sla, c.priority)}`}>
                            <Timer className="h-3 w-3" />
                            {c.sla}
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
                            <DropdownMenuItem className="gap-2" onClick={() => handleConsulter(c)}>
                              <Eye className="h-4 w-4" /> Consulter
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => handleViser(c)} disabled={c.statut === 'Visé' || c.statut === 'Traité' || c.statut === 'Archivé'}>
                              <Stamp className="h-4 w-4" /> Viser
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => handleTransferOpen(c)} disabled={c.statut === 'Traité' || c.statut === 'Archivé'}>
                              <ArrowRight className="h-4 w-4" /> Transférer
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => handleTraiter(c)} disabled={c.statut === 'Traité' || c.statut === 'Archivé'}>
                              <FileCheck className="h-4 w-4" /> Traiter
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => handleArchiveOpen(c)} disabled={c.statut === 'Archivé'}>
                              <CheckCircle2 className="h-4 w-4" /> Archiver
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
          <div className="flex items-center justify-between p-4 border-t">
            <span className="text-xs text-muted-foreground">
              {filtered.length} courrier(s) affiché(s) sur {courriers.length} — Page {currentPage} sur {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                disabled={currentPage === 1}
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
                  className={`text-xs h-8 w-8 p-0 ${page === currentPage ? 'bg-brand text-white dark:bg-primary' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                disabled={currentPage === totalPages}
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
