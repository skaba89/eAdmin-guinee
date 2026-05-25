"""
Domain Validators - eAdministration Suite Guinea.
Input validation and business rule enforcement.
"""

import re
from dataclasses import dataclass


@dataclass
class ValidationResult:
    """Result of a validation operation."""
    is_valid: bool
    errors: list[str]
    
    @classmethod
    def success(cls) -> "ValidationResult":
        return cls(is_valid=True, errors=[])
    
    @classmethod
    def failure(cls, errors: list[str]) -> "ValidationResult":
        return cls(is_valid=False, errors=errors)


class PasswordValidator:
    """Validates password strength for government security requirements."""
    
    MIN_LENGTH = 8
    REQUIRE_UPPERCASE = True
    REQUIRE_DIGIT = True
    REQUIRE_SPECIAL = False  # Optional but recommended
    
    @classmethod
    def validate(cls, password: str) -> ValidationResult:
        """Validate password against security requirements."""
        errors = []
        
        if len(password) < cls.MIN_LENGTH:
            errors.append(f"Le mot de passe doit contenir au moins {cls.MIN_LENGTH} caractères.")
        
        if cls.REQUIRE_UPPERCASE and not any(c.isupper() for c in password):
            errors.append("Le mot de passe doit contenir au moins une majuscule.")
        
        if cls.REQUIRE_DIGIT and not any(c.isdigit() for c in password):
            errors.append("Le mot de passe doit contenir au moins un chiffre.")
        
        if cls.REQUIRE_SPECIAL and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Le mot de passe doit contenir au moins un caractère spécial.")
        
        return ValidationResult(is_valid=len(errors) == 0, errors=errors)


class NINValidator:
    """Validates Guinea National Identification Numbers."""
    
    NIN_PATTERN = re.compile(r'^NIN-\d{4}-\d{6}$')
    
    @classmethod
    def validate(cls, nin: str) -> ValidationResult:
        """Validate NIN format."""
        errors = []
        
        if not nin:
            errors.append("NIN requis.")
            return ValidationResult(is_valid=False, errors=errors)
        
        if not cls.NIN_PATTERN.match(nin):
            errors.append("Format NIN invalide. Format attendu: NIN-AAAA-NNNNNN")
        
        return ValidationResult(is_valid=len(errors) == 0, errors=errors)


class EmailValidator:
    """Validates email addresses for government domain requirements."""
    
    EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    
    # Government domains allowed for admin accounts
    GOV_DOMAINS = ['eadmin.gn', 'gouv.gn']
    
    @classmethod
    def validate(cls, email: str, require_gov_domain: bool = False) -> ValidationResult:
        """Validate email format and optionally require government domain."""
        errors = []
        
        if not cls.EMAIL_PATTERN.match(email):
            errors.append("Format d'email invalide.")
            return ValidationResult(is_valid=False, errors=errors)
        
        if require_gov_domain:
            domain = email.split('@')[1]
            if not any(domain.endswith(gov) for gov in cls.GOV_DOMAINS):
                errors.append(f"Email gouvernemental requis (.gn).")
        
        return ValidationResult(is_valid=len(errors) == 0, errors=errors)


class InstitutionValidator:
    """Validates institution assignments for multi-tenant setup."""
    
    KNOWN_INSTITUTIONS = [
        "Présidence de la République de Guinée",
        "Ministère de l'Administration du Territoire",
        "Ministère de l'Éducation Nationale",
        "Ministère de la Santé",
        "Mairie de Conakry — Kaloum",
        "ANIP — Agence Nationale d'Identification Personnelle",
        "Direction de l'Urbanisme",
        "APIP — Agence de Promotion des Investissements Privés",
        "Direction Générale des Impôts",
        "Caisse Nationale de Sécurité Sociale",
        "Direction Générale de la Modernisation Administrative",
    ]
    
    @classmethod
    def validate(cls, institution: str | None, role: str) -> ValidationResult:
        """Validate institution assignment for a role."""
        errors = []
        
        # Citoyen doesn't need an institution
        if role == "CITOYEN":
            return ValidationResult.success()
        
        if not institution:
            errors.append("Institution requise pour ce rôle.")
        elif institution not in cls.KNOWN_INSTITUTIONS:
            errors.append(f"Institution non reconnue: {institution}")
        
        return ValidationResult(is_valid=len(errors) == 0, errors=errors)
