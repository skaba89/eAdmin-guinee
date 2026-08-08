"""Regression tests for GED search semantics and PostgreSQL FTS authority."""

import pytest

from app.models.document import Document, DocumentStatusEnum
from app.models.document_ocr import DocumentOCRResult
from app.services.search_service import SearchService


@pytest.mark.asyncio
async def test_full_text_search_finds_term_present_only_in_real_ocr(
    client,
    db_session,
    super_admin_user,
    super_admin_auth_headers,
):
    document = Document(
        title="Rapport technique annuel",
        description="Synthèse institutionnelle",
        owner_id=super_admin_user.id,
        version=1,
        current_version=1,
        status=DocumentStatusEnum.APPROVED,
        tags={
            "reference": "R/TECH/2026/001",
            "document_type": "Rapport",
            "classification": "PUBLIC",
        },
    )
    db_session.add(document)
    await db_session.flush()
    db_session.add(
        DocumentOCRResult(
            document_id=document.id,
            version_number=1,
            document_hash="c" * 64,
            language="fra",
            engine="tesseract",
            confidence=91.5,
            page_count=2,
            extracted_text=(
                "Le cadastre national est modernisé avec un registre foncier numérique "
                "et une procédure de contrôle des parcelles."
            ),
            created_by=super_admin_user.id,
        )
    )
    await db_session.commit()

    response = await client.get(
        "/api/v1/documents/search",
        headers=super_admin_auth_headers,
        params={"q": "cadastre", "page": 1, "page_size": 20},
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    # API tests intentionally run on SQLite; production rejects non-PostgreSQL
    # backends and uses the GIN-backed `postgresql_fts` path.
    assert payload["backend"] == "sqlite_test_fallback"
    assert payload["total"] == 1
    assert payload["results"][0]["document_id"] == str(document.id)
    assert payload["results"][0]["score"] > 0
    assert "cadastre" in payload["results"][0]["snippet"].lower()


@pytest.mark.asyncio
async def test_metadata_title_match_is_ranked_above_ocr_only_match(
    client,
    db_session,
    super_admin_user,
    super_admin_auth_headers,
):
    title_match = Document(
        title="Programme foncier national",
        description="Plan administratif",
        owner_id=super_admin_user.id,
        version=1,
        current_version=1,
        status=DocumentStatusEnum.APPROVED,
        tags={
            "reference": "PFN/2026/001",
            "document_type": "Décret",
            "classification": "PUBLIC",
        },
    )
    ocr_match = Document(
        title="Annexe technique",
        description="Document de travail",
        owner_id=super_admin_user.id,
        version=1,
        current_version=1,
        status=DocumentStatusEnum.APPROVED,
        tags={
            "reference": "ANN/2026/001",
            "document_type": "Rapport",
            "classification": "PUBLIC",
        },
    )
    db_session.add_all([title_match, ocr_match])
    await db_session.flush()
    db_session.add(
        DocumentOCRResult(
            document_id=ocr_match.id,
            version_number=1,
            document_hash="d" * 64,
            language="fra",
            engine="tesseract",
            confidence=88.0,
            page_count=1,
            extracted_text="Le dispositif foncier est décrit dans cette annexe.",
            created_by=super_admin_user.id,
        )
    )
    await db_session.commit()

    response = await client.get(
        "/api/v1/documents/search",
        headers=super_admin_auth_headers,
        params={"q": "foncier", "page": 1, "page_size": 20},
    )

    assert response.status_code == 200, response.text
    results = response.json()["results"]
    ids = [row["document_id"] for row in results]
    assert str(title_match.id) in ids
    assert str(ocr_match.id) in ids
    assert ids.index(str(title_match.id)) < ids.index(str(ocr_match.id))


@pytest.mark.asyncio
async def test_search_filters_classification_status_and_reference(
    client,
    db_session,
    super_admin_user,
    super_admin_auth_headers,
):
    public_doc = Document(
        title="Budget régional",
        description="Prévisions budgétaires",
        owner_id=super_admin_user.id,
        status=DocumentStatusEnum.APPROVED,
        tags={
            "reference": "BUDGET-ALPHA-2026",
            "document_type": "Rapport",
            "classification": "PUBLIC",
        },
    )
    secret_doc = Document(
        title="Budget sécurisé",
        description="Prévisions budgétaires classifiées",
        owner_id=super_admin_user.id,
        status=DocumentStatusEnum.DRAFT,
        tags={
            "reference": "BUDGET-BETA-2026",
            "document_type": "Rapport",
            "classification": "SECRET",
        },
    )
    db_session.add_all([public_doc, secret_doc])
    await db_session.commit()

    response = await client.post(
        "/api/v1/documents/search",
        headers=super_admin_auth_headers,
        json={
            "query": "budget",
            "classification": "PUBLIC",
            "status": "APPROVED",
            "page": 1,
            "page_size": 20,
        },
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["total"] == 1
    assert payload["results"][0]["document_id"] == str(public_doc.id)
    assert payload["results"][0]["reference"] == "BUDGET-ALPHA-2026"
    assert payload["facets"]["status"]["APPROVED"] == 1
    assert payload["facets"]["classification"]["PUBLIC"] == 1

    reference_response = await client.get(
        "/api/v1/documents/search",
        headers=super_admin_auth_headers,
        params={"q": "alpha"},
    )
    assert reference_response.status_code == 200, reference_response.text
    assert str(public_doc.id) in {
        result["document_id"] for result in reference_response.json()["results"]
    }


def test_search_service_has_no_process_memory_index_authority():
    service = SearchService()
    assert service._search_backend == "postgresql_fts"
    assert not hasattr(service, "_index_cache")
