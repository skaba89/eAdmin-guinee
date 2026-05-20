// ═══════════════════════════════════════════════════════════════════════════════
// eAdmin Guinée — Service Habilitations Store
// Manages which services each agent/organism can access based on habilitations
// ═══════════════════════════════════════════════════════════════════════════════

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type HabilitationLevel = 'lecture' | 'traitement' | 'validation' | 'supervision' | 'administration'

export interface ServiceHabilitation {
  id: string
  serviceId: string         // e.g., 'ec-1', 'id-1', 'j-1'
  serviceName: string       // e.g., "Extrait d'acte de naissance"
  institutionKey: string    // e.g., 'mairie_kaloum', 'anip', 'ministere_justice'
  institutionName: string   // e.g., 'Mairie de Kaloum'
  level: HabilitationLevel
  grantedBy: string         // Who granted the habilitation
  grantedAt: string         // When it was granted
  expiresAt?: string        // Optional expiration date
  isActive: boolean
  conditions?: string       // Special conditions or restrictions
}

export interface AgentHabilitation {
  id: string
  agentEmail: string        // Agent's email
  agentName: string         // Agent's name
  serviceId: string         // Service the agent is habilitated for
  serviceName: string       // Service name
  level: HabilitationLevel  // Level of access
  institutionKey: string    // Institution key
  institutionName: string   // Institution name
  grantedBy: string
  grantedAt: string
  expiresAt?: string
  isActive: boolean
  conditions?: string
}

interface ServiceHabilitationsState {
  institutionHabilitations: ServiceHabilitation[]
  agentHabilitations: AgentHabilitation[]

  // Institution habilitation management
  addInstitutionHabilitation: (hab: Omit<ServiceHabilitation, 'id' | 'grantedAt'>) => ServiceHabilitation
  removeInstitutionHabilitation: (id: string) => void
  toggleInstitutionHabilitation: (id: string) => void
  getInstitutionHabilitations: (institutionKey: string) => ServiceHabilitation[]
  getInstitutionServices: (institutionKey: string) => string[]
  canInstitutionAccessService: (institutionKey: string, serviceId: string) => boolean
  getInstitutionLevelForService: (institutionKey: string, serviceId: string) => HabilitationLevel | null

  // Agent habilitation management
  addAgentHabilitation: (hab: Omit<AgentHabilitation, 'id' | 'grantedAt'>) => AgentHabilitation
  removeAgentHabilitation: (id: string) => void
  toggleAgentHabilitation: (id: string) => void
  getAgentHabilitations: (agentEmail: string) => AgentHabilitation[]
  getAgentServices: (agentEmail: string) => string[]
  canAgentAccessService: (agentEmail: string, serviceId: string) => boolean
  getAgentLevelForService: (agentEmail: string, serviceId: string) => HabilitationLevel | null

  // Bulk operations
  grantAllServicesToInstitution: (institutionKey: string, institutionName: string, level: HabilitationLevel, grantedBy: string) => void
  resetToDefaults: () => void
}

// ─── INSTITUTION KEY CONSTANTS ─────────────────────────────────────────────────
export const INSTITUTION_KEYS = {
  MAIRIE_KALOUM: 'mairie_kaloum',
  MAIRIE_DIXINN: 'mairie_dixinn',
  MAIRIE_MATAM: 'mairie_matam',
  MAIRIE_RATOMA: 'mairie_ratoma',
  MAIRIE_MATOTO: 'mairie_matoto',
  ANIP: 'anip',
  MINISTERE_JUSTICE: 'ministere_justice',
  DIRECTION_URBANISME: 'direction_urbanisme',
  APIP: 'apip',
  MINISTERE_EDUCATION: 'ministere_education',
  MINISTERE_SANTE: 'ministere_sante',
  DGI: 'dgi',
  CNSS: 'cnss',
  MATD: 'matd',
  DGMA: 'dgma',
  PRESIDENCE: 'presidence',
} as const

export type InstitutionKey = typeof INSTITUTION_KEYS[keyof typeof INSTITUTION_KEYS]

