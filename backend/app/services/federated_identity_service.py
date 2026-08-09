"""Explicit lifecycle management for OIDC-to-local identity bindings."""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
import uuid

from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.federated_identity import FederatedIdentity
from app.models.user import User
from app.services.oidc_service import OIDCClaims


class FederatedIdentityError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


class FederatedIdentityService:
    """Manage explicit identity bindings under a dedicated DB trust context."""

    @staticmethod
    def _scope_from_session(db: AsyncSession) -> dict | None:
        scope = db.sync_session.info.get("rls_scope")
        return scope if isinstance(scope, dict) else None

    @staticmethod
    async def _set_db_scope(db: AsyncSession, scope: dict | None) -> None:
        bind = db.get_bind()
        if bind is None or bind.dialect.name != "postgresql":
            return
        effective = scope or {}
        await db.execute(
            text(
                """
                SELECT
                    set_config('app.current_user_id', :user_id, true),
                    set_config('app.current_tenant_id', :tenant_id, true),
                    set_config('app.current_institution_id', :institution_id, true),
                    set_config('app.current_role', :role, true)
                """
            ),
            {
                "user_id": str(effective.get("user_id") or ""),
                "tenant_id": str(effective.get("tenant_id") or ""),
                "institution_id": str(effective.get("institution_id") or ""),
                "role": str(effective.get("role") or ""),
            },
        )

    @asynccontextmanager
    async def _sso_service_scope(self, db: AsyncSession):
        original_scope = self._scope_from_session(db)
        await self._set_db_scope(
            db,
            {
                "user_id": "",
                "tenant_id": "",
                "institution_id": "",
                "role": "SSO_SERVICE",
            },
        )
        try:
            yield
        finally:
            await self._set_db_scope(db, original_scope)

    async def link_identity(
        self,
        *,
        db: AsyncSession,
        user_id: uuid.UUID,
        subject: str,
        linked_by: uuid.UUID,
        email_snapshot: str | None = None,
        issuer: str | None = None,
    ) -> FederatedIdentity:
        normalized_subject = subject.strip()
        normalized_issuer = (issuer or settings.OIDC_ISSUER).strip()
        if not normalized_subject or not normalized_issuer:
            raise FederatedIdentityError("invalid_binding", "Issuer et subject sont obligatoires.")
        if settings.OIDC_ISSUER and normalized_issuer != settings.OIDC_ISSUER:
            raise FederatedIdentityError(
                "issuer_not_allowed",
                "L'issuer demandé ne correspond pas au fournisseur OIDC configuré.",
            )

        async with self._sso_service_scope(db):
            existing_subject = await db.scalar(
                select(FederatedIdentity).where(
                    FederatedIdentity.issuer == normalized_issuer,
                    FederatedIdentity.subject == normalized_subject,
                )
            )
            if existing_subject is not None:
                raise FederatedIdentityError(
                    "identity_already_linked",
                    "Cette identité externe est déjà liée à un compte.",
                )
            existing_user = await db.scalar(
                select(FederatedIdentity).where(
                    FederatedIdentity.user_id == user_id,
                    FederatedIdentity.issuer == normalized_issuer,
                )
            )
            if existing_user is not None:
                raise FederatedIdentityError(
                    "user_already_linked",
                    "Ce compte possède déjà une identité pour cet issuer.",
                )

            identity = FederatedIdentity(
                user_id=user_id,
                issuer=normalized_issuer,
                subject=normalized_subject,
                provider=settings.OIDC_PROVIDER,
                email_snapshot=(email_snapshot or "").strip().lower() or None,
                status="active",
                linked_by=linked_by,
            )
            try:
                async with db.begin_nested():
                    db.add(identity)
                    await db.flush()
            except IntegrityError as exc:
                raise FederatedIdentityError(
                    "identity_conflict",
                    "La liaison d'identité existe déjà.",
                ) from exc
            return identity

    async def get_identity(
        self,
        *,
        db: AsyncSession,
        identity_id: uuid.UUID,
    ) -> FederatedIdentity:
        async with self._sso_service_scope(db):
            identity = await db.scalar(
                select(FederatedIdentity).where(FederatedIdentity.id == identity_id)
            )
            if identity is None:
                raise FederatedIdentityError("identity_not_found", "Liaison d'identité introuvable.")
            return identity

    async def list_for_user(
        self,
        *,
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> list[FederatedIdentity]:
        async with self._sso_service_scope(db):
            result = await db.execute(
                select(FederatedIdentity)
                .where(FederatedIdentity.user_id == user_id)
                .order_by(FederatedIdentity.created_at.desc())
            )
            return list(result.scalars().all())

    async def set_status(
        self,
        *,
        db: AsyncSession,
        identity_id: uuid.UUID,
        status: str,
        actor_id: uuid.UUID,
    ) -> FederatedIdentity:
        if status not in {"active", "disabled"}:
            raise FederatedIdentityError("invalid_status", "Statut de liaison invalide.")
        async with self._sso_service_scope(db):
            identity = await db.scalar(
                select(FederatedIdentity)
                .where(FederatedIdentity.id == identity_id)
                .with_for_update()
            )
            if identity is None:
                raise FederatedIdentityError("identity_not_found", "Liaison d'identité introuvable.")
            identity.status = status
            if status == "disabled":
                identity.disabled_by = actor_id
                identity.disabled_at = datetime.now(timezone.utc)
            else:
                identity.disabled_by = None
                identity.disabled_at = None
            await db.flush()
            return identity

    async def resolve_verified_identity(
        self,
        *,
        db: AsyncSession,
        claims: OIDCClaims,
    ) -> tuple[FederatedIdentity, User]:
        """Resolve only by issuer+subject; never fall back to email or IdP role claims."""
        async with self._sso_service_scope(db):
            identity = await db.scalar(
                select(FederatedIdentity).where(
                    FederatedIdentity.issuer == claims.issuer,
                    FederatedIdentity.subject == claims.subject,
                )
            )
            if identity is None:
                raise FederatedIdentityError(
                    "identity_not_linked",
                    "Identité externe vérifiée mais non liée à un compte eAdmin.",
                )
            if identity.status != "active":
                raise FederatedIdentityError(
                    "identity_disabled",
                    "Cette liaison d'identité externe est désactivée.",
                )

            user = await db.scalar(select(User).where(User.id == identity.user_id))
            if user is None or not user.is_active:
                raise FederatedIdentityError(
                    "local_account_inactive",
                    "Le compte eAdmin lié est absent ou désactivé.",
                )

            identity.last_authenticated_at = datetime.now(timezone.utc)
            identity.claims_fingerprint = claims.fingerprint
            if claims.email:
                identity.email_snapshot = claims.email
            await db.flush()
            return identity, user

    async def validate_exchange_binding(
        self,
        *,
        db: AsyncSession,
        identity_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> User:
        """Recheck lifecycle state immediately before issuing local eAdmin tokens."""
        async with self._sso_service_scope(db):
            identity = await db.scalar(
                select(FederatedIdentity).where(
                    FederatedIdentity.id == identity_id,
                    FederatedIdentity.user_id == user_id,
                )
            )
            if identity is None or identity.status != "active":
                raise FederatedIdentityError(
                    "identity_disabled",
                    "La liaison SSO a été supprimée ou désactivée avant l'échange.",
                )
            user = await db.scalar(select(User).where(User.id == user_id))
            if user is None or not user.is_active:
                raise FederatedIdentityError(
                    "local_account_inactive",
                    "Le compte eAdmin lié est absent ou désactivé.",
                )
            return user


federated_identity_service = FederatedIdentityService()
