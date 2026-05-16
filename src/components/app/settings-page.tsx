'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings, Shield, Bell, Puzzle, Palette,
  Lock, Clock, Key, Globe, Sun, Moon,
  Monitor, Save, CheckCircle2, AlertTriangle,
  Wifi, Mail, MessageSquare, Smartphone,
  Building2, Phone, MapPin, Upload, Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog'
import { useAppStore } from '@/store/app-store'

interface IntegrationConfig {
  apiUrl: string
  apiKey: string
  syncInterval: string
  enabled: boolean
}

const integrations = [
  { name: 'API eAdministration', status: 'connected', description: 'API principale de la plateforme', lastSync: 'Il y a 5 min', defaults: { apiUrl: 'https://api.eadmin.gn/v2', apiKey: '••••••••••••', syncInterval: '5', enabled: true } },
  { name: 'Active Directory / LDAP', status: 'connected', description: 'Authentification centralisée', lastSync: 'Il y a 1h', defaults: { apiUrl: 'ldap://ad.mat.gov.gn:389', apiKey: '••••••••••••', syncInterval: '30', enabled: true } },
  { name: 'Service SMS (Orange)', status: 'connected', description: 'Envoi de notifications SMS', lastSync: 'Il y a 30 min', defaults: { apiUrl: 'https://api.orange.com/sms/v1', apiKey: '••••••••••••', syncInterval: '15', enabled: true } },
  { name: 'WhatsApp Business API', status: 'error', description: 'Notifications WhatsApp', lastSync: 'Échec il y a 2h', defaults: { apiUrl: 'https://graph.facebook.com/v18.0', apiKey: '', syncInterval: '15', enabled: false } },
  { name: 'Système de signature (Certigna)', status: 'connected', description: 'Signature électronique certifiée', lastSync: 'Il y a 15 min', defaults: { apiUrl: 'https://sign.certigna.gn/api', apiKey: '••••••••••••', syncInterval: '10', enabled: true } },
  { name: 'Base de données NIN', status: 'disconnected', description: 'Vérification d\'identité nationale', lastSync: 'Jamais connecté', defaults: { apiUrl: '', apiKey: '', syncInterval: '60', enabled: false } },
]

