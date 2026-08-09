"""Regression and adversarial tests for SOC signal and incident handling."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
import uuid

import pytest
from sqlalchemy import select

from app.config import settings
from app.models.security_incident import SecurityIncident, SecuritySignal
from app.services.audit_service import AuditService
from app.services.soc_service import SocService, soc_service


@pytest.mark.asyncio
async def test_security_audit_is_mirrored_redacted_and_pseudonymized(
    db_session,
    super_admin_user,
):
    service = AuditService(db_session)
    await service.log_action(
        user_id=super_admin_user.id,
        action="LOGIN",
        resource_type="auth",
        resource_id=str(super_admin_user.id),
        category="auth",
        description="Échec de connexion administrateur",
        details={
            "success": False,
            "reason": "invalid_password",
            "access_token": "must-never-survive",
            "nested": {"password": "secret", "safe": "kept"},
        },
        severity="high",
        ip_address="192.0.2.10",
        user_agent="Mozilla/5.0 sensitive-agent",
        tenant_id=super_admin_user.tenant_id or settings.TENANT_DEFAULT_ID,
        institution_id=super_admin_user.institution_id,
    )
    await db_session.flush()

    signal = await db_session.scalar(
        select(SecuritySignal).where(SecuritySignal.source == "application_audit")
    )
    assert signal is not None
    assert signal.event_type == "auth.login.failed"
    assert signal.network_source_hash
    assert signal.network_source_hash != "192.0.2.10"
    assert signal.user_agent_hash
    serialized = json.dumps(signal.details)
    assert "must-never-survive" not in serialized
    assert '"access_token": "[REDACTED]"' in serialized
    assert '"password": "[REDACTED]"' in serialized
    assert '"safe": "kept"' in serialized


@pytest.mark.asyncio
async def test_five_failed_logins_in_ten_minutes_create_one_high_incident(db_session):
    now = datetime.now(timezone.utc)
    correlation_key = hashlib.sha256(b"same-principal-and-network").hexdigest()
    for index in range(5):
        db_session.add(
            SecuritySignal(
                source="test",
                external_event_id=f"login-failed-{index}",
                event_type="auth.login.failed",
                category="auth",
                severity="medium",
                tenant_id=settings.TENANT_DEFAULT_ID,
                institution_id="inst-soc",
                correlation_key=correlation_key,
                details={"audit_details": {"success": False}},
                occurred_at=now - timedelta(minutes=5 - index),
            )
        )
    await db_session.flush()

    result = await soc_service.correlate_unprocessed(db_session)
    assert result["processed"] == 5

    incidents = list(
        (
            await db_session.execute(
                select(SecurityIncident).where(
                    SecurityIncident.detection_rule == "authentication_failure_burst"
                )
            )
        ).scalars().all()
    )
    assert len(incidents) == 1
    incident = incidents[0]
    assert incident.severity == "high"
    assert incident.status == "open"
    assert incident.event_count == 5


@pytest.mark.asyncio
async def test_break_glass_approval_becomes_critical_incident(db_session):
    signal = SecuritySignal(
        source="application_audit",
        external_event_id="break-glass-1",
        event_type="security.permission_change",
        category="security",
        severity="high",
        tenant_id=settings.TENANT_DEFAULT_ID,
        institution_id="inst-soc",
        correlation_key=hashlib.sha256(b"break-glass").hexdigest(),
        details={
            "description": "Délégation break-glass approuvée pour incident INC-001",
            "audit_details": {"grant_type": "break_glass"},
        },
        occurred_at=datetime.now(timezone.utc),
    )
    db_session.add(signal)
    await db_session.flush()

    await soc_service.correlate_unprocessed(db_session)
    incident = await db_session.scalar(
        select(SecurityIncident).where(
            SecurityIncident.detection_rule == "break_glass_activated"
        )
    )
    assert incident is not None
    assert incident.severity == "critical"
    assert signal.incident_id == incident.id


def test_detail_sanitization_is_bounded_and_redacts_credentials():
    service = SocService()
    result = service.sanitize_external_details(
        {
            "Authorization": "Bearer stolen",
            "cookie": "session=x",
            "safe": "visible",
            "deep": {"private_key": "-----BEGIN PRIVATE KEY-----", "ok": 1},
        }
    )
    assert result["Authorization"] == "[REDACTED]"
    assert result["cookie"] == "[REDACTED]"
    assert result["safe"] == "visible"
    assert result["deep"]["private_key"] == "[REDACTED]"
    assert result["deep"]["ok"] == 1


def test_network_pseudonymization_is_deterministic_and_non_reversible_plaintext():
    service = SocService()
    first = service.pseudonymize_network_value("203.0.113.7")
    second = service.pseudonymize_network_value("203.0.113.7")
    other = service.pseudonymize_network_value("203.0.113.8")
    assert first == second
    assert first != other
    assert first != "203.0.113.7"
    assert len(first or "") == 64


@pytest.mark.asyncio
async def test_signed_external_ingest_is_idempotent_and_rejects_replay_window(
    client,
    monkeypatch,
):
    monkeypatch.setattr(settings, "SOC_INGEST_ENABLED", True)
    monkeypatch.setattr(settings, "SOC_INGEST_HMAC_SECRET", "s" * 48)
    monkeypatch.setattr(settings, "SOC_INGEST_MAX_SKEW_SECONDS", 300)

    body = {
        "source": "waf",
        "external_event_id": "waf-evt-1",
        "event_type": "web.attack.detected",
        "category": "security",
        "severity": "critical",
        "tenant_id": settings.TENANT_DEFAULT_ID,
        "institution_id": "inst-soc",
        "network_source": "198.51.100.9",
        "user_agent": "scanner",
        "details": {"rule": "sql-injection", "authorization": "Bearer hidden"},
        "occurred_at": datetime.now(timezone.utc).isoformat(),
    }
    raw = json.dumps(body, separators=(",", ":")).encode("utf-8")
    timestamp = str(int(datetime.now(timezone.utc).timestamp()))
    signature = "sha256=" + hmac.new(
        settings.SOC_INGEST_HMAC_SECRET.encode("utf-8"),
        timestamp.encode("ascii") + b"." + raw,
        hashlib.sha256,
    ).hexdigest()
    headers = {
        "Content-Type": "application/json",
        "X-EAdmin-SOC-Timestamp": timestamp,
        "X-EAdmin-SOC-Signature": signature,
    }

    first = await client.post("/api/v1/soc/ingest", content=raw, headers=headers)
    assert first.status_code == 202, first.text
    second = await client.post("/api/v1/soc/ingest", content=raw, headers=headers)
    assert second.status_code == 202, second.text
    assert first.json()["id"] == second.json()["id"]
    assert "network_source" not in first.json()

    stale_timestamp = str(int(datetime.now(timezone.utc).timestamp()) - 1000)
    stale_signature = "sha256=" + hmac.new(
        settings.SOC_INGEST_HMAC_SECRET.encode("utf-8"),
        stale_timestamp.encode("ascii") + b"." + raw,
        hashlib.sha256,
    ).hexdigest()
    stale = await client.post(
        "/api/v1/soc/ingest",
        content=raw,
        headers={
            **headers,
            "X-EAdmin-SOC-Timestamp": stale_timestamp,
            "X-EAdmin-SOC-Signature": stale_signature,
        },
    )
    assert stale.status_code == 401


@pytest.mark.asyncio
async def test_incident_response_requires_resolution_before_close(
    client,
    db_session,
    super_admin_auth_headers,
):
    incident = SecurityIncident(
        reference=f"SOC-TEST-{uuid.uuid4().hex[:8]}",
        tenant_id=settings.TENANT_DEFAULT_ID,
        institution_id=None,
        category="security",
        detection_rule="test_rule",
        correlation_key=hashlib.sha256(uuid.uuid4().bytes).hexdigest(),
        title="Incident de recette SOC",
        severity="high",
        status="open",
        event_count=1,
        first_seen_at=datetime.now(timezone.utc),
        last_seen_at=datetime.now(timezone.utc),
    )
    db_session.add(incident)
    await db_session.commit()

    close_too_early = await client.post(
        f"/api/v1/soc/incidents/{incident.id}/close",
        headers=super_admin_auth_headers,
    )
    assert close_too_early.status_code == 409

    acknowledge = await client.post(
        f"/api/v1/soc/incidents/{incident.id}/acknowledge",
        headers=super_admin_auth_headers,
    )
    assert acknowledge.status_code == 200, acknowledge.text
    assert acknowledge.json()["status"] == "acknowledged"

    resolve = await client.post(
        f"/api/v1/soc/incidents/{incident.id}/resolve",
        headers=super_admin_auth_headers,
        json={"resolution": "Compte compromis révoqué, secret renouvelé et analyse terminée."},
    )
    assert resolve.status_code == 200, resolve.text
    assert resolve.json()["status"] == "resolved"

    close = await client.post(
        f"/api/v1/soc/incidents/{incident.id}/close",
        headers=super_admin_auth_headers,
    )
    assert close.status_code == 200, close.text
    assert close.json()["status"] == "closed"
