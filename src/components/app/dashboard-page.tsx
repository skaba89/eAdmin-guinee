'use client'

import { motion } from 'framer-motion'
import {
  Mail,
  FileText,
  GitBranch,
  PenTool,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Upload,
  Users,
  TrendingUp,
  Award,
  BarChart3,
  Activity,
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

const CHART_COLORS = ['#0B2E58', '#3B7DD8', '#C8A45C', '#10B981', '#EF4444']

const kpiIcons = [Mail, FileText, GitBranch, Clock, Award, Users]

const recentActivities = [
  { id: 1, type: 'courrier', label: 'Courrier CR-2024-0847 reçu', time: 'Il y a 5 min', icon: Mail },
  { id: 2, type: 'document', label: 'Document "Budget 2024" archivé', time: 'Il y a 12 min', icon: FileText },
  { id: 3, type: 'workflow', label: 'Workflow "Approbation marché" terminé', time: 'Il y a 28 min', icon: GitBranch },
  { id: 4, type: 'signature', label: 'Signature demandée pour Arrêté n°45', time: 'Il y a 45 min', icon: PenTool },
  { id: 5, type: 'courrier', label: 'Courrier CS-2024-0612 envoyé', time: 'Il y a 1h', icon: Mail },
  { id: 6, type: 'document', label: 'Rapport annuel partagé avec DG', time: 'Il y a 1h 30', icon: FileText },
  { id: 7, type: 'workflow', label: 'Workflow "Validation contrat" en cours', time: 'Il y a 2h', icon: GitBranch },
  { id: 8, type: 'signature', label: 'Décret n°2024-112 signé', time: 'Il y a 3h', icon: PenTool },
]

const activityColors: Record<string, string> = {
  courrier: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  document: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
  workflow: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
  signature: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
}

const quickActions = [
  { label: 'Nouveau courrier', icon: Mail, color: 'bg-[#0B2E58] hover:bg-[#0B2E58]/90 text-white' },
  { label: 'Upload document', icon: Upload, color: 'bg-[#3B7DD8] hover:bg-[#3B7DD8]/90 text-white' },
  { label: 'Créer workflow', icon: GitBranch, color: 'bg-[#C8A45C] hover:bg-[#C8A45C]/90 text-white' },
  { label: 'Demande signature', icon: PenTool, color: 'bg-emerald-600 hover:bg-emerald-600/90 text-white' },
]

const pieData = [
  { name: 'Entrants', value: DEMO_STATS.courriers.entrants },
  { name: 'Sortants', value: DEMO_STATS.courriers.sortants },
  { name: 'En attente', value: DEMO_STATS.courriers.enAttente },
]

// Heatmap data: 7 days x 12 time slots
const heatmapData = (() => {
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const hours = ['8h', '9h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h', '19h']
  const seed = [3, 7, 9, 8, 4, 2, 6, 10, 9, 7, 5, 2, 5, 8, 10, 9, 6, 3, 7, 9, 8, 6, 4, 1, 4, 6, 8, 7, 5, 3, 8, 10, 9, 7, 4, 2, 6, 9, 7, 5, 3, 1, 7, 8, 6, 4, 2, 1, 2, 3, 5, 4, 2, 1, 3, 4, 3, 2, 1, 0, 1, 1, 2, 1, 1, 0, 1, 2, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0]
  return { days, hours, values: seed }
})()

function getHeatmapColor(value: number): string {
  if (value === 0) return 'bg-muted/30'
  if (value <= 2) return 'bg-emerald-200 dark:bg-emerald-900/40'
  if (value <= 4) return 'bg-emerald-300 dark:bg-emerald-800/50'
  if (value <= 6) return 'bg-emerald-400 dark:bg-emerald-700/60'
  if (value <= 8) return 'bg-emerald-500 dark:bg-emerald-600/70'
  return 'bg-emerald-600 dark:bg-emerald-500/80'
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

export default function DashboardPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-4 md:p-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B2E58] dark:text-white">
            Tableau de bord
          </h1>
          <p className="text-muted-foreground text-sm">
            Vue d&apos;ensemble de l&apos;activité administrative — DataSphere Innovation
          </p>
        </div>
        <Badge variant="outline" className="w-fit gap-1.5 text-xs">
          <Activity className="size-3" />
          Mis à jour en temps réel
        </Badge>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 lg:gap-4">
        {DEMO_KPI.map((kpi, index) => {
          const Icon = kpiIcons[index]
          const isUp = kpi.trend === 'up'
          return (
            <motion.div key={kpi.label} variants={itemVariants}>
              <Card className="glass-card overflow-hidden py-0 shadow-md transition-shadow hover:shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-[#0B2E58]/10 dark:bg-[#3B7DD8]/20">
                      <Icon className="size-4 text-[#0B2E58] dark:text-[#3B7DD8]" />
                    </div>
                    <div className={`flex items-center gap-0.5 text-xs font-semibold ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
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

      {/* Charts Row 1: Line + Area */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                Évolution des courriers
              </CardTitle>
              <CardDescription className="text-xs">Volume mensuel sur 12 mois</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={MONTHLY_DATA} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                  />
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
                    dataKey="workflows"
                    name="Workflows"
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
                Documents traités
              </CardTitle>
              <CardDescription className="text-xs">Volume mensuel sur 12 mois</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={MONTHLY_DATA} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="docGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B7DD8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B7DD8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="documents"
                    name="Documents"
                    stroke="#3B7DD8"
                    strokeWidth={2.5}
                    fill="url(#docGradient)"
                    dot={{ r: 3, fill: '#3B7DD8' }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 2: Bar + Pie */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                Workflows par mois
              </CardTitle>
              <CardDescription className="text-xs">Nombre de workflows complétés mensuellement</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={MONTHLY_DATA} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="workflows" name="Workflows" radius={[4, 4, 0, 0]}>
                    {MONTHLY_DATA.map((_, index) => (
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
                Répartition des courriers
              </CardTitle>
              <CardDescription className="text-xs">Entrants, sortants et en attente</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Activity + Quick Actions Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Activity */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                Activité récente
              </CardTitle>
              <CardDescription className="text-xs">Dernières actions sur la plateforme</CardDescription>
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
            <CardContent className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  className={`${action.color} h-auto flex-col gap-2 rounded-xl py-4 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02]`}
                >
                  <action.icon className="size-5" />
                  {action.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Performance Heatmap */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                  Activité par heure et jour
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Intensité d&apos;utilisation de la plateforme
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
    </motion.div>
  )
}
