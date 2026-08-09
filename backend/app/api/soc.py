"""Security Operations Center APIs: signed ingestion and incident response."""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import hmac
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models.security_incident import SecurityIncident, SecuritySignal
from app.models.user import RoleEnum, User
from app.services.soc_service import soc_service

# HMAC-authenticated machine ingestion is intentionally separate from the
# human/RLS router. It never accepts a browser/user bearer token as evidence.
ingest_router = APIRouter()
router = APIRouter()


class ExternalSignalInput(BaseModel):
    source: str = Field(min_length=2, max_length=100)
    external_event_id: str = Field(min_length=1, max_length=255)
    event_type: str = Field(min_length=2, max_length=150)
    category: str = Field(min_length=2, max_length=100)
    severity: str = Field(pattern="^(low|medium|high|critical)$")
    tenant_id: str = Field(min_length=1, max_length=100)
    institution_id: str | None = Field(default=None, max_length=100)
    actor_id: uuid.UUID | None = None
    resource_type: str | None = Field(default=None, max_length=100)
    resource_id: str | None = Field(default=None, max_length=255)
    network_source: str | None = Field(default=None, max_length=255)
    user_agent: str | None = Field(default=None, max_length=1024)
    details: dict = Field(default_factory=dict)
    occurred_at: datetime


class SignalResponse(BaseModel):
    id: uuid.UUID
    source: str
    external_event_id: str
    event_type: str
    category: str
    severity: str
    tenant_id: str
    institution_id: str | None
    actor_id: uuid.UUID | None
    resource_type: str | None
    resource_id: str | None
    correlation_key: str
    network_source_hash: str | None
    occurred_at: datetime
    processed_at: datetime | None
    incident_id: uuid.UUID | None

    model_config = {"from_attributes": True}


class IncidentResponse(BaseModel):
    id: uuid.UUID
    reference: str
    tenant_id: str
    institution_id: str | None
    category: str
    detection_rule: str
    title: str
    severity: str
    status: str
    event_count: int
    first_seen_at: datetime
    last_seen_at: datetime
    assigned_to: uuid.UUID | None
    acknowledged_by: uuid.UUID | None
    acknowledged_at: datetime | None
    resolved_by: uuid.UUID | None
    resolved_at: datetime | None
    closed_by: uuid.UUID | None
    closed_at: datetime | None
    resolution: str | None
    evidence_summary: dict | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class IncidentAssignment(BaseModel):
    assignee_id: uuid.UUID


class IncidentResolution(BaseModel):
    resolution: str = Field(min_length=10, max_length=4000)


def _require_soc_reader(user: User) -> None:
    if user.role.hierarchy_level() < RoleEnum.ADMIN.hierarchy_level():
        raise HTTPException(status_code=403, detail="Accès SOC réservé aux responsables habilités.")


def _require_soc_responder(user: User) -> None:
    if user.role not in {RoleEnum.DIRECTEUR, RoleEnum.MINISTRE, RoleEnum.SUPER_ADMIN}:
        raise HTTPException(
            status_code=403,
            detail="Action de réponse SOC réservée aux directeurs, ministres et super administrateurs.",
        )


def _scope_incidents(query, user: User):
    if user.role == RoleEnum.SUPER_ADMIN:
        return query
    query = query.where(SecurityIncident.tenant_id == (user.tenant_id or settings.TENANT_DEFAULT_ID))
    if user.role != RoleEnum.MINISTRE and user.institution_id:
        query = query.where(
            (SecurityIncident.institution_id.is_(None))
            | (SecurityIncident.institution_id == user.institution_id)
        )
    return query


def _scope_signals(query, user: User):
    if user.role == RoleEnum.SUPER_ADMIN:
        return query
    query = query.where(SecuritySignal.tenant_id == (user.tenant_id or settings.TENANT_DEFAULT_ID))
    if user.role != RoleEnum.MINISTRE and user.institution_id:
        query = query.where(
            (SecuritySignal.institution_id.is_(None))
            | (SecuritySignal.institution_id == user.institution_id)
        )
    return query


