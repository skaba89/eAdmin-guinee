'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database, Search, Filter, FileText, Shield, MapPin, Phone, Mail,
  Calendar, Hash, Users, Baby, Heart, CheckCircle2, XCircle,
  AlertTriangle, Download, Eye, ChevronDown, ChevronRight,
  Building2, Landmark, Globe, Award, BookOpen, IdCard, Car,
  Stethoscope, Home, Receipt, GraduationCap, User, Clock,
  ArrowRight, Fingerprint, Stamp, Activity, Zap
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import {
  getAllCitizens, searchCitizens, searchBirthCertificates, getDatabaseStats,
  findCitizenByNIN, getBirthCertificateByActNumber,
  type CitizenRecord, type BirthCertificateDetail
} from '@/lib/citizen-database'
import { useAppStore } from '@/store/app-store'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return dateStr
  }
}

// Birth Certificate Document Preview Component
function BirthCertificatePreview({ citizen }: { citizen: CitizenRecord }) {
  const detail = citizen.birthCertificateDetail
  if (!detail) return null

  return (
    <div className="relative bg-white dark:bg-slate-50 text-slate-900 rounded-lg overflow-hidden shadow-2xl border-2 border-[#C8A45C]/40">
      {/* Guinea tricolor */}
      <div className="flex h-2">
        <div className="flex-1" style={{ backgroundColor: '#CE1126' }} />
        <div className="flex-1" style={{ backgroundColor: '#FCD116' }} />
        <div className="flex-1" style={{ backgroundColor: '#009460' }} />
      </div>

      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
        <span className="text-6xl font-black -rotate-45 select-none">RÉPUBLIQUE DE GUINÉE</span>
      </div>

      <div className="p-6 md:p-8 relative">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-600">République de Guinée</p>
          <p className="text-[10px] text-slate-500 italic">Travail — Justice — Solidarité</p>
          <Separator className="my-2 bg-[#C8A45C]/30" />
          <p className="text-xs font-semibold text-slate-700">Commune de {detail.registrationCommune}</p>
          <p className="text-[10px] text-slate-500">Bureau de l&apos;État Civil — Préfecture de {detail.registrationPrefecture}</p>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-black uppercase tracking-wide text-[#0B2E58] border-b-2 border-[#C8A45C] pb-1 inline-block">
            Extrait d&apos;Acte de Naissance
          </h3>
          <p className="text-[10px] mt-1 text-slate-500">N° {detail.actNumber}</p>
        </div>

        {/* Body */}
        <div className="space-y-4 text-sm">
          <p className="italic text-slate-600 text-xs leading-relaxed">
            Le soussigné, Officier de l&apos;État Civil de la Commune de {detail.registrationCommune}, certifie que les renseignements suivants sont exacts et conformes aux registres de l&apos;état civil :
          </p>

          {/* Child info */}
          <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
            <p className="text-[10px] uppercase tracking-wider font-bold text-blue-800 mb-2">Enfant</p>
            <div className="grid grid-cols-2 gap-x-2 sm:gap-x-4 gap-y-1 text-xs">
              <p><span className="text-slate-500">Nom :</span> <span className="font-semibold">{citizen.name}</span></p>
              <p><span className="text-slate-500">Prénom(s) :</span> <span className="font-semibold">{citizen.firstName}</span></p>
              <p><span className="text-slate-500">Sexe :</span> <span className="font-semibold">{citizen.gender === 'M' ? 'Masculin' : 'Féminin'}</span></p>
              <p><span className="text-slate-500">Date de naissance :</span> <span className="font-semibold">{formatDate(citizen.dateOfBirth)}</span></p>
              <p className="col-span-2"><span className="text-slate-500">Lieu de naissance :</span> <span className="font-semibold">{citizen.placeOfBirth}</span></p>
            </div>
          </div>

          {/* Father info */}
          <div className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-100">
            <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-800 mb-2">Père</p>
            <div className="grid grid-cols-2 gap-x-2 sm:gap-x-4 gap-y-1 text-xs">
              <p><span className="text-slate-500">Nom :</span> <span className="font-semibold">{detail.fatherName}</span></p>
              <p><span className="text-slate-500">Prénom :</span> <span className="font-semibold">{detail.fatherFirstName}</span></p>
              <p><span className="text-slate-500">Né le :</span> <span className="font-semibold">{formatDate(detail.fatherDateOfBirth)}</span></p>
              <p><span className="text-slate-500">À :</span> <span className="font-semibold">{detail.fatherPlaceOfBirth}</span></p>
              <p className="col-span-2"><span className="text-slate-500">Nationalité :</span> <span className="font-semibold">{detail.fatherNationality}</span></p>
            </div>
          </div>

          {/* Mother info */}
          <div className="bg-pink-50/50 rounded-lg p-3 border border-pink-100">
            <p className="text-[10px] uppercase tracking-wider font-bold text-pink-800 mb-2">Mère</p>
            <div className="grid grid-cols-2 gap-x-2 sm:gap-x-4 gap-y-1 text-xs">
              <p><span className="text-slate-500">Nom :</span> <span className="font-semibold">{detail.motherName}</span></p>
              <p><span className="text-slate-500">Prénom :</span> <span className="font-semibold">{detail.motherFirstName}</span></p>
              <p><span className="text-slate-500">Née le :</span> <span className="font-semibold">{formatDate(detail.motherDateOfBirth)}</span></p>
              <p><span className="text-slate-500">À :</span> <span className="font-semibold">{detail.motherPlaceOfBirth}</span></p>
              <p className="col-span-2"><span className="text-slate-500">Nationalité :</span> <span className="font-semibold">{detail.motherNationality}</span></p>
            </div>
          </div>

          {/* Declarant & Registration */}
          <div className="bg-amber-50/50 rounded-lg p-3 border border-amber-100">
            <p className="text-[10px] uppercase tracking-wider font-bold text-amber-800 mb-2">Déclaration & Enregistrement</p>
            <div className="grid grid-cols-2 gap-x-2 sm:gap-x-4 gap-y-1 text-xs">
              <p><span className="text-slate-500">Déclarant :</span> <span className="font-semibold">{detail.declarantName}</span></p>
              <p><span className="text-slate-500">Lien :</span> <span className="font-semibold">{detail.declarantRelation}</span></p>
              <p><span className="text-slate-500">Déclaration le :</span> <span className="font-semibold">{formatDate(detail.declarationDate)}</span></p>
              <p><span className="text-slate-500">Enregistré le :</span> <span className="font-semibold">{formatDate(detail.registrationDate)}</span></p>
              <p className="col-span-2"><span className="text-slate-500">Officier d&apos;état civil :</span> <span className="font-semibold">{detail.officerName}</span></p>
            </div>
          </div>

          {/* Marginal notes */}
          {detail.marginalNotes.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-600 mb-2">Mentions marginales</p>
              {detail.marginalNotes.map((note, i) => (
                <p key={i} className="text-xs text-slate-600">{note}</p>
              ))}
            </div>
          )}

          {/* Legal statement */}
          <p className="italic text-slate-500 text-xs leading-relaxed mt-4">
            En foi de quoi, le présent extrait est délivré pour servir et valoir ce que de droit.
            Toute fausse déclaration est passible des poursuites prévues par la loi.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-end justify-between">
          <div className="text-xs text-slate-500">
            <p>Code de la Famille, Art. 34-42</p>
            <p>Ordonnance n°011/PRG/87</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Fait à {detail.registrationCommune}, le {new Date().toLocaleDateString('fr-FR')}</p>
            <div className="mt-2 mx-auto w-24 h-24 rounded-full border-2 border-dashed border-[#C8A45C]/40 flex items-center justify-center">
              <span className="text-[9px] text-slate-400 text-center">Cachet et Signature</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">L&apos;Officier de l&apos;État Civil</p>
          </div>
        </div>
      </div>

      {/* Security strip */}
      <div className="h-1 bg-gradient-to-r from-[#0B2E58] via-[#C8A45C] to-[#0B2E58]" />
    </div>
  )
}

