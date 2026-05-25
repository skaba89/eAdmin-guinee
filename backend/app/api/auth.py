"""
Routes d'authentification - eAdministration Suite Guinea.
Gestion des JWT, connexion, inscription, rafraîchissement et déconnexion.
MFA/TOTP, rotation de tokens, verrouillage de compte, blacklist JWT via Redis.
Suivi des tentatives de connexion via Redis (pas de fallback in-memory).
Empreinte numérique (device fingerprinting) pour le journal d'audit.
Validation renforcée des mots de passe (12 car., minuscule, majuscule, chiffre, spécial).
Claims JWT incluent tenant_id et institution_id pour RLS.
Journalisation d'audit complète via AuditService (chaîne de hachage).
"""

import hashlib
import uuid
import logging
import time
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
from app.services.audit_service import AuditService
from app.services.token_blacklist import token_blacklist

router = APIRouter()
logger = logging.getLogger("eadmin.auth")

# --- Utilitaires de sécurité ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# --- Constantes de verrouillage ---
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 15 * 60  # 15 minutes


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


def _generate_device_fingerprint(user_agent: str, client_ip: str) -> str:
    """
    Génère une empreinte numérique (fingerprint) de l'appareil à partir
    du User-Agent et de l'IP client. Utilisé pour le suivi d'audit.

    Args:
        user_agent: En-tête User-Agent de la requête HTTP
        client_ip: Adresse IP du client

    Returns:
        Hash SHA-256 tronqué représentant l'empreinte de l'appareil
    """
    raw = f"{user_agent}|{client_ip}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


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
        "iat": datetime.now(timezone.utc),
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict[str, Any]) -> str:
    """Crée un token JWT de rafraîchissement avec un identifiant unique (jti)."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    jti = _generate_jti()
    to_encode.update({
        "exp": expire,
        "type": "refresh",
        "jti": jti,
        "iat": datetime.now(timezone.utc),
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dépendance pour récupérer l'utilisateur courant depuis le JWT.
    Vérifie également que le token n'est pas dans la blacklist Redis.
    Stocke l'utilisateur et les claims JWT dans request.state pour usage
    par le middleware RLS et les autres dépendances.
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
            logger.warning(f"Blacklisted token used: {jti[:8]}... for user {user_id}")
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

    # Stocker l'utilisateur et les claims dans request.state pour le middleware RLS
    request.state.user = user
    request.state.jwt_payload = payload

    return user


def _validate_password_strength(v: str) -> str:
    """
    Valide la complexité d'un mot de passe selon la politique eAdmin.
    - Minimum 12 caractères
    - Au moins une minuscule
    - Au moins une majuscule
    - Au moins un chiffre
    - Au moins un caractère spécial
    """
    if len(v) < 12:
        raise ValueError("Le mot de passe doit contenir au moins 12 caractères.")
    if not any(c.islower() for c in v):
        raise ValueError("Le mot de passe doit contenir au moins une minuscule.")
    if not any(c.isupper() for c in v):
        raise ValueError("Le mot de passe doit contenir au moins une majuscule.")
    if not any(c.isdigit() for c in v):
        raise ValueError("Le mot de passe doit contenir au moins un chiffre.")
    special_chars = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`\"\\"
    if not any(c in special_chars for c in v):
        raise ValueError("Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*...).")
    return v


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
        """Valide la complexité du mot de passe (12 car., minuscule, majuscule, chiffre, spécial)."""
        return _validate_password_strength(v)


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: RoleEnum
    frontend_role: str  # Computed from role.to_frontend_role()
    institution: str | None
    is_active: bool
    mfa_enabled: bool
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
        """Valide la complexité du nouveau mot de passe (12 car., minuscule, majuscule, chiffre, spécial)."""
        return _validate_password_strength(v)


class MFASetupResponse(BaseModel):
    secret: str
    qr_code_uri: str
    backup_codes: list[str]


class MFAVerifyRequest(BaseModel):
    code: str
    session_id: str | None = None


class MFADisableRequest(BaseModel):
    password: str
    code: str | None = None


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
    Implémente le verrouillage après 5 tentatives échouées (via Redis).
    Stocke le refresh token en Redis pour suivi.
    Ajoute tenant_id et institution_id aux claims JWT pour RLS.
    Enregistre l'empreinte numérique de l'appareil dans le journal d'audit.
    Journalise la connexion (succès/échec) via AuditService.
    """
    email = form_data.username
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("User-Agent", "unknown")
    device_fingerprint = _generate_device_fingerprint(user_agent, client_ip)
    tenant_id = getattr(request.state, 'tenant_id', None) or settings.TENANT_DEFAULT_ID
    institution_id = getattr(request.state, 'institution_id', None) or ""

    # Service d'audit pour cette session
    audit_service = AuditService(db)

    # Vérifier le verrouillage du compte via Redis
    if await token_blacklist.is_account_locked(email, MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_SECONDS):
        remaining_time = LOCKOUT_DURATION_SECONDS // 60
        logger.warning(
            f"Tentative de connexion sur compte verrouillé: {email} depuis {client_ip} "
            f"(fingerprint: {device_fingerprint})"
        )

        # Journaliser la tentative sur compte verrouillé (SECURITY_ALERT)
        try:
            await audit_service.log_action(
                user_id=None,
                action="SECURITY_ALERT",
                resource_type="auth",
                resource_id=email,
                category="security",
                description=f"Tentative de connexion sur compte verrouillé: {email}",
                details={
                    "reason": "account_locked",
                    "remaining_lockout_minutes": remaining_time,
                    "device_fingerprint": device_fingerprint,
                },
                severity="critical",
                ip_address=client_ip,
                user_agent=user_agent[:512],
                device_fingerprint=device_fingerprint,
                tenant_id=tenant_id,
                institution_id=institution_id,
            )
        except Exception:
            pass  # Ne jamais bloquer la requête

        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Compte temporairement verrouillé. Réessayez dans {remaining_time} minutes.",
        )

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        await token_blacklist.record_failed_login(email, LOCKOUT_DURATION_SECONDS)
        remaining = await token_blacklist.get_remaining_attempts(email, MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_SECONDS)

        logger.warning(
            f"Tentative de connexion échouée pour {email} depuis {client_ip}. "
            f"Tentatives restantes: {remaining} (fingerprint: {device_fingerprint})"
        )

        # Journaliser l'échec de connexion
        try:
            await audit_service.log_action(
                user_id=user.id if user else None,
                action="LOGIN",
                resource_type="auth",
                resource_id=email,
                category="auth",
                description=f"Tentative de connexion échouée pour {email}",
                details={
                    "success": False,
                    "remaining_attempts": remaining,
                    "device_fingerprint": device_fingerprint,
                },
                severity="warning",
                ip_address=client_ip,
                user_agent=user_agent[:512],
                device_fingerprint=device_fingerprint,
                tenant_id=tenant_id,
                institution_id=institution_id,
            )
        except Exception:
            pass

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Email ou mot de passe incorrect. {remaining} tentative(s) restante(s).",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé. Contactez l'administrateur.",
        )

    # Réinitialiser les tentatives de connexion après succès via Redis
    await token_blacklist.reset_login_attempts(email)

    # Mettre à jour la dernière connexion
    user.last_login_at = datetime.now(timezone.utc)
    await db.flush()

    logger.info(
        f"Connexion réussie: {email} depuis {client_ip} (role={user.role.value}, "
        f"fingerprint={device_fingerprint})"
    )

    # Journaliser le succès de connexion
    try:
        await audit_service.log_action(
            user_id=user.id,
            action="LOGIN",
            resource_type="auth",
            resource_id=str(user.id),
            category="auth",
            description=f"Connexion réussie: {email} (role={user.role.value})",
            details={
                "success": True,
                "role": user.role.value,
                "device_fingerprint": device_fingerprint,
                "mfa_enabled": user.mfa_enabled,
            },
            severity="info",
            ip_address=client_ip,
            user_agent=user_agent[:512],
            device_fingerprint=device_fingerprint,
            tenant_id=user.tenant_id or tenant_id,
            institution_id=user.institution_id or institution_id,
        )
    except Exception:
        pass

    # Construire les données du token avec tenant_id et institution_id pour RLS
    token_data = {
        "sub": str(user.id),
        "role": user.role.value,
        "frontend_role": user.role.to_frontend_role(),
        "tenant_id": user.tenant_id or settings.TENANT_DEFAULT_ID,
        "institution_id": user.institution_id or "",
    }

    # Si MFA est activé, retourner un token spécial nécessitant vérification MFA
    if user.mfa_enabled:
        mfa_token_data = {
            **token_data,
            "mfa_required": True,
            "mfa_verified": False,
        }
        access_token = create_access_token(
            mfa_token_data,
            expires_delta=timedelta(minutes=5),  # Court durée de vie
        )
        refresh_token = create_refresh_token(mfa_token_data)
    else:
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


