'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Upload, Filter, Grid3X3, List, MoreHorizontal,
  FileText, File, FileCheck, Archive, Share2, Download,
  Eye, Trash2, Plus, ChevronDown, Tag, FolderOpen,
  Clock, CheckCircle2, AlertCircle, X
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { DEMO_STATS } from '@/lib/constants'

const FAKE_DOCUMENTS = [
  { id: '1', nom: 'Arrêté n°2024-001/AIT', type: 'Arrêté', taille: '2.4 MB', modifie: '2024-12-15', auteur: 'Mamadou Baldé', statut: 'Actif', tags: ['RGPD', 'Officiel'] },
  { id: '2', nom: 'Décret n°D/2024/089/PRG', type: 'Décret', taille: '3.1 MB', modifie: '2024-12-14', auteur: 'Aissatou Diallo', statut: 'Actif', tags: ['Présidence'] },
  { id: '3', nom: 'Circulaire n°C/2024/045/MAT', type: 'Circulaire', taille: '1.2 MB', modifie: '2024-12-13', auteur: 'Ibrahima Sow', statut: 'Partagé', tags: ['MAT', 'Interne'] },
  { id: '4', nom: 'Note de service n°NS/2024/112', type: 'Note de service', taille: '890 KB', modifie: '2024-12-12', auteur: 'Fatoumata Camara', statut: 'Actif', tags: ['RH'] },
  { id: '5', nom: 'Rapport annuel 2024 - DGE', type: 'Rapport', taille: '8.7 MB', modifie: '2024-12-11', auteur: 'Sékou Touré', statut: 'Archivé', tags: ['DGE', 'Annuel'] },
  { id: '6', nom: 'Convention de partenariat UNDP', type: 'Convention', taille: '4.5 MB', modifie: '2024-12-10', auteur: 'Mariama Condé', statut: 'Actif', tags: ['International', 'Partenariat'] },
  { id: '7', nom: 'Budget prévisionnel 2025', type: 'Budget', taille: '5.2 MB', modifie: '2024-12-09', auteur: 'Abdoulaye Bah', statut: 'Partagé', tags: ['Finance', 'Budget'] },
  { id: '8', nom: 'Procès-verbal CS-2024-089', type: 'Procès-verbal', taille: '1.8 MB', modifie: '2024-12-08', auteur: 'Kadiatou Sylla', statut: 'Actif', tags: ['CS', 'Réunion'] },
  { id: '9', nom: 'Ordonnance n°O/2024/023/PRG', type: 'Ordonnance', taille: '2.1 MB', modifie: '2024-12-07', auteur: 'Alpha Condé', statut: 'Archivé', tags: ['Présidence', 'Loi'] },
  { id: '10', nom: 'Plan stratégique 2024-2028', type: 'Plan', taille: '12.4 MB', modifie: '2024-12-06', auteur: 'Djenabou Diallo', statut: 'Actif', tags: ['Stratégie', 'National'] },
  { id: '11', nom: 'Marché public n°MP/2024/567', type: 'Marché', taille: '6.3 MB', modifie: '2024-12-05', auteur: 'Moussa Keïta', statut: 'Partagé', tags: ['Marché', 'MP'] },
  { id: '12', nom: 'Délibération CD-2024-034', type: 'Délibération', taille: '1.5 MB', modifie: '2024-12-04', auteur: 'Aminata Touré', statut: 'Actif', tags: ['CD', 'Conseil'] },
]

const DOC_TYPES = ['Tous', 'Arrêté', 'Décret', 'Circulaire', 'Note de service', 'Rapport', 'Convention', 'Budget', 'Procès-verbal', 'Ordonnance', 'Plan', 'Marché', 'Délibération']
const DOC_STATUSES = ['Tous', 'Actif', 'Archivé', 'Partagé']

