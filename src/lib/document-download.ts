'use client'

import type { CitizenRequest, AttachedFile, RequestStatus } from '@/store/citizen-requests-store'

// ─── GUINEA BRAND COLORS ─────────────────────────────────────────────────────
const GUINEA_RED = '#CE1126'
const GUINEA_YELLOW = '#FCD116'
const GUINEA_GREEN = '#009460'
const GUINEA_NAVY = '#0B2E58'

const STATUS_CONFIG_LABELS: Record<RequestStatus, string> = {
  soumise: 'Soumise',
  en_cours: 'En cours de traitement',
  pieces_complementaires: 'Pièces complémentaires requises',
  validee: 'Validée',
  prete: 'Document prêt',
  livree: 'Livrée',
  rejetee: 'Rejetée',
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

/**
 * Generate a Guinea-branded administrative document for download.
 * Creates a realistic formatted text file with proper headers.
 */
export function generateProducedDocumentContent(request: CitizenRequest): string {
  const now = new Date()
  const dateFormatted = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const timeFormatted = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return `
═══════════════════════════════════════════════════════════════════════════════
                     RÉPUBLIQUE DE GUINÉE
                     Travail — Justice — Solidarité
═══════════════════════════════════════════════════════════════════════════════
         ████  ██████  ██████   ████
         █     █    █  █    █   █
         ████  ██████  ██████   █
         █     █    █  █    █   █
         ████  █    █  █    █   ████
═══════════════════════════════════════════════════════════════════════════════

                         ${request.serviceName.toUpperCase()}

═══════════════════════════════════════════════════════════════════════════════

RÉFÉRENCE : ${request.reference}
SERVICE   : ${request.serviceName}
CATÉGORIE : ${request.category}

───────────────────────────────────────────────────────────────────────────────
  IDENTITÉ DU DEMANDEUR
───────────────────────────────────────────────────────────────────────────────

  Nom complet    : ${request.citizenFirstName} ${request.citizenName}
  NIN            : ${request.citizenNIN}
  Téléphone      : ${request.citizenPhone}
  Email          : ${request.citizenEmail || 'Non renseigné'}
  Adresse        : ${request.citizenAddress}

───────────────────────────────────────────────────────────────────────────────
  DÉTAILS DE LA DEMANDE
───────────────────────────────────────────────────────────────────────────────

  Date de soumission    : ${new Date(request.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
  Date de traitement    : ${request.completedAt ? new Date(request.completedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'En cours'}
  Service compétent     : ${request.assignedService}
  Agent traitant        : ${request.assignedAgent || 'Non assigné'}
  Mode de livraison     : ${request.deliveryMode === 'en_ligne' ? 'En ligne' : request.deliveryMode === 'guichet' ? 'Au guichet' : 'Par courrier'}
  ${request.deliveryLocation ? `Lieu de retrait      : ${request.deliveryLocation}` : ''}
  Statut                : ${STATUS_CONFIG_LABELS[request.status]}

───────────────────────────────────────────────────────────────────────────────
  MOTIF DE LA DEMANDE
───────────────────────────────────────────────────────────────────────────────

  ${request.motif}

───────────────────────────────────────────────────────────────────────────────
  PIÈCES JUSTIFICATIVES FOURNIES
───────────────────────────────────────────────────────────────────────────────

${request.attachedFiles.length > 0
    ? request.attachedFiles.map((f, i) => `  ${i + 1}. ${f.name} (${formatFileSize(f.size)}) — ${f.category === 'justificatif' ? 'Justificatif' : f.category === 'complement' ? 'Complément' : 'Document'} — Téléversé le ${new Date(f.uploadedAt).toLocaleDateString('fr-FR')}`).join('\n')
    : '  Aucune pièce justificative fournie'
  }

═══════════════════════════════════════════════════════════════════════════════
  ATTESTATION ADMINISTRATIVE
═══════════════════════════════════════════════════════════════════════════════

  Par la présente, l'administration de la République de Guinée certifie que
  la demande référencée ${request.reference} a été dûment traitée conformément
  aux procédures administratives en vigueur.

  Le document produit dans le cadre de cette demande est délivré à
  ${request.citizenFirstName} ${request.citizenName}, titulaire du NIN
  ${request.citizenNIN}, pour faire valoir ce que de droit.

  Conformément au Code administratif de la République de Guinée et à la
  Loi n°L/2016/018/AN relative à la protection des données à caractère
  personnel, ce document est strictement personnel et confidentiel.

  Toute falsification ou utilisation frauduleuse de ce document est passible
  de poursuites judiciaires conformément au Code pénal guinéen.

═══════════════════════════════════════════════════════════════════════════════

  Fait à Conakry, le ${dateFormatted} à ${timeFormatted}

  Pour la République de Guinée,
  ${request.assignedService}

  ─────────────────────────────────
  ${request.assignedAgent || 'Agent traitant'}
  Agent compétent

═══════════════════════════════════════════════════════════════════════════════
  eAdministration Suite Guinea — Système de Gestion Électronique
  Document généré automatiquement le ${dateFormatted} à ${timeFormatted}
  Référence technique : ${request.reference}
═══════════════════════════════════════════════════════════════════════════════
`.trimStart()
}

/**
 * Generate content for downloading an attached file (justificatif/complement)
 */
export function generateAttachedFileContent(file: AttachedFile, request: CitizenRequest): string {
  const now = new Date()
  const dateFormatted = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const timeFormatted = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const categoryLabel = file.category === 'justificatif'
    ? 'Pièce justificative'
    : file.category === 'complement'
    ? 'Document complémentaire'
    : 'Document produit'

  return `
═══════════════════════════════════════════════════════════════════════════════
                     RÉPUBLIQUE DE GUINÉE
                     Travail — Justice — Solidarité
═══════════════════════════════════════════════════════════════════════════════

  ${categoryLabel.toUpperCase()}

═══════════════════════════════════════════════════════════════════════════════

FICHIER     : ${file.name}
TYPE        : ${file.type}
TAILLE      : ${formatFileSize(file.size)}
CATÉGORIE   : ${categoryLabel}
TÉLÉVERSÉ LE : ${new Date(file.uploadedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}

───────────────────────────────────────────────────────────────────────────────
  CONTEXTE DE LA DEMANDE
───────────────────────────────────────────────────────────────────────────────

Référence   : ${request.reference}
Service     : ${request.serviceName}
Catégorie   : ${request.category}
Citoyen     : ${request.citizenFirstName} ${request.citizenName}
NIN         : ${request.citizenNIN}
Statut      : ${STATUS_CONFIG_LABELS[request.status]}

───────────────────────────────────────────────────────────────────────────────
  CONTENU SIMULÉ
───────────────────────────────────────────────────────────────────────────────

  Ce fichier est une simulation de ${categoryLabel.toLowerCase()} dans le cadre
  de la demande ${request.reference}.

  Dans un environnement de production, ce fichier contiendrait le document
  réel scanné ou téléversé par le citoyen ou l'agent traitant.

═══════════════════════════════════════════════════════════════════════════════
  eAdministration Suite Guinea
  Extrait le ${dateFormatted} à ${timeFormatted}
═══════════════════════════════════════════════════════════════════════════════
`.trimStart()
}

/**
 * Download a produced document for a request
 */
export function downloadProducedDocument(request: CitizenRequest) {
  const content = generateProducedDocumentContent(request)
  const fileName = request.producedDocument?.name || `${request.serviceName.replace(/[^a-zA-ZÀ-ÿ0-9]/g, '_')}_${request.citizenName}_${request.citizenFirstName}.pdf`
  triggerDownload(fileName, content)
}

/**
 * Download an attached file from a request
 */
export function downloadAttachedFile(file: AttachedFile, request: CitizenRequest) {
  const content = generateAttachedFileContent(file, request)
  triggerDownload(file.name, content)
}

/**
 * Trigger a file download in the browser
 */
function triggerDownload(fileName: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
