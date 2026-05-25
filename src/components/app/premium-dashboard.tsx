'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Mail,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  Shield,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  GitBranch,
  Landmark,
  PenTool,
  UserCheck,
  Zap,
  BarChart3,
  Eye,
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { GUINEA_COLORS, DESIGN_TOKENS } from '@/lib/design-system'
import { useAppStore } from '@/store/app-store'

// ─── ANIMATED COUNTER HOOK ────────────────────────────────────────────────────
function useAnimatedCounter(end: number, duration = 1500, startOnMount = true) {
  const [count, setCount] = useState(0)
  const ref = useRef<number>(0)
  const startTimeRef = useRef<number>(0)

  const animate = useCallback((timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp
    const progress = Math.min((timestamp - startTimeRef.current) / duration, 1)
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3)
    setCount(Math.floor(eased * end))
    if (progress < 1) {
      ref.current = requestAnimationFrame(animate)
    }
  }, [end, duration])

  useEffect(() => {
    if (startOnMount) {
      startTimeRef.current = 0
      ref.current = requestAnimationFrame(animate)
    }
    return () => cancelAnimationFrame(ref.current)
  }, [animate, startOnMount])

  return count
}

// ─── ANIMATED COUNTER COMPONENT ───────────────────────────────────────────────
function AnimatedCounter({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const count = useAnimatedCounter(value)

  return (
    <span className="tabular-nums">
      {prefix}{count.toLocaleString('fr-FR')}{suffix}
    </span>
  )
}

// ─── KPI DATA ─────────────────────────────────────────────────────────────────
const KPI_DATA = [
  {
    id: 'courriers',
    label: 'Courriers traités',
    value: 14250,
    suffix: '',
    change: '+18.3%',
    trend: 'up' as const,
    icon: Mail,
    gradient: 'from-[#CE1126] to-[#E8384F]',
    description: 'Ce mois',
  },
  {
    id: 'documents',
    label: 'Documents officiels',
    value: 87450,
    suffix: '',
    change: '+22.1%',
    trend: 'up' as const,
    icon: FileText,
    gradient: 'from-[#FCD116] to-[#D4AD12]',
    description: 'Total archivé',
  },
  {
    id: 'procedures',
    label: 'Procédures numérisées',
    value: 234,
    suffix: '',
    change: '+45.2%',
    trend: 'up' as const,
    icon: GitBranch,
    gradient: 'from-[#009460] to-[#00B870]',
    description: 'Workflows actifs',
  },
  {
    id: 'delai',
    label: 'Délai moyen',
    value: 1,
    suffix: '.8j',
    change: '-32.5%',
    trend: 'down' as const,
    icon: Clock,
    gradient: 'from-[#0B2E58] to-[#3B7DD8]',
    description: 'Temps de traitement',
  },
  {
    id: 'conformite',
    label: 'Conformité',
    value: 99,
    suffix: '.2%',
    change: '+2.1%',
    trend: 'up' as const,
    icon: Shield,
    gradient: 'from-[#0B2E58] to-[#143D6B]',
    description: 'Réglementaire',
  },
  {
    id: 'satisfaction',
    label: 'Satisfaction',
    value: 4,
    suffix: '.7/5',
    change: '+0.4',
    trend: 'up' as const,
    icon: Users,
    gradient: 'from-[#3B7DD8] to-[#5A96E6]',
    description: 'Citoyenne',
  },
  {
    id: 'institutions',
    label: 'Institutions',
    value: 18,
    suffix: '/24',
    change: '+3',
    trend: 'up' as const,
    icon: Building2,
    gradient: 'from-[#C8A45C] to-[#0B2E58]',
    description: 'Connectées',
  },
  {
    id: 'demandes',
    label: 'Demandes citoyennes',
    value: 8730,
    suffix: '',
    change: '+28.7%',
    trend: 'up' as const,
    icon: UserCheck,
    gradient: 'from-[#8B5CF6] to-[#A78BFA]',
    description: 'Ce trimestre',
  },
]

// ─── REAL-TIME ACTIVITY FEED DATA ─────────────────────────────────────────────
const ACTIVITY_FEED = [
  { id: 1, type: 'decret', label: 'Décret n°D/2026/PRG/SGG signé par le Ministre des Finances', time: '5 min', icon: FileText },
  { id: 2, type: 'courrier', label: 'Courrier interministériel reçu de la Primature', time: '12 min', icon: Mail },
  { id: 3, type: 'workflow', label: "Workflow d'approbation budgétaire validé", time: '28 min', icon: GitBranch },
  { id: 4, type: 'signature', label: 'Visa électronique apposé par le Secrétaire Général', time: '45 min', icon: PenTool },
  { id: 5, type: 'citoyen', label: "Demande citoyenne traitée — Extrait d'acte de naissance", time: '1h', icon: UserCheck },
  { id: 6, type: 'alerte', label: 'Alerte: Délai critique sur courrier N°C-2026-0142', time: '1h 30', icon: AlertTriangle },
  { id: 7, type: 'conformite', label: 'Vérification de conformité réussie — Budget 2026', time: '2h', icon: Shield },
  { id: 8, type: 'approbation', label: 'Approbation ministérielle reçue — Projet eAdmin phase 2', time: '2h 30', icon: CheckCircle2 },
]

const activityColorMap: Record<string, string> = {
  decret: 'text-[#CE1126] bg-[#CE1126]/10 dark:text-[#E8384F] dark:bg-[#CE1126]/20',
  courrier: 'text-[#0B2E58] bg-[#0B2E58]/10 dark:text-[#3B7DD8] dark:bg-[#3B7DD8]/20',
  workflow: 'text-[#009460] bg-[#009460]/10 dark:text-[#00B870] dark:bg-[#009460]/20',
  signature: 'text-[#C8A45C] bg-[#C8A45C]/10 dark:text-[#D4B878] dark:bg-[#C8A45C]/20',
  citoyen: 'text-[#3B7DD8] bg-[#3B7DD8]/10 dark:text-[#5A96E6] dark:bg-[#3B7DD8]/20',
  alerte: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
  conformite: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30',
  approbation: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
}

// ─── QUICK ACTIONS ────────────────────────────────────────────────────────────
interface QuickAction {
  label: string
  icon: React.ComponentType<{ className?: string }>
  btnClass: string
  guineaStripe?: 'red' | 'yellow' | 'green'
  onClick: () => void
}

// ─── STATUS OVERVIEW DATA ─────────────────────────────────────────────────────
const STATUS_ITEMS = [
  { label: 'En attente', count: 42, total: 200, color: '#F59E0B', bgColor: 'bg-amber-500' },
  { label: 'En cours', count: 67, total: 200, color: '#3B82F6', bgColor: 'bg-blue-500' },
  { label: 'Approuvé', count: 78, total: 200, color: '#10B981', bgColor: 'bg-emerald-500' },
  { label: 'Rejeté', count: 13, total: 200, color: '#EF4444', bgColor: 'bg-red-500' },
]

// ─── ANIMATION VARIANTS ──────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export function PremiumDashboard() {
  const navigate = useAppStore((s) => s.navigate)
  const [livePulse, setLivePulse] = useState(false)

  // Simulate real-time activity pulse
  useEffect(() => {
    const interval = setInterval(() => {
      setLivePulse(true)
      setTimeout(() => setLivePulse(false), 600)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const quickActions: QuickAction[] = [
    { label: 'Nouveau courrier', icon: Mail, btnClass: 'from-[#0B2E58] to-[#3B7DD8] text-white shadow-lg shadow-[#0B2E58]/20', onClick: () => navigate('courriers') },
    { label: 'Upload document', icon: FileText, btnClass: 'from-[#C8A45C] to-[#D4B878] text-[#0B2E58] shadow-lg shadow-[#C8A45C]/20', onClick: () => navigate('ged') },
    { label: 'Procédure admin.', icon: GitBranch, guineaStripe: 'green', btnClass: 'from-[#009460] to-[#00B870] text-white shadow-lg shadow-[#009460]/20', onClick: () => navigate('workflow') },
    { label: 'Signatures', icon: PenTool, btnClass: 'from-[#8B5CF6] to-[#A78BFA] text-white shadow-lg shadow-[#8B5CF6]/20', onClick: () => navigate('signatures') },
    { label: 'Demandes', icon: UserCheck, guineaStripe: 'red', btnClass: 'from-[#CE1126] to-[#E8384F] text-white shadow-lg shadow-[#CE1126]/20', onClick: () => navigate('service-requests') },
    { label: 'Analytics', icon: BarChart3, btnClass: 'from-[#3B7DD8] to-[#5A96E6] text-white shadow-lg shadow-[#3B7DD8]/20', onClick: () => navigate('analytics') },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5 p-4 md:p-6 dashboard-bg-v2"
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          GUINEA-BRANDED HEADER
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="glass-premium overflow-hidden bg-gradient-to-br from-[#0B2E58]/[0.03] via-transparent to-[#C8A45C]/[0.03] dark:from-[#3B7DD8]/[0.06] dark:via-transparent dark:to-[#D4B878]/[0.04]">
          <CardContent className="p-5 relative z-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                {/* Guinea tricolor ring */}
                <div className="relative flex size-14 items-center justify-center">
                  <div className="absolute inset-0 rounded-xl p-[2px] shadow-lg animate-glow-pulse"
                    style={{ background: `linear-gradient(135deg, ${GUINEA_COLORS.red}, ${GUINEA_COLORS.yellow}, ${GUINEA_COLORS.green})` }}
                  >
                    <div className="flex size-full items-center justify-center rounded-[10px] bg-gradient-to-br from-[#0B2E58] to-[#143D6B] dark:from-[#143D6B] dark:to-[#1A4A80]">
                      <Landmark className="size-6 text-white" />
                    </div>
                  </div>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                    <span className="text-gradient-navy">Centre de Commandement</span>{' '}
                    <span className="text-gradient-gold">Interministériel</span>
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Tableau de bord premium — République de Guinée
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Live indicator */}
                <div className="flex items-center gap-2">
                  <div className={`size-2 rounded-full bg-emerald-500 transition-all duration-300 ${livePulse ? 'shadow-[0_0_8px_rgba(16,185,129,0.6)] scale-125' : ''}`} />
                  <span className="text-xs font-medium text-muted-foreground">En direct</span>
                </div>
                <Badge className="badge-premium border-0 font-semibold text-xs gap-1.5">
                  <Activity className="size-3" />
                  Temps réel
                </Badge>
              </div>
            </div>
            {/* Guinea tricolor bottom bar */}
            <div className="mt-4 flex h-1 w-full overflow-hidden rounded-full">
              <div className="flex-[1] bg-[#CE1126]" />
              <div className="flex-[1] bg-[#FCD116]" />
              <div className="flex-[1] bg-[#009460]" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          KPI CARDS WITH ANIMATED COUNTERS
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
        {KPI_DATA.map((kpi, index) => {
          const Icon = kpi.icon
          const isUp = kpi.trend === 'up'
          const isPositiveChange = kpi.label.includes('Délai') ? !isUp : isUp
          return (
            <motion.div
              key={kpi.id}
              variants={itemVariants}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
            >
              <Card className="card-interactive overflow-hidden py-0 border-0 relative">
                {/* Left accent bar with Guinea-inspired gradient */}
                <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b ${kpi.gradient}`} />
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className={`flex size-9 items-center justify-center rounded-lg bg-gradient-to-br ${kpi.gradient} shadow-sm`}>
                      <Icon className="size-4 text-white" />
                    </div>
                    <div className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${isPositiveChange ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400' : 'text-red-500 bg-red-50 dark:bg-red-900/20 dark:text-red-400'}`}>
                      {isUp ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                      {kpi.change}
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xl font-bold tracking-tight text-[#0B2E58] dark:text-white premium-stat">
                      <AnimatedCounter value={kpi.value} suffix={kpi.suffix} />
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{kpi.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          STATUS OVERVIEW + ACTIVITY FEED
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Status Overview */}
        <motion.div variants={itemVariants}>
          <Card className="card-interactive shadow-premium overflow-hidden border-0 h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0B2E58] to-[#3B7DD8] shadow-sm">
                  <Eye className="size-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                    Vue d&apos;ensemble des statuts
                  </CardTitle>
                  <CardDescription className="text-xs">Répartition des demandes</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {STATUS_ITEMS.map((item) => {
                const pct = Math.round((item.count / item.total) * 100)
                return (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`size-2 rounded-full ${item.bgColor}`} />
                        <span className="font-medium text-[#0B2E58] dark:text-white">{item.label}</span>
                      </div>
                      <span className="font-bold tabular-nums" style={{ color: item.color }}>
                        {item.count} <span className="font-normal text-muted-foreground">({pct}%)</span>
                      </span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/60">
                      <motion.div
                        className="absolute left-0 top-0 h-full rounded-full"
                        style={{ backgroundColor: item.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </div>
                )
              })}
              {/* Total summary */}
              <div className="mt-2 pt-3 border-t border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#0B2E58] dark:text-white">Total demandes</span>
                  <span className="font-bold tabular-nums text-[#0B2E58] dark:text-white">
                    {STATUS_ITEMS.reduce((sum, i) => sum + i.count, 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Real-time Activity Feed */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="card-interactive shadow-premium overflow-hidden border-0 h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#CE1126] to-[#009460] shadow-sm">
                    <Activity className="size-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                      Activité en temps réel
                    </CardTitle>
                    <CardDescription className="text-xs">Dernières actions interministérielles</CardDescription>
                  </div>
                </div>
                <AnimatePresence>
                  {livePulse && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5"
                    >
                      <Zap className="size-3 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Nouvelle activité</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CardHeader>
            <CardContent className="px-4">
              <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                {ACTIVITY_FEED.map((activity, idx) => {
                  const IconComp = activity.icon
                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.3 }}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-gradient-to-r hover:from-muted/50 hover:to-transparent hover:shadow-sm group"
                    >
                      <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg backdrop-blur-sm ${activityColorMap[activity.type]} transition-transform duration-200 group-hover:scale-110`}>
                        <IconComp className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium group-hover:text-[#0B2E58] dark:group-hover:text-white transition-colors">
                          {activity.label}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{activity.time}</span>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          QUICK ACTION CARDS
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="card-interactive shadow-premium overflow-hidden border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#C8A45C] to-[#0B2E58] shadow-sm">
                <Zap className="size-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                  Actions rapides
                </CardTitle>
                <CardDescription className="text-xs">Raccourcis pour les tâches fréquentes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <motion.button
                    key={action.label}
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative h-auto flex-col gap-2 rounded-xl py-4 text-xs font-semibold inline-flex items-center justify-center bg-gradient-to-br ${action.btnClass} overflow-hidden transition-shadow duration-300`}
                    onClick={action.onClick}
                    aria-label={action.label}
                  >
                    {/* Guinea stripe for special items */}
                    {action.guineaStripe && (
                      <div className="absolute top-0 left-0 right-0 h-[3px]">
                        {action.guineaStripe === 'red' && <div className="h-full bg-[#CE1126]" />}
                        {action.guineaStripe === 'yellow' && <div className="h-full bg-[#FCD116]" />}
                        {action.guineaStripe === 'green' && <div className="h-full bg-[#009460]" />}
                      </div>
                    )}
                    <Icon className="size-5" />
                    {action.label}
                  </motion.button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          GUINEA SOVEREIGNTY BADGE
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="glass-premium overflow-hidden bg-gradient-to-r from-[#0B2E58]/[0.03] via-transparent to-[#C8A45C]/[0.03] dark:from-[#3B7DD8]/[0.06] dark:via-transparent dark:to-[#D4B878]/[0.04]">
          <CardContent className="p-4 relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex size-11 items-center justify-center">
                <div className="absolute inset-0 rounded-xl p-[1.5px] shadow-md"
                  style={{ background: `linear-gradient(135deg, ${GUINEA_COLORS.red}, ${GUINEA_COLORS.yellow}, ${GUINEA_COLORS.green})` }}
                >
                  <div className="flex size-full items-center justify-center rounded-[10px] bg-gradient-to-br from-[#0B2E58] to-[#143D6B] dark:from-[#143D6B] dark:to-[#1A4A80]">
                    <Shield className="size-5 text-white" />
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                    Données hébergées en souveraineté nationale
                  </p>
                  <Badge variant="outline" className="badge-premium border-0 text-[10px] gap-1">
                    <Building2 className="size-3" />
                    Data Center Conakry
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Conformité Loi L/2016/018/AN relative à la protection des données personnelles
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                <div className="flex size-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle2 className="size-3.5" />
                </div>
                Certifié
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

export default PremiumDashboard
