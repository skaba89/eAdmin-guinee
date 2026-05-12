// ─── SHARED DOCUMENT UTILITIES ────────────────────────────────────────────────
// Used across citizen-portal, service-requests, mairie-dashboard, agence-dashboard

import type { UploadedDocument, GeneratedDocument, CitizenRequest } from '@/store/citizen-requests-store'

// ─── FILE SIZE FORMATTING ─────────────────────────────────────────────────────
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' o'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' Ko'
  return (bytes / 1048576).toFixed(1) + ' Mo'
}

// ─── FILE TYPE ICON HELPER ────────────────────────────────────────────────────
export function getFileTypeIcon(type: string): { icon: string; color: string } {
  if (type.includes('pdf')) return { icon: 'PDF', color: 'text-red-500' }
  if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg'))
    return { icon: 'IMG', color: 'text-blue-500' }
  if (type.includes('word') || type.includes('doc')) return { icon: 'DOC', color: 'text-blue-700' }
  if (type.includes('sheet') || type.includes('xls')) return { icon: 'XLS', color: 'text-emerald-600' }
  return { icon: 'FIC', color: 'text-gray-500' }
}

// ─── ACCEPTED FILE TYPES ──────────────────────────────────────────────────────
export const ACCEPTED_FILE_TYPES = '.pdf,.doc,.docx,.jpg,.jpeg,.png'
export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_TOTAL_SIZE = 50 * 1024 * 1024 // 50MB

// ─── PROCESS FILE FOR UPLOAD ─────────────────────────────────────────────────
export function processFile(file: File, requiredDocName: string): Promise<UploadedDocument> {
  return new Promise((resolve, reject) => {
    // Validate type
    if (!ACCEPTED_MIME_TYPES.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|jpg|jpeg|png)$/i)) {
      reject(new Error(`Type de fichier non supporté : ${file.name}. Formats acceptés : PDF, DOC, DOCX, JPG, PNG`))
      return
    }
    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error(`Fichier trop volumineux : ${file.name} (${formatFileSize(file.size)}). Maximum : 10 Mo`))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      resolve({
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        data: reader.result as string,
        uploadedAt: new Date().toISOString(),
        requiredDocName,
        verified: false,
      })
    }
    reader.onerror = () => reject(new Error(`Erreur lors de la lecture du fichier : ${file.name}`))
    reader.readAsDataURL(file)
  })
}