// ─── INSTITUTION DISPLAY NAMES ─────────────────────────────────────────────────
export const INSTITUTION_DISPLAY_NAMES: Record<string, string> = {
  [INSTITUTION_KEYS.MAIRIE_KALOUM]: 'Mairie de Kaloum',
  [INSTITUTION_KEYS.MAIRIE_DIXINN]: 'Mairie de Dixinn',
  [INSTITUTION_KEYS.MAIRIE_MATAM]: 'Mairie de Matam',
  [INSTITUTION_KEYS.MAIRIE_RATOMA]: 'Mairie de Ratoma',
  [INSTITUTION_KEYS.MAIRIE_MATOTO]: 'Mairie de Matoto',
  [INSTITUTION_KEYS.ANIP]: "Agence Nationale d'Identification (ANIP)",
  [INSTITUTION_KEYS.MINISTERE_JUSTICE]: 'Ministère de la Justice',
  [INSTITUTION_KEYS.DIRECTION_URBANISME]: "Direction de l'Urbanisme",
  [INSTITUTION_KEYS.APIP]: 'APIP — Agence de Promotion des Investissements Privés',
  [INSTITUTION_KEYS.MINISTERE_EDUCATION]: "Ministère de l'Éducation Nationale",
  [INSTITUTION_KEYS.MINISTERE_SANTE]: 'Ministère de la Santé',
  [INSTITUTION_KEYS.DGI]: 'Direction Générale des Impôts',
  [INSTITUTION_KEYS.CNSS]: 'Caisse Nationale de Sécurité Sociale',
  [INSTITUTION_KEYS.MATD]: "Ministère de l'Administration Territoriale et de la Décentralisation",
  [INSTITUTION_KEYS.DGMA]: 'Direction Générale de la Modernisation Administrative',
  [INSTITUTION_KEYS.PRESIDENCE]: 'Présidence de la République — Service e-Gouvernement',
}

// ─── SERVICE IDs BY CATEGORY ──────────────────────────────────────────────────
export const SERVICES_BY_CATEGORY: Record<string, { id: string; name: string }[]> = {
  'etat-civil': [
    { id: 'ec-1', name: "Extrait d'acte de naissance" },
    { id: 'ec-2', name: "Extrait d'acte de mariage" },
    { id: 'ec-3', name: "Extrait d'acte de décès" },
    { id: 'ec-4', name: 'Certificat de nationalité' },
    { id: 'ec-5', name: 'Déclaration de naissance' },
    { id: 'ec-6', name: 'Changement de nom' },
  ],
  'justice': [
    { id: 'j-1', name: 'Casier judiciaire' },
    { id: 'j-2', name: 'Certificat de non-poursuite' },
    { id: 'j-3', name: 'Légalisation de documents' },
  ],
  'identification': [
    { id: 'id-1', name: "Carte d'identité nationale biométrique" },
    { id: 'id-2', name: 'Passeport biométrique' },
    { id: 'id-3', name: 'Permis de conduire' },
  ],
  'urbanisme': [
    { id: 'u-1', name: 'Permis de construire' },
    { id: 'u-2', name: 'Certificat de conformité' },
    { id: 'u-3', name: 'Titre foncier' },
  ],
  'entreprise': [
    { id: 'e-1', name: 'Enregistrement entreprise (APIP)' },
    { id: 'e-2', name: 'Registre de commerce' },
  ],
  'education': [
    { id: 'ed-1', name: 'Attestation de scolarité' },
    { id: 'ed-2', name: 'Diplôme et relevé de notes' },
    { id: 'ed-3', name: 'Équivalence de diplôme' },
  ],
  'sante': [
    { id: 's-1', name: 'Certificat de vaccination' },
    { id: 's-2', name: 'Carte sanitaire' },
  ],
  'residence': [
    { id: 'r-1', name: 'Certificat de résidence' },
    { id: 'r-2', name: 'Attestation de domicile' },
  ],
  'fiscalite': [
    { id: 'fi-1', name: 'Certificat de situation fiscale' },
    { id: 'fi-2', name: "Déclaration d'impôts" },
  ],
  'social': [
    { id: 'so-1', name: "Carte d'assurance maladie" },
    { id: 'so-2', name: 'Allocations familiales' },
  ],
}

// ─── ALL SERVICES FLAT LIST ────────────────────────────────────────────────────
export const ALL_SERVICES: { id: string; name: string; categoryId: string }[] = Object.entries(SERVICES_BY_CATEGORY).flatMap(
  ([categoryId, services]) => services.map(s => ({ ...s, categoryId }))
)

