// ─── CITIZEN DATABASE SIMULATION ──────────────────────────────────────────────
// Simulates the national citizen database for automatic verification
// In production, this would connect to the ANIP (Agence Nationale d'Identification) database

export interface BirthCertificateDetail {
  actNumber: string
  registrationDate: string
  registrationCommune: string
  registrationPrefecture: string
  fatherName: string
  fatherFirstName: string
  fatherDateOfBirth: string
  fatherPlaceOfBirth: string
  fatherNationality: string
  motherName: string
  motherFirstName: string
  motherDateOfBirth: string
  motherPlaceOfBirth: string
  motherNationality: string
  declarantName: string
  declarantRelation: string
  declarationDate: string
  officerName: string
  marginalNotes: string[]
}

export interface CitizenRecord {
  nin: string
  name: string
  firstName: string
  dateOfBirth: string
  placeOfBirth: string
  gender: 'M' | 'F'
  nationality: 'guinéenne' | 'autre'
  phone: string
  email: string
  address: string
  commune: string
  prefecture: string
  region: string
  // Documents held
  hasCNI: boolean
  cniNumber?: string
  cniExpiry?: string
  hasPassport: boolean
  passportNumber?: string
  hasBirthCertificate: boolean
  birthCertificateNumber?: string
  birthCertificateDetail?: BirthCertificateDetail
  hasMarriageCertificate: boolean
  marriageCertificateNumber?: string
  hasDeathCertificate: boolean
  hasCriminalRecord: boolean
  criminalRecordClear: boolean // true = no criminal record
  hasDrivingLicense: boolean
  drivingLicenseNumber?: string
  hasVaccinationCard: boolean
  hasSanitaryCard: boolean
  // Employment
  isEmployed: boolean
  employer?: string
  // Tax
  hasNIF: boolean
  nifNumber?: string
  taxCompliant: boolean // true = all taxes paid
  // Residence
  hasResidenceCertificate: boolean
  residenceCertificateDate?: string
  // Education
  educationLevel?: string
  diplomas: string[]
  // Flags
  isMinor: boolean
  isDeceased: boolean
  // Verification
  identityVerified: boolean
  biometricVerified: boolean
  photoOnFile: boolean
}

export interface VerificationResult {
  isValid: boolean
  citizenFound: boolean
  checks: VerificationCheck[]
  autoProcessable: boolean
  requiresHumanIntervention: boolean
  interventionReason?: string
  riskLevel: 'low' | 'medium' | 'high'
  summary: string
}

export interface VerificationCheck {
  id: string
  label: string
  status: 'passed' | 'failed' | 'warning' | 'skipped'
  detail: string
  autoCorrectable: boolean
}

