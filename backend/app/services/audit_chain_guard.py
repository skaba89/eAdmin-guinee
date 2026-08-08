"""Database-level audit hash-chain guard.

The listener serializes audit writes per tenant through ``audit_chain_heads``.
It recalculates ``previous_hash`` and ``entry_hash`` immediately before INSERT,
so the chain stays valid even when FORCE RLS prevents pre-authentication code
from reading the audit log table.
"""

import hashlib
import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import event, text

from app.config import settings
from app.models.audit import AuditLog


def _compute_entry_hash(target: AuditLog) -> str:
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
    """Serialize and chain one audit entry within the caller transaction."""

    if connection.dialect.name != "postgresql":
        # Unit tests use SQLite; the application service's Python chain logic
        # remains sufficient there.
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
    target.entry_hash = _compute_entry_hash(target)

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
