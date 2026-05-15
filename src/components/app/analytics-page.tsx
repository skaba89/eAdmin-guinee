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
  Users,
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
import { useCitizenRequestsStore } from '@/store/citizen-requests-store'
import { useGedStore } from '@/store/ged-store'
import { useCourriersStore } from '@/store/courriers-store'
import { useNotificationsStore } from '@/store/notifications-store'
import { useAuditLogsStore } from '@/store/audit-logs-store'
import { useUsersStore } from '@/store/users-store'
import { useBirthCertificateStore } from '@/store/birth-certificate-store'

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const CHART_COLORS = ['#0B2E58', '#3B7DD8', '#C8A45C', '#10B981', '#EF4444']

const periods = [
  { label: '7 jours', value: '7d' },
  { label: '30 jours', value: '30d' },
  { label: '90 jours', value: '90d' },
  { label: '1 an', value: '1y' },
] as const

const FRENCH_MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const FRENCH_DAYS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

// GED category id → display name
const GED_CATEGORY_LABELS: Record<string, string> = {
  etat_civil: 'État Civil',
  justice: 'Justice',
  identification: 'Identification',
  urbanisme: 'Urbanisme',
  entreprise: 'Entreprise',
  education: 'Éducation',
  sante: 'Santé',
  residence: 'Résidence',
  administratif: 'Administratif',
  financier: 'Finance',
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getPeriodMs(period: string): number {
  switch (period) {
    case '7d': return 7 * 86400000
    case '30d': return 30 * 86400000
    case '90d': return 90 * 86400000
    case '1y': return 365 * 86400000
    default: return 30 * 86400000
  }
}

function filterByDate<T>(items: T[], getDate: (item: T) => string | undefined, cutoff: Date): T[] {
  return items.filter(item => {
    const d = getDate(item)
    if (!d) return false
    return new Date(d) >= cutoff
  })
}

function computeChange(current: number, previous: number): { change: string; trend: 'up' | 'down' } {
  if (previous === 0) {
    return { change: current > 0 ? '+Nouveau' : '0%', trend: current > 0 ? 'up' : 'down' }
  }
  const pct = ((current - previous) / previous) * 100
  const sign = pct >= 0 ? '+' : ''
  return { change: `${sign}${pct.toFixed(1)}%`, trend: pct >= 0 ? 'up' : 'down' }
}

function fmtNum(n: number): string {
  return n.toLocaleString('fr-FR')
}

// ─── TIME SERIES AGGREGATION ────────────────────────────────────────────────

interface TimeBucket {
  label: string
  start: Date
  end: Date
}

function generateTimeBuckets(period: string): TimeBucket[] {
  const now = new Date()
  const buckets: TimeBucket[] = []

  if (period === '7d') {
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now)
      dayStart.setDate(now.getDate() - i)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)
      buckets.push({ label: FRENCH_DAYS_SHORT[dayStart.getDay()], start: dayStart, end: dayEnd })
    }
  } else if (period === '30d') {
    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(now)
      weekEnd.setDate(now.getDate() - i * 7)
      weekEnd.setHours(23, 59, 59, 999)
      const weekStart = new Date(weekEnd)
      weekStart.setDate(weekEnd.getDate() - 6)
      weekStart.setHours(0, 0, 0, 0)
      buckets.push({ label: `S${4 - i}`, start: weekStart, end: weekEnd })
    }
  } else if (period === '90d') {
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      buckets.push({ label: FRENCH_MONTHS_SHORT[d.getMonth()], start: d, end })
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      buckets.push({ label: FRENCH_MONTHS_SHORT[d.getMonth()], start: d, end })
    }
  }

  return buckets
}

function countInBuckets<T>(items: T[], getDate: (item: T) => string | undefined, buckets: TimeBucket[]): number[] {
  return buckets.map(bucket =>
    items.filter(item => {
      const d = getDate(item)
      if (!d) return false
      const date = new Date(d)
      return date >= bucket.start && date < bucket.end
    }).length
  )
}

