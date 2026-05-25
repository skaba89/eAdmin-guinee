"""
Service Parapheur Électronique - eAdministration Suite Guinea.
Circuits de signature et d'approbation numérique pour les documents administratifs.
Supporte les actions : signer, approuver, viser, rejeter, tamponner.
"""

import hashlib
import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.electronic_stamp import SignatureCircuit, SignatureStep
from app.models.document import Document
from app.models.user import User

logger = logging.getLogger(__name__)


class CircuitAction(str):
    """Actions possibles dans un circuit de parapheur."""
    SIGN = "sign"
    APPROVE = "approve"
    VISER = "viser"
    REJECT = "reject"
    STAMP = "stamp"


class CircuitStatus(str):
    """Statuts possibles d'un circuit de parapheur."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class StepStatus(str):
    """Statuts possibles d'une étape de signature."""
    PENDING = "pending"
    COMPLETED = "completed"
    REJECTED = "rejected"
    SKIPPED = "skipped"


@dataclass
class CircuitStepDefinition:
    """Définition d'une étape dans un circuit de parapheur."""
    assignee_id: str
    action_type: str  # sign, approve, viser, stamp
    order: int = 0
    label: str = ""


@dataclass
class PendingParapheurItem:
    """Élément en attente dans le parapheur d'un utilisateur."""
    step_id: str
    circuit_id: str
    document_id: str
    document_title: str
    action_type: str
    circuit_name: str
    order: int
    created_at: str
    requested_by: str = ""


