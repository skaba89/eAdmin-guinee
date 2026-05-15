'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserCog, Search, Plus, Download, Upload, MoreHorizontal,
  Shield, Eye, Pencil, Trash2, UserPlus, CheckCircle2,
  XCircle, Clock, Filter, Users, KeyRound
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { useUsersStore, type UserAccount, type UserAccountStatus } from '@/store/users-store'

// ─── ROLE DISPLAY MAPPING ──────────────────────────────────────────────────────

type StoreRole = UserAccount['role']

const ROLE_LABELS: Record<StoreRole, string> = {
  super_admin: 'Super Admin',
  admin_general: 'Admin Général',
  ministere: 'Ministère',
  mairie: 'Mairie',
  agence: 'Agence',
  citizen: 'Citoyen',
}

const ROLE_CONFIG: Record<StoreRole, { color: string; icon: React.ElementType }> = {
  super_admin: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: Shield },
  admin_general: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: Shield },
  ministere: { color: 'bg-brand/10 text-brand dark:bg-primary/20 dark:text-primary', icon: UserCog },
  mairie: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Users },
  agence: { color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400', icon: UserPlus },
  citizen: { color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: Eye },
}

const STATUS_CONFIG: Record<UserAccountStatus, { label: string; color: string; icon: React.ElementType }> = {
  actif: { label: 'Actif', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  inactif: { label: 'Inactif', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: Clock },
  suspendu: { label: 'Suspendu', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  en_attente: { label: 'En attente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
}

const ALL_ROLES: StoreRole[] = ['super_admin', 'admin_general', 'ministere', 'mairie', 'agence', 'citizen']

// ─── HELPERS ───────────────────────────────────────────────────────────────────

function displayName(u: UserAccount): string {
  return u.firstName ? `${u.firstName} ${u.name}` : u.name
}

function formatLastLogin(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getInstitution(u: UserAccount): string {
  return u.institution || u.mairie || u.agence || 'Non assigné'
}

// ─── CSV EXPORT ────────────────────────────────────────────────────────────────

function exportUsersCSV(users: UserAccount[]) {
  const headers = ['ID', 'Prénom', 'Nom', 'Email', 'Rôle', 'Statut', 'Téléphone', 'NIN', 'Institution', 'Mairie', 'Agence', 'Date création', 'Dernière connexion']
  const rows = users.map(u => [
    u.id,
    u.firstName ?? '',
    u.name,
    u.email,
    ROLE_LABELS[u.role],
    STATUS_CONFIG[u.status].label,
    u.phone ?? '',
    u.nin ?? '',
    u.institution ?? '',
    u.mairie ?? '',
    u.agence ?? '',
    formatLastLogin(u.createdAt),
    formatLastLogin(u.lastLogin),
  ])

  const escapeCSV = (v: string) => {
    if (v.includes(',') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`
    }
    return v
  }

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(',')),
  ].join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `utilisateurs_export_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ─── COMPONENT ─────────────────────────────────────────────────────────────────

export function UsersPage() {
  const store = useUsersStore()

  // ── Local UI state ───────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<StoreRole | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<UserAccountStatus | 'all'>('all')
  const [institutionFilter, setInstitutionFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newUser, setNewUser] = useState({
    firstName: '', name: '', email: '', role: '' as StoreRole | '',
    institution: '', phone: '', nin: '',
  })
  const [successToast, setSuccessToast] = useState('')

  // Profile dialog
  const [profileDialog, setProfileDialog] = useState(false)
  const [profileUser, setProfileUser] = useState<UserAccount | null>(null)

  // Edit dialog
  const [editDialog, setEditDialog] = useState(false)
  const [editUser, setEditUser] = useState<UserAccount | null>(null)
  const [editForm, setEditForm] = useState({
    firstName: '', name: '', email: '', role: '' as StoreRole, institution: '',
  })

  // Reset password confirmation
  const [resetPasswordDialog, setResetPasswordDialog] = useState(false)
  const [resetPasswordUser, setResetPasswordUser] = useState<UserAccount | null>(null)

  // Delete user confirmation
  const [deleteUserDialog, setDeleteUserDialog] = useState(false)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [deleteUserName, setDeleteUserName] = useState('')

  // Bulk delete confirmation
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false)

  // Bulk change role dialog
  const [bulkRoleDialog, setBulkRoleDialog] = useState(false)
  const [bulkRole, setBulkRole] = useState<StoreRole | ''>('')

  // ── Toast ────────────────────────────────────────────────────────────────
  const showToast = useCallback((message: string) => {
    setSuccessToast(message)
  }, [])

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  // ── Derived data ─────────────────────────────────────────────────────────
  const institutions = useMemo(
    () => [...new Set(store.users.map(u => getInstitution(u)).filter(Boolean))],
    [store.users]
  )

  const filtered = useMemo(() => {
    const base = store.getFilteredUsers(search, roleFilter, statusFilter)
    if (institutionFilter === 'all') return base
    return base.filter(u => getInstitution(u) === institutionFilter)
  }, [store, search, roleFilter, statusFilter, institutionFilter])

  const stats = useMemo(() => store.getStats(), [store])

  // ── Selection ────────────────────────────────────────────────────────────
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

  // ── User dropdown handlers ───────────────────────────────────────────────
  const handleViewProfile = (user: UserAccount) => {
    setProfileUser(user)
    setProfileDialog(true)
  }

  const handleEditOpen = (user: UserAccount) => {
    setEditUser(user)
    setEditForm({
      firstName: user.firstName ?? '',
      name: user.name,
      email: user.email,
      role: user.role,
      institution: getInstitution(user),
    })
    setEditDialog(true)
  }

  const handleEditSave = () => {
    if (!editUser) return
    const updates: Partial<UserAccount> = {
      firstName: editForm.firstName || undefined,
      name: editForm.name,
      email: editForm.email,
      role: editForm.role,
    }
    // Set the appropriate institution field based on role
    if (editForm.role === 'mairie') {
      updates.mairie = editForm.institution
      updates.institution = undefined
      updates.agence = undefined
    } else if (editForm.role === 'agence') {
      updates.agence = editForm.institution
      updates.institution = undefined
      updates.mairie = undefined
    } else {
      updates.institution = editForm.institution
      updates.mairie = undefined
      updates.agence = undefined
    }
    store.updateUser(editUser.id, updates)
    setEditDialog(false)
    showToast(`Utilisateur ${displayName(editUser)} modifié avec succès`)
  }

  const handleResetPasswordOpen = (user: UserAccount) => {
    setResetPasswordUser(user)
    setResetPasswordDialog(true)
  }

  const handleResetPasswordConfirm = () => {
    if (!resetPasswordUser) return
    store.updateUser(resetPasswordUser.id, { password: `temp-${Date.now()}` })
    setResetPasswordDialog(false)
    showToast(`Mot de passe réinitialisé pour ${displayName(resetPasswordUser)}`)
  }

  const handleDeleteUserOpen = (user: UserAccount) => {
    setDeleteUserId(user.id)
    setDeleteUserName(displayName(user))
    setDeleteUserDialog(true)
  }

  const handleDeleteUserConfirm = () => {
    if (!deleteUserId) return
    store.deleteUser(deleteUserId)
    setSelectedIds(prev => prev.filter(id => id !== deleteUserId))
    setDeleteUserDialog(false)
    showToast(`Utilisateur ${deleteUserName} supprimé`)
  }

  // ── Bulk action handlers ─────────────────────────────────────────────────
  const handleBulkSuspend = () => {
    store.suspendMultiple(selectedIds)
    showToast(`${selectedIds.length} utilisateur(s) suspendu(s)`)
    setSelectedIds([])
  }

  const handleBulkRoleConfirm = () => {
    if (!bulkRole) return
    store.changeMultipleRoles(selectedIds, bulkRole)
    showToast(`Rôle "${ROLE_LABELS[bulkRole]}" appliqué à ${selectedIds.length} utilisateur(s)`)
    setBulkRoleDialog(false)
    setBulkRole('')
    setSelectedIds([])
  }

  const handleBulkDeleteOpen = () => {
    setBulkDeleteDialog(true)
  }

  const handleBulkDeleteConfirm = () => {
    store.deleteMultiple(selectedIds)
    showToast(`${selectedIds.length} utilisateur(s) supprimé(s)`)
    setSelectedIds([])
    setBulkDeleteDialog(false)
  }

  // ── Export/Import handlers ───────────────────────────────────────────────
  const handleExport = () => {
    exportUsersCSV(filtered)
    showToast(`${filtered.length} utilisateur(s) exporté(s) en CSV`)
  }

  const handleImport = () => {
    showToast('Import en cours de traitement...')
  }

  // ── Add user handler ────────────────────────────────────────────────────
  const handleAddUser = () => {
    const role = (newUser.role || 'citizen') as StoreRole
    const userData: Omit<UserAccount, 'id' | 'createdAt'> = {
      email: newUser.email || 'email@gov.gn',
      name: newUser.name || 'Nouvel utilisateur',
      firstName: newUser.firstName || undefined,
      role,
      status: 'actif',
      phone: newUser.phone || undefined,
      nin: newUser.nin || undefined,
      password: 'demo123',
    }
    // Set the appropriate institution field based on role
    if (role === 'mairie') {
      userData.mairie = newUser.institution || undefined
    } else if (role === 'agence') {
      userData.agence = newUser.institution || undefined
    } else {
      userData.institution = newUser.institution || undefined
    }
    store.addUser(userData)
    const fullName = newUser.firstName ? `${newUser.firstName} ${newUser.name}` : newUser.name
    setNewUser({ firstName: '', name: '', email: '', role: '', institution: '', phone: '', nin: '' })
    setDialogOpen(false)
    showToast(`Utilisateur ${fullName || 'Nouvel utilisateur'} créé avec succès`)
  }

  // ── Stats display ────────────────────────────────────────────────────────
  const statsDisplay = [
    { label: 'Total utilisateurs', value: stats.total, icon: Users, color: 'text-brand dark:text-primary', bg: 'bg-brand/5 dark:bg-primary/10' },
    { label: 'Actifs', value: stats.active, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Administrateurs', value: (stats.byRole['super_admin'] ?? 0) + (stats.byRole['admin_general'] ?? 0), icon: Shield, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'Connexions récentes', value: stats.recentLogins, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsDisplay.map((stat, i) => (
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
                  placeholder="Rechercher par nom, email, téléphone..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={v => setRoleFilter(v as StoreRole | 'all')}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  {ALL_ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={v => setStatusFilter(v as UserAccountStatus | 'all')}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="actif">Actif</SelectItem>
                  <SelectItem value="inactif">Inactif</SelectItem>
                  <SelectItem value="suspendu">Suspendu</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                </SelectContent>
              </Select>
              <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
                <SelectTrigger className="w-[200px] hidden lg:flex">
                  <SelectValue placeholder="Institution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les institutions</SelectItem>
                  {institutions.map(inst => <SelectItem key={inst} value={inst}>{inst}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={handleExport}>
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={handleImport}>
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
                        <Input placeholder="Prénom" value={newUser.firstName} onChange={e => setNewUser(prev => ({ ...prev, firstName: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Nom</Label>
                        <Input placeholder="Nom de famille" value={newUser.name} onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="prenom.nom@institution.gov.gn" value={newUser.email} onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Rôle</Label>
                        <Select value={newUser.role} onValueChange={v => setNewUser(prev => ({ ...prev, role: v as StoreRole }))}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                          <SelectContent>
                            {ALL_ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Institution</Label>
                        <Select value={newUser.institution} onValueChange={v => setNewUser(prev => ({ ...prev, institution: v }))}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                          <SelectContent>
                            {institutions.map(inst => <SelectItem key={inst} value={inst}>{inst}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Téléphone</Label>
                        <Input placeholder="+224 6XX XX XX XX" value={newUser.phone} onChange={e => setNewUser(prev => ({ ...prev, phone: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>NIN</Label>
                        <Input placeholder="NIN-XXXX-XXXXX" value={newUser.nin} onChange={e => setNewUser(prev => ({ ...prev, nin: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                    <Button className="bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90" onClick={handleAddUser}>
                      Créer l&apos;utilisateur
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
              <Button variant="outline" size="sm" className="gap-1" onClick={handleBulkSuspend}>
                <XCircle className="h-3.5 w-3.5" />
                Suspendre
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => { setBulkRole(''); setBulkRoleDialog(true) }}>
                <Shield className="h-3.5 w-3.5" />
                Changer le rôle
              </Button>
              <Button variant="outline" size="sm" className="gap-1 text-red-600" onClick={handleBulkDeleteOpen}>
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </Button>
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
                const fullName = displayName(user)
                const initials = fullName.split(' ').map(n => n[0]).join('')
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
                          <p className="text-sm font-medium">{fullName}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${rConfig.color}`}>
                        <RoleIcon className="h-3 w-3" />
                        {ROLE_LABELS[user.role]}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                      {getInstitution(user)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sConfig.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {sConfig.label}
                      </span>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">{formatLastLogin(user.lastLogin)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2" onClick={() => handleViewProfile(user)}>
                            <Eye className="h-4 w-4" /> Voir le profil
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" onClick={() => handleEditOpen(user)}>
                            <Pencil className="h-4 w-4" /> Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" onClick={() => handleResetPasswordOpen(user)}>
                            <KeyRound className="h-4 w-4" /> Réinitialiser le mot de passe
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-red-600 focus:text-red-600" onClick={() => handleDeleteUserOpen(user)}>
                            <Trash2 className="h-4 w-4" /> Supprimer
                          </DropdownMenuItem>
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
        {filtered.length} utilisateur(s) affiché(s) sur {store.users.length}
      </div>

      {/* ===== DIALOGS ===== */}

      {/* View Profile Dialog */}
      <Dialog open={profileDialog} onOpenChange={setProfileDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-brand dark:text-primary" />
              Profil utilisateur
            </DialogTitle>
            <DialogDescription>Détails du compte utilisateur</DialogDescription>
          </DialogHeader>
          {profileUser && (() => {
            const fullName = displayName(profileUser)
            const rc = ROLE_CONFIG[profileUser.role]
            const RIcon = rc.icon
            const sc = STATUS_CONFIG[profileUser.status]
            const SIcon = sc.icon
            return (
              <div className="grid gap-4 py-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-brand/10 text-brand dark:bg-primary/20 dark:text-primary text-xl">
                      {fullName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-lg font-semibold">{fullName}</p>
                    <p className="text-sm text-muted-foreground">{profileUser.email}</p>
                    {profileUser.phone && <p className="text-sm text-muted-foreground">{profileUser.phone}</p>}
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Rôle</span>
                    <div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${rc.color}`}>
                        <RIcon className="h-3 w-3" />
                        {ROLE_LABELS[profileUser.role]}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Statut</span>
                    <div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                        <SIcon className="h-3 w-3" />
                        {sc.label}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Institution</span>
                  <p className="text-sm">{getInstitution(profileUser)}</p>
                </div>
                {profileUser.nin && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">NIN</span>
                    <p className="text-sm">{profileUser.nin}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Date de création</span>
                    <p className="text-sm">{formatLastLogin(profileUser.createdAt)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Dernière connexion</span>
                    <p className="text-sm">{formatLastLogin(profileUser.lastLogin)}</p>
                  </div>
                </div>
              </div>
            )
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileDialog(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-brand dark:text-primary" />
              Modifier l&apos;utilisateur
            </DialogTitle>
            <DialogDescription>Modifier les informations du compte</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prénom</Label>
                <Input value={editForm.firstName} onChange={e => setEditForm(prev => ({ ...prev, firstName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={editForm.name} onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select value={editForm.role} onValueChange={v => setEditForm(prev => ({ ...prev, role: v as StoreRole }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Institution</Label>
                <Select value={editForm.institution} onValueChange={v => setEditForm(prev => ({ ...prev, institution: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {institutions.map(inst => <SelectItem key={inst} value={inst}>{inst}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Annuler</Button>
            <Button className="bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90" onClick={handleEditSave}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Confirmation */}
      <AlertDialog open={resetPasswordDialog} onOpenChange={setResetPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-600" />
              Réinitialiser le mot de passe
            </AlertDialogTitle>
            <AlertDialogDescription>
              {resetPasswordUser && `Voulez-vous réinitialiser le mot de passe de ${displayName(resetPasswordUser)} ? Un nouveau mot de passe temporaire sera généré et envoyé par email.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleResetPasswordConfirm}>
              Réinitialiser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Single User Confirmation */}
      <AlertDialog open={deleteUserDialog} onOpenChange={setDeleteUserDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Supprimer l&apos;utilisateur
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l&apos;utilisateur {deleteUserName} ? Cette action est irréversible et toutes les données associées seront perdues.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteUserConfirm}>
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Supprimer les utilisateurs sélectionnés
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer {selectedIds.length} utilisateur(s) ? Cette action est irréversible et toutes les données associées seront perdues.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleBulkDeleteConfirm}>
              Supprimer {selectedIds.length} utilisateur(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Change Role Dialog */}
      <Dialog open={bulkRoleDialog} onOpenChange={setBulkRoleDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-brand dark:text-primary" />
              Changer le rôle
            </DialogTitle>
            <DialogDescription>
              Appliquer un nouveau rôle aux {selectedIds.length} utilisateur(s) sélectionné(s)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nouveau rôle</Label>
              <Select value={bulkRole} onValueChange={v => setBulkRole(v as StoreRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkRoleDialog(false)}>Annuler</Button>
            <Button className="bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90" onClick={handleBulkRoleConfirm} disabled={!bulkRole}>
              Appliquer le rôle
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
