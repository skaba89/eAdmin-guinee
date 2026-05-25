"""
AI Government API - eAdministration Suite Guinea.
Endpoints for AI-powered administrative features.
"""

import logging
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException

from app.api.auth import get_current_user
from app.models.user import User
from app.services.ai_service import government_ai

logger = logging.getLogger(__name__)
router = APIRouter()


class ClassifyRequest(BaseModel):
    text: str
    title: str | None = None


class ClassifyResponse(BaseModel):
    category: str
    confidence: float
    subcategory: str | None
    suggested_service_id: str | None
    keywords: list[str]
    summary: str


class AssistantRequest(BaseModel):
    question: str
    context: dict | None = None
    language: str = "fr"


class AssistantResponse(BaseModel):
    response: str
    suggested_actions: list[dict]
    relevant_services: list[str]
    confidence: float
    language: str


class SummarizeRequest(BaseModel):
    service_name: str
    citizen_name: str
    motif: str
    documents: list[str] | None = None


class RedactRequest(BaseModel):
    request_type: str
    decision: str  # approved, rejected, complementary
    citizen_name: str
    reason: str
    language: str = "fr"


@router.post("/classify", summary="Classification IA de document")
async def classify_document(
    request: ClassifyRequest,
    current_user: User = Depends(get_current_user),
) -> ClassifyResponse:
    """
    Classify a document using AI.
    Automatically determines the document type, category, and relevant service.
    """
    result = await government_ai.classify_document(
        text=request.text,
        title=request.title,
    )
    return ClassifyResponse(
        category=result.category.value,
        confidence=result.confidence,
        subcategory=result.subcategory,
        suggested_service_id=result.suggested_service_id,
        keywords=result.keywords,
        summary=result.summary,
    )


@router.post("/assistant", summary="Assistant administratif IA")
async def administrative_assistant(
    request: AssistantRequest,
    current_user: User = Depends(get_current_user),
) -> AssistantResponse:
    """
    AI administrative assistant.
    Helps agents with procedures, requirements, and regulations.
    """
    result = await government_ai.administrative_assistant(
        question=request.question,
        context=request.context,
        language=request.language,
    )
    return AssistantResponse(
        response=result.response,
        suggested_actions=result.suggested_actions,
        relevant_services=result.relevant_services,
        confidence=result.confidence,
        language=result.language,
    )


@router.post("/summarize", summary="Résumé automatique de demande")
async def summarize_request(
    request: SummarizeRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Generate an AI summary of a citizen service request.
    """
    summary = await government_ai.generate_request_summary(
        service_name=request.service_name,
        citizen_name=request.citizen_name,
        motif=request.motif,
        documents=request.documents,
    )
    return {"summary": summary}


@router.post("/redact", summary="Rédaction automatique de réponse")
async def redact_response(
    request: RedactRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Auto-generate a formal administrative response letter.
    Only available for agents and above.
    """
    if current_user.role.value == "CITOYEN":
        raise HTTPException(
            status_code=403,
            detail="Les citoyens ne peuvent pas générer de réponses administratives."
        )

    letter = await government_ai.auto_redact_response(
        request_type=request.request_type,
        decision=request.decision,
        citizen_name=request.citizen_name,
        reason=request.reason,
        language=request.language,
    )
    return {"letter": letter, "decision": request.decision}
