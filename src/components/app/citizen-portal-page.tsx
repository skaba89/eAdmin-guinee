'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, FileText, Clock, CheckCircle2, Upload, Search,
  Building2, CreditCard, MessageSquare, Phone, Mail,
  ChevronRight, MapPin, Calendar, QrCode, Bell,
  Home, Briefcase, GraduationCap, Heart, Scale, Car,
  Shield, Baby, Church, Stethoscope, IdCard, Stamp,
  Globe, Smartphone, Hash, Landmark, Award, BookOpen,
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

// ─── GUINEA BRAND COLORS ─────────────────────────────────────────────────────
const GUINEA_RED = '#CE1126'
const GUINEA_YELLOW = '#FCD116'
const GUINEA_GREEN = '#009460'

// ─── SERVICE CATEGORY DEFINITIONS ────────────────────────────────────────────
interface ServiceItem {
  id: string
  name: string
  description: string
  icon: React.ElementType
  price: string
  delay: string
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
    id: 'etat-civil',
    name: 'État Civil',
    color: 'bg-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    iconBgColor: 'bg-blue-100 dark:bg-blue-900/40',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800/40',
    services: [
      { id: 'ec-1', name: "Extrait d'acte de naissance", description: "Copie intégrale ou extrait d'acte de naissance", icon: Baby, price: 'Gratuit', delay: '48h' },
      { id: 'ec-2', name: "Extrait d'acte de mariage", description: "Attestation officielle d'acte de mariage", icon: Heart, price: 'Gratuit', delay: '48h' },
      { id: 'ec-3', name: "Extrait d'acte de décès", description: "Document officiel d'acte de décès", icon: Church, price: 'Gratuit', delay: '48h' },
      { id: 'ec-4', name: 'Certificat de nationalité', description: "Attestation de nationalité guinéenne", icon: Shield, price: '5 000 GNF', delay: '5 jours' },
      { id: 'ec-5', name: 'Déclaration de naissance', description: "Enregistrement d'une naissance à l'état civil", icon: Baby, price: 'Gratuit', delay: '24h' },
    ],
  },
  {
    id: 'justice',
    name: 'Justice & Légal',
    color: 'bg-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    iconBgColor: 'bg-purple-100 dark:bg-purple-900/40',
    textColor: 'text-purple-600 dark:text-purple-400',
    borderColor: 'border-purple-200 dark:border-purple-800/40',
    services: [
      { id: 'j-1', name: 'Casier judiciaire', description: 'Extrait de casier judiciaire B3', icon: Scale, price: '5 000 GNF', delay: '5 jours' },
      { id: 'j-2', name: 'Certificat de non-poursuite', description: 'Attestation de non-poursuite judiciaire', icon: FileText, price: '3 000 GNF', delay: '3 jours' },
      { id: 'j-3', name: 'Légalisation de documents', description: 'Authentification officielle de documents', icon: Stamp, price: '2 000 GNF', delay: '24h' },
      { id: 'j-4', name: 'Attestation de prise en charge', description: 'Attestation officielle de prise en charge', icon: CheckCircle2, price: 'Gratuit', delay: '48h' },
    ],
  },
  {
    id: 'identification',
    name: 'Identification',
    color: 'bg-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    iconBgColor: 'bg-green-100 dark:bg-green-900/40',
    textColor: 'text-green-600 dark:text-green-400',
    borderColor: 'border-green-200 dark:border-green-800/40',
    services: [
      { id: 'id-1', name: "Carte d'identité nationale biométrique", description: "CNI biométrique sécurisée avec puces", icon: IdCard, price: 'Gratuit', delay: '7 jours' },
      { id: 'id-2', name: 'Passeport biométrique', description: 'Passeport biométrique international', icon: Globe, price: '150 000 GNF', delay: '10 jours' },
      { id: 'id-3', name: 'Permis de conduire', description: 'Permis de conduire national ou international', icon: Car, price: '25 000 GNF', delay: '10 jours' },
    ],
  },
  {
    id: 'urbanisme',
    name: 'Urbanisme & Construction',
    color: 'bg-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    iconBgColor: 'bg-orange-100 dark:bg-orange-900/40',
    textColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-200 dark:border-orange-800/40',
    services: [
      { id: 'u-1', name: 'Permis de construire', description: 'Autorisation de construction immobilière', icon: Building2, price: '50 000 GNF', delay: '15 jours' },
      { id: 'u-2', name: 'Certificat de conformité', description: 'Conformité aux normes de construction', icon: CheckCircle2, price: '20 000 GNF', delay: '7 jours' },
      { id: 'u-3', name: 'Autorisation de lotissement', description: 'Autorisation de division parcellaire', icon: MapPin, price: '100 000 GNF', delay: '20 jours' },
    ],
  },
  {
    id: 'entreprise',
    name: 'Entreprise & Commerce',
    color: 'bg-teal-600',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    iconBgColor: 'bg-teal-100 dark:bg-teal-900/40',
    textColor: 'text-teal-600 dark:text-teal-400',
    borderColor: 'border-teal-200 dark:border-teal-800/40',
    services: [
      { id: 'e-1', name: 'Enregistrement entreprise (APIP)', description: "Création d'entreprise via l'APIP", icon: Briefcase, price: '50 000 GNF', delay: '3 jours' },
      { id: 'e-2', name: 'Registre de commerce', description: 'Immatriculation au RCCM', icon: BookOpen, price: '100 000 GNF', delay: '7 jours' },
      { id: 'e-3', name: 'Patente', description: "Enregistrement fiscal pour activités commerciales", icon: Landmark, price: '25 000 GNF', delay: '5 jours' },
      { id: 'e-4', name: 'Certificat fiscal', description: 'Attestation de situation fiscale', icon: FileText, price: '10 000 GNF', delay: '3 jours' },
    ],
  },
  {
    id: 'education',
    name: 'Éducation',
    color: 'bg-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    iconBgColor: 'bg-indigo-100 dark:bg-indigo-900/40',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    borderColor: 'border-indigo-200 dark:border-indigo-800/40',
    services: [
      { id: 'ed-1', name: 'Attestation de scolarité', description: "Certificat de fréquentation scolaire", icon: GraduationCap, price: 'Gratuit', delay: '48h' },
      { id: 'ed-2', name: 'Diplôme et relevé de notes', description: 'Copie certifiée de diplôme et relevé', icon: Award, price: '10 000 GNF', delay: '5 jours' },
      { id: 'ed-3', name: 'Équivalence de diplôme', description: "Reconnaissance d'un diplôme étranger", icon: BookOpen, price: '50 000 GNF', delay: '30 jours' },
    ],
  },
  {
    id: 'sante',
    name: 'Santé',
    color: 'bg-red-600',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    iconBgColor: 'bg-red-100 dark:bg-red-900/40',
    textColor: 'text-red-600 dark:text-red-400',
    borderColor: 'border-red-200 dark:border-red-800/40',
    services: [
      { id: 's-1', name: 'Certificat de vaccination', description: 'Carnet ou certificat de vaccination international', icon: Stethoscope, price: 'Gratuit', delay: '24h' },
      { id: 's-2', name: 'Carte sanitaire', description: "Carte nationale d'assurance maladie", icon: Heart, price: '2 000 GNF', delay: '5 jours' },
      { id: 's-3', name: "Permis d'importation pharmaceutique", description: "Autorisation d'importer des produits pharmaceutiques", icon: FileText, price: '100 000 GNF', delay: '15 jours' },
    ],
  },
  {
    id: 'residence',
    name: 'Résidence & Citoyenneté',
    color: 'bg-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    iconBgColor: 'bg-amber-100 dark:bg-amber-900/40',
    textColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800/40',
    services: [
      { id: 'r-1', name: 'Certificat de résidence', description: 'Attestation de domicile délivrée par la mairie', icon: Home, price: 'Gratuit', delay: '24h' },
      { id: 'r-2', name: 'Attestation de domicile', description: "Attestation de lieu d'habitation", icon: MapPin, price: '1 000 GNF', delay: '24h' },
      { id: 'r-3', name: 'Carte de résident', description: 'Carte de résident pour étrangers', icon: CreditCard, price: '50 000 GNF', delay: '15 jours' },
    ],
  },
]

