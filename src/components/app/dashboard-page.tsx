'use client'

import { motion } from 'framer-motion'
import {
  Mail,
  FileText,
  GitBranch,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Upload,
  Users,
  Shield,
  Building2,
  UserCheck,
  Activity,
  Landmark,
  Server,
  Lock,
  CheckCircle2,
  PenTool,
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
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { DEMO_KPI, MONTHLY_DATA, DEMO_STATS } from '@/lib/constants'
import { useAppStore } from '@/store/app-store'

const CHART_COLORS = ['#0B2E58', '#3B7DD8', '#C8A45C', '#10B981', '#EF4444', '#8B5CF6']

// ─── KPI DATA ────────────────────────────────────────────────────────────────
const GOV_KPI = [
  { label: 'Courriers interministériels', value: '14 250', change: '+18.3%', trend: 'up' as const, icon: Mail, color: 'bg-[#0B2E58]/10 dark:bg-[#3B7DD8]/20' },
  { label: 'Documents officiels', value: '87 450', change: '+22.1%', trend: 'up' as const, icon: FileText, color: 'bg-[#0B2E58]/10 dark:bg-[#3B7DD8]/20' },
  { label: 'Procédures numérisées', value: '234', change: '+45.2%', trend: 'up' as const, icon: GitBranch, color: 'bg-[#0B2E58]/10 dark:bg-[#3B7DD8]/20' },
  { label: 'Délai moyen traitement', value: '1.8 jours', change: '-32.5%', trend: 'down' as const, icon: Clock, color: 'bg-[#0B2E58]/10 dark:bg-[#3B7DD8]/20' },
  { label: 'Conformité réglementaire', value: '99.2%', change: '+2.1%', trend: 'up' as const, icon: Shield, color: 'bg-[#0B2E58]/10 dark:bg-[#3B7DD8]/20' },
  { label: 'Satisfaction citoyenne', value: '4.7/5', change: '+0.4', trend: 'up' as const, icon: Users, color: 'bg-[#0B2E58]/10 dark:bg-[#3B7DD8]/20' },
  { label: 'Institutions connectées', value: '18/24', change: '+3', trend: 'up' as const, icon: Building2, color: 'bg-[#0B2E58]/10 dark:bg-[#3B7DD8]/20' },
  { label: 'Demandes citoyennes', value: '8 730', change: '+28.7%', trend: 'up' as const, icon: UserCheck, color: 'bg-[#0B2E58]/10 dark:bg-[#3B7DD8]/20' },
]

// ─── MINISTRIES DATA FOR AREA CHART ──────────────────────────────────────────
const ministryAreaData = [
  { month: 'Jan', MEF: 120, MPT: 85, MEPU: 60, MS: 45, MDC: 30 },
  { month: 'Fév', MEF: 145, MPT: 92, MEPU: 68, MS: 52, MDC: 35 },
  { month: 'Mar', MEF: 132, MPT: 88, MEPU: 72, MS: 48, MDC: 38 },
  { month: 'Avr', MEF: 158, MPT: 105, MEPU: 80, MS: 55, MDC: 42 },
  { month: 'Mai', MEF: 170, MPT: 112, MEPU: 88, MS: 60, MDC: 45 },
  { month: 'Jun', MEF: 185, MPT: 120, MEPU: 95, MS: 65, MDC: 50 },
  { month: 'Jul', MEF: 168, MPT: 108, MEPU: 82, MS: 58, MDC: 44 },
  { month: 'Aoû', MEF: 155, MPT: 98, MEPU: 75, MS: 50, MDC: 40 },
  { month: 'Sep', MEF: 178, MPT: 118, MEPU: 90, MS: 62, MDC: 48 },
  { month: 'Oct', MEF: 195, MPT: 128, MEPU: 98, MS: 70, MDC: 55 },
  { month: 'Nov', MEF: 210, MPT: 135, MEPU: 105, MS: 75, MDC: 58 },
  { month: 'Déc', MEF: 202, MPT: 130, MEPU: 100, MS: 72, MDC: 54 },
]

// ─── REGIONAL PERFORMANCE DATA ───────────────────────────────────────────────
const regionData = [
  { region: 'Conakry', performance: 92, courriers: 3420, delay: 1.2 },
  { region: 'Kindia', performance: 78, courriers: 1850, delay: 1.8 },
  { region: 'Boké', performance: 71, courriers: 1240, delay: 2.1 },
  { region: 'Labé', performance: 68, courriers: 1100, delay: 2.3 },
  { region: 'Mamou', performance: 74, courriers: 1380, delay: 1.9 },
  { region: 'Faranah', performance: 65, courriers: 980, delay: 2.5 },
  { region: 'Kankan', performance: 76, courriers: 1560, delay: 2.0 },
  { region: "N'Zérékoré", performance: 70, courriers: 1200, delay: 2.2 },
]

// ─── DOCUMENT TYPE PIE DATA ──────────────────────────────────────────────────
const docTypeData = [
  { name: 'Décrets', value: 2850, color: '#0B2E58' },
  { name: 'Arrêtés', value: 3420, color: '#C8A45C' },
  { name: 'Circulaires', value: 2180, color: '#3B7DD8' },
  { name: 'Notes de service', value: 4120, color: '#10B981' },
  { name: 'Rapports', value: 3680, color: '#8B5CF6' },
  { name: 'Autres', value: 1900, color: '#EF4444' },
]

// ─── PND PROGRESS DATA ───────────────────────────────────────────────────────
const pndAxes = [
  { name: 'Axe 1: Gouvernance démocratique', value: 72, color: '#0B2E58' },
  { name: 'Axe 2: Transformation structurelle', value: 58, color: '#C8A45C' },
  { name: 'Axe 3: Capital humain', value: 65, color: '#3B7DD8' },
  { name: 'Axe 4: Environnement durable', value: 45, color: '#10B981' },
]

// ─── RECENT GOVERNMENT ACTIVITIES ────────────────────────────────────────────
const recentActivities = [
  { id: 1, type: 'decret', label: 'Décret n°D/2026/PRG/SGG signé par le Ministre des Finances', time: 'Il y a 5 min', icon: FileText },
  { id: 2, type: 'courrier', label: 'Courrier interministériel reçu de la Primature', time: 'Il y a 12 min', icon: Mail },
  { id: 3, type: 'workflow', label: "Workflow d'approbation budgétaire validé — Direction du Budget", time: 'Il y a 28 min', icon: GitBranch },
  { id: 4, type: 'circulaire', label: 'Circulaire n°003/MEF/CAB diffusée à 12 directions', time: 'Il y a 45 min', icon: FileText },
  { id: 5, type: 'arrete', label: 'Arrêté portant nomination — Ministère de la Fonction Publique', time: 'Il y a 1h', icon: Landmark },
  { id: 6, type: 'rapport', label: "Rapport d'audit transmis à la Cour des Comptes", time: 'Il y a 1h 30', icon: FileText },
  { id: 7, type: 'note', label: 'Note de service — Rentrée administrative 2026', time: 'Il y a 2h', icon: FileText },
  { id: 8, type: 'citoyen', label: "Demande citoyenne traitée — Extrait d'acte de naissance", time: 'Il y a 2h 30', icon: UserCheck },
  { id: 9, type: 'signature', label: 'Visa électronique apposé par le Secrétaire Général', time: 'Il y a 3h', icon: PenTool },
  { id: 10, type: 'marche', label: 'Marché public validé — Commission des Marchés', time: 'Il y a 4h', icon: CheckCircle2 },
]

const activityColors: Record<string, string> = {
  decret: 'text-[#0B2E58] bg-[#0B2E58]/10 dark:text-[#3B7DD8] dark:bg-[#3B7DD8]/20',
  courrier: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  workflow: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
  circulaire: 'text-[#C8A45C] bg-[#C8A45C]/10 dark:text-[#D4B878] dark:bg-[#D4B878]/20',
  arrete: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
  rapport: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
  note: 'text-sky-600 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400',
  citoyen: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
  signature: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400',
  marche: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400',
}

// ─── QUICK ACTIONS ───────────────────────────────────────────────────────────
// (actions now defined inside the component so they can use navigate)

// ─── HEATMAP DATA ────────────────────────────────────────────────────────────
const heatmapData = (() => {
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const hours = ['8h', '9h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h', '19h']
  const seed = [3, 7, 9, 8, 4, 2, 6, 10, 9, 7, 5, 2, 5, 8, 10, 9, 6, 3, 7, 9, 8, 6, 4, 1, 4, 6, 8, 7, 5, 3, 8, 10, 9, 7, 4, 2, 6, 9, 7, 5, 3, 1, 7, 8, 6, 4, 2, 1, 2, 3, 5, 4, 2, 1, 3, 4, 3, 2, 1, 0, 1, 1, 2, 1, 1, 0, 1, 2, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0]
  return { days, hours, values: seed }
})()

function getHeatmapColor(value: number): string {
  if (value === 0) return 'bg-muted/30'
  if (value <= 2) return 'bg-[#0B2E58]/15 dark:bg-[#3B7DD8]/20'
  if (value <= 4) return 'bg-[#0B2E58]/25 dark:bg-[#3B7DD8]/35'
  if (value <= 6) return 'bg-[#0B2E58]/40 dark:bg-[#3B7DD8]/50'
  if (value <= 8) return 'bg-[#0B2E58]/60 dark:bg-[#3B7DD8]/70'
  return 'bg-[#0B2E58]/80 dark:bg-[#3B7DD8]/90'
}

// ─── ANIMATION VARIANTS ─────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

// ─── TOOLTIP STYLE ───────────────────────────────────────────────────────────
const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid var(--border)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  fontSize: '12px',
}

