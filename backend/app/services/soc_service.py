"""SOC signal normalization, audit mirroring and incident correlation."""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
import logging
import uuid
from typing import Any, AsyncIterator

from sqlalchemy import event, func, select, text
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.audit import AuditLog
from app.models.security_incident import SecurityIncident, SecuritySignal

logger = logging.getLogger("eadmin.soc")

_SENSITIVE_FRAGMENTS = {
    "authorization",
    "cookie",
    "password",
    "passwd",
    "secret",
    "token",
    "otp",
    "totp",
    "mfa_secret",
    "private_key",
    "credential",
}
_SECURITY_CATEGORIES = {"auth", "security", "admin", "user", "iam", "pki"}
_SEVERITY_RANK = {"low": 0, "medium": 1, "high": 2, "critical": 3}


def _utc(value: datetime | None) -> datetime:
    if value is None:
        return datetime.now(timezone.utc)
    if value.tzinfo is None or value.utcoffset() is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _severity(value: Any) -> str:
    normalized = str(value or "medium").lower()
    return normalized if normalized in _SEVERITY_RANK else "medium"


def _safe_json(value: Any, *, depth: int = 0) -> Any:
    """Bound and redact arbitrary audit details before SOC persistence."""
    if depth > 4:
        return "[max-depth]"
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, datetime):
        return _utc(value).isoformat()
    if isinstance(value, str):
        return value[:1000]
    if isinstance(value, dict):
        result: dict[str, Any] = {}
        for key, item in list(value.items())[:50]:
            key_text = str(key)[:100]
            if any(fragment in key_text.lower() for fragment in _SENSITIVE_FRAGMENTS):
                result[key_text] = "[REDACTED]"
            else:
                result[key_text] = _safe_json(item, depth=depth + 1)
        return result
    if isinstance(value, (list, tuple, set)):
        return [_safe_json(item, depth=depth + 1) for item in list(value)[:50]]
    return str(value)[:1000]


def _derived_hmac_key() -> bytes:
    material = (settings.ENCRYPTION_KEY or "").encode("utf-8")
    return hmac.new(material, b"eadmin-soc-pseudonym-v1", hashlib.sha256).digest()


def _pseudonym(value: str | None) -> str | None:
    normalized = (value or "").strip()
    if not normalized:
        return None
    return hmac.new(_derived_hmac_key(), normalized.encode("utf-8"), hashlib.sha256).hexdigest()


def _audit_event_type(action: str, category: str, audit_details: dict[str, Any]) -> str:
    base = f"{category}.{action.lower()}"
    success = audit_details.get("success")
    if action.upper() == "LOGIN" and success is False:
        return f"{base}.failed"
    if action.upper() == "LOGIN" and success is True:
        return f"{base}.success"
    return base


