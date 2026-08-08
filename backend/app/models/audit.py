"""Audit log model with transactional tamper-evident chain enforcement."""

import hashlib
import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text, event, func, text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config import settings
from app.database import Base


class AuditLog(Base):
    """Journal d'audit append-only pour la traçabilité des actions."""

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    resource_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    resource_id: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)

    user_agent: Mapped[str | None] = mapped_column(
        String(512), nullable=True, comment="Browser/client user agent"
    )
    session_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True, index=True, comment="Session identifier"
    )
    device_fingerprint: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="Device fingerprint for anomaly detection"
    )
    resource_name: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment="Human-readable resource name"
    )
    severity: Mapped[str] = mapped_column(
        String(20), nullable=False, default="info", index=True
    )

    old_value: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Previous value for modifications (JSON string)"
    )
    new_value: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="New value for modifications (JSON string)"
    )

    entry_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    previous_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)

    tenant_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, index=True,
        comment="Tenant identifier for multi-tenant isolation"
    )
    institution_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True,
        comment="Institution identifier for RLS"
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    user = relationship("User", back_populates="audit_logs", lazy="selectin")

    def __repr__(self) -> str:
        return f"<AuditLog {self.action} on {self.resource_type}/{self.resource_id}>"


def _audit_entry_hash(target: AuditLog) -> str:
    """Compute the same canonical SHA-256 representation as AuditService."""

    hash_input = json.dumps(
        {
            "id": str(target.id),
            "user_id": str(target.user_id) if target.user_id else None,
            "action": target.action,
            "resource_type": target.resource_type,
            "resource_id": target.resource_id,
            "timestamp": target.timestamp.isoformat(),
            "previous_hash": target.previous_hash,
            "tenant_id": target.tenant_id,
            "institution_id": target.institution_id,
        },
        sort_keys=True,
        ensure_ascii=False,
    )
    return hashlib.sha256(hash_input.encode("utf-8")).hexdigest()


@event.listens_for(AuditLog, "before_insert")
def _lock_and_chain_audit_entry(mapper, connection, target: AuditLog) -> None:
    """Serialize audit writes per tenant and enforce the real chain head.

    ``audit_logs`` is FORCE-RLS protected, so unauthenticated login attempts must
    not receive SELECT permission merely to discover the previous hash. The
    internal ``audit_chain_heads`` table carries that minimal state. Row locking
    makes concurrent audit writes deterministic and prevents chain forks.
    """

    if connection.dialect.name != "postgresql":
        return

    if target.id is None:
        target.id = uuid.uuid4()
    if target.timestamp is None:
        target.timestamp = datetime.now(timezone.utc)
    if not target.tenant_id:
        target.tenant_id = settings.TENANT_DEFAULT_ID

    connection.execute(
        text(
            """
            INSERT INTO audit_chain_heads (tenant_id, last_hash, updated_at)
            VALUES (:tenant_id, NULL, NOW())
            ON CONFLICT (tenant_id) DO NOTHING
            """
        ),
        {"tenant_id": target.tenant_id},
    )

    result = connection.execute(
        text(
            """
            SELECT last_hash
            FROM audit_chain_heads
            WHERE tenant_id = :tenant_id
            FOR UPDATE
            """
        ),
        {"tenant_id": target.tenant_id},
    )
    target.previous_hash = result.scalar_one_or_none()
    target.entry_hash = _audit_entry_hash(target)

    connection.execute(
        text(
            """
            UPDATE audit_chain_heads
            SET last_hash = :last_hash,
                updated_at = NOW()
            WHERE tenant_id = :tenant_id
            """
        ),
        {
            "tenant_id": target.tenant_id,
            "last_hash": target.entry_hash,
        },
    )
