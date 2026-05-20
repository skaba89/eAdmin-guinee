'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database, Search, FileText, Shield, Scale, Heart, Users,
  CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronRight,
  Building2, Hash, Calendar, MapPin, User, Phone, Mail,
  Eye, Download, Filter, RefreshCw, BookOpen, Landmark,
  Fingerprint, BadgeCheck, FileCheck, FileWarning, FileX,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  useCitizenDatabaseStore,
  type BirthRecord, type NationalIDRecord, type CriminalRecord,
  type MarriageRecord, type DeathRecord, type ResidenceCertificate,
} from '@/store/citizen-database-store'

type DatabaseTab = 'naissance' | 'identite' | 'casier' | 'mariage' | 'deces' | 'residence'

export function DatabaseQueryPage() {
  const store = useCitizenDatabaseStore()
  const [activeTab, setActiveTab] = useState<DatabaseTab>('naissance')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Search results per tab
  const birthResults = useMemo(() => {
    if (!searchQuery.trim()) return store.birthRecords
    return store.searchBirthRecords(searchQuery)
  }, [searchQuery, store.birthRecords])

  const nationalIDResults = useMemo(() => {
    if (!searchQuery.trim()) return store.nationalIDs
    const q = searchQuery.toLowerCase()
    return store.nationalIDs.filter(r =>
      r.lastName.toLowerCase().includes(q) ||
      r.firstName.toLowerCase().includes(q) ||
      r.nin.toLowerCase().includes(q)
    )
  }, [searchQuery, store.nationalIDs])

  const criminalResults = useMemo(() => {
    if (!searchQuery.trim()) return store.criminalRecords
    const q = searchQuery.toLowerCase()
    return store.criminalRecords.filter(r =>
      r.lastName.toLowerCase().includes(q) ||
      r.firstName.toLowerCase().includes(q) ||
      r.nin.toLowerCase().includes(q)
    )
  }, [searchQuery, store.criminalRecords])

  const marriageResults = useMemo(() => {
    if (!searchQuery.trim()) return store.marriageRecords
    const q = searchQuery.toLowerCase()
    return store.marriageRecords.filter(r =>
      r.spouse1LastName.toLowerCase().includes(q) ||
      r.spouse1FirstName.toLowerCase().includes(q) ||
      r.spouse2LastName.toLowerCase().includes(q) ||
      r.spouse2FirstName.toLowerCase().includes(q) ||
      r.acteNumber.toLowerCase().includes(q)
    )
  }, [searchQuery, store.marriageRecords])

  const deathResults = useMemo(() => {
    if (!searchQuery.trim()) return store.deathRecords
    const q = searchQuery.toLowerCase()
    return store.deathRecords.filter(r =>
      r.deceasedLastName.toLowerCase().includes(q) ||
      r.deceasedFirstName.toLowerCase().includes(q) ||
      r.deceasedNIN.toLowerCase().includes(q) ||
      r.acteNumber.toLowerCase().includes(q)
    )
  }, [searchQuery, store.deathRecords])

  const residenceResults = useMemo(() => {
    if (!searchQuery.trim()) return store.residenceCertificates
    const q = searchQuery.toLowerCase()
    return store.residenceCertificates.filter(r =>
      r.citizenLastName.toLowerCase().includes(q) ||
      r.citizenFirstName.toLowerCase().includes(q) ||
      r.citizenNIN.toLowerCase().includes(q) ||
      r.certificateNumber.toLowerCase().includes(q) ||
      r.commune.toLowerCase().includes(q)
    )
  }, [searchQuery, store.residenceCertificates])

  const openDetail = (record: any) => {
    setSelectedRecord(record)
    setDetailOpen(true)
  }

  const stats = [
    { label: 'Actes de naissance', value: store.birthRecords.length, icon: FileText, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Cartes d\'identité', value: store.nationalIDs.length, icon: Shield, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: 'Casiers judiciaires', value: store.criminalRecords.length, icon: Scale, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Actes de mariage', value: store.marriageRecords.length, icon: Heart, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
  ]

  const renderBirthRecord = (r: BirthRecord) => (
    <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} layout>
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetail(r)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">{r.childFirstName} {r.childLastName}</p>
                <p className="text-xs text-muted-foreground">NIN : {r.childNIN}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[10px] ${r.status === 'active' ? 'text-emerald-600 border-emerald-300' : r.status === 'corrected' ? 'text-amber-600 border-amber-300' : 'text-red-600 border-red-300'}`}>
                {r.status === 'active' ? 'Actif' : r.status === 'corrected' ? 'Corrigé' : 'Annulé'}
              </Badge>
              <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {r.childGender === 'M' ? '♂ Masculin' : '♀ Féminin'}
              </Badge>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" />{r.childBirthDate}</div>
            <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{r.childBirthPlace}</div>
            <div className="flex items-center gap-1.5"><Hash className="h-3 w-3" />{r.acteNumber}</div>
            <div className="flex items-center gap-1.5"><Building2 className="h-3 w-3" />{r.registryOffice.split('—')[0]}</div>
          </div>
          {r.marginNotes.length > 0 && (
            <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40">
              <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400">Mentions marginales :</p>
              {r.marginNotes.map((note, i) => (
                <p key={i} className="text-[10px] text-amber-600 dark:text-amber-500">{note}</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )

  const renderNationalID = (r: NationalIDRecord) => (
    <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} layout>
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetail(r)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">{r.firstName} {r.lastName}</p>
                <p className="text-xs text-muted-foreground">NIN : {r.nin}</p>
              </div>
            </div>
            <Badge variant="outline" className={`text-[10px] ${r.status === 'active' ? 'text-emerald-600 border-emerald-300' : 'text-red-600 border-red-300'}`}>
              {r.status === 'active' ? '✓ Valide' : r.status === 'expired' ? 'Expirée' : r.status === 'suspended' ? 'Suspendue' : 'Perdue'}
            </Badge>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" />Né(e) : {r.birthDate}</div>
            <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{r.birthPlace}</div>
            <div className="flex items-center gap-1.5"><Fingerprint className="h-3 w-3" />Biométrique : {r.biometricVerified ? '✓' : '✗'}</div>
            <div className="flex items-center gap-1.5"><BadgeCheck className="h-3 w-3" />Photo : {r.photoVerified ? '✓' : '✗'}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )

  const renderCriminalRecord = (r: CriminalRecord) => (
    <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} layout>
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetail(r)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <Scale className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">{r.firstName} {r.lastName}</p>
                <p className="text-xs text-muted-foreground">NIN : {r.nin}</p>
              </div>
            </div>
            <Badge variant="outline" className={`text-[10px] ${r.status === 'clean' ? 'text-emerald-600 border-emerald-300' : 'text-red-600 border-red-300'}`}>
              {r.status === 'clean' ? '✓ Vierge' : r.status === 'has_records' ? 'Enregistré' : 'Restreint'}
            </Badge>
          </div>
          {r.offenses.length > 0 && (
            <div className="mt-3 space-y-1">
              {r.offenses.map((off, i) => (
                <div key={i} className="p-2 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-red-700 dark:text-red-400">{off.nature}</span>
                    <Badge className={`text-[9px] ${off.rehabilited ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {off.rehabilited ? 'Réhabilité' : 'Non réhabilité'}
                    </Badge>
                  </div>
                  <p className="text-red-600 dark:text-red-500 mt-0.5">{off.jurisdiction} — {off.date}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )

  const renderMarriageRecord = (r: MarriageRecord) => (
    <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} layout>
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetail(r)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                <Heart className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">{r.spouse1FirstName} {r.spouse1LastName} × {r.spouse2FirstName} {r.spouse2LastName}</p>
                <p className="text-xs text-muted-foreground">Acte n°{r.acteNumber}</p>
              </div>
            </div>
            <Badge variant="outline" className={`text-[10px] ${r.status === 'active' ? 'text-emerald-600 border-emerald-300' : 'text-red-600 border-red-300'}`}>
              {r.status === 'active' ? 'Actif' : r.status === 'divorced' ? 'Divorcé' : 'Annulé'}
            </Badge>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" />{r.marriageDate}</div>
            <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{r.marriagePlace}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )

  const renderDeathRecord = (r: DeathRecord) => (
    <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} layout>
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetail(r)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gray-50 dark:bg-gray-900/20 flex items-center justify-center">
                <FileX className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">{r.deceasedFirstName} {r.deceasedLastName}</p>
                <p className="text-xs text-muted-foreground">Acte n°{r.acteNumber}</p>
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" />Décès : {r.deathDate}</div>
            <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{r.deathPlace}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )

  const renderResidenceCertificate = (r: ResidenceCertificate) => (
    <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} layout>
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetail(r)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">{r.citizenFirstName} {r.citizenLastName}</p>
                <p className="text-xs text-muted-foreground">Cert. n°{r.certificateNumber}</p>
              </div>
            </div>
            <Badge variant="outline" className={`text-[10px] ${r.status === 'valid' ? 'text-emerald-600 border-emerald-300' : 'text-red-600 border-red-300'}`}>
              {r.status === 'valid' ? '✓ Valide' : 'Expiré'}
            </Badge>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{r.address}</div>
            <div className="flex items-center gap-1.5"><Building2 className="h-3 w-3" />{r.commune}, {r.prefecture}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )

  // Detail dialog for any record type
  const renderDetail = () => {
    if (!selectedRecord) return null
    const r = selectedRecord

    if ('childNIN' in r) {
      // Birth Record
      return (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/40">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{r.childFirstName} {r.childLastName}</h3>
                <p className="text-sm text-muted-foreground">Acte de naissance n°{r.acteNumber}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">NIN :</span> <span className="font-mono">{r.childNIN}</span></div>
              <div><span className="text-muted-foreground">Sexe :</span> {r.childGender === 'M' ? 'Masculin' : 'Féminin'}</div>
              <div><span className="text-muted-foreground">Date de naissance :</span> {r.childBirthDate}</div>
              <div><span className="text-muted-foreground">Lieu de naissance :</span> {r.childBirthPlace}</div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Parents</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs font-medium">Père</p>
                <p className="text-sm">{r.fatherFirstName} {r.fatherLastName}</p>
                <p className="text-xs text-muted-foreground">NIN : {r.fatherNIN} — {r.fatherNationality}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs font-medium">Mère</p>
                <p className="text-sm">{r.motherFirstName} {r.motherLastName}</p>
                <p className="text-xs text-muted-foreground">NIN : {r.motherNIN} — {r.motherNationality}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Enregistrement</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Date :</span> {r.registrationDate}</div>
              <div><span className="text-muted-foreground">Lieu :</span> {r.registrationPlace}</div>
              <div className="col-span-2"><span className="text-muted-foreground">Office :</span> {r.registryOffice}</div>
              <div><span className="text-muted-foreground">N° registre :</span> {r.registryNumber}</div>
              <div><span className="text-muted-foreground">Déclarant :</span> {r.declarantName} ({r.declarantRelation})</div>
            </div>
          </div>

          {r.marginNotes.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40">
              <h4 className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-400 mb-1">Mentions marginales</h4>
              {r.marginNotes.map((note: string, i: number) => (
                <p key={i} className="text-sm text-amber-600 dark:text-amber-500">{note}</p>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className={r.status === 'active' ? 'text-emerald-600 border-emerald-300' : r.status === 'corrected' ? 'text-amber-600 border-amber-300' : 'text-red-600 border-red-300'}>
              {r.status === 'active' ? 'Actif' : r.status === 'corrected' ? 'Corrigé' : 'Annulé'}
            </Badge>
            <span>Hash de vérification : <span className="font-mono">{r.verificationHash}</span></span>
          </div>
        </div>
      )
    }

    if ('biometricVerified' in r) {
      // National ID
      return (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/40">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{r.firstName} {r.lastName}</h3>
                <p className="text-sm text-muted-foreground">NIN : {r.nin}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Date de naissance :</span> {r.birthDate}</div>
              <div><span className="text-muted-foreground">Lieu de naissance :</span> {r.birthPlace}</div>
              <div><span className="text-muted-foreground">Sexe :</span> {r.gender === 'M' ? 'Masculin' : 'Féminin'}</div>
              <div><span className="text-muted-foreground">Nationalité :</span> {r.nationality}</div>
              <div className="col-span-2"><span className="text-muted-foreground">Adresse :</span> {r.address}</div>
              <div><span className="text-muted-foreground">Délivrée le :</span> {r.issueDate}</div>
              <div><span className="text-muted-foreground">Expire le :</span> {r.expiryDate}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`p-3 rounded-lg flex items-center gap-2 ${r.photoVerified ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-red-50 dark:bg-red-900/10'}`}>
              {r.photoVerified ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
              <div>
                <p className="text-xs font-medium">Photo vérifiée</p>
                <p className="text-[10px] text-muted-foreground">{r.photoVerified ? 'Conforme' : 'Non conforme'}</p>
              </div>
            </div>
            <div className={`p-3 rounded-lg flex items-center gap-2 ${r.biometricVerified ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-red-50 dark:bg-red-900/10'}`}>
              {r.biometricVerified ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
              <div>
                <p className="text-xs font-medium">Biométrie vérifiée</p>
                <p className="text-[10px] text-muted-foreground">{r.biometricVerified ? 'Conforme' : 'Non conforme'}</p>
              </div>
            </div>
          </div>
          <Badge variant="outline" className={r.status === 'active' ? 'text-emerald-600 border-emerald-300' : 'text-red-600 border-red-300'}>
            {r.status === 'active' ? '✓ Carte valide' : r.status === 'expired' ? 'Expirée' : r.status === 'suspended' ? 'Suspendue' : 'Perdue'}
          </Badge>
        </div>
      )
    }

    // Generic detail for other record types
    return (
      <div className="p-4 rounded-lg bg-muted/50">
        <pre className="text-xs overflow-auto">{JSON.stringify(r, null, 2)}</pre>
      </div>
    )
  }

  const currentResults = () => {
    switch (activeTab) {
      case 'naissance': return { items: birthResults, render: renderBirthRecord, empty: 'Aucun acte de naissance trouvé' }
      case 'identite': return { items: nationalIDResults, render: renderNationalID, empty: 'Aucune carte d\'identité trouvée' }
      case 'casier': return { items: criminalResults, render: renderCriminalRecord, empty: 'Aucun casier judiciaire trouvé' }
      case 'mariage': return { items: marriageResults, render: renderMarriageRecord, empty: 'Aucun acte de mariage trouvé' }
      case 'deces': return { items: deathResults, render: renderDeathRecord, empty: 'Aucun acte de décès trouvé' }
      case 'residence': return { items: residenceResults, render: renderResidenceCertificate, empty: 'Aucun certificat de résidence trouvé' }
    }
  }

  const { items, render, empty } = currentResults()

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
            <p className="text-sm text-muted-foreground">Consultation des registres d\'État Civil, identification et casier judiciaire</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="glass-card hover:shadow-lg transition-shadow">
              <CardContent className="flex items-center gap-4 p-4">
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

      {/* Search + Tabs */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, NIN, numéro d'acte, lieu..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as DatabaseTab)}>
            <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
              <TabsTrigger value="naissance" className="gap-1 text-xs data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
                <FileText className="h-3 w-3" />
                Naissance ({store.birthRecords.length})
              </TabsTrigger>
              <TabsTrigger value="identite" className="gap-1 text-xs data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
                <Shield className="h-3 w-3" />
                Identité ({store.nationalIDs.length})
              </TabsTrigger>
              <TabsTrigger value="casier" className="gap-1 text-xs data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
                <Scale className="h-3 w-3" />
                Casier ({store.criminalRecords.length})
              </TabsTrigger>
              <TabsTrigger value="mariage" className="gap-1 text-xs data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
                <Heart className="h-3 w-3" />
                Mariage ({store.marriageRecords.length})
              </TabsTrigger>
              <TabsTrigger value="deces" className="gap-1 text-xs data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
                <FileX className="h-3 w-3" />
                Décès ({store.deathRecords.length})
              </TabsTrigger>
              <TabsTrigger value="residence" className="gap-1 text-xs data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
                <MapPin className="h-3 w-3" />
                Résidence ({store.residenceCertificates.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {items.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-2">
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Database className="size-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground font-medium">{empty}</p>
                  <p className="text-xs text-muted-foreground mt-1">Modifiez vos critères de recherche</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            items.map(item => render(item as any))
          )}
        </AnimatePresence>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-[#0B2E58] dark:text-[#3B7DD8]" />
              Détail de l\'enregistrement
            </DialogTitle>
            <DialogDescription>Consultation de la base de données citoyenne</DialogDescription>
          </DialogHeader>
          {renderDetail()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