def _mirror_audit_signal(_mapper, connection: Connection, target: AuditLog) -> None:
    """Mirror relevant AuditLog rows in the same DB transaction.

    The listener temporarily uses the SOC_SERVICE RLS context only for the
    signal insert and restores every application scope variable afterwards.
    A SOC mirror failure raises and rolls back the originating security audit;
    security-relevant evidence therefore cannot silently diverge.
    """
    category = str(getattr(target, "category", "") or "").lower()
    severity = _severity(getattr(target, "severity", "medium"))
    action = str(getattr(target, "action", "AUDIT") or "AUDIT").upper()
    if category not in _SECURITY_CATEGORIES and severity not in {"high", "critical"}:
        return

    target_id = getattr(target, "id", None)
    if target_id is None:
        raise RuntimeError("Security audit row has no identifier; SOC mirror aborted")

    raw_details = getattr(target, "details", None)
    audit_details = raw_details if isinstance(raw_details, dict) else {}
    description = str(getattr(target, "description", "") or "")[:1000]
    tenant_id = str(
        getattr(target, "tenant_id", None) or settings.TENANT_DEFAULT_ID
    )
    institution_id = getattr(target, "institution_id", None)
    actor_id = getattr(target, "user_id", None)
    resource_type = getattr(target, "resource_type", None)
    resource_id = getattr(target, "resource_id", None)
    occurred_at = _utc(
        getattr(target, "timestamp", None)
        or getattr(target, "created_at", None)
    )
    network_hash = _pseudonym(getattr(target, "ip_address", None))
    agent_hash = _pseudonym(getattr(target, "user_agent", None))
    event_type = _audit_event_type(action, category or "audit", audit_details)

    correlation_material = "|".join(
        [
            tenant_id,
            str(institution_id or ""),
            event_type,
            str(actor_id or "anonymous"),
            network_hash or "no-network",
        ]
    )
    correlation_key = hashlib.sha256(correlation_material.encode("utf-8")).hexdigest()
    normalized_details = {
        "description": description,
        "audit_action": action,
        "audit_details": _safe_json(audit_details),
    }

    if connection.dialect.name != "postgresql":
        connection.execute(
            SecuritySignal.__table__.insert().values(
        id=uuid.uuid4(),
        source="application_audit",
        external_event_id=f"audit:{target_id}",
        event_type=event_type[:150],
        category=(category or "audit")[:100],
        severity=severity,
        tenant_id=tenant_id[:100],
        institution_id=str(institution_id)[:100] if institution_id else None,
        actor_id=actor_id,
        resource_type=str(resource_type)[:100] if resource_type else None,
        resource_id=str(resource_id)[:255] if resource_id else None,
        correlation_key=correlation_key,
        network_source_hash=network_hash,
        user_agent_hash=agent_hash,
        details=normalized_details,
        occurred_at=occurred_at,
    )
        )
        return

    original = connection.execute(
        text(
            """
            SELECT
                current_setting('app.current_user_id', true),
                current_setting('app.current_tenant_id', true),
                current_setting('app.current_institution_id', true),
                current_setting('app.current_role', true)
            """
        )
    ).one()
    try:
        connection.execute(
            text(
                """
                SELECT
                    set_config('app.current_user_id', '', true),
                    set_config('app.current_tenant_id', :tenant_id, true),
                    set_config('app.current_institution_id', :institution_id, true),
                    set_config('app.current_role', 'SOC_SERVICE', true)
                """
            ),
            {
                "tenant_id": tenant_id,
                "institution_id": str(institution_id or ""),
            },
        )
        connection.execute(
            SecuritySignal.__table__.insert().values(
                id=uuid.uuid4(),
                source="application_audit",
                external_event_id=f"audit:{target_id}",
                event_type=event_type[:150],
                category=(category or "audit")[:100],
                severity=severity,
                tenant_id=tenant_id[:100],
                institution_id=str(institution_id)[:100] if institution_id else None,
                actor_id=actor_id,
                resource_type=str(resource_type)[:100] if resource_type else None,
                resource_id=str(resource_id)[:255] if resource_id else None,
                correlation_key=correlation_key,
                network_source_hash=network_hash,
                user_agent_hash=agent_hash,
                details=normalized_details,
                occurred_at=occurred_at,
            )
        )
    finally:
        connection.execute(
            text(
                """
                SELECT
                    set_config('app.current_user_id', :user_id, true),
                    set_config('app.current_tenant_id', :tenant_id, true),
                    set_config('app.current_institution_id', :institution_id, true),
                    set_config('app.current_role', :role, true)
                """
            ),
            {
                "user_id": original[0] or "",
                "tenant_id": original[1] or "",
                "institution_id": original[2] or "",
                "role": original[3] or "",
            },
        )