// ─── SIMULATED CITIZEN DATABASE ───────────────────────────────────────────────
const CITIZEN_DATABASE: CitizenRecord[] = [
  {
    nin: 'NIN-2019-458723', name: 'Diallo', firstName: 'Aminata', dateOfBirth: '1992-03-15', placeOfBirth: 'Conakry',
    gender: 'F', nationality: 'guinéenne', phone: '+224 622 34 56 78', email: 'aminata.diallo@email.com',
    address: 'Conakry, Commune de Kaloum', commune: 'Kaloum', prefecture: 'Conakry', region: 'Conakry',
    hasCNI: true, cniNumber: 'CNI-2019-458723', cniExpiry: '2029-03-15',
    hasPassport: false, hasBirthCertificate: true, birthCertificateNumber: 'ACT-NAI-1992-458723',
    birthCertificateDetail: { actNumber: 'ACT-NAI-1992-458723', registrationDate: '1992-03-16', registrationCommune: 'Kaloum', registrationPrefecture: 'Conakry', fatherName: 'Diallo', fatherFirstName: 'Mamadou', fatherDateOfBirth: '1960-08-10', fatherPlaceOfBirth: 'Kankan', fatherNationality: 'guinéenne', motherName: 'Touré', motherFirstName: 'Aissatou', motherDateOfBirth: '1965-04-22', motherPlaceOfBirth: 'Conakry', motherNationality: 'guinéenne', declarantName: 'Diallo Mamadou', declarantRelation: 'Père', declarationDate: '1992-03-16', officerName: 'M. Abdoulaye Sylla', marginalNotes: [] },
    hasMarriageCertificate: false, hasDeathCertificate: false,
    hasCriminalRecord: true, criminalRecordClear: true,
    hasDrivingLicense: false, hasVaccinationCard: true, hasSanitaryCard: true,
    isEmployed: true, employer: 'Ministère des Finances',
    hasNIF: true, nifNumber: 'NIF-2019-458723', taxCompliant: true,
    hasResidenceCertificate: true, residenceCertificateDate: '2026-01-15',
    educationLevel: 'Master', diplomas: ['Master Économie', 'Licence Gestion'],
    isMinor: false, isDeceased: false,
    identityVerified: true, biometricVerified: true, photoOnFile: true,
  },
  {
    nin: 'NIN-2017-123456', name: 'Condé', firstName: 'Ibrahim', dateOfBirth: '1988-07-22', placeOfBirth: 'Kankan',
    gender: 'M', nationality: 'guinéenne', phone: '+224 666 78 90 12', email: 'ibrahim.conde@email.com',
    address: 'Conakry, Commune de Matam', commune: 'Matam', prefecture: 'Conakry', region: 'Conakry',
    hasCNI: true, cniNumber: 'CNI-2017-123456', cniExpiry: '2027-07-22',
    hasPassport: true, passportNumber: 'PAS-2018-123456',
    hasBirthCertificate: true, birthCertificateNumber: 'ACT-NAI-1988-123456',
    birthCertificateDetail: { actNumber: 'ACT-NAI-1988-123456', registrationDate: '1988-07-24', registrationCommune: 'Matam', registrationPrefecture: 'Conakry', fatherName: 'Condé', fatherFirstName: 'Sékou', fatherDateOfBirth: '1960-03-15', fatherPlaceOfBirth: 'Kankan', fatherNationality: 'guinéenne', motherName: 'Camara', motherFirstName: 'Fatoumata', motherDateOfBirth: '1963-11-08', motherPlaceOfBirth: 'Kankan', motherNationality: 'guinéenne', declarantName: 'Condé Sékou', declarantRelation: 'Père', declarationDate: '1988-07-24', officerName: 'M. Mamady Kouyaté', marginalNotes: ['Mariage le 15/06/2015 avec Touré Aminata'] },
    hasMarriageCertificate: true, marriageCertificateNumber: 'ACT-MAR-2015-123456',
    hasDeathCertificate: false, hasCriminalRecord: true, criminalRecordClear: true,
    hasDrivingLicense: true, drivingLicenseNumber: 'PER-2019-123456',
    hasVaccinationCard: true, hasSanitaryCard: true,
    isEmployed: true, employer: 'Société Minière de Boké',
    hasNIF: true, nifNumber: 'NIF-2017-123456', taxCompliant: true,
    hasResidenceCertificate: true, residenceCertificateDate: '2025-11-20',
    educationLevel: 'Doctorat', diplomas: ['Doctorat Géologie', 'Master Sciences de la Terre'],
    isMinor: false, isDeceased: false,
    identityVerified: true, biometricVerified: true, photoOnFile: true,
  },
  {
    nin: 'NIN-2020-789012', name: 'Camara', firstName: 'Ousmane', dateOfBirth: '1995-11-08', placeOfBirth: 'Kindia',
    gender: 'M', nationality: 'guinéenne', phone: '+224 655 12 34 56', email: 'ousmane.camara@email.com',
    address: 'Kindia, Préfecture de Kindia', commune: 'Kindia', prefecture: 'Kindia', region: 'Kindia',
    hasCNI: true, cniNumber: 'CNI-2020-789012', cniExpiry: '2030-11-08',
    hasPassport: false, hasBirthCertificate: true, birthCertificateNumber: 'ACT-NAI-1995-789012',
    birthCertificateDetail: { actNumber: 'ACT-NAI-1995-789012', registrationDate: '1995-11-10', registrationCommune: 'Kindia', registrationPrefecture: 'Kindia', fatherName: 'Camara', fatherFirstName: 'Lamine', fatherDateOfBirth: '1965-05-20', fatherPlaceOfBirth: 'Kindia', fatherNationality: 'guinéenne', motherName: 'Diallo', motherFirstName: 'Kadiatou', motherDateOfBirth: '1970-02-14', motherPlaceOfBirth: 'Kindia', motherNationality: 'guinéenne', declarantName: 'Camara Lamine', declarantRelation: 'Père', declarationDate: '1995-11-10', officerName: 'M. Abdoulaye Bangoura', marginalNotes: [] },
    hasMarriageCertificate: false, hasDeathCertificate: false,
    hasCriminalRecord: true, criminalRecordClear: true,
    hasDrivingLicense: false, hasVaccinationCard: true, hasSanitaryCard: false,
    isEmployed: false, hasNIF: false, taxCompliant: true,
    hasResidenceCertificate: true, residenceCertificateDate: '2026-02-10',
    educationLevel: 'Licence', diplomas: ['Licence Droit'],
    isMinor: false, isDeceased: false,
    identityVerified: true, biometricVerified: false, photoOnFile: true,
  },
  {
    nin: 'NIN-2018-345678', name: 'Touré', firstName: 'Mariama', dateOfBirth: '1990-05-30', placeOfBirth: 'Conakry',
    gender: 'F', nationality: 'guinéenne', phone: '+224 628 45 67 89', email: 'mariama.toure@entreprise-gn.com',
    address: 'Conakry, Commune de Dixinn', commune: 'Dixinn', prefecture: 'Conakry', region: 'Conakry',
    hasCNI: true, cniNumber: 'CNI-2018-345678', cniExpiry: '2028-05-30',
    hasPassport: true, passportNumber: 'PAS-2020-345678',
    hasBirthCertificate: true, birthCertificateNumber: 'ACT-NAI-1990-345678',
    birthCertificateDetail: { actNumber: 'ACT-NAI-1990-345678', registrationDate: '1990-06-01', registrationCommune: 'Dixinn', registrationPrefecture: 'Conakry', fatherName: 'Touré', fatherFirstName: 'Mamadou', fatherDateOfBirth: '1962-08-15', fatherPlaceOfBirth: 'Conakry', fatherNationality: 'guinéenne', motherName: 'Sow', motherFirstName: 'Aïssatou', motherDateOfBirth: '1967-03-22', motherPlaceOfBirth: 'Conakry', motherNationality: 'guinéenne', declarantName: 'Touré Mamadou', declarantRelation: 'Père', declarationDate: '1990-06-01', officerName: 'Mme. Mariama Bah', marginalNotes: [] },
    hasMarriageCertificate: false, hasDeathCertificate: false,
    hasCriminalRecord: true, criminalRecordClear: true,
    hasDrivingLicense: true, drivingLicenseNumber: 'PER-2021-345678',
    hasVaccinationCard: true, hasSanitaryCard: true,
    isEmployed: true, employer: 'SARL Touré Commerce',
    hasNIF: true, nifNumber: 'NIF-2018-345678', taxCompliant: true,
    hasResidenceCertificate: true, residenceCertificateDate: '2026-03-01',
    educationLevel: 'Master', diplomas: ['Master Commerce International'],
    isMinor: false, isDeceased: false,
    identityVerified: true, biometricVerified: true, photoOnFile: true,
  },
  {
    nin: 'NIN-2015-567890', name: 'Sow', firstName: 'Abdoulaye', dateOfBirth: '1985-09-12', placeOfBirth: 'Kankan',
    gender: 'M', nationality: 'guinéenne', phone: '+224 621 98 76 54', email: 'abdoulaye.sow@email.com',
    address: 'Kankan, Préfecture de Kankan', commune: 'Kankan', prefecture: 'Kankan', region: 'Kankan',
    hasCNI: true, cniNumber: 'CNI-2015-567890', cniExpiry: '2025-09-12', // EXPIRED!
    hasPassport: false, hasBirthCertificate: true, birthCertificateNumber: 'ACT-NAI-1985-567890',
    birthCertificateDetail: { actNumber: 'ACT-NAI-1985-567890', registrationDate: '1985-09-14', registrationCommune: 'Kankan', registrationPrefecture: 'Kankan', fatherName: 'Sow', fatherFirstName: 'Ibrahima', fatherDateOfBirth: '1955-06-10', fatherPlaceOfBirth: 'Kankan', fatherNationality: 'guinéenne', motherName: 'Doubé', motherFirstName: 'Mariama', motherDateOfBirth: '1960-01-25', motherPlaceOfBirth: 'Kankan', motherNationality: 'guinéenne', declarantName: 'Sow Ibrahima', declarantRelation: 'Père', declarationDate: '1985-09-14', officerName: 'M. Sékou Bangoura', marginalNotes: ['Mariage le 20/03/2012 avec Doubé Mariama'] },
    hasMarriageCertificate: true, marriageCertificateNumber: 'ACT-MAR-2012-567890',
    hasDeathCertificate: false, hasCriminalRecord: true, criminalRecordClear: false, // HAS CRIMINAL RECORD!
    hasDrivingLicense: true, drivingLicenseNumber: 'PER-2016-567890',
    hasVaccinationCard: false, hasSanitaryCard: false,
    isEmployed: true, employer: 'Office des Chemins de Fer',
    hasNIF: true, nifNumber: 'NIF-2015-567890', taxCompliant: false, // TAX NOT COMPLIANT!
    hasResidenceCertificate: false, // Missing residence cert!
    educationLevel: 'Brevet', diplomas: [],
    isMinor: false, isDeceased: false,
    identityVerified: true, biometricVerified: true, photoOnFile: true,
  },
  {
    nin: 'NIN-2022-456789', name: 'Doubé', firstName: 'Aïssatou', dateOfBirth: '2005-02-14', placeOfBirth: "N'Zérékoré",
    gender: 'F', nationality: 'guinéenne', phone: '+224 620 11 22 33', email: 'aissatou.doube@email.com',
    address: "N'Zérékoré, Préfecture de N'Zérékoré", commune: "N'Zérékoré", prefecture: "N'Zérékoré", region: "N'Zérékoré",
    hasCNI: false, // NO CNI!
    hasPassport: false, hasBirthCertificate: true, birthCertificateNumber: 'ACT-NAI-2005-456789',
    birthCertificateDetail: { actNumber: 'ACT-NAI-2005-456789', registrationDate: '2005-02-16', registrationCommune: "N'Zérékoré", registrationPrefecture: "N'Zérékoré", fatherName: 'Doubé', fatherFirstName: 'Aboubacar', fatherDateOfBirth: '1975-09-03', fatherPlaceOfBirth: "N'Zérékoré", fatherNationality: 'guinéenne', motherName: 'Doré', motherFirstName: 'Fatoumata', motherDateOfBirth: '1980-12-18', motherPlaceOfBirth: "N'Zérékoré", motherNationality: 'guinéenne', declarantName: 'Doubé Aboubacar', declarantRelation: 'Père', declarationDate: '2005-02-16', officerName: 'M. Lamine Loua', marginalNotes: [] },
    hasMarriageCertificate: false, hasDeathCertificate: false,
    hasCriminalRecord: false, criminalRecordClear: true, hasDrivingLicense: false,
    hasVaccinationCard: true, hasSanitaryCard: false,
    isEmployed: false, hasNIF: false, taxCompliant: true,
    hasResidenceCertificate: true, residenceCertificateDate: '2026-04-01',
    educationLevel: 'Baccalauréat', diplomas: ['BAC Série D'],
    isMinor: true, // MINOR!
    isDeceased: false,
    identityVerified: false, biometricVerified: false, photoOnFile: false,
  },
  {
    nin: 'NIN-2018-456123', name: 'Cissé', firstName: 'Kadiatou', dateOfBirth: '1993-06-25', placeOfBirth: 'Conakry',
    gender: 'F', nationality: 'guinéenne', phone: '+224 628 34 56 78', email: 'kadiatou.cisse@email.com',
    address: 'Conakry, Commune de Dixinn', commune: 'Dixinn', prefecture: 'Conakry', region: 'Conakry',
    hasCNI: true, cniNumber: 'CNI-2018-456123', cniExpiry: '2028-06-25',
    hasPassport: false, hasBirthCertificate: true, birthCertificateNumber: 'ACT-NAI-1993-456123',
    birthCertificateDetail: { actNumber: 'ACT-NAI-1993-456123', registrationDate: '1993-06-27', registrationCommune: 'Dixinn', registrationPrefecture: 'Conakry', fatherName: 'Cissé', fatherFirstName: 'Mamadou', fatherDateOfBirth: '1964-10-12', fatherPlaceOfBirth: 'Conakry', fatherNationality: 'guinéenne', motherName: 'Touré', motherFirstName: 'Aminata', motherDateOfBirth: '1968-07-05', motherPlaceOfBirth: 'Conakry', motherNationality: 'guinéenne', declarantName: 'Cissé Mamadou', declarantRelation: 'Père', declarationDate: '1993-06-27', officerName: 'M. Ibrahima Sylla', marginalNotes: ['Mariage le 12/09/2018 avec Barry Ibrahima'] },
    hasMarriageCertificate: true, marriageCertificateNumber: 'ACT-MAR-2018-456123',
    hasDeathCertificate: false, hasCriminalRecord: true, criminalRecordClear: true,
    hasDrivingLicense: false, hasVaccinationCard: true, hasSanitaryCard: true,
    isEmployed: true, employer: 'Banque Internationale pour le Commerce et l\'Industrie',
    hasNIF: true, nifNumber: 'NIF-2018-456123', taxCompliant: true,
    hasResidenceCertificate: true, residenceCertificateDate: '2026-01-20',
    educationLevel: 'Master', diplomas: ['Master Banque-Finance'],
    isMinor: false, isDeceased: false,
    identityVerified: true, biometricVerified: true, photoOnFile: true,
  },
  {
    nin: 'NIN-2016-890123', name: 'Barry', firstName: 'Ibrahima', dateOfBirth: '1987-12-03', placeOfBirth: 'Labé',
    gender: 'M', nationality: 'guinéenne', phone: '+224 677 45 67 89', email: 'ibrahima.barry@email.com',
    address: 'Conakry, Commune de Kaloum', commune: 'Kaloum', prefecture: 'Conakry', region: 'Conakry',
    hasCNI: true, cniNumber: 'CNI-2016-890123', cniExpiry: '2026-12-03',
    hasPassport: true, passportNumber: 'PAS-2019-890123',
    hasBirthCertificate: true, birthCertificateNumber: 'ACT-NAI-1987-890123',
    birthCertificateDetail: { actNumber: 'ACT-NAI-1987-890123', registrationDate: '1987-12-05', registrationCommune: 'Kaloum', registrationPrefecture: 'Conakry', fatherName: 'Barry', fatherFirstName: 'Thierno', fatherDateOfBirth: '1958-04-20', fatherPlaceOfBirth: 'Labé', fatherNationality: 'guinéenne', motherName: 'Bah', motherFirstName: 'Aissatou', motherDateOfBirth: '1963-08-15', motherPlaceOfBirth: 'Labé', motherNationality: 'guinéenne', declarantName: 'Barry Thierno', declarantRelation: 'Père', declarationDate: '1987-12-05', officerName: 'M. Abdoul Kadir Diallo', marginalNotes: [] },
    hasMarriageCertificate: false, hasDeathCertificate: false,
    hasCriminalRecord: true, criminalRecordClear: true,
    hasDrivingLicense: false, hasVaccinationCard: true, hasSanitaryCard: false,
    isEmployed: true, employer: 'Université de Labé',
    hasNIF: true, nifNumber: 'NIF-2016-890123', taxCompliant: true,
    hasResidenceCertificate: true, residenceCertificateDate: '2025-12-15',
    educationLevel: 'Doctorat', diplomas: ['Doctorat Littérature', 'Master Lettres Modernes'],
    isMinor: false, isDeceased: false,
    identityVerified: true, biometricVerified: true, photoOnFile: true,
  },
  // ── 9: Tax issues but clean criminal record ──
  {
    nin: 'NIN-2021-112233', name: 'Kaba', firstName: 'Mamadou', dateOfBirth: '1991-04-18', placeOfBirth: 'Conakry',
    gender: 'M', nationality: 'guinéenne', phone: '+224 623 98 76 54', email: 'mamadou.kaba@email.com',
    address: 'Conakry, Commune de Kaloum', commune: 'Kaloum', prefecture: 'Conakry', region: 'Conakry',
    hasCNI: true, cniNumber: 'CNI-2021-112233', cniExpiry: '2031-04-18',
    hasPassport: false, hasBirthCertificate: true, birthCertificateNumber: 'ACT-NAI-1991-112233',
    birthCertificateDetail: { actNumber: 'ACT-NAI-1991-112233', registrationDate: '1991-04-20', registrationCommune: 'Kaloum', registrationPrefecture: 'Conakry', fatherName: 'Kaba', fatherFirstName: 'Ousmane', fatherDateOfBirth: '1963-01-10', fatherPlaceOfBirth: 'Conakry', fatherNationality: 'guinéenne', motherName: 'Condé', motherFirstName: 'Kadiatou', motherDateOfBirth: '1968-06-22', motherPlaceOfBirth: 'Conakry', motherNationality: 'guinéenne', declarantName: 'Kaba Ousmane', declarantRelation: 'Père', declarationDate: '1991-04-20', officerName: 'M. Facinet Bangoura', marginalNotes: ['Mariage le 08/05/2018 avec Cissé Kadiatou'] },
    hasMarriageCertificate: true, marriageCertificateNumber: 'ACT-MAR-2018-112233',
    hasDeathCertificate: false, hasCriminalRecord: true, criminalRecordClear: true, // Clean criminal record!
    hasDrivingLicense: true, drivingLicenseNumber: 'PER-2022-112233',
    hasVaccinationCard: true, hasSanitaryCard: true,
    isEmployed: true, employer: 'Société des Bauxites de Kindia',
    hasNIF: true, nifNumber: 'NIF-2021-112233', taxCompliant: false, // TAX NOT COMPLIANT!
    hasResidenceCertificate: true, residenceCertificateDate: '2026-02-28',
    educationLevel: 'Master', diplomas: ['Master Gestion Financière'],
    isMinor: false, isDeceased: false,
    identityVerified: true, biometricVerified: true, photoOnFile: true,
  },
  // ── 10: Minor trying to get an adult-only service ──
  {
    nin: 'NIN-2024-445566', name: 'Doré', firstName: 'Fatoumata', dateOfBirth: '2009-08-25', placeOfBirth: 'Kankan',
    gender: 'F', nationality: 'guinéenne', phone: '+224 620 55 66 77', email: 'fatoumata.dore@email.com',
    address: 'Kankan, Préfecture de Kankan', commune: 'Kankan', prefecture: 'Kankan', region: 'Kankan',
    hasCNI: false, // No CNI yet (minor)
    hasPassport: false, hasBirthCertificate: true, birthCertificateNumber: 'ACT-NAI-2009-445566',
    birthCertificateDetail: { actNumber: 'ACT-NAI-2009-445566', registrationDate: '2009-08-27', registrationCommune: 'Kankan', registrationPrefecture: 'Kankan', fatherName: 'Doré', fatherFirstName: 'Lansana', fatherDateOfBirth: '1980-03-12', fatherPlaceOfBirth: 'Kankan', fatherNationality: 'guinéenne', motherName: 'Camara', motherFirstName: 'Aminata', motherDateOfBirth: '1984-09-25', motherPlaceOfBirth: 'Kankan', motherNationality: 'guinéenne', declarantName: 'Doré Lansana', declarantRelation: 'Père', declarationDate: '2009-08-27', officerName: 'Mme. Aissatou Soumah', marginalNotes: [] },
    hasMarriageCertificate: false, hasDeathCertificate: false,
    hasCriminalRecord: false, criminalRecordClear: true, hasDrivingLicense: false,
    hasVaccinationCard: true, hasSanitaryCard: false,
    isEmployed: false, hasNIF: false, taxCompliant: true,
    hasResidenceCertificate: true, residenceCertificateDate: '2026-01-10',
    educationLevel: '3ème', diplomas: [],
    isMinor: true, // MINOR — cannot access adult-only services
    isDeceased: false,
    identityVerified: true, biometricVerified: false, photoOnFile: false,
  },
  // ── 11: Expired CNI trying to get a service requiring valid CNI ──
  {
    nin: 'NIN-2012-778899', name: 'Yansané', firstName: 'Aboubacar', dateOfBirth: '1980-12-01', placeOfBirth: 'Labé',
    gender: 'M', nationality: 'guinéenne', phone: '+224 655 88 99 00', email: 'aboubacar.yansane@email.com',
    address: 'Conakry, Commune de Matam', commune: 'Matam', prefecture: 'Conakry', region: 'Conakry',
    hasCNI: true, cniNumber: 'CNI-2012-778899', cniExpiry: '2022-12-01', // EXPIRED since 2022!
    hasPassport: true, passportNumber: 'PAS-2015-778899',
    hasBirthCertificate: true, birthCertificateNumber: 'ACT-NAI-1980-778899',
    birthCertificateDetail: { actNumber: 'ACT-NAI-1980-778899', registrationDate: '1980-12-03', registrationCommune: 'Matam', registrationPrefecture: 'Conakry', fatherName: 'Yansané', fatherFirstName: 'Mamadou', fatherDateOfBirth: '1950-07-15', fatherPlaceOfBirth: 'Labé', fatherNationality: 'guinéenne', motherName: 'Sow', motherFirstName: 'Fatoumata', motherDateOfBirth: '1955-11-20', motherPlaceOfBirth: 'Labé', motherNationality: 'guinéenne', declarantName: 'Yansané Mamadou', declarantRelation: 'Père', declarationDate: '1980-12-03', officerName: 'M. Tidiane Diakité', marginalNotes: ['Mariage le 22/06/2005 avec Bah Aissatou'] },
    hasMarriageCertificate: true, marriageCertificateNumber: 'ACT-MAR-2005-778899',
    hasDeathCertificate: false, hasCriminalRecord: true, criminalRecordClear: true,
    hasDrivingLicense: true, drivingLicenseNumber: 'PER-2013-778899',
    hasVaccinationCard: true, hasSanitaryCard: true,
    isEmployed: true, employer: 'Office National des Forêts',
    hasNIF: true, nifNumber: 'NIF-2012-778899', taxCompliant: true,
    hasResidenceCertificate: true, residenceCertificateDate: '2026-03-15',
    educationLevel: 'Licence', diplomas: ['Licence Agronomie'],
    isMinor: false, isDeceased: false,
    identityVerified: true, biometricVerified: true, photoOnFile: true,
  },
  // ── 12: Foreign national trying to get a Guinean-only service ──
  {
    nin: 'NIN-2023-556677', name: 'Okafor', firstName: 'Emmanuel', dateOfBirth: '1994-06-10', placeOfBirth: 'Lagos, Nigeria',
    gender: 'M', nationality: 'autre', // NOT Guinean!
    phone: '+224 622 44 55 66', email: 'emmanuel.okafor@email.com',
    address: 'Conakry, Commune de Dixinn', commune: 'Dixinn', prefecture: 'Conakry', region: 'Conakry',
    hasCNI: false, // No Guinean CNI
    hasPassport: true, passportNumber: 'PAS-NG-2019-556677', // Nigerian passport
    hasBirthCertificate: true, birthCertificateNumber: 'ACT-NAI-NG-1994-556677',
    birthCertificateDetail: { actNumber: 'ACT-NAI-NG-1994-556677', registrationDate: '1994-06-12', registrationCommune: 'Dixinn', registrationPrefecture: 'Conakry', fatherName: 'Okafor', fatherFirstName: 'Chukwu', fatherDateOfBirth: '1964-02-28', fatherPlaceOfBirth: 'Lagos, Nigeria', fatherNationality: 'nigériane', motherName: 'Eze', motherFirstName: 'Chioma', motherDateOfBirth: '1969-08-15', motherPlaceOfBirth: 'Lagos, Nigeria', motherNationality: 'nigériane', declarantName: 'Okafor Chukwu', declarantRelation: 'Père', declarationDate: '1994-06-12', officerName: 'M. Olusegun Adebayo', marginalNotes: [] },
    hasMarriageCertificate: false, hasDeathCertificate: false,
    hasCriminalRecord: false, criminalRecordClear: true, hasDrivingLicense: false,
    hasVaccinationCard: true, hasSanitaryCard: true,
    isEmployed: true, employer: 'Société Minière Internationale',
    hasNIF: true, nifNumber: 'NIF-2023-556677', taxCompliant: true,
    hasResidenceCertificate: true, residenceCertificateDate: '2025-12-20',
    educationLevel: 'Master', diplomas: ['Master Ingénierie Minière'],
    isMinor: false, isDeceased: false,
    identityVerified: false, biometricVerified: false, photoOnFile: true,
  },
]

