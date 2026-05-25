"""
Domain layer - eAdministration Suite Guinea.
Contains business entities, value objects, policies, and validators.
"""

from app.domain.entities import (
    DocumentClassification,
    RequestStatus,
    WorkflowStatus,
    TenantScope,
    Clearance,
    DomainEvent,
    DocumentAccessedEvent,
    RequestStatusChangedEvent,
)
from app.domain.policies import DocumentAccessPolicy, RequestProcessingPolicy
from app.domain.validators import (
    PasswordValidator,
    NINValidator,
    EmailValidator,
    InstitutionValidator,
    ValidationResult,
)

__all__ = [
    "DocumentClassification",
    "RequestStatus",
    "WorkflowStatus",
    "TenantScope",
    "Clearance",
    "DomainEvent",
    "DocumentAccessedEvent",
    "RequestStatusChangedEvent",
    "DocumentAccessPolicy",
    "RequestProcessingPolicy",
    "PasswordValidator",
    "NINValidator",
    "EmailValidator",
    "InstitutionValidator",
    "ValidationResult",
]
