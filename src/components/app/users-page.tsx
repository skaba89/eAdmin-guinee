'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserCog, Search, Plus, Download, Upload, MoreHorizontal,
  Shield, Eye, Pencil, Trash2, UserPlus, CheckCircle2,
  XCircle, Clock, Filter, Users
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { DEMO_STATS } from '@/lib/constants'

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  institution: string
  status: 'actif' | 'inactif' | 'suspendu'
  lastLogin: string
}

const FAKE_USERS: UserRow[] = [
  { id: '1', name: 'Amadou Diallo', email: 'a.diallo@mat.gov.gn', role: 'Admin', institution: 'Ministère de l\'Administration Territoriale', status: 'actif', lastLogin: '2024-12-15 09:30' },
  { id: '2', name: 'Aissatou Baldé', email: 'a.balde@finances.gov.gn', role: 'Directeur', institution: 'Ministère des Finances', status: 'actif', lastLogin: '2024-12-15 08:45' },
  { id: '3', name: 'Ibrahima Sow', email: 'i.sow@mat.gov.gn', role: 'Chef de service', institution: 'Direction de l\'Urbanisme', status: 'actif', lastLogin: '2024-12-14 16:20' },
  { id: '4', name: 'Fatoumata Camara', email: 'f.camara@rh.gov.gn', role: 'Agent', institution: 'Direction des Ressources Humaines', status: 'actif', lastLogin: '2024-12-15 10:15' },
  { id: '5', name: 'Mamadou Keïta', email: 'm.keita@justice.gov.gn', role: 'Directeur', institution: 'Ministère de la Justice', status: 'actif', lastLogin: '2024-12-14 14:30' },
  { id: '6', name: 'Mariama Condé', email: 'm.conde@sgg.gov.gn', role: 'Chef de service', institution: 'Secrétariat Général du Gouvernement', status: 'actif', lastLogin: '2024-12-15 07:50' },
  { id: '7', name: 'Abdoulaye Bah', email: 'a.bah@budget.gov.gn', role: 'Agent', institution: 'Direction Générale du Budget', status: 'inactif', lastLogin: '2024-11-28 11:00' },
  { id: '8', name: 'Kadiatou Sylla', email: 'k.sylla@education.gov.gn', role: 'Lecteur', institution: 'Ministère de l\'Éducation', status: 'actif', lastLogin: '2024-12-13 09:00' },
  { id: '9', name: 'Sékou Touré', email: 's.toure@sante.gov.gn', role: 'Agent', institution: 'Ministère de la Santé', status: 'suspendu', lastLogin: '2024-12-01 15:45' },
  { id: '10', name: 'Djenabou Diallo', email: 'd.diallo@coop.gov.gn', role: 'Chef de service', institution: 'Direction de la Coopération', status: 'actif', lastLogin: '2024-12-14 13:20' },
  { id: '11', name: 'Alpha Condé', email: 'a.conde@presidence.gov.gn', role: 'Admin', institution: 'Présidence de la République', status: 'actif', lastLogin: '2024-12-15 06:30' },
  { id: '12', name: 'Aminata Touré', email: 'a.toure@social.gov.gn', role: 'Lecteur', institution: 'Ministère des Affaires Sociales', status: 'actif', lastLogin: '2024-12-12 10:00' },
]

const ROLE_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
  Admin: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: Shield },
  Directeur: { color: 'bg-brand/10 text-brand dark:bg-primary/20 dark:text-primary', icon: UserCog },
  'Chef de service': { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Users },
  Agent: { color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400', icon: UserPlus },
  Lecteur: { color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: Eye },
}

