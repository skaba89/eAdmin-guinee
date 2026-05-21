'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, Brain, Zap, Clock, CheckCircle2, XCircle, AlertTriangle,
  Settings, Play, Pause, Activity, Shield, Sparkles,
  TrendingUp, Eye, Send, FileText, Cpu, Gauge,
  RefreshCw, Trash2, Timer, Target, CircleDot, FlaskConical,
  Wifi, WifiOff, Loader2, UserCheck, ArrowUpRight,
  HeartPulse, BarChart3, ListOrdered, ChevronDown,
  Info, Layers, RotateCcw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useCitizenRequestsStore } from '@/store/citizen-requests-store'
import { useAIAgentStore, type AIAgentLog, type EscalationItem } from '@/store/ai-agent-store'
import { useAppStore } from '@/store/app-store'
import { filterRequestsByRLS, getRLSScopeDescription } from '@/lib/rbac'

// ─── GUINEA BRAND COLORS ─────────────────────────────────────────────────────
const GUINEA_RED = '#CE1126'
const GUINEA_YELLOW = '#FCD116'
const GUINEA_GREEN = '#009460'

const AI_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  none: { label: 'Non traité', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400', icon: CircleDot },
  ai_pending: { label: 'En attente IA', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400', icon: Clock },
  ai_processing: { label: 'Traitement IA', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Cpu },
  ai_completed: { label: 'Traitée IA', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  ai_failed: { label: 'Échec IA', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  ai_auto_validated: { label: 'Validée IA', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  ai_auto_rejected: { label: 'Rejetée IA', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertTriangle },
  ai_assisted: { label: 'Assistée IA', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Eye },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

export function AIAgentPage() {
  const user = useAppStore((s) => s.user)
  const { requests: allRequests, aiAutoProcess } = useCitizenRequestsStore()

  // ─── RLS: Filter requests based on user's role ────────────────────────────
  const requests = filterRequestsByRLS(allRequests, user)
  const rlsScope = getRLSScopeDescription(user)

  const {
    isEnabled, isProcessing, realAIMode, autoProcessDelay, processingQueue, logs, stats,
    confidenceThreshold, toggleEnabled, toggleRealAIMode, setAutoProcessDelay,
    setConfidenceThreshold, processAllQueued, clearLogs, computeStats, testAI,
    isTestingAI, lastTestResult,
    // Auto-processing
    isAutoProcessing, autoProcessCount, lastAutoProcessTime,
    startAutoProcessing, stopAutoProcessing, toggleAutoProcessing,
    processNewRequests,
    // Escalation
    escalationQueue, resolveEscalation, clearEscalationQueue,
    // Service rules
    serviceRulesEnabled, toggleServiceRules,
    // New Phase 4 features
    isHealthy, lastHeartbeat, checkHealth,
    processingPriority, setProcessingPriority,
    hourlyStats, getHourlyStats,
    maxRetries, retryAttempts,
    verifyNIN, detectDuplicates,
  } = useAIAgentStore()

  const [activeTab, setActiveTab] = useState('dashboard')
  const [successToast, setSuccessToast] = useState('')
  const [testResultDisplay, setTestResultDisplay] = useState<string | null>(lastTestResult)
  const [escalationNote, setEscalationNote] = useState<Record<string, string>>({})
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [ninInput, setNinInput] = useState('')
  const [ninResult, setNinResult] = useState<{ valid: boolean; details: string } | null>(null)

  // Compute stats on mount and when requests change
  useEffect(() => {
    computeStats()
  }, [requests, computeStats])

  // Auto-init AI agent on first load
  useEffect(() => {
    const { initAutoProcessing } = useAIAgentStore.getState()
    initAutoProcessing()
  }, [])

  // Health check interval
  useEffect(() => {
    const interval = setInterval(() => {
      checkHealth()
    }, 10000)
    return () => clearInterval(interval)
  }, [checkHealth])

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  // Pending requests for AI processing
  const pendingAIRequests = requests.filter(r =>
    (r.status === 'soumise' || r.status === 'en_cours') &&
    (r.aiProcessingStatus === 'none' || r.aiProcessingStatus === undefined || r.aiProcessingStatus === 'ai_pending')
  )

  // AI-processed requests
  const aiProcessedRequests = requests.filter(r =>
    r.aiProcessingStatus && r.aiProcessingStatus !== 'none' && r.aiProcessingStatus !== 'ai_pending'
  )

  const handleProcessOne = (id: string) => {
    if (realAIMode) {
      useAIAgentStore.getState().addToQueue(id)
      useAIAgentStore.getState().processNext()
    } else {
      aiAutoProcess(id)
      setSuccessToast('Demande traitée par l\'Agent IA (simulé)')
    }
  }

  const handleProcessAll = () => {
    processAllQueued()
    setSuccessToast(`${pendingAIRequests.length} demande(s) traitée(s) par l'Agent IA${realAIMode ? ' réel' : ' (simulé)'}`)
  }

  const handleTestAI = async () => {
    const result = await testAI()
    setTestResultDisplay(result)
  }

  const handleResolveEscalation = (
    escalationId: string,
    action: 'approve' | 'reject' | 'request_docs',
  ) => {
    const note = escalationNote[escalationId]
    resolveEscalation(escalationId, action, note)
    setEscalationNote(prev => {
      const next = { ...prev }
      delete next[escalationId]
      return next
    })
    const actionLabel = action === 'approve' ? 'Approuvée' : action === 'reject' ? 'Rejetée' : 'Documents complémentaires demandés'
    setSuccessToast(`Escalade résolue — ${actionLabel}`)
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatTimestamp = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-emerald-600 dark:text-emerald-400'
    if (confidence >= 70) return 'text-amber-600 dark:text-amber-400'
    if (confidence >= 50) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getConfidenceBarColor = (confidence: number) => {
    if (confidence >= 85) return 'bg-emerald-500'
    if (confidence >= 70) return 'bg-amber-500'
    if (confidence >= 50) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-4 md:p-6"
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="glass-card overflow-hidden border-[#C8A45C]/20 dark:border-[#D4B878]/20 bg-gradient-to-br from-[#0B2E58] via-[#0B2E58]/95 to-[#134A8E] dark:from-[#0B2E58] dark:via-[#071D3A] dark:to-[#0B2E58]">
          <CardContent className="p-6 md:p-8 text-white relative">
            {/* Guinea tricolor accent */}
            <div className="flex gap-0 mb-4 -mx-6 md:-mx-8 -mt-6 md:-mt-8">
              <div className="flex-1 h-1.5" style={{ backgroundColor: GUINEA_RED }} />
              <div className="flex-1 h-1.5" style={{ backgroundColor: GUINEA_YELLOW }} />
              <div className="flex-1 h-1.5" style={{ backgroundColor: GUINEA_GREEN }} />
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm shadow-xl border border-white/20 relative">
                <Bot className="size-7 text-white" />
                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 border-2 border-[#0B2E58] flex items-center justify-center">
                  <Zap className="size-2 text-[#0B2E58]" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest text-white/60 font-medium">Intelligence Artificielle</p>
                <h2 className="text-2xl font-bold mt-0.5">Agent IA Autonome</h2>
                <p className="text-sm text-white/70 mt-1 max-w-xl">
                  Traitement automatique des demandes administratives — Vérification des documents, validation et orientation intelligente
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {/* Real AI Mode Toggle */}
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
                  <div className="flex items-center gap-2">
                    {realAIMode ? (
                      <Wifi className="size-3.5 text-emerald-400" />
                    ) : (
                      <WifiOff className="size-3.5 text-white/50" />
                    )}
                    <span className="text-sm font-medium">{realAIMode ? 'IA Réelle' : 'Simulation'}</span>
                  </div>
                  <Switch
                    checked={realAIMode}
                    onCheckedChange={toggleRealAIMode}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
                {/* Main Toggle */}
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
                  <div className="flex items-center gap-2">
                    {isEnabled ? (
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    ) : (
                      <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    )}
                    <span className="text-sm font-medium">{isEnabled ? 'Actif' : 'Inactif'}</span>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={toggleEnabled}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
                <div className="flex gap-2">
                  <Badge className={`${realAIMode ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'} text-xs gap-1.5 justify-center flex-1`}>
                    {realAIMode ? <Wifi className="size-3" /> : <Cpu className="size-3" />}
                    {realAIMode ? 'IA Réelle' : 'Simulé'}
                  </Badge>
                  <Badge className={`${isEnabled ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'} text-xs gap-1.5 justify-center flex-1`}>
                    <Activity className="size-3" />
                    {isEnabled ? 'Opérationnel' : 'En pause'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ENHANCED STATS CARDS (now 6 cards)
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Demandes traitées', value: stats.totalProcessed, icon: Brain, color: 'text-[#0B2E58] dark:text-[#3B7DD8]', bg: 'bg-[#0B2E58]/10 dark:bg-[#3B7DD8]/20' },
            { label: 'Taux de validation', value: `${stats.successRate}%`, icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'Temps moyen', value: formatTime(stats.avgProcessingTime), icon: Timer, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { label: 'Auto-traitées', value: stats.autoProcessedCount, icon: Zap, color: 'text-[#009460] dark:text-[#009460]', bg: 'bg-[#009460]/10 dark:bg-[#009460]/20' },
            { label: 'Escalades', value: stats.escalated, icon: ArrowUpRight, color: 'text-[#CE1126] dark:text-[#CE1126]', bg: 'bg-[#CE1126]/10 dark:bg-[#CE1126]/20' },
            { label: 'En attente', value: stats.pendingCount, icon: Clock, color: 'text-[#C8A45C] dark:text-[#D4B878]', bg: 'bg-[#C8A45C]/10 dark:bg-[#D4B878]/20' },
          ].map((stat) => (
            <Card key={stat.label} className="shadow-sm border-[#0B2E58]/5 dark:border-[#3B7DD8]/10">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="size-5" />
                </div>
                <div>
                  <p className="text-xl font-bold text-[#0B2E58] dark:text-white">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          PROCESSING BREAKDOWN (4 cards now with escalations)
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-emerald-200 dark:border-emerald-800/40">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium text-muted-foreground">Validées auto.</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.autoValidated}</p>
            </CardContent>
          </Card>
          <Card className="border-orange-200 dark:border-orange-800/40">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertTriangle className="size-4 text-orange-600 dark:text-orange-400" />
                <span className="text-xs font-medium text-muted-foreground">Rejetées auto.</span>
              </div>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.autoRejected}</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 dark:border-blue-800/40">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Eye className="size-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-muted-foreground">Assistées</span>
              </div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.assistedReview}</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 dark:border-red-800/40">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <ArrowUpRight className="size-4 text-[#CE1126] dark:text-red-400" />
                <span className="text-xs font-medium text-muted-foreground">Escalades</span>
              </div>
              <p className="text-2xl font-bold text-[#CE1126] dark:text-red-400">{stats.escalated}</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          HEALTH & HOURLY STATS ROW
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Health Card */}
          <Card className={`border-2 ${isHealthy ? 'border-emerald-200 dark:border-emerald-800/40' : 'border-red-200 dark:border-red-800/40'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-xl ${isHealthy ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  <HeartPulse className={`size-5 ${isHealthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
                </div>
                <div>
                  <p className="font-semibold text-sm">Santé de l&apos;Agent IA</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className={`text-[8px] px-1.5 py-0 h-4 ${isHealthy ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30'}`}>
                      {isHealthy ? 'En bonne santé' : 'Problème détecté'}
                    </Badge>
                    {isAutoProcessing && (
                      <Badge className="text-[8px] px-1.5 py-0 h-4 bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse mr-1" />
                        Boucle active
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-muted/30 text-center">
                  <p className="text-[10px] text-muted-foreground">Dernier battement</p>
                  <p className="text-xs font-semibold">{lastHeartbeat ? new Date(lastHeartbeat).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/30 text-center">
                  <p className="text-[10px] text-muted-foreground">Prochain cycle</p>
                  <p className="text-xs font-semibold">{isAutoProcessing ? `~${autoProcessDelay}s` : 'Arrêté'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hourly Stats Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-[#0B2E58]/10 dark:bg-[#3B7DD8]/20">
                  <BarChart3 className="size-5 text-[#0B2E58] dark:text-[#3B7DD8]" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Statistiques horaires</p>
                  <p className="text-[10px] text-muted-foreground">Activité des 6 dernières heures</p>
                </div>
              </div>
              {(() => {
                const recentStats = getHourlyStats(6)
                const hours = Object.keys(recentStats).sort().slice(-6)
                if (hours.length === 0) {
                  return <p className="text-xs text-muted-foreground text-center py-4">Aucune donnée horaire disponible</p>
                }
                const maxVal = Math.max(...hours.map(h => recentStats[h].processed), 1)
                return (
                  <div className="flex items-end gap-1 h-20">
                    {hours.map(hour => {
                      const s = recentStats[hour]
                      const pct = (s.processed / maxVal) * 100
                      const label = hour.split('T')[1]?.substring(0, 2) || hour.slice(-2)
                      return (
                        <div key={hour} className="flex-1 flex flex-col items-center gap-0.5">
                          <div className="w-full flex flex-col gap-px" style={{ height: '60px' }}>
                            <div className="flex-1" />
                            <div className="bg-emerald-400 rounded-t w-full transition-all" style={{ height: `${(s.approved / maxVal) * 60}px` }} title={`Approuvées: ${s.approved}`} />
                            <div className="bg-orange-400 w-full transition-all" style={{ height: `${(s.rejected / maxVal) * 60}px` }} title={`Rejetées: ${s.rejected}`} />
                            <div className="bg-red-400 rounded-b w-full transition-all" style={{ height: `${(s.escalated / maxVal) * 60}px` }} title={`Escaladées: ${s.escalated}`} />
                          </div>
                          <span className="text-[8px] text-muted-foreground">{label}h</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
              <div className="flex items-center justify-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-[8px] text-muted-foreground"><div className="h-2 w-2 rounded-sm bg-emerald-400" />Approuvées</span>
                <span className="flex items-center gap-1 text-[8px] text-muted-foreground"><div className="h-2 w-2 rounded-sm bg-orange-400" />Rejetées</span>
                <span className="flex items-center gap-1 text-[8px] text-muted-foreground"><div className="h-2 w-2 rounded-sm bg-red-400" />Escaladées</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TABS (6 tabs now - added Monitoring)
      ═══════════════════════════════════════════════════════════════════════ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto h-auto flex-wrap gap-1 bg-muted/50 p-1.5">
          <TabsTrigger value="dashboard" className="gap-1.5 text-sm data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
            <Activity className="size-4" />
            Tableau de bord
          </TabsTrigger>
          <TabsTrigger value="queue" className="gap-1.5 text-sm data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
            <Clock className="size-4" />
            File d&apos;attente ({pendingAIRequests.length})
          </TabsTrigger>
          <TabsTrigger value="escalations" className="gap-1.5 text-sm data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
            <ArrowUpRight className="size-4" />
            Escalades ({escalationQueue.length})
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 text-sm data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
            <FileText className="size-4" />
            Journal ({logs.length})
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-1.5 text-sm data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
            <Layers className="size-4" />
            Outils IA
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 text-sm data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
            <Settings className="size-4" />
            Configuration
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════
            DASHBOARD TAB
        ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="dashboard" className="mt-4 space-y-4">
          {/* ── Auto-Processing Status Card ────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <Card className={`border-2 transition-colors ${isAutoProcessing ? 'border-emerald-300 dark:border-emerald-700' : 'border-[#0B2E58]/10 dark:border-[#3B7DD8]/20'}`}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isAutoProcessing ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-[#0B2E58]/10 dark:bg-[#3B7DD8]/20'}`}>
                      {isAutoProcessing ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                        >
                          <RefreshCw className="size-5 text-emerald-600 dark:text-emerald-400" />
                        </motion.div>
                      ) : (
                        <Gauge className="size-5 text-[#0B2E58] dark:text-[#3B7DD8]" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">Traitement Autonome</p>
                        <Badge className={`text-[8px] px-1.5 py-0 h-4 ${isAutoProcessing ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' : 'bg-gray-100 text-gray-500 dark:bg-gray-800/30 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}>
                          {isAutoProcessing ? 'En cours' : 'Arrêté'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isAutoProcessing
                          ? `Cycle automatique actif — Intervalle: ${autoProcessDelay}s`
                          : 'Lancez le traitement autonome pour traiter les demandes automatiquement'
                        }
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={toggleAutoProcessing}
                    disabled={!isEnabled}
                    className={`gap-1.5 ${isAutoProcessing
                      ? 'bg-[#CE1126] hover:bg-[#CE1126]/90 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isAutoProcessing ? (
                      <>
                        <Pause className="size-4" />
                        Arrêter
                      </>
                    ) : (
                      <>
                        <Play className="size-4" />
                        Démarrer
                      </>
                    )}
                  </Button>
                </div>

                {/* Auto-processing stats row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Zap className="size-3 text-[#009460]" />
                      <span className="text-[10px] text-muted-foreground font-medium">Traitées</span>
                    </div>
                    <p className="text-lg font-bold text-[#0B2E58] dark:text-white">{autoProcessCount}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Clock className="size-3 text-amber-500" />
                      <span className="text-[10px] text-muted-foreground font-medium">Dernier cycle</span>
                    </div>
                    <p className="text-sm font-bold text-[#0B2E58] dark:text-white">
                      {lastAutoProcessTime
                        ? new Date(lastAutoProcessTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : '—'
                      }
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Timer className="size-3 text-[#C8A45C]" />
                      <span className="text-[10px] text-muted-foreground font-medium">Intervalle</span>
                    </div>
                    <p className="text-lg font-bold text-[#0B2E58] dark:text-white">{autoProcessDelay}s</p>
                  </div>
                </div>

                {/* Live pulse indicator */}
                <AnimatePresence>
                  {isAutoProcessing && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3"
                    >
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                          Traitement autonome actif — prochaine vérification dans {autoProcessDelay}s
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Batch Processing + Test AI ─────────────────────────────────── */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#0B2E58]/10 dark:bg-[#3B7DD8]/20">
                    <Zap className="size-5 text-[#0B2E58] dark:text-[#3B7DD8]" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Traitement par lots</p>
                    <p className="text-xs text-muted-foreground">{pendingAIRequests.length} demande(s) en attente de traitement IA ({realAIMode ? 'IA réelle' : 'simulation'})</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleTestAI}
                    disabled={isTestingAI}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-[#0B2E58]/20 dark:border-[#3B7DD8]/20"
                  >
                    {isTestingAI ? <Loader2 className="size-3.5 animate-spin" /> : <FlaskConical className="size-3.5" />}
                    Tester l&apos;IA
                  </Button>
                  <Button
                    onClick={handleProcessAll}
                    disabled={pendingAIRequests.length === 0 || !isEnabled}
                    className="bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-[#3B7DD8] dark:hover:bg-[#3B7DD8]/90 text-white gap-1.5"
                  >
                    <Play className="size-4" />
                    Traire tout par IA
                  </Button>
                </div>
              </div>

              {/* Test result display */}
              <AnimatePresence>
                {testResultDisplay && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3"
                  >
                    <div className={`p-3 rounded-lg text-sm ${testResultDisplay.startsWith('✅') ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40'}`}>
                      {testResultDisplay}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* ── Recent AI processed requests ───────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Demandes récentes traitées par l&apos;IA</CardTitle>
              <CardDescription className="text-xs">Les dernières demandes traitées automatiquement</CardDescription>
            </CardHeader>
            <CardContent>
              {aiProcessedRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Brain className="size-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Aucune demande traitée par l&apos;IA</p>
                  <p className="text-xs text-muted-foreground mt-1">Utilisez le bouton ci-dessus pour lancer le traitement</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {aiProcessedRequests.slice(0, 20).map((req) => {
                    const aiConfig = AI_STATUS_CONFIG[req.aiProcessingStatus || 'none']
                    const AiIcon = aiConfig.icon
                    return (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className={`p-2 rounded-lg ${aiConfig.color}`}>
                          <AiIcon className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-mono text-muted-foreground">{req.reference}</p>
                            <Badge className={`text-[8px] px-1.5 py-0 h-4 ${aiConfig.color}`}>
                              {aiConfig.label}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium truncate">{req.serviceName}</p>
                          <p className="text-xs text-muted-foreground">{req.citizenFirstName} {req.citizenName}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {req.aiConfidence !== undefined && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${getConfidenceBarColor(req.aiConfidence)}`}
                                  style={{ width: `${req.aiConfidence}%` }}
                                />
                              </div>
                              <span className={`text-xs font-semibold ${getConfidenceColor(req.aiConfidence)}`}>
                                {req.aiConfidence}%
                              </span>
                            </div>
                          )}
                          {req.aiProcessingDate && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {new Date(req.aiProcessingDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── AI Performance Chart ───────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Performance de l&apos;Agent IA</CardTitle>
              <CardDescription className="text-xs">Répartition des résultats de traitement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: 'Validées automatiquement', count: stats.autoValidated, icon: CheckCircle2, color: 'text-emerald-500', barColor: 'bg-emerald-500' },
                  { label: 'Rejetées automatiquement', count: stats.autoRejected, icon: AlertTriangle, color: 'text-orange-500', barColor: 'bg-orange-500' },
                  { label: 'Assistées (révision humaine)', count: stats.assistedReview, icon: Eye, color: 'text-blue-500', barColor: 'bg-blue-500' },
                  { label: 'Escalades', count: stats.escalated, icon: ArrowUpRight, color: 'text-[#CE1126]', barColor: 'bg-[#CE1126]' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5">
                        <item.icon className={`size-3 ${item.color}`} />
                        {item.label}
                      </span>
                      <span className="font-semibold">{item.count} ({stats.totalProcessed > 0 ? Math.round(item.count / stats.totalProcessed * 100) : 0}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${item.barColor} transition-all`} style={{ width: `${stats.totalProcessed > 0 ? (item.count / stats.totalProcessed * 100) : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            QUEUE TAB
        ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="queue" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-medium">{pendingAIRequests.length} demande(s) en attente</span>
                  <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4">
                    {realAIMode ? 'IA Réelle' : 'Simulation'}
                  </Badge>
                </div>
                <Button
                  onClick={handleProcessAll}
                  disabled={pendingAIRequests.length === 0 || !isEnabled}
                  size="sm"
                  className="bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-[#3B7DD8] dark:hover:bg-[#3B7DD8]/90 text-white gap-1"
                >
                  {isProcessing ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                  Traire tout par IA
                </Button>
              </div>

              {pendingAIRequests.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="size-12 text-emerald-400/30 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Aucune demande en attente</p>
                  <p className="text-xs text-muted-foreground mt-1">Toutes les demandes ont été traitées par l&apos;Agent IA</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {pendingAIRequests.map((req, i) => (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/30">
                        <Send className="size-4 text-sky-600 dark:text-sky-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-mono text-muted-foreground">{req.reference}</p>
                          <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4">{req.category}</Badge>
                        </div>
                        <p className="text-sm font-medium truncate">{req.serviceName}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{req.citizenFirstName} {req.citizenName}</span>
                          <span>•</span>
                          <span>{req.documents.length} doc(s) requis</span>
                          <span>•</span>
                          <span>{req.attachedFiles.length} fichier(s) joint(s)</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleProcessOne(req.id)}
                        disabled={!isEnabled}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 h-7 text-xs shrink-0"
                      >
                        <Bot className="size-3" />
                        Traiter par IA
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            ESCALATIONS TAB (NEW)
        ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="escalations" className="mt-4 space-y-4">
          <Card className="border-[#CE1126]/20 dark:border-red-800/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="size-5 text-[#CE1126]" />
                  <div>
                    <CardTitle className="text-sm font-semibold">File d&apos;escalades — Révision humaine requise</CardTitle>
                    <CardDescription className="text-xs">
                      {escalationQueue.length > 0
                        ? `${escalationQueue.length} demande(s) nécessitent une révision humaine`
                        : 'Aucune escalade en attente'
                      }
                    </CardDescription>
                  </div>
                </div>
                {escalationQueue.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearEscalationQueue}
                    className="text-muted-foreground hover:text-red-600 gap-1 text-xs"
                  >
                    <Trash2 className="size-3" />
                    Vider
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {escalationQueue.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="size-12 text-emerald-400/30 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Aucune escalade en attente</p>
                  <p className="text-xs text-muted-foreground mt-1">Les demandes nécessitant une révision humaine apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  <AnimatePresence>
                    {escalationQueue.map((item, i) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100, height: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="p-4 rounded-lg border border-[#CE1126]/20 dark:border-red-800/30 bg-red-50/30 dark:bg-red-900/10 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        {/* Header row */}
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-[#CE1126]/10 dark:bg-red-900/30 shrink-0">
                            <ArrowUpRight className="size-4 text-[#CE1126] dark:text-red-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-mono text-muted-foreground">{item.reference}</p>
                              <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4">{item.category}</Badge>
                              <Badge className="text-[8px] px-1.5 py-0 h-4 bg-[#CE1126]/10 text-[#CE1126] dark:bg-red-900/30 dark:text-red-400 border-[#CE1126]/20 dark:border-red-800/30">
                                Escalade
                              </Badge>
                            </div>
                            <p className="text-sm font-medium mt-0.5">{item.serviceName}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1">
                                <UserCheck className="size-3" />
                                {item.citizenName}
                              </span>
                              <span>•</span>
                              <span>Confiance: <span className={`font-semibold ${getConfidenceColor(item.confidence)}`}>{item.confidence}%</span></span>
                            </div>
                            <div className="flex items-start gap-1.5 mt-2">
                              <AlertTriangle className="size-3 text-amber-500 shrink-0 mt-0.5" />
                              <p className="text-xs text-muted-foreground">{item.reason}</p>
                            </div>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">
                              {formatTimestamp(item.timestamp)}
                            </p>
                          </div>
                        </div>

                        {/* Resolution note input */}
                        <div className="mt-3 ml-9">
                          <input
                            type="text"
                            placeholder="Note optionnelle pour la résolution..."
                            value={escalationNote[item.id] || ''}
                            onChange={(e) => setEscalationNote(prev => ({ ...prev, [item.id]: e.target.value }))}
                            className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background/50 focus:outline-none focus:ring-1 focus:ring-[#0B2E58] dark:focus:ring-[#3B7DD8] transition-colors"
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 mt-3 ml-9">
                          <Button
                            size="sm"
                            onClick={() => handleResolveEscalation(item.id, 'approve')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 h-7 text-xs"
                          >
                            <CheckCircle2 className="size-3" />
                            Approuver
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleResolveEscalation(item.id, 'reject')}
                            variant="destructive"
                            className="gap-1 h-7 text-xs"
                          >
                            <XCircle className="size-3" />
                            Rejeter
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleResolveEscalation(item.id, 'request_docs')}
                            variant="outline"
                            className="gap-1 h-7 text-xs border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                          >
                            <FileText className="size-3" />
                            Demander docs
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            LOGS TAB
        ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="logs" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Journal d&apos;activité de l&apos;Agent IA</CardTitle>
                  <CardDescription className="text-xs">Historique des actions effectuées par l&apos;agent</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearLogs}
                  className="text-muted-foreground hover:text-red-600 gap-1 text-xs"
                >
                  <Trash2 className="size-3" />
                  Effacer
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="size-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Aucune activité enregistrée</p>
                  <p className="text-xs text-muted-foreground mt-1">Les actions de l&apos;Agent IA apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {logs.map((log, i) => {
                    const resultConfig = {
                      success: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/10', icon: CheckCircle2 },
                      warning: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/10', icon: AlertTriangle },
                      error: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/10', icon: XCircle },
                      escalade: { color: 'text-[#CE1126] dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/10', icon: ArrowUpRight },
                    }[log.result] ?? { color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900/10', icon: CircleDot }
                    const ResultIcon = resultConfig.icon
                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className={`p-3 rounded-lg border ${resultConfig.bg} border-current/10`}
                      >
                        <div className="flex items-start gap-3">
                          <ResultIcon className={`size-4 shrink-0 mt-0.5 ${resultConfig.color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium">{log.action}</p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${getConfidenceBarColor(log.confidence)}`}
                                    style={{ width: `${log.confidence}%` }}
                                  />
                                </div>
                                <span className={`text-[10px] font-semibold ${getConfidenceColor(log.confidence)}`}>
                                  {log.confidence}%
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                              <span>{log.serviceName}</span>
                              <span>•</span>
                              <span>{log.citizenName}</span>
                              <span>•</span>
                              <span>{formatTime(log.processingTime)}</span>
                              {log.realAI && (
                                <>
                                  <span>•</span>
                                  <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[8px] px-1.5 py-0 h-4 gap-0.5">
                                    <Wifi className="size-2.5" />
                                    IA Réelle
                                  </Badge>
                                </>
                              )}
                              {log.autoProcessed && (
                                <>
                                  <span>•</span>
                                  <Badge className="bg-[#009460]/10 text-[#009460] dark:bg-[#009460]/20 dark:text-[#009460] text-[8px] px-1.5 py-0 h-4 gap-0.5 border-[#009460]/20">
                                    <Zap className="size-2.5" />
                                    Auto
                                  </Badge>
                                </>
                              )}
                              {log.result === 'escalade' && log.escalationReason && (
                                <>
                                  <span>•</span>
                                  <Badge className="bg-[#CE1126]/10 text-[#CE1126] dark:bg-red-900/20 dark:text-red-400 text-[8px] px-1.5 py-0 h-4 gap-0.5 border-[#CE1126]/20">
                                    <ArrowUpRight className="size-2.5" />
                                    {log.escalationReason}
                                  </Badge>
                                </>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{log.details}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">
                              {new Date(log.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TOOLS TAB (NIN Verification, Duplicate Detection, Retry)
        ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="tools" className="mt-4 space-y-4">
          {/* NIN Verification Tool */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="size-4 text-[#009460]" />
                Vérification NIN (Numéro d&apos;Identification National)
              </CardTitle>
              <CardDescription className="text-xs">Vérifiez la validité d&apos;un NIN guinéen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ninInput}
                  onChange={(e) => setNinInput(e.target.value)}
                  placeholder="Entrez un NIN (ex: GN-2000-123456)"
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#0B2E58]/30"
                />
                <Button
                  onClick={() => {
                    if (ninInput.trim()) {
                      const result = verifyNIN(ninInput.trim())
                      setNinResult(result)
                    }
                  }}
                  disabled={!ninInput.trim()}
                  className="bg-[#009460] hover:bg-[#009460]/90 text-white gap-1.5"
                >
                  <Shield className="size-4" />
                  Vérifier
                </Button>
              </div>
              {ninResult && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg text-sm ${ninResult.valid ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40'}`}
                >
                  <div className="flex items-center gap-2">
                    {ninResult.valid ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                    <span className="font-medium">{ninResult.valid ? 'NIN valide' : 'NIN invalide'}</span>
                  </div>
                  <p className="text-xs mt-1">{ninResult.details}</p>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Duplicate Detection Tool */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Layers className="size-4 text-amber-500" />
                Détection de doublons
              </CardTitle>
              <CardDescription className="text-xs">Détectez les demandes en double pour un même citoyen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingAIRequests.slice(0, 5).map((req) => {
                  const duplicates = detectDuplicates(req.id)
                  return (
                    <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-muted-foreground">{req.reference}</p>
                        <p className="text-sm font-medium truncate">{req.serviceName} — {req.citizenFirstName} {req.citizenName}</p>
                      </div>
                      <Badge className={`text-[8px] px-1.5 py-0 h-4 ${duplicates.length > 0 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'}`}>
                        {duplicates.length > 0 ? `${duplicates.length} doublon(s)` : 'Unique'}
                      </Badge>
                    </div>
                  )
                })}
                {pendingAIRequests.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Aucune demande en attente à vérifier</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Retry Failed Requests */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <RotateCcw className="size-4 text-[#0B2E58] dark:text-[#3B7DD8]" />
                Rejeu des échecs
              </CardTitle>
              <CardDescription className="text-xs">Relancez le traitement des demandes échouées (max {maxRetries} tentatives)</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const failedLogs = logs.filter(l => l.result === 'error')
                const retryable = failedLogs.filter(l => (retryAttempts[l.requestId] || 0) < maxRetries)
                return (
                  <div className="space-y-2">
                    {retryable.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Aucune demande échouée à rejouer</p>
                    ) : (
                      retryable.slice(0, 5).map((log) => (
                        <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-mono text-muted-foreground">{log.reference}</p>
                            <p className="text-sm font-medium truncate">{log.serviceName}</p>
                            <p className="text-xs text-red-500 truncate">{log.details}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="text-[8px] px-1.5 py-0 h-4 bg-amber-500/20 text-amber-700 border-amber-500/30">
                              Tentative {(retryAttempts[log.requestId] || 0) + 1}/{maxRetries}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-xs"
                              onClick={() => {
                                useAIAgentStore.getState().retryFailedRequest(log.requestId)
                                setSuccessToast('Rejeu lancé pour ' + log.reference)
                              }}
                            >
                              <RotateCcw className="size-3" />
                              Rejouer
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            SETTINGS TAB
        ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          {/* AI Mode Settings */}
          <Card className="border-[#0B2E58]/20 dark:border-[#3B7DD8]/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="size-4 text-[#C8A45C]" />
                Mode Intelligence Artificielle
              </CardTitle>
              <CardDescription className="text-xs">Choisir entre l&apos;IA réelle (z-ai-web-dev-sdk) et la simulation locale</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${realAIMode ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                    {realAIMode ? <Wifi className="size-5 text-emerald-600 dark:text-emerald-400" /> : <Cpu className="size-5 text-amber-600 dark:text-amber-400" />}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Mode IA Réelle</p>
                    <p className="text-xs text-muted-foreground">
                      {realAIMode
                        ? 'Utilise le modèle IA via z-ai-web-dev-sdk pour une analyse réelle des demandes'
                        : 'Utilise la simulation locale (règles prédéfinies) pour le traitement'
                      }
                    </p>
                  </div>
                </div>
                <Switch
                  checked={realAIMode}
                  onCheckedChange={toggleRealAIMode}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>

              {/* Service Rules Engine Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${serviceRulesEnabled ? 'bg-[#009460]/10 dark:bg-[#009460]/20' : 'bg-gray-100 dark:bg-gray-800/30'}`}>
                    <Shield className={`size-5 ${serviceRulesEnabled ? 'text-[#009460] dark:text-[#009460]' : 'text-gray-400 dark:text-gray-500'}`} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Moteur de règles de service</p>
                    <p className="text-xs text-muted-foreground">
                      {serviceRulesEnabled
                        ? 'Les règles métier guident les décisions de l\'IA selon le type de service'
                        : 'L\'IA prend les décisions sans les règles métier spécifiques'
                      }
                    </p>
                  </div>
                </div>
                <Switch
                  checked={serviceRulesEnabled}
                  onCheckedChange={toggleServiceRules}
                  className="data-[state=checked]:bg-[#009460]"
                />
              </div>

              {/* Test AI Connection */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#0B2E58]/10 dark:bg-[#3B7DD8]/20">
                    <FlaskConical className="size-5 text-[#0B2E58] dark:text-[#3B7DD8]" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Tester la connexion IA</p>
                    <p className="text-xs text-muted-foreground">Vérifier que le service IA est opérationnel</p>
                  </div>
                </div>
                <Button
                  onClick={handleTestAI}
                  disabled={isTestingAI}
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                >
                  {isTestingAI ? <Loader2 className="size-3.5 animate-spin" /> : <FlaskConical className="size-3.5" />}
                  Tester
                </Button>
              </div>

              {/* Test result */}
              <AnimatePresence>
                {testResultDisplay && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className={`p-3 rounded-lg text-sm ${testResultDisplay.startsWith('✅') ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40'}`}>
                      {testResultDisplay}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* General settings */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Paramètres généraux</CardTitle>
              <CardDescription className="text-xs">Configuration du comportement de l&apos;Agent IA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Agent IA Autonome</Label>
                  <p className="text-xs text-muted-foreground">Activer ou désactiver le traitement automatique des demandes</p>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={toggleEnabled}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>

              <Separator />

              {/* Processing Priority */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <ListOrdered className="size-3.5" />
                      Priorité de traitement
                    </Label>
                    <p className="text-xs text-muted-foreground">Ordre de traitement des demandes en attente</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { value: 'fifo', label: 'FIFO', desc: 'Premier arrivé, premier servi' },
                    { value: 'urgency', label: 'Urgence', desc: 'Services urgents d\'abord' },
                    { value: 'complexity', label: 'Simplicité', desc: 'Services simples d\'abord' },
                    { value: 'age', label: 'Ancienneté', desc: 'Plus anciennes d\'abord' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setProcessingPriority(option.value)}
                      className={`p-3 rounded-lg border text-left transition-all ${processingPriority === option.value
                        ? 'border-[#0B2E58] dark:border-[#3B7DD8] bg-[#0B2E58]/10 dark:bg-[#3B7DD8]/20'
                        : 'border-border hover:border-[#0B2E58]/30 dark:hover:border-[#3B7DD8]/30'
                      }`}
                    >
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className="text-[10px] text-muted-foreground">{option.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Max Retries */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Tentatives de rejeu</Label>
                  <p className="text-xs text-muted-foreground">Nombre maximal de tentatives en cas d&apos;échec ({maxRetries})</p>
                </div>
                <Badge variant="outline" className="text-xs">{maxRetries} max</Badge>
              </div>

              <Separator />

              {/* Confidence threshold */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Seuil de confiance</Label>
                    <p className="text-xs text-muted-foreground">Confiance minimale pour la validation automatique ({confidenceThreshold}%)</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{confidenceThreshold}%</Badge>
                </div>
                <Slider
                  value={[confidenceThreshold]}
                  onValueChange={([value]) => setConfidenceThreshold(value)}
                  min={30}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>30% — Plus agressif</span>
                  <span>100% — Plus prudent</span>
                </div>
              </div>

              <Separator />

              {/* Auto-processing delay */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Délai entre les cycles</Label>
                    <p className="text-xs text-muted-foreground">Temps d&apos;attente entre chaque cycle de traitement ({autoProcessDelay}s)</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{autoProcessDelay}s</Badge>
                </div>
                <Slider
                  value={[autoProcessDelay]}
                  onValueChange={([value]) => setAutoProcessDelay(value)}
                  min={5}
                  max={120}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>5s — Rapide</span>
                  <span>120s — Lent</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service category rules */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Règles par catégorie de service</CardTitle>
              <CardDescription className="text-xs">Configurer le comportement de l&apos;IA selon le type de service</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { category: 'État Civil', services: 'ec-1, ec-2, ec-5', rule: 'Validation automatique possible', autoLevel: 'Complète', color: 'bg-blue-500' },
                  { category: 'Justice & Légal', services: 'j-1, j-2, j-3', rule: 'Assistance IA, révision humaine', autoLevel: 'Partielle', color: 'bg-purple-500' },
                  { category: 'Identification', services: 'id-1, id-2, id-3', rule: 'Assistance IA, révision humaine requise', autoLevel: 'Assistée', color: 'bg-green-500' },
                  { category: 'Urbanisme', services: 'u-1, u-2, u-3', rule: 'Révision humaine obligatoire', autoLevel: 'Assistée', color: 'bg-orange-500' },
                  { category: 'Entreprise', services: 'e-1, e-2', rule: 'Assistance IA, révision humaine requise', autoLevel: 'Assistée', color: 'bg-teal-500' },
                  { category: 'Éducation', services: 'ed-1, ed-2, ed-3', rule: 'Validation automatique possible', autoLevel: 'Complète', color: 'bg-indigo-500' },
                  { category: 'Santé', services: 's-1, s-2', rule: 'Validation automatique possible', autoLevel: 'Complète', color: 'bg-red-500' },
                  { category: 'Résidence', services: 'r-1, r-2', rule: 'Validation automatique possible', autoLevel: 'Complète', color: 'bg-amber-500' },
                ].map((item) => (
                  <div key={item.category} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className={`h-2 w-2 rounded-full ${item.color} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{item.category}</p>
                        <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4">{item.autoLevel}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.rule}</p>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono shrink-0">{item.services}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Danger zone */}
          <Card className="border-red-200 dark:border-red-800/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-red-600 dark:text-red-400">Zone de danger</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Réinitialiser les journaux</p>
                    <p className="text-xs text-muted-foreground">Effacer tout l&apos;historique d&apos;activité de l&apos;Agent IA</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={clearLogs} className="gap-1">
                    <Trash2 className="size-3.5" />
                    Effacer les journaux
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Vider la file d&apos;escalades</p>
                    <p className="text-xs text-muted-foreground">Retirer toutes les escalades de la file d&apos;attente</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={clearEscalationQueue}
                    disabled={escalationQueue.length === 0}
                    className="gap-1"
                  >
                    <Trash2 className="size-3.5" />
                    Vider les escalades
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Success toast */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-24 z-40 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm font-medium"
          >
            <CheckCircle2 className="size-4" />
            {successToast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
