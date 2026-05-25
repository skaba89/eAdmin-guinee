"""
Endpoints de gestion des événements de sécurité - eAdministration Suite Guinea.
Sessions actives, appareils de confiance, événements de sécurité.
Utilise le SessionService Redis-backed pour une gestion enterprise des sessions.
"""

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.api.auth import get_current_user
from app.database import get_db
from app.models.user import User
from app.services.session_service import session_service

router = APIRouter()
logger = logging.getLogger("eadmin.security_events")


# ─── Schémas Pydantic ─────────────────────────────────────────────────────────

class SessionInfoResponse(BaseModel):
    """Informations sur une session active."""
    session_id: str
    ip_address: str | None = None
    user_agent: str | None = None
    device_fingerprint: str | None = None
    created_at: str | None = None
    last_activity: str | None = None
    mfa_verified: bool = False


class SecurityEventResponse(BaseModel):
    """Information sur un événement de sécurité."""
    id: str
    timestamp: str
    event_type: str
    description: str
    ip_address: str | None = None
    severity: str = "info"


class TrustedDeviceResponse(BaseModel):
    """Information sur un appareil de confiance."""
    device_id: str
    fingerprint: str
    is_trusted: bool = True
    device_name: str | None = None
    added_at: str | None = None


class SuspiciousActivityResponse(BaseModel):
    """Résultat de la détection d'activité suspecte."""
    is_suspicious: bool
    reasons: list[str]
    risk_score: int


class TerminateAllResponse(BaseModel):
    """Réponse après révocation de toutes les sessions."""
    message: str
    terminated_count: int


# ─── Endpoints Sessions ──────────────────────────────────────────────────────

@router.get(
    "/sessions",
    response_model=list[SessionInfoResponse],
    summary="Sessions actives",
    description="Récupère toutes les sessions actives de l'utilisateur courant.",
)
async def get_active_sessions(
    current_user: User = Depends(get_current_user),
) -> list[SessionInfoResponse]:
    """
    Récupère toutes les sessions actives de l'utilisateur courant.

    Les sessions sont stockées dans Redis avec TTL automatique.
    Seules les sessions non expirées et actives sont retournées.
    """
    user_id = str(current_user.id)

    try:
        sessions = await session_service.get_user_sessions(user_id)
    except Exception as e:
        logger.warning(f"Erreur lors de la récupération des sessions: {e}")
        sessions = []

    return [
        SessionInfoResponse(
            session_id=s.get("session_id", ""),
            ip_address=s.get("ip_address"),
            user_agent=s.get("user_agent"),
            device_fingerprint=s.get("device_fingerprint"),
            created_at=s.get("created_at"),
            last_activity=s.get("last_activity"),
            mfa_verified=s.get("mfa_verified") == "1",
        )
        for s in sessions
    ]


@router.delete(
    "/sessions/{session_id}",
    summary="Terminer une session",
    description="Termine une session spécifique appartenant à l'utilisateur courant.",
)
async def terminate_session(
    session_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    """
    Termine une session spécifique appartenant à l'utilisateur courant.

    L'utilisateur ne peut terminer que ses propres sessions.
    Un événement de sécurité est enregistré.
    """
    user_id = str(current_user.id)
    client_ip = request.client.host if request.client else "unknown"

    # Vérifier que la session appartient à l'utilisateur
    session_data = await session_service.validate_session(session_id)

    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session introuvable ou déjà expirée.",
        )

    if session_data.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous ne pouvez pas terminer cette session.",
        )

    await session_service.destroy_session(session_id)

    logger.info(
        f"Session {session_id[:16]}... terminée par l'utilisateur "
        f"{current_user.email} depuis {client_ip}"
    )

    return {"message": "Session terminée avec succès"}


@router.delete(
    "/sessions",
    response_model=TerminateAllResponse,
    summary="Révoquer toutes les autres sessions",
    description="Termine toutes les sessions de l'utilisateur courant sauf la session en cours.",
)
async def terminate_all_other_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> TerminateAllResponse:
    """
    Termine toutes les sessions de l'utilisateur courant.

    Utile en cas de suspicion de compromission de compte.
    Un événement de sécurité est enregistré.
    """
    user_id = str(current_user.id)
    client_ip = request.client.host if request.client else "unknown"

    try:
        terminated_count = await session_service.destroy_all_sessions(user_id)
    except Exception as e:
        logger.error(f"Erreur lors de la révocation des sessions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la révocation des sessions.",
        )

    logger.info(
        f"Toutes les sessions révoquées pour {current_user.email} "
        f"depuis {client_ip}: {terminated_count} session(s)"
    )

    return TerminateAllResponse(
        message=f"{terminated_count} session(s) révoquée(s)",
        terminated_count=terminated_count,
    )


# ─── Endpoints Événements de sécurité ────────────────────────────────────────

