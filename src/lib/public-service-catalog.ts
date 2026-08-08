'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ElementType } from 'react'
import {
  Award,
  Baby,
  BookOpen,
  Briefcase,
  Building2,
  Car,
  Church,
  FileText,
  Globe,
  GraduationCap,
  Heart,
  Home,
  IdCard,
  MapPin,
  Scale,
  Shield,
  Stamp,
  Stethoscope,
} from 'lucide-react'

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '')

export interface PublicServiceCatalogItem {
  id: string
  serviceId: string
  version: number
  categoryId: string
  categoryName: string
  name: string
  description: string
  feeLabel: string
  expectedProcessingLabel: string
  slaBusinessDays: number
  requiredDocuments: string[]
  routingTerms: string[]
  policyStatus: 'operational_default' | 'approved' | string
  sourceReference?: string | null
  sourceUrl?: string | null
  effectiveFrom?: string | null
  effectiveTo?: string | null
  isActive: boolean
}

export interface ServiceItem {
  id: string
  name: string
  description: string
  icon: ElementType
  price: string
  delay: string
  requiredDocs: string[]
  catalogVersion: number
  policyStatus: string
  sourceReference?: string | null
  sourceUrl?: string | null
  slaBusinessDays: number
}

export interface ServiceCategory {
  id: string
  name: string
  color: string
  bgColor: string
  iconBgColor: string
  textColor: string
  borderColor: string
  services: ServiceItem[]
}

interface CategoryPresentation {
  color: string
  bgColor: string
  iconBgColor: string
  textColor: string
  borderColor: string
  defaultIcon: ElementType
}

const DEFAULT_PRESENTATION: CategoryPresentation = {
  color: 'bg-slate-600',
  bgColor: 'bg-slate-50 dark:bg-slate-900/20',
  iconBgColor: 'bg-slate-100 dark:bg-slate-900/40',
  textColor: 'text-slate-600 dark:text-slate-400',
  borderColor: 'border-slate-200 dark:border-slate-800/40',
  defaultIcon: FileText,
}

const CATEGORY_PRESENTATION: Record<string, CategoryPresentation> = {
  'etat-civil': {
    color: 'bg-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    iconBgColor: 'bg-blue-100 dark:bg-blue-900/40', textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800/40', defaultIcon: Baby,
  },
  justice: {
    color: 'bg-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    iconBgColor: 'bg-purple-100 dark:bg-purple-900/40', textColor: 'text-purple-600 dark:text-purple-400',
    borderColor: 'border-purple-200 dark:border-purple-800/40', defaultIcon: Scale,
  },
  identification: {
    color: 'bg-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20',
    iconBgColor: 'bg-green-100 dark:bg-green-900/40', textColor: 'text-green-600 dark:text-green-400',
    borderColor: 'border-green-200 dark:border-green-800/40', defaultIcon: IdCard,
  },
  urbanisme: {
    color: 'bg-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    iconBgColor: 'bg-orange-100 dark:bg-orange-900/40', textColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-200 dark:border-orange-800/40', defaultIcon: Building2,
  },
  entreprise: {
    color: 'bg-teal-600', bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    iconBgColor: 'bg-teal-100 dark:bg-teal-900/40', textColor: 'text-teal-600 dark:text-teal-400',
    borderColor: 'border-teal-200 dark:border-teal-800/40', defaultIcon: Briefcase,
  },
  education: {
    color: 'bg-indigo-600', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    iconBgColor: 'bg-indigo-100 dark:bg-indigo-900/40', textColor: 'text-indigo-600 dark:text-indigo-400',
    borderColor: 'border-indigo-200 dark:border-indigo-800/40', defaultIcon: GraduationCap,
  },
  sante: {
    color: 'bg-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20',
    iconBgColor: 'bg-red-100 dark:bg-red-900/40', textColor: 'text-red-600 dark:text-red-400',
    borderColor: 'border-red-200 dark:border-red-800/40', defaultIcon: Stethoscope,
  },
  residence: {
    color: 'bg-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    iconBgColor: 'bg-amber-100 dark:bg-amber-900/40', textColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800/40', defaultIcon: Home,
  },
}

const SERVICE_ICONS: Record<string, ElementType> = {
  'ec-1': Baby,
  'ec-2': Heart,
  'ec-3': Church,
  'ec-4': Shield,
  'ec-5': Baby,
  'j-1': Scale,
  'j-2': FileText,
  'j-3': Stamp,
  'id-1': IdCard,
  'id-2': Globe,
  'id-3': Car,
  'u-1': Building2,
  'e-1': Briefcase,
  'e-2': BookOpen,
  'ed-1': GraduationCap,
  'ed-2': Award,
  's-1': Stethoscope,
  's-2': Heart,
  'r-1': Home,
  'r-2': MapPin,
}

async function publicCatalogFetch(signal?: AbortSignal): Promise<PublicServiceCatalogItem[]> {
  const response = await fetch(`${API_URL}/api/v1/public/service-catalog`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    signal,
  })

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    // Use the generic message below.
  }

  if (!response.ok) {
    const detail = payload && typeof payload === 'object' && 'detail' in payload
      ? (payload as { detail?: unknown }).detail
      : null
    throw new Error(
      typeof detail === 'string'
        ? detail
        : 'Le catalogue officiel des démarches est momentanément indisponible.',
    )
  }

  const items = payload && typeof payload === 'object' && 'items' in payload
    ? (payload as { items?: unknown }).items
    : null
  if (!Array.isArray(items)) {
    throw new Error('Le catalogue officiel a retourné un format invalide.')
  }
  return items as PublicServiceCatalogItem[]
}

export function buildServiceCategories(items: PublicServiceCatalogItem[]): ServiceCategory[] {
  const categories = new Map<string, ServiceCategory>()

  for (const item of items) {
    if (!item.isActive) continue
    const presentation = CATEGORY_PRESENTATION[item.categoryId] || DEFAULT_PRESENTATION
    let category = categories.get(item.categoryId)
    if (!category) {
      category = {
        id: item.categoryId,
        name: item.categoryName,
        color: presentation.color,
        bgColor: presentation.bgColor,
        iconBgColor: presentation.iconBgColor,
        textColor: presentation.textColor,
        borderColor: presentation.borderColor,
        services: [],
      }
      categories.set(item.categoryId, category)
    }

    category.services.push({
      id: item.serviceId,
      name: item.name,
      description: item.description,
      icon: SERVICE_ICONS[item.serviceId] || presentation.defaultIcon,
      price: item.feeLabel,
      delay: item.expectedProcessingLabel || `${item.slaBusinessDays} jours ouvrés`,
      requiredDocs: [...(item.requiredDocuments || [])],
      catalogVersion: item.version,
      policyStatus: item.policyStatus,
      sourceReference: item.sourceReference,
      sourceUrl: item.sourceUrl,
      slaBusinessDays: item.slaBusinessDays,
    })
  }

  return [...categories.values()]
    .map((category) => ({
      ...category,
      services: [...category.services].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

export function usePublicServiceCatalog() {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  const reload = useCallback(() => setReloadToken((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setError('')

    void publicCatalogFetch(controller.signal)
      .then((items) => {
        const next = buildServiceCategories(items)
        if (!next.length) {
          throw new Error('Aucune démarche administrative active n’est publiée pour ce portail.')
        }
        setCategories(next)
      })
      .catch((reason) => {
        if (controller.signal.aborted) return
        setCategories([])
        setError(
          reason instanceof Error
            ? reason.message
            : 'Le catalogue officiel des démarches est momentanément indisponible.',
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [reloadToken])

  return { categories, isLoading, error, reload }
}