// Citizen Detail Dialog
function CitizenDetailDialog({ citizen, open, onClose }: { citizen: CitizenRecord | null; open: boolean; onClose: () => void }) {
  const [showBirthCert, setShowBirthCert] = useState(false)

  if (!citizen) return null

  const detail = citizen.birthCertificateDetail

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-[#0B2E58] dark:text-[#3B7DD8]" />
            Fiche Citoyenne — {citizen.firstName} {citizen.name}
          </DialogTitle>
          <DialogDescription>Dossier complet du citoyen dans la base nationale</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Identity Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-3">
              <p className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">NIN</p>
              <p className="text-sm font-bold font-mono">{citizen.nin}</p>
            </div>
            <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-3">
              <p className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">Date de naissance</p>
              <p className="text-sm font-bold">{formatDate(citizen.dateOfBirth)}</p>
            </div>
            <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-3">
              <p className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">Lieu de naissance</p>
              <p className="text-sm font-bold">{citizen.placeOfBirth}</p>
            </div>
            <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-3">
              <p className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">Nationalité</p>
              <p className="text-sm font-bold capitalize">{citizen.nationality}</p>
            </div>
          </div>

          {/* Contact & Address */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2"><Phone className="size-3.5 text-muted-foreground" />{citizen.phone}</div>
                <div className="flex items-center gap-2"><Mail className="size-3.5 text-muted-foreground" />{citizen.email}</div>
                <div className="flex items-center gap-2 col-span-2"><MapPin className="size-3.5 text-muted-foreground" />{citizen.address}</div>
                <div className="flex items-center gap-2"><Building2 className="size-3.5 text-muted-foreground" />Commune: {citizen.commune}</div>
                <div className="flex items-center gap-2"><Landmark className="size-3.5 text-muted-foreground" />Préfecture: {citizen.prefecture}</div>
              </div>
            </CardContent>
          </Card>

          {/* Documents Held */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Documents détenus</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { label: 'CNI', has: citizen.hasCNI, number: citizen.cniNumber, expiry: citizen.cniExpiry, icon: IdCard },
                  { label: 'Passeport', has: citizen.hasPassport, number: citizen.passportNumber, icon: Globe },
                  { label: 'Acte de naissance', has: citizen.hasBirthCertificate, number: citizen.birthCertificateNumber, icon: Baby },
                  { label: 'Acte de mariage', has: citizen.hasMarriageCertificate, number: citizen.marriageCertificateNumber, icon: Heart },
                  { label: 'Permis de conduire', has: citizen.hasDrivingLicense, number: citizen.drivingLicenseNumber, icon: Car },
                  { label: 'Carnet vaccination', has: citizen.hasVaccinationCard, number: null, icon: Stethoscope },
                  { label: 'Carte sanitaire', has: citizen.hasSanitaryCard, number: null, icon: Heart },
                  { label: 'Certificat résidence', has: citizen.hasResidenceCertificate, number: citizen.residenceCertificateDate, icon: Home },
                  { label: 'NIF', has: citizen.hasNIF, number: citizen.nifNumber, icon: Receipt },
                ].map((doc) => (
                  <div key={doc.label} className={`flex items-center gap-2 p-2 rounded-lg border ${doc.has ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40'}`}>
                    <doc.icon className={`size-4 shrink-0 ${doc.has ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-400'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{doc.label}</p>
                      {doc.number && <p className="text-[10px] text-muted-foreground font-mono truncate">{doc.number}</p>}
                    </div>
                    {doc.has ? <CheckCircle2 className="size-3.5 text-emerald-500 ml-auto shrink-0" /> : <XCircle className="size-3.5 text-red-400 ml-auto shrink-0" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Status Flags */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={citizen.isMinor ? 'destructive' : 'secondary'}>{citizen.isMinor ? 'Mineur' : 'Majeur'}</Badge>
                <Badge variant={citizen.isDeceased ? 'destructive' : 'secondary'}>{citizen.isDeceased ? 'Décédé' : 'Vivant'}</Badge>
                <Badge variant={citizen.identityVerified ? 'default' : 'outline'}>{citizen.identityVerified ? 'Identité vérifiée' : 'Identité non vérifiée'}</Badge>
                <Badge variant={citizen.biometricVerified ? 'default' : 'outline'}>{citizen.biometricVerified ? 'Biométrique vérifiée' : 'Biométrique non vérifiée'}</Badge>
                <Badge variant={citizen.taxCompliant ? 'default' : 'destructive'}>{citizen.taxCompliant ? 'Conforme fiscalement' : 'Non-conforme fiscalement'}</Badge>
                <Badge variant={citizen.criminalRecordClear ? 'default' : 'destructive'}>{citizen.criminalRecordClear ? 'Casier vierge' : 'Antécédents judiciaires'}</Badge>
                <Badge variant={citizen.isEmployed ? 'default' : 'outline'}>{citizen.isEmployed ? `Employé: ${citizen.employer}` : 'Non employé'}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Birth Certificate Detail */}
          {citizen.hasBirthCertificate && detail && (
            <Card className="border-[#C8A45C]/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Baby className="h-4 w-4 text-[#C8A45C]" />
                    Acte de naissance — {detail.actNumber}
                  </CardTitle>
                  <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setShowBirthCert(!showBirthCert)}>
                    <Eye className="size-3" />
                    {showBirthCert ? 'Masquer le document' : 'Voir le document'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {showBirthCert ? (
                  <BirthCertificatePreview citizen={citizen} />
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[10px] text-muted-foreground">N° d&apos;acte</p>
                        <p className="font-mono font-semibold">{detail.actNumber}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Date d&apos;enregistrement</p>
                        <p className="font-semibold">{formatDate(detail.registrationDate)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Commune d&apos;enregistrement</p>
                        <p className="font-semibold">{detail.registrationCommune}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Préfecture</p>
                        <p className="font-semibold">{detail.registrationPrefecture}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Père</p>
                        <p className="font-semibold">{detail.fatherFirstName} {detail.fatherName}</p>
                        <p className="text-[10px] text-muted-foreground">Né le {formatDate(detail.fatherDateOfBirth)} à {detail.fatherPlaceOfBirth}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Mère</p>
                        <p className="font-semibold">{detail.motherFirstName} {detail.motherName}</p>
                        <p className="text-[10px] text-muted-foreground">Née le {formatDate(detail.motherDateOfBirth)} à {detail.motherPlaceOfBirth}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="text-sm">
                      <p className="text-[10px] text-muted-foreground">Déclarant</p>
                      <p className="font-semibold">{detail.declarantName} ({detail.declarantRelation})</p>
                    </div>
                    {detail.marginalNotes.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Mentions marginales</p>
                          {detail.marginalNotes.map((note, i) => (
                            <p key={i} className="text-xs bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-200 dark:border-amber-800/40">{note}</p>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────────
export function CitizenDatabasePage() {
  const { user } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [selectedCitizen, setSelectedCitizen] = useState<CitizenRecord | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [birthCertSearch, setBirthCertSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('all')

  const stats = useMemo(() => getDatabaseStats(), [])
  const allCitizens = useMemo(() => getAllCitizens(), [])

  // Filter citizens
  const filteredCitizens = useMemo(() => {
    let results: CitizenRecord[]

    if (activeTab === 'birth-certs') {
      results = searchBirthCertificates(searchQuery)
    } else {
      results = searchCitizens(searchQuery)
    }

    // Region filter
    if (regionFilter !== 'all') {
      results = results.filter(c =>
        c.region.toLowerCase() === regionFilter.toLowerCase() ||
        c.prefecture.toLowerCase() === regionFilter.toLowerCase() ||
        c.commune.toLowerCase() === regionFilter.toLowerCase()
      )
    }

    return results
  }, [searchQuery, activeTab, regionFilter])

  // Birth certificate specific search
  const birthCertResults = useMemo(() => {
    if (!birthCertSearch.trim()) return []
    return searchBirthCertificates(birthCertSearch)
  }, [birthCertSearch])

  const handleViewCitizen = (citizen: CitizenRecord) => {
    setSelectedCitizen(citizen)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0B2E58]/10 dark:bg-[#3B7DD8]/20">
            <Database className="h-6 w-6 text-[#0B2E58] dark:text-[#3B7DD8]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#0B2E58] dark:text-white">Base de Données Citoyenne</h2>
            <p className="text-sm text-muted-foreground">Consultation des registres nationaux — ANIP / État Civil de Guinée</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Citoyens enregistrés', value: stats.totalCitizens, icon: Users, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
          { label: 'Actes de naissance', value: stats.withBirthCertificate, icon: Baby, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'CNI délivrées', value: stats.withCNI, icon: IdCard, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { label: 'Identités vérifiées', value: stats.identityVerified, icon: Shield, color: 'text-[#0B2E58] dark:text-[#3B7DD8]', bg: 'bg-[#0B2E58]/5 dark:bg-[#3B7DD8]/10' },
          { label: 'Biométrie vérifiée', value: stats.biometricVerified, icon: Fingerprint, color: 'text-[#C8A45C] dark:text-[#D4B878]', bg: 'bg-[#C8A45C]/5 dark:bg-[#D4B878]/10' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="glass-card hover:shadow-lg transition-shadow">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Regional Distribution */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="border-[#0B2E58]/10 dark:border-[#3B7DD8]/20">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <MapPin className="size-4 text-[#0B2E58] dark:text-[#3B7DD8]" />
              Répartition par région
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {stats.byRegion.map(r => (
                <div key={r.region} className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-[#0B2E58] dark:text-[#3B7DD8]">{r.count}</p>
                  <p className="text-xs text-muted-foreground">{r.region}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs + Search */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
                <TabsTrigger value="all" className="gap-1 text-xs data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
                  <Users className="h-3 w-3" />
                  Tous les citoyens ({stats.totalCitizens})
                </TabsTrigger>
                <TabsTrigger value="birth-certs" className="gap-1 text-xs data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
                  <Baby className="h-3 w-3" />
                  Actes de naissance ({stats.withBirthCertificate})
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par NIN, nom, n° d'acte, commune..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-[180px]">
                <MapPin className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Région" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes régions</SelectItem>
                {[...new Set(allCitizens.map(c => c.region))].map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quick Birth Certificate Lookup */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-[#C8A45C]/20 bg-gradient-to-r from-[#C8A45C]/[0.03] to-transparent dark:from-[#D4B878]/[0.05] dark:to-transparent">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Baby className="size-4 text-[#C8A45C]" />
                  Recherche rapide d&apos;acte de naissance
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Entrez un numéro d&apos;acte (ex: ACT-NAI-1992-458723), un NIN ou le nom du citoyen pour retrouver directement l&apos;acte de naissance.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="N° d'acte, NIN ou nom..."
                      value={birthCertSearch}
                      onChange={e => setBirthCertSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {birthCertSearch.trim() && (
                    <Button
                      size="sm"
                      className="bg-[#C8A45C] hover:bg-[#C8A45C]/90 text-[#0B2E58] gap-1 h-9 text-xs font-semibold"
                      onClick={() => {
                        if (birthCertResults.length > 0) {
                          handleViewCitizen(birthCertResults[0])
                        }
                      }}
                    >
                      <Eye className="size-3.5" />
                      Consulter
                    </Button>
                  )}
                </div>
                {birthCertSearch.trim() && birthCertResults.length > 0 && (
                  <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="size-3" />
                    {birthCertResults.length} acte(s) trouvé(s) — Cliquez sur Consulter pour voir le détail
                  </div>
                )}
                {birthCertSearch.trim() && birthCertResults.length === 0 && (
                  <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
                    <XCircle className="size-3" />
                    Aucun acte de naissance trouvé pour cette recherche
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Citizen List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AnimatePresence mode="popLayout">
            {filteredCitizens.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className="glass-card">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <Database className="size-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground font-medium">Aucun résultat trouvé</p>
                    <p className="text-xs text-muted-foreground mt-1">Essayez de modifier vos critères de recherche</p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              filteredCitizens.map((citizen, i) => (
                <motion.div
                  key={citizen.nin}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.02 }}
                  layout
                >
                  <Card
                    className={`cursor-pointer hover:shadow-lg transition-all mb-3 ${selectedCitizen?.nin === citizen.nin ? 'ring-2 ring-[#0B2E58] dark:ring-[#3B7DD8]' : ''}`}
                    onClick={() => handleViewCitizen(citizen)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10">
                            <AvatarFallback className={`${citizen.gender === 'F' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'} text-xs font-bold`}>
                              {citizen.firstName[0]}{citizen.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm">{citizen.firstName} {citizen.name}</p>
                              {citizen.isMinor && (
                                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[9px] h-4">Mineur</Badge>
                              )}
                              {citizen.isDeceased && (
                                <Badge variant="destructive" className="text-[9px] h-4">Décédé</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground font-mono">{citizen.nin}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {citizen.hasBirthCertificate && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                              <Baby className="size-2.5" />
                              Acte naiss.
                            </span>
                          )}
                          {citizen.hasCNI && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                              <IdCard className="size-2.5" />
                              CNI
                            </span>
                          )}
                          {citizen.identityVerified && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border border-sky-200 dark:border-sky-800/40">
                              <Shield className="size-2.5" />
                              Vérifié
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-13 pl-13 space-y-1">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="size-3" />{formatDate(citizen.dateOfBirth)}</span>
                          <span className="flex items-center gap-1"><MapPin className="size-3" />{citizen.placeOfBirth}</span>
                          <span className="flex items-center gap-1"><Building2 className="size-3" />{citizen.commune}</span>
                        </div>
                        {citizen.birthCertificateNumber && (
                          <div className="flex items-center gap-2 text-xs">
                            <Hash className="size-3 text-[#C8A45C]" />
                            <span className="font-mono text-[#C8A45C] dark:text-[#D4B878]">{citizen.birthCertificateNumber}</span>
                          </div>
                        )}
                        {!citizen.taxCompliant && (
                          <div className="flex items-center gap-1 text-xs text-red-500">
                            <AlertTriangle className="size-3" />
                            Non-conforme fiscalement
                          </div>
                        )}
                        {!citizen.criminalRecordClear && (
                          <div className="flex items-center gap-1 text-xs text-red-500">
                            <AlertTriangle className="size-3" />
                            Antécédents judiciaires
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex gap-1.5">
                        <Button size="sm" className="bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-[#3B7DD8] dark:hover:bg-[#3B7DD8]/90 text-white gap-1 h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleViewCitizen(citizen) }}>
                          <Eye className="size-3" />
                          Voir la fiche
                        </Button>
                        {citizen.hasBirthCertificate && (
                          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs border-[#C8A45C]/30 text-[#C8A45C] dark:text-[#D4B878]" onClick={(e) => { e.stopPropagation(); setSelectedCitizen(citizen); setDetailOpen(true) }}>
                            <Baby className="size-3" />
                            Acte de naissance
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Right Panel - Stats & Quick Actions */}
        <div className="space-y-4">
          {/* Document Statistics */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Statistiques des documents</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {[
                { label: 'Actes de naissance', count: stats.withBirthCertificate, total: stats.totalCitizens, color: 'bg-emerald-500' },
                { label: 'CNI', count: stats.withCNI, total: stats.totalCitizens, color: 'bg-indigo-500' },
                { label: 'Passeports', count: stats.withPassport, total: stats.totalCitizens, color: 'bg-sky-500' },
                { label: 'Actes de mariage', count: stats.withMarriageCertificate, total: stats.totalCitizens, color: 'bg-pink-500' },
                { label: 'Permis de conduire', count: allCitizens.filter(c => c.hasDrivingLicense).length, total: stats.totalCitizens, color: 'bg-amber-500' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{item.label}</span>
                    <span className="font-medium">{item.count}/{item.total}</span>
                  </div>
                  <Progress value={(item.count / item.total) * 100} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Verification Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Vérifications</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5"><Shield className="size-3 text-emerald-500" />Identités vérifiées</span>
                <span className="font-medium">{stats.identityVerified}/{stats.totalCitizens}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5"><Fingerprint className="size-3 text-indigo-500" />Biométrie vérifiée</span>
                <span className="font-medium">{stats.biometricVerified}/{stats.totalCitizens}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-500" />Conformes fiscalement</span>
                <span className="font-medium">{stats.taxCompliant}/{stats.totalCitizens}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5"><Users className="size-3 text-sky-500" />Employés</span>
                <span className="font-medium">{stats.employed}/{stats.totalCitizens}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5"><Baby className="size-3 text-amber-500" />Mineurs</span>
                <span className="font-medium">{stats.minors}/{stats.totalCitizens}</span>
              </div>
            </CardContent>
          </Card>

          {/* ANIP Connection */}
          <Card className="border-[#0B2E58]/20 dark:border-[#3B7DD8]/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-[#0B2E58]/10 dark:bg-[#3B7DD8]/20">
                  <Activity className="h-4 w-4 text-[#0B2E58] dark:text-[#3B7DD8]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#0B2E58] dark:text-white">Connexion ANIP</p>
                  <p className="text-[10px] text-muted-foreground">Agence Nationale d&apos;Identification</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[9px] ml-auto">
                  <span className="size-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                  Connecté
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Base de données synchronisée en temps réel avec les registres de l&apos;ANIP.
                Toutes les vérifications d&apos;identité et consultations d&apos;actes sont enregistrées.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Citizen Detail Dialog */}
      <CitizenDetailDialog
        citizen={selectedCitizen}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedCitizen(null) }}
      />
    </div>
  )
}
