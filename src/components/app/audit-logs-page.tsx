'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScrollText, Search, Download, Clock, User,
  Activity, Globe, ChevronDown, RefreshCw, AlertTriangle,
  CheckCircle2, Shield, FileJson, FileSpreadsheet, ShieldCheck,
  Fingerprint, Monitor, X, ChevronUp
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { useAuditLogsStore } from '@/store/audit-logs-store'
import {
  type AuditEntry,
  type AuditCategory,
  type AuditAction,
  type AuditSeverity,
  type AuditResource,
  CATEGORY_LABELS,
  ACTION_LABELS,
  ACTION_COLOR_CONFIG,
  SEVERITY_CONFIG,
  exportAuditTrail,
} from '@/lib/audit-trail'

// ─── Filter option lists ─────────────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: AuditCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes catégories' },
  ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
    value: value as AuditCategory,
    label,
  })),
]

const SEVERITY_OPTIONS: { value: AuditSeverity | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes sévérités' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Attention' },
  { value: 'critical', label: 'Critique' },
]

const RESOURCE_OPTIONS: { value: AuditResource | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes ressources' },
  { value: 'demande', label: 'Demande' },
  { value: 'document', label: 'Document' },
  { value: 'courrier', label: 'Courrier' },
  { value: 'utilisateur', label: 'Utilisateur' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'signature', label: 'Signature' },
  { value: 'parametre', label: 'Paramètre' },
  { value: 'systeme', label: 'Système' },
]

