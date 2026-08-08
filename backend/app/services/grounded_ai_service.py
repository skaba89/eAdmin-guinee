"""Grounded decision-support service for eAdmin Guinée.

This service does not pretend that a language model or legal corpus exists when
one is not configured. It retrieves only data already stored in authoritative
server-side tables visible through the caller's RLS scope, and it labels every
classification/routing result as a suggestion requiring human review.
"""

import re
import unicodedata
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.administrative_service import AdministrativeService
from app.models.courrier import Courrier
from app.models.document import Document
from app.models.document_ocr import DocumentOCRResult


_STOPWORDS = {
    "avec", "dans", "des", "les", "une", "pour", "sur", "aux", "par", "que",
    "qui", "quoi", "comment", "quel", "quelle", "quels", "quelles", "est", "sont",
    "avoir", "faire", "veux", "voudrais", "besoin", "demande", "document", "documents",
    "service", "procedure", "procédure", "administrative", "administratif", "guinee", "guinée",
}


@dataclass(frozen=True)
class ServiceMatch:
    service: AdministrativeService
    score: float
    matched_terms: list[str]


class GroundedGovernmentAssistant:
    """Retrieval-only government assistant with explicit provenance."""

    mode = "grounded_retrieval"

    @staticmethod
    def _normalize(value: str) -> str:
        value = unicodedata.normalize("NFKD", value or "")
        value = "".join(char for char in value if not unicodedata.combining(char))
        return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()

    def _tokens(self, value: str) -> set[str]:
        return {
            token
            for token in self._normalize(value).split()
            if len(token) >= 3 and token not in _STOPWORDS
        }

    async def _latest_active_services(
        self,
        db: AsyncSession,
        tenant_id: str | None,
    ) -> list[AdministrativeService]:
        statement = select(AdministrativeService).where(AdministrativeService.is_active.is_(True))
        if tenant_id:
            statement = statement.where(AdministrativeService.tenant_id == tenant_id)
        statement = statement.order_by(
            AdministrativeService.service_id,
            desc(AdministrativeService.version),
        )
        rows = (await db.execute(statement)).scalars().all()

        latest: dict[str, AdministrativeService] = {}
        for service in rows:
            latest.setdefault(service.service_id, service)
        return list(latest.values())

    def _score_service(self, query: str, service: AdministrativeService) -> ServiceMatch:
        query_tokens = self._tokens(query)
        if not query_tokens:
            return ServiceMatch(service=service, score=0.0, matched_terms=[])

        name_tokens = self._tokens(service.name)
        category_tokens = self._tokens(f"{service.category_id} {service.category_name}")
        description_tokens = self._tokens(service.description)
        routing_tokens = self._tokens(" ".join(str(term) for term in (service.routing_terms or [])))
        required_tokens = self._tokens(" ".join(str(doc) for doc in (service.required_documents or [])))

        weighted_hits: dict[str, float] = {}
        for token in query_tokens:
            weight = 0.0
            if token in name_tokens:
                weight = max(weight, 4.0)
            if token in routing_tokens:
                weight = max(weight, 3.5)
            if token in category_tokens:
                weight = max(weight, 2.5)
            if token in description_tokens:
                weight = max(weight, 1.5)
            if token in required_tokens:
                weight = max(weight, 1.0)
            if weight:
                weighted_hits[token] = weight

        maximum = max(4.0, len(query_tokens) * 4.0)
        score = min(1.0, sum(weighted_hits.values()) / maximum)
        return ServiceMatch(
            service=service,
            score=score,
            matched_terms=sorted(weighted_hits),
        )

    async def find_services(
        self,
        db: AsyncSession,
        query: str,
        tenant_id: str | None,
        limit: int = 5,
    ) -> list[ServiceMatch]:
        services = await self._latest_active_services(db, tenant_id)
        matches = [self._score_service(query, service) for service in services]
        matches = [match for match in matches if match.score > 0]
        matches.sort(key=lambda match: (match.score, match.service.version), reverse=True)
        return matches[:limit]

    @staticmethod
    def _source_detail(service: AdministrativeService) -> dict[str, Any]:
        source_level = (
            "referenced_policy"
            if service.source_reference or service.source_url
            else "operational_catalog"
        )
        return {
            "type": "administrative_service_catalog",
            "service_id": service.service_id,
            "version": service.version,
            "name": service.name,
            "policy_status": service.policy_status,
            "source_reference": service.source_reference,
            "source_url": service.source_url,
            "source_level": source_level,
            "effective_from": service.effective_from.isoformat() if service.effective_from else None,
            "effective_to": service.effective_to.isoformat() if service.effective_to else None,
        }

    @staticmethod
    def _source_label(service: AdministrativeService) -> str:
        label = f"Catalogue administratif: {service.service_id} v{service.version}"
        if service.source_reference:
            label += f" — {service.source_reference}"
        return label

    @staticmethod
    def _policy_notice(service: AdministrativeService) -> str:
        if service.source_reference or service.source_url:
            return "Les informations ci-dessous proviennent de la version sourcée du catalogue administratif."
        return (
            "Les informations ci-dessous proviennent du catalogue opérationnel interne. "
            "Le délai affiché est une règle opérationnelle et ne doit pas être présenté comme un délai légal."
        )

    def _procedure_answer(self, service: AdministrativeService) -> str:
        lines = [
            f"Démarche trouvée : {service.name}.",
            service.description.strip() or "Aucune description complémentaire n'est enregistrée.",
        ]
        if service.required_documents:
            lines.append(
                "Pièces enregistrées dans le catalogue : "
                + "; ".join(str(item) for item in service.required_documents)
                + "."
            )
        if service.fee_label:
            lines.append(f"Frais affichés dans le catalogue : {service.fee_label}.")
        if service.expected_processing_label:
            lines.append(
                f"Délai opérationnel affiché : {service.expected_processing_label}."
            )
        lines.append(self._policy_notice(service))
        return "\n".join(lines)

    async def answer_question(
        self,
        db: AsyncSession,
        question: str,
        tenant_id: str | None,
        language: str = "fr",
    ) -> dict[str, Any]:
        question = " ".join((question or "").split())
        matches = await self.find_services(db, question, tenant_id, limit=5)
        if not matches or matches[0].score < 0.18:
            message = (
                "Je ne dispose pas d'une source suffisamment précise dans le catalogue administratif "
                "pour répondre de manière fiable. Reformulez avec le nom de la démarche ou consultez "
                "le catalogue officiel. Aucune règle, pièce, tarification ou échéance n'est inventée."
            )
            return {
                "answer": message,
                "response": message,
                "confidence": 0.0,
                "retrieval_score": 0.0,
                "sources": [],
                "source_details": [],
                "suggested_actions": [{"action": "Consulter le catalogue", "type": "open_catalog"}],
                "related_procedures": [],
                "relevant_services": [],
                "language": language,
                "grounded": True,
                "mode": self.mode,
                "decision_authority": "none",
            }

        best = matches[0]
        service = best.service
        answer = self._procedure_answer(service)
        related = [match.service.service_id for match in matches[1:]]
        source_details = [self._source_detail(match.service) for match in matches]
        return {
            "answer": answer,
            "response": answer,
            "confidence": round(best.score * 100, 2),
            "retrieval_score": round(best.score, 4),
            "sources": [self._source_label(match.service) for match in matches],
            "source_details": source_details,
            "suggested_actions": [
                {
                    "action": f"Ouvrir la démarche: {service.name}",
                    "type": "open_service",
                    "service_id": service.service_id,
                }
            ],
            "related_procedures": related,
            "relevant_services": [match.service.service_id for match in matches],
            "language": language,
            "grounded": True,
            "mode": self.mode,
            "decision_authority": "none",
        }

    async def suggest_procedures(
        self,
        db: AsyncSession,
        citizen_need: str,
        tenant_id: str | None,
    ) -> dict[str, Any]:
        matches = await self.find_services(db, citizen_need, tenant_id, limit=5)
        suggestions = []
        for match in matches:
            service = match.service
            suggestions.append(
                {
                    "procedure_id": service.service_id,
                    "name": service.name,
                    "description": service.description,
                    "estimated_time": service.expected_processing_label,
                    "estimated_processing_days": service.sla_business_days,
                    "cost": service.fee_label,
                    "competent_authority": None,
                    "relevance_score": round(match.score, 4),
                    "required_documents": service.required_documents or [],
                    "steps": [],
                    "policy_status": service.policy_status,
                    "source": self._source_detail(service),
                    "human_review_required": False,
                }
            )
        return {
            "citizen_need": citizen_need,
            "suggestions": suggestions,
            "total_procedures": len(suggestions),
            "grounded": True,
            "mode": self.mode,
        }

    async def classify_text(
        self,
        db: AsyncSession,
        text_value: str,
        tenant_id: str | None,
        title: str | None = None,
    ) -> dict[str, Any]:
        combined = " ".join(part for part in [title or "", text_value or ""] if part).strip()
        matches = await self.find_services(db, combined, tenant_id, limit=3)
        if not matches:
            return {
                "category": "autre",
                "type": "autre",
                "confidence": 0.0,
                "subcategory": None,
                "suggested_service_id": None,
                "suggested_service": None,
                "keywords": [],
                "summary": "Aucune correspondance suffisamment fondée dans le catalogue.",
                "priority": "not_assessed",
                "department": None,
                "human_review_required": True,
                "routing_executed": False,
                "grounded": True,
                "sources": [],
            }

        best = matches[0]
        service = best.service
        summary = (
            f"Suggestion de classement vers « {service.name} » fondée sur la version "
            f"{service.version} du catalogue. Cette suggestion ne constitue pas une décision administrative."
        )
        return {
            "category": service.category_id,
            "type": service.category_id,
            "confidence": round(best.score * 100, 2),
            "subcategory": service.category_name,
            "suggested_service_id": service.service_id,
            "suggested_service": service.service_id,
            "keywords": best.matched_terms,
            "summary": summary,
            "priority": "not_assessed",
            "department": None,
            "human_review_required": True,
            "routing_executed": False,
            "grounded": True,
            "sources": [self._source_label(service)],
            "source_details": [self._source_detail(service)],
            "required_documents": service.required_documents or [],
            "estimated_processing_days": service.sla_business_days,
            "expected_processing_label": service.expected_processing_label,
            "policy_status": service.policy_status,
        }

    async def classify_document(
        self,
        db: AsyncSession,
        document_id: str,
        tenant_id: str | None,
    ) -> dict[str, Any]:
        document = (
            await db.execute(select(Document).where(Document.id == document_id))
        ).scalar_one_or_none()
        if not document:
            raise ValueError("Document introuvable dans le périmètre autorisé.")

        ocr = (
            await db.execute(
                select(DocumentOCRResult)
                .where(
                    DocumentOCRResult.document_id == document.id,
                    DocumentOCRResult.version_number == document.current_version,
                )
                .order_by(desc(DocumentOCRResult.created_at))
                .limit(1)
            )
        ).scalar_one_or_none()
        if not ocr or not ocr.extracted_text.strip():
            raise ValueError(
                "Aucun OCR réel n'est disponible pour la version courante; classification refusée."
            )
        result = await self.classify_text(
            db,
            ocr.extracted_text,
            tenant_id,
            title=document.title,
        )
        result.update(
            {
                "document_id": str(document.id),
                "document_version": document.current_version,
                "document_hash": ocr.document_hash,
                "ocr_result_id": str(ocr.id),
            }
        )
        return result

    async def summarize_document(
        self,
        db: AsyncSession,
        document_id: str,
    ) -> dict[str, Any]:
        document = (
            await db.execute(select(Document).where(Document.id == document_id))
        ).scalar_one_or_none()
        if not document:
            raise ValueError("Document introuvable dans le périmètre autorisé.")
        ocr = (
            await db.execute(
                select(DocumentOCRResult)
                .where(
                    DocumentOCRResult.document_id == document.id,
                    DocumentOCRResult.version_number == document.current_version,
                )
                .order_by(desc(DocumentOCRResult.created_at))
                .limit(1)
            )
        ).scalar_one_or_none()
        if not ocr or not ocr.extracted_text.strip():
            raise ValueError("Aucun texte OCR réel n'est disponible pour résumer ce document.")

        sentences = [
            sentence.strip()
            for sentence in re.split(r"(?<=[.!?])\s+|\n+", ocr.extracted_text)
            if len(sentence.strip()) >= 20
        ]
        summary = " ".join(sentences[:4])[:1800]
        if not summary:
            summary = ocr.extracted_text.strip()[:1800]
        return {
            "document_id": str(document.id),
            "title": document.title,
            "summary": summary,
            "key_points": sentences[:5],
            "actions_required": [],
            "method": "extractive_ocr",
            "grounded": True,
            "human_review_required": True,
            "source": {
                "ocr_result_id": str(ocr.id),
                "document_version": ocr.version_number,
                "document_hash": ocr.document_hash,
                "engine": ocr.engine,
                "confidence": ocr.confidence,
            },
        }

    async def summarize_correspondence(
        self,
        db: AsyncSession,
        courrier_id: str,
    ) -> dict[str, Any]:
        courrier = (
            await db.execute(select(Courrier).where(Courrier.id == courrier_id))
        ).scalar_one_or_none()
        if not courrier:
            raise ValueError("Courrier introuvable dans le périmètre autorisé.")
        summary = (
            f"Courrier {courrier.reference} — {courrier.subject}. "
            f"Expéditeur: {courrier.sender}. Destinataire: {courrier.recipient}. "
            f"Statut: {courrier.status.value}. Priorité enregistrée: {courrier.priority.value}."
        )
        return {
            "courrier_id": str(courrier.id),
            "summary": summary,
            "sender": courrier.sender,
            "recipient": courrier.recipient,
            "subject": courrier.subject,
            "actions_required": [],
            "method": "deterministic_metadata",
            "grounded": True,
            "human_review_required": True,
            "source": f"courriers:{courrier.id}",
        }

    async def draft_correspondence_response(
        self,
        db: AsyncSession,
        courrier_id: str,
        instructions: str | None,
    ) -> dict[str, Any]:
        courrier = (
            await db.execute(select(Courrier).where(Courrier.id == courrier_id))
        ).scalar_one_or_none()
        if not courrier:
            raise ValueError("Courrier introuvable dans le périmètre autorisé.")
        instruction_text = (instructions or "").strip()
        draft = (
            "BROUILLON NON SIGNÉ — VALIDATION HUMAINE OBLIGATOIRE\n\n"
            f"Objet : Réponse au courrier {courrier.reference} — {courrier.subject}\n\n"
            f"Madame, Monsieur {courrier.sender},\n\n"
            "Nous accusons réception de votre courrier mentionné en objet. "
        )
        if instruction_text:
            draft += f"Instruction de rédaction fournie par l'agent : {instruction_text}\n\n"
        draft += (
            "Le contenu définitif, les fondements juridiques, les délais et les engagements "
            "de l'administration doivent être vérifiés et complétés par l'agent habilité avant signature."
        )
        return {
            "courrier_id": str(courrier.id),
            "draft": draft,
            "grounded": True,
            "draft_only": True,
            "human_review_required": True,
            "decision_executed": False,
            "source": f"courriers:{courrier.id}",
        }

    async def extract_fields(
        self,
        db: AsyncSession,
        document_id: str,
        fields: list[str],
    ) -> dict[str, Any]:
        document = (
            await db.execute(select(Document).where(Document.id == document_id))
        ).scalar_one_or_none()
        if not document:
            raise ValueError("Document introuvable dans le périmètre autorisé.")
        ocr = (
            await db.execute(
                select(DocumentOCRResult)
                .where(
                    DocumentOCRResult.document_id == document.id,
                    DocumentOCRResult.version_number == document.current_version,
                )
                .order_by(desc(DocumentOCRResult.created_at))
                .limit(1)
            )
        ).scalar_one_or_none()
        if not ocr:
            raise ValueError("Aucun OCR réel disponible pour cette version.")

        extracted: dict[str, str] = {}
        missing: list[str] = []
        for field_name in fields[:50]:
            field_name = field_name.strip()
            if not field_name:
                continue
            pattern = re.compile(
                rf"(?im)^\s*{re.escape(field_name)}\s*[:\-]\s*(.+?)\s*$"
            )
            match = pattern.search(ocr.extracted_text)
            if match:
                extracted[field_name] = match.group(1).strip()[:500]
            else:
                missing.append(field_name)
        return {
            "document_id": str(document.id),
            "fields": extracted,
            "confidence": 100.0 if extracted and not missing else (70.0 if extracted else 0.0),
            "missing_fields": missing,
            "warnings": [
                "Extraction déterministe par libellé OCR; toute valeur doit être vérifiée humainement."
            ],
            "grounded": True,
            "human_review_required": True,
            "source": {
                "ocr_result_id": str(ocr.id),
                "document_version": ocr.version_number,
                "document_hash": ocr.document_hash,
            },
        }

    @staticmethod
    def safe_request_summary(
        service_name: str,
        citizen_name: str,
        motif: str,
        documents: list[str] | None,
    ) -> dict[str, Any]:
        document_text = ", ".join(documents or []) or "aucune pièce listée"
        return {
            "summary": (
                f"Demande « {service_name} » présentée par {citizen_name}. "
                f"Motif déclaré : {motif}. Pièces déclarées : {document_text}."
            ),
            "method": "deterministic_input_summary",
            "grounded": True,
            "source": "request_payload",
        }

    @staticmethod
    def safe_decision_draft(
        request_type: str,
        decision: str,
        citizen_name: str,
        reason: str,
    ) -> dict[str, Any]:
        decision_labels = {
            "approved": "proposition d'approbation",
            "rejected": "proposition de rejet",
            "complementary": "demande de pièces complémentaires",
        }
        label = decision_labels.get(decision, "proposition de réponse")
        letter = (
            "BROUILLON NON SIGNÉ — VALIDATION HUMAINE OBLIGATOIRE\n\n"
            f"Objet : {label.capitalize()} — {request_type}\n\n"
            f"Madame, Monsieur {citizen_name},\n\n"
            f"Motif fourni par l'agent : {reason}\n\n"
            "Ce brouillon ne crée aucune décision, aucun délai de recours et aucun engagement de "
            "l'administration. L'agent habilité doit vérifier le fondement juridique, compléter les "
            "mentions obligatoires et valider le contenu avant toute signature ou notification."
        )
        return {
            "letter": letter,
            "decision": decision,
            "draft_only": True,
            "human_review_required": True,
            "decision_executed": False,
            "grounded": True,
            "source": "agent_supplied_fields",
        }


grounded_government_ai = GroundedGovernmentAssistant()
