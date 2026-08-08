"""Externally validated certificate/TSA evidence for document signatures.

This model is deliberately separate from SignatureStep internal approval hashes.
Rows are written only by a future trusted-provider adapter after cryptographic
validation; there is no public create endpoint in the trust-foundation phase.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class QualifiedSignatureEvidence(Base):
    __tablename__ = "qualified_signature_evidence"
    __table_args__ = (
        UniqueConstraint(
            "provider",
            "provider_transaction_id",
            name="uq_qualified_signature_provider_transaction",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    signature_step_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("signature_steps.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    document_version: Mapped[int] = mapped_column(Integer, nullable=False)
    document_hash: Mapped[str] = mapped_column(String(128), nullable=False)

    provider: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    provider_transaction_id: Mapped[str] = mapped_column(String(255), nullable=False)
    evidence_object_key: Mapped[str] = mapped_column(String(1024), nullable=False)

    signer_certificate_fingerprint_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    signer_certificate_serial: Mapped[str | None] = mapped_column(String(255), nullable=True)
    signer_subject: Mapped[str | None] = mapped_column(String(500), nullable=True)
    signature_algorithm: Mapped[str] = mapped_column(String(100), nullable=False)

    certificate_chain_valid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    certificate_status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="unchecked"
    )
    revocation_checked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    timestamp_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    timestamp_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    timestamp_valid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    trust_policy_oid: Mapped[str] = mapped_column(String(255), nullable=False)
    policy_valid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    validation_status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="pending"
    )
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Qualification is never inferred from the fields above. It requires a
    # separate external attestation/reference controlled by the trust process.
    qualification_status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="external_attestation_required"
    )
    qualification_attestation_ref: Mapped[str | None] = mapped_column(
        String(1000), nullable=True
    )
    qualification_attested_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
