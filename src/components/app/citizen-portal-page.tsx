'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, FileText, Clock, CheckCircle2, Upload, Search,
  Building2, CreditCard, MessageSquare, Phone, Mail,
  ChevronRight, MapPin, Calendar, QrCode, Bell,
  Home, Briefcase, GraduationCap, Heart, Scale, Car
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

interface ServiceItem {
  id: string
  name: string
  description: string
  icon: React.ElementType
  category: string
  price: string
  delay: string
}

interface Dossier {
  id: string
  number: string
  service: string
  status: 'soumis' | 'en_cours' | 'pret' | 'livré'
  date: string
  steps: { name: string; status: 'completed' | 'current' | 'pending'; date?: string }[]
}

const SERVICES: ServiceItem[] = [
  { id: '1', name: 'Acte de naissance', description: 'Extrait ou copie intégrale d\'acte de naissance', icon: Heart, category: 'État civil', price: 'Gratuit', delay: '3 jours' },
  { id: '2', name: 'Certificat de résidence', description: 'Attestation de domicile délivrée par la mairie', icon: Home, category: 'État civil', price: '2 000 GNF', delay: '1 jour' },
  { id: '3', name: 'Permis de construire', description: 'Autorisation de construction immobilière', icon: Building2, category: 'Urbanisme', price: '50 000 GNF', delay: '15 jours' },
  { id: '4', name: 'Casier judiciaire', description: 'Extrait de casier judiciaire B3', icon: Scale, category: 'Justice', price: '5 000 GNF', delay: '5 jours' },
  { id: '5', name: 'Carte d\'identité', description: 'Carte nationale d\'identité biométrique', icon: CreditCard, category: 'Identification', price: 'Gratuit', delay: '7 jours' },
  { id: '6', name: 'Permis de conduire', description: 'Permis de conduire national ou international', icon: Car, category: 'Transport', price: '25 000 GNF', delay: '10 jours' },
  { id: '7', name: 'Diplôme / Attestation', description: 'Attestation de diplôme ou relevé de notes', icon: GraduationCap, category: 'Éducation', price: '10 000 GNF', delay: '5 jours' },
  { id: '8', name: 'Registre de commerce', description: 'Immatriculation au RCCM', icon: Briefcase, category: 'Commerce', price: '100 000 GNF', delay: '7 jours' },
]

const DOSSIERS: Dossier[] = [
  {
    id: '1', number: 'DOSS-2024-4521', service: 'Acte de naissance', status: 'en_cours', date: '2024-12-12',
    steps: [
      { name: 'Soumission', status: 'completed', date: '2024-12-12' },
      { name: 'Vérification pièces', status: 'completed', date: '2024-12-13' },
      { name: 'Traitement', status: 'current' },
      { name: 'Prêt', status: 'pending' },
      { name: 'Livraison', status: 'pending' },
    ],
  },
  {
    id: '2', number: 'DOSS-2024-4498', service: 'Certificat de résidence', status: 'pret', date: '2024-12-10',
    steps: [
      { name: 'Soumission', status: 'completed', date: '2024-12-10' },
      { name: 'Vérification pièces', status: 'completed', date: '2024-12-10' },
      { name: 'Traitement', status: 'completed', date: '2024-12-11' },
      { name: 'Prêt', status: 'current' },
      { name: 'Livraison', status: 'pending' },
    ],
  },
  {
    id: '3', number: 'DOSS-2024-4421', service: 'Carte d\'identité', status: 'soumis', date: '2024-12-14',
    steps: [
      { name: 'Soumission', status: 'completed', date: '2024-12-14' },
      { name: 'Vérification pièces', status: 'current' },
      { name: 'Traitement', status: 'pending' },
      { name: 'Prêt', status: 'pending' },
      { name: 'Livraison', status: 'pending' },
    ],
  },
]

