# backend/config.py
from typing import List, Optional
from pydantic import BaseSettings, validator


class Settings(BaseSettings):
    API_KEY: Optional[str] = ""
    API_SECRET: Optional[str] = ""
    API_BASE_URL: str = "https://testnet.binance.vision"
    USE_TEST_ORDER: bool = True
    DRY_RUN: bool = True
    APP_HOST: str = "127.0.0.1"
    APP_PORT: int = 8000
    ENV: str = "development"
    SYMBOL: str = "BTCUSDT"
    POLL_INTERVAL: int = 30
    SPEND_QUOTE: float = 10.0
    RSI_OVERSOLD: float = 30.0
    RSI_OVERBOUGHT: float = 70.0
    EMA_SPAN: int = 20
    RSI_WINDOW: int = 14
    DATABASE_URL: str = "sqlite:///./data/trades.db"
    ADMIN_TOKEN: str = "admin123"
    GEMINI_API_KEY: Optional[str] = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    ALLOWED_ORIGINS: Optional[str] = None
    RATE_LIMIT_PER_MINUTE: int = 60
    LOG_LEVEL: str = "INFO"

    @validator("ADMIN_TOKEN")
    def admin_token_not_default_in_prod(cls, v, values):
        if values.get("ENV") == "production" and v == "admin123":
            raise ValueError("ADMIN_TOKEN must be changed from default in production")
        return v

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
