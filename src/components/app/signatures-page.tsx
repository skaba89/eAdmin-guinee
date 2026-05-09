'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PenTool, CheckCircle2, Clock, XCircle, Shield, QrCode,
  FileText, User, Calendar, Hash, Award, Eye, MoreHorizontal,
  Fingerprint, FileCheck, Mail, GitBranch, UserCheck
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { useAppStore } from '@/store/app-store'

interface SignatureRequest {
  id: string
  documentName: string
  requestedBy: string
  requestedByName: string
  date: string
  status: 'en_attente' | 'signée' | 'rejetée'
  type: 'Visa' | 'Signature' | 'Cachet'
  hash?: string
  certificate?: string
  timestamp?: string
  qrCode?: string
}

const FAKE_SIGNATURES: SignatureRequest[] = [
  { id: '1', documentName: 'Arrêté n°2024-001/AIT', requestedBy: 'cabinet', requestedByName: 'Cabinet du Ministre', date: '2024-12-15', status: 'en_attente', type: 'Signature' },
  { id: '2', documentName: 'Décret n°D/2024/089/PRG', requestedBy: 'sgg', requestedByName: 'Secrétariat Général du Gouvernement', date: '2024-12-14', status: 'signée', type: 'Signature', hash: 'a7f3b2c9d1e4f5a6b7c8d9e0f1a2b3c4', certificate: 'CN=Certigna/C=GN', timestamp: '2024-12-14 16:42:31 GMT' },
  { id: '3', documentName: 'Circulaire n°C/2024/045/MAT', requestedBy: 'mat', requestedByName: 'Ministère de l\'Administration Territoriale', date: '2024-12-13', status: 'en_attente', type: 'Visa' },
  { id: '4', documentName: 'Convention UNDP 2025', requestedBy: 'coop', requestedByName: 'Direction de la Coopération', date: '2024-12-12', status: 'signée', type: 'Signature', hash: 'd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9', certificate: 'CN=Certigna/C=GN', timestamp: '2024-12-12 11:18:45 GMT' },
  { id: '5', documentName: 'Marché public MP-2024-567', requestedBy: 'marche', requestedByName: 'Commission des Marchés Publics', date: '2024-12-11', status: 'en_attente', type: 'Cachet' },
  { id: '6', documentName: 'Budget prévisionnel 2025', requestedBy: 'dgb', requestedByName: 'Direction Générale du Budget', date: '2024-12-10', status: 'signée', type: 'Visa', hash: 'b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6', certificate: 'CN=Certigna/C=GN', timestamp: '2024-12-10 09:55:12 GMT' },
  { id: '7', documentName: 'Procès-verbal CS-2024-089', requestedBy: 'cs', requestedByName: 'Conseil des Secrétaires', date: '2024-12-09', status: 'rejetée', type: 'Signature' },
  { id: '8', documentName: 'Ordonnance n°O/2024/023/PRG', requestedBy: 'pres', requestedByName: 'Présidence de la République', date: '2024-12-08', status: 'signée', type: 'Signature', hash: 'e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1', certificate: 'CN=ANSSI/C=GN', timestamp: '2024-12-08 14:22:08 GMT' },
]

