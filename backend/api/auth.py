# backend/api/auth.py
import logging
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field, validator
from sqlalchemy.orm import Session

from backend.models.db import get_db, User
from backend.services.auth_service import (
    authenticate_user, create_user, create_access_token, create_refresh_token,
    decode_token, get_user_by_email, get_user_by_id, get_user_by_username,
    generate_reset_token, reset_password, encrypt, decrypt,
)
from backend.config import settings

log = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# ── Schemas ───────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)
    username: str = Field(..., min_length=3, max_length=64, regex="^[a-zA-Z0-9_]+$")
    password: str = Field(..., min_length=8, max_length=128)

    @validator("email")
    def email_lower(cls, v):
        return v.lower()


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    email: str
    is_admin: bool


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    is_admin: bool
    has_exchange_keys: bool
    has_gemini_key: bool

    class Config:
        orm_mode = True


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class ApiKeysRequest(BaseModel):
    api_key: str = Field(..., min_length=10)
    api_secret: str = Field(..., min_length=10)
    api_base_url: str = "https://testnet.binance.vision"


class GeminiKeyRequest(BaseModel):
    gemini_api_key: str = Field(..., min_length=10)
    gemini_model: str = "gemini-2.5-flash-lite"


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Dependency: get current user from JWT ─────────────────────────────────────

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid or expired token",
                            headers={"WWW-Authenticate": "Bearer"})
    user = get_user_by_id(db, int(payload.get("sub", 0)))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def get_current_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if get_user_by_email(db, req.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if get_user_by_username(db, req.username):
        raise HTTPException(status_code=400, detail="Username already taken")

    # First user becomes admin
    is_admin = db.query(User).count() == 0
    user = create_user(db, req.email, req.username, req.password, is_admin=is_admin)
    log.info("New user registered: %s (admin=%s)", user.email, is_admin)

    access  = create_access_token({"sub": str(user.id)})
    refresh = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(access_token=access, refresh_token=refresh,
                         user_id=user.id, username=user.username,
                         email=user.email, is_admin=user.is_admin)


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form.username, form.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Incorrect email or password",
                            headers={"WWW-Authenticate": "Bearer"})
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    access  = create_access_token({"sub": str(user.id)})
    refresh = create_refresh_token({"sub": str(user.id)})
    log.info("User logged in: %s", user.email)
    return TokenResponse(access_token=access, refresh_token=refresh,
                         user_id=user.id, username=user.username,
                         email=user.email, is_admin=user.is_admin)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(req: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = get_user_by_id(db, int(payload.get("sub", 0)))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    access  = create_access_token({"sub": str(user.id)})
    refresh = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(access_token=access, refresh_token=refresh,
                         user_id=user.id, username=user.username,
                         email=user.email, is_admin=user.is_admin)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut(id=user.id, email=user.email, username=user.username,
                   is_admin=user.is_admin,
                   has_exchange_keys=bool(user.enc_api_key),
                   has_gemini_key=bool(user.enc_gemini_key))


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, req.email)
    # Always return 200 to prevent email enumeration
    if user:
        token = generate_reset_token(db, user)
        # In production: send email. For now, return token in response (dev only)
        log.info("Password reset token for %s: %s", user.email, token)
        if settings.ENV == "development":
            return {"message": "Reset token generated (dev mode — token returned)", "reset_token": token}
    return {"message": "If that email exists, a reset link has been sent"}


@router.post("/reset-password")
def reset_pwd(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    ok = reset_password(db, req.token, req.new_password)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    return {"message": "Password reset successfully"}


@router.post("/change-password")
def change_password(req: ChangePasswordRequest,
                    user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    from backend.services.auth_service import verify_password, hash_password
    if not verify_password(req.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.hashed_password = hash_password(req.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


# ── API Key management ────────────────────────────────────────────────────────

@router.post("/keys/exchange")
def save_exchange_keys(req: ApiKeysRequest,
                       user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    """Save encrypted Binance API keys for the current user."""
    try:
        user.enc_api_key    = encrypt(req.api_key)
        user.enc_api_secret = encrypt(req.api_secret)
        user.api_base_url   = req.api_base_url
        db.commit()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Encryption failed: {exc}")
    return {"message": "Exchange keys saved securely"}


@router.delete("/keys/exchange")
def delete_exchange_keys(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.enc_api_key = None
    user.enc_api_secret = None
    db.commit()
    return {"message": "Exchange keys removed"}


@router.post("/keys/gemini")
def save_gemini_key(req: GeminiKeyRequest,
                    user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    """Save encrypted Gemini API key for the current user."""
    try:
        user.enc_gemini_key = encrypt(req.gemini_api_key)
        user.gemini_model   = req.gemini_model
        db.commit()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Encryption failed: {exc}")
    return {"message": "Gemini key saved securely"}


@router.delete("/keys/gemini")
def delete_gemini_key(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.enc_gemini_key = None
    db.commit()
    return {"message": "Gemini key removed"}


@router.get("/keys/status")
def keys_status(user: User = Depends(get_current_user)):
    """Check which keys the user has stored."""
    return {
        "has_exchange_keys": bool(user.enc_api_key and user.enc_api_secret),
        "api_base_url": user.api_base_url or settings.API_BASE_URL,
        "has_gemini_key": bool(user.enc_gemini_key),
        "gemini_model": user.gemini_model or settings.GEMINI_MODEL,
    }