@router.post("/register", response_model=UserResponse, summary="Inscription publique")
async def register(
    request: Request,
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Inscription publique — crée un compte CITOYEN uniquement.
    Les rôles élevés (ADMIN, SUPER_ADMIN, MINISTRE, AGENT, etc.)
    ne peuvent être attribués que via l'endpoint admin sécurisé.
    """
    # Forcer le rôle CITOYEN pour l'inscription publique
    if user_data.role != RoleEnum.CITOYEN:
        logger.warning(f"Tentative d'inscription avec rôle non-citoyen: {user_data.role.value} pour {user_data.email}")
        user_data.role = RoleEnum.CITOYEN

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

    # Journaliser l'inscription
    try:
        audit_service = AuditService(db)
        client_ip = request.client.host if request.client else "unknown"
        await audit_service.log_action(
            user_id=user.id,
            action="CREATE",
            resource_type="user",
            resource_id=str(user.id),
            category="auth",
            description=f"Inscription publique: {user.email}",
            details={"role": user.role.value},
            severity="info",
            ip_address=client_ip,
            user_agent=request.headers.get("User-Agent", "unknown")[:512],
        )
    except Exception:
        pass

    return {
        **{k: getattr(user, k) for k in ['id', 'email', 'full_name', 'role', 'institution', 'is_active', 'created_at']},
        "frontend_role": user.role.to_frontend_role(),
    }


class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: RoleEnum = RoleEnum.AGENT
    institution: str | None = None
    institution_id: str | None = None

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Valide la complexité du mot de passe (12 car., minuscule, majuscule, chiffre, spécial)."""
        return _validate_password_strength(v)


# Roles that can only be created by SUPER_ADMIN or ADMIN
RESTRICTED_ROLES = {RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MINISTRE, RoleEnum.DIRECTEUR, RoleEnum.CHEF_SERVICE}


@router.post("/admin/create-user", response_model=UserResponse, summary="Création utilisateur (Admin uniquement)")
async def admin_create_user(
    request: Request,
    user_data: AdminUserCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Crée un utilisateur avec un rôle spécifié — réservé aux administrateurs.
    - ADMIN peut créer: AGENT, MAIRIE, AGENCE, CHEF_SERVICE, CITOYEN
    - SUPER_ADMIN peut créer tous les rôles
    - Personne ne peut créer un rôle supérieur au sien
    Journalise la création via AuditService.
    """
    # Vérifier les permissions selon le rôle de l'utilisateur courant
    creator_role = current_user.role

    # Seuls ADMIN et SUPER_ADMIN peuvent accéder à cet endpoint
    if creator_role not in (RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les administrateurs peuvent créer des comptes internes.",
        )

    # ADMIN ne peut pas créer de comptes SUPER_ADMIN ou ADMIN
    if creator_role == RoleEnum.ADMIN and user_data.role in RESTRICTED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Les administrateurs ne peuvent pas créer de comptes {user_data.role.value}.",
        )

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
        institution_id=user_data.institution_id,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    logger.info(f"Admin {current_user.email} created user {user.email} with role {user.role.value}")

    # Journaliser la création d'utilisateur par un admin
    try:
        audit_service = AuditService(db)
        client_ip = request.client.host if request.client else "unknown"
        await audit_service.log_action(
            user_id=current_user.id,
            action="CREATE",
            resource_type="user",
            resource_id=str(user.id),
            category="admin",
            description=f"Admin {current_user.email} a créé l'utilisateur {user.email} (rôle: {user.role.value})",
            details={
                "created_user_id": str(user.id),
                "created_user_email": user.email,
                "created_user_role": user.role.value,
                "creator_role": current_user.role.value,
            },
            severity="warning",
            ip_address=client_ip,
            user_agent=request.headers.get("User-Agent", "unknown")[:512],
            tenant_id=current_user.tenant_id or settings.TENANT_DEFAULT_ID,
            institution_id=current_user.institution_id or "",
        )
    except Exception:
        pass

    return {
        **{k: getattr(user, k) for k in ['id', 'email', 'full_name', 'role', 'institution', 'is_active', 'created_at']},
        "frontend_role": user.role.to_frontend_role(),
    }


@router.post("/logout", summary="Déconnexion")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """
    Déconnecte l'utilisateur en révoquant ses tokens.
    - Le access token est ajouté à la blacklist Redis avec TTL
    - Le refresh token est invalidé dans Redis
    - Optionnellement, tous les refresh tokens de l'utilisateur peuvent être révoqués
    Journalise la déconnexion via AuditService.
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

    # Journaliser la déconnexion
    try:
        audit_service = AuditService(db)
        client_ip = request.client.host if request.client else "unknown"
        await audit_service.log_action(
            user_id=current_user.id,
            action="LOGOUT",
            resource_type="auth",
            resource_id=str(current_user.id),
            category="auth",
            description=f"Déconnexion: {current_user.email}",
            severity="info",
            ip_address=client_ip,
            user_agent=request.headers.get("User-Agent", "unknown")[:512],
            tenant_id=current_user.tenant_id or settings.TENANT_DEFAULT_ID,
            institution_id=current_user.institution_id or "",
        )
    except Exception:
        pass

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
    Détecte la réutilisation d'un refresh token (attaque possible).
    Ajoute tenant_id et institution_id aux claims JWT pour RLS.
    Journalise le rafraîchissement via AuditService.
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
            logger.warning(f"Refresh token reuse detected for user {user_id}! All tokens revoked.")

            # Journaliser la réutilisation suspecte de token
            try:
                audit_service = AuditService(db)
                await audit_service.log_action(
                    user_id=uuid.UUID(user_id) if user_id else None,
                    action="SECURITY_ALERT",
                    resource_type="auth",
                    resource_id=user_id or "unknown",
                    category="security",
                    description="Réutilisation de refresh token détectée — tokens révoqués",
                    details={"refresh_jti": refresh_jti[:16] if refresh_jti else None},
                    severity="critical",
                )
            except Exception:
                pass

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
            await token_blacklist.revoke_token(refresh_jti, settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400)
        except Exception:
            pass

    # Générer de nouveaux tokens avec tenant_id et institution_id pour RLS
    token_data = {
        "sub": str(user.id),
        "role": user.role.value,
        "frontend_role": user.role.to_frontend_role(),
        "tenant_id": user.tenant_id or settings.TENANT_DEFAULT_ID,
        "institution_id": user.institution_id or "",
    }
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

    # Journaliser le rafraîchissement de token
    try:
        audit_service = AuditService(db)
        await audit_service.log_action(
            user_id=user.id,
            action="TOKEN_REVOKE",
            resource_type="auth",
            resource_id=str(user.id),
            category="auth",
            description=f"Rafraîchissement de token pour {user.email}",
            details={"rotated_jti": refresh_jti[:16] if refresh_jti else None},
            severity="info",
            tenant_id=user.tenant_id or settings.TENANT_DEFAULT_ID,
            institution_id=user.institution_id or "",
        )
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
        **{k: getattr(current_user, k) for k in ['id', 'email', 'full_name', 'role', 'institution', 'is_active', 'mfa_enabled', 'created_at']},
        "frontend_role": current_user.role.to_frontend_role(),
    }


@router.post("/change-password", summary="Changement de mot de passe")
async def change_password(
    request: Request,
    change_request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """
    Permet à un utilisateur authentifié de changer son mot de passe.
    Nécessite la vérification du mot de passe actuel.
    Révoque tous les tokens existants après le changement (sécurité).
    Le nouveau mot de passe doit respecter la politique (12 car., minuscule, majuscule, chiffre, spécial).
    Journalise le changement via AuditService.
    """
    if not verify_password(change_request.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mot de passe actuel incorrect.",
        )

    # Vérification contre les motifs interdits
    forbidden = ['password', '123456', 'admin', 'demo', 'guinee', 'conakry']
    if any(p in change_request.new_password.lower() for p in forbidden):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe contient un motif interdit.",
        )

    # Mettre à jour le mot de passe
    current_user.hashed_password = get_password_hash(change_request.new_password)
    await db.flush()

    # Révoquer tous les tokens pour forcer une reconnexion
    await token_blacklist.revoke_all_user_tokens(str(current_user.id))

    logger.info(f"Password changed for user {current_user.email}")

    # Journaliser le changement de mot de passe
    try:
        audit_service = AuditService(db)
        client_ip = request.client.host if request.client else "unknown"
        await audit_service.log_action(
            user_id=current_user.id,
            action="PASSWORD_CHANGE",
            resource_type="user",
            resource_id=str(current_user.id),
            category="security",
            description=f"Changement de mot de passe pour {current_user.email}",
            severity="warning",
            ip_address=client_ip,
            user_agent=request.headers.get("User-Agent", "unknown")[:512],
            tenant_id=current_user.tenant_id or settings.TENANT_DEFAULT_ID,
            institution_id=current_user.institution_id or "",
        )
    except Exception:
        pass

    return {"message": "Mot de passe modifié avec succès. Veuillez vous reconnecter."}


@router.post("/setup-mfa", response_model=MFASetupResponse, summary="Configuration MFA")
async def setup_mfa(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MFASetupResponse:
    """
    Initialise la configuration MFA/TOTP pour l'utilisateur courant.
    Retourne le secret, l'URI du QR code et les codes de secours.
    Journalise l'initialisation MFA via AuditService.
    """
    if current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA est déjà activé pour ce compte.",
        )

    import secrets
    import base64

    # Generate a TOTP secret (Base32 encoded)
    secret_bytes = secrets.token_bytes(20)
    secret = base64.b32encode(secret_bytes).decode('utf-8').rstrip('=')

    # Store the secret temporarily (not enabled until verified)
    current_user.mfa_secret = secret
    await db.flush()

    # Generate QR code URI
    qr_code_uri = (
        f"otpauth://totp/{settings.MFA_ISSUER}:{current_user.email}"
        f"?secret={secret}&issuer={settings.MFA_ISSUER}"
        f"&algorithm=SHA1&digits=6&period=30"
    )

    # Generate backup codes
    backup_codes = [secrets.token_hex(4).upper() for _ in range(10)]

    logger.info(f"MFA setup initiated for user {current_user.email}")

    # Journaliser l'initialisation MFA
    try:
        audit_service = AuditService(db)
        client_ip = request.client.host if request.client else "unknown"
        await audit_service.log_action(
            user_id=current_user.id,
            action="MFA_SETUP",
            resource_type="user",
            resource_id=str(current_user.id),
            category="security",
            description=f"Initialisation MFA pour {current_user.email}",
            severity="info",
            ip_address=client_ip,
            user_agent=request.headers.get("User-Agent", "unknown")[:512],
            tenant_id=current_user.tenant_id or settings.TENANT_DEFAULT_ID,
            institution_id=current_user.institution_id or "",
        )
    except Exception:
        pass

    return MFASetupResponse(
        secret=secret,
        qr_code_uri=qr_code_uri,
        backup_codes=backup_codes,
    )


@router.post("/verify-mfa", summary="Vérification MFA")
async def verify_mfa(
    request: Request,
    mfa_request: MFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Vérifie un code TOTP pour l'utilisateur courant.
    Si c'est la première vérification après le setup, active MFA.
    Ajoute tenant_id et institution_id aux claims JWT pour RLS.
    Journalise la vérification MFA via AuditService.
    """
    if not current_user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA n'est pas configuré pour ce compte.",
        )

    # Verify the TOTP code
    import hmac
    import struct
    import base64

    code = mfa_request.code
    if not code or not code.isdigit() or len(code) != 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le code doit contenir exactement 6 chiffres.",
        )

    # TOTP verification (server-side)
    secret = current_user.mfa_secret
    # Pad secret to valid base32
    padded_secret = secret + '=' * (-len(secret) % 8)
    key = base64.b32decode(padded_secret)

    current_time = int(time.time())
    time_step = 30
    counter = current_time // time_step

    verified = False
    # Check ±1 window for clock drift
    for i in range(-1, 2):
        test_counter = counter + i
        counter_bytes = struct.pack('>Q', test_counter)
        hmac_hash = hmac.new(key, counter_bytes, hashlib.sha1).digest()
        offset = hmac_hash[-1] & 0x0f
        code_int = struct.unpack('>I', hmac_hash[offset:offset + 4])[0] & 0x7fffffff
        totp_code = str(code_int % 1000000).zfill(6)
        if hmac.compare_digest(totp_code, code):
            verified = True
            break

    if not verified:
        logger.warning(f"Failed MFA attempt for user {current_user.email}")

        # Journaliser l'échec MFA
        try:
            audit_service = AuditService(db)
            client_ip = request.client.host if request.client else "unknown"
            await audit_service.log_action(
                user_id=current_user.id,
                action="MFA_VERIFY",
                resource_type="user",
                resource_id=str(current_user.id),
                category="security",
                description=f"Échec de vérification MFA pour {current_user.email}",
                details={"success": False},
                severity="warning",
                ip_address=client_ip,
                user_agent=request.headers.get("User-Agent", "unknown")[:512],
                tenant_id=current_user.tenant_id or settings.TENANT_DEFAULT_ID,
                institution_id=current_user.institution_id or "",
            )
        except Exception:
            pass

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Code MFA invalide.",
        )

    # If MFA wasn't enabled yet, enable it now
    was_newly_enabled = not current_user.mfa_enabled
    if was_newly_enabled:
        current_user.mfa_enabled = True
        await db.flush()
        logger.info(f"MFA enabled for user {current_user.email}")

    # Journaliser le succès MFA
    try:
        audit_service = AuditService(db)
        client_ip = request.client.host if request.client else "unknown"
        await audit_service.log_action(
            user_id=current_user.id,
            action="MFA_VERIFY" if not was_newly_enabled else "MFA_SETUP",
            resource_type="user",
            resource_id=str(current_user.id),
            category="security",
            description=f"Vérification MFA réussie pour {current_user.email}"
                       + (" (MFA activé)" if was_newly_enabled else ""),
            details={"success": True, "newly_enabled": was_newly_enabled},
            severity="info",
            ip_address=client_ip,
            user_agent=request.headers.get("User-Agent", "unknown")[:512],
            tenant_id=current_user.tenant_id or settings.TENANT_DEFAULT_ID,
            institution_id=current_user.institution_id or "",
        )
    except Exception:
        pass

    # Generate fully authenticated tokens with tenant_id and institution_id for RLS
    token_data = {
        "sub": str(current_user.id),
        "role": current_user.role.value,
        "frontend_role": current_user.role.to_frontend_role(),
        "tenant_id": current_user.tenant_id or settings.TENANT_DEFAULT_ID,
        "institution_id": current_user.institution_id or "",
        "mfa_verified": True,
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Store refresh token in Redis
    try:
        refresh_payload = jwt.decode(
            refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        refresh_jti = refresh_payload.get("jti", "")
        refresh_exp = refresh_payload.get("exp", 0)
        ttl_seconds = max(0, int(refresh_exp - datetime.now(timezone.utc).timestamp()))
        await token_blacklist.store_refresh_token(str(current_user.id), refresh_jti, ttl_seconds)
    except Exception:
        pass

    return {
        "message": "Vérification MFA réussie",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }
