---
Task ID: 9+10
Agent: Main Agent
Task: Fix seed script, backend tests, frontend demo passwords synchronization

Work Log:
- Rewrote seed_demo.py with 8 demo accounts (was 6) with correct names, roles, institutions
  - citoyen@eadmin.gn — CITOYEN — "Sékou Condé" — Portail Citoyen
  - mairie@eadmin.gn — MAIRIE — "Fatoumata Bah" — Mairie de Kaloum
  - admin@eadmin.gn — ADMIN — "Alpha Diallo" — Direction Générale de la Modernisation Administrative
  - agence@eadmin.gn — AGENCE — "Mamadou Soumah" — Agence Nationale d'Identification (ANIP)
  - ministere@eadmin.gn — MINISTRE — "Aissatou Sylla" — Ministère de l'Administration Territoriale et de la Décentralisation
  - superadmin@eadmin.gn — SUPER_ADMIN — "Ibrahima Touré" — Présidence de la République — Service e-Gouvernement
  - agent@eadmin.gn — AGENT — "Ibrahim Camara" — Mairie de Kaloum
  - directeur@eadmin.gn — DIRECTEUR — "Mamadou Sylla" — Direction Générale de la Modernisation Administrative
- Added tenant_id, institution_id, mfa_enabled fields to seed_demo.py accounts
  - MFA enabled for: SUPER_ADMIN, ADMIN, MINISTRE, DIRECTEUR
- Fixed backend DIRECTOR→DIRECTEUR in:
  - app/domain/policies.py (ROLE_CLEARANCE, can_approve, can_reject, can_upload, can_manage_classifications)
  - app/domain/validators.py (InstitutionValidator.validate)
  - app/api/documents_search.py (stamp endpoint permission check)
  - app/api/ai.py (auto_redact_response permission check)
- Fixed backend LECTEUR→CITOYEN in:
  - app/domain/policies.py (ROLE_CLEARANCE, can_process)
  - app/domain/validators.py (InstitutionValidator.validate)
  - app/api/ai.py (auto_redact_response permission check)
- Fixed test_auth.py: role="AGENT" string → RoleEnum.AGENT enum
- Fixed app-store.ts: 4x 'demo2026' → 'Eadmin2026!' (agent, directeur, chef_service, ministre)
- Fixed users-store.ts: 'admin2026' → 'Eadmin2026!'
- Fixed e2e/rbac-security.spec.ts: all 8 accounts 'demo2026' → 'Eadmin2026!' + standalone 'demo2026' → 'Eadmin2026!'
- Fixed e2e/workflow-tests.spec.ts: all 8 accounts 'demo2026' → 'Eadmin2026!'
- Fixed generate-test-plan.py: all 'demo123' and 'admin2026' → 'Eadmin2026!'
- Fixed scripts/generate-test-plan.ts: all 'demo123' and 'admin2026' → 'Eadmin2026!'
- Created backend/.env with safe development values (gitignored)
- Verified: zero remaining DIRECTOR/LECTEUR references in backend
- Verified: zero remaining demo2026/demo123/admin2026 passwords in source

Stage Summary:
- 41 files changed across commit (includes prior agent changes)
- Password Eadmin2026! now consistent across: seed_demo.py, app-store.ts, users-store.ts, demo-accounts.ts, all E2E tests, all test plan generators
- All RoleEnum references now use DIRECTEUR (not DIRECTOR) and CITOYEN (not LECTEUR)
- 8 demo accounts fully defined with MFA, tenant, and institution metadata
