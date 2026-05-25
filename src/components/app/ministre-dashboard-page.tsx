'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Landmark, Shield, BarChart3, Users, FileText, Clock, CheckCircle2,
  AlertCircle, TrendingUp, TrendingDown, Building2, Activity, Eye,
  ArrowRight, Mail, GitBranch, PenTool, Globe, Award, Scale,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/store/app-store'
import { useCitizenRequestsStore, isDeadlineApproaching, isDeadlineCritical, isDeadlineExceeded } from '@/store/citizen-requests-store'
import { filterRequestsByRLS } from '@/lib/rbac'

// ─── ANIMATION VARIANTS ─────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

// ─── CATEGORY CONFIG ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'etat-civil', label: 'État Civil', color: 'bg-sky-500' },
  { id: 'identification', label: 'Identification', color: 'bg-amber-500' },
  { id: 'justice', label: 'Justice & Légal', color: 'bg-violet-500' },
  { id: 'urbanisme', label: 'Urbanisme', color: 'bg-teal-500' },
  { id: 'entreprise', label: 'Entreprise', color: 'bg-emerald-500' },
  { id: 'education', label: 'Éducation', color: 'bg-indigo-500' },
  { id: 'sante', label: 'Santé', color: 'bg-rose-500' },
  { id: 'residence', label: 'Résidence', color: 'bg-cyan-500' },
]

// ─── QUICK ACCESS NAV ────────────────────────────────────────────────────────
const QUICK_ACCESS = [
  { label: 'Courriers interministériels', icon: Mail, page: 'courriers' as const, gradient: 'from-[#0B2E58] to-[#134A8E]' },
  { label: 'Workflows & Procédures', icon: GitBranch, page: 'workflow' as const, gradient: 'from-emerald-600 to-emerald-800' },
  { label: 'Signatures électroniques', icon: PenTool, page: 'signatures' as const, gradient: 'from-[#C8A45C] to-[#A07D3A]' },
  { label: 'Analytics détaillés', icon: BarChart3, page: 'analytics' as const, gradient: 'from-violet-600 to-violet-800' },
  { label: 'Audit & Conformité', icon: Scale, page: 'audit-logs' as const, gradient: 'from-rose-600 to-rose-800' },
  { label: 'Paramètres ministériels', icon: Shield, page: 'settings' as const, gradient: 'from-slate-600 to-slate-800' },
]

