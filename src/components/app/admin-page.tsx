'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Server, Database, HardDrive, Activity,
  Cpu, Wifi, Key, ToggleLeft, ToggleRight,
  CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  Building2, Globe, Settings, BarChart3, Copy,
  Eye, EyeOff, Plus, Trash2, FileText, TrendingUp,
  Gauge, Clock, Users, Zap
} from 'lucide-react'
import {
  checkSystemHealth, getRecentLogs, getLogStats,
  trackUserAction,
  type HealthStatus, type LogLevel, type LogEntry
} from '@/lib/monitoring'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Module {
  id: string
  name: string
  description: string
  active: boolean
  icon: React.ElementType
}

const MODULES: Module[] = [
  { id: 'ged', name: 'GED - Documents', description: 'Gestion électronique des documents', active: true, icon: Database },
  { id: 'courriers', name: 'Courriers', description: 'Gestion du courrier entrant et sortant', active: true, icon: Wifi },
  { id: 'workflow', name: 'Workflows', description: 'Automatisation des processus administratifs', active: true, icon: Activity },
  { id: 'signatures', name: 'Signatures', description: 'Signature électronique et visa', active: true, icon: Shield },
  { id: 'citizen', name: 'Portail Citoyen', description: 'Interface publique pour les citoyens', active: true, icon: Globe },
  { id: 'analytics', name: 'Analytics', description: 'Tableaux de bord et rapports décisionnels', active: true, icon: BarChart3 },
  { id: 'audit', name: 'Audit Logs', description: 'Journal d\'audit et traçabilité', active: true, icon: Shield },
  { id: 'messaging', name: 'Messagerie', description: 'Notifications multi-canaux', active: false, icon: Wifi },
  { id: 'api', name: 'API Gateway', description: 'Gestion des APIs et intégrations', active: false, icon: Settings },
]

interface ApiKey {
  id: string
  name: string
  key: string
  created: string
  lastUsed: string
  status: 'active' | 'revoked'
}

const INITIAL_API_KEYS: ApiKey[] = [
  { id: '1', name: 'Production API', key: 'eadmin_prod_a7f3b2c9d1e4f5a6', created: '2024-01-15', lastUsed: '2024-12-15', status: 'active' },
  { id: '2', name: 'Staging API', key: 'eadmin_stg_d4e5f6a7b8c9d0e1', created: '2024-06-01', lastUsed: '2024-12-14', status: 'active' },
  { id: '3', name: 'Partner - UNDP', key: 'eadmin_ext_f2a3b4c5d6e7f8a9', created: '2024-03-20', lastUsed: '2024-11-30', status: 'active' },
  { id: '4', name: 'Legacy (deprecated)', key: 'eadmin_leg_b9c0d1e2f3a4b5c6', created: '2023-08-01', lastUsed: '2024-08-15', status: 'revoked' },
]

