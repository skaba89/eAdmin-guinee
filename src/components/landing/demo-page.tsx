'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles, ArrowRight, CheckCircle2, Play, Clock, Shield,
  Users, Zap, Phone, Calendar
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

const benefits = [
  { icon: Clock, title: '30 minutes', desc: 'Démonstration personnalisée adaptée à votre contexte' },
  { icon: Users, title: 'Experts dédiés', desc: 'Échangez avec nos consultants sectoriels' },
  { icon: Zap, title: 'Sans engagement', desc: 'Aucune obligation, évaluez la plateforme librement' },
  { icon: Shield, title: 'Données sécurisées', desc: 'Essai dans un environnement isolé et sécurisé' },
]

export function DemoPage() {
  const { navigate } = useAppStore()
  const [form, setForm] = useState({
    name: '', email: '', institution: '', phone: '', message: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      toast.success('Demande envoyée ! Notre équipe vous contactera sous 24h pour planifier votre démo.')
      setForm({ name: '', email: '', institution: '', phone: '', message: '' })
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="pt-32 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="mb-4 border-[#C8A45C]/50 text-[#C8A45C]">
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Démonstration
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
              Découvrez eAdmin Guinée <span className="gradient-text">en action</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Planifiez une démonstration personnalisée et voyez comment notre plateforme
              peut transformer votre administration.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <div className="glass-card rounded-xl p-5 text-center">
                  <b.icon className="h-8 w-8 text-[#C8A45C] mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-foreground mb-1">{b.title}</h3>
                  <p className="text-xs text-muted-foreground">{b.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Form & Video */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Video Placeholder */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="sticky top-24">
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="relative bg-gradient-to-br from-[#0B2E58] via-[#134A8E] to-[#0B2E58] dark:from-primary dark:via-primary/80 dark:to-primary aspect-video flex items-center justify-center group cursor-pointer">
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                    <div className="relative z-10 text-center">
                      <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Play className="h-8 w-8 text-white ml-1" />
                      </div>
                      <p className="text-white font-medium">Voir la démo eAdmin Guinée</p>
                      <p className="text-white/60 text-sm mt-1">3 min — Aperçu de la plateforme</p>
                    </div>
                  </div>
                </div>

                {/* What you'll see */}
                <div className="mt-6 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Ce que vous découvrirez :</h3>
                  {[
                    'Tableau de bord et indicateurs clés',
                    'Gestion des courriers entrants/sortants',
                    'Création et suivi des workflows',
                    'Signature électronique de documents',
                    'Recherche intelligente & OCR',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#C8A45C] shrink-0" />
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="glass-card border-transparent">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-[#C8A45C]" />
                    <h2 className="text-xl font-semibold text-foreground">
                      Planifier votre démonstration
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">
                    Remplissez le formulaire ci-dessous et notre équipe vous contactera pour organiser une session personnalisée.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">
                          Nom complet *
                        </label>
                        <Input
                          placeholder="Mamadou Diallo"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          required
                          className="h-11"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">
                          Email professionnel *
                        </label>
                        <Input
                          type="email"
                          placeholder="mamadou@ministere.gn"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          required
                          className="h-11"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">
                          Institution *
                        </label>
                        <Input
                          placeholder="Ministère des Finances"
                          value={form.institution}
                          onChange={(e) => setForm({ ...form, institution: e.target.value })}
                          required
                          className="h-11"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">
                          Téléphone
                        </label>
                        <Input
                          type="tel"
                          placeholder="+224 622 00 00 00"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          className="h-11"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        Message (optionnel)
                      </label>
                      <Textarea
                        placeholder="Décrivez vos besoins ou votre contexte..."
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-primary dark:hover:bg-primary/90 text-white text-base font-semibold"
                    >
                      {loading ? 'Envoi en cours...' : 'Planifier ma démonstration'}
                      {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      En soumettant ce formulaire, vous acceptez d&apos;être contacté par notre équipe.
                      Nous ne partageons jamais vos données.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
