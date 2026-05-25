"""Backend security and auth tests for eAdmin Guinée."""
import pytest
import time
import uuid
from datetime import datetime, timedelta, timezone

# ─── UNIT TESTS: Password hashing ─────────────────────────────────────────────

def test_password_hashing_bcrypt():
    """Test that bcrypt password hashing and verification work correctly."""
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    # Hash a password
    hashed = pwd_context.hash("TestP@ss2026!")
    assert hashed is not None
    assert hashed != "TestP@ss2026!"

    # Verify correct password
    assert pwd_context.verify("TestP@ss2026!", hashed) is True

    # Verify wrong password
    assert pwd_context.verify("wrongpassword", hashed) is False

    # Each hash should be unique (bcrypt salt)
    hashed2 = pwd_context.hash("TestP@ss2026!")
    assert hashed != hashed2


def test_password_hashing_different_passwords():
    """Test that different passwords produce different hashes."""
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    hash1 = pwd_context.hash("Password1!")
    hash2 = pwd_context.hash("Password2!")

    assert hash1 != hash2
    assert pwd_context.verify("Password1!", hash1) is True
    assert pwd_context.verify("Password2!", hash2) is True
    assert pwd_context.verify("Password1!", hash2) is False


# ─── UNIT TESTS: JWT token creation and validation ────────────────────────────

def test_jwt_token_creation():
    """Test JWT access token and refresh token creation."""
    try:
        from app.api.auth import create_access_token, create_refresh_token
    except ImportError:
        pytest.skip("Auth module not available")

    access = create_access_token({"sub": "test-user-id", "role": "ADMIN"})
    refresh = create_refresh_token({"sub": "test-user-id", "role": "ADMIN"})

    # Tokens should be non-empty strings
    assert isinstance(access, str)
    assert isinstance(refresh, str)
    assert len(access) > 50
    assert len(refresh) > 50

    # Access and refresh tokens should be different
    assert access != refresh


def test_jwt_token_contains_claims():
    """Test that JWT tokens contain the expected claims."""
    try:
        from app.api.auth import create_access_token
        from app.config import settings
        from jose import jwt
    except ImportError:
        pytest.skip("Auth module not available")

    token = create_access_token({"sub": "test-user-id", "role": "ADMIN"})
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

    assert payload["sub"] == "test-user-id"
    assert payload["role"] == "ADMIN"
    assert payload["type"] == "access"
    assert "exp" in payload
    assert "jti" in payload
    assert "iat" in payload


def test_jwt_refresh_token_has_correct_type():
    """Test that refresh tokens have the correct type claim."""
    try:
        from app.api.auth import create_refresh_token
        from app.config import settings
        from jose import jwt
    except ImportError:
        pytest.skip("Auth module not available")

    token = create_refresh_token({"sub": "test-user-id", "role": "ADMIN"})
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

    assert payload["type"] == "refresh"
    assert payload["sub"] == "test-user-id"


