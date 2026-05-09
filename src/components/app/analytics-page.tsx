'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Download,
  FileSpreadsheet,
  Mail,
  Clock,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Target,
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
import { MONTHLY_DATA } from '@/lib/constants'

const CHART_COLORS = ['#0B2E58', '#3B7DD8', '#C8A45C', '#10B981', '#EF4444']

const periods = [
  { label: '7 jours', value: '7d' },
  { label: '30 jours', value: '30d' },
  { label: '90 jours', value: '90d' },
  { label: '1 an', value: '1y' },
] as const

const summaryCards = [
  { label: 'Total courriers', value: '2 847', change: '+12.5%', trend: 'up' as const, icon: Mail },
  { label: 'Délai moyen', value: '2.4 j', change: '-15.2%', trend: 'down' as const, icon: Clock },
  { label: 'Taux conformité', value: '98.7%', change: '+1.2%', trend: 'up' as const, icon: ShieldCheck },
  { label: 'Score performance', value: '94.2', change: '+3.8', trend: 'up' as const, icon: TrendingUp },
]

// Service volume data for stacked bar chart
const serviceData = [
  { service: 'Cabinet', courriers: 45, documents: 120, workflows: 18 },
  { service: 'Ressources Humaines', courriers: 38, documents: 95, workflows: 22 },
  { service: 'Finance', courriers: 52, documents: 140, workflows: 15 },
  { service: 'Technique', courriers: 30, documents: 85, workflows: 28 },
  { service: 'Juridique', courriers: 25, documents: 70, workflows: 12 },
  { service: 'Communication', courriers: 18, documents: 55, workflows: 8 },
]

// Radar data
const radarData = [
  { dimension: 'Réactivité', score: 85 },
  { dimension: 'Conformité', score: 92 },
  { dimension: 'Efficacité', score: 78 },
  { dimension: 'Innovation', score: 65 },
  { dimension: 'Satisfaction', score: 88 },
]

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

export default function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30d')

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
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Download className="size-3.5" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <FileSpreadsheet className="size-3.5" />
            Export Excel
          </Button>
        </div>
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
        {summaryCards.map((card) => {
          const Icon = card.icon
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

      {/* Main Chart: Tendances sur 12 mois */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
              Tendances sur 12 mois
            </CardTitle>
            <CardDescription className="text-xs">
              Évolution comparée des courriers, documents et workflows
            </CardDescription>
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
                  <CardDescription className="text-xs">Top services par volume de courriers</CardDescription>
                </div>
                <BarChart3 className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="px-3">
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
          <Button className="gap-1.5 bg-[#0B2E58] text-white hover:bg-[#0B2E58]/90">
            <Download className="size-3.5" />
            Export PDF
          </Button>
          <Button variant="outline" className="gap-1.5">
            <FileSpreadsheet className="size-3.5" />
            Export Excel
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
