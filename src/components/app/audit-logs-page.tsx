'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ScrollText, Search, Download, Filter, Clock, User,
  Activity, Globe, ChevronDown, RefreshCw, AlertTriangle
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

interface AuditLog {
  id: string
  timestamp: string
  user: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'APPROVE' | 'REJECT'
  resource: string
  resourceType: string
  ipAddress: string
  details: string
}

const FAKE_LOGS: AuditLog[] = [
  { id: '1', timestamp: '2024-12-15 14:32:15', user: 'Amadou Diallo', action: 'LOGIN', resource: 'Session', resourceType: 'auth', ipAddress: '196.125.43.21', details: 'Connexion réussie depuis Conakry' },
  { id: '2', timestamp: '2024-12-15 14:28:03', user: 'Aissatou Baldé', action: 'CREATE', resource: 'Courrier CE-2024-1852', resourceType: 'courriers', ipAddress: '196.125.43.22', details: 'Nouveau courrier entrant créé' },
  { id: '3', timestamp: '2024-12-15 14:15:47', user: 'Ibrahima Sow', action: 'UPDATE', resource: 'Workflow WF-2024-045', resourceType: 'workflows', ipAddress: '196.125.43.25', details: 'Transition d\'étape: Validation → Approbation' },
  { id: '4', timestamp: '2024-12-15 13:55:21', user: 'Fatoumata Camara', action: 'APPROVE', resource: 'Demande de congé DC-2024-089', resourceType: 'workflows', ipAddress: '196.125.43.30', details: 'Approbation DRH - Congé validé' },
  { id: '5', timestamp: '2024-12-15 13:42:08', user: 'Alpha Condé', action: 'CREATE', resource: 'Arrêté n°2024-312', resourceType: 'ged', ipAddress: '196.125.43.10', details: 'Nouveau document GED créé et classé' },
  { id: '6', timestamp: '2024-12-15 12:30:55', user: 'Mariama Condé', action: 'UPDATE', resource: 'Paramètres sécurité', resourceType: 'admin', ipAddress: '196.125.43.15', details: 'Activation de la MFA pour tous les utilisateurs' },
  { id: '7', timestamp: '2024-12-15 11:18:33', user: 'Kadiatou Sylla', action: 'EXPORT', resource: 'Rapport mensuel Nov-2024', resourceType: 'ged', ipAddress: '196.125.43.35', details: 'Export PDF du rapport mensuel' },
  { id: '8', timestamp: '2024-12-15 10:45:12', user: 'Mamadou Keïta', action: 'DELETE', resource: 'Brouillon circulaire C-2024-046', resourceType: 'ged', ipAddress: '196.125.43.40', details: 'Suppression d\'un brouillon obsolète' },
  { id: '9', timestamp: '2024-12-15 09:55:44', user: 'Abdoulaye Bah', action: 'UPDATE', resource: 'Budget prévisionnel 2025', resourceType: 'ged', ipAddress: '196.125.43.45', details: 'Mise à jour chapitre 3 - Dépenses d\'investissement' },
  { id: '10', timestamp: '2024-12-15 09:30:00', user: 'Sékou Touré', action: 'REJECT', resource: 'Demande subvention DS-2024-023', resourceType: 'workflows', ipAddress: '196.125.43.50', details: 'Rejet - Dossier incomplet' },
  { id: '11', timestamp: '2024-12-15 08:22:18', user: 'Djenabou Diallo', action: 'LOGIN', resource: 'Session', resourceType: 'auth', ipAddress: '196.125.43.55', details: 'Connexion depuis Kindia' },
  { id: '12', timestamp: '2024-12-15 08:10:05', user: 'Aminata Touré', action: 'CREATE', resource: 'Dossier citoyen DOSS-2024-4521', resourceType: 'citoyen', ipAddress: '196.125.43.60', details: 'Nouvelle demande d\'acte de naissance' },
  { id: '13', timestamp: '2024-12-14 17:45:33', user: 'Amadou Diallo', action: 'LOGOUT', resource: 'Session', resourceType: 'auth', ipAddress: '196.125.43.21', details: 'Déconnexion de fin de journée' },
  { id: '14', timestamp: '2024-12-14 16:30:12', user: 'Système', action: 'UPDATE', resource: 'Service WhatsApp API', resourceType: 'système', ipAddress: '10.0.0.1', details: 'Tentative de reconnexion automatique - Échec' },
  { id: '15', timestamp: '2024-12-14 15:15:48', user: 'Ibrahima Sow', action: 'APPROVE', resource: 'Marché public MP-2024-567', resourceType: 'workflows', ipAddress: '196.125.43.25', details: 'Validation commission d\'appel d\'offres' },
]