def _verify_ingest_signature(timestamp_header: str, signature_header: str, body: bytes) -> None:
    if not settings.SOC_INGEST_ENABLED:
        raise HTTPException(status_code=503, detail="Ingestion SOC externe désactivée.")
    secret = settings.SOC_INGEST_HMAC_SECRET
    if len(secret) < 32:
        raise HTTPException(status_code=503, detail="Clé d'ingestion SOC non configurée.")
    try:
        timestamp_value = int(timestamp_header)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Horodatage SOC invalide.") from exc
    if abs(int(time.time()) - timestamp_value) > settings.SOC_INGEST_MAX_SKEW_SECONDS:
        raise HTTPException(status_code=401, detail="Requête SOC expirée ou hors fenêtre anti-rejeu.")

    expected = "sha256=" + hmac.new(
        secret.encode("utf-8"),
        timestamp_header.encode("ascii") + b"." + body,
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, signature_header):
        raise HTTPException(status_code=401, detail="Signature HMAC SOC invalide.")


def _correlation_key(payload: ExternalSignalInput, network_hash: str | None) -> str:
    material = "|".join(
        [
            payload.tenant_id,
            payload.institution_id or "",
            payload.event_type,
            str(payload.actor_id or "anonymous"),
            network_hash or "no-network",
        ]
    )
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


@ingest_router.post(
    "/ingest",
    response_model=SignalResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Ingestion machine signée HMAC",
)
async def ingest_external_signal(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> SecuritySignal:
    raw_body = await request.body()
    timestamp_header = request.headers.get("X-EAdmin-SOC-Timestamp", "")
    signature_header = request.headers.get("X-EAdmin-SOC-Signature", "")
    _verify_ingest_signature(timestamp_header, signature_header, raw_body)

    try:
        payload = ExternalSignalInput.model_validate_json(raw_body)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail="Signal SOC invalide.") from exc

    occurred_at = payload.occurred_at
    if occurred_at.tzinfo is None or occurred_at.utcoffset() is None:
        occurred_at = occurred_at.replace(tzinfo=timezone.utc)
    else:
        occurred_at = occurred_at.astimezone(timezone.utc)
    if occurred_at > datetime.now(timezone.utc).replace(microsecond=0):
        if (occurred_at - datetime.now(timezone.utc)).total_seconds() > 300:
            raise HTTPException(status_code=422, detail="Signal SOC daté dans le futur.")

    network_hash = soc_service.pseudonymize_network_value(payload.network_source)
    user_agent_hash = soc_service.pseudonymize_network_value(payload.user_agent)
    signal = SecuritySignal(
        source=payload.source,
        external_event_id=payload.external_event_id,
        event_type=payload.event_type,
        category=payload.category,
        severity=payload.severity,
        tenant_id=payload.tenant_id,
        institution_id=payload.institution_id,
        actor_id=payload.actor_id,
        resource_type=payload.resource_type,
        resource_id=payload.resource_id,
        correlation_key=_correlation_key(payload, network_hash),
        network_source_hash=network_hash,
        user_agent_hash=user_agent_hash,
        details=soc_service.sanitize_external_details(payload.details),
        occurred_at=occurred_at,
    )

    async with soc_service.service_scope(db):
        existing = await db.scalar(
            select(SecuritySignal).where(
                SecuritySignal.source == payload.source,
                SecuritySignal.external_event_id == payload.external_event_id,
            )
        )
        if existing is not None:
            return existing
        try:
            async with db.begin_nested():
                db.add(signal)
                await db.flush()
        except IntegrityError:
            existing = await db.scalar(
                select(SecuritySignal).where(
                    SecuritySignal.source == payload.source,
                    SecuritySignal.external_event_id == payload.external_event_id,
                )
            )
            if existing is None:
                raise
            return existing

    await soc_service.correlate_unprocessed(db, limit=100)
    await db.refresh(signal)
    return signal


@router.get("/signals", response_model=list[SignalResponse], summary="Consulter les signaux SOC")
async def list_signals(
    severity: str | None = Query(default=None, pattern="^(low|medium|high|critical)$"),
    category: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SecuritySignal]:
    _require_soc_reader(current_user)
    query = select(SecuritySignal)
    if severity:
        query = query.where(SecuritySignal.severity == severity)
    if category:
        query = query.where(SecuritySignal.category == category)
    query = _scope_signals(query, current_user)
    result = await db.execute(query.order_by(SecuritySignal.occurred_at.desc()).limit(limit))
    return list(result.scalars().all())


