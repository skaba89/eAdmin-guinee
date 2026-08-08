"""Grounded, human-in-the-loop compatibility routes for all eAdmin AI APIs.

These routes are registered before the historical AI router. They intentionally
preserve public endpoint paths while removing unsourced legal/procedural claims,
autonomous routing language, and synthetic model fallbacks.
"""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.database import get_db
from app.middleware.rbac import require_permission
from app.models.user import RoleEnum, User
from app.services.grounded_ai_service import grounded_government_ai

router = APIRouter()


class ClassifyRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20000)
    title: str | None = Field(default=None, max_length=500)


class AssistantRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    context: dict | None = None
    language: str = Field(default="fr", max_length=10)


class SummarizeRequest(BaseModel):
    service_name: str = Field(min_length=1, max_length=255)
    citizen_name: str = Field(min_length=1, max_length=255)
    motif: str = Field(min_length=1, max_length=5000)
    documents: list[str] | None = None


class RedactRequest(BaseModel):
    request_type: str = Field(min_length=1, max_length=255)
    decision: str = Field(pattern="^(approved|rejected|complementary)$")
    citizen_name: str = Field(min_length=1, max_length=255)
    reason: str = Field(min_length=1, max_length=5000)
    language: str = Field(default="fr", max_length=10)


class DocumentIdRequest(BaseModel):
    document_id: uuid.UUID


class CorrespondenceIdRequest(BaseModel):
    courrier_id: uuid.UUID


class ResponseDraftRequest(BaseModel):
    courrier_id: uuid.UUID
    instructions: str | None = Field(default=None, max_length=5000)


class RequestClassifyRequest(BaseModel):
    service_name: str | None = Field(default=None, max_length=255)
    motif: str | None = Field(default=None, max_length=5000)
    description: str | None = Field(default=None, max_length=5000)
    citizen_info: str | None = Field(default=None, max_length=2000)


class AssistantAskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    context: dict | None = None


class ProcedureSuggestRequest(BaseModel):
    citizen_need: str = Field(min_length=1, max_length=2000)


class ExtractDataRequest(BaseModel):
    document_id: uuid.UUID
    fields: list[str] = Field(min_length=1, max_length=50)


class GenerateReportRequest(BaseModel):
    report_type: str = Field(min_length=1, max_length=100)
    parameters: dict | None = None


def _tenant_id(user: User) -> str | None:
    return user.tenant_id


def _as_http_error(exc: ValueError) -> HTTPException:
    message = str(exc)
    code = status.HTTP_409_CONFLICT if "OCR" in message or "version" in message.lower() else status.HTTP_404_NOT_FOUND
    return HTTPException(status_code=code, detail=message)


@router.post("/classify", summary="Suggestion de classification fondée sur le catalogue")
async def classify_text(
    request: ClassifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return await grounded_government_ai.classify_text(
        db,
        request.text,
        _tenant_id(current_user),
        title=request.title,
    )


@router.post("/assistant", summary="Assistant administratif sourcé")
async def administrative_assistant(
    request: AssistantRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return await grounded_government_ai.answer_question(
        db,
        request.question,
        _tenant_id(current_user),
        language=request.language,
    )


@router.post("/summarize", summary="Résumé déterministe de demande")
async def summarize_request(
    request: SummarizeRequest,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return grounded_government_ai.safe_request_summary(
        request.service_name,
        request.citizen_name,
        request.motif,
        request.documents,
    )


@router.post("/redact", summary="Brouillon administratif à validation humaine")
async def redact_response(
    request: RedactRequest,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    if current_user.role == RoleEnum.CITOYEN:
        raise HTTPException(status_code=403, detail="Rédaction réservée aux agents habilités.")
    return grounded_government_ai.safe_decision_draft(
        request.request_type,
        request.decision,
        request.citizen_name,
        request.reason,
    )


@router.post("/summarize/document", summary="Résumé extractif d'un OCR réel")
async def summarize_document(
    request: DocumentIdRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("ai", "view")),
) -> dict[str, Any]:
    try:
        return await grounded_government_ai.summarize_document(db, request.document_id)
    except ValueError as exc:
        raise _as_http_error(exc) from exc


@router.post("/summarize/correspondence", summary="Résumé factuel d'une correspondance")
async def summarize_correspondence(
    request: CorrespondenceIdRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("ai", "view")),
) -> dict[str, Any]:
    try:
        return await grounded_government_ai.summarize_correspondence(db, request.courrier_id)
    except ValueError as exc:
        raise _as_http_error(exc) from exc


@router.post("/summarize/draft-response", summary="Brouillon de réponse non signé")
async def generate_response_draft(
    request: ResponseDraftRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("ai", "process")),
) -> dict[str, Any]:
    try:
        return await grounded_government_ai.draft_correspondence_response(
            db,
            request.courrier_id,
            request.instructions,
        )
    except ValueError as exc:
        raise _as_http_error(exc) from exc


@router.post("/classify/document", summary="Suggestion de classification d'un OCR réel")
async def classify_document_by_id(
    request: DocumentIdRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("ai", "view")),
) -> dict[str, Any]:
    try:
        return await grounded_government_ai.classify_document(
            db,
            request.document_id,
            _tenant_id(current_user),
        )
    except ValueError as exc:
        raise _as_http_error(exc) from exc


