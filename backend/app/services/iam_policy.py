"""Pure IAM policy invariants for privileged and delegated access."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


class SecuritySubject(Protocol):
    employment_status: str
    security_clearance: int
    assurance_level: int
    privileged_account: bool


@dataclass(frozen=True)
class SecurityRequirement:
    min_clearance: int
    min_assurance: int
    require_mfa: bool = True
    require_privileged_account: bool = True


@dataclass(frozen=True)
class SecurityAttributeDecision:
    allowed: bool
    reason: str


# 0=public/basic, 1=internal, 2=sensitive, 3=restricted, 4=sovereign.
# Assurance follows the same monotonic principle: stronger authentication and
# identity proofing must never reduce the required level for a normal sensitive
# operation.
SENSITIVE_PERMISSION_REQUIREMENTS: dict[tuple[str, str], SecurityRequirement] = {
    ("users", "delete"): SecurityRequirement(3, 3),
    ("settings", "update"): SecurityRequirement(4, 3),
    ("tenants", "manage"): SecurityRequirement(4, 3),
}

# Delegations must not create a maker/checker conflict. The legacy role
# hierarchy may still include both capabilities for some permanent senior
# roles; this policy prevents temporary elevation from introducing new
# conflicts while the role model is progressively decomposed.
SOD_CONFLICTS: dict[tuple[str, str], frozenset[tuple[str, str]]] = {
    ("requests", "approve"): frozenset({("requests", "process")}),
    ("requests", "reject"): frozenset({("requests", "process")}),
    ("requests", "process"): frozenset(
        {("requests", "approve"), ("requests", "reject")}
    ),
}


def evaluate_security_attributes(
    subject: SecuritySubject,
    *,
    resource: str,
    action: str,
    mfa_verified: bool,
    break_glass: bool = False,
    now: datetime | None = None,
) -> SecurityAttributeDecision:
    """Fail closed for normal privileged actions and emergency elevation.

    Ordinary permissions remain compatible with the existing RBAC unless the
    employment status is not active. Normal sensitive actions require the local
    server-authoritative ABAC profile in addition to the role.

    Break-glass is intentionally a distinct emergency override rather than a
    duplicate of the normal privileged profile. Its strong controls are enforced
    by AccessGrant/AuthorizationService: active employment, incident ticket,
    independent requester/beneficiary/approver, SUPER_ADMIN approval, verified
    MFA, tenant/institution scope, explicit permission and a <=4h window. It may
    therefore operate when the beneficiary does not already hold the normal
    clearance/privileged-account attributes that the emergency is designed to
    bypass.
    """
    del now  # reserved for future time/context attributes; keeps API stable.

    if getattr(subject, "employment_status", "active") != "active":
        return SecurityAttributeDecision(False, "employment_not_active")

    if break_glass:
        if not mfa_verified:
            return SecurityAttributeDecision(False, "verified_mfa_required")
        return SecurityAttributeDecision(True, "break_glass_emergency_attributes_satisfied")

    requirement = SENSITIVE_PERMISSION_REQUIREMENTS.get((resource, action))
    if requirement is None:
        return SecurityAttributeDecision(True, "no_additional_abac_requirement")

    if getattr(subject, "security_clearance", 0) < requirement.min_clearance:
        return SecurityAttributeDecision(False, "security_clearance_insufficient")
    if getattr(subject, "assurance_level", 1) < requirement.min_assurance:
        return SecurityAttributeDecision(False, "identity_assurance_insufficient")
    if requirement.require_privileged_account and not getattr(
        subject, "privileged_account", False
    ):
        return SecurityAttributeDecision(False, "privileged_account_required")
    if requirement.require_mfa and not mfa_verified:
        return SecurityAttributeDecision(False, "verified_mfa_required")

    return SecurityAttributeDecision(True, "abac_requirements_satisfied")


def conflicting_permissions(resource: str, action: str) -> frozenset[tuple[str, str]]:
    return SOD_CONFLICTS.get((resource, action), frozenset())
