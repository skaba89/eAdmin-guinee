'use client'

import { motion } from 'framer-motion'
import { Check, Sparkles, ArrowRight } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const tiers = [
  {
    name: 'Starter',
    price: '500 000',
    unit: 'GNF/mois',
    desc: 'Pour les petites administrations',
    popular: false,
    features: [
      'Jusqu\'à 50 utilisateurs',
      'GED basique (5 000 documents)',
      'Courriers entrants/sortants',
      '3 workflows personnalisés',
      'Support email (8h-18h)',
      'Sauvegarde quotidienne',
      '1 Go stockage',
    ],
  },
  {
    name: 'Professionnel',
    price: '1 500 000',
    unit: 'GNF/mois',
    desc: 'Pour les ministères et institutions',
    popular: true,
    features: [
      'Jusqu\'à 500 utilisateurs',
      'GED complète (50 000 documents)',
      'Courriers + signatures électroniques',
      'Workflows illimités',
      'Dashboard décisionnel',
      'Support prioritaire 24/7',
      'OCR intelligent intégré',
      'API ouverte',
      '50 Go stockage',
      'Multi-départements',
    ],
  },
  {
    name: 'Entreprise',
    price: 'Sur mesure',
    unit: '',
    desc: 'Pour les grandes organisations',
    popular: false,
    features: [
      'Utilisateurs illimités',
      'GED illimitée',
      'Tous modules inclus',
      'IA & Automatisation avancée',
      'Architecture multi-tenant',
      'Déploiement on-premise possible',
      'SLA garanti 99.9%',
      'Account manager dédié',
      'Formation sur site',
      'Intégrations sur mesure',
      'Stockage illimité',
    ],
  },
]

const faqs = [
  { q: 'Puis-je changer de plan ?', a: 'Oui, vous pouvez upgrader ou downgrader votre plan à tout moment. La facturation est ajustée au prorata.' },
  { q: 'Y a-t-il un engagement minimum ?', a: 'Les plans mensuels sont sans engagement. Les plans annuels bénéficient d\'une réduction de 20%.' },
  { q: 'Les mises à jour sont-elles incluses ?', a: 'Absolument. Toutes les mises à jour de sécurité et fonctionnelles sont incluses dans votre abonnement.' },
]

export function PricingPage() {
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
              Tarifs
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
              Des tarifs <span className="gradient-text">transparents</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Choisissez le plan adapté à votre institution. Tous les plans incluent un essai gratuit de 14 jours.
            </p>
            <p className="mt-2 text-sm text-[#C8A45C] font-medium">
              💰 Économisez 20% avec la facturation annuelle
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {tiers.map((tier, i) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card
                  className={cn(
                    'relative h-full flex flex-col',
                    tier.popular
                      ? 'border-[#C8A45C] shadow-lg shadow-[#C8A45C]/10'
                      : 'border-border glass-card'
                  )}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-[#C8A45C] text-[#0B2E58] hover:bg-[#C8A45C]/90 font-semibold">
                        Le plus populaire
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pb-2 pt-6">
                    <CardTitle className="text-xl">{tier.name}</CardTitle>
                    <CardDescription>{tier.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="mb-6">
                      {tier.price === 'Sur mesure' ? (
                        <span className="text-3xl font-bold text-foreground">{tier.price}</span>
                      ) : (
                        <>
                          <span className="text-4xl font-bold text-foreground">{tier.price}</span>
                          <span className="text-sm text-muted-foreground ml-1">{tier.unit}</span>
                        </>
                      )}
                    </div>
                    <ul className="space-y-3">
                      {tier.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-[#C8A45C] mt-0.5 shrink-0" />
                          <span className="text-sm text-muted-foreground">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="pt-4">
                    <Button
                      className={cn(
                        'w-full h-11',
                        tier.popular
                          ? 'bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-primary dark:hover:bg-primary/90 text-white'
                          : ''
                      )}
                      variant={tier.popular ? 'default' : 'outline'}
                      onClick={() => navigate('demo')}
                    >
                      {tier.price === 'Sur mesure' ? 'Nous contacter' : 'Commencer l\'essai gratuit'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">
            Questions fréquentes sur les tarifs
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="glass-card rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground">
            Besoin d&apos;un devis personnalisé ?
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Notre équipe vous accompagne pour définir la solution la plus adaptée à vos besoins.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => navigate('contact')}
              className="h-12 px-8 bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-primary dark:hover:bg-primary/90 text-white"
            >
              Nous contacter
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('demo')}
              className="h-12 px-8"
            >
              Demander une démo
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