const STATUS_MAP = {
  en_attente: { label: 'En attente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  signée: { label: 'Signée', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  rejetée: { label: 'Rejetée', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
}

export function SignaturesPage() {
  const navigate = useAppStore((s) => s.navigate)
  const [signatures, setSignatures] = useState<SignatureRequest[]>(FAKE_SIGNATURES)
  const [activeTab, setActiveTab] = useState('en_attente')
  const [selectedSig, setSelectedSig] = useState<SignatureRequest | null>(null)
  const [signDialogOpen, setSignDialogOpen] = useState(false)
  const [verifyResult, setVerifyResult] = useState<SignatureRequest | null>(null)
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false)
  const [successToast, setSuccessToast] = useState('')

  const filtered = signatures.filter(s => {
    if (activeTab === 'en_attente') return s.status === 'en_attente'
    if (activeTab === 'signees') return s.status === 'signée'
    return true
  })

  const totalSignees = signatures.filter(s => s.status === 'signée').length
  const totalEnAttente = signatures.filter(s => s.status === 'en_attente').length
  const tauxConformite = 98.5

  const stats = [
    { label: 'Total signées', value: totalSignees, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'En attente', value: totalEnAttente, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Taux conformité', value: `${tauxConformite}%`, icon: Shield, color: 'text-brand dark:text-primary', bg: 'bg-brand/5 dark:bg-primary/10' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
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
                { label: 'Upload document', icon: FileText, color: 'bg-[#0B2E58] hover:bg-[#0B2E58]/90 text-white', onClick: () => navigate('ged') },
                { label: 'Nouveau courrier', icon: Mail, color: 'bg-[#3B7DD8] hover:bg-[#3B7DD8]/90 text-white', onClick: () => navigate('courriers') },
                { label: 'Lancer un workflow', icon: GitBranch, color: 'bg-[#C8A45C] hover:bg-[#C8A45C]/90 text-[#0B2E58]', onClick: () => navigate('workflow') },
                { label: 'Demandes citoyennes', icon: UserCheck, color: 'bg-emerald-600 hover:bg-emerald-600/90 text-white', onClick: () => navigate('service-requests') },
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="en_attente" className="gap-1">
            <Clock className="h-3.5 w-3.5" />
            En attente ({totalEnAttente})
          </TabsTrigger>
          <TabsTrigger value="signees" className="gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Signées ({totalSignees})
          </TabsTrigger>
          <TabsTrigger value="toutes">
            Toutes ({signatures.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Signature Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((sig, i) => {
            const sConfig = STATUS_MAP[sig.status]
            const StatusIcon = sConfig.icon
            return (
              <motion.div
                key={sig.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                layout
              >
                <Card className="glass-card hover:shadow-lg transition-all group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className={`p-2 rounded-lg ${sig.status === 'signée' ? 'bg-emerald-50 dark:bg-emerald-900/20' : sig.status === 'en_attente' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                        <PenTool className={`h-5 w-5 ${sig.status === 'signée' ? 'text-emerald-600 dark:text-emerald-400' : sig.status === 'en_attente' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`} />
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${sConfig.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {sConfig.label}
                      </span>
                    </div>
                    <CardTitle className="text-sm mt-2 line-clamp-2 group-hover:text-brand dark:group-hover:text-primary transition-colors">
                      {sig.documentName}
                    </CardTitle>
                    <CardDescription className="text-xs">{sig.type}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">{sig.requestedByName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span>{sig.date}</span>
                      </div>
                    </div>

                    {/* QR Code placeholder for signed */}
                    {sig.status === 'signée' && (
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <div className="h-12 w-12 rounded bg-brand/5 dark:bg-primary/10 flex items-center justify-center border border-dashed border-brand/20 dark:border-primary/20">
                          <QrCode className="h-8 w-8 text-brand/40 dark:text-primary/40" />
                        </div>
                        <div className="text-[10px] text-muted-foreground space-y-0.5">
                          <p>Horodatage: {sig.timestamp}</p>
                          <p>Hash: {sig.hash?.slice(0, 16)}...</p>
                          <p>Cert: {sig.certificate}</p>
                        </div>
                      </div>
                    )}

                    {/* Electronic Visa Display */}
                    {sig.status === 'signée' && (
                      <div className="flex items-center gap-2 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
                        <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">Visa électronique validé</p>
                          <p className="text-[10px] text-muted-foreground">Certificat conforme ANSSI</p>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {sig.status === 'en_attente' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1 h-8 text-xs"
                          onClick={() => { setSelectedSig(sig); setSignDialogOpen(true) }}
                        >
                          <PenTool className="h-3 w-3" />
                          Signer
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 text-red-600 hover:text-red-700 gap-1 h-8 text-xs" onClick={() => {
                          setSignatures(prev => prev.map(s => s.id === sig.id ? { ...s, status: 'rejetée' as const } : s))
                          setSuccessToast('Signature rejetée')
                        }}>
                          <XCircle className="h-3 w-3" />
                          Rejeter
                        </Button>
                      </div>
                    )}

                    {sig.status === 'signée' && (
                      <Button size="sm" variant="outline" className="w-full gap-1 h-8 text-xs" onClick={() => {
                        setVerifyResult(sig)
                        setVerifyDialogOpen(true)
                      }}>
                        <Eye className="h-3 w-3" />
                        Vérifier l&apos;intégrité
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Sign Dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-brand dark:text-primary" />
              Signature électronique
            </DialogTitle>
            <DialogDescription>Confirmer la signature du document</DialogDescription>
          </DialogHeader>
          {selectedSig && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-brand dark:text-primary" />
                  <span className="font-medium text-sm">{selectedSig.documentName}</span>
                </div>
                <p className="text-xs text-muted-foreground">Type: {selectedSig.type}</p>
                <p className="text-xs text-muted-foreground">Demandé par: {selectedSig.requestedByName}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Informations de vérification</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Fingerprint className="h-3.5 w-3.5" />
                    Empreinte numérique
                  </div>
                  <span className="font-mono text-[10px]">SHA-256</span>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Shield className="h-3.5 w-3.5" />
                    Certificat
                  </div>
                  <span className="font-mono text-[10px]">CN=Certigna/C=GN</span>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Horodatage
                  </div>
                  <span className="font-mono text-[10px]">{new Date().toISOString()}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  ⚠️ En signant ce document, vous certifiez l\'authenticité et l\'intégrité du contenu.
                  Cette action est juridiquement contraignante selon la loi guinéenne.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignDialogOpen(false)}>Annuler</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={() => {
              if (selectedSig) {
                const now = new Date()
                setSignatures(prev => prev.map(s => s.id === selectedSig.id ? {
                  ...s,
                  status: 'signée' as const,
                  hash: Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
                  certificate: 'CN=Certigna/C=GN',
                  timestamp: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} GMT`,
                } : s))
              }
              setSignDialogOpen(false)
              setSuccessToast('Document signé avec succès')
            }}>
              <PenTool className="h-4 w-4" />
              Confirmer la signature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Integrity Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Vérification d&apos;intégrité
            </DialogTitle>
            <DialogDescription>Résultat de la vérification du document</DialogDescription>
          </DialogHeader>
          {verifyResult && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-brand dark:text-primary" />
                  <span className="font-medium text-sm">{verifyResult.documentName}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Hash vérifié</p>
                    <p className="text-xs text-muted-foreground font-mono">{verifyResult.hash}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Certificat valide</p>
                    <p className="text-xs text-muted-foreground font-mono">{verifyResult.certificate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Horodatage vérifié</p>
                    <p className="text-xs text-muted-foreground font-mono">{verifyResult.timestamp}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Intégrité vérifiée - Document conforme</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Toast */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-600 text-white shadow-lg"
            onAnimationComplete={() => {
              setTimeout(() => setSuccessToast(''), 4000)
            }}
          >
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
