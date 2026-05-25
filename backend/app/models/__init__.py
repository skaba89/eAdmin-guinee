"""
Importation de tous les modèles ORM.
Nécessaire pour qu'Alembic et SQLAlchemy les détectent.
"""

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
from app.models.user import RoleEnum, User
from app.models.workflow import (
    Workflow,
    WorkflowStep,
    WorkflowStepStatusEnum,
    WorkflowStatusEnum,
)

__all__ = [
    # Utilisateurs
    "User",
    "RoleEnum",
    # Documents
    "Document",
    "DocumentStatusEnum",
    # Document Versions
    "DocumentVersion",
    # Electronic Stamps & Parapheur
    "ElectronicStamp",
    "SignatureCircuit",
    "SignatureStep",
    # Courriers
    "Courrier",
    "CourrierTypeEnum",
    "CourrierPriorityEnum",
    "CourrierStatusEnum",
    # Workflows
    "Workflow",
    "WorkflowStep",
    "WorkflowStatusEnum",
    "WorkflowStepStatusEnum",
    # Audit
    "AuditLog",
]
