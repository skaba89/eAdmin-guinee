"""Static fail-closed checks for SOC/SIEM and incident-response invariants."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def require(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def main() -> int:
    errors: list[str] = []
    paths = {
        "config": ROOT / "backend/app/config.py",
        "model": ROOT / "backend/app/models/security_incident.py",
        "migration": ROOT / "backend/alembic/versions/add_soc_incident_response.py",
        "service": ROOT / "backend/app/services/soc_service.py",
        "api": ROOT / "backend/app/api/soc.py",
        "main": ROOT / "backend/app/main.py",
        "tests": ROOT / "backend/tests/test_soc_service.py",
        "runbook": ROOT / "docs/security/SOC_INCIDENT_RESPONSE.md",
    }
    for name, path in paths.items():
        require(path.exists(), f"Missing SOC {name}: {path.relative_to(ROOT)}", errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    text = {name: path.read_text(encoding="utf-8") for name, path in paths.items()}

    config = text["config"]
    require("SOC_INGEST_ENABLED: bool = False" in config, "External SOC ingestion must default off", errors)
    require("SOC_INGEST_HMAC_SECRET" in config, "SOC HMAC secret setting missing", errors)
    require("SOC_INGEST_MAX_SKEW_SECONDS" in config, "SOC anti-replay window missing", errors)

    model = text["model"]
    require("class SecuritySignal" in model, "Normalized SecuritySignal model missing", errors)
    require("class SecurityIncident" in model, "SecurityIncident lifecycle model missing", errors)
    require("network_source_hash" in model, "Network source must be pseudonymized", errors)
    require("user_agent_hash" in model, "User agent must be pseudonymized", errors)
    require("external_event_id" in model, "External event idempotency key missing", errors)

    migration = text["migration"]
    require('down_revision = "oidc_federated_identities"' in migration, "SOC migration must extend current migration head", errors)
    require(migration.count("FORCE ROW LEVEL SECURITY") >= 2, "SOC tables must FORCE RLS", errors)
    require("SOC_SERVICE" in migration, "Dedicated SOC_SERVICE RLS context missing", errors)
    require("security_signals_scoped_read" in migration, "Scoped signal read policy missing", errors)
    require("security_incidents_scoped_update" in migration, "Scoped incident response policy missing", errors)

    service = text["service"]
    require('event.listen(AuditLog, "after_insert"' in service, "AuditLog must mirror transactionally into SOC", errors)
    require("[REDACTED]" in service, "Sensitive audit detail redaction missing", errors)
    for fragment in ("authorization", "password", "secret", "token", "private_key"):
        require(f'"{fragment}"' in service, f"Sensitive SOC redaction keyword missing: {fragment}", errors)
    require("eadmin-soc-pseudonym-v1" in service, "Domain-separated SOC pseudonym key derivation missing", errors)
    require("SOC_SERVICE" in service, "SOC service DB boundary missing", errors)
    require("authentication_failure_burst" in service, "Login-failure detection rule missing", errors)
    require("break_glass_activated" in service, "Break-glass detection rule missing", errors)
    require("critical_security_audit" in service, "Critical audit detection rule missing", errors)
    require("privilege_change" in service, "Privilege-change detection rule missing", errors)
    require("skip_locked=True" in service, "Concurrent correlation workers must use SKIP LOCKED", errors)

    api = text["api"]
    require("X-EAdmin-SOC-Timestamp" in api, "Signed SOC timestamp header missing", errors)
    require("X-EAdmin-SOC-Signature" in api, "Signed SOC HMAC header missing", errors)
    require("hmac.compare_digest" in api, "SOC HMAC comparison must be constant-time", errors)
    require("SOC_INGEST_MAX_SKEW_SECONDS" in api, "SOC replay window must be enforced", errors)
    require("begin_nested" in api, "SOC idempotent ingestion must handle races", errors)
    require("network_source_hash" in api, "SOC API must expose only pseudonymized network source", errors)
    require("network_source: str" in api, "Collector input may carry transient network source", errors)
    require("class SignalResponse" in api and "network_source: str" not in api.split("class SignalResponse", 1)[1].split("class IncidentResponse", 1)[0], "Raw network source must never be returned", errors)
    require("incident.status != \"resolved\"" in api, "Incident closure must require prior resolution", errors)
    require("@router.delete" not in api, "SOC evidence must not have destructive delete endpoints", errors)

    main = text["main"]
    require("soc.ingest_router" in main, "Machine SOC ingest router must be registered separately", errors)
    require("soc.router" in main, "Human SOC incident router must be registered under RLS", errors)

    tests = text["tests"]
    for scenario in (
        "security_audit_is_mirrored_redacted_and_pseudonymized",
        "five_failed_logins_in_ten_minutes_create_one_high_incident",
        "break_glass_approval_becomes_critical_incident",
        "signed_external_ingest_is_idempotent_and_rejects_replay_window",
        "incident_response_requires_resolution_before_close",
    ):
        require(scenario in tests, f"SOC adversarial scenario missing: {scenario}", errors)

    runbook = text["runbook"].lower()
    for required in (
        "sev-1",
        "sev-2",
        "confinement",
        "éradication",
        "rétablissement",
        "post-mortem",
        "chaîne de conservation",
        "rpo",
        "rto",
        "siem",
    ):
        require(required in runbook, f"SOC runbook missing operational requirement: {required}", errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    print("SOC governance policy: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
