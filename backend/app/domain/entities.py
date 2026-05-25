"""
Domain Entities - eAdministration Suite Guinea.
Core business entities following DDD principles.
"""

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class DocumentClassification(str, Enum):
    """Classification levels for government documents."""
    PUBLIC = "PUBLIC"
    DIFFUSION_LIMITEE = "DIFFUSION_LIMITEE"
    CONFIDENTIEL = "CONFIDENTIEL"
    SECRET = "SECRET"


class RequestStatus(str, Enum):
    """Status of a citizen service request."""
    SOUMISE = "soumise"
    EN_COURS = "en_cours"
    PIECES_COMPLEMENTAIRES = "pieces_complementaires"
    VALIDE = "valide"
    PRET = "pret"
    LIVRE = "livre"
    REJETE = "rejete"


class WorkflowStatus(str, Enum):
    """Status of a workflow."""
    BROUILLON = "brouillon"
    ACTIF = "actif"
    EN_PAUSE = "en_pause"
    TERMINE = "termine"


@dataclass
class TenantScope:
    """Value object representing tenant scope for multi-tenancy."""
    institution: str
    categories: list[str] = field(default_factory=list)
    
    def can_access_category(self, category: str) -> bool:
        """Check if this tenant can access a given category."""
        return category in self.categories or not self.categories


@dataclass
class Clearance:
    """Value object representing security clearance level."""
    level: int  # 0=PUBLIC, 1=DIFFUSION_LIMITEE, 2=CONFIDENTIEL, 3=SECRET
    
    @classmethod
    def from_classification(cls, classification: DocumentClassification) -> "Clearance":
        mapping = {
            DocumentClassification.PUBLIC: 0,
            DocumentClassification.DIFFUSION_LIMITEE: 1,
            DocumentClassification.CONFIDENTIEL: 2,
            DocumentClassification.SECRET: 3,
        }
        return cls(level=mapping[classification])
    
    def can_access(self, required_clearance: "Clearance") -> bool:
        """Check if this clearance level allows access to a resource."""
        return self.level >= required_clearance.level


@dataclass
class DomainEvent:
    """Base class for domain events."""
    event_type: str = ""
    aggregate_id: str = ""
    timestamp: datetime = field(default_factory=datetime.utcnow)
    data: dict = field(default_factory=dict)


@dataclass
class DocumentAccessedEvent(DomainEvent):
    """Event raised when a document is accessed."""
    event_type: str = "document.accessed"
    user_id: str = ""
    access_type: str = "read"  # read, download, export


@dataclass
class RequestStatusChangedEvent(DomainEvent):
    """Event raised when a request status changes."""
    event_type: str = "request.status_changed"
    old_status: str = ""
    new_status: str = ""
    changed_by: str = ""