// ─── SERVICE ELIGIBILITY RULES ────────────────────────────────────────────────
// Maps service IDs to their eligibility requirements

interface EligibilityRule {
  serviceId: string
  requiresCNI: boolean
  requiresBirthCertificate: boolean
  requiresResidenceCertificate: boolean
  requiresNIF: boolean
  requiresTaxCompliance: boolean
  requiresCriminalRecordClear: boolean
  requiresBiometric: boolean
  requiresAdult: boolean
  requiresGuineanNationality: boolean
  autoProcessIfEligible: boolean // Can this be auto-processed if all checks pass?
  maxAutoProcessDays: number // Max processing days for auto-process
}

const ELIGIBILITY_RULES: EligibilityRule[] = [
  { serviceId: 'ec-1', requiresCNI: true, requiresBirthCertificate: true, requiresResidenceCertificate: false, requiresNIF: false, requiresTaxCompliance: false, requiresCriminalRecordClear: false, requiresBiometric: false, requiresAdult: false, requiresGuineanNationality: true, autoProcessIfEligible: true, maxAutoProcessDays: 2 },
  { serviceId: 'ec-2', requiresCNI: true, requiresBirthCertificate: false, requiresResidenceCertificate: false, requiresNIF: false, requiresTaxCompliance: false, requiresCriminalRecordClear: false, requiresBiometric: false, requiresAdult: true, requiresGuineanNationality: true, autoProcessIfEligible: true, maxAutoProcessDays: 2 },
  { serviceId: 'ec-3', requiresCNI: true, requiresBirthCertificate: true, requiresResidenceCertificate: false, requiresNIF: false, requiresTaxCompliance: false, requiresCriminalRecordClear: false, requiresBiometric: false, requiresAdult: true, requiresGuineanNationality: true, autoProcessIfEligible: true, maxAutoProcessDays: 2 },
  { serviceId: 'ec-4', requiresCNI: true, requiresBirthCertificate: true, requiresResidenceCertificate: true, requiresNIF: false, requiresTaxCompliance: false, requiresCriminalRecordClear: true, requiresBiometric: true, requiresAdult: true, requiresGuineanNationality: true, autoProcessIfEligible: false, maxAutoProcessDays: 5 }, // Requires human validation
  { serviceId: 'ec-5', requiresCNI: false, requiresBirthCertificate: false, requiresResidenceCertificate: false, requiresNIF: false, requiresTaxCompliance: false, requiresCriminalRecordClear: false, requiresBiometric: false, requiresAdult: true, requiresGuineanNationality: true, autoProcessIfEligible: true, maxAutoProcessDays: 1 },
  { serviceId: 'j-1', requiresCNI: true, requiresBirthCertificate: false, requiresResidenceCertificate: true, requiresNIF: false, requiresTaxCompliance: false, requiresCriminalRecordClear: false, requiresBiometric: false, requiresAdult: true, requiresGuineanNationality: true, autoProcessIfEligible: false, maxAutoProcessDays: 5 }, // Judicial - always human
  { serviceId: 'j-2', requiresCNI: true, requiresBirthCertificate: false, requiresResidenceCertificate: true, requiresNIF: false, requiresTaxCompliance: false, requiresCriminalRecordClear: false, requiresBiometric: false, requiresAdult: true, requiresGuineanNationality: true, autoProcessIfEligible: false, maxAutoProcessDays: 3 },
  { serviceId: 'j-3', requiresCNI: true, requiresBirthCertificate: false, requiresResidenceCertificate: false, requiresNIF: false, requiresTaxCompliance: false, requiresCriminalRecordClear: false, requiresBiometric: false, requiresAdult: true, requiresGuineanNationality: true, autoProcessIfEligible: true, maxAutoProcessDays: 1 },
  { serviceId: 'id-1', requiresCNI: true, requiresBirthCertificate: true, requiresResidenceCertificate: true, requiresNIF: false, requiresTaxCompliance: false, requiresCriminalRecordClear: false, requiresBiometric: true, requiresAdult: true, requiresGuineanNationality: true, autoProcessIfEligible: false, maxAutoProcessDays: 7 }, // Always needs biometric capture
  { serviceId: 'id-2', requiresCNI: true, requiresBirthCertificate: true, requiresResidenceCertificate: true, requiresNIF: false, requiresTaxCompliance: false, requiresCriminalRecordClear: false, requiresBiometric: true, requiresAdult: true, requiresGuineanNationality: true, autoProcessIfEligible: false, maxAutoProcessDays: 10 }, // Always needs biometric
  { serviceId: 'id-3', requiresCNI: true, requiresBirthCertificate: false, requiresResidenceCertificate: true, requiresNIF: false, requiresTaxCompliance: false, requiresCriminalRecordClear: false, requiresBiometric: false, requiresAdult: true, requiresGuineanNationality: true, autoProcessIfEligible: false, maxAutoProcessDays: 10 },
  { serviceId: 'u-1', requiresCNI: true, requiresBirthCertificate: false, requiresResidenceCertificate: true, requiresNIF: false, requiresTaxCompliance: false, requiresCriminalRecordClear: false, requiresBiometric: false, requiresAdult: true, requiresGuineanNationality: true, autoProcessIfEligible: false, maxAutoProcessDays: 15 },
  { serviceId: 'u-2', requiresCNI: true, requiresBirthCertificate: false, requiresResidenceCertificate: true, requiresNIF: false, requiresTaxCompliance: false, requiresCriminalRecordClear: false, requiresBiometric: false, requiresAdult: true, requiresGuineanNationality: true, autoProcessIfEligible: false, maxAutoProcessDays: 10 },
  { serviceId: 'u-3', requiresCNI: true, requiresBirthCertificate: false, requiresResidenceCertificate: true, requiresNIF: false, requiresTaxCompliance: false, requiresCriminalRecordClear: false, requiresBiometric: false, requiresAdult: true, requiresGuineanNationality: true, autoProcessIfEligible: false, maxAutoProcessDays: 7 },
  { serviceId: 'e-1', requiresCNI: true, requiresBirthCertificate: false, requiresResidenceCertificate: true, requiresNIF: true, requiresTaxCompliance: true, requiresCriminalRecordClear: true, requiresBiometric: false, requiresAdult: true, requiresGuineanNationality: true, autoProcessIfEligible: false, maxAutoProcessDays: 3 },
  { serviceId: 'e-2', requiresCNI: true, requiresBirthCertificate: false, requiresResidenceCertificate: true, requiresNIF: true, requiresTaxCompliance: true, requiresCriminalRecordClear: true, requiresBiometric: false, requiresAdult: true, requiresGuineanNationality: true, autoProcessIfEligible: false, maxAutoProcessDays: 7 },
  { serviceId: 'e-3', requiresCNI: true, requiresBirthCertificate: false, requiresResidenceCertificate: true, requiresNIF: true, requiresTaxCompliance: true, requiresCriminalRecordClear: false, requiresBiometric: false, requiresAdult: true, requiresGuineanNationality: true, autoProcessIfEligible: false, maxAutoProcessDays: 5 },
  { serviceId: 'ed-1', requiresCNI: true, requiresBirthCertificate: false, requiresResidenceCertificate: false, requiresNIF: false, requiresTaxCompliance: false, requiresCriminalRecordClear: false, requiresBiometric: false, requiresAdult: false, requiresGuineanNationality: true, autoProcessIfEligible: true, maxAutoProcessDays: 2 },
  { serviceId: 'ed-2', requiresCNI: true, requiresBirthCertificate: false, requiresResidenceCertificate: false, requiresNIF: false, requiresTaxCompliance: false, requiresCriminalRecordClear: false, requiresBiometric: false, requiresAdult: false, requiresGuineanNationality: true, autoProcessIfEligible: true, maxAutoProcessDays: 5 },
  { serviceId: 'ed-3', requiresCNI: true, requiresBirthCertificate: false, requiresResidenceCertificate: false, requiresNIF: false, requiresTaxCompliance: false, requiresCriminalRecordClear: false, requiresBiometric: false, requiresAdult: true, requiresGuineanNationality: true, autoProcessIfEligible: false, maxAutoProcessDays: 15 }, // Always human - equivalence commission
  { serviceId: 's-1', requiresCNI: true, requiresBirthCertificate: false, requiresResidenceCertificate: false, requiresNIF: false, requiresTaxCompliance: false, requiresCriminalRecordClear: false, requiresBiometric: false, requiresAdult: false, requiresGuineanNationality: false, autoProcessIfEligible: true, maxAutoProcessDays: 1 },
  { serviceId: 's-2', requiresCNI: true, requiresBirthCertificate: false, requiresResidenceCertificate: true, requiresNIF: false, requiresTaxCompliance: false, requiresCriminalRecordClear: false, requiresBiometric: false, requiresAdult: true, requiresGuineanNationality: true, autoProcessIfEligible: true, maxAutoProcessDays: 5 },
  { serviceId: 's-3', requiresCNI: true, requiresBirthCertificate: false, requiresResidenceCertificate: false, requiresNIF: false, requiresTaxCompliance: false, requiresCriminalRecordClear: false, requiresBiometric: false, requiresAdult: true, requiresGuineanNationality: false, autoProcessIfEligible: true, maxAutoProcessDays: 2 },
  { serviceId: 'r-1', requiresCNI: true, requiresBirthCertificate: false, requiresResidenceCertificate: false, requiresNIF: false, requiresTaxCompliance: false, requiresCriminalRecordClear: false, requiresBiometric: false, requiresAdult: true, requiresGuineanNationality: true, autoProcessIfEligible: true, maxAutoProcessDays: 1 },
  { serviceId: 'r-2', requiresCNI: true, requiresBirthCertificate: false, requiresResidenceCertificate: false, requiresNIF: false, requiresTaxCompliance: false, requiresCriminalRecordClear: false, requiresBiometric: false, requiresAdult: true, requiresGuineanNationality: true, autoProcessIfEligible: true, maxAutoProcessDays: 1 },
  { serviceId: 'f-1', requiresCNI: true, requiresBirthCertificate: false, requiresResidenceCertificate: false, requiresNIF: true, requiresTaxCompliance: true, requiresCriminalRecordClear: false, requiresBiometric: false, requiresAdult: true, requiresGuineanNationality: true, autoProcessIfEligible: true, maxAutoProcessDays: 3 },
  { serviceId: 'f-2', requiresCNI: true, requiresBirthCertificate: false, requiresResidenceCertificate: false, requiresNIF: true, requiresTaxCompliance: false, requiresCriminalRecordClear: false, requiresBiometric: false, requiresAdult: true, requiresGuineanNationality: true, autoProcessIfEligible: false, maxAutoProcessDays: 5 },
  { serviceId: 'f-3', requiresCNI: true, requiresBirthCertificate: false, requiresResidenceCertificate: false, requiresNIF: true, requiresTaxCompliance: true, requiresCriminalRecordClear: false, requiresBiometric: false, requiresAdult: true, requiresGuineanNationality: true, autoProcessIfEligible: true, maxAutoProcessDays: 3 },
]

