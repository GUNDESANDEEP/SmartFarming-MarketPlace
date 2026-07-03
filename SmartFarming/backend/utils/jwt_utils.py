"""
JWT Utilities for FastAPI
Drop-in replacement for flask_jwt_extended using python-jose.
Produces tokens compatible with the existing frontend.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, ExpiredSignatureError
import os

# ── Configuration ──
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', os.getenv('SECRET_KEY', 'change-me-in-production'))
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

# FastAPI security scheme
security = HTTPBearer(auto_error=False)


def create_access_token(identity, additional_claims: Optional[dict] = None) -> str:
    """Create a JWT access token — compatible with flask_jwt_extended format."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(identity),
        "iat": now,
        "nbf": now,
        "exp": now + JWT_ACCESS_TOKEN_EXPIRES,
        "type": "access",
        "fresh": False,
    }
    if additional_claims:
        payload.update(additional_claims)
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_refresh_token(identity, additional_claims: Optional[dict] = None) -> str:
    """Create a JWT refresh token."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(identity),
        "iat": now,
        "nbf": now,
        "exp": now + JWT_REFRESH_TOKEN_EXPIRES,
        "type": "refresh",
    }
    if additional_claims:
        payload.update(additional_claims)
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token. Returns payload dict."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "token_expired", "message": "Your session has expired. Please login again."}
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "token_invalid", "message": f"Invalid authentication token. {str(e)}"}
        )


def get_jwt_identity_from_token(token: str):
    """Extract user identity (sub claim) from token."""
    payload = decode_token(token)
    identity = payload.get("sub")
    if identity is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "token_invalid", "message": "Token missing identity claim."}
        )
    return identity


# ── FastAPI Dependencies ──

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """
    FastAPI dependency — replaces @jwt_required() + get_jwt_identity().
    Returns the user identity (string user_id).
    """
    token = None

    # 1. Try Bearer token from Authorization header
    if credentials:
        token = credentials.credentials
    else:
        # 2. Fallback: check raw Authorization header
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "token_missing", "message": "Authentication token is required."}
        )

    return get_jwt_identity_from_token(token)


async def get_current_user_with_role(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """
    FastAPI dependency — returns (user_id, role) tuple.
    Extracts both identity and role from the JWT claims.
    """
    token = None

    if credentials:
        token = credentials.credentials
    else:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "token_missing", "message": "Authentication token is required."}
        )

    payload = decode_token(token)
    identity = payload.get("sub")
    if identity is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "token_invalid", "message": "Token missing identity claim."}
        )

    role = payload.get("role", "")
    return identity, role


def require_role(*allowed_roles):
    """
    Factory that creates a FastAPI dependency enforcing role-based access.

    Usage:
        @router.get("/admin-only")
        async def admin_endpoint(user_id: str = Depends(require_role("admin"))):
            ...

    Multiple roles:
        @router.get("/staff-only")
        async def staff_endpoint(user_id: str = Depends(require_role("admin", "farmer"))):
            ...
    """
    async def _role_checker(
        request: Request,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
    ):
        token = None

        if credentials:
            token = credentials.credentials
        else:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]

        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error": "token_missing", "message": "Authentication token is required."}
            )

        payload = decode_token(token)
        identity = payload.get("sub")
        if identity is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error": "token_invalid", "message": "Token missing identity claim."}
            )

        user_role = payload.get("role", "")

        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "access_denied",
                    "message": f"Access denied. This endpoint requires role: {', '.join(allowed_roles)}. Your role: {user_role}."
                }
            )

        return identity

    return _role_checker


# ── Shortcut Dependencies ──
require_farmer = require_role("farmer")
require_buyer = require_role("buyer")
require_admin = require_role("admin")


async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """
    FastAPI dependency — optional auth. Returns identity or None.
    """
    token = None
    if credentials:
        token = credentials.credentials
    else:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        return None

    try:
        return get_jwt_identity_from_token(token)
    except HTTPException:
        return None
