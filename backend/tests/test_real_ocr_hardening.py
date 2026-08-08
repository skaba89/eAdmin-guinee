"""Regression coverage for real, fail-closed OCR processing."""

import uuid
from unittest.mock import AsyncMock

import pytest
from sqlalchemy import select

from app.api import document_ocr
from app.models.document import Document, DocumentStatusEnum
from app.models.document_ocr import DocumentOCRResult
from app.models.document_version import DocumentVersion
from app.services.ocr_service import OCRService


def test_tesseract_tsv_parser_returns_real_text_and_average_confidence():
    service = OCRService()
    tsv = (
        "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n"
        "5\t1\t1\t1\t1\t1\t0\t0\t10\t10\t90.0\tREPUBLIQUE\n"
        "5\t1\t1\t1\t1\t2\t10\t0\t10\t10\t80.0\tDE\n"
        "5\t1\t1\t1\t1\t3\t20\t0\t10\t10\t70.0\tGUINEE\n"
        "5\t1\t1\t1\t2\t1\t0\t20\t10\t10\t-1\t\n"
        "5\t1\t1\t1\t2\t2\t10\t20\t10\t10\t60.0\tCONAKRY\n"
    )

    text, confidence = service._parse_tesseract_tsv(tsv)

    assert text == "REPUBLIQUE DE GUINEE\nCONAKRY"
    assert confidence == 75.0


@pytest.mark.asyncio
async def test_ocr_service_never_generates_synthetic_fallback(monkeypatch):
    service = OCRService()
    monkeypatch.setattr(service, "_tesseract_path", None)
    service.engine = "unavailable"

    result = await service.extract_text(
        "documents/test/document.pdf",
        language="fra",
        content_type="application/pdf",
    )

    assert result["text"] == ""
    assert result["confidence"] == 0.0
    assert result["synthetic"] is False
    assert result["error_code"] == "ocr_unavailable"
    assert "Stub" not in result.get("error", "")


@pytest.mark.asyncio
async def test_real_ocr_route_persists_version_hash_and_reuses_verified_cache(
    client,
    db_session,
    super_admin_user,
    super_admin_auth_headers,
    monkeypatch,
):
    document = Document(
        title="Document OCR test",
        file_path="documents/test/doc/v1/source.pdf",
        file_type="application/pdf",
        file_size=1024,
        version=1,
        current_version=1,
        status=DocumentStatusEnum.DRAFT,
        owner_id=super_admin_user.id,
        tags={"reference": "OCR/TEST/001"},
    )
    db_session.add(document)
    await db_session.flush()
    version = DocumentVersion(
        document_id=document.id,
        version_number=1,
        file_path=document.file_path,
        file_size=1024,
        file_hash="a" * 64,
        change_summary="Version OCR",
        change_type="create",
        changed_by=super_admin_user.id,
    )
    db_session.add(version)
    await db_session.commit()

    extract = AsyncMock(
        return_value={
            "text": "REPUBLIQUE DE GUINEE\nCONAKRY LE 08/08/2026",
            "confidence": 92.5,
            "pages": 1,
            "language": "fra",
            "engine": "tesseract",
            "synthetic": False,
            "processing_time_ms": 110,
        }
    )
    monkeypatch.setattr(document_ocr.ocr_service, "extract_text", extract)

    first = await client.post(
        f"/api/v1/documents/{document.id}/ocr",
        headers=super_admin_auth_headers,
        json={"language": "fra", "document_type": "autre"},
    )
    assert first.status_code == 200, first.text
    payload = first.json()
    assert payload["cached"] is False
    assert payload["synthetic"] is False
    assert payload["version_number"] == 1
    assert payload["document_hash"] == "a" * 64
    assert payload["engine"] == "tesseract"
    assert payload["confidence"] == 92.5

    persisted = (
        await db_session.execute(
            select(DocumentOCRResult).where(
                DocumentOCRResult.document_id == document.id,
                DocumentOCRResult.version_number == 1,
                DocumentOCRResult.language == "fra",
            )
        )
    ).scalar_one()
    assert persisted.document_hash == "a" * 64
    assert persisted.extracted_text.startswith("REPUBLIQUE")

    second = await client.post(
        f"/api/v1/documents/{document.id}/ocr",
        headers=super_admin_auth_headers,
        json={"language": "fra", "document_type": "autre"},
    )
    assert second.status_code == 200, second.text
    assert second.json()["cached"] is True
    assert second.json()["ocr_result_id"] == str(persisted.id)
    extract.assert_awaited_once()


@pytest.mark.asyncio
async def test_real_ocr_route_returns_503_and_persists_nothing_when_engine_unavailable(
    client,
    db_session,
    super_admin_user,
    super_admin_auth_headers,
    monkeypatch,
):
    document = Document(
        title="Document OCR indisponible",
        file_path="documents/test/doc/v1/source.pdf",
        file_type="application/pdf",
        file_size=512,
        version=1,
        current_version=1,
        status=DocumentStatusEnum.DRAFT,
        owner_id=super_admin_user.id,
    )
    db_session.add(document)
    await db_session.flush()
    db_session.add(
        DocumentVersion(
            document_id=document.id,
            version_number=1,
            file_path=document.file_path,
            file_size=512,
            file_hash="b" * 64,
            change_summary="Version OCR",
            change_type="create",
            changed_by=super_admin_user.id,
        )
    )
    await db_session.commit()

    monkeypatch.setattr(
        document_ocr.ocr_service,
        "extract_text",
        AsyncMock(
            return_value={
                "text": "",
                "confidence": 0.0,
                "pages": 0,
                "language": "fra",
                "engine": "unavailable",
                "synthetic": False,
                "error": "Le moteur Tesseract OCR n'est pas disponible sur ce serveur.",
                "error_code": "ocr_unavailable",
            }
        ),
    )

    response = await client.post(
        f"/api/v1/documents/{document.id}/ocr",
        headers=super_admin_auth_headers,
        json={"language": "fra"},
    )
    assert response.status_code == 503, response.text

    rows = (
        await db_session.execute(
            select(DocumentOCRResult).where(DocumentOCRResult.document_id == document.id)
        )
    ).scalars().all()
    assert rows == []