const ACTION_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  CREATE: { label: 'Création', color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  UPDATE: { label: 'Modification', color: 'text-sky-700 dark:text-sky-400', bgColor: 'bg-sky-100 dark:bg-sky-900/30' },
  DELETE: { label: 'Suppression', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  LOGIN: { label: 'Connexion', color: 'text-gray-700 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  LOGOUT: { label: 'Déconnexion', color: 'text-gray-700 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  EXPORT: { label: 'Export', color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  APPROVE: { label: 'Approbation', color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  REJECT: { label: 'Rejet', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
}

const RESOURCE_TYPES = ['Tous', 'auth', 'courriers', 'workflows', 'ged', 'admin', 'citoyen', 'système']
const ACTION_TYPES = ['Tous', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'APPROVE', 'REJECT']

export function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('Tous')
  const [resourceFilter, setResourceFilter] = useState('Tous')
  const [isLive, setIsLive] = useState(true)

  const filtered = FAKE_LOGS.filter(log => {
    const matchSearch = log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.resource.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase())
    const matchAction = actionFilter === 'Tous' || log.action === actionFilter
    const matchResource = resourceFilter === 'Tous' || log.resourceType === resourceFilter
    return matchSearch && matchAction && matchResource
  })

  const actionCounts = {
    CREATE: FAKE_LOGS.filter(l => l.action === 'CREATE').length,
    UPDATE: FAKE_LOGS.filter(l => l.action === 'UPDATE').length,
    DELETE: FAKE_LOGS.filter(l => l.action === 'DELETE').length,
    LOGIN: FAKE_LOGS.filter(l => l.action === 'LOGIN').length,
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total événements', value: FAKE_LOGS.length, icon: ScrollText, color: 'text-brand dark:text-primary', bg: 'bg-brand/5 dark:bg-primary/10' },
          { label: 'Créations', value: actionCounts.CREATE, icon: Activity, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Modifications', value: actionCounts.UPDATE, icon: Activity, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
          { label: 'Suppressions', value: actionCounts.DELETE, icon: Activity, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
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
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(a => <SelectItem key={a} value={a}>{a === 'Tous' ? 'Toutes les actions' : a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Ressource" />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPES.map(r => <SelectItem key={r} value={r}>{r === 'Tous' ? 'Toutes les ressources' : r}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" className="w-[150px]" placeholder="Date début" />
              <Input type="date" className="w-[150px]" placeholder="Date fin" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
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
                Dernière activité: Il y a 5 minutes
              </span>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
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
                return (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        {log.timestamp}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-brand/10 dark:bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-brand dark:text-primary">
                            {log.user.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <span className="text-sm">{log.user}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${aConfig.bgColor} ${aConfig.color}`}>
                        {aConfig.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm truncate max-w-[200px]">{log.resource}</p>
                        <Badge variant="outline" className="text-[10px] mt-0.5">{log.resourceType}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {log.ipAddress}
                      </span>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <p className="text-xs text-muted-foreground truncate max-w-[250px]">{log.details}</p>
                    </TableCell>
                  </motion.tr>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground text-center">
        {filtered.length} entrée(s) affichée(s) sur {FAKE_LOGS.length}
      </div>
    </div>
  )
}
