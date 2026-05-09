'use client'

import { motion } from 'framer-motion'
import {
  Database, BarChart3, Sparkles, Cloud, Shield, Cpu,
  ArrowRight, CheckCircle2, Zap, Layers, Code2, Lock
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const services = [
  {
    icon: Database,
    title: 'Data Engineering',
    desc: 'Conception et mise en œuvre de pipelines de données robustes pour les administrations publiques.',
    features: [
      'Architecture Data Lake & Data Warehouse',
      'ETL/ELT pour l\'intégration multi-sources',
      'Qualité et gouvernance des données',
      'Temps réel & streaming de données',
    ],
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    icon: BarChart3,
    title: 'BI & Analytics',
    desc: 'Tableaux de bord décisionnels et analyses avancées pour piloter votre administration.',
    features: [
      'Dashboards interactifs temps réel',
      'Rapports automatisés & exportables',
      'Analyses prédictives & KPIs',
      'Visualisation de données géographiques',
    ],
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    icon: Sparkles,
    title: 'GovTech',
    desc: 'Solutions technologiques dédiées à la modernisation de l\'action publique et aux services citoyens.',
    features: [
      'Plateforme eAdmin Suite complète',
      'Portail citoyen & e-services',
      'Gestion des courriers & documents',
      'Signatures & workflows numériques',
    ],
    color: 'bg-[#C8A45C]/10 text-[#C8A45C]',
  },
  {
    icon: Cpu,
    title: 'Intelligence Artificielle',
    desc: 'Automatisation intelligente et IA générative au service de l\'efficacité administrative.',
    features: [
      'OCR intelligent & classification auto',
      'Chatbots & assistants virtuels',
      'Analyse de documents par IA',
      'Prédiction & recommandations',
    ],
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  {
    icon: Cloud,
    title: 'Cloud & Infrastructure',
    desc: 'Architecture cloud sécurisée et scalable adaptée aux exigences des institutions publiques.',
    features: [
      'Cloud hybride & multi-cloud',
      'Déploiement on-premise possible',
      'Haute disponibilité (99.9% SLA)',
      'Monitoring & observabilité 24/7',
    ],
    color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  },
  {
    icon: Shield,
    title: 'Cybersécurité',
    desc: 'Protection avancée des données et des systèmes d\'information sensibles de l\'État.',
    features: [
      'Audit de sécurité & pentesting',
      'Chiffrement de bout en bout',
      'Gestion des identités (IAM)',
      'Conformité & certification',
    ],
    color: 'bg-red-500/10 text-red-600 dark:text-red-400',
  },
  {
    icon: Layers,
    title: 'Transformation Digitale',
    desc: 'Accompagnement complet dans la transition numérique de votre organisation.',
    features: [
      'Diagnostic & feuille de route',
      'Gestion du changement',
      'Formation & montée en compétences',
      'Conduite de projet agile',
    ],
    color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
]

const processSteps = [
  { icon: Zap, title: 'Diagnostic', desc: 'Analyse de vos besoins et enjeux spécifiques' },
  { icon: Code2, title: 'Conception', desc: 'Architecture et design de la solution sur mesure' },
  { icon: Layers, title: 'Déploiement', desc: 'Mise en production progressive et accompagnée' },
  { icon: Lock, title: 'Pérennisation', desc: 'Support continu et évolution de la plateforme' },
]

export function ServicesPage() {
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
              Services
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
              Nos expertises <span className="gradient-text">au service</span> de votre transformation
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
              De l&apos;ingénierie des données à la cybersécurité, nous couvrons l&apos;ensemble des
              compétences nécessaires pour réussir votre transformation digitale.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, i) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Card className="glass-card border-transparent h-full hover:shadow-lg transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className={cn('inline-flex h-12 w-12 items-center justify-center rounded-xl mb-4', service.color)}>
                      <service.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{service.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{service.desc}</p>
                    <ul className="space-y-2">
                      {service.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#C8A45C] mt-0.5 shrink-0" />
                          <span className="text-sm text-muted-foreground">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Notre <span className="gradient-text">approche</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Un processus éprouvé pour garantir le succès de chaque projet.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {processSteps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <div className="glass-card rounded-xl p-6 text-center h-full">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#0B2E58] dark:bg-primary mb-4">
                    <step.icon className="h-6 w-6 text-[#C8A45C]" />
                  </div>
                  <div className="text-xs font-bold text-[#C8A45C] mb-2">Étape {i + 1}</div>
                  <h3 className="text-base font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground">
            Un projet en tête ?
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Discutons de vos besoins et construisons ensemble votre solution sur mesure.
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
