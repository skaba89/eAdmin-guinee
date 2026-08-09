"""Pure IAM policy invariants for privileged and delegated access."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
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
# identity proofing must never reduce the required level for a sensitive action.
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
    """Fail closed for privileged actions and emergency elevation.

    Ordinary permissions remain compatible with the existing RBAC unless the
    account is explicitly non-active. Sensitive actions require server-side
    attributes in addition to the role. Break-glass always requires a
    privileged account, assurance level 3+, verified MFA and clearance 2+ even
    when the target permission is not normally marked sensitive.
    """
    del now  # reserved for future time/context attributes; keeps API stable.

    if getattr(subject, "employment_status", "active") != "active":
        return SecurityAttributeDecision(False, "employment_not_active")

    requirement = SENSITIVE_PERMISSION_REQUIREMENTS.get((resource, action))
    if break_glass:
        emergency = SecurityRequirement(2, 3, True, True)
        if requirement is None:
            requirement = emergency
        else:
            requirement = SecurityRequirement(
                min_clearance=max(requirement.min_clearance, emergency.min_clearance),
                min_assurance=max(requirement.min_assurance, emergency.min_assurance),
                require_mfa=True,
                require_privileged_account=True,
            )

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
