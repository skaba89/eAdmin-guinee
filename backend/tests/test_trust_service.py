"""Trust-boundary tests: configuration readiness is never qualification."""

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.config import Settings
from app.services.trust_service import TrustService


def _configured_settings(tmp_path) -> Settings:
    trust_bundle = tmp_path / "government-trust.pem"
    trust_bundle.write_text("test trust anchor placeholder", encoding="utf-8")
    return Settings(
        _env_file=None,
        ENVIRONMENT="development",
        PKI_ENABLED=True,
        PKI_PROVIDER="trusted-provider",
        PKI_SIGNING_ENDPOINT="https://pki.example.test/sign",
        PKI_TRUST_BUNDLE_PATH=str(trust_bundle),
        PKI_EXPECTED_POLICY_OID="1.2.3.4.5",
        PKI_CREDENTIAL_REFERENCE="vault://eadmin/pki/client",
        PKI_HSM_KEY_REFERENCE="hsm://partition/eadmin-signing-key",
        TSA_URL="https://tsa.example.test/timestamp",
    )


def _valid_external_evidence(**overrides):
    values = {
        "provider": "trusted-provider",
        "document_version": 3,
        "document_hash": "ab" * 32,
        "certificate_chain_valid": True,
        "certificate_status": "good",
        "revocation_checked_at": datetime(2026, 8, 9, tzinfo=timezone.utc),
        "timestamp_valid": True,
        "timestamp_token_hash": "cd" * 32,
        "timestamp_time": datetime(2026, 8, 9, tzinfo=timezone.utc),
        "trust_policy_oid": "1.2.3.4.5",
        "policy_valid": True,
        "validation_status": "validated",
        "qualification_status": "externally_attested",
        "qualification_attestation_ref": "attestation://authority/2026/0001",
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def test_pki_disabled_is_internal_approval_only():
    service = TrustService(Settings(_env_file=None, ENVIRONMENT="development"))

    status = service.status()

    assert status["pki_enabled"] is False
    assert status["integration_ready"] is False
    assert status["qualified_pki_available"] is False
    assert status["assurance_level"] == "internal_approval_only"


def test_enabling_pki_with_missing_trust_controls_fails_closed():
    with pytest.raises(ValidationError, match="required trust settings are missing"):
        Settings(
            _env_file=None,
            ENVIRONMENT="development",
            PKI_ENABLED=True,
            PKI_PROVIDER="provider-only",
        )


def test_pki_endpoints_must_use_https(tmp_path):
    trust_bundle = tmp_path / "trust.pem"
    trust_bundle.write_text("placeholder", encoding="utf-8")
    with pytest.raises(ValidationError, match="must use HTTPS"):
        Settings(
            _env_file=None,
            ENVIRONMENT="development",
            PKI_ENABLED=True,
            PKI_PROVIDER="provider",
            PKI_SIGNING_ENDPOINT="http://pki.example.test/sign",
            PKI_TRUST_BUNDLE_PATH=str(trust_bundle),
            PKI_EXPECTED_POLICY_OID="1.2.3",
            PKI_CREDENTIAL_REFERENCE="vault://credential",
            PKI_HSM_KEY_REFERENCE="hsm://key",
            TSA_URL="https://tsa.example.test",
        )


def test_raw_private_key_material_is_forbidden_in_settings(tmp_path):
    trust_bundle = tmp_path / "trust.pem"
    trust_bundle.write_text("placeholder", encoding="utf-8")
    with pytest.raises(ValidationError, match="raw private-key material is forbidden"):
        Settings(
            _env_file=None,
            ENVIRONMENT="development",
            PKI_ENABLED=True,
            PKI_PROVIDER="provider",
            PKI_SIGNING_ENDPOINT="https://pki.example.test/sign",
            PKI_TRUST_BUNDLE_PATH=str(trust_bundle),
            PKI_EXPECTED_POLICY_OID="1.2.3",
            PKI_CREDENTIAL_REFERENCE="vault://credential",
            PKI_HSM_KEY_REFERENCE="-----BEGIN PRIVATE KEY-----do-not-store-here",
            TSA_URL="https://tsa.example.test",
        )


def test_complete_configuration_is_ready_but_never_qualified_by_itself(tmp_path):
    service = TrustService(_configured_settings(tmp_path))

    status = service.status()

    assert status["integration_ready"] is True
    assert status["qualified_pki_available"] is False
    assert status["assurance_level"] == "pki_integration_ready_unqualified"
    assert status["private_key_in_application"] is False


def test_evidence_requires_external_qualification_attestation(tmp_path):
    service = TrustService(_configured_settings(tmp_path))

    no_attestation = service.evaluate_evidence(
        _valid_external_evidence(
            qualification_status="external_attestation_required",
            qualification_attestation_ref=None,
        )
    )
    qualified = service.evaluate_evidence(_valid_external_evidence())

    assert no_attestation["qualified_pki"] is False
    assert no_attestation["checks"]["external_qualification_attested"] is False
    assert qualified["qualified_pki"] is True


def test_revocation_or_timestamp_failure_blocks_qualification(tmp_path):
    service = TrustService(_configured_settings(tmp_path))

    revoked = service.evaluate_evidence(
        _valid_external_evidence(certificate_status="revoked")
    )
    bad_timestamp = service.evaluate_evidence(
        _valid_external_evidence(timestamp_valid=False)
    )

    assert revoked["qualified_pki"] is False
    assert bad_timestamp["qualified_pki"] is False