// ─── DOSSIER TRACKING ────────────────────────────────────────────────────────
interface Dossier {
  id: string
  number: string
  service: string
  status: 'soumis' | 'en_cours' | 'pret' | 'livré'
  date: string
  steps: { name: string; status: 'completed' | 'current' | 'pending'; date?: string }[]
}

const DOSSIERS: Dossier[] = [
  {
    id: '1', number: 'GN-2026-012345', service: "Extrait d'acte de naissance", status: 'en_cours', date: '2026-01-15',
    steps: [
      { name: 'Soumission en ligne', status: 'completed', date: '2026-01-15' },
      { name: 'Vérification pièces justificatives', status: 'completed', date: '2026-01-16' },
      { name: 'Traitement par la commune', status: 'current' },
      { name: 'Validation par le maire', status: 'pending' },
      { name: 'Document prêt', status: 'pending' },
      { name: 'Livraison', status: 'pending' },
    ],
  },
  {
    id: '2', number: 'GN-2026-011892', service: 'Certificat de résidence', status: 'pret', date: '2026-01-12',
    steps: [
      { name: 'Soumission en ligne', status: 'completed', date: '2026-01-12' },
      { name: 'Vérification pièces justificatives', status: 'completed', date: '2026-01-12' },
      { name: 'Traitement par la commune', status: 'completed', date: '2026-01-13' },
      { name: 'Validation par le maire', status: 'completed', date: '2026-01-14' },
      { name: 'Document prêt', status: 'current' },
      { name: 'Livraison', status: 'pending' },
    ],
  },
  {
    id: '3', number: 'GN-2026-010756', service: "Carte d'identité nationale biométrique", status: 'soumis', date: '2026-01-18',
    steps: [
      { name: 'Soumission en ligne', status: 'completed', date: '2026-01-18' },
      { name: 'Vérification pièces justificatives', status: 'current' },
      { name: 'Prise empreintes biométriques', status: 'pending' },
      { name: 'Fabrication carte', status: 'pending' },
      { name: 'Document prêt', status: 'pending' },
      { name: 'Livraison', status: 'pending' },
    ],
  },
]

