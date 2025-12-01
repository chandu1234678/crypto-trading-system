# backend/config.py
from typing import List, Optional
from pydantic import BaseSettings


class Settings(BaseSettings):
    # Binance / exchange
    API_KEY: Optional[str] = ""
    API_SECRET: Optional[str] = ""
    API_BASE_URL: str = "https://testnet.binance.vision"
    USE_TEST_ORDER: bool = True

    # DRY_RUN: when True the /trade endpoint will not actually post orders (simulates)
    DRY_RUN: bool = True

    # App
    APP_HOST: str = "127.0.0.1"
    APP_PORT: int = 8000

    # Strategy / trading defaults
    SYMBOL: str = "BTCUSDT"
    POLL_INTERVAL: int = 30
    SPEND_QUOTE: float = 10.0

    # Database
    DATABASE_URL: str = "sqlite:///./data/trades.db"

    # Admin
    ADMIN_TOKEN: str = "admin123"

    # Gemini / Google GenAI
    GEMINI_API_KEY: Optional[str] = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # CORS: comma-separated string in .env,
    # e.g. "http://localhost:5173,http://127.0.0.1:5173"
    ALLOWED_ORIGINS: Optional[str] = None

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Convert ALLOWED_ORIGINS into a list if user set comma-separated values
if settings.ALLOWED_ORIGINS:
    try:
        _origins: List[str] = [
            s.strip() for s in settings.ALLOWED_ORIGINS.split(",") if s.strip()
        ]
        settings.ALLOWED_ORIGINS = _origins  # type: ignore[assignment]
    except Exception:
        # if parsing fails, leave it as None so fallback is used
        settings.ALLOWED_ORIGINS = None      # type: ignore[assignment]
else:
    settings.ALLOWED_ORIGINS = None          # type: ignore[assignment]
