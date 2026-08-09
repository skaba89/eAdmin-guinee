'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Pencil, Plus, RefreshCw, Shield, Trash2, Users } from 'lucide-react'
import { useAppStore, type UserRole } from '@/store/app-store'
import { listInstitutions, type InstitutionOption } from '@/lib/institutions-api'
import {
  createManagedUser,
  deactivateManagedUser,
  listManagedUsers,
  updateManagedUser,
  type BackendRole,
  type ManagedUser,
} from '@/lib/users-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const ROLE_META: Record<BackendRole, { label: string; level: number }> = {
  CITOYEN: { label: 'Citoyen', level: 0 },
  AGENT: { label: 'Agent', level: 2 },
  MAIRIE: { label: 'Agent de mairie', level: 2 },
  AGENCE: { label: "Agent d'agence", level: 2 },
  ADMIN: { label: 'Administrateur', level: 3 },
  CHEF_SERVICE: { label: 'Chef de service', level: 4 },
  DIRECTEUR: { label: 'Directeur', level: 5 },
  MINISTRE: { label: 'Ministre', level: 6 },
  SUPER_ADMIN: { label: 'Super administrateur', level: 7 },
}

const FRONTEND_LEVEL: Record<UserRole, number> = {
  citizen: 0,
  mairie: 2,
  agence: 2,
  agent: 2,
  ministere: 2,
  admin_general: 3,
  chef_service: 4,
  directeur: 5,
  ministre: 6,
  super_admin: 7,
}

const INSTITUTION_BOUND_ROLES = new Set<BackendRole>([
  'AGENT',
  'MAIRIE',
  'AGENCE',
  'ADMIN',
  'CHEF_SERVICE',
  'DIRECTEUR',
])

interface UserFormState {
  fullName: string
  email: string
  password: string
  role: BackendRole
  institution: string
  institutionId: string
  tenantId: string
}

const EMPTY_FORM: UserFormState = {
  fullName: '',
  email: '',
  password: '',
  role: 'CITOYEN',
  institution: '',
  institutionId: '',
  tenantId: '',
}

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return value
  }
}

function institutionsForRole(role: BackendRole, institutions: InstitutionOption[]): InstitutionOption[] {
  if (role === 'MAIRIE') return institutions.filter((item) => item.type.toLowerCase() === 'mairie')
  if (role === 'AGENCE') return institutions.filter((item) => item.type.toLowerCase() === 'agence')
  return institutions
}