// ─── DEFAULT INSTITUTION → SERVICE MAPPING ────────────────────────────────────
const DEFAULT_INSTITUTION_HABILITATIONS: Record<string, { categoryIds: string[]; level: HabilitationLevel }> = {
  [INSTITUTION_KEYS.MAIRIE_KALOUM]: { categoryIds: ['etat-civil', 'residence'], level: 'validation' },
  [INSTITUTION_KEYS.MAIRIE_DIXINN]: { categoryIds: ['etat-civil', 'residence'], level: 'validation' },
  [INSTITUTION_KEYS.MAIRIE_MATAM]: { categoryIds: ['etat-civil', 'residence'], level: 'validation' },
  [INSTITUTION_KEYS.MAIRIE_RATOMA]: { categoryIds: ['etat-civil', 'residence'], level: 'validation' },
  [INSTITUTION_KEYS.MAIRIE_MATOTO]: { categoryIds: ['etat-civil', 'residence'], level: 'validation' },
  [INSTITUTION_KEYS.ANIP]: { categoryIds: ['identification'], level: 'validation' },
  [INSTITUTION_KEYS.MINISTERE_JUSTICE]: { categoryIds: ['justice'], level: 'validation' },
  [INSTITUTION_KEYS.DIRECTION_URBANISME]: { categoryIds: ['urbanisme'], level: 'validation' },
  [INSTITUTION_KEYS.APIP]: { categoryIds: ['entreprise'], level: 'validation' },
  [INSTITUTION_KEYS.MINISTERE_EDUCATION]: { categoryIds: ['education'], level: 'validation' },
  [INSTITUTION_KEYS.MINISTERE_SANTE]: { categoryIds: ['sante'], level: 'validation' },
  [INSTITUTION_KEYS.DGI]: { categoryIds: ['fiscalite'], level: 'validation' },
  [INSTITUTION_KEYS.CNSS]: { categoryIds: ['social'], level: 'validation' },
  [INSTITUTION_KEYS.MATD]: { categoryIds: ['etat-civil', 'justice', 'identification', 'urbanisme', 'entreprise', 'education', 'sante', 'residence', 'fiscalite', 'social'], level: 'supervision' },
  [INSTITUTION_KEYS.DGMA]: { categoryIds: ['etat-civil', 'justice', 'identification', 'urbanisme', 'entreprise', 'education', 'sante', 'residence', 'fiscalite', 'social'], level: 'supervision' },
  [INSTITUTION_KEYS.PRESIDENCE]: { categoryIds: ['etat-civil', 'justice', 'identification', 'urbanisme', 'entreprise', 'education', 'sante', 'residence', 'fiscalite', 'social'], level: 'administration' },
}

// ─── INSTITUTION KEY MAPPING FROM USER INSTITUTION NAME ───────────────────────
export function getInstitutionKeyFromName(institutionName: string): string {
  const nameLower = institutionName.toLowerCase()

  if (nameLower.includes('mairie') && nameLower.includes('kaloum')) return INSTITUTION_KEYS.MAIRIE_KALOUM
  if (nameLower.includes('mairie') && nameLower.includes('dixinn')) return INSTITUTION_KEYS.MAIRIE_DIXINN
  if (nameLower.includes('mairie') && nameLower.includes('matam')) return INSTITUTION_KEYS.MAIRIE_MATAM
  if (nameLower.includes('mairie') && nameLower.includes('ratoma')) return INSTITUTION_KEYS.MAIRIE_RATOMA
  if (nameLower.includes('mairie') && nameLower.includes('matoto')) return INSTITUTION_KEYS.MAIRIE_MATOTO
  if (nameLower.includes('anip') || nameLower.includes('identification')) return INSTITUTION_KEYS.ANIP
  if (nameLower.includes('justice')) return INSTITUTION_KEYS.MINISTERE_JUSTICE
  if (nameLower.includes('urbanisme')) return INSTITUTION_KEYS.DIRECTION_URBANISME
  if (nameLower.includes('apip') || nameLower.includes('investissement')) return INSTITUTION_KEYS.APIP
  if (nameLower.includes('éducation') || nameLower.includes('education')) return INSTITUTION_KEYS.MINISTERE_EDUCATION
  if (nameLower.includes('santé') || nameLower.includes('sante')) return INSTITUTION_KEYS.MINISTERE_SANTE
  if (nameLower.includes('impôt') || nameLower.includes('impot') || nameLower.includes('dgi')) return INSTITUTION_KEYS.DGI
  if (nameLower.includes('sécurité sociale') || nameLower.includes('securite sociale') || nameLower.includes('cnss')) return INSTITUTION_KEYS.CNSS
  if (nameLower.includes('territoriale') || nameLower.includes('décentralisation') || nameLower.includes('decentralisation')) return INSTITUTION_KEYS.MATD
  if (nameLower.includes('modernisation') || nameLower.includes('dgma')) return INSTITUTION_KEYS.DGMA
  if (nameLower.includes('présidence') || nameLower.includes('presidence')) return INSTITUTION_KEYS.PRESIDENCE
  // Default: mairie for any mairie
  if (nameLower.includes('mairie')) return INSTITUTION_KEYS.MAIRIE_KALOUM

  return INSTITUTION_KEYS.MAIRIE_KALOUM
}