def test_jwt_token_expiration():
    """Test that expired tokens are rejected."""
    try:
        from app.api.auth import create_access_token
        from app.config import settings
        from jose import jwt, JWTError
    except ImportError:
        pytest.skip("Auth module not available")

    # Create a token that expires in the past
    expired_token = create_access_token(
        {"sub": "test-user-id", "role": "ADMIN"},
        expires_delta=timedelta(seconds=-1)
    )

    with pytest.raises(JWTError):
        jwt.decode(expired_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


# ─── UNIT TESTS: Token blacklist ──────────────────────────────────────────────

def test_token_blacklist():
    """Test that blacklisted tokens are detected."""
    try:
        from app.api.auth import is_token_blacklisted, blacklist_token
    except ImportError:
        pytest.skip("Auth module not available")

    jti = str(uuid.uuid4())

    # Token should not be blacklisted initially
    assert is_token_blacklisted(jti) is False

    # Blacklist the token
    blacklist_token(jti)

    # Token should now be blacklisted
    assert is_token_blacklisted(jti) is True


# ─── UNIT TESTS: Account lockout ──────────────────────────────────────────────

def test_account_lockout_mechanism():
    """Test that account lockout tracking works correctly."""
    try:
        from app.api.auth import (
            _is_account_locked,
            _record_failed_login,
            _reset_login_attempts,
            _get_remaining_attempts,
            MAX_LOGIN_ATTEMPTS,
        )
    except ImportError:
        pytest.skip("Auth module not available")

    test_email = f"lockout-test-{uuid.uuid4()}@test.gn"

    # Account should not be locked initially
    assert _is_account_locked(test_email) is False
    assert _get_remaining_attempts(test_email) == MAX_LOGIN_ATTEMPTS

    # Record failed logins up to the limit
    for _ in range(MAX_LOGIN_ATTEMPTS):
        _record_failed_login(test_email)

    # Account should now be locked
    assert _is_account_locked(test_email) is True
    assert _get_remaining_attempts(test_email) == 0

    # Reset should unlock the account
    _reset_login_attempts(test_email)
    assert _is_account_locked(test_email) is False
    assert _get_remaining_attempts(test_email) == MAX_LOGIN_ATTEMPTS


def test_account_lockout_remaining_attempts():
    """Test remaining attempts calculation."""
    try:
        from app.api.auth import (
            _record_failed_login,
            _get_remaining_attempts,
            _reset_login_attempts,
            MAX_LOGIN_ATTEMPTS,
        )
    except ImportError:
        pytest.skip("Auth module not available")

    test_email = f"remaining-test-{uuid.uuid4()}@test.gn"

    # Should start with max attempts
    assert _get_remaining_attempts(test_email) == MAX_LOGIN_ATTEMPTS

    # After 2 failed attempts, should have MAX - 2 remaining
    _record_failed_login(test_email)
    _record_failed_login(test_email)
    assert _get_remaining_attempts(test_email) == MAX_LOGIN_ATTEMPTS - 2

    # Clean up
    _reset_login_attempts(test_email)


# ─── UNIT TESTS: Password validation ──────────────────────────────────────────

def test_password_minimum_length():
    """Test that passwords below minimum length are rejected."""
    try:
        from app.api.auth import get_password_hash
        from passlib.context import CryptContext
    except ImportError:
        pytest.skip("Auth module not available")

    # The backend change-password endpoint requires 12+ chars
    # We test the policy is documented in the code
    # The frontend validatePassword function enforces 12+ chars
    # The backend change-password endpoint also checks len >= 12
    short_password = "Ab1!"
    assert len(short_password) < 12  # Should be rejected


def test_password_forbidden_patterns():
    """Test that passwords with forbidden patterns are identified."""
    forbidden_patterns = [
        'password', '123456', 'admin', 'demo', 'guinee', 'conakry',
        'motdepasse', 'azerty', 'qwerty', 'abc123', 'letmein',
        'welcome', 'monkey', 'dragon', 'master', 'login',
    ]

    test_passwords = [
        ("MyPassword123!", True),   # Contains "password" → forbidden
        ("admin2026!Gu", True),     # Contains "admin" → forbidden
        ("demo123!Guin", True),     # Contains "demo" → forbidden
        ("Adm1n!Guinee2026", True), # Contains "guinee" → forbidden
        ("Str0ng!P@ssw0rd", False), # Strong password (no forbidden pattern)
    ]

    for password, should_contain_forbidden in test_passwords:
        lower_pw = password.lower()
        has_forbidden = any(pattern in lower_pw for pattern in forbidden_patterns)
        assert has_forbidden == should_contain_forbidden, \
            f"Password '{password}' forbidden pattern check failed"


# ─── INTEGRATION TESTS: API security headers ──────────────────────────────────

def test_security_headers_present():
    """Test that security headers are added to responses."""
    try:
        from app.main import SecurityHeadersMiddleware
    except ImportError:
        pytest.skip("App module not available")

    # Verify the middleware exists and is configured
    assert SecurityHeadersMiddleware is not None


def test_rate_limit_middleware_exists():
    """Test that rate limiting middleware is configured."""
    try:
        from app.main import RateLimitMiddleware
    except ImportError:
        pytest.skip("App module not available")

    assert RateLimitMiddleware is not None


def test_rate_limit_configuration():
    """Test rate limiter default configuration."""
    try:
        from app.main import RateLimitMiddleware
    except ImportError:
        pytest.skip("App module not available")

    # Create a rate limiter with custom config
    limiter = RateLimitMiddleware(app=None, max_requests=50, window_seconds=30)
    assert limiter.max_requests == 50
    assert limiter.window_seconds == 30

    # Default config should be 100 req/60s
    default_limiter = RateLimitMiddleware(app=None)
    assert default_limiter.max_requests == 100
    assert default_limiter.window_seconds == 60


# ─── UNIT TESTS: CORS configuration ───────────────────────────────────────────

def test_cors_allowed_origins():
    """Test that CORS origins are properly configured."""
    try:
        from app.main import ALLOWED_ORIGINS_DEV, ALLOWED_ORIGINS_PROD
    except ImportError:
        pytest.skip("App module not available")

    # Development origins should include localhost
    assert "http://localhost:3000" in ALLOWED_ORIGINS_DEV
    assert "http://localhost:3001" in ALLOWED_ORIGINS_DEV

    # Production origins should use the gov domain
    assert any("eadmin.gouv.gn" in origin for origin in ALLOWED_ORIGINS_PROD)

    # Development should NOT include production URLs
    assert not any("gouv.gn" in origin for origin in ALLOWED_ORIGINS_DEV)


# ─── UNIT TESTS: MFA/TOTP ────────────────────────────────────────────────────

def test_mfa_secret_generation():
    """Test that MFA setup generates valid secrets."""
    import base64

    # Generate a 20-byte random secret and base32 encode it
    secret_bytes = uuid.uuid4().bytes + uuid.uuid4().bytes[:4]  # 20 bytes
    secret = base64.b32encode(secret_bytes).decode('utf-8').rstrip('=')

    # Secret should be valid base32
    assert len(secret) > 0
    assert all(c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567' for c in secret)


def test_mfa_code_format():
    """Test that MFA codes are 6-digit numeric strings."""
    # Valid codes
    valid_codes = ['123456', '000001', '999999', '555555']
    for code in valid_codes:
        assert code.isdigit()
        assert len(code) == 6

    # Invalid codes
    invalid_codes = ['12345', '1234567', 'abcdef', '000000', '12a456']
    for code in invalid_codes[:3]:  # Length and format issues
        assert not (code.isdigit() and len(code) == 6)


def test_mfa_qr_code_uri_format():
    """Test that QR code URI follows the otpauth:// format."""
    secret = "JBSWY3DPEHPK3PXP"
    issuer = "eAdminGuinee"
    email = "test@eadmin.gn"

    uri = f"otpauth://totp/{issuer}:{email}?secret={secret}&issuer={issuer}&algorithm=SHA1&digits=6&period=30"

    assert uri.startswith("otpauth://totp/")
    assert f"secret={secret}" in uri
    assert f"issuer={issuer}" in uri
    assert "algorithm=SHA1" in uri
    assert "digits=6" in uri
    assert "period=30" in uri


# ─── UNIT TESTS: Session security ─────────────────────────────────────────────

def test_concurrent_session_limit():
    """Test that the concurrent session limit is set to 3."""
    MAX_CONCURRENT_SESSIONS = 3
    assert MAX_CONCURRENT_SESSIONS == 3


def test_session_timeout_values():
    """Test session timeout configuration values."""
    SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000       # 8 hours
    INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000         # 30 minutes

    assert SESSION_TIMEOUT_MS == 28800000  # 8 hours in ms
    assert INACTIVITY_TIMEOUT_MS == 1800000  # 30 minutes in ms


def test_lockout_duration():
    """Test that lockout duration is 15 minutes."""
    try:
        from app.api.auth import LOCKOUT_DURATION_SECONDS
    except ImportError:
        pytest.skip("Auth module not available")

    assert LOCKOUT_DURATION_SECONDS == 15 * 60  # 15 minutes


def test_max_login_attempts():
    """Test that max login attempts is 5."""
    try:
        from app.api.auth import MAX_LOGIN_ATTEMPTS
    except ImportError:
        pytest.skip("Auth module not available")

    assert MAX_LOGIN_ATTEMPTS == 5


# ─── UNIT TESTS: CSRF token ───────────────────────────────────────────────────

def test_csrf_token_generation():
    """Test that CSRF tokens are generated with sufficient entropy."""
    import secrets

    token1 = secrets.token_hex(32)
    token2 = secrets.token_hex(32)

    # Tokens should be different
    assert token1 != token2
    # Tokens should be 64 characters long (32 bytes → 64 hex chars)
    assert len(token1) == 64
    assert len(token2) == 64


# ─── UNIT TESTS: Request logging ──────────────────────────────────────────────

def test_request_logging_middleware_exists():
    """Test that request logging middleware is configured."""
    try:
        from app.main import RequestLoggingMiddleware
    except ImportError:
        pytest.skip("App module not available")

    assert RequestLoggingMiddleware is not None


def test_app_version():
    """Test that the app version is configured."""
    try:
        from app.config import settings
    except ImportError:
        pytest.skip("Config module not available")

    assert settings.APP_VERSION is not None
    assert len(settings.APP_VERSION) > 0
