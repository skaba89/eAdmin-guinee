"""Fail-closed static checks for the PKI trust boundary."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def require(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def main() -> int:
    errors: list[str] = []

    config_path = ROOT / "backend/app/config.py"
    service_path = ROOT / "backend/app/services/trust_service.py"
    model_path = ROOT / "backend/app/models/qualified_signature_evidence.py"
    migration_path = ROOT / "backend/alembic/versions/add_qualified_signature_evidence.py"
    parapheur_path = ROOT / "backend/app/services/parapheur_service.py"
    api_path = ROOT / "backend/app/api/security_hardening.py"
    dossier_path = ROOT / "docs/security/TRUST_PKI_HOMOLOGATION.md"

    required_files = (
        config_path,
        service_path,
        model_path,
        migration_path,
        parapheur_path,
        api_path,
        dossier_path,
    )
    for path in required_files:
        require(path.exists(), f"Missing PKI trust file: {path.relative_to(ROOT)}", errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    config = config_path.read_text(encoding="utf-8")
    service = service_path.read_text(encoding="utf-8")
    model = model_path.read_text(encoding="utf-8")
    migration = migration_path.read_text(encoding="utf-8")
    parapheur = parapheur_path.read_text(encoding="utf-8")
    api = api_path.read_text(encoding="utf-8")
    dossier = dossier_path.read_text(encoding="utf-8")

    require("PKI_ENABLED: bool = False" in config, "PKI must be disabled by default", errors)
    require("PKI_HSM_KEY_REFERENCE" in config, "PKI must use an external HSM/KMS key reference", errors)
    require("PKI_PRIVATE_KEY" not in config, "Application settings must never define a PKI private key", errors)
    require("TSA_URL" in config, "TSA endpoint contract is required", errors)
    require("PKI_EXPECTED_POLICY_OID" in config, "Explicit trust policy OID is required", errors)

    require('"qualified_pki_available": False' in service, "Configuration status must never claim qualification", errors)
    for check in (
        "certificate_chain_valid",
        "certificate_status_good",
        "revocation_checked",
        "timestamp_valid",
        "policy_valid",
        "cryptographic_validation_complete",
        "external_qualification_attested",
    ):
        require(f'"{check}"' in service, f"Qualification invariant missing: {check}", errors)

    require(
        'default="external_attestation_required"' in model,
        "New external evidence must require qualification attestation by default",
        errors,
    )
    require(
        "qualification_attestation_ref" in model,
        "External qualification must keep an attestation reference",
        errors,
    )

    require("FORCE ROW LEVEL SECURITY" in migration, "External trust evidence must FORCE RLS", errors)
    require("FOR SELECT" in migration, "Ordinary document-scoped trust evidence must be read-only", errors)
    require(
        "qualified_signature_evidence_super_admin_all" in migration,
        "Privileged trust evidence mutation policy is missing",
        errors,
    )

    require(
        '"qualified_pki": False' in parapheur,
        "Internal parapheur evidence must remain explicitly non-qualified",
        errors,
    )
    require(
        '@router.get("/trust/evidence/{evidence_id}"' in api,
        "Trust evidence verification endpoint is required",
        errors,
    )
    require(
        '@router.post("/trust/evidence' not in api,
        "User-facing trust evidence creation endpoints are forbidden",
        errors,
    )

    for claim in ("preuve interne", "qualification externe attestée", "HSM/KMS", "RLS", "PRA/PCA"):
        require(claim.lower() in dossier.lower(), f"Homologation dossier missing: {claim}", errors)

    # Disallow the most dangerous literal bypasses in application source. The
    # only positive qualification value must be computed by TrustService from
    # all evidence checks, never hard-coded in an endpoint or parapheur service.
    app_sources = [
        path
        for path in (ROOT / "backend/app").rglob("*.py")
        if path != service_path
    ]
    for source_path in app_sources:
        source = source_path.read_text(encoding="utf-8", errors="ignore")
        require(
            '"qualified_pki": True' not in source and "'qualified_pki': True" not in source,
            f"Hard-coded qualified_pki=True forbidden: {source_path.relative_to(ROOT)}",
            errors,
        )

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    print("PKI trust boundary policy: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
