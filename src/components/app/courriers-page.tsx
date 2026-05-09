'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Mail, MailOpen, Send, Clock, Plus, Search, Filter,
  AlertTriangle, ArrowUpDown, Eye, MoreHorizontal,
  ChevronDown, X, Calendar, Building2, Timer
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { DEMO_STATS } from '@/lib/constants'

type CourrierTab = 'tous' | 'entrants' | 'sortants' | 'attente'
type Priority = 'Urgent' | 'Important' | 'Normal' | 'Faible'
type Status = 'En cours' | 'Traité' | 'En attente' | 'Archivé'
type Direction = 'entrant' | 'sortant'

interface Courrier {
  id: string
  reference: string
  objet: string
  correspondant: string
  direction: Direction
  date: string
  priorite: Priority
  statut: Status
  service: string
  sla?: string
}

const FAKE_COURRIERS: Courrier[] = [
  { id: '1', reference: 'CE-2024-1847', objet: 'Demande d\'autorisation de construction', correspondant: 'Ministère des Travaux Publics', direction: 'entrant', date: '2024-12-15', priorite: 'Urgent', statut: 'En cours', service: 'Urbanisme', sla: '2h 30m' },
  { id: '2', reference: 'CS-2024-0892', objet: 'Rapport d\'activité trimestriel Q4', correspondant: 'Cabinet du Premier Ministre', direction: 'sortant', date: '2024-12-14', priorite: 'Important', statut: 'Traité', service: 'Secrétariat' },
  { id: '3', reference: 'CE-2024-1848', objet: 'Convention de coopération BCEAO', correspondant: 'Banque Centrale', direction: 'entrant', date: '2024-12-14', priorite: 'Normal', statut: 'En attente', service: 'Finance', sla: '48h' },
  { id: '4', reference: 'CS-2024-0893', objet: 'Note de transmission budget 2025', correspondant: 'Direction Générale du Budget', direction: 'sortant', date: '2024-12-13', priorite: 'Urgent', statut: 'Traité', service: 'Finance' },
  { id: '5', reference: 'CE-2024-1849', objet: 'Invitation conférence CEDEAO', correspondant: 'Secrétariat CEDEAO', direction: 'entrant', date: '2024-12-13', priorite: 'Normal', statut: 'En cours', service: 'Affaires Étrangères', sla: '72h' },
  { id: '6', reference: 'CE-2024-1850', objet: 'Réclamation service public Conakry', correspondant: 'Mairie de Conakry', direction: 'entrant', date: '2024-12-12', priorite: 'Important', statut: 'En attente', service: 'Administration', sla: '24h' },
  { id: '7', reference: 'CS-2024-0894', objet: 'Arrêté de nomination commission', correspondant: 'Présidence de la République', direction: 'sortant', date: '2024-12-12', priorite: 'Urgent', statut: 'Traité', service: 'Personnel' },
  { id: '8', reference: 'CE-2024-1851', objet: 'Demande de subvention ONG', correspondant: 'ONG Espoir Guinée', direction: 'entrant', date: '2024-12-11', priorite: 'Faible', statut: 'En attente', service: 'Social', sla: '5j' },
  { id: '9', reference: 'CS-2024-0895', objet: 'Rapport d\'audit interne 2024', correspondant: 'Inspection Générale d\'État', direction: 'sortant', date: '2024-12-11', priorite: 'Important', statut: 'En cours', service: 'Audit' },
  { id: '10', reference: 'CE-2024-1852', objet: 'Proposition de partenariat universitaire', correspondant: 'Université de Conakry', direction: 'entrant', date: '2024-12-10', priorite: 'Normal', statut: 'Traité', service: 'Éducation' },
  { id: '11', reference: 'CE-2024-1853', objet: 'Transmission PV élection locale', correspondant: 'Commission Électorale', direction: 'entrant', date: '2024-12-10', priorite: 'Urgent', statut: 'En cours', service: 'Élections', sla: '4h' },
  { id: '12', reference: 'CS-2024-0896', objet: 'Circulaire de fin d\'année', correspondant: 'Tous les départements', direction: 'sortant', date: '2024-12-09', priorite: 'Normal', statut: 'Traité', service: 'Cabinet' },
]

const PRIORITY_CONFIG: Record<Priority, { color: string; icon: React.ElementType }> = {
  Urgent: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle },
  Important: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertTriangle },
  Normal: { color: 'bg-brand/10 text-brand dark:bg-primary/20 dark:text-primary', icon: Mail },
  Faible: { color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: Mail },
}

