"""
Importation de tous les modèles ORM.
Nécessaire pour qu'Alembic et SQLAlchemy les détectent.
"""

from app.models.administrative_service import AdministrativeService
from app.models.audit import AuditLog
from app.models.courrier import (
    Courrier,
    CourrierPriorityEnum,
    CourrierStatusEnum,
    CourrierTypeEnum,
)
from app.models.document import Document, DocumentStatusEnum
from app.models.document_version import DocumentVersion
from app.models.electronic_stamp import ElectronicStamp, SignatureCircuit, SignatureStep
from app.models.institution import Institution
from app.models.service_request import (
    DeliveryModeEnum,
    GeneratedServiceDocument,
    ServiceRequest,
    ServiceRequestAttachment,
    ServiceRequestNote,
    ServiceRequestStatusEnum,
)
from app.models.tenant import Tenant
from app.models.user import RoleEnum, User
from app.models.workflow import (
    Workflow,
    WorkflowStep,
    WorkflowStepStatusEnum,
    WorkflowStatusEnum,
)

__all__ = [
    "AdministrativeService",
    "User",
    "RoleEnum",
    "Tenant",
    "Institution",
    "Document",
    "DocumentStatusEnum",
    "DocumentVersion",
    "ElectronicStamp",
    "SignatureCircuit",
    "SignatureStep",
    "Courrier",
    "CourrierTypeEnum",
    "CourrierPriorityEnum",
    "CourrierStatusEnum",
    "Workflow",
    "WorkflowStep",
    "WorkflowStatusEnum",
    "WorkflowStepStatusEnum",
    "ServiceRequest",
    "ServiceRequestStatusEnum",
    "DeliveryModeEnum",
    "ServiceRequestNote",
    "ServiceRequestAttachment",
    "GeneratedServiceDocument",
    "AuditLog",
]
