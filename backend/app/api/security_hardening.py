"""Security-critical overrides for the legacy security router."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user, verify_password
from app.api.security import _verify_totp_code
from app.database import get_db
from app.models.user import User
from app.services.token_blacklist import token_blacklist

router = APIRouter()
logger = logging.getLogger("eadmin.security_hardening")


class SecureMFADisableRequest(BaseModel):
    password: str
    code: str


@router.post("/disable-mfa", summary="Désactiver MFA")
async def secure_disable_mfa(
    request: Request,
    body: SecureMFADisableRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Disable MFA only after re-authentication with password and current TOTP."""

    if not current_user.mfa_enabled or not current_user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA n'est pas activé pour ce compte.",
        )

    if not verify_password(body.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mot de passe incorrect.",
        )

    if not body.code.isdigit() or len(body.code) != 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le code MFA doit contenir exactement 6 chiffres.",
        )

    if not _verify_totp_code(current_user.mfa_secret, body.code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Code MFA invalide.",
        )

    current_user.mfa_enabled = False
    current_user.mfa_secret = None
    await db.flush()

    # Existing sessions were authenticated under a stronger policy. Revoke them
    # so the account must sign in again under the new MFA state.
    await token_blacklist.revoke_all_user_tokens(str(current_user.id))

    logger.warning(
        "MFA disabled after password+TOTP re-authentication: user=%s ip=%s",
        current_user.id,
        request.client.host if request.client else "unknown",
    )

    return {
        "message": "MFA désactivé. Toutes les sessions ont été révoquées ; veuillez vous reconnecter."
    }
