# backend/main.py
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from backend.config import settings
from backend.logging_config import setup_logging
from backend.models.db import init_db
from backend.schemas import HealthResponse

setup_logging()
log = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"])

app = FastAPI(title="Crypto Trading API", version="2.0.0", docs_url="/docs", redoc_url="/redoc")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(CORSMiddleware, allow_origins=settings.ALLOWED_ORIGINS,
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    log.info("%s %s → %d", request.method, request.url.path, response.status_code)
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

from backend.api.market     import router as market_router
from backend.api.trading    import router as trading_router
from backend.api.account    import router as account_router
from backend.api.poller     import router as poller_router
from backend.api.chat       import router as chat_router
from backend.api.automation import router as automation_router
from backend.api.auth       import router as auth_router

app.include_router(auth_router,       prefix="/api/v1")
app.include_router(market_router,     prefix="/api/v1")
app.include_router(trading_router,    prefix="/api/v1")
app.include_router(account_router,    prefix="/api/v1")
app.include_router(poller_router,     prefix="/api/v1")
app.include_router(chat_router,       prefix="/api/v1")
app.include_router(automation_router, prefix="/api/v1")


@app.on_event("startup")
async def on_startup():
    init_db()
    log.info("Database initialized")
    try:
        from backend.services.exchange_client import ExchangeClient
        app.state.exchange_client = ExchangeClient()
    except Exception:
        log.exception("Failed to init ExchangeClient")
        app.state.exchange_client = None
    try:
        from backend.services.poller import Poller
        app.state.poller = Poller(app.state.exchange_client) if app.state.exchange_client else None
    except Exception:
        log.exception("Failed to init Poller")
        app.state.poller = None
    log.info("Startup complete — exchange=%s poller=%s env=%s",
             app.state.exchange_client is not None, app.state.poller is not None, settings.ENV)


@app.on_event("shutdown")
async def on_shutdown():
    if getattr(app.state, "poller", None):
        app.state.poller.stop()
    log.info("Shutdown complete")


@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health(request: Request):
    exchange_ok = getattr(request.app.state, "exchange_client", None) is not None
    poller = getattr(request.app.state, "poller", None)
    poller_running = poller is not None and poller.is_running
    db_ok = True
    try:
        from backend.models.db import SessionLocal
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
    except Exception:
        db_ok = False
    return HealthResponse(status="ok" if exchange_ok and db_ok else "degraded",
                          service="crypto-trading-api", env=settings.ENV,
                          exchange_connected=exchange_ok, poller_running=poller_running,
                          db_connected=db_ok)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "docs": "/docs", "version": "2.0.0"}
