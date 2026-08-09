"""Controlled runtime bootstrap for first deployment and non-production portal tests.

No credential is embedded in source. Bootstrap is opt-in and idempotent.
"""

from __future__ import annotations

import asyncio
import logging
import os

from passlib.context import CryptContext
from sqlalchemy import select

from app.config import settings
from app.database import async_session_factory
from app.models.institution import Institution
from app.models.user import RoleEnum, User

logger = logging.getLogger("eadmin.bootstrap")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _enabled(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "on"}


def _require_strong_password(value: str, variable: str) -> str:
    if len(value) < 12:
        raise RuntimeError(f"{variable} must contain at least 12 characters.")
    if not any(ch.islower() for ch in value):
        raise RuntimeError(f"{variable} must contain a lowercase letter.")
    if not any(ch.isupper() for ch in value):
        raise RuntimeError(f"{variable} must contain an uppercase letter.")
    if not any(ch.isdigit() for ch in value):
        raise RuntimeError(f"{variable} must contain a digit.")
    if not any(not ch.isalnum() for ch in value):
        raise RuntimeError(f"{variable} must contain a special character.")
    return value


def _test_security_profile(role: RoleEnum) -> tuple[int, int, bool]:
    """Return ABAC values that remain inside the governed DB ranges.

    security_clearance is constrained to 0..4 and assurance_level to 1..4.
    Role hierarchy is intentionally not copied directly into clearance because
    the two concepts have different scales and governance semantics.
    """
    profiles: dict[RoleEnum, tuple[int, int, bool]] = {
        RoleEnum.CITOYEN: (0, 1, False),
        RoleEnum.AGENT: (1, 1, False),
        RoleEnum.MAIRIE: (1, 1, False),
        RoleEnum.AGENCE: (1, 1, False),
        RoleEnum.ADMIN: (2, 2, True),
        RoleEnum.CHEF_SERVICE: (2, 2, True),
        RoleEnum.DIRECTEUR: (3, 3, True),
        RoleEnum.MINISTRE: (4, 3, True),
        RoleEnum.SUPER_ADMIN: (4, 3, True),
    }
    return profiles[role]


async def _bootstrap_superadmin() -> None:
    if not _enabled("EADMIN_BOOTSTRAP_SUPERADMIN_ENABLED"):
        return

    email = os.getenv("EADMIN_BOOTSTRAP_SUPERADMIN_EMAIL", "").strip().lower()
    password = os.getenv("EADMIN_BOOTSTRAP_SUPERADMIN_PASSWORD", "")
    if not email or not password:
        raise RuntimeError(
            "EADMIN_BOOTSTRAP_SUPERADMIN_ENABLED requires both "
            "EADMIN_BOOTSTRAP_SUPERADMIN_EMAIL and EADMIN_BOOTSTRAP_SUPERADMIN_PASSWORD."
        )
    _require_strong_password(password, "EADMIN_BOOTSTRAP_SUPERADMIN_PASSWORD")

    async with async_session_factory() as session:
        existing_superadmin = await session.scalar(
            select(User).where(User.role == RoleEnum.SUPER_ADMIN).limit(1)
        )
        if existing_superadmin:
            logger.info("SUPER_ADMIN already exists; bootstrap skipped.")
            return

        existing_email = await session.scalar(select(User).where(User.email == email))
        if existing_email:
            raise RuntimeError(
                "Bootstrap email already exists but is not a SUPER_ADMIN; refusing privilege escalation."
            )

        user = User(
            email=email,
            hashed_password=pwd_context.hash(password),
            full_name=os.getenv("EADMIN_BOOTSTRAP_SUPERADMIN_NAME", "Super Administrateur eAdmin").strip(),
            role=RoleEnum.SUPER_ADMIN,
            institution="Administration eAdmin",
            tenant_id=settings.TENANT_DEFAULT_ID,
            institution_id=None,
            privileged_account=True,
            security_clearance=4,
            assurance_level=3,
        )
        session.add(user)
        await session.commit()
        logger.warning(
            "Initial SUPER_ADMIN created. Remove EADMIN_BOOTSTRAP_SUPERADMIN_* variables after first successful login."
        )


