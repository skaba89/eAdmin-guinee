"""
AI Government API - eAdministration Suite Guinea.
Endpoints pour les fonctionnalités IA de la plateforme :
- Résumé de documents et correspondances
- Classification de documents et demandes
- Routage automatique
- Assistant administratif IA
- Extraction de données
- Génération de rapports
"""

import logging
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException

from app.api.auth import get_current_user
from app.middleware.rbac import require_permission
from app.models.user import User
from app.services.ai_service import government_ai
from app.services.ai_summarization import ai_summarization_service
from app.services.ai_classification import ai_classification_service
from app.services.ai_assistant import government_ai_assistant

logger = logging.getLogger(__name__)
router = APIRouter()


# --- Schémas Pydantic existants ---
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


# --- Nouveaux schémas pour les endpoints enrichis ---

class DocumentSummarizeRequest(BaseModel):
    document_id: str


class CorrespondenceSummarizeRequest(BaseModel):
    courrier_id: str


class ResponseDraftRequest(BaseModel):
    courrier_id: str
    instructions: str | None = None


class DocumentClassifyRequest(BaseModel):
    document_id: str


class RequestClassifyRequest(BaseModel):
    service_name: str | None = None
    motif: str | None = None
    description: str | None = None
    citizen_info: str | None = None


class AutoRouteRequest(BaseModel):
    document_id: str


class AssistantAskRequest(BaseModel):
    question: str
    context: dict | None = None


class ProcedureSuggestRequest(BaseModel):
    citizen_need: str


class ExtractDataRequest(BaseModel):
    document_id: str
    fields: list[str]


class GenerateReportRequest(BaseModel):
    report_type: str
    parameters: dict | None = None


# --- Endpoints existants (conservés pour compatibilité) ---

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


# --- Nouveaux endpoints enrichis ---

@router.post("/summarize/document", summary="Résumé IA d'un document")
async def summarize_document(
    request: DocumentSummarizeRequest,
    current_user: User = Depends(
        require_permission("ai", "view")
    ),
) -> dict:
    """
    Génère un résumé IA d'un document avec points clés et actions requises.
    Nécessite la permission ai:view (AGENT+).
    """
    result = await ai_summarization_service.summarize_document(request.document_id)
    return result


@router.post("/summarize/correspondence", summary="Résumé IA d'une correspondance")
async def summarize_correspondence(
    request: CorrespondenceSummarizeRequest,
    current_user: User = Depends(
        require_permission("ai", "view")
    ),
) -> dict:
    """
    Génère un résumé IA d'une correspondance (courrier).
    Identifie l'expéditeur, le destinataire, l'objet et les actions requises.
    Nécessite la permission ai:view (AGENT+).
    """
    result = await ai_summarization_service.summarize_correspondence(request.courrier_id)
    return result


@router.post("/summarize/draft-response", summary="Génération de brouillon de réponse")
async def generate_response_draft(
    request: ResponseDraftRequest,
    current_user: User = Depends(
        require_permission("ai", "process")
    ),
) -> dict:
    """
    Génère un brouillon de réponse à une correspondance.
    Nécessite la permission ai:process (ADMIN+).
    """
    result = await ai_summarization_service.generate_response_draft(
        courrier_id=request.courrier_id,
        instructions=request.instructions,
    )
    return result


@router.post("/classify/document", summary="Classification IA d'un document")
async def classify_document_by_id(
    request: DocumentClassifyRequest,
    current_user: User = Depends(
        require_permission("ai", "view")
    ),
) -> dict:
    """
    Classifie un document par type, priorité et département.
    Retourne des tags suggérés et un service recommandé.
    Nécessite la permission ai:view (AGENT+).
    """
    result = await ai_classification_service.classify_document(request.document_id)
    return result


@router.post("/classify/request", summary="Classification IA d'une demande citoyenne")
async def classify_citizen_request(
    request: RequestClassifyRequest,
    current_user: User = Depends(
        require_permission("ai", "view")
    ),
) -> dict:
    """
    Classifie une demande de service citoyen.
    Retourne la catégorie, priorité, département estimé et documents requis.
    Nécessite la permission ai:view (AGENT+).
    """
    request_data = {
        "service_name": request.service_name or "",
        "motif": request.motif or "",
        "description": request.description or "",
        "citizen_info": request.citizen_info or "",
    }
    result = await ai_classification_service.classify_request(request_data)
    return result


@router.post("/auto-route", summary="Routage automatique d'un document")
async def auto_route_document(
    request: AutoRouteRequest,
    current_user: User = Depends(
        require_permission("ai", "view")
    ),
) -> dict:
    """
    Route automatiquement un document vers le service/département compétent.
    Nécessite la permission ai:view (AGENT+).
    """
    result = await ai_classification_service.auto_route(request.document_id)
    return result


@router.post("/assistant/ask", summary="Poser une question à l'assistant IA")
async def ask_assistant(
    request: AssistantAskRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Pose une question à l'assistant IA sur les procédures administratives guinéennes.
    Utilise RAG avec le code administratif guinéen.
    Disponible pour tous les utilisateurs authentifiés.
    """
    result = await government_ai_assistant.answer_question(
        question=request.question,
        context=request.context,
    )
    return result


@router.post("/assistant/procedure", summary="Suggestion de procédure administrative")
async def suggest_procedure(
    request: ProcedureSuggestRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Suggère la procédure administrative appropriée pour un besoin citoyen.
    Retourne les procédures les plus pertinentes avec documents requis et délais.
    """
    result = await government_ai_assistant.suggest_procedure(
        citizen_need=request.citizen_need,
    )
    return result


@router.post("/extract", summary="Extraction de données d'un document")
async def extract_data(
    request: ExtractDataRequest,
    current_user: User = Depends(
        require_permission("ai", "view")
    ),
) -> dict:
    """
    Extrait des champs de données spécifiques d'un document.
    Nécessite la permission ai:view (AGENT+).
    """
    result = await government_ai_assistant.extract_data(
        document_id=request.document_id,
        fields=request.fields,
    )
    return result


@router.post("/report/generate", summary="Génération de rapport administratif")
async def generate_report(
    request: GenerateReportRequest,
    current_user: User = Depends(
        require_permission("reports", "generate")
    ),
) -> dict:
    """
    Génère un rapport administratif.
    Types supportés : monthly_summary, department_activity,
    citizen_satisfaction, service_statistics, compliance_report.
    Nécessite la permission reports:generate (AGENT+).
    """
    result = await government_ai_assistant.generate_report(
        report_type=request.report_type,
        parameters=request.parameters or {},
    )
    return result