class ParapheurService:
    """
    Service de parapheur électronique pour la signature et l'approbation des documents.

    Fonctionnalités :
    - Création de circuits de signature multi-étapes
    - Avancement séquentiel du circuit
    - Actions : signer, approuver, viser, rejeter, tamponner
    - Vérification de signature électronique
    - Récupération des éléments en attente par utilisateur
    - Journalisation complète des actions (audit trail)
    """

    async def create_circuit(
        self,
        document_id: str,
        steps: list[dict],
        created_by: str,
        name: str | None = None,
        description: str | None = None,
    ) -> dict:
        """
        Crée un circuit de signature/approbation pour un document.

        Args:
            document_id: Identifiant du document à faire signer
            steps: Liste des étapes [{assignee_id, action_type, order, label}]
            created_by: Identifiant de l'utilisateur créant le circuit
            name: Nom optionnel du circuit
            description: Description optionnelle

        Returns:
            Dictionnaire avec circuit_id, document_id, status, steps
        """
        try:
            async with async_session_factory() as session:
                # Vérifier que le document existe
                doc_result = await session.execute(
                    select(Document).where(Document.id == uuid.UUID(document_id))
                )
                document = doc_result.scalar_one_or_none()
                if not document:
                    return {"error": "Document non trouvé", "circuit_id": None}

                # Créer le circuit
                circuit = SignatureCircuit(
                    document_id=uuid.UUID(document_id),
                    name=name or f"Circuit - {document.title}",
                    description=description,
                    status=CircuitStatus.PENDING,
                    current_step=0,
                    total_steps=len(steps),
                    created_by=uuid.UUID(created_by),
                )
                session.add(circuit)
                await session.flush()

                # Créer les étapes
                created_steps = []
                for i, step_def in enumerate(steps):
                    step = SignatureStep(
                        circuit_id=circuit.id,
                        order=step_def.get("order", i),
                        assignee_id=uuid.UUID(step_def["assignee_id"]),
                        action_type=step_def["action_type"],
                        status=StepStatus.PENDING,
                    )
                    session.add(step)
                    created_steps.append({
                        "step_id": str(step.id),
                        "assignee_id": step_def["assignee_id"],
                        "action_type": step_def["action_type"],
                        "order": step_def.get("order", i),
                    })

                # Mettre à jour le statut du circuit
                if steps:
                    circuit.status = CircuitStatus.IN_PROGRESS
                    circuit.current_step = 0

                await session.commit()

                logger.info(
                    f"Circuit de parapheur créé: {circuit.id} pour le document {document_id} "
                    f"avec {len(steps)} étapes"
                )

                return {
                    "circuit_id": str(circuit.id),
                    "document_id": document_id,
                    "name": circuit.name,
                    "status": circuit.status,
                    "current_step": circuit.current_step,
                    "total_steps": circuit.total_steps,
                    "steps": created_steps,
                    "created_at": circuit.created_at.isoformat() if circuit.created_at else None,
                }

        except Exception as e:
            logger.error(f"Erreur création circuit parapheur: {e}")
            return {"error": str(e), "circuit_id": None}

    async def advance_circuit(
        self,
        circuit_id: str,
        step_id: str,
        action: str,
        user_id: str,
        comment: str | None = None,
    ) -> dict:
        """
        Fait avancer le circuit à l'étape suivante.

        Actions supportées :
        - sign : Signer le document
        - approve : Approuver le document
        - viser : Viser le document (avis favorable)
        - reject : Rejeter le document (arrête le circuit)
        - stamp : Apposer un tampon électronique

        Args:
            circuit_id: Identifiant du circuit
            step_id: Identifiant de l'étape à traiter
            action: Action effectuée (sign, approve, viser, reject, stamp)
            user_id: Identifiant de l'utilisateur effectuant l'action
            comment: Commentaire optionnel

        Returns:
            Dictionnaire avec le statut du circuit après l'action
        """
        try:
            async with async_session_factory() as session:
                # Récupérer le circuit
                circuit_result = await session.execute(
                    select(SignatureCircuit).where(
                        SignatureCircuit.id == uuid.UUID(circuit_id)
                    )
                )
                circuit = circuit_result.scalar_one_or_none()
                if not circuit:
                    return {"error": "Circuit non trouvé"}

                if circuit.status in (CircuitStatus.COMPLETED, CircuitStatus.REJECTED, CircuitStatus.CANCELLED):
                    return {"error": f"Circuit déjà {circuit.status}"}

                # Récupérer l'étape
                step_result = await session.execute(
                    select(SignatureStep).where(
                        and_(
                            SignatureStep.id == uuid.UUID(step_id),
                            SignatureStep.circuit_id == uuid.UUID(circuit_id),
                        )
                    )
                )
                step = step_result.scalar_one_or_none()
                if not step:
                    return {"error": "Étape non trouvée"}

                if step.status != StepStatus.PENDING:
                    return {"error": f"Étape déjà traitée (statut: {step.status})"}

                # Vérifier que l'utilisateur est l'assigné
                if str(step.assignee_id) != user_id:
                    return {"error": "Vous n'êtes pas l'assigné de cette étape"}

                # Traiter l'action
                now = datetime.now(timezone.utc)

                if action == CircuitAction.REJECT:
                    # Rejet : arrêter le circuit
                    step.status = StepStatus.REJECTED
                    step.comment = comment
                    step.completed_at = now
                    step.signature_hash = self._generate_signature_hash(
                        circuit_id, step_id, user_id, action, "rejected"
                    )

                    circuit.status = CircuitStatus.REJECTED
                    circuit.completed_at = now

                    logger.info(f"Circuit {circuit_id} rejeté par {user_id} à l'étape {step_id}")

                elif action in (CircuitAction.SIGN, CircuitAction.APPROVE, CircuitAction.VISER, CircuitAction.STAMP):
                    # Action positive : compléter l'étape
                    step.status = StepStatus.COMPLETED
                    step.comment = comment
                    step.completed_at = now
                    step.signature_hash = self._generate_signature_hash(
                        circuit_id, step_id, user_id, action, "completed"
                    )

                    # Vérifier s'il reste des étapes
                    next_step_result = await session.execute(
                        select(SignatureStep).where(
                            and_(
                                SignatureStep.circuit_id == uuid.UUID(circuit_id),
                                SignatureStep.order > step.order,
                                SignatureStep.status == StepStatus.PENDING,
                            )
                        ).order_by(SignatureStep.order).limit(1)
                    )
                    next_step = next_step_result.scalar_one_or_none()

                    if next_step:
                        # Avancer à l'étape suivante
                        circuit.current_step = next_step.order
                        circuit.status = CircuitStatus.IN_PROGRESS
                    else:
                        # Circuit terminé
                        circuit.status = CircuitStatus.COMPLETED
                        circuit.completed_at = now
                        circuit.current_step = circuit.total_steps

                        # Mettre à jour le document si circuit complété
                        doc_result = await session.execute(
                            select(Document).where(Document.id == circuit.document_id)
                        )
                        doc = doc_result.scalar_one_or_none()
                        if doc:
                            from app.models.document import DocumentStatusEnum
                            doc.status = DocumentStatusEnum.APPROVED

                    logger.info(
                        f"Étape {step_id} du circuit {circuit_id} traitée: {action} par {user_id}"
                    )

                else:
                    return {"error": f"Action non reconnue: {action}"}

                await session.commit()

                return {
                    "circuit_id": circuit_id,
                    "step_id": step_id,
                    "action": action,
                    "circuit_status": circuit.status,
                    "current_step": circuit.current_step,
                    "total_steps": circuit.total_steps,
                    "signature_hash": step.signature_hash,
                    "completed_at": step.completed_at.isoformat() if step.completed_at else None,
                    "comment": comment,
                }

        except Exception as e:
            logger.error(f"Erreur avancement circuit parapheur: {e}")
            return {"error": str(e)}

    async def get_pending_for_user(self, user_id: str) -> list[dict]:
        """
        Récupère tous les éléments en attente dans le parapheur d'un utilisateur.

        Args:
            user_id: Identifiant de l'utilisateur

        Returns:
            Liste des éléments en attente avec détails du document
        """
        try:
            async with async_session_factory() as session:
                # Trouver les étapes en attente assignées à l'utilisateur
                query = (
                    select(SignatureStep, SignatureCircuit)
                    .join(SignatureCircuit, SignatureStep.circuit_id == SignatureCircuit.id)
                    .where(
                        and_(
                            SignatureStep.assignee_id == uuid.UUID(user_id),
                            SignatureStep.status == StepStatus.PENDING,
                            SignatureCircuit.status.in_([
                                CircuitStatus.PENDING,
                                CircuitStatus.IN_PROGRESS,
                            ]),
                        )
                    )
                    .order_by(SignatureStep.order)
                )

                result = await session.execute(query)
                rows = result.all()

                pending_items = []
                for step, circuit in rows:
                    # Récupérer le titre du document
                    doc_result = await session.execute(
                        select(Document).where(Document.id == circuit.document_id)
                    )
                    document = doc_result.scalar_one_or_none()

                    # Récupérer le nom du créateur du circuit
                    creator_result = await session.execute(
                        select(User).where(User.id == circuit.created_by)
                    )
                    creator = creator_result.scalar_one_or_none()

                    pending_items.append({
                        "step_id": str(step.id),
                        "circuit_id": str(circuit.id),
                        "document_id": str(circuit.document_id),
                        "document_title": document.title if document else "Document inconnu",
                        "action_type": step.action_type,
                        "circuit_name": circuit.name,
                        "order": step.order,
                        "created_at": circuit.created_at.isoformat() if circuit.created_at else None,
                        "requested_by": creator.full_name if creator else "Inconnu",
                    })

                return pending_items

        except Exception as e:
            logger.error(f"Erreur récupération parapheur en attente: {e}")
            return []

    async def verify_signature(self, signature_id: str) -> dict:
        """
        Vérifie l'authenticité d'une signature électronique.

        Args:
            signature_id: Hash de la signature à vérifier

        Returns:
            Dictionnaire avec is_valid, details
        """
        try:
            async with async_session_factory() as session:
                # Chercher l'étape avec ce hash de signature
                result = await session.execute(
                    select(SignatureStep, SignatureCircuit)
                    .join(SignatureCircuit, SignatureStep.circuit_id == SignatureCircuit.id)
                    .where(SignatureStep.signature_hash == signature_id)
                )
                row = result.first()

                if not row:
                    return {
                        "is_valid": False,
                        "reason": "Signature non trouvée",
                        "signature_id": signature_id,
                    }

                step, circuit = row

                # Vérifier l'intégrité du hash
                expected_hash = self._generate_signature_hash(
                    str(circuit.id),
                    str(step.id),
                    str(step.assignee_id),
                    step.action_type,
                    step.status,
                )

                is_valid = step.signature_hash == expected_hash and step.status == StepStatus.COMPLETED

                # Récupérer les informations du signataire
                signer_result = await session.execute(
                    select(User).where(User.id == step.assignee_id)
                )
                signer = signer_result.scalar_one_or_none()

                return {
                    "is_valid": is_valid,
                    "signature_id": signature_id,
                    "signer": {
                        "name": signer.full_name if signer else "Inconnu",
                        "role": signer.role.value if signer else "Inconnu",
                    } if signer else None,
                    "action_type": step.action_type,
                    "circuit_status": circuit.status,
                    "completed_at": step.completed_at.isoformat() if step.completed_at else None,
                    "document_id": str(circuit.document_id),
                    "reason": "Signature vérifiée avec succès" if is_valid else "Hash de signature invalide",
                }

        except Exception as e:
            logger.error(f"Erreur vérification signature: {e}")
            return {"is_valid": False, "reason": str(e), "signature_id": signature_id}

    async def get_circuit_details(self, circuit_id: str) -> dict | None:
        """Récupère les détails complets d'un circuit de parapheur."""
        try:
            async with async_session_factory() as session:
                result = await session.execute(
                    select(SignatureCircuit).where(
                        SignatureCircuit.id == uuid.UUID(circuit_id)
                    )
                )
                circuit = result.scalar_one_or_none()
                if not circuit:
                    return None

                # Récupérer les étapes
                steps_result = await session.execute(
                    select(SignatureStep)
                    .where(SignatureStep.circuit_id == uuid.UUID(circuit_id))
                    .order_by(SignatureStep.order)
                )
                steps = steps_result.scalars().all()

                steps_data = []
                for step in steps:
                    # Récupérer le nom de l'assigné
                    assignee_result = await session.execute(
                        select(User).where(User.id == step.assignee_id)
                    )
                    assignee = assignee_result.scalar_one_or_none()

                    steps_data.append({
                        "step_id": str(step.id),
                        "order": step.order,
                        "assignee": assignee.full_name if assignee else "Inconnu",
                        "assignee_role": assignee.role.value if assignee else "Inconnu",
                        "action_type": step.action_type,
                        "status": step.status,
                        "comment": step.comment,
                        "completed_at": step.completed_at.isoformat() if step.completed_at else None,
                    })

                return {
                    "circuit_id": str(circuit.id),
                    "document_id": str(circuit.document_id),
                    "name": circuit.name,
                    "description": circuit.description,
                    "status": circuit.status,
                    "current_step": circuit.current_step,
                    "total_steps": circuit.total_steps,
                    "steps": steps_data,
                    "created_at": circuit.created_at.isoformat() if circuit.created_at else None,
                    "completed_at": circuit.completed_at.isoformat() if circuit.completed_at else None,
                }

        except Exception as e:
            logger.error(f"Erreur récupération circuit: {e}")
            return None

    async def cancel_circuit(self, circuit_id: str, user_id: str, reason: str | None = None) -> dict:
        """Annule un circuit de parapheur."""
        try:
            async with async_session_factory() as session:
                result = await session.execute(
                    select(SignatureCircuit).where(
                        SignatureCircuit.id == uuid.UUID(circuit_id)
                    )
                )
                circuit = result.scalar_one_or_none()
                if not circuit:
                    return {"error": "Circuit non trouvé"}

                if circuit.status in (CircuitStatus.COMPLETED, CircuitStatus.CANCELLED):
                    return {"error": f"Impossible d'annuler un circuit {circuit.status}"}

                # Vérifier que l'utilisateur est le créateur ou un admin
                if str(circuit.created_by) != user_id:
                    return {"error": "Seul le créateur peut annuler le circuit"}

                circuit.status = CircuitStatus.CANCELLED
                circuit.completed_at = datetime.now(timezone.utc)

                # Annuler toutes les étapes en attente
                steps_result = await session.execute(
                    select(SignatureStep).where(
                        and_(
                            SignatureStep.circuit_id == uuid.UUID(circuit_id),
                            SignatureStep.status == StepStatus.PENDING,
                        )
                    )
                )
                for step in steps_result.scalars().all():
                    step.status = StepStatus.SKIPPED
                    step.comment = f"Circuit annulé: {reason or 'Aucune raison fournie'}"

                await session.commit()

                return {"circuit_id": circuit_id, "status": CircuitStatus.CANCELLED}

        except Exception as e:
            logger.error(f"Erreur annulation circuit: {e}")
            return {"error": str(e)}

    def _generate_signature_hash(
        self,
        circuit_id: str,
        step_id: str,
        user_id: str,
        action: str,
        status: str,
    ) -> str:
        """
        Génère un hash de signature électronique pour la vérification d'intégrité.

        Le hash inclut : circuit_id + step_id + user_id + action + status + timestamp
        """
        timestamp = str(int(time.time()))
        data = f"eadmin-parapheur:{circuit_id}:{step_id}:{user_id}:{action}:{status}:{timestamp}"
        return hashlib.sha256(data.encode()).hexdigest()


# Singleton
parapheur_service = ParapheurService()
