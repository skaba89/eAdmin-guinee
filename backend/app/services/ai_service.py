"""
AI Government Service - eAdministration Suite Guinea.
Provides AI-powered features for administrative document processing.
"""

import json
import logging
from dataclasses import dataclass
from enum import Enum
from typing import Optional

logger = logging.getLogger(__name__)


class AIDocumentCategory(str, Enum):
    """Categories for AI document classification."""
    ACTE_NAISSANCE = "acte_naissance"
    ACTE_MARIAGE = "acte_mariage"
    ACTE_DECES = "acte_deces"
    CERTIFICAT_NATIONALITE = "certificat_nationalite"
    CARTE_IDENTITE = "carte_identite"
    PASSEPORT = "passeport"
    PERMIS_CONDUIRE = "permis_conduire"
    CERTIFICAT_RESIDENCE = "certificat_residence"
    CASIER_JUDICIAIRE = "casier_judiciaire"
    ENREGISTREMENT_ENTREPRISE = "enregistrement_entreprise"
    AUTRE = "autre"


@dataclass
class AIClassificationResult:
    """Result of AI document classification."""
    category: AIDocumentCategory
    confidence: float
    subcategory: str | None
    suggested_service_id: str | None
    keywords: list[str]
    summary: str


@dataclass
class AIAssistantResponse:
    """Response from the AI administrative assistant."""
    response: str
    suggested_actions: list[dict]
    relevant_services: list[str]
    confidence: float
    language: str