export function GedPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('Tous')
  const [statusFilter, setStatusFilter] = useState('Tous')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  const filteredDocs = FAKE_DOCUMENTS.filter(doc => {
    const matchSearch = doc.nom.toLowerCase().includes(search.toLowerCase()) ||
      doc.auteur.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'Tous' || doc.type === typeFilter
    const matchStatus = statusFilter === 'Tous' || doc.statut === statusFilter
    return matchSearch && matchType && matchStatus
  })

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const toggleAll = () => {
    if (selectedIds.length === filteredDocs.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredDocs.map(d => d.id))
    }
  }

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'Actif': return <CheckCircle2 className="h-3.5 w-3.5" />
      case 'Archivé': return <Archive className="h-3.5 w-3.5" />
      case 'Partagé': return <Share2 className="h-3.5 w-3.5" />
      default: return <File className="h-3.5 w-3.5" />
    }
  }

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'Actif': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'Archivé': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      case 'Partagé': return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const stats = [
    { label: 'Total documents', value: DEMO_STATS.documents.total.toLocaleString('fr-FR'), icon: FileText, color: 'text-brand dark:text-primary' },
    { label: 'Actifs', value: DEMO_STATS.documents.actifs.toLocaleString('fr-FR'), icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Archivés', value: DEMO_STATS.documents.archives.toLocaleString('fr-FR'), icon: Archive, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Partagés', value: DEMO_STATS.documents.partages.toLocaleString('fr-FR'), icon: Share2, color: 'text-sky-600 dark:text-sky-400' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="glass-card hover:shadow-lg transition-shadow">
              <CardContent className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-brand/5 dark:bg-primary/10 ${stat.color}`}>
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, auteur..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtres
              <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>

            {/* View toggle */}
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>

            {/* Upload */}
            <Button className="gap-2 bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90">
              <Upload className="h-4 w-4" />
              Importer
            </Button>
          </div>

          {/* Filter bar */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-3 pt-2 border-t">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Type de document" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOC_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Input type="date" className="w-[160px]" placeholder="Date début" />
                  <Input type="date" className="w-[160px]" placeholder="Date fin" />

                  {(typeFilter !== 'Tous' || statusFilter !== 'Tous') && (
                    <Button variant="ghost" size="sm" onClick={() => { setTypeFilter('Tous'); setStatusFilter('Tous') }}>
                      <X className="h-3 w-3 mr-1" />
                      Réinitialiser
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bulk actions */}
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 pt-2 border-t"
            >
              <span className="text-sm text-muted-foreground">{selectedIds.length} sélectionné(s)</span>
              <Button variant="outline" size="sm" className="gap-1">
                <Download className="h-3.5 w-3.5" />
                Télécharger
              </Button>
              <Button variant="outline" size="sm" className="gap-1">
                <Share2 className="h-3.5 w-3.5" />
                Partager
              </Button>
              <Button variant="outline" size="sm" className="gap-1 text-red-600 hover:text-red-700">
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                Tout désélectionner
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Documents Table / Grid */}
      {viewMode === 'list' ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.length === filteredDocs.length && filteredDocs.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Taille</TableHead>
                  <TableHead className="hidden md:table-cell">Modifié</TableHead>
                  <TableHead className="hidden lg:table-cell">Auteur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden xl:table-cell">Tags</TableHead>
                  <TableHead className="w-10">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((doc, i) => (
                  <motion.tr
                    key={doc.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(doc.id)}
                        onCheckedChange={() => toggleSelect(doc.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-brand dark:text-primary shrink-0" />
                        <span className="font-medium text-sm">{doc.nom}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-xs">{doc.type}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{doc.taille}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{doc.modifie}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{doc.auteur}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.statut)}`}>
                        {getStatusIcon(doc.statut)}
                        {doc.statut}
                      </span>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {doc.tags.map(tag => (
                          <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                            <Tag className="h-2.5 w-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2"><Eye className="h-4 w-4" /> Voir</DropdownMenuItem>
                          <DropdownMenuItem className="gap-2"><Download className="h-4 w-4" /> Télécharger</DropdownMenuItem>
                          <DropdownMenuItem className="gap-2"><Share2 className="h-4 w-4" /> Partager</DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-red-600"><Trash2 className="h-4 w-4" /> Supprimer</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocs.map((doc, i) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="glass-card hover:shadow-lg transition-all cursor-pointer group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-brand/5 dark:bg-primary/10">
                      <FileText className="h-6 w-6 text-brand dark:text-primary" />
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(doc.statut)}`}>
                      {getStatusIcon(doc.statut)}
                      {doc.statut}
                    </span>
                  </div>
                  <CardTitle className="text-sm mt-2 line-clamp-2 group-hover:text-brand dark:group-hover:text-primary transition-colors">
                    {doc.nom}
                  </CardTitle>
                  <CardDescription className="text-xs">{doc.type} • {doc.taille}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{doc.auteur}</span>
                    <span>{doc.modifie}</span>
                  </div>
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {doc.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                        <Tag className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-muted-foreground text-center">
        {filteredDocs.length} document(s) trouvé(s) sur {FAKE_DOCUMENTS.length}
      </div>
    </div>
  )
}
