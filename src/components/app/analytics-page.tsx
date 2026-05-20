'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  FileSpreadsheet,
  Mail,
  Clock,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Target,
  CheckCircle2,
  Loader2,
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
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { useAppStore } from '@/store/app-store'

const CHART_COLORS = ['#0B2E58', '#3B7DD8', '#C8A45C', '#10B981', '#EF4444']

const periods = [
  { label: '7 jours', value: '7d' },
  { label: '30 jours', value: '30d' },
  { label: '90 jours', value: '90d' },
  { label: '1 an', value: '1y' },
] as const

// Period-dependent summary data
const periodSummaryData: Record<string, { label: string; value: string; change: string; trend: 'up' | 'down' }[][]> = {
  '7d': [
    [
      { label: 'Total courriers', value: '647', change: '+5.2%', trend: 'up' as const },
      { label: 'Délai moyen', value: '1.9 j', change: '-8.1%', trend: 'down' as const },
      { label: 'Taux conformité', value: '99.1%', change: '+0.4%', trend: 'up' as const },
      { label: 'Score performance', value: '96.8', change: '+1.2', trend: 'up' as const },
    ],
  ],
  '30d': [
    [
      { label: 'Total courriers', value: '2 847', change: '+12.5%', trend: 'up' as const },
      { label: 'Délai moyen', value: '2.4 j', change: '-15.2%', trend: 'down' as const },
      { label: 'Taux conformité', value: '98.7%', change: '+1.2%', trend: 'up' as const },
      { label: 'Score performance', value: '94.2', change: '+3.8', trend: 'up' as const },
    ],
  ],
  '90d': [
    [
      { label: 'Total courriers', value: '8 234', change: '+18.7%', trend: 'up' as const },
      { label: 'Délai moyen', value: '2.8 j', change: '-22.3%', trend: 'down' as const },
      { label: 'Taux conformité', value: '97.9%', change: '+2.5%', trend: 'up' as const },
      { label: 'Score performance', value: '91.5', change: '+5.1', trend: 'up' as const },
    ],
  ],
  '1y': [
    [
      { label: 'Total courriers', value: '34 560', change: '+24.1%', trend: 'up' as const },
      { label: 'Délai moyen', value: '3.1 j', change: '-35.8%', trend: 'down' as const },
      { label: 'Taux conformité', value: '96.4%', change: '+4.8%', trend: 'up' as const },
      { label: 'Score performance', value: '88.7', change: '+9.3', trend: 'up' as const },
    ],
  ],
}

// Period-dependent monthly chart data
const periodChartData: Record<string, { month: string; courriers: number; documents: number; workflows: number }[]> = {
  '7d': [
    { month: 'Lun', courriers: 45, documents: 120, workflows: 8 },
    { month: 'Mar', courriers: 52, documents: 145, workflows: 12 },
    { month: 'Mer', courriers: 38, documents: 98, workflows: 6 },
    { month: 'Jeu', courriers: 61, documents: 167, workflows: 15 },
    { month: 'Ven', courriers: 55, documents: 134, workflows: 11 },
    { month: 'Sam', courriers: 12, documents: 23, workflows: 2 },
    { month: 'Dim', courriers: 8, documents: 15, workflows: 1 },
  ],
  '30d': [
    { month: 'S1', courriers: 245, documents: 890, workflows: 34 },
    { month: 'S2', courriers: 312, documents: 1023, workflows: 41 },
    { month: 'S3', courriers: 287, documents: 945, workflows: 38 },
    { month: 'S4', courriers: 356, documents: 1134, workflows: 45 },
  ],
  '90d': [
    { month: 'Oct', courriers: 456, documents: 1423, workflows: 55 },
    { month: 'Nov', courriers: 489, documents: 1567, workflows: 58 },
    { month: 'Déc', courriers: 467, documents: 1478, workflows: 53 },
  ],
  '1y': [
    { month: 'Jan', courriers: 245, documents: 890, workflows: 34 },
    { month: 'Fév', courriers: 312, documents: 1023, workflows: 41 },
    { month: 'Mar', courriers: 287, documents: 945, workflows: 38 },
    { month: 'Avr', courriers: 356, documents: 1134, workflows: 45 },
    { month: 'Mai', courriers: 398, documents: 1256, workflows: 52 },
    { month: 'Jun', courriers: 421, documents: 1345, workflows: 48 },
    { month: 'Jul', courriers: 378, documents: 1198, workflows: 43 },
    { month: 'Aoû', courriers: 334, documents: 1067, workflows: 39 },
    { month: 'Sep', courriers: 412, documents: 1289, workflows: 51 },
    { month: 'Oct', courriers: 456, documents: 1423, workflows: 55 },
    { month: 'Nov', courriers: 489, documents: 1567, workflows: 58 },
    { month: 'Déc', courriers: 467, documents: 1478, workflows: 53 },
  ],
}

