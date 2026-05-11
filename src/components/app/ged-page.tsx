'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Upload, Filter, MoreHorizontal, FileText, FileCheck,
  Archive, Download, Eye, Trash2, Plus, ChevronDown, Tag,
  Lock, Shield, Brain, Building2, Calendar, X, FolderOpen,
  CheckCircle2, Clock, AlertCircle, BookOpen, FileSignature,
  ScrollText, BarChart3, MapPin, Library, Mail, GitBranch, PenTool, UserCheck,
  ChevronLeft, ChevronRight, AlertTriangle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { BRAND } from '@/lib/constants'
import { useAppStore } from '@/store/app-store'

type DocClassification = 'PUBLIC' | 'DIFFUSION LIMITÉE' | 'CONFIDENTIEL' | 'SECRET'
type DocStatus = 'Signé' | 'En vigueur' | 'En cours' | 'Publié' | 'Diffusée' | 'Classé'
type DocType = 'Décret' | 'Arrêté' | 'Circulaire' | 'Note de service' | 'Rapport' | 'Ordonnance'

interface Document {
  id: string
  reference: string
  objet: string
  type: DocType
  institution: string
  taille: string
  classification: DocClassification
  statut: DocStatus
  date: string
}

const DOCUMENTS: Document[] = [
  { id: '1', reference: 'D/2026/012/PRG/SGG', objet: 'Décret n°D/2026/012/PRG/SGG portant organisation du Ministère des Finances', type: 'Décret', institution: "Ministère de l'Économie et des Finances", taille: '2.4 MB', classification: 'PUBLIC', statut: 'Signé', date: '2026-01-15' },
  { id: '2', reference: 'A/2026/045/MEF/CAB', objet: 'Arrêté n°A/2026/045/MEF/CAB fixant les modalités d\'exécution du budget 2026', type: 'Arrêté', institution: "Ministère de l'Économie et des Finances", taille: '1.8 MB', classification: 'PUBLIC', statut: 'En vigueur', date: '2026-01-20' },
  { id: '3', reference: 'C/2026/003/PM/CAB', objet: 'Circulaire n°C/2026/003/PM/CAB relative à la généralisation de l\'administration électronique', type: 'Circulaire', institution: 'Primature', taille: '890 KB', classification: 'PUBLIC', statut: 'Diffusée', date: '2026-02-01' },
  { id: '4', reference: 'NS/2026/089/MATD/SG', objet: 'Note de service n°NS/2026/089/MATD/SG relative à l\'organisation des élections locales', type: 'Note de service', institution: 'MATD', taille: '456 KB', classification: 'DIFFUSION LIMITÉE', statut: 'En cours', date: '2026-02-10' },
  { id: '5', reference: 'R/2025/CC/ANN', objet: 'Rapport annuel 2025 — Cour des Comptes', type: 'Rapport', institution: 'Cour des Comptes', taille: '12.4 MB', classification: 'CONFIDENTIEL', statut: 'Classé', date: '2026-03-01' },
  { id: '6', reference: 'D/2026/008/PRG/SGG', objet: 'Décret n°D/2026/008/PRG/SGG portant nomination des gouverneurs de région', type: 'Décret', institution: 'Présidence', taille: '1.2 MB', classification: 'PUBLIC', statut: 'Signé', date: '2026-01-25' },
  { id: '7', reference: 'A/2026/112/MPTEN/CAB', objet: 'Arrêté n°A/2026/112/MPTEN/CAB portant attribution de fréquences radioélectriques', type: 'Arrêté', institution: 'MPTEN', taille: '678 KB', classification: 'PUBLIC', statut: 'Publié', date: '2026-02-15' },
  { id: '8', reference: 'C/2026/007/MEF/CAB', objet: 'Circulaire n°C/2026/007/MEF/CAB sur les marchés publics 2026', type: 'Circulaire', institution: 'MEF', taille: '1.5 MB', classification: 'DIFFUSION LIMITÉE', statut: 'Diffusée', date: '2026-02-20' },
  { id: '9', reference: 'D/2026/015/PRG/SGG', objet: 'Décret n°D/2026/015/PRG/SGG portant création de l\'Agence Nationale du Numérique', type: 'Décret', institution: 'Présidence', taille: '2.1 MB', classification: 'PUBLIC', statut: 'En vigueur', date: '2026-03-05' },
  { id: '10', reference: 'NS/2026/134/MS/CAB', objet: 'Note de service n°NS/2026/134/MS/CAB — Campagne de vaccination COVID-19', type: 'Note de service', institution: 'Ministère de la Santé', taille: '320 KB', classification: 'PUBLIC', statut: 'En cours', date: '2026-03-10' },
  { id: '11', reference: 'A/2026/078/MJ/CAB', objet: 'Arrêté n°A/2026/078/MJ/CAB portant organisation des tribunaux', type: 'Arrêté', institution: 'Ministère de la Justice', taille: '1.9 MB', classification: 'PUBLIC', statut: 'Signé', date: '2026-03-12' },
  { id: '12', reference: 'R/2025/PND/T3', objet: 'Rapport de suivi PND — 3e trimestre 2025', type: 'Rapport', institution: 'Ministère du Plan', taille: '8.7 MB', classification: 'DIFFUSION LIMITÉE', statut: 'Diffusée', date: '2026-01-30' },
  { id: '13', reference: 'C/2026/001/MFP/CAB', objet: 'Circulaire n°C/2026/001/MFP/CAB sur la réforme de la fonction publique', type: 'Circulaire', institution: 'MFP', taille: '950 KB', classification: 'PUBLIC', statut: 'En vigueur', date: '2026-01-08' },
  { id: '14', reference: 'D/2025/198/PRG/SGG', objet: 'Décret n°D/2025/198/PRG/SGG portant budget général de l\'État 2026', type: 'Décret', institution: 'Présidence', taille: '15.3 MB', classification: 'CONFIDENTIEL', statut: 'Signé', date: '2025-12-20' },
  { id: '15', reference: 'O/2026/003/PRG', objet: 'Ordonnance n°O/2026/003/PRG portant mesure d\'urgence économique', type: 'Ordonnance', institution: 'Présidence', taille: '3.2 MB', classification: 'DIFFUSION LIMITÉE', statut: 'En vigueur', date: '2026-02-28' },
]