export function ManagedUsersPage() {
  const actor = useAppStore((state) => state.user)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([])
  const [loadingInstitutions, setLoadingInstitutions] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | BackendRole>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<ManagedUser | null>(null)
  const [deleteUser, setDeleteUser] = useState<ManagedUser | null>(null)
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM)

  const actorLevel = actor ? FRONTEND_LEVEL[actor.role] : 0
  const assignableRoles = useMemo(
    () => (Object.entries(ROLE_META) as [BackendRole, { label: string; level: number }][]) 
      .filter(([role, meta]) => meta.level < actorLevel && role !== 'SUPER_ADMIN')
      .sort((a, b) => b[1].level - a[1].level),
    [actorLevel],
  )

  async function loadUsers() {
    setLoading(true)
    setError('')
    try {
      const result = await listManagedUsers({
        search,
        role: roleFilter === 'all' ? '' : roleFilter,
        pageSize: 100,
      })
      setUsers(result.items)
    } catch (reason) {
      setUsers([])
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les utilisateurs.')
    } finally {
      setLoading(false)
    }
  }

  async function loadGovernedInstitutions() {
    if (actor?.role !== 'super_admin') return
    setLoadingInstitutions(true)
    try {
      setInstitutions(await listInstitutions({ limit: 500 }))
    } catch (reason) {
      setInstitutions([])
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les institutions.')
    } finally {
      setLoadingInstitutions(false)
    }
  }

  useEffect(() => {
    void loadUsers()
    // Filters are deliberately server-authoritative; reload when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter])

  useEffect(() => {
    void loadGovernedInstitutions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor?.role])

  function openCreate() {
    setForm({
      ...EMPTY_FORM,
      role: assignableRoles.at(-1)?.[0] || 'CITOYEN',
      institution: actor?.institution === 'République de Guinée' ? '' : actor?.institution || '',
    })
    setError('')
    setNotice('')
    setCreateOpen(true)
  }

  async function handleCreate() {
    if (!form.fullName.trim() || !form.email.trim() || !form.password || !form.role) {
      setError('Nom, email, mot de passe et rôle sont obligatoires.')
      return
    }
    if (
      actor?.role === 'super_admin'
      && INSTITUTION_BOUND_ROLES.has(form.role)
      && !form.institutionId.trim()
    ) {
      setError('Sélectionnez l’institution ou la mairie de rattachement avant de créer ce compte.')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')
    try {
      const created = await createManagedUser({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        role: form.role,
        institution: form.institution,
        institutionId: form.institutionId,
        tenantId: actor?.role === 'super_admin' ? form.tenantId : undefined,
      })

      // Do not trust an optimistic browser insert. Re-read the new account from
      // the server; the backend itself only returns 201 after PostgreSQL COMMIT.
      const verification = await listManagedUsers({
        search: created.email,
        pageSize: 100,
      })
      const persisted = verification.items.find((item) => item.id === created.id)
      if (!persisted) {
        throw new Error(
          'Le backend a répondu à la création, mais le compte n’est pas relu depuis la base. La création est considérée comme échouée.',
        )
      }

      setCreateOpen(false)
      setForm(EMPTY_FORM)
      await loadUsers()
      setNotice(
        `Compte ${persisted.email} enregistré dans PostgreSQL et rattaché à ${persisted.institution || 'son périmètre'}.`,
      )
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Création impossible.')
    } finally {
      setSaving(false)
    }
  }

  function openEdit(user: ManagedUser) {
    setEditUser(user)
    setForm({
      fullName: user.full_name,
      email: user.email,
      password: '',
      role: user.role,
      institution: user.institution || '',
      institutionId: user.institution_id || '',
      tenantId: user.tenant_id || '',
    })
    setError('')
    setNotice('')
  }

  async function handleEdit() {
    if (!editUser) return
    setSaving(true)
    setError('')
    try {
      const updated = await updateManagedUser(editUser.id, {
        email: form.email,
        fullName: form.fullName,
        role: form.role,
        institution: form.institution,
        institutionId: form.institutionId,
      })
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item))
      setEditUser(null)
      setNotice(`Compte ${updated.email} mis à jour avec succès.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Mise à jour impossible.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate() {
    if (!deleteUser) return
    setSaving(true)
    setError('')
    try {
      await deactivateManagedUser(deleteUser.id)
      setUsers((current) => current.filter((item) => item.id !== deleteUser.id))
      setNotice(`Compte ${deleteUser.email} désactivé. Ses sessions et habilitations associées sont révoquées par le backend.`)
      setDeleteUser(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Désactivation impossible.')
    } finally {
      setSaving(false)
    }
  }

  const activeCount = users.filter((user) => user.is_active).length

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Utilisateurs et portails</h1>
          <p className="text-sm text-muted-foreground">
            Comptes réels PostgreSQL. Chaque compte administratif est rattaché à son tenant et à son institution.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadUsers()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </Button>
          <Button onClick={openCreate} disabled={!assignableRoles.length}>
            <Plus className="mr-2 h-4 w-4" /> Créer un compte
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> <span>{notice}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardDescription>Comptes visibles</CardDescription><CardTitle>{users.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Comptes actifs</CardDescription><CardTitle>{activeCount}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Votre niveau</CardDescription><CardTitle className="text-base">{actor ? actor.fonction : 'Non déterminé'}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Comptes</CardTitle>
          <CardDescription>Un administrateur municipal ne peut gérer que les comptes et dossiers de sa propre mairie.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              placeholder="Nom ou email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') void loadUsers() }}
              className="md:max-w-sm"
            />
            <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as 'all' | BackendRole)}>
              <SelectTrigger className="md:w-56"><SelectValue placeholder="Tous les rôles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                {(Object.entries(ROLE_META) as [BackendRole, { label: string }][]) .map(([role, meta]) => (
                  <SelectItem key={role} value={role}>{meta.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="secondary" onClick={() => void loadUsers()}>Rechercher</Button>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader><TableRow><TableHead>Utilisateur</TableHead><TableHead>Rôle</TableHead><TableHead>Institution</TableHead><TableHead>Statut</TableHead><TableHead>Créé le</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Chargement des comptes réels…</TableCell></TableRow>
                ) : users.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Aucun compte dans votre périmètre.</TableCell></TableRow>
                ) : users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell><div className="font-medium">{user.full_name}</div><div className="text-xs text-muted-foreground">{user.email}</div></TableCell>
                    <TableCell><Badge variant="outline"><Shield className="mr-1 h-3 w-3" />{ROLE_META[user.role]?.label || user.role}</Badge></TableCell>
                    <TableCell className="max-w-56 truncate">{user.institution || user.institution_id || '—'}</TableCell>
                    <TableCell><Badge variant={user.is_active ? 'default' : 'secondary'}>{user.is_active ? 'Actif' : 'Inactif'}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(user.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(user)} title="Modifier"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteUser(user)} title="Désactiver"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Créer un compte réel</DialogTitle>
            <DialogDescription>
              La création n’est confirmée qu’après écriture PostgreSQL. Pour une mairie, choisissez l’institution réelle : un seul ADMIN actif est autorisé par mairie.
            </DialogDescription>
          </DialogHeader>
          <UserForm
            form={form}
            setForm={setForm}
            roles={assignableRoles}
            showPassword
            showTenant={actor?.role === 'super_admin'}
            governedInstitutions={actor?.role === 'super_admin' ? institutions : []}
            loadingInstitutions={loadingInstitutions}
          />
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button><Button onClick={() => void handleCreate()} disabled={saving}>{saving ? 'Création…' : 'Créer le compte'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editUser)} onOpenChange={(open) => { if (!open) setEditUser(null) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>Modifier le compte</DialogTitle><DialogDescription>Les changements de rôle/périmètre sont revalidés par le backend.</DialogDescription></DialogHeader>
          <UserForm
            form={form}
            setForm={setForm}
            roles={assignableRoles}
            showPassword={false}
            showTenant={false}
            governedInstitutions={actor?.role === 'super_admin' ? institutions : []}
            loadingInstitutions={loadingInstitutions}
          />
          <DialogFooter><Button variant="outline" onClick={() => setEditUser(null)}>Annuler</Button><Button onClick={() => void handleEdit()} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteUser)} onOpenChange={(open) => { if (!open) setDeleteUser(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Désactiver ce compte ?</DialogTitle><DialogDescription>Cette action n’efface pas l’historique : elle désactive le compte et laisse le backend révoquer les accès associés.</DialogDescription></DialogHeader>
          <p className="text-sm font-medium">{deleteUser?.full_name} — {deleteUser?.email}</p>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteUser(null)}>Annuler</Button><Button variant="destructive" onClick={() => void handleDeactivate()} disabled={saving}>{saving ? 'Désactivation…' : 'Désactiver'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function UserForm({
  form,
  setForm,
  roles,
  showPassword,
  showTenant,
  governedInstitutions,
  loadingInstitutions,
}: {
  form: UserFormState
  setForm: React.Dispatch<React.SetStateAction<UserFormState>>
  roles: [BackendRole, { label: string; level: number }][]
  showPassword: boolean
  showTenant: boolean
  governedInstitutions: InstitutionOption[]
  loadingInstitutions: boolean
}) {
  const requiresInstitution = INSTITUTION_BOUND_ROLES.has(form.role)
  const selectableInstitutions = institutionsForRole(form.role, governedInstitutions)
  const usesGovernedSelector = governedInstitutions.length > 0 || loadingInstitutions

  return (
    <div className="grid gap-4 py-2">
      <div className="space-y-2"><Label>Nom complet</Label><Input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} /></div>
      <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></div>
      {showPassword && <div className="space-y-2"><Label>Mot de passe initial</Label><Input type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /></div>}
      <div className="space-y-2">
        <Label>Rôle / portail</Label>
        <Select
          value={form.role}
          onValueChange={(value) => setForm((current) => ({
            ...current,
            role: value as BackendRole,
            institution: '',
            institutionId: '',
          }))}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{roles.map(([role, meta]) => <SelectItem key={role} value={role}>{meta.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {requiresInstitution && usesGovernedSelector ? (
        <div className="space-y-2">
          <Label>Institution / mairie de rattachement</Label>
          <Select
            value={form.institutionId || undefined}
            onValueChange={(value) => {
              const selected = governedInstitutions.find((item) => item.id === value)
              setForm((current) => ({
                ...current,
                institutionId: value,
                institution: selected?.name || '',
              }))
            }}
            disabled={loadingInstitutions}
          >
            <SelectTrigger><SelectValue placeholder={loadingInstitutions ? 'Chargement…' : 'Sélectionner une institution'} /></SelectTrigger>
            <SelectContent>
              {selectableInstitutions.map((institution) => (
                <SelectItem key={institution.id} value={institution.id}>
                  {institution.name} ({institution.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.role === 'ADMIN' && <p className="text-xs text-muted-foreground">Pour une mairie, le backend garantit un seul administrateur ADMIN actif par mairie.</p>}
        </div>
      ) : requiresInstitution ? (
        <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          L’institution est imposée par votre compte connecté. Vous ne pouvez pas créer un utilisateur dans une autre mairie.
        </div>
      ) : null}

      {showTenant && <div className="space-y-2"><Label>Tenant (optionnel)</Label><Input value={form.tenantId} onChange={(event) => setForm((current) => ({ ...current, tenantId: event.target.value }))} placeholder="republique-de-guinee" /></div>}
    </div>
  )
}
