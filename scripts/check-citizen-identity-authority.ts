import assert from 'node:assert/strict'

const frontend = await Bun.file('src/lib/service-requests-api.ts').text()
const backend = await Bun.file('backend/app/api/service_requests.py').text()
const tests = await Bun.file('backend/tests/test_service_request_hardening.py').text()

assert.equal(
  frontend.includes('AUTHENTICATED_EMAIL_COMPATIBILITY_PLACEHOLDER'),
  false,
  'Le placeholder e-mail de compatibilité ne doit pas revenir dans le client.',
)
assert.equal(
  frontend.includes('citizen_email:'),
  false,
  'Le client ne doit jamais envoyer citizen_email dans le payload de création.',
)

const createSchemaStart = backend.indexOf('class ServiceRequestCreate(BaseModel):')
const createSchemaEnd = backend.indexOf('\n\nclass StatusUpdate', createSchemaStart)
assert.notEqual(createSchemaStart, -1)
assert.notEqual(createSchemaEnd, -1)
const createSchema = backend.slice(createSchemaStart, createSchemaEnd)

assert.equal(
  createSchema.includes('citizen_email'),
  true,
  'Le commentaire de compatibilité doit documenter explicitement citizen_email.',
)
assert.equal(
  /\n\s+citizen_email\s*:/.test(createSchema),
  false,
  'citizen_email ne doit pas redevenir un champ du schéma ServiceRequestCreate.',
)
assert.equal(
  createSchema.includes('ConfigDict(extra="ignore")'),
  true,
  'Les anciens clients doivent pouvoir envoyer le champ déprécié sans redevenir une source d’autorité.',
)
assert.equal(
  backend.includes('citizen_email=current_user.email'),
  true,
  'La persistance doit rester liée à l’utilisateur authentifié.',
)
assert.equal(
  backend.includes('citizen_email=payload.citizen_email'),
  false,
  'Le backend ne doit jamais persister un e-mail fourni par le payload.',
)
assert.equal(
  tests.includes('test_create_request_uses_authenticated_citizen_identity_not_spoofed_email'),
  true,
  'Le test anti-usurpation serveur doit rester présent.',
)

console.log('PASS: citizen identity is server-authoritative and client e-mail spoofing is ignored')
