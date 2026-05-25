# Task 1-2-3-7: Security Agent — Auth, RBAC, RLS Critical Fixes

## Summary
Implemented critical security fixes for the eAdmin Guinée GovTech platform across 3 backend modules.

## Files Modified
1. **backend/app/api/auth.py** — Complete rewrite
2. **backend/app/services/token_blacklist.py** — Extended with login attempt tracking
3. **backend/app/middleware/rbac.py** — Complete rewrite with 7-level hierarchy
4. **backend/app/middleware/rls.py** — Replaced middleware with dependency
5. **backend/app/models/user.py** — Updated hierarchy levels
6. **backend/app/middleware/__init__.py** — Added set_rls_context export
7. **backend/tests/test_auth_security.py** — Updated for Redis-backed methods
8. **backend/tests/test_rbac.py** — Updated hierarchy test

## Changes Detail

### auth.py
- Removed `_token_blacklist_set` and `is_token_blacklisted()` (in-memory fallback)
- Removed `_login_attempts` dict and all `_is_account_locked`, `_record_failed_login`, `_reset_login_attempts`, `_get_remaining_attempts` functions
- Replaced with Redis-backed `token_blacklist.is_account_locked()`, `record_failed_login()`, `reset_login_attempts()`, `get_remaining_attempts()`
- Enhanced password validation: 12 chars min + lowercase + uppercase + digit + special character
- Shared `_validate_password_strength()` function used by all 3 Pydantic models
- Added `tenant_id` and `institution_id` to JWT claims in login, refresh, and MFA verify
- Added device fingerprinting: `_generate_device_fingerprint(user_agent, client_ip)`
- Updated `get_current_user()` to store user and JWT payload in `request.state`

### token_blacklist.py
- Added `LOGIN_ATTEMPTS_PREFIX = "eadmin:login_attempts:"`
- Added 4 new methods: `is_account_locked()`, `record_failed_login()`, `reset_login_attempts()`, `get_remaining_attempts()`
- All use Redis lists with TTL for automatic cleanup

### rbac.py
- Updated PERMISSION_MATRIX for 7-level hierarchy (MAIRIE/AGENCE→2, ADMIN→3, CHEF_SERVICE→4)
- Added 10 new permissions: tenants, institutions, reports, signatures, parapheur
- Added `require_clearance()` dependency with tenant/institution scope checking
- Added `require_any_permission()` dependency with OR logic
- All docstrings in French

### rls.py
- Replaced BaseHTTPMiddleware with `set_rls_context()` FastAPI dependency
- Reads user from `request.state.user` (no double JWT decode)
- Sets 3 PostgreSQL session variables: user_id, tenant_id, institution_id
- Uses request-scoped database session (not a new connection)
- RLSMiddleware class kept as no-op for backward compatibility

### user.py
- MAIRIE: level 1 → 2 (merged with AGENT)
- AGENCE: level 1 → 2 (merged with AGENT)
- ADMIN: level 4 → 3
- CHEF_SERVICE: level 3 → 4
- Updated docstrings with 7-level hierarchy description
