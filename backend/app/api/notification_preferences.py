"""Self-service notification preferences and verified mobile contact."""

import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.database import get_db
from app.models.user import User
from app.services.audit_service import AuditService
from app.services.mobile_verification import (
    MOBILE_CONSENT_VERSION,
    MobileProviderUnavailableError,
    MobileVerificationError,
    MobileVerificationRateLimitError,
    mask_phone,
    mobile_verification_service,
)
from app.services.notification_outbox import ProviderRegistry

router = APIRouter()


class StartMobileVerification(BaseModel):
    phone: str = Field(min_length=8, max_length=40)
    channel: Literal["sms", "whatsapp"] = "sms"


class ConfirmMobileVerification(BaseModel):
    challenge_id: uuid.UUID
    code: str = Field(pattern=r"^\d{6}$")


class NotificationPreferencesUpdate(BaseModel):
    email_enabled: bool | None = None
    sms_enabled: bool | None = None
    whatsapp_enabled: bool | None = None
    confirm_mobile_consent: bool = False


def _provider_status() -> dict[str, bool]:
    try:
        registry = ProviderRegistry.from_environment()
    except ValueError:
        return {"sms": False, "whatsapp": False}
    return {
        "sms": registry.get("sms") is not None,
        "whatsapp": registry.get("whatsapp") is not None,
    }


def _serialize_preferences(user: User) -> dict:
    provider_status = _provider_status()
    return {
        "email": {
            "address": user.email,
            "enabled": user.notification_email_enabled,
        },
        "mobile": {
            "phoneE164": user.phone_e164,
            "phoneMasked": mask_phone(user.phone_e164) if user.phone_e164 else None,
            "verified": user.phone_verified_at is not None,
            "verifiedAt": user.phone_verified_at.isoformat() if user.phone_verified_at else None,
            "smsEnabled": user.notification_sms_enabled,
            "whatsappEnabled": user.notification_whatsapp_enabled,
            "smsProviderConfigured": provider_status["sms"],
            "whatsappProviderConfigured": provider_status["whatsapp"],
        },
        "consent": {
            "version": user.notification_consent_version,
            "currentVersion": MOBILE_CONSENT_VERSION,
            "current": user.notification_consent_version == MOBILE_CONSENT_VERSION,
            "updatedAt": (
                user.notification_consent_updated_at.isoformat()
                if user.notification_consent_updated_at
                else None
            ),
        },
    }


async def _audit_preferences(
    db: AsyncSession,
    request: Request,
    user: User,
    *,
    description: str,
    details: dict,
) -> None:
    await AuditService(db).log_action(
        user_id=user.id,
        action="UPDATE",
        resource_type="notification_preferences",
        resource_id=str(user.id),
        category="user",
        description=description,
        details=details,
        severity="info",
        ip_address=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("User-Agent", "unknown")[:512],
        tenant_id=user.tenant_id,
        institution_id=user.institution_id,
    )


@router.get("/me", summary="Mes préférences de notification")
async def get_my_notification_preferences(
    current_user: User = Depends(get_current_user),
) -> dict:
    return _serialize_preferences(current_user)