// Period-dependent service data
const periodServiceData: Record<string, { service: string; courriers: number; documents: number; workflows: number }[]> = {
  '7d': [
    { service: 'Cabinet', courriers: 12, documents: 34, workflows: 5 },
    { service: 'Ressources Humaines', courriers: 9, documents: 28, workflows: 7 },
    { service: 'Finance', courriers: 15, documents: 42, workflows: 4 },
    { service: 'Technique', courriers: 8, documents: 22, workflows: 9 },
    { service: 'Juridique', courriers: 6, documents: 18, workflows: 3 },
    { service: 'Communication', courriers: 4, documents: 12, workflows: 2 },
  ],
  '30d': [
    { service: 'Cabinet', courriers: 45, documents: 120, workflows: 18 },
    { service: 'Ressources Humaines', courriers: 38, documents: 95, workflows: 22 },
    { service: 'Finance', courriers: 52, documents: 140, workflows: 15 },
    { service: 'Technique', courriers: 30, documents: 85, workflows: 28 },
    { service: 'Juridique', courriers: 25, documents: 70, workflows: 12 },
    { service: 'Communication', courriers: 18, documents: 55, workflows: 8 },
  ],
  '90d': [
    { service: 'Cabinet', courriers: 128, documents: 356, workflows: 52 },
    { service: 'Ressources Humaines', courriers: 105, documents: 287, workflows: 64 },
    { service: 'Finance', courriers: 148, documents: 412, workflows: 43 },
    { service: 'Technique', courriers: 89, documents: 245, workflows: 78 },
    { service: 'Juridique', courriers: 72, documents: 198, workflows: 35 },
    { service: 'Communication', courriers: 48, documents: 156, workflows: 22 },
  ],
  '1y': [
    { service: 'Cabinet', courriers: 456, documents: 1340, workflows: 195 },
    { service: 'Ressources Humaines', courriers: 378, documents: 1089, workflows: 242 },
    { service: 'Finance', courriers: 520, documents: 1567, workflows: 167 },
    { service: 'Technique', courriers: 312, documents: 923, workflows: 298 },
    { service: 'Juridique', courriers: 245, documents: 756, workflows: 128 },
    { service: 'Communication', courriers: 198, documents: 534, workflows: 87 },
  ],
}

// Radar data per period
const periodRadarData: Record<string, { dimension: string; score: number }[]> = {
  '7d': [
    { dimension: 'Réactivité', score: 92 },
    { dimension: 'Conformité', score: 99 },
    { dimension: 'Efficacité', score: 85 },
    { dimension: 'Innovation', score: 72 },
    { dimension: 'Satisfaction', score: 94 },
  ],
  '30d': [
    { dimension: 'Réactivité', score: 85 },
    { dimension: 'Conformité', score: 92 },
    { dimension: 'Efficacité', score: 78 },
    { dimension: 'Innovation', score: 65 },
    { dimension: 'Satisfaction', score: 88 },
  ],
  '90d': [
    { dimension: 'Réactivité', score: 78 },
    { dimension: 'Conformité', score: 88 },
    { dimension: 'Efficacité', score: 72 },
    { dimension: 'Innovation', score: 58 },
    { dimension: 'Satisfaction', score: 82 },
  ],
  '1y': [
    { dimension: 'Réactivité', score: 70 },
    { dimension: 'Conformité', score: 82 },
    { dimension: 'Efficacité', score: 65 },
    { dimension: 'Innovation', score: 50 },
    { dimension: 'Satisfaction', score: 75 },
  ],
}

const summaryIcons = [Mail, Clock, ShieldCheck, TrendingUp]

