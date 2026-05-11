import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface BirthRecord {
  id: string
  acteNumber: string // Format: "AN/COMMUNE/YEAR/NUMBER"
  firstName: string
  lastName: string
  birthDate: string
  birthPlace: string
  gender: 'M' | 'F'
  fatherName: string
  fatherBirthDate: string
  fatherNationality: string
  motherName: string
  motherMaidenName: string
  motherBirthDate: string
  motherNationality: string
  commune: string // Mairie/Commune
  prefecture: string
  region: string
  registrationDate: string
  registeredBy: string // Agent name
  status: 'active' | 'cancelled' | 'corrected'
  notes?: string
}

// ─── SEED DATA — 25 realistic Guinean birth records ──────────────────────────
const SEED_RECORDS: BirthRecord[] = [
  {
    id: 'bc-001',
    acteNumber: 'AN/KAL/1995/0001',
    firstName: 'Aminata',
    lastName: 'Diallo',
    birthDate: '1995-03-15',
    birthPlace: 'Conakry',
    gender: 'F',
    fatherName: 'Mamadou Diallo',
    fatherBirthDate: '1965-08-20',
    fatherNationality: 'Guinéenne',
    motherName: 'Fatoumata Bah',
    motherMaidenName: 'Bah',
    motherBirthDate: '1970-01-10',
    motherNationality: 'Guinéenne',
    commune: 'Kaloum',
    prefecture: 'Conakry',
    region: 'Conakry',
    registrationDate: '1995-04-02',
    registeredBy: 'Mme Kadiatou Sow',
    status: 'active',
  },
  {
    id: 'bc-002',
    acteNumber: 'AN/KAN/1992/0045',
    firstName: 'Ibrahim',
    lastName: 'Condé',
    birthDate: '1992-07-22',
    birthPlace: 'Kankan',
    gender: 'M',
    fatherName: 'Sékou Condé',
    fatherBirthDate: '1960-05-12',
    fatherNationality: 'Guinéenne',
    motherName: 'Aissatou Camara',
    motherMaidenName: 'Camara',
    motherBirthDate: '1968-11-30',
    motherNationality: 'Guinéenne',
    commune: 'Kankan',
    prefecture: 'Kankan',
    region: 'Kankan',
    registrationDate: '1992-08-05',
    registeredBy: 'M. Lamine Touré',
    status: 'active',
  },
  {
    id: 'bc-003',
    acteNumber: 'AN/MAT/1998/0023',
    firstName: 'Fatoumata',
    lastName: 'Bah',
    birthDate: '1998-01-08',
    birthPlace: 'Conakry',
    gender: 'F',
    fatherName: 'Alpha Bah',
    fatherBirthDate: '1972-06-14',
    fatherNationality: 'Guinéenne',
    motherName: 'Mariama Touré',
    motherMaidenName: 'Touré',
    motherBirthDate: '1975-09-22',
    motherNationality: 'Guinéenne',
    commune: 'Matam',
    prefecture: 'Conakry',
    region: 'Conakry',
    registrationDate: '1998-02-15',
    registeredBy: 'Mme Aïssatou Doubé',
    status: 'active',
  },
  {
    id: 'bc-004',
    acteNumber: 'AN/KIN/1990/0078',
    firstName: 'Ousmane',
    lastName: 'Camara',
    birthDate: '1990-11-30',
    birthPlace: 'Kindia',
    gender: 'M',
    fatherName: 'Moussa Camara',
    fatherBirthDate: '1958-03-05',
    fatherNationality: 'Guinéenne',
    motherName: 'Kadiatou Sow',
    motherMaidenName: 'Sow',
    motherBirthDate: '1963-12-18',
    motherNationality: 'Guinéenne',
    commune: 'Kindia',
    prefecture: 'Kindia',
    region: 'Kindia',
    registrationDate: '1990-12-20',
    registeredBy: 'M. Abdoulaye Diallo',
    status: 'active',
  },
  {
    id: 'bc-005',
    acteNumber: 'AN/NZR/1993/0012',
    firstName: 'Mariama',
    lastName: 'Touré',
    birthDate: '1993-06-14',
    birthPlace: 'Nzérékoré',
    gender: 'F',
    fatherName: 'Lamine Touré',
    fatherBirthDate: '1962-02-28',
    fatherNationality: 'Guinéenne',
    motherName: 'Aïssatou Doubé',
    motherMaidenName: 'Doubé',
    motherBirthDate: '1966-07-16',
    motherNationality: 'Guinéenne',
    commune: 'Nzérékoré',
    prefecture: 'Nzérékoré',
    region: 'Nzérékoré',
    registrationDate: '1993-07-01',
    registeredBy: 'Mme Mariama Condé',
    status: 'active',
  },
  {
    id: 'bc-006',
    acteNumber: 'AN/RAT/1997/0034',
    firstName: 'Abdoulaye',
    lastName: 'Sow',
    birthDate: '1997-09-05',
    birthPlace: 'Conakry',
    gender: 'M',
    fatherName: 'Mamadou Sow',
    fatherBirthDate: '1968-04-12',
    fatherNationality: 'Guinéenne',
    motherName: 'Aminata Keita',
    motherMaidenName: 'Keita',
    motherBirthDate: '1972-08-25',
    motherNationality: 'Guinéenne',
    commune: 'Ratoma',
    prefecture: 'Conakry',
    region: 'Conakry',
    registrationDate: '1997-09-28',
    registeredBy: 'M. Ibrahima Bah',
    status: 'active',
  },
  {
    id: 'bc-007',
    acteNumber: 'AN/DIX/1994/0056',
    firstName: 'Kadiatou',
    lastName: 'Keita',
    birthDate: '1994-12-20',
    birthPlace: 'Conakry',
    gender: 'F',
    fatherName: 'Sékou Keita',
    fatherBirthDate: '1964-10-08',
    fatherNationality: 'Guinéenne',
    motherName: 'Fatoumata Diallo',
    motherMaidenName: 'Diallo',
    motherBirthDate: '1969-06-03',
    motherNationality: 'Guinéenne',
    commune: 'Dixinn',
    prefecture: 'Conakry',
    region: 'Conakry',
    registrationDate: '1995-01-10',
    registeredBy: 'Mme Aissatou Camara',
    status: 'active',
  },
  {
    id: 'bc-008',
    acteNumber: 'AN/LAB/1991/0029',
    firstName: 'Mamadou',
    lastName: 'Bah',
    birthDate: '1991-04-18',
    birthPlace: 'Labé',
    gender: 'M',
    fatherName: 'Alpha Bah',
    fatherBirthDate: '1961-07-22',
    fatherNationality: 'Guinéenne',
    motherName: 'Hadja Aminata Diallo',
    motherMaidenName: 'Diallo',
    motherBirthDate: '1965-11-14',
    motherNationality: 'Guinéenne',
    commune: 'Labé',
    prefecture: 'Labé',
    region: 'Labé',
    registrationDate: '1991-05-02',
    registeredBy: 'M. Thierno Sow',
    status: 'active',
  },
  {
    id: 'bc-009',
    acteNumber: 'AN/KAL/1996/0089',
    firstName: 'Aissatou',
    lastName: 'Camara',
    birthDate: '1996-02-10',
    birthPlace: 'Conakry',
    gender: 'F',
    fatherName: 'Lamine Camara',
    fatherBirthDate: '1967-09-30',
    fatherNationality: 'Guinéenne',
    motherName: 'Mariama Soumah',
    motherMaidenName: 'Soumah',
    motherBirthDate: '1971-03-15',
    motherNationality: 'Guinéenne',
    commune: 'Kaloum',
    prefecture: 'Conakry',
    region: 'Conakry',
    registrationDate: '1996-02-28',
    registeredBy: 'Mme Fatoumata Bah',
    status: 'active',
  },
  {
    id: 'bc-010',
    acteNumber: 'AN/MAM/1989/0067',
    firstName: 'Sékou',
    lastName: 'Condé',
    birthDate: '1989-08-03',
    birthPlace: 'Mamou',
    gender: 'M',
    fatherName: 'Ibrahima Condé',
    fatherBirthDate: '1955-12-25',
    fatherNationality: 'Guinéenne',
    motherName: 'Kadiatou Touré',
    motherMaidenName: 'Touré',
    motherBirthDate: '1960-04-17',
    motherNationality: 'Guinéenne',
    commune: 'Mamou',
    prefecture: 'Mamou',
    region: 'Mamou',
    registrationDate: '1989-08-20',
    registeredBy: 'M. Mamadou Diallo',
    status: 'corrected',
    notes: 'Correction du nom du père le 12/01/2020',
  },
  {
    id: 'bc-011',
    acteNumber: 'AN/BOK/1999/0015',
    firstName: 'Hawa',
    lastName: 'Soumah',
    birthDate: '1999-05-25',
    birthPlace: 'Boké',
    gender: 'F',
    fatherName: 'Mamadou Soumah',
    fatherBirthDate: '1970-01-08',
    fatherNationality: 'Guinéenne',
    motherName: 'Aissatou Bah',
    motherMaidenName: 'Bah',
    motherBirthDate: '1974-09-12',
    motherNationality: 'Guinéenne',
    commune: 'Boké',
    prefecture: 'Boké',
    region: 'Boké',
    registrationDate: '1999-06-10',
    registeredBy: 'Mme Kadiatou Keita',
    status: 'active',
  },
  {
    id: 'bc-012',
    acteNumber: 'AN/FAR/1993/0041',
    firstName: 'Lamine',
    lastName: 'Diallo',
    birthDate: '1993-10-12',
    birthPlace: 'Faranah',
    gender: 'M',
    fatherName: 'Abdoulaye Diallo',
    fatherBirthDate: '1963-06-20',
    fatherNationality: 'Guinéenne',
    motherName: 'Fatoumata Camara',
    motherMaidenName: 'Camara',
    motherBirthDate: '1967-02-14',
    motherNationality: 'Guinéenne',
    commune: 'Faranah',
    prefecture: 'Faranah',
    region: 'Faranah',
    registrationDate: '1993-10-30',
    registeredBy: 'M. Ousmane Sow',
    status: 'active',
  },
  {
    id: 'bc-013',
    acteNumber: 'AN/MAT/2000/0072',
    firstName: 'Ibrahima',
    lastName: 'Touré',
    birthDate: '2000-07-08',
    birthPlace: 'Conakry',
    gender: 'M',
    fatherName: 'Moussa Touré',
    fatherBirthDate: '1972-03-28',
    fatherNationality: 'Guinéenne',
    motherName: 'Hadja Mariama Condé',
    motherMaidenName: 'Condé',
    motherBirthDate: '1976-12-05',
    motherNationality: 'Guinéenne',
    commune: 'Matam',
    prefecture: 'Conakry',
    region: 'Conakry',
    registrationDate: '2000-07-25',
    registeredBy: 'M. Lamine Diallo',
    status: 'active',
  },
  {
    id: 'bc-014',
    acteNumber: 'AN/KAN/1995/0098',
    firstName: 'Aminata',
    lastName: 'Sow',
    birthDate: '1995-11-22',
    birthPlace: 'Kankan',
    gender: 'F',
    fatherName: 'Ousmane Sow',
    fatherBirthDate: '1966-08-10',
    fatherNationality: 'Guinéenne',
    motherName: 'Kadiatou Bah',
    motherMaidenName: 'Bah',
    motherBirthDate: '1970-04-22',
    motherNationality: 'Guinéenne',
    commune: 'Kankan',
    prefecture: 'Kankan',
    region: 'Kankan',
    registrationDate: '1995-12-10',
    registeredBy: 'Mme Fatoumata Diallo',
    status: 'active',
  },
  {
    id: 'bc-015',
    acteNumber: 'AN/RAT/1988/0019',
    firstName: 'Moussa',
    lastName: 'Keita',
    birthDate: '1988-03-30',
    birthPlace: 'Conakry',
    gender: 'M',
    fatherName: 'Sékou Keita',
    fatherBirthDate: '1957-11-15',
    fatherNationality: 'Guinéenne',
    motherName: 'Aminata Soumah',
    motherMaidenName: 'Soumah',
    motherBirthDate: '1962-07-08',
    motherNationality: 'Guinéenne',
    commune: 'Ratoma',
    prefecture: 'Conakry',
    region: 'Conakry',
    registrationDate: '1988-04-15',
    registeredBy: 'M. Ibrahima Camara',
    status: 'cancelled',
    notes: 'Acte annulé le 05/06/2019 — Doublon détecté (voir AN/RAT/1988/0019-B)',
  },
  {
    id: 'bc-016',
    acteNumber: 'AN/NZR/1997/0053',
    firstName: 'Fatoumata',
    lastName: 'Doubé',
    birthDate: '1997-08-15',
    birthPlace: 'Nzérékoré',
    gender: 'F',
    fatherName: 'Lamine Doubé',
    fatherBirthDate: '1969-05-20',
    fatherNationality: 'Guinéenne',
    motherName: 'Mariama Touré',
    motherMaidenName: 'Touré',
    motherBirthDate: '1973-01-30',
    motherNationality: 'Guinéenne',
    commune: 'Nzérékoré',
    prefecture: 'Nzérékoré',
    region: 'Nzérékoré',
    registrationDate: '1997-09-02',
    registeredBy: 'Mme Hawa Soumah',
    status: 'active',
  },
  {
    id: 'bc-017',
    acteNumber: 'AN/KIN/1992/0036',
    firstName: 'Alpha',
    lastName: 'Camara',
    birthDate: '1992-06-05',
    birthPlace: 'Kindia',
    gender: 'M',
    fatherName: 'Abdoulaye Camara',
    fatherBirthDate: '1962-12-12',
    fatherNationality: 'Guinéenne',
    motherName: 'Hadja Aminata Bah',
    motherMaidenName: 'Bah',
    motherBirthDate: '1966-08-18',
    motherNationality: 'Guinéenne',
    commune: 'Kindia',
    prefecture: 'Kindia',
    region: 'Kindia',
    registrationDate: '1992-06-22',
    registeredBy: 'M. Mamadou Soumah',
    status: 'active',
  },
  {
    id: 'bc-018',
    acteNumber: 'AN/DIX/2001/0010',
    firstName: 'Mariama',
    lastName: 'Condé',
    birthDate: '2001-01-28',
    birthPlace: 'Conakry',
    gender: 'F',
    fatherName: 'Ibrahima Condé',
    fatherBirthDate: '1973-04-05',
    fatherNationality: 'Guinéenne',
    motherName: 'Fatoumata Diallo',
    motherMaidenName: 'Diallo',
    motherBirthDate: '1977-10-22',
    motherNationality: 'Guinéenne',
    commune: 'Dixinn',
    prefecture: 'Conakry',
    region: 'Conakry',
    registrationDate: '2001-02-15',
    registeredBy: 'Mme Kadiatou Sow',
    status: 'active',
  },
  {
    id: 'bc-019',
    acteNumber: 'AN/LAB/1994/0044',
    firstName: 'Thierno',
    lastName: 'Sow',
    birthDate: '1994-09-17',
    birthPlace: 'Labé',
    gender: 'M',
    fatherName: 'Mamadou Sow',
    fatherBirthDate: '1965-02-10',
    fatherNationality: 'Guinéenne',
    motherName: 'Aissatou Keita',
    motherMaidenName: 'Keita',
    motherBirthDate: '1969-06-28',
    motherNationality: 'Guinéenne',
    commune: 'Labé',
    prefecture: 'Labé',
    region: 'Labé',
    registrationDate: '1994-10-05',
    registeredBy: 'M. Alpha Bah',
    status: 'active',
  },
  {
    id: 'bc-020',
    acteNumber: 'AN/KAL/1999/0061',
    firstName: 'Hadja',
    lastName: 'Diallo',
    birthDate: '1999-04-10',
    birthPlace: 'Conakry',
    gender: 'F',
    fatherName: 'Ousmane Diallo',
    fatherBirthDate: '1971-07-15',
    fatherNationality: 'Guinéenne',
    motherName: 'Kadiatou Camara',
    motherMaidenName: 'Camara',
    motherBirthDate: '1975-12-20',
    motherNationality: 'Guinéenne',
    commune: 'Kaloum',
    prefecture: 'Conakry',
    region: 'Conakry',
    registrationDate: '1999-04-28',
    registeredBy: 'Mme Aminata Sow',
    status: 'active',
  },
  {
    id: 'bc-021',
    acteNumber: 'AN/MAM/1996/0025',
    firstName: 'Kadiatou',
    lastName: 'Touré',
    birthDate: '1996-12-08',
    birthPlace: 'Mamou',
    gender: 'F',
    fatherName: 'Lamine Touré',
    fatherBirthDate: '1968-03-22',
    fatherNationality: 'Guinéenne',
    motherName: 'Aminata Soumah',
    motherMaidenName: 'Soumah',
    motherBirthDate: '1972-09-05',
    motherNationality: 'Guinéenne',
    commune: 'Mamou',
    prefecture: 'Mamou',
    region: 'Mamou',
    registrationDate: '1996-12-28',
    registeredBy: 'M. Ibrahim Condé',
    status: 'active',
  },
  {
    id: 'bc-022',
    acteNumber: 'AN/BOK/1987/0033',
    firstName: 'Abdoulaye',
    lastName: 'Bah',
    birthDate: '1987-07-14',
    birthPlace: 'Boké',
    gender: 'M',
    fatherName: 'Mamadou Bah',
    fatherBirthDate: '1956-01-30',
    fatherNationality: 'Guinéenne',
    motherName: 'Fatoumata Keita',
    motherMaidenName: 'Keita',
    motherBirthDate: '1960-11-22',
    motherNationality: 'Guinéenne',
    commune: 'Boké',
    prefecture: 'Boké',
    region: 'Boké',
    registrationDate: '1987-08-01',
    registeredBy: 'M. Sékou Diallo',
    status: 'corrected',
    notes: 'Correction de la date de naissance le 18/03/2021',
  },
  {
    id: 'bc-023',
    acteNumber: 'AN/FAR/2000/0008',
    firstName: 'Ousmane',
    lastName: 'Soumah',
    birthDate: '2000-10-22',
    birthPlace: 'Faranah',
    gender: 'M',
    fatherName: 'Ibrahima Soumah',
    fatherBirthDate: '1974-06-15',
    fatherNationality: 'Guinéenne',
    motherName: 'Mariama Diallo',
    motherMaidenName: 'Diallo',
    motherBirthDate: '1978-02-08',
    motherNationality: 'Guinéenne',
    commune: 'Faranah',
    prefecture: 'Faranah',
    region: 'Faranah',
    registrationDate: '2000-11-10',
    registeredBy: 'Mme Aissatou Camara',
    status: 'active',
  },
  {
    id: 'bc-024',
    acteNumber: 'AN/KAN/2002/0014',
    firstName: 'Fatoumata',
    lastName: 'Camara',
    birthDate: '2002-03-18',
    birthPlace: 'Kankan',
    gender: 'F',
    fatherName: 'Alpha Camara',
    fatherBirthDate: '1975-08-25',
    fatherNationality: 'Guinéenne',
    motherName: 'Hadja Kadiatou Sow',
    motherMaidenName: 'Sow',
    motherBirthDate: '1979-04-12',
    motherNationality: 'Guinéenne',
    commune: 'Kankan',
    prefecture: 'Kankan',
    region: 'Kankan',
    registrationDate: '2002-04-05',
    registeredBy: 'M. Mamadou Bah',
    status: 'active',
  },
  {
    id: 'bc-025',
    acteNumber: 'AN/MAT/1985/0050',
    firstName: 'Ibrahima',
    lastName: 'Bah',
    birthDate: '1985-05-30',
    birthPlace: 'Conakry',
    gender: 'M',
    fatherName: 'Sékou Bah',
    fatherBirthDate: '1955-10-10',
    fatherNationality: 'Guinéenne',
    motherName: 'Aminata Touré',
    motherMaidenName: 'Touré',
    motherBirthDate: '1959-06-22',
    motherNationality: 'Guinéenne',
    commune: 'Matam',
    prefecture: 'Conakry',
    region: 'Conakry',
    registrationDate: '1985-06-18',
    registeredBy: 'M. Lamine Camara',
    status: 'active',
  },
]

