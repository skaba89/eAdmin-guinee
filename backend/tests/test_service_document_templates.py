"""Adversarial invariants for server-authoritative administrative documents."""

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.api.service_catalog import ServiceVersionCreate
from app.models.service_request import DeliveryModeEnum
from app.services.service_document_templates import (
    document_template_fingerprint,
    render_approved_document,
    validate_document_template,
)


def _request(**overrides):
    values = {
        "reference": "GN-2026-ABC123",
        "citizen_first_name": "Aïssatou",
        "citizen_name": "Diallo",
        "citizen_nin": "NIN-001",
        "citizen_phone": "+224600000000",
        "citizen_email": "citoyen@example.gn",
        "citizen_address": "Kaloum, Conakry",
        "service_name": "Attestation pilote",
        "assigned_service": "Institution pilote",
        "motif": "Dossier administratif",
        "delivery_mode": DeliveryModeEnum.EN_LIGNE,
        "mairie": "Mairie de Kaloum",
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def _service(**overrides):
    title = "${service_name} — ${reference}"
    body = (
        "Le présent document concerne ${citizen_full_name}.\n\n"
        "Référence : ${reference}. Institution : ${institution_name}."
    )
    values = {
        "version": 4,
        "document_template_status": "approved",
        "document_template_title": title,
        "document_template_body": body,
        "document_template_source_reference": "Décision institutionnelle PILOTE-2026-001",
        "document_template_hash": document_template_fingerprint(title, body),
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def test_template_validation_rejects_unknown_placeholder():
    with pytest.raises(ValueError, match="non autorisées"):
        validate_document_template(
            "Document ${reference}",
            "Valeur interdite ${browser_controlled_html}",
        )


def test_template_fingerprint_is_stable_and_content_sensitive():
    first = document_template_fingerprint("Titre ${reference}", "Corps ${citizen_full_name}")
    same = document_template_fingerprint("Titre ${reference}", "Corps ${citizen_full_name}")
    changed = document_template_fingerprint("Titre ${reference}", "Corps modifié ${citizen_full_name}")

    assert first == same
    assert first != changed
    assert len(first) == 64


def test_approved_catalog_template_requires_institutional_source():
    with pytest.raises(ValidationError):
        ServiceVersionCreate(
            category_id="etat-civil",
            category_name="État civil",
            name="Attestation",
            sla_business_days=3,
            document_template_status="approved",
            document_template_title="Attestation ${reference}",
            document_template_body="Titulaire : ${citizen_full_name}",
        )


def test_catalog_rejects_executable_or_undeclared_placeholder_contract():
    with pytest.raises(ValidationError):
        ServiceVersionCreate(
            category_id="etat-civil",
            category_name="État civil",
            name="Attestation",
            sla_business_days=3,
            document_template_status="draft",
            document_template_title="Attestation ${reference}",
            document_template_body="${arbitrary_html_from_client}",
        )


def test_server_renderer_escapes_citizen_and_template_markup():
    title = "Document ${reference}"
    body = "Titulaire : ${citizen_full_name}.\n\n<b>Texte de modèle</b>"
    service = _service(
        document_template_title=title,
        document_template_body=body,
        document_template_hash=document_template_fingerprint(title, body),
    )
    request = _request(citizen_name="<script>alert('xss')</script>")

    rendered_title, rendered_html, file_name, template_hash = render_approved_document(
        request=request,
        service=service,
        generated_by_name="Responsable <img src=x onerror=alert(1)>",
        generated_at=datetime(2026, 8, 9, 9, 30, tzinfo=timezone.utc),
    )

    assert rendered_title == "Document GN-2026-ABC123"
    assert "<script>alert('xss')</script>" not in rendered_html
    assert "&lt;script&gt;" in rendered_html
    assert "<b>Texte de modèle</b>" not in rendered_html
    assert "&lt;b&gt;Texte de modèle&lt;/b&gt;" in rendered_html
    assert "<img src=x" not in rendered_html
    assert "&lt;img src=x" in rendered_html
    assert file_name.startswith("GN-2026-ABC123-")
    assert template_hash == service.document_template_hash


def test_renderer_fails_closed_for_unapproved_template():
    service = _service(document_template_status="draft")

    with pytest.raises(HTTPException) as exc:
        render_approved_document(
            request=_request(),
            service=service,
            generated_by_name="Responsable",
        )

    assert exc.value.status_code == 409
    assert "approuvé" in exc.value.detail


def test_renderer_fails_closed_when_template_hash_was_tampered():
    service = _service(document_template_hash="0" * 64)

    with pytest.raises(HTTPException) as exc:
        render_approved_document(
            request=_request(),
            service=service,
            generated_by_name="Responsable",
        )

    assert exc.value.status_code == 409
    assert "intégrité" in exc.value.detail