// ─── DOWNLOAD AN UPLOADED FILE ────────────────────────────────────────────────
export function downloadUploadedFile(doc: UploadedDocument) {
  const link = document.createElement('a')
  link.href = doc.data
  link.download = doc.name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// ─── PREVIEW AN UPLOADED FILE ─────────────────────────────────────────────────
export function previewUploadedFile(doc: UploadedDocument) {
  // Open in new tab for preview
  const win = window.open('', '_blank')
  if (win) {
    if (doc.type.includes('image')) {
      win.document.write(`
        <html><head><title>${doc.name}</title><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;}</style></head>
        <body><img src="${doc.data}" style="max-width:100%;max-height:100vh;object-fit:contain;"/></body></html>
      `)
    } else if (doc.type.includes('pdf')) {
      win.document.write(`
        <html><head><title>${doc.name}</title></head>
        <body style="margin:0"><embed src="${doc.data}" type="application/pdf" width="100%" height="100%" style="position:fixed;top:0;left:0;width:100vw;height:100vh;"/></body></html>
      `)
    } else {
      win.document.write(`
        <html><head><title>${doc.name}</title></head>
        <body style="font-family:sans-serif;padding:40px;text-align:center;">
        <h2>Aperçu non disponible</h2>
        <p>Le type de fichier "${doc.type}" ne peut pas être prévisualisé dans le navigateur.</p>
        <p>Téléchargez le fichier pour le consulter.</p>
        </body></html>
      `)
    }
    win.document.close()
  }
}

// ─── GENERATE OFFICIAL DOCUMENT HTML ──────────────────────────────────────────
export function generateOfficialDocumentHtml(req: CitizenRequest, agentName: string): string {
  const citizenFullName = `${req.citizenFirstName} ${req.citizenName}`
  const deliveryLabel = req.deliveryMode === 'en_ligne' ? 'En ligne' : req.deliveryMode === 'guichet' ? 'Au guichet' : 'Par courrier'

  // Service-specific content
  let specificContent = ''
  if (req.categoryId === 'etat-civil') {
    specificContent = `
    <div class="info-box">
      <h3>Données d'état civil</h3>
      <div class="info-row"><span class="label">Type d'acte :</span><span class="value">${req.serviceName}</span></div>
      <div class="info-row"><span class="label">Commune :</span><span class="value">${req.citizenAddress}</span></div>
      <div class="info-row"><span class="label">Numéro d'acte :</span><span class="value">${req.reference}</span></div>
    </div>`
  } else if (req.categoryId === 'identification') {
    specificContent = `
    <div class="info-box">
      <h3>Données d'identification</h3>
      <div class="info-row"><span class="label">Type de document :</span><span class="value">${req.serviceName}</span></div>
      <div class="info-row"><span class="label">NIN :</span><span class="value">${req.citizenNIN}</span></div>
      <div class="info-row"><span class="label">Validité :</span><span class="value">10 ans à compter de la date d'émission</span></div>
    </div>`
  } else if (req.categoryId === 'justice') {
    specificContent = `
    <div class="info-box">
      <h3>Informations juridiques</h3>
      <div class="info-row"><span class="label">Type de document :</span><span class="value">${req.serviceName}</span></div>
      <div class="info-row"><span class="label">Autorité délivrante :</span><span class="value">${req.assignedService}</span></div>
    </div>`
  } else {
    specificContent = `
    <div class="info-box">
      <h3>Détails du service</h3>
      <div class="info-row"><span class="label">Service :</span><span class="value">${req.serviceName}</span></div>
      <div class="info-row"><span class="label">Catégorie :</span><span class="value">${req.category}</span></div>
    </div>`
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${req.serviceName} — République de Guinée</title>
  <style>
    @page { size: A4; margin: 2cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Georgia, serif; color: #1a1a1a; line-height: 1.6; padding: 2cm; max-width: 21cm; margin: 0 auto; position: relative; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 48pt; color: rgba(11, 46, 88, 0.03); letter-spacing: 5px; pointer-events: none; white-space: nowrap; z-index: 0; }
    .tricolor { display: flex; width: 100%; height: 6px; margin-bottom: 20px; }
    .tricolor-red { flex: 1; background-color: #CE1126; }
    .tricolor-yellow { flex: 1; background-color: #FCD116; }
    .tricolor-green { flex: 1; background-color: #009460; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0B2E58; padding-bottom: 20px; position: relative; z-index: 1; }
    .header h1 { font-size: 11pt; letter-spacing: 3px; text-transform: uppercase; color: #0B2E58; margin-bottom: 4px; }
    .header .motto { font-size: 9pt; color: #666; letter-spacing: 1px; }
    .header .institution { font-size: 10pt; color: #0B2E58; font-weight: bold; margin-top: 8px; }
    .doc-title { text-align: center; margin: 30px 0 20px; position: relative; z-index: 1; }
    .doc-title h2 { font-size: 14pt; color: #0B2E58; text-transform: uppercase; letter-spacing: 1px; }
    .doc-title .ref { font-size: 11pt; color: #333; margin-top: 4px; }
    .info-box { border: 1px solid #0B2E58; padding: 16px; margin: 20px 0; border-radius: 4px; position: relative; z-index: 1; }
    .info-box h3 { font-size: 10pt; color: #0B2E58; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
    .info-row { display: flex; margin-bottom: 6px; font-size: 11pt; }
    .info-row .label { width: 180px; color: #666; font-style: italic; }
    .info-row .value { font-weight: 600; flex: 1; }
    .content { text-align: justify; margin: 20px 0; font-size: 12pt; position: relative; z-index: 1; }
    .content p { margin-bottom: 12px; text-indent: 1.5cm; }
    .signature { margin-top: 60px; text-align: right; position: relative; z-index: 1; }
    .signature .date { font-size: 10pt; color: #333; }
    .signature .signataire { font-size: 11pt; font-weight: bold; color: #0B2E58; margin-top: 8px; }
    .signature .line { width: 200px; border-bottom: 1px dashed #999; margin-top: 40px; margin-left: auto; }
    .signature .label-sign { font-size: 9pt; color: #666; margin-top: 4px; }
    .qr-placeholder { width: 80px; height: 80px; border: 1px dashed #ccc; margin: 10px auto; display: flex; align-items: center; justify-content: center; font-size: 7pt; color: #999; text-align: center; }
    .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 10px; font-size: 8pt; color: #999; text-align: center; position: relative; z-index: 1; }
    @media print { body { padding: 0; } .watermark { display: block; } }
  </style>
</head>
<body>
  <div class="watermark">eAdministration Suite — République de Guinée</div>
  <div class="tricolor">
    <div class="tricolor-red"></div>
    <div class="tricolor-yellow"></div>
    <div class="tricolor-green"></div>
  </div>
  <div class="header">
    <h1>République de Guinée</h1>
    <div class="motto">Travail — Justice — Solidarité</div>
    <div class="institution">${req.assignedService}</div>
  </div>
  <div class="doc-title">
    <h2>${req.serviceName}</h2>
    <div class="ref">Référence : ${req.reference}</div>
    <div class="qr-placeholder">QR Code</div>
  </div>
  <div class="info-box">
    <h3>Informations du demandeur</h3>
    <div class="info-row"><span class="label">Nom complet :</span><span class="value">${citizenFullName}</span></div>
    <div class="info-row"><span class="label">NIN :</span><span class="value">${req.citizenNIN}</span></div>
    <div class="info-row"><span class="label">Téléphone :</span><span class="value">${req.citizenPhone}</span></div>
    <div class="info-row"><span class="label">Adresse :</span><span class="value">${req.citizenAddress}</span></div>
    <div class="info-row"><span class="label">Mode de livraison :</span><span class="value">${deliveryLabel}</span></div>
  </div>
  ${specificContent}
  <div class="content">
    <p>Par la présente, il est certifié que le(s) document(s) relatif(s) à la demande sus-référencée a/ont été établi(s) conformément aux dispositions légales et réglementaires en vigueur en République de Guinée.</p>
    <p>Le présent document est délivré pour faire valoir ce que de droit. Toute falsification ou utilisation frauduleuse expose son auteur aux poursuites prévues par la loi guinéenne (Code pénal, articles 257 et suivants).</p>
  </div>
  <div class="signature">
    <div class="date">Fait à Conakry, le ${new Date().toLocaleDateString('fr-FR')}</div>
    <div class="signataire">${agentName || req.assignedService}</div>
    <div class="line"></div>
    <div class="label-sign">Signature & Cachet officiel</div>
  </div>
  <div class="footer">
    Ce document est généré par le système eAdministration Suite de la République de Guinée — ${req.reference} — ${new Date().toLocaleDateString('fr-FR')}
  </div>
</body>
</html>`
}

// ─── DOWNLOAD A GENERATED DOCUMENT ───────────────────────────────────────────
export function downloadGeneratedDocument(doc: GeneratedDocument) {
  const blob = new Blob([doc.htmlContent], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = doc.fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── DOWNLOAD A CITIZEN REQUEST DOCUMENT (FALLBACK) ─────────────────────────
export function downloadCitizenDocument(req: CitizenRequest, agentName?: string) {
  if (req.generatedDocument) {
    downloadGeneratedDocument(req.generatedDocument)
    return
  }
  // Fallback: generate on the fly
  const html = generateOfficialDocumentHtml(req, agentName || req.assignedAgent || '')
  const fileName = `${req.reference.replace(/\//g, '-')}-${req.serviceName.replace(/\s+/g, '-').toLowerCase()}.html`
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── CREATE A GENERATED DOCUMENT OBJECT ───────────────────────────────────────
export function createGeneratedDocument(req: CitizenRequest, agentName: string): GeneratedDocument {
  const html = generateOfficialDocumentHtml(req, agentName)
  const fileName = `${req.reference.replace(/\//g, '-')}-${req.serviceName.replace(/\s+/g, '-').toLowerCase()}.html`
  return {
    id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: `${req.serviceName} — République de Guinée`,
    htmlContent: html,
    generatedAt: new Date().toISOString(),
    generatedBy: agentName,
    fileName,
  }
}
