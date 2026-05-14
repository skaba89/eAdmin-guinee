'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, FileText, Clock, CheckCircle2, AlertCircle, Search,
  Send, MapPin, Phone, Hash, Calendar, ArrowRight,
  XCircle, Download, Mail, Check, Play,
  IdCard, Globe, Car, Fingerprint,
  ClipboardCheck, User, Database, MessageSquare,
  Paperclip, FileCheck, Upload as UploadIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

// ─── CNI PROCESSING QUEUE DATA ──────────────────────────────────────────────
const CNI_QUEUE = [
  { id: 'CNI-2026-0045', name: 'Condé Ibrahim', type: 'Nouvelle CNI', status: 'En production', submitted: 'Il y a 7 jours', priority: 'normal' },
  { id: 'CNI-2026-0046', name: 'Touré Mariama', type: 'Renouvellement CNI', status: 'En attente biométrie', submitted: 'Il y a 5 jours', priority: 'normal' },
  { id: 'CNI-2026-0047', name: 'Sylla Moussa', type: 'Nouvelle CNI', status: 'Vérification pièces', submitted: 'Il y a 3 jours', priority: 'urgent' },
]

const PASSPORT_QUEUE = [
  { id: 'PAS-2026-0012', name: 'Bah Fatoumata', type: 'Nouveau passeport', status: 'Prêt', submitted: 'Il y a 15 jours', priority: 'normal' },
  { id: 'PAS-2026-0013', name: 'Diallo Alpha', type: 'Renouvellement passeport', status: 'En production', submitted: 'Il y a 8 jours', priority: 'normal' },
  { id: 'PAS-2026-0014', name: 'Camara Aminata', type: 'Nouveau passeport', status: 'Vérification pièces', submitted: 'Il y a 2 jours', priority: 'urgent' },
]

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export function AgenceDashboardPage() {
  const navigate = useAppStore((s) => s.navigate)
  const user = useAppStore((s) => s.user)
  const { requests, updateRequestStatus, addProcessingNote, advanceTimeline, assignRequest, completeRequest, verifyDocument, setGeneratedDocument, addUploadedDocument } = useCitizenRequestsStore()

  // Filter requests for identification category
  const agenceRequests = requests.filter(r => r.categoryId === 'identification')

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

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  // Stats for agence
  const stats = [
    { label: 'Demandes reçues', value: agenceRequests.filter(r => r.status === 'soumise').length, icon: Send, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
    { label: 'En production', value: agenceRequests.filter(r => ['en_cours', 'pieces_complementaires'].includes(r.status)).length, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Documents prêts', value: agenceRequests.filter(r => r.status === 'prete').length, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Livrées ce mois', value: agenceRequests.filter(r => r.status === 'livree').length, icon: Download, color: 'text-[#0B2E58] dark:text-[#3B7DD8]', bg: 'bg-[#0B2E58]/5 dark:bg-[#3B7DD8]/10' },
  ]

  // CNI/Passport specific stats
  const idStats = [
    { label: 'CNI en production', value: CNI_QUEUE.length, icon: IdCard, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Passeports en cours', value: PASSPORT_QUEUE.length, icon: Globe, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Permis de conduire', value: 0, icon: Car, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/20' },
    { label: 'File d\'attente biométrie', value: 2, icon: Fingerprint, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  ]

  // Pipeline counters
  const pipeline = [
    { status: 'soumise', label: 'Soumises', count: agenceRequests.filter(r => r.status === 'soumise').length, color: 'bg-sky-500' },
    { status: 'en_cours', label: 'En production', count: agenceRequests.filter(r => r.status === 'en_cours').length, color: 'bg-amber-500' },
    { status: 'pieces_complementaires', label: 'Pièces à compléter', count: agenceRequests.filter(r => r.status === 'pieces_complementaires').length, color: 'bg-orange-500' },
    { status: 'validee', label: 'Validées', count: agenceRequests.filter(r => r.status === 'validee').length, color: 'bg-blue-500' },
    { status: 'prete', label: 'Prêtes', count: agenceRequests.filter(r => r.status === 'prete').length, color: 'bg-emerald-500' },
    { status: 'livree', label: 'Livrées', count: agenceRequests.filter(r => r.status === 'livree').length, color: 'bg-[#0B2E58]' },
    { status: 'rejetee', label: 'Rejetées', count: agenceRequests.filter(r => r.status === 'rejetee').length, color: 'bg-red-500' },
  ]

  const handleTakeCharge = (req: CitizenRequest) => {
    updateRequestStatus(req.id, 'en_cours', 'Demande prise en charge par l\'ANIP')
    advanceTimeline(req.id)
    assignRequest(req.id, user?.name || 'Agent ANIP')
    setSuccessToast(`Demande ${req.reference} prise en charge`)
    refreshSelected(req.id)
  }

  const handleValidate = (req: CitizenRequest) => {
    updateRequestStatus(req.id, 'validee', 'Demande validée par l\'ANIP')
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
    const location = deliveryMode === 'guichet' ? (deliveryLocation || user?.agence || 'Centre ANIP') : undefined
    completeRequest(selectedRequest.id, deliveryMode, location)
    setDeliveryDialogOpen(false)
    setSuccessToast(`Document ${selectedRequest.reference} livré avec succès`)
    refreshSelected(selectedRequest.id)
  }

  const handleAddNote = () => {
    if (!selectedRequest || !noteText.trim()) return
    addProcessingNote(selectedRequest.id, {
      author: user?.name || 'Agent ANIP',
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
    const doc = createGeneratedDocument(selectedRequest, user?.name || selectedRequest.assignedAgent || 'Agent ANIP')
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

  const filteredRequests = agenceRequests.filter(r => {
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
          HEADER — ANIP
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="glass-card overflow-hidden border-[#C8A45C]/20 dark:border-[#D4B878]/20 bg-gradient-to-br from-[#0B2E58] via-[#0B2E58]/95 to-[#134A8E] dark:from-[#0B2E58] dark:via-[#071D3A] dark:to-[#0B2E58]">
          <CardContent className="p-6 text-white relative">
            {/* Guinea tricolor */}
            <div className="flex gap-0 mb-4 -mx-6 -mt-6">
              <div className="flex-1 h-1.5" style={{ backgroundColor: '#CE1126' }} />
              <div className="flex-1 h-1.5" style={{ backgroundColor: '#FCD116' }} />
              <div className="flex-1 h-1.5" style={{ backgroundColor: '#009460' }} />
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm shadow-xl border border-white/20">
                <Fingerprint className="size-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest text-white/60 font-medium">République de Guinée</p>
                <h2 className="text-2xl font-bold mt-0.5">{user?.institution || "Agence Nationale d'Identification (ANIP)"}</h2>
                <p className="text-sm text-white/70 mt-1">
                  Tableau de bord — Identification & Passeports • {user?.name || 'Agent ANIP'}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Badge className="bg-[#C8A45C] text-[#0B2E58] hover:bg-[#C8A45C]/90 border-0 font-semibold text-xs gap-1.5 shadow-sm">
                  <IdCard className="size-3" />
                  Agent d&apos;Agence
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs gap-1.5">
                  <CheckCircle2 className="size-3" />
                  {agenceRequests.length} demande(s) identification
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
            <Card key={stat.label} className="shadow-sm border-[#0B2E58]/5 dark:border-[#3B7DD8]/10">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="size-5" />
                </div>
                <div>
                  <p className="text-xl font-bold text-[#0B2E58] dark:text-white">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          CNI & PASSPORT SPECIFIC STATS
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white flex items-center gap-2">
              <IdCard className="size-4" />
              File d&apos;attente CNI & Passeports
            </CardTitle>
            <CardDescription className="text-xs">Production et traitement des documents d&apos;identification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {idStats.map((stat) => (
                <div key={stat.label} className={`p-3 rounded-xl ${stat.bg} flex items-center gap-3`}>
                  <stat.icon className={`size-5 ${stat.color}`} />
                  <div>
                    <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CNI Queue */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <IdCard className="size-3.5" /> File CNI
                </h4>
                <div className="space-y-2">
                  {CNI_QUEUE.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border border-muted text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{item.name}</p>
                          {item.priority === 'urgent' && <Badge className="bg-red-100 text-red-700 text-[8px] px-1 py-0">Urgent</Badge>}
                        </div>
                        <p className="text-muted-foreground font-mono text-[10px]">{item.id}</p>
                      </div>
                      <Badge className={`text-[9px] ${item.status === 'Prêt' ? 'bg-emerald-100 text-emerald-700' : item.status === 'En production' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Passport Queue */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Globe className="size-3.5" /> File Passeports
                </h4>
                <div className="space-y-2">
                  {PASSPORT_QUEUE.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border border-muted text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{item.name}</p>
                          {item.priority === 'urgent' && <Badge className="bg-red-100 text-red-700 text-[8px] px-1 py-0">Urgent</Badge>}
                        </div>
                        <p className="text-muted-foreground font-mono text-[10px]">{item.id}</p>
                      </div>
                      <Badge className={`text-[9px] ${item.status === 'Prêt' ? 'bg-emerald-100 text-emerald-700' : item.status === 'En production' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          PIPELINE VISUAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white flex items-center gap-2">
              <ClipboardCheck className="size-4" />
              Pipeline de traitement — Identification
            </CardTitle>
            <CardDescription className="text-xs">Vue d&apos;ensemble du flux de demandes d&apos;identification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {pipeline.map((step, i) => (
                <div key={step.status} className="flex items-center">
                  <div className="flex flex-col items-center min-w-[80px]">
                    <div className={`w-12 h-12 rounded-full ${step.color} text-white flex items-center justify-center font-bold text-lg shadow-md`}>
                      {step.count}
                    </div>
                    <p className="text-[10px] font-medium text-muted-foreground mt-1.5 text-center">{step.label}</p>
                  </div>
                  {i < pipeline.length - 1 && (
                    <ArrowRight className="size-4 text-muted-foreground/40 mx-1 shrink-0" />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Taux de traitement</span>
                <span className="font-semibold">
                  {agenceRequests.length > 0
                    ? Math.round((agenceRequests.filter(r => ['validee', 'prete', 'livree'].includes(r.status)).length / agenceRequests.length) * 100)
                    : 0}%
                </span>
              </div>
              <Progress
                value={agenceRequests.length > 0
                  ? (agenceRequests.filter(r => ['validee', 'prete', 'livree'].includes(r.status)).length / agenceRequests.length) * 100
                  : 0}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          REQUESTS LIST WITH DETAIL PANEL
      ═══════════════════════════════════════════════════════════════════════ */}
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
            Demandes d&apos;identification
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par référence, nom, service..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Request List */}
            <div className="lg:col-span-2 space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredRequests.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Card className="glass-card">
                      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <IdCard className="size-12 text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground font-medium">Aucune demande d&apos;identification</p>
                        <p className="text-xs text-muted-foreground mt-1">Les nouvelles demandes de CNI, passeports et permis apparaîtront ici</p>
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
                          className={`cursor-pointer hover:shadow-lg transition-all ${selectedRequest?.id === req.id ? 'ring-2 ring-[#0B2E58] dark:ring-[#3B7DD8]' : ''}`}
                          onClick={() => setSelectedRequest(req)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <Avatar className="size-10">
                                  <AvatarFallback className={`${sConfig.color} text-xs font-bold`}>
                                    {req.citizenFirstName[0]}{req.citizenName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-semibold text-sm">{req.citizenFirstName} {req.citizenName}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{req.reference}</p>
                                </div>
                              </div>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${sConfig.color}`}>
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
                            {req.status === 'soumise' && (
                              <div className="mt-3 flex gap-2">
                                <Button size="sm" className="bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-[#3B7DD8] dark:hover:bg-[#3B7DD8]/90 text-white gap-1 h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleTakeCharge(req) }}>
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
                  <Card className="glass-card sticky top-24">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] font-semibold ${STATUS_CONFIG[selectedRequest.status].color}`}>
                          {STATUS_CONFIG[selectedRequest.status].label}
                        </Badge>
                      </div>
                      <CardTitle className="text-base">{selectedRequest.serviceName}</CardTitle>
                      <CardDescription className="text-xs font-mono">{selectedRequest.reference}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Citizen info */}
                      <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informations du citoyen</h4>
                        <div className="grid grid-cols-1 gap-1.5 text-xs">
                          <div className="flex items-center gap-2"><User className="size-3 text-muted-foreground" /><span className="font-medium">{selectedRequest.citizenFirstName} {selectedRequest.citizenName}</span></div>
                          <div className="flex items-center gap-2"><Hash className="size-3 text-muted-foreground" />NIN : {selectedRequest.citizenNIN}</div>
                          <div className="flex items-center gap-2"><Phone className="size-3 text-muted-foreground" />{selectedRequest.citizenPhone}</div>
                          <div className="flex items-center gap-2"><MapPin className="size-3 text-muted-foreground" />{selectedRequest.citizenAddress}</div>
                        </div>
                      </div>

                      {/* Required documents */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                          <Paperclip className="size-3.5" />
                          Pièces justificatives ({selectedRequest.uploadedDocuments.length} / {selectedRequest.documents.length})
                        </h4>
                        <div className="space-y-1.5">
                          {selectedRequest.documents.map((docName, i) => {
                            const uploaded = selectedRequest.uploadedDocuments.find(d => d.requiredDocName === docName)
                            return (
                              <div key={i} className={`flex items-center justify-between p-2 rounded-lg text-xs border ${uploaded ? (uploaded.verified ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-900/10' : 'border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/10') : 'border-dashed border-muted-foreground/30 bg-muted/20'}`}>
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
                                        <Button size="sm" variant="outline" className="h-5 text-[9px] gap-0.5 px-1.5" onClick={() => handleVerifyDocument(selectedRequest.id, uploaded.id)}>
                                          <Check className="size-2.5" /> Vérifier
                                        </Button>
                                      )}
                                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => downloadUploadedFile(uploaded)}>
                                        <Download className="size-3" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <input type="file" accept={ACCEPTED_FILE_TYPES} className="hidden" id={`agence-upload-${i}`} onChange={async (e) => { if (e.target.files?.[0]) { await handleAddDocumentToRequest(e.target.files[0], selectedRequest.id); e.target.value = '' } }} />
                                      <Button size="sm" variant="outline" className="h-5 text-[9px] gap-0.5 px-1.5" onClick={() => document.getElementById(`agence-upload-${i}`)?.click()}>
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

                      {/* Timeline */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Avancement</h4>
                        <div className="space-y-0">
                          {selectedRequest.timeline.map((step, i) => (
                            <div key={i} className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 ${
                                  step.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' :
                                  step.status === 'current' ? 'bg-[#0B2E58] border-[#0B2E58] text-white dark:bg-[#3B7DD8] dark:border-[#3B7DD8]' :
                                  'bg-background border-muted-foreground/30 text-muted-foreground'
                                }`}>
                                  {step.status === 'completed' ? <Check className="h-3 w-3" /> : step.status === 'current' ? <Clock className="h-3 w-3" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />}
                                </div>
                                {i < selectedRequest.timeline.length - 1 && <div className={`w-0.5 h-6 ${step.status === 'completed' ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-muted-foreground/20'}`} />}
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
                          <Separator />
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes ({selectedRequest.processingNotes.length})</h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                              {selectedRequest.processingNotes.map((note, i) => (
                                <div key={i} className={`p-2 rounded-lg text-xs border ${
                                  note.type === 'info_complementaire' ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/40' :
                                  note.type === 'decision' ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/40' :
                                  'bg-muted/50 border-muted'
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

                      {/* Action buttons */}
                      <Separator />
                      <div className="flex flex-wrap gap-2">
                        {selectedRequest.status === 'soumise' && (
                          <Button size="sm" className="flex-1 bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-[#3B7DD8] dark:hover:bg-[#3B7DD8]/90 text-white gap-1" onClick={() => handleTakeCharge(selectedRequest)}>
                            <Play className="size-3.5" />
                            Prendre en charge
                          </Button>
                        )}
                        {(selectedRequest.status === 'en_cours' || selectedRequest.status === 'pieces_complementaires') && (
                          <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => handleValidate(selectedRequest)}>
                            <Check className="size-3.5" />
                            Valider
                          </Button>
                        )}
                        {selectedRequest.status === 'validee' && (
                          <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => setGenerateDocDialogOpen(true)}>
                            <FileText className="size-3.5" />
                            Générer le document
                          </Button>
                        )}
                        {selectedRequest.status === 'prete' && (
                          <Button size="sm" className="flex-1 bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-[#3B7DD8] dark:hover:bg-[#3B7DD8]/90 text-white gap-1" onClick={() => setDeliveryDialogOpen(true)}>
                            <Download className="size-3.5" />
                            Livrer
                          </Button>
                        )}
                        {selectedRequest.status !== 'livree' && selectedRequest.status !== 'rejetee' && (
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => setNoteDialogOpen(true)}>
                            <MessageSquare className="size-3.5" />
                            Note
                          </Button>
                        )}
                      </div>

                        {/* Generate Official Document */}
                        {selectedRequest.status === 'validee' && (
                          <Button size="sm" className="w-full bg-[#C8A45C] hover:bg-[#C8A45C]/90 text-[#0B2E58] gap-2 font-semibold" onClick={() => setGenerateDocDialogOpen(true)}>
                            <FileText className="size-4" />
                            Générer le document officiel
                          </Button>
                        )}

                        {/* Download Generated Document */}
                        {(selectedRequest.status === 'prete' || selectedRequest.status === 'livree') && selectedRequest.generatedDocument && (
                          <div className="space-y-2">
                            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/40">
                              <div className="flex items-center gap-2">
                                <FileCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">Document généré le {new Date(selectedRequest.generatedDocument.generatedAt).toLocaleDateString('fr-FR')}</p>
                              </div>
                            </div>
                            <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleDownloadDocument}>
                              <Download className="size-4" />
                              Télécharger le document
                            </Button>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <Card className="glass-card">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Fingerprint className="size-12 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Sélectionnez une demande</p>
                    <p className="text-xs text-muted-foreground mt-1">Pour voir les détails et la traiter</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════
          QUICK NAVIGATION
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-sm border-[#C8A45C]/20 dark:border-[#D4B878]/20 bg-gradient-to-r from-[#0B2E58]/[0.02] to-[#C8A45C]/[0.02] dark:from-[#3B7DD8]/[0.05] dark:to-[#D4B878]/[0.03]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'GED Documents', icon: FileText, color: 'bg-[#0B2E58] hover:bg-[#0B2E58]/90 text-white', onClick: () => navigate('ged') },
                { label: 'Toutes les demandes', icon: ClipboardCheck, color: 'bg-[#3B7DD8] hover:bg-[#3B7DD8]/90 text-white', onClick: () => navigate('service-requests') },
                { label: 'Paramètres', icon: Building2, color: 'bg-[#C8A45C] hover:bg-[#C8A45C]/90 text-[#0B2E58]', onClick: () => navigate('settings') },
                { label: 'Courriers', icon: Mail, color: 'bg-emerald-600 hover:bg-emerald-600/90 text-white', onClick: () => navigate('courriers') },
              ].map(action => (
                <Button key={action.label} className={`${action.color} h-auto flex-col gap-2 rounded-xl py-3 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02]`} onClick={action.onClick}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5 text-[#C8A45C]" />
              Générer le document officiel
            </DialogTitle>
            <DialogDescription>Générez le document officiel pour cette demande</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p><strong>Référence :</strong> <span className="font-mono">{selectedRequest.reference}</span></p>
                <p><strong>Service :</strong> {selectedRequest.serviceName}</p>
                <p><strong>Citoyen :</strong> {selectedRequest.citizenFirstName} {selectedRequest.citizenName}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  En confirmant, le document officiel sera généré et la demande passera au statut "Document prêt".
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDocDialogOpen(false)}>Annuler</Button>
            <Button className="bg-[#C8A45C] hover:bg-[#C8A45C]/90 text-[#0B2E58] gap-2 font-semibold" onClick={handleGenerateDocument}>
              <FileText className="size-4" />
              Confirmer la génération
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une note</DialogTitle>
            <DialogDescription>Ajoutez une note au dossier de traitement</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea placeholder="Rédigez votre note..." value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>Annuler</Button>
            <Button className="bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-[#3B7DD8] dark:hover:bg-[#3B7DD8]/90 text-white" onClick={handleAddNote} disabled={!noteText.trim()}>
              Publier la note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery Dialog */}
      <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="size-5 text-emerald-600" />
              Livrer le document
            </DialogTitle>
            <DialogDescription>Confirmez la livraison du document au citoyen</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p><strong>Référence :</strong> <span className="font-mono">{selectedRequest.reference}</span></p>
                <p><strong>Service :</strong> {selectedRequest.serviceName}</p>
                <p><strong>Citoyen :</strong> {selectedRequest.citizenFirstName} {selectedRequest.citizenName}</p>
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Mode de livraison</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'guichet' as const, label: 'Au guichet', icon: Building2 },
                    { value: 'en_ligne' as const, label: 'En ligne', icon: Download },
                    { value: 'courrier' as const, label: 'Par courrier', icon: Mail },
                  ].map(option => (
                    <div
                      key={option.value}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all text-center ${
                        deliveryMode === option.value ? 'border-[#0B2E58] dark:border-[#3B7DD8] bg-[#0B2E58]/5 dark:bg-[#3B7DD8]/10' : 'border-muted'
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
                    <Input placeholder="Centre ANIP de Conakry..." value={deliveryLocation} onChange={e => setDeliveryLocation(e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliveryDialogOpen(false)}>Annuler</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleDeliver}>
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
            className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-white text-sm font-medium shadow-lg"
          >
            <CheckCircle2 className="size-4" />
            {successToast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
