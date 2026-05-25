'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardCheck, Clock, CheckCircle2, AlertCircle, Search,
  Send, Play, User, Calendar, Hash, Phone, MapPin, FileText,
  Download, XCircle, Check, Paperclip, Briefcase, BarChart3, ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/store/app-store'
import { useCitizenRequestsStore, type CitizenRequest, type RequestStatus } from '@/store/citizen-requests-store'
import { filterRequestsByRLS, getRLSScopeDescription } from '@/lib/rbac'

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
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const itemVariants = { hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } } }

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export function AgentDashboardPage() {
  const navigate = useAppStore((s) => s.navigate)
  const user = useAppStore((s) => s.user)
  const { requests, updateRequestStatus, addProcessingNote, advanceTimeline, assignRequest, completeRequest, verifyDocument } = useCitizenRequestsStore()

  // RLS-filtered requests for this agent
  const agentRequests = filterRequestsByRLS(requests, user)
  const rlsScope = getRLSScopeDescription(user)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<CitizenRequest | null>(null)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [successToast, setSuccessToast] = useState('')

  useEffect(() => {
    if (successToast) { const t = setTimeout(() => setSuccessToast(''), 4000); return () => clearTimeout(t) }
  }, [successToast])

  // ─── Stats ────────────────────────────────────────────────────────────────
  const assignedCount = agentRequests.filter(r => ['en_cours', 'pieces_complementaires'].includes(r.status)).length
  const toProcessCount = agentRequests.filter(r => r.status === 'soumise').length
  const validatedToday = agentRequests.filter(r => r.status === 'validee' && new Date(r.updatedAt).toDateString() === new Date().toDateString()).length
  const deliveredMonth = agentRequests.filter(r => r.status === 'livree').length

  const stats = [
    { label: 'Mes demandes assignées', value: assignedCount, icon: Briefcase, gradient: 'from-amber-500 to-amber-700' },
    { label: 'À traiter', value: toProcessCount, icon: ClipboardCheck, gradient: 'from-sky-500 to-sky-700' },
    { label: 'Validées aujourd\'hui', value: validatedToday, icon: CheckCircle2, gradient: 'from-emerald-500 to-emerald-700' },
    { label: 'Livrées ce mois', value: deliveredMonth, icon: Download, gradient: 'from-[#0B2E58] to-[#134A8E] dark:from-[#3B7DD8] dark:to-[#5A96E6]' },
  ]

  // ─── Pipeline ─────────────────────────────────────────────────────────────
  const pipeline = [
    { status: 'soumise', label: 'Soumises', count: agentRequests.filter(r => r.status === 'soumise').length, gradient: 'from-sky-400 to-sky-600' },
    { status: 'en_cours', label: 'En cours', count: agentRequests.filter(r => r.status === 'en_cours').length, gradient: 'from-amber-400 to-amber-600' },
    { status: 'pieces_complementaires', label: 'Pièces à compléter', count: agentRequests.filter(r => r.status === 'pieces_complementaires').length, gradient: 'from-orange-400 to-orange-600' },
    { status: 'validee', label: 'Validées', count: agentRequests.filter(r => r.status === 'validee').length, gradient: 'from-blue-400 to-blue-600' },
    { status: 'prete', label: 'Prêtes', count: agentRequests.filter(r => r.status === 'prete').length, gradient: 'from-emerald-400 to-emerald-600' },
    { status: 'livree', label: 'Livrées', count: agentRequests.filter(r => r.status === 'livree').length, gradient: 'from-[#0B2E58] to-[#134A8E]' },
    { status: 'rejetee', label: 'Rejetées', count: agentRequests.filter(r => r.status === 'rejetee').length, gradient: 'from-red-400 to-red-600' },
  ]

  const processRate = agentRequests.length > 0 ? Math.round((agentRequests.filter(r => ['validee', 'prete', 'livree'].includes(r.status)).length / agentRequests.length) * 100) : 0

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const refreshSelected = (id: string) => { const u = requests.find(r => r.id === id); if (u) setSelectedRequest(u) }

  const handleTakeCharge = (req: CitizenRequest) => {
    updateRequestStatus(req.id, 'en_cours', 'Demande prise en charge par l\'agent')
    advanceTimeline(req.id); assignRequest(req.id, user?.name || 'Agent')
    setSuccessToast(`Demande ${req.reference} prise en charge`); refreshSelected(req.id)
  }
  const handleValidate = (req: CitizenRequest) => {
    updateRequestStatus(req.id, 'validee', 'Demande validée par l\'agent')
    advanceTimeline(req.id); advanceTimeline(req.id)
    setSuccessToast(`Demande ${req.reference} validée`); refreshSelected(req.id)
  }
  const handleMarkReady = (req: CitizenRequest) => {
    updateRequestStatus(req.id, 'prete', 'Document prêt pour le retrait')
    advanceTimeline(req.id); setSuccessToast(`Document ${req.reference} prêt`); refreshSelected(req.id)
  }
  const handleDeliver = (req: CitizenRequest) => {
    completeRequest(req.id, 'guichet', user?.institution || 'Guichet')
    setSuccessToast(`Document ${req.reference} livré avec succès`); refreshSelected(req.id)
  }
  const handleAddNote = () => {
    if (!selectedRequest || !noteText.trim()) return
    addProcessingNote(selectedRequest.id, { author: user?.name || 'Agent', authorRole: 'Agent', text: noteText, type: 'note' })
    setNoteDialogOpen(false); setNoteText(''); setSuccessToast('Note ajoutée'); refreshSelected(selectedRequest.id)
  }
  const handleVerifyDoc = (reqId: string, docId: string) => {
    verifyDocument(reqId, docId); setSuccessToast('Document vérifié')
    if (selectedRequest) refreshSelected(selectedRequest.id)
  }

  const filteredRequests = agentRequests.filter(r => !searchQuery ||
    r.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.citizenName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.citizenFirstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.serviceName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ─── Stats data for the Statistiques tab ────────────────────────────────
  const processedThisWeek = agentRequests.filter(r => ['validee', 'prete', 'livree'].includes(r.status)).length
  const avgDays = agentRequests.length > 0 ? Math.round(agentRequests.reduce((acc, r) => {
    const end = r.completedAt ? new Date(r.completedAt) : new Date()
    return acc + (end.getTime() - new Date(r.createdAt).getTime()) / 86400000
  }, 0) / agentRequests.length) : 0
  const successRate = agentRequests.length > 0 ? Math.round((agentRequests.filter(r => r.status !== 'rejetee').length / agentRequests.length) * 100) : 100

  const weekBars = [
    { day: 'Lun', value: 3 }, { day: 'Mar', value: 5 }, { day: 'Mer', value: 2 },
    { day: 'Jeu', value: 7 }, { day: 'Ven', value: 4 }, { day: 'Sam', value: 1 },
  ]
  const maxBar = Math.max(...weekBars.map(b => b.value), 1)

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 p-4 md:p-6">
      {/* ═══ HEADER ═══ */}
      <motion.div variants={itemVariants}>
        <Card className="glass-premium overflow-hidden border-[#C8A45C]/20 dark:border-[#D4B878]/20 bg-gradient-to-br from-[#0B2E58] via-[#134A8E] to-[#0B2E58] dark:from-[#0B2E58] dark:via-[#071D3A] dark:to-[#0B2E58] shadow-premium-lg">
          <CardContent className="p-6 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-white/[0.02] pointer-events-none" />
            <div className="flex gap-0 mb-4 -mx-6 -mt-6">
              <div className="flex-1 h-2 bg-gradient-to-r from-[#CE1126] to-[#CE1126]/60" />
              <div className="flex-1 h-2 bg-gradient-to-r from-[#FCD116]/60 to-[#FCD116]" />
              <div className="flex-1 h-2 bg-gradient-to-r from-[#009460] to-[#009460]/60" />
            </div>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 relative z-10">
              <div className="relative">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[#C8A45C]/40 to-[#D4B878]/20 blur-sm" />
                <div className="relative flex size-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-[#C8A45C]/30 shadow-lg">
                  <ClipboardCheck className="size-7 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.2em] text-[#C8A45C]/80 font-semibold">République de Guinée</p>
                <h2 className="text-2xl font-bold mt-0.5 text-gradient-gold">Espace Agent de Traitement</h2>
                <p className="text-sm text-white/70 mt-1">
                  {user?.institution || 'Mairie de Kaloum'} • {user?.name || 'Agent de Traitement'}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Badge className="badge-premium bg-[#C8A45C] text-[#0B2E58] hover:bg-[#C8A45C]/90 border-0 font-semibold text-xs gap-1.5 shadow-gold">
                  <ClipboardCheck className="size-3" /> Agent de Traitement
                </Badge>
                <Badge className="badge-premium bg-white/10 text-white/80 border border-white/20 text-xs gap-1.5">
                  <BarChart3 className="size-3" /> {rlsScope}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══ STATS ═══ */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="card-interactive overflow-hidden group">
              <CardContent className="flex items-center gap-3 p-4 relative">
                <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${stat.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-sm`}>
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

      {/* ═══ PIPELINE ═══ */}
      <motion.div variants={itemVariants}>
        <Card className="card-premium overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white flex items-center gap-2">
              <ClipboardCheck className="size-4 text-[#C8A45C]" />
              Pipeline de traitement — {user?.institution || 'Votre institution'}
            </CardTitle>
            <CardDescription className="text-xs">Vue d&apos;ensemble du flux de demandes assignées</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {pipeline.map((step, i) => (
                <div key={step.status} className="flex items-center">
                  <div className="flex flex-col items-center min-w-[72px]">
                    <div className="relative">
                      {step.count > 0 && <div className={`absolute -inset-1.5 rounded-full bg-gradient-to-br ${step.gradient} opacity-20 blur-md`} />}
                      <div className={`relative w-11 h-11 rounded-full bg-gradient-to-br ${step.gradient} text-white flex items-center justify-center font-bold text-sm shadow-md`}>
                        {step.count}
                      </div>
                    </div>
                    <p className="text-[10px] font-medium text-muted-foreground mt-1.5 text-center">{step.label}</p>
                  </div>
                  {i < pipeline.length - 1 && (
                    <div className="flex items-center mx-0.5 shrink-0">
                      <div className="w-3 h-[2px] bg-muted-foreground/20 rounded-full" />
                      <ArrowRight className="size-2.5 text-muted-foreground/30 shrink-0" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Taux de traitement</span>
                <span className="font-semibold tabular-nums">{processRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#0B2E58] via-[#3B7DD8] to-[#C8A45C] transition-all duration-700" style={{ width: `${processRate}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══ TABS: DEMANDES + STATISTIQUES ═══ */}
      <Tabs defaultValue="demandes">
        <TabsList className="w-full sm:w-auto h-auto flex-wrap gap-1 bg-muted/50 p-1.5 shadow-sm">
          <TabsTrigger value="demandes" className="gap-1.5 text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0B2E58] data-[state=active]:to-[#134A8E] data-[state=active]:text-white data-[state=active]:shadow-md">
            <FileText className="size-4" /> Demandes ({agentRequests.length})
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5 text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0B2E58] data-[state=active]:to-[#134A8E] data-[state=active]:text-white data-[state=active]:shadow-md">
            <BarChart3 className="size-4" /> Statistiques
          </TabsTrigger>
        </TabsList>

        {/* ─── DEMANDES TAB ─── */}
        <TabsContent value="demandes">
          <div className="mt-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par référence, nom, service..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 glass-input focus-ring-premium" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* List */}
              <div className="lg:col-span-2 space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredRequests.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Card className="glass-premium">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                          <FileText className="size-12 text-muted-foreground/30 mb-3" />
                          <p className="text-muted-foreground font-medium">Aucune demande assignée</p>
                          <p className="text-xs text-muted-foreground mt-1">Les nouvelles demandes de votre institution apparaîtront ici</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ) : filteredRequests.map((req, i) => {
                    const sc = STATUS_CONFIG[req.status]; const SI = sc.icon
                    return (
                      <motion.div key={req.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.03 }} layout>
                        <Card className={`card-interactive overflow-hidden ${selectedRequest?.id === req.id ? 'ring-2 ring-[#0B2E58] dark:ring-[#3B7DD8] border-[#C8A45C]/30 shadow-gold' : ''}`} onClick={() => setSelectedRequest(req)}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <Avatar className="size-10 ring-2 ring-white/50 dark:ring-white/10">
                                  <AvatarFallback className={`${sc.color} text-xs font-bold`}>{req.citizenFirstName[0]}{req.citizenName[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-semibold text-sm">{req.citizenFirstName} {req.citizenName}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{req.reference}</p>
                                </div>
                              </div>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium backdrop-blur-sm ${sc.color} border border-current/10`}>
                                <SI className="size-3" />{sc.label}
                              </span>
                            </div>
                            <div className="pl-13 space-y-1">
                              <p className="text-sm font-medium">{req.serviceName}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Calendar className="size-3" />{new Date(req.createdAt).toLocaleDateString('fr-FR')}</span>
                                {req.assignedAgent && <span className="flex items-center gap-1"><User className="size-3" />{req.assignedAgent}</span>}
                              </div>
                            </div>
                            {req.status === 'soumise' && (
                              <div className="mt-3 flex gap-2">
                                <Button size="sm" className="btn-premium gap-1 h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleTakeCharge(req) }}>
                                  <Play className="size-3" /> Prendre en charge
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>

              {/* Detail Panel */}
              <div className="lg:col-span-1">
                {selectedRequest ? (
                  <motion.div key={selectedRequest.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <Card className="glass-premium sticky top-24 shadow-premium">
                      <CardHeader className="pb-3">
                        <Badge className={`badge-premium text-[10px] font-semibold w-fit ${STATUS_CONFIG[selectedRequest.status].color}`}>
                          {STATUS_CONFIG[selectedRequest.status].label}
                        </Badge>
                        <CardTitle className="text-base mt-1">{selectedRequest.serviceName}</CardTitle>
                        <CardDescription className="text-xs font-mono">{selectedRequest.reference}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Citizen info */}
                        <div className="p-3 rounded-lg bg-gradient-to-br from-muted/40 to-muted/20 backdrop-blur-sm space-y-2 border border-muted/50">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informations du citoyen</h4>
                          <div className="grid grid-cols-1 gap-1.5 text-xs">
                            <div className="flex items-center gap-2"><User className="size-3 text-[#C8A45C]" /><span className="font-medium">{selectedRequest.citizenFirstName} {selectedRequest.citizenName}</span></div>
                            <div className="flex items-center gap-2"><Hash className="size-3 text-[#C8A45C]" />NIN : {selectedRequest.citizenNIN}</div>
                            <div className="flex items-center gap-2"><Phone className="size-3 text-[#C8A45C]" />{selectedRequest.citizenPhone}</div>
                            <div className="flex items-center gap-2"><MapPin className="size-3 text-[#C8A45C]" />{selectedRequest.citizenAddress}</div>
                          </div>
                        </div>

                        {/* Documents */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Paperclip className="size-3.5 text-[#C8A45C]" />
                            Pièces ({selectedRequest.uploadedDocuments?.length ?? 0} / {selectedRequest.documents?.length ?? 0})
                          </h4>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {(selectedRequest.documents ?? []).map((docName, i) => {
                              const uploaded = (selectedRequest.uploadedDocuments ?? []).find(d => d.requiredDocName === docName)
                              return (
                                <div key={i} className={`flex items-center justify-between p-2 rounded-lg text-xs border ${uploaded ? (uploaded.verified ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-900/10' : 'border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/10') : 'border-dashed border-muted-foreground/30 bg-muted/20'}`}>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Paperclip className="size-3 text-muted-foreground shrink-0" />
                                    <span className={`truncate ${!uploaded ? 'text-muted-foreground' : ''}`}>{docName}</span>
                                  </div>
                                  {uploaded && !uploaded.verified && (
                                    <Button size="sm" variant="outline" className="h-5 text-[9px] gap-0.5 px-1.5 shrink-0" onClick={() => handleVerifyDoc(selectedRequest.id, uploaded.id)}>
                                      <Check className="size-2.5" /> Vérifier
                                    </Button>
                                  )}
                                  {uploaded?.verified && <Badge className="text-[8px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 px-1.5">Vérifié</Badge>}
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
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 ${step.status === 'completed' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-500 text-white shadow-sm' : step.status === 'current' ? 'bg-gradient-to-br from-[#0B2E58] to-[#3B7DD8] border-[#3B7DD8] text-white shadow-sm' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>
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
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes ({selectedRequest.processingNotes.length})</h4>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {selectedRequest.processingNotes.slice(-4).map((note, i) => (
                                <div key={i} className={`p-2 rounded-lg text-xs border ${note.type === 'info_complementaire' ? 'bg-orange-50/80 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/40' : note.type === 'decision' ? 'bg-blue-50/80 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/40' : 'bg-muted/40 border-muted/50'}`}>
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="font-medium">{note.author}</span>
                                    <span className="text-[9px] text-muted-foreground">{new Date(note.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                                  </div>
                                  <p className="text-muted-foreground">{note.text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="pt-2 border-t border-muted/50">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Actions</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedRequest.status === 'soumise' && (
                              <Button size="sm" className="btn-premium gap-1 text-xs" onClick={() => handleTakeCharge(selectedRequest)}><Play className="size-3" /> Prendre en charge</Button>
                            )}
                            {selectedRequest.status === 'en_cours' && (
                              <Button size="sm" className="btn-premium gap-1 text-xs" onClick={() => handleValidate(selectedRequest)}><Check className="size-3" /> Valider</Button>
                            )}
                            {selectedRequest.status === 'validee' && (
                              <Button size="sm" className="btn-premium gap-1 text-xs" onClick={() => handleMarkReady(selectedRequest)}><CheckCircle2 className="size-3" /> Marquer prêt</Button>
                            )}
                            {selectedRequest.status === 'prete' && (
                              <Button size="sm" className="btn-gold gap-1 text-xs" onClick={() => handleDeliver(selectedRequest)}><Download className="size-3" /> Livrer</Button>
                            )}
                            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setNoteDialogOpen(true)}><FileText className="size-3" /> Ajouter note</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <Card className="glass-premium">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                      <ClipboardCheck className="size-12 text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground font-medium text-sm">Sélectionnez une demande</p>
                      <p className="text-xs text-muted-foreground mt-1">Cliquez sur une demande pour voir les détails</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ─── STATISTIQUES TAB ─── */}
        <TabsContent value="stats">
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="card-interactive overflow-hidden group">
              <CardContent className="p-5 relative">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-emerald-700 opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-sm"><CheckCircle2 className="size-5 text-white" /></div>
                  <div><p className="text-2xl font-bold tabular-nums text-[#0B2E58] dark:text-white">{processedThisWeek}</p><p className="text-xs text-muted-foreground">Traitées cette semaine</p></div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-interactive overflow-hidden group">
              <CardContent className="p-5 relative">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 to-amber-700 opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-sm"><Clock className="size-5 text-white" /></div>
                  <div><p className="text-2xl font-bold tabular-nums text-[#0B2E58] dark:text-white">{avgDays}j</p><p className="text-xs text-muted-foreground">Délai moyen de traitement</p></div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-interactive overflow-hidden group">
              <CardContent className="p-5 relative">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#0B2E58] to-[#134A8E] opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#0B2E58] to-[#134A8E] shadow-sm"><BarChart3 className="size-5 text-white" /></div>
                  <div><p className="text-2xl font-bold tabular-nums text-[#0B2E58] dark:text-white">{successRate}%</p><p className="text-xs text-muted-foreground">Taux de succès</p></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mini bar chart */}
          <Card className="card-premium overflow-hidden mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white flex items-center gap-2">
                <BarChart3 className="size-4 text-[#C8A45C]" /> Demandes traitées cette semaine
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 h-32">
                {weekBars.map((bar) => (
                  <div key={bar.day} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{bar.value}</span>
                    <div className="w-full rounded-t-md bg-gradient-to-t from-[#0B2E58] to-[#3B7DD8] dark:from-[#3B7DD8] dark:to-[#5A96E6] transition-all duration-500" style={{ height: `${(bar.value / maxBar) * 100}%`, minHeight: '4px' }} />
                    <span className="text-[10px] text-muted-foreground">{bar.day}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══ QUICK ACTIONS ═══ */}
      <motion.div variants={itemVariants}>
        <Card className="card-premium overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white flex items-center gap-2">
              <Briefcase className="size-4 text-[#C8A45C]" /> Accès rapide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'GED', icon: FileText, page: 'ged' as const, gradient: 'from-[#0B2E58] to-[#134A8E] hover:from-[#0B2E58]/90 hover:to-[#134A8E]/90' },
                { label: 'Courriers', icon: Send, page: 'courriers' as const, gradient: 'from-amber-600 to-amber-800 hover:from-amber-700 hover:to-amber-900' },
                { label: 'Analytics', icon: BarChart3, page: 'analytics' as const, gradient: 'from-emerald-600 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900' },
              ].map(action => (
                <Button key={action.label} className={`${action.gradient} text-white h-auto flex-col gap-2 py-4 rounded-xl shadow-md hover:scale-[1.02] hover:shadow-lg transition-all`} onClick={() => navigate(action.page)}>
                  <action.icon className="size-5" />
                  <span className="text-xs font-semibold">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══ NOTE DIALOG ═══ */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="glass-premium">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0B2E58] dark:text-white">
              <FileText className="size-4 text-[#C8A45C]" /> Ajouter une note
            </DialogTitle>
            <DialogDescription>Ajouter une note de traitement à la demande {selectedRequest?.reference}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Note</Label><Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Saisissez votre note..." className="glass-input focus-ring-premium min-h-[80px]" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)} className="focus-ring-premium">Annuler</Button>
            <Button onClick={handleAddNote} className="btn-premium" disabled={!noteText.trim()}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ TOAST ═══ */}
      {successToast && (
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} className="fixed bottom-6 right-6 z-50">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#0B2E58] to-[#134A8E] text-white shadow-premium-lg border border-[#C8A45C]/20">
            <CheckCircle2 className="size-4 text-[#C8A45C]" /><span className="text-sm font-medium">{successToast}</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