// ─── LOOKUP FUNCTIONS ─────────────────────────────────────────────────────────

export function findCitizenByNIN(nin: string): CitizenRecord | null {
  return CITIZEN_DATABASE.find(c => c.nin === nin) || null
}

export function findCitizenByName(name: string, firstName: string): CitizenRecord | null {
  return CITIZEN_DATABASE.find(c => c.name === name && c.firstName === firstName) || null
}

export function getAllCitizens(): CitizenRecord[] {
  return CITIZEN_DATABASE
}

// ─── VERIFICATION ENGINE ──────────────────────────────────────────────────────

export function verifyRequest(
  serviceId: string,
  citizenNIN: string,
  citizenData: { name: string; firstName: string; phone: string; email: string; address: string }
): VerificationResult {
  const checks: VerificationCheck[] = []
  const citizen = findCitizenByNIN(citizenNIN)
  const rule = ELIGIBILITY_RULES.find(r => r.serviceId === serviceId)

  // ─── CHECK 1: Citizen exists in database ────────────────────────────────
  if (!citizen) {
    checks.push({
      id: 'citizen-exists',
      label: 'Citoyen trouvé dans la base',
      status: 'failed',
      detail: `Aucun citoyen trouvé avec le NIN ${citizenNIN}. Vérification manuelle requise.`,
      autoCorrectable: false,
    })
    return {
      isValid: false,
      citizenFound: false,
      checks,
      autoProcessable: false,
      requiresHumanIntervention: true,
      interventionReason: 'Citoyen non trouvé dans la base nationale. Vérification d\'identité manuelle requise.',
      riskLevel: 'high',
      summary: 'Citoyen introuvable dans la base de données nationale',
    }
  }

  checks.push({
    id: 'citizen-exists',
    label: 'Citoyen trouvé dans la base',
    status: 'passed',
    detail: `${citizen.firstName} ${citizen.name} — NIN: ${citizen.nin} — ${citizen.address}`,
    autoCorrectable: false,
  })

  // ─── CHECK 2: Identity match ────────────────────────────────────────────
  const nameMatch = citizen.name === citizenData.name && citizen.firstName === citizenData.firstName
  checks.push({
    id: 'identity-match',
    label: 'Concordance nom/prénom',
    status: nameMatch ? 'passed' : 'failed',
    detail: nameMatch
      ? `Les nom et prénom correspondent : ${citizen.firstName} ${citizen.name}`
      : `Incohérence : base = ${citizen.firstName} ${citizen.name}, demande = ${citizenData.firstName} ${citizenData.name}`,
    autoCorrectable: false,
  })

  // ─── CHECK 3: Contact info match ────────────────────────────────────────
  const phoneMatch = citizen.phone === citizenData.phone
  checks.push({
    id: 'phone-match',
    label: 'Concordance téléphone',
    status: phoneMatch ? 'passed' : 'warning',
    detail: phoneMatch
      ? `Numéro de téléphone vérifié : ${citizen.phone}`
      : `Numéro différent : base = ${citizen.phone}, demande = ${citizenData.phone}`,
    autoCorrectable: false,
  })

  // ─── CHECK 4: Deceased check ────────────────────────────────────────────
  checks.push({
    id: 'not-deceased',
    label: 'Citoyen vivant',
    status: citizen.isDeceased ? 'failed' : 'passed',
    detail: citizen.isDeceased ? 'Le citoyen est déclaré décédé dans la base.' : 'Le citoyen est en vie.',
    autoCorrectable: false,
  })

  if (!rule) {
    // No specific rule - default to manual processing
    return {
      isValid: checks.every(c => c.status !== 'failed'),
      citizenFound: true,
      checks,
      autoProcessable: false,
      requiresHumanIntervention: true,
      interventionReason: 'Règles d\'éligibilité non définies pour ce service.',
      riskLevel: 'medium',
      summary: 'Vérification partielle — règles d\'éligibilité manquantes',
    }
  }

  // ─── CHECK 5: Nationality ───────────────────────────────────────────────
  if (rule.requiresGuineanNationality) {
    checks.push({
      id: 'nationality',
      label: 'Nationalité guinéenne',
      status: citizen.nationality === 'guinéenne' ? 'passed' : 'failed',
      detail: citizen.nationality === 'guinéenne'
        ? 'Nationalité guinéenne confirmée'
        : `Nationalité : ${citizen.nationality} — Ce service requiert la nationalité guinéenne`,
      autoCorrectable: false,
    })
  }

  // ─── CHECK 6: Adult ─────────────────────────────────────────────────────
  if (rule.requiresAdult) {
    checks.push({
      id: 'adult',
      label: 'Majeur (18+ ans)',
      status: !citizen.isMinor ? 'passed' : 'failed',
      detail: citizen.isMinor
        ? 'Le citoyen est mineur. Ce service requiert la majorité.'
        : 'Citoyen majeur confirmé',
      autoCorrectable: false,
    })
  }

  // ─── CHECK 7: CNI ───────────────────────────────────────────────────────
  if (rule.requiresCNI) {
    const hasValidCNI = citizen.hasCNI && (citizen.cniExpiry ? new Date(citizen.cniExpiry) > new Date() : true)
    checks.push({
      id: 'cni',
      label: 'Carte d\'identité nationale valide',
      status: hasValidCNI ? 'passed' : citizen.hasCNI ? 'warning' : 'failed',
      detail: hasValidCNI
        ? `CNI valide : ${citizen.cniNumber} (expire le ${citizen.cniExpiry})`
        : citizen.hasCNI
          ? `CNI expirée : ${citizen.cniNumber} (expirée le ${citizen.cniExpiry})`
          : 'Aucune CNI enregistrée dans la base',
      autoCorrectable: false,
    })
  }

  // ─── CHECK 8: Birth certificate ─────────────────────────────────────────
  if (rule.requiresBirthCertificate) {
    checks.push({
      id: 'birth-cert',
      label: 'Acte de naissance',
      status: citizen.hasBirthCertificate ? 'passed' : 'failed',
      detail: citizen.hasBirthCertificate
        ? `Acte de naissance enregistré : ${citizen.birthCertificateNumber}`
        : 'Aucun acte de naissance trouvé dans la base',
      autoCorrectable: false,
    })
  }

  // ─── CHECK 9: Residence certificate ─────────────────────────────────────
  if (rule.requiresResidenceCertificate) {
    const certValid = citizen.hasResidenceCertificate && citizen.residenceCertificateDate
      && (Date.now() - new Date(citizen.residenceCertificateDate).getTime() < 90 * 86400000) // Less than 3 months old
    checks.push({
      id: 'residence-cert',
      label: 'Certificat de résidence (< 3 mois)',
      status: certValid ? 'passed' : citizen.hasResidenceCertificate ? 'warning' : 'failed',
      detail: certValid
        ? `Certificat de résidence valide (délivré le ${citizen.residenceCertificateDate})`
        : citizen.hasResidenceCertificate
          ? `Certificat de résidence trop ancien (délivré le ${citizen.residenceCertificateDate})`
          : 'Aucun certificat de résidence enregistré',
      autoCorrectable: false,
    })
  }

  // ─── CHECK 10: NIF ──────────────────────────────────────────────────────
  if (rule.requiresNIF) {
    checks.push({
      id: 'nif',
      label: 'Numéro d\'Identification Fiscale',
      status: citizen.hasNIF ? 'passed' : 'failed',
      detail: citizen.hasNIF
        ? `NIF : ${citizen.nifNumber}`
        : 'Aucun NIF enregistré',
      autoCorrectable: false,
    })
  }

  // ─── CHECK 11: Tax compliance ───────────────────────────────────────────
  if (rule.requiresTaxCompliance) {
    checks.push({
      id: 'tax-compliance',
      label: 'Conformité fiscale',
      status: citizen.taxCompliant ? 'passed' : 'failed',
      detail: citizen.taxCompliant
        ? 'Situation fiscale conforme — quitus fiscal en règle'
        : 'Situation fiscale non conforme — impôts impayés détectés',
      autoCorrectable: false,
    })
  }

  // ─── CHECK 12: Criminal record ──────────────────────────────────────────
  if (rule.requiresCriminalRecordClear) {
    checks.push({
      id: 'criminal-record',
      label: 'Casier judiciaire vierge',
      status: citizen.criminalRecordClear ? 'passed' : 'failed',
      detail: citizen.criminalRecordClear
        ? 'Casier judiciaire vierge — aucune condamnation'
        : 'Antécédents judiciaires détectés — vérification manuelle requise',
      autoCorrectable: false,
    })
  }

  // ─── CHECK 13: Biometric ────────────────────────────────────────────────
  if (rule.requiresBiometric) {
    checks.push({
      id: 'biometric',
      label: 'Vérification biométrique',
      status: citizen.biometricVerified ? 'passed' : 'failed',
      detail: citizen.biometricVerified
        ? 'Empreintes biométriques vérifiées'
        : 'Vérification biométrique requise — rendez-vous nécessaire',
      autoCorrectable: false,
    })
  }

  // ─── DETERMINE RESULT ───────────────────────────────────────────────────
  const hasFailures = checks.some(c => c.status === 'failed')
  const hasWarnings = checks.some(c => c.status === 'warning')

  const canAutoProcess = rule.autoProcessIfEligible && !hasFailures && !hasWarnings
  const needsHumanIntervention = hasFailures || !rule.autoProcessIfEligible || hasWarnings

  let interventionReason: string | undefined
  if (hasFailures) {
    const failedChecks = checks.filter(c => c.status === 'failed')
    interventionReason = `Vérification(s) échouée(s) : ${failedChecks.map(c => c.label).join(', ')}`
  } else if (hasWarnings) {
    interventionReason = 'Des avertissements nécessitent une vérification humaine'
  } else if (!rule.autoProcessIfEligible) {
    interventionReason = 'Ce service nécessite une validation humaine par réglementation'
  }

  const riskLevel: 'low' | 'medium' | 'high' = hasFailures ? 'high' : hasWarnings ? 'medium' : 'low'

  const passedCount = checks.filter(c => c.status === 'passed').length
  const summary = hasFailures
    ? `Vérification échouée — ${passedCount}/${checks.length} contrôles passés, ${checks.filter(c => c.status === 'failed').length} échoué(s)`
    : hasWarnings
      ? `Vérification partielle — ${passedCount}/${checks.length} contrôles passés, ${checks.filter(c => c.status === 'warning').length} avertissement(s)`
      : canAutoProcess
        ? `Vérification complète — ${checks.length}/${checks.length} contrôles passés — Auto-traitement possible`
        : `Vérification complète — ${checks.length}/${checks.length} contrôles passés — Validation humaine requise`

  return {
    isValid: !hasFailures,
    citizenFound: true,
    checks,
    autoProcessable: canAutoProcess,
    requiresHumanIntervention: needsHumanIntervention,
    interventionReason,
    riskLevel,
    summary,
  }
}

