import {
  Baby, Heart, Church, Shield, Scale, FileText, Stamp, IdCard, Globe, Car,
  Building2, Briefcase, BookOpen, GraduationCap, Award, Stethoscope, Home,
  MapPin, Landmark, Receipt, Calculator, Coins
} from 'lucide-react'
import type React from 'react'

// ─── ICON MAP ────────────────────────────────────────────────────────────────
export const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Baby, Heart, Church, Shield, Scale, FileText, Stamp, IdCard, Globe, Car,
  Building2, Briefcase, BookOpen, GraduationCap, Award, Stethoscope, Home,
  MapPin, Landmark, Receipt, Calculator, Coins,
}

// ─── INTERFACES ──────────────────────────────────────────────────────────────
export interface DocumentTemplate {
  title: string
  header: string
  body: string[]
  footer: string
  securityLevel: 'PUBLIC' | 'OFFICIEL' | 'CONFIDENTIEL'
  watermarkText: string
  validityPeriod: string
  issuingAuthority: string
  legalReference: string
}

export interface ServiceItem {
  id: string
  name: string
  description: string
  icon: string
  price: string
  delay: string
  requiredDocs: string[]
  documentTemplate: DocumentTemplate
  requiresAccount: boolean
}

export interface ServiceCategory {
  id: string
  name: string
  color: string
  bgColor: string
  iconBgColor: string
  textColor: string
  borderColor: string
  iconName: string
  services: ServiceItem[]
}

