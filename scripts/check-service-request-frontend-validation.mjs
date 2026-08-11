import fs from 'node:fs'
import path from 'node:path'

const sourcePath = path.resolve('src/lib/service-requests-api.ts')
const source = fs.readFileSync(sourcePath, 'utf8')

const requiredSnippets = [
  "service_id: normalizeRequired(input.serviceId, 'La démarche')",
  "target_institution_id: normalizeRequired(input.targetInstitutionId, 'L’institution destinataire')",
  "citizen_name: normalizeRequired(input.citizenName, 'Le nom')",
  "citizen_first_name: normalizeRequired(input.citizenFirstName, 'Le prénom')",
  "citizen_nin: normalizeRequired(input.citizenNIN, 'Le NIN', 3)",
  "citizen_phone: normalizeRequired(input.citizenPhone, 'Le téléphone', 3)",
  "citizen_address: normalizeRequired(input.citizenAddress, 'L’adresse', 3)",
  "motif: normalizeRequired(input.motif, 'Le motif', 3)",
  "citizen_email: AUTHENTICATED_EMAIL_COMPATIBILITY_PLACEHOLDER",
  "const validationMessage = formatValidationDetail(detail)",
  "Données de la demande invalides — ${messages.join(' ; ')}",
  "const field = typeof rawField === 'string' ? rawField : 'champ'",
]

const missing = requiredSnippets.filter((snippet) => !source.includes(snippet))
if (missing.length) {
  console.error('Contrat frontend de validation des demandes incomplet:')
  for (const snippet of missing) console.error(`- manquant: ${snippet}`)
  process.exit(1)
}

const fieldLabels = [
  'service_id',
  'target_institution_id',
  'citizen_name',
  'citizen_first_name',
  'citizen_nin',
  'citizen_phone',
  'citizen_email',
  'citizen_address',
  'motif',
  'delivery_mode',
]
for (const field of fieldLabels) {
  if (!source.includes(`${field}:`)) {
    console.error(`Libellé FastAPI manquant pour ${field}`)
    process.exit(1)
  }
}

if (source.includes('citizen_email: input.citizenEmail')) {
  console.error('Régression: le navigateur ne doit pas réenvoyer un e-mail citoyen éditable comme identité autoritaire.')
  process.exit(1)
}

console.log('PASS: contrat frontend service-request validation + erreurs 422 lisibles')