@router.post(
    "/mobile-verification/start",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Envoyer un code de vérification mobile",
)
async def start_mobile_verification(
    payload: StartMobileVerification,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    try:
        challenge = await mobile_verification_service.start_challenge(
            db,
            user=current_user,
            phone=payload.phone,
            channel=payload.channel,
        )
    except MobileProviderUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except MobileVerificationRateLimitError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except MobileVerificationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    await _audit_preferences(
        db,
        request,
        current_user,
        description="Challenge de vérification mobile demandé",
        details={
            "channel": challenge.channel,
            "phone_masked": mask_phone(challenge.phone_e164),
            "challenge_id": str(challenge.id),
        },
    )
    return {
        "challengeId": str(challenge.id),
        "channel": challenge.channel,
        "phoneMasked": mask_phone(challenge.phone_e164),
        "expiresAt": challenge.expires_at.isoformat(),
        "message": "Un code de vérification à 6 chiffres a été mis en file d'envoi.",
    }


@router.post("/mobile-verification/confirm", summary="Confirmer mon numéro mobile")
async def confirm_mobile_verification(
    payload: ConfirmMobileVerification,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = await mobile_verification_service.confirm_challenge(
            db,
            user=current_user,
            challenge_id=payload.challenge_id,
            code=payload.code,
        )
    except MobileVerificationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    challenge = result.challenge
    if not result.success:
        await _audit_preferences(
            db,
            request,
            current_user,
            description="Tentative de vérification mobile échouée",
            details={
                "channel": challenge.channel,
                "phone_masked": mask_phone(challenge.phone_e164),
                "attempt_count": challenge.attempt_count,
                "max_attempts": challenge.max_attempts,
            },
        )
        return JSONResponse(
            status_code=400,
            content={
                "detail": result.error or "Code de vérification incorrect.",
                "remainingAttempts": max(0, challenge.max_attempts - challenge.attempt_count),
            },
        )

    await _audit_preferences(
        db,
        request,
        current_user,
        description="Numéro mobile vérifié par challenge OTP",
        details={
            "channel": challenge.channel,
            "phone_masked": mask_phone(challenge.phone_e164),
            "mobile_channels_enabled": False,
        },
    )
    return _serialize_preferences(current_user)


@router.patch("/me", summary="Mettre à jour mes préférences de notification")
async def update_my_notification_preferences(
    payload: NotificationPreferencesUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    before = {
        "email": current_user.notification_email_enabled,
        "sms": current_user.notification_sms_enabled,
        "whatsapp": current_user.notification_whatsapp_enabled,
    }

    requested_sms = (
        current_user.notification_sms_enabled
        if payload.sms_enabled is None
        else payload.sms_enabled
    )
    requested_whatsapp = (
        current_user.notification_whatsapp_enabled
        if payload.whatsapp_enabled is None
        else payload.whatsapp_enabled
    )
    any_mobile_enabled = requested_sms or requested_whatsapp
    enabling_mobile = (
        (requested_sms and not current_user.notification_sms_enabled)
        or (requested_whatsapp and not current_user.notification_whatsapp_enabled)
    )
    consent_stale = (
        any_mobile_enabled
        and current_user.notification_consent_version != MOBILE_CONSENT_VERSION
    )
    requires_mobile_consent = enabling_mobile or consent_stale

    if any_mobile_enabled and (
        not current_user.phone_e164 or current_user.phone_verified_at is None
    ):
        raise HTTPException(
            status_code=409,
            detail="Vérifiez d'abord votre numéro de téléphone avant d'activer SMS ou WhatsApp.",
        )
    if requires_mobile_consent and not payload.confirm_mobile_consent:
        raise HTTPException(
            status_code=422,
            detail="Une confirmation explicite du consentement mobile courant est requise.",
        )

    if payload.email_enabled is not None:
        current_user.notification_email_enabled = payload.email_enabled
    if payload.sms_enabled is not None:
        current_user.notification_sms_enabled = payload.sms_enabled
    if payload.whatsapp_enabled is not None:
        current_user.notification_whatsapp_enabled = payload.whatsapp_enabled

    now = datetime.now(timezone.utc)
    if requires_mobile_consent:
        current_user.notification_consent_version = MOBILE_CONSENT_VERSION
        current_user.notification_consent_updated_at = now
    elif payload.sms_enabled is not None or payload.whatsapp_enabled is not None:
        current_user.notification_consent_updated_at = now

    await db.flush()
    await _audit_preferences(
        db,
        request,
        current_user,
        description="Préférences de notification mises à jour",
        details={
            "before": before,
            "after": {
                "email": current_user.notification_email_enabled,
                "sms": current_user.notification_sms_enabled,
                "whatsapp": current_user.notification_whatsapp_enabled,
            },
            "mobile_consent_version": current_user.notification_consent_version,
            "phone_masked": mask_phone(current_user.phone_e164) if current_user.phone_e164 else None,
        },
    )
    return _serialize_preferences(current_user)
