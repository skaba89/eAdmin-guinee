"""
Middleware de sécurité - eAdministration Suite Guinea.
Rate limiting, headers de sécurité, et protection brute-force.
"""

from app.middleware.rate_limit import RateLimitMiddleware

__all__ = ["RateLimitMiddleware"]