export function SettingsPage() {
  const { theme: appTheme, toggleTheme } = useAppStore()
  const [mfaEnabled, setMfaEnabled] = useState(true)
  const [sessionTimeout, setSessionTimeout] = useState('30')
  const [passwordMinLength, setPasswordMinLength] = useState('12')
  const [twoFactorAuth, setTwoFactorAuth] = useState(true)
  const [ipWhitelist, setIpWhitelist] = useState(false)
  const [theme, setTheme] = useState(appTheme === 'dark' ? 'dark' : appTheme === 'light' ? 'light' : 'system')
  const [language, setLanguage] = useState('fr')
  const [notifSettings, setNotifSettings] = useState({
    email_courrier: true, email_workflow: true, email_signature: true,
    sms_urgent: true, sms_courrier: false,
    whatsapp_courrier: true, whatsapp_workflow: false,
  })
  const [successToast, setSuccessToast] = useState('')
  const [savingGeneral, setSavingGeneral] = useState(false)
  const [savingSecurity, setSavingSecurity] = useState(false)
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [savingAppearance, setSavingAppearance] = useState(false)

  // Logo upload
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  // Integration dialog
  const [integrationDialogOpen, setIntegrationDialogOpen] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null)
  const [integrationConfigs, setIntegrationConfigs] = useState<IntegrationConfig>({
    apiUrl: '',
    apiKey: '',
    syncInterval: '15',
    enabled: true,
  })
  const [savingIntegration, setSavingIntegration] = useState(false)

  const getIntStatus = (status: string) => {
    switch (status) {
      case 'connected': return { label: 'Connecté', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 }
      case 'error': return { label: 'Erreur', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle }
      case 'disconnected': return { label: 'Non connecté', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: Wifi }
      default: return { label: 'Inconnu', color: 'bg-gray-100 text-gray-600', icon: Wifi }
    }
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    // Apply theme to the app
    if (newTheme === 'system') {
      const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark && appTheme !== 'dark') {
        toggleTheme()
      } else if (!prefersDark && appTheme !== 'light') {
        toggleTheme()
      }
    } else if (newTheme === 'dark' && appTheme !== 'dark') {
      toggleTheme()
    } else if (newTheme === 'light' && appTheme !== 'light') {
      toggleTheme()
    }
  }

  const handleLogoUpload = () => {
    logoInputRef.current?.click()
  }

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setSuccessToast('Logo mis à jour avec succès')
      setTimeout(() => setSuccessToast(''), 4000)
    }
  }

  const handleOpenIntegration = (intName: string) => {
    const int = integrations.find(i => i.name === intName)
    if (int) {
      setSelectedIntegration(int.name)
      setIntegrationConfigs({
        apiUrl: int.defaults.apiUrl,
        apiKey: int.defaults.apiKey,
        syncInterval: int.defaults.syncInterval,
        enabled: int.defaults.enabled,
      })
      setIntegrationDialogOpen(true)
    }
  }

  const handleSaveIntegration = async () => {
    setSavingIntegration(true)
    await new Promise(r => setTimeout(r, 1200))
    setSavingIntegration(false)
    setIntegrationDialogOpen(false)
    setSuccessToast(`Configuration de ${selectedIntegration} enregistrée avec succès`)
    setTimeout(() => setSuccessToast(''), 4000)
  }

  const handleSaveGeneral = async () => {
    setSavingGeneral(true)
    await new Promise(r => setTimeout(r, 1000))
    setSavingGeneral(false)
    setSuccessToast('Paramètres généraux enregistrés avec succès')
    setTimeout(() => setSuccessToast(''), 4000)
  }

  const handleSaveSecurity = async () => {
    setSavingSecurity(true)
    await new Promise(r => setTimeout(r, 1000))
    setSavingSecurity(false)
    setSuccessToast('Paramètres de sécurité enregistrés avec succès')
    setTimeout(() => setSuccessToast(''), 4000)
  }

  const handleSaveNotifications = async () => {
    setSavingNotifications(true)
    await new Promise(r => setTimeout(r, 1000))
    setSavingNotifications(false)
    setSuccessToast('Préférences de notification enregistrées avec succès')
    setTimeout(() => setSuccessToast(''), 4000)
  }

  const handleSaveAppearance = async () => {
    setSavingAppearance(true)
    await new Promise(r => setTimeout(r, 1000))
    setSavingAppearance(false)
    setSuccessToast('Préférences d\'apparence enregistrées avec succès')
    setTimeout(() => setSuccessToast(''), 4000)
  }

  return (
    <div className="space-y-6 dashboard-bg-v2 min-h-screen">
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="w-full sm:w-auto flex-wrap gap-1 bg-muted/50 p-1.5">
          <TabsTrigger value="general" className="gap-1.5 text-sm data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
            <Settings className="h-3.5 w-3.5" />
            Général
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 text-sm data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
            <Shield className="h-3.5 w-3.5" />
            Sécurité
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 text-sm data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
            <Bell className="h-3.5 w-3.5" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5 text-sm data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
            <Puzzle className="h-3.5 w-3.5" />
            Intégrations
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5 text-sm data-[state=active]:bg-[#0B2E58] data-[state=active]:text-white">
            <Palette className="h-3.5 w-3.5" />
            Apparence
          </TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-premium">
              <CardHeader>
                <CardTitle className="text-base">Informations de l&apos;institution</CardTitle>
                <CardDescription>Configuration générale de votre organisation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Nom de l&apos;institution</Label>
                    <Input defaultValue="Ministère de l'Administration Territoriale" className="glass-input focus-ring-premium" />
                  </div>
                  <div className="space-y-2">
                    <Label>Sigle</Label>
                    <Input defaultValue="MAT" className="glass-input focus-ring-premium" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Adresse</Label>
                    <Input defaultValue="Avenue de la République, Conakry" className="glass-input focus-ring-premium" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Téléphone</Label>
                    <Input defaultValue="+224 622 00 00 00" className="glass-input focus-ring-premium" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email de contact</Label>
                    <Input defaultValue="contact@mat.gov.gn" className="glass-input focus-ring-premium" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Site web</Label>
                    <Input defaultValue="www.mat.gov.gn" className="glass-input focus-ring-premium" />
                  </div>
                </div>

                <div className="divider-premium" />

                <div className="space-y-2">
                  <Label>Logo de l&apos;institution</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-xl bg-brand/10 dark:bg-primary/10 flex items-center justify-center border-2 border-dashed border-brand/20 dark:border-primary/20 overflow-hidden">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="h-full w-full object-cover rounded-xl" />
                      ) : (
                        <Building2 className="h-8 w-8 text-brand/40 dark:text-primary/40" />
                      )}
                    </div>
                    <div>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        className="hidden"
                        onChange={handleLogoFileChange}
                      />
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={handleLogoUpload}>
                        <Upload className="h-3.5 w-3.5" />
                        Changer le logo
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG ou SVG (max 2 Mo)</p>
                    </div>
                  </div>
                </div>

                <Button className="btn-premium gap-2" onClick={handleSaveGeneral} disabled={savingGeneral}>
                  {savingGeneral ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingGeneral ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card className="glass-premium">
              <CardHeader>
                <CardTitle className="text-base">Politique de sécurité</CardTitle>
                <CardDescription>Configurez les paramètres de sécurité de la plateforme</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl border">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-brand dark:text-primary" />
                    <div>
                      <p className="text-sm font-medium">Authentification multi-facteurs (MFA)</p>
                      <p className="text-xs text-muted-foreground">Exiger une vérification en deux étapes pour tous les utilisateurs</p>
                    </div>
                  </div>
                  <Switch checked={mfaEnabled} onCheckedChange={setMfaEnabled} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border">
                  <div className="flex items-center gap-3">
                    <Key className="h-5 w-5 text-brand dark:text-primary" />
                    <div>
                      <p className="text-sm font-medium">Double authentification obligatoire</p>
                      <p className="text-xs text-muted-foreground">Codes de récupération générés à l&apos;inscription</p>
                    </div>
                  </div>
                  <Switch checked={twoFactorAuth} onCheckedChange={setTwoFactorAuth} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-brand dark:text-primary" />
                    <div>
                      <p className="text-sm font-medium">Liste blanche d&apos;adresses IP</p>
                      <p className="text-xs text-muted-foreground">Restreindre l&apos;accès à certaines plages d&apos;IP</p>
                    </div>
                  </div>
                  <Switch checked={ipWhitelist} onCheckedChange={setIpWhitelist} />
                </div>

                <div className="divider-premium" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Délai d&apos;expiration de session
                    </Label>
                    <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 heure</SelectItem>
                        <SelectItem value="120">2 heures</SelectItem>
                        <SelectItem value="480">8 heures</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Longueur minimale du mot de passe</Label>
                    <Select value={passwordMinLength} onValueChange={setPasswordMinLength}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="8">8 caractères</SelectItem>
                        <SelectItem value="10">10 caractères</SelectItem>
                        <SelectItem value="12">12 caractères</SelectItem>
                        <SelectItem value="16">16 caractères</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-muted/50 space-y-2">
                  <h4 className="text-sm font-semibold">Politique de mot de passe actuelle</h4>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Minimum {passwordMinLength} caractères</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Au moins une majuscule et une minuscule</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Au moins un chiffre</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Au moins un caractère spécial</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Expiration tous les 90 jours</li>
                  </ul>
                </div>

                <Button className="btn-premium gap-2" onClick={handleSaveSecurity} disabled={savingSecurity}>
                  {savingSecurity ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingSecurity ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-premium">
              <CardHeader>
                <CardTitle className="text-base">Préférences de notification</CardTitle>
                <CardDescription>Configurez les notifications par canal et par événement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Email notifications */}
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Mail className="h-4 w-4 text-brand dark:text-primary" />
                    Notifications par email
                  </h4>
                  <div className="space-y-3">
                    {[
                      { key: 'email_courrier' as const, label: 'Nouveau courrier', desc: 'Notification lors de l\'arrivée d\'un nouveau courrier' },
                      { key: 'email_workflow' as const, label: 'Mise à jour workflow', desc: 'Changement d\'étape dans un workflow' },
                      { key: 'email_signature' as const, label: 'Demande de signature', desc: 'Nouvelle demande de signature en attente' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                        <Switch
                          checked={notifSettings[item.key]}
                          onCheckedChange={(checked) => setNotifSettings(prev => ({ ...prev, [item.key]: !!checked }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="divider-premium" />

                {/* SMS */}
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Smartphone className="h-4 w-4 text-brand dark:text-primary" />
                    Notifications SMS
                  </h4>
                  <div className="space-y-3">
                    {[
                      { key: 'sms_urgent' as const, label: 'Courriers urgents', desc: 'Uniquement les courriers marqués comme urgents' },
                      { key: 'sms_courrier' as const, label: 'Tous les courriers', desc: 'Chaque nouveau courrier entrant' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                        <Switch
                          checked={notifSettings[item.key]}
                          onCheckedChange={(checked) => setNotifSettings(prev => ({ ...prev, [item.key]: !!checked }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="divider-premium" />

                {/* WhatsApp */}
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    Notifications WhatsApp
                  </h4>
                  <div className="space-y-3">
                    {[
                      { key: 'whatsapp_courrier' as const, label: 'Courriers entrants', desc: 'Notification WhatsApp pour les nouveaux courriers' },
                      { key: 'whatsapp_workflow' as const, label: 'Rappels workflow', desc: 'Rappel des tâches en attente dans les workflows' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                        <Switch
                          checked={notifSettings[item.key]}
                          onCheckedChange={(checked) => setNotifSettings(prev => ({ ...prev, [item.key]: !!checked }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Button className="btn-premium gap-2" onClick={handleSaveNotifications} disabled={savingNotifications}>
                  {savingNotifications ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingNotifications ? 'Enregistrement...' : 'Enregistrer les préférences'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-premium">
              <CardHeader>
                <CardTitle className="text-base">Connexions & intégrations</CardTitle>
                <CardDescription>Gérez les connexions aux services externes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {integrations.map((int) => {
                  const config = getIntStatus(int.status)
                  const StatusIcon = config.icon
                  return (
                    <div key={int.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border gap-3 hover:bg-muted/30 transition-all group hover:border-[#C8A45C]/20 dark:hover:border-[#3B7DD8]/20 hover:shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${int.status === 'connected' ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/30' : int.status === 'error' ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/30' : 'bg-muted'}`}>
                          <Wifi className={`h-4 w-4 ${int.status === 'connected' ? 'text-emerald-600 dark:text-emerald-400' : int.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{int.name}</p>
                          <p className="text-xs text-muted-foreground">{int.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{int.lastSync}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-sm ${config.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </span>
                        <Button variant="outline" size="sm" className="h-7 text-xs hover:border-[#0B2E58] dark:hover:border-[#3B7DD8]" onClick={() => handleOpenIntegration(int.name)}>
                          {int.status === 'connected' ? 'Configurer' : 'Connecter'}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-premium">
              <CardHeader>
                <CardTitle className="text-base">Apparence & langue</CardTitle>
                <CardDescription>Personnalisez l&apos;interface de la plateforme</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Thème</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'light', label: 'Clair', icon: Sun },
                      { value: 'dark', label: 'Sombre', icon: Moon },
                      { value: 'system', label: 'Système', icon: Monitor },
                    ].map(t => (
                      <button
                        key={t.value}
                        onClick={() => handleThemeChange(t.value)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          theme === t.value ? 'border-[#C8A45C] dark:border-[#D4B878] bg-[#C8A45C]/5 dark:bg-[#D4B878]/5 shadow-gold' : 'border-border hover:border-[#C8A45C]/30 dark:hover:border-[#D4B878]/30'
                        }`}
                      >
                        <t.icon className={`h-6 w-6 ${theme === t.value ? 'text-[#0B2E58] dark:text-[#3B7DD8]' : 'text-muted-foreground'}`} />
                        <span className={`text-xs font-medium ${theme === t.value ? 'text-[#0B2E58] dark:text-[#3B7DD8]' : 'text-muted-foreground'}`}>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="divider-premium" />

                <div className="space-y-2">
                  <Label>Langue de l&apos;interface</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="w-full sm:w-[240px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ff">Pular</SelectItem>
                      <SelectItem value="man">Maninka</SelectItem>
                      <SelectItem value="sus">Soussou</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="divider-premium" />

                <div className="p-4 rounded-xl bg-muted/50">
                  <h4 className="text-sm font-semibold mb-2">Aperçu des couleurs</h4>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-[#0B2E58]" />
                      <span className="text-xs text-muted-foreground">Primaire</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-[#C8A45C]" />
                      <span className="text-xs text-muted-foreground">Accent</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500" />
                      <span className="text-xs text-muted-foreground">Succès</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-red-500" />
                      <span className="text-xs text-muted-foreground">Erreur</span>
                    </div>
                  </div>
                </div>

                <Button className="btn-premium gap-2" onClick={handleSaveAppearance} disabled={savingAppearance}>
                  {savingAppearance ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingAppearance ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Integration Configuration Dialog */}
      <Dialog open={integrationDialogOpen} onOpenChange={setIntegrationDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedIntegration}</DialogTitle>
            <DialogDescription>
              Configurez les paramètres de connexion pour cette intégration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL de l&apos;API</Label>
              <Input
                placeholder="https://api.example.com/v1"
                value={integrationConfigs.apiUrl}
                onChange={e => setIntegrationConfigs(prev => ({ ...prev, apiUrl: e.target.value }))}
                className="glass-input focus-ring-premium"
              />
            </div>
            <div className="space-y-2">
              <Label>Clé API / Token</Label>
              <Input
                type="password"
                placeholder="Entrez la clé API"
                value={integrationConfigs.apiKey}
                onChange={e => setIntegrationConfigs(prev => ({ ...prev, apiKey: e.target.value }))}
                className="glass-input focus-ring-premium"
              />
            </div>
            <div className="space-y-2">
              <Label>Intervalle de synchronisation</Label>
              <Select value={integrationConfigs.syncInterval} onValueChange={v => setIntegrationConfigs(prev => ({ ...prev, syncInterval: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 heure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Activer l&apos;intégration</p>
                <p className="text-xs text-muted-foreground">Activez ou désactivez cette connexion</p>
              </div>
              <Switch
                checked={integrationConfigs.enabled}
                onCheckedChange={v => setIntegrationConfigs(prev => ({ ...prev, enabled: v }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button className="btn-premium gap-2" onClick={handleSaveIntegration} disabled={savingIntegration}>
              {savingIntegration ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {savingIntegration ? 'Enregistrement...' : 'Enregistrer'}
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
            className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3 text-white text-sm font-medium shadow-premium-lg"
          >
            <CheckCircle2 className="h-4 w-4" />
            {successToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
