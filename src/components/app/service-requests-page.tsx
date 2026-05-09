'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Clock, CheckCircle2, AlertCircle, Search, Filter,
  Building2, User, Send, Eye, MoreHorizontal, ChevronDown,
  Shield, MessageSquare, Play, XCircle, Download, Mail,
  MapPin, Phone, Hash, Calendar, ArrowRight, Plus, Stamp,
  Landmark, Award, BookOpen, ClipboardCheck, Gavel, Scale,
  GitBranch, Users, Globe, Smartphone, QrCode, Check,
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useCitizenRequestsStore, type CitizenRequest, type RequestStatus } from '@/store/citizen-requests-store'

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; icon: React.ElementType; description: string }> = {
  soumise: { label: 'Soumise', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400', icon: Send, description: 'Demande reçue, en attente de traitement' },
  en_cours: { label: 'En cours', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock, description: 'En cours de traitement par le service' },
  pieces_complementaires: { label: 'Pièces complémentaires', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertCircle, description: 'Des documents supplémentaires sont nécessaires' },
  validee: { label: 'Validée', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Check, description: 'Demande validée par le responsable' },
  prete: { label: 'Prête', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2, description: 'Document prêt pour le retrait' },
  livree: { label: 'Livrée', color: 'bg-[#0B2E58]/10 text-[#0B2E58] dark:bg-[#3B7DD8]/20 dark:text-[#3B7DD8]', icon: Download, description: 'Document remis au citoyen' },
  rejetee: { label: 'Rejetée', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle, description: 'Demande rejetée' },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

export function ServiceRequestsPage() {
  const {
    requests, updateRequestStatus, addProcessingNote, advanceTimeline,
    assignRequest, completeRequest,
  } = useCitizenRequestsStore()

  const [activeTab, setActiveTab] = useState('soumises')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedRequest, setSelectedRequest] = useState<CitizenRequest | null>(null)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteType, setNoteType] = useState<'note' | 'decision' | 'info_complementaire' | 'notification'>('note')
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false)
  const [deliveryMode, setDeliveryMode] = useState<'en_ligne' | 'guichet' | 'courrier'>('guichet')
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [successToast, setSuccessToast] = useState('')

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  // Filter requests by tab
  const filteredRequests = requests.filter(r => {
    const matchTab = activeTab === 'toutes' ||
      (activeTab === 'soumises' && r.status === 'soumise') ||
      (activeTab === 'en_cours' && (r.status === 'en_cours' || r.status === 'pieces_complementaires')) ||
      (activeTab === 'validees' && r.status === 'validee') ||
      (activeTab === 'pretes' && r.status === 'prete') ||
      (activeTab === 'livrees' && r.status === 'livree') ||
      (activeTab === 'rejetees' && r.status === 'rejetee')

    const matchSearch = !searchQuery ||
      r.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.citizenName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.citizenFirstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.assignedService.toLowerCase().includes(searchQuery.toLowerCase())

    const matchCategory = categoryFilter === 'all' || r.categoryId === categoryFilter

    return matchTab && matchSearch && matchCategory
  })

  // Stats
  const stats = [
    { label: 'Demandes reçues', value: requests.filter(r => r.status === 'soumise').length, icon: Send, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
    { label: 'En traitement', value: requests.filter(r => ['en_cours', 'pieces_complementaires'].includes(r.status)).length, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Documents prêts', value: requests.filter(r => r.status === 'prete').length, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Livrées ce mois', value: requests.filter(r => r.status === 'livree').length, icon: Download, color: 'text-[#0B2E58] dark:text-[#3B7DD8]', bg: 'bg-[#0B2E58]/5 dark:bg-[#3B7DD8]/10' },
  ]

  const handleTakeCharge = (req: CitizenRequest) => {
    updateRequestStatus(req.id, 'en_cours', 'Demande prise en charge par le service')
    advanceTimeline(req.id)
    assignRequest(req.id, 'Agent en charge')
    setSuccessToast(`Demande ${req.reference} prise en charge`)
    refreshSelected(req.id)
  }

  const handleRequestMoreInfo = () => {
    if (!selectedRequest || !noteText.trim()) return
    updateRequestStatus(selectedRequest.id, 'pieces_complementaires', noteText)
    addProcessingNote(selectedRequest.id, {
      author: 'Agent traitant',
      authorRole: 'Agent',
      text: noteText,
      type: 'info_complementaire',
    })
    setNoteDialogOpen(false)
    setNoteText('')
    setSuccessToast('Demande de pièces complémentaires envoyée au citoyen')
    refreshSelected(selectedRequest.id)
  }

  const handleValidate = (req: CitizenRequest) => {
    updateRequestStatus(req.id, 'validee', 'Demande validée par le responsable')
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
    const location = deliveryMode === 'guichet' ? (deliveryLocation || selectedRequest.assignedService) : undefined
    completeRequest(selectedRequest.id, deliveryMode, location)
    setDeliveryDialogOpen(false)
    setSuccessToast(`Document ${selectedRequest.reference} livré avec succès`)
    refreshSelected(selectedRequest.id)
  }

  const handleReject = () => {
    if (!selectedRequest || !rejectReason.trim()) return
    updateRequestStatus(selectedRequest.id, 'rejetee', rejectReason)
    addProcessingNote(selectedRequest.id, {
      author: 'Agent traitant',
      authorRole: 'Agent',
      text: `Demande rejetée : ${rejectReason}`,
      type: 'decision',
    })
    setRejectDialogOpen(false)
    setRejectReason('')
    setSuccessToast('Demande rejetée')
    refreshSelected(selectedRequest.id)
  }

  const handleAddNote = () => {
    if (!selectedRequest || !noteText.trim()) return
    addProcessingNote(selectedRequest.id, {
      author: 'Agent traitant',
      authorRole: 'Agent',
      text: noteText,
      type: noteType,
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

  const categories = [...new Set(requests.map(r => r.category))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0B2E58]/10 dark:bg-[#3B7DD8]/20">
            <ClipboardCheck className="h-6 w-6 text-[#0B2E58] dark:text-[#3B7DD8]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#0B2E58] dark:text-white">Traitement des Demandes Citoyennes</h2>
            <p className="text-sm text-muted-foreground">Gestion et traitement des demandes reçues via le portail public Guinée Services</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="glass-card hover:shadow-lg transition-shadow">
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs + Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
                <TabsTrigger value="soumises" className="gap-1 text-xs data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
                  <Send className="h-3 w-3" />
                  Soumises ({requests.filter(r => r.status === 'soumise').length})
                </TabsTrigger>
                <TabsTrigger value="en_cours" className="gap-1 text-xs data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
                  <Clock className="h-3 w-3" />
                  En cours ({requests.filter(r => ['en_cours', 'pieces_complementaires'].includes(r.status)).length})
                </TabsTrigger>
                <TabsTrigger value="validees" className="gap-1 text-xs data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
                  <Check className="h-3 w-3" />
                  Validées ({requests.filter(r => r.status === 'validee').length})
                </TabsTrigger>
                <TabsTrigger value="pretes" className="gap-1 text-xs data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
                  <CheckCircle2 className="h-3 w-3" />
                  Prêtes ({requests.filter(r => r.status === 'prete').length})
                </TabsTrigger>
                <TabsTrigger value="livrees" className="gap-1 text-xs data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
                  <Download className="h-3 w-3" />
                  Livrées ({requests.filter(r => r.status === 'livree').length})
                </TabsTrigger>
                <TabsTrigger value="rejetees" className="gap-1 text-xs data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
                  <XCircle className="h-3 w-3" />
                  Rejetées ({requests.filter(r => r.status === 'rejetee').length})
                </TabsTrigger>
                <TabsTrigger value="toutes" className="text-xs data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
                  Toutes ({requests.length})
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par référence, nom, service..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main content: List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request List */}
        <div className="lg:col-span-2 space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredRequests.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className="glass-card">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <FileText className="size-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground font-medium">Aucune demande dans cette catégorie</p>
                    <p className="text-xs text-muted-foreground mt-1">Les nouvelles demandes soumises par les citoyens apparaîtront ici</p>
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
                            <span className="flex items-center gap-1"><Building2 className="size-3" />{req.assignedService}</span>
                            <span className="flex items-center gap-1"><Calendar className="size-3" />{new Date(req.createdAt).toLocaleDateString('fr-FR')}</span>
                            {req.assignedAgent && <span className="flex items-center gap-1"><User className="size-3" />{req.assignedAgent}</span>}
                          </div>
                          {req.deliveryMode && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="size-3" />
                              {req.deliveryMode === 'en_ligne' ? 'Livraison en ligne' : req.deliveryMode === 'guichet' ? 'Retrait au guichet' : 'Envoi par courrier'}
                            </div>
                          )}
                        </div>
                        {/* Quick action for soumises */}
                        {req.status === 'soumise' && (
                          <div className="mt-3 flex gap-2">
                            <Button size="sm" className="bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-[#3B7DD8] dark:hover:bg-[#3B7DD8]/90 text-white gap-1 h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleTakeCharge(req) }}>
                              <Play className="size-3" />
                              Prendre en charge
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 gap-1 h-7 text-xs" onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); setRejectDialogOpen(true) }}>
                              <XCircle className="size-3" />
                              Rejeter
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
                      {selectedRequest.citizenEmail && <div className="flex items-center gap-2"><Mail className="size-3 text-muted-foreground" />{selectedRequest.citizenEmail}</div>}
                      <div className="flex items-center gap-2"><MapPin className="size-3 text-muted-foreground" />{selectedRequest.citizenAddress}</div>
                    </div>
                  </div>

                  {/* Required documents */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pièces justificatives</h4>
                    <div className="space-y-1">
                      {selectedRequest.documents.map((doc, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <Check className="size-3 text-muted-foreground" />
                          <span>{doc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Assigned service */}
                  <div className="p-3 rounded-lg bg-[#0B2E58]/5 dark:bg-[#3B7DD8]/10">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-[#0B2E58] dark:text-[#3B7DD8]" />
                      <div>
                        <p className="text-xs text-muted-foreground">Service compétent</p>
                        <p className="text-xs font-semibold">{selectedRequest.assignedService}</p>
                      </div>
                    </div>
                    {selectedRequest.assignedAgent && (
                      <p className="text-xs mt-1 ml-6 text-muted-foreground">Agent : {selectedRequest.assignedAgent}</p>
                    )}
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
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes de traitement ({selectedRequest.processingNotes.length})</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {selectedRequest.processingNotes.map((note, i) => (
                            <div key={i} className={`p-2 rounded-lg text-xs border ${
                              note.type === 'info_complementaire' ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/40' :
                              note.type === 'decision' ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/40' :
                              'bg-muted/50 border-muted'
                            }`}>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="font-medium">{note.author}</span>
                                <span className="text-[9px] text-muted-foreground">{new Date(note.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
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
                      <>
                        <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => handleValidate(selectedRequest)}>
                          <Check className="size-3.5" />
                          Valider
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => { setNoteType('info_complementaire'); setNoteDialogOpen(true) }}>
                          <AlertCircle className="size-3.5" />
                          Demander pièces
                        </Button>
                      </>
                    )}
                    {selectedRequest.status === 'validee' && (
                      <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => handleMarkReady(selectedRequest)}>
                        <CheckCircle2 className="size-3.5" />
                        Marquer prêt
                      </Button>
                    )}
                    {selectedRequest.status === 'prete' && (
                      <Button size="sm" className="flex-1 bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-[#3B7DD8] dark:hover:bg-[#3B7DD8]/90 text-white gap-1" onClick={() => setDeliveryDialogOpen(true)}>
                        <Download className="size-3.5" />
                        Livrer le document
                      </Button>
                    )}
                    {selectedRequest.status !== 'livree' && selectedRequest.status !== 'rejetee' && (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => { setNoteType('note'); setNoteDialogOpen(true) }}>
                        <MessageSquare className="size-3.5" />
                        Note
                      </Button>
                    )}
                    {selectedRequest.status !== 'livree' && selectedRequest.status !== 'rejetee' && (
                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 gap-1" onClick={() => setRejectDialogOpen(true)}>
                        <XCircle className="size-3.5" />
                        Rejeter
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <ClipboardCheck className="size-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Sélectionnez une demande pour voir les détails</p>
                <p className="text-xs text-muted-foreground mt-1">Traitez les demandes citoyennes et suivez leur avancement</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{noteType === 'info_complementaire' ? 'Demander des pièces complémentaires' : 'Ajouter une note'}</DialogTitle>
            <DialogDescription>
              {noteType === 'info_complementaire'
                ? 'Précisez les documents supplémentaires requis du citoyen'
                : 'Ajoutez une note au dossier de traitement'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder={noteType === 'info_complementaire' ? 'Listez les pièces complémentaires nécessaires...' : 'Rédigez votre note...'}
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>Annuler</Button>
            <Button className="bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-[#3B7DD8] dark:hover:bg-[#3B7DD8]/90 text-white" onClick={noteType === 'info_complementaire' ? handleRequestMoreInfo : handleAddNote} disabled={!noteText.trim()}>
              {noteType === 'info_complementaire' ? 'Envoyer la demande' : 'Publier la note'}
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
                    <Input placeholder="Ex: Mairie de Kaloum, Bureau d'État Civil..." value={deliveryLocation} onChange={e => setDeliveryLocation(e.target.value)} />
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

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="size-5" />
              Rejeter la demande
            </DialogTitle>
            <DialogDescription>Motivez le rejet de cette demande</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea placeholder="Raison du rejet..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Annuler</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white gap-2" onClick={handleReject} disabled={!rejectReason.trim()}>
              <XCircle className="size-4" />
              Confirmer le rejet
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
    </div>
  )
}
