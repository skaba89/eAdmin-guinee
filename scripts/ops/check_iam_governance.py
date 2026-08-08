"""Static fail-closed checks for IAM governance invariants."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def require(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def main() -> int:
    errors: list[str] = []
    paths = {
        "model": ROOT / "backend/app/models/access_grant.py",
        "migration": ROOT / "backend/alembic/versions/add_access_grants.py",
        "service": ROOT / "backend/app/services/authorization_service.py",
        "api": ROOT / "backend/app/api/access_control.py",
        "users": ROOT / "backend/app/api/users.py",
        "auth_hardening": ROOT / "backend/app/api/auth_hardening.py",
        "main": ROOT / "backend/app/main.py",
        "tests": ROOT / "backend/tests/test_iam_governance.py",
    }
    for name, path in paths.items():
        require(path.exists(), f"Missing IAM {name}: {path.relative_to(ROOT)}", errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    text = {name: path.read_text(encoding="utf-8") for name, path in paths.items()}

    migration = text["migration"]
    require("FORCE ROW LEVEL SECURITY" in migration, "Access grants must FORCE RLS", errors)
    require("access_grants_scoped_read" in migration, "Scoped grant read policy missing", errors)
    require("access_grants_scoped_insert" in migration, "Scoped grant insert policy missing", errors)
    require("access_grants_scoped_update" in migration, "Scoped approval update policy missing", errors)
    require("grantee_id <> requested_by" in migration, "Database self-grant constraint missing", errors)
    require("valid_until > valid_from" in migration, "Database grant-window constraint missing", errors)

    service = text["service"]
    require("PERMISSION_MATRIX" in service, "Authorization must use central permission matrix", errors)
    require("AccessGrant.status == \"active\"" in service, "Only active grants may authorize", errors)
    require("AccessGrant.valid_from <= now" in service, "Grant start time must be enforced", errors)
    require("AccessGrant.valid_until > now" in service, "Grant expiration must be enforced", errors)
    require("grant.requires_mfa and not mfa_verified" in service, "Temporary grants must enforce MFA", errors)
    require("can_assign_role" in service, "Central role-assignment guard missing", errors)
    require("can_administer_user" in service, "Central user-administration guard missing", errors)

    api = text["api"]
    require('timedelta(hours=4)' in api, "Break-glass must be capped at four hours", errors)
    require('timedelta(days=30)' in api, "Delegation must have a bounded maximum duration", errors)
    require("ticket_reference" in api and "obligatoire pour break-glass" in api, "Break-glass incident ticket required", errors)
    require("_mfa_verified(request, current_user)" in api, "Grant approval must require verified MFA", errors)
    require("current_user.id in {grant.requested_by, grant.grantee_id}" in api, "Separation-of-duties approval guard missing", errors)
    require("RoleEnum.SUPER_ADMIN" in api and "Break-glass requiert" in api, "Break-glass SUPER_ADMIN approval missing", errors)

    users = text["users"]
    require("authorization_service.can_assign_role" in users, "User creation/update must use central role guard", errors)
    require("authorization_service.can_administer_user" in users, "User mutation must use central scope guard", errors)
    require("revoke_all_user_tokens" in users, "Role/scope changes must revoke sessions", errors)
    require("User.tenant_id == tenant" in users, "User listing must be tenant-scoped", errors)
    require("User.institution_id == current_user.institution_id" in users, "User listing must be institution-scoped", errors)

    auth_hardening = text["auth_hardening"]
    require('@router.post(\n    "/admin/create-user"' in auth_hardening, "Legacy admin-create path must be shadowed", errors)
    require("authorization_service.can_assign_role" in auth_hardening, "Shadow admin-create route must use central role guard", errors)

    main = text["main"]
    require("access_control.router" in main, "Access-control router must be registered", errors)
    require("auth_hardening.router" in main and "auth.router" in main, "Auth hardening/legacy registration missing", errors)
    require(
        main.index("auth_hardening.router") < main.index("auth.router"),
        "Auth hardening router must be registered before legacy auth router",
        errors,
    )

    tests = text["tests"]
    for scenario in (
        "cannot_promote_to_superadmin",
        "temporary_grant_requires_mfa",
        "expired_temporary_grant",
        "independent_mfa_approver",
        "break_glass_requires_incident_ticket",
    ):
        require(scenario in tests, f"Adversarial IAM scenario missing: {scenario}", errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    print("IAM governance policy: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