const STATUS_CONFIG: Record<Status, { color: string }> = {
  'En cours': { color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
  'Traité': { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  'En attente': { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  'Archivé': { color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
}

export function CourriersPage() {
  const [activeTab, setActiveTab] = useState<CourrierTab>('tous')
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('tous')
  const [serviceFilter, setServiceFilter] = useState<string>('tous')
  const [dialogOpen, setDialogOpen] = useState(false)

  const filtered = FAKE_COURRIERS.filter(c => {
    const matchTab = activeTab === 'tous' ||
      (activeTab === 'entrants' && c.direction === 'entrant') ||
      (activeTab === 'sortants' && c.direction === 'sortant') ||
      (activeTab === 'attente' && c.statut === 'En attente')
    const matchSearch = c.objet.toLowerCase().includes(search.toLowerCase()) ||
      c.reference.toLowerCase().includes(search.toLowerCase()) ||
      c.correspondant.toLowerCase().includes(search.toLowerCase())
    const matchPriority = priorityFilter === 'tous' || c.priorite === priorityFilter
    const matchService = serviceFilter === 'tous' || c.service === serviceFilter
    return matchTab && matchSearch && matchPriority && matchService
  })

  const services = [...new Set(FAKE_COURRIERS.map(c => c.service))]

  const statCards = [
    { label: 'Total courriers', value: DEMO_STATS.courriers.total.toLocaleString('fr-FR'), icon: Mail, color: 'text-brand dark:text-primary', bg: 'bg-brand/5 dark:bg-primary/10' },
    { label: 'Entrants', value: DEMO_STATS.courriers.entrants.toLocaleString('fr-FR'), icon: MailOpen, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
    { label: 'Sortants', value: DEMO_STATS.courriers.sortants.toLocaleString('fr-FR'), icon: Send, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'En attente (SLA)', value: DEMO_STATS.courriers.enAttente.toLocaleString('fr-FR'), icon: Timer, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', sublabel: 'Délai moyen: 24h' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="glass-card hover:shadow-lg transition-shadow">
              <CardContent className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  {stat.sublabel && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {stat.sublabel}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs + Actions */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CourrierTab)}>
              <TabsList>
                <TabsTrigger value="tous">Tous</TabsTrigger>
                <TabsTrigger value="entrants" className="gap-1">
                  <MailOpen className="h-3.5 w-3.5" />
                  Entrants
                </TabsTrigger>
                <TabsTrigger value="sortants" className="gap-1">
                  <Send className="h-3.5 w-3.5" />
                  Sortants
                </TabsTrigger>
                <TabsTrigger value="attente" className="gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  En attente
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90">
                  <Plus className="h-4 w-4" />
                  Nouveau courrier
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>Nouveau courrier</DialogTitle>
                  <DialogDescription>Enregistrer un nouveau courrier entrant ou sortant</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Direction</Label>
                      <Select defaultValue="entrant">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entrant">Entrant</SelectItem>
                          <SelectItem value="sortant">Sortant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priorité</Label>
                      <Select defaultValue="Normal">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Urgent">Urgent</SelectItem>
                          <SelectItem value="Important">Important</SelectItem>
                          <SelectItem value="Normal">Normal</SelectItem>
                          <SelectItem value="Faible">Faible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Objet</Label>
                    <Input placeholder="Objet du courrier" />
                  </div>
                  <div className="space-y-2">
                    <Label>Expéditeur / Destinataire</Label>
                    <Input placeholder="Nom de l'institution ou personne" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Service</Label>
                      <Select>
                        <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                        <SelectContent>
                          {services.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea placeholder="Notes complémentaires..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                  <Button className="bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90" onClick={() => setDialogOpen(false)}>
                    Enregistrer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par référence, objet, correspondant..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Toutes</SelectItem>
                <SelectItem value="Urgent">Urgent</SelectItem>
                <SelectItem value="Important">Important</SelectItem>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Faible">Faible</SelectItem>
              </SelectContent>
            </Select>
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les services</SelectItem>
                {services.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Courriers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Objet</TableHead>
                <TableHead className="hidden md:table-cell">Correspondant</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden xl:table-cell">SLA</TableHead>
                <TableHead className="w-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c, i) => {
                const pConfig = PRIORITY_CONFIG[c.priorite]
                const sConfig = STATUS_CONFIG[c.statut]
                const PriorityIcon = pConfig.icon
                return (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {c.direction === 'entrant' ? (
                          <MailOpen className="h-4 w-4 text-sky-500 shrink-0" />
                        ) : (
                          <Send className="h-4 w-4 text-emerald-500 shrink-0" />
                        )}
                        <span className="font-mono text-sm font-medium">{c.reference}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[250px]">
                      <span className="text-sm truncate block">{c.objet}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{c.correspondant}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{c.date}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${pConfig.color}`}>
                        <PriorityIcon className="h-3 w-3" />
                        {c.priorite}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sConfig.color}`}>
                        {c.statut}
                      </span>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {c.sla && c.statut !== 'Traité' && c.statut !== 'Archivé' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                          <Timer className="h-3 w-3" />
                          {c.sla}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2"><Eye className="h-4 w-4" /> Consulter</DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">Traiter</DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">Transférer</DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">Archiver</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground text-center">
        {filtered.length} courrier(s) affiché(s)
      </div>
    </div>
  )
}
