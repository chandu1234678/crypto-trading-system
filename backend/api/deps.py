# backend/api/deps.py
from typing import Optional

from fastapi import Header, HTTPException

from backend.config import settings


def require_admin(x_admin_token: Optional[str] = Header(None)) -> None:
    """Dependency that enforces the admin token header."""
    if not x_admin_token or x_admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized — invalid or missing X-Admin-Token")
