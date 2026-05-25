---
Task ID: 2+3+4
Agent: RBAC & Multi-tenant Agent
Task: Fix /register endpoint, implement RBAC middleware, add multi-tenant support

Work Log:
- Fixed /register endpoint: Added CITOYEN role forcing for public registration with warning logging for non-citizen role attempts
- Created AdminUserCreate endpoint (POST /admin/create-user): ADMIN/SUPER_ADMIN only, with RESTRICTED_ROLES guard preventing ADMIN from creating SUPER_ADMIN/ADMIN/MINISTRE/DIRECTEUR/CHEF_SERVICE accounts
- Fixed RoleEnum.to_frontend_role(): Corrected mapping from old names (DIRECTOR→ministere, LECTEUR→citoyen) to proper 9-role mapping (SUPER_ADMIN→superadmin, MINISTRE→ministre, DIRECTEUR→directeur, CHEF_SERVICE→chef_service, ADMIN→admin, AGENT→agent, MAIRIE→mairie, AGENCE→agence, CITOYEN→citoyen)
- Added hierarchy_level() and can_create_role() methods to RoleEnum
- Added multi-tenant fields to User model: tenant_id (String(100), indexed, nullable) and institution_id (String(100), indexed, nullable) for RLS
- Created RBAC middleware (backend/app/middleware/rbac.py) with:
  - PERMISSION_MATRIX: 30+ (resource, action) → min hierarchy level mappings
  - require_permission(resource, action): FastAPI dependency for permission-based access
  - require_role(*roles): FastAPI dependency for role-based access
- Applied RBAC middleware to 4 API route files:
  - users.py: require_permission("users", "read/create/update/delete")
  - audit.py: require_permission("audit", "read") + fixed RoleEnum.DIRECTOR→DIRECTEUR
  - workflows.py: require_permission("workflows", "read/manage")
  - analytics.py: require_permission("analytics", "read")
- Fixed demo account passwords: agent@eadmin.gn and directeur@eadmin.gn changed from 'demo2026' to 'Eadmin2026!'
- Fixed stale RoleEnum references: seed_demo.py (DIRECTOR→MINISTRE, LECTEUR→CITOYEN), tests/conftest.py (DIRECTOR→DIRECTEUR, LECTEUR→CITOYEN)

Stage Summary:
- 8 files modified: auth.py, user.py, demo-accounts.ts, users.py, audit.py, workflows.py, analytics.py, seed_demo.py, conftest.py
- 1 file created: backend/app/middleware/rbac.py
- Public registration now forced to CITOYEN role (security fix)
- Admin user creation endpoint with hierarchical RBAC guards
- All 9 roles properly mapped frontend↔backend
- RBAC middleware active on all sensitive endpoints
- Multi-tenant isolation fields added to User model
- All demo passwords consistent: Eadmin2026!
