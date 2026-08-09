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
            security_clearance=10,
            assurance_level=2,
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

    async with async_session_factory() as session:
        created = 0
        for slug, role, full_name in TEST_ROLES:
            email = f"{slug}@{domain}"
            if await session.scalar(select(User).where(User.email == email)):
                continue
            session.add(
                User(
                    email=email,
                    hashed_password=pwd_context.hash(password),
                    full_name=full_name,
                    role=role,
                    institution=institution_name if role != RoleEnum.CITOYEN else None,
                    tenant_id=settings.TENANT_DEFAULT_ID,
                    institution_id=institution_id if role != RoleEnum.CITOYEN else None,
                    privileged_account=role in {RoleEnum.ADMIN, RoleEnum.CHEF_SERVICE, RoleEnum.DIRECTEUR, RoleEnum.MINISTRE},
                    security_clearance=5 if role.hierarchy_level() >= RoleEnum.CHEF_SERVICE.hierarchy_level() else 1,
                    assurance_level=1,
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