const STATUS_MAP = {
  soumis: { label: 'Soumis', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
  en_cours: { label: 'En cours', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  pret: { label: 'Prêt', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  livré: { label: 'Livré', color: 'bg-brand/10 text-brand dark:bg-primary/20 dark:text-primary' },
}

export function CitizenPortalPage() {
  const [activeTab, setActiveTab] = useState('services')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackedDossier, setTrackedDossier] = useState<Dossier | null>(null)
  const [notifPrefs, setNotifPrefs] = useState({ whatsapp: true, sms: false, email: true })

  const handleTrack = () => {
    const found = DOSSIERS.find(d => d.number === trackingNumber || d.number.includes(trackingNumber))
    setTrackedDossier(found || null)
  }

  const categories = [...new Set(SERVICES.map(s => s.category))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass-card border-brand/10 dark:border-primary/10 bg-gradient-to-br from-brand/5 via-transparent to-gold/5 dark:from-primary/5 dark:to-gold/5">
          <CardContent className="py-8 text-center">
            <Users className="h-12 w-12 text-brand dark:text-primary mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-brand dark:text-primary">Portail Citoyen</h2>
            <p className="text-muted-foreground mt-1 max-w-lg mx-auto">
              Accédez aux services publics en ligne, suivez vos démarches et recevez vos documents sans vous déplacer
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="services" className="gap-1">Services</TabsTrigger>
          <TabsTrigger value="demande" className="gap-1">Nouvelle demande</TabsTrigger>
          <TabsTrigger value="suivi" className="gap-1">Suivi</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1">Notifications</TabsTrigger>
        </TabsList>

        {/* Service Catalog */}
        <TabsContent value="services">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
            {SERVICES.map((service, i) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-all cursor-pointer group h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="p-2.5 rounded-xl bg-brand/5 dark:bg-primary/10">
                        <service.icon className="h-6 w-6 text-brand dark:text-primary" />
                      </div>
                      <Badge variant="outline" className="text-[10px]">{service.category}</Badge>
                    </div>
                    <CardTitle className="text-sm mt-2 group-hover:text-brand dark:group-hover:text-primary transition-colors">
                      {service.name}
                    </CardTitle>
                    <CardDescription className="text-xs">{service.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {service.delay}
                      </span>
                      <span className="font-semibold text-brand dark:text-primary">{service.price}</span>
                    </div>
                    <Button size="sm" variant="outline" className="w-full mt-3 gap-1 text-xs h-8">
                      Demander
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Request Form */}
        <TabsContent value="demande">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Nouvelle demande de service</CardTitle>
              <CardDescription>Remplissez le formulaire pour soumettre votre demande</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type de service</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un service" /></SelectTrigger>
                    <SelectContent>
                      {SERVICES.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Commune / Préfecture</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Localisation" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conakry">Conakry</SelectItem>
                      <SelectItem value="kindia">Kindia</SelectItem>
                      <SelectItem value="n_zerekore">N\'Zérékoré</SelectItem>
                      <SelectItem value="kankan">Kankan</SelectItem>
                      <SelectItem value="labe">Labé</SelectItem>
                      <SelectItem value="faranah">Faranah</SelectItem>
                      <SelectItem value="mamou">Mamou</SelectItem>
                      <SelectItem value="boke">Boké</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom complet</Label>
                  <Input placeholder="Entrez votre nom complet" />
                </div>
                <div className="space-y-2">
                  <Label>Numéro de téléphone</Label>
                  <Input placeholder="+224 XXX XX XX XX" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Numéro d\'identité nationale (NIN)</Label>
                  <Input placeholder="Numéro NIN" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="votre@email.com" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Informations complémentaires</Label>
                <Textarea placeholder="Précisez les détails de votre demande..." />
              </div>

              <Separator />

              {/* Upload pieces */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">Pièces justificatives</Label>
                <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-brand/30 dark:hover:border-primary/30 transition-colors cursor-pointer">
                  <Upload className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Cliquez ou glissez vos fichiers ici</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (max 5 Mo par fichier)</p>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="gap-1 text-xs">
                    <FileText className="h-3 w-3" />
                    carte_identite.pdf
                    <button className="ml-1 text-red-500 hover:text-red-600">×</button>
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-xs">
                    <FileText className="h-3 w-3" />
                    justificatif_domicile.jpg
                    <button className="ml-1 text-red-500 hover:text-red-600">×</button>
                  </Badge>
                </div>
              </div>

              <Button className="w-full bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90 gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Soumettre la demande
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tracking */}
        <TabsContent value="suivi">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Suivi de dossier</CardTitle>
              <CardDescription>Entrez votre numéro de dossier pour suivre l\'avancement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ex: DOSS-2024-4521"
                    value={trackingNumber}
                    onChange={e => setTrackingNumber(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleTrack} className="bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90 gap-2">
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
                                  step.status === 'current' ? 'bg-brand text-white dark:bg-primary' :
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

                        {/* Digital Receipt */}
                        <Separator />
                        <div className="p-4 rounded-xl border border-dashed border-brand/20 dark:border-primary/20 bg-brand/2 dark:bg-primary/5">
                          <div className="flex items-start gap-4">
                            <div className="h-16 w-16 rounded bg-brand/5 dark:bg-primary/10 flex items-center justify-center shrink-0 border border-dashed border-brand/20 dark:border-primary/20">
                              <QrCode className="h-10 w-10 text-brand/30 dark:text-primary/30" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold mb-1">Reçu digital</h4>
                              <p className="text-xs text-muted-foreground mb-2">
                                N° {trackedDossier.number} • {trackedDossier.service}
                              </p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                                <span>Date de soumission:</span>
                                <span className="font-mono">{trackedDossier.date}</span>
                                <span>Statut actuel:</span>
                                <span className="font-mono">{STATUS_MAP[trackedDossier.status].label}</span>
                                <span>Institution:</span>
                                <span className="font-mono">eAdmin Suite GN</span>
                              </div>
                            </div>
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
                        <FileText className="h-4 w-4 text-brand dark:text-primary" />
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

        {/* Notifications Preferences */}
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
                  { key: 'whatsapp' as const, label: 'WhatsApp', desc: 'Recevez vos notifications via WhatsApp', icon: MessageSquare, color: 'text-green-600 dark:text-green-400' },
                  { key: 'sms' as const, label: 'SMS', desc: 'Recevez des SMS sur votre téléphone', icon: Phone, color: 'text-sky-600 dark:text-sky-400' },
                  { key: 'email' as const, label: 'Email', desc: 'Recevez des notifications par email', icon: Mail, color: 'text-amber-600 dark:text-amber-400' },
                ].map(channel => (
                  <div key={channel.key} className="flex items-center justify-between p-4 rounded-xl border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <channel.icon className={`h-5 w-5 ${channel.color}`} />
                      <div>
                        <p className="text-sm font-medium">{channel.label}</p>
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
                <h4 className="text-sm font-semibold">Types d\'événements</h4>
                {[
                  'Dossier soumis', 'Dossier en cours de traitement', 'Document prêt',
                  'Demande de pièces complémentaires', 'Dossier livré', 'Rappel de renouvellement'
                ].map(event => (
                  <div key={event} className="flex items-center justify-between py-2">
                    <span className="text-sm">{event}</span>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      {notifPrefs.whatsapp && <span className="text-green-600">WhatsApp</span>}
                      {notifPrefs.sms && <span className="text-sky-600">SMS</span>}
                      {notifPrefs.email && <span className="text-amber-600">Email</span>}
                    </div>
                  </div>
                ))}
              </div>

              <Button className="bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90">
                Enregistrer les préférences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
