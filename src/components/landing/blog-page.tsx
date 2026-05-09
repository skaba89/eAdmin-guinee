'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, ArrowRight, BookOpen, TrendingUp } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const categories = ['Tous', 'GovTech', 'Data', 'IA', 'Transformation Digitale']

const articles = [
  {
    id: 1,
    title: 'Comment la Guinée accélère sa transformation digitale administrative',
    excerpt: 'Découvrez les initiatives phares qui positionnent la Guinée comme leader de l\'innovation GovTech en Afrique de l\'Ouest.',
    category: 'GovTech',
    date: '15 Janvier 2025',
    readTime: '8 min',
    featured: true,
  },
  {
    id: 2,
    title: 'L\'OCR intelligent : révolutionner la gestion documentaire',
    excerpt: 'L\'intelligence artificielle transforme l\'OCR traditionnel en un outil puissant de classification et d\'extraction automatique.',
    category: 'IA',
    date: '10 Janvier 2025',
    readTime: '6 min',
    featured: false,
  },
  {
    id: 3,
    title: '5 indicateurs clés pour piloter votre administration numérique',
    excerpt: 'Les KPIs essentiels pour mesurer l\'efficacité de votre transformation digitale et prendre des décisions éclairées.',
    category: 'Data',
    date: '5 Janvier 2025',
    readTime: '5 min',
    featured: false,
  },
  {
    id: 4,
    title: 'La signature électronique en Afrique : cadre juridique et bonnes pratiques',
    excerpt: 'Tour d\'horizon du cadre légal de la signature électronique dans les pays francophones d\'Afrique et recommandations.',
    category: 'GovTech',
    date: '28 Décembre 2024',
    readTime: '10 min',
    featured: false,
  },
  {
    id: 5,
    title: 'Transformation digitale : les leçons apprises en 2024',
    excerpt: 'Retour sur les succès et défis des projets de digitalisation administrative que nous avons accompagnés cette année.',
    category: 'Transformation Digitale',
    date: '20 Décembre 2024',
    readTime: '7 min',
    featured: false,
  },
  {
    id: 6,
    title: 'L\'IA générative au service de l\'administration publique',
    excerpt: 'Comment les modèles de langage peuvent automatiser la rédaction de documents administratifs tout en garantissant fiabilité.',
    category: 'IA',
    date: '15 Décembre 2024',
    readTime: '6 min',
    featured: false,
  },
]

export function BlogPage() {
  const { navigate } = useAppStore()
  const [activeCategory, setActiveCategory] = useState('Tous')

  const filteredArticles = activeCategory === 'Tous'
    ? articles
    : articles.filter((a) => a.category === activeCategory)

  const featuredArticle = articles.find((a) => a.featured)
  const otherArticles = filteredArticles.filter((a) => !a.featured)

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'GovTech': return 'bg-[#0B2E58]/10 text-[#0B2E58] dark:bg-primary/10 dark:text-primary'
      case 'Data': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      case 'IA': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
      case 'Transformation Digitale': return 'bg-[#C8A45C]/10 text-[#C8A45C]'
      default: return 'bg-muted text-muted-foreground'
    }
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
              <BookOpen className="h-3.5 w-3.5 mr-1" />
              Blog
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
              Actualités & <span className="gradient-text">insights</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Analyses, tendances et bonnes pratiques autour de la transformation digitale administrative.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  activeCategory === cat
                    ? 'bg-[#0B2E58] dark:bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Article */}
      {featuredArticle && activeCategory === 'Tous' && (
        <section className="pb-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="glass-card border-transparent overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  {/* Image placeholder */}
                  <div className="bg-gradient-to-br from-[#0B2E58] via-[#134A8E] to-[#0B2E58] dark:from-primary dark:via-primary/80 dark:to-primary h-64 lg:h-auto flex items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="h-16 w-16 text-[#C8A45C]/40 mx-auto mb-3" />
                      <span className="text-white/40 text-sm">Article à la une</span>
                    </div>
                  </div>
                  <CardContent className="p-8 flex flex-col justify-center">
                    <Badge className={cn('w-fit mb-4', getCategoryColor(featuredArticle.category))}>
                      {featuredArticle.category}
                    </Badge>
                    <h2 className="text-2xl font-bold text-foreground mb-3">
                      {featuredArticle.title}
                    </h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      {featuredArticle.excerpt}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {featuredArticle.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {featuredArticle.readTime}
                      </span>
                    </div>
                  </CardContent>
                </div>
              </Card>
            </motion.div>
          </div>
        </section>
      )}

      {/* Article Grid */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherArticles.map((article, i) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Card className="glass-card border-transparent h-full hover:shadow-lg transition-shadow cursor-pointer group">
                  {/* Image placeholder */}
                  <div className="bg-gradient-to-br from-[#0B2E58]/5 to-[#C8A45C]/5 dark:from-primary/5 dark:to-gold/5 h-48 flex items-center justify-center rounded-t-xl">
                    <BookOpen className="h-10 w-10 text-[#0B2E58]/20 dark:text-primary/20" />
                  </div>
                  <CardContent className="p-5">
                    <Badge className={cn('mb-3', getCategoryColor(article.category))} variant="secondary">
                      {article.category}
                    </Badge>
                    <h3 className="text-base font-semibold text-foreground mb-2 group-hover:text-[#0B2E58] dark:group-hover:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {article.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {article.readTime}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-[#C8A45C] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16 bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Restez informé
          </h2>
          <p className="text-muted-foreground mb-6">
            Recevez nos dernières analyses et actualités directement dans votre boîte mail.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="votre@email.gn"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button className="bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-primary dark:hover:bg-primary/90 text-white shrink-0">
              S&apos;abonner
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