// ─── GENERATE SEED DATA ───────────────────────────────────────────────────────
function generateSeedInstitutionHabilitations(): ServiceHabilitation[] {
  const habs: ServiceHabilitation[] = []
  let counter = 0

  for (const [institutionKey, config] of Object.entries(DEFAULT_INSTITUTION_HABILITATIONS)) {
    const institutionName = INSTITUTION_DISPLAY_NAMES[institutionKey] || institutionKey

    for (const categoryId of config.categoryIds) {
      const services = SERVICES_BY_CATEGORY[categoryId] || []
      for (const service of services) {
        habs.push({
          id: `ih-${++counter}`,
          serviceId: service.id,
          serviceName: service.name,
          institutionKey,
          institutionName,
          level: config.level,
          grantedBy: 'Système (configuration par défaut)',
          grantedAt: new Date().toISOString(),
          isActive: true,
        })
      }
    }
  }

  return habs
}

function generateSeedAgentHabilitations(): AgentHabilitation[] {
  const habs: AgentHabilitation[] = []

  // Main demo accounts
  const agentConfigs: Array<{ email: string; name: string; institutionKey: string; level: HabilitationLevel }> = [
    { email: 'mairie@eadmin.gn', name: 'Fatoumata Bah', institutionKey: INSTITUTION_KEYS.MAIRIE_KALOUM, level: 'validation' },
    { email: 'agence@eadmin.gn', name: 'Mamadou Soumah', institutionKey: INSTITUTION_KEYS.ANIP, level: 'validation' },
    { email: 'admin@eadmin.gn', name: 'Alpha Diallo', institutionKey: INSTITUTION_KEYS.DGMA, level: 'administration' },
    { email: 'ministere@eadmin.gn', name: 'Aissatou Sylla', institutionKey: INSTITUTION_KEYS.MATD, level: 'supervision' },
    { email: 'superadmin@eadmin.gn', name: 'Ibrahima Touré', institutionKey: INSTITUTION_KEYS.PRESIDENCE, level: 'administration' },
  ]

  let counter = 0

  for (const agent of agentConfigs) {
    const institutionName = INSTITUTION_DISPLAY_NAMES[agent.institutionKey] || agent.institutionKey
    const config = DEFAULT_INSTITUTION_HABILITATIONS[agent.institutionKey]
    if (!config) continue

    for (const categoryId of config.categoryIds) {
      const services = SERVICES_BY_CATEGORY[categoryId] || []
      for (const service of services) {
        habs.push({
          id: `ah-${++counter}`,
          agentEmail: agent.email,
          agentName: agent.name,
          serviceId: service.id,
          serviceName: service.name,
          level: agent.level,
          institutionKey: agent.institutionKey,
          institutionName,
          grantedBy: 'Système (configuration par défaut)',
          grantedAt: new Date().toISOString(),
          isActive: true,
        })
      }
    }
  }

  return habs
}