TEST_ROLES: tuple[tuple[str, RoleEnum, str], ...] = (
    ("citoyen", RoleEnum.CITOYEN, "Citoyen Test"),
    ("agent", RoleEnum.AGENT, "Agent Test"),
    ("mairie", RoleEnum.MAIRIE, "Agent Mairie Test"),
    ("agence", RoleEnum.AGENCE, "Agent Agence Test"),
    ("admin", RoleEnum.ADMIN, "Administrateur Test"),
    ("chef-service", RoleEnum.CHEF_SERVICE, "Chef de Service Test"),
    ("directeur", RoleEnum.DIRECTEUR, "Directeur Test"),
    ("ministre", RoleEnum.MINISTRE, "Ministre Test"),
)


async def _ensure_test_institution(institution_id: str, institution_name: str) -> None:
    """Ensure the non-production institution referenced by test staff exists."""
    async with async_session_factory() as session:
        institution = await session.get(Institution, institution_id)
        if institution:
            if institution.tenant_id != settings.TENANT_DEFAULT_ID:
                raise RuntimeError(
                    "Configured test institution already belongs to another tenant; "
                    "refusing to reuse it for local bootstrap."
                )
            return

        session.add(
            Institution(
                id=institution_id,
                tenant_id=settings.TENANT_DEFAULT_ID,
                name=institution_name,
                type="agence",
                parent_id=None,
                code=None,
                is_active=True,
                settings={"bootstrap": "local-test"},
            )
        )
        await session.commit()
        logger.info("Local test institution %s created.", institution_id)


async def _bootstrap_test_portal_users() -> None:
    if not _enabled("EADMIN_BOOTSTRAP_TEST_USERS"):
        return
    if settings.is_production:
        raise RuntimeError("EADMIN_BOOTSTRAP_TEST_USERS is forbidden in production.")

    password = os.getenv("EADMIN_BOOTSTRAP_TEST_PASSWORD", "")
    _require_strong_password(password, "EADMIN_BOOTSTRAP_TEST_PASSWORD")
    domain = os.getenv("EADMIN_BOOTSTRAP_TEST_DOMAIN", "test.eadmin.local").strip().lower()
    institution_id = os.getenv("EADMIN_BOOTSTRAP_TEST_INSTITUTION_ID", "institution-test").strip()
    institution_name = os.getenv("EADMIN_BOOTSTRAP_TEST_INSTITUTION", "Institution Pilote eAdmin").strip()

    if not institution_id or not institution_name:
        raise RuntimeError(
            "EADMIN_BOOTSTRAP_TEST_INSTITUTION_ID and EADMIN_BOOTSTRAP_TEST_INSTITUTION "
            "must not be empty when test users are enabled."
        )

    await _ensure_test_institution(institution_id, institution_name)

    async with async_session_factory() as session:
        existing_emails = set(
            (
                await session.scalars(
                    select(User.email).where(
                        User.email.in_([f"{slug}@{domain}" for slug, _, _ in TEST_ROLES])
                    )
                )
            ).all()
        )

        created = 0
        for slug, role, full_name in TEST_ROLES:
            email = f"{slug}@{domain}"
            if email in existing_emails:
                continue
            security_clearance, assurance_level, privileged_account = _test_security_profile(role)
            session.add(
                User(
                    email=email,
                    hashed_password=pwd_context.hash(password),
                    full_name=full_name,
                    role=role,
                    institution=institution_name if role != RoleEnum.CITOYEN else None,
                    tenant_id=settings.TENANT_DEFAULT_ID,
                    institution_id=institution_id if role != RoleEnum.CITOYEN else None,
                    privileged_account=privileged_account,
                    security_clearance=security_clearance,
                    assurance_level=assurance_level,
                )
            )
            created += 1
        await session.commit()
        logger.info("Portal test bootstrap complete; %s account(s) created.", created)


async def main() -> None:
    await _bootstrap_superadmin()
    await _bootstrap_test_portal_users()


if __name__ == "__main__":
    asyncio.run(main())