const TYPE_TABS = [
  { value: 'tous', label: 'Tous' },
  { value: 'Décret', label: 'Décrets présidentiels' },
  { value: 'Arrêté', label: 'Arrêtés ministériels' },
  { value: 'Circulaire', label: 'Circulaires' },
  { value: 'Note de service', label: 'Notes de service' },
  { value: 'Rapport', label: 'Rapports officiels' },
  { value: 'confidentiel', label: 'Documents confidentiels', icon: Shield },
]

const CLASSIFICATION_CONFIG: Record<DocClassification, { color: string; icon: React.ElementType }> = {
  'PUBLIC': { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: BookOpen },
  'DIFFUSION LIMITÉE': { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: AlertCircle },
  'CONFIDENTIEL': { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: Lock },
  'SECRET': { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Shield },
}

const STATUS_CONFIG: Record<DocStatus, { color: string; icon: React.ElementType }> = {
  'Signé': { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: FileSignature },
  'En vigueur': { color: 'bg-brand/10 text-brand dark:bg-primary/20 dark:text-primary', icon: CheckCircle2 },
  'En cours': { color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400', icon: Clock },
  'Publié': { color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400', icon: FileCheck },
  'Diffusée': { color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: Archive },
  'Classé': { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', icon: Lock },
}

const INSTITUTION_COUNTS = [
  { name: 'Présidence', count: 4, color: 'bg-brand dark:bg-primary' },
  { name: 'MEF', count: 3, color: 'bg-gold' },
  { name: 'Primature', count: 1, color: 'bg-emerald-500' },
  { name: 'MATD', count: 1, color: 'bg-sky-500' },
  { name: 'Cour des Comptes', count: 1, color: 'bg-red-500' },
  { name: 'MPTEN', count: 1, color: 'bg-violet-500' },
  { name: 'Ministère de la Santé', count: 1, color: 'bg-teal-500' },
  { name: 'Ministère de la Justice', count: 1, color: 'bg-orange-500' },
  { name: 'Ministère du Plan', count: 1, color: 'bg-pink-500' },
  { name: 'MFP', count: 1, color: 'bg-cyan-500' },
]

const REGIONS = [
  { value: 'toutes', label: 'Toutes les régions' },
  { value: 'conakry', label: 'Conakry' },
  { value: 'kindia', label: 'Kindia' },
  { value: 'kankan', label: 'Kankan' },
  { value: 'nzerekore', label: 'Nzérékoré' },
  { value: 'labe', label: 'Labé' },
  { value: 'faranah', label: 'Faranah' },
  { value: 'boke', label: 'Boké' },
  { value: 'mamou', label: 'Mamou' },
]

const PAGE_SIZE = 10

export function GedPage() {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('tous')
  const [classificationFilter, setClassificationFilter] = useState<string>('tous')
  const [institutionFilter, setInstitutionFilter] = useState<string>('tous')
  const [regionFilter, setRegionFilter] = useState<string>('toutes')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  const [uploadDialog, setUploadDialog] = useState(false)
  const [documents, setDocuments] = useState(DOCUMENTS)
  const [newDoc, setNewDoc] = useState({ objet: '', type: 'Note de service' as DocType, institution: '', classification: 'PUBLIC' as DocClassification })
  const [successToast, setSuccessToast] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const navigate = useAppStore((s) => s.navigate)

  // Dialog states
  const [viewDoc, setViewDoc] = useState<Document | null>(null)
  const [reclassifyDoc, setReclassifyDoc] = useState<Document | null>(null)
  const [reclassifyValue, setReclassifyValue] = useState<DocClassification>('PUBLIC')
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null)
  const [exportDialog, setExportDialog] = useState(false)

  const showToast = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(''), 4000)
  }

  const uploadDocument = () => {
    if (!newDoc.objet || !newDoc.institution) return
    const id = String(documents.length + 1)
    const ref = `NS/2026/${134 + documents.length}/NEW/SG`
    const created: Document = {
      id,
      reference: ref,
      objet: newDoc.objet,
      type: newDoc.type,
      institution: newDoc.institution,
      taille: '256 KB',
      classification: newDoc.classification,
      statut: 'En cours',
      date: new Date().toISOString().slice(0, 10),
    }
    setDocuments(prev => [created, ...prev])
    setNewDoc({ objet: '', type: 'Note de service', institution: '', classification: 'PUBLIC' })
    setUploadDialog(false)
    showToast(`Document ${ref} importé avec succès`)
  }

  // Filtered documents with all filters applied
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchSearch = doc.objet.toLowerCase().includes(search.toLowerCase()) ||
        doc.reference.toLowerCase().includes(search.toLowerCase()) ||
        doc.institution.toLowerCase().includes(search.toLowerCase())
      const matchTab = activeTab === 'tous' ||
        (activeTab === 'confidentiel' && (doc.classification === 'CONFIDENTIEL' || doc.classification === 'SECRET')) ||
        (activeTab !== 'confidentiel' && doc.type === activeTab)
      const matchClassification = classificationFilter === 'tous' || doc.classification === classificationFilter
      const matchInstitution = institutionFilter === 'tous' || doc.institution === institutionFilter
      const matchDateFrom = !dateFrom || doc.date >= dateFrom
      const matchDateTo = !dateTo || doc.date <= dateTo
      return matchSearch && matchTab && matchClassification && matchInstitution && matchDateFrom && matchDateTo
    })
  }, [documents, search, activeTab, classificationFilter, institutionFilter, dateFrom, dateTo])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / PAGE_SIZE))
  const paginatedDocs = filteredDocs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value)
    setCurrentPage(1)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  // Dropdown actions
  const handleConsulter = (doc: Document) => {
    setViewDoc(doc)
  }

  const handleTelecharger = (doc: Document) => {
    showToast(`Téléchargement de ${doc.reference} en cours...`)
    // Simulate download by creating a blob
    setTimeout(() => {
      const content = `RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n\n${doc.objet}\n\nRéférence: ${doc.reference}\nType: ${doc.type}\nInstitution: ${doc.institution}\nClassification: ${doc.classification}\nStatut: ${doc.statut}\nDate: ${doc.date}\n\n--- Contenu du document ---\n\n${doc.objet}\n\nConformément aux dispositions légales en vigueur en République de Guinée, le présent document est émis pour application par les services concernés.\n\nFait à Conakry, le ${doc.date}`
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${doc.reference.replace(/\//g, '-')}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 800)
  }

  const handleArchiver = (doc: Document) => {
    setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, statut: 'Classé' as DocStatus } : d))
    showToast(`Document ${doc.reference} archivé avec succès`)
  }

  const handleReclassifier = (doc: Document) => {
    setReclassifyDoc(doc)
    setReclassifyValue(doc.classification)
  }

  const confirmReclassify = () => {
    if (!reclassifyDoc) return
    setDocuments(prev => prev.map(d => d.id === reclassifyDoc.id ? { ...d, classification: reclassifyValue } : d))
    showToast(`Document ${reclassifyDoc.reference} reclassifié en ${reclassifyValue}`)
    setReclassifyDoc(null)
  }

  const handleSupprimer = (doc: Document) => {
    setDeleteDoc(doc)
  }

  const confirmDelete = () => {
    if (!deleteDoc) return
    setDocuments(prev => prev.filter(d => d.id !== deleteDoc.id))
    showToast(`Document ${deleteDoc.reference} supprimé`)
    setDeleteDoc(null)
  }

  // AI Classification
  const handleAiClassification = () => {
    const classifications: DocClassification[] = ['PUBLIC', 'DIFFUSION LIMITÉE', 'CONFIDENTIEL', 'SECRET']
    const nonPublicDocs = documents.filter(d => d.classification === 'PUBLIC' || d.classification === 'DIFFUSION LIMITÉE')
    const count = Math.min(Math.floor(Math.random() * 3) + 1, nonPublicDocs.length)
    const indicesToReclassify = new Set<number>()
    while (indicesToReclassify.size < count) {
      indicesToReclassify.add(Math.floor(Math.random() * nonPublicDocs.length))
    }
    const idsToReclassify = new Set(Array.from(indicesToReclassify).map(i => nonPublicDocs[i].id))
    setDocuments(prev => prev.map(d => {
      if (idsToReclassify.has(d.id)) {
        const newClass = classifications[Math.floor(Math.random() * classifications.length)]
        return { ...d, classification: newClass }
      }
      return d
    }))
    showToast(`${count} documents reclassifiés par l'IA`)
  }

  // Export to National Archives
  const handleExport = () => {
    setExportDialog(true)
  }

  const confirmExport = () => {
    const count = filteredDocs.length
    showToast(`${count} documents exportés vers les Archives Nationales`)
    setExportDialog(false)
  }

  // Reset filters
  const resetFilters = () => {
    setClassificationFilter('tous')
    setInstitutionFilter('tous')
    setRegionFilter('toutes')
    setDateFrom('')
    setDateTo('')
    setCurrentPage(1)
  }

  const hasActiveFilters = classificationFilter !== 'tous' || institutionFilter !== 'tous' || regionFilter !== 'toutes' || dateFrom !== '' || dateTo !== ''

  const uniqueInstitutions = [...new Set(DOCUMENTS.map(d => d.institution))]

  const stats = [
    { label: 'Documents officiels', value: '87 450', icon: FileText, color: 'text-brand dark:text-primary', bg: 'bg-brand/5 dark:bg-primary/10' },
    { label: 'Décrets & arrêtés', value: '4 230', icon: ScrollText, color: 'text-gold dark:text-gold', bg: 'bg-gold/5 dark:bg-gold/10' },
    { label: 'Circulaires & notes', value: '12 870', icon: BookOpen, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
    { label: 'Documents confidentiels', value: '1 340', icon: Lock, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'En cours de traitement', value: '2 150', icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Taux de numérisation', value: '78.3%', icon: BarChart3, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', isProgress: true, progressValue: 78.3 },
  ]

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: number[] = []
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
    return pages
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand/10 dark:bg-primary/20">
            <Library className="h-6 w-6 text-brand dark:text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-brand dark:text-primary">Gestion Électronique des Documents Officiels</h2>
            <p className="text-sm text-muted-foreground">Archivage souverain de la documentation de l&apos;État — Conformément au Code administratif</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card className="glass-card hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs text-muted-foreground leading-tight">{stat.label}</span>
                </div>
                <p className="text-xl font-bold">{stat.value}</p>
                {stat.isProgress && (
                  <Progress value={stat.progressValue} className="h-1.5 mt-2" />
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="shadow-sm border-[#C8A45C]/20 dark:border-[#D4B878]/20 bg-gradient-to-r from-[#0B2E58]/[0.02] to-[#C8A45C]/[0.02] dark:from-[#3B7DD8]/[0.05] dark:to-[#D4B878]/[0.03]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">Actions rapides</CardTitle>
            <CardDescription className="text-xs">Raccourcis vers les modules liés</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Nouveau courrier', icon: Mail, color: 'bg-[#0B2E58] hover:bg-[#0B2E58]/90 text-white', onClick: () => navigate('courriers') },
                { label: 'Lancer un workflow', icon: GitBranch, color: 'bg-[#C8A45C] hover:bg-[#C8A45C]/90 text-[#0B2E58]', onClick: () => navigate('workflow') },
                { label: 'Demander signature', icon: PenTool, color: 'bg-emerald-600 hover:bg-emerald-600/90 text-white', onClick: () => navigate('signatures') },
                { label: 'Demandes citoyennes', icon: UserCheck, color: 'bg-[#3B7DD8] hover:bg-[#3B7DD8]/90 text-white', onClick: () => navigate('service-requests') },
              ].map(action => (
                <Button key={action.label} className={`${action.color} h-auto flex-col gap-2 rounded-xl py-4 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02]`} onClick={action.onClick}>
                  <action.icon className="size-5" />
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Document Type Tabs */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCurrentPage(1) }}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
                {TYPE_TABS.map(tab => (
                  <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs data-[state=active]:bg-brand data-[state=active]:text-white dark:data-[state=active]:bg-primary">
                    {tab.icon && <tab.icon className="h-3 w-3" />}
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 border-gold/30 text-gold hover:bg-gold/5" onClick={handleAiClassification}>
                  <Brain className="h-3.5 w-3.5" />
                  Classification automatique par IA
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 border-brand/30 text-brand hover:bg-brand/5 dark:border-primary/30 dark:text-primary dark:hover:bg-primary/5" onClick={handleExport}>
                  <Archive className="h-3.5 w-3.5" />
                  Export vers les Archives Nationales
                </Button>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par référence, objet, institution..."
                  value={search}
                  onChange={e => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtres avancés
                <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>
              <Button size="sm" className="gap-2 bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90" onClick={() => setUploadDialog(true)}>
                <Upload className="h-4 w-4" />
                Importer un document
              </Button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-3 pt-3 mt-3 border-t">
                    <Select value={classificationFilter} onValueChange={handleFilterChange(setClassificationFilter)}>
                      <SelectTrigger className="w-[200px]">
                        <Shield className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="Classification" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tous">Toutes classifications</SelectItem>
                        <SelectItem value="PUBLIC">PUBLIC</SelectItem>
                        <SelectItem value="DIFFUSION LIMITÉE">DIFFUSION LIMITÉE</SelectItem>
                        <SelectItem value="CONFIDENTIEL">CONFIDENTIEL</SelectItem>
                        <SelectItem value="SECRET">SECRET</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={institutionFilter} onValueChange={handleFilterChange(setInstitutionFilter)}>
                      <SelectTrigger className="w-[220px]">
                        <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="Institution" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tous">Toutes les institutions</SelectItem>
                        {uniqueInstitutions.map(inst => (
                          <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={regionFilter} onValueChange={handleFilterChange(setRegionFilter)}>
                      <SelectTrigger className="w-[160px]">
                        <MapPin className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="Région" />
                      </SelectTrigger>
                      <SelectContent>
                        {REGIONS.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input type="date" className="w-[160px]" placeholder="Date début" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setCurrentPage(1) }} />
                    <Input type="date" className="w-[160px]" placeholder="Date fin" value={dateTo} onChange={e => { setDateTo(e.target.value); setCurrentPage(1) }} />

                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={resetFilters}>
                        <X className="h-3 w-3 mr-1" />
                        Réinitialiser
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Tabs>
        </CardContent>
      </Card>

      {/* Main Content: Table + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Documents Table */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-semibold">Référence</TableHead>
                      <TableHead className="text-xs font-semibold min-w-[300px]">Objet</TableHead>
                      <TableHead className="text-xs font-semibold">Type</TableHead>
                      <TableHead className="text-xs font-semibold hidden lg:table-cell">Institution</TableHead>
                      <TableHead className="text-xs font-semibold hidden md:table-cell">Taille</TableHead>
                      <TableHead className="text-xs font-semibold">Classification</TableHead>
                      <TableHead className="text-xs font-semibold">Statut</TableHead>
                      <TableHead className="text-xs font-semibold w-10">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDocs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          <FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
                          <p className="text-sm">Aucun document trouvé</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedDocs.map((doc, i) => {
                        const classConfig = CLASSIFICATION_CONFIG[doc.classification]
                        const statusConfig = STATUS_CONFIG[doc.statut]
                        const ClassIcon = classConfig.icon
                        const StatusIcon = statusConfig.icon
                        return (
                          <motion.tr
                            key={doc.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className="hover:bg-muted/50 transition-colors group"
                          >
                            <TableCell>
                              <span className="font-mono text-xs font-medium text-brand dark:text-primary">{doc.reference}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-start gap-2">
                                <FileText className="h-4 w-4 text-brand dark:text-primary shrink-0 mt-0.5" />
                                <span className="text-sm leading-tight line-clamp-2">{doc.objet}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-medium">{doc.type}</Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="flex items-center gap-1.5">
                                <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-xs text-muted-foreground truncate max-w-[150px]">{doc.institution}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className="text-xs text-muted-foreground">{doc.taille}</span>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${classConfig.color}`}>
                                <ClassIcon className="h-3 w-3" />
                                {doc.classification}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.color}`}>
                                <StatusIcon className="h-3 w-3" />
                                {doc.statut}
                              </span>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem className="gap-2" onClick={() => handleConsulter(doc)}>
                                    <Eye className="h-4 w-4" /> Consulter
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="gap-2" onClick={() => handleTelecharger(doc)}>
                                    <Download className="h-4 w-4" /> Télécharger
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="gap-2" onClick={() => handleArchiver(doc)}>
                                    <Archive className="h-4 w-4" /> Archiver
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="gap-2" onClick={() => handleReclassifier(doc)}>
                                    <Tag className="h-4 w-4" /> Reclassifier
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="gap-2 text-red-600" onClick={() => handleSupprimer(doc)}>
                                    <Trash2 className="h-4 w-4" /> Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </motion.tr>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between p-4 border-t">
                <span className="text-xs text-muted-foreground">
                  {filteredDocs.length} document(s) affiché(s) sur {documents.length}
                  {totalPages > 1 && ` — Page ${currentPage} sur ${totalPages}`}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    <ChevronLeft className="h-3 w-3" />
                    Précédent
                  </Button>
                  {getPageNumbers().map(page => (
                    <Button
                      key={page}
                      variant="outline"
                      size="sm"
                      className={`text-xs ${page === currentPage ? 'bg-brand text-white dark:bg-primary' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    Suivant
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Document count by institution */}
        <div className="lg:col-span-1">
          <Card className="glass-card sticky top-24">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-brand dark:text-primary" />
                Documents par institution
              </CardTitle>
              <CardDescription className="text-xs">Répartition des documents officiels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {INSTITUTION_COUNTS.map(inst => {
                const maxCount = Math.max(...INSTITUTION_COUNTS.map(i => i.count))
                const pct = (inst.count / maxCount) * 100
                return (
                  <div key={inst.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium truncate max-w-[160px]">{inst.name}</span>
                      <span className="text-xs font-bold text-brand dark:text-primary">{inst.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        className={`h-full rounded-full ${inst.color}`}
                      />
                    </div>
                  </div>
                )
              })}
              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Total</span>
                <span className="text-xs font-bold text-brand dark:text-primary">{documents.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-gold" />
                Classification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(['PUBLIC', 'DIFFUSION LIMITÉE', 'CONFIDENTIEL', 'SECRET'] as DocClassification[]).map(cls => {
                const count = documents.filter(d => d.classification === cls).length
                const config = CLASSIFICATION_CONFIG[cls]
                return (
                  <div key={cls} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${config.color} px-2 py-0.5 rounded-full`}>
                      <config.icon className="h-3 w-3" />
                      {cls}
                    </span>
                    <span className="text-xs font-bold">{count}</span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
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

      {/* Upload Document Dialog */}
      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-brand dark:text-primary" />
              Importer un document réglementaire
            </DialogTitle>
            <DialogDescription>Ajouter un nouveau document officiel à la GED</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Objet du document</Label>
              <Input
                placeholder="Ex: Décret n°D/2026/... portant organisation..."
                value={newDoc.objet}
                onChange={e => setNewDoc(prev => ({ ...prev, objet: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de document</Label>
                <Select value={newDoc.type} onValueChange={(v) => setNewDoc(prev => ({ ...prev, type: v as DocType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Décret">Décret</SelectItem>
                    <SelectItem value="Arrêté">Arrêté</SelectItem>
                    <SelectItem value="Circulaire">Circulaire</SelectItem>
                    <SelectItem value="Note de service">Note de service</SelectItem>
                    <SelectItem value="Rapport">Rapport</SelectItem>
                    <SelectItem value="Ordonnance">Ordonnance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Classification</Label>
                <Select value={newDoc.classification} onValueChange={(v) => setNewDoc(prev => ({ ...prev, classification: v as DocClassification }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC">PUBLIC</SelectItem>
                    <SelectItem value="DIFFUSION LIMITÉE">DIFFUSION LIMITÉE</SelectItem>
                    <SelectItem value="CONFIDENTIEL">CONFIDENTIEL</SelectItem>
                    <SelectItem value="SECRET">SECRET</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Institution</Label>
              <Input
                placeholder="Ex: Ministère des Finances, Présidence..."
                value={newDoc.institution}
                onChange={e => setNewDoc(prev => ({ ...prev, institution: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialog(false)}>Annuler</Button>
            <Button className="bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90 gap-2" onClick={uploadDocument} disabled={!newDoc.objet || !newDoc.institution}>
              <Upload className="h-4 w-4" />
              Importer le document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Consultation Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={(open) => { if (!open) setViewDoc(null) }}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-brand dark:text-primary" />
              Consultation du document
            </DialogTitle>
            <DialogDescription>Détails et aperçu du document officiel</DialogDescription>
          </DialogHeader>
          {viewDoc && (
            <div className="space-y-4">
              {/* Document metadata */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Référence</Label>
                  <p className="text-sm font-mono font-semibold text-brand dark:text-primary">{viewDoc.reference}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Badge variant="outline" className="text-xs font-medium">{viewDoc.type}</Badge>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Institution</Label>
                  <p className="text-sm">{viewDoc.institution}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Classification</Label>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${CLASSIFICATION_CONFIG[viewDoc.classification].color}`}>
                    {(() => { const Ic = CLASSIFICATION_CONFIG[viewDoc.classification].icon; return <Ic className="h-3 w-3" /> })()}
                    {viewDoc.classification}
                  </span>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Statut</Label>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[viewDoc.statut].color}`}>
                    {(() => { const Ic = STATUS_CONFIG[viewDoc.statut].icon; return <Ic className="h-3 w-3" /> })()}
                    {viewDoc.statut}
                  </span>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <p className="text-sm">{viewDoc.date}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Taille</Label>
                  <p className="text-sm">{viewDoc.taille}</p>
                </div>
              </div>

              <Separator />

              {/* Simulated document preview */}
              <div className="border rounded-lg p-6 bg-white dark:bg-gray-900 shadow-inner">
                {/* Republic of Guinea header */}
                <div className="text-center space-y-1 mb-6">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="w-8 h-5 bg-[#CE1126] rounded-sm" />
                    <div className="w-8 h-5 bg-[#FCD116] rounded-sm" />
                    <div className="w-8 h-5 bg-[#009460] rounded-sm" />
                  </div>
                  <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">République de Guinée</p>
                  <p className="text-[10px] text-muted-foreground">Travail — Justice — Solidarité</p>
                  <Separator className="my-2" />
                </div>

                {/* Document content */}
                <div className="space-y-4 text-sm leading-relaxed">
                  <div className="text-center">
                    <p className="font-bold text-base">{viewDoc.type} n°{viewDoc.reference}</p>
                  </div>
                  <p className="text-justify first-letter:text-3xl first-letter:font-bold first-letter:float-left first-letter:mr-1 first-letter:mt-1">
                    {viewDoc.objet}
                  </p>
                  <p className="text-justify text-muted-foreground">
                    Conformément aux dispositions constitutionnelles et aux textes réglementaires en vigueur en République de Guinée, le présent document est émis pour pleine et entière application par l&apos;institution susvisée et tous les services concernés.
                  </p>
                  <p className="text-justify text-muted-foreground">
                    Les mesures prévues par le présent {viewDoc.type.toLowerCase()} entrent en vigueur à compter de la date de sa signature. Tous les ministères, institutions et organismes concernés sont tenus de veiller à sa stricte application dans les meilleurs délais.
                  </p>
                </div>

                {/* Signature area */}
                <div className="mt-8 flex justify-end">
                  <div className="text-center space-y-1">
                    <p className="text-xs text-muted-foreground">Fait à Conakry, le {viewDoc.date}</p>
                    <p className="text-sm font-semibold">{viewDoc.institution}</p>
                    <div className="w-32 border-b border-dashed border-muted-foreground/30 mx-auto mt-4" />
                    <p className="text-[10px] text-muted-foreground">Signature & Cachet</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setViewDoc(null)}>Fermer</Button>
            {viewDoc && (
              <Button className="bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90 gap-2" onClick={() => { handleTelecharger(viewDoc); setViewDoc(null) }}>
                <Download className="h-4 w-4" />
                Télécharger
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reclassify Dialog */}
      <Dialog open={!!reclassifyDoc} onOpenChange={(open) => { if (!open) setReclassifyDoc(null) }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-gold" />
              Reclassifier le document
            </DialogTitle>
            <DialogDescription>
              {reclassifyDoc && `Modifier la classification de ${reclassifyDoc.reference}`}
            </DialogDescription>
          </DialogHeader>
          {reclassifyDoc && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Classification actuelle</Label>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${CLASSIFICATION_CONFIG[reclassifyDoc.classification].color}`}>
                  {(() => { const Ic = CLASSIFICATION_CONFIG[reclassifyDoc.classification].icon; return <Ic className="h-3 w-3" /> })()}
                  {reclassifyDoc.classification}
                </span>
              </div>
              <div className="space-y-2">
                <Label>Nouvelle classification</Label>
                <Select value={reclassifyValue} onValueChange={(v) => setReclassifyValue(v as DocClassification)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC">PUBLIC</SelectItem>
                    <SelectItem value="DIFFUSION LIMITÉE">DIFFUSION LIMITÉE</SelectItem>
                    <SelectItem value="CONFIDENTIEL">CONFIDENTIEL</SelectItem>
                    <SelectItem value="SECRET">SECRET</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReclassifyDoc(null)}>Annuler</Button>
            <Button className="bg-gold hover:bg-gold/90 text-[#0B2E58] gap-2" onClick={confirmReclassify}>
              <CheckCircle2 className="h-4 w-4" />
              Reclassifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDoc} onOpenChange={(open) => { if (!open) setDeleteDoc(null) }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Le document sera définitivement supprimé de la GED.
            </DialogDescription>
          </DialogHeader>
          {deleteDoc && (
            <div className="py-4">
              <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-red-600" />
                  <span className="font-mono text-sm font-semibold text-red-700 dark:text-red-400">{deleteDoc.reference}</span>
                </div>
                <p className="text-sm text-red-700/80 dark:text-red-300/80">{deleteDoc.objet}</p>
                <p className="text-xs text-red-600/60 dark:text-red-400/60">{deleteDoc.type} — {deleteDoc.institution} — {deleteDoc.date}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDoc(null)}>Annuler</Button>
            <Button variant="destructive" className="gap-2" onClick={confirmDelete}>
              <Trash2 className="h-4 w-4" />
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export to National Archives Dialog */}
      <Dialog open={exportDialog} onOpenChange={setExportDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-brand dark:text-primary" />
              Export vers les Archives Nationales
            </DialogTitle>
            <DialogDescription>
              Confirmez l&apos;export des documents affichés vers les Archives Nationales de la République de Guinée.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg border border-brand/20 dark:border-primary/20 bg-brand/5 dark:bg-primary/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Documents à exporter</span>
                <span className="text-lg font-bold text-brand dark:text-primary">{filteredDocs.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Les {filteredDocs.length} documents actuellement affichés seront transférés aux Archives Nationales conformément au Code administratif.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialog(false)}>Annuler</Button>
            <Button className="bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90 gap-2" onClick={confirmExport}>
              <Archive className="h-4 w-4" />
              Confirmer l&apos;export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