// ─── Export helpers ──────────────────────────────────────────────────────────

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AuditLogsPage() {
  // ── Store ─────────────────────────────────────────────────────────────
  const logs = useAuditLogsStore((s) => s.logs)
  const getFiltered = useAuditLogsStore((s) => s.getFiltered)
  const getStats = useAuditLogsStore((s) => s.getStats)
  const checkIntegrity = useAuditLogsStore((s) => s.checkIntegrity)
  const getComplianceReport = useAuditLogsStore((s) => s.getComplianceReport)
  const resetToDemoData = useAuditLogsStore((s) => s.resetToDemoData)

  // ── Filter state ──────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory | 'all'>('all')
  const [resourceFilter, setResourceFilter] = useState<AuditResource | 'all'>('all')
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sessionIdSearch, setSessionIdSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // ── UI state ──────────────────────────────────────────────────────────
  const [successToast, setSuccessToast] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null)
  const [showComplianceDialog, setShowComplianceDialog] = useState(false)
  const [complianceStartDate, setComplianceStartDate] = useState('2026-01-01')
  const [complianceEndDate, setComplianceEndDate] = useState('2026-03-31')

  // ── Computed data ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return getFiltered({
      action: actionFilter,
      category: categoryFilter,
      resource: resourceFilter,
      severity: severityFilter,
      search,
      dateFrom,
      dateTo,
      sessionId: sessionIdSearch,
    })
  }, [getFiltered, actionFilter, categoryFilter, resourceFilter, severityFilter, search, dateFrom, dateTo, sessionIdSearch])

  const stats = useMemo(() => getStats(), [logs, getStats])
  const integrityResult = useMemo(() => checkIntegrity(), [logs, checkIntegrity])

  const complianceReport = useMemo(() => {
    if (!showComplianceDialog) return null
    return getComplianceReport(complianceStartDate, complianceEndDate)
  }, [showComplianceDialog, complianceStartDate, complianceEndDate, getComplianceReport])

  // ── Actions ───────────────────────────────────────────────────────────

  const handleExportCSV = useCallback(() => {
    const content = exportAuditTrail('csv', {
      action: actionFilter !== 'all' ? actionFilter : undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      resource: resourceFilter !== 'all' ? resourceFilter : undefined,
      severity: severityFilter !== 'all' ? severityFilter : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sessionId: sessionIdSearch || undefined,
      search: search || undefined,
    })
    if (typeof content === 'string' && content) {
      downloadFile(content, `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;')
      setSuccessToast('Export CSV téléchargé avec succès !')
      setTimeout(() => setSuccessToast(''), 4000)
    }
  }, [actionFilter, categoryFilter, resourceFilter, severityFilter, dateFrom, dateTo, sessionIdSearch, search])

  const handleExportJSON = useCallback(() => {
    const content = exportAuditTrail('json', {
      action: actionFilter !== 'all' ? actionFilter : undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      resource: resourceFilter !== 'all' ? resourceFilter : undefined,
      severity: severityFilter !== 'all' ? severityFilter : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sessionId: sessionIdSearch || undefined,
      search: search || undefined,
    })
    if (typeof content === 'string') {
      downloadFile(content, `audit-trail-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')
      setSuccessToast('Export JSON téléchargé avec succès !')
      setTimeout(() => setSuccessToast(''), 4000)
    }
  }, [actionFilter, categoryFilter, resourceFilter, severityFilter, dateFrom, dateTo, sessionIdSearch, search])

  const handleResetDemo = useCallback(() => {
    resetToDemoData()
    setSuccessToast('Journal d\'audit réinitialisé avec les données de démonstration')
    setTimeout(() => setSuccessToast(''), 4000)
  }, [resetToDemoData])

  const clearFilters = useCallback(() => {
    setSearch('')
    setActionFilter('all')
    setCategoryFilter('all')
    setResourceFilter('all')
    setSeverityFilter('all')
    setDateFrom('')
    setDateTo('')
    setSessionIdSearch('')
  }, [])

  const hasActiveFilters = actionFilter !== 'all' || categoryFilter !== 'all' ||
    resourceFilter !== 'all' || severityFilter !== 'all' || search ||
    dateFrom || dateTo || sessionIdSearch

  // ── Unique action values from current logs ────────────────────────────
  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map(l => l.action))
    return Array.from(actions).sort() as AuditAction[]
  }, [logs])

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Stats Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total événements', value: stats.total, icon: ScrollText, color: 'text-brand dark:text-primary', bg: 'bg-brand/5 dark:bg-primary/10' },
          { label: "Aujourd'hui", value: stats.today, icon: Clock, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
          { label: 'Critiques', value: stats.criticalCount, icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
          {
            label: 'Intégrité',
            value: integrityResult.valid ? 'Valide' : `${integrityResult.brokenChains} rupture(s)`,
            icon: integrityResult.valid ? ShieldCheck : Shield,
            color: integrityResult.valid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
            bg: integrityResult.valid ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20',
          },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="glass-card hover:shadow-lg transition-shadow">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── Integrity Check Banner ────────────────────────────────────── */}
      {!integrityResult.valid && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-4 flex items-center gap-3"
        >
          <Shield className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
              Alerte d&apos;intégrité — Chaîne de hachage compromise
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              {integrityResult.brokenChains} rupture(s) détectée(s) sur {integrityResult.totalChecked} entrées vérifiées.
              Les données d&apos;audit peuvent avoir été modifiées.
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par utilisateur, ressource, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Severity filter */}
              <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as AuditSeverity | 'all')}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sévérité" />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Category filter */}
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as AuditCategory | 'all')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Toggle advanced filters */}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                Filtres
              </Button>
            </div>

            {/* Export & compliance buttons */}
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportJSON}>
                    <FileJson className="h-4 w-4 mr-2" />
                    Export JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowComplianceDialog(true)}
              >
                <Shield className="h-3.5 w-3.5" />
                Conformité
              </Button>
            </div>
          </div>

          {/* ── Advanced filters ────────────────────────────────────────── */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-3 pt-3 border-t">
                  {/* Action filter */}
                  <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as AuditAction | 'all')}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      <SelectItem value="all">Toutes actions</SelectItem>
                      {uniqueActions.map((a) => (
                        <SelectItem key={a} value={a}>{ACTION_LABELS[a] || a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Resource filter */}
                  <Select value={resourceFilter} onValueChange={(v) => setResourceFilter(v as AuditResource | 'all')}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Ressource" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOURCE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Session ID search */}
                  <div className="relative min-w-[180px]">
                    <Monitor className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Session ID..."
                      value={sessionIdSearch}
                      onChange={(e) => setSessionIdSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Date range */}
                  <Input type="date" className="w-[150px]" placeholder="Date début" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  <Input type="date" className="w-[150px]" placeholder="Date fin" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />

                  {/* Clear filters */}
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" className="gap-1.5" onClick={clearFilters}>
                      <X className="h-3.5 w-3.5" />
                      Effacer filtres
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Status bar ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">
                {filtered.length} entrée(s) sur {logs.length}
              </span>
              {hasActiveFilters && (
                <Badge variant="outline" className="text-[10px]">
                  Filtres actifs
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleResetDemo}>
                <RefreshCw className="h-3.5 w-3.5" />
                Réinitialiser démo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Category breakdown ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
          const count = stats.byCategory[key] || 0
          return (
            <button
              key={key}
              onClick={() => setCategoryFilter(categoryFilter === key as AuditCategory ? 'all' : key as AuditCategory)}
              className={`rounded-lg border p-2 text-center transition-all hover:shadow-sm ${
                categoryFilter === key
                  ? 'border-brand bg-brand/5 dark:border-primary dark:bg-primary/10'
                  : 'border-border'
              }`}
            >
              <p className="text-lg font-bold">{count}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
            </button>
          )
        })}
      </div>

      {/* ── Logs Table ─────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Horodatage</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Ressource</TableHead>
                  <TableHead className="hidden lg:table-cell">IP / Session</TableHead>
                  <TableHead className="hidden xl:table-cell">Appareil</TableHead>
                  <TableHead className="hidden xl:table-cell">Sévérité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 100).map((entry, i) => {
                  const actionColor = ACTION_COLOR_CONFIG[entry.action] || { color: 'text-gray-700 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800' }
                  const sevConfig = SEVERITY_CONFIG[entry.severity]
                  return (
                    <motion.tr
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0" />
                          {new Date(entry.timestamp).toLocaleString('fr-FR', {
                            day: '2-digit', month: '2-digit', year: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-brand/10 dark:bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-brand dark:text-primary">
                              {entry.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm truncate max-w-[120px]">{entry.userName}</p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{entry.userRole}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${actionColor.bgColor} ${actionColor.color}`}>
                          {ACTION_LABELS[entry.action] || entry.action}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {CATEGORY_LABELS[entry.category] || entry.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm truncate max-w-[160px]">{entry.description.slice(0, 50)}...</p>
                          {entry.resourceId && (
                            <p className="text-[10px] text-muted-foreground font-mono">{entry.resourceId}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="space-y-0.5">
                          <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {entry.ipAddress}
                          </span>
                          <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]">
                            {entry.sessionId}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <div className="flex items-center gap-1">
                          <Fingerprint className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[100px]">
                            {entry.deviceFingerprint}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${sevConfig.bgColor} ${sevConfig.color}`}>
                          {sevConfig.label}
                        </span>
                      </TableCell>
                    </motion.tr>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {filtered.length > 100 && (
        <p className="text-xs text-muted-foreground text-center">
          Affichage des 100 premières entrées sur {filtered.length}
        </p>
      )}

      {/* ── Entry Detail Dialog ────────────────────────────────────────── */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => { if (!open) setSelectedEntry(null) }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedEntry && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Détail de l&apos;entrée d&apos;audit
                </DialogTitle>
                <DialogDescription>
                  {selectedEntry.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* Who */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3 space-y-1">
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">Utilisateur</p>
                    <p className="text-sm font-medium">{selectedEntry.userName}</p>
                    <p className="text-xs text-muted-foreground">{selectedEntry.userEmail}</p>
                    <Badge variant="outline" className="text-[10px] mt-1">{selectedEntry.userRole}</Badge>
                  </div>
                  <div className="rounded-lg border p-3 space-y-1">
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">Action</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      ACTION_COLOR_CONFIG[selectedEntry.action]?.bgColor || 'bg-gray-100'
                    } ${ACTION_COLOR_CONFIG[selectedEntry.action]?.color || 'text-gray-700'}`}>
                      {ACTION_LABELS[selectedEntry.action] || selectedEntry.action}
                    </span>
                    <Badge variant="outline" className="text-[10px] ml-1">
                      {CATEGORY_LABELS[selectedEntry.category] || selectedEntry.category}
                    </Badge>
                    <span className={`ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      SEVERITY_CONFIG[selectedEntry.severity].bgColor
                    } ${SEVERITY_CONFIG[selectedEntry.severity].color}`}>
                      {SEVERITY_CONFIG[selectedEntry.severity].label}
                    </span>
                  </div>
                </div>

                {/* Where */}
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Localisation & Appareil</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-mono">{selectedEntry.ipAddress}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-mono text-[10px] truncate">{selectedEntry.sessionId}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Fingerprint className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-mono text-[10px] truncate">{selectedEntry.deviceFingerprint}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{new Date(selectedEntry.timestamp).toLocaleString('fr-FR')}</span>
                    </div>
                  </div>
                  {selectedEntry.geographicLocation && (
                    <p className="text-xs text-muted-foreground">
                      📍 {selectedEntry.geographicLocation}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground font-mono truncate">
                    UA: {selectedEntry.userAgent}
                  </p>
                </div>

                {/* Resource */}
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Ressource</p>
                  <p className="text-sm">{selectedEntry.resource} / {selectedEntry.resourceId || '—'}</p>
                </div>

                {/* Previous / New value */}
                {(selectedEntry.previousValue || selectedEntry.newValue) && (
                  <div className="grid grid-cols-2 gap-3">
                    {selectedEntry.previousValue && (
                      <div className="rounded-lg border p-3 space-y-1">
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">Ancienne valeur</p>
                        <pre className="text-[10px] font-mono bg-muted/50 rounded p-2 overflow-auto max-h-32">
                          {JSON.stringify(selectedEntry.previousValue, null, 2)}
                        </pre>
                      </div>
                    )}
                    {selectedEntry.newValue && (
                      <div className="rounded-lg border p-3 space-y-1">
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">Nouvelle valeur</p>
                        <pre className="text-[10px] font-mono bg-muted/50 rounded p-2 overflow-auto max-h-32">
                          {JSON.stringify(selectedEntry.newValue, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Metadata */}
                {selectedEntry.metadata && Object.keys(selectedEntry.metadata).length > 0 && (
                  <div className="rounded-lg border p-3 space-y-1">
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">Métadonnées</p>
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(selectedEntry.metadata).map(([k, v]) => (
                        <div key={k} className="flex gap-1 text-[10px]">
                          <span className="font-mono text-muted-foreground">{k}:</span>
                          <span>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Integrity */}
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Intégrité & Conformité
                  </p>
                  <div className="space-y-1 text-[10px] font-mono">
                    <p>Hash: {selectedEntry.hash}</p>
                    {selectedEntry.previousHash && (
                      <p className="text-muted-foreground">Hash précédent: {selectedEntry.previousHash}</p>
                    )}
                    <p>Rétention: {selectedEntry.retentionPeriod} jours</p>
                    <p>Conforme: {selectedEntry.isComplianceRelevant ? '✅ Oui' : '❌ Non'}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Compliance Report Dialog ───────────────────────────────────── */}
      <Dialog open={showComplianceDialog} onOpenChange={setShowComplianceDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Rapport de Conformité
            </DialogTitle>
            <DialogDescription>
              Rapport d&apos;audit pour la conformité réglementaire
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Date début</label>
                <Input type="date" value={complianceStartDate} onChange={(e) => setComplianceStartDate(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Date fin</label>
                <Input type="date" value={complianceEndDate} onChange={(e) => setComplianceEndDate(e.target.value)} />
              </div>
            </div>

            {complianceReport && (
              <div className="space-y-3">
                <div className="rounded-lg border p-4 bg-muted/30">
                  <p className="text-sm font-semibold mb-3">Période: {complianceReport.period.start} → {complianceReport.period.end}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Actions totales', value: complianceReport.totalActions, color: '' },
                      { label: 'Authentification', value: complianceReport.authActions, color: 'text-sky-600' },
                      { label: 'Modifications', value: complianceReport.dataModifications, color: 'text-amber-600' },
                      { label: 'Administration', value: complianceReport.adminActions, color: 'text-purple-600' },
                      { label: 'Échecs', value: complianceReport.failedActions, color: 'text-red-600' },
                      { label: 'Incidents sécurité', value: complianceReport.securityIncidents, color: 'text-red-700' },
                      { label: 'Conformité', value: complianceReport.complianceRelevantActions, color: 'text-emerald-600' },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className={`font-semibold ${item.color}`}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Integrity status */}
                <div className={`rounded-lg border p-3 flex items-center gap-2 ${
                  integrityResult.valid
                    ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800'
                    : 'border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800'
                }`}>
                  {integrityResult.valid ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Shield className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm">
                    {integrityResult.valid
                      ? 'Chaîne d\'intégrité valide — Aucune altération détectée'
                      : `${integrityResult.brokenChains} rupture(s) dans la chaîne d'intégrité`}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowComplianceDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Success Toast ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-[60] flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-white text-sm font-medium shadow-lg"
          >
            <CheckCircle2 className="h-4 w-4" />
            {successToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
