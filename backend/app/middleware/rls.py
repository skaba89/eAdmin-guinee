"""
Row-Level Security middleware - eAdministration Suite Guinea.
Sets the current user context for PostgreSQL RLS policies.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class RLSMiddleware(BaseHTTPMiddleware):
    """
    Sets the PostgreSQL session variable `app.current_user_id`
    so RLS policies can filter data by the authenticated user.
    """

    async def dispatch(self, request: Request, call_next):
        # Try to extract user ID from JWT
        user_id = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                from jose import jwt
                from app.config import settings
                token = auth_header[7:]
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                user_id = payload.get("sub")
            except Exception:
                pass

        # Set the PostgreSQL session variable for RLS
        if user_id:
            try:
                from app.database import engine
                from sqlalchemy import text
                async with engine.connect() as conn:
                    await conn.execute(
                        text("SET LOCAL app.current_user_id = :user_id"),
                        {"user_id": user_id}
                    )
            except Exception:
                pass  # Don't block the request if RLS setup fails

        response = await call_next(request)
        return response