class GovernmentAIService:
    """
    AI service for Guinean government administration.
    
    Provides:
    - Document classification (auto-categorize uploaded documents)
    - Request summarization (generate summaries of citizen requests)
    - Administrative assistant (chat-based help for agents)
    - Auto-redaction (draft responses and decisions)
    """

    # Guinea-specific service mapping
    SERVICE_CATEGORIES = {
        "etat-civil": [
            "extrait-acte-naissance", "extrait-acte-mariage", "extrait-acte-deces",
            "certificat-nationalite", "declaration-naissance"
        ],
        "identification": [
            "carte-identite-biometrique", "passeport-biometrique", "permis-conduire"
        ],
        "justice": [
            "casier-judiciaire", "certificat-non-poursuite", "legalisation-documents"
        ],
        "urbanisme": ["permis-construire"],
        "entreprise": ["enregistrement-entreprise", "registre-commerce"],
        "education": ["attestation-scolarite", "diplome-releve-notes"],
        "sante": ["certificat-vaccination", "carte-sanitaire"],
        "residence": ["certificat-residence", "attestation-domicile"],
        "fiscalite": ["certificat-situation-fiscale", "declaration-impots"],
        "social": ["carte-assurance-maladie", "allocation-familiale"],
    }

    # Keywords for document classification
    CLASSIFICATION_KEYWORDS = {
        AIDocumentCategory.ACTE_NAISSANCE: [
            "naissance", "né", "née", "acte de naissance", "extrait de naissance",
            "certificat de naissance", "déclaration de naissance"
        ],
        AIDocumentCategory.ACTE_MARIAGE: [
            "mariage", "marié", "mariée", "acte de mariage", "certificat de mariage",
            "union", "époux", "épouse"
        ],
        AIDocumentCategory.ACTE_DECES: [
            "décès", "décédé", "décédée", "acte de décès", "certificat de décès",
            "certificat de décès", "mort"
        ],
        AIDocumentCategory.CARTE_IDENTITE: [
            "carte d'identité", "CNI", "carte nationale", "biométrique",
            "pièce d'identité", "identité"
        ],
        AIDocumentCategory.PASSEPORT: [
            "passeport", "voyage", "international", "biométrique passeport"
        ],
        AIDocumentCategory.CERTIFICAT_NATIONALITE: [
            "nationalité", "guinéen", "guinéenne", "citoyenneté"
        ],
        AIDocumentCategory.CASIER_JUDICIAIRE: [
            "casier", "judiciaire", "antécédent", "casier judiciaire",
            "extrait casier", "BCRG"
        ],
        AIDocumentCategory.ENREGISTREMENT_ENTREPRISE: [
            "entreprise", "SARL", "SAS", "RCCM", "registre commerce",
            "immatriculation", "APIP"
        ],
    }

    async def classify_document(
        self,
        text: str,
        title: str | None = None,
        metadata: dict | None = None,
    ) -> AIClassificationResult:
        """
        Classify a document based on its content using keyword matching.
        
        In production, replace with:
        - Fine-tuned BERT/mBERT model for French administrative documents
        - OpenAI API / z-ai-web-dev-sdk for zero-shot classification
        - Custom ML model trained on Guinean administrative documents
        """
        combined_text = f"{title or ''} {text}".lower()
        
        best_category = AIDocumentCategory.AUTRE
        best_confidence = 0.0
        best_keywords = []

        for category, keywords in self.CLASSIFICATION_KEYWORDS.items():
            matches = [kw for kw in keywords if kw.lower() in combined_text]
            if matches:
                confidence = min(100, len(matches) * 25)
                if confidence > best_confidence:
                    best_category = category
                    best_confidence = confidence
                    best_keywords = matches

        # Determine suggested service
        suggested_service = None
        for cat, services in self.SERVICE_CATEGORIES.items():
            if any(best_category.value in s for s in services):
                suggested_service = services[0] if services else None
                break

        # Generate summary (stub — in production, use AI model)
        summary = f"Document classifié comme '{best_category.value}' avec {best_confidence}% de confiance."

        return AIClassificationResult(
            category=best_category,
            confidence=best_confidence,
            subcategory=None,
            suggested_service_id=suggested_service,
            keywords=best_keywords,
            summary=summary,
        )

    async def generate_request_summary(
        self,
        service_name: str,
        citizen_name: str,
        motif: str,
        documents: list[str] | None = None,
    ) -> str:
        """
        Generate a summary of a citizen service request.
        In production, use z-ai-web-dev-sdk or similar.
        """
        doc_list = ", ".join(documents) if documents else "aucun document"
        return (
            f"Demande de {service_name} par {citizen_name}. "
            f"Motif: {motif}. "
            f"Documents fournis: {doc_list}."
        )

    async def administrative_assistant(
        self,
        question: str,
        context: dict | None = None,
        language: str = "fr",
    ) -> AIAssistantResponse:
        """
        AI administrative assistant for government agents.
        Provides guidance on procedures, requirements, and regulations.
        
        In production, integrate with z-ai-web-dev-sdk for real AI responses.
        """
        # Stub responses for common questions
        question_lower = question.lower()

        if "naissance" in question_lower:
            response = (
                "Pour une demande d'extrait d'acte de naissance, le citoyen doit fournir : "
                "1) Une copie intégrale de l'acte de naissance ou le numéro d'acte, "
                "2) Une pièce d'identité valide, "
                "3) Une photo d'identité récente. "
                "Le délai de traitement est de 3 à 5 jours ouvrables. "
                "Le retrait se fait au guichet de la mairie ou en ligne."
            )
            suggested_actions = [
                {"action": "Vérifier les documents", "type": "check_docs"},
                {"action": "Lancer le traitement", "type": "process"},
            ]
            relevant_services = ["ec-1"]
        elif "identité" in question_lower or "cni" in question_lower:
            response = (
                "Pour une demande de carte d'identité nationale biométrique : "
                "1) Formulaire de demande rempli, "
                "2) Extrait d'acte de naissance, "
                "3) Certificat de nationalité, "
                "4) Deux photos d'identité conformes, "
                "5) Justificatif de domicile, "
                "6) Témoin avec pièce d'identité. "
                "La CNI est produite par l'ANIP. Délai: 7-15 jours."
            )
            suggested_actions = [
                {"action": "Vérifier dossier CNI", "type": "check_docs"},
                {"action": "Envoyer à l'ANIP", "type": "forward"},
            ]
            relevant_services = ["id-1"]
        elif "passeport" in question_lower:
            response = (
                "Pour un passeport biométrique : "
                "1) Formulaire de demande, "
                "2) CNI valide, "
                "3) Extrait d'acte de naissance, "
                "4) Certificat de résidence, "
                "5) Deux photos biométriques, "
                "6) Ancien passeport (si renouvellement), "
                "7) Timbre fiscal. "
                "Délai: 10-15 jours ouvrables."
            )
            suggested_actions = [
                {"action": "Vérifier documents passeport", "type": "check_docs"},
            ]
            relevant_services = ["id-2"]
        else:
            response = (
                "Je suis l'assistant administratif eAdmin Guinée. "
                "Je peux vous aider avec les procédures administratives, "
                "les exigences documentaires, et les délais de traitement. "
                "Posez-moi une question sur un service spécifique."
            )
            suggested_actions = []
            relevant_services = []

        return AIAssistantResponse(
            response=response,
            suggested_actions=suggested_actions,
            relevant_services=relevant_services,
            confidence=80.0,
            language=language,
        )

    async def auto_redact_response(
        self,
        request_type: str,
        decision: str,
        citizen_name: str,
        reason: str,
        language: str = "fr",
    ) -> str:
        """
        Auto-generate a formal administrative response letter.
        In production, use z-ai-web-dev-sdk for natural language generation.
        """
        if decision == "approved":
            template = (
                "RÉPUBLIQUE DE GUINÉE\n"
                "Travail — Justice — Solidarité\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                "Objet: Notification d'approbation\n\n"
                "Madame, Monsieur {name},\n\n"
                "Nous avons le plaisir de vous informer que votre demande de {request_type} "
                "a été approuvée. {reason}\n\n"
                "Vous êtes invité(e) à vous présenter au guichet de l'institution compétente "
                "muni(e) de votre pièce d'identité pour le retrait de votre document.\n\n"
                "Cordialement,\n"
                "L'Administration eGov Guinée"
            )
        elif decision == "rejected":
            template = (
                "RÉPUBLIQUE DE GUINÉE\n"
                "Travail — Justice — Solidarité\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                "Objet: Notification de rejet\n\n"
                "Madame, Monsieur {name},\n\n"
                "Après examen de votre demande de {request_type}, nous regrettons de vous "
                "informer que celle-ci ne peut être satisfaite. {reason}\n\n"
                "Vous disposez d'un délai de 30 jours pour introduire un recours "
                "auprès de l'autorité compétente.\n\n"
                "Cordialement,\n"
                "L'Administration eGov Guinée"
            )
        else:
            template = (
                "RÉPUBLIQUE DE GUINÉE\n"
                "Travail — Justice — Solidarité\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                "Objet: Demande de pièces complémentaires\n\n"
                "Madame, Monsieur {name},\n\n"
                "Concernant votre demande de {request_type}, des pièces complémentaires "
                "sont nécessaires pour poursuivre le traitement. {reason}\n\n"
                "Vous disposez d'un délai de 15 jours pour fournir les documents manquants.\n\n"
                "Cordialement,\n"
                "L'Administration eGov Guinée"
            )

        return template.format(
            name=citizen_name,
            request_type=request_type,
            reason=reason,
        )


# Singleton
government_ai = GovernmentAIService()