const STATUS_CONFIG = {
  actif: { label: 'Actif', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  inactif: { label: 'Inactif', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: Clock },
  suspendu: { label: 'Suspendu', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
}

export function UsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('tous')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [institutionFilter, setInstitutionFilter] = useState('tous')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)

  const institutions = [...new Set(FAKE_USERS.map(u => u.institution))]
  const roles = [...new Set(FAKE_USERS.map(u => u.role))]

  const filtered = FAKE_USERS.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'tous' || u.role === roleFilter
    const matchStatus = statusFilter === 'tous' || u.status === statusFilter
    const matchInst = institutionFilter === 'tous' || u.institution === institutionFilter
    return matchSearch && matchRole && matchStatus && matchInst
  })

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const toggleAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filtered.map(u => u.id))
    }
  }

  const stats = [
    { label: 'Total utilisateurs', value: DEMO_STATS.users.total, icon: Users, color: 'text-brand dark:text-primary', bg: 'bg-brand/5 dark:bg-primary/10' },
    { label: 'Actifs', value: DEMO_STATS.users.actifs, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Administrateurs', value: DEMO_STATS.users.admin, icon: Shield, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'Invités', value: DEMO_STATS.users.invite, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
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

      {/* Toolbar */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les rôles</SelectItem>
                  {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous</SelectItem>
                  <SelectItem value="actif">Actif</SelectItem>
                  <SelectItem value="inactif">Inactif</SelectItem>
                  <SelectItem value="suspendu">Suspendu</SelectItem>
                </SelectContent>
              </Select>
              <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
                <SelectTrigger className="w-[200px] hidden lg:flex">
                  <SelectValue placeholder="Institution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Toutes les institutions</SelectItem>
                  {institutions.map(inst => <SelectItem key={inst} value={inst}>{inst}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1">
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
              <Button variant="outline" size="sm" className="gap-1">
                <Upload className="h-3.5 w-3.5" />
                Import
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2 bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90">
                    <Plus className="h-4 w-4" />
                    Ajouter
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>Ajouter un utilisateur</DialogTitle>
                    <DialogDescription>Créer un nouveau compte utilisateur</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Prénom</Label>
                        <Input placeholder="Prénom" />
                      </div>
                      <div className="space-y-2">
                        <Label>Nom</Label>
                        <Input placeholder="Nom de famille" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="prenom.nom@institution.gov.gn" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Rôle</Label>
                        <Select>
                          <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                          <SelectContent>
                            {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Institution</Label>
                        <Select>
                          <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                          <SelectContent>
                            {institutions.map(inst => <SelectItem key={inst} value={inst}>{inst}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                    <Button className="bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90" onClick={() => setDialogOpen(false)}>
                      Créer l\'utilisateur
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Bulk actions */}
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 pt-2 border-t"
            >
              <span className="text-sm text-muted-foreground">{selectedIds.length} sélectionné(s)</span>
              <Button variant="outline" size="sm" className="gap-1">Désactiver</Button>
              <Button variant="outline" size="sm" className="gap-1">Changer le rôle</Button>
              <Button variant="outline" size="sm" className="gap-1 text-red-600">Supprimer</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>Tout désélectionner</Button>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead className="hidden md:table-cell">Rôle</TableHead>
                <TableHead className="hidden lg:table-cell">Institution</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden xl:table-cell">Dernière connexion</TableHead>
                <TableHead className="w-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user, i) => {
                const rConfig = ROLE_CONFIG[user.role]
                const sConfig = STATUS_CONFIG[user.status]
                const RoleIcon = rConfig.icon
                const StatusIcon = sConfig.icon
                const initials = user.name.split(' ').map(n => n[0]).join('')
                return (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(user.id)}
                        onCheckedChange={() => toggleSelect(user.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-brand/10 text-brand dark:bg-primary/20 dark:text-primary text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${rConfig.color}`}>
                        <RoleIcon className="h-3 w-3" />
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                      {user.institution}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sConfig.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {sConfig.label}
                      </span>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">{user.lastLogin}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2"><Eye className="h-4 w-4" /> Voir le profil</DropdownMenuItem>
                          <DropdownMenuItem className="gap-2"><Pencil className="h-4 w-4" /> Modifier</DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">Réinitialiser le mot de passe</DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-red-600"><Trash2 className="h-4 w-4" /> Supprimer</DropdownMenuItem>
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
        {filtered.length} utilisateur(s) affiché(s) sur {FAKE_USERS.length}
      </div>
    </div>
  )
}