// ─── STATUS COLORS ───────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  soumise: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  en_cours: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  pieces_complementaires: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  validee: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  prete: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  livree: 'bg-[#0B2E58]/10 text-[#0B2E58] dark:bg-[#3B7DD8]/20 dark:text-[#3B7DD8]',
  rejetee: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export function MinistreDashboardPage() {
  const navigate = useAppStore((s) => s.navigate)
  const user = useAppStore((s) => s.user)
  const { requests } = useCitizenRequestsStore()

  // Ministre at level 5 → sees ALL requests
  const allRequests = useMemo(() => filterRequestsByRLS(requests, user), [requests, user])

  // ─── DERIVED KPIs ────────────────────────────────────────────────────────
  const totalRequests = allRequests.length
  const processed = allRequests.filter(r => ['validee', 'prete', 'livree'].includes(r.status)).length
  const processingRate = totalRequests > 0 ? Math.round((processed / totalRequests) * 100) : 0
  const avgDays = totalRequests > 0
    ? Math.round(allRequests.reduce((acc, r) => {
        const start = new Date(r.createdAt).getTime()
        const end = r.completedAt ? new Date(r.completedAt).getTime() : Date.now()
        return acc + (end - start) / 86400000
      }, 0) / totalRequests)
    : 0
  const satisfactionScore = 4.2
  const complianceRate = 94
  const courriersEnCours = 23
  const docsClassified = 187
  const activeInstitutions = 8

  const deadlineCritical = allRequests.filter(r => isDeadlineCritical(r))
  const deadlineApproaching = allRequests.filter(r => isDeadlineApproaching(r))
  const deadlineExceeded = allRequests.filter(r => isDeadlineExceeded(r))
  const priorityRequests = [...deadlineExceeded, ...deadlineApproaching, ...deadlineCritical]
    .filter((r, i, arr) => arr.findIndex(x => x.id === r.id) === i)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(0, 6)

  // Category breakdown
  const categoryBreakdown = CATEGORIES.map(cat => {
    const catReqs = allRequests.filter(r => r.categoryId === cat.id)
    const catProcessed = catReqs.filter(r => ['validee', 'prete', 'livree'].includes(r.status)).length
    return { ...cat, total: catReqs.length, processed: catProcessed, rate: catReqs.length > 0 ? Math.round((catProcessed / catReqs.length) * 100) : 0 }
  }).filter(c => c.total > 0)

  // ─── KPI CARDS ───────────────────────────────────────────────────────────
  const kpis = [
    { label: 'Demandes citoyennes', value: totalRequests, icon: FileText, trend: '+12%', up: true, gradient: 'from-sky-500 to-sky-700' },
    { label: 'Taux de traitement', value: `${processingRate}%`, icon: CheckCircle2, trend: '+3%', up: true, gradient: 'from-emerald-500 to-emerald-700' },
    { label: 'Délai moyen national', value: `${avgDays}j`, icon: Clock, trend: '-2j', up: false, gradient: 'from-amber-500 to-amber-700' },
    { label: 'Satisfaction citoyenne', value: `${satisfactionScore}/5`, icon: Users, trend: '+0.3', up: true, gradient: 'from-violet-500 to-violet-700' },
    { label: 'Conformité réglementaire', value: `${complianceRate}%`, icon: Scale, trend: '+1%', up: true, gradient: 'from-rose-500 to-rose-700' },
    { label: 'Courriers en cours', value: courriersEnCours, icon: Mail, trend: '', up: true, gradient: 'from-[#0B2E58] to-[#134A8E]' },
    { label: 'Documents classifiés', value: docsClassified, icon: Shield, trend: '+24', up: true, gradient: 'from-[#C8A45C] to-[#A07D3A]' },
    { label: 'Institutions actives', value: activeInstitutions, icon: Building2, trend: '', up: true, gradient: 'from-teal-500 to-teal-700' },
  ]

  // ─── REGIONAL COMPLIANCE DATA ────────────────────────────────────────────
  const regionData = [
    { name: 'Conakry', rate: 96 },
    { name: 'Kankan', rate: 88 },
    { name: 'Kindia', rate: 91 },
    { name: 'N\'Zérékoré', rate: 84 },
    { name: 'Labé', rate: 79 },
    { name: 'Faranah', rate: 72 },
  ]

  // ─── MONTHLY VOLUME DATA ─────────────────────────────────────────────────
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun']
  const monthlyValues = [42, 58, 65, 72, 81, totalRequests || 87]
  const maxMonthly = Math.max(...monthlyValues, 1)

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 p-4 md:p-6">
      {/* ═══════ IMPERIAL HEADER ═══════ */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden border-[#C8A45C]/30 dark:border-[#D4B878]/20 bg-gradient-to-br from-[#0B2E58] via-[#134A8E] to-[#0B2E58] dark:from-[#0B2E58] dark:via-[#071D3A] dark:to-[#0B2E58] shadow-2xl">
          <CardContent className="p-6 md:p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.07] via-transparent to-white/[0.02] pointer-events-none" />
            {/* Tricolor */}
            <div className="flex gap-0 mb-5 -mx-6 md:-mx-8 -mt-6 md:-mt-8">
              <div className="flex-1 h-2.5 bg-gradient-to-r from-[#CE1126] to-[#CE1126]/50" />
              <div className="flex-1 h-2.5 bg-gradient-to-r from-[#FCD116]/50 to-[#FCD116]" />
              <div className="flex-1 h-2.5 bg-gradient-to-r from-[#009460] to-[#009460]/50" />
            </div>
            {/* Gold line */}
            <div className="h-px bg-gradient-to-r from-transparent via-[#C8A45C]/60 to-transparent mb-5" />

            <div className="flex flex-col md:flex-row items-start md:items-center gap-5 relative z-10">
              <div className="relative">
                <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-[#C8A45C]/50 to-[#D4B878]/20 blur-md" />
                <div className="relative flex size-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border-2 border-[#C8A45C]/40 shadow-xl">
                  <Landmark className="size-8 text-[#C8A45C]" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#C8A45C]/90 font-bold mb-1">République de Guinée — Travail, Justice, Solidarité</p>
                <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#C8A45C] via-[#FCD116] to-[#C8A45C] bg-clip-text text-transparent">Cabinet Ministériel</h2>
                <p className="text-base text-white/90 mt-1 font-medium">S.E.M. Abdoulaye Condé</p>
                <p className="text-sm text-white/60">Ministre de l&apos;Administration Territoriale</p>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Badge className="bg-gradient-to-r from-[#C8A45C] to-[#FCD116] text-[#0B2E58] border-0 font-bold text-xs gap-1.5 shadow-lg px-3 py-1">
                  <Award className="size-3.5" /> Ministre — Niveau 5
                </Badge>
                <Badge className="bg-white/10 text-white/80 border border-[#C8A45C]/30 text-xs gap-1.5 backdrop-blur-sm">
                  <Eye className="size-3" /> Vue souveraine — Toutes les demandes
                </Badge>
              </div>
            </div>
            {/* Bottom gold line */}
            <div className="h-px bg-gradient-to-r from-transparent via-[#C8A45C]/40 to-transparent mt-5" />
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════ 8 STRATEGIC KPI CARDS ═══════ */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((kpi) => (
            <motion.div key={kpi.label} variants={itemVariants} whileHover={{ y: -2, transition: { duration: 0.2 } }}>
              <Card className="card-interactive overflow-hidden group">
                <CardContent className="p-4 relative">
                  <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${kpi.gradient} opacity-50 group-hover:opacity-100 transition-opacity`} />
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${kpi.gradient} shadow-sm`}>
                      <kpi.icon className="size-4 text-white" />
                    </div>
                    {kpi.trend && (
                      <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${kpi.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {kpi.up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                        {kpi.trend}
                      </span>
                    )}
                  </div>
                  <p className="text-xl font-bold tabular-nums tracking-tight text-[#0B2E58] dark:text-white mt-2">{kpi.value}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{kpi.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ═══════ STRATEGIC TABS ═══════ */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="overview">
          <TabsList className="w-full sm:w-auto h-auto flex-wrap gap-1 bg-muted/50 p-1.5 shadow-sm">
            <TabsTrigger value="overview" className="gap-1.5 text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0B2E58] data-[state=active]:to-[#134A8E] data-[state=active]:text-white data-[state=active]:shadow-md">
              <Activity className="size-4" /> Vue d&apos;ensemble
            </TabsTrigger>
            <TabsTrigger value="priority" className="gap-1.5 text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0B2E58] data-[state=active]:to-[#134A8E] data-[state=active]:text-white data-[state=active]:shadow-md">
              <AlertCircle className="size-4" /> Demandes prioritaires
              {priorityRequests.length > 0 && <span className="ml-1 bg-[#CE1126] text-white text-[9px] rounded-full px-1.5 py-0 font-bold">{priorityRequests.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="indicators" className="gap-1.5 text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0B2E58] data-[state=active]:to-[#134A8E] data-[state=active]:text-white data-[state=active]:shadow-md">
              <BarChart3 className="size-4" /> Indicateurs
            </TabsTrigger>
          </TabsList>

          {/* ─── VUE D'ENSEMBLE ─── */}
          <TabsContent value="overview" className="mt-4">
            <Card className="card-premium overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#0B2E58] to-[#3B7DD8] text-white shadow-sm">
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">Performance ministérielle par catégorie</CardTitle>
                    <CardDescription className="text-xs">Répartition et taux de traitement par service</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {categoryBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucune demande enregistrée</p>
                ) : (
                  categoryBreakdown.map(cat => (
                    <div key={cat.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${cat.color}`} />
                          <span className="text-sm font-medium">{cat.label}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{cat.total} demande{cat.total > 1 ? 's' : ''}</span>
                          <span className="font-semibold text-[#0B2E58] dark:text-white">{cat.rate}%</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${cat.rate}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={`h-full rounded-full ${cat.color} opacity-80`}
                        />
                      </div>
                    </div>
                  ))
                )}
                {/* Summary bar */}
                <div className="mt-4 pt-4 border-t border-muted/50">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Taux de traitement global</span>
                    <span className="font-bold text-[#0B2E58] dark:text-white text-sm">{processingRate}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted/50 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#0B2E58] via-[#3B7DD8] to-[#C8A45C] transition-all duration-700" style={{ width: `${processingRate}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── DEMANDES PRIORITAIRES ─── */}
          <TabsContent value="priority" className="mt-4">
            <Card className="card-premium overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#CE1126] to-[#a00e1e] text-white shadow-sm">
                    <AlertCircle className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">Demandes nécessitant une attention ministérielle</CardTitle>
                    <CardDescription className="text-xs">
                      {deadlineExceeded.length} dépassée{deadlineExceeded.length > 1 ? 's' : ''} • {deadlineApproaching.length} approchant • {deadlineCritical.length} critique{deadlineCritical.length > 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {priorityRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="size-10 text-emerald-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">Aucune demande prioritaire</p>
                    <p className="text-xs text-muted-foreground mt-1">Toutes les demandes sont dans les délais légaux</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {priorityRequests.map(req => {
                      const isExceeded = isDeadlineExceeded(req)
                      const isApproaching = isDeadlineApproaching(req)
                      return (
                        <div key={req.id} className={`p-4 rounded-xl border backdrop-blur-sm transition-all hover:shadow-md ${isExceeded ? 'bg-red-50/60 dark:bg-red-900/10 border-red-200 dark:border-red-800/40' : isApproaching ? 'bg-amber-50/60 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40' : 'bg-orange-50/60 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/40'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${isExceeded ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : isApproaching ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                                  {isExceeded ? '⚠ Délai dépassé' : isApproaching ? '⏰ Délai imminent' : '🔍 Délai critique'}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[req.status] || 'bg-muted'}`}>{req.status.replace('_', ' ')}</span>
                              </div>
                              <p className="text-sm font-semibold truncate">{req.citizenFirstName} {req.citizenName} — {req.serviceName}</p>
                              <p className="text-xs text-muted-foreground font-mono">{req.reference} • {req.category}</p>
                            </div>
                            <Button size="sm" variant="outline" className="shrink-0 btn-premium gap-1 text-xs h-7" onClick={() => navigate('service-requests')}>
                              <Eye className="size-3" /> Voir
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── INDICATEURS ─── */}
          <TabsContent value="indicators" className="mt-4 space-y-4">
            {/* Performance par catégorie */}
            <Card className="card-premium overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white flex items-center gap-2">
                  <BarChart3 className="size-4 text-[#C8A45C]" /> Performance par catégorie de service
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryBreakdown.map(cat => (
                    <div key={cat.id} className="flex items-center gap-3">
                      <span className="text-xs w-28 shrink-0 text-right text-muted-foreground">{cat.label}</span>
                      <div className="flex-1 h-6 rounded bg-muted/30 relative overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${cat.rate}%` }} transition={{ duration: 0.6, delay: 0.1 }} className={`h-full rounded ${cat.color} opacity-75 flex items-center justify-end pr-2`}>
                          {cat.rate > 15 && <span className="text-[10px] text-white font-bold">{cat.rate}%</span>}
                        </motion.div>
                        {cat.rate <= 15 && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">{cat.rate}%</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Conformité par région */}
            <Card className="card-premium overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white flex items-center gap-2">
                  <Globe className="size-4 text-[#C8A45C]" /> Taux de conformité par région
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {regionData.map(region => (
                    <div key={region.name} className="flex items-center gap-3">
                      <span className="text-xs w-24 shrink-0 text-right text-muted-foreground">{region.name}</span>
                      <div className="flex-1 h-6 rounded bg-muted/30 relative overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${region.rate}%` }} transition={{ duration: 0.6, delay: 0.1 }} className={`h-full rounded ${region.rate >= 90 ? 'bg-emerald-500' : region.rate >= 80 ? 'bg-amber-500' : 'bg-red-500'} opacity-75 flex items-center justify-end pr-2`}>
                          <span className="text-[10px] text-white font-bold">{region.rate}%</span>
                        </motion.div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Volume mensuel */}
            <Card className="card-premium overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white flex items-center gap-2">
                  <TrendingUp className="size-4 text-[#C8A45C]" /> Volume mensuel (2026)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3 h-36">
                  {months.map((month, i) => (
                    <div key={month} className="flex-1 flex flex-col items-center gap-1">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(monthlyValues[i] / maxMonthly) * 100}%` }}
                        transition={{ duration: 0.5, delay: i * 0.08 }}
                        className="w-full rounded-t bg-gradient-to-t from-[#0B2E58] to-[#3B7DD8] dark:from-[#3B7DD8] dark:to-[#5A96E6] min-h-[4px] relative group cursor-default"
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[#0B2E58] dark:text-white opacity-0 group-hover:opacity-100 transition-opacity">{monthlyValues[i]}</span>
                      </motion.div>
                      <span className="text-[10px] text-muted-foreground">{month}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ═══════ MINISTRY QUICK ACCESS ═══════ */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#C8A45C] to-[#A07D3A] text-white">
            <Landmark className="size-3.5" />
          </div>
          <h3 className="text-sm font-semibold text-[#0B2E58] dark:text-white">Accès rapide ministériel</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {QUICK_ACCESS.map(item => (
            <motion.div key={item.label} whileHover={{ y: -2, transition: { duration: 0.15 } }}>
              <Card className="card-interactive overflow-hidden group cursor-pointer h-full" onClick={() => navigate(item.page)}>
                <CardContent className="p-4 relative">
                  <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${item.gradient} opacity-40 group-hover:opacity-100 transition-opacity`} />
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${item.gradient} text-white shadow-sm`}>
                      <item.icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.label}</p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground/50 group-hover:text-[#0B2E58] dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