// ─── REGIONS & COMMUNES FOR FILTERS ──────────────────────────────────────────
export const GUINEA_REGIONS = [
  'Conakry', 'Kindia', 'Kankan', 'Labé', 'Nzérékoré', 'Faranah', 'Boké', 'Mamou'
]

export const GUINEA_COMMUNES = [
  'Kaloum', 'Dixinn', 'Matam', 'Ratoma', // Conakry
  'Kindia', 'Kankan', 'Labé', 'Nzérékoré', 'Faranah', 'Boké', 'Mamou'
]

// ─── SEARCH RESULT TYPE ──────────────────────────────────────────────────────
export interface BirthSearchResult {
  record: BirthRecord
  matchType: 'exact' | 'partial'
  matchFields: string[]
}

export interface BirthStats {
  total: number
  active: number
  cancelled: number
  corrected: number
  verificationCount: number
  byRegion: Record<string, number>
  byCommune: Record<string, number>
  byGender: { male: number; female: number }
}

// ─── STORE INTERFACE ─────────────────────────────────────────────────────────
interface BirthCertificateState {
  records: BirthRecord[]
  verificationCount: number

  // Actions
  searchRecords: (query: string) => BirthRecord[]
  advancedSearch: (filters: {
    name?: string
    acteNumber?: string
    birthDate?: string
    birthPlace?: string
    commune?: string
    region?: string
    gender?: string
  }) => BirthRecord[]
  getRecordByActeNumber: (acteNumber: string) => BirthRecord | undefined
  verifyIdentity: (firstName: string, lastName: string, birthDate: string, birthPlace: string) => BirthSearchResult | null
  getRecordsByCommune: (commune: string) => BirthRecord[]
  getStats: () => BirthStats
  incrementVerification: () => void
}

