'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Clock, CheckCircle2, AlertCircle, Search, Filter,
  Building2, User, Send, Eye, MoreHorizontal, ChevronDown,
  Shield, MessageSquare, Play, XCircle, Download, Mail,
  MapPin, Phone, Hash, Calendar, ArrowRight, Plus, Stamp,
  Landmark, Award, BookOpen, ClipboardCheck, Gavel, Scale,
  GitBranch, Users, Globe, Smartphone, QrCode, Check,
  Image as ImageIcon, File, Upload as UploadIcon, Paperclip, FileCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useCitizenRequestsStore, type CitizenRequest, type RequestStatus, type UploadedDocument, type GeneratedDocument } from '@/store/citizen-requests-store'
import { formatFileSize, getFileTypeIcon, downloadUploadedFile, downloadCitizenDocument, createGeneratedDocument, downloadGeneratedDocument, ACCEPTED_FILE_TYPES, processFile } from '@/lib/document-utils'

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; icon: React.ElementType; description: string }> = {
  soumise: { label: 'Soumise', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400', icon: Send, description: 'Demande reçue, en attente de traitement' },
  en_cours: { label: 'En cours', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock, description: 'En cours de traitement par le service' },
  pieces_complementaires: { label: 'Pièces complémentaires', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertCircle, description: 'Des documents supplémentaires sont nécessaires' },
  validee: { label: 'Validée', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Check, description: 'Demande validée par le responsable' },
  prete: { label: 'Prête', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2, description: 'Document prêt pour le retrait' },
  livree: { label: 'Livrée', color: 'bg-[#0B2E58]/10 text-[#0B2E58] dark:bg-[#3B7DD8]/20 dark:text-[#3B7DD8]', icon: Download, description: 'Document remis au citoyen' },
  rejetee: { label: 'Rejetée', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle, description: 'Demande rejetée' },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

export function ServiceRequestsPage() {
  const {
    requests, updateRequestStatus, addProcessingNote, advanceTimeline,
    assignRequest, completeRequest, verifyDocument, setGeneratedDocument, addUploadedDocument,
  } = useCitizenRequestsStore()

  const [activeTab, setActiveTab] = useState('soumises')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedRequest, setSelectedRequest] = useState<CitizenRequest | null>(null)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteType, setNoteType] = useState<'note' | 'decision' | 'info_complementaire' | 'notification'>('note')
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false)
  const [deliveryMode, setDeliveryMode] = useState<'en_ligne' | 'guichet' | 'courrier'>('guichet')
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [generateDocDialogOpen, setGenerateDocDialogOpen] = useState(false)
  const [previewDocDialogOpen, setPreviewDocDialogOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<UploadedDocument | null>(null)
  const [successToast, setSuccessToast] = useState('')

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  // Filter requests by tab
  const filteredRequests = requests.filter(r => {
    const matchTab = activeTab === 'toutes' ||
      (activeTab === 'soumises' && r.status === 'soumise') ||
      (activeTab === 'en_cours' && (r.status === 'en_cours' || r.status === 'pieces_complementaires')) ||
      (activeTab === 'validees' && r.status === 'validee') ||
      (activeTab === 'pretes' && r.status === 'prete') ||
      (activeTab === 'livrees' && r.status === 'livree') ||
      (activeTab === 'rejetees' && r.status === 'rejetee')

    const matchSearch = !searchQuery ||
      r.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.citizenName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.citizenFirstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.assignedService.toLowerCase().includes(searchQuery.toLowerCase())

    const matchCategory = categoryFilter === 'all' || r.categoryId === categoryFilter

    return matchTab && matchSearch && matchCategory
  })

  // Stats
  const stats = [
    { label: 'Demandes reçues', value: requests.filter(r => r.status === 'soumise').length, icon: Send, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
    { label: 'En traitement', value: requests.filter(r => ['en_cours', 'pieces_complementaires'].includes(r.status)).length, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Documents prêts', value: requests.filter(r => r.status === 'prete').length, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Livrées ce mois', value: requests.filter(r => r.status === 'livree').length, icon: Download, color: 'text-[#0B2E58] dark:text-[#3B7DD8]', bg: 'bg-[#0B2E58]/5 dark:bg-[#3B7DD8]/10' },
  ]

  const handleTakeCharge = (req: CitizenRequest) => {
    updateRequestStatus(req.id, 'en_cours', 'Demande prise en charge par le service')
    advanceTimeline(req.id)
    assignRequest(req.id, 'Agent en charge')
    setSuccessToast(`Demande ${req.reference} prise en charge`)
    refreshSelected(req.id)
  }

  const handleRequestMoreInfo = () => {
    if (!selectedRequest || !noteText.trim()) return
    updateRequestStatus(selectedRequest.id, 'pieces_complementaires', noteText)
    addProcessingNote(selectedRequest.id, {
      author: 'Agent traitant',
      authorRole: 'Agent',
      text: noteText,
      type: 'info_complementaire',
    })
    setNoteDialogOpen(false)
    setNoteText('')
    setSuccessToast('Demande de pièces complémentaires envoyée au citoyen')
    refreshSelected(selectedRequest.id)
  }

  const handleValidate = (req: CitizenRequest) => {
    updateRequestStatus(req.id, 'validee', 'Demande validée par le responsable')
    advanceTimeline(req.id)
    advanceTimeline(req.id)
    setSuccessToast(`Demande ${req.reference} validée`)
    refreshSelected(req.id)
  }

  const handleMarkReady = (req: CitizenRequest) => {
    updateRequestStatus(req.id, 'prete', 'Document prêt pour le retrait')
    advanceTimeline(req.id)
    setSuccessToast(`Document ${req.reference} prêt`)
    refreshSelected(req.id)
  }

  const handleDeliver = () => {
    if (!selectedRequest) return
    const location = deliveryMode === 'guichet' ? (deliveryLocation || selectedRequest.assignedService) : undefined
    completeRequest(selectedRequest.id, deliveryMode, location)
    setDeliveryDialogOpen(false)
    setSuccessToast(`Document ${selectedRequest.reference} livré avec succès`)
    refreshSelected(selectedRequest.id)
  }

  const handleReject = () => {
    if (!selectedRequest || !rejectReason.trim()) return
    updateRequestStatus(selectedRequest.id, 'rejetee', rejectReason)
    addProcessingNote(selectedRequest.id, {
      author: 'Agent traitant',
      authorRole: 'Agent',
      text: `Demande rejetée : ${rejectReason}`,
      type: 'decision',
    })
    setRejectDialogOpen(false)
    setRejectReason('')
    setSuccessToast('Demande rejetée')
    refreshSelected(selectedRequest.id)
  }

  const handleAddNote = () => {
    if (!selectedRequest || !noteText.trim()) return
    addProcessingNote(selectedRequest.id, {
      author: 'Agent traitant',
      authorRole: 'Agent',
      text: noteText,
      type: noteType,
    })
    setNoteDialogOpen(false)
    setNoteText('')
    setSuccessToast('Note ajoutée')
    refreshSelected(selectedRequest.id)
  }

  const refreshSelected = (id: string) => {
    const updated = requests.find(r => r.id === id)
    if (updated) setSelectedRequest(updated)
  }

  const handleVerifyDocument = (requestId: string, docId: string) => {
    verifyDocument(requestId, docId)
    setSuccessToast('Document vérifié avec succès')
    if (selectedRequest) refreshSelected(selectedRequest.id)
  }

  const handleGenerateDocument = () => {
    if (!selectedRequest) return
    const doc = createGeneratedDocument(selectedRequest, selectedRequest.assignedAgent || 'Agent traitant')
    setGeneratedDocument(selectedRequest.id, doc)
    updateRequestStatus(selectedRequest.id, 'prete', 'Document officiel généré et prêt pour le retrait')
    advanceTimeline(selectedRequest.id)
    setGenerateDocDialogOpen(false)
    setSuccessToast(`Document officiel généré pour ${selectedRequest.reference}`)
    refreshSelected(selectedRequest.id)
  }

  const handleDownloadDocument = () => {
    if (!selectedRequest) return
    downloadCitizenDocument(selectedRequest, selectedRequest.assignedAgent)
    setSuccessToast(`Document ${selectedRequest.reference} téléchargé`)
  }

  const handleAddDocumentToRequest = async (file: File, requestId: string) => {
    try {
      const doc = await processFile(file, 'Document complémentaire')
      addUploadedDocument(requestId, doc)
      setSuccessToast('Document ajouté avec succès')
      if (selectedRequest) refreshSelected(selectedRequest.id)
    } catch (err: any) {
      setSuccessToast(err.message)
    }
  }

  // Document helpers
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' o'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' Ko'
    return (bytes / 1048576).toFixed(1) + ' Mo'
  }

  const getDocIcon = (type: string) => {
    if (type === 'application/pdf') return <FileText className="size-4 text-red-500" />
    if (type.startsWith('image/')) return <ImageIcon className="size-4 text-blue-500" />
    return <File className="size-4 text-gray-500" />
  }

  const downloadUploadedFile = (doc: UploadedDocument) => {
    const link = document.createElement('a')
    link.href = doc.data
    link.download = doc.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const previewUploadedFile = (doc: UploadedDocument) => {
    const win = window.open('', '_blank')
    if (win) {
      if (doc.type.startsWith('image/')) {
        win.document.write(`<html><head><title>${doc.name}</title></head><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f0f0f0"><img src="${doc.data}" style="max-width:100%;max-height:100vh;object-fit:contain"/></body></html>`)
      } else {
        win.document.write(`<html><head><title>${doc.name}</title></head><body style="margin:0"><iframe src="${doc.data}" style="width:100vw;height:100vh;border:none"></iframe></body></html>`)
      }
      win.document.close()
    }
  }

  const generateOfficialDocument = (req: CitizenRequest): GeneratedDocument => {
    const citizenFullName = `${req.citizenFirstName} ${req.citizenName}`
    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
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
    .header h1 { font-size: 11pt; letter-spacing: 3px; text-transform: uppercase; color: #0B2E58; }
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
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 48pt; color: rgba(11, 46, 88, 0.04); letter-spacing: 5px; pointer-events: none; white-space: nowrap; }
    .qr-placeholder { border: 1px solid #ccc; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; margin-top: 10px; font-size: 8pt; color: #999; }
    @media print { body { padding: 0; } .watermark { display: block; } }
  </style>
</head>
<body>
  <div class="watermark">eAdministration Suite — République de Guinée</div>
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
    <h3>Informations du titulaire</h3>
    <div class="info-row"><span class="label">Nom complet :</span><span class="value">${citizenFullName}</span></div>
    <div class="info-row"><span class="label">NIN :</span><span class="value">${req.citizenNIN}</span></div>
    <div class="info-row"><span class="label">Téléphone :</span><span class="value">${req.citizenPhone}</span></div>
    <div class="info-row"><span class="label">Adresse :</span><span class="value">${req.citizenAddress}</span></div>
    <div class="info-row"><span class="label">Type de document :</span><span class="value">${req.serviceName}</span></div>
    <div class="info-row"><span class="label">Mode de livraison :</span><span class="value">${req.deliveryMode === 'en_ligne' ? 'En ligne' : req.deliveryMode === 'guichet' ? 'Au guichet' : 'Par courrier'}</span></div>
  </div>
  <div class="content">
    <p>Par la présente, il est certifié que le(s) document(s) relatif(s) à la demande sus-référencée a/ont été établi(s) conformément aux dispositions légales et réglementaires en vigueur en République de Guinée.</p>
    <p>Le présent document est délivré pour faire valoir ce que de droit. Toute falsification ou utilisation frauduleuse expose son auteur aux poursuites prévues par la loi guinéenne.</p>
  </div>
  <div class="signature">
    <div class="date">Fait à Conakry, le ${new Date().toLocaleDateString('fr-FR')}</div>
    <div class="signataire">${req.assignedService}</div>
    <div class="line"></div>
    <div class="label-sign">Signature & Cachet officiel</div>
    <div class="qr-placeholder">QR Code</div>
  </div>
  <div class="footer">
    Ce document est généré par le système eAdministration Suite de la République de Guinée — ${req.reference} — ${new Date().toLocaleDateString('fr-FR')}
  </div>
</body>
</html>`
    return {
      id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: `${req.serviceName} — République de Guinée`,
      htmlContent,
      generatedAt: new Date().toISOString(),
      generatedBy: req.assignedAgent || 'Agent traitant',
      fileName: `${req.reference.replaceAll('/', '-')}-${req.serviceName.replace(/\s+/g, '-').toLowerCase()}.html`,
    }
  }

  const handleGenerateAndMarkReady = () => {
    if (!selectedRequest) return
    const genDoc = generateOfficialDocument(selectedRequest)
    setGeneratedDocument(selectedRequest.id, genDoc)
    updateRequestStatus(selectedRequest.id, 'prete', 'Document officiel généré et prêt pour le retrait')
    advanceTimeline(selectedRequest.id)
    setGenerateDialogOpen(false)
    setSuccessToast(`Document officiel généré pour ${selectedRequest.reference}`)
    refreshSelected(selectedRequest.id)
  }

  const handleVerifyDoc = (requestId: string, docId: string) => {
    verifyDocument(requestId, docId)
    setSuccessToast('Document vérifié avec succès')
    refreshSelected(requestId)
  }

  const handleDownloadGeneratedDoc = (req: CitizenRequest) => {
    if (!req.generatedDocument) return
    const blob = new Blob([req.generatedDocument.htmlContent], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = req.generatedDocument.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setSuccessToast(`Document ${req.reference} téléchargé`)
  }

  const categories = [...new Set(requests.map(r => r.category))]

  return (
    <div className="space-y-6 dashboard-bg-v2 min-h-screen">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <Card className="glass-premium overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-[#0B2E58] to-[#3B7DD8] dark:from-[#0B2E58] dark:to-[#143D6B] shadow-lg ring-1 ring-[#C8A45C]/30 dark:ring-[#D4B878]/20">
                <ClipboardCheck className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gradient-navy">Traitement des Demandes Citoyennes</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Gestion et traitement des demandes reçues via le portail public Guinée Services</p>
              </div>
              <Badge className="badge-premium hidden sm:inline-flex">
                <ClipboardCheck className="size-3" />
                Guinée Services
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="card-interactive premium-stat">
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.bg} ${stat.color} shadow-sm`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold tabular-nums tracking-tight">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs + Filters */}
      <Card className="glass-premium">
        <CardContent className="p-4 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
                <TabsTrigger value="soumises" className="gap-1 text-xs data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
                  <Send className="h-3 w-3" />
                  Soumises ({requests.filter(r => r.status === 'soumise').length})
                </TabsTrigger>
                <TabsTrigger value="en_cours" className="gap-1 text-xs data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
                  <Clock className="h-3 w-3" />
                  En cours ({requests.filter(r => ['en_cours', 'pieces_complementaires'].includes(r.status)).length})
                </TabsTrigger>
                <TabsTrigger value="validees" className="gap-1 text-xs data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
                  <Check className="h-3 w-3" />
                  Validées ({requests.filter(r => r.status === 'validee').length})
                </TabsTrigger>
                <TabsTrigger value="pretes" className="gap-1 text-xs data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
                  <CheckCircle2 className="h-3 w-3" />
                  Prêtes ({requests.filter(r => r.status === 'prete').length})
                </TabsTrigger>
                <TabsTrigger value="livrees" className="gap-1 text-xs data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
                  <Download className="h-3 w-3" />
                  Livrées ({requests.filter(r => r.status === 'livree').length})
                </TabsTrigger>
                <TabsTrigger value="rejetees" className="gap-1 text-xs data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
                  <XCircle className="h-3 w-3" />
                  Rejetées ({requests.filter(r => r.status === 'rejetee').length})
                </TabsTrigger>
                <TabsTrigger value="toutes" className="text-xs data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
                  Toutes ({requests.length})
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par référence, nom, service..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 glass-input focus-ring-premium" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main content: List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request List */}
        <div className="lg:col-span-2 space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredRequests.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className="card-interactive">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <FileText className="size-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground font-medium">Aucune demande dans cette catégorie</p>
                    <p className="text-xs text-muted-foreground mt-1">Les nouvelles demandes soumises par les citoyens apparaîtront ici</p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              filteredRequests.map((req, i) => {
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
                    <Card
                      className={`card-interactive ${selectedRequest?.id === req.id ? 'ring-2 ring-[#0B2E58] dark:ring-[#3B7DD8] shadow-premium' : ''}`}
                      onClick={() => setSelectedRequest(req)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-10">
                              <AvatarFallback className={`${sConfig.color} text-xs font-bold`}>
                                {req.citizenFirstName[0]}{req.citizenName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm">{req.citizenFirstName} {req.citizenName}</p>
                              <p className="text-xs text-muted-foreground font-mono">{req.reference}</p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold backdrop-blur-sm ${sConfig.color}`}>
                            <SIcon className="size-3" />
                            {sConfig.label}
                          </span>
                        </div>
                        <div className="ml-13 pl-13 space-y-1">
                          <p className="text-sm font-medium">{req.serviceName}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Building2 className="size-3" />{req.assignedService}</span>
                            <span className="flex items-center gap-1"><Calendar className="size-3" />{new Date(req.createdAt).toLocaleDateString('fr-FR')}</span>
                            {req.assignedAgent && <span className="flex items-center gap-1"><User className="size-3" />{req.assignedAgent}</span>}
                          </div>
                          {req.deliveryMode && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="size-3" />
                              {req.deliveryMode === 'en_ligne' ? 'Livraison en ligne' : req.deliveryMode === 'guichet' ? 'Retrait au guichet' : 'Envoi par courrier'}
                            </div>
                          )}
                        </div>
                        {/* Quick action for soumises */}
                        {req.status === 'soumise' && (
                          <div className="mt-3 flex gap-2">
                            <Button size="sm" className="btn-premium gap-1 h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleTakeCharge(req) }}>
                              <Play className="size-3" />
                              Prendre en charge
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 gap-1 h-7 text-xs" onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); setRejectDialogOpen(true) }}>
                              <XCircle className="size-3" />
                              Rejeter
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })
            )}
          </AnimatePresence>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selectedRequest ? (
            <motion.div key={selectedRequest.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <Card className="glass-premium sticky top-24">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] font-semibold ${STATUS_CONFIG[selectedRequest.status].color}`}>
                      {STATUS_CONFIG[selectedRequest.status].label}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{selectedRequest.serviceName}</CardTitle>
                  <CardDescription className="text-xs font-mono">{selectedRequest.reference}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Citizen info */}
                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informations du citoyen</h4>
                    <div className="grid grid-cols-1 gap-1.5 text-xs">
                      <div className="flex items-center gap-2"><User className="size-3 text-muted-foreground" /><span className="font-medium">{selectedRequest.citizenFirstName} {selectedRequest.citizenName}</span></div>
                      <div className="flex items-center gap-2"><Hash className="size-3 text-muted-foreground" />NIN : {selectedRequest.citizenNIN}</div>
                      <div className="flex items-center gap-2"><Phone className="size-3 text-muted-foreground" />{selectedRequest.citizenPhone}</div>
                      {selectedRequest.citizenEmail && <div className="flex items-center gap-2"><Mail className="size-3 text-muted-foreground" />{selectedRequest.citizenEmail}</div>}
                      <div className="flex items-center gap-2"><MapPin className="size-3 text-muted-foreground" />{selectedRequest.citizenAddress}</div>
                    </div>
                  </div>

                  {/* Uploaded Documents */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Paperclip className="size-3.5" />
                      Pièces justificatives ({selectedRequest.uploadedDocuments?.length ?? 0} chargée{(selectedRequest.uploadedDocuments?.length ?? 0) > 1 ? 's' : ''} / {selectedRequest.documents?.length ?? 0} requise{(selectedRequest.documents?.length ?? 0) > 1 ? 's' : ''})
                    </h4>
                    <div className="space-y-1.5">
                      {(selectedRequest.documents ?? []).map((docName, i) => {
                        const uploaded = (selectedRequest.uploadedDocuments ?? []).find(d => d.requiredDocName === docName)
                        return (
                          <div key={i} className={`flex items-center justify-between p-2 rounded-lg text-xs border ${uploaded ? (uploaded.verified ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-900/10' : 'border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/10') : 'border-dashed border-muted-foreground/30 bg-muted/20'}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              {uploaded ? (
                                <>
                                  <span className={`text-[8px] font-bold ${getFileTypeIcon(uploaded.type).color}`}>{getFileTypeIcon(uploaded.type).icon}</span>
                                  <div className="min-w-0">
                                    <p className="font-medium truncate">{docName}</p>
                                    <p className="text-[10px] text-muted-foreground">{uploaded.name} ({formatFileSize(uploaded.size)})</p>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <Paperclip className="size-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">{docName}</span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {uploaded ? (
                                <>
                                  {uploaded.verified ? (
                                    <Badge className="text-[8px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 gap-0.5 px-1.5">
                                      <FileCheck className="size-2.5" /> Vérifié
                                    </Badge>
                                  ) : (
                                    <Button size="sm" variant="outline" className="h-5 text-[9px] gap-0.5 px-1.5" onClick={() => handleVerifyDocument(selectedRequest.id, uploaded.id)}>
                                      <Check className="size-2.5" /> Vérifier
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => downloadUploadedFile(uploaded)}>
                                    <Download className="size-3" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <input type="file" accept={ACCEPTED_FILE_TYPES} className="hidden" id={`agent-upload-${i}`} onChange={async (e) => { if (e.target.files?.[0]) { await handleAddDocumentToRequest(e.target.files[0], selectedRequest.id); e.target.value = '' } }} />
                                  <Button size="sm" variant="outline" className="h-5 text-[9px] gap-0.5 px-1.5" onClick={() => document.getElementById(`agent-upload-${i}`)?.click()}>
                                    <UploadIcon className="size-2.5" /> Ajouter
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Uploaded documents */}
                  {(selectedRequest.uploadedDocuments?.length ?? 0) > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Documents chargés ({selectedRequest.uploadedDocuments?.length ?? 0})</h4>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {(selectedRequest.uploadedDocuments ?? []).map((doc) => (
                          <div key={doc.id} className="flex items-center gap-2 p-2 rounded-lg border text-xs">
                            {getDocIcon(doc.type)}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{doc.name}</p>
                              <p className="text-muted-foreground">{formatFileSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {!doc.verified && (
                                <Button size="sm" variant="outline" className="h-6 px-2 text-emerald-600 text-[10px] gap-1" onClick={() => handleVerifyDoc(selectedRequest.id, doc.id)}>
                                  <Check className="size-3" />
                                  Vérifier
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => previewUploadedFile(doc)}>
                                <Eye className="size-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => downloadUploadedFile(doc)}>
                                <Download className="size-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Generated document */}
                  {selectedRequest.generatedDocument && (
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 space-y-2">
                      <div className="flex items-center gap-2">
                        <Stamp className="size-4 text-emerald-600" />
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Document officiel généré</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground ml-6">
                        Par {selectedRequest.generatedDocument.generatedBy} le {new Date(selectedRequest.generatedDocument.generatedAt).toLocaleDateString('fr-FR')}
                      </p>
                      <Button size="sm" className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white ml-6" onClick={() => handleDownloadGeneratedDoc(selectedRequest)}>
                        <Download className="size-3" />
                        Télécharger le document
                      </Button>
                    </div>
                  )}

                  {/* Assigned service */}
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

                  {/* Processing notes */}
                  {selectedRequest.processingNotes.length > 0 && (
                    <>
                      <div className="divider-premium" />
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes de traitement ({selectedRequest.processingNotes.length})</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
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

                  {/* Action buttons */}
                  <div className="divider-premium" />
                  <div className="flex flex-wrap gap-2">
                    {selectedRequest.status === 'soumise' && (
                      <Button size="sm" className="btn-premium flex-1 gap-1" onClick={() => handleTakeCharge(selectedRequest)}>
                        <Play className="size-3.5" />
                        Prendre en charge
                      </Button>
                    )}
                    {(selectedRequest.status === 'en_cours' || selectedRequest.status === 'pieces_complementaires') && (
                      <>
                        <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => handleValidate(selectedRequest)}>
                          <Check className="size-3.5" />
                          Valider
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => { setNoteType('info_complementaire'); setNoteDialogOpen(true) }}>
                          <AlertCircle className="size-3.5" />
                          Demander pièces
                        </Button>
                      </>
                    )}
                    {selectedRequest.status === 'validee' && (
                      <Button size="sm" className="btn-gold flex-1 gap-1" onClick={() => setGenerateDialogOpen(true)}>
                        <Stamp className="size-3.5" />
                        Générer le document
                      </Button>
                    )}
                    {selectedRequest.status === 'prete' && (
                      <Button size="sm" className="btn-premium flex-1 gap-1" onClick={() => setDeliveryDialogOpen(true)}>
                        <Download className="size-3.5" />
                        Livrer le document
                      </Button>
                    )}
                    {selectedRequest.status !== 'livree' && selectedRequest.status !== 'rejetee' && (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => { setNoteType('note'); setNoteDialogOpen(true) }}>
                        <MessageSquare className="size-3.5" />
                        Note
                      </Button>
                    )}
                    {selectedRequest.status !== 'livree' && selectedRequest.status !== 'rejetee' && (
                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 gap-1" onClick={() => setRejectDialogOpen(true)}>
                        <XCircle className="size-3.5" />
                        Rejeter
                      </Button>
                    )}
                  </div>

                  {/* Generate Official Document */}
                  {selectedRequest.status === 'validee' && (
                    <Button size="sm" className="btn-gold w-full gap-2" onClick={() => setGenerateDocDialogOpen(true)}>
                      <FileText className="size-4" />
                      Générer le document officiel
                    </Button>
                  )}

                  {/* Download Generated Document */}
                  {(selectedRequest.status === 'prete' || selectedRequest.status === 'livree') && selectedRequest.generatedDocument && (
                    <div className="space-y-2">
                      <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/40">
                        <div className="flex items-center gap-2 mb-1">
                          <FileCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Document officiel généré</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Généré le {new Date(selectedRequest.generatedDocument.generatedAt).toLocaleDateString('fr-FR')} par {selectedRequest.generatedDocument.generatedBy}</p>
                      </div>
                      <Button size="sm" className="btn-premium w-full gap-2" onClick={handleDownloadDocument}>
                        <Download className="size-4" />
                        Télécharger le document officiel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <Card className="card-interactive">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <ClipboardCheck className="size-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Sélectionnez une demande pour voir les détails</p>
                <p className="text-xs text-muted-foreground mt-1">Traitez les demandes citoyennes et suivez leur avancement</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{noteType === 'info_complementaire' ? 'Demander des pièces complémentaires' : 'Ajouter une note'}</DialogTitle>
            <DialogDescription>
              {noteType === 'info_complementaire'
                ? 'Précisez les documents supplémentaires requis du citoyen'
                : 'Ajoutez une note au dossier de traitement'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder={noteType === 'info_complementaire' ? 'Listez les pièces complémentaires nécessaires...' : 'Rédigez votre note...'}
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={4}
              className="glass-input focus-ring-premium"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>Annuler</Button>
            <Button className="btn-premium" onClick={noteType === 'info_complementaire' ? handleRequestMoreInfo : handleAddNote} disabled={!noteText.trim()}>
              {noteType === 'info_complementaire' ? 'Envoyer la demande' : 'Publier la note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery Dialog */}
      <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="size-5 text-emerald-600" />
              Livrer le document
            </DialogTitle>
            <DialogDescription>Confirmez la livraison du document au citoyen</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p><strong>Référence :</strong> <span className="font-mono">{selectedRequest.reference}</span></p>
                <p><strong>Service :</strong> {selectedRequest.serviceName}</p>
                <p><strong>Citoyen :</strong> {selectedRequest.citizenFirstName} {selectedRequest.citizenName}</p>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Mode de livraison</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'guichet' as const, label: 'Au guichet', icon: Building2 },
                    { value: 'en_ligne' as const, label: 'En ligne', icon: Download },
                    { value: 'courrier' as const, label: 'Par courrier', icon: Mail },
                  ].map(option => (
                    <div
                      key={option.value}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all text-center ${
                        deliveryMode === option.value ? 'border-[#0B2E58] dark:border-[#3B7DD8] bg-[#0B2E58]/5 dark:bg-[#3B7DD8]/10' : 'border-muted'
                      }`}
                      onClick={() => setDeliveryMode(option.value)}
                    >
                      <option.icon className={`size-5 mx-auto mb-1 ${deliveryMode === option.value ? 'text-[#0B2E58] dark:text-[#3B7DD8]' : 'text-muted-foreground'}`} />
                      <p className="text-xs font-medium">{option.label}</p>
                    </div>
                  ))}
                </div>

                {deliveryMode === 'guichet' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Lieu de retrait</Label>
                    <Input placeholder="Ex: Mairie de Kaloum, Bureau d'État Civil..." value={deliveryLocation} onChange={e => setDeliveryLocation(e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliveryDialogOpen(false)}>Annuler</Button>
            <Button className="btn-premium gap-2" onClick={handleDeliver}>
              <CheckCircle2 className="size-4" />
              Confirmer la livraison
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Document Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stamp className="size-5 text-emerald-600" />
              Générer le document officiel
            </DialogTitle>
            <DialogDescription>Un document officiel sera généré et la demande passera au statut « Prêt »</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p><strong>Référence :</strong> <span className="font-mono">{selectedRequest.reference}</span></p>
                <p><strong>Service :</strong> {selectedRequest.serviceName}</p>
                <p><strong>Citoyen :</strong> {selectedRequest.citizenFirstName} {selectedRequest.citizenName}</p>
                <p><strong>NIN :</strong> {selectedRequest.citizenNIN}</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Le document contiendra :</p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-1 ml-4 list-disc">
                  <li>En-tête officiel de la République de Guinée</li>
                  <li>Informations du titulaire</li>
                  <li>Référence unique du document</li>
                  <li>Filigrane de sécurité eAdministration Suite</li>
                  <li>Emplacement pour signature et cachet</li>
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>Annuler</Button>
            <Button className="btn-gold gap-2" onClick={handleGenerateAndMarkReady}>
              <Stamp className="size-4" />
              Générer et marquer prêt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="size-5" />
              Rejeter la demande
            </DialogTitle>
            <DialogDescription>Motivez le rejet de cette demande</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea placeholder="Raison du rejet..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} className="glass-input focus-ring-premium" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Annuler</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white gap-2" onClick={handleReject} disabled={!rejectReason.trim()}>
              <XCircle className="size-4" />
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Document Dialog */}
      <Dialog open={generateDocDialogOpen} onOpenChange={setGenerateDocDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5 text-[#C8A45C]" />
              Générer le document officiel
            </DialogTitle>
            <DialogDescription>Générez le document officiel pour cette demande</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p><strong>Référence :</strong> <span className="font-mono">{selectedRequest.reference}</span></p>
                <p><strong>Service :</strong> {selectedRequest.serviceName}</p>
                <p><strong>Citoyen :</strong> {selectedRequest.citizenFirstName} {selectedRequest.citizenName}</p>
                <p><strong>Documents vérifiés :</strong> {(selectedRequest.uploadedDocuments ?? []).filter(d => d.verified).length} / {selectedRequest.documents?.length ?? 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  En confirmant, le document officiel sera généré et la demande passera au statut "Document prêt". Le citoyen pourra alors le télécharger.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDocDialogOpen(false)}>Annuler</Button>
            <Button className="btn-gold gap-2" onClick={handleGenerateDocument}>
              <FileText className="size-4" />
              Confirmer la génération
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
            className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-white text-sm font-medium shadow-lg"
          >
            <CheckCircle2 className="size-4" />
            {successToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
