'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  TrendingUp,
  Clock,
  Building2,
  BarChart3,
  Users,
  ThumbsUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Target,
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GUINEA_COLORS } from '@/lib/design-system'

// ─── DATA ─────────────────────────────────────────────────────────────────────

// Document processing stats
const docStats = {
  total: 87450,
  processed: 72100,
  pending: 12400,
  rejected: 2950,
  avgProcessingTime: 1.8, // days
  trend: 22.1,
}

// Monthly request volume (12 months)
const monthlyVolume = [
  { month: 'Jan', value: 1200 },
  { month: 'Fév', value: 1350 },
  { month: 'Mar', value: 1180 },
  { month: 'Avr', value: 1480 },
  { month: 'Mai', value: 1620 },
  { month: 'Jun', value: 1780 },
  { month: 'Jul', value: 1550 },
  { month: 'Aoû', value: 1420 },
  { month: 'Sep', value: 1680 },
  { month: 'Oct', value: 1850 },
  { month: 'Nov', value: 1980 },
  { month: 'Déc', value: 1920 },
]

// Response time by department (days)
const responseTimes = [
  { dept: 'MEF', time: 1.2, target: 2.0 },
  { dept: 'MPT', time: 1.8, target: 2.0 },
  { dept: 'MEPU-A', time: 2.3, target: 2.0 },
  { dept: 'MS', time: 1.5, target: 2.0 },
  { dept: 'MDC', time: 2.8, target: 2.0 },
  { dept: 'MJ', time: 1.9, target: 2.0 },
]

// Department performance scores
const deptPerformance = [
  { name: 'Finances (MEF)', score: 92, requests: 3420 },
  { name: 'Territoire (MPT)', score: 85, requests: 2180 },
  { name: 'Éducation (MEPU-A)', score: 78, requests: 1850 },
  { name: 'Santé (MS)', score: 82, requests: 1540 },
  { name: 'Décentralisation', score: 71, requests: 1280 },
  { name: 'Justice (MJ)', score: 88, requests: 1960 },
  { name: 'Agriculture', score: 68, requests: 920 },
  { name: 'Mines (MDC)', score: 75, requests: 1120 },
]

// Citizen satisfaction (quarterly)
const satisfactionData = [
  { quarter: 'Q1 2025', score: 3.8 },
  { quarter: 'Q2 2025', score: 4.0 },
  { quarter: 'Q3 2025', score: 4.2 },
  { quarter: 'Q4 2025', score: 4.5 },
  { quarter: 'Q1 2026', score: 4.7 },
]

// Processing distribution
const processingDistribution = [
  { label: '< 24h', value: 45, color: GUINEA_COLORS.green },
  { label: '1-3j', value: 30, color: GUINEA_COLORS.yellow },
  { label: '3-7j', value: 18, color: '#3B7DD8' },
  { label: '> 7j', value: 7, color: GUINEA_COLORS.red },
]

// ─── SVG CHART HELPERS ────────────────────────────────────────────────────────

function SvgLineChart({ data, width = 500, height = 200, color = '#0B2E58' }: {
  data: { month: string; value: number }[]
  width?: number
  height?: number
  color?: string
}) {
  const padding = { top: 20, right: 20, bottom: 30, left: 40 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom
  const maxVal = Math.max(...data.map(d => d.value)) * 1.1
  const minVal = 0

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - ((d.value - minVal) / (maxVal - minVal)) * chartH,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
        <line
          key={pct}
          x1={padding.left}
          y1={padding.top + chartH * (1 - pct)}
          x2={width - padding.right}
          y2={padding.top + chartH * (1 - pct)}
          stroke="currentColor"
          className="text-border"
          strokeWidth={0.5}
          strokeDasharray={pct === 0 || pct === 1 ? '0' : '4 4'}
        />
      ))}
      {/* Area fill */}
      <path d={areaPath} fill={color} opacity={0.08} />
      {/* Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill={color} stroke="white" strokeWidth={2} className="transition-all duration-200 hover:r-6" />
        </g>
      ))}
      {/* X labels */}
      {data.map((d, i) => (
        <text key={i} x={padding.left + (i / (data.length - 1)) * chartW} y={height - 8} textAnchor="middle" className="fill-muted-foreground text-[10px]">
          {d.month}
        </text>
      ))}
      {/* Y labels */}
      {[0, 0.5, 1].map((pct) => (
        <text key={pct} x={padding.left - 8} y={padding.top + chartH * (1 - pct) + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
          {Math.round(minVal + (maxVal - minVal) * pct)}
        </text>
      ))}
    </svg>
  )
}