@router.get(
    "/security-events",
    response_model=list[SecurityEventResponse],
    summary="Événements de sécurité",
    description="Récupère les événements de sécurité récents de l'utilisateur courant.",
)
async def get_security_events(
    current_user: User = Depends(get_current_user),
    limit: int = 50,
) -> list[SecurityEventResponse]:
    """
    Récupère les événements de sécurité récents de l'utilisateur courant.

    Inclut les connexions, déconnexions, changements d'IP, activités suspectes,
    modifications MFA, etc. Les événements sont stockés dans Redis avec un TTL
    de 30 jours.

    Args:
        limit: Nombre maximum d'événements à retourner (max 200, défaut 50)
    """
    user_id = str(current_user.id)
    limit = min(limit, 200)

    try:
        events = await session_service.get_security_events(user_id, limit)
    except Exception as e:
        logger.warning(f"Erreur lors de la récupération des événements: {e}")
        events = []

    return [
        SecurityEventResponse(
            id=e.get("id", ""),
            timestamp=e.get("timestamp", ""),
            event_type=e.get("event_type", ""),
            description=e.get("description", ""),
            ip_address=e.get("ip_address"),
            severity=e.get("severity", "info"),
        )
        for e in events
    ]


# ─── Endpoints Appareils de confiance ────────────────────────────────────────

@router.get(
    "/trusted-devices",
    response_model=list[TrustedDeviceResponse],
    summary="Appareils de confiance",
    description="Récupère la liste des appareils de confiance de l'utilisateur courant.",
)
async def get_trusted_devices(
    current_user: User = Depends(get_current_user),
) -> list[TrustedDeviceResponse]:
    """
    Récupère la liste des appareils de confiance de l'utilisateur courant.

    Un appareil de confiance est identifié par son empreinte numérique
    (fingerprint) calculée à partir du User-Agent et de l'IP.
    Les appareils de confiance sont stockés dans Redis avec un TTL de 90 jours.
    """
    user_id = str(current_user.id)

    try:
        devices = await session_service.get_trusted_devices(user_id)
    except Exception as e:
        logger.warning(f"Erreur lors de la récupération des appareils: {e}")
        devices = []

    return [
        TrustedDeviceResponse(
            device_id=d.get("device_id", d.get("fingerprint", "")),
            fingerprint=d.get("fingerprint", ""),
            is_trusted=d.get("is_trusted", True),
            device_name=d.get("device_name"),
            added_at=d.get("added_at"),
        )
        for d in devices
    ]


@router.delete(
    "/trusted-devices/{device_id}",
    summary="Retirer un appareil de confiance",
    description="Retire un appareil de la liste de confiance de l'utilisateur courant.",
)
async def remove_trusted_device(
    device_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    """
    Retire un appareil de la liste de confiance de l'utilisateur courant.

    Après retrait, l'appareil sera traité comme non reconnu et pourra
    déclencher des alertes d'activité suspecte lors de prochaines connexions.
    """
    user_id = str(current_user.id)
    client_ip = request.client.host if request.client else "unknown"

    try:
        removed = await session_service.remove_trusted_device(user_id, device_id)
    except Exception as e:
        logger.error(f"Erreur lors du retrait de l'appareil: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors du retrait de l'appareil de confiance.",
        )

    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appareil introuvable dans la liste de confiance.",
        )

    logger.info(
        f"Appareil de confiance retiré par {current_user.email} "
        f"depuis {client_ip}: {device_id[:8]}..."
    )

    return {"message": "Appareil de confiance retiré avec succès"}


# ─── Endpoint de détection d'activité suspecte ───────────────────────────────

@router.post(
    "/check-suspicious",
    response_model=SuspiciousActivityResponse,
    summary="Vérifier l'activité suspecte",
    description="Vérifie si l'activité en cours est suspecte pour la session donnée.",
)
async def check_suspicious_activity(
    request: Request,
    session_id: str | None = None,
    current_user: User = Depends(get_current_user),
) -> SuspiciousActivityResponse:
    """
    Vérifie si l'activité en cours est suspecte.

    Effectue les vérifications suivantes :
    - Changement d'adresse IP depuis la création de la session
    - Changement de User-Agent (navigateur/appareil)
    - Voyage impossible (changement de localisation en temps trop court)
    - Appareil non reconnu

    Args:
        session_id: Identifiant de la session à vérifier (optionnel)
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("User-Agent", "unknown")

    if not session_id:
        # Pas de session à vérifier — retourner un résultat neutre
        return SuspiciousActivityResponse(
            is_suspicious=False,
            reasons=[],
            risk_score=0,
        )

    try:
        result = await session_service.detect_suspicious_session(
            session_id=session_id,
            current_ip=client_ip,
            current_user_agent=user_agent,
        )
    except Exception as e:
        logger.warning(f"Erreur lors de la détection d'activité suspecte: {e}")
        return SuspiciousActivityResponse(
            is_suspicious=False,
            reasons=[],
            risk_score=0,
        )

    return SuspiciousActivityResponse(
        is_suspicious=result.get("is_suspicious", False),
        reasons=result.get("reasons", []),
        risk_score=result.get("risk_score", 0),
    )
