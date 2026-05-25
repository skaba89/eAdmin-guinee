"""
Routes d'authentification - eAdministration Suite Guinea.
Gestion des JWT, connexion, inscription, rafraîchissement et déconnexion.
Blacklist JWT via Redis pour révocation fiable multi-instance.
"""

import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import RoleEnum, User
from app.services.token_blacklist import token_blacklist

router = APIRouter()

# --- Utilitaires de sécurité ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie un mot de passe contre son hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Génère le hash d'un mot de passe."""
    return pwd_context.hash(password)


def _generate_jti() -> str:
    """Génère un identifiant unique pour un token JWT (claim 'jti')."""
    return str(uuid.uuid4())


def _token_fingerprint(token: str) -> str:
    """
    Génère un fingerprint SHA-256 d'un token pour le stockage en blacklist.
    On ne stocke jamais le token brut, seulement son hash.
    """
    return hashlib.sha256(token.encode()).hexdigest()


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Crée un token JWT d'accès avec un identifiant unique (jti)."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    jti = _generate_jti()
    to_encode.update({
        "exp": expire,
        "type": "access",
        "jti": jti,
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict[str, Any]) -> str:
    """Crée un token JWT de rafraîchissement avec un identifiant unique (jti)."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    jti = _generate_jti()
    to_encode.update({
        "exp": expire,
        "type": "refresh",
        "jti": jti,
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dépendance pour récupérer l'utilisateur courant depuis le JWT.
    Vérifie également que le token n'est pas dans la blacklist Redis.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Identifiants invalides",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")
        jti: str | None = payload.get("jti")

        if user_id is None or token_type != "access":
            raise credentials_exception

        # Vérifier si le token est dans la blacklist Redis
        if jti and await token_blacklist.is_token_revoked(jti):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token révoqué. Veuillez vous reconnecter.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise credentials_exception
    return user


# --- Schémas Pydantic ---
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: RoleEnum = RoleEnum.AGENT
    institution: str | None = None

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Valide la complexité du mot de passe."""
        if len(v) < 8:
            raise ValueError("Le mot de passe doit contenir au moins 8 caractères.")
        if not any(c.isupper() for c in v):
            raise ValueError("Le mot de passe doit contenir au moins une majuscule.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Le mot de passe doit contenir au moins un chiffre.")
        return v


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: RoleEnum
    frontend_role: str  # Computed from role.to_frontend_role()
    institution: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    """Schéma pour la déconnexion — optionnel, le token peut aussi venir du header."""
    refresh_token: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Valide la complexité du nouveau mot de passe."""
        if len(v) < 8:
            raise ValueError("Le mot de passe doit contenir au moins 8 caractères.")
        if not any(c.isupper() for c in v):
            raise ValueError("Le mot de passe doit contenir au moins une majuscule.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Le mot de passe doit contenir au moins un chiffre.")
        return v


# --- Endpoints ---

@router.post("/login", response_model=TokenResponse, summary="Connexion")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Authentifie un utilisateur et retourne un JWT.
    Utilise le format OAuth2 Password Flow.
    Stocke le refresh token en Redis pour suivi.
    """
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé. Contactez l'administrateur.",
        )

    token_data = {"sub": str(user.id), "role": user.role.value, "frontend_role": user.role.to_frontend_role()}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Stocker le refresh token en Redis
    try:
        refresh_payload = jwt.decode(
            refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        refresh_jti = refresh_payload.get("jti", "")
        refresh_exp = refresh_payload.get("exp", 0)
        ttl_seconds = max(0, int(refresh_exp - datetime.now(timezone.utc).timestamp()))
        await token_blacklist.store_refresh_token(str(user.id), refresh_jti, ttl_seconds)
    except Exception:
        # Ne pas bloquer le login si Redis est indisponible
        pass

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/register", response_model=UserResponse, summary="Inscription")
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Crée un nouveau compte utilisateur.
    La validation du mot de passe est assurée par le schéma Pydantic.
    Seul un administrateur peut attribuer des rôles élevés.
    """
    # Vérifier l'unicité de l'email
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un compte avec cet email existe déjà.",
        )

    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
        institution=user_data.institution,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return {
        **{k: getattr(user, k) for k in ['id', 'email', 'full_name', 'role', 'institution', 'is_active', 'created_at']},
        "frontend_role": user.role.to_frontend_role(),
    }


@router.post("/logout", summary="Déconnexion")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    """
    Déconnecte l'utilisateur en révoquant ses tokens.
    - Le access token est ajouté à la blacklist Redis avec TTL
    - Le refresh token est invalidé dans Redis
    - Optionnellement, tous les refresh tokens de l'utilisateur peuvent être révoqués
    """
    # Récupérer le access token du header Authorization
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        access_token = auth_header[7:]
        try:
            payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            jti = payload.get("jti", "")
            exp = payload.get("exp", 0)
            ttl_seconds = max(0, int(exp - datetime.now(timezone.utc).timestamp()))

            if jti and ttl_seconds > 0:
                await token_blacklist.revoke_token(jti, ttl_seconds)
        except JWTError:
            pass

    # Révoquer tous les refresh tokens de l'utilisateur
    await token_blacklist.revoke_all_user_tokens(str(current_user.id))

    return {"message": "Déconnexion réussie. Tous vos tokens ont été révoqués."}


@router.post("/refresh", response_model=TokenResponse, summary="Rafraîchir le token")
async def refresh_token(
    request: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Rafraîchit le token d'accès à partir d'un refresh token valide.
    Le refresh token doit être actif dans Redis.
    L'ancien refresh token est révoqué après usage (rotation).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token de rafraîchissement invalide",
    )
    try:
        payload = jwt.decode(
            request.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")
        refresh_jti: str | None = payload.get("jti")

        if user_id is None or token_type != "refresh":
            raise credentials_exception

        # Vérifier si le refresh token est toujours actif dans Redis
        if refresh_jti and not await token_blacklist.is_refresh_token_valid(user_id, refresh_jti):
            # Le refresh token a déjà été utilisé ou révoqué — possible attaque
            # Révoquer tous les tokens de cet utilisateur par sécurité
            await token_blacklist.revoke_all_user_tokens(user_id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token déjà utilisé ou révoqué. Par sécurité, tous vos tokens ont été invalidés. Veuillez vous reconnecter.",
            )

    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise credentials_exception

    # Révoquer l'ancien refresh token (rotation)
    if refresh_jti:
        try:
            redis_key = f"eadmin:refresh_tokens:{user_id}"
            import redis.asyncio as aioredis
            r = await token_blacklist._get_redis()
            await r.srem(redis_key, refresh_jti)
        except Exception:
            pass

    # Générer de nouveaux tokens
    token_data = {"sub": str(user.id), "role": user.role.value, "frontend_role": user.role.to_frontend_role()}
    new_access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data)

    # Stocker le nouveau refresh token en Redis
    try:
        new_refresh_payload = jwt.decode(
            new_refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        new_refresh_jti = new_refresh_payload.get("jti", "")
        new_refresh_exp = new_refresh_payload.get("exp", 0)
        ttl_seconds = max(0, int(new_refresh_exp - datetime.now(timezone.utc).timestamp()))
        await token_blacklist.store_refresh_token(str(user.id), new_refresh_jti, ttl_seconds)
    except Exception:
        pass

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
    )


@router.get("/me", response_model=UserResponse, summary="Utilisateur courant")
async def get_me(current_user: User = Depends(get_current_user)) -> dict:
    """
    Retourne les informations de l'utilisateur authentifié.
    """
    return {
        **{k: getattr(current_user, k) for k in ['id', 'email', 'full_name', 'role', 'institution', 'is_active', 'created_at']},
        "frontend_role": current_user.role.to_frontend_role(),
    }


@router.post("/change-password", summary="Changement de mot de passe")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """
    Permet à un utilisateur authentifié de changer son mot de passe.
    Révoque tous les tokens existants après le changement (sécurité).
    """
    if not verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mot de passe actuel incorrect.",
        )

    current_user.hashed_password = get_password_hash(request.new_password)
    await db.flush()

    # Révoquer tous les tokens pour forcer une reconnexion
    await token_blacklist.revoke_all_user_tokens(str(current_user.id))

    return {"message": "Mot de passe modifié avec succès. Veuillez vous reconnecter."}
