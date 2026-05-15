'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Mail, Lock, User, Building2, ArrowLeft, Phone, MapPin, Hash, Eye, EyeOff, AlertCircle, CheckCircle2, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useAppStore, type UserInfo } from '@/store/app-store'
import { useUsersStore } from '@/store/users-store'

// Guinea tricolor
const GUINEA_RED = '#CE1126'
const GUINEA_YELLOW = '#FCD116'
const GUINEA_GREEN = '#009460'

interface FormErrors {
  [key: string]: string
}

export function RegisterPage() {
  const { navigate } = useAppStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [form, setForm] = useState({
    lastName: '',
    firstName: '',
    nin: '',
    email: '',
    phone: '',
    address: '',
    institution: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!form.lastName.trim()) newErrors.lastName = 'Le nom est requis'
    if (!form.firstName.trim()) newErrors.firstName = 'Le prénom est requis'
    if (!form.nin.trim()) {
      newErrors.nin = 'Le NIN est requis'
    } else if (!/^NIN-\d{4}-\d{6}$/.test(form.nin.trim()) && form.nin.trim().length < 8) {
      newErrors.nin = 'Format NIN invalide (ex: NIN-2019-458723)'
    }
    if (!form.email.trim()) {
      newErrors.email = "L'email est requis"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = "Format d'email invalide"
    }
    if (!form.phone.trim()) {
      newErrors.phone = 'Le téléphone est requis'
    }
    if (!form.address.trim()) newErrors.address = "L'adresse est requise"
    if (!form.password.trim()) {
      newErrors.password = 'Le mot de passe est requis'
    } else if (form.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères'
    }
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas'
    }
    if (!acceptedTerms) {
      newErrors.terms = 'Vous devez accepter les conditions'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)

    // Simulate account creation
    await new Promise(resolve => setTimeout(resolve, 800))

    // Check if email already exists in users store
    const usersStore = useUsersStore.getState()
    const existingUser = usersStore.getUserByEmail(form.email)
    if (existingUser) {
      setErrors(prev => ({ ...prev, email: 'Cet email est déjà utilisé' }))
      setIsSubmitting(false)
      return
    }

    // Create account in users store (persisted)
    usersStore.addUser({
      email: form.email,
      name: `${form.lastName} ${form.firstName}`,
      firstName: form.firstName,
      role: 'citizen',
      status: 'actif',
      phone: form.phone,
      nin: form.nin,
      institution: form.institution || 'Citoyen',
      password: form.password,
    })

    setSuccess(true)
    setIsSubmitting(false)

    // Auto-login after success
    setTimeout(() => {
      const { login } = useAppStore.getState()
      login(form.email, form.password)
    }, 1500)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0B2E58] via-[#134A8E] to-[#0B2E58] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="flex justify-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30"
            >
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </motion.div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Compte créé avec succès !</h2>
          <p className="text-white/60 mb-4">Bienvenue sur eAdministration Suite, {form.firstName}.</p>
          <p className="text-sm text-white/40">Connexion en cours vers votre portail citoyen...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0B2E58] via-[#134A8E] to-[#0B2E58] p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/10 translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-white/5 -translate-x-1/3 translate-y-1/3" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-6">
          {/* Guinea tricolor bar */}
          <div className="flex gap-0 mb-4 rounded-lg overflow-hidden">
            <div className="flex-1 h-2" style={{ backgroundColor: GUINEA_RED }} />
            <div className="flex-1 h-2" style={{ backgroundColor: GUINEA_YELLOW }} />
            <div className="flex-1 h-2" style={{ backgroundColor: GUINEA_GREEN }} />
          </div>

          <div className="flex items-center gap-3 justify-center mb-2">
            <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-lg flex items-center justify-center border border-white/20">
              <Sparkles className="h-6 w-6 text-[#C8A45C]" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-white">Créer un compte citoyen</h1>
          <p className="text-xs text-white/50 mt-1">Rejoignez la plateforme eAdministration — République de Guinée</p>
        </div>

        <Card className="glass-card border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader className="pb-3">
            {/* Guinea tricolor accent */}
            <div className="flex gap-0 -mx-6 -mt-6 rounded-t-lg overflow-hidden">
              <div className="flex-1 h-1.5" style={{ backgroundColor: GUINEA_RED }} />
              <div className="flex-1 h-1.5" style={{ backgroundColor: GUINEA_YELLOW }} />
              <div className="flex-1 h-1.5" style={{ backgroundColor: GUINEA_GREEN }} />
            </div>
            <CardTitle className="text-white text-lg">Inscription Citoyenne</CardTitle>
            <CardDescription className="text-white/50 text-xs">
              Les champs marqués * sont obligatoires
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-white/80 text-xs">Nom *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      placeholder="Diallo"
                      value={form.lastName}
                      onChange={e => updateField('lastName', e.target.value)}
                      className={`pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/30 h-9 text-sm ${errors.lastName ? 'border-red-400/60' : ''}`}
                    />
                  </div>
                  {errors.lastName && <p className="text-[10px] text-red-300 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.lastName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/80 text-xs">Prénom *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      placeholder="Aminata"
                      value={form.firstName}
                      onChange={e => updateField('firstName', e.target.value)}
                      className={`pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/30 h-9 text-sm ${errors.firstName ? 'border-red-400/60' : ''}`}
                    />
                  </div>
                  {errors.firstName && <p className="text-[10px] text-red-300 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.firstName}</p>}
                </div>
              </div>

              {/* NIN */}
              <div className="space-y-1.5">
                <Label className="text-white/80 text-xs">Numéro d&apos;Identification National (NIN) *</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    placeholder="NIN-2019-458723"
                    value={form.nin}
                    onChange={e => updateField('nin', e.target.value)}
                    className={`pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/30 h-9 text-sm font-mono ${errors.nin ? 'border-red-400/60' : ''}`}
                  />
                </div>
                {errors.nin && <p className="text-[10px] text-red-300 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.nin}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label className="text-white/80 text-xs">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    type="email"
                    placeholder="votre@email.com"
                    value={form.email}
                    onChange={e => updateField('email', e.target.value)}
                    className={`pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/30 h-9 text-sm ${errors.email ? 'border-red-400/60' : ''}`}
                  />
                </div>
                {errors.email && <p className="text-[10px] text-red-300 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.email}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label className="text-white/80 text-xs">Téléphone *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    placeholder="+224 622 34 56 78"
                    value={form.phone}
                    onChange={e => updateField('phone', e.target.value)}
                    className={`pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/30 h-9 text-sm ${errors.phone ? 'border-red-400/60' : ''}`}
                  />
                </div>
                {errors.phone && <p className="text-[10px] text-red-300 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.phone}</p>}
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <Label className="text-white/80 text-xs">Adresse *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    placeholder="Conakry, Commune de Kaloum"
                    value={form.address}
                    onChange={e => updateField('address', e.target.value)}
                    className={`pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/30 h-9 text-sm ${errors.address ? 'border-red-400/60' : ''}`}
                  />
                </div>
                {errors.address && <p className="text-[10px] text-red-300 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.address}</p>}
              </div>

              {/* Institution (optional) */}
              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs">Institution / Employeur (optionnel)</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    placeholder="Ministère de..."
                    value={form.institution}
                    onChange={e => updateField('institution', e.target.value)}
                    className="pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/30 h-9 text-sm"
                  />
                </div>
              </div>

              {/* Password row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-white/80 text-xs">Mot de passe *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={e => updateField('password', e.target.value)}
                      className={`pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/30 h-9 text-sm ${errors.password ? 'border-red-400/60' : ''}`}
                    />
                  </div>
                  {errors.password && <p className="text-[10px] text-red-300 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.password}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/80 text-xs">Confirmer *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={form.confirmPassword}
                      onChange={e => updateField('confirmPassword', e.target.value)}
                      className={`pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/30 h-9 text-sm ${errors.confirmPassword ? 'border-red-400/60' : ''}`}
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-[10px] text-red-300 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.confirmPassword}</p>}
                </div>
              </div>

              {/* Show password toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-white/40 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <span className="text-xs text-white/40">Afficher le mot de passe</span>
              </div>

              {/* Terms */}
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                    className="mt-0.5 border-white/30 data-[state=checked]:bg-[#C8A45C] data-[state=checked]:border-[#C8A45C]"
                  />
                  <label className="text-xs text-white/50 leading-relaxed cursor-pointer" onClick={() => setAcceptedTerms(!acceptedTerms)}>
                    J&apos;accepte les conditions d&apos;utilisation et la politique de protection des données conformément à la Loi L/2016/018/AN
                  </label>
                </div>
                {errors.terms && <p className="text-[10px] text-red-300 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.terms}</p>}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#C8A45C] hover:bg-[#C8A45C]/90 text-[#0B2E58] font-semibold h-11"
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="h-4 w-4 border-2 border-[#0B2E58]/30 border-t-[#0B2E58] rounded-full"
                  />
                ) : (
                  'Créer mon compte citoyen'
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => navigate('login')}
                className="text-sm text-white/50 hover:text-white/80 transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Déjà inscrit ? <span className="text-[#C8A45C] font-medium">Se connecter</span>
              </button>
            </div>

            {/* Sovereignty badge */}
            <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-white/30">
              <Shield className="h-3 w-3" />
              <span>Données protégées — Conformité Loi L/2016/018/AN</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