// ─── EXPORT HELPERS ─────────────────────────────────────────────────────────

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

function exportPDFReport(
  period: string,
  summary: { label: string; value: string; change: string }[],
  chartData: { periode: string; demandes: number; documents: number; courriers: number }[],
  serviceDataRows: { service: string; demandes: number; documents: number; courriers: number }[],
  slaRows: { type: string; total: number; dansDelai: number; horsDelai: number; taux: string }[]
) {
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
    '  ' + ['Période', 'Demandes', 'Documents', 'Courriers'].map(h => h.padEnd(14)).join(''),
    '  ' + '─'.repeat(56),
    ...chartData.map(r => '  ' + [r.periode, String(r.demandes), String(r.documents), String(r.courriers)].map(v => v.padEnd(14)).join('')),
    '',
    '───────────────────────────────────────────────────────────',
    '  VOLUME PAR SERVICE',
    '───────────────────────────────────────────────────────────',
    '',
    '  ' + ['Service', 'Demandes', 'Documents', 'Courriers'].map(h => h.padEnd(20)).join(''),
    '  ' + '─'.repeat(80),
    ...serviceDataRows.map(r => '  ' + [r.service, String(r.demandes), String(r.documents), String(r.courriers)].map(v => v.padEnd(20)).join('')),
    '',
    '───────────────────────────────────────────────────────────',
    '  CONFORMITÉ SLA',
    '───────────────────────────────────────────────────────────',
    '',
    '  ' + ['Type', 'Total', 'Dans délai', 'Hors délai', 'Taux'].map(h => h.padEnd(18)).join(''),
    '  ' + '─'.repeat(90),
    ...slaRows.map(r => '  ' + [r.type, String(r.total), String(r.dansDelai), String(r.horsDelai), r.taux].map(v => v.padEnd(18)).join('')),
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

// ─── ANIMATION VARIANTS ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

const summaryIcons = [Mail, Clock, ShieldCheck, Users]

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const navigate = useAppStore((s) => s.navigate)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30d')
  const [successToast, setSuccessToast] = useState('')
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)

  // ── Store subscriptions ──────────────────────────────────────────────────
  const requests = useCitizenRequestsStore((s) => s.requests)
  const gedDocuments = useGedStore((s) => s.documents)
  const courriers = useCourriersStore((s) => s.courriers)
  const notifications = useNotificationsStore((s) => s.notifications)
  const auditLogs = useAuditLogsStore((s) => s.logs)
  const users = useUsersStore((s) => s.users)
  const birthRecords = useBirthCertificateStore((s) => s.records)

  // ── Period-based filtering ───────────────────────────────────────────────
  const periodCutoff = useMemo(() => {
    const now = new Date()
    return new Date(now.getTime() - getPeriodMs(selectedPeriod))
  }, [selectedPeriod])

  const prevPeriodCutoff = useMemo(() => {
    const now = new Date()
    return new Date(now.getTime() - 2 * getPeriodMs(selectedPeriod))
  }, [selectedPeriod])

  // Current period data
  const periodRequests = useMemo(() => filterByDate(requests, r => r.createdAt, periodCutoff), [requests, periodCutoff])
  const periodDocs = useMemo(() => filterByDate(gedDocuments, d => d.createdAt, periodCutoff), [gedDocuments, periodCutoff])
  const periodCourriers = useMemo(() => filterByDate(courriers, c => c.createdAt, periodCutoff), [courriers, periodCutoff])
  const periodNotifs = useMemo(() => filterByDate(notifications, n => n.date, periodCutoff), [notifications, periodCutoff])
  const periodLogs = useMemo(() => filterByDate(auditLogs, l => l.timestamp, periodCutoff), [auditLogs, periodCutoff])

  // Derived notification & audit stats
  const unreadNotifs = useMemo(() => periodNotifs.filter(n => !n.read).length, [periodNotifs])
  const criticalLogs = useMemo(() => periodLogs.filter(l => l.severity === 'critical').length, [periodLogs])

  // Previous period data (for change computation)
  const prevPeriodRequests = useMemo(() =>
    requests.filter(r => {
      const d = new Date(r.createdAt)
      return d >= prevPeriodCutoff && d < periodCutoff
    }), [requests, prevPeriodCutoff, periodCutoff])

  const prevPeriodDocs = useMemo(() =>
    gedDocuments.filter(d => {
      const date = new Date(d.createdAt)
      return date >= prevPeriodCutoff && date < periodCutoff
    }), [gedDocuments, prevPeriodCutoff, periodCutoff])

  const prevPeriodCourriers = useMemo(() =>
    courriers.filter(c => {
      const d = new Date(c.createdAt)
      return d >= prevPeriodCutoff && d < periodCutoff
    }), [courriers, prevPeriodCutoff, periodCutoff])

  // ── Summary cards ────────────────────────────────────────────────────────
  const summaryCards = useMemo(() => {
    const totalRequests = periodRequests.length
    const prevTotalRequests = prevPeriodRequests.length
    const reqChange = computeChange(totalRequests, prevTotalRequests)

    // Average processing delay for completed requests
    const completedReqs = periodRequests.filter(r => r.completedAt)
    const avgDelay = completedReqs.length > 0
      ? completedReqs.reduce((sum, r) =>
          sum + (new Date(r.completedAt!).getTime() - new Date(r.createdAt).getTime()) / 86400000, 0
        ) / completedReqs.length
      : 0

    const prevCompletedReqs = prevPeriodRequests.filter(r => r.completedAt)
    const prevAvgDelay = prevCompletedReqs.length > 0
      ? prevCompletedReqs.reduce((sum, r) =>
          sum + (new Date(r.completedAt!).getTime() - new Date(r.createdAt).getTime()) / 86400000, 0
        ) / prevCompletedReqs.length
      : 0

    // Delay change: lower is better, so invert the direction for display
    const delayDiff = prevAvgDelay - avgDelay // positive = improvement
    const delayChangeStr = prevAvgDelay > 0
      ? `${delayDiff >= 0 ? '+' : ''}${delayDiff.toFixed(1)} j`
      : '—'
    const delayTrend: 'up' | 'down' = delayDiff >= 0 ? 'up' : 'down'

    // Conformity rate (% of valid/archived GED documents)
    const conformDocs = periodDocs.filter(d => d.status === 'valide' || d.status === 'archive').length
    const conformRate = periodDocs.length > 0 ? (conformDocs / periodDocs.length) * 100 : 100

    const prevConformDocs = prevPeriodDocs.filter(d => d.status === 'valide' || d.status === 'archive').length
    const prevConformRate = prevPeriodDocs.length > 0 ? (prevConformDocs / prevPeriodDocs.length) * 100 : 100
    const conformChange = computeChange(conformRate, prevConformRate)

    // Active users
    const activeUsers = users.filter(u => u.status === 'actif').length
    const recentlyActive = users.filter(u => u.lastLogin && new Date(u.lastLogin) >= periodCutoff && u.status === 'actif').length
    const prevRecentlyActive = users.filter(u =>
      u.lastLogin && new Date(u.lastLogin) >= prevPeriodCutoff && new Date(u.lastLogin) < periodCutoff
    ).length
    const usersChange = computeChange(recentlyActive, prevRecentlyActive)

    return [
      { label: 'Total demandes', value: fmtNum(totalRequests), change: reqChange.change, trend: reqChange.trend as 'up' | 'down' },
      { label: 'Délai moyen', value: `${avgDelay.toFixed(1)} j`, change: delayChangeStr, trend: delayTrend },
      { label: 'Taux conformité', value: `${conformRate.toFixed(1)}%`, change: conformChange.change, trend: conformChange.trend as 'up' | 'down' },
      { label: 'Utilisateurs actifs', value: fmtNum(activeUsers), change: usersChange.change, trend: usersChange.trend as 'up' | 'down' },
    ]
  }, [periodRequests, prevPeriodRequests, periodDocs, prevPeriodDocs, users, periodCutoff, prevPeriodCutoff])

  // ── Line chart data ──────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const buckets = generateTimeBuckets(selectedPeriod)
    const demandesCounts = countInBuckets(periodRequests, r => r.createdAt, buckets)
    const docsCounts = countInBuckets(periodDocs, d => d.createdAt, buckets)
    const courriersCounts = countInBuckets(periodCourriers, c => c.createdAt, buckets)

    return buckets.map((b, i) => ({
      month: b.label,
      demandes: demandesCounts[i],
      documents: docsCounts[i],
      courriers: courriersCounts[i],
    }))
  }, [selectedPeriod, periodRequests, periodDocs, periodCourriers])

  // ── Stacked bar chart data (by service) ──────────────────────────────────
  const serviceData = useMemo(() => {
    const serviceMap = new Map<string, { demandes: number; documents: number; courriers: number }>()

    // From citizen requests — group by assignedService
    for (const req of periodRequests) {
      const svc = req.assignedService || req.category
      const existing = serviceMap.get(svc) || { demandes: 0, documents: 0, courriers: 0 }
      existing.demandes++
      serviceMap.set(svc, existing)
    }

    // From GED documents — group by category label
    for (const doc of periodDocs) {
      const svc = GED_CATEGORY_LABELS[doc.category] || doc.category
      const existing = serviceMap.get(svc) || { demandes: 0, documents: 0, courriers: 0 }
      existing.documents++
      serviceMap.set(svc, existing)
    }

    // From courriers — group by from field (abbreviated)
    for (const c of periodCourriers) {
      const svc = c.from.length > 25 ? c.from.substring(0, 22) + '…' : c.from
      const existing = serviceMap.get(svc) || { demandes: 0, documents: 0, courriers: 0 }
      existing.courriers++
      serviceMap.set(svc, existing)
    }

    return Array.from(serviceMap.entries())
      .map(([service, counts]) => ({ service, ...counts }))
      .sort((a, b) => (b.demandes + b.documents + b.courriers) - (a.demandes + a.documents + a.courriers))
      .slice(0, 8)
  }, [periodRequests, periodDocs, periodCourriers])

  // ── Radar chart data ─────────────────────────────────────────────────────
  const radarData = useMemo(() => {
    // Réactivité: % of requests that have progressed beyond initial status
    const progressedReqs = periodRequests.filter(r => r.status !== 'soumise').length
    const reactivite = periodRequests.length > 0 ? (progressedReqs / periodRequests.length) * 100 : 0

    // Conformité: % of valid/archived GED documents
    const conformDocs = periodDocs.filter(d => d.status === 'valide' || d.status === 'archive').length
    const conformite = periodDocs.length > 0 ? (conformDocs / periodDocs.length) * 100 : 100

    // Efficacité: % of completed/delivered citizen requests
    const completedReqs = periodRequests.filter(r => ['validee', 'prete', 'livree'].includes(r.status)).length
    const efficacite = periodRequests.length > 0 ? (completedReqs / periodRequests.length) * 100 : 0

    // Innovation: % of requests with online delivery
    const onlineDeliveries = periodRequests.filter(r => r.deliveryMode === 'en_ligne').length
    const innovation = periodRequests.length > 0 ? (onlineDeliveries / periodRequests.length) * 100 : 0

    // Satisfaction: composite score based on completion rate and low rejection
    const rejectedReqs = periodRequests.filter(r => r.status === 'rejetee').length
    const satisfaction = periodRequests.length > 0
      ? Math.min(100, ((completedReqs + 0.5 * (periodRequests.length - completedReqs - rejectedReqs)) / periodRequests.length) * 100)
      : 0

    return [
      { dimension: 'Réactivité', score: Math.round(reactivite) },
      { dimension: 'Conformité', score: Math.round(conformite) },
      { dimension: 'Efficacité', score: Math.round(efficacite) },
      { dimension: 'Innovation', score: Math.round(innovation) },
      { dimension: 'Satisfaction', score: Math.round(satisfaction) },
    ]
  }, [periodRequests, periodDocs])

  // ── Top services ranking ─────────────────────────────────────────────────
  const topServices = useMemo(() => {
    const svcMap = new Map<string, { count: number; completed: number; totalDelayDays: number; delayCount: number }>()

    for (const req of periodRequests) {
      const svc = req.assignedService || req.category
      const existing = svcMap.get(svc) || { count: 0, completed: 0, totalDelayDays: 0, delayCount: 0 }
      existing.count++
      if (['validee', 'prete', 'livree'].includes(req.status)) existing.completed++
      if (req.completedAt) {
        existing.totalDelayDays += (new Date(req.completedAt).getTime() - new Date(req.createdAt).getTime()) / 86400000
        existing.delayCount++
      }
      svcMap.set(svc, existing)
    }

    return Array.from(svcMap.entries())
      .map(([name, data]) => ({
        name,
        courriers: data.count,
        conformite: data.count > 0 ? +((data.completed / data.count) * 100).toFixed(1) : 0,
        delai: data.delayCount > 0 ? `${(data.totalDelayDays / data.delayCount).toFixed(1)}j` : '—',
      }))
      .sort((a, b) => b.courriers - a.courriers)
      .slice(0, 7)
      .map((item, idx) => ({ rank: idx + 1, ...item }))
  }, [periodRequests])

  // ── SLA compliance data ──────────────────────────────────────────────────
  const slaData = useMemo(() => {
    const SLA_DAYS = 5

    // Courriers entrants
    const entrants = periodCourriers.filter(c => c.direction === 'entrant')
    const entrantsDansDelai = entrants.filter(c => {
      if (!c.deadline) return true
      if (['traite', 'vise', 'archive'].includes(c.status)) return new Date(c.updatedAt) <= new Date(c.deadline)
      return new Date(c.deadline) >= new Date()
    }).length

    // Courriers sortants
    const sortants = periodCourriers.filter(c => c.direction === 'sortant')
    const sortantsDansDelai = sortants.filter(c => {
      if (!c.deadline) return true
      if (['traite', 'vise', 'archive'].includes(c.status)) return new Date(c.updatedAt) <= new Date(c.deadline)
      return new Date(c.deadline) >= new Date()
    }).length

    // Documents GED
    const docsDansDelai = periodDocs.filter(d => {
      if (d.status === 'valide' || d.status === 'archive') return true
      const daysSince = (Date.now() - new Date(d.createdAt).getTime()) / 86400000
      return daysSince < SLA_DAYS
    }).length

    // Demandes traitées (with completedAt)
    const completedRequests = periodRequests.filter(r => r.completedAt)
    const reqsDansDelai = completedRequests.filter(r => {
      const days = (new Date(r.completedAt!).getTime() - new Date(r.createdAt).getTime()) / 86400000
      return days <= SLA_DAYS
    }).length

    // Actes d'état civil (from birth certificate store)
    const totalBirth = birthRecords.length
    const activeBirth = birthRecords.filter(r => r.status === 'active').length

    return [
      {
        type: 'Courriers entrants',
        total: entrants.length,
        dansDelai: entrantsDansDelai,
        horsDelai: Math.max(0, entrants.length - entrantsDansDelai),
        taux: entrants.length > 0 ? `${((entrantsDansDelai / entrants.length) * 100).toFixed(1)}%` : '—',
      },
      {
        type: 'Courriers sortants',
        total: sortants.length,
        dansDelai: sortantsDansDelai,
        horsDelai: Math.max(0, sortants.length - sortantsDansDelai),
        taux: sortants.length > 0 ? `${((sortantsDansDelai / sortants.length) * 100).toFixed(1)}%` : '—',
      },
      {
        type: 'Documents archivés',
        total: periodDocs.length,
        dansDelai: docsDansDelai,
        horsDelai: Math.max(0, periodDocs.length - docsDansDelai),
        taux: periodDocs.length > 0 ? `${((docsDansDelai / periodDocs.length) * 100).toFixed(1)}%` : '—',
      },
      {
        type: 'Demandes traitées',
        total: completedRequests.length,
        dansDelai: reqsDansDelai,
        horsDelai: Math.max(0, completedRequests.length - reqsDansDelai),
        taux: completedRequests.length > 0 ? `${((reqsDansDelai / completedRequests.length) * 100).toFixed(1)}%` : '—',
      },
      {
        type: 'Actes état civil',
        total: totalBirth,
        dansDelai: activeBirth,
        horsDelai: Math.max(0, totalBirth - activeBirth),
        taux: totalBirth > 0 ? `${((activeBirth / totalBirth) * 100).toFixed(1)}%` : '—',
      },
      {
        type: 'Notifications lues',
        total: periodNotifs.length,
        dansDelai: periodNotifs.filter(n => n.read).length,
        horsDelai: unreadNotifs,
        taux: periodNotifs.length > 0 ? `${(((periodNotifs.length - unreadNotifs) / periodNotifs.length) * 100).toFixed(1)}%` : '—',
      },
      {
        type: 'Événements critique',
        total: periodLogs.length,
        dansDelai: periodLogs.length - criticalLogs,
        horsDelai: criticalLogs,
        taux: periodLogs.length > 0 ? `${(((periodLogs.length - criticalLogs) / periodLogs.length) * 100).toFixed(1)}%` : '—',
      },
    ]
  }, [periodCourriers, periodDocs, periodRequests, birthRecords, periodNotifs, unreadNotifs, periodLogs, criticalLogs])

  // ── Toast auto-dismiss ───────────────────────────────────────────────────
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  // ── Export handlers ──────────────────────────────────────────────────────
  const handleExportPDF = useCallback(async () => {
    setExportingPdf(true)
    setSuccessToast('Rapport PDF en cours de génération...')
    await new Promise(r => setTimeout(r, 1200))
    exportPDFReport(
      selectedPeriod,
      summaryCards,
      chartData.map(d => ({ periode: d.month, demandes: d.demandes, documents: d.documents, courriers: d.courriers })),
      serviceData,
      slaData,
    )
    setSuccessToast('Rapport PDF téléchargé avec succès !')
    setExportingPdf(false)
  }, [selectedPeriod, summaryCards, chartData, serviceData, slaData])

  const handleExportCSV = useCallback(async () => {
    setExportingCsv(true)
    setSuccessToast('Export CSV en cours de génération...')
    await new Promise(r => setTimeout(r, 800))
    const allData = chartData.map(row => ({
      Période: row.month,
      Demandes: row.demandes,
      Documents: row.documents,
      Courriers: row.courriers,
    }))
    exportCSV(allData, `analytics-${selectedPeriod}-${new Date().toISOString().slice(0, 10)}.csv`)
    setSuccessToast('Export CSV téléchargé avec succès !')
    setExportingCsv(false)
  }, [selectedPeriod, chartData])

  // ── RENDER ───────────────────────────────────────────────────────────────

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
        {summaryCards.map((card, idx) => {
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
              Évolution comparée des demandes, documents et courriers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
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
                  dataKey="demandes"
                  name="Demandes"
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
                  dataKey="courriers"
                  name="Courriers"
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
                <BarChart data={serviceData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
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
                  <Bar dataKey="demandes" name="Demandes" stackId="a" fill="#0B2E58" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="documents" name="Documents" stackId="a" fill="#3B7DD8" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="courriers" name="Courriers" stackId="a" fill="#C8A45C" radius={[4, 4, 0, 0]} />
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
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
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
                  <CardDescription className="text-xs">Top services par volume de demandes</CardDescription>
                </div>
                <BarChart3 className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="px-3">
              {topServices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 text-center">#</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead className="text-right">Demandes</TableHead>
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
              ) : (
                <p className="py-8 text-center text-xs text-muted-foreground">Aucune donnée pour cette période</p>
              )}
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
                            row.taux !== '—' && parseFloat(row.taux) >= 98
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : row.taux !== '—' && parseFloat(row.taux) >= 96
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
