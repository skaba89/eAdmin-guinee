'use client'

import { motion } from 'framer-motion'
import {
  Building2, GraduationCap, Landmark, Users, FileText, Mail,
  GitBranch, PenTool, BarChart3, Sparkles, ArrowRight, CheckCircle2,
  Shield, Globe, Scale
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const solutions = [
  {
    icon: Building2,
    title: 'Ministères',
    desc: 'Solution complète pour la gestion administrative ministérielle avec conformité réglementaire.',
    useCases: [
      'Gestion des courriers ministériels',
      'Circulation des notes de service',
      'Archivage réglementaire',
      'Suivi des décisions & arbitrages',
    ],
    modules: [FileText, Mail, GitBranch, PenTool, BarChart3],
  },
  {
    icon: GraduationCap,
    title: 'Universités',
    desc: 'Plateforme adaptée aux établissements d\'enseignement supérieur et de recherche.',
    useCases: [
      'Gestion des dossiers étudiants',
      'Procédures d\'inscription & réinscription',
      'Délibérations & jury',
      'Gestion des thèses & mémoires',
    ],
    modules: [FileText, GitBranch, Sparkles, BarChart3],
  },
  {
    icon: Landmark,
    title: 'Collectivités',
    desc: 'Outils de gestion décentralisée pour les collectivités territoriales.',
    useCases: [
      'Gestion des actes administratifs',
      'Etat civil & documents d\'identité',
      'Budget & finances locales',
      'Portail services citoyens',
    ],
    modules: [FileText, Mail, PenTool, BarChart3, Sparkles],
  },
  {
    icon: Scale,
    title: 'Agences',
    desc: 'Solution pour les agences gouvernementales et établissements publics.',
    useCases: [
      'Gestion des marchés publics',
      'Suivi des projets & programmes',
      'Rapports d\'activité & KPIs',
      'Coordination inter-agences',
    ],
    modules: [GitBranch, BarChart3, FileText, Sparkles],
  },
]

const benefits = [
  { icon: Shield, title: 'Souveraineté des données', desc: 'Hébergement local garanti, conformité aux réglementations guinéennes.' },
  { icon: Globe, title: 'Interopérabilité', desc: 'Échange de données fluide entre institutions et systèmes existants.' },
  { icon: Users, title: 'Portail citoyen', desc: 'Interface accessible permettant aux citoyens de suivre leurs démarches.' },
  { icon: CheckCircle2, title: 'Conformité', desc: 'Respect des normes d\'archivage et de signature électronique.' },
]

export function SolutionsPage() {
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
              Solutions
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
              Des solutions pour chaque <span className="gradient-text">secteur</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
              eAdmin Suite s&apos;adapte aux besoins spécifiques de chaque type d&apos;institution
              avec des modules et workflows sur mesure.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Solutions */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          {solutions.map((sol, i) => (
            <motion.div
              key={sol.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Card className="glass-card border-transparent hover:shadow-lg transition-shadow">
                <CardContent className="p-6 sm:p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Title & desc */}
                    <div className="lg:col-span-1">
                      <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-[#0B2E58]/10 dark:bg-primary/10 mb-4">
                        <sol.icon className="h-7 w-7 text-[#0B2E58] dark:text-primary" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-2">{sol.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{sol.desc}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => navigate('demo')}
                      >
                        Voir la démo
                        <ArrowRight className="ml-2 h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Middle: Use cases */}
                    <div className="lg:col-span-1">
                      <h4 className="text-sm font-semibold text-foreground mb-3">Cas d&apos;usage</h4>
                      <ul className="space-y-2.5">
                        {sol.useCases.map((uc) => (
                          <li key={uc} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-[#C8A45C] mt-0.5 shrink-0" />
                            <span className="text-sm text-muted-foreground">{uc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Right: Modules */}
                    <div className="lg:col-span-1">
                      <h4 className="text-sm font-semibold text-foreground mb-3">Modules inclus</h4>
                      <div className="flex flex-wrap gap-2">
                        {sol.modules.map((Mod, mi) => {
                          const names = ['GED', 'Courriers', 'Workflows', 'Signatures', 'Analytics', 'IA']
                          return (
                            <Badge key={mi} variant="secondary" className="gap-1.5 py-1.5 px-3">
                              <Mod className="h-3.5 w-3.5" />
                              {names[mi] || 'Module'}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 bg-[#0B2E58] dark:bg-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Pourquoi choisir eAdmin Suite ?
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 mb-4">
                  <b.icon className="h-7 w-7 text-[#C8A45C]" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{b.title}</h3>
                <p className="text-sm text-white/60">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground">
            Votre institution mérite le meilleur
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Découvrez comment eAdmin Suite peut transformer votre administration.
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
              onClick={() => navigate('pricing')}
              className="h-12 px-8"
            >
              Voir les tarifs
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