const STATUS_MAP = {
  soumis: { label: 'Soumis', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
  en_cours: { label: 'En cours', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  pret: { label: 'Prêt', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  livré: { label: 'Livré', color: 'bg-[#0B2E58]/10 text-[#0B2E58] dark:bg-[#3B7DD8]/20 dark:text-[#3B7DD8]' },
}

// ─── STATS BANNER DATA ───────────────────────────────────────────────────────
const STATS_BANNER = [
  { value: '124 500', label: 'citoyens inscrits', icon: Users },
  { value: '8 730', label: 'demandes traitées', icon: CheckCircle2 },
  { value: '94%', label: 'taux de satisfaction', icon: Heart },
  { value: '48h', label: 'délai moyen', icon: Clock },
]

// ─── ANIMATION VARIANTS ─────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export function CitizenPortalPage() {
  const [activeTab, setActiveTab] = useState('services')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackedDossier, setTrackedDossier] = useState<Dossier | null>(null)
  const [notifPrefs, setNotifPrefs] = useState({ whatsapp: true, sms: false, email: true, ussd: false })

  const handleTrack = () => {
    const found = DOSSIERS.find(d => d.number === trackingNumber || d.number.includes(trackingNumber))
    setTrackedDossier(found || null)
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-4 md:p-6"
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          HEADER — GUINÉE SERVICES PUBLICS
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="glass-card overflow-hidden border-[#C8A45C]/20 dark:border-[#D4B878]/20 bg-gradient-to-br from-[#0B2E58]/[0.03] via-transparent to-[#C8A45C]/[0.03] dark:from-[#3B7DD8]/[0.05] dark:to-[#D4B878]/[0.03]">
          <CardContent className="py-8 text-center">
            {/* Guinea tricolor accent */}
            <div className="flex items-center justify-center gap-1 mb-4">
              <div className="h-1 w-12 rounded-full" style={{ backgroundColor: GUINEA_RED }} />
              <div className="h-1 w-12 rounded-full" style={{ backgroundColor: GUINEA_YELLOW }} />
              <div className="h-1 w-12 rounded-full" style={{ backgroundColor: GUINEA_GREEN }} />
            </div>

            <div className="flex size-14 items-center justify-center rounded-2xl bg-[#0B2E58] dark:bg-[#3B7DD8] mx-auto mb-4 shadow-lg">
              <Landmark className="size-7 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-[#0B2E58] dark:text-white">
              Guinée Services Publics
            </h2>
            <p className="text-muted-foreground mt-1 max-w-lg mx-auto text-sm">
              Portail officiel des démarches administratives — République de Guinée
            </p>
            <Badge className="mt-3 bg-[#C8A45C] text-[#0B2E58] hover:bg-[#C8A45C]/90 border-0 font-semibold text-xs gap-1.5 shadow-sm">
              <Globe className="size-3" />
              Service Public Numérique
            </Badge>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          STATS BANNER
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATS_BANNER.map((stat) => (
            <Card key={stat.label} className="shadow-sm border-[#0B2E58]/5 dark:border-[#3B7DD8]/10">
              <CardContent className="p-4 text-center">
                <stat.icon className="size-5 mx-auto mb-1.5 text-[#0B2E58] dark:text-[#3B7DD8]" />
                <p className="text-xl font-bold text-[#0B2E58] dark:text-white">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TABS NAVIGATION
      ═══════════════════════════════════════════════════════════════════════ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="services" className="gap-1">Services</TabsTrigger>
          <TabsTrigger value="suivi" className="gap-1">Suivi</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1">Notifications</TabsTrigger>
          <TabsTrigger value="recu" className="gap-1">Reçu</TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════
            SERVICES CATALOG — GROUPED BY CATEGORY
        ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="services">
          <div className="space-y-6 mt-4">
            {SERVICE_CATEGORIES.map((category, catIndex) => (
              <motion.div
                key={category.id}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: catIndex * 0.05 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`h-1.5 w-1.5 rounded-full ${category.color}`} />
                  <h3 className={`text-sm font-semibold ${category.textColor}`}>
                    {category.name}
                  </h3>
                  <div className="flex-1 h-px bg-border" />
                  <Badge variant="outline" className="text-[10px]">
                    {category.services.length} service{category.services.length > 1 ? 's' : ''}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {category.services.map((service, i) => (
                    <motion.div
                      key={service.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Card className={`hover:shadow-lg transition-all cursor-pointer group h-full border ${category.borderColor}`}>
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
                          <Button size="sm" className={`w-full gap-1 text-xs h-8 ${category.color} hover:opacity-90 text-white border-0`}>
                            Demander
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TRACKING — SUIVI DE DOSSIER
        ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="suivi">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Suivi de dossier</CardTitle>
              <CardDescription>Entrez votre numéro de suivi pour suivre l&apos;avancement de votre démarche</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ex: GN-2026-012345"
                    value={trackingNumber}
                    onChange={e => setTrackingNumber(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleTrack} className="bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-[#3B7DD8] dark:hover:bg-[#3B7DD8]/90 gap-2 text-white">
                  <Search className="h-4 w-4" />
                  Rechercher
                </Button>
              </div>

              {/* Dossier result */}
              <AnimatePresence mode="wait">
                {trackedDossier ? (
                  <motion.div
                    key={trackedDossier.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="glass-card">
                      <CardContent className="p-6 space-y-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{trackedDossier.service}</h3>
                            <p className="text-sm text-muted-foreground font-mono">{trackedDossier.number}</p>
                          </div>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_MAP[trackedDossier.status].color}`}>
                            {STATUS_MAP[trackedDossier.status].label}
                          </span>
                        </div>

                        {/* Status Timeline */}
                        <div className="relative">
                          <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-muted" />
                          <div className="space-y-6">
                            {trackedDossier.steps.map((step, i) => (
                              <div key={i} className="flex gap-4 relative">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${
                                  step.status === 'completed' ? 'bg-emerald-500 text-white' :
                                  step.status === 'current' ? 'bg-[#0B2E58] text-white dark:bg-[#3B7DD8]' :
                                  'bg-muted text-muted-foreground'
                                }`}>
                                  {step.status === 'completed' ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                  ) : step.status === 'current' ? (
                                    <Clock className="h-3.5 w-3.5" />
                                  ) : (
                                    <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                                  )}
                                </div>
                                <div>
                                  <p className={`text-sm font-medium ${step.status === 'pending' ? 'text-muted-foreground' : ''}`}>
                                    {step.name}
                                  </p>
                                  {step.date && (
                                    <p className="text-xs text-muted-foreground">{step.date}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : trackingNumber && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
                    <p className="text-muted-foreground">Aucun dossier trouvé pour ce numéro</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Recent dossiers */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Dossiers récents</h4>
                <div className="space-y-2">
                  {DOSSIERS.map(d => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => { setTrackingNumber(d.number); setTrackedDossier(d) }}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-[#0B2E58] dark:text-[#3B7DD8]" />
                        <div>
                          <p className="text-sm font-medium">{d.service}</p>
                          <p className="text-xs text-muted-foreground font-mono">{d.number}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_MAP[d.status].color}`}>
                        {STATUS_MAP[d.status].label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            NOTIFICATION PREFERENCES
        ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="notifications">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Préférences de notification</CardTitle>
              <CardDescription>Choisissez comment recevoir les mises à jour de vos démarches</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Canaux de notification</h4>
                {[
                  { key: 'whatsapp' as const, label: 'WhatsApp', desc: 'Recevez vos notifications via WhatsApp — canal principal en Guinée', icon: MessageSquare, color: 'text-green-600 dark:text-green-400', badge: 'Recommandé' },
                  { key: 'sms' as const, label: 'SMS Orange/MTN/Cellcom', desc: 'Recevez des SMS sur votre téléphone mobile', icon: Phone, color: 'text-sky-600 dark:text-sky-400', badge: null },
                  { key: 'email' as const, label: 'Email', desc: 'Recevez des notifications par courrier électronique', icon: Mail, color: 'text-amber-600 dark:text-amber-400', badge: null },
                  { key: 'ussd' as const, label: 'USSD (*144#)', desc: 'Consultez vos démarches via le code USSD *144#', icon: Hash, color: 'text-purple-600 dark:text-purple-400', badge: 'Nouveau' },
                ].map(channel => (
                  <div key={channel.key} className="flex items-center justify-between p-4 rounded-xl border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <channel.icon className={`h-5 w-5 ${channel.color}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{channel.label}</p>
                          {channel.badge && (
                            <Badge className={`text-[9px] h-4 px-1.5 border-0 ${
                              channel.badge === 'Recommandé' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                              'bg-[#C8A45C]/10 text-[#C8A45C] dark:bg-[#D4B878]/20 dark:text-[#D4B878]'
                            }`}>
                              {channel.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{channel.desc}</p>
                      </div>
                    </div>
                    <Checkbox
                      checked={notifPrefs[channel.key]}
                      onCheckedChange={(checked) => setNotifPrefs(prev => ({ ...prev, [channel.key]: !!checked }))}
                    />
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Types d&apos;événements</h4>
                {[
                  'Dossier soumis', 'Dossier en cours de traitement', 'Document prêt',
                  'Demande de pièces complémentaires', 'Dossier livré', 'Rappel de renouvellement'
                ].map(event => (
                  <div key={event} className="flex items-center justify-between py-2">
                    <span className="text-sm">{event}</span>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {notifPrefs.whatsapp && <span className="text-green-600 dark:text-green-400">WhatsApp</span>}
                      {notifPrefs.sms && <span className="text-sky-600 dark:text-sky-400">SMS</span>}
                      {notifPrefs.email && <span className="text-amber-600 dark:text-amber-400">Email</span>}
                      {notifPrefs.ussd && <span className="text-purple-600 dark:text-purple-400">USSD</span>}
                    </div>
                  </div>
                ))}
              </div>

              <Button className="bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-[#3B7DD8] dark:hover:bg-[#3B7DD8]/90 text-white">
                Enregistrer les préférences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            DIGITAL RECEIPT
        ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="recu">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Reçu digital officiel</CardTitle>
              <CardDescription>Aperçu du reçu officiel de votre démarche</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-lg mx-auto">
                <div className="rounded-xl border-2 border-dashed border-[#0B2E58]/15 dark:border-[#3B7DD8]/30 p-6 bg-gradient-to-br from-white via-[#0B2E58]/[0.01] to-[#C8A45C]/[0.01] dark:from-card dark:via-[#3B7DD8]/[0.02] dark:to-[#D4B878]/[0.02]">
                  {/* Guinea tricolor top */}
                  <div className="flex gap-0 mb-4 -mx-6 -mt-6">
                    <div className="flex-1 h-1.5 rounded-tl-xl" style={{ backgroundColor: GUINEA_RED }} />
                    <div className="flex-1 h-1.5" style={{ backgroundColor: GUINEA_YELLOW }} />
                    <div className="flex-1 h-1.5 rounded-tr-xl" style={{ backgroundColor: GUINEA_GREEN }} />
                  </div>

                  {/* Coat of arms placeholder */}
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex size-20 items-center justify-center rounded-full bg-[#0B2E58]/5 dark:bg-[#3B7DD8]/10 border-2 border-[#C8A45C]/30 dark:border-[#D4B878]/30">
                      <Landmark className="size-10 text-[#0B2E58]/40 dark:text-[#3B7DD8]/40" />
                    </div>
                  </div>

                  {/* Official header */}
                  <div className="text-center mb-4">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                      République de Guinée
                    </p>
                    <p className="text-xs font-bold text-[#0B2E58] dark:text-white mt-0.5">
                      Travaux · Justice · Solidarité
                    </p>
                    <Separator className="my-3" />
                    <h4 className="text-sm font-bold text-[#0B2E58] dark:text-white">
                      Reçu de Demande Administrative
                    </h4>
                  </div>

                  {/* Receipt details */}
                  <div className="space-y-2 text-xs mb-4">
                    <div className="flex justify-between py-1.5 border-b border-dashed border-muted">
                      <span className="text-muted-foreground">N° de suivi:</span>
                      <span className="font-mono font-semibold text-[#0B2E58] dark:text-[#3B7DD8]">GN-2026-012345</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-dashed border-muted">
                      <span className="text-muted-foreground">Service demandé:</span>
                      <span className="font-medium">Extrait d&apos;acte de naissance</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-dashed border-muted">
                      <span className="text-muted-foreground">Date de soumission:</span>
                      <span className="font-mono">15/01/2026</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-dashed border-muted">
                      <span className="text-muted-foreground">Demandeur:</span>
                      <span className="font-medium">DIALLO Mamadou</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-dashed border-muted">
                      <span className="text-muted-foreground">NIN:</span>
                      <span className="font-mono">XXXX-XXXX-1234</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-dashed border-muted">
                      <span className="text-muted-foreground">Frais:</span>
                      <span className="font-semibold text-emerald-600">Gratuit</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">Statut actuel:</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                        <Clock className="size-3" />
                        En cours de traitement
                      </span>
                    </div>
                  </div>

                  {/* QR + Stamp area */}
                  <div className="flex items-start justify-between mt-4 pt-4 border-t border-dashed border-muted">
                    <div className="flex items-center gap-3">
                      <div className="size-14 rounded bg-muted/50 flex items-center justify-center border border-dashed border-muted">
                        <QrCode className="size-10 text-muted-foreground/30" />
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        <p>Scanner pour vérifier</p>
                        <p>l&apos;authenticité du document</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="size-16 rounded-full border-2 border-dashed border-[#C8A45C]/30 dark:border-[#D4B878]/30 flex items-center justify-center bg-[#C8A45C]/5 dark:bg-[#D4B878]/10">
                        <Stamp className="size-8 text-[#C8A45C]/40 dark:text-[#D4B878]/40" />
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-1">Cachet officiel</p>
                    </div>
                  </div>

                  {/* Guinea tricolor bottom */}
                  <div className="flex gap-0 mt-4 -mx-6 -mb-6">
                    <div className="flex-1 h-1.5 rounded-bl-xl" style={{ backgroundColor: GUINEA_RED }} />
                    <div className="flex-1 h-1.5" style={{ backgroundColor: GUINEA_YELLOW }} />
                    <div className="flex-1 h-1.5 rounded-br-xl" style={{ backgroundColor: GUINEA_GREEN }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════════════
          FOOTER — LEGAL & INSTITUTIONAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-sm border-[#0B2E58]/5 dark:border-[#3B7DD8]/10 bg-gradient-to-r from-[#0B2E58]/[0.02] to-[#C8A45C]/[0.02] dark:from-[#3B7DD8]/[0.05] dark:to-[#D4B878]/[0.03]">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start gap-3">
              <Shield className="size-4 text-[#0B2E58] dark:text-[#3B7DD8] mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Conformément à la Loi n°L/2016/018/AN relative à la protection des données personnelles,
                vos informations sont traitées de manière confidentielle.
              </p>
            </div>
            <Separator />
            <div className="flex items-start gap-3">
              <Landmark className="size-4 text-[#C8A45C] dark:text-[#D4B878] mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Service offert par le Ministère des Postes, Télécommunications et de l&apos;Économie Numérique
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