// ─── STORE ───────────────────────────────────────────────────────────────────
export const useBirthCertificateStore = create<BirthCertificateState>()(
  persist(
    (set, get) => ({
      records: SEED_RECORDS,
      verificationCount: 0,

      searchRecords: (query: string) => {
        const { records } = get()
        if (!query.trim()) return records
        const q = query.toLowerCase().trim()
        return records.filter(r =>
          r.firstName.toLowerCase().includes(q) ||
          r.lastName.toLowerCase().includes(q) ||
          r.acteNumber.toLowerCase().includes(q) ||
          r.birthDate.includes(q) ||
          r.birthPlace.toLowerCase().includes(q) ||
          r.fatherName.toLowerCase().includes(q) ||
          r.motherName.toLowerCase().includes(q) ||
          r.commune.toLowerCase().includes(q) ||
          r.region.toLowerCase().includes(q)
        )
      },

      advancedSearch: (filters) => {
        const { records } = get()
        return records.filter(r => {
          if (filters.name) {
            const q = filters.name.toLowerCase()
            const nameMatch = r.firstName.toLowerCase().includes(q) || r.lastName.toLowerCase().includes(q) || `${r.firstName} ${r.lastName}`.toLowerCase().includes(q)
            if (!nameMatch) return false
          }
          if (filters.acteNumber) {
            const q = filters.acteNumber.toLowerCase()
            if (!r.acteNumber.toLowerCase().includes(q)) return false
          }
          if (filters.birthDate) {
            if (!r.birthDate.includes(filters.birthDate)) return false
          }
          if (filters.birthPlace) {
            const q = filters.birthPlace.toLowerCase()
            if (!r.birthPlace.toLowerCase().includes(q)) return false
          }
          if (filters.commune && filters.commune !== 'all') {
            if (r.commune !== filters.commune) return false
          }
          if (filters.region && filters.region !== 'all') {
            if (r.region !== filters.region) return false
          }
          if (filters.gender && filters.gender !== 'all') {
            if (r.gender !== filters.gender) return false
          }
          return true
        })
      },

      getRecordByActeNumber: (acteNumber: string) => {
        const { records } = get()
        return records.find(r => r.acteNumber.toLowerCase() === acteNumber.toLowerCase())
      },

      verifyIdentity: (firstName: string, lastName: string, birthDate: string, birthPlace: string) => {
        const { records } = get()
        // Increment verification count
        set((state) => ({ verificationCount: state.verificationCount + 1 }))

        // Try exact match first
        const exact = records.find(r =>
          r.firstName.toLowerCase() === firstName.toLowerCase() &&
          r.lastName.toLowerCase() === lastName.toLowerCase() &&
          r.birthDate === birthDate &&
          r.birthPlace.toLowerCase() === birthPlace.toLowerCase()
        )
        if (exact) {
          return { record: exact, matchType: 'exact' as const, matchFields: ['firstName', 'lastName', 'birthDate', 'birthPlace'] }
        }

        // Try partial match — match on name + at least one other field
        const partial = records.find(r => {
          const nameMatch = r.firstName.toLowerCase() === firstName.toLowerCase() && r.lastName.toLowerCase() === lastName.toLowerCase()
          const dateMatch = r.birthDate === birthDate
          const placeMatch = r.birthPlace.toLowerCase() === birthPlace.toLowerCase()
          return nameMatch && (dateMatch || placeMatch)
        })
        if (partial) {
          const matchFields: string[] = ['firstName', 'lastName']
          if (partial.birthDate === birthDate) matchFields.push('birthDate')
          if (partial.birthPlace.toLowerCase() === birthPlace.toLowerCase()) matchFields.push('birthPlace')
          return { record: partial, matchType: 'partial' as const, matchFields }
        }

        // Try even broader partial match — name only
        const nameOnly = records.find(r =>
          r.firstName.toLowerCase() === firstName.toLowerCase() &&
          r.lastName.toLowerCase() === lastName.toLowerCase()
        )
        if (nameOnly) {
          return { record: nameOnly, matchType: 'partial' as const, matchFields: ['firstName', 'lastName'] }
        }

        return null
      },

      getRecordsByCommune: (commune: string) => {
        const { records } = get()
        return records.filter(r => r.commune === commune)
      },

      getStats: () => {
        const { records, verificationCount } = get()
        const byRegion: Record<string, number> = {}
        const byCommune: Record<string, number> = {}

        records.forEach(r => {
          byRegion[r.region] = (byRegion[r.region] || 0) + 1
          byCommune[r.commune] = (byCommune[r.commune] || 0) + 1
        })

        return {
          total: records.length,
          active: records.filter(r => r.status === 'active').length,
          cancelled: records.filter(r => r.status === 'cancelled').length,
          corrected: records.filter(r => r.status === 'corrected').length,
          byRegion,
          byCommune,
          byGender: {
            male: records.filter(r => r.gender === 'M').length,
            female: records.filter(r => r.gender === 'F').length,
          },
          verificationCount,
        } as BirthStats
      },

      incrementVerification: () => {
        set((state) => ({ verificationCount: state.verificationCount + 1 }))
      },
    }),
    {
      name: 'eadmin-birth-certificate-store',
    }
  )
)
