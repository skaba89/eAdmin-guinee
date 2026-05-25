"""
Domain Policies - eAdministration Suite Guinea.
Business rules and authorization policies.
"""

from app.domain.entities import Clearance, DocumentClassification, TenantScope


class DocumentAccessPolicy:
    """Policy governing document access based on clearance and tenant scope."""
    
    ROLE_CLEARANCE = {
        "SUPER_ADMIN": 3,
        "ADMIN": 3,
        "DIRECTEUR": 2,
        "CHEF_SERVICE": 1,
        "AGENT": 1,
        "CITOYEN": 0,
        "MAIRIE": 1,
        "AGENCE": 1,
        "MINISTRE": 2,
    }
    
    @classmethod
    def can_read(cls, role: str, classification: DocumentClassification, 
                 tenant: TenantScope, document_category: str | None = None) -> bool:
        """Check if a role can read a document of given classification."""
        clearance_level = cls.ROLE_CLEARANCE.get(role, 0)
        required = Clearance.from_classification(classification)
        user_clearance = Clearance(level=clearance_level)
        
        if not user_clearance.can_access(required):
            return False
        
        # Super admins and admins bypass tenant checks
        if role in ("SUPER_ADMIN", "ADMIN"):
            return True
        
        # Tenant scope check for non-public documents
        if classification != DocumentClassification.PUBLIC and document_category:
            if not tenant.can_access_category(document_category):
                return False
        
        return True
    
    @classmethod
    def can_upload(cls, role: str) -> bool:
        """Check if a role can upload documents."""
        return role in ("SUPER_ADMIN", "ADMIN", "DIRECTEUR", "CHEF_SERVICE", "AGENT")
    
    @classmethod
    def can_delete(cls, role: str) -> bool:
        """Check if a role can delete documents."""
        return role in ("SUPER_ADMIN", "ADMIN")
    
    @classmethod
    def can_manage_classifications(cls, role: str) -> bool:
        """Check if a role can manage document classifications."""
        return role in ("SUPER_ADMIN", "ADMIN", "DIRECTEUR")


class RequestProcessingPolicy:
    """Policy governing citizen request processing."""
    
    @classmethod
    def can_process(cls, role: str, request_category: str, 
                    tenant: TenantScope) -> bool:
        """Check if a role can process requests in a given category."""
        if role in ("SUPER_ADMIN", "ADMIN"):
            return True
        if role == "CITOYEN":
            return False
        return tenant.can_access_category(request_category)
    
    @classmethod
    def can_approve(cls, role: str) -> bool:
        """Check if a role can approve requests."""
        return role in ("SUPER_ADMIN", "ADMIN", "DIRECTEUR", "CHEF_SERVICE")
    
    @classmethod
    def can_reject(cls, role: str) -> bool:
        """Check if a role can reject requests."""
        return role in ("SUPER_ADMIN", "ADMIN", "DIRECTEUR", "CHEF_SERVICE")
    
    @classmethod
    def can_delete_request(cls, role: str) -> bool:
        """Check if a role can delete requests entirely."""
        return role in ("SUPER_ADMIN", "ADMIN")
