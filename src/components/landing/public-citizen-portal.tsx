'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, FileText, Clock, CheckCircle2, Upload, Search,
  Building2, CreditCard, MessageSquare, Phone, Mail,
  ChevronRight, MapPin, Calendar, QrCode, Bell,
  Home, Briefcase, GraduationCap, Heart, Scale, Car,
  Shield, Baby, Church, Stethoscope, IdCard, Stamp,
  Globe, Smartphone, Hash, Landmark, Award, BookOpen,
  ArrowLeft, Check, AlertCircle, Download, Eye, Send,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { useCitizenRequestsStore, type CitizenRequest, type RequestStatus } from '@/store/citizen-requests-store'
import { useAppStore } from '@/store/app-store'

const GUINEA_RED = '#CE1126'
const GUINEA_YELLOW = '#FCD116'
const GUINEA_GREEN = '#009460'

interface ServiceItem {
  id: string
  name: string
  description: string
  icon: React.ElementType
  price: string
  delay: string
  requiredDocs: string[]
}

interface ServiceCategory {
  id: string
  name: string
  color: string
  bgColor: string
  iconBgColor: string
  textColor: string
  borderColor: string
  services: ServiceItem[]
}

const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'etat-civil', name: 'État Civil', color: 'bg-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    iconBgColor: 'bg-blue-100 dark:bg-blue-900/40', textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800/40',
    services: [
      { id: 'ec-1', name: "Extrait d'acte de naissance", description: "Copie intégrale ou extrait d'acte de naissance", icon: Baby, price: 'Gratuit', delay: '48h', requiredDocs: ['Carte d\'identité', 'Acte de naissance original ou numéro d\'acte'] },
      { id: 'ec-2', name: "Extrait d'acte de mariage", description: "Attestation officielle d'acte de mariage", icon: Heart, price: 'Gratuit', delay: '48h', requiredDocs: ['Carte d\'identité', 'Acte de mariage original ou numéro d\'acte'] },
      { id: 'ec-3', name: "Extrait d'acte de décès", description: "Document officiel d'acte de décès", icon: Church, price: 'Gratuit', delay: '48h', requiredDocs: ['Carte d\'identité du demandeur', 'Acte de décès original ou numéro'] },
      { id: 'ec-4', name: 'Certificat de nationalité', description: "Attestation de nationalité guinéenne", icon: Shield, price: '5 000 GNF', delay: '5 jours', requiredDocs: ['Carte d\'identité nationale', 'Extrait d\'acte de naissance', '2 photos d\'identité', 'Certificat de résidence'] },
      { id: 'ec-5', name: 'Déclaration de naissance', description: "Enregistrement d'une naissance à l'état civil", icon: Baby, price: 'Gratuit', delay: '24h', requiredDocs: ['Certificat médical de naissance', 'Pièce d\'identité d\'un parent', 'Déclaration du père ou de la mère'] },
    ],
  },
  {
    id: 'justice', name: 'Justice & Légal', color: 'bg-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    iconBgColor: 'bg-purple-100 dark:bg-purple-900/40', textColor: 'text-purple-600 dark:text-purple-400',
    borderColor: 'border-purple-200 dark:border-purple-800/40',
    services: [
      { id: 'j-1', name: 'Casier judiciaire', description: 'Extrait de casier judiciaire B3', icon: Scale, price: '5 000 GNF', delay: '5 jours', requiredDocs: ['Carte d\'identité nationale', '2 photos d\'identité', 'Timbre fiscal'] },
      { id: 'j-2', name: 'Certificat de non-poursuite', description: 'Attestation de non-poursuite judiciaire', icon: FileText, price: '3 000 GNF', delay: '3 jours', requiredDocs: ['Carte d\'identité nationale', 'Casier judiciaire récent'] },
      { id: 'j-3', name: 'Légalisation de documents', description: 'Authentification officielle de documents', icon: Stamp, price: '2 000 GNF', delay: '24h', requiredDocs: ['Document original à légaliser', 'Carte d\'identité nationale', 'Photocopie du document'] },
    ],
  },
  {
    id: 'identification', name: 'Identification', color: 'bg-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20',
    iconBgColor: 'bg-green-100 dark:bg-green-900/40', textColor: 'text-green-600 dark:text-green-400',
    borderColor: 'border-green-200 dark:border-green-800/40',
    services: [
      { id: 'id-1', name: "Carte d'identité nationale biométrique", description: "CNI biométrique sécurisée avec puces", icon: IdCard, price: 'Gratuit', delay: '7 jours', requiredDocs: ['Extrait d\'acte de naissance', 'Certificat de nationalité', '4 photos d\'identité', 'Certificat de résidence', 'Témoin avec CNI valide'] },
      { id: 'id-2', name: 'Passeport biométrique', description: 'Passeport biométrique international', icon: Globe, price: '150 000 GNF', delay: '10 jours', requiredDocs: ['Carte d\'identité nationale', 'Extrait d\'acte de naissance', '4 photos d\'identité récentes', 'Certificat de résidence', 'Ancien passeport (si renouvellement)'] },
      { id: 'id-3', name: 'Permis de conduire', description: 'Permis de conduire national ou international', icon: Car, price: '25 000 GNF', delay: '10 jours', requiredDocs: ['Carte d\'identité nationale', 'Certificat médical d\'aptitude', 'Attestation de réussite auto-école', '4 photos d\'identité', 'Ancien permis (si renouvellement)'] },
    ],
  },
  {
    id: 'urbanisme', name: 'Urbanisme & Construction', color: 'bg-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    iconBgColor: 'bg-orange-100 dark:bg-orange-900/40', textColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-200 dark:border-orange-800/40',
    services: [
      { id: 'u-1', name: 'Permis de construire', description: 'Autorisation de construction immobilière', icon: Building2, price: '50 000 GNF', delay: '15 jours', requiredDocs: ['Plan de construction certifié', 'Titre foncier ou bail', 'Étude d\'impact environnemental', 'Plan de situation du terrain', 'Carte d\'identité'] },
    ],
  },
  {
    id: 'entreprise', name: 'Entreprise & Commerce', color: 'bg-teal-600', bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    iconBgColor: 'bg-teal-100 dark:bg-teal-900/40', textColor: 'text-teal-600 dark:text-teal-400',
    borderColor: 'border-teal-200 dark:border-teal-800/40',
    services: [
      { id: 'e-1', name: 'Enregistrement entreprise (APIP)', description: "Création d'entreprise via l'APIP", icon: Briefcase, price: '50 000 GNF', delay: '3 jours', requiredDocs: ['Statuts de l\'entreprise', 'Pièce d\'identité du gérant', 'Casier judiciaire du gérant', 'Attestation de siège social', 'Capital social minimum'] },
      { id: 'e-2', name: 'Registre de commerce', description: 'Immatriculation au RCCM', icon: BookOpen, price: '100 000 GNF', delay: '7 jours', requiredDocs: ['Statuts enregistrés', 'Carte d\'identité du gérant', 'Certificat de résidence', 'Attestation APIP'] },
    ],
  },
  {
    id: 'education', name: 'Éducation', color: 'bg-indigo-600', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    iconBgColor: 'bg-indigo-100 dark:bg-indigo-900/40', textColor: 'text-indigo-600 dark:text-indigo-400',
    borderColor: 'border-indigo-200 dark:border-indigo-800/40',
    services: [
      { id: 'ed-1', name: 'Attestation de scolarité', description: "Certificat de fréquentation scolaire", icon: GraduationCap, price: 'Gratuit', delay: '48h', requiredDocs: ['Carte d\'identité', 'Certificat d\'inscription', 'Dernier bulletin scolaire'] },
      { id: 'ed-2', name: 'Diplôme et relevé de notes', description: 'Copie certifiée de diplôme et relevé', icon: Award, price: '10 000 GNF', delay: '5 jours', requiredDocs: ['Carte d\'identité', 'Numéro matricule', 'Ancien diplôme (si duplicata)'] },
    ],
  },
  {
    id: 'sante', name: 'Santé', color: 'bg-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20',
    iconBgColor: 'bg-red-100 dark:bg-red-900/40', textColor: 'text-red-600 dark:text-red-400',
    borderColor: 'border-red-200 dark:border-red-800/40',
    services: [
      { id: 's-1', name: 'Certificat de vaccination', description: 'Carnet ou certificat de vaccination international', icon: Stethoscope, price: 'Gratuit', delay: '24h', requiredDocs: ['Carte d\'identité', 'Ancien carnet de vaccination (si disponible)'] },
      { id: 's-2', name: 'Carte sanitaire', description: "Carte nationale d'assurance maladie", icon: Heart, price: '2 000 GNF', delay: '5 jours', requiredDocs: ['Carte d\'identité nationale', 'Photo d\'identité', 'Certificat de résidence', 'Attestation d\'emploi ou de chômage'] },
    ],
  },
  {
    id: 'residence', name: 'Résidence & Citoyenneté', color: 'bg-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    iconBgColor: 'bg-amber-100 dark:bg-amber-900/40', textColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800/40',
    services: [
      { id: 'r-1', name: 'Certificat de résidence', description: 'Attestation de domicile délivrée par la mairie', icon: Home, price: 'Gratuit', delay: '24h', requiredDocs: ['Carte d\'identité nationale', 'Quittance de loyer ou titre de propriété', 'Témoignage de 2 voisins'] },
      { id: 'r-2', name: 'Attestation de domicile', description: "Attestation de lieu d'habitation", icon: MapPin, price: '1 000 GNF', delay: '24h', requiredDocs: ['Carte d\'identité', 'Facture d\'eau ou d\'électricité récente'] },
    ],
  },
]

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; icon: React.ElementType }> = {
  soumise: { label: 'Soumise', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400', icon: Send },
  en_cours: { label: 'En cours de traitement', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  pieces_complementaires: { label: 'Pièces complémentaires requises', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertCircle },
  validee: { label: 'Validée', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Check },
  prete: { label: 'Document prêt', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  livree: { label: 'Livrée', color: 'bg-[#0B2E58]/10 text-[#0B2E58] dark:bg-[#3B7DD8]/20 dark:text-[#3B7DD8]', icon: Download },
  rejetee: { label: 'Rejetée', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertCircle },
}

const STATS_BANNER = [
  { value: '124 500', label: 'citoyens inscrits', icon: Users },
  { value: '8 730', label: 'demandes traitées', icon: CheckCircle2 },
  { value: '94%', label: 'taux de satisfaction', icon: Heart },
  { value: '48h', label: 'délai moyen', icon: Clock },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

export function PublicCitizenPortal() {
  const { requests, addRequest, getRequestByReference } = useCitizenRequestsStore()
  const { isAuth, user, navigate } = useAppStore()
  const [activeTab, setActiveTab] = useState('services')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null)
  const [selectedCategoryInfo, setSelectedCategoryInfo] = useState<ServiceCategory | null>(null)
  const [successToast, setSuccessToast] = useState('')
  const [submittedRef, setSubmittedRef] = useState('')

  // Tracking
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackedRequest, setTrackedRequest] = useState<CitizenRequest | null>(null)
  const [trackingError, setTrackingError] = useState(false)

  // Request form
  const [form, setForm] = useState({
    citizenName: '',
    citizenFirstName: '',
    citizenNIN: '',
    citizenPhone: '',
    citizenEmail: '',
    citizenAddress: '',
    motif: '',
    deliveryMode: 'guichet' as 'en_ligne' | 'guichet' | 'courrier',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  const handleOpenRequestDialog = (service: ServiceItem, category: ServiceCategory) => {
    // If not authenticated, redirect to login first
    if (!isAuth) {
      navigate('login')
      return
    }
    setSelectedService(service)
    setSelectedCategoryInfo(category)
    // Pre-fill from logged-in user info
    const nameParts = (user?.name || '').split(' ')
    setForm({
      citizenName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] || '',
      citizenFirstName: nameParts.length > 1 ? nameParts[0] : '',
      citizenNIN: user?.nin || '',
      citizenPhone: user?.phone || '',
      citizenEmail: user?.email || '',
      citizenAddress: '',
      motif: '',
      deliveryMode: 'guichet',
    })
    setFormErrors({})
    setAcceptedTerms(false)
    setRequestDialogOpen(true)
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!form.citizenName.trim()) errors.citizenName = 'Le nom est requis'
    if (!form.citizenFirstName.trim()) errors.citizenFirstName = 'Le prénom est requis'
    if (!form.citizenNIN.trim()) errors.citizenNIN = 'Le NIN est requis'
    if (!form.citizenPhone.trim()) errors.citizenPhone = 'Le numéro de téléphone est requis'
    if (!form.citizenAddress.trim()) errors.citizenAddress = 'L\'adresse est requise'
    if (!acceptedTerms) errors.terms = 'Vous devez accepter les conditions'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmitRequest = () => {
    if (!validateForm() || !selectedService || !selectedCategoryInfo) return

    const newRequest = addRequest({
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      category: selectedCategoryInfo.name,
      categoryId: selectedCategoryInfo.id,
      citizenName: form.citizenName,
      citizenFirstName: form.citizenFirstName,
      citizenNIN: form.citizenNIN,
      citizenPhone: form.citizenPhone,
      citizenEmail: form.citizenEmail,
      citizenAddress: form.citizenAddress,
      motif: form.motif || `Demande de ${selectedService.name}`,
      documents: selectedService.requiredDocs,
      uploadedDocuments: [],
      createdAt: new Date().toISOString(),
      deliveryMode: form.deliveryMode,
    })

    setRequestDialogOpen(false)
    setSubmittedRef(newRequest.reference)
    setSuccessToast(`Votre demande a été soumise avec succès ! Référence : ${newRequest.reference}`)
    setActiveTab('suivi')
    setTrackingNumber(newRequest.reference)
    setTrackedRequest(newRequest)
  }

  const handleTrack = () => {
    const found = getRequestByReference(trackingNumber)
    setTrackedRequest(found || null)
    setTrackingError(!!trackingNumber && !found)
  }

  // Filter services by search
  const filteredCategories = SERVICE_CATEGORIES
    .filter(cat => selectedCategory === 'all' || cat.id === selectedCategory)
    .map(cat => ({
      ...cat,
      services: cat.services.filter(s =>
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter(cat => cat.services.length > 0)

  const myRequests = requests.slice(0, 10) // Show last 10 requests for this "session"

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#0B2E58]/[0.01] to-[#C8A45C]/[0.02] dark:from-gray-950 dark:via-[#3B7DD8]/[0.02] dark:to-[#D4B878]/[0.02]">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-4 py-8 space-y-8"
      >
        {/* ═══════════════════════════════════════════════════════════
            HERO HEADER
        ═══════════════════════════════════════════════════════════ */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-[#C8A45C]/20 dark:border-[#D4B878]/20 bg-gradient-to-br from-[#0B2E58] via-[#0B2E58]/95 to-[#134A8E] dark:from-[#0B2E58] dark:via-[#071D3A] dark:to-[#0B2E58]">
            <CardContent className="p-8 md:p-12 text-white relative">
              {/* Guinea tricolor accent */}
              <div className="flex gap-0 mb-6 -mx-8 md:-mx-12 -mt-8 md:-mt-12">
                <div className="flex-1 h-2" style={{ backgroundColor: GUINEA_RED }} />
                <div className="flex-1 h-2" style={{ backgroundColor: GUINEA_YELLOW }} />
                <div className="flex-1 h-2" style={{ backgroundColor: GUINEA_GREEN }} />
              </div>

              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm shadow-xl border border-white/20">
                  <Landmark className="size-8 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-widest text-white/60 font-medium">République de Guinée</p>
                  <h1 className="text-3xl md:text-4xl font-bold mt-1">Guinée Services Publics</h1>
                  <p className="text-sm text-white/70 mt-2 max-w-xl">
                    Portail officiel des démarches administratives en ligne. Effectuez vos demandes de documents officiels
                    sans vous déplacer, suivez l&apos;avancement en temps réel et recevez vos documents par le canal de votre choix.
                  </p>
                  <div className="flex flex-wrap gap-3 mt-4">
                    <Badge className="bg-[#C8A45C] text-[#0B2E58] hover:bg-[#C8A45C]/90 border-0 font-semibold text-xs gap-1.5 shadow-sm">
                      <Globe className="size-3" />
                      Service Public Numérique
                    </Badge>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs gap-1.5">
                      <CheckCircle2 className="size-3" />
                      28 services en ligne
                    </Badge>
                    <Badge className="bg-white/10 text-white/80 border-white/20 text-xs gap-1.5">
                      <Shield className="size-3" />
                      Données protégées
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Quick search */}
              <div className="mt-8 flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                  <Input
                    placeholder="Rechercher un service... (ex: acte de naissance, passeport, permis)"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 text-sm rounded-xl backdrop-blur-sm"
                    onClick={() => setActiveTab('services')}
                  />
                </div>
                <Button size="lg" className="bg-[#C8A45C] hover:bg-[#C8A45C]/90 text-[#0B2E58] font-semibold rounded-xl h-12 px-6" onClick={() => setActiveTab('services')}>
                  Rechercher
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════
            STATS BANNER
        ═══════════════════════════════════════════════════════════ */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS_BANNER.map((stat) => (
              <Card key={stat.label} className="shadow-sm border-[#0B2E58]/5 dark:border-[#3B7DD8]/10">
                <CardContent className="p-5 text-center">
                  <stat.icon className="size-6 mx-auto mb-2 text-[#0B2E58] dark:text-[#3B7DD8]" />
                  <p className="text-2xl font-bold text-[#0B2E58] dark:text-white">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════
            TABS NAVIGATION
        ═══════════════════════════════════════════════════════════ */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto h-auto flex-wrap gap-1 bg-muted/50 p-1.5">
            <TabsTrigger value="services" className="gap-1.5 text-sm data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
              <Globe className="size-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="suivi" className="gap-1.5 text-sm data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
              <Search className="size-4" />
              Suivi de demande
            </TabsTrigger>
            <TabsTrigger value="mes-demandes" className="gap-1.5 text-sm data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
              <FileText className="size-4" />
              Mes demandes ({requests.length})
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════════════
              SERVICES CATALOG
          ═══════════════════════════════════════════════════════ */}
          <TabsContent value="services">
            <div className="space-y-6 mt-6">
              {/* Category filter */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                  className={selectedCategory === 'all' ? 'bg-[#0B2E58] text-white hover:bg-[#0B2E58]/90' : ''}
                >
                  Tous les services
                </Button>
                {SERVICE_CATEGORIES.map(cat => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={selectedCategory === cat.id ? `${cat.color} text-white border-0` : ''}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>

              {/* Service categories */}
              {filteredCategories.map((category, catIndex) => (
                <motion.div
                  key={category.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: catIndex * 0.05 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`h-1.5 w-1.5 rounded-full ${category.color}`} />
                    <h3 className={`text-base font-semibold ${category.textColor}`}>
                      {category.name}
                    </h3>
                    <div className="flex-1 h-px bg-border" />
                    <Badge variant="outline" className="text-xs">
                      {category.services.length} service{category.services.length > 1 ? 's' : ''}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {category.services.map((service, i) => (
                      <motion.div
                        key={service.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <Card className={`hover:shadow-xl transition-all cursor-pointer group h-full border-2 ${category.borderColor} hover:border-[#0B2E58]/30 dark:hover:border-[#3B7DD8]/40`}>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div className={`p-2.5 rounded-xl ${category.iconBgColor}`}>
                                <service.icon className={`h-5 w-5 ${category.textColor}`} />
                              </div>
                              <Badge variant="outline" className="text-[10px]">{category.name}</Badge>
                            </div>
                            <CardTitle className="text-sm mt-2 group-hover:text-[#0B2E58] dark:group-hover:text-[#3B7DD8] transition-colors leading-tight">
                              {service.name}
                            </CardTitle>
                            <CardDescription className="text-xs">{service.description}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between text-xs mb-3">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Délai: {service.delay}
                              </span>
                              <span className="font-semibold text-[#0B2E58] dark:text-[#3B7DD8]">{service.price}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {service.requiredDocs.length} pièce(s) justificative(s)
                            </div>
                            <Button size="sm" className={`w-full gap-1 text-xs h-9 ${isAuth ? category.color : 'bg-[#C8A45C] hover:bg-[#C8A45C]/90 text-[#0B2E58]'} text-white border-0`} onClick={() => handleOpenRequestDialog(service, category)}>
                              {isAuth ? 'Faire une demande' : 'Se connecter pour demander'}
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}

              {filteredCategories.length === 0 && (
                <div className="text-center py-12">
                  <Search className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucun service trouvé pour votre recherche</p>
                  <Button variant="link" onClick={() => { setSearchQuery(''); setSelectedCategory('all') }}>
                    Réinitialiser les filtres
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════
              SUIVI DE DEMANDE
          ═══════════════════════════════════════════════════════ */}
          <TabsContent value="suivi">
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="size-5 text-[#0B2E58] dark:text-[#3B7DD8]" />
                  Suivi de votre demande
                </CardTitle>
                <CardDescription>Entrez votre numéro de référence pour suivre l&apos;avancement de votre démarche</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Ex: GN-2026-012345"
                      value={trackingNumber}
                      onChange={e => { setTrackingNumber(e.target.value); setTrackingError(false) }}
                      className="pl-10"
                      onKeyDown={e => e.key === 'Enter' && handleTrack()}
                    />
                  </div>
                  <Button onClick={handleTrack} className="bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-[#3B7DD8] dark:hover:bg-[#3B7DD8]/90 gap-2 text-white">
                    <Search className="h-4 w-4" />
                    Rechercher
                  </Button>
                </div>

                <AnimatePresence mode="wait">
                  {trackedRequest ? (
                    <motion.div
                      key={trackedRequest.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <Card className="border-2 border-[#0B2E58]/10 dark:border-[#3B7DD8]/20">
                        <CardContent className="p-6 space-y-6">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-bold text-lg">{trackedRequest.serviceName}</h3>
                              <p className="text-sm text-muted-foreground font-mono">{trackedRequest.reference}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Service compétent : <span className="font-medium">{trackedRequest.assignedService}</span>
                              </p>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${STATUS_CONFIG[trackedRequest.status].color}`}>
                              {(() => { const Icon = STATUS_CONFIG[trackedRequest.status].icon; return <Icon className="size-3.5" /> })()}
                              {STATUS_CONFIG[trackedRequest.status].label}
                            </span>
                          </div>

                          <Separator />

                          {/* Citizen info */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Demandeur</p>
                              <p className="font-medium">{trackedRequest.citizenFirstName} {trackedRequest.citizenName}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Date de soumission</p>
                              <p className="font-medium">{new Date(trackedRequest.createdAt).toLocaleDateString('fr-FR')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Mode de livraison</p>
                              <p className="font-medium">{trackedRequest.deliveryMode === 'en_ligne' ? 'En ligne' : trackedRequest.deliveryMode === 'guichet' ? 'Au guichet' : 'Par courrier'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Agent traitant</p>
                              <p className="font-medium">{trackedRequest.assignedAgent || 'En attente d\'assignation'}</p>
                            </div>
                          </div>

                          <Separator />

                          {/* Timeline */}
                          <div>
                            <h4 className="text-sm font-semibold mb-4">Avancement de votre demande</h4>
                            <div className="relative">
                              <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-muted" />
                              <div className="space-y-5">
                                {trackedRequest.timeline.map((step, i) => (
                                  <div key={i} className="flex gap-4 relative">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${
                                      step.status === 'completed' ? 'bg-emerald-500 text-white' :
                                      step.status === 'current' ? 'bg-[#0B2E58] text-white dark:bg-[#3B7DD8]' :
                                      'bg-muted text-muted-foreground'
                                    }`}>
                                      {step.status === 'completed' ? (
                                        <Check className="h-4 w-4" />
                                      ) : step.status === 'current' ? (
                                        <Clock className="h-3.5 w-3.5" />
                                      ) : (
                                        <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                                      )}
                                    </div>
                                    <div>
                                      <p className={`text-sm font-medium ${step.status === 'pending' ? 'text-muted-foreground' : ''}`}>
                                        {step.label}
                                      </p>
                                      {step.date && (
                                        <p className="text-xs text-muted-foreground">{new Date(step.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                      )}
                                      {step.agent && (
                                        <p className="text-xs text-[#0B2E58] dark:text-[#3B7DD8]">{step.agent}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Processing notes visible to citizen */}
                          {trackedRequest.processingNotes.filter(n => n.type === 'notification' || n.type === 'info_complementaire').length > 0 && (
                            <>
                              <Separator />
                              <div>
                                <h4 className="text-sm font-semibold mb-3">Notifications</h4>
                                <div className="space-y-2">
                                  {trackedRequest.processingNotes
                                    .filter(n => n.type === 'notification' || n.type === 'info_complementaire')
                                    .map((note, i) => (
                                      <div key={i} className={`p-3 rounded-lg text-sm ${
                                        note.type === 'info_complementaire'
                                          ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40'
                                          : 'bg-muted/50 border border-muted'
                                      }`}>
                                        <div className="flex items-center gap-2 mb-1">
                                          {note.type === 'info_complementaire' ? (
                                            <AlertCircle className="size-3.5 text-orange-500" />
                                          ) : (
                                            <Bell className="size-3.5 text-muted-foreground" />
                                          )}
                                          <span className="font-medium text-xs">{note.author}</span>
                                          <span className="text-[10px] text-muted-foreground">{new Date(note.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{note.text}</p>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            </>
                          )}

                          {/* Delivery info when ready */}
                          {(trackedRequest.status === 'prete' || trackedRequest.status === 'livree') && (
                            <>
                              <Separator />
                              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
                                <div className="flex items-center gap-3 mb-2">
                                  <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                                  <h4 className="font-semibold text-emerald-700 dark:text-emerald-400">
                                    {trackedRequest.status === 'livree' ? 'Document livré' : 'Document prêt'}
                                  </h4>
                                </div>
                                {trackedRequest.deliveryMode === 'guichet' && trackedRequest.deliveryLocation && (
                                  <p className="text-sm text-muted-foreground">
                                    Retirez votre document au : <span className="font-medium text-emerald-700 dark:text-emerald-400">{trackedRequest.deliveryLocation}</span>
                                  </p>
                                )}
                                {trackedRequest.deliveryMode === 'en_ligne' && (
                                  <p className="text-sm text-muted-foreground">
                                    Votre document est disponible en ligne dans votre espace personnel.
                                  </p>
                                )}
                                {trackedRequest.deliveryMode === 'courrier' && (
                                  <p className="text-sm text-muted-foreground">
                                    Votre document a été envoyé par courrier à votre adresse.
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ) : trackingError ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                      <AlertCircle className="size-12 text-red-400 mx-auto mb-3" />
                      <p className="font-medium text-red-600 dark:text-red-400">Aucune demande trouvée</p>
                      <p className="text-sm text-muted-foreground mt-1">Vérifiez votre numéro de référence (format : GN-2026-XXXXXX)</p>
                    </motion.div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Entrez votre numéro de référence pour suivre votre demande</p>
                    </div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════
              MES DEMANDES
          ═══════════════════════════════════════════════════════ */}
          <TabsContent value="mes-demandes">
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Mes demandes récentes</CardTitle>
                <CardDescription>Historique de vos demandes soumises lors de cette session</CardDescription>
              </CardHeader>
              <CardContent>
                {myRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Vous n&apos;avez pas encore soumis de demande</p>
                    <Button className="mt-4 bg-[#0B2E58] hover:bg-[#0B2E58]/90 text-white" onClick={() => setActiveTab('services')}>
                      Voir les services disponibles
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myRequests.map(req => {
                      const sConfig = STATUS_CONFIG[req.status]
                      const SIcon = sConfig.icon
                      return (
                        <Card key={req.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setTrackingNumber(req.reference); setTrackedRequest(req); setActiveTab('suivi') }}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`size-10 rounded-xl flex items-center justify-center ${sConfig.color}`}>
                                  <SIcon className="size-5" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{req.serviceName}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{req.reference}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${sConfig.color}`}>
                                  <SIcon className="size-3" />
                                  {sConfig.label}
                                </span>
                                <p className="text-[10px] text-muted-foreground mt-1">{new Date(req.createdAt).toLocaleDateString('fr-FR')}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ═══════════════════════════════════════════════════════════
            FOOTER — LEGAL
        ═══════════════════════════════════════════════════════════ */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-sm border-[#0B2E58]/5 dark:border-[#3B7DD8]/10 bg-gradient-to-r from-[#0B2E58]/[0.02] to-[#C8A45C]/[0.02] dark:from-[#3B7DD8]/[0.05] dark:to-[#D4B878]/[0.03]">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-start gap-3">
                <Shield className="size-4 text-[#0B2E58] dark:text-[#3B7DD8] mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Conformément à la Loi n°L/2016/018/AN relative à la protection des données personnelles,
                  vos informations sont traitées de manière confidentielle. Vos données ne sont partagées qu&apos;avec
                  le service administratif compétent pour le traitement de votre demande.
                </p>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <Landmark className="size-4 text-[#C8A45C] dark:text-[#D4B878] mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Service offert par le Ministère des Postes, Télécommunications et de l&apos;Économie Numérique —
                  République de Guinée
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════
          REQUEST FORM DIALOG
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {selectedCategoryInfo && selectedService && (
                <div className={`p-2 rounded-lg ${selectedCategoryInfo.iconBgColor}`}>
                  <selectedService.icon className={`size-5 ${selectedCategoryInfo.textColor}`} />
                </div>
              )}
              {selectedService?.name}
            </DialogTitle>
            <DialogDescription>{selectedService?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Service info */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <Clock className="size-4 text-[#0B2E58] dark:text-[#3B7DD8] mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">Délai</p>
                <p className="text-sm font-bold">{selectedService?.delay}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <CreditCard className="size-4 text-[#C8A45C] dark:text-[#D4B878] mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">Frais</p>
                <p className="text-sm font-bold">{selectedService?.price}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <Building2 className="size-4 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">Service</p>
                <p className="text-xs font-bold leading-tight">{selectedCategoryInfo?.name}</p>
              </div>
            </div>

            {/* Required documents */}
            {selectedService && selectedService.requiredDocs.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
                <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-2">
                  <AlertCircle className="size-4" />
                  Pièces justificatives requises
                </h4>
                <ul className="space-y-1">
                  {selectedService.requiredDocs.map((doc, i) => (
                    <li key={i} className="text-xs text-amber-600 dark:text-amber-300 flex items-center gap-2">
                      <Check className="size-3 shrink-0" />
                      {doc}
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-amber-600/70 dark:text-amber-400/60 mt-2">
                  Veuillez vous assurer que vous disposez de ces documents avant de soumettre votre demande.
                </p>
              </div>
            )}

            <Separator />

            {/* Citizen information */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Users className="size-4 text-[#0B2E58] dark:text-[#3B7DD8]" />
                Vos informations
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nom <span className="text-red-500">*</span></Label>
                  <Input placeholder="DIALLO" value={form.citizenName} onChange={e => setForm(p => ({ ...p, citizenName: e.target.value }))} className={formErrors.citizenName ? 'border-red-500' : ''} />
                  {formErrors.citizenName && <p className="text-[10px] text-red-500">{formErrors.citizenName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Prénom <span className="text-red-500">*</span></Label>
                  <Input placeholder="Mamadou" value={form.citizenFirstName} onChange={e => setForm(p => ({ ...p, citizenFirstName: e.target.value }))} className={formErrors.citizenFirstName ? 'border-red-500' : ''} />
                  {formErrors.citizenFirstName && <p className="text-[10px] text-red-500">{formErrors.citizenFirstName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">NIN (Numéro d&apos;Identification National) <span className="text-red-500">*</span></Label>
                  <Input placeholder="XXXX-XXXX-XXXX" value={form.citizenNIN} onChange={e => setForm(p => ({ ...p, citizenNIN: e.target.value }))} className={formErrors.citizenNIN ? 'border-red-500' : ''} />
                  {formErrors.citizenNIN && <p className="text-[10px] text-red-500">{formErrors.citizenNIN}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Téléphone <span className="text-red-500">*</span></Label>
                  <Input placeholder="+224 XXX XX XX XX" value={form.citizenPhone} onChange={e => setForm(p => ({ ...p, citizenPhone: e.target.value }))} className={formErrors.citizenPhone ? 'border-red-500' : ''} />
                  {formErrors.citizenPhone && <p className="text-[10px] text-red-500">{formErrors.citizenPhone}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input placeholder="mamadou.diallo@email.com" value={form.citizenEmail} onChange={e => setForm(p => ({ ...p, citizenEmail: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Adresse <span className="text-red-500">*</span></Label>
                  <Input placeholder="Conakry, Matam, Hamdallaye" value={form.citizenAddress} onChange={e => setForm(p => ({ ...p, citizenAddress: e.target.value }))} className={formErrors.citizenAddress ? 'border-red-500' : ''} />
                  {formErrors.citizenAddress && <p className="text-[10px] text-red-500">{formErrors.citizenAddress}</p>}
                </div>
              </div>
            </div>

            {/* Motif */}
            <div className="space-y-1.5">
              <Label className="text-xs">Motif de la demande (optionnel)</Label>
              <Textarea
                placeholder="Précisez le motif de votre demande..."
                value={form.motif}
                onChange={e => setForm(p => ({ ...p, motif: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Delivery mode */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold">Mode de livraison</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'guichet' as const, label: 'Au guichet', desc: 'Retrait au service compétent', icon: Building2 },
                  { value: 'en_ligne' as const, label: 'En ligne', desc: 'Document numérique', icon: Download },
                  { value: 'courrier' as const, label: 'Par courrier', desc: 'Envoi postal', icon: Mail },
                ].map(option => (
                  <div
                    key={option.value}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all text-center ${
                      form.deliveryMode === option.value
                        ? 'border-[#0B2E58] dark:border-[#3B7DD8] bg-[#0B2E58]/5 dark:bg-[#3B7DD8]/10'
                        : 'border-muted hover:border-muted-foreground/30'
                    }`}
                    onClick={() => setForm(p => ({ ...p, deliveryMode: option.value }))}
                  >
                    <option.icon className={`size-5 mx-auto mb-1 ${form.deliveryMode === option.value ? 'text-[#0B2E58] dark:text-[#3B7DD8]' : 'text-muted-foreground'}`} />
                    <p className={`text-xs font-medium ${form.deliveryMode === option.value ? 'text-[#0B2E58] dark:text-[#3B7DD8]' : ''}`}>{option.label}</p>
                    <p className="text-[10px] text-muted-foreground">{option.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Checkbox checked={acceptedTerms} onCheckedChange={(checked) => setAcceptedTerms(!!checked)} className="mt-0.5" />
              <p className="text-xs text-muted-foreground">
                J&apos;atteste que les informations fournies sont exactes et j&apos;accepte le traitement de mes données personnelles
                conformément à la Loi n°L/2016/018/AN relative à la protection des données personnelles en République de Guinée.
              </p>
            </div>
            {formErrors.terms && <p className="text-[10px] text-red-500">{formErrors.terms}</p>}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>Annuler</Button>
            <Button className="bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-[#3B7DD8] dark:hover:bg-[#3B7DD8]/90 text-white gap-2" onClick={handleSubmitRequest}>
              <Send className="size-4" />
              Soumettre la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Toast */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-[100] max-w-md flex items-center gap-3 rounded-xl bg-emerald-600 px-5 py-4 text-white text-sm font-medium shadow-2xl"
          >
            <CheckCircle2 className="size-5 shrink-0" />
            <div>
              <p>{successToast}</p>
              {submittedRef && (
                <p className="text-emerald-200 text-xs mt-0.5 font-mono">Référence : {submittedRef}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
