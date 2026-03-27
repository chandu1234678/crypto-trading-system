# backend/api/deps.py
from typing import Optional
from fastapi import Header, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from backend.config import settings
from backend.models.db import get_db, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def require_admin(x_admin_token: Optional[str] = Header(None)) -> None:
    """Legacy admin token — kept for backward compat with existing endpoints."""
    if not x_admin_token or x_admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized — invalid or missing X-Admin-Token")


def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Returns user if JWT valid, else None (for optional auth)."""
    if not token:
        return None
    from backend.services.auth_service import decode_token, get_user_by_id
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    return get_user_by_id(db, int(payload.get("sub", 0)))


def require_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Require a valid JWT — raises 401 if not authenticated."""
    user = get_current_user_optional(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    return user


def require_jwt_admin(user: User = Depends(require_user)) -> User:
    """Require JWT + admin role."""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