@router.post("/classify/request", summary="Suggestion de démarche pour une demande")
async def classify_citizen_request(
    request: RequestClassifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("ai", "view")),
) -> dict[str, Any]:
    combined = " ".join(
        value.strip()
        for value in [
            request.service_name or "",
            request.motif or "",
            request.description or "",
            request.citizen_info or "",
        ]
        if value.strip()
    )
    if not combined:
        raise HTTPException(status_code=422, detail="Un contenu est requis pour la suggestion.")
    result = await grounded_government_ai.classify_text(
        db,
        combined,
        _tenant_id(current_user),
    )
    result["estimated_processing_days"] = result.get("estimated_processing_days")
    return result


@router.post("/auto-route", summary="Recommandation de routage non exécutée")
async def recommend_document_route(
    request: DocumentIdRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("ai", "view")),
) -> dict[str, Any]:
    try:
        classification = await grounded_government_ai.classify_document(
            db,
            str(request.document_id),
            _tenant_id(current_user),
        )
    except ValueError as exc:
        raise _as_http_error(exc) from exc
    return {
        "document_id": str(request.document_id),
        "target_department": None,
        "target_service": classification.get("suggested_service_id"),
        "classification_type": classification.get("type"),
        "confidence": classification.get("confidence", 0.0),
        "routing_reason": classification.get("summary"),
        "priority": "not_assessed",
        "routing_executed": False,
        "human_review_required": True,
        "grounded": True,
        "sources": classification.get("sources", []),
    }


@router.post("/assistant/ask", summary="Question administrative sourcée")
async def ask_assistant(
    request: AssistantAskRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return await grounded_government_ai.answer_question(
        db,
        request.question,
        _tenant_id(current_user),
    )


@router.post("/assistant/procedure", summary="Recherche de démarches dans le catalogue")
async def suggest_procedure(
    request: ProcedureSuggestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return await grounded_government_ai.suggest_procedures(
        db,
        request.citizen_need,
        _tenant_id(current_user),
    )


@router.post("/extract", summary="Extraction déterministe depuis OCR réel")
async def extract_data(
    request: ExtractDataRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("ai", "view")),
) -> dict[str, Any]:
    try:
        return await grounded_government_ai.extract_fields(
            db,
            request.document_id,
            request.fields,
        )
    except ValueError as exc:
        raise _as_http_error(exc) from exc


@router.post("/report/generate", status_code=status.HTTP_501_NOT_IMPLEMENTED, summary="Rapport IA désactivé sans source explicite")
async def generate_report(
    request: GenerateReportRequest,
    current_user: User = Depends(require_permission("reports", "generate")),
) -> dict[str, Any]:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=(
            "La génération narrative de rapports est désactivée tant qu'une source de données "
            "et un modèle de rapport approuvés ne sont pas explicitement sélectionnés."
        ),
    )
