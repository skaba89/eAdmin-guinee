'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, ClipboardCheck, Clock, CheckCircle2, AlertCircle, Search,
  Send, UserCheck, FileText, GitBranch, BarChart3, Shield, Eye,
  Play, ArrowRight, TrendingUp, Calendar, Hash, XCircle, Check,
  Briefcase, Mail,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/store/app-store'
import { useCitizenRequestsStore, type CitizenRequest, type RequestStatus } from '@/store/citizen-requests-store'
import { filterRequestsByRLS } from '@/lib/rbac'

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; icon: React.ElementType }> = {
  soumise: { label: 'Soumise', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400', icon: Send },
  en_cours: { label: 'En cours', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  pieces_complementaires: { label: 'Pièces complémentaires', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertCircle },
  validee: { label: 'Validée', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Check },
  prete: { label: 'Prête', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  livree: { label: 'Livrée', color: 'bg-[#0B2E58]/10 text-[#0B2E58] dark:bg-[#3B7DD8]/20 dark:text-[#3B7DD8]', icon: CheckCircle2 },
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

// ─── SIMULATED TEAM DATA ────────────────────────────────────────────────────
const TEAM_AGENTS = [
  { name: 'Agent Camara', initials: 'AC', active: 5, completed: 12, status: 'En service' },
  { name: 'Agent Diallo', initials: 'AD', active: 3, completed: 18, status: 'En service' },
  { name: 'Agent Sylla', initials: 'AS', active: 7, completed: 9, status: 'En service' },
  { name: 'Agent Bah', initials: 'AB', active: 2, completed: 15, status: 'Absent' },
]

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export function ChefServiceDashboardPage() {
  const navigate = useAppStore((s) => s.navigate)
  const user = useAppStore((s) => s.user)
  const { requests, updateRequestStatus, addProcessingNote, advanceTimeline, assignRequest } = useCitizenRequestsStore()

  // RLS-filtered requests for this chef's institution
  const serviceRequests = filterRequestsByRLS(requests, user)

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('supervision')
  const [successToast, setSuccessToast] = useState('')

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  // ─── KPI COMPUTATIONS ────────────────────────────────────────────────────
  const soumiseCount = serviceRequests.filter(r => r.status === 'soumise').length
  const enCoursCount = serviceRequests.filter(r => ['en_cours', 'pieces_complementaires'].includes(r.status)).length
  const approvalNeeded = serviceRequests.filter(r => r.status === 'en_cours').length
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const valideeThisWeek = serviceRequests.filter(r => r.status === 'validee' && new Date(r.updatedAt) >= weekAgo).length
  const totalProcessed = serviceRequests.filter(r => ['validee', 'prete', 'livree'].includes(r.status)).length
  const conformityRate = serviceRequests.length > 0 ? Math.round((totalProcessed / serviceRequests.length) * 100) : 0
  const avgDelay = enCoursCount > 0 ? '3.2 j' : '—'

  const kpis = [
    { label: 'Demandes en attente', value: soumiseCount, icon: Send, gradient: 'from-sky-500 to-sky-700' },
    { label: 'En traitement', value: enCoursCount, icon: Clock, gradient: 'from-amber-500 to-amber-700' },
    { label: 'Approbations requises', value: approvalNeeded, icon: Shield, gradient: 'from-cyan-500 to-cyan-700' },
    { label: 'Validées cette semaine', value: valideeThisWeek, icon: CheckCircle2, gradient: 'from-emerald-500 to-emerald-700' },
    { label: 'Délai moyen', value: avgDelay, icon: TrendingUp, gradient: 'from-violet-500 to-violet-700' },
    { label: 'Taux de conformité', value: `${conformityRate}%`, icon: BarChart3, gradient: 'from-[#0B2E58] to-[#134A8E]' },
  ]

  // ─── ACTION HANDLERS ─────────────────────────────────────────────────────
  const handleApprove = (req: CitizenRequest) => {
    updateRequestStatus(req.id, 'validee', `Demande validée par ${user?.name || 'Chef de Service'}`)
    advanceTimeline(req.id)
    advanceTimeline(req.id)
    setSuccessToast(`Demande ${req.reference} approuvée`)
  }

  const handleReject = (req: CitizenRequest) => {
    updateRequestStatus(req.id, 'rejetee', `Demande rejetée par ${user?.name || 'Chef de Service'}`)
    setSuccessToast(`Demande ${req.reference} rejetée`)
  }

  const handleAssign = (req: CitizenRequest, agentName: string) => {
    assignRequest(req.id, agentName)
    if (req.status === 'soumise') {
      updateRequestStatus(req.id, 'en_cours', `Assignée à ${agentName}`)
      advanceTimeline(req.id)
    } else {
      addProcessingNote(req.id, { author: user?.name || 'Chef de Service', authorRole: 'Chef de Service', text: `Réassignée à ${agentName}`, type: 'note' })
    }
    setSuccessToast(`Demande ${req.reference} assignée à ${agentName}`)
  }

  const handleTakeCharge = (req: CitizenRequest) => {
    updateRequestStatus(req.id, 'en_cours', `Prise en charge par ${user?.name || 'Chef de Service'}`)
    advanceTimeline(req.id)
    assignRequest(req.id, user?.name || 'Chef de Service')
    setSuccessToast(`Demande ${req.reference} prise en charge`)
  }

  // Filtered requests for search
  const filteredRequests = serviceRequests.filter(r => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return r.reference.toLowerCase().includes(q) || r.citizenName.toLowerCase().includes(q) || r.citizenFirstName.toLowerCase().includes(q) || r.serviceName.toLowerCase().includes(q)
  })

  // Approval queue: en_cours requests needing chef's approval
  const approvalQueue = serviceRequests.filter(r => r.status === 'en_cours')

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 p-4 md:p-6">
      {/* ═══════════════════ HEADER ═══════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="glass-premium overflow-hidden border-[#C8A45C]/20 dark:border-[#D4B878]/20 bg-gradient-to-br from-[#0B2E58] via-[#134A8E] to-[#0B2E58] dark:from-[#0B2E58] dark:via-[#071D3A] dark:to-[#0B2E58] shadow-premium-lg">
          <CardContent className="p-6 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-white/[0.02] pointer-events-none" />
            {/* Guinea tricolor */}
            <div className="flex gap-0 mb-4 -mx-6 -mt-6">
              <div className="flex-1 h-2 bg-gradient-to-r from-[#CE1126] to-[#CE1126]/60" />
              <div className="flex-1 h-2 bg-gradient-to-r from-[#FCD116]/60 to-[#FCD116]" />
              <div className="flex-1 h-2 bg-gradient-to-r from-[#009460] to-[#009460]/60" />
            </div>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 relative z-10">
              <div className="relative">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[#C8A45C]/40 to-[#D4B878]/20 blur-sm" />
                <div className="relative flex size-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-[#C8A45C]/30 shadow-lg">
                  <Briefcase className="size-7 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.2em] text-[#C8A45C]/80 font-semibold">République de Guinée</p>
                <h2 className="text-2xl font-bold mt-0.5 text-gradient-gold">Espace Chef de Service</h2>
                <p className="text-sm text-white/70 mt-1">
                  {user?.institution || 'Mairie de Kaloum'} — {user?.fonction || 'Chef de Service — État Civil & Résidence'} • {user?.name || 'Aissatou Touré'}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Badge className="badge-premium bg-cyan-500/90 text-white hover:bg-cyan-500/80 border-0 font-semibold text-xs gap-1.5 shadow-md">
                  <Shield className="size-3" />
                  Chef de Service
                </Badge>
                <Badge className="badge-premium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs gap-1.5">
                  <Users className="size-3" />
                  {TEAM_AGENTS.length} agents
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════ KPI CARDS (3x2) ═══════════════════ */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="card-interactive overflow-hidden group">
              <CardContent className="flex items-center gap-3 p-4 relative">
                <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${kpi.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${kpi.gradient} shadow-sm`}>
                  <kpi.icon className="size-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold tabular-nums tracking-tight text-[#0B2E58] dark:text-white premium-stat">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* ═══════════════════ TEAM OVERVIEW ═══════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="card-premium overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-[#0B2E58] via-[#3B7DD8] to-[#C8A45C]" />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white flex items-center gap-2">
              <Users className="size-4 text-[#C8A45C]" />
              Équipe du Service — {TEAM_AGENTS.length} agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {TEAM_AGENTS.map((agent) => (
                <div key={agent.name} className="p-3 rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 backdrop-blur-sm border border-muted/50 space-y-2 group hover:from-muted/50 hover:to-muted/30 transition-all">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-9 ring-2 ring-white/50 dark:ring-white/10">
                      <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-cyan-700 text-white text-xs font-bold">{agent.initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{agent.name}</p>
                      <Badge className={`text-[9px] px-1.5 py-0 ${agent.status === 'En service' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800/30 dark:text-gray-400'}`}>{agent.status}</Badge>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Actives :</span> <span className="font-semibold">{agent.active}</span></div>
                    <div><span className="text-muted-foreground">Traitées :</span> <span className="font-semibold">{agent.completed}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════ MAIN TABS ═══════════════════ */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto h-auto flex-wrap gap-1 bg-muted/50 p-1.5 shadow-sm">
            <TabsTrigger value="supervision" className="gap-1.5 text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0B2E58] data-[state=active]:to-[#134A8E] data-[state=active]:text-white data-[state=active]:shadow-md">
              <Eye className="size-4" />
              Supervision ({serviceRequests.length})
            </TabsTrigger>
            <TabsTrigger value="approbations" className="gap-1.5 text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0B2E58] data-[state=active]:to-[#134A8E] data-[state=active]:text-white data-[state=active]:shadow-md">
              <Shield className="size-4" />
              Approbations ({approvalQueue.length})
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-1.5 text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0B2E58] data-[state=active]:to-[#134A8E] data-[state=active]:text-white data-[state=active]:shadow-md">
              <BarChart3 className="size-4" />
              Performance
            </TabsTrigger>
          </TabsList>

          {/* ─── SUPERVISION TAB ─── */}
          <TabsContent value="supervision">
            <div className="mt-4 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher par référence, nom, service..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 glass-input focus-ring-premium" />
              </div>

              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredRequests.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Card className="glass-premium">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                          <FileText className="size-12 text-muted-foreground/30 mb-3" />
                          <p className="text-muted-foreground font-medium">Aucune demande pour votre service</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ) : (
                    filteredRequests.map((req, i) => {
                      const sConfig = STATUS_CONFIG[req.status]
                      const SIcon = sConfig.icon
                      return (
                        <motion.div key={req.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.03 }} layout>
                          <Card className="card-interactive overflow-hidden">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <Avatar className="size-10 ring-2 ring-white/50 dark:ring-white/10">
                                    <AvatarFallback className={`${sConfig.color} text-xs font-bold`}>{req.citizenFirstName[0]}{req.citizenName[0]}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-semibold text-sm">{req.citizenFirstName} {req.citizenName}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{req.reference}</p>
                                  </div>
                                </div>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium backdrop-blur-sm ${sConfig.color} border border-current/10`}>
                                  <SIcon className="size-3" />{sConfig.label}
                                </span>
                              </div>
                              <div className="ml-13 pl-13 space-y-1">
                                <p className="text-sm font-medium">{req.serviceName}</p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1"><Calendar className="size-3" />{new Date(req.createdAt).toLocaleDateString('fr-FR')}</span>
                                  {req.assignedAgent && <span className="flex items-center gap-1"><UserCheck className="size-3" />{req.assignedAgent}</span>}
                                </div>
                              </div>
                              {/* Actions */}
                              <div className="mt-3 flex flex-wrap gap-2">
                                {req.status === 'soumise' && (
                                  <>
                                    <Button size="sm" className="btn-premium gap-1 h-7 text-xs" onClick={() => handleTakeCharge(req)}><Play className="size-3" />Prendre en charge</Button>
                                    <Select onValueChange={(val) => handleAssign(req, val)}>
                                      <SelectTrigger className="h-7 w-[180px] text-xs"><SelectValue placeholder="Assigner à..." /></SelectTrigger>
                                      <SelectContent>
                                        {TEAM_AGENTS.filter(a => a.status === 'En service').map(a => (
                                          <SelectItem key={a.name} value={a.name}>{a.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </>
                                )}
                                {req.status === 'en_cours' && (
                                  <>
                                    <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-emerald-700 text-white gap-1 h-7 text-xs hover:from-emerald-600 hover:to-emerald-800 shadow-md" onClick={() => handleApprove(req)}><Check className="size-3" />Approuver</Button>
                                    <Button size="sm" variant="destructive" className="gap-1 h-7 text-xs" onClick={() => handleReject(req)}><XCircle className="size-3" />Rejeter</Button>
                                  </>
                                )}
                                {req.status === 'validee' && (
                                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs gap-1"><CheckCircle2 className="size-3" />Approuvée</Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>
          </TabsContent>

          {/* ─── APPROBATIONS TAB ─── */}
          <TabsContent value="approbations">
            <div className="mt-4 space-y-4">
              {approvalQueue.length === 0 ? (
                <Card className="glass-premium">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <CheckCircle2 className="size-12 text-emerald-400/50 mb-3" />
                    <p className="text-muted-foreground font-medium">Aucune demande en attente d&apos;approbation</p>
                    <p className="text-xs text-muted-foreground mt-1">Toutes les demandes en cours ont été traitées</p>
                  </CardContent>
                </Card>
              ) : (
                approvalQueue.map((req, i) => {
                  const sConfig = STATUS_CONFIG[req.status]
                  return (
                    <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card className="card-interactive overflow-hidden border-l-4 border-l-amber-400">
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Avatar className="size-10 ring-2 ring-amber-300/50">
                                <AvatarFallback className={`${sConfig.color} text-xs font-bold`}>{req.citizenFirstName[0]}{req.citizenName[0]}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">{req.citizenFirstName} {req.citizenName}</p>
                                <p className="text-xs text-muted-foreground font-mono">{req.reference} • {req.serviceName}</p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                  <span className="flex items-center gap-1"><Calendar className="size-3" />{new Date(req.createdAt).toLocaleDateString('fr-FR')}</span>
                                  {req.assignedAgent && <span className="flex items-center gap-1"><UserCheck className="size-3" />{req.assignedAgent}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-emerald-700 text-white gap-1 h-8 text-xs hover:from-emerald-600 hover:to-emerald-800 shadow-md" onClick={() => handleApprove(req)}>
                                <Check className="size-3.5" />Approuver
                              </Button>
                              <Button size="sm" variant="destructive" className="gap-1 h-8 text-xs" onClick={() => handleReject(req)}>
                                <XCircle className="size-3.5" />Rejeter
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })
              )}
            </div>
          </TabsContent>

          {/* ─── PERFORMANCE TAB ─── */}
          <TabsContent value="performance">
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status Distribution */}
              <Card className="card-premium overflow-hidden">
                <div className="h-[2px] bg-gradient-to-r from-[#0B2E58] via-[#3B7DD8] to-[#C8A45C]" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white flex items-center gap-2">
                    <ClipboardCheck className="size-4 text-[#C8A45C]" />
                    Répartition par statut
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(['soumise', 'en_cours', 'pieces_complementaires', 'validee', 'prete', 'livree', 'rejetee'] as RequestStatus[]).map(status => {
                    const count = serviceRequests.filter(r => r.status === status).length
                    const pct = serviceRequests.length > 0 ? Math.round((count / serviceRequests.length) * 100) : 0
                    const cfg = STATUS_CONFIG[status]
                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-medium"><cfg.icon className="size-3" />{cfg.label}</span>
                          <span className="tabular-nums text-muted-foreground">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#0B2E58] to-[#3B7DD8] transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* Team Performance */}
              <Card className="card-premium overflow-hidden">
                <div className="h-[2px] bg-gradient-to-r from-[#0B2E58] via-[#3B7DD8] to-[#C8A45C]" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white flex items-center gap-2">
                    <TrendingUp className="size-4 text-[#C8A45C]" />
                    Performance de l&apos;équipe
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {TEAM_AGENTS.map(agent => {
                    const total = agent.active + agent.completed
                    const completionRate = total > 0 ? Math.round((agent.completed / total) * 100) : 0
                    return (
                      <div key={agent.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium flex items-center gap-1.5">
                            <Avatar className="size-5"><AvatarFallback className="bg-gradient-to-br from-cyan-500 to-cyan-700 text-white text-[8px]">{agent.initials}</AvatarFallback></Avatar>
                            {agent.name}
                          </span>
                          <span className="tabular-nums text-muted-foreground">{completionRate}% traitées</span>
                        </div>
                        <Progress value={completionRate} className="h-1.5" />
                      </div>
                    )
                  })}
                  <Separator />
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="font-semibold text-[#0B2E58] dark:text-white">Total demandes traitées</span>
                    <span className="font-bold tabular-nums text-[#0B2E58] dark:text-[#C8A45C]">{serviceRequests.filter(r => ['validee', 'prete', 'livree'].includes(r.status)).length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ═══════════════════ QUICK NAVIGATION ═══════════════════ */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { label: 'Workflow', icon: GitBranch, page: 'workflow' as const, gradient: 'from-violet-500 to-violet-700' },
            { label: 'Courriers', icon: Mail, page: 'courriers' as const, gradient: 'from-amber-500 to-amber-700' },
            { label: 'GED', icon: FileText, page: 'ged' as const, gradient: 'from-emerald-500 to-emerald-700' },
            { label: 'Utilisateurs', icon: Users, page: 'users' as const, gradient: 'from-sky-500 to-sky-700' },
            { label: 'Analytique', icon: BarChart3, page: 'analytics' as const, gradient: 'from-[#0B2E58] to-[#134A8E]' },
          ].map(nav => (
            <Card key={nav.label} className="card-interactive cursor-pointer group" onClick={() => navigate(nav.page)}>
              <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${nav.gradient} shadow-sm group-hover:shadow-md transition-shadow`}>
                  <nav.icon className="size-5 text-white" />
                </div>
                <p className="text-xs font-medium">{nav.label}</p>
                <ArrowRight className="size-3 text-muted-foreground group-hover:text-[#0B2E58] dark:group-hover:text-[#C8A45C] transition-colors" />
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* ─── SUCCESS TOAST ─── */}
      <AnimatePresence>
        {successToast && (
          <motion.div initial={{ opacity: 0, y: 40, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 40, x: '-50%' }} className="fixed bottom-6 left-1/2 z-50 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0B2E58] to-[#134A8E] text-white text-sm font-medium shadow-premium-lg flex items-center gap-2">
            <CheckCircle2 className="size-4 text-[#C8A45C]" />{successToast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
