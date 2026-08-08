"""Regression tests for grounded, human-in-the-loop administrative assistance."""

import uuid

import pytest

from app.models.administrative_service import AdministrativeService
from app.models.document import Document, DocumentStatusEnum
from app.models.document_ocr import DocumentOCRResult


async def _catalog_service(db_session, tenant_id: str, created_by: uuid.UUID) -> AdministrativeService:
    service = AdministrativeService(
        tenant_id=tenant_id,
        service_id="acte-naissance-test",
        version=3,
        category_id="etat-civil",
        category_name="État civil",
        name="Extrait d'acte de naissance",
        description="Délivrance d'un extrait d'acte de naissance enregistré dans le catalogue.",
        fee_label="Selon barème en vigueur",
        expected_processing_label="Objectif opérationnel: 3 jours ouvrables",
        sla_business_days=3,
        required_documents=["Numéro d'acte si disponible", "Pièce d'identité"],
        routing_terms=["naissance", "acte", "extrait", "etat civil"],
        policy_status="operational_default",
        source_reference="CAT-ETAT-CIVIL-TEST-2026",
        source_url=None,
        is_active=True,
        created_by=created_by,
    )
    db_session.add(service)
    await db_session.commit()
    await db_session.refresh(service)
    return service


@pytest.mark.asyncio
async def test_assistant_answers_only_from_catalog_with_visible_source(
    client,
    db_session,
    super_admin_user,
    super_admin_auth_headers,
    test_tenant,
):
    service = await _catalog_service(db_session, test_tenant.id, super_admin_user.id)

    response = await client.post(
        "/api/v1/ai/assistant/ask",
        headers=super_admin_auth_headers,
        json={"question": "Quels documents faut-il pour un extrait acte naissance ?"},
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["grounded"] is True
    assert payload["mode"] == "grounded_retrieval"
    assert payload["decision_authority"] == "none"
    assert service.service_id in payload["relevant_services"]
    assert any("CAT-ETAT-CIVIL-TEST-2026" in source for source in payload["sources"])
    assert "Numéro d'acte" in payload["answer"]
    assert "règle opérationnelle" not in payload["answer"].lower()  # source is explicitly referenced


@pytest.mark.asyncio
async def test_assistant_refuses_to_invent_when_catalog_has_no_match(
    client,
    db_session,
    super_admin_user,
    super_admin_auth_headers,
    test_tenant,
):
    await _catalog_service(db_session, test_tenant.id, super_admin_user.id)

    response = await client.post(
        "/api/v1/ai/assistant/ask",
        headers=super_admin_auth_headers,
        json={"question": "Quelle autorisation faut-il pour exploiter un satellite orbital ?"},
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["grounded"] is True
    assert payload["confidence"] == 0.0
    assert payload["sources"] == []
    assert "source suffisamment précise" in payload["answer"]
    assert "inventée" in payload["answer"]


@pytest.mark.asyncio
async def test_redaction_is_draft_only_without_invented_appeal_deadline(
    client,
    super_admin_auth_headers,
):
    response = await client.post(
        "/api/v1/ai/redact",
        headers=super_admin_auth_headers,
        json={
            "request_type": "Demande administrative test",
            "decision": "rejected",
            "citizen_name": "Citoyen Test",
            "reason": "Le dossier transmis est incomplet.",
            "language": "fr",
        },
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["draft_only"] is True
    assert payload["human_review_required"] is True
    assert payload["decision_executed"] is False
    assert "BROUILLON NON SIGNÉ" in payload["letter"]
    assert "30 jours" not in payload["letter"]
    assert "15 jours" not in payload["letter"]


@pytest.mark.asyncio
async def test_auto_route_is_only_a_grounded_recommendation_from_real_ocr(
    client,
    db_session,
    super_admin_user,
    super_admin_auth_headers,
    test_tenant,
):
    service = await _catalog_service(db_session, test_tenant.id, super_admin_user.id)
    document = Document(
        title="Acte de naissance reçu",
        file_path="documents/test/acte.pdf",
        file_type="application/pdf",
        file_size=1024,
        version=1,
        current_version=1,
        status=DocumentStatusEnum.DRAFT,
        owner_id=super_admin_user.id,
        tags={"reference": "ACTE/TEST/001"},
    )
    db_session.add(document)
    await db_session.flush()
    db_session.add(
        DocumentOCRResult(
            document_id=document.id,
            version_number=1,
            document_hash="e" * 64,
            language="fra",
            engine="tesseract",
            confidence=94.0,
            page_count=1,
            extracted_text="EXTRAIT ACTE DE NAISSANCE REPUBLIQUE DE GUINEE",
            created_by=super_admin_user.id,
        )
    )
    await db_session.commit()

    response = await client.post(
        "/api/v1/ai/auto-route",
        headers=super_admin_auth_headers,
        json={"document_id": str(document.id)},
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["target_service"] == service.service_id
    assert payload["routing_executed"] is False
    assert payload["human_review_required"] is True
    assert payload["priority"] == "not_assessed"
    assert payload["target_department"] is None
    assert payload["sources"]


@pytest.mark.asyncio
async def test_unsourced_narrative_report_generation_is_blocked(
    client,
    super_admin_auth_headers,
):
    response = await client.post(
        "/api/v1/ai/report/generate",
        headers=super_admin_auth_headers,
        json={"report_type": "compliance_report", "parameters": {}},
    )

    assert response.status_code == 501, response.text
    assert "source de données" in response.json()["detail"]
