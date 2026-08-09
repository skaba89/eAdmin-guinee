"""Static checks for privileged ABAC account attributes and SoD hardening."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def require(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def main() -> int:
    errors: list[str] = []
    paths = {
        "user": ROOT / "backend/app/models/user.py",
        "policy": ROOT / "backend/app/services/iam_policy.py",
        "authorization": ROOT / "backend/app/services/authorization_service.py",
        "access": ROOT / "backend/app/api/access_control.py",
        "governance": ROOT / "backend/app/api/iam_governance.py",
        "migration": ROOT / "backend/alembic/versions/add_user_abac_attributes.py",
        "test": ROOT / "backend/tests/test_iam_abac_governance.py",
    }
    for name, path in paths.items():
        require(path.exists(), f"Missing ABAC {name}: {path.relative_to(ROOT)}", errors)
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    text = {name: path.read_text(encoding="utf-8") for name, path in paths.items()}

    for field in (
        "employment_status",
        "security_clearance",
        "assurance_level",
        "privileged_account",
        "access_attributes_reviewed_at",
        "access_attributes_reviewed_by",
    ):
        require(field in text["user"], f"User ABAC field missing: {field}", errors)

    for permission in (
        '("users", "delete")',
        '("settings", "update")',
        '("tenants", "manage")',
    ):
        require(permission in text["policy"], f"Sensitive policy missing: {permission}", errors)
    require("verified_mfa_required" in text["policy"], "Sensitive operations must require MFA", errors)
    require("privileged_account_required" in text["policy"], "Privileged account flag must be enforced", errors)
    require("SOD_CONFLICTS" in text["policy"], "Maker/checker conflict matrix missing", errors)

    require("evaluate_security_attributes" in text["authorization"], "Central authorization must enforce ABAC", errors)
    require("would_violate_sod" in text["authorization"], "Central authorization must recheck SoD", errors)
    require("break_glass=grant.grant_type == \"break_glass\"" in text["authorization"], "Break-glass ABAC evaluation missing", errors)

    access = text["access"]
    require("AccessGrant.requested_by == current_user.id" in access, "Grant visibility must be actor-scoped", errors)
    require("would_violate_sod" in access, "Grant creation must reject SoD conflicts", errors)
    require("MFA vérifié requis pour demander un break-glass" in access, "Break-glass request MFA guard missing", errors)
    require('prefix="/security-profiles"' in access, "Security-profile API must be mounted", errors)

    governance = text["governance"]
    require("current_user.role != RoleEnum.SUPER_ADMIN" in governance, "ABAC mutations must be SUPER_ADMIN-only", errors)
    require("user_id == current_user.id" in governance, "Privileged self-review guard missing", errors)
    require("revoke_all_user_tokens" in governance, "ABAC changes must revoke sessions", errors)
    require("access_attributes_reviewed_by = current_user.id" in governance, "ABAC reviewer evidence missing", errors)

    migration = text["migration"]
    require('down_revision = "iam_jml_recertification"' in migration, "ABAC migration must extend the current Alembic head", errors)
    require("ck_users_security_clearance" in migration, "DB clearance constraint missing", errors)
    require("ck_users_assurance_level" in migration, "DB assurance constraint missing", errors)
    require("WHERE role = 'SUPER_ADMIN'" in migration, "Existing SUPER_ADMIN rollout backfill missing", errors)

    tests = text["test"]
    for scenario in (
        "sensitive_policy_requires_attributes_and_mfa",
        "suspended_account_fails_even_for_ordinary_permission",
        "temporary_approval_cannot_create_maker_checker_conflict",
        "sensitive_permanent_permission_needs_local_abac_attributes",
        "break_glass_requires_privileged_assured_account",
        "super_admin_cannot_review_own_privileged_attributes",
    ):
        require(scenario in tests, f"ABAC regression scenario missing: {scenario}", errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("IAM privileged ABAC profile policy: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
