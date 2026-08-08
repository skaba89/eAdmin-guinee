"""Provider-neutral trust boundary for certificate/TSA-backed signature evidence.

Configuration can make the platform ready to call an external trust provider,
but it can never make evidence qualified by itself. A qualified result requires
validated external evidence and an explicit external qualification attestation.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from app.config import Settings, settings


class TrustService:
    """Evaluate PKI integration readiness and already-persisted trust evidence."""

    def __init__(self, config: Settings | None = None) -> None:
        self.config = config or settings

    def _https(self, value: str) -> bool:
        return bool(value) and value.lower().startswith("https://")

    def configuration_checks(self) -> dict[str, bool]:
        config = self.config
        return {
            "integration_enabled": config.PKI_ENABLED,
            "provider_configured": bool(config.PKI_PROVIDER.strip()),
            "signing_endpoint_https": self._https(config.PKI_SIGNING_ENDPOINT),
            "tsa_endpoint_https": self._https(config.TSA_URL),
            "trust_bundle_present": bool(config.PKI_TRUST_BUNDLE_PATH)
            and Path(config.PKI_TRUST_BUNDLE_PATH).is_file(),
            "policy_oid_configured": bool(config.PKI_EXPECTED_POLICY_OID.strip()),
            "credential_reference_configured": bool(config.PKI_CREDENTIAL_REFERENCE.strip()),
            "external_hsm_key_reference_configured": bool(config.PKI_HSM_KEY_REFERENCE.strip()),
        }

    def integration_ready(self) -> bool:
        checks = self.configuration_checks()
        return checks["integration_enabled"] and all(
            ready for name, ready in checks.items() if name != "integration_enabled"
        )

    def status(self) -> dict[str, Any]:
        checks = self.configuration_checks()
        if not self.config.PKI_ENABLED:
            assurance_level = "internal_approval_only"
            reason = "Intégration PKI désactivée : seules les preuves d'approbation internes sont actives."
        elif self.integration_ready():
            assurance_level = "pki_integration_ready_unqualified"
            reason = (
                "La connectivité de confiance est configurée, mais aucune preuve n'est qualifiée "
                "sans validation cryptographique et attestation externe spécifiques à chaque signature."
            )
        else:
            assurance_level = "pki_integration_incomplete"
            reason = "Intégration PKI activée mais prérequis techniques de confiance incomplets."

        return {
            "pki_enabled": self.config.PKI_ENABLED,
            "provider": self.config.PKI_PROVIDER or None,
            "integration_ready": self.integration_ready(),
            "qualified_pki_available": False,
            "assurance_level": assurance_level,
            "configuration_checks": checks,
            "reason": reason,
            "private_key_in_application": False,
            "qualification_requires_external_attestation": True,
        }

    def evaluate_evidence(self, evidence: Any) -> dict[str, Any]:
        """Evaluate persisted provider evidence without performing network calls.

        The external provider adapter is responsible for cryptographic validation,
        revocation checking and TSA verification before persisting those results.
        This method enforces the final platform-side qualification invariant.
        """
        provider_matches = (
            self.integration_ready()
            and getattr(evidence, "provider", None) == self.config.PKI_PROVIDER
        )
        policy_matches = (
            getattr(evidence, "trust_policy_oid", None) == self.config.PKI_EXPECTED_POLICY_OID
        )
        checks = {
            "integration_ready": self.integration_ready(),
            "provider_matches": provider_matches,
            "document_bound": bool(getattr(evidence, "document_hash", None))
            and getattr(evidence, "document_version", None) is not None,
            "certificate_chain_valid": getattr(evidence, "certificate_chain_valid", False) is True,
            "certificate_status_good": getattr(evidence, "certificate_status", None) == "good",
            "revocation_checked": getattr(evidence, "revocation_checked_at", None) is not None,
            "timestamp_valid": getattr(evidence, "timestamp_valid", False) is True,
            "timestamp_present": bool(getattr(evidence, "timestamp_token_hash", None))
            and getattr(evidence, "timestamp_time", None) is not None,
            "policy_valid": getattr(evidence, "policy_valid", False) is True and policy_matches,
            "cryptographic_validation_complete": getattr(evidence, "validation_status", None)
            == "validated",
            "external_qualification_attested": getattr(evidence, "qualification_status", None)
            == "externally_attested"
            and bool(getattr(evidence, "qualification_attestation_ref", None)),
        }
        qualified = all(checks.values())
        return {
            "qualified_pki": qualified,
            "checks": checks,
            "provider": getattr(evidence, "provider", None),
            "document_version": getattr(evidence, "document_version", None),
            "document_hash": getattr(evidence, "document_hash", None),
            "validation_status": getattr(evidence, "validation_status", None),
            "qualification_status": getattr(evidence, "qualification_status", None),
            "reason": (
                "Preuve PKI validée et qualification externe attestée."
                if qualified
                else "Preuve non qualifiée : un ou plusieurs contrôles de confiance sont absents ou invalides."
            ),
        }


trust_service = TrustService()
