"""Tests for deterministic, document-bound parapheur evidence."""

from datetime import datetime, timezone

from app.services.parapheur_service import ParapheurService


def _evidence(**overrides):
    values = {
        "circuit_id": "11111111-1111-1111-1111-111111111111",
        "step_id": "22222222-2222-2222-2222-222222222222",
        "user_id": "33333333-3333-3333-3333-333333333333",
        "action": "sign",
        "status": "completed",
        "document_id": "44444444-4444-4444-4444-444444444444",
        "document_version": 7,
        "document_hash": "ab" * 32,
        "evidence_timestamp": datetime(2026, 8, 8, 21, 0, 0, 123456, tzinfo=timezone.utc),
    }
    values.update(overrides)
    return values


def test_internal_evidence_hash_is_deterministic():
    service = ParapheurService()
    evidence = _evidence()

    first = service._generate_signature_hash(**evidence)
    second = service._generate_signature_hash(**evidence)

    assert first == second
    assert len(first) == 64


def test_internal_evidence_hash_is_bound_to_document_hash():
    service = ParapheurService()

    original = service._generate_signature_hash(**_evidence())
    changed = service._generate_signature_hash(**_evidence(document_hash="cd" * 32))

    assert original != changed


def test_internal_evidence_hash_is_bound_to_document_version():
    service = ParapheurService()

    version_7 = service._generate_signature_hash(**_evidence(document_version=7))
    version_8 = service._generate_signature_hash(**_evidence(document_version=8))

    assert version_7 != version_8


def test_internal_evidence_hash_is_bound_to_persisted_timestamp():
    service = ParapheurService()

    first = service._generate_signature_hash(**_evidence())
    later = service._generate_signature_hash(
        **_evidence(
            evidence_timestamp=datetime(2026, 8, 8, 21, 0, 1, 123456, tzinfo=timezone.utc)
        )
    )

    assert first != later


def test_internal_evidence_hash_normalizes_hash_case():
    service = ParapheurService()

    lower = service._generate_signature_hash(**_evidence(document_hash="ab" * 32))
    upper = service._generate_signature_hash(**_evidence(document_hash=("ab" * 32).upper()))

    assert lower == upper
