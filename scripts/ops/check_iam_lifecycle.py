"""Static fail-closed checks for Joiner-Mover-Leaver and recertification."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def require(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def main() -> int:
    errors: list[str] = []
    paths = {
        "models": ROOT / "backend/app/models/identity_lifecycle.py",
        "migration": ROOT / "backend/alembic/versions/iam_jml_recertification.py",
        "lifecycle": ROOT / "backend/app/services/identity_lifecycle_service.py",
        "reviews": ROOT / "backend/app/services/access_review_service.py",
        "api": ROOT / "backend/app/api/access_reviews.py",
        "users": ROOT / "backend/app/api/users.py",
        "access_control": ROOT / "backend/app/api/access_control.py",
        "tests": ROOT / "backend/tests/test_iam_lifecycle.py",
    }
    for name, path in paths.items():
        require(path.exists(), f"Missing IAM lifecycle {name}: {path.relative_to(ROOT)}", errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    text = {name: path.read_text(encoding="utf-8") for name, path in paths.items()}

    migration = text["migration"]
    require(
        "FORCE ROW LEVEL SECURITY" in migration,
        "Lifecycle migration must force RLS on governed tables",
        errors,
    )
    for table in (
        "identity_lifecycle_events",
        "access_review_campaigns",
        "access_review_items",
    ):
        require(
            f'"{table}"' in migration,
            f"{table} must be present in the FORCE-RLS migration",
            errors,
        )
    require("identity_lifecycle_scoped_insert" in migration, "Lifecycle insert policy missing", errors)
    require("identity_lifecycle_scoped_read" in migration, "Lifecycle read policy missing", errors)
    require(
        "identity_lifecycle_scoped_update" not in migration,
        "Lifecycle evidence must remain append-only",
        errors,
    )
    require("access_review_campaigns_scoped_update" in migration, "Campaign update RLS missing", errors)
    require("access_review_items_scoped_update" in migration, "Review item update RLS missing", errors)
    require("uq_access_review_campaign_user" in migration, "Duplicate campaign/user review guard missing", errors)

    lifecycle = text["lifecycle"]
    require("sessions_invalid_before = now" in lifecycle, "JWT cutoff required for mover/leaver", errors)
    require("revoke_all_user_tokens" in lifecycle, "Refresh-token revocation required", errors)
    require("AccessGrant.grantee_id == user_id" in lifecycle, "Grantee grants must be revoked", errors)
    require("AccessGrant.requested_by == user_id" in lifecycle, "Sponsored grants must be revoked", errors)
    require("AccessGrant.approved_by == user_id" in lifecycle, "Approved grants must be revoked", errors)
    require("FederatedIdentity.status == \"active\"" in lifecycle, "Active SSO bindings must be found", errors)
    require("identity.status = \"disabled\"" in lifecycle, "Leaver must disable SSO binding", errors)
    require('event_type="joiner"' in lifecycle, "Joiner evidence missing", errors)
    require('event_type="mover"' in lifecycle, "Mover evidence missing", errors)
    require('event_type="leaver"' in lifecycle, "Leaver evidence missing", errors)
    require('"sso_bindings_preserved": True' in lifecycle, "Mover must preserve SSO binding explicitly", errors)

    # Revocation must happen before new scope/offboarding is persisted: losing a
    # session on DB rollback is safe, retaining stale refresh tokens is not.
    require(
        lifecycle.index("await token_blacklist.revoke_all_user_tokens")
        < lifecycle.index("user.sessions_invalid_before = now"),
        "External refresh-token authority must be revoked before DB session cutoff",
        errors,
    )

    reviews = text["reviews"]
    require("RoleEnum.DIRECTEUR.hierarchy_level()" in reviews, "Campaign creator level guard missing", errors)
    require("RoleEnum.CHEF_SERVICE.hierarchy_level()" in reviews, "Reviewer level guard missing", errors)
    require("role.hierarchy_level() < reviewer.role.hierarchy_level()" in reviews, "Reviewer may only review lower roles", errors)
    require("actor.id == item.user_id" in reviews, "Self-recertification guard missing", errors)
    require("revoke_temporary_access" in reviews, "Temporary privilege revocation decision missing", errors)
    require("offboard_user" in reviews, "Disable-account review decision must use full leaver controls", errors)
    require('campaign.status = "completed"' in reviews, "Campaign completion transition missing", errors)

    api = text["api"]
    require("_require_verified_mfa" in api, "Recertification MFA guard missing", errors)
    require(api.count("_require_verified_mfa(request, current_user)") >= 2, "Create and decision must both require MFA", errors)
    require("Seul le reviewer désigné" in api, "Reviewer ownership guard missing", errors)
    require('action="ACCESS_REVIEW"' in api, "Recertification audit event missing", errors)

    users = text["users"]
    require("identity_lifecycle_service.record_joiner" in users, "User creation must emit Joiner", errors)
    require("identity_lifecycle_service.handle_mover" in users, "Security scope mutation must run Mover", errors)
    require("identity_lifecycle_service.offboard_user" in users, "User deactivation must run Leaver", errors)
    require("token_blacklist.revoke_all_user_tokens" not in users, "User API must not bypass lifecycle service", errors)

    access_control = text["access_control"]
    require("access_reviews_router" in access_control, "Access review router must be mounted under IAM", errors)
    require('prefix="/reviews"' in access_control, "Access review route prefix missing", errors)

    tests = text["tests"]
    for scenario in (
        "joiner_creation_persists_lifecycle_evidence",
        "mover_revokes_sessions_and_all_related_grants",
        "leaver_disables_sso_revokes_grants_and_sets_session_cutoff",
        "recertification_campaign_requires_verified_mfa",
        "recertification_revoke_temporary_forces_new_session",
        "recertification_disable_account_runs_full_leaver_controls",
        "access_review_rejects_cross_institution_campaign",
        "access_review_rejects_self_recertification",
    ):
        require(scenario in tests, f"IAM lifecycle scenario missing: {scenario}", errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    print("IAM lifecycle and recertification policy: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