// ─── 28 SERVICES ACROSS 9 CATEGORIES ─────────────────────────────────────────
export const SERVICE_CATEGORIES: ServiceCategory[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // ÉTAT CIVIL (5)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'etat-civil', name: 'État Civil', color: 'bg-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    iconBgColor: 'bg-blue-100 dark:bg-blue-900/40', textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800/40', iconName: 'Shield',
    services: [
      {
        id: 'ec-1', name: "Extrait d'acte de naissance", description: "Copie intégrale ou extrait d'acte de naissance",
        icon: 'Baby', price: 'Gratuit', delay: '48h',
        requiresAccount: false,
        requiredDocs: ['Carte d\'identité', 'Acte de naissance original ou numéro d\'acte'],
        documentTemplate: {
          title: "EXTRAIT D'ACTE DE NAISSANCE",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nCOMMUNE DE [COMMUNE]\nBUREAU DE L'ÉTAT CIVIL",
          body: [
            "Le soussigné, Officier de l'État Civil de la Commune de [COMMUNE], certifie que les renseignements suivants sont exacts et conformes aux registres de l'état civil :",
            "NOM : [NOM]\nPRÉNOM(S) : [PRÉNOM]\nDate de naissance : [DATE_NAISSANCE]\nLieu de naissance : [LIEU_NAISSANCE]\nSexe : [SEXE]\nNom du père : [NOM_PERE]\nNom de la mère : [NOM_MERE]",
            "L'acte de naissance n° [NUMERO_ACTE] a été enregistré le [DATE_ENREGISTREMENT] sur les registres de la commune de [COMMUNE].",
            "En foi de quoi, le présent extrait est délivré pour servir et valoir ce que de droit."
          ],
          footer: "Fait à [COMMUNE], le [DATE_DELIVRANCE]\nL'Officier de l'État Civil\n[CACHET ET SIGNATURE]",
          securityLevel: 'OFFICIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE',
          validityPeriod: 'Illimitée',
          issuingAuthority: 'Mairie / Commune',
          legalReference: 'Code de la Famille, Art. 34-42',
        },
      },
      {
        id: 'ec-2', name: "Extrait d'acte de mariage", description: "Attestation officielle d'acte de mariage",
        icon: 'Heart', price: 'Gratuit', delay: '48h',
        requiresAccount: true,
        requiredDocs: ['Carte d\'identité', 'Acte de mariage original ou numéro d\'acte'],
        documentTemplate: {
          title: "EXTRAIT D'ACTE DE MARIAGE",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nCOMMUNE DE [COMMUNE]\nBUREAU DE L'ÉTAT CIVIL",
          body: [
            "Le soussigné, Officier de l'État Civil de la Commune de [COMMUNE], certifie que les renseignements suivants sont exacts et conformes aux registres de l'état civil :",
            "ÉPOUX : [NOM_EPOUX] [PRENOM_EPOUX], né le [DATE_NAISSANCE_EPOUX] à [LIEU_NAISSANCE_EPOUX]\nÉPOUSE : [NOM_EPOUSE] [PRENOM_EPOUSE], née le [DATE_NAISSANCE_EPOUSE] à [LIEU_NAISSANCE_EPOUSE]\nDate du mariage : [DATE_MARIAGE]\nLieu du mariage : [LIEU_MARIAGE]\nRégime matrimonial : [REGIME]",
            "L'acte de mariage n° [NUMERO_ACTE] a été enregistré le [DATE_ENREGISTREMENT] sur les registres de la commune de [COMMUNE].",
            "En foi de quoi, le présent extrait est délivré pour servir et valoir ce que de droit."
          ],
          footer: "Fait à [COMMUNE], le [DATE_DELIVRANCE]\nL'Officier de l'État Civil\n[CACHET ET SIGNATURE]",
          securityLevel: 'OFFICIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE',
          validityPeriod: 'Illimitée',
          issuingAuthority: 'Mairie / Commune',
          legalReference: 'Code de la Famille, Art. 107-125',
        },
      },
      {
        id: 'ec-3', name: "Extrait d'acte de décès", description: "Document officiel d'acte de décès",
        icon: 'Church', price: 'Gratuit', delay: '48h',
        requiresAccount: false,
        requiredDocs: ['Carte d\'identité du demandeur', 'Acte de décès original ou numéro'],
        documentTemplate: {
          title: "EXTRAIT D'ACTE DE DÉCÈS",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nCOMMUNE DE [COMMUNE]\nBUREAU DE L'ÉTAT CIVIL",
          body: [
            "Le soussigné, Officier de l'État Civil de la Commune de [COMMUNE], certifie que les renseignements suivants sont exacts et conformes aux registres de l'état civil :",
            "NOM : [NOM]\nPRÉNOM(S) : [PRÉNOM]\nDate de décès : [DATE_DECES]\nLieu de décès : [LIEU_DECES]\nDate de naissance : [DATE_NAISSANCE]\nLieu de naissance : [LIEU_NAISSANCE]\nProfession : [PROFESSION]\nCause du décès : [CAUSE]",
            "L'acte de décès n° [NUMERO_ACTE] a été enregistré le [DATE_ENREGISTREMENT] sur les registres de la commune de [COMMUNE].",
            "En foi de quoi, le présent extrait est délivré pour servir et valoir ce que de droit."
          ],
          footer: "Fait à [COMMUNE], le [DATE_DELIVRANCE]\nL'Officier de l'État Civil\n[CACHET ET SIGNATURE]",
          securityLevel: 'OFFICIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE',
          validityPeriod: 'Illimitée',
          issuingAuthority: 'Mairie / Commune',
          legalReference: 'Code de la Famille, Art. 77-86',
        },
      },
      {
        id: 'ec-4', name: 'Certificat de nationalité', description: "Attestation de nationalité guinéenne",
        icon: 'Shield', price: '5 000 GNF', delay: '5 jours',
        requiresAccount: true,
        requiredDocs: ['Carte d\'identité nationale', 'Extrait d\'acte de naissance', '2 photos d\'identité', 'Certificat de résidence'],
        documentTemplate: {
          title: "CERTIFICAT DE NATIONALITÉ GUINÉENNE",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nTRIBUNAL DE PREMIÈRE INSTANCE DE [VILLE]",
          body: [
            "Nous, Juge du Tribunal de Première Instance de [VILLE], agissant en vertu des dispositions du Code de la Nationalité guinéenne,",
            "Certifions que : [NOM] [PRÉNOM], né(e) le [DATE_NAISSANCE] à [LIEU_NAISSANCE], est de nationalité guinéenne par [MODE_ACQUISITION].",
            "Le présent certificat est délivré sur la base des pièces justificatives suivantes :\n— Extrait d'acte de naissance n° [NUMERO_ACTE]\n— Certificat de résidence délivré par la commune de [COMMUNE]\n— Témoignages conformes requis par la loi",
            "Le présent certificat de nationalité est délivré pour faire valoir ce que de droit. Toute fausse déclaration expose le déclarant aux poursuites prévues par la loi."
          ],
          footer: "Fait à [VILLE], le [DATE_DELIVRANCE]\nLe Juge du Tribunal de Première Instance\n[CACHET DU TRIBUNAL ET SIGNATURE]",
          securityLevel: 'CONFIDENTIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE — CERTIFICAT DE NATIONALITÉ',
          validityPeriod: 'Illimitée',
          issuingAuthority: 'Tribunal de Première Instance',
          legalReference: 'Code de la Nationalité, Loi n°L/2017/004/AN, Art. 12-24',
        },
      },
      {
        id: 'ec-5', name: 'Déclaration de naissance', description: "Enregistrement d'une naissance à l'état civil",
        icon: 'Baby', price: 'Gratuit', delay: '24h',
        requiresAccount: true,
        requiredDocs: ['Certificat médical de naissance', 'Pièce d\'identité d\'un parent', 'Déclaration du père ou de la mère'],
        documentTemplate: {
          title: "DÉCLATION DE NAISSANCE",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nCOMMUNE DE [COMMUNE]\nBUREAU DE L'ÉTAT CIVIL",
          body: [
            "Le soussigné, Officier de l'État Civil de la Commune de [COMMUNE], enregistre la déclaration de naissance suivante :",
            "ENFANT :\nSexe : [SEXE]\nDate de naissance : [DATE_NAISSANCE]\nLieu de naissance : [LIEU_NAISSANCE]\nPrénom(s) déclaré(s) : [PRENOMS]\n\nPÈRE : [NOM_PERE] [PRENOM_PERE], né le [DATE_NAISSANCE_PERE]\nMÈRE : [NOM_MERE] [PRENOM_MERE], née le [DATE_NAISSANCE_MERE]",
            "La déclaration a été faite le [DATE_DECLARATION] par [DECLAREANT], conformément aux dispositions du Code de la Famille.",
            "L'acte de naissance n° [NUMERO_ACTE] est enregistré sur les registres de l'état civil de la commune de [COMMUNE]. Le présent récépissé est délivré pour servir et valoir ce que de droit."
          ],
          footer: "Fait à [COMMUNE], le [DATE_DELIVRANCE]\nL'Officier de l'État Civil\n[CACHET ET SIGNATURE]",
          securityLevel: 'OFFICIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE',
          validityPeriod: 'Récépissé de déclaration',
          issuingAuthority: 'Mairie / Commune',
          legalReference: 'Code de la Famille, Art. 34-42 ; Ordonnance n°011/PRG/87',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // JUSTICE & LÉGAL (3)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'justice', name: 'Justice & Légal', color: 'bg-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    iconBgColor: 'bg-purple-100 dark:bg-purple-900/40', textColor: 'text-purple-600 dark:text-purple-400',
    borderColor: 'border-purple-200 dark:border-purple-800/40', iconName: 'Scale',
    services: [
      {
        id: 'j-1', name: 'Casier judiciaire', description: 'Extrait de casier judiciaire B3',
        icon: 'Scale', price: '5 000 GNF', delay: '5 jours',
        requiresAccount: false,
        requiredDocs: ['Carte d\'identité nationale', '2 photos d\'identité', 'Timbre fiscal'],
        documentTemplate: {
          title: "EXTRAIT DE CASIER JUDICIAIRE (BULLETIN N°3)",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nMINISTÈRE DE LA JUSTICE\nGARDES DES SCEAUX\nSERVICE DU CASIER JUDICIAIRE",
          body: [
            "Le Service du Casier Judiciaire certifie que, d'après les renseignements contenus dans le fichier central du casier judiciaire national :",
            "NOM : [NOM]\nPRÉNOM(S) : [PRÉNOM]\nDate de naissance : [DATE_NAISSANCE]\nLieu de naissance : [LIEU_NAISSANCE]\nNIN : [NIN]\nFils/Fille de : [NOM_PERE] et de [NOM_MERE]",
            "Le casier judiciaire de la personne susnommée [NE CONTIENT AUCUNE CONDAMNATION / CONTIENT LES CONDAMNATIONS SUIVANTES] : [SANS OBJET / DÉTAIL DES CONDAMNATIONS]",
            "Le présent bulletin n°3 est délivré conformément aux dispositions du Code de Procédure Pénale. Il ne peut être utilisé que dans les cas prévus par la loi."
          ],
          footer: "Fait à Conakry, le [DATE_DELIVRANCE]\nLe Greffier en Chef du Casier Judiciaire\n[CACHET DU SERVICE]",
          securityLevel: 'CONFIDENTIEL',
          watermarkText: 'CASIER JUDICIAIRE — CONFIDENTIEL',
          validityPeriod: '3 mois',
          issuingAuthority: 'Ministère de la Justice — Service du Casier Judiciaire',
          legalReference: 'Code de Procédure Pénale, Art. 623-635 ; Loi n°L/2016/018/AN',
        },
      },
      {
        id: 'j-2', name: 'Certificat de non-poursuite', description: 'Attestation de non-poursuite judiciaire',
        icon: 'FileText', price: '3 000 GNF', delay: '3 jours',
        requiresAccount: false,
        requiredDocs: ['Carte d\'identité nationale', 'Casier judiciaire récent'],
        documentTemplate: {
          title: "CERTIFICAT DE NON-POURSUITE",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nMINISTÈRE DE LA JUSTICE\nPROCUREUR DE LA RÉPUBLIQUE PRÈS LE TPI DE [VILLE]",
          body: [
            "Le Procureur de la République près le Tribunal de Première Instance de [VILLE], certifie que :",
            "NOM : [NOM]\nPRÉNOM(S) : [PRÉNOM]\nDate et lieu de naissance : [DATE_NAISSANCE] à [LIEU_NAISSANCE]\nDemeurant à : [ADRESSE]",
            "N'est l'objet d'aucune poursuite pénale en cours devant les juridictions de la République de Guinée, à la date de délivrance du présent certificat.",
            "Le présent certificat est délivré pour faire valoir ce que de droit. Il ne préjuge pas de l'existence de poursuites qui pourraient être engagées postérieurement."
          ],
          footer: "Fait à [VILLE], le [DATE_DELIVRANCE]\nLe Procureur de la République\n[CACHET DU PARQUET ET SIGNATURE]",
          securityLevel: 'OFFICIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE',
          validityPeriod: '3 mois',
          issuingAuthority: 'Ministère de la Justice — Parquet',
          legalReference: 'Code de Procédure Pénale, Art. 1-15 ; Ordonnance n°011/PRG/87',
        },
      },
      {
        id: 'j-3', name: 'Légalisation de documents', description: 'Authentification officielle de documents',
        icon: 'Stamp', price: '2 000 GNF', delay: '24h',
        requiresAccount: true,
        requiredDocs: ['Document original à légaliser', 'Carte d\'identité nationale', 'Photocopie du document'],
        documentTemplate: {
          title: "CERTIFICAT DE LÉGALISATION",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nMINISTÈRE DES AFFAIRES ÉTRANGÈRES\nDIRECTION DE LA COOPÉRATION JURIDIQUE\nSERVICE DE LÉGALISATION",
          body: [
            "Le soussigné, autorité compétente en matière de légalisation, certifie que :",
            "La signature apposée sur le document ci-joint est authentique et a été apposée par [SIGNATAIRE], exerçant la fonction de [FONCTION] au sein de [INSTITUTION].",
            "Le document légalisé porte la référence : [REFERENCE_DOCUMENT], établi le [DATE_DOCUMENT].",
            "La présente légalisation confère au document susvisé une authenticité reconnue conformément aux conventions internationales et aux dispositions légales guinéennes."
          ],
          footer: "Fait à Conakry, le [DATE_DELIVRANCE]\nLe Directeur de la Coopération Juridique\n[CACHET DU MINISTÈRE ET SIGNATURE]",
          securityLevel: 'OFFICIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE — LÉGALISATION',
          validityPeriod: 'Illimitée (selon validité du document)',
          issuingAuthority: 'Ministère des Affaires Étrangères',
          legalReference: 'Décret n°D/2022/PRG/SGG ; Convention de La Haye du 5 octobre 1961',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // IDENTIFICATION (3)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'identification', name: 'Identification', color: 'bg-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20',
    iconBgColor: 'bg-green-100 dark:bg-green-900/40', textColor: 'text-green-600 dark:text-green-400',
    borderColor: 'border-green-200 dark:border-green-800/40', iconName: 'IdCard',
    services: [
      {
        id: 'id-1', name: "Carte d'identité nationale biométrique", description: "CNI biométrique sécurisée avec puces",
        icon: 'IdCard', price: 'Gratuit', delay: '7 jours',
        requiresAccount: true,
        requiredDocs: ['Extrait d\'acte de naissance', 'Certificat de nationalité', '4 photos d\'identité', 'Certificat de résidence', 'Témoin avec CNI valide'],
        documentTemplate: {
          title: "CARTE D'IDENTITÉ NATIONALE BIOMÉTRIQUE",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nAGENCE NATIONALE D'IDENTIFICATION (ANIP)\nCERTIFICAT DE DÉLIVRANCE",
          body: [
            "L'Agence Nationale d'Identification (ANIP) certifie que la Carte Nationale d'Identité Biométrique a été délivrée à :",
            "NOM : [NOM]\nPRÉNOM(S) : [PRÉNOM]\nDate de naissance : [DATE_NAISSANCE]\nLieu de naissance : [LIEU_NAISSANCE]\nSexe : [SEXE]\nTaille : [TAILLE]\nNIN : [NIN]\nN° CNI : [NUMERO_CNI]",
            "Date de délivrance : [DATE_DELIVRANCE]\nDate d'expiration : [DATE_EXPIRATION]\nAutorité de délivrance : ANIP — Centre de [CENTRE]",
            "Cette carte est un document officiel d'identification. Toute falsification ou utilisation frauduleuse est passible de poursuites pénales conformément au Code Pénal."
          ],
          footer: "Fait à Conakry, le [DATE_DELIVRANCE]\nLe Directeur Général de l'ANIP\n[CACHET DE L'ANIP ET SIGNATURE NUMÉRIQUE]",
          securityLevel: 'CONFIDENTIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE — ANIP',
          validityPeriod: '10 ans',
          issuingAuthority: 'Agence Nationale d\'Identification (ANIP)',
          legalReference: 'Loi n°L/2017/004/AN ; Décret n°D/2018/PRG/SGG',
        },
      },
      {
        id: 'id-2', name: 'Passeport biométrique', description: 'Passeport biométrique international',
        icon: 'Globe', price: '150 000 GNF', delay: '10 jours',
        requiresAccount: true,
        requiredDocs: ['Carte d\'identité nationale', 'Extrait d\'acte de naissance', '4 photos d\'identité récentes', 'Certificat de résidence', 'Ancien passeport (si renouvellement)'],
        documentTemplate: {
          title: "PASSEPORT BIOMÉTRIQUE — CERTIFICAT DE DÉLIVRANCE",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nDIRECTION GÉNÉRALE DE L'IMMIGRATION\nSERVICE DES PASSEPORTS",
          body: [
            "La Direction Générale de l'Immigration certifie qu'un Passeport Biométrique a été délivré à :",
            "NOM : [NOM]\nPRÉNOM(S) : [PRÉNOM]\nNationalité : Guinéenne\nDate de naissance : [DATE_NAISSANCE]\nLieu de naissance : [LIEU_NAISSANCE]\nSexe : [SEXE]\nN° Passeport : [NUMERO_PASSEPORT]",
            "Type : P (Passeport ordinaire)\nDate de délivrance : [DATE_DELIVRANCE]\nDate d'expiration : [DATE_EXPIRATION]\nAutorité : DGI — Conakry",
            "Ce passeport est la propriété de la République de Guinée. Toute altération, falsification ou utilisation par une tierce personne est strictement interdite et passible de sanctions pénales."
          ],
          footer: "Fait à Conakry, le [DATE_DELIVRANCE]\nLe Directeur Général de l'Immigration\n[CACHET DE LA DGI ET SIGNATURE]",
          securityLevel: 'CONFIDENTIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE — PASSEPORT',
          validityPeriod: '5 ans',
          issuingAuthority: 'Direction Générale de l\'Immigration',
          legalReference: 'Loi n°L/2018/022/AN sur la migration ; Convention de Chicago, Art. 13',
        },
      },
      {
        id: 'id-3', name: 'Permis de conduire', description: 'Permis de conduire national ou international',
        icon: 'Car', price: '25 000 GNF', delay: '10 jours',
        requiresAccount: true,
        requiredDocs: ['Carte d\'identité nationale', 'Certificat médical d\'aptitude', 'Attestation de réussite auto-école', '4 photos d\'identité', 'Ancien permis (si renouvellement)'],
        documentTemplate: {
          title: "PERMIS DE CONDUIRE — CERTIFICAT DE DÉLIVRANCE",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nMINISTÈRE DES TRANSPORTS\nDIRECTION NATIONALE DES TRANSPORTS TERRESTRES\nSERVICE DES PERMIS DE CONDUIRE",
          body: [
            "Le Service des Permis de Conduire certifie qu'un Permis de Conduire a été délivré à :",
            "NOM : [NOM]\nPRÉNOM(S) : [PRÉNOM]\nDate de naissance : [DATE_NAISSANCE]\nLieu de naissance : [LIEU_NAISSANCE]\nN° Permis : [NUMERO_PERMIS]\nCatégorie(s) : [CATEGORIES]",
            "Date de délivrance : [DATE_DELIVRANCE]\nDate d'expiration : [DATE_EXPIRATION]\nRestrictions : [SANS OBJET / RESTRICTIONS]",
            "Le titulaire du présent permis est autorisé(e) à conduire les véhicules de la catégorie susmentionnée sur le territoire national et international, conformément aux conventions en vigueur."
          ],
          footer: "Fait à Conakry, le [DATE_DELIVRANCE]\nLe Directeur National des Transports Terrestres\n[CACHET ET SIGNATURE]",
          securityLevel: 'OFFICIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE — PERMIS DE CONDUIRE',
          validityPeriod: '5 ans (renouvelable)',
          issuingAuthority: 'Ministère des Transports — DNTT',
          legalReference: 'Code de la Route, Loi n°L/2018/015/AN ; Convention de Vienne sur la circulation routière',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // URBANISME & CONSTRUCTION (3)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'urbanisme', name: 'Urbanisme & Construction', color: 'bg-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    iconBgColor: 'bg-orange-100 dark:bg-orange-900/40', textColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-200 dark:border-orange-800/40', iconName: 'Building2',
    services: [
      {
        id: 'u-1', name: 'Permis de construire', description: 'Autorisation de construction immobilière',
        icon: 'Building2', price: '50 000 GNF', delay: '15 jours',
        requiresAccount: true,
        requiredDocs: ['Plan de construction certifié', 'Titre foncier ou bail', 'Étude d\'impact environnemental', 'Plan de situation du terrain', 'Carte d\'identité'],
        documentTemplate: {
          title: "PERMIS DE CONSTRUIRE",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nCOMMUNE DE [COMMUNE]\nDIRECTION DE L'URBANISME ET DE LA CONSTRUCTION",
          body: [
            "Le Maire de la Commune de [COMMUNE], sur avis conforme de la Direction de l'Urbanisme, autorise :",
            "Titulaire : [NOM] [PRÉNOM], demeurant à [ADRESSE]\nÀ construire sur la parcelle : [REFERENCE_PARCELLE]\nSise à : [ADRESSE_TERRAIN]\nSurface du terrain : [SURFACE] m²\nSurface constructible : [SURFACE_CONSTRUCTIBLE] m²",
            "Nature des travaux : [NATURE_TRAVAUX]\nNombre de niveaux autorisés : [NIVEAUX]\nDate de validité du permis : [DATE_VALIDITE]",
            "Le présent permis est délivré sous réserve du respect des règles d'urbanisme, du Code de la Construction et de la réglementation environnementale en vigueur. Toute infraction entraînera l'annulation du permis et des poursuites."
          ],
          footer: "Fait à [COMMUNE], le [DATE_DELIVRANCE]\nLe Maire de la Commune\n[CACHET DE LA MAIRIE ET SIGNATURE]",
          securityLevel: 'OFFICIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE — PERMIS DE CONSTRUIRE',
          validityPeriod: '2 ans (renouvelable)',
          issuingAuthority: 'Mairie / Direction de l\'Urbanisme',
          legalReference: 'Code de l\'Urbanisme, Loi n°L/2019/008/AN ; Code de la Construction',
        },
      },
      {
        id: 'u-2', name: 'Permis de lotir', description: "Autorisation de division d'un terrain en lots",
        icon: 'MapPin', price: '25 000 GNF', delay: '10 jours',
        requiresAccount: true,
        requiredDocs: ['Titre foncier', 'Plan de bornage', 'Plan de lotissement', 'Étude d\'impact environnemental', 'Carte d\'identité'],
        documentTemplate: {
          title: "PERMIS DE LOTIR",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nCOMMUNE DE [COMMUNE]\nDIRECTION DE L'URBANISME",
          body: [
            "Le Maire de la Commune de [COMMUNE], sur avis conforme de la Direction de l'Urbanisme, autorise le lotissement suivant :",
            "Demandeur : [NOM] [PRÉNOM]\nTerrain situé à : [ADRESSE_TERRAIN]\nSuperficie totale : [SUPERFICIE_TOTALE] m²\nNombre de lots : [NOMBRE_LOTS]\nSurface des lots : de [SURFACE_MIN] m² à [SURFACE_MAX] m²",
            "Référence cadastrale : [REFERENCE_CADASTRALE]\nÉquipements publics prévus : [EQUIPEMENTS]\nVoirie prévue : [VOIRIE]",
            "Le présent permis est soumis aux conditions de viabilisation du lotissement (voirie, eau, électricité, assainissement). Le non-respect de ces conditions entraîne l'annulation du permis."
          ],
          footer: "Fait à [COMMUNE], le [DATE_DELIVRANCE]\nLe Maire de la Commune\n[CACHET DE LA MAIRIE ET SIGNATURE]",
          securityLevel: 'OFFICIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE — PERMIS DE LOTIR',
          validityPeriod: '3 ans',
          issuingAuthority: 'Mairie / Direction de l\'Urbanisme',
          legalReference: 'Code de l\'Urbanisme, Art. 45-58 ; Loi n°L/2019/008/AN',
        },
      },
      {
        id: 'u-3', name: 'Certificat de conformité', description: "Conformité d'un bâtiment aux normes",
        icon: 'FileText', price: '15 000 GNF', delay: '7 jours',
        requiresAccount: true,
        requiredDocs: ['Permis de construire', 'Plan de construction', 'Rapport de visite technique', 'Certificat de raccordement', 'Carte d\'identité'],
        documentTemplate: {
          title: "CERTIFICAT DE CONFORMITÉ",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nCOMMUNE DE [COMMUNE]\nDIRECTION DE L'URBANISME ET DE LA CONSTRUCTION\nSERVICE DES CONTRÔLES TECHNIQUES",
          body: [
            "La Direction de l'Urbanisme et de la Construction certifie que le bâtiment ci-après désigné a été construit conformément au permis de construire et aux normes en vigueur :",
            "Propriétaire : [NOM] [PRÉNOM]\nAdresse du bâtiment : [ADRESSE_BATIMENT]\nRéf. Permis de construire : [REFERENCE_PERMIS]\nDate d'achèvement des travaux : [DATE_ACHEVEMENT]",
            "Contrôle technique effectué le [DATE_CONTROLE] par l'ingénieur [NOM_INGENIEUR].\nRésultat : [CONFORME / CONFORME AVEC RÉSERVES]\nRéserves éventuelles : [SANS OBJET / DÉTAIL DES RÉSERVES]",
            "Le présent certificat est délivré pour l'ouverture du bâtiment et son occupation légale."
          ],
          footer: "Fait à [COMMUNE], le [DATE_DELIVRANCE]\nLe Directeur de l'Urbanisme et de la Construction\n[CACHET ET SIGNATURE]",
          securityLevel: 'OFFICIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE — CONFORMITÉ',
          validityPeriod: 'Illimitée (sauf modification structurelle)',
          issuingAuthority: 'Direction de l\'Urbanisme',
          legalReference: 'Code de la Construction, Art. 89-102 ; Décret n°D/2020/PRG/SGG',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ENTREPRISE & COMMERCE (3)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'entreprise', name: 'Entreprise & Commerce', color: 'bg-teal-600', bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    iconBgColor: 'bg-teal-100 dark:bg-teal-900/40', textColor: 'text-teal-600 dark:text-teal-400',
    borderColor: 'border-teal-200 dark:border-teal-800/40', iconName: 'Briefcase',
    services: [
      {
        id: 'e-1', name: 'Enregistrement entreprise (APIP)', description: "Création d'entreprise via l'APIP",
        icon: 'Briefcase', price: '50 000 GNF', delay: '3 jours',
        requiresAccount: true,
        requiredDocs: ['Statuts de l\'entreprise', 'Pièce d\'identité du gérant', 'Casier judiciaire du gérant', 'Attestation de siège social', 'Capital social minimum'],
        documentTemplate: {
          title: "CERTIFICAT D'ENREGISTREMENT D'ENTREPRISE",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nAGENCE DE PROMOTION DES INVESTISSEMENTS PRIVÉS (APIP)\nGUICHET UNIQUE DE CRÉATION D'ENTREPRISE",
          body: [
            "L'Agence de Promotion des Investissements Privés (APIP) certifie que l'entreprise suivante a été dûment enregistrée :",
            "Dénomination sociale : [RAISON_SOCIALE]\nForme juridique : [FORME_JURIDIQUE]\nCapital social : [CAPITAL] GNF\nSiège social : [ADRESSE_SIEGE]\nNIF : [NIF]\nDate d'immatriculation : [DATE_IMMATRICULATION]",
            "Gérant / Représentant légal : [NOM_GERANT] [PRENOM_GERANT]\nActivité principale : [ACTIVITE]\nCode NAF : [CODE_NAF]",
            "L'entreprise est enregistrée conformément aux dispositions du Code Civil et du Code de Commerce guinéens. Le présent certificat vaut attestation d'existence légale."
          ],
          footer: "Fait à Conakry, le [DATE_DELIVRANCE]\nLe Directeur Général de l'APIP\n[CACHET DE L'APIP ET SIGNATURE]",
          securityLevel: 'OFFICIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE — APIP',
          validityPeriod: 'Illimitée (sous réserve de mise à jour annuelle)',
          issuingAuthority: 'APIP — Agence de Promotion des Investissements Privés',
          legalReference: 'Code de Commerce, Art. 1-45 ; Loi n°L/2017/003/AN sur les sociétés commerciales',
        },
      },
      {
        id: 'e-2', name: 'Registre de commerce (RCCM)', description: 'Immatriculation au RCCM',
        icon: 'BookOpen', price: '100 000 GNF', delay: '7 jours',
        requiresAccount: true,
        requiredDocs: ['Statuts enregistrés', 'Carte d\'identité du gérant', 'Certificat de résidence', 'Attestation APIP'],
        documentTemplate: {
          title: "EXTRAIT DU REGISTRE DU COMMERCE ET DU CRÉDIT MOBILIER (RCCM)",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nTRIBUNAL DE COMMERCE DE CONAKRY\nGREFFE DU REGISTRE DU COMMERCE",
          body: [
            "Le Greffier du Tribunal de Commerce certifie que l'inscription suivante a été effectuée au Registre du Commerce et du Crédit Mobilier :",
            "Dénomination : [RAISON_SOCIALE]\nN° RCCM : GN-CON-[NUMERO_RCCM]\nForme juridique : [FORME_JURIDIQUE]\nCapital : [CAPITAL] GNF\nSiège social : [ADRESSE_SIEGE]",
            "Gérant / Président : [NOM_GERANT] [PRENOM_GERANT]\nActivité : [ACTIVITE]\nDate d'immatriculation : [DATE_IMMATRICULATION]",
            "L'immatriculation au RCCM confère à l'entreprise la personnalité juridique commerciale conformément au Code de Commerce."
          ],
          footer: "Fait à Conakry, le [DATE_DELIVRANCE]\nLe Greffier en Chef du Tribunal de Commerce\n[CACHET DU TRIBUNAL ET SIGNATURE]",
          securityLevel: 'OFFICIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE — RCCM',
          validityPeriod: 'Illimitée (renouvellement annuel requis)',
          issuingAuthority: 'Tribunal de Commerce — Greffe',
          legalReference: 'Code de Commerce, Art. 456-472 ; Acte Uniforme OHADA',
        },
      },
      {
        id: 'e-3', name: 'Licence d\'importation', description: "Autorisation d'importation de marchandises",
        icon: 'Globe', price: '75 000 GNF', delay: '5 jours',
        requiresAccount: true,
        requiredDocs: ['RCCM', 'NIF', 'Carte d\'identité du gérant', 'Liste des produits à importer', 'Attestation de conformité sanitaire (si applicable)'],
        documentTemplate: {
          title: "LICENCE D'IMPORTATION",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nMINISTÈRE DU COMMERCE, DE L'INDUSTRIE ET DES PME\nDIRECTION NATIONALE DU COMMERCE EXTÉRIEUR",
          body: [
            "Le Ministère du Commerce, de l'Industrie et des PME autorise l'entreprise ci-après désignée à importer les marchandises suivantes :",
            "Titulaire : [RAISON_SOCIALE]\nN° RCCM : [NUMERO_RCCM]\nNIF : [NIF]\nAdresse : [ADRESSE]",
            "Catégories de produits autorisés : [CATEGORIES_PRODUITS]\nPays d'origine : [PAYS_ORIGINE]\nPoints d'entrée autorisés : [POINTS_ENTREE]",
            "La présente licence est délivrée pour une durée d'un an renouvelable. L'importation de marchandises prohibées ou soumises à restriction est exclue du présent autorisation."
          ],
          footer: "Fait à Conakry, le [DATE_DELIVRANCE]\nLe Directeur National du Commerce Extérieur\n[CACHET DU MINISTÈRE ET SIGNATURE]",
          securityLevel: 'OFFICIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE — LICENCE IMPORT',
          validityPeriod: '1 an (renouvelable)',
          issuingAuthority: 'Ministère du Commerce — DNCE',
          legalReference: 'Code du Commerce Extérieur ; Loi n°L/2019/012/AN ; Décret n°D/2021/PRG/SGG',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ÉDUCATION (3)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'education', name: 'Éducation', color: 'bg-indigo-600', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    iconBgColor: 'bg-indigo-100 dark:bg-indigo-900/40', textColor: 'text-indigo-600 dark:text-indigo-400',
    borderColor: 'border-indigo-200 dark:border-indigo-800/40', iconName: 'GraduationCap',
    services: [
      {
        id: 'ed-1', name: 'Attestation de scolarité', description: "Certificat de fréquentation scolaire",
        icon: 'GraduationCap', price: 'Gratuit', delay: '48h',
        requiresAccount: false,
        requiredDocs: ['Carte d\'identité', 'Certificat d\'inscription', 'Dernier bulletin scolaire'],
        documentTemplate: {
          title: "ATTESTATION DE SCOLARITÉ",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nMINISTÈRE DE L'ÉDUCATION NATIONALE ET DE L'ALPHABÉTISATION\n[ÉTABLISSEMENT SCOLAIRE]",
          body: [
            "Le Directeur / La Directrice de [ÉTABLISSEMENT] certifie que :",
            "NOM : [NOM]\nPRÉNOM(S) : [PRÉNOM]\nDate de naissance : [DATE_NAISSANCE]\nClasse : [CLASSE]\nAnnée scolaire : [ANNEE_SCOLAIRE]",
            "Est régulièrement inscrit(e) dans cet établissement pour l'année scolaire en cours et y poursuit sa scolarité dans les conditions normales.",
            "La présente attestation est délivrée pour servir et valoir ce que de droit."
          ],
          footer: "Fait à [VILLE], le [DATE_DELIVRANCE]\nLe Directeur de l'Établissement\n[CACHET DE L'ÉTABLISSEMENT ET SIGNATURE]",
          securityLevel: 'PUBLIC',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE',
          validityPeriod: 'Année scolaire en cours',
          issuingAuthority: 'Établissement scolaire',
          legalReference: 'Loi d\'orientation de l\'Éducation, Loi n°L/2019/007/AN',
        },
      },
      {
        id: 'ed-2', name: 'Diplôme et relevé de notes', description: 'Copie certifiée de diplôme et relevé',
        icon: 'Award', price: '10 000 GNF', delay: '5 jours',
        requiresAccount: true,
        requiredDocs: ['Carte d\'identité', 'Numéro matricule', 'Ancien diplôme (si duplicata)'],
        documentTemplate: {
          title: "RELEVÉ DE NOTES — CERTIFICAT DE DIPLOME",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nMINISTÈRE DE L'ÉDUCATION NATIONALE\n[ÉTABLISSEMENT]\nSECRÉTARIAT GÉNÉRAL",
          body: [
            "Le Secrétariat Général de [ÉTABLISSEMENT] certifie l'exactitude des notes et du diplôme suivants :",
            "NOM : [NOM]\nPRÉNOM(S) : [PRÉNOM]\nDate de naissance : [DATE_NAISSANCE]\nMatricule : [MATRICULE]\nFilière : [FILIERE]\nAnnée d'obtention : [ANNEE_OBTENTION]",
            "Diplôme obtenu : [DIPLOME]\nMention : [MENTION]\n\nMoyenne générale : [MOYENNE]/20\nClassement : [CLASSEMENT] / [EFFECTIF]",
            "Le présent relevé est délivré en copie certifiée conforme à l'original."
          ],
          footer: "Fait à [VILLE], le [DATE_DELIVRANCE]\nLe Secrétaire Général\n[CACHET DE L'ÉTABLISSEMENT ET SIGNATURE]",
          securityLevel: 'OFFICIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE — DIPLOME',
          validityPeriod: 'Illimitée',
          issuingAuthority: 'Établissement scolaire / Ministère de l\'Éducation',
          legalReference: 'Loi d\'orientation de l\'Éducation, Loi n°L/2019/007/AN ; Décret n°D/2020/PRG/SGG',
        },
      },
      {
        id: 'ed-3', name: 'Équivalence de diplôme', description: "Reconnaissance d'un diplôme étranger",
        icon: 'Award', price: '25 000 GNF', delay: '15 jours',
        requiresAccount: true,
        requiredDocs: ['Diplôme original', 'Traduction certifiée', 'Relevé de notes', 'Carte d\'identité', 'Programme de formation'],
        documentTemplate: {
          title: "CERTIFICAT D'ÉQUIVALENCE DE DIPLÔME",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nMINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR, DE LA RECHERCHE SCIENTIFIQUE ET DE L'INNOVATION\nCOMMISSION NATIONALE D'ÉQUIVALENCE DES DIPLÔMES",
          body: [
            "La Commission Nationale d'Équivalence des Diplômes certifie que :",
            "Le diplôme : [DIPLOME_ETRANGER]\nDélivré par : [ETABLISSEMENT_ETRANGER]\nPays : [PAYS]\nÀ : [NOM] [PRÉNOM], né(e) le [DATE_NAISSANCE]",
            "Est déclaré équivalent au diplôme guinéen : [DIPLOME_GUINEEN]\nNiveau : [NIVEAU] (Bac+[NIVEAU_LMD])\nDécision n° : [NUMERO_DECISION] en date du [DATE_DECISION]",
            "La présente équivalence est accordée sous réserve de l'authenticité des documents produits. Toute fraude entraîne l'annulation de l'équivalence."
          ],
          footer: "Fait à Conakry, le [DATE_DELIVRANCE]\nLe Président de la Commission Nationale d'Équivalence\n[CACHET DU MINISTÈRE ET SIGNATURE]",
          securityLevel: 'CONFIDENTIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE — ÉQUIVALENCE',
          validityPeriod: 'Illimitée',
          issuingAuthority: 'Commission Nationale d\'Équivalence des Diplômes',
          legalReference: 'Loi n°L/2017/006/AN sur l\'enseignement supérieur ; Décret n°D/2019/PRG/SGG',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SANTÉ (3)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'sante', name: 'Santé', color: 'bg-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20',
    iconBgColor: 'bg-red-100 dark:bg-red-900/40', textColor: 'text-red-600 dark:text-red-400',
    borderColor: 'border-red-200 dark:border-red-800/40', iconName: 'Stethoscope',
    services: [
      {
        id: 's-1', name: 'Certificat de vaccination', description: 'Carnet ou certificat de vaccination international',
        icon: 'Stethoscope', price: 'Gratuit', delay: '24h',
        requiresAccount: false,
        requiredDocs: ['Carte d\'identité', 'Ancien carnet de vaccination (si disponible)'],
        documentTemplate: {
          title: "CERTIFICAT INTERNATIONAL DE VACCINATION",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nMINISTÈRE DE LA SANTÉ ET DE L'HYGIÈNE PUBLIQUE\nDIRECTION NATIONALE DE LA SANTÉ\nCENTRE DE VACCINATION DE [VILLE]",
          body: [
            "Le Centre de Vaccination certifie que :",
            "NOM : [NOM]\nPRÉNOM(S) : [PRÉNOM]\nDate de naissance : [DATE_NAISSANCE]\nNationalité : Guinéenne\nN° Carte de vaccination : [NUMERO_CARTE]",
            "A reçu les vaccinations suivantes :\n— Fièvre jaune : [DATE_VACCIN_FJ], valide jusqu'au [DATE_VALIDITE_FJ]\n— Hépatite B : [DATE_VACCIN_HB]\n— BCG : [DATE_VACCIN_BCG]\n— Autres : [AUTRES_VACCINS]",
            "Ce certificat est délivré conformément au Règlement Sanitaire International (RSI 2005) de l'OMS."
          ],
          footer: "Fait à [VILLE], le [DATE_DELIVRANCE]\nLe Médecin Responsable du Centre de Vaccination\n[CACHET ET SIGNATURE]",
          securityLevel: 'OFFICIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE — VACCINATION',
          validityPeriod: 'Selon vaccin (Fièvre jaune : vie entière)',
          issuingAuthority: 'Ministère de la Santé — Centre de vaccination',
          legalReference: 'Règlement Sanitaire International (OMS, RSI 2005) ; Code de la Santé Publique guinéen',
        },
      },
      {
        id: 's-2', name: 'Carte sanitaire', description: "Carte nationale d'assurance maladie",
        icon: 'Heart', price: '2 000 GNF', delay: '5 jours',
        requiresAccount: true,
        requiredDocs: ['Carte d\'identité nationale', 'Photo d\'identité', 'Certificat de résidence', 'Attestation d\'emploi ou de chômage'],
        documentTemplate: {
          title: "CARTE SANITAIRE NATIONALE — CERTIFICAT D'AFFILIATION",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nMINISTÈRE DE LA SANTÉ ET DE L'HYGIÈNE PUBLIQUE\nCAISSE NATIONALE D'ASSURANCE MALADIE (CNAM)",
          body: [
            "La Caisse Nationale d'Assurance Maladie (CNAM) certifie l'affiliation de :",
            "NOM : [NOM]\nPRÉNOM(S) : [PRÉNOM]\nDate de naissance : [DATE_NAISSANCE]\nN° Carte sanitaire : [NUMERO_CARTE]\nNIN : [NIN]",
            "Régime : [REGIME] (Général / Privé / Étudiant)\nDate d'affiliation : [DATE_AFFILIATION]\nCentre de santé rattaché : [CENTRE_SANTE]\nAyants droit : [AYANTS_DROIT]",
            "La carte sanitaire donne droit aux prestations de soins conformément aux dispositions du Code de la Santé Publique et de la réglementation de la CNAM."
          ],
          footer: "Fait à Conakry, le [DATE_DELIVRANCE]\nLe Directeur Général de la CNAM\n[CACHET DE LA CNAM ET SIGNATURE]",
          securityLevel: 'CONFIDENTIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE — CNAM',
          validityPeriod: '1 an (renouvelable)',
          issuingAuthority: 'Caisse Nationale d\'Assurance Maladie (CNAM)',
          legalReference: 'Loi n°L/2018/019/AN sur l\'assurance maladie universelle ; Code de la Santé Publique',
        },
      },
      {
        id: 's-3', name: 'Certificat médical d\'aptitude', description: "Attestation médicale d'aptitude physique",
        icon: 'Stethoscope', price: '5 000 GNF', delay: '48h',
        requiresAccount: true,
        requiredDocs: ['Carte d\'identité', 'Résultats d\'examens médicaux récents'],
        documentTemplate: {
          title: "CERTIFICAT MÉDICAL D'APTITUDE",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nMINISTÈRE DE LA SANTÉ ET DE L'HYGIÈNE PUBLIQUE\n[CENTRE MÉDICAL / HÔPITAL]",
          body: [
            "Le Médecin examinateur soussigné certifie avoir examiné :",
            "NOM : [NOM]\nPRÉNOM(S) : [PRÉNOM]\nDate de naissance : [DATE_NAISSANCE]\nDate de l'examen : [DATE_EXAMEN]",
            "Résultat de l'examen médical :\n— État général : [BON / SATISFAISANT]\n— Acuité visuelle : [ACUITE_VISUELLE]\n— Acuité auditive : [ACUITE_AUDITIVE]\n— Appareil locomoteur : [NORMAL / RESERVES]\n— Système cardiovasculaire : [NORMAL / RESERVES]",
            "AVIS MÉDICAL : [APT / APTE AVEC RÉSERVES / INAPTE]\nObservations : [SANS OBJET / DÉTAIL OBSERVATIONS]\nValidité du certificat : [DUREE_VALIDITE]",
          ],
          footer: "Fait à [VILLE], le [DATE_DELIVRANCE]\nLe Médecin Examineur\n[N° ORDRE MÉDECIN — CACHET ET SIGNATURE]",
          securityLevel: 'CONFIDENTIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE — CERTIFICAT MÉDICAL',
          validityPeriod: '6 mois',
          issuingAuthority: 'Centre médical agréé',
          legalReference: 'Code de la Santé Publique, Art. 145-158 ; Code du Travail, Art. 210',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // RÉSIDENCE & CITOYENNETÉ (2)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'residence', name: 'Résidence & Citoyenneté', color: 'bg-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    iconBgColor: 'bg-amber-100 dark:bg-amber-900/40', textColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800/40', iconName: 'Home',
    services: [
      {
        id: 'r-1', name: 'Certificat de résidence', description: 'Attestation de domicile délivrée par la mairie',
        icon: 'Home', price: 'Gratuit', delay: '24h',
        requiresAccount: false,
        requiredDocs: ['Carte d\'identité nationale', 'Quittance de loyer ou titre de propriété', 'Témoignage de 2 voisins'],
        documentTemplate: {
          title: "CERTIFICAT DE RÉSIDENCE",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nCOMMUNE DE [COMMUNE]\nBUREAU DE L'ÉTAT CIVIL",
          body: [
            "Le soussigné, Maire / Adjoint au Maire de la Commune de [COMMUNE], certifie que :",
            "NOM : [NOM]\nPRÉNOM(S) : [PRÉNOM]\nDate de naissance : [DATE_NAISSANCE]\nProfession : [PROFESSION]",
            "Réside effectivement à l'adresse suivante : [ADRESSE_COMPLETE]\nDepuis le : [DATE_INSTALLATION]",
            "Le présent certificat est délivré pour servir et valoir ce que de droit. Il est valable pour une durée de trois (3) mois à compter de la date de délivrance."
          ],
          footer: "Fait à [COMMUNE], le [DATE_DELIVRANCE]\nLe Maire / Adjoint au Maire\n[CACHET DE LA MAIRIE ET SIGNATURE]",
          securityLevel: 'PUBLIC',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE',
          validityPeriod: '3 mois',
          issuingAuthority: 'Mairie / Commune',
          legalReference: 'Code de l\'Administration Territoriale, Art. 45 ; Ordonnance n°011/PRG/87',
        },
      },
      {
        id: 'r-2', name: 'Attestation de domicile', description: "Attestation de lieu d'habitation",
        icon: 'MapPin', price: '1 000 GNF', delay: '24h',
        requiresAccount: false,
        requiredDocs: ['Carte d\'identité', 'Facture d\'eau ou d\'électricité récente'],
        documentTemplate: {
          title: "ATTESTATION DE DOMICILE",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nCOMMUNE DE [COMMUNE]\nSERVICE ADMINISTRATIF",
          body: [
            "Le soussigné, autorité administrative de la Commune de [COMMUNE], atteste que :",
            "NOM : [NOM]\nPRÉNOM(S) : [PRÉNOM]\nDate de naissance : [DATE_NAISSANCE]\nN° Carte d'identité : [NUMERO_CNI]",
            "Demeure à : [ADRESSE_COMPLETE]\nQuartier : [QUARTIER]\nCommune : [COMMUNE]\nVille : [VILLE]",
            "Cette attestation est délivrée sur la base des pièces justificatives produites (facture d'eau/électricité, quittance de loyer). Toute fausse déclaration est passible de poursuites."
          ],
          footer: "Fait à [COMMUNE], le [DATE_DELIVRANCE]\nL'Autorité Administrative\n[CACHET ET SIGNATURE]",
          securityLevel: 'PUBLIC',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE',
          validityPeriod: '3 mois',
          issuingAuthority: 'Mairie / Commune',
          legalReference: 'Code de l\'Administration Territoriale, Art. 52-58',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // FISCALITÉ & IMPÔTS (3) — NEW CATEGORY
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'fiscalite', name: 'Fiscalité & Impôts', color: 'bg-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    iconBgColor: 'bg-emerald-100 dark:bg-emerald-900/40', textColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-200 dark:border-emerald-800/40', iconName: 'Landmark',
    services: [
      {
        id: 'f-1', name: 'Attestation de quitus fiscal', description: "Certificat de situation fiscale régulière",
        icon: 'Receipt', price: 'Gratuit', delay: '3 jours',
        requiresAccount: true,
        requiredDocs: ['Carte d\'identité nationale', 'NIF', 'Dernière déclaration d\'impôt'],
        documentTemplate: {
          title: "ATTESTATION DE QUITUS FISCAL",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nMINISTÈRE DE L'ÉCONOMIE ET DES FINANCES\nDIRECTION GÉNÉRALE DES IMPÔTS\nCENTRE DES IMPÔTS DE [VILLE]",
          body: [
            "La Direction Générale des Impôts certifie que :",
            "NOM / RAISON SOCIALE : [NOM]\nNIF : [NIF]\nAdresse : [ADRESSE]",
            "Est en situation fiscale régulière au regard de ses obligations fiscales à la date de délivrance de la présente attestation. Aucun impôt impayé, aucune amende fiscale ni majoration n'est réclamé(e) à cette date.",
            "Le présent quitus fiscal est délivré pour servir et valoir ce que de droit. Il ne préjuge pas de la régularité des déclarations futures."
          ],
          footer: "Fait à [VILLE], le [DATE_DELIVRANCE]\nLe Directeur du Centre des Impôts\n[CACHET DE LA DGI ET SIGNATURE]",
          securityLevel: 'OFFICIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE — DGI',
          validityPeriod: '3 mois',
          issuingAuthority: 'Direction Générale des Impôts (DGI)',
          legalReference: 'Code Général des Impôts ; Loi n°L/2019/011/AN sur les transactions électroniques',
        },
      },
      {
        id: 'f-2', name: 'Déclaration d\'impôt', description: 'Déclaration annuelle de revenus',
        icon: 'Calculator', price: 'Gratuit', delay: '5 jours',
        requiresAccount: true,
        requiredDocs: ['Carte d\'identité nationale', 'NIF', 'Relevés de revenus', 'Pièces justificatives des déductions'],
        documentTemplate: {
          title: "ACCUSÉ DE RÉCEPTION — DÉCLARATION D'IMPÔT SUR LE REVENU",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nMINISTÈRE DE L'ÉCONOMIE ET DES FINANCES\nDIRECTION GÉNÉRALE DES IMPÔTS\nSERVICE DE LA REDEVABILITÉ",
          body: [
            "La Direction Générale des Impôts accuse réception de la déclaration d'impôt suivante :",
            "Déclarant : [NOM] [PRÉNOM]\nNIF : [NIF]\nAnnée d'imposition : [ANNEE_IMPOSITION]\nDate de déclaration : [DATE_DECLARATION]\nN° Déclaration : [NUMERO_DECLARATION]",
            "Revenus déclarés : [REVENU_DECLARE] GNF\nImpôt dû : [IMPOT_DU] GNF\nMode de paiement : [MODE_PAIEMENT]\nRéférence de paiement : [REFERENCE_PAIEMENT]",
            "Cet accusé de réception vaut certificat de déclaration. Il doit être conservé par le contribuable pour toute réclamation ou justificatif auprès des administrations publiques."
          ],
          footer: "Fait à Conakry, le [DATE_DELIVRANCE]\nLe Chef du Service de la Redevabilité\n[CACHET DE LA DGI ET SIGNATURE]",
          securityLevel: 'CONFIDENTIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE — DÉCLARATION FISCALE',
          validityPeriod: 'Année d\'imposition',
          issuingAuthority: 'Direction Générale des Impôts (DGI)',
          legalReference: 'Code Général des Impôts, Art. 1-85 ; Loi de Finances [ANNÉE]',
        },
      },
      {
        id: 'f-3', name: 'Extrait de rôle', description: 'Document justificatif de la situation fiscale',
        icon: 'Coins', price: '2 000 GNF', delay: '3 jours',
        requiresAccount: true,
        requiredDocs: ['Carte d\'identité nationale', 'NIF'],
        documentTemplate: {
          title: "EXTRAIT DE RÔLE",
          header: "RÉPUBLIQUE DE GUINÉE\nTravail - Justice - Solidarité\n-----\nMINISTÈRE DE L'ÉCONOMIE ET DES FINANCES\nDIRECTION GÉNÉRALE DES IMPÔTS\nSERVICE DES RÔLES ET RECETTES",
          body: [
            "La Direction Générale des Impôts délivre l'extrait de rôle suivant :",
            "Contribuable : [NOM] [PRÉNOM]\nNIF : [NIF]\nAdresse : [ADRESSE]\nAnnée d'imposition : [ANNEE_IMPOSITION]",
            "Montant de l'impôt de rôle : [MONTANT_IMPOT] GNF\nMajorations éventuelles : [MAJORATIONS] GNF\nTotal à payer : [TOTAL] GNF\nÉtat du paiement : [PAYÉ / EN COURS / IMPAYÉ]",
            "Le présent extrait de rôle est délivré pour faire valoir ce que de droit. En cas de contestation, le contribuable dispose d'un délai de trente (30) jours pour saisir la Commission Départementale des Impôts."
          ],
          footer: "Fait à Conakry, le [DATE_DELIVRANCE]\nLe Chef du Service des Rôles et Recettes\n[CACHET DE LA DGI ET SIGNATURE]",
          securityLevel: 'CONFIDENTIEL',
          watermarkText: 'RÉPUBLIQUE DE GUINÉE — EXTRAIT DE RÔLE',
          validityPeriod: 'Année d\'imposition',
          issuingAuthority: 'Direction Générale des Impôts (DGI)',
          legalReference: 'Code Général des Impôts, Art. 120-145 ; Livre des Procédures Fiscales',
        },
      },
    ],
  },
]

// ─── HELPER: Find service by ID ──────────────────────────────────────────────
export function findServiceById(serviceId: string): ServiceItem | undefined {
  for (const cat of SERVICE_CATEGORIES) {
    const found = cat.services.find(s => s.id === serviceId)
    if (found) return found
  }
  return undefined
}

export function findCategoryByServiceId(serviceId: string): ServiceCategory | undefined {
  return SERVICE_CATEGORIES.find(cat => cat.services.some(s => s.id === serviceId))
}

// ─── DEMO USER ACCOUNTS ──────────────────────────────────────────────────────
export type InstitutionType = 'mairie' | 'prefecture' | 'ministere' | 'agence' | 'interne' | 'citoyen'

export interface DemoUser {
  id: string
  email: string
  password: string
  name: string
  firstName: string
  role: 'citoyen' | 'agent' | 'chef_service' | 'directeur' | 'admin' | 'secretaire_general' | 'mairie' | 'prefecture' | 'ministere'
  institution: string
  fonction: string
  avatar: string
  nin: string
  phone: string
  institutionType: InstitutionType
  categoryIds: string[]
  description: string
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: 'user-citizen-1',
    email: 'citoyen@guinee.gov.gn',
    password: 'demo',
    name: 'Diallo',
    firstName: 'Aminata',
    role: 'citoyen',
    institution: 'Portail Citoyen',
    fonction: 'Citoyenne',
    avatar: 'AD',
    nin: 'NIN-2019-458723',
    phone: '+224 622 34 56 78',
    institutionType: 'citoyen',
    categoryIds: [],
    description: 'Citoyenne guinéenne — Soumet et suit ses demandes administratives',
  },
  {
    id: 'user-agent-1',
    email: 'agent.etatcivil@guinee.gov.gn',
    password: 'demo',
    name: 'Bah',
    firstName: 'Fatoumata',
    role: 'agent',
    institution: 'Mairie de Kaloum',
    fonction: 'Agent État Civil',
    avatar: 'FB',
    nin: 'NIN-2016-234567',
    phone: '+224 664 32 10 98',
    institutionType: 'interne',
    categoryIds: ['etat-civil', 'residence'],
    description: 'Agent d\'état civil — Traite les demandes d\'actes et certificats',
  },
  {
    id: 'user-chef-1',
    email: 'chef.justice@guinee.gov.gn',
    password: 'demo',
    name: 'Soumah',
    firstName: 'Mamadou',
    role: 'chef_service',
    institution: 'Ministère de la Justice',
    fonction: 'Chef de Service des Casiers Judiciaires',
    avatar: 'MS',
    nin: 'NIN-2015-123890',
    phone: '+224 655 67 89 01',
    institutionType: 'interne',
    categoryIds: ['justice'],
    description: 'Chef de service — Supervise le traitement des demandes judiciaires',
  },
  {
    id: 'user-directeur-1',
    email: 'directeur.anip@guinee.gov.gn',
    password: 'demo',
    name: 'Keita',
    firstName: 'Ibrahima',
    role: 'directeur',
    institution: "Agence Nationale d'Identification (ANIP)",
    fonction: 'Directeur Général Adjoint',
    avatar: 'IK',
    nin: 'NIN-2014-567123',
    phone: '+224 666 12 34 56',
    institutionType: 'agence',
    categoryIds: ['identification'],
    description: 'Directeur ANIP — Gère les demandes de CNI et passeports biométriques',
  },
  {
    id: 'user-admin-1',
    email: 'admin@guinee.gov.gn',
    password: 'demo',
    name: 'Condé',
    firstName: 'Sékou',
    role: 'admin',
    institution: "Ministère de l'Administration Territoriale",
    fonction: 'Administrateur Système',
    avatar: 'SC',
    nin: 'NIN-2017-890123',
    phone: '+224 666 78 90 12',
    institutionType: 'interne',
    categoryIds: ['etat-civil', 'residence', 'urbanisme'],
    description: 'Administrateur — Supervise toutes les demandes du système',
  },
  {
    id: 'user-sg-1',
    email: 'sg@guinee.gov.gn',
    password: 'demo',
    name: 'Touré',
    firstName: 'Mariama',
    role: 'secretaire_general',
    institution: 'Primature de Guinée',
    fonction: 'Secrétaire Général du Gouvernement',
    avatar: 'MT',
    nin: 'NIN-2013-345678',
    phone: '+224 628 11 22 33',
    institutionType: 'interne',
    categoryIds: [],
    description: 'Secrétaire Général — Vue globale sur toutes les administrations',
  },
  // ─── COMPTES MAIRIES & ADMINISTRATIONS ──────────────────────────────────
  {
    id: 'user-mairie-kaloum',
    email: 'mairie.kaloum@guinee.gov.gn',
    password: 'demo',
    name: 'Bangoura',
    firstName: 'Oumar',
    role: 'mairie',
    institution: 'Mairie de Kaloum',
    fonction: 'Responsable État Civil & Documents',
    avatar: 'OB',
    nin: 'NIN-2014-111111',
    phone: '+224 620 00 00 01',
    institutionType: 'mairie',
    categoryIds: ['etat-civil', 'residence', 'urbanisme'],
    description: 'Mairie de Kaloum — Actes d\'état civil, résidence, urbanisme',
  },
  {
    id: 'user-mairie-dixinn',
    email: 'mairie.dixinn@guinee.gov.gn',
    password: 'demo',
    name: 'Sylla',
    firstName: 'Facinet',
    role: 'mairie',
    institution: 'Mairie de Dixinn',
    fonction: 'Chef Bureau État Civil',
    avatar: 'FS',
    nin: 'NIN-2015-222222',
    phone: '+224 620 00 00 02',
    institutionType: 'mairie',
    categoryIds: ['etat-civil', 'residence', 'urbanisme'],
    description: 'Mairie de Dixinn — Actes d\'état civil, résidence, urbanisme',
  },
  {
    id: 'user-mairie-matam',
    email: 'mairie.matam@guinee.gov.gn',
    password: 'demo',
    name: 'Diallo',
    firstName: 'Alpha',
    role: 'mairie',
    institution: 'Mairie de Matam',
    fonction: 'Agent de Traitement des Demandes',
    avatar: 'AD',
    nin: 'NIN-2016-333333',
    phone: '+224 620 00 00 03',
    institutionType: 'mairie',
    categoryIds: ['etat-civil', 'residence', 'urbanisme'],
    description: 'Mairie de Matam — Actes d\'état civil, résidence, urbanisme',
  },
  {
    id: 'user-mairie-matoto',
    email: 'mairie.matoto@guinee.gov.gn',
    password: 'demo',
    name: 'Condé',
    firstName: 'Mamadou',
    role: 'mairie',
    institution: 'Mairie de Matoto',
    fonction: 'Responsable Service Public',
    avatar: 'MC',
    nin: 'NIN-2017-444444',
    phone: '+224 620 00 00 04',
    institutionType: 'mairie',
    categoryIds: ['etat-civil', 'residence', 'urbanisme'],
    description: 'Mairie de Matoto — Actes d\'état civil, résidence, urbanisme',
  },
  {
    id: 'user-mairie-ratoma',
    email: 'mairie.ratoma@guinee.gov.gn',
    password: 'demo',
    name: 'Camara',
    firstName: 'Ibrahima',
    role: 'mairie',
    institution: 'Mairie de Ratoma',
    fonction: 'Agent État Civil',
    avatar: 'IC',
    nin: 'NIN-2018-555555',
    phone: '+224 620 00 00 05',
    institutionType: 'mairie',
    categoryIds: ['etat-civil', 'residence', 'urbanisme'],
    description: 'Mairie de Ratoma — Actes d\'état civil, résidence, urbanisme',
  },
  {
    id: 'user-pref-conakry',
    email: 'prefecture.conakry@guinee.gov.gn',
    password: 'demo',
    name: 'Touré',
    firstName: 'Sékou',
    role: 'prefecture',
    institution: 'Préfecture de Conakry',
    fonction: 'Secrétaire Général de Préfecture',
    avatar: 'ST',
    nin: 'NIN-2013-666666',
    phone: '+224 620 00 00 06',
    institutionType: 'prefecture',
    categoryIds: ['etat-civil', 'residence'],
    description: 'Préfecture de Conakry — État civil et résidence à l\'échelle préfectorale',
  },
  {
    id: 'user-min-justice',
    email: 'ministere.justice@guinee.gov.gn',
    password: 'demo',
    name: 'Baldé',
    firstName: 'Aissatou',
    role: 'ministere',
    institution: 'Ministère de la Justice',
    fonction: 'Directrice des Services Judiciaires',
    avatar: 'AB',
    nin: 'NIN-2014-777777',
    phone: '+224 620 00 00 07',
    institutionType: 'ministere',
    categoryIds: ['justice'],
    description: 'Ministère de la Justice — Casiers judiciaires, certificats, légalisations',
  },
  {
    id: 'user-min-sante',
    email: 'ministere.sante@guinee.gov.gn',
    password: 'demo',
    name: 'Savané',
    firstName: 'Kadiatou',
    role: 'ministere',
    institution: 'Ministère de la Santé',
    fonction: 'Chef de Division Certification',
    avatar: 'KS',
    nin: 'NIN-2015-888888',
    phone: '+224 620 00 00 08',
    institutionType: 'ministere',
    categoryIds: ['sante'],
    description: 'Ministère de la Santé — Certificats de vaccination, cartes sanitaires',
  },
  {
    id: 'user-dgi',
    email: 'dgi@guinee.gov.gn',
    password: 'demo',
    name: 'Condé',
    firstName: 'Aminata',
    role: 'ministere',
    institution: 'Direction Générale des Impôts (DGI)',
    fonction: 'Inspectrice Principale des Impôts',
    avatar: 'AC',
    nin: 'NIN-2016-999999',
    phone: '+224 620 00 00 09',
    institutionType: 'agence',
    categoryIds: ['fiscalite'],
    description: 'DGI — Quitus fiscal, déclarations d\'impôt, extraits de rôle',
  },
  {
    id: 'user-anip',
    email: 'anip@guinee.gov.gn',
    password: 'demo',
    name: 'Soumah',
    firstName: 'Mamadou',
    role: 'ministere',
    institution: "Agence Nationale d'Identification (ANIP)",
    fonction: 'Responsable Centre Biométrique',
    avatar: 'MS',
    nin: 'NIN-2017-101010',
    phone: '+224 620 00 00 10',
    institutionType: 'agence',
    categoryIds: ['identification'],
    description: 'ANIP — Cartes d\'identité biométriques et identification nationale',
  },
  {
    id: 'user-apip',
    email: 'apip@guinee.gov.gn',
    password: 'demo',
    name: 'Diallo',
    firstName: 'Alpha',
    role: 'ministere',
    institution: 'APIP — Agence de Promotion des Investissements Privés',
    fonction: 'Agent de Traitement des Dossiers',
    avatar: 'AD2',
    nin: 'NIN-2018-111111',
    phone: '+224 620 00 00 11',
    institutionType: 'agence',
    categoryIds: ['entreprise'],
    description: 'APIP — Enregistrement entreprises, RCCM, licences d\'importation',
  },
]

// ─── ROLE LABELS ─────────────────────────────────────────────────────────────
export const ROLE_LABELS: Record<DemoUser['role'], string> = {
  citoyen: 'Citoyen(ne)',
  agent: 'Agent',
  chef_service: 'Chef de Service',
  directeur: 'Directeur',
  admin: 'Administrateur',
  secretaire_general: 'Secrétaire Général',
  mairie: 'Mairie',
  prefecture: 'Préfecture',
  ministere: 'Ministère',
}

export const ROLE_COLORS: Record<DemoUser['role'], string> = {
  citoyen: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  agent: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  chef_service: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  directeur: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  secretaire_general: 'bg-[#0B2E58]/10 text-[#0B2E58] dark:bg-[#3B7DD8]/20 dark:text-[#3B7DD8]',
  mairie: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  prefecture: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  ministere: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
}