// ─── AUTO-PROCESS ELIGIBLE SERVICES ──────────────────────────────────────────
// These services can be fully auto-processed when all verification checks pass

export function canAutoProcessService(serviceId: string): boolean {
  const rule = ELIGIBILITY_RULES.find(r => r.serviceId === serviceId)
  return rule?.autoProcessIfEligible || false
}

export function getServiceMaxAutoDays(serviceId: string): number {
  const rule = ELIGIBILITY_RULES.find(r => r.serviceId === serviceId)
  return rule?.maxAutoProcessDays || 5
}

export function getEligibilityRule(serviceId: string): EligibilityRule | undefined {
  return ELIGIBILITY_RULES.find(r => r.serviceId === serviceId)
}

// ─── SEARCH & UTILITY FUNCTIONS ──────────────────────────────────────────────

export function searchCitizens(query: string): CitizenRecord[] {
  const q = query.toLowerCase().trim()
  if (!q) return CITIZEN_DATABASE
  return CITIZEN_DATABASE.filter(c =>
    c.nin.toLowerCase().includes(q) ||
    c.name.toLowerCase().includes(q) ||
    c.firstName.toLowerCase().includes(q) ||
    (c.birthCertificateNumber || '').toLowerCase().includes(q) ||
    c.commune.toLowerCase().includes(q) ||
    c.prefecture.toLowerCase().includes(q) ||
    c.phone.includes(q) ||
    c.email.toLowerCase().includes(q)
  )
}