// Top services ranking
const topServices = [
  { rank: 1, name: 'Cabinet du Ministre', courriers: 456, conformite: 99.2, delai: '1.8j' },
  { rank: 2, name: 'Direction Générale', courriers: 389, conformite: 98.7, delai: '2.1j' },
  { rank: 3, name: 'Ressources Humaines', courriers: 334, conformite: 97.9, delai: '2.4j' },
  { rank: 4, name: 'Service Financier', courriers: 298, conformite: 97.1, delai: '2.7j' },
  { rank: 5, name: 'Direction Technique', courriers: 267, conformite: 96.5, delai: '2.9j' },
  { rank: 6, name: 'Service Juridique', courriers: 245, conformite: 99.8, delai: '3.1j' },
  { rank: 7, name: 'Communication', courriers: 198, conformite: 95.3, delai: '3.4j' },
]

// SLA compliance data
const slaData = [
  { type: 'Courriers entrants', total: 1523, dansDelai: 1489, horsDelai: 34, taux: '97.8%' },
  { type: 'Courriers sortants', total: 1324, dansDelai: 1278, horsDelai: 46, taux: '96.5%' },
  { type: 'Documents archivés', total: 8320, dansDelai: 8198, horsDelai: 122, taux: '98.5%' },
  { type: 'Workflows complétés', total: 312, dansDelai: 298, horsDelai: 14, taux: '95.5%' },
  { type: 'Signatures électroniques', total: 187, dansDelai: 184, horsDelai: 3, taux: '98.4%' },
]

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