function SvgBarChart({ data, width = 500, height = 200 }: {
  data: { dept: string; time: number; target: number }[]
  width?: number
  height?: number
}) {
  const padding = { top: 20, right: 20, bottom: 40, left: 40 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom
  const maxVal = Math.max(...data.map(d => Math.max(d.time, d.target))) * 1.2
  const barWidth = chartW / data.length * 0.35
  const gap = chartW / data.length

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Target line */}
      {data[0] && (
        <line
          x1={padding.left}
          y1={padding.top + chartH - (data[0].target / maxVal) * chartH}
          x2={width - padding.right}
          y2={padding.top + chartH - (data[0].target / maxVal) * chartH}
          stroke={GUINEA_COLORS.red}
          strokeWidth={1.5}
          strokeDasharray="6 3"
        />
      )}
      {data.map((d, i) => {
        const x = padding.left + i * gap + gap * 0.15
        const barH = (d.time / maxVal) * chartH
        const y = padding.top + chartH - barH
        const isOverTarget = d.time > d.target

        return (
          <g key={i}>
            {/* Bar */}
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={3}
              fill={isOverTarget ? GUINEA_COLORS.red : GUINEA_COLORS.green}
              opacity={0.8}
              className="transition-all duration-200 hover:opacity-100"
            />
            {/* Value label */}
            <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" className="fill-foreground text-[10px] font-semibold">
              {d.time}j
            </text>
            {/* X label */}
            <text x={x + barWidth / 2} y={height - 10} textAnchor="middle" className="fill-muted-foreground text-[10px]">
              {d.dept}
            </text>
          </g>
        )
      })}
      {/* Target label */}
      <text x={width - padding.right} y={padding.top + chartH - (data[0]?.target / maxVal) * chartH - 5} textAnchor="end" className="fill-[#CE1126] text-[10px] font-semibold">
        Objectif: {data[0]?.target}j
      </text>
    </svg>
  )
}

