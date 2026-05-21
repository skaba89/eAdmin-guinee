'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lightbulb, ChevronRight, X, Sparkles, FileCheck,
  Clock, Shield, Home, Heart, CreditCard, GraduationCap,
  Plane, Syringe, Building2, Bot, Key, TrendingUp,
  FileBarChart, UserCog, FileQuestion, LayoutDashboard,
  AlertTriangle, Bell, ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store/app-store'
import { useRecommendationsStore, type Recommendation, type RecommendationPriority, type RecommendationType } from '@/store/recommendations-store'
import { useCitizenRequestsStore } from '@/store/citizen-requests-store'
import { mapRole } from '@/lib/rbac'

const ICON_MAP: Record<string, React.ElementType> = {
  CreditCard, Home, Shield, Syringe, Building2, GraduationCap,
  Plane, Heart, Lightbulb, Bot, Key, TrendingUp, FileBarChart,
  UserCog, FileQuestion, LayoutDashboard, FileCheck, Clock,
  Bell, Sparkles,
}

const PRIORITY_CONFIG: Record<RecommendationPriority, { label: string; color: string; bgColor: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  high: { label: 'Important', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  medium: { label: 'Conseil', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  low: { label: 'Suggestion', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
}

const TYPE_CONFIG: Record<RecommendationType, { label: string; icon: React.ElementType }> = {
  service_suggestion: { label: 'Service recommandé', icon: Sparkles },
  action_required: { label: 'Action requise', icon: AlertTriangle },
  document_reminder: { label: 'Rappel document', icon: FileCheck },
  process_optimization: { label: 'Optimisation', icon: TrendingUp },
  deadline_alert: { label: 'Échéance', icon: Clock },
  service_upgrade: { label: 'Amélioration', icon: ArrowRight },
}

export function RecommendationsPanel() {
  const { user, navigate } = useAppStore()
  const recommendations = useRecommendationsStore(s => s.recommendations)
  const markAsRead = useRecommendationsStore(s => s.markAsRead)
  const dismiss = useRecommendationsStore(s => s.dismiss)
  const getActiveRecommendations = useRecommendationsStore(s => s.getActiveRecommendations)
  const generatePersonalizedRecommendations = useRecommendationsStore(s => s.generatePersonalizedRecommendations)
  const allRequests = useCitizenRequestsStore(s => s.requests)

  const [isExpanded, setIsExpanded] = useState(true)

  // Generate personalized recommendations on mount
  useEffect(() => {
    if (!user) return
    const existingServiceIds = allRequests
      .filter(r => r.citizenEmail === user.email)
      .map(r => r.serviceId)
    generatePersonalizedRecommendations(mapRole(user.role), user.email, existingServiceIds)
  }, [user?.email, user?.role])

  if (!user) return null

  const activeRecs = getActiveRecommendations(mapRole(user.role), user.email).slice(0, 6)
  const unreadCount = activeRecs.filter(r => !r.isRead).length

  if (activeRecs.length === 0) return null

  const handleAction = (rec: Recommendation) => {
    markAsRead(rec.id)
    if (rec.actionPage) {
      navigate(rec.actionPage as any)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="border-[#C8A45C]/20 dark:border-[#D4B878]/20 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-800/20">
                <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Recommandations
                  {unreadCount > 0 && (
                    <Badge className="bg-[#CE1126] text-white text-[10px] h-5 px-1.5">
                      {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Suggestions personnalisées basées sur votre profil
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-1 text-xs"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Réduire' : 'Voir tout'}
            </Button>
          </div>
        </CardHeader>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeRecs.map((rec, idx) => {
                    const IconComponent = ICON_MAP[rec.icon || ''] || Lightbulb
                    const priorityConfig = PRIORITY_CONFIG[rec.priority]
                    const typeConfig = TYPE_CONFIG[rec.type]

                    return (
                      <motion.div
                        key={rec.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`group relative p-4 rounded-xl border transition-all hover:shadow-md ${
                          rec.isRead
                            ? 'border-border bg-background'
                            : 'border-amber-200 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-900/10'
                        }`}
                      >
                        {/* Close button */}
                        <button
                          className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                          onClick={() => dismiss(rec.id)}
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>

                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg shrink-0 ${priorityConfig.bgColor}`}>
                            <IconComponent className={`h-4 w-4 ${priorityConfig.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${priorityConfig.bgColor} ${priorityConfig.color} border-0`}>
                                {priorityConfig.label}
                              </Badge>
                              <span className="text-[9px] text-muted-foreground">
                                {typeConfig.label}
                              </span>
                            </div>
                            <h4 className="text-sm font-medium leading-tight mb-1 pr-6">
                              {rec.title}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {rec.description}
                            </p>

                            {rec.actionLabel && (
                              <Button
                                variant="link"
                                size="sm"
                                className="mt-2 h-auto p-0 text-[#0B2E58] dark:text-[#3B7DD8] text-xs font-semibold gap-1"
                                onClick={() => handleAction(rec)}
                              >
                                {rec.actionLabel}
                                <ChevronRight className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}
