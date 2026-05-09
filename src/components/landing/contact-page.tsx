'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Phone, Mail, Clock, Send, Building2, Globe } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { BRAND } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

const contactInfo = [
  {
    icon: MapPin,
    title: 'Adresse',
    lines: ['Quartier Kaloum', 'Conakry, République de Guinée'],
  },
  {
    icon: Phone,
    title: 'Téléphone',
    lines: ['+224 622 00 00 00', '+224 666 00 00 00'],
  },
  {
    icon: Mail,
    title: 'Email',
    lines: ['contact@datasphere-gn.com', 'support@eadmin-gn.com'],
  },
  {
    icon: Clock,
    title: 'Horaires',
    lines: ['Lundi - Vendredi', '08h00 - 18h00 (GMT)'],
  },
]

export function ContactPage() {
  const { navigate } = useAppStore()
  const [form, setForm] = useState({ name: '', email: '', institution: '', message: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      toast.success('Message envoyé ! Nous vous répondrons sous 24h.')
      setForm({ name: '', email: '', institution: '', message: '' })
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
              Contact
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
              Parlons de votre <span className="gradient-text">projet</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Notre équipe est à votre écoute pour vous accompagner dans votre transformation digitale.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="glass-card border-transparent">
                <CardContent className="p-6 sm:p-8">
                  <h2 className="text-xl font-semibold text-foreground mb-6">
                    Envoyez-nous un message
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">
                          Nom complet
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
                          Email
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
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        Institution
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
                        Message
                      </label>
                      <Textarea
                        placeholder="Décrivez votre projet ou vos besoins..."
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        required
                        rows={5}
                        className="resize-none"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-primary dark:hover:bg-primary/90 text-white"
                    >
                      {loading ? 'Envoi en cours...' : 'Envoyer le message'}
                      {!loading && <Send className="ml-2 h-4 w-4" />}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {contactInfo.map((info) => (
                  <div key={info.title} className="glass-card rounded-xl p-5">
                    <info.icon className="h-6 w-6 text-[#C8A45C] mb-3" />
                    <h3 className="text-sm font-semibold text-foreground mb-2">{info.title}</h3>
                    {info.lines.map((line) => (
                      <p key={line} className="text-sm text-muted-foreground">{line}</p>
                    ))}
                  </div>
                ))}
              </div>

              {/* Map placeholder */}
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="bg-[#0B2E58]/5 dark:bg-primary/5 h-64 flex items-center justify-center">
                  <div className="text-center">
                    <Globe className="h-12 w-12 text-[#0B2E58]/20 dark:text-primary/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Conakry, République de Guinée</p>
                    <p className="text-xs text-muted-foreground mt-1">Quartier Kaloum — Centre Affaires</p>
                  </div>
                </div>
              </div>

              {/* Quick CTA */}
              <div className="glass-card rounded-xl p-6 text-center">
                <Building2 className="h-8 w-8 text-[#0B2E58] dark:text-primary mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Préférez-vous une démonstration ?
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Planifiez une session de démonstration personnalisée avec nos experts.
                </p>
                <Button
                  onClick={() => navigate('demo')}
                  className="bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-primary dark:hover:bg-primary/90 text-white"
                >
                  Demander une démo
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
