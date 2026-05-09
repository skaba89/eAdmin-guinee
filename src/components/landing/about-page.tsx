'use client'

import { motion } from 'framer-motion'
import {
  Sparkles, Target, Eye, Users, Shield, Lightbulb,
  Heart, Globe, ArrowRight, Linkedin, Twitter, Building2
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const values = [
  { icon: Shield, title: 'Intégrité', desc: 'Nous garantissons la transparence et l\'éthique dans toutes nos actions.' },
  { icon: Lightbulb, title: 'Innovation', desc: 'Nous repoussons les limites technologiques au service de l\'administration.' },
  { icon: Heart, title: 'Engagement', desc: 'Nous sommes investis dans la réussite de chaque institution partenaire.' },
  { icon: Globe, title: 'Impact', desc: 'Nous mesurons notre succès par l\'impact positif sur la vie des citoyens.' },
]

const team = [
  { name: 'Mamadou Bailo Bah', role: 'CEO & Co-fondateur', bio: 'Expert en transformation digitale avec 15 ans d\'expérience dans le secteur public africain.' },
  { name: 'Aissatou Diallo', role: 'CTO & Co-fondatrice', bio: 'Ingénieure en systèmes distribués, spécialisée en architectures GovTech sécurisées.' },
  { name: 'Ibrahima Sory Sylla', role: 'VP Produit', bio: 'Ancien chef de produit chez un éditeur SaaS européen, passionné par l\'UX publique.' },
  { name: 'Fatoumata Binta Bah', role: 'Directrice des Opérations', bio: 'Spécialiste de la gestion de projets IT à grande échelle en Afrique de l\'Ouest.' },
  { name: 'Abdoulaye Camara', role: 'Lead Architecte', bio: 'Architecte cloud certifié, expert en infrastructure multi-tenant et sécurité.' },
  { name: 'Mariama Condé', role: 'Directrice Commerciale', bio: 'Experte en développement commercial B2B avec un focus sur les marchés publics.' },
]

const milestones = [
  { year: '2019', title: 'Création', desc: 'DataSphere Innovation est fondée à Conakry avec la vision de digitaliser l\'administration guinéenne.' },
  { year: '2020', title: 'Premier MVP', desc: 'Lancement de la première version d\'eAdmin Suite avec les modules GED et Courriers.' },
  { year: '2021', title: 'Premiers clients', desc: 'Signature avec les 3 premiers ministères et traitement des 10 000 premiers documents.' },
  { year: '2022', title: 'Scale-up', desc: 'Lancement des workflows et signatures électroniques. 50+ institutions adoptent la plateforme.' },
  { year: '2023', title: 'IA & Analytics', desc: 'Intégration de l\'OCR intelligent et du dashboard décisionnel. Extension régionale.' },
  { year: '2024', title: 'Leader GovTech', desc: '150+ institutions, 50 000+ documents traités. Reconnaissance comme leader GovTech en Guinée.' },
]

export function AboutPage() {
  const { navigate } = useAppStore()

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
              À propos
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
              Construire l&apos;avenir de l&apos;<span className="gradient-text">administration numérique</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
              DataSphere Innovation est une entreprise de technologie guinéenne dédiée à la transformation
              digitale des administrations publiques en Afrique.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="h-full border-transparent bg-[#0B2E58] dark:bg-primary text-white">
                <CardContent className="p-8">
                  <Target className="h-10 w-10 text-[#C8A45C] mb-4" />
                  <h2 className="text-2xl font-bold mb-3">Notre Mission</h2>
                  <p className="text-white/70 leading-relaxed">
                    Rendre l&apos;administration publique plus efficace, transparente et accessible
                    grâce à des technologies de pointe adaptées au contexte africain. Nous croyons
                    que la digitalisation est un levier puissant pour le développement et l&apos;inclusion.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="h-full border-transparent glass-card">
                <CardContent className="p-8">
                  <Eye className="h-10 w-10 text-[#C8A45C] mb-4" />
                  <h2 className="text-2xl font-bold text-foreground mb-3">Notre Vision</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Devenir la plateforme GovTech de référence en Afrique francophone, en offrant
                    des solutions qui transforment durablement la relation entre les institutions
                    et les citoyens. Nous visons un continent où chaque administration est numérique.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Story / Timeline */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Notre <span className="gradient-text">histoire</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              De Conakry au leadership GovTech régional, notre parcours en quelques dates clés.
            </p>
          </div>

          <div className="relative max-w-3xl mx-auto">
            {/* Vertical line */}
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#0B2E58] via-[#C8A45C] to-[#0B2E58] dark:from-primary dark:via-gold dark:to-primary" />

            <div className="space-y-8">
              {milestones.map((ms, i) => (
                <motion.div
                  key={ms.year}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className={cn(
                    'relative flex items-start gap-6',
                    i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  )}
                >
                  <div className={cn('flex-1', i % 2 === 0 ? 'md:text-right' : 'md:text-left')}>
                    <div className="glass-card rounded-xl p-5 inline-block">
                      <div className="text-sm font-bold text-[#C8A45C] mb-1">{ms.year}</div>
                      <h3 className="text-base font-semibold text-foreground mb-1">{ms.title}</h3>
                      <p className="text-sm text-muted-foreground">{ms.desc}</p>
                    </div>
                  </div>
                  <div className="absolute left-4 md:left-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-[#C8A45C] border-4 border-background z-10 mt-5" />
                  <div className="flex-1 hidden md:block" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Nos <span className="gradient-text">valeurs</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Card className="glass-card border-transparent h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-[#0B2E58]/10 dark:bg-primary/10 mb-4">
                      <v.icon className="h-7 w-7 text-[#0B2E58] dark:text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{v.title}</h3>
                    <p className="text-sm text-muted-foreground">{v.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Notre <span className="gradient-text">équipe</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Des talents passionnés au service de l&apos;innovation administrative.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Card className="glass-card border-transparent hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-14 w-14 rounded-full bg-[#0B2E58] dark:bg-primary flex items-center justify-center text-white text-lg font-bold shrink-0">
                        {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{member.name}</h3>
                        <p className="text-xs text-[#C8A45C] font-medium">{member.role}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{member.bio}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground">
            Rejoignez l&apos;aventure
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Faites partie des institutions qui transforment l&apos;administration en Guinée.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => navigate('demo')}
              className="h-12 px-8 bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-primary dark:hover:bg-primary/90 text-white"
            >
              Demander une démo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('contact')}
              className="h-12 px-8"
            >
              Nous contacter
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
