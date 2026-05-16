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
  Plus, ChevronDown, XCircle, Image as ImageIcon, Trash2, File,
  Paperclip, FileCheck,
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
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { useAppStore } from '@/store/app-store'
import { useCitizenRequestsStore, type CitizenRequest, type RequestStatus, type UploadedDocument, type GeneratedDocument } from '@/store/citizen-requests-store'
import { processFile, formatFileSize, getFileTypeIcon, downloadUploadedFile, downloadCitizenDocument, ACCEPTED_FILE_TYPES, MAX_FILE_SIZE, createGeneratedDocument } from '@/lib/document-utils'

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

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; icon: React.ElementType }> = {
  soumise: { label: 'Soumise', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400', icon: Send },
  en_cours: { label: 'En cours', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  pieces_complementaires: { label: 'Pièces complémentaires', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertCircle },
  validee: { label: 'Validée', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Check },
  prete: { label: 'Document prêt', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  livree: { label: 'Livrée', color: 'bg-[#0B2E58]/10 text-[#0B2E58] dark:bg-[#3B7DD8]/20 dark:text-[#3B7DD8]', icon: Download },
  rejetee: { label: 'Rejetée', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
}

// ─── ACTIVE STATUSES vs COMPLETED ────────────────────────────────────────────
const ACTIVE_STATUSES: RequestStatus[] = ['soumise', 'en_cours', 'pieces_complementaires', 'validee', 'prete']
const COMPLETED_STATUSES: RequestStatus[] = ['livree', 'rejetee']

// ─── ANIMATION VARIANTS ─────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

// ─── PROGRESS CALCULATOR ─────────────────────────────────────────────────────
function getProgressValue(req: CitizenRequest): number {
  if (req.timeline.length === 0) return 0
  return Math.round((req.timeline.filter(s => s.status === 'completed').length / req.timeline.length) * 100)
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export function CitizenPortalPage() {
  const navigate = useAppStore((s) => s.navigate)
  const user = useAppStore((s) => s.user)
  const { requests, addRequest, getRequestByReference } = useCitizenRequestsStore()
  const [activeTab, setActiveTab] = useState('mes-demandes')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [successToast, setSuccessToast] = useState('')
  const [demandSubTab, setDemandSubTab] = useState<'active' | 'history'>('active')

  // Request dialog
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null)
  const [selectedCategoryInfo, setSelectedCategoryInfo] = useState<ServiceCategory | null>(null)

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

  // Detail view
  const [selectedRequest, setSelectedRequest] = useState<CitizenRequest | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<Map<string, UploadedDocument>>(new Map())
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({})
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  const handleOpenRequestDialog = (service: ServiceItem, category: ServiceCategory) => {
    setSelectedService(service)
    setSelectedCategoryInfo(category)
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
    setUploadedFiles(new Map())
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
      uploadedDocuments: Array.from(uploadedFiles.values()),
      createdAt: new Date().toISOString(),
      deliveryMode: form.deliveryMode,
    })

    setRequestDialogOpen(false)
    setUploadedFiles(new Map())
    setUploadErrors({})
    setSuccessToast(`Demande soumise avec succès ! Référence : ${newRequest.reference}`)
    setActiveTab('mes-demandes')
  }

  const handleViewDetail = (req: CitizenRequest) => {
    setSelectedRequest(req)
    setDetailDialogOpen(true)
  }

  const handleDownloadCitizenDocument = (req: CitizenRequest) => {
    downloadCitizenDocument(req, req.assignedAgent)
    setSuccessToast(`Document ${req.reference} téléchargé avec succès`)
  }

  // File upload handlers
  const handleFileUpload = async (file: File, requiredDocName: string) => {
    try {
      setIsUploading(true)
      setUploadErrors(prev => { const n = {...prev}; delete n[requiredDocName]; return n })
      const doc = await processFile(file, requiredDocName)
      setUploadedFiles(prev => new Map(prev).set(requiredDocName, doc))
    } catch (err: any) {
      setUploadErrors(prev => ({ ...prev, [requiredDocName]: err.message }))
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveFile = (requiredDocName: string) => {
    setUploadedFiles(prev => {
      const n = new Map(prev)
      n.delete(requiredDocName)
      return n
    })
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

  // Filter requests for the current user (by email or NIN match)
  const myRequests = user
    ? requests.filter(r =>
        r.citizenEmail === user.email ||
        r.citizenNIN === user.nin ||
        r.citizenPhone === user.phone
      )
    : requests

  // Split requests into active and completed
  const activeRequests = myRequests.filter(r => ACTIVE_STATUSES.includes(r.status))
  const completedRequests = myRequests.filter(r => COMPLETED_STATUSES.includes(r.status))

  // Stats from actual user requests
  const myStats = [
    { label: 'En cours', value: myRequests.filter(r => r.status === 'soumise' || r.status === 'en_cours').length, icon: Send, color: 'text-sky-600 dark:text-sky-400', gradientBg: 'bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-900/30 dark:to-sky-800/10' },
    { label: 'En traitement', value: myRequests.filter(r => ['en_cours', 'pieces_complementaires', 'validee'].includes(r.status)).length, icon: Clock, color: 'text-amber-600 dark:text-amber-400', gradientBg: 'bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-800/10' },
    { label: 'Documents prêts', value: myRequests.filter(r => r.status === 'prete').length, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', gradientBg: 'bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-800/10' },
    { label: 'Livrées', value: myRequests.filter(r => r.status === 'livree').length, icon: Download, color: 'text-[#0B2E58] dark:text-[#3B7DD8]', gradientBg: 'bg-gradient-to-br from-[#0B2E58]/10 to-[#3B7DD8]/5 dark:from-[#3B7DD8]/20 dark:to-[#0B2E58]/10' },
  ]

  // ─── REQUEST CARD COMPONENT ────────────────────────────────────────────────
  const RequestCard = ({ req, index }: { req: CitizenRequest; index: number }) => {
    const sConfig = STATUS_CONFIG[req.status]
    const SIcon = sConfig.icon
    const progress = getProgressValue(req)
    const isReadyOrDelivered = req.status === 'prete' || req.status === 'livree'

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ delay: index * 0.03 }}
        layout
      >
        <Card className="card-interactive cursor-pointer group" onClick={() => handleViewDetail(req)}>
          <CardContent className="p-4">
            {/* Top row: service info + status badge */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-xl backdrop-blur-sm shrink-0 ${sConfig.color}`}>
                  <SIcon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{req.serviceName}</p>
                  <p className="text-xs text-muted-foreground font-mono tracking-wide">{req.reference}</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium backdrop-blur-sm border border-white/10 dark:border-white/5 shrink-0 ${sConfig.color}`}>
                {sConfig.label}
              </span>
            </div>

            {/* Meta info */}
            <div className="space-y-1 mb-3">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Building2 className="size-3" />{req.assignedService}</span>
                <span className="flex items-center gap-1"><Calendar className="size-3" />{new Date(req.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" />
                {req.deliveryMode === 'en_ligne' ? 'Livraison en ligne' : req.deliveryMode === 'guichet' ? 'Retrait au guichet' : 'Envoi par courrier'}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>Avancement</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isReadyOrDelivered
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                      : 'bg-gradient-to-r from-[#0B2E58] via-[#3B7DD8] to-[#C8A45C] dark:from-[#3B7DD8] dark:via-[#5A96E6] dark:to-[#D4B878]'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1 h-7 text-xs"
                onClick={(e) => { e.stopPropagation(); handleViewDetail(req) }}
              >
                <Eye className="size-3" />
                Détails
              </Button>
              {isReadyOrDelivered && (
                <Button
                  size="sm"
                  className="btn-gold gap-1 h-7 text-xs"
                  onClick={(e) => { e.stopPropagation(); handleDownloadCitizenDocument(req) }}
                >
                  <Download className="size-3" />
                  Télécharger
                </Button>
              )}
            </div>

            {/* Delivery info for ready/delivered */}
            {isReadyOrDelivered && (
              <div className="mt-2 p-2 rounded-lg bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 border border-emerald-200 dark:border-emerald-800/40">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    {req.status === 'livree' ? 'Document livré' : 'Document prêt'}
                    {req.deliveryMode === 'guichet' && req.deliveryLocation && ` — ${req.deliveryLocation}`}
                    {req.deliveryMode === 'en_ligne' && ' — Disponible en ligne'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-4 md:p-6"
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          HERO HEADER — GUINÉE SERVICES PUBLICS
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="glass-premium overflow-hidden bg-gradient-to-br from-[#0B2E58] via-[#0B2E58]/95 to-[#134A8E] dark:from-[#0B2E58] dark:via-[#071D3A] dark:to-[#0B2E58] border-0">
          <CardContent className="p-6 md:p-8 text-white relative">
            {/* Guinea tricolor accent */}
            <div className="flex gap-0 mb-5 -mx-6 md:-mx-8 -mt-6 md:-mt-8">
              <div className="flex-1 h-2" style={{ background: `linear-gradient(to right, transparent, ${GUINEA_RED})` }} />
              <div className="flex-1 h-2" style={{ backgroundColor: GUINEA_RED }} />
              <div className="flex-1 h-2" style={{ background: `linear-gradient(to right, ${GUINEA_RED}, ${GUINEA_YELLOW})` }} />
              <div className="flex-1 h-2" style={{ backgroundColor: GUINEA_YELLOW }} />
              <div className="flex-1 h-2" style={{ background: `linear-gradient(to right, ${GUINEA_YELLOW}, ${GUINEA_GREEN})` }} />
              <div className="flex-1 h-2" style={{ backgroundColor: GUINEA_GREEN }} />
              <div className="flex-1 h-2" style={{ background: `linear-gradient(to right, ${GUINEA_GREEN}, transparent)` }} />
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="relative">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm shadow-xl border-2 border-[#C8A45C]/40 animate-glow-pulse">
                  <Landmark className="size-7 text-white" />
                </div>
                <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-[#C8A45C]/20 to-transparent blur-sm -z-10" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.2em] text-[#C8A45C]/70 font-medium">République de Guinée</p>
                <h2 className="text-2xl font-bold mt-0.5 tracking-tight">
                  Bienvenue, {user?.name || 'Citoyen'}
                </h2>
                <p className="text-sm text-white/60 mt-1 max-w-xl leading-relaxed">
                  Suivez vos demandes, consultez l&apos;avancement et téléchargez vos documents administratifs
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Badge className="badge-premium bg-[#C8A45C] text-[#0B2E58] hover:bg-[#C8A45C]/90 border-0 font-semibold text-xs gap-1.5 shadow-gold">
                  <Globe className="size-3" />
                  Service Public Numérique
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs gap-1.5 backdrop-blur-sm">
                  <CheckCircle2 className="size-3" />
                  {activeRequests.length} demande(s) active(s)
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          STATS ROW
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {myStats.map((stat) => (
            <Card key={stat.label} className="premium-stat group transition-all duration-300 hover:-translate-y-0.5">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`p-2.5 rounded-xl ${stat.gradientBg} ${stat.color} shadow-sm`}>
                  <stat.icon className="size-5" />
                </div>
                <div>
                  <p className="text-xl font-bold tabular-nums tracking-tight text-[#0B2E58] dark:text-white">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MAIN TABS — MES DEMANDES + NOUVELLE DEMANDE
      ═══════════════════════════════════════════════════════════════════════ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto h-auto flex-wrap gap-1 bg-muted/40 p-1.5 rounded-xl border border-[#C8A45C]/10 dark:border-[#D4B878]/5">
          <TabsTrigger value="mes-demandes" className="gap-1.5 text-sm rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0B2E58] data-[state=active]:to-[#134A8E] data-[state=active]:text-white data-[state=active]:shadow-navy dark:data-[state=active]:from-[#3B7DD8] dark:data-[state=active]:to-[#2A6BC7] transition-all duration-300">
            <FileText className="size-4" />
            Mes Demandes ({myRequests.length})
          </TabsTrigger>
          <TabsTrigger value="nouvelle-demande" className="gap-1.5 text-sm rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0B2E58] data-[state=active]:to-[#134A8E] data-[state=active]:text-white data-[state=active]:shadow-navy dark:data-[state=active]:from-[#3B7DD8] dark:data-[state=active]:to-[#2A6BC7] transition-all duration-300">
            <Plus className="size-4" />
            Nouvelle Demande
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════
            MES DEMANDES — WITH SUB-TABS (EN COURS / HISTORIQUE)
        ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="mes-demandes">
          <div className="space-y-4 mt-4">
            {myRequests.length === 0 ? (
              <Card className="glass-premium">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="size-16 text-muted-foreground/20 mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground mb-1">Aucune demande</h3>
                  <p className="text-sm text-muted-foreground mb-4">Vous n&apos;avez pas encore soumis de demande. Créez votre première demande administrative.</p>
                  <Button className="btn-premium gap-2" onClick={() => setActiveTab('nouvelle-demande')}>
                    <Plus className="size-4" />
                    Nouvelle demande
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Sub-tabs for active/history */}
                <div className="flex gap-2">
                  <Button
                    variant={demandSubTab === 'active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDemandSubTab('active')}
                    className={demandSubTab === 'active' ? 'bg-gradient-to-r from-[#0B2E58] to-[#134A8E] text-white hover:from-[#0B2E58]/90 hover:to-[#134A8E]/90 shadow-navy gap-1.5' : 'gap-1.5'}
                  >
                    <Clock className="size-3.5" />
                    En cours ({activeRequests.length})
                  </Button>
                  <Button
                    variant={demandSubTab === 'history' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDemandSubTab('history')}
                    className={demandSubTab === 'history' ? 'bg-gradient-to-r from-[#0B2E58] to-[#134A8E] text-white hover:from-[#0B2E58]/90 hover:to-[#134A8E]/90 shadow-navy gap-1.5' : 'gap-1.5'}
                  >
                    <CheckCircle2 className="size-3.5" />
                    Historique ({completedRequests.length})
                  </Button>
                </div>

                <AnimatePresence mode="popLayout">
                  {demandSubTab === 'active' ? (
                    activeRequests.length === 0 ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <Card className="glass-premium">
                          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <Clock className="size-12 text-muted-foreground/20 mb-3" />
                            <p className="text-sm text-muted-foreground">Aucune demande en cours</p>
                            <Button variant="link" className="text-xs mt-1" onClick={() => setActiveTab('nouvelle-demande')}>
                              Soumettre une nouvelle demande
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {activeRequests.map((req, i) => (
                          <RequestCard key={req.id} req={req} index={i} />
                        ))}
                      </div>
                    )
                  ) : (
                    completedRequests.length === 0 ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <Card className="glass-premium">
                          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <CheckCircle2 className="size-12 text-muted-foreground/20 mb-3" />
                            <p className="text-sm text-muted-foreground">Aucune demande dans l&apos;historique</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {completedRequests.map((req, i) => (
                          <RequestCard key={req.id} req={req} index={i} />
                        ))}
                      </div>
                    )
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            NOUVELLE DEMANDE — SERVICE CATALOG
        ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="nouvelle-demande">
          <div className="space-y-6 mt-4">
            {/* Search + filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un service..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 glass-input focus-ring-premium"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant={selectedCategory === 'all' ? 'default' : 'outline'} size="sm"
                  onClick={() => setSelectedCategory('all')}
                  className={selectedCategory === 'all' ? 'bg-gradient-to-r from-[#0B2E58] to-[#134A8E] text-white hover:from-[#0B2E58]/90 hover:to-[#134A8E]/90 shadow-navy' : ''}>
                  Tous
                </Button>
                {SERVICE_CATEGORIES.map(cat => (
                  <Button key={cat.id} variant={selectedCategory === cat.id ? 'default' : 'outline'} size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={selectedCategory === cat.id ? `${cat.color} text-white border-0 shadow-sm` : ''}>
                    {cat.name}
                  </Button>
                ))}
              </div>
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
                  <div className={`h-2 w-2 rounded-full ${category.color}`} />
                  <h3 className={`text-sm font-semibold ${category.textColor}`}>
                    {category.name}
                  </h3>
                  <div className="divider-premium flex-1" />
                  <Badge variant="outline" className="badge-premium text-[10px]">
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
                      <Card className={`card-interactive group h-full border ${category.borderColor}`}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${category.bgColor} shadow-sm`}>
                              <service.icon className={`h-5 w-5 ${category.textColor}`} />
                            </div>
                            <Badge variant="outline" className="badge-premium text-[10px]">{category.name}</Badge>
                          </div>
                          <CardTitle className="text-sm mt-2 group-hover:text-[#0B2E58] dark:group-hover:text-[#3B7DD8] transition-colors leading-tight">
                            {service.name}
                          </CardTitle>
                          <CardDescription className="text-xs">{service.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Délai: {service.delay}
                            </span>
                            <span className="font-semibold text-gradient-gold text-xs">{service.price}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {service.requiredDocs.length} pièce(s) justificative(s)
                          </div>
                          <Button size="sm" className="btn-gold w-full gap-1 text-xs h-8" onClick={() => handleOpenRequestDialog(service, category)}>
                            Faire une demande
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
                <p className="text-muted-foreground">Aucun service trouvé</p>
                <Button variant="link" onClick={() => { setSearchQuery(''); setSelectedCategory('all') }}>Réinitialiser les filtres</Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════════════
          REQUEST SUBMISSION DIALOG
      ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="glass-premium max-w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0B2E58] dark:text-[#3B7DD8]">
              {selectedService && <selectedService.icon className="size-5" />}
              {selectedService?.name || 'Nouvelle demande'}
            </DialogTitle>
            <DialogDescription>
              Remplissez le formulaire ci-dessous pour soumettre votre demande. Tous les champs marqués * sont obligatoires.
            </DialogDescription>
          </DialogHeader>

          {selectedService && selectedCategoryInfo && (
            <div className="space-y-5">
              {/* Service info */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 backdrop-blur-sm flex items-center gap-3 border border-[#C8A45C]/10 dark:border-[#D4B878]/5">
                <div className={`p-2 rounded-xl bg-gradient-to-br ${selectedCategoryInfo.bgColor} shadow-sm`}>
                  <selectedService.icon className={`h-5 w-5 ${selectedCategoryInfo.textColor}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{selectedService.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="size-3" />Délai: {selectedService.delay}</span>
                    <span className="font-semibold text-gradient-gold">{selectedService.price}</span>
                  </div>
                </div>
              </div>

              <div className="divider-premium" />

              {/* Citizen info form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Nom *</Label>
                  <Input placeholder="DIALLO" value={form.citizenName} onChange={e => setForm(prev => ({ ...prev, citizenName: e.target.value }))} className="glass-input focus-ring-premium" />
                  {formErrors.citizenName && <p className="text-xs text-red-500">{formErrors.citizenName}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Prénom *</Label>
                  <Input placeholder="Mamadou" value={form.citizenFirstName} onChange={e => setForm(prev => ({ ...prev, citizenFirstName: e.target.value }))} className="glass-input focus-ring-premium" />
                  {formErrors.citizenFirstName && <p className="text-xs text-red-500">{formErrors.citizenFirstName}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">NIN (Numéro d&apos;Identification National) *</Label>
                  <Input placeholder="XXXX-XXXX-XXXX" value={form.citizenNIN} onChange={e => setForm(prev => ({ ...prev, citizenNIN: e.target.value }))} className="glass-input focus-ring-premium font-mono tracking-wider" />
                  {formErrors.citizenNIN && <p className="text-xs text-red-500">{formErrors.citizenNIN}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Téléphone *</Label>
                  <Input placeholder="+224 XXX XXX XXX" value={form.citizenPhone} onChange={e => setForm(prev => ({ ...prev, citizenPhone: e.target.value }))} className="glass-input focus-ring-premium" />
                  {formErrors.citizenPhone && <p className="text-xs text-red-500">{formErrors.citizenPhone}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Email</Label>
                  <Input placeholder="mamadou.diallo@email.com" type="email" value={form.citizenEmail} onChange={e => setForm(prev => ({ ...prev, citizenEmail: e.target.value }))} className="glass-input focus-ring-premium" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Adresse *</Label>
                  <Input placeholder="Conakry, Kaloum..." value={form.citizenAddress} onChange={e => setForm(prev => ({ ...prev, citizenAddress: e.target.value }))} className="glass-input focus-ring-premium" />
                  {formErrors.citizenAddress && <p className="text-xs text-red-500">{formErrors.citizenAddress}</p>}
                </div>
              </div>

              {/* Motif */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Motif de la demande</Label>
                <Textarea placeholder="Précisez le motif de votre demande..." value={form.motif} onChange={e => setForm(prev => ({ ...prev, motif: e.target.value }))} rows={3} className="glass-input focus-ring-premium" />
              </div>

              {/* Delivery mode */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Mode de livraison</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'guichet' as const, label: 'Au guichet', icon: Building2, desc: 'Retrait au service' },
                    { value: 'en_ligne' as const, label: 'En ligne', icon: Download, desc: 'Espace personnel' },
                    { value: 'courrier' as const, label: 'Par courrier', icon: Mail, desc: 'Adresse postale' },
                  ].map(option => (
                    <div
                      key={option.value}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all duration-300 text-center ${
                        form.deliveryMode === option.value
                          ? 'border-[#C8A45C] dark:border-[#D4B878] bg-gradient-to-br from-[#0B2E58]/5 to-[#C8A45C]/5 dark:from-[#3B7DD8]/10 dark:to-[#D4B878]/5 shadow-sm shadow-[#C8A45C]/10'
                          : 'border-muted hover:border-[#C8A45C]/30 hover:shadow-sm'
                      }`}
                      onClick={() => setForm(prev => ({ ...prev, deliveryMode: option.value }))}
                    >
                      <option.icon className={`size-5 mx-auto mb-1 ${form.deliveryMode === option.value ? 'text-[#0B2E58] dark:text-[#3B7DD8]' : 'text-muted-foreground'}`} />
                      <p className="text-xs font-medium">{option.label}</p>
                      <p className="text-[10px] text-muted-foreground">{option.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* File Upload Section */}
              <div className="space-y-3">
                <div className="divider-premium" />
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Upload className="size-4 text-[#C8A45C] dark:text-[#D4B878]" />
                  Pièces justificatives à charger
                </h4>
                <p className="text-xs text-muted-foreground">
                  Chargez vos documents justificatifs. Formats acceptés : PDF, DOC, DOCX, JPG, PNG. Taille max : 10 Mo par fichier.
                </p>
                <div className="space-y-2">
                  {selectedService.requiredDocs.map((docName) => {
                    const uploaded = uploadedFiles.get(docName)
                    const error = uploadErrors[docName]
                    const typeInfo = uploaded ? getFileTypeIcon(uploaded.type) : null
                    return (
                      <div key={docName} className={`p-3 rounded-xl transition-all duration-200 ${error ? 'border border-red-300 bg-red-50/50 dark:border-red-800/40 dark:bg-red-900/10' : uploaded ? 'border border-emerald-300 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-900/10' : 'border border-dashed border-[#C8A45C]/30 dark:border-[#D4B878]/20 hover:border-[#C8A45C]/50 hover:bg-[#C8A45C]/5 dark:hover:bg-[#D4B878]/5'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {uploaded ? (
                              <>
                                <span className={`text-[9px] font-bold ${typeInfo?.color}`}>{typeInfo?.icon}</span>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium truncate">{docName}</p>
                                  <p className="text-[10px] text-muted-foreground">{uploaded.name} ({formatFileSize(uploaded.size)})</p>
                                </div>
                                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                              </>
                            ) : (
                              <>
                                <Paperclip className="size-3.5 text-[#C8A45C] dark:text-[#D4B878] shrink-0" />
                                <p className="text-xs text-muted-foreground">{docName}</p>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {uploaded ? (
                              <>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => downloadUploadedFile(uploaded)}>
                                  <Download className="size-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-600" onClick={() => handleRemoveFile(docName)}>
                                  <Trash2 className="size-3" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <input
                                  type="file"
                                  accept={ACCEPTED_FILE_TYPES}
                                  className="hidden"
                                  id={`file-upload-${docName.replace(/[^a-zA-Z0-9]/g, '-')}`}
                                  onChange={async (e) => {
                                    if (e.target.files?.[0]) {
                                      await handleFileUpload(e.target.files[0], docName)
                                      e.target.value = ''
                                    }
                                  }}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px] gap-1 border-[#C8A45C]/30 dark:border-[#D4B878]/20 text-[#0B2E58] dark:text-[#3B7DD8] hover:bg-[#C8A45C]/10 dark:hover:bg-[#D4B878]/10"
                                  onClick={() => document.getElementById(`file-upload-${docName.replace(/[^a-zA-Z0-9]/g, '-')}`)?.click()}
                                  disabled={isUploading}
                                >
                                  <Upload className="size-3" />
                                  Charger
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
                      </div>
                    )
                  })}
                </div>
                {uploadedFiles.size > 0 && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    {uploadedFiles.size} fichier(s) chargé(s) sur {selectedService.requiredDocs.length} pièce(s) requise(s)
                  </p>
                )}
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3 p-3 rounded-xl border border-[#C8A45C]/15 dark:border-[#D4B878]/10 bg-gradient-to-r from-[#0B2E58]/[0.02] to-[#C8A45C]/[0.02] dark:from-[#3B7DD8]/[0.03] dark:to-[#D4B878]/[0.02]">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(!!checked)}
                  className="mt-0.5"
                />
                <label htmlFor="terms" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                  J&apos;atteste que les informations fournies sont exactes et j&apos;accepte les conditions de traitement
                  de mes données personnelles conformément à la Loi n°L/2016/018/AN relative à la protection
                  des données à caractère personnel en République de Guinée.
                </label>
              </div>
              {formErrors.terms && <p className="text-xs text-red-500">{formErrors.terms}</p>}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)} className="focus-ring-premium">Annuler</Button>
            <Button className="btn-guinea gap-2" onClick={handleSubmitRequest}>
              <Send className="size-4" />
              Soumettre la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          REQUEST DETAIL DIALOG
      ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="glass-premium max-w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm border border-white/10 dark:border-white/5 ${STATUS_CONFIG[selectedRequest.status].color}`}>
                    {(() => { const Icon = STATUS_CONFIG[selectedRequest.status].icon; return <Icon className="size-3.5" /> })()}
                    {STATUS_CONFIG[selectedRequest.status].label}
                  </span>
                  {selectedRequest.serviceName}
                </DialogTitle>
                <DialogDescription className="font-mono tracking-wide">{selectedRequest.reference}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Citizen info */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 backdrop-blur-sm space-y-2 border border-[#C8A45C]/10 dark:border-[#D4B878]/5">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informations du citoyen</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Nom :</span> <span className="font-medium">{selectedRequest.citizenFirstName} {selectedRequest.citizenName}</span></div>
                    <div><span className="text-muted-foreground">NIN :</span> <span className="font-mono tracking-wide">{selectedRequest.citizenNIN}</span></div>
                    <div><span className="text-muted-foreground">Tél :</span> <span className="font-medium">{selectedRequest.citizenPhone}</span></div>
                    <div><span className="text-muted-foreground">Mode :</span> <span className="font-medium">{selectedRequest.deliveryMode === 'en_ligne' ? 'En ligne' : selectedRequest.deliveryMode === 'guichet' ? 'Au guichet' : 'Par courrier'}</span></div>
                  </div>
                </div>

                {/* Service */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-[#0B2E58]/5 to-[#3B7DD8]/5 dark:from-[#3B7DD8]/10 dark:to-[#0B2E58]/5 border border-[#C8A45C]/10 dark:border-[#D4B878]/5">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-[#0B2E58] dark:text-[#3B7DD8]" />
                    <div>
                      <p className="text-xs text-muted-foreground">Service compétent</p>
                      <p className="text-xs font-semibold">{selectedRequest.assignedService}</p>
                    </div>
                  </div>
                  {selectedRequest.assignedAgent && (
                    <p className="text-xs mt-1 ml-6 text-muted-foreground">Agent : {selectedRequest.assignedAgent}</p>
                  )}
                </div>

                {/* Progress overview */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Avancement global</h4>
                  <div className="flex items-center gap-3">
                    <Progress value={getProgressValue(selectedRequest)} className="flex-1 h-2" />
                    <span className="text-sm font-semibold text-[#0B2E58] dark:text-[#3B7DD8] tabular-nums">{getProgressValue(selectedRequest)}%</span>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Étapes du traitement</h4>
                  <div className="space-y-0">
                    {selectedRequest.timeline.map((step, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 ${
                            step.status === 'completed' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 text-white shadow-sm shadow-emerald-500/20' :
                            step.status === 'current' ? 'bg-gradient-to-br from-[#0B2E58] to-[#134A8E] border-[#3B7DD8] text-white dark:from-[#3B7DD8] dark:to-[#2A6BC7] dark:border-[#5A96E6] shadow-sm shadow-[#3B7DD8]/20' :
                            'bg-background border-muted-foreground/30 text-muted-foreground'
                          }`}>
                            {step.status === 'completed' ? <Check className="h-3 w-3" /> : step.status === 'current' ? <Clock className="h-3 w-3" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />}
                          </div>
                          {i < selectedRequest.timeline.length - 1 && (
                            <div className={`w-0.5 h-6 ${step.status === 'completed' ? 'bg-gradient-to-b from-emerald-400 to-emerald-300 dark:from-emerald-700 dark:to-emerald-600' : 'bg-muted-foreground/20'}`} />
                          )}
                        </div>
                        <div className="pb-2">
                          <p className={`text-xs font-medium ${step.status === 'pending' ? 'text-muted-foreground' : ''}`}>{step.label}</p>
                          {step.date && <p className="text-[10px] text-muted-foreground">{new Date(step.date).toLocaleDateString('fr-FR')}</p>}
                          {step.agent && <p className="text-[10px] text-[#0B2E58] dark:text-[#3B7DD8]">{step.agent}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {selectedRequest.processingNotes.length > 0 && (
                  <>
                    <div className="divider-premium" />
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes de traitement ({selectedRequest.processingNotes.length})</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedRequest.processingNotes.map((note, i) => (
                          <div key={i} className={`p-2 rounded-lg text-xs border backdrop-blur-sm ${
                            note.type === 'info_complementaire' ? 'bg-orange-50/80 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/40' :
                            note.type === 'decision' ? 'bg-blue-50/80 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/40' :
                            'bg-muted/30 border-muted'
                          }`}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-medium">{note.author}</span>
                              <span className="text-[9px] text-muted-foreground">{new Date(note.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-muted-foreground">{note.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Uploaded Documents Section */}
                {(selectedRequest.uploadedDocuments?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <div className="divider-premium" />
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Paperclip className="size-3.5 text-[#C8A45C] dark:text-[#D4B878]" />
                      Documents chargés ({selectedRequest.uploadedDocuments?.length ?? 0})
                    </h4>
                    <div className="space-y-1.5">
                      {(selectedRequest.uploadedDocuments ?? []).map((doc) => {
                        const typeInfo = getFileTypeIcon(doc.type)
                        return (
                          <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 backdrop-blur-sm border border-[#C8A45C]/10 dark:border-[#D4B878]/5 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`text-[8px] font-bold ${typeInfo.color}`}>{typeInfo.icon}</span>
                              <div className="min-w-0">
                                <p className="font-medium truncate">{doc.requiredDocName}</p>
                                <p className="text-[10px] text-muted-foreground">{doc.name} ({formatFileSize(doc.size)})</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {doc.verified && <FileCheck className="size-3.5 text-emerald-500" />}
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => downloadUploadedFile(doc)}>
                                <Download className="size-3" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Download Official Document Button */}
                {(selectedRequest.status === 'prete' || selectedRequest.status === 'livree') && (
                  <div className="space-y-2">
                    <div className="divider-premium" />
                    <Button
                      className="btn-gold w-full gap-2"
                      onClick={() => downloadCitizenDocument(selectedRequest, selectedRequest.assignedAgent)}
                    >
                      <Download className="size-4" />
                      Télécharger le document officiel
                    </Button>
                    {selectedRequest.generatedDocument && (
                      <p className="text-[10px] text-center text-muted-foreground">
                        Document généré le {new Date(selectedRequest.generatedDocument.generatedAt).toLocaleDateString('fr-FR')} par {selectedRequest.generatedDocument.generatedBy}
                      </p>
                    )}
                    {selectedRequest.deliveryMode === 'guichet' && selectedRequest.deliveryLocation && (
                      <p className="text-xs text-muted-foreground text-center">Retrait au : {selectedRequest.deliveryLocation}</p>
                    )}
                    {selectedRequest.deliveryMode === 'en_ligne' && (
                      <p className="text-xs text-muted-foreground text-center">Document disponible en ligne dans votre espace personnel</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          SUCCESS TOAST
      ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-premium fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-3 text-white text-sm font-medium shadow-premium-lg"
          >
            <CheckCircle2 className="size-4" />
            {successToast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
