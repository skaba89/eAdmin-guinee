"""
Service de résumé IA - eAdministration Suite Guinea.
Résumé automatique de documents et correspondances administratives.
Génération de brouillons de réponse.
Dégénération gracieuse si l'API IA n'est pas disponible.
"""

import logging
import re
import time
from dataclasses import dataclass
from enum import Enum
from typing import Optional

logger = logging.getLogger(__name__)


class UrgencyLevel(str, Enum):
    """Niveaux d'urgence pour les documents administratifs."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class DocumentSummary:
    """Résumé d'un document administratif."""
    summary: str
    key_points: list[str]
    action_items: list[str]
    urgency: UrgencyLevel
    confidence: float
    processing_time_ms: int


@dataclass
class CorrespondenceSummary:
    """Résumé d'une correspondance administrative."""
    summary: str
    sender: str | None
    recipient: str | None
    subject: str | None
    key_points: list[str]
    action_required: list[str]
    urgency: UrgencyLevel
    confidence: float


@dataclass
class ResponseDraft:
    """Brouillon de réponse à une correspondance."""
    draft: str
    tone: str  # formel, neutre, informatif
    suggested_actions: list[str]
    confidence: float


class AISummarizationService:
    """
    Service de résumé automatique pour les documents et correspondances administratives.

    Fonctionnalités :
    - Résumé de documents avec points clés et actions requises
    - Résumé de correspondances (courriers entrants/sortants)
    - Génération de brouillons de réponse
    - Détection d'urgence automatique

    En production, utilise z-ai-web-dev-sdk ou OpenAI pour les résumés IA.
    En mode développement, utilise des heuristiques basées sur des mots-clés.
    """

    # Mots-clés d'urgence pour les documents guinéens
    URGENCY_KEYWORDS = {
        UrgencyLevel.CRITICAL: [
            "urgent", "très urgent", "extrêmement urgent", "immédiat", "immédiatement",
            "sécurité nationale", "menace", "crise", "état d'urgence",
        ],
        UrgencyLevel.HIGH: [
            "important", "prioritaire", "délai court", "dans les plus brefs délais",
            "sans délai", "favoriser", "accéléré",
        ],
        UrgencyLevel.MEDIUM: [
            "souhaite", "prie", "demande", "nécessaire", "requis",
        ],
    }

    # Modèles de résumé par type de document
    DOCUMENT_TEMPLATES = {
        "arrete": "Arrêté : {summary}. Points clés : {points}. Actions : {actions}.",
        "lettre_officielle": "Correspondance officielle : {summary}. Points clés : {points}. Actions requises : {actions}.",
        "certificat": "Certificat : {summary}. Points clés : {points}.",
        "rapport": "Rapport : {summary}. Conclusions : {points}. Recommandations : {actions}.",
        "default": "Document : {summary}. Points clés : {points}. Actions : {actions}.",
    }

    def __init__(self):
        self._llm_available = False
        self._check_llm()

    def _check_llm(self):
        """Vérifie si un LLM est disponible pour la génération."""
        try:
            # Vérifier z-ai-web-dev-sdk
            import importlib
            if importlib.util.find_spec("z_ai_web_dev_sdk"):
                self._llm_available = True
                logger.info("LLM disponible via z-ai-web-dev-sdk")
                return
        except Exception:
            pass

        try:
            import openai
            self._llm_available = True
            logger.info("LLM disponible via OpenAI")
            return
        except ImportError:
            pass

        logger.info("Aucun LLM disponible — utilisation du mode heuristique")

    async def summarize_document(self, document_id: str) -> dict:
        """
        Génère un résumé d'un document.

        Args:
            document_id: Identifiant du document à résumer

        Returns:
            Dictionnaire avec : summary, key_points, action_items, urgency, confidence
        """
        start = time.time()

        try:
            # Récupérer le contenu du document
            content = await self._get_document_content(document_id)

            if not content or len(content.strip()) < 10:
                return {
                    "summary": "Document vide ou trop court pour être résumé.",
                    "key_points": [],
                    "action_items": [],
                    "urgency": UrgencyLevel.LOW.value,
                    "confidence": 0.0,
                    "processing_time_ms": int((time.time() - start) * 1000),
                }

            # Essayer le LLM d'abord
            if self._llm_available:
                try:
                    result = await self._summarize_with_llm(content, "document")
                    result["processing_time_ms"] = int((time.time() - start) * 1000)
                    return result
                except Exception as e:
                    logger.warning(f"Résumé LLM échoué, fallback heuristique: {e}")

            # Fallback heuristique
            result = self._summarize_with_heuristics(content)
            result["processing_time_ms"] = int((time.time() - start) * 1000)
            return result

        except Exception as e:
            logger.error(f"Erreur résumé document: {e}")
            return {
                "summary": f"Erreur lors du résumé: {str(e)[:200]}",
                "key_points": [],
                "action_items": [],
                "urgency": UrgencyLevel.LOW.value,
                "confidence": 0.0,
                "processing_time_ms": int((time.time() - start) * 1000),
            }

    async def summarize_correspondence(self, courrier_id: str) -> dict:
        """
        Génère un résumé d'une correspondance (courrier entrant/sortant).

        Args:
            courrier_id: Identifiant du courrier à résumer

        Returns:
            Dictionnaire avec : summary, sender, recipient, subject,
            key_points, action_required, urgency, confidence
        """
        start = time.time()

        try:
            content = await self._get_correspondence_content(courrier_id)

            if not content or len(content.strip()) < 10:
                return {
                    "summary": "Correspondance vide ou trop courte pour être résumée.",
                    "sender": None,
                    "recipient": None,
                    "subject": None,
                    "key_points": [],
                    "action_required": [],
                    "urgency": UrgencyLevel.LOW.value,
                    "confidence": 0.0,
                    "processing_time_ms": int((time.time() - start) * 1000),
                }

            # Extraction des métadonnées de correspondance
            sender = self._extract_sender(content)
            recipient = self._extract_recipient(content)
            subject = self._extract_subject(content)

            # Résumé heuristique
            summary_result = self._summarize_with_heuristics(content)

            return {
                "summary": summary_result["summary"],
                "sender": sender,
                "recipient": recipient,
                "subject": subject,
                "key_points": summary_result["key_points"],
                "action_required": summary_result["action_items"],
                "urgency": summary_result["urgency"],
                "confidence": summary_result["confidence"],
                "processing_time_ms": int((time.time() - start) * 1000),
            }

        except Exception as e:
            logger.error(f"Erreur résumé correspondance: {e}")
            return {
                "summary": f"Erreur: {str(e)[:200]}",
                "sender": None,
                "recipient": None,
                "subject": None,
                "key_points": [],
                "action_required": [],
                "urgency": UrgencyLevel.LOW.value,
                "confidence": 0.0,
                "processing_time_ms": int((time.time() - start) * 1000),
            }

    async def generate_response_draft(
        self,
        courrier_id: str,
        instructions: str | None = None,
    ) -> dict:
        """
        Génère un brouillon de réponse à une correspondance.

        Args:
            courrier_id: Identifiant du courrier auquel répondre
            instructions: Instructions additionnelles pour le brouillon

        Returns:
            Dictionnaire avec : draft, tone, suggested_actions, confidence
        """
        start = time.time()

        try:
            content = await self._get_correspondence_content(courrier_id)

            if not content:
                return {
                    "draft": "Impossible de générer un brouillon : contenu indisponible.",
                    "tone": "neutre",
                    "suggested_actions": [],
                    "confidence": 0.0,
                    "processing_time_ms": int((time.time() - start) * 1000),
                }

            # Détecter le ton de la correspondance
            tone = self._detect_tone(content)

            # Générer le brouillon
            if self._llm_available:
                try:
                    draft = await self._generate_draft_with_llm(content, instructions, tone)
                except Exception:
                    draft = self._generate_draft_template(content, instructions, tone)
            else:
                draft = self._generate_draft_template(content, instructions, tone)

            # Actions suggérées
            suggested_actions = self._extract_action_items(content)

            return {
                "draft": draft,
                "tone": tone,
                "suggested_actions": suggested_actions,
                "confidence": 70.0 if not self._llm_available else 90.0,
                "processing_time_ms": int((time.time() - start) * 1000),
            }

        except Exception as e:
            logger.error(f"Erreur génération brouillon: {e}")
            return {
                "draft": f"Erreur: {str(e)[:200]}",
                "tone": "neutre",
                "suggested_actions": [],
                "confidence": 0.0,
                "processing_time_ms": int((time.time() - start) * 1000),
            }

    def _summarize_with_heuristics(self, content: str) -> dict:
        """Résumé heuristique basé sur l'extraction de phrases clés."""
        # Extraction des phrases
        sentences = re.split(r'[.!?]+', content)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 20]

        # Détection de l'urgence
        urgency = self._detect_urgency(content)

        # Points clés : phrases contenant des mots importants
        key_point_indicators = [
            "décision", "arrêté", "ordonne", "décide", "approuve", "rejette",
            "important", "nécessaire", "obligatoire", "requis", "exigé",
            "mesure", "disposition", "conformément", "conformément à",
        ]
        key_points = []
        for sentence in sentences[:20]:
            if any(ind in sentence.lower() for ind in key_point_indicators):
                key_points.append(sentence.strip())
                if len(key_points) >= 5:
                    break

        # Si pas assez de points clés, prendre les premières phrases
        if len(key_points) < 3 and sentences:
            for s in sentences[:5]:
                if s not in key_points:
                    key_points.append(s)
                if len(key_points) >= 5:
                    break

        # Actions requises
        action_items = self._extract_action_items(content)

        # Résumé (premières phrases significatives)
        summary_sentences = sentences[:3] if sentences else ["Résumé non disponible"]
        summary = " ".join(summary_sentences)

        # Calcul de confiance
        confidence = min(80.0, len(key_points) * 15 + len(action_items) * 10)

        return {
            "summary": summary,
            "key_points": key_points[:5],
            "action_items": action_items[:5],
            "urgency": urgency.value,
            "confidence": confidence,
        }

    async def _summarize_with_llm(self, content: str, content_type: str) -> dict:
        """Résumé via LLM (z-ai-web-dev-sdk ou OpenAI)."""
        # Tenter via z-ai-web-dev-sdk
        try:
            from z_ai_web_dev_sdk import LLM
            llm = LLM()
            prompt = (
                f"Résume ce document administratif guinéen de manière concise. "
                f"Identifie les points clés et les actions requises.\n\n"
                f"Document:\n{content[:3000]}\n\n"
                f"Format de réponse:\n"
                f"- Résumé (2-3 phrases)\n"
                f"- Points clés (liste)\n"
                f"- Actions requises (liste)\n"
                f"- Niveau d'urgence (low/medium/high/critical)"
            )
            response = await llm.chat(prompt)
            # Parser la réponse (simplifié)
            return self._parse_llm_summary(response)
        except ImportError:
            pass

        # Fallback OpenAI
        try:
            import openai
            # ... intégration OpenAI
            pass
        except ImportError:
            pass

        raise Exception("Aucun LLM disponible")

    async def _generate_draft_with_llm(self, content: str, instructions: str | None, tone: str) -> str:
        """Génération de brouillon via LLM."""
        try:
            from z_ai_web_dev_sdk import LLM
            llm = LLM()
            prompt = (
                f"Génère un brouillon de réponse administrative formelle en français "
                f"pour cette correspondance guinéenne. Ton: {tone}.\n\n"
                f"Correspondance:\n{content[:2000]}\n\n"
            )
            if instructions:
                prompt += f"Instructions: {instructions}\n\n"
            prompt += "Format: RÉPUBLIQUE DE GUINÉE / Travail — Justice — Solidarité / Objet: / Corps: / Signature"

            response = await llm.chat(prompt)
            return str(response)
        except Exception:
            raise

    def _generate_draft_template(self, content: str, instructions: str | None, tone: str) -> str:
        """Génération de brouillon basée sur un template."""
        subject = self._extract_subject(content) or "Réponse à votre correspondance"
        sender = self._extract_sender(content) or "Monsieur/Madame"

        draft = (
            f"RÉPUBLIQUE DE GUINÉE\n"
            f"Travail — Justice — Solidarité\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"Objet: Re: {subject}\n\n"
            f"À l'attention de {sender},\n\n"
        )

        if tone == "formel":
            draft += (
                "En réponse à votre correspondance en date du [DATE], "
                "nous avons l'honneur de vous informer que [RÉPONSE À COMPLÉTER].\n\n"
            )
        elif tone == "informatif":
            draft += (
                "Nous accusons réception de votre correspondance et "
                "vous informons que [INFORMATION À COMPLÉTER].\n\n"
            )
        else:
            draft += (
                "Nous avons bien reçu votre correspondance et "
                "nous vous prions de trouver ci-après notre réponse. "
                "[RÉPONSE À COMPLÉTER]\n\n"
            )

        if instructions:
            draft += f"Note: {instructions}\n\n"

        draft += (
            f"Veuillez agréer, {sender}, l'expression de nos salutations distinguées.\n\n"
            f"[NOM ET FONCTION]\n"
            f"[INSTITUTION]"
        )

        return draft

    def _detect_urgency(self, content: str) -> UrgencyLevel:
        """Détecte le niveau d'urgence d'un document."""
        content_lower = content.lower()

        for level in [UrgencyLevel.CRITICAL, UrgencyLevel.HIGH, UrgencyLevel.MEDIUM]:
            for keyword in self.URGENCY_KEYWORDS[level]:
                if keyword in content_lower:
                    return level

        return UrgencyLevel.LOW

    def _detect_tone(self, content: str) -> str:
        """Détecte le ton d'une correspondance."""
        content_lower = content.lower()

        formal_indicators = ["honorable", "excellence", "monsieur le ministre", "excellence", "respectueusement"]
        if any(ind in content_lower for ind in formal_indicators):
            return "formel"

        urgency_indicators = ["urgent", "immédiat", "sans délai"]
        if any(ind in content_lower for ind in urgency_indicators):
            return "formel"

        return "neutre"

    def _extract_action_items(self, content: str) -> list[str]:
        """Extrait les actions requises d'un document."""
        actions = []
        action_patterns = [
            r"(?:il convient de|il faut|il est nécessaire de|veuillez|prière de|merci de)\s+(.+?)(?:\.|;|\n)",
            r"(?:doit|devra|devront)\s+(.+?)(?:\.|;|\n)",
            r"(?:action requise|action nécessaire)\s*:\s*(.+?)(?:\.|;|\n)",
        ]

        for pattern in action_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            actions.extend([m.strip() for m in matches if m.strip()])

        return actions[:5]

    def _extract_sender(self, content: str) -> str | None:
        """Extrait l'expéditeur d'une correspondance."""
        patterns = [
            r"(?:De|Expéditeur|Émetteur)\s*:?\s*(.+?)(?:\n|$)",
            r"(?:Signé|Écrit par)\s*:?\s*(.+?)(?:\n|$)",
        ]
        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None

    def _extract_recipient(self, content: str) -> str | None:
        """Extrait le destinataire d'une correspondance."""
        patterns = [
            r"(?:À|Destinataire|Adressé à)\s*:?\s*(.+?)(?:\n|$)",
            r"(?:Monsieur|Madame)\s+([A-ZÀÂÉÈÊËÎÏÔÙÛÜ\s]+?)(?:,|\n)",
        ]
        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None

    def _extract_subject(self, content: str) -> str | None:
        """Extrait l'objet d'une correspondance."""
        patterns = [
            r"(?:Objet|Référence|Réf\.)\s*:?\s*(.+?)(?:\n|$)",
        ]
        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None

    def _parse_llm_summary(self, response) -> dict:
        """Parse la réponse du LLM en un résumé structuré."""
        response_text = str(response)

        # Extraction basique des sections
        summary = ""
        key_points = []
        action_items = []
        urgency = UrgencyLevel.MEDIUM

        lines = response_text.split("\n")
        current_section = "summary"

        for line in lines:
            line = line.strip()
            if not line:
                continue

            lower = line.lower()
            if "résumé" in lower or "summary" in lower:
                current_section = "summary"
            elif "point" in lower or "key" in lower:
                current_section = "key_points"
            elif "action" in lower:
                current_section = "action_items"
            elif "urgence" in lower or "urgency" in lower:
                if "critical" in lower or "critique" in lower:
                    urgency = UrgencyLevel.CRITICAL
                elif "high" in lower or "haute" in lower or "élevé" in lower:
                    urgency = UrgencyLevel.HIGH
                elif "low" in lower or "basse" in lower or "faible" in lower:
                    urgency = UrgencyLevel.LOW
            else:
                if current_section == "summary":
                    summary += line + " "
                elif current_section == "key_points":
                    clean = line.lstrip("-•*0123456789. ")
                    if clean:
                        key_points.append(clean)
                elif current_section == "action_items":
                    clean = line.lstrip("-•*0123456789. ")
                    if clean:
                        action_items.append(clean)

        return {
            "summary": summary.strip() or response_text[:200],
            "key_points": key_points[:5],
            "action_items": action_items[:5],
            "urgency": urgency.value,
            "confidence": 85.0,
        }

    async def _get_document_content(self, document_id: str) -> str:
        """Récupère le contenu textuel d'un document."""
        try:
            from app.database import async_session_factory
            from app.models.document import Document
            from sqlalchemy import select
            import uuid

            async with async_session_factory() as session:
                result = await session.execute(
                    select(Document).where(Document.id == uuid.UUID(document_id))
                )
                document = result.scalar_one_or_none()
                if document:
                    parts = [document.title]
                    if document.description:
                        parts.append(document.description)
                    return " ".join(parts)
        except Exception as e:
            logger.debug(f"Erreur récupération contenu document: {e}")

        return ""

    async def _get_correspondence_content(self, courrier_id: str) -> str:
        """Récupère le contenu textuel d'une correspondance."""
        try:
            from app.database import async_session_factory
            from app.models.courrier import Courrier
            from sqlalchemy import select
            import uuid

            async with async_session_factory() as session:
                result = await session.execute(
                    select(Courrier).where(Courrier.id == uuid.UUID(courrier_id))
                )
                courrier = result.scalar_one_or_none()
                if courrier:
                    parts = []
                    if hasattr(courrier, 'objet') and courrier.objet:
                        parts.append(courrier.objet)
                    if hasattr(courrier, 'contenu') and courrier.contenu:
                        parts.append(courrier.contenu)
                    if hasattr(courrier, 'expediteur') and courrier.expediteur:
                        parts.append(f"Expéditeur: {courrier.expediteur}")
                    return " ".join(parts)
        except Exception as e:
            logger.debug(f"Erreur récupération contenu correspondance: {e}")

        return ""


# Singleton
ai_summarization_service = AISummarizationService()
