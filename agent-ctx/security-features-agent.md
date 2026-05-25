# Task: Enterprise Security Features — MFA/TOTP, JWT Rotation, Token Blacklist, File Encryption

## Summary
Implemented comprehensive enterprise security features across 6 files:
1. **New**: `/src/lib/security.ts` — Frontend security module
2. **Updated**: `/src/components/auth/mfa-page.tsx` — Enhanced MFA with TOTP
3. **Updated**: `/src/store/session-store.ts` — JWT rotation & session security
4. **Updated**: `/backend/app/api/auth.py` — Backend auth with lockout & MFA
5. **New**: `/backend/app/api/security.py` — Security API endpoints
6. **Updated**: `/backend/app/main.py` — Security router registration

## Key Features Implemented

### Frontend (`/src/lib/security.ts`)
- **Password Policy**: 12-char minimum, uppercase, lowercase, digit, special char, forbidden patterns (password, admin, guinee, etc.), entropy scoring 0-100
- **TOTP**: Self-contained RFC 6238 implementation (no external deps), Base32 secret generation, HMAC-SHA1 via Web Crypto API, ±1 window verification, `otpauth://` URI generation
- **Backup Codes**: 10 one-time 8-char alphanumeric codes
- **AES-256-GCM Encryption**: Web Crypto API, PBKDF2 key derivation (100K iterations), base64 output format
- **Session Security**: Suspicious activity detection (new IP, unusual hours, unknown browser, multi-network)
- **CSRF**: Token generation + constant-time comparison
- **ClientRateLimiter**: Configurable max attempts + window, lockout end time tracking
- **JWT Rotation Utilities**: Track rotation state, check if rotation needed

### MFA Page (`/src/components/auth/mfa-page.tsx`)
- **3-phase flow**: Setup (QR code display) → Verify setup code → Backup codes → Verification
- **QR Code**: SVG pseudo-QR pattern with corner markers, manual secret key entry with copy button
- **Backup Codes**: Grid display, reveal/hide toggle, copy individual or all codes
- **Rate Limiting**: 5 attempts, 15-min lockout, remaining attempts warning
- **Suspicious Activity**: IP change detection, unusual hours warning on MFA page
- **Demo compatibility**: Falls back to accepting any 6-digit code (except 000000) when no TOTP secret configured

### Session Store (`/src/store/session-store.ts`)
- **JWT Rotation**: Per-session rotation tracking (access/refresh timestamps, rotation count, last rotation)
- **Token Blacklist**: Client-side JTI blacklist with security events
- **Concurrent Sessions**: Max 3 per user, oldest auto-terminated
- **Session Timeout**: 8h absolute + 30min inactivity
- **IP Change Detection**: Tracks IP changes with security events
- **Security Events**: Typed event log (500 in-memory, 100 persisted)
- **Backup Code Management**: Store, use, and track backup codes per user
- **MFA Secret Storage**: Per-user TOTP secrets

### Backend Auth (`/backend/app/api/auth.py`)
- **Account Lockout**: 5 failed attempts → 15-min lockout, remaining attempts in error message
- **Login Attempt Logging**: Structured logging with IP and remaining attempts
- **JWT Rotation**: Old refresh tokens blacklisted on refresh, new JTI per token
- **Token Blacklist**: In-memory (Redis in production), checked in `get_current_user`
- **MFA-aware Login**: If MFA enabled, returns short-lived token requiring MFA verification
- **MFA Endpoints**: Setup, verify, change password with policy validation
- **Password Change**: Requires current password, enforces 12-char policy + forbidden patterns

### Backend Security (`/backend/app/api/security.py`)
- **POST /setup-mfa**: Generate TOTP secret, QR URI, backup codes
- **POST /verify-mfa**: Server-side TOTP verification with rate limiting (5/15min)
- **POST /disable-mfa**: Password + optional TOTP code verification
- **POST /change-password**: Password policy enforcement (12+ chars, complexity)
- **GET /sessions**: List active sessions for current user
- **DELETE /sessions/{id}**: Terminate specific session
- **DELETE /sessions**: Revoke all sessions
- **GET /security-events**: Recent security events (max 100)

### Backend Main (`/backend/app/main.py`)
- Added `security` router import and registration at `/api/v1/security`

## Compatibility Notes
- Demo accounts continue to work with existing passwords
- MFA page falls back to "any 6-digit code" acceptance when no TOTP secret is configured
- Backend TOTP verification uses proper HMAC-SHA1 with ±1 window for clock drift
- All security events are logged both client-side and server-side