export function searchBirthCertificates(query: string): CitizenRecord[] {
  const q = query.toLowerCase().trim()
  if (!q) return CITIZEN_DATABASE.filter(c => c.hasBirthCertificate)
  return CITIZEN_DATABASE.filter(c =>
    c.hasBirthCertificate && (
      c.nin.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.firstName.toLowerCase().includes(q) ||
      (c.birthCertificateNumber || '').toLowerCase().includes(q) ||
      c.placeOfBirth.toLowerCase().includes(q) ||
      c.commune.toLowerCase().includes(q) ||
      (c.birthCertificateDetail?.fatherName || '').toLowerCase().includes(q) ||
      (c.birthCertificateDetail?.motherName || '').toLowerCase().includes(q)
    )
  )
}

export function getBirthCertificateByActNumber(actNumber: string): CitizenRecord | null {
  return CITIZEN_DATABASE.find(c => c.birthCertificateNumber === actNumber) || null
}

export function getCitizensByCommune(commune: string): CitizenRecord[] {
  return CITIZEN_DATABASE.filter(c => c.commune.toLowerCase() === commune.toLowerCase())
}

export function getCitizensByPrefecture(prefecture: string): CitizenRecord[] {
  return CITIZEN_DATABASE.filter(c => c.prefecture.toLowerCase() === prefecture.toLowerCase())
}

export function getDatabaseStats() {
  const all = CITIZEN_DATABASE
  return {
    totalCitizens: all.length,
    withBirthCertificate: all.filter(c => c.hasBirthCertificate).length,
    withCNI: all.filter(c => c.hasCNI).length,
    withPassport: all.filter(c => c.hasPassport).length,
    withMarriageCertificate: all.filter(c => c.hasMarriageCertificate).length,
    minors: all.filter(c => c.isMinor).length,
    employed: all.filter(c => c.isEmployed).length,
    identityVerified: all.filter(c => c.identityVerified).length,
    biometricVerified: all.filter(c => c.biometricVerified).length,
    taxCompliant: all.filter(c => c.taxCompliant).length,
    byRegion: [...new Set(all.map(c => c.region))].map(r => ({
      region: r,
      count: all.filter(c => c.region === r).length
    })),
    byCommune: [...new Set(all.map(c => c.commune))].map(comm => ({
      commune: comm,
      count: all.filter(c => c.commune === comm).length
    })),
  }
}