function exportCSV(data: Record<string, string | number>[], filename: string) {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const csv = [headers.join(','), ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportPDFReport(period: string, summary: { label: string; value: string; change: string }[], chartData: { month: string; courriers: number; documents: number; workflows: number }[], serviceDataRows: { service: string; courriers: number; documents: number; workflows: number }[]) {
  const periodLabel = periods.find(p => p.value === period)?.label || period
  const lines = [
    '═══════════════════════════════════════════════════════════',
    '  eAdministration Suite Guinea — Rapport Analytics',
    '═══════════════════════════════════════════════════════════',
    '',
    `  Période : ${periodLabel}`,
    `  Généré le : ${new Date().toLocaleString('fr-FR')}`,
    '',
    '───────────────────────────────────────────────────────────',
    '  INDICATEURS CLÉS',
    '───────────────────────────────────────────────────────────',
    '',
    ...summary.map(s => `  ${s.label.padEnd(25)} ${s.value.padStart(12)}  (${s.change})`),
    '',
    '───────────────────────────────────────────────────────────',
    '  TENDANCES',
    '───────────────────────────────────────────────────────────',
    '',
    '  ' + ['Période', 'Courriers', 'Documents', 'Workflows'].map(h => h.padEnd(14)).join(''),
    '  ' + '─'.repeat(56),
    ...chartData.map(r => '  ' + [r.month, String(r.courriers), String(r.documents), String(r.workflows)].map(v => v.padEnd(14)).join('')),
    '',
    '───────────────────────────────────────────────────────────',
    '  VOLUME PAR SERVICE',
    '───────────────────────────────────────────────────────────',
    '',
    '  ' + ['Service', 'Courriers', 'Documents', 'Workflows'].map(h => h.padEnd(20)).join(''),
    '  ' + '─'.repeat(80),
    ...serviceDataRows.map(r => '  ' + [r.service, String(r.courriers), String(r.documents), String(r.workflows)].map(v => v.padEnd(20)).join('')),
    '',
    '───────────────────────────────────────────────────────────',
    '  CONFORMITÉ SLA',
    '───────────────────────────────────────────────────────────',
    '',
    '  ' + ['Type', 'Total', 'Dans délai', 'Hors délai', 'Taux'].map(h => h.padEnd(18)).join(''),
    '  ' + '─'.repeat(90),
    ...slaData.map(r => '  ' + [r.type, String(r.total), String(r.dansDelai), String(r.horsDelai), r.taux].map(v => v.padEnd(18)).join('')),
    '',
    '═══════════════════════════════════════════════════════════',
    '  Fin du rapport — eAdministration Suite Guinea',
    '═══════════════════════════════════════════════════════════',
  ]
  const content = lines.join('\n')
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rapport-analytics-${period}-${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AnalyticsPage() {
  const navigate = useAppStore((s) => s.navigate)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30d')
  const [successToast, setSuccessToast] = useState('')
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)

  const currentSummary = periodSummaryData[selectedPeriod]?.[0] || periodSummaryData['30d'][0]
  const currentChartData = periodChartData[selectedPeriod] || periodChartData['30d']
  const currentServiceData = periodServiceData[selectedPeriod] || periodServiceData['30d']
  const currentRadarData = periodRadarData[selectedPeriod] || periodRadarData['30d']

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  const handleExportPDF = useCallback(async () => {
    setExportingPdf(true)
    setSuccessToast('Rapport PDF en cours de génération...')
    // Simulate a brief delay for UX
    await new Promise(r => setTimeout(r, 1200))
    exportPDFReport(selectedPeriod, currentSummary, currentChartData, currentServiceData)
    setSuccessToast('Rapport PDF téléchargé avec succès !')
    setExportingPdf(false)
  }, [selectedPeriod, currentSummary, currentChartData, currentServiceData])

  const handleExportCSV = useCallback(async () => {
    setExportingCsv(true)
    setSuccessToast('Export CSV en cours de génération...')
    await new Promise(r => setTimeout(r, 800))
    // Combine all data into one CSV export
    const allData = currentChartData.map(row => ({
      Période: row.month,
      Courriers: row.courriers,
      Documents: row.documents,
      Workflows: row.workflows,
    }))
    exportCSV(allData, `analytics-${selectedPeriod}-${new Date().toISOString().slice(0, 10)}.csv`)
    setSuccessToast('Export CSV téléchargé avec succès !')
    setExportingCsv(false)
  }, [selectedPeriod, currentChartData])

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-4 md:p-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B2E58] dark:text-white">
            Analytics
          </h1>
          <p className="text-muted-foreground text-sm">
            Analyses avancées et indicateurs de performance — eAdministration Suite
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExportPDF} disabled={exportingPdf}>
            {exportingPdf ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            Export PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExportCSV} disabled={exportingCsv}>
            {exportingCsv ? <Loader2 className="size-3.5 animate-spin" /> : <FileSpreadsheet className="size-3.5" />}
            Export Excel
          </Button>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-sm border-[#C8A45C]/20 dark:border-[#D4B878]/20 bg-gradient-to-r from-[#0B2E58]/[0.02] to-[#C8A45C]/[0.02] dark:from-[#3B7DD8]/[0.05] dark:to-[#D4B878]/[0.03]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-[#0B2E58] dark:text-white">Actions rapides</p>
                <p className="text-xs text-muted-foreground">Raccourcis vers les modules liés</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Tableau de bord', icon: BarChart3, color: 'bg-[#0B2E58] hover:bg-[#0B2E58]/90 text-white', onClick: () => navigate('dashboard') },
                { label: 'Demandes citoyennes', icon: CheckCircle2, color: 'bg-emerald-600 hover:bg-emerald-600/90 text-white', onClick: () => navigate('service-requests') },
                { label: 'Courriers', icon: Mail, color: 'bg-[#3B7DD8] hover:bg-[#3B7DD8]/90 text-white', onClick: () => navigate('courriers') },
                { label: 'Documents GED', icon: FileSpreadsheet, color: 'bg-[#C8A45C] hover:bg-[#C8A45C]/90 text-[#0B2E58]', onClick: () => navigate('ged') },
              ].map(action => (
                <Button key={action.label} className={`${action.color} h-auto flex-col gap-2 rounded-xl py-3 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02]`} onClick={action.onClick}>
                  <action.icon className="size-5" />
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Period Selector */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
        {periods.map((period) => (
          <Button
            key={period.value}
            variant={selectedPeriod === period.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod(period.value)}
            className={
              selectedPeriod === period.value
                ? 'bg-[#0B2E58] text-white hover:bg-[#0B2E58]/90'
                : ''
            }
          >
            {period.label}
          </Button>
        ))}
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {currentSummary.map((card, idx) => {
          const Icon = summaryIcons[idx]
          const isPositive = card.trend === 'up'
          return (
            <motion.div key={card.label} variants={itemVariants}>
              <Card className="glass-card overflow-hidden py-0 shadow-md transition-shadow hover:shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-[#0B2E58]/10 dark:bg-[#3B7DD8]/20">
                      <Icon className="size-4 text-[#0B2E58] dark:text-[#3B7DD8]" />
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold ${
                        isPositive
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {card.change}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <p className="text-xl font-bold tracking-tight text-[#0B2E58] dark:text-white">
                      {card.value}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{card.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Main Chart: Tendances */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
              Tendances — {periods.find(p => p.value === selectedPeriod)?.label || '30 jours'}
            </CardTitle>
            <CardDescription className="text-xs">
              Évolution comparée des courriers, documents et workflows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={currentChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
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
                  dataKey="documents"
                  name="Documents"
                  stroke="#3B7DD8"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#3B7DD8' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="workflows"
                  name="Workflows"
                  stroke="#C8A45C"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#C8A45C' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stacked Bar + Radar */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                Volume par service
              </CardTitle>
              <CardDescription className="text-xs">Répartition des activités par direction</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={currentServiceData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="service"
                    tick={{ fontSize: 9 }}
                    className="text-muted-foreground"
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
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
                  <Bar dataKey="courriers" name="Courriers" stackId="a" fill="#0B2E58" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="documents" name="Documents" stackId="a" fill="#3B7DD8" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="workflows" name="Workflows" stackId="a" fill="#C8A45C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                Performance par dimension
              </CardTitle>
              <CardDescription className="text-xs">Évaluation multicritères de la plateforme</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={currentRadarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid className="stroke-border" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <PolarRadiusAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#0B2E58"
                    fill="#0B2E58"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tables Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Services Ranking */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                    Classement des services
                  </CardTitle>
                  <CardDescription className="text-xs">Top services par volume de courriers</CardDescription>
                </div>
                <BarChart3 className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="px-3">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Courriers</TableHead>
                    <TableHead className="text-right">Conformité</TableHead>
                    <TableHead className="text-right">Délai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topServices.map((service) => (
                    <TableRow key={service.rank}>
                      <TableCell className="text-center">
                        <Badge
                          variant={service.rank <= 3 ? 'default' : 'outline'}
                          className={`size-6 items-center justify-center p-0 text-[10px] ${
                            service.rank <= 3
                              ? 'bg-[#0B2E58] text-white'
                              : ''
                          }`}
                        >
                          {service.rank}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{service.name}</TableCell>
                      <TableCell className="text-right text-xs">{service.courriers}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`text-xs font-semibold ${
                            service.conformite >= 98
                              ? 'text-emerald-600'
                              : service.conformite >= 96
                                ? 'text-amber-600'
                                : 'text-red-500'
                          }`}
                        >
                          {service.conformite}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{service.delai}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* SLA Compliance Table */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                    Conformité SLA
                  </CardTitle>
                  <CardDescription className="text-xs">Respect des délais de traitement</CardDescription>
                </div>
                <Target className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="px-3">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Dans délai</TableHead>
                    <TableHead className="text-right">Hors délai</TableHead>
                    <TableHead className="text-right">Taux</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slaData.map((row) => (
                    <TableRow key={row.type}>
                      <TableCell className="text-xs font-medium">{row.type}</TableCell>
                      <TableCell className="text-right text-xs">{row.total.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs text-emerald-600">{row.dansDelai.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs text-red-500">{row.horsDelai}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            parseFloat(row.taux) >= 98
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : parseFloat(row.taux) >= 96
                                ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          {row.taux}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Export Buttons (bottom) */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-4">
        <div>
          <p className="text-sm font-medium text-[#0B2E58] dark:text-white">Exporter les données</p>
          <p className="text-xs text-muted-foreground">Téléchargez les rapports dans le format de votre choix</p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-1.5 bg-[#0B2E58] text-white hover:bg-[#0B2E58]/90" onClick={handleExportPDF} disabled={exportingPdf}>
            {exportingPdf ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            Export PDF
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={handleExportCSV} disabled={exportingCsv}>
            {exportingCsv ? <Loader2 className="size-3.5 animate-spin" /> : <FileSpreadsheet className="size-3.5" />}
            Export Excel
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg"
          >
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