class SocService:
    """Correlation engine and SOC_SERVICE database boundary."""

    @staticmethod
    def _session_scope(db: AsyncSession) -> dict | None:
        value = db.sync_session.info.get("rls_scope")
        return value if isinstance(value, dict) else None

    @staticmethod
    async def _set_scope(db: AsyncSession, scope: dict | None) -> None:
        bind = db.get_bind()
        if bind is None or bind.dialect.name != "postgresql":
            return
        effective = scope or {}
        await db.execute(
            text(
                """
                SELECT
                    set_config('app.current_user_id', :user_id, true),
                    set_config('app.current_tenant_id', :tenant_id, true),
                    set_config('app.current_institution_id', :institution_id, true),
                    set_config('app.current_role', :role, true)
                """
            ),
            {
                "user_id": str(effective.get("user_id") or ""),
                "tenant_id": str(effective.get("tenant_id") or ""),
                "institution_id": str(effective.get("institution_id") or ""),
                "role": str(effective.get("role") or ""),
            },
        )

    @asynccontextmanager
    async def service_scope(self, db: AsyncSession) -> AsyncIterator[None]:
        original = self._session_scope(db)
        await self._set_scope(
            db,
            {
                "user_id": "",
                "tenant_id": "",
                "institution_id": "",
                "role": "SOC_SERVICE",
            },
        )
        try:
            yield
        finally:
            await self._set_scope(db, original)

    @staticmethod
    def sanitize_external_details(details: dict[str, Any] | None) -> dict[str, Any]:
        sanitized = _safe_json(details or {})
        return sanitized if isinstance(sanitized, dict) else {}

    @staticmethod
    def pseudonymize_network_value(value: str | None) -> str | None:
        return _pseudonym(value)

    @staticmethod
    def _rule_for(signal: SecuritySignal) -> tuple[str, str, str] | None:
        details = signal.details or {}
        audit_details = details.get("audit_details")
        if not isinstance(audit_details, dict):
            audit_details = {}
        description = str(details.get("description") or "").lower()

        if audit_details.get("grant_type") == "break_glass" and "approuv" in description:
            return (
                "break_glass_activated",
                "critical",
                "Accès d'urgence break-glass activé",
            )
        if signal.event_type == "auth.login.failed":
            return ("authentication_failure_burst", "high", "Échecs d'authentification répétés")
        if signal.severity == "critical":
            return ("critical_security_audit", "critical", "Événement de sécurité critique")
        if signal.category in {"iam", "security", "admin"} and "permission_change" in signal.event_type:
            return ("privilege_change", "high", "Modification sensible d'habilitation")
        if "super_admin" in json.dumps(audit_details, ensure_ascii=False).lower():
            return ("super_admin_change", "critical", "Modification d'un privilège SUPER_ADMIN")
        return None

    async def _threshold_reached(
        self,
        db: AsyncSession,
        signal: SecuritySignal,
        rule: str,
    ) -> bool:
        if rule != "authentication_failure_burst":
            return True
        since = _utc(signal.occurred_at) - timedelta(minutes=10)
        count = await db.scalar(
            select(func.count(SecuritySignal.id)).where(
                SecuritySignal.event_type == "auth.login.failed",
                SecuritySignal.correlation_key == signal.correlation_key,
                SecuritySignal.occurred_at >= since,
            )
        )
        return int(count or 0) >= 5

    async def _upsert_incident(
        self,
        db: AsyncSession,
        signal: SecuritySignal,
        *,
        rule: str,
        severity: str,
        title: str,
    ) -> SecurityIncident:
        incident = await db.scalar(
            select(SecurityIncident)
            .where(
                SecurityIncident.correlation_key == signal.correlation_key,
                SecurityIncident.detection_rule == rule,
                SecurityIncident.status.in_(("open", "acknowledged", "investigating")),
            )
            .order_by(SecurityIncident.created_at.desc())
            .limit(1)
        )
        now = _utc(signal.occurred_at)
        if incident is None:
            incident = SecurityIncident(
                reference=f"SOC-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:10].upper()}",
                tenant_id=signal.tenant_id,
                institution_id=signal.institution_id,
                category=signal.category,
                detection_rule=rule,
                correlation_key=signal.correlation_key,
                title=title,
                severity=severity,
                status="open",
                event_count=1,
                first_seen_at=now,
                last_seen_at=now,
                evidence_summary={
                    "latest_signal_id": str(signal.id),
                    "latest_event_type": signal.event_type,
                    "source": signal.source,
                },
            )
            db.add(incident)
            await db.flush()
            return incident

        incident.event_count += 1
        incident.last_seen_at = max(_utc(incident.last_seen_at), now)
        if _SEVERITY_RANK[severity] > _SEVERITY_RANK[_severity(incident.severity)]:
            incident.severity = severity
        incident.evidence_summary = {
            "latest_signal_id": str(signal.id),
            "latest_event_type": signal.event_type,
            "source": signal.source,
        }
        await db.flush()
        return incident

    async def correlate_unprocessed(self, db: AsyncSession, *, limit: int = 500) -> dict[str, int]:
        processed = 0
        incidents = 0
        async with self.service_scope(db):
            query = (
                select(SecuritySignal)
                .where(SecuritySignal.processed_at.is_(None))
                .order_by(SecuritySignal.occurred_at.asc())
                .limit(max(1, min(limit, 2000)))
            )
            if db.get_bind() is not None and db.get_bind().dialect.name == "postgresql":
                query = query.with_for_update(skip_locked=True)
            result = await db.execute(query)
            signals = list(result.scalars().all())

            for signal in signals:
                matched = self._rule_for(signal)
                if matched is not None:
                    rule, severity, title = matched
                    if await self._threshold_reached(db, signal, rule):
                        incident = await self._upsert_incident(
                            db,
                            signal,
                            rule=rule,
                            severity=severity,
                            title=title,
                        )
                        signal.incident_id = incident.id
                        incidents += 1
                signal.processed_at = datetime.now(timezone.utc)
                processed += 1
            await db.flush()
        return {"processed": processed, "incident_matches": incidents}


soc_service = SocService()

if not event.contains(AuditLog, "after_insert", _mirror_audit_signal):
    event.listen(AuditLog, "after_insert", _mirror_audit_signal)
