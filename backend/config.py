# backend/config.py
from typing import List, Optional
from pydantic import BaseSettings, validator


class Settings(BaseSettings):
    # Binance
    API_KEY: Optional[str] = ""
    API_SECRET: Optional[str] = ""
    API_BASE_URL: str = "https://testnet.binance.vision"
    USE_TEST_ORDER: bool = True
    DRY_RUN: bool = True

    # App
    APP_HOST: str = "127.0.0.1"
    APP_PORT: int = 8000
    ENV: str = "development"

    # Strategy
    SYMBOL: str = "BTCUSDT"
    POLL_INTERVAL: int = 30
    SPEND_QUOTE: float = 10.0
    RSI_OVERSOLD: float = 30.0
    RSI_OVERBOUGHT: float = 70.0
    EMA_SPAN: int = 20
    RSI_WINDOW: int = 14

    # Database
    DATABASE_URL: str = "sqlite:///./data/trades.db"

    # Admin (legacy simple token — kept for backward compat)
    ADMIN_TOKEN: str = "admin123"

    # Gemini
    GEMINI_API_KEY: Optional[str] = ""
    GEMINI_MODEL: str = "gemini-2.5-flash-lite"

    # CORS
    ALLOWED_ORIGINS: Optional[str] = None

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # Logging
    LOG_LEVEL: str = "INFO"

    # JWT Auth
    JWT_SECRET: str = "change-me-in-production-use-secrets-token-hex-32"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_EXPIRE_DAYS: int = 7

    # Encryption key for stored API keys (Fernet)
    ENCRYPTION_KEY: Optional[str] = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

_raw = settings.ALLOWED_ORIGINS
if _raw:
    settings.ALLOWED_ORIGINS = [s.strip() for s in _raw.split(",") if s.strip()]  # type: ignore
else:
    settings.ALLOWED_ORIGINS = [  # type: ignore
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:3000", "http://127.0.0.1:3000",
    ]