@router.get("/incidents", response_model=list[IncidentResponse], summary="Consulter les incidents SOC")
async def list_incidents(
    status_filter: str | None = Query(default=None, alias="status", max_length=32),
    severity: str | None = Query(default=None, pattern="^(low|medium|high|critical)$"),
    limit: int = Query(default=100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SecurityIncident]:
    _require_soc_reader(current_user)
    query = select(SecurityIncident)
    if status_filter:
        query = query.where(SecurityIncident.status == status_filter)
    if severity:
        query = query.where(SecurityIncident.severity == severity)
    query = _scope_incidents(query, current_user)
    result = await db.execute(query.order_by(SecurityIncident.last_seen_at.desc()).limit(limit))
    return list(result.scalars().all())


async def _load_incident(
    incident_id: uuid.UUID,
    db: AsyncSession,
    current_user: User,
    *,
    for_update: bool = False,
) -> SecurityIncident:
    query = _scope_incidents(
        select(SecurityIncident).where(SecurityIncident.id == incident_id),
        current_user,
    )
    if for_update:
        query = query.with_for_update()
    incident = await db.scalar(query)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident SOC introuvable.")
    return incident


@router.get(
    "/incidents/{incident_id}",
    response_model=IncidentResponse,
    summary="Détail d'un incident SOC",
)
async def get_incident(
    incident_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SecurityIncident:
    _require_soc_reader(current_user)
    return await _load_incident(incident_id, db, current_user)


@router.post(
    "/incidents/{incident_id}/acknowledge",
    response_model=IncidentResponse,
    summary="Acquitter un incident SOC",
)
async def acknowledge_incident(
    incident_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SecurityIncident:
    _require_soc_responder(current_user)
    incident = await _load_incident(incident_id, db, current_user, for_update=True)
    if incident.status in {"resolved", "closed"}:
        raise HTTPException(status_code=409, detail="Incident déjà résolu ou clos.")
    incident.status = "acknowledged"
    incident.acknowledged_by = current_user.id
    incident.acknowledged_at = datetime.now(timezone.utc)
    await db.flush()
    return incident


@router.post(
    "/incidents/{incident_id}/assign",
    response_model=IncidentResponse,
    summary="Assigner un incident SOC",
)
async def assign_incident(
    incident_id: uuid.UUID,
    body: IncidentAssignment,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SecurityIncident:
    _require_soc_responder(current_user)
    incident = await _load_incident(incident_id, db, current_user, for_update=True)
    assignee = await db.scalar(select(User).where(User.id == body.assignee_id))
    if assignee is None or not assignee.is_active:
        raise HTTPException(status_code=404, detail="Responsable SOC introuvable ou inactif.")
    if current_user.role != RoleEnum.SUPER_ADMIN:
        if (assignee.tenant_id or settings.TENANT_DEFAULT_ID) != incident.tenant_id:
            raise HTTPException(status_code=403, detail="Assignation hors tenant interdite.")
        if (
            current_user.role != RoleEnum.MINISTRE
            and incident.institution_id
            and assignee.institution_id != incident.institution_id
        ):
            raise HTTPException(status_code=403, detail="Assignation hors institution interdite.")
    incident.assigned_to = assignee.id
    if incident.status in {"open", "acknowledged"}:
        incident.status = "investigating"
    await db.flush()
    return incident


@router.post(
    "/incidents/{incident_id}/resolve",
    response_model=IncidentResponse,
    summary="Résoudre un incident SOC",
)
async def resolve_incident(
    incident_id: uuid.UUID,
    body: IncidentResolution,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SecurityIncident:
    _require_soc_responder(current_user)
    incident = await _load_incident(incident_id, db, current_user, for_update=True)
    if incident.status == "closed":
        raise HTTPException(status_code=409, detail="Incident déjà clos.")
    incident.status = "resolved"
    incident.resolution = body.resolution.strip()
    incident.resolved_by = current_user.id
    incident.resolved_at = datetime.now(timezone.utc)
    await db.flush()
    return incident


@router.post(
    "/incidents/{incident_id}/close",
    response_model=IncidentResponse,
    summary="Clore un incident SOC résolu",
)
async def close_incident(
    incident_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SecurityIncident:
    _require_soc_responder(current_user)
    incident = await _load_incident(incident_id, db, current_user, for_update=True)
    if incident.status != "resolved" or not incident.resolution:
        raise HTTPException(status_code=409, detail="Un incident doit être résolu avant clôture.")
    incident.status = "closed"
    incident.closed_by = current_user.id
    incident.closed_at = datetime.now(timezone.utc)
    await db.flush()
    return incident


@router.post("/correlate", summary="Exécuter la corrélation SOC")
async def correlate_signals(
    limit: int = Query(default=500, ge=1, le=2000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, int]:
    _require_soc_responder(current_user)
    return await soc_service.correlate_unprocessed(db, limit=limit)
