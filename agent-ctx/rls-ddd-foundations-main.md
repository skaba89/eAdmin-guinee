# Task: Multi-Tenant RLS and DDD Architectural Foundations

## Summary
Added multi-tenant Row-Level Security (RLS) and Domain-Driven Design (DDD) architectural foundations to the eAdmin Guinée backend.

## Files Created

### Part 1: Multi-Tenant RLS in PostgreSQL
1. **`backend/alembic/versions/add_rls_policies.py`** - Alembic migration that enables RLS on `documents`, `courriers`, and `workflows` tables with:
   - Super admin bypass policies (full access to all data)
   - Institution-scoped SELECT policies (users see only their institution's data)
   - Institution-scoped INSERT policies on documents (users can only insert for their institution)
   - Proper downgrade function to remove all policies and disable RLS

2. **`backend/app/middleware/rls.py`** - Starlette middleware that:
   - Extracts JWT user ID from Authorization header
   - Sets PostgreSQL session variable `app.current_user_id` for RLS policy evaluation
   - Gracefully handles auth failures without blocking requests

3. **`backend/app/middleware/__init__.py`** - Updated to export `RLSMiddleware`

### Part 2: DDD Architectural Foundations
4. **`backend/app/domain/entities.py`** - Core domain entities:
   - `DocumentClassification` enum (PUBLIC, DIFFUSION_LIMITEE, CONFIDENTIEL, SECRET)
   - `RequestStatus` enum (SOUMISE through LIVRE/REJETE)
   - `WorkflowStatus` enum (BROUILLON, ACTIF, EN_PAUSE, TERMINE)
   - `TenantScope` value object for multi-tenant category access
   - `Clearance` value object with classification-based access control
   - `DomainEvent` base class and specialized events (DocumentAccessedEvent, RequestStatusChangedEvent)

5. **`backend/app/domain/policies.py`** - Business rule policies:
   - `DocumentAccessPolicy` - Role-based document access with clearance levels and tenant scope checks
   - `RequestProcessingPolicy` - Role-based request processing, approval, and rejection rules

6. **`backend/app/domain/validators.py`** - Input validators:
   - `PasswordValidator` - Government security password requirements (min 8 chars, uppercase, digit)
   - `NINValidator` - Guinea National Identification Number format validation
   - `EmailValidator` - Email format and government domain requirements
   - `InstitutionValidator` - Multi-tenant institution assignment validation

7. **`backend/app/domain/__init__.py`** - Exports all domain layer classes

## Fix Applied
- Fixed `DomainEvent` dataclass: changed `event_type` and `aggregate_id` from required to optional (with default `""`) to resolve Python dataclass inheritance ordering issue where non-default fields followed default fields in subclasses.

## Verification
- All domain layer imports verified successfully
- All functional tests passed (TenantScope, Clearance, DocumentAccessPolicy, RequestProcessingPolicy, PasswordValidator, NINValidator, EmailValidator, InstitutionValidator, ValidationResult, DomainEvent subclasses)
- RLS middleware and migration file structure verified via AST parsing
- Next.js lint passes (pre-existing errors unchanged)
