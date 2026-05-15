import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocumentStatus = 'brouillon' | 'en_cours' | 'valide' | 'archive' | 'rejete'
export type DocumentClassification = 'public' | 'interne' | 'confidentiel' | 'secret'
export type DocumentCategory =
  | 'etat_civil'
  | 'justice'
  | 'identification'
  | 'urbanisme'
  | 'entreprise'
  | 'education'
  | 'sante'
  | 'residence'
  | 'administratif'
  | 'financier'

export interface GedDocument {
  id: string
  title: string
  description: string
  category: DocumentCategory
  classification: DocumentClassification
  status: DocumentStatus
  fileName: string
  fileType: string        // mime type
  fileSize: number         // bytes
  fileData?: string        // base64 encoded
  createdAt: string
  updatedAt: string
  createdBy: string        // user name
  createdByRole: string    // user role
  tags: string[]
  version: number
  parentDocumentId?: string // for document versions
  archiveDate?: string
  archiveReason?: string
}

// ─── Store State Interface ────────────────────────────────────────────────────

interface GedStoreState {
  documents: GedDocument[]
  searchQuery: string
  filterCategory: DocumentCategory | 'all'
  filterStatus: DocumentStatus | 'all'
  filterClassification: DocumentClassification | 'all'

  // Actions
  addDocument: (doc: Omit<GedDocument, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => GedDocument
  updateDocument: (id: string, updates: Partial<GedDocument>) => void
  deleteDocument: (id: string) => void
  archiveDocument: (id: string, reason: string) => void
  restoreDocument: (id: string) => void
  reclassifyDocument: (id: string, classification: DocumentClassification) => void
  addTag: (id: string, tag: string) => void
  removeTag: (id: string, tag: string) => void
  setSearchQuery: (query: string) => void
  setFilterCategory: (category: DocumentCategory | 'all') => void
  setFilterStatus: (status: DocumentStatus | 'all') => void
  setFilterClassification: (classification: DocumentClassification | 'all') => void

  // Computed/filtered
  getFilteredDocuments: () => GedDocument[]
  getDocumentById: (id: string) => GedDocument | undefined
  getDocumentsByCategory: (category: DocumentCategory) => GedDocument[]
  getDocumentsByStatus: (status: DocumentStatus) => GedDocument[]
  getStats: () => {
    total: number
    byStatus: Record<DocumentStatus, number>
    byCategory: Record<string, number>
    totalSize: number
  }

  resetToDemoData: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const now = new Date()
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString()

function generateId(): string {
  return `ged-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_DOCUMENTS: GedDocument[] = [
  {
    id: 'ged-demo-001',
    title: "Décret n°D/2026/012/PRG/SGG portant organisation du Ministère de l'Économie et des Finances",
    description: "Décret présidentiel réorganisant les structures du Ministère de l'Économie et des Finances de la République de Guinée, incluant les directions générales et les services rattachés.",
    category: 'financier',
    classification: 'public',
    status: 'valide',
    fileName: 'D-2026-012-PRG-SGG-organisation-MEF.pdf',
    fileType: 'application/pdf',
    fileSize: 2_450_000,
    createdAt: '2026-01-15T10:30:00.000Z',
    updatedAt: '2026-01-15T14:00:00.000Z',
    createdBy: 'Sékou Condé',
    createdByRole: 'admin_general',
    tags: ['décret', 'présidence', 'finances', 'réorganisation'],
    version: 1,
  },
  {
    id: 'ged-demo-002',
    title: "Arrêté n°A/2026/045/MEF/CAB fixant les modalités d'exécution du budget 2026",
    description: "Arrêté ministériel définissant les règles et procédures d'exécution du budget général de l'État pour l'exercice fiscal 2026, conformément à la loi de finances.",
    category: 'financier',
    classification: 'public',
    status: 'valide',
    fileName: 'A-2026-045-MEF-CAB-budget-2026.pdf',
    fileType: 'application/pdf',
    fileSize: 1_830_000,
    createdAt: '2026-01-20T09:00:00.000Z',
    updatedAt: '2026-01-20T16:45:00.000Z',
    createdBy: 'Mme. Fatoumata Bah',
    createdByRole: 'mairie',
    tags: ['arrêté', 'budget', 'exécution', 'fiscal'],
    version: 1,
  },
  {
    id: 'ged-demo-003',
    title: "Circulaire n°C/2026/003/PM/CAB relative à la généralisation de l'administration électronique",
    description: "Circulaire du Premier Ministre prescrivant la généralisation des démarches administratives électroniques dans toutes les administrations publiques de la République de Guinée.",
    category: 'administratif',
    classification: 'public',
    status: 'valide',
    fileName: 'C-2026-003-PM-CAB-admin-electronique.pdf',
    fileType: 'application/pdf',
    fileSize: 890_000,
    createdAt: '2026-02-01T08:15:00.000Z',
    updatedAt: '2026-02-01T12:00:00.000Z',
    createdBy: 'Amadou Oury Bah',
    createdByRole: 'super_admin',
    tags: ['circulaire', 'primature', 'numérique', 'e-administration'],
    version: 1,
  },
  {
    id: 'ged-demo-004',
    title: "Acte de naissance — Diallo Aminata, née le 15 mars 1995 à Conakry",
    description: "Extrait d'acte de naissance établi par la Mairie de Kaloum pour la citoyenne Aminata Diallo, née le 15 mars 1995 à Conakry, Commune de Kaloum.",
    category: 'etat_civil',
    classification: 'interne',
    status: 'valide',
    fileName: 'acte-naissance-diallo-aminata-1995.pdf',
    fileType: 'application/pdf',
    fileSize: 342_000,
    createdAt: '2026-02-05T11:20:00.000Z',
    updatedAt: '2026-02-05T14:30:00.000Z',
    createdBy: 'Mme. Fatoumata Bah',
    createdByRole: 'mairie',
    tags: ['acte de naissance', 'état civil', 'Kaloum'],
    version: 1,
  },
  {
    id: 'ged-demo-005',
    title: "Décret n°D/2026/015/PRG/SGG portant création de l'Agence Nationale du Numérique",
    description: "Décret présidentiel créant l'Agence Nationale du Numérique (ANN) de la République de Guinée, définissant ses missions, son organisation et ses attributions dans le cadre de la transformation numérique de l'État.",
    category: 'administratif',
    classification: 'public',
    status: 'valide',
    fileName: 'D-2026-015-PRG-SGG-agence-nationale-numerique.pdf',
    fileType: 'application/pdf',
    fileSize: 2_100_000,
    createdAt: '2026-03-05T09:45:00.000Z',
    updatedAt: '2026-03-05T15:20:00.000Z',
    createdBy: 'Sékou Condé',
    createdByRole: 'admin_general',
    tags: ['décret', 'agence numérique', 'transformation digitale'],
    version: 1,
  },
  {
    id: 'ged-demo-006',
    title: "Certificat de nationalité — Camara Ousmane",
    description: "Certificat de nationalité guinéenne délivré à Monsieur Ousmane Camara, né à Kindia le 22 juillet 1988, conformément aux dispositions du Code de la nationalité guinéenne.",
    category: 'etat_civil',
    classification: 'interne',
    status: 'valide',
    fileName: 'certificat-nationalite-camara-ousmane.pdf',
    fileType: 'application/pdf',
    fileSize: 285_000,
    createdAt: '2026-02-18T10:00:00.000Z',
    updatedAt: '2026-02-18T11:30:00.000Z',
    createdBy: 'Mme. Aissatou Sylla',
    createdByRole: 'mairie',
    tags: ['certificat', 'nationalité', 'Kindia'],
    version: 1,
  },
  {
    id: 'ged-demo-007',
    title: "Rapport annuel 2025 — Cour des Comptes",
    description: "Rapport annuel de la Cour des Comptes portant sur l'exécution des lois de finances pour l'exercice 2025, incluant les observations sur la gestion des finances publiques et les recommandations au Gouvernement.",
    category: 'financier',
    classification: 'confidentiel',
    status: 'valide',
    fileName: 'rapport-annuel-2025-cour-comptes.pdf',
    fileType: 'application/pdf',
    fileSize: 4_870_000,
    createdAt: '2026-03-01T08:00:00.000Z',
    updatedAt: '2026-03-01T17:00:00.000Z',
    createdBy: 'Dr. Alpha Diallo',
    createdByRole: 'ministere',
    tags: ['rapport', 'cour des comptes', 'finances publiques', '2025'],
    version: 1,
  },
  {
    id: 'ged-demo-008',
    title: "Permis de construire — Projet résidentiel Dixinn-Cité",
    description: "Permis de construire accordé pour la réalisation d'un ensemble résidentiel de 120 logements sociaux dans la Commune de Dixinn, Conakry, par la Direction de l'Urbanisme et de la Construction.",
    category: 'urbanisme',
    classification: 'public',
    status: 'valide',
    fileName: 'permis-construire-dixinn-cite-residentiel.pdf',
    fileType: 'application/pdf',
    fileSize: 1_560_000,
    createdAt: '2026-02-25T14:00:00.000Z',
    updatedAt: '2026-02-28T09:30:00.000Z',
    createdBy: 'M. Mamadou Soumah',
    createdByRole: 'agence',
    tags: ['permis de construire', 'urbanisme', 'Dixinn', 'logements'],
    version: 1,
  },
  {
    id: 'ged-demo-009',
    title: "Casier judiciaire n°CJ/2026/45890 — Touré Mariama",
    description: "Extrait de casier judiciaire n°CJ/2026/45890 délivré à Madame Mariama Touré, née le 10 octobre 1990 à Conakry, dans le cadre d'une demande d'emploi à la Banque Centrale de la République de Guinée.",
    category: 'justice',
    classification: 'confidentiel',
    status: 'valide',
    fileName: 'casier-judiciaire-CJ-2026-45890-toure.pdf',
    fileType: 'application/pdf',
    fileSize: 178_000,
    createdAt: '2026-03-10T11:00:00.000Z',
    updatedAt: '2026-03-10T15:45:00.000Z',
    createdBy: 'Dr. Alpha Diallo',
    createdByRole: 'ministere',
    tags: ['casier judiciaire', 'justice', 'BCRG'],
    version: 1,
  },
  {
    id: 'ged-demo-010',
    title: "Régistre de commerce RCCM n°GN-CON-2026-B-12345 — SARL Diallo & Fils Commerce",
    description: "Registre du commerce et du crédit mobilier délivré par le Tribunal de Première Instance de Conakry pour la SARL Diallo & Fils Commerce, capitale social 5 000 000 GNF, activité commerce général.",
    category: 'entreprise',
    classification: 'public',
    status: 'valide',
    fileName: 'rccm-GN-CON-2026-B-12345-diallo-fils.pdf',
    fileType: 'application/pdf',
    fileSize: 456_000,
    createdAt: '2026-01-28T09:30:00.000Z',
    updatedAt: '2026-02-02T10:00:00.000Z',
    createdBy: 'M. Ibrahima Keita',
    createdByRole: 'agence',
    tags: ['RCCM', 'entreprise', 'commerce', 'APIP'],
    version: 1,
  },
  {
    id: 'ged-demo-011',
    title: "Attestation de scolarité — Lycée 2 Octobre de Kankan",
    description: "Attestation de scolarité confirmant l'inscription de Monsieur Mamadou Keita en classe de Terminale Série D au Lycée 2 Octobre de Kankan pour l'année scolaire 2025-2026.",
    category: 'education',
    classification: 'interne',
    status: 'valide',
    fileName: 'attestation-scolarite-keita-kankan.pdf',
    fileType: 'application/pdf',
    fileSize: 210_000,
    createdAt: '2026-02-12T08:00:00.000Z',
    updatedAt: '2026-02-12T09:15:00.000Z',
    createdBy: 'M. Cheick Sylla',
    createdByRole: 'admin_general',
    tags: ['attestation', 'scolarité', 'Kankan', 'lycée'],
    version: 1,
  },
  {
    id: 'ged-demo-012',
    title: "Certificat de vaccination international — Doubé Aïssatou",
    description: "Certificat de vaccination international (Carnet jaune) délivré à Madame Aïssatou Doubé par le Centre de Santé de N'Zérékoré, incluant les vaccinations contre la fièvre jaune, l'hépatite B et la COVID-19.",
    category: 'sante',
    classification: 'interne',
    status: 'valide',
    fileName: 'certificat-vaccination-doube-nzerekore.pdf',
    fileType: 'application/pdf',
    fileSize: 320_000,
    createdAt: '2026-03-08T07:30:00.000Z',
    updatedAt: '2026-03-08T10:00:00.000Z',
    createdBy: 'Dr. Marie Condé',
    createdByRole: 'admin_general',
    tags: ['vaccination', 'carnet jaune', 'Nzérékoré', 'santé'],
    version: 1,
  },
  {
    id: 'ged-demo-013',
    title: "Certificat de résidence — Bah Fatoumata, Commune de Ratoma",
    description: "Certificat de résidence délivré par la Mairie de la Commune de Ratoma attestant que Madame Fatoumata Bah réside au quartier Hamdallaye depuis janvier 2020.",
    category: 'residence',
    classification: 'interne',
    status: 'valide',
    fileName: 'certificat-residence-bah-ratoma.pdf',
    fileType: 'application/pdf',
    fileSize: 195_000,
    createdAt: '2026-02-22T10:30:00.000Z',
    updatedAt: '2026-02-22T11:00:00.000Z',
    createdBy: 'Mme. Fatoumata Bah',
    createdByRole: 'mairie',
    tags: ['certificat', 'résidence', 'Ratoma', 'Conakry'],
    version: 1,
  },
  {
    id: 'ged-demo-014',
    title: "Ordonnance n°O/2026/003/PRG portant mesure d'urgence économique",
    description: "Ordonnance présidentielle prise en Conseil des Ministres portant mesures d'urgence économique pour la stabilisation des prix des produits de première nécessité et le soutien aux secteurs stratégiques de l'économie nationale.",
    category: 'financier',
    classification: 'secret',
    status: 'valide',
    fileName: 'O-2026-003-PRG-urgence-economique.pdf',
    fileType: 'application/pdf',
    fileSize: 3_200_000,
    createdAt: '2026-02-28T16:00:00.000Z',
    updatedAt: '2026-02-28T18:30:00.000Z',
    createdBy: 'Amadou Oury Bah',
    createdByRole: 'super_admin',
    tags: ['ordonnance', 'urgence', 'économie', 'présidence'],
    version: 1,
  },
  {
    id: 'ged-demo-015',
    title: "Note de service n°NS/2026/089/MATD/SG relative à l'organisation des élections locales",
    description: "Note de service du Ministère de l'Administration Territoriale et de la Décentralisation relative à l'organisation et au calendrier des élections locales dans les 342 communes de la République de Guinée.",
    category: 'administratif',
    classification: 'confidentiel',
    status: 'valide',
    fileName: 'NS-2026-089-MATD-SG-elections-locales.pdf',
    fileType: 'application/pdf',
    fileSize: 456_000,
    createdAt: '2026-02-10T09:00:00.000Z',
    updatedAt: '2026-02-10T14:30:00.000Z',
    createdBy: 'Sékou Condé',
    createdByRole: 'admin_general',
    tags: ['note de service', 'élections', 'MATD', 'décentralisation'],
    version: 1,
  },
]

// ─── Persist version ──────────────────────────────────────────────────────────

const GED_STORE_VERSION = 1

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGedStore = create<GedStoreState>()(
  persist(
    (set, get) => ({
      documents: DEMO_DOCUMENTS,
      searchQuery: '',
      filterCategory: 'all' as DocumentCategory | 'all',
      filterStatus: 'all' as DocumentStatus | 'all',
      filterClassification: 'all' as DocumentClassification | 'all',

      // ─── Actions ──────────────────────────────────────────────────────────

      addDocument: (doc) => {
        const nowIso = new Date().toISOString()
        const newDoc: GedDocument = {
          ...doc,
          id: generateId(),
          createdAt: nowIso,
          updatedAt: nowIso,
          version: 1,
        }
        set((state) => ({ documents: [newDoc, ...state.documents] }))
        return newDoc
      },

      updateDocument: (id, updates) => {
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === id
              ? { ...doc, ...updates, updatedAt: new Date().toISOString() }
              : doc
          ),
        }))
      },

      deleteDocument: (id) => {
        set((state) => ({
          documents: state.documents.filter((doc) => doc.id !== id),
        }))
      },

      archiveDocument: (id, reason) => {
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === id
              ? {
                  ...doc,
                  status: 'archive' as DocumentStatus,
                  archiveDate: new Date().toISOString(),
                  archiveReason: reason,
                  updatedAt: new Date().toISOString(),
                }
              : doc
          ),
        }))
      },

      restoreDocument: (id) => {
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === id
              ? {
                  ...doc,
                  status: 'valide' as DocumentStatus,
                  archiveDate: undefined,
                  archiveReason: undefined,
                  updatedAt: new Date().toISOString(),
                }
              : doc
          ),
        }))
      },

      reclassifyDocument: (id, classification) => {
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === id
              ? { ...doc, classification, updatedAt: new Date().toISOString() }
              : doc
          ),
        }))
      },

      addTag: (id, tag) => {
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === id && !doc.tags.includes(tag)
              ? { ...doc, tags: [...doc.tags, tag], updatedAt: new Date().toISOString() }
              : doc
          ),
        }))
      },

      removeTag: (id, tag) => {
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === id
              ? { ...doc, tags: doc.tags.filter((t) => t !== tag), updatedAt: new Date().toISOString() }
              : doc
          ),
        }))
      },

      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilterCategory: (category) => set({ filterCategory: category }),
      setFilterStatus: (status) => set({ filterStatus: status }),
      setFilterClassification: (classification) => set({ filterClassification: classification }),

      // ─── Computed / Getters ───────────────────────────────────────────────

      getFilteredDocuments: () => {
        const { documents, searchQuery, filterCategory, filterStatus, filterClassification } = get()
        const query = searchQuery.toLowerCase().trim()

        return documents.filter((doc) => {
          // Search filter
          if (query) {
            const haystack = `${doc.title} ${doc.description} ${doc.fileName} ${doc.createdBy} ${doc.tags.join(' ')} ${doc.category}`.toLowerCase()
            if (!haystack.includes(query)) return false
          }

          // Category filter
          if (filterCategory !== 'all' && doc.category !== filterCategory) return false

          // Status filter
          if (filterStatus !== 'all' && doc.status !== filterStatus) return false

          // Classification filter
          if (filterClassification !== 'all' && doc.classification !== filterClassification) return false

          return true
        })
      },

      getDocumentById: (id) => get().documents.find((doc) => doc.id === id),

      getDocumentsByCategory: (category) => get().documents.filter((doc) => doc.category === category),

      getDocumentsByStatus: (status) => get().documents.filter((doc) => doc.status === status),

      getStats: () => {
        const { documents } = get()
        const byStatus: Record<DocumentStatus, number> = {
          brouillon: 0,
          en_cours: 0,
          valide: 0,
          archive: 0,
          rejete: 0,
        }
        const byCategory: Record<string, number> = {}
        let totalSize = 0

        for (const doc of documents) {
          byStatus[doc.status] = (byStatus[doc.status] || 0) + 1
          byCategory[doc.category] = (byCategory[doc.category] || 0) + 1
          totalSize += doc.fileSize
        }

        return {
          total: documents.length,
          byStatus,
          byCategory,
          totalSize,
        }
      },

      resetToDemoData: () => {
        set({
          documents: DEMO_DOCUMENTS,
          searchQuery: '',
          filterCategory: 'all',
          filterStatus: 'all',
          filterClassification: 'all',
        })
      },
    }),
    {
      name: 'eadmin-ged-store',
      version: GED_STORE_VERSION,
      migrate: (persistedState: any, version: number) => {
        if (version < GED_STORE_VERSION) {
          // Reset to fresh demo data on schema changes
          return {
            documents: DEMO_DOCUMENTS,
            searchQuery: '',
            filterCategory: 'all',
            filterStatus: 'all',
            filterClassification: 'all',
          }
        }
        return persistedState
      },
    }
  )
)
