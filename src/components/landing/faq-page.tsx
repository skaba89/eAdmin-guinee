'use client'

import { motion } from 'framer-motion'
import { HelpCircle, Sparkles, ArrowRight, Search } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const faqData = [
  {
    category: 'Général',
    items: [
      {
        q: 'Qu\'est-ce qu\'eAdmin Guinée ?',
        a: 'eAdmin Guinée est une plateforme GovTech complète de digitalisation administrative conçue pour les institutions guinéennes et africaines. Elle intègre la GED, la gestion des courriers, les workflows automatisés, les signatures électroniques et le dashboard décisionnel en une seule solution.',
      },
      {
        q: 'À qui s\'adresse eAdmin Guinée ?',
        a: 'Notre plateforme s\'adresse aux ministères, institutions publiques, universités, collectivités territoriales, agences gouvernementales et toute organisation nécessitant une gestion administrative numérique professionnelle et sécurisée.',
      },
      {
        q: 'Est-ce que eAdmin Guinée est conforme aux réglementations guinéennes ?',
        a: 'Oui, eAdmin Guinée est entièrement conforme aux réglementations guinéennes en matière de données, de signatures électroniques et d\'archivage numérique. Nous travaillons en étroite collaboration avec les autorités compétentes pour garantir la conformité permanente.',
      },
    ],
  },
  {
    category: 'Technique',
    items: [
      {
        q: 'Comment fonctionne la signature électronique ?',
        a: 'Notre module de signature électronique utilise des certificats numériques conformes aux standards internationaux. Chaque signature est horodatée, tracée et possède une valeur juridique. Les signataires reçoivent une notification et peuvent signer depuis n\'importe quel appareil.',
      },
      {
        q: 'La plateforme est-elle sécurisée ?',
        a: 'Absolument. Nous utilisons le chiffrement de bout en bout (AES-256), l\'authentification multi-facteurs, le contrôle d\'accès RBAC, et des audit logs complets. Notre infrastructure est hébergée dans des datacenters certifiés avec un SLA de 99.9%.',
      },
      {
        q: 'Puis-je intégrer eAdmin Guinée avec mes systèmes existants ?',
        a: 'Oui, eAdmin Guinée dispose d\'une API REST complète et documentée qui permet l\'intégration avec vos systèmes existants (ERP, CRM, bases de données). Notre équipe technique peut aussi développer des connecteurs sur mesure.',
      },
      {
        q: 'Est-il possible de déployer eAdmin Guinée on-premise ?',
        a: 'Oui, notre plan Entreprise inclut la possibilité de déploiement on-premise ou hybride. Nous adaptons l\'architecture à votre infrastructure existante tout en maintenant les mêmes fonctionnalités et le même niveau de sécurité.',
      },
    ],
  },
  {
    category: 'Tarification & Support',
    items: [
      {
        q: 'Y a-t-il un essai gratuit ?',
        a: 'Oui, tous nos plans incluent un essai gratuit de 14 jours sans engagement. Vous pouvez tester l\'ensemble des fonctionnalités incluses dans votre plan choisi avant de vous engager.',
      },
      {
        q: 'Quel type de support est disponible ?',
        a: 'Le support varie selon le plan : email (8h-18h) pour le Starter, support prioritaire 24/7 pour le Professionnel, et account manager dédié avec support premium pour l\'Entreprise. Tous les plans incluent l\'accès à notre base de connaissances et documentation.',
      },
      {
        q: 'Comment se passe la migration de mes données ?',
        a: 'Notre équipe vous accompagne dans la migration de vos données existantes. Nous proposons un service d\'import structuré avec validation, et nos experts vérifient l\'intégrité de chaque document migré. La durée dépend du volume, mais la plupart des migrations sont complétées en 1 à 4 semaines.',
      },
    ],
  },
]

export function FAQPage() {
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
              <HelpCircle className="h-3.5 w-3.5 mr-1" />
              FAQ
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
              Questions <span className="gradient-text">fréquentes</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Trouvez les réponses à vos questions sur eAdmin Guinée et nos services.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="pb-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-10">
          {faqData.map((section, si) => (
            <motion.div
              key={section.category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: si * 0.1 }}
            >
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#C8A45C]" />
                {section.category}
              </h2>
              <Accordion type="single" collapsible className="space-y-2">
                {section.items.map((item) => (
                  <AccordionItem
                    key={item.q}
                    value={item.q}
                    className="glass-card rounded-xl px-5 border-transparent"
                  >
                    <AccordionTrigger className="text-sm font-medium text-foreground text-left hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Vous n&apos;avez pas trouvé votre réponse ?
          </h2>
          <p className="text-muted-foreground mb-8">
            Notre équipe est disponible pour répondre à toutes vos questions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => navigate('contact')}
              className="h-11 px-6 bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-primary dark:hover:bg-primary/90 text-white"
            >
              Nous contacter
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('demo')}
              className="h-11 px-6"
            >
              Demander une démo
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
