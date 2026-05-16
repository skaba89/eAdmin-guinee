'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScrollText, Search, Download, Filter, Clock,
  Activity, Globe, ChevronDown, RefreshCw, CheckCircle2,
  Trash2, RotateCcw
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  useAuditLogsStore,
  type AuditAction,
  type AuditResource,
  type AuditSeverity,
  type AuditLog,
} from '@/store/audit-logs-store'

// ─── LABELS & CONFIG ──────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<AuditAction, { label: string; color: string; bgColor: string }> = {
  create:        { label: 'Création',              color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  read:          { label: 'Lecture',               color: 'text-sky-700 dark:text-sky-400',          bgColor: 'bg-sky-100 dark:bg-sky-900/30' },
  update:        { label: 'Modification',          color: 'text-sky-700 dark:text-sky-400',          bgColor: 'bg-sky-100 dark:bg-sky-900/30' },
  delete:        { label: 'Suppression',           color: 'text-red-700 dark:text-red-400',          bgColor: 'bg-red-100 dark:bg-red-900/30' },
  login:         { label: 'Connexion',             color: 'text-gray-700 dark:text-gray-400',        bgColor: 'bg-gray-100 dark:bg-gray-800' },
  logout:        { label: 'Déconnexion',           color: 'text-gray-700 dark:text-gray-400',        bgColor: 'bg-gray-100 dark:bg-gray-800' },
  approve:       { label: 'Approbation',           color: 'text-emerald-700 dark:text-emerald-400',  bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  reject:        { label: 'Rejet',                 color: 'text-red-700 dark:text-red-400',          bgColor: 'bg-red-100 dark:bg-red-900/30' },
  archive:       { label: 'Archivage',             color: 'text-amber-700 dark:text-amber-400',      bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  export:        { label: 'Export',                color: 'text-purple-700 dark:text-purple-400',    bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  download:      { label: 'Téléchargement',        color: 'text-purple-700 dark:text-purple-400',    bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  upload:        { label: 'Téléversement',         color: 'text-indigo-700 dark:text-indigo-400',    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
  sign:          { label: 'Signature',             color: 'text-indigo-700 dark:text-indigo-400',    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
  verify:        { label: 'Vérification',          color: 'text-teal-700 dark:text-teal-400',        bgColor: 'bg-teal-100 dark:bg-teal-900/30' },
  transfer:      { label: 'Transfert',             color: 'text-orange-700 dark:text-orange-400',    bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  assign:        { label: 'Assignation',           color: 'text-cyan-700 dark:text-cyan-400',        bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' },
  status_change: { label: 'Changement de statut',  color: 'text-amber-700 dark:text-amber-400',      bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
}

const SEVERITY_CONFIG: Record<AuditSeverity, { label: string; dotColor: string }> = {
  info:     { label: 'Info',         dotColor: 'bg-sky-500' },
  warning:  { label: 'Avertissement', dotColor: 'bg-amber-500' },
  critical: { label: 'Critique',     dotColor: 'bg-red-500' },
}

const RESOURCE_LABELS: Record<AuditResource, string> = {
  demande:     'Demande',
  document:    'Document',
  courrier:    'Courrier',
  utilisateur: 'Utilisateur',
  workflow:    'Workflow',
  signature:   'Signature',
  parametre:   'Paramètre',
  systeme:     'Système',
}

const RESOURCE_FILTER_OPTIONS: { value: AuditResource | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes les ressources' },
  ...Object.entries(RESOURCE_LABELS).map(([value, label]) => ({ value: value as AuditResource, label })),
]

const ACTION_FILTER_OPTIONS: { value: AuditAction | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes les actions' },
  ...Object.entries(ACTION_CONFIG).map(([value, { label }]) => ({ value: value as AuditAction, label })),
]

const SEVERITY_FILTER_OPTIONS: { value: AuditSeverity | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes les sévérités' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Avertissement' },
  { value: 'critical', label: 'Critique' },
]

// ─── LIVE MODE RANDOM GENERATORS ──────────────────────────────────────────────

const LIVE_USERS = [
  { userName: 'Amadou Diallo',    userRole: 'admin_general', userId: 'live-1' },
  { userName: 'Aissatou Baldé',   userRole: 'mairie',        userId: 'live-2' },
  { userName: 'Ibrahima Sow',     userRole: 'agence',        userId: 'live-3' },
  { userName: 'Fatoumata Camara', userRole: 'citizen',       userId: 'live-4' },
  { userName: 'Alpha Condé',      userRole: 'ministere',     userId: 'live-5' },
  { userName: 'Mariama Condé',    userRole: 'mairie',        userId: 'live-6' },
  { userName: 'Kadiatou Sylla',   userRole: 'admin_general', userId: 'live-7' },
  { userName: 'Mamadou Keïta',    userRole: 'agence',        userId: 'live-8' },
]

const LIVE_SCENARIOS: { action: AuditAction; resource: AuditResource; descriptions: string[] }[] = [
  { action: 'create',  resource: 'courrier',    descriptions: ['Nouveau courrier entrant enregistré', 'Courrier présidentiel créé', 'Circulaire interne créée'] },
  { action: 'create',  resource: 'demande',     descriptions: ['Nouvelle demande citoyenne soumise', 'Demande de certificat créée', 'Nouvelle demande d\'acte enregistrée'] },
  { action: 'update',  resource: 'workflow',    descriptions: ['Transition d\'étape validée', 'Workflow mis à jour', 'Étape de traitement modifiée'] },
  { action: 'update',  resource: 'document',    descriptions: ['Métadonnées du document mises à jour', 'Document révisé', 'Statut du document modifié'] },
  { action: 'approve', resource: 'demande',     descriptions: ['Approbation DRH — Demande validée', 'Validation direction générale', 'Visa conforme accordé'] },
  { action: 'login',   resource: 'utilisateur', descriptions: ['Connexion réussie depuis Conakry', 'Connexion depuis Kindia', 'Connexion mobile authentifiée'] },
  { action: 'export',  resource: 'demande',     descriptions: ['Export CSV des demandes', 'Export PDF du rapport mensuel', 'Génération du bordereau d\'export'] },
  { action: 'download', resource: 'document',   descriptions: ['Téléchargement du décret présidentiel', 'Document GED téléchargé', 'Rapport trimestriel récupéré'] },
  { action: 'sign',    resource: 'signature',   descriptions: ['Signature électronique apposée', 'Convention signée numériquement', 'Arrêté contresigné'] },
  { action: 'transfer', resource: 'courrier',   descriptions: ['Courrier transféré à la direction', 'Transfert au service compétent', 'Réaffectation du courrier'] },
  { action: 'reject',  resource: 'demande',     descriptions: ['Rejet — Dossier incomplet', 'Demande refusée — Non conforme', 'Réclamation rejetée'] },
  { action: 'archive', resource: 'courrier',    descriptions: ['Courrier archivé aux Archives Nationales', 'Dossier classé et archivé', 'Archivage automatique du courrier traité'] },
]

const LIVE_IPS = ['196.125.43.21', '196.125.43.22', '196.125.34.12', '196.125.50.8', '10.0.0.1']
const LIVE_SEVERITIES: AuditSeverity[] = ['info', 'info', 'info', 'warning', 'info', 'info', 'info', 'critical']

// ─── HELPERS ───────────────────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function exportCSV(data: AuditLog[], filename: string) {
  if (!data.length) return
  const headers = ['Horodatage', 'Utilisateur', 'Action', 'Ressource', 'ID Ressource', 'Sévérité', 'Adresse IP', 'Description']
  const csv = [
    headers.join(','),
    ...data.map(row =>
      [
        formatTimestamp(row.timestamp),
        row.userName || '',
        ACTION_CONFIG[row.action]?.label || row.action,
        RESOURCE_LABELS[row.resource] || row.resource,
        row.resourceId || '',
        SEVERITY_CONFIG[row.severity]?.label || row.severity,
        row.ipAddress || '',
        row.description,
      ]
        .map(v => `"${v}"`)
        .join(',')
    ),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── COMPONENT ─────────────────────────────────────────────────────────────────

export function AuditLogsPage() {
  const { logs, addLog, clearLogs, getFiltered, getStats, resetToDemoData } = useAuditLogsStore()

  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all')
  const [resourceFilter, setResourceFilter] = useState<AuditResource | 'all'>('all')
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [isLive, setIsLive] = useState(true)
  const [successToast, setSuccessToast] = useState('')
  const [lastActivity, setLastActivity] = useState('Il y a 5 minutes')
  const liveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Live mode: add realistic random logs every 5 seconds ───────────────────

  useEffect(() => {
    if (isLive) {
      liveIntervalRef.current = setInterval(() => {
        const scenario = pickRandom(LIVE_SCENARIOS)
        const user = pickRandom(LIVE_USERS)
        const severity = pickRandom(LIVE_SEVERITIES)

        addLog({
          action: scenario.action,
          resource: scenario.resource,
          description: pickRandom(scenario.descriptions),
          severity,
          userId: user.userId,
          userName: user.userName,
          userRole: user.userRole,
          ipAddress: pickRandom(LIVE_IPS),
        })
        setLastActivity('À l\'instant')
      }, 5000)
    } else {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current)
        liveIntervalRef.current = null
      }
    }
    return () => {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current)
      }
    }
  }, [isLive, addLog])

  // ── Update "last activity" text periodically ──────────────────────────────

  useEffect(() => {
    const timer = setInterval(() => {
      setLastActivity(prev => {
        if (prev === 'À l\'instant') return 'Il y a quelques secondes'
        if (prev === 'Il y a quelques secondes') return 'Il y a 1 minute'
        return prev
      })
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  // ── Derived data from store ───────────────────────────────────────────────

  const filtered = getFiltered({
    action: actionFilter,
    resource: resourceFilter,
    severity: severityFilter,
    search,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  })

  const stats = getStats()

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleExportCSV = useCallback(() => {
    setSuccessToast('Export CSV en cours de génération...')
    setTimeout(() => {
      exportCSV(filtered, `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`)
      setSuccessToast('Export CSV téléchargé avec succès !')
      setTimeout(() => setSuccessToast(''), 4000)
    }, 600)
  }, [filtered])

  const handleRefresh = useCallback(() => {
    const scenario = pickRandom(LIVE_SCENARIOS)
    addLog({
      action: scenario.action,
      resource: scenario.resource,
      description: pickRandom(scenario.descriptions),
      severity: 'info',
      userName: 'Utilisateur actuel',
      userRole: 'admin_general',
      ipAddress: '196.125.43.1',
    })
    setLastActivity('À l\'instant')
    setSuccessToast('Journal actualisé avec succès')
    setTimeout(() => setSuccessToast(''), 4000)
  }, [addLog])

  const handleClear = useCallback(() => {
    clearLogs()
    setSuccessToast('Journal d\'audit effacé avec succès')
    setTimeout(() => setSuccessToast(''), 4000)
  }, [clearLogs])

  const handleReset = useCallback(() => {
    resetToDemoData()
    setSuccessToast('Données de démonstration restaurées')
    setTimeout(() => setSuccessToast(''), 4000)
  }, [resetToDemoData])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total événements', value: stats.total, icon: ScrollText, color: 'text-brand dark:text-primary', bg: 'bg-brand/5 dark:bg-primary/10' },
          { label: 'Créations', value: stats.byAction['create'] || 0, icon: Activity, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Modifications', value: stats.byAction['update'] || 0, icon: Activity, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
          { label: 'Suppressions', value: stats.byAction['delete'] || 0, icon: Activity, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="glass-card hover:shadow-lg transition-shadow">
              <CardContent className="flex items-center gap-3">
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

      {/* Toolbar */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par utilisateur, ressource, détails..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={actionFilter} onValueChange={v => setActionFilter(v as AuditAction | 'all')}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_FILTER_OPTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={resourceFilter} onValueChange={v => setResourceFilter(v as AuditResource | 'all')}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Ressource" />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_FILTER_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={severityFilter} onValueChange={v => setSeverityFilter(v as AuditSeverity | 'all')}>
                <SelectTrigger className="w-full sm:w-[170px]">
                  <SelectValue placeholder="Sévérité" />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_FILTER_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" className="w-full sm:w-[150px]" placeholder="Date début" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <Input type="date" className="w-full sm:w-[150px]" placeholder="Date fin" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportCSV}>
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Filter className="h-3.5 w-3.5" />
                    Gestion
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleClear} className="gap-2 text-red-600 focus:text-red-600">
                    <Trash2 className="h-4 w-4" />
                    Effacer tous les logs
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleReset} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Restaurer données de démonstration
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Live indicator */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsLive(!isLive)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isLive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                }`}
              >
                <div className={`h-2 w-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse-soft' : 'bg-muted-foreground'}`} />
                {isLive ? 'Temps réel' : 'En pause'}
              </button>
              <span className="text-xs text-muted-foreground">
                Dernière activité: {lastActivity}
              </span>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleRefresh}>
              <RefreshCw className="h-3.5 w-3.5" />
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Horodatage</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Ressource</TableHead>
                <TableHead className="hidden lg:table-cell">Adresse IP</TableHead>
                <TableHead className="hidden xl:table-cell">Détails</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log, i) => {
                const aConfig = ACTION_CONFIG[log.action]
                const sConfig = SEVERITY_CONFIG[log.severity]
                const userName = log.userName || 'Système'
                return (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                        {log.severity !== 'info' && (
                          <div className={`h-1.5 w-1.5 rounded-full ${sConfig.dotColor}`} title={sConfig.label} />
                        )}
                        <Clock className="h-3 w-3 shrink-0" />
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-brand/10 dark:bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-brand dark:text-primary">
                            {userName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <span className="text-sm">{userName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${aConfig.bgColor} ${aConfig.color}`}>
                        {aConfig.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm truncate max-w-[200px]">
                          {log.resourceId || RESOURCE_LABELS[log.resource]}
                        </p>
                        <Badge variant="outline" className="text-[10px] mt-0.5">{RESOURCE_LABELS[log.resource]}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {log.ipAddress || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <p className="text-xs text-muted-foreground truncate max-w-[250px]">{log.description}</p>
                    </TableCell>
                  </motion.tr>
                )
              })}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground text-center">
        {filtered.length} entrée(s) affichée(s) sur {logs.length}
      </div>

      {/* Success Toast */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-white text-sm font-medium shadow-lg"
          >
            <CheckCircle2 className="h-4 w-4" />
            {successToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
