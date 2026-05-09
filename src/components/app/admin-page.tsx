'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Server, Database, HardDrive, Activity,
  Cpu, Wifi, Key, ToggleLeft, ToggleRight,
  CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  Building2, Globe, Settings, BarChart3, Copy,
  Eye, EyeOff, Plus, Trash2
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'

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

const API_KEYS = [
  { id: '1', name: 'Production API', key: 'eadmin_prod_a7f3b2c9d1e4f5a6', created: '2024-01-15', lastUsed: '2024-12-15', status: 'active' },
  { id: '2', name: 'Staging API', key: 'eadmin_stg_d4e5f6a7b8c9d0e1', created: '2024-06-01', lastUsed: '2024-12-14', status: 'active' },
  { id: '3', name: 'Partner - UNDP', key: 'eadmin_ext_f2a3b4c5d6e7f8a9', created: '2024-03-20', lastUsed: '2024-11-30', status: 'active' },
  { id: '4', name: 'Legacy (deprecated)', key: 'eadmin_leg_b9c0d1e2f3a4b5c6', created: '2023-08-01', lastUsed: '2024-08-15', status: 'revoked' },
]

export function AdminPage() {
  const [modules, setModules] = useState(MODULES)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [apiKeys, setApiKeys] = useState(API_KEYS)
  const [newKeyDialog, setNewKeyDialog] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [successToast, setSuccessToast] = useState('')

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  const toggleModule = (id: string) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, active: !m.active } : m))
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
                <CardDescription>Gérez les clés d\'accès à l\'API eAdministration</CardDescription>
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
                      <Badge variant={key.status === 'active' ? 'default' : 'destructive'} className="text-[10px]">
                        {key.status === 'active' ? 'Active' : 'Révoquée'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs font-mono text-muted-foreground">
                        {showKeys[key.id] ? key.key : '••••••••••••••••••••'}
                      </code>
                      <button onClick={() => setShowKeys(prev => ({ ...prev, [key.id]: !prev[key.id] }))}>
                        {showKeys[key.id] ? <EyeOff className="h-3 w-3 text-muted-foreground" /> : <Eye className="h-3 w-3 text-muted-foreground" />}
                      </button>
                      <button className="text-muted-foreground hover:text-foreground">
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Créée: {key.created}</span>
                  <span>Dernière utilisation: {key.lastUsed}</span>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 h-7 w-7 p-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Institution Settings */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Paramètres de l\'institution</CardTitle>
            <CardDescription>Configuration générale de votre institution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom de l\'institution</Label>
                <Input defaultValue="Ministère de l'Administration Territoriale" />
              </div>
              <div className="space-y-2">
                <Label>Sigle</Label>
                <Input defaultValue="MAT" />
              </div>
              <div className="space-y-2">
                <Label>Tutelle</Label>
                <Input defaultValue="Primature" />
              </div>
              <div className="space-y-2">
                <Label>Localisation</Label>
                <Input defaultValue="Conakry, Kaloum" />
              </div>
            </div>
            <Button className="bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90" onClick={() => setSuccessToast('Paramètres enregistrés avec succès')}>
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
              const newKey = {
                id: String(Date.now()),
                name: newKeyName || 'Nouvelle clé',
                key: `eadmin_gen_${randomKey}`,
                created: new Date().toISOString().slice(0, 10),
                lastUsed: new Date().toISOString().slice(0, 10),
                status: 'active' as const,
              }
              setApiKeys(prev => [newKey, ...prev])
              setNewKeyName('')
              setNewKeyDialog(false)
              setSuccessToast(`Clé API "${newKey.name}" générée avec succès`)
            }}>
              Générer la clé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  )
}
