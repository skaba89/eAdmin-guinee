'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, FileText, Clock, CheckCircle2, AlertCircle, Search,
  Send, MapPin, Phone, Hash, Calendar, ArrowRight,
  XCircle, Download, Mail, Check, Play,
  Baby, Shield, Stamp, MessageSquare,
  ClipboardCheck, User, BookOpen, Database,
  Paperclip, FileCheck, Upload as UploadIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { useAppStore } from '@/store/app-store'
import { useCitizenRequestsStore, type CitizenRequest, type RequestStatus } from '@/store/citizen-requests-store'
import { useBirthCertificateStore, type BirthRecord } from '@/store/birth-certificate-store'
import { formatFileSize, getFileTypeIcon, downloadUploadedFile, downloadCitizenDocument, createGeneratedDocument, ACCEPTED_FILE_TYPES, processFile } from '@/lib/document-utils'

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; icon: React.ElementType }> = {
  soumise: { label: 'Soumise', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400', icon: Send },
  en_cours: { label: 'En cours', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  pieces_complementaires: { label: 'Pièces complémentaires', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertCircle },
  validee: { label: 'Validée', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Check },
  prete: { label: 'Prête', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  livree: { label: 'Livrée', color: 'bg-[#0B2E58]/10 text-[#0B2E58] dark:bg-[#3B7DD8]/20 dark:text-[#3B7DD8]', icon: Download },
  rejetee: { label: 'Rejetée', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
}

// ─── ANIMATION VARIANTS ─────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

// Birth certificate store is used instead of local BIRTH_RECORDS

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export function MairieDashboardPage() {
  const navigate = useAppStore((s) => s.navigate)
  const user = useAppStore((s) => s.user)
  const { requests, updateRequestStatus, addProcessingNote, advanceTimeline, assignRequest, completeRequest, verifyDocument, setGeneratedDocument, addUploadedDocument } = useCitizenRequestsStore()

  // Filter requests for mairie categories (etat-civil and residence) for THIS specific mairie
  const mairieRequests = requests.filter(r => {
    // Only show etat-civil and residence requests for mairies
    if (r.categoryId !== 'etat-civil' && r.categoryId !== 'residence') return false
    // If user has a mairie, only show requests for that mairie
    if (user?.mairie) {
      return r.mairie === user.mairie || (!r.mairie && r.assignedService === 'Mairie / Commune')
    }
    return true
  })

  const [activeTab, setActiveTab] = useState('pipeline')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<CitizenRequest | null>(null)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false)
  const [deliveryMode, setDeliveryMode] = useState<'en_ligne' | 'guichet' | 'courrier'>('guichet')
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [generateDocDialogOpen, setGenerateDocDialogOpen] = useState(false)
  const [successToast, setSuccessToast] = useState('')

  // Birth certificate search
  const birthStore = useBirthCertificateStore()
  const [birthSearch, setBirthSearch] = useState('')
  const [birthResults, setBirthResults] = useState<BirthRecord[]>([])
  const [birthSearched, setBirthSearched] = useState(false)

  // Quick verification
  const [quickVerifyName, setQuickVerifyName] = useState('')
  const [quickVerifyDate, setQuickVerifyDate] = useState('')
  const [quickVerifyResult, setQuickVerifyResult] = useState<BirthRecord | null>(null)
  const [quickVerifyNotFound, setQuickVerifyNotFound] = useState(false)
  const [quickVerifySearched, setQuickVerifySearched] = useState(false)

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  // Stats for mairie
  const stats = [
    { label: 'Demandes reçues', value: mairieRequests.filter(r => r.status === 'soumise').length, icon: Send, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20', gradient: 'from-sky-500 to-sky-600' },
    { label: 'En traitement', value: mairieRequests.filter(r => ['en_cours', 'pieces_complementaires'].includes(r.status)).length, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', gradient: 'from-amber-500 to-amber-600' },
    { label: 'Documents prêts', value: mairieRequests.filter(r => r.status === 'prete').length, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', gradient: 'from-emerald-500 to-emerald-600' },
    { label: 'Livrées ce mois', value: mairieRequests.filter(r => r.status === 'livree').length, icon: Download, color: 'text-[#0B2E58] dark:text-[#3B7DD8]', bg: 'bg-[#0B2E58]/5 dark:bg-[#3B7DD8]/10', gradient: 'from-[#0B2E58] to-[#3B7DD8]' },
  ]

  // Pipeline counters
  const pipeline = [
    { status: 'soumise', label: 'Soumises', count: mairieRequests.filter(r => r.status === 'soumise').length, color: 'bg-sky-500', gradient: 'from-sky-400 to-sky-600' },
    { status: 'en_cours', label: 'En cours', count: mairieRequests.filter(r => r.status === 'en_cours').length, color: 'bg-amber-500', gradient: 'from-amber-400 to-amber-600' },
    { status: 'pieces_complementaires', label: 'Pièces à compléter', count: mairieRequests.filter(r => r.status === 'pieces_complementaires').length, color: 'bg-orange-500', gradient: 'from-orange-400 to-orange-600' },
    { status: 'validee', label: 'Validées', count: mairieRequests.filter(r => r.status === 'validee').length, color: 'bg-blue-500', gradient: 'from-blue-400 to-blue-600' },
    { status: 'prete', label: 'Prêtes', count: mairieRequests.filter(r => r.status === 'prete').length, color: 'bg-emerald-500', gradient: 'from-emerald-400 to-emerald-600' },
    { status: 'livree', label: 'Livrées', count: mairieRequests.filter(r => r.status === 'livree').length, color: 'bg-[#0B2E58]', gradient: 'from-[#0B2E58] to-[#3B7DD8]' },
    { status: 'rejetee', label: 'Rejetées', count: mairieRequests.filter(r => r.status === 'rejetee').length, color: 'bg-red-500', gradient: 'from-red-400 to-red-600' },
  ]

  const handleTakeCharge = (req: CitizenRequest) => {
    updateRequestStatus(req.id, 'en_cours', 'Demande prise en charge par la Mairie')
    advanceTimeline(req.id)
    assignRequest(req.id, user?.name || 'Agent de Mairie')
    setSuccessToast(`Demande ${req.reference} prise en charge`)
    refreshSelected(req.id)
  }

  const handleValidate = (req: CitizenRequest) => {
    updateRequestStatus(req.id, 'validee', 'Demande validée par la Mairie')
    advanceTimeline(req.id)
    advanceTimeline(req.id)
    setSuccessToast(`Demande ${req.reference} validée`)
    refreshSelected(req.id)
  }

  const handleMarkReady = (req: CitizenRequest) => {
    updateRequestStatus(req.id, 'prete', 'Document prêt pour le retrait')
    advanceTimeline(req.id)
    setSuccessToast(`Document ${req.reference} prêt`)
    refreshSelected(req.id)
  }

  const handleDeliver = () => {
    if (!selectedRequest) return
    const location = deliveryMode === 'guichet' ? (deliveryLocation || user?.mairie || 'Mairie') : undefined
    completeRequest(selectedRequest.id, deliveryMode, location)
    setDeliveryDialogOpen(false)
    setSuccessToast(`Document ${selectedRequest.reference} livré avec succès`)
    refreshSelected(selectedRequest.id)
  }

  const handleAddNote = () => {
    if (!selectedRequest || !noteText.trim()) return
    addProcessingNote(selectedRequest.id, {
      author: user?.name || 'Agent de Mairie',
      authorRole: 'Agent',
      text: noteText,
      type: 'note',
    })
    setNoteDialogOpen(false)
    setNoteText('')
    setSuccessToast('Note ajoutée')
    refreshSelected(selectedRequest.id)
  }

  const refreshSelected = (id: string) => {
    const updated = requests.find(r => r.id === id)
    if (updated) setSelectedRequest(updated)
  }

  const handleVerifyDocument = (requestId: string, docId: string) => {
    verifyDocument(requestId, docId)
    setSuccessToast('Document vérifié avec succès')
    if (selectedRequest) refreshSelected(selectedRequest.id)
  }

  const handleGenerateDocument = () => {
    if (!selectedRequest) return
    const doc = createGeneratedDocument(selectedRequest, user?.name || selectedRequest.assignedAgent || 'Agent de Mairie')
    setGeneratedDocument(selectedRequest.id, doc)
    updateRequestStatus(selectedRequest.id, 'prete', 'Document officiel généré et prêt pour le retrait')
    advanceTimeline(selectedRequest.id)
    setGenerateDocDialogOpen(false)
    setSuccessToast(`Document officiel généré pour ${selectedRequest.reference}`)
    refreshSelected(selectedRequest.id)
  }

  const handleDownloadDocument = () => {
    if (!selectedRequest) return
    downloadCitizenDocument(selectedRequest, selectedRequest.assignedAgent)
    setSuccessToast(`Document ${selectedRequest.reference} téléchargé`)
  }

  const handleAddDocumentToRequest = async (file: File, requestId: string) => {
    try {
      const doc = await processFile(file, 'Document complémentaire')
      addUploadedDocument(requestId, doc)
      setSuccessToast('Document ajouté avec succès')
      if (selectedRequest) refreshSelected(selectedRequest.id)
    } catch (err: any) {
      setSuccessToast(err.message)
    }
  }

  const handleBirthSearch = () => {
    setBirthSearched(true)
    if (!birthSearch.trim()) {
      setBirthResults([])
      return
    }
    const results = birthStore.searchRecords(birthSearch)
    setBirthResults(results)
  }

  const handleQuickVerify = () => {
    setQuickVerifySearched(true)
    setQuickVerifyResult(null)
    setQuickVerifyNotFound(false)
    if (!quickVerifyName.trim()) return
    const q = quickVerifyName.toLowerCase().trim()
    const results = birthStore.records.filter(r =>
      `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
      r.lastName.toLowerCase().includes(q) ||
      r.firstName.toLowerCase().includes(q)
    )
    if (quickVerifyDate) {
      const dateMatch = results.filter(r => r.birthDate === quickVerifyDate)
      if (dateMatch.length > 0) {
        setQuickVerifyResult(dateMatch[0])
      } else if (results.length > 0) {
        setQuickVerifyResult(results[0])
      } else {
        setQuickVerifyNotFound(true)
      }
    } else {
      if (results.length > 0) {
        setQuickVerifyResult(results[0])
      } else {
        setQuickVerifyNotFound(true)
      }
    }
  }

  const filteredRequests = mairieRequests.filter(r => {
    const matchSearch = !searchQuery ||
      r.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.citizenName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.citizenFirstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.serviceName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchSearch
  })

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-4 md:p-6"
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          HEADER — MAIRIE DE KALOUM
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="glass-premium overflow-hidden border-[#C8A45C]/20 dark:border-[#D4B878]/20 bg-gradient-to-br from-[#0B2E58] via-[#134A8E] to-[#0B2E58] dark:from-[#0B2E58] dark:via-[#071D3A] dark:to-[#0B2E58] shadow-premium-lg">
          <CardContent className="p-6 text-white relative overflow-hidden">
            {/* Premium inner glow overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-white/[0.02] pointer-events-none" />

            {/* Guinea tricolor with gradient fade */}
            <div className="flex gap-0 mb-4 -mx-6 -mt-6">
              <div className="flex-1 h-2 bg-gradient-to-r from-[#CE1126] to-[#CE1126]/60" />
              <div className="flex-1 h-2 bg-gradient-to-r from-[#FCD116]/60 to-[#FCD116]" />
              <div className="flex-1 h-2 bg-gradient-to-r from-[#009460] to-[#009460]/60" />
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 relative z-10">
              {/* Icon container with gold ring + glow */}
              <div className="relative">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[#C8A45C]/40 to-[#D4B878]/20 blur-sm" />
                <div className="relative flex size-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-[#C8A45C]/30 shadow-lg">
                  <Building2 className="size-7 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.2em] text-[#C8A45C]/80 font-semibold">République de Guinée</p>
                <h2 className="text-2xl font-bold mt-0.5 text-gradient-gold">{user?.mairie || 'Mairie de Kaloum'}</h2>
                <p className="text-sm text-white/70 mt-1">
                  Tableau de bord — État Civil & Résidence • {user?.name || 'Agent de Mairie'}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Badge className="badge-premium bg-[#C8A45C] text-[#0B2E58] hover:bg-[#C8A45C]/90 border-0 font-semibold text-xs gap-1.5 shadow-gold">
                  <Building2 className="size-3" />
                  Agent de Mairie
                </Badge>
                <Badge className="badge-premium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs gap-1.5">
                  <CheckCircle2 className="size-3" />
                  {mairieRequests.length} demande(s) mairie
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          STATS
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="card-interactive overflow-hidden group">
              <CardContent className="flex items-center gap-3 p-4 relative">
                {/* Top gradient accent line */}
                <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${stat.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.gradient} bg-opacity-10 shadow-sm`}>
                  <stat.icon className="size-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold tabular-nums tracking-tight text-[#0B2E58] dark:text-white premium-stat">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          PIPELINE VISUAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="card-premium overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white flex items-center gap-2">
              <ClipboardCheck className="size-4 text-[#C8A45C]" />
              Pipeline de traitement — État Civil & Résidence
            </CardTitle>
            <CardDescription className="text-xs">Vue d&apos;ensemble du flux de demandes assignées à votre mairie</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {pipeline.map((step, i) => (
                <div key={step.status} className="flex items-center">
                  <div className="flex flex-col items-center min-w-[80px]">
                    {/* Pipeline step circle with gradient background and glow */}
                    <div className="relative">
                      {step.count > 0 && (
                        <div className={`absolute -inset-1.5 rounded-full bg-gradient-to-br ${step.gradient} opacity-20 blur-md`} />
                      )}
                      <div className={`relative w-12 h-12 rounded-full bg-gradient-to-br ${step.gradient} text-white flex items-center justify-center font-bold text-lg shadow-md`}>
                        {step.count}
                      </div>
                    </div>
                    <p className="text-[10px] font-medium text-muted-foreground mt-1.5 text-center">{step.label}</p>
                  </div>
                  {i < pipeline.length - 1 && (
                    <div className="flex items-center mx-1 shrink-0">
                      <div className="w-4 h-[2px] bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/10 rounded-full" />
                      <ArrowRight className="size-3 text-muted-foreground/40 shrink-0" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Progress bar with gradient fill */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Taux de traitement</span>
                <span className="font-semibold tabular-nums tracking-tight">
                  {mairieRequests.length > 0
                    ? Math.round((mairieRequests.filter(r => ['validee', 'prete', 'livree'].includes(r.status)).length / mairieRequests.length) * 100)
                    : 0}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0B2E58] via-[#3B7DD8] to-[#C8A45C] transition-all duration-700 ease-out"
                  style={{ width: `${mairieRequests.length > 0 ? (mairieRequests.filter(r => ['validee', 'prete', 'livree'].includes(r.status)).length / mairieRequests.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TABS: REQUESTS + BIRTH CERTIFICATE DB
      ═══════════════════════════════════════════════════════════════════════ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto h-auto flex-wrap gap-1 bg-muted/50 p-1.5 shadow-sm">
          <TabsTrigger value="pipeline" className="gap-1.5 text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0B2E58] data-[state=active]:to-[#134A8E] data-[state=active]:text-white data-[state=active]:shadow-md">
            <FileText className="size-4" />
            Demandes ({mairieRequests.length})
          </TabsTrigger>
          <TabsTrigger value="birth-db" className="gap-1.5 text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0B2E58] data-[state=active]:to-[#134A8E] data-[state=active]:text-white data-[state=active]:shadow-md">
            <Database className="size-4" />
            Base État Civil
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════
            DEMANDES CITOYENNES
        ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="pipeline">
          <div className="mt-4">
            {/* Quick actions with premium styling */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Demandes à traiter', icon: Send, color: 'bg-gradient-to-br from-sky-500 to-sky-700 hover:from-sky-600 hover:to-sky-800 text-white', count: mairieRequests.filter(r => r.status === 'soumise').length },
                { label: 'En cours', icon: Clock, color: 'bg-gradient-to-br from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white', count: mairieRequests.filter(r => ['en_cours', 'pieces_complementaires'].includes(r.status)).length },
                { label: 'Documents prêts', icon: CheckCircle2, color: 'bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white', count: mairieRequests.filter(r => r.status === 'prete').length },
                { label: 'Tout voir', icon: FileText, color: 'bg-gradient-to-br from-[#0B2E58] to-[#134A8E] hover:from-[#0B2E58]/90 hover:to-[#134A8E]/90 text-white dark:from-[#3B7DD8] dark:to-[#5A96E6] dark:hover:from-[#3B7DD8]/90 dark:hover:to-[#5A96E6]/90', count: mairieRequests.length },
              ].map(action => (
                <Button key={action.label} className={`${action.color} h-auto flex-col gap-1.5 rounded-xl py-3 text-xs font-semibold shadow-md transition-all hover:scale-[1.02] hover:shadow-lg`} onClick={() => {}}>
                  <action.icon className="size-4" />
                  {action.label}
                  <span className="text-[10px] opacity-70">({action.count})</span>
                </Button>
              ))}
            </div>

            {/* Search with glass input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par référence, nom, service..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 glass-input focus-ring-premium"
              />
            </div>

            {/* Main content: List + Detail */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Request List */}
              <div className="lg:col-span-2 space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredRequests.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Card className="glass-premium">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                          <FileText className="size-12 text-muted-foreground/30 mb-3" />
                          <p className="text-muted-foreground font-medium">Aucune demande pour votre mairie</p>
                          <p className="text-xs text-muted-foreground mt-1">Les nouvelles demandes en État Civil et Résidence apparaîtront ici</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ) : (
                    filteredRequests.map((req, i) => {
                      const sConfig = STATUS_CONFIG[req.status]
                      const SIcon = sConfig.icon
                      return (
                        <motion.div
                          key={req.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: i * 0.03 }}
                          layout
                        >
                          <Card
                            className={`card-interactive overflow-hidden ${selectedRequest?.id === req.id ? 'ring-2 ring-[#0B2E58] dark:ring-[#3B7DD8] border-[#C8A45C]/30 shadow-gold' : ''}`}
                            onClick={() => setSelectedRequest(req)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  {/* Refined avatar with ring */}
                                  <div className="relative">
                                    <Avatar className="size-10 ring-2 ring-white/50 dark:ring-white/10">
                                      <AvatarFallback className={`${sConfig.color} text-xs font-bold`}>
                                        {req.citizenFirstName[0]}{req.citizenName[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-sm">{req.citizenFirstName} {req.citizenName}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{req.reference}</p>
                                  </div>
                                </div>
                                {/* Status badge with glass effect */}
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium backdrop-blur-sm ${sConfig.color} border border-current/10`}>
                                  <SIcon className="size-3" />
                                  {sConfig.label}
                                </span>
                              </div>
                              <div className="ml-13 pl-13 space-y-1">
                                <p className="text-sm font-medium">{req.serviceName}</p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1"><Calendar className="size-3" />{new Date(req.createdAt).toLocaleDateString('fr-FR')}</span>
                                  {req.assignedAgent && <span className="flex items-center gap-1"><User className="size-3" />{req.assignedAgent}</span>}
                                </div>
                              </div>
                              {/* Quick action for soumises with premium styling */}
                              {req.status === 'soumise' && (
                                <div className="mt-3 flex gap-2">
                                  <Button size="sm" className="btn-premium gap-1 h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleTakeCharge(req) }}>
                                    <Play className="size-3" />
                                    Prendre en charge
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      )
                    })
                  )}
                </AnimatePresence>
              </div>

              {/* Detail Panel */}
              <div className="lg:col-span-1">
                {selectedRequest ? (
                  <motion.div key={selectedRequest.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <Card className="glass-premium sticky top-24 shadow-premium">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Badge className={`badge-premium text-[10px] font-semibold ${STATUS_CONFIG[selectedRequest.status].color}`}>
                            {STATUS_CONFIG[selectedRequest.status].label}
                          </Badge>
                        </div>
                        <CardTitle className="text-base">{selectedRequest.serviceName}</CardTitle>
                        <CardDescription className="text-xs font-mono">{selectedRequest.reference}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Citizen info with glass effect */}
                        <div className="p-3 rounded-lg bg-gradient-to-br from-muted/40 to-muted/20 backdrop-blur-sm space-y-2 border border-muted/50">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informations du citoyen</h4>
                          <div className="grid grid-cols-1 gap-1.5 text-xs">
                            <div className="flex items-center gap-2"><User className="size-3 text-[#C8A45C]" /><span className="font-medium">{selectedRequest.citizenFirstName} {selectedRequest.citizenName}</span></div>
                            <div className="flex items-center gap-2"><Hash className="size-3 text-[#C8A45C]" />NIN : {selectedRequest.citizenNIN}</div>
                            <div className="flex items-center gap-2"><Phone className="size-3 text-[#C8A45C]" />{selectedRequest.citizenPhone}</div>
                            <div className="flex items-center gap-2"><MapPin className="size-3 text-[#C8A45C]" />{selectedRequest.citizenAddress}</div>
                          </div>
                        </div>

                        {/* Required documents */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Paperclip className="size-3.5 text-[#C8A45C]" />
                            Pièces justificatives ({selectedRequest.uploadedDocuments?.length ?? 0} / {selectedRequest.documents?.length ?? 0})
                          </h4>
                          <div className="space-y-1.5">
                            {(selectedRequest.documents ?? []).map((docName, i) => {
                              const uploaded = (selectedRequest.uploadedDocuments ?? []).find(d => d.requiredDocName === docName)
                              return (
                                <div key={i} className={`flex items-center justify-between p-2 rounded-lg text-xs border backdrop-blur-sm ${uploaded ? (uploaded.verified ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-900/10' : 'border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/10') : 'border-dashed border-muted-foreground/30 bg-muted/20'}`}>
                                  <div className="flex items-center gap-2 min-w-0">
                                    {uploaded ? (
                                      <>
                                        <span className={`text-[8px] font-bold ${getFileTypeIcon(uploaded.type).color}`}>{getFileTypeIcon(uploaded.type).icon}</span>
                                        <div className="min-w-0">
                                          <p className="font-medium truncate">{docName}</p>
                                          <p className="text-[10px] text-muted-foreground">{uploaded.name} ({formatFileSize(uploaded.size)})</p>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <Paperclip className="size-3 text-muted-foreground" />
                                        <span className="text-muted-foreground">{docName}</span>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {uploaded ? (
                                      <>
                                        {uploaded.verified ? (
                                          <Badge className="text-[8px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 gap-0.5 px-1.5">
                                            <FileCheck className="size-2.5" /> Vérifié
                                          </Badge>
                                        ) : (
                                          <Button size="sm" variant="outline" className="h-5 text-[9px] gap-0.5 px-1.5 focus-ring-premium" onClick={() => handleVerifyDocument(selectedRequest.id, uploaded.id)}>
                                            <Check className="size-2.5" /> Vérifier
                                          </Button>
                                        )}
                                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => downloadUploadedFile(uploaded)}>
                                          <Download className="size-3" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <input type="file" accept={ACCEPTED_FILE_TYPES} className="hidden" id={`mairie-upload-${i}`} onChange={async (e) => { if (e.target.files?.[0]) { await handleAddDocumentToRequest(e.target.files[0], selectedRequest.id); e.target.value = '' } }} />
                                        <Button size="sm" variant="outline" className="h-5 text-[9px] gap-0.5 px-1.5 focus-ring-premium" onClick={() => document.getElementById(`mairie-upload-${i}`)?.click()}>
                                          <UploadIcon className="size-2.5" /> Ajouter
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Timeline with refined step indicators */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Avancement</h4>
                          <div className="space-y-0">
                            {selectedRequest.timeline.map((step, i) => (
                              <div key={i} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 ${
                                    step.status === 'completed' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-500 text-white shadow-sm' :
                                    step.status === 'current' ? 'bg-gradient-to-br from-[#0B2E58] to-[#3B7DD8] border-[#3B7DD8] text-white dark:from-[#3B7DD8] dark:to-[#5A96E6] dark:border-[#5A96E6] shadow-sm' :
                                    'bg-background border-muted-foreground/30 text-muted-foreground'
                                  }`}>
                                    {step.status === 'completed' ? <Check className="h-3 w-3" /> : step.status === 'current' ? <Clock className="h-3 w-3" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />}
                                  </div>
                                  {i < selectedRequest.timeline.length - 1 && (
                                    <div className={`w-0.5 h-6 ${step.status === 'completed' ? 'bg-gradient-to-b from-emerald-300 to-emerald-200 dark:from-emerald-700 dark:to-emerald-800' : 'bg-muted-foreground/20'}`} />
                                  )}
                                </div>
                                <div className="pb-2">
                                  <p className={`text-xs font-medium ${step.status === 'pending' ? 'text-muted-foreground' : ''}`}>{step.label}</p>
                                  {step.date && <p className="text-[10px] text-muted-foreground">{new Date(step.date).toLocaleDateString('fr-FR')}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Processing notes */}
                        {selectedRequest.processingNotes.length > 0 && (
                          <>
                            <div className="divider-premium" />
                            <div>
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes ({selectedRequest.processingNotes.length})</h4>
                              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {selectedRequest.processingNotes.map((note, i) => (
                                  <div key={i} className={`p-2 rounded-lg text-xs border backdrop-blur-sm ${
                                    note.type === 'info_complementaire' ? 'bg-orange-50/80 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/40' :
                                    note.type === 'decision' ? 'bg-blue-50/80 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/40' :
                                    'bg-muted/40 border-muted/50'
                                  }`}>
                                    <div className="flex items-center justify-between mb-0.5">
                                      <span className="font-medium">{note.author}</span>
                                      <span className="text-[9px] text-muted-foreground">{new Date(note.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                                    </div>
                                    <p className="text-muted-foreground">{note.text}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        {/* Action buttons with premium styling */}
                        <div className="divider-premium" />
                        <div className="flex flex-wrap gap-2">
                          {selectedRequest.status === 'soumise' && (
                            <Button size="sm" className="flex-1 btn-premium gap-1" onClick={() => handleTakeCharge(selectedRequest)}>
                              <Play className="size-3.5" />
                              Prendre en charge
                            </Button>
                          )}
                          {(selectedRequest.status === 'en_cours' || selectedRequest.status === 'pieces_complementaires') && (
                            <Button size="sm" className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white gap-1 shadow-md" onClick={() => handleValidate(selectedRequest)}>
                              <Check className="size-3.5" />
                              Valider
                            </Button>
                          )}
                          {selectedRequest.status === 'validee' && (
                            <Button size="sm" className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white gap-1 shadow-md" onClick={() => setGenerateDocDialogOpen(true)}>
                              <Stamp className="size-3.5" />
                              Générer le document
                            </Button>
                          )}
                          {selectedRequest.status === 'prete' && (
                            <Button size="sm" className="flex-1 btn-premium gap-1" onClick={() => setDeliveryDialogOpen(true)}>
                              <Download className="size-3.5" />
                              Livrer
                            </Button>
                          )}
                          {selectedRequest.status !== 'livree' && selectedRequest.status !== 'rejetee' && (
                            <Button size="sm" variant="outline" className="gap-1 focus-ring-premium" onClick={() => setNoteDialogOpen(true)}>
                              <MessageSquare className="size-3.5" />
                              Note
                            </Button>
                          )}
                        </div>

                        {/* Generate Official Document */}
                        {selectedRequest.status === 'validee' && (
                          <Button size="sm" className="w-full btn-gold gap-2 font-semibold" onClick={() => setGenerateDocDialogOpen(true)}>
                            <FileText className="size-4" />
                            Générer le document officiel
                          </Button>
                        )}

                        {/* Download Generated Document */}
                        {(selectedRequest.status === 'prete' || selectedRequest.status === 'livree') && selectedRequest.generatedDocument && (
                          <div className="space-y-2">
                            <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 dark:from-emerald-900/15 dark:to-emerald-900/5 border border-emerald-200/80 dark:border-emerald-800/40 backdrop-blur-sm">
                              <div className="flex items-center gap-2">
                                <FileCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">Document généré le {new Date(selectedRequest.generatedDocument.generatedAt).toLocaleDateString('fr-FR')}</p>
                              </div>
                            </div>
                            <Button size="sm" className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white gap-2 shadow-md" onClick={handleDownloadDocument}>
                              <Download className="size-4" />
                              Télécharger le document
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <Card className="glass-premium">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <Building2 className="size-12 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">Sélectionnez une demande</p>
                      <p className="text-xs text-muted-foreground mt-1">Pour voir les détails et la traiter</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            BASE ÉTAT CIVIL — BIRTH CERTIFICATE DATABASE + QUICK VERIFY
        ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="birth-db">
          <div className="mt-4 space-y-4">
            {/* Quick verification card with premium styling */}
            <Card className="card-premium overflow-hidden">
              <div className="h-[2px] bg-gradient-to-r from-emerald-500 via-emerald-400 to-[#C8A45C]" />
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm">
                    <Shield className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Vérification rapide d&apos;identité</CardTitle>
                    <CardDescription>Recherchez un citoyen par nom et date de naissance dans la base des actes</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs font-medium">Nom / Prénom</Label>
                    <Input
                      placeholder="Ex: Diallo Aminata"
                      value={quickVerifyName}
                      onChange={e => { setQuickVerifyName(e.target.value); setQuickVerifySearched(false) }}
                      onKeyDown={e => e.key === 'Enter' && handleQuickVerify()}
                      className="glass-input focus-ring-premium"
                    />
                  </div>
                  <div className="sm:w-48 space-y-1.5">
                    <Label className="text-xs font-medium">Date de naissance</Label>
                    <Input
                      type="date"
                      value={quickVerifyDate}
                      onChange={e => { setQuickVerifyDate(e.target.value); setQuickVerifySearched(false) }}
                      className="glass-input focus-ring-premium"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleQuickVerify} className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white gap-2 shadow-md">
                      <Shield className="size-4" />
                      Vérifier
                    </Button>
                  </div>
                </div>

                {quickVerifySearched && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    {quickVerifyNotFound ? (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-red-50/80 to-red-100/40 dark:from-red-900/10 dark:to-red-900/5 border border-red-200 dark:border-red-800/40 backdrop-blur-sm">
                        <XCircle className="size-5 text-red-500 shrink-0" />
                        <div>
                          <p className="font-medium text-red-700 dark:text-red-400 text-sm">Aucun enregistrement trouvé</p>
                          <p className="text-xs text-red-600/70 dark:text-red-400/70">Vérifiez les informations ou consultez la base complète</p>
                        </div>
                      </div>
                    ) : quickVerifyResult ? (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-emerald-50/80 to-emerald-100/40 dark:from-emerald-900/10 dark:to-emerald-900/5 border border-emerald-200 dark:border-emerald-800/40 backdrop-blur-sm">
                        <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-emerald-700 dark:text-emerald-400 text-sm">{quickVerifyResult.firstName} {quickVerifyResult.lastName}</p>
                          <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                            Né(e) le {quickVerifyResult.birthDate} à {quickVerifyResult.birthPlace} — Acte N° {quickVerifyResult.acteNumber} — {quickVerifyResult.commune}
                          </p>
                        </div>
                        <Badge className={`badge-premium text-[10px] shrink-0 ${quickVerifyResult.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : quickVerifyResult.status === 'corrected' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {quickVerifyResult.status === 'active' ? 'Actif' : quickVerifyResult.status === 'corrected' ? 'Corrigé' : 'Annulé'}
                        </Badge>
                      </div>
                    ) : null}
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Search + Results with premium styling */}
            <Card className="card-premium overflow-hidden">
              <div className="h-[2px] bg-gradient-to-r from-[#0B2E58] via-[#3B7DD8] to-[#C8A45C]" />
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#0B2E58] to-[#3B7DD8] text-white shadow-sm">
                    <Database className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Base de données État Civil</CardTitle>
                    <CardDescription>Recherchez et vérifiez les actes d&apos;état civil dans la base nationale</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par nom, numéro d'acte, lieu..."
                      value={birthSearch}
                      onChange={e => { setBirthSearch(e.target.value); setBirthSearched(false) }}
                      className="pl-10 glass-input focus-ring-premium"
                      onKeyDown={e => e.key === 'Enter' && handleBirthSearch()}
                    />
                  </div>
                  <Button onClick={handleBirthSearch} className="btn-premium gap-2">
                    <Search className="size-4" />
                    Rechercher
                  </Button>
                </div>

                {birthSearched && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    {birthResults.length === 0 ? (
                      <div className="text-center py-12">
                        <AlertCircle className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium">Aucun enregistrement trouvé</p>
                        <p className="text-xs text-muted-foreground mt-1">Vérifiez le nom ou le numéro d&apos;acte</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">{birthResults.length} résultat(s) trouvé(s)</p>
                        {birthResults.map((record) => (
                          <Card key={record.id} className="card-interactive overflow-hidden border-[#3B7DD8]/20 dark:border-[#3B7DD8]/10">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-gradient-to-br from-[#0B2E58] to-[#3B7DD8] text-white shadow-sm">
                                    <Baby className="size-5" />
                                  </div>
                                  <div>
                                    <p className="font-semibold">{record.firstName} {record.lastName}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{record.acteNumber}</p>
                                  </div>
                                </div>
                                <Badge className={`badge-premium text-[10px] ${record.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : record.status === 'corrected' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                  {record.status === 'active' ? 'Actif' : record.status === 'corrected' ? 'Corrigé' : 'Annulé'}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                                <div>
                                  <p className="text-muted-foreground">Date de naissance</p>
                                  <p className="font-medium">{record.birthDate}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Lieu de naissance</p>
                                  <p className="font-medium">{record.birthPlace}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Commune</p>
                                  <p className="font-medium">{record.commune}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Père</p>
                                  <p className="font-medium">{record.fatherName}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Mère</p>
                                  <p className="font-medium">{record.motherName}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Région</p>
                                  <p className="font-medium">{record.region}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {!birthSearched && (
                  <div className="text-center py-8">
                    <Database className="size-16 text-muted-foreground/15 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">Entrez un nom ou numéro d&apos;acte pour rechercher</p>
                    <p className="text-xs text-muted-foreground mt-1">Base de données de la Mairie — {user?.mairie || 'Mairie de Kaloum'}</p>
                  </div>
                )}

                {/* Link to full database page */}
                <div className="pt-2 divider-premium" />
                <Button
                  variant="outline"
                  className="w-full gap-2 text-[#0B2E58] dark:text-[#3B7DD8] border-[#0B2E58]/20 dark:border-[#3B7DD8]/20 hover:bg-[#0B2E58]/5 dark:hover:bg-[#3B7DD8]/5 focus-ring-premium transition-all hover:scale-[1.01]"
                  onClick={() => navigate('birth-certificate-db')}
                >
                  <BookOpen className="size-4" />
                  Ouvrir la base complète des actes de naissance
                  <ArrowRight className="size-4 ml-auto" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════════════
          QUICK NAVIGATION
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="glass-premium overflow-hidden border-[#C8A45C]/20 dark:border-[#D4B878]/20 bg-gradient-to-r from-[#0B2E58]/[0.02] to-[#C8A45C]/[0.02] dark:from-[#3B7DD8]/[0.05] dark:to-[#D4B878]/[0.03]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white flex items-center gap-2">
              <ArrowRight className="size-4 text-[#C8A45C]" />
              Actions rapides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'GED Documents', icon: FileText, color: 'bg-gradient-to-br from-[#0B2E58] to-[#134A8E] hover:from-[#0B2E58]/90 hover:to-[#134A8E]/90 text-white', onClick: () => navigate('ged') },
                { label: 'Courriers', icon: Mail, color: 'bg-gradient-to-br from-[#3B7DD8] to-[#5A96E6] hover:from-[#3B7DD8]/90 hover:to-[#5A96E6]/90 text-white', onClick: () => navigate('courriers') },
                { label: 'Paramètres', icon: Building2, color: 'btn-gold', onClick: () => navigate('settings') },
                { label: 'Toutes les demandes', icon: ClipboardCheck, color: 'bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white', onClick: () => navigate('service-requests') },
              ].map(action => (
                <Button key={action.label} className={`${action.color} h-auto flex-col gap-2 rounded-xl py-3 text-xs font-semibold shadow-md transition-all hover:scale-[1.02] hover:shadow-lg`} onClick={action.onClick}>
                  <action.icon className="size-4" />
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Generate Document Dialog */}
      <Dialog open={generateDocDialogOpen} onOpenChange={setGenerateDocDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5 text-gradient-gold" />
              Générer le document officiel
            </DialogTitle>
            <DialogDescription>Générez le document officiel pour cette demande</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-gradient-to-br from-muted/40 to-muted/20 text-sm border border-muted/50">
                <p><strong>Référence :</strong> <span className="font-mono">{selectedRequest.reference}</span></p>
                <p><strong>Service :</strong> {selectedRequest.serviceName}</p>
                <p><strong>Citoyen :</strong> {selectedRequest.citizenFirstName} {selectedRequest.citizenName}</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-r from-amber-50/80 to-amber-100/40 dark:from-amber-900/10 dark:to-amber-900/5 border border-amber-200 dark:border-amber-800/40 backdrop-blur-sm">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  En confirmant, le document officiel sera généré et la demande passera au statut &quot;Document prêt&quot;.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDocDialogOpen(false)} className="focus-ring-premium">Annuler</Button>
            <Button className="btn-gold gap-2 font-semibold" onClick={handleGenerateDocument}>
              <FileText className="size-4" />
              Confirmer la génération
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="size-5 text-[#C8A45C]" />
              Ajouter une note
            </DialogTitle>
            <DialogDescription>Ajoutez une note au dossier de traitement</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea placeholder="Rédigez votre note..." value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} className="glass-input focus-ring-premium" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)} className="focus-ring-premium">Annuler</Button>
            <Button className="btn-premium" onClick={handleAddNote} disabled={!noteText.trim()}>
              Publier la note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery Dialog */}
      <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="size-5 text-emerald-600" />
              Livrer le document
            </DialogTitle>
            <DialogDescription>Confirmez la livraison du document au citoyen</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-gradient-to-br from-muted/40 to-muted/20 text-sm border border-muted/50">
                <p><strong>Référence :</strong> <span className="font-mono">{selectedRequest.reference}</span></p>
                <p><strong>Service :</strong> {selectedRequest.serviceName}</p>
                <p><strong>Citoyen :</strong> {selectedRequest.citizenFirstName} {selectedRequest.citizenName}</p>
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Mode de livraison</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: 'guichet' as const, label: 'Au guichet', icon: Building2 },
                    { value: 'en_ligne' as const, label: 'En ligne', icon: Download },
                    { value: 'courrier' as const, label: 'Par courrier', icon: Mail },
                  ].map(option => (
                    <div
                      key={option.value}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all text-center ${
                        deliveryMode === option.value ? 'border-[#C8A45C] dark:border-[#D4B878] bg-gradient-to-br from-[#0B2E58]/5 to-[#C8A45C]/5 dark:from-[#3B7DD8]/10 dark:to-[#D4B878]/10 shadow-sm' : 'border-muted hover:border-muted-foreground/30'
                      }`}
                      onClick={() => setDeliveryMode(option.value)}
                    >
                      <option.icon className={`size-5 mx-auto mb-1 ${deliveryMode === option.value ? 'text-[#0B2E58] dark:text-[#3B7DD8]' : 'text-muted-foreground'}`} />
                      <p className="text-xs font-medium">{option.label}</p>
                    </div>
                  ))}
                </div>
                {deliveryMode === 'guichet' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Lieu de retrait</Label>
                    <Input placeholder="Mairie de Kaloum, Bureau d'État Civil..." value={deliveryLocation} onChange={e => setDeliveryLocation(e.target.value)} className="glass-input focus-ring-premium" />
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliveryDialogOpen(false)} className="focus-ring-premium">Annuler</Button>
            <Button className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white gap-2 shadow-md" onClick={handleDeliver}>
              <CheckCircle2 className="size-4" />
              Confirmer la livraison
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Toast */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-[60] flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3 text-white text-sm font-medium shadow-lg backdrop-blur-sm border border-emerald-500/30"
          >
            <CheckCircle2 className="size-4" />
            {successToast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
