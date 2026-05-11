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
  Plus, ChevronDown, XCircle,
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
import { useCitizenRequestsStore, type CitizenRequest, type RequestStatus } from '@/store/citizen-requests-store'

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
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
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

  // Tracking
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackedRequest, setTrackedRequest] = useState<CitizenRequest | null>(null)
  const [trackingError, setTrackingError] = useState(false)

  // Detail view
  const [selectedRequest, setSelectedRequest] = useState<CitizenRequest | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState({ whatsapp: true, sms: false, email: true, ussd: false })

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  const handleOpenRequestDialog = (service: ServiceItem, category: ServiceCategory) => {
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
      createdAt: new Date().toISOString(),
      deliveryMode: form.deliveryMode,
    })

    setRequestDialogOpen(false)
    setSuccessToast(`Demande soumise avec succès ! Référence : ${newRequest.reference}`)
    setActiveTab('mes-demandes')
  }

  const handleTrack = () => {
    const found = getRequestByReference(trackingNumber)
    setTrackedRequest(found || null)
    setTrackingError(!!trackingNumber && !found)
  }

  const handleViewDetail = (req: CitizenRequest) => {
    setSelectedRequest(req)
    setDetailDialogOpen(true)
  }

  // Generate official citizen document for download
  const generateCitizenDocument = (req: CitizenRequest): string => {
    const citizenFullName = `${req.citizenFirstName} ${req.citizenName}`
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${req.serviceName} — République de Guinée</title>
  <style>
    @page { size: A4; margin: 2cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Georgia, serif; color: #1a1a1a; line-height: 1.6; padding: 2cm; max-width: 21cm; margin: 0 auto; }
    .tricolor { display: flex; width: 100%; height: 6px; margin-bottom: 20px; }
    .tricolor-red { flex: 1; background-color: #CE1126; }
    .tricolor-yellow { flex: 1; background-color: #FCD116; }
    .tricolor-green { flex: 1; background-color: #009460; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0B2E58; padding-bottom: 20px; }
    .header h1 { font-size: 11pt; letter-spacing: 3px; text-transform: uppercase; color: #0B2E58; margin-bottom: 4px; }
    .header .motto { font-size: 9pt; color: #666; letter-spacing: 1px; }
    .header .institution { font-size: 10pt; color: #0B2E58; font-weight: bold; margin-top: 8px; }
    .doc-title { text-align: center; margin: 30px 0 20px; }
    .doc-title h2 { font-size: 14pt; color: #0B2E58; text-transform: uppercase; letter-spacing: 1px; }
    .doc-title .ref { font-size: 11pt; color: #333; margin-top: 4px; }
    .content { text-align: justify; margin: 20px 0; font-size: 12pt; }
    .content p { margin-bottom: 12px; text-indent: 1.5cm; }
    .info-box { border: 1px solid #0B2E58; padding: 16px; margin: 20px 0; border-radius: 4px; }
    .info-box h3 { font-size: 10pt; color: #0B2E58; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
    .info-row { display: flex; margin-bottom: 6px; font-size: 11pt; }
    .info-row .label { width: 180px; color: #666; font-style: italic; }
    .info-row .value { font-weight: 600; flex: 1; }
    .signature { margin-top: 60px; text-align: right; }
    .signature .date { font-size: 10pt; color: #333; }
    .signature .signataire { font-size: 11pt; font-weight: bold; color: #0B2E58; margin-top: 8px; }
    .signature .line { width: 200px; border-bottom: 1px dashed #999; margin-top: 40px; margin-left: auto; }
    .signature .label-sign { font-size: 9pt; color: #666; margin-top: 4px; }
    .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 10px; font-size: 8pt; color: #999; text-align: center; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="tricolor">
    <div class="tricolor-red"></div>
    <div class="tricolor-yellow"></div>
    <div class="tricolor-green"></div>
  </div>
  <div class="header">
    <h1>République de Guinée</h1>
    <div class="motto">Travail — Justice — Solidarité</div>
    <div class="institution">${req.assignedService}</div>
  </div>
  <div class="doc-title">
    <h2>${req.serviceName}</h2>
    <div class="ref">Référence : ${req.reference}</div>
  </div>
  <div class="info-box">
    <h3>Informations du demandeur</h3>
    <div class="info-row"><span class="label">Nom complet :</span><span class="value">${citizenFullName}</span></div>
    <div class="info-row"><span class="label">NIN :</span><span class="value">${req.citizenNIN}</span></div>
    <div class="info-row"><span class="label">Téléphone :</span><span class="value">${req.citizenPhone}</span></div>
    <div class="info-row"><span class="label">Adresse :</span><span class="value">${req.citizenAddress}</span></div>
    <div class="info-row"><span class="label">Mode de livraison :</span><span class="value">${req.deliveryMode === 'en_ligne' ? 'En ligne' : req.deliveryMode === 'guichet' ? 'Au guichet' : 'Par courrier'}</span></div>
  </div>
  <div class="content">
    <p>Par la présente, il est certifié que le(s) document(s) relatif(s) à la demande sus-référencée a/ont été établi(s) conformément aux dispositions légales et réglementaires en vigueur en République de Guinée.</p>
    <p>Le présent document est délivré pour faire valoir ce que de droit. Toute falsification ou utilisation frauduleuse expose son auteur aux poursuites prévues par la loi guinéenne.</p>
  </div>
  <div class="signature">
    <div class="date">Fait à Conakry, le ${new Date(req.createdAt).toLocaleDateString('fr-FR')}</div>
    <div class="signataire">${req.assignedService}</div>
    <div class="line"></div>
    <div class="label-sign">Signature & Cachet officiel</div>
  </div>
  <div class="footer">
    Ce document est généré par le système eAdministration Suite de la République de Guinée — ${req.reference} — ${new Date().toLocaleDateString('fr-FR')}
  </div>
</body>
</html>`
  }

  // Download citizen document
  const handleDownloadCitizenDocument = (req: CitizenRequest) => {
    const htmlContent = generateCitizenDocument(req)
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${req.reference.replace(/\//g, '-')}-${req.serviceName.replace(/\s+/g, '-').toLowerCase()}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setSuccessToast(`Document ${req.reference} téléchargé avec succès`)
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

  // Stats from actual user requests
  const myStats = [
    { label: 'Demandes soumises', value: myRequests.filter(r => r.status === 'soumise').length, icon: Send, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
    { label: 'En traitement', value: myRequests.filter(r => ['en_cours', 'pieces_complementaires'].includes(r.status)).length, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Documents prêts', value: myRequests.filter(r => r.status === 'prete').length, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Livrées', value: myRequests.filter(r => r.status === 'livree').length, icon: Download, color: 'text-[#0B2E58] dark:text-[#3B7DD8]', bg: 'bg-[#0B2E58]/5 dark:bg-[#3B7DD8]/10' },
  ]

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
        <Card className="glass-card overflow-hidden border-[#C8A45C]/20 dark:border-[#D4B878]/20 bg-gradient-to-br from-[#0B2E58] via-[#0B2E58]/95 to-[#134A8E] dark:from-[#0B2E58] dark:via-[#071D3A] dark:to-[#0B2E58]">
          <CardContent className="p-6 md:p-8 text-white relative">
            {/* Guinea tricolor accent */}
            <div className="flex gap-0 mb-4 -mx-6 md:-mx-8 -mt-6 md:-mt-8">
              <div className="flex-1 h-1.5" style={{ backgroundColor: GUINEA_RED }} />
              <div className="flex-1 h-1.5" style={{ backgroundColor: GUINEA_YELLOW }} />
              <div className="flex-1 h-1.5" style={{ backgroundColor: GUINEA_GREEN }} />
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm shadow-xl border border-white/20">
                <Landmark className="size-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest text-white/60 font-medium">République de Guinée</p>
                <h2 className="text-2xl font-bold mt-0.5">Guinée Services Publics</h2>
                <p className="text-sm text-white/70 mt-1 max-w-xl">
                  Portail officiel des démarches administratives — Soumettez vos demandes, suivez l&apos;avancement et recevez vos documents
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Badge className="bg-[#C8A45C] text-[#0B2E58] hover:bg-[#C8A45C]/90 border-0 font-semibold text-xs gap-1.5 shadow-sm">
                  <Globe className="size-3" />
                  Service Public Numérique
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs gap-1.5">
                  <CheckCircle2 className="size-3" />
                  {myRequests.length} demande(s) en cours
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          QUICK ACTIONS
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-sm border-[#C8A45C]/20 dark:border-[#D4B878]/20 bg-gradient-to-r from-[#0B2E58]/[0.02] to-[#C8A45C]/[0.02] dark:from-[#3B7DD8]/[0.05] dark:to-[#D4B878]/[0.03]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">Actions rapides</CardTitle>
            <CardDescription className="text-xs">Raccourcis vers les modules liés</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Mes demandes', icon: FileText, color: 'bg-[#0B2E58] hover:bg-[#0B2E58]/90 text-white', onClick: () => setActiveTab('mes-demandes') },
                { label: 'Suivi dossier', icon: Search, color: 'bg-[#3B7DD8] hover:bg-[#3B7DD8]/90 text-white', onClick: () => setActiveTab('suivi') },
                { label: 'Nouvelle demande', icon: Plus, color: 'bg-[#C8A45C] hover:bg-[#C8A45C]/90 text-[#0B2E58]', onClick: () => setActiveTab('services') },
                { label: 'Traitement demandes', icon: CheckCircle2, color: 'bg-emerald-600 hover:bg-emerald-600/90 text-white', onClick: () => navigate('service-requests') },
              ].map(action => (
                <Button key={action.label} className={`${action.color} h-auto flex-col gap-2 rounded-xl py-3 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02]`} onClick={action.onClick}>
                  <action.icon className="size-5" />
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          STATS FROM ACTUAL REQUESTS
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {myStats.map((stat) => (
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

      {/* ═══════════════════════════════════════════════════════════════════════
          TABS NAVIGATION
      ═══════════════════════════════════════════════════════════════════════ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto h-auto flex-wrap gap-1 bg-muted/50 p-1.5">
          <TabsTrigger value="services" className="gap-1.5 text-sm data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
            <Globe className="size-4" />
            Services
          </TabsTrigger>
          <TabsTrigger value="mes-demandes" className="gap-1.5 text-sm data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
            <FileText className="size-4" />
            Mes demandes ({myRequests.length})
          </TabsTrigger>
          <TabsTrigger value="suivi" className="gap-1.5 text-sm data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
            <Search className="size-4" />
            Suivi
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 text-sm data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
            <Bell className="size-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════
            SERVICES CATALOG
        ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="services">
          <div className="space-y-6 mt-4">
            {/* Search + filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un service..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant={selectedCategory === 'all' ? 'default' : 'outline'} size="sm"
                  onClick={() => setSelectedCategory('all')}
                  className={selectedCategory === 'all' ? 'bg-[#0B2E58] text-white hover:bg-[#0B2E58]/90' : ''}>
                  Tous
                </Button>
                {SERVICE_CATEGORIES.map(cat => (
                  <Button key={cat.id} variant={selectedCategory === cat.id ? 'default' : 'outline'} size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={selectedCategory === cat.id ? `${cat.color} text-white border-0` : ''}>
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
                          <div className="flex items-center justify-between text-xs mb-1.5">
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
                          <Button size="sm" className={`w-full gap-1 text-xs h-8 ${category.color} hover:opacity-90 text-white border-0`}
                            onClick={() => handleOpenRequestDialog(service, category)}>
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

        {/* ═══════════════════════════════════════════════════════════════════
            MES DEMANDES — LIST OF ALL SUBMITTED REQUESTS
        ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="mes-demandes">
          <div className="space-y-4 mt-4">
            {myRequests.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="size-16 text-muted-foreground/20 mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground mb-1">Aucune demande</h3>
                  <p className="text-sm text-muted-foreground mb-4">Vous n&apos;avez pas encore soumis de demande. Explorez nos services pour commencer.</p>
                  <Button className="bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-[#3B7DD8] dark:hover:bg-[#3B7DD8]/90 text-white gap-2" onClick={() => setActiveTab('services')}>
                    <Plus className="size-4" />
                    Nouvelle demande
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Request cards */}
                <AnimatePresence mode="popLayout">
                  {myRequests.map((req, i) => {
                    const sConfig = STATUS_CONFIG[req.status]
                    const SIcon = sConfig.icon
                    return (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: i * 0.03 }}
                        layout
                      >
                        <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => handleViewDetail(req)}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${sConfig.color}`}>
                                  <SIcon className="size-4" />
                                </div>
                                <div>
                                  <p className="font-semibold text-sm">{req.serviceName}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{req.reference}</p>
                                </div>
                              </div>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${sConfig.color}`}>
                                {sConfig.label}
                              </span>
                            </div>
                            <div className="ml-13 pl-13 space-y-1">
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Building2 className="size-3" />{req.assignedService}</span>
                                <span className="flex items-center gap-1"><Calendar className="size-3" />{new Date(req.createdAt).toLocaleDateString('fr-FR')}</span>
                                {req.assignedAgent && <span className="flex items-center gap-1"><Users className="size-3" />{req.assignedAgent}</span>}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="size-3" />
                                {req.deliveryMode === 'en_ligne' ? 'Livraison en ligne' : req.deliveryMode === 'guichet' ? 'Retrait au guichet' : 'Envoi par courrier'}
                              </div>
                            </div>
                            {/* Progress bar */}
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                                <span>Avancement</span>
                                <span>{req.timeline.filter(s => s.status === 'completed').length}/{req.timeline.length} étapes</span>
                              </div>
                              <Progress value={(req.timeline.filter(s => s.status === 'completed').length / req.timeline.length) * 100} className="h-1.5" />
                            </div>
                            {/* Delivery info for ready/delivered */}
                            {(req.status === 'prete' || req.status === 'livree') && (
                              <div className="mt-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                      {req.status === 'livree' ? 'Document livré' : 'Document prêt'}
                                      {req.deliveryMode === 'guichet' && req.deliveryLocation && ` — Retrait au : ${req.deliveryLocation}`}
                                      {req.deliveryMode === 'en_ligne' && ' — Disponible en ligne'}
                                      {req.deliveryMode === 'courrier' && ' — Envoyé par courrier'}
                                    </p>
                                  </div>
                                  <Button size="sm" className="gap-1.5 h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={(e) => { e.stopPropagation(); handleDownloadCitizenDocument(req) }}>
                                    <Download className="h-3 w-3" />
                                    Télécharger
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </>
            )}
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            SUIVI DE DOSSIER — TRACKING BY REFERENCE
        ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="suivi">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="size-5 text-[#0B2E58] dark:text-[#3B7DD8]" />
                Suivi de dossier
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
                      <CardContent className="p-6 space-y-5">
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

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
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

                        {/* Notifications from processing */}
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

                        {/* Delivery info */}
                        {(trackedRequest.status === 'prete' || trackedRequest.status === 'livree') && (
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
                              <p className="text-sm text-muted-foreground">Votre document est disponible en ligne dans votre espace personnel.</p>
                            )}
                            {trackedRequest.deliveryMode === 'courrier' && (
                              <p className="text-sm text-muted-foreground">Votre document a été envoyé par courrier à votre adresse.</p>
                            )}
                          </div>
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

              {/* Quick access to recent requests */}
              {myRequests.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3">Vos demandes récentes</h4>
                  <div className="space-y-2">
                    {myRequests.slice(0, 5).map(req => {
                      const sConfig = STATUS_CONFIG[req.status]
                      return (
                        <div
                          key={req.id}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => { setTrackingNumber(req.reference); setTrackedRequest(req) }}
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-[#0B2E58] dark:text-[#3B7DD8]" />
                            <div>
                              <p className="text-sm font-medium">{req.serviceName}</p>
                              <p className="text-xs text-muted-foreground font-mono">{req.reference}</p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${sConfig.color}`}>
                            {sConfig.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
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
              <Button className="bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-[#3B7DD8] dark:hover:bg-[#3B7DD8]/90 text-white" onClick={() => setSuccessToast('Préférences de notification enregistrées')}>
                Enregistrer les préférences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════════════
          REQUEST SUBMISSION DIALOG
      ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
                <div className={`p-2 rounded-xl ${selectedCategoryInfo.iconBgColor}`}>
                  <selectedService.icon className={`h-5 w-5 ${selectedCategoryInfo.textColor}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{selectedService.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="size-3" />Délai: {selectedService.delay}</span>
                    <span className="font-semibold text-[#0B2E58] dark:text-[#3B7DD8]">{selectedService.price}</span>
                  </div>
                </div>
              </div>

              {/* Required docs */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Pièces justificatives requises</Label>
                <div className="grid grid-cols-1 gap-1.5">
                  {selectedService.requiredDocs.map((doc, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg border text-xs">
                      <Checkbox id={`doc-${i}`} />
                      <label htmlFor={`doc-${i}`} className="text-sm cursor-pointer">{doc}</label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Citizen info form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Nom *</Label>
                  <Input placeholder="DIALLO" value={form.citizenName} onChange={e => setForm(prev => ({ ...prev, citizenName: e.target.value }))} />
                  {formErrors.citizenName && <p className="text-xs text-red-500">{formErrors.citizenName}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Prénom *</Label>
                  <Input placeholder="Mamadou" value={form.citizenFirstName} onChange={e => setForm(prev => ({ ...prev, citizenFirstName: e.target.value }))} />
                  {formErrors.citizenFirstName && <p className="text-xs text-red-500">{formErrors.citizenFirstName}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">NIN (Numéro d&apos;Identification National) *</Label>
                  <Input placeholder="XXXX-XXXX-XXXX" value={form.citizenNIN} onChange={e => setForm(prev => ({ ...prev, citizenNIN: e.target.value }))} />
                  {formErrors.citizenNIN && <p className="text-xs text-red-500">{formErrors.citizenNIN}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Téléphone *</Label>
                  <Input placeholder="+224 XXX XXX XXX" value={form.citizenPhone} onChange={e => setForm(prev => ({ ...prev, citizenPhone: e.target.value }))} />
                  {formErrors.citizenPhone && <p className="text-xs text-red-500">{formErrors.citizenPhone}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Email</Label>
                  <Input placeholder="mamadou.diallo@email.com" type="email" value={form.citizenEmail} onChange={e => setForm(prev => ({ ...prev, citizenEmail: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Adresse *</Label>
                  <Input placeholder="Conakry, Kaloum..." value={form.citizenAddress} onChange={e => setForm(prev => ({ ...prev, citizenAddress: e.target.value }))} />
                  {formErrors.citizenAddress && <p className="text-xs text-red-500">{formErrors.citizenAddress}</p>}
                </div>
              </div>

              {/* Motif */}
              <div className="space-y-2">
                <Label className="text-sm">Motif de la demande</Label>
                <Textarea placeholder="Précisez le motif de votre demande..." value={form.motif} onChange={e => setForm(prev => ({ ...prev, motif: e.target.value }))} rows={3} />
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
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all text-center ${
                        form.deliveryMode === option.value ? 'border-[#0B2E58] dark:border-[#3B7DD8] bg-[#0B2E58]/5 dark:bg-[#3B7DD8]/10' : 'border-muted hover:border-muted-foreground/30'
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

              {/* Terms */}
              <div className="flex items-start gap-3 p-3 rounded-lg border">
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
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>Annuler</Button>
            <Button className="bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-[#3B7DD8] dark:hover:bg-[#3B7DD8]/90 text-white gap-2" onClick={handleSubmitRequest}>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${STATUS_CONFIG[selectedRequest.status].color}`}>
                    {(() => { const Icon = STATUS_CONFIG[selectedRequest.status].icon; return <Icon className="size-3.5" /> })()}
                    {STATUS_CONFIG[selectedRequest.status].label}
                  </span>
                  {selectedRequest.serviceName}
                </DialogTitle>
                <DialogDescription className="font-mono">{selectedRequest.reference}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Citizen info */}
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informations du citoyen</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Nom :</span> <span className="font-medium">{selectedRequest.citizenFirstName} {selectedRequest.citizenName}</span></div>
                    <div><span className="text-muted-foreground">NIN :</span> <span className="font-mono">{selectedRequest.citizenNIN}</span></div>
                    <div><span className="text-muted-foreground">Tél :</span> <span className="font-medium">{selectedRequest.citizenPhone}</span></div>
                    <div><span className="text-muted-foreground">Mode :</span> <span className="font-medium">{selectedRequest.deliveryMode === 'en_ligne' ? 'En ligne' : selectedRequest.deliveryMode === 'guichet' ? 'Au guichet' : 'Par courrier'}</span></div>
                  </div>
                </div>

                {/* Service */}
                <div className="p-3 rounded-lg bg-[#0B2E58]/5 dark:bg-[#3B7DD8]/10">
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

                {/* Timeline */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Avancement</h4>
                  <div className="space-y-0">
                    {selectedRequest.timeline.map((step, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 ${
                            step.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' :
                            step.status === 'current' ? 'bg-[#0B2E58] border-[#0B2E58] text-white dark:bg-[#3B7DD8] dark:border-[#3B7DD8]' :
                            'bg-background border-muted-foreground/30 text-muted-foreground'
                          }`}>
                            {step.status === 'completed' ? <Check className="h-3 w-3" /> : step.status === 'current' ? <Clock className="h-3 w-3" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />}
                          </div>
                          {i < selectedRequest.timeline.length - 1 && <div className={`w-0.5 h-6 ${step.status === 'completed' ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-muted-foreground/20'}`} />}
                        </div>
                        <div className="pb-2">
                          <p className={`text-xs font-medium ${step.status === 'pending' ? 'text-muted-foreground' : ''}`}>{step.label}</p>
                          {step.date && <p className="text-[10px] text-muted-foreground">{new Date(step.date).toLocaleDateString('fr-FR')}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {selectedRequest.processingNotes.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes de traitement ({selectedRequest.processingNotes.length})</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedRequest.processingNotes.map((note, i) => (
                          <div key={i} className={`p-2 rounded-lg text-xs border ${
                            note.type === 'info_complementaire' ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/40' :
                            note.type === 'decision' ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/40' :
                            'bg-muted/50 border-muted'
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

                {/* Delivery info */}
                {(selectedRequest.status === 'prete' || selectedRequest.status === 'livree') && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                          {selectedRequest.status === 'livree' ? 'Document livré' : 'Document prêt'}
                        </span>
                      </div>
                      <Button size="sm" className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleDownloadCitizenDocument(selectedRequest)}>
                        <Download className="h-3.5 w-3.5" />
                        Télécharger le document
                      </Button>
                    </div>
                    {selectedRequest.deliveryMode === 'guichet' && selectedRequest.deliveryLocation && (
                      <p className="text-xs text-muted-foreground mt-1 ml-6">Retrait au : {selectedRequest.deliveryLocation}</p>
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
            className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-white text-sm font-medium shadow-lg"
          >
            <CheckCircle2 className="size-4" />
            {successToast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