function SvgDonutChart({ segments, width = 200, height = 200 }: {
  segments: { label: string; value: number; color: string }[]
  width?: number
  height?: number
}) {
  const cx = width / 2
  const cy = height / 2
  const radius = 70
  const strokeWidth = 25
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  const circumference = 2 * Math.PI * radius

  let offset = 0
  const arcs = segments.map((seg) => {
    const pct = seg.value / total
    const dashArray = `${pct * circumference} ${(1 - pct) * circumference}`
    const dashOffset = -offset * circumference
    offset += pct
    return { ...seg, dashArray, dashOffset, pct }
  })

  return (
    <div className="flex items-center gap-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-32 sm:w-40 shrink-0" preserveAspectRatio="xMidYMid meet">
        {/* Background ring */}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="currentColor" className="text-muted/30" strokeWidth={strokeWidth} />
        {/* Segments */}
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeDasharray={arc.dashArray}
            strokeDashoffset={arc.dashOffset}
            strokeLinecap="round"
            className="transition-all duration-500"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ))}
        {/* Center text */}
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-foreground text-lg font-bold">{total}%</text>
        <text x={cx} y={cy + 10} textAnchor="middle" className="fill-muted-foreground text-[10px]">Traité</text>
      </svg>
      <div className="space-y-2">
        {arcs.map((arc, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: arc.color }} />
            <span className="text-muted-foreground">{arc.label}</span>
            <span className="font-bold tabular-nums ml-auto">{arc.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SvgHorizontalBarChart({ data, maxValue = 100 }: {
  data: { name: string; score: number; requests: number }[]
  maxValue?: number
}) {
  return (
    <div className="space-y-3">
      {data.map((item, idx) => (
        <div key={idx} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#0B2E58] dark:text-white truncate max-w-[200px]">{item.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{item.requests} demandes</span>
              <span className="font-bold tabular-nums w-10 text-right" style={{ color: item.score >= 80 ? GUINEA_COLORS.green : item.score >= 70 ? GUINEA_COLORS.yellow : GUINEA_COLORS.red }}>
                {item.score}%
              </span>
            </div>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/60">
            <motion.div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ backgroundColor: item.score >= 80 ? GUINEA_COLORS.green : item.score >= 70 ? GUINEA_COLORS.yellow : GUINEA_COLORS.red }}
              initial={{ width: 0 }}
              animate={{ width: `${(item.score / maxValue) * 100}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: idx * 0.05 }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── ANIMATION VARIANTS ──────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<'6m' | '12m'>('12m')

  const filteredVolume = useMemo(() => {
    if (timeRange === '6m') return monthlyVolume.slice(-6)
    return monthlyVolume
  }, [timeRange])

  const avgSatisfaction = (satisfactionData.reduce((sum, d) => sum + d.score, 0) / satisfactionData.length).toFixed(1)

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5 p-4 md:p-6 dashboard-bg-v2"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0B2E58] to-[#3B7DD8] shadow-sm">
              <BarChart3 className="size-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0B2E58] dark:text-white">Tableau de bord analytique</h2>
              <p className="text-xs text-muted-foreground">Métriques de performance et indicateurs clés</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
            <Button
              variant={timeRange === '6m' ? 'default' : 'ghost'}
              size="sm"
              className={`h-7 text-xs ${timeRange === '6m' ? 'bg-[#0B2E58] dark:bg-[#3B7DD8] text-white' : ''}`}
              onClick={() => setTimeRange('6m')}
            >
              6 mois
            </Button>
            <Button
              variant={timeRange === '12m' ? 'default' : 'ghost'}
              size="sm"
              className={`h-7 text-xs ${timeRange === '12m' ? 'bg-[#0B2E58] dark:bg-[#3B7DD8] text-white' : ''}`}
              onClick={() => setTimeRange('12m')}
            >
              12 mois
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Top metric cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Documents traités', value: docStats.processed.toLocaleString('fr-FR'), change: `+${docStats.trend}%`, trend: 'up' as const, icon: FileText, gradient: 'from-[#009460] to-[#00B870]' },
          { label: 'En attente', value: docStats.pending.toLocaleString('fr-FR'), change: '-8.2%', trend: 'down' as const, icon: Clock, gradient: 'from-[#FCD116] to-[#D4AD12]' },
          { label: 'Temps moyen', value: `${docStats.avgProcessingTime}j`, change: '-32.5%', trend: 'down' as const, icon: Zap, gradient: 'from-[#0B2E58] to-[#3B7DD8]' },
          { label: 'Satisfaction', value: `${avgSatisfaction}/5`, change: '+0.4', trend: 'up' as const, icon: ThumbsUp, gradient: 'from-[#CE1126] to-[#E8384F]' },
        ].map((metric) => {
          const Icon = metric.icon
          const isPositive = metric.trend === 'up' ? !metric.label.includes('Temps') && !metric.label.includes('attente') : metric.label.includes('Temps') || metric.label.includes('attente')
          return (
            <motion.div key={metric.label} variants={itemVariants}>
              <Card className="card-interactive overflow-hidden py-0 border-0 relative">
                <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b ${metric.gradient}`} />
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className={`flex size-8 items-center justify-center rounded-lg bg-gradient-to-br ${metric.gradient} shadow-sm`}>
                      <Icon className="size-4 text-white" />
                    </div>
                    <div className={`flex items-center gap-0.5 text-xs font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      {metric.trend === 'up' ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                      {metric.change}
                    </div>
                  </div>
                  <p className="text-lg font-bold mt-2 text-[#0B2E58] dark:text-white">{metric.value}</p>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Request volume trends */}
      <motion.div variants={itemVariants}>
        <Card className="card-interactive shadow-premium overflow-hidden border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0B2E58] to-[#3B7DD8] shadow-sm">
                <TrendingUp className="size-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                  Volume de demandes
                </CardTitle>
                <CardDescription className="text-xs">Évolution mensuelle des demandes reçues</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <SvgLineChart data={filteredVolume} color="#0B2E58" />
          </CardContent>
        </Card>
      </motion.div>

      {/* Response time + Processing distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="card-interactive shadow-premium overflow-hidden border-0 h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#CE1126] to-[#E8384F] shadow-sm">
                  <Target className="size-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                    Temps de réponse par département
                  </CardTitle>
                  <CardDescription className="text-xs">Objectif: 2 jours ouvrés</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <SvgBarChart data={responseTimes} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="card-interactive shadow-premium overflow-hidden border-0 h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#009460] to-[#00B870] shadow-sm">
                  <Activity className="size-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                    Distribution du temps de traitement
                  </CardTitle>
                  <CardDescription className="text-xs">Répartition des délais de traitement</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <SvgDonutChart segments={processingDistribution} />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Department performance */}
      <motion.div variants={itemVariants}>
        <Card className="card-interactive shadow-premium overflow-hidden border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#C8A45C] to-[#0B2E58] shadow-sm">
                <Building2 className="size-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                  Performance par département
                </CardTitle>
                <CardDescription className="text-xs">Score de conformité et volume de demandes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <SvgHorizontalBarChart data={deptPerformance} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Citizen satisfaction trend */}
      <motion.div variants={itemVariants}>
        <Card className="card-interactive shadow-premium overflow-hidden border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#3B7DD8] to-[#5A96E6] shadow-sm">
                  <Users className="size-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                    Satisfaction citoyenne
                  </CardTitle>
                  <CardDescription className="text-xs">Évolution trimestrielle du score de satisfaction</CardDescription>
                </div>
              </div>
              <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                <ThumbsUp className="size-3 mr-1" />
                {avgSatisfaction}/5
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4 justify-center">
              {satisfactionData.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(item.score / 5) * 120}px` }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: idx * 0.08 }}
                    className="w-12 rounded-t-lg bg-gradient-to-t from-[#0B2E58] to-[#3B7DD8] dark:from-[#3B7DD8] dark:to-[#5A96E6] relative group cursor-default"
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold tabular-nums text-[#0B2E58] dark:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.score}
                    </div>
                  </motion.div>
                  <span className="text-[10px] text-muted-foreground text-center">{item.quarter.replace(' 20', '\n20')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

export default AnalyticsDashboard