export default function DashboardPage() {
  const navigate = useAppStore((s) => s.navigate)

  const quickActions = [
    { label: 'Nouveau courrier officiel', icon: Mail, color: 'bg-[#0B2E58] hover:bg-[#0B2E58]/90 text-white', onClick: () => navigate('courriers') },
    { label: 'Upload document réglementaire', icon: Upload, color: 'bg-[#3B7DD8] hover:bg-[#3B7DD8]/90 text-white', onClick: () => navigate('ged') },
    { label: 'Procédure administrative', icon: GitBranch, color: 'bg-[#C8A45C] hover:bg-[#C8A45C]/90 text-white', onClick: () => navigate('workflow') },
    { label: 'Demandes citoyennes', icon: UserCheck, color: 'bg-emerald-600 hover:bg-emerald-600/90 text-white', onClick: () => navigate('service-requests') },
    { label: 'Portail Citoyen', icon: UserCheck, color: 'bg-purple-600 hover:bg-purple-600/90 text-white', onClick: () => navigate('citizen-portal') },
    { label: 'Signatures électroniques', icon: PenTool, color: 'bg-rose-600 hover:bg-rose-600/90 text-white', onClick: () => navigate('signatures') },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-4 md:p-6"
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          PAGE HEADER — PRESIDENTIAL COMMAND CENTER
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="glass-card overflow-hidden border-[#C8A45C]/20 dark:border-[#D4B878]/20 bg-gradient-to-br from-[#0B2E58]/[0.03] via-transparent to-[#C8A45C]/[0.03] dark:from-[#3B7DD8]/[0.05] dark:to-[#D4B878]/[0.03]">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex size-12 items-center justify-center rounded-xl bg-[#0B2E58] dark:bg-[#3B7DD8] shadow-lg">
                  <Landmark className="size-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#0B2E58] dark:text-white">
                    Centre de Commandement Interministériel
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Tableau de bord de la modernisation administrative — République de Guinée
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <Badge className="bg-[#C8A45C] text-[#0B2E58] hover:bg-[#C8A45C]/90 border-0 font-semibold text-xs gap-1.5 shadow-sm">
                  <Activity className="size-3" />
                  Circulaire n°001/PM/CAB
                </Badge>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="size-3.5" />
                  <span className="font-medium">18/24 institutions connectées</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div
                        key={i}
                        className={`size-1.5 rounded-full ${i < 18 ? 'bg-emerald-500' : 'bg-muted-foreground/20'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          KPI CARDS — 2 ROWS OF 4
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
        {GOV_KPI.map((kpi) => {
          const Icon = kpi.icon
          const isUp = kpi.trend === 'up'
          const isPositiveChange = kpi.label.includes('Délai') ? !isUp : isUp
          return (
            <motion.div key={kpi.label} variants={itemVariants}>
              <Card className="glass-card overflow-hidden py-0 shadow-md transition-shadow hover:shadow-lg border-l-2 border-l-[#0B2E58] dark:border-l-[#3B7DD8]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className={`flex size-9 items-center justify-center rounded-lg ${kpi.color}`}>
                      <Icon className="size-4 text-[#0B2E58] dark:text-[#3B7DD8]" />
                    </div>
                    <div className={`flex items-center gap-0.5 text-xs font-semibold ${isPositiveChange ? 'text-emerald-600' : 'text-red-500'}`}>
                      {isUp ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                      {kpi.change}
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xl font-bold tracking-tight text-[#0B2E58] dark:text-white">
                      {kpi.value}
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
          CHARTS ROW 1: LINE + AREA
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                Courriers interministériels
              </CardTitle>
              <CardDescription className="text-xs">Volume mensuel sur 12 mois</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={MONTHLY_DATA} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="courriers"
                    name="Courriers"
                    stroke="#0B2E58"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#0B2E58' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="documents"
                    name="Documents"
                    stroke="#C8A45C"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#C8A45C' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                Documents archivés par institution
              </CardTitle>
              <CardDescription className="text-xs">Top 5 ministères — Volume mensuel</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={ministryAreaData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="mefGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0B2E58" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0B2E58" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="mptGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C8A45C" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#C8A45C" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="mepuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B7DD8" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3B7DD8" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="msGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="mdcGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="MEF" name="MEF" stroke="#0B2E58" strokeWidth={2} fill="url(#mefGrad)" dot={false} />
                  <Area type="monotone" dataKey="MPT" name="MPT" stroke="#C8A45C" strokeWidth={2} fill="url(#mptGrad)" dot={false} />
                  <Area type="monotone" dataKey="MEPU" name="MEPU-A" stroke="#3B7DD8" strokeWidth={2} fill="url(#mepuGrad)" dot={false} />
                  <Area type="monotone" dataKey="MS" name="MS" stroke="#10B981" strokeWidth={2} fill="url(#msGrad)" dot={false} />
                  <Area type="monotone" dataKey="MDC" name="MDC" stroke="#8B5CF6" strokeWidth={2} fill="url(#mdcGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          CHARTS ROW 2: BAR + PIE
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                Performance par région administrative
              </CardTitle>
              <CardDescription className="text-xs">Taux de conformité et volume par région</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={regionData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="region" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="performance" name="Performance (%)" radius={[4, 4, 0, 0]}>
                    {regionData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                Répartition par type de document
              </CardTitle>
              <CardDescription className="text-xs">Décrets, Arrêtés, Circulaires, Notes, Rapports, Autres</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={docTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {docTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          PND — PLAN NATIONAL DE DÉVELOPPEMENT
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-md border-[#C8A45C]/20 dark:border-[#D4B878]/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-[#C8A45C]/10 dark:bg-[#D4B878]/20">
                <Shield className="size-4 text-[#C8A45C] dark:text-[#D4B878]" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                  Plan National de Développement (PND 2025-2030)
                </CardTitle>
                <CardDescription className="text-xs">Avancement par axe stratégique</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {pndAxes.map((axe) => (
              <div key={axe.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#0B2E58] dark:text-white">{axe.name}</span>
                  <span className="font-bold" style={{ color: axe.color }}>{axe.value}%</span>
                </div>
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{ backgroundColor: axe.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${axe.value}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ACTIVITY + QUICK ACTIONS ROW
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Activity */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                Activité récente interministérielle
              </CardTitle>
              <CardDescription className="text-xs">Dernières actions sur la plateforme gouvernementale</CardDescription>
            </CardHeader>
            <CardContent className="px-4">
              <div className="max-h-96 space-y-1 overflow-y-auto pr-1">
                {recentActivities.map((activity) => {
                  const IconComp = activity.icon
                  return (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${activityColors[activity.type]}`}>
                        <IconComp className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{activity.label}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                Actions rapides
              </CardTitle>
              <CardDescription className="text-xs">Raccourcis pour les tâches fréquentes</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  className={`${action.color} h-auto flex-col gap-2 rounded-xl py-4 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02]`}
                  onClick={action.onClick}
                >
                  <action.icon className="size-5" />
                  {action.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          HEATMAP — ACTIVITÉ INTERMINISTÉRIELLE
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                  Activité interministérielle par jour et heure
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Intensité d&apos;utilisation de la plateforme gouvernementale
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>Faible</span>
                <div className="flex gap-0.5">
                  {[0, 2, 4, 6, 8, 10].map((v) => (
                    <div key={v} className={`size-3 rounded-sm ${getHeatmapColor(v)}`} />
                  ))}
                </div>
                <span>Élevée</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[480px]">
                {/* Hour labels */}
                <div className="mb-1 flex gap-0.5 pl-10">
                  {heatmapData.hours.map((h) => (
                    <div key={h} className="flex-1 text-center text-[10px] text-muted-foreground">
                      {h}
                    </div>
                  ))}
                </div>
                {/* Grid rows */}
                {heatmapData.days.map((day, dayIndex) => (
                  <div key={day} className="mb-0.5 flex gap-0.5">
                    <div className="flex w-9 shrink-0 items-center text-[10px] font-medium text-muted-foreground">
                      {day}
                    </div>
                    {heatmapData.hours.map((_, hourIndex) => {
                      const value = heatmapData.values[dayIndex * 12 + hourIndex] ?? 0
                      return (
                        <div
                          key={`${day}-${hourIndex}`}
                          className={`flex-1 aspect-square min-w-0 rounded-sm ${getHeatmapColor(value)} transition-colors hover:opacity-80`}
                          title={`${day} ${heatmapData.hours[hourIndex]}: ${value} activités`}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SOVEREIGNTY BADGE
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-sm border-[#0B2E58]/10 dark:border-[#3B7DD8]/20 bg-gradient-to-r from-[#0B2E58]/[0.02] to-[#C8A45C]/[0.02] dark:from-[#3B7DD8]/[0.05] dark:to-[#D4B878]/[0.03]">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#0B2E58] dark:bg-[#3B7DD8]">
                <Lock className="size-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                    Données hébergées en souveraineté nationale
                  </p>
                  <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 gap-1">
                    <Server className="size-3" />
                    Data Center Conakry
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Conformité Loi L/2016/018/AN relative à la protection des données personnelles
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                <Shield className="size-4" />
                Certifié
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