export function AdminPage() {
  const [modules, setModules] = useState(MODULES)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [apiKeys, setApiKeys] = useState(INITIAL_API_KEYS)
  const [newKeyDialog, setNewKeyDialog] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [successToast, setSuccessToast] = useState('')

  // Monitoring state
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([])
  const [logFilter, setLogFilter] = useState<LogLevel | 'all'>('all')
  const [logStats, setLogStats] = useState<{ total: number; byLevel: Record<LogLevel, number>; errorRate: number }>({ total: 0, byLevel: { debug: 0, info: 0, warn: 0, error: 0, critical: 0 }, errorRate: 0 })
  const [isCheckingHealth, setIsCheckingHealth] = useState(false)

  // Delete confirmation dialog
  const [deleteKeyDialog, setDeleteKeyDialog] = useState(false)
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null)

  // Institution settings
  const [institutionSettings, setInstitutionSettings] = useState({
    name: "Ministère de l'Administration Territoriale",
    sigle: 'MAT',
    tutelle: 'Primature',
    localisation: 'Conakry, Kaloum',
  })

  // Load monitoring data
  const refreshMonitoring = () => {
    const logs = getRecentLogs(logFilter === 'all' ? undefined : logFilter, 50)
    setRecentLogs(logs)
    setLogStats(getLogStats())
  }

  const runHealthCheck = async () => {
    setIsCheckingHealth(true)
    try {
      const health = await checkSystemHealth()
      setHealthStatus(health)
      trackUserAction('health_check', 'admin')
    } catch {
      // silently fail
    } finally {
      setIsCheckingHealth(false)
    }
    refreshMonitoring()
  }

  useEffect(() => {
    refreshMonitoring()
  }, [logFilter])

  const showToast = (message: string) => {
    setSuccessToast(message)
    setTimeout(() => setSuccessToast(''), 4000)
  }

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  const toggleModule = (id: string) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, active: !m.active } : m))
  }

  const copyApiKey = async (keyValue: string) => {
    try {
      await navigator.clipboard.writeText(keyValue)
      showToast('Clé API copiée dans le presse-papiers')
    } catch {
      // Fallback for environments where clipboard API is not available
      const textArea = document.createElement('textarea')
      textArea.value = keyValue
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      showToast('Clé API copiée dans le presse-papiers')
    }
  }

  const handleDeleteKeyOpen = (keyId: string) => {
    setDeleteKeyId(keyId)
    setDeleteKeyDialog(true)
  }

  const handleDeleteKeyConfirm = () => {
    if (!deleteKeyId) return
    const keyToDelete = apiKeys.find(k => k.id === deleteKeyId)
    setApiKeys(prev => prev.filter(k => k.id !== deleteKeyId))
    setDeleteKeyDialog(false)
    setDeleteKeyId(null)
    showToast(`Clé API "${keyToDelete?.name || ''}" supprimée avec succès`)
  }

  const toggleKeyStatus = (keyId: string) => {
    setApiKeys(prev => prev.map(k => {
      if (k.id !== keyId) return k
      const newStatus = k.status === 'active' ? 'revoked' : 'active'
      return { ...k, status: newStatus }
    }))
    const keyToToggle = apiKeys.find(k => k.id === keyId)
    if (keyToToggle) {
      const newStatus = keyToToggle.status === 'active' ? 'révoquée' : 'activée'
      showToast(`Clé API "${keyToToggle.name}" ${newStatus}`)
    }
  }

  const handleSaveInstitution = () => {
    showToast('Paramètres sauvegardés avec succès')
  }

  const healthIndicators = [
    { name: 'Serveur principal', status: 'operational', uptime: '99.97%', icon: Server },
    { name: 'Base de données', status: 'operational', uptime: '99.99%', icon: Database },
    { name: 'Service de stockage', status: 'operational', uptime: '99.95%', icon: HardDrive },
    { name: 'Service d\'authentification', status: 'operational', uptime: '99.98%', icon: Shield },
    { name: 'API Gateway', status: 'degraded', uptime: '98.5%', icon: Wifi },
    { name: 'Service de signatures', status: 'operational', uptime: '99.96%', icon: Activity },
  ]

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'operational': return { label: 'Opérationnel', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', icon: CheckCircle2 }
      case 'degraded': return { label: 'Dégradé', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30', icon: AlertTriangle }
      case 'down': return { label: 'Indisponible', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: XCircle }
      default: return { label: 'Inconnu', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: Activity }
    }
  }

  const storageUsed = 67
  const dbUsed = 43
  const cpuUsed = 28
  const memUsed = 54

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Uptime système', value: '99.97%', icon: Activity, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Requêtes / jour', value: '12.4K', icon: Cpu, color: 'text-brand dark:text-primary', bg: 'bg-brand/5 dark:bg-primary/10' },
          { label: 'Temps réponse', value: '142ms', icon: Wifi, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
          { label: 'Modules actifs', value: `${modules.filter(m => m.active).length}/${modules.length}`, icon: Settings, color: 'text-gold', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="glass-card hover:shadow-lg transition-shadow">
              <CardContent className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">État du système</CardTitle>
                  <CardDescription>Surveillance en temps réel des services</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-soft" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">En ligne</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {healthIndicators.map((item) => {
                const config = getStatusConfig(item.status)
                const StatusIcon = config.icon
                return (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{item.uptime}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bgColor} ${config.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </motion.div>

        {/* Storage & Resources */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Ressources & Stockage</CardTitle>
              <CardDescription>Utilisation des ressources système</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { label: 'Stockage fichiers', value: storageUsed, total: '100 Go', used: '67 Go', color: 'bg-brand dark:bg-primary' },
                { label: 'Base de données', value: dbUsed, total: '50 Go', used: '21.5 Go', color: 'bg-emerald-500' },
                { label: 'CPU', value: cpuUsed, total: '8 cœurs', used: '2.2 cœurs', color: 'bg-sky-500' },
                { label: 'Mémoire RAM', value: memUsed, total: '32 Go', used: '17.3 Go', color: 'bg-amber-500' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.used} / {item.total}</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${item.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.value}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{item.value}% utilisé</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Module Activation */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activation des modules</CardTitle>
            <CardDescription>Activez ou désactivez les fonctionnalités de la plateforme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((mod) => (
                <div
                  key={mod.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    mod.active ? 'border-brand/20 dark:border-primary/20 bg-brand/2 dark:bg-primary/5' : 'border-border bg-muted/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <mod.icon className={`h-5 w-5 ${mod.active ? 'text-brand dark:text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <p className={`text-sm font-medium ${mod.active ? '' : 'text-muted-foreground'}`}>{mod.name}</p>
                      <p className="text-xs text-muted-foreground">{mod.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={mod.active}
                    onCheckedChange={() => toggleModule(mod.id)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* API Key Management */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Gestion des clés API</CardTitle>
                <CardDescription>Gérez les clés d&apos;accès à l&apos;API eAdmin Guinée</CardDescription>
              </div>
              <Button size="sm" className="gap-2 bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90" onClick={() => { setNewKeyDialog(true); setNewKeyName('') }}>
                <Plus className="h-4 w-4" />
                Nouvelle clé
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {apiKeys.map(key => (
              <div key={key.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Key className="h-4 w-4 text-brand dark:text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{key.name}</p>
                      <Badge variant={key.status === 'active' ? 'default' : 'destructive'} className="text-[10px] cursor-pointer" onClick={() => toggleKeyStatus(key.id)}>
                        {key.status === 'active' ? 'Active' : 'Révoquée'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs font-mono text-muted-foreground">
                        {showKeys[key.id] ? key.key : '••••••••••••••••••••'}
                      </code>
                      <button onClick={() => setShowKeys(prev => ({ ...prev, [key.id]: !prev[key.id] }))} className="text-muted-foreground hover:text-foreground transition-colors">
                        {showKeys[key.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                      <button onClick={() => copyApiKey(key.key)} className="text-muted-foreground hover:text-foreground transition-colors" title="Copier la clé">
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Créée: {key.created}</span>
                  <span>Dernière utilisation: {key.lastUsed}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-7 w-7 p-0"
                    onClick={() => handleDeleteKeyOpen(key.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {apiKeys.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Aucune clé API configurée. Créez-en une pour commencer.
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══ Monitoring & Observabilité ═══ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-brand dark:text-primary" />
                  Monitoring &amp; Observabilité
                </CardTitle>
                <CardDescription>Supervision système, journaux et métriques en temps réel</CardDescription>
              </div>
              <Button
                size="sm"
                className="gap-2 bg-[#009460] hover:bg-[#009460]/90 text-white"
                onClick={runHealthCheck}
                disabled={isCheckingHealth}
              >
                <RefreshCw className={`h-4 w-4 ${isCheckingHealth ? 'animate-spin' : ''}`} />
                {isCheckingHealth ? 'Vérification...' : 'Vérifier l\'état'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Health Status Grid */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                État des services
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {(
                  healthStatus
                    ? [
                        { name: 'Frontend', health: healthStatus.services.frontend },
                        { name: 'Backend API', health: healthStatus.services.backend },
                        { name: 'Base de données', health: healthStatus.services.database },
                        { name: 'Redis', health: healthStatus.services.redis },
                        { name: 'Stockage MinIO', health: healthStatus.services.minio },
                      ]
                    : [
                        { name: 'Frontend', health: { status: 'up' as const, latencyMs: 0, lastCheck: new Date().toISOString() } },
                        { name: 'Backend API', health: { status: 'degraded' as const, latencyMs: -1, lastCheck: new Date().toISOString(), error: 'Non vérifié' } },
                        { name: 'Base de données', health: { status: 'degraded' as const, latencyMs: -1, lastCheck: new Date().toISOString(), error: 'Non vérifié' } },
                        { name: 'Redis', health: { status: 'degraded' as const, latencyMs: -1, lastCheck: new Date().toISOString(), error: 'Non vérifié' } },
                        { name: 'Stockage MinIO', health: { status: 'up' as const, latencyMs: 2, lastCheck: new Date().toISOString() } },
                      ]
                ).map(service => {
                  const statusColors: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
                    up: { bg: 'bg-[#009460]/10 dark:bg-[#009460]/20', text: 'text-[#009460] dark:text-[#009460]', border: 'border-[#009460]/30', dot: 'bg-[#009460]', label: 'En ligne' },
                    degraded: { bg: 'bg-[#FCD116]/10 dark:bg-[#FCD116]/20', text: 'text-[#FCD116] dark:text-[#FCD116]', border: 'border-[#FCD116]/30', dot: 'bg-[#FCD116]', label: 'Dégradé' },
                    down: { bg: 'bg-[#CE1126]/10 dark:bg-[#CE1126]/20', text: 'text-[#CE1126] dark:text-[#CE1126]', border: 'border-[#CE1126]/30', dot: 'bg-[#CE1126]', label: 'Indisponible' },
                  }
                  const sc = statusColors[service.health.status] || statusColors.down
                  return (
                    <div key={service.name} className={`p-3 rounded-xl border ${sc.border} ${sc.bg}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`h-2 w-2 rounded-full ${sc.dot} ${service.health.status === 'up' ? 'animate-pulse' : ''}`} />
                        <span className="text-sm font-medium">{service.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${sc.text}`}>{sc.label}</span>
                        {service.health.latencyMs >= 0 && (
                          <span className="text-xs text-muted-foreground">{service.health.latencyMs}ms</span>
                        )}
                      </div>
                      {service.health.error && (
                        <p className="text-[10px] text-muted-foreground mt-1 truncate">{service.health.error}</p>
                      )}
                    </div>
                  )
                })}
              </div>
              {healthStatus && (
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Uptime: {Math.floor(healthStatus.uptime / 3600)}h {Math.floor((healthStatus.uptime % 3600) / 60)}m</span>
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Statut global: <span className={`font-semibold ${healthStatus.status === 'healthy' ? 'text-[#009460]' : healthStatus.status === 'degraded' ? 'text-[#FCD116]' : 'text-[#CE1126]'}`}>{healthStatus.status === 'healthy' ? 'Sain' : healthStatus.status === 'degraded' ? 'Dégradé' : 'Critique'}</span></span>
                </div>
              )}
            </div>

            <Separator />

            {/* Key Metrics */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Métriques clés
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Requêtes totales',
                    value: healthStatus?.metrics.totalRequests ?? logStats.total,
                    icon: BarChart3,
                    color: 'text-brand dark:text-primary',
                    bg: 'bg-brand/5 dark:bg-primary/10',
                  },
                  {
                    label: 'Taux d\'erreur',
                    value: `${((healthStatus?.metrics.errorRate ?? logStats.errorRate) * 100).toFixed(2)}%`,
                    icon: AlertTriangle,
                    color: (healthStatus?.metrics.errorRate ?? logStats.errorRate) > 0.05 ? 'text-[#CE1126]' : 'text-[#009460]',
                    bg: (healthStatus?.metrics.errorRate ?? logStats.errorRate) > 0.05 ? 'bg-[#CE1126]/10' : 'bg-[#009460]/10',
                  },
                  {
                    label: 'Temps réponse moy.',
                    value: `${Math.round(healthStatus?.metrics.avgResponseTime ?? 0)}ms`,
                    icon: Gauge,
                    color: 'text-[#FCD116] dark:text-[#FCD116]',
                    bg: 'bg-[#FCD116]/10',
                  },
                  {
                    label: 'Sessions actives',
                    value: healthStatus?.metrics.activeSessions ?? 1,
                    icon: Users,
                    color: 'text-sky-600 dark:text-sky-400',
                    bg: 'bg-sky-50 dark:bg-sky-900/20',
                  },
                ].map(m => (
                  <div key={m.label} className="flex items-center gap-3 p-3 rounded-xl border">
                    <div className={`p-2 rounded-lg ${m.bg} ${m.color}`}>
                      <m.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className="text-lg font-bold">{m.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Log Stats */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Statistiques des journaux
                <Badge variant="outline" className="text-[10px]">{logStats.total} entrées</Badge>
              </h4>
              <div className="grid grid-cols-5 gap-2">
                {([
                  { level: 'debug' as const, color: 'bg-gray-500', label: 'Debug' },
                  { level: 'info' as const, color: 'bg-[#009460]', label: 'Info' },
                  { level: 'warn' as const, color: 'bg-[#FCD116]', label: 'Warn' },
                  { level: 'error' as const, color: 'bg-[#CE1126]', label: 'Error' },
                  { level: 'critical' as const, color: 'bg-[#CE1126]', label: 'Critical' },
                ]).map(l => (
                  <div key={l.level} className="text-center p-2 rounded-lg border">
                    <div className={`h-2 w-full rounded-full ${l.color} mb-1 opacity-30`} />
                    <p className="text-xl font-bold">{logStats.byLevel[l.level]}</p>
                    <p className="text-[10px] text-muted-foreground">{l.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Recent Logs */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Journaux récents
                </h4>
                <Select value={logFilter} onValueChange={(v) => setLogFilter(v as LogLevel | 'all')}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les niveaux</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warn">Warn</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="max-h-96 overflow-y-auto rounded-lg border bg-muted/20">
                <div className="divide-y">
                  {recentLogs.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      Aucun journal trouvé
                    </div>
                  ) : (
                    recentLogs.map((log, idx) => {
                      const levelStyles: Record<LogLevel, { bg: string; text: string; dot: string }> = {
                        debug: { bg: 'bg-gray-50 dark:bg-gray-900/20', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
                        info: { bg: 'bg-[#009460]/5 dark:bg-[#009460]/10', text: 'text-[#009460] dark:text-[#009460]', dot: 'bg-[#009460]' },
                        warn: { bg: 'bg-[#FCD116]/5 dark:bg-[#FCD116]/10', text: 'text-[#FCD116] dark:text-[#FCD116]', dot: 'bg-[#FCD116]' },
                        error: { bg: 'bg-[#CE1126]/5 dark:bg-[#CE1126]/10', text: 'text-[#CE1126] dark:text-[#CE1126]', dot: 'bg-[#CE1126]' },
                        critical: { bg: 'bg-[#CE1126]/10 dark:bg-[#CE1126]/20', text: 'text-[#CE1126] dark:text-[#CE1126]', dot: 'bg-[#CE1126] animate-pulse' },
                      }
                      const style = levelStyles[log.level]
                      return (
                        <div key={idx} className={`flex items-start gap-3 px-3 py-2 text-xs hover:bg-muted/30 transition-colors ${style.bg}`}>
                          <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${style.dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`font-semibold uppercase ${style.text}`}>{log.level}</span>
                              <span className="text-muted-foreground">[{log.module}]</span>
                              <span className="text-muted-foreground ml-auto shrink-0">
                                {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                              </span>
                            </div>
                            <p className="text-foreground break-words">{log.message}</p>
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <p className="text-muted-foreground mt-0.5 font-mono text-[10px] truncate">
                                {JSON.stringify(log.metadata)}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Institution Settings */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Paramètres de l&apos;institution</CardTitle>
            <CardDescription>Configuration générale de votre institution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom de l&apos;institution</Label>
                <Input
                  value={institutionSettings.name}
                  onChange={e => setInstitutionSettings(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Sigle</Label>
                <Input
                  value={institutionSettings.sigle}
                  onChange={e => setInstitutionSettings(prev => ({ ...prev, sigle: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tutelle</Label>
                <Input
                  value={institutionSettings.tutelle}
                  onChange={e => setInstitutionSettings(prev => ({ ...prev, tutelle: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Localisation</Label>
                <Input
                  value={institutionSettings.localisation}
                  onChange={e => setInstitutionSettings(prev => ({ ...prev, localisation: e.target.value }))}
                />
              </div>
            </div>
            <Button className="bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90" onClick={handleSaveInstitution}>
              Enregistrer les modifications
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* New API Key Dialog */}
      <Dialog open={newKeyDialog} onOpenChange={setNewKeyDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Générer une nouvelle clé API</DialogTitle>
            <DialogDescription>Entrez un nom pour identifier cette clé</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nom de la clé</Label>
              <Input placeholder="Ex: Production API, Partenaire UNDP..." value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewKeyDialog(false)}>Annuler</Button>
            <Button className="bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90" onClick={() => {
              const chars = 'abcdef0123456789'
              const randomKey = Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
              const newKey: ApiKey = {
                id: String(Date.now()),
                name: newKeyName || 'Nouvelle clé',
                key: `eadmin_gen_${randomKey}`,
                created: new Date().toISOString().slice(0, 10),
                lastUsed: new Date().toISOString().slice(0, 10),
                status: 'active',
              }
              setApiKeys(prev => [newKey, ...prev])
              setNewKeyName('')
              setNewKeyDialog(false)
              showToast(`Clé API "${newKey.name}" générée avec succès`)
            }}>
              Générer la clé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete API Key Confirmation Dialog */}
      <AlertDialog open={deleteKeyDialog} onOpenChange={setDeleteKeyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Supprimer la clé API
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette clé API ? Cette action est irréversible et toute application utilisant cette clé perdra son accès.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteKeyConfirm}>
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-24 z-40 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg"
          >
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