export const useServiceHabilitationsStore = create<ServiceHabilitationsState>()(
  persist(
    (set, get) => ({
      institutionHabilitations: generateSeedInstitutionHabilitations(),
      agentHabilitations: generateSeedAgentHabilitations(),

      // ─── Institution Habilitation Management ──────────────────────────────────

      addInstitutionHabilitation: (hab) => {
        const newHab: ServiceHabilitation = {
          ...hab,
          id: `ih-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          grantedAt: new Date().toISOString(),
        }
        set((state) => ({
          institutionHabilitations: [...state.institutionHabilitations, newHab],
        }))
        return newHab
      },

      removeInstitutionHabilitation: (id) => {
        set((state) => ({
          institutionHabilitations: state.institutionHabilitations.filter(h => h.id !== id),
        }))
      },

      toggleInstitutionHabilitation: (id) => {
        set((state) => ({
          institutionHabilitations: state.institutionHabilitations.map(h =>
            h.id === id ? { ...h, isActive: !h.isActive } : h
          ),
        }))
      },

      getInstitutionHabilitations: (institutionKey) => {
        return get().institutionHabilitations.filter(
          h => h.institutionKey === institutionKey && h.isActive
        )
      },

      getInstitutionServices: (institutionKey) => {
        return get().institutionHabilitations
          .filter(h => h.institutionKey === institutionKey && h.isActive)
          .map(h => h.serviceId)
      },

      canInstitutionAccessService: (institutionKey, serviceId) => {
        return get().institutionHabilitations.some(
          h => h.institutionKey === institutionKey && h.serviceId === serviceId && h.isActive
        )
      },

      getInstitutionLevelForService: (institutionKey, serviceId) => {
        const hab = get().institutionHabilitations.find(
          h => h.institutionKey === institutionKey && h.serviceId === serviceId && h.isActive
        )
        return hab?.level || null
      },

      // ─── Agent Habilitation Management ────────────────────────────────────────

      addAgentHabilitation: (hab) => {
        const newHab: AgentHabilitation = {
          ...hab,
          id: `ah-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          grantedAt: new Date().toISOString(),
        }
        set((state) => ({
          agentHabilitations: [...state.agentHabilitations, newHab],
        }))
        return newHab
      },

      removeAgentHabilitation: (id) => {
        set((state) => ({
          agentHabilitations: state.agentHabilitations.filter(h => h.id !== id),
        }))
      },

      toggleAgentHabilitation: (id) => {
        set((state) => ({
          agentHabilitations: state.agentHabilitations.map(h =>
            h.id === id ? { ...h, isActive: !h.isActive } : h
          ),
        }))
      },

      getAgentHabilitations: (agentEmail) => {
        return get().agentHabilitations.filter(
          h => h.agentEmail === agentEmail && h.isActive
        )
      },

      getAgentServices: (agentEmail) => {
        return get().agentHabilitations
          .filter(h => h.agentEmail === agentEmail && h.isActive)
          .map(h => h.serviceId)
      },

      canAgentAccessService: (agentEmail, serviceId) => {
        return get().agentHabilitations.some(
          h => h.agentEmail === agentEmail && h.serviceId === serviceId && h.isActive
        )
      },

      getAgentLevelForService: (agentEmail, serviceId) => {
        const hab = get().agentHabilitations.find(
          h => h.agentEmail === agentEmail && h.serviceId === serviceId && h.isActive
        )
        return hab?.level || null
      },

      // ─── Bulk Operations ──────────────────────────────────────────────────────

      grantAllServicesToInstitution: (institutionKey, institutionName, level, grantedBy) => {
        const existingServiceIds = new Set(
          get().institutionHabilitations
            .filter(h => h.institutionKey === institutionKey)
            .map(h => h.serviceId)
        )

        const newHabs: ServiceHabilitation[] = []
        let counter = get().institutionHabilitations.length

        for (const services of Object.values(SERVICES_BY_CATEGORY)) {
          for (const service of services) {
            if (!existingServiceIds.has(service.id)) {
              newHabs.push({
                id: `ih-${++counter}-${Date.now()}`,
                serviceId: service.id,
                serviceName: service.name,
                institutionKey,
                institutionName,
                level,
                grantedBy,
                grantedAt: new Date().toISOString(),
                isActive: true,
              })
            }
          }
        }

        set((state) => ({
          institutionHabilitations: [...state.institutionHabilitations, ...newHabs],
        }))
      },

      resetToDefaults: () => {
        set({
          institutionHabilitations: generateSeedInstitutionHabilitations(),
          agentHabilitations: generateSeedAgentHabilitations(),
        })
      },
    }),
    {
      name: 'eadmin-service-habilitations',
      version: 1,
    }
  )
)
