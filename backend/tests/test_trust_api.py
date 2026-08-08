"""API regression tests for the PKI trust boundary."""

from datetime import datetime, timezone

import pytest

from app.models.document import Document, DocumentStatusEnum
from app.models.qualified_signature_evidence import QualifiedSignatureEvidence


@pytest.mark.asyncio
async def test_trust_status_never_claims_qualification_from_default_config(
    client,
    super_admin_auth_headers,
):
    response = await client.get(
        "/api/v1/security/trust/status",
        headers=super_admin_auth_headers,
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["qualified_pki_available"] is False
    assert payload["private_key_in_application"] is False
    assert payload["qualification_requires_external_attestation"] is True


@pytest.mark.asyncio
async def test_persisted_external_evidence_is_not_qualified_when_runtime_pki_is_disabled(
    client,
    db_session,
    super_admin_user,
    super_admin_auth_headers,
):
    document = Document(
        title="Acte à signer",
        description="Document de test de la frontière PKI",
        owner_id=super_admin_user.id,
        version=1,
        current_version=1,
        status=DocumentStatusEnum.APPROVED,
    )
    db_session.add(document)
    await db_session.flush()

    evidence = QualifiedSignatureEvidence(
        document_id=document.id,
        document_version=1,
        document_hash="ab" * 32,
        provider="trusted-provider",
        provider_transaction_id="txn-001",
        evidence_object_key="trust-evidence/txn-001.p7s",
        signer_certificate_fingerprint_sha256="12" * 32,
        signer_certificate_serial="SERIAL-001",
        signer_subject="CN=Signataire Test",
        signature_algorithm="RSA-PSS-SHA256",
        certificate_chain_valid=True,
        certificate_status="good",
        revocation_checked_at=datetime.now(timezone.utc),
        timestamp_token_hash="34" * 32,
        timestamp_time=datetime.now(timezone.utc),
        timestamp_valid=True,
        trust_policy_oid="1.2.3.4.5",
        policy_valid=True,
        validation_status="validated",
        validated_at=datetime.now(timezone.utc),
        qualification_status="externally_attested",
        qualification_attestation_ref="attestation://test/001",
        qualification_attested_at=datetime.now(timezone.utc),
    )
    db_session.add(evidence)
    await db_session.commit()

    response = await client.get(
        f"/api/v1/security/trust/evidence/{evidence.id}",
        headers=super_admin_auth_headers,
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["evidence_id"] == str(evidence.id)
    assert payload["document_id"] == str(document.id)
    assert payload["qualified_pki"] is False
    assert payload["checks"]["integration_ready"] is False
