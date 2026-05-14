'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Search, Database, CheckCircle2, XCircle, AlertTriangle,
  Users, MapPin, Calendar, ArrowUpDown, ChevronLeft, ChevronRight,
  Eye, RotateCcw, Shield, Baby, Clock, Hash, FileText, User,
  ArrowRight, AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { useAppStore, type UserRole } from '@/store/app-store'
import {
  useBirthCertificateStore,
  GUINEA_REGIONS,
  GUINEA_COMMUNES,
  type BirthRecord,
  type BirthSearchResult,
} from '@/store/birth-certificate-store'

// ─── ANIMATION VARIANTS ─────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

// ─── STATUS BADGE CONFIG ────────────────────────────────────────────────────
const STATUS_BADGE: Record<BirthRecord['status'], { label: string; color: string }> = {
  active: { label: 'Actif', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  corrected: { label: 'Corrigé', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
}

// ─── ROLES WITH ACCESS ──────────────────────────────────────────────────────
const AUTHORIZED_ROLES: UserRole[] = ['mairie', 'admin_general', 'ministere', 'super_admin']

// ─── PAGE SIZE ──────────────────────────────────────────────────────────────
const PAGE_SIZE = 8

// ─── SORT TYPE ──────────────────────────────────────────────────────────────
type SortField = 'acteNumber' | 'lastName' | 'birthDate' | 'commune' | 'status'
type SortDir = 'asc' | 'desc'

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export function BirthCertificateDbPage() {
  const user = useAppStore((s) => s.user)
  const userRole = (user?.role || 'citizen') as UserRole
  const isAuthorized = AUTHORIZED_ROLES.includes(userRole)

  const store = useBirthCertificateStore()
  const stats = store.getStats()

  // ─── SEARCH STATE ───────────────────────────────────────────────────────
  const [searchName, setSearchName] = useState('')
  const [searchActeNumber, setSearchActeNumber] = useState('')
  const [searchBirthDate, setSearchBirthDate] = useState('')
  const [searchBirthPlace, setSearchBirthPlace] = useState('')
  const [searchCommune, setSearchCommune] = useState('all')
  const [searchRegion, setSearchRegion] = useState('all')
  const [searchGender, setSearchGender] = useState('all')
  const [hasSearched, setHasSearched] = useState(false)
  const [activeTab, setActiveTab] = useState('search')

  // ─── RESULTS STATE ──────────────────────────────────────────────────────
  const [results, setResults] = useState<BirthRecord[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>('lastName')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // ─── DETAIL DIALOG STATE ────────────────────────────────────────────────
  const [detailRecord, setDetailRecord] = useState<BirthRecord | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // ─── VERIFICATION STATE ─────────────────────────────────────────────────
  const [verifyFirstName, setVerifyFirstName] = useState('')
  const [verifyLastName, setVerifyLastName] = useState('')
  const [verifyBirthDate, setVerifyBirthDate] = useState('')
  const [verifyBirthPlace, setVerifyBirthPlace] = useState('')
  const [verifyResult, setVerifyResult] = useState<BirthSearchResult | null>(null)
  const [verifyNotFound, setVerifyNotFound] = useState(false)
  const [verifySearched, setVerifySearched] = useState(false)

  // ─── SEARCH HANDLER ─────────────────────────────────────────────────────
  const handleSearch = () => {
    setHasSearched(true)
    setCurrentPage(1)

    // If no filters, show all
    if (!searchName && !searchActeNumber && !searchBirthDate && !searchBirthPlace &&
        searchCommune === 'all' && searchRegion === 'all' && searchGender === 'all') {
      setResults(store.records)
      return
    }

    const filtered = store.advancedSearch({
      name: searchName || undefined,
      acteNumber: searchActeNumber || undefined,
      birthDate: searchBirthDate || undefined,
      birthPlace: searchBirthPlace || undefined,
      commune: searchCommune !== 'all' ? searchCommune : undefined,
      region: searchRegion !== 'all' ? searchRegion : undefined,
      gender: searchGender !== 'all' ? searchGender : undefined,
    })
    setResults(filtered)
  }

  // ─── RESET HANDLER ──────────────────────────────────────────────────────
  const handleReset = () => {
    setSearchName('')
    setSearchActeNumber('')
    setSearchBirthDate('')
    setSearchBirthPlace('')
    setSearchCommune('all')
    setSearchRegion('all')
    setSearchGender('all')
    setHasSearched(false)
    setResults([])
    setCurrentPage(1)
  }

  // ─── SORT HANDLER ───────────────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  // ─── SORTED & PAGINATED RESULTS ─────────────────────────────────────────
  const sortedResults = useMemo(() => {
    const sorted = [...results].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      switch (sortField) {
        case 'acteNumber': return a.acteNumber.localeCompare(b.acteNumber) * dir
        case 'lastName': return a.lastName.localeCompare(b.lastName) * dir
        case 'birthDate': return a.birthDate.localeCompare(b.birthDate) * dir
        case 'commune': return a.commune.localeCompare(b.commune) * dir
        case 'status': return a.status.localeCompare(b.status) * dir
        default: return 0
      }
    })
    return sorted
  }, [results, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(sortedResults.length / PAGE_SIZE))
  const paginatedResults = sortedResults.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  // ─── VERIFICATION HANDLER ───────────────────────────────────────────────
  const handleVerify = () => {
    setVerifySearched(true)
    setVerifyNotFound(false)
    setVerifyResult(null)

    if (!verifyFirstName.trim() || !verifyLastName.trim()) return

    const result = store.verifyIdentity(
      verifyFirstName.trim(),
      verifyLastName.trim(),
      verifyBirthDate,
      verifyBirthPlace.trim()
    )

    if (result) {
      setVerifyResult(result)
    } else {
      setVerifyNotFound(true)
    }
  }

  const handleResetVerify = () => {
    setVerifyFirstName('')
    setVerifyLastName('')
    setVerifyBirthDate('')
    setVerifyBirthPlace('')
    setVerifyResult(null)
    setVerifyNotFound(false)
    setVerifySearched(false)
  }

  // ─── FORMAT DATE ────────────────────────────────────────────────────────
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  // ─── SORT ICON ──────────────────────────────────────────────────────────
  const sortIcon = (field: SortField) => (
    <ArrowUpDown className={`inline h-3 w-3 ml-1 ${sortField === field ? 'opacity-100' : 'opacity-30'}`} />
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — UNAUTHORIZED ACCESS
  // ═══════════════════════════════════════════════════════════════════════════
  if (!isAuthorized) {
    return (
      <div className="p-4 md:p-6">
        <Card className="border-red-200 dark:border-red-800/40">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="size-16 text-red-400 mb-4" />
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Accès non autorisé</h2>
            <p className="text-muted-foreground text-sm max-w-md">
              La Base de Données des Actes de Naissance est réservée aux agents de mairie,
              administrateurs généraux, agents ministériels et super administrateurs.
            </p>
            <Badge className="mt-4 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              Votre rôle : {userRole}
            </Badge>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — AUTHORIZED
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-4 md:p-6"
    >
      {/* ═════════════════════════════════════════════════════════════════════
          HEADER
      ═════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="glass-card overflow-hidden border-[#C8A45C]/20 dark:border-[#D4B878]/20 bg-gradient-to-br from-[#0B2E58] via-[#0B2E58]/95 to-[#134A8E] dark:from-[#0B2E58] dark:via-[#071D3A] dark:to-[#0B2E58]">
          <CardContent className="p-6 text-white relative">
            {/* Guinea tricolor */}
            <div className="flex gap-0 mb-4 -mx-6 -mt-6">
              <div className="flex-1 h-1.5" style={{ backgroundColor: '#CE1126' }} />
              <div className="flex-1 h-1.5" style={{ backgroundColor: '#FCD116' }} />
              <div className="flex-1 h-1.5" style={{ backgroundColor: '#009460' }} />
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm shadow-xl border border-white/20">
                <BookOpen className="size-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest text-white/60 font-medium">République de Guinée</p>
                <h2 className="text-2xl font-bold mt-0.5">Base de Données des Actes de Naissance</h2>
                <p className="text-sm text-white/70 mt-1">
                  Recherche, vérification et consultation des registres d&apos;état civil
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Badge className="bg-[#C8A45C] text-[#0B2E58] hover:bg-[#C8A45C]/90 border-0 font-semibold text-xs gap-1.5 shadow-sm">
                  <Database className="size-3" />
                  Base Nationale
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs gap-1.5">
                  <CheckCircle2 className="size-3" />
                  {stats.total} actes enregistrés
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═════════════════════════════════════════════════════════════════════
          STATS CARDS
      ═════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total actes', value: stats.total, icon: Database, color: 'text-[#0B2E58] dark:text-[#3B7DD8]', bg: 'bg-[#0B2E58]/5 dark:bg-[#3B7DD8]/10' },
            { label: 'Actes actifs', value: stats.active, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'Par commune', value: Object.keys(stats.byCommune).length, icon: MapPin, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { label: 'Vérifications', value: stats.verificationCount, icon: Shield, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
          ].map((stat) => (
            <Card key={stat.label} className="shadow-sm border-[#0B2E58]/5 dark:border-[#3B7DD8]/10">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="size-5" />
                </div>
                <div>
                  <p className="text-xl font-bold text-[#0B2E58] dark:text-white">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* ═════════════════════════════════════════════════════════════════════
          MAIN TABS: SEARCH + VERIFICATION
      ═════════════════════════════════════════════════════════════════════ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto h-auto flex-wrap gap-1 bg-muted/50 p-1.5">
          <TabsTrigger value="search" className="gap-1.5 text-sm data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
            <Search className="size-4" />
            Recherche avancée
          </TabsTrigger>
          <TabsTrigger value="verify" className="gap-1.5 text-sm data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
            <Shield className="size-4" />
            Vérification d&apos;identité
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════
            SEARCH TAB
        ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="search">
          <div className="mt-4 space-y-4">
            {/* Advanced Search Form */}
            <motion.div variants={itemVariants}>
              <Card className="shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#0B2E58]/5 dark:bg-[#3B7DD8]/10 text-[#0B2E58] dark:text-[#3B7DD8]">
                      <Search className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Recherche avancée</CardTitle>
                      <CardDescription className="text-xs">Recherchez un acte de naissance par plusieurs critères</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Nom / Prénom */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Nom / Prénom</Label>
                      <Input
                        placeholder="Ex: Diallo Aminata"
                        value={searchName}
                        onChange={e => setSearchName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      />
                    </div>

                    {/* Numéro d'acte */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Numéro d&apos;acte</Label>
                      <Input
                        placeholder="AN/COMMUNE/YEAR/NUMBER"
                        value={searchActeNumber}
                        onChange={e => setSearchActeNumber(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        className="font-mono text-sm"
                      />
                    </div>

                    {/* Date de naissance */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Date de naissance</Label>
                      <Input
                        type="date"
                        value={searchBirthDate}
                        onChange={e => setSearchBirthDate(e.target.value)}
                      />
                    </div>

                    {/* Lieu de naissance */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Lieu de naissance</Label>
                      <Input
                        placeholder="Ex: Conakry, Kankan..."
                        value={searchBirthPlace}
                        onChange={e => setSearchBirthPlace(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      />
                    </div>

                    {/* Commune */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Commune</Label>
                      <Select value={searchCommune} onValueChange={setSearchCommune}>
                        <SelectTrigger>
                          <SelectValue placeholder="Toutes les communes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les communes</SelectItem>
                          {GUINEA_COMMUNES.map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Région */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Région</Label>
                      <Select value={searchRegion} onValueChange={setSearchRegion}>
                        <SelectTrigger>
                          <SelectValue placeholder="Toutes les régions" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les régions</SelectItem>
                          {GUINEA_REGIONS.map(r => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Sexe */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Sexe</Label>
                      <Select value={searchGender} onValueChange={setSearchGender}>
                        <SelectTrigger>
                          <SelectValue placeholder="Tous" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous</SelectItem>
                          <SelectItem value="M">Masculin</SelectItem>
                          <SelectItem value="F">Féminin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={handleSearch}
                      className="bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-[#3B7DD8] dark:hover:bg-[#3B7DD8]/90 text-white gap-2"
                    >
                      <Search className="size-4" />
                      Rechercher
                    </Button>
                    <Button variant="outline" onClick={handleReset} className="gap-2">
                      <RotateCcw className="size-4" />
                      Réinitialiser
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Search Results Table */}
            {hasSearched && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="size-4" />
                          Résultats de recherche
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {sortedResults.length} enregistrement(s) trouvé(s)
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {sortedResults.length === 0 ? (
                      <div className="text-center py-12">
                        <AlertCircle className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium">Aucun enregistrement trouvé</p>
                        <p className="text-xs text-muted-foreground mt-1">Modifiez vos critères de recherche</p>
                      </div>
                    ) : (
                      <>
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('acteNumber')}>
                                  N° Acte {sortIcon('acteNumber')}
                                </TableHead>
                                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('lastName')}>
                                  Nom Prénom {sortIcon('lastName')}
                                </TableHead>
                                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('birthDate')}>
                                  Date naissance {sortIcon('birthDate')}
                                </TableHead>
                                <TableHead>Lieu</TableHead>
                                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('commune')}>
                                  Commune {sortIcon('commune')}
                                </TableHead>
                                <TableHead>Père</TableHead>
                                <TableHead>Mère</TableHead>
                                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>
                                  Statut {sortIcon('status')}
                                </TableHead>
                                <TableHead className="w-12"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {paginatedResults.map((record) => (
                                <TableRow
                                  key={record.id}
                                  className="cursor-pointer hover:bg-[#0B2E58]/5 dark:hover:bg-[#3B7DD8]/5"
                                  onClick={() => { setDetailRecord(record); setDetailOpen(true) }}
                                >
                                  <TableCell className="font-mono text-xs">{record.acteNumber}</TableCell>
                                  <TableCell className="font-medium text-sm">
                                    {record.lastName} {record.firstName}
                                  </TableCell>
                                  <TableCell className="text-xs">{formatDate(record.birthDate)}</TableCell>
                                  <TableCell className="text-xs">{record.birthPlace}</TableCell>
                                  <TableCell className="text-xs">{record.commune}</TableCell>
                                  <TableCell className="text-xs">{record.fatherName}</TableCell>
                                  <TableCell className="text-xs">{record.motherName}</TableCell>
                                  <TableCell>
                                    <Badge className={`text-[10px] font-medium ${STATUS_BADGE[record.status].color}`}>
                                      {STATUS_BADGE[record.status].label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                      <Eye className="size-3.5" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden space-y-3">
                          {paginatedResults.map((record) => (
                            <Card
                              key={record.id}
                              className="cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => { setDetailRecord(record); setDetailOpen(true) }}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <p className="font-semibold text-sm">{record.lastName} {record.firstName}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{record.acteNumber}</p>
                                  </div>
                                  <Badge className={`text-[10px] font-medium ${STATUS_BADGE[record.status].color}`}>
                                    {STATUS_BADGE[record.status].label}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1"><Calendar className="size-3" />{formatDate(record.birthDate)}</span>
                                  <span className="flex items-center gap-1"><MapPin className="size-3" />{record.commune}</span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between mt-4 pt-4 border-t">
                            <p className="text-xs text-muted-foreground">
                              Page {currentPage} sur {totalPages} — {sortedResults.length} résultat(s)
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="h-8 gap-1"
                              >
                                <ChevronLeft className="size-3.5" />
                                Préc.
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="h-8 gap-1"
                              >
                                Suiv.
                                <ChevronRight className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Initial state — no search yet */}
            {!hasSearched && (
              <div className="text-center py-12">
                <Database className="size-20 text-muted-foreground/15 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium text-lg">Base de données des actes de naissance</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Utilisez le formulaire de recherche ci-dessus pour trouver un acte par nom, numéro, date de naissance, commune ou région.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            VERIFICATION TAB
        ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="verify">
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Verification Form */}
              <motion.div variants={itemVariants}>
                <Card className="shadow-md h-fit">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                        <Shield className="size-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Vérification d&apos;identité</CardTitle>
                        <CardDescription className="text-xs">Vérifiez l&apos;identité d&apos;un citoyen dans la base des actes de naissance</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Prénom</Label>
                        <Input
                          placeholder="Prénom du citoyen"
                          value={verifyFirstName}
                          onChange={e => setVerifyFirstName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Nom</Label>
                        <Input
                          placeholder="Nom du citoyen"
                          value={verifyLastName}
                          onChange={e => setVerifyLastName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Date de naissance</Label>
                        <Input
                          type="date"
                          value={verifyBirthDate}
                          onChange={e => setVerifyBirthDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Lieu de naissance</Label>
                        <Input
                          placeholder="Ex: Conakry, Kankan..."
                          value={verifyBirthPlace}
                          onChange={e => setVerifyBirthPlace(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={handleVerify}
                        disabled={!verifyFirstName.trim() || !verifyLastName.trim()}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 flex-1"
                      >
                        <Shield className="size-4" />
                        Vérifier
                      </Button>
                      <Button variant="outline" onClick={handleResetVerify} className="gap-2">
                        <RotateCcw className="size-4" />
                        Effacer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Verification Result */}
              <motion.div variants={itemVariants}>
                <Card className="shadow-md h-fit">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="size-4" />
                      Résultat de la vérification
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!verifySearched ? (
                      <div className="text-center py-8">
                        <Shield className="size-16 text-muted-foreground/15 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">Entrez les informations du citoyen pour vérifier son identité</p>
                      </div>
                    ) : verifyNotFound ? (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <div className="text-center py-6">
                          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
                            <XCircle className="size-8 text-red-500" />
                          </div>
                          <p className="text-lg font-bold text-red-600 dark:text-red-400">Aucun enregistrement trouvé</p>
                          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                            Aucun acte de naissance ne correspond aux informations fournies. Vérifiez les données ou contactez la mairie concernée.
                          </p>
                        </div>
                      </motion.div>
                    ) : verifyResult ? (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                        {/* Match status */}
                        {verifyResult.matchType === 'exact' ? (
                          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/40">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                              <p className="font-bold text-emerald-700 dark:text-emerald-400">Identité vérifiée</p>
                              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                                Correspondance exacte trouvée dans la base de données
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40">
                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                              <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                              <p className="font-bold text-amber-700 dark:text-amber-400">Correspondance partielle</p>
                              <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                                Certaines informations correspondent mais pas toutes — Champs : {verifyResult.matchFields.join(', ')}
                              </p>
                            </div>
                          </div>
                        )}

                        <Separator />

                        {/* Record details */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Baby className="size-4 text-[#0B2E58] dark:text-[#3B7DD8]" />
                            <h4 className="text-sm font-semibold text-[#0B2E58] dark:text-[#3B7DD8]">
                              {verifyResult.record.firstName} {verifyResult.record.lastName}
                            </h4>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1">
                              <p className="text-muted-foreground">N° Acte</p>
                              <p className="font-mono font-medium">{verifyResult.record.acteNumber}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Date de naissance</p>
                              <p className="font-medium">{formatDate(verifyResult.record.birthDate)}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Lieu de naissance</p>
                              <p className="font-medium">{verifyResult.record.birthPlace}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Sexe</p>
                              <p className="font-medium">{verifyResult.record.gender === 'M' ? 'Masculin' : 'Féminin'}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Commune</p>
                              <p className="font-medium">{verifyResult.record.commune}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Région</p>
                              <p className="font-medium">{verifyResult.record.region}</p>
                            </div>
                          </div>

                          <Separator />

                          <div className="space-y-2">
                            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parents</h5>
                            <div className="grid grid-cols-1 gap-2 text-xs">
                              <div className="flex items-center gap-2">
                                <User className="size-3 text-muted-foreground" />
                                <span className="text-muted-foreground">Père :</span>
                                <span className="font-medium">{verifyResult.record.fatherName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <User className="size-3 text-muted-foreground" />
                                <span className="text-muted-foreground">Mère :</span>
                                <span className="font-medium">{verifyResult.record.motherName}</span>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          <div className="space-y-2">
                            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enregistrement</h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="space-y-1">
                                <p className="text-muted-foreground">Date d&apos;enregistrement</p>
                                <p className="font-medium">{formatDate(verifyResult.record.registrationDate)}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-muted-foreground">Enregistré par</p>
                                <p className="font-medium">{verifyResult.record.registeredBy}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Statut :</span>
                            <Badge className={`text-[10px] font-medium ${STATUS_BADGE[verifyResult.record.status].color}`}>
                              {STATUS_BADGE[verifyResult.record.status].label}
                            </Badge>
                          </div>

                          {verifyResult.record.notes && (
                            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 text-xs">
                              <p className="font-medium text-amber-700 dark:text-amber-400 mb-0.5">Note :</p>
                              <p className="text-amber-600/80 dark:text-amber-400/80">{verifyResult.record.notes}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ) : null}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═════════════════════════════════════════════════════════════════════
          REGIONAL STATS
      ═════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white flex items-center gap-2">
              <MapPin className="size-4" />
              Répartition par région
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {GUINEA_REGIONS.map(region => {
                const count = stats.byRegion[region] || 0
                const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                return (
                  <div key={region} className="text-center p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <p className="text-lg font-bold text-[#0B2E58] dark:text-white">{count}</p>
                    <p className="text-xs font-medium text-muted-foreground">{region}</p>
                    <p className="text-[10px] text-muted-foreground/60">{percentage}%</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═════════════════════════════════════════════════════════════════════
          DETAIL DIALOG
      ═════════════════════════════════════════════════════════════════════ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailRecord && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#0B2E58]/5 dark:bg-[#3B7DD8]/10 text-[#0B2E58] dark:text-[#3B7DD8]">
                    <BookOpen className="size-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg">
                      {detailRecord.firstName} {detailRecord.lastName}
                    </DialogTitle>
                    <DialogDescription className="font-mono text-xs mt-0.5">
                      Acte N° {detailRecord.acteNumber}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* Status badge */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Statut :</span>
                  <Badge className={`text-xs font-medium ${STATUS_BADGE[detailRecord.status].color}`}>
                    {STATUS_BADGE[detailRecord.status].label}
                  </Badge>
                  {detailRecord.status === 'corrected' && detailRecord.notes && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">{detailRecord.notes}</span>
                  )}
                </div>

                <Separator />

                {/* Birth Information */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Baby className="size-3.5" />
                    Informations de naissance
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Prénom</p>
                      <p className="font-medium">{detailRecord.firstName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Nom</p>
                      <p className="font-medium">{detailRecord.lastName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Date de naissance</p>
                      <p className="font-medium">{formatDate(detailRecord.birthDate)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Lieu de naissance</p>
                      <p className="font-medium">{detailRecord.birthPlace}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Sexe</p>
                      <p className="font-medium">{detailRecord.gender === 'M' ? 'Masculin' : 'Féminin'}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Parents Information */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Users className="size-3.5" />
                    Informations des parents
                  </h4>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                      <p className="text-xs font-semibold text-[#0B2E58] dark:text-[#3B7DD8]">Père</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">Nom complet</p>
                          <p className="font-medium">{detailRecord.fatherName}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">Date de naissance</p>
                          <p className="font-medium">{formatDate(detailRecord.fatherBirthDate)}</p>
                        </div>
                        <div className="space-y-0.5 col-span-2">
                          <p className="text-xs text-muted-foreground">Nationalité</p>
                          <p className="font-medium">{detailRecord.fatherNationality}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                      <p className="text-xs font-semibold text-[#0B2E58] dark:text-[#3B7DD8]">Mère</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">Nom complet</p>
                          <p className="font-medium">{detailRecord.motherName}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">Nom de jeune fille</p>
                          <p className="font-medium">{detailRecord.motherMaidenName}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">Date de naissance</p>
                          <p className="font-medium">{formatDate(detailRecord.motherBirthDate)}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">Nationalité</p>
                          <p className="font-medium">{detailRecord.motherNationality}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Registration Information */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Hash className="size-3.5" />
                    Informations d&apos;enregistrement
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Commune</p>
                      <p className="font-medium">{detailRecord.commune}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Préfecture</p>
                      <p className="font-medium">{detailRecord.prefecture}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Région</p>
                      <p className="font-medium">{detailRecord.region}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Date d&apos;enregistrement</p>
                      <p className="font-medium">{formatDate(detailRecord.registrationDate)}</p>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <p className="text-xs text-muted-foreground">Enregistré par</p>
                      <p className="font-medium">{detailRecord.registeredBy}</p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {detailRecord.notes && detailRecord.status !== 'corrected' && (
                  <>
                    <Separator />
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Notes</p>
                      <p className="text-sm text-amber-600/80 dark:text-amber-400/80">{detailRecord.notes}</p>
                    </div>
                  </>
                )}

                {detailRecord.status === 'cancelled' && detailRecord.notes && (
                  <>
                    <Separator />
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40">
                      <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Motif d&apos;annulation</p>
                      <p className="text-sm text-red-600/80 dark:text-red-400/80">{detailRecord.notes}</p>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
