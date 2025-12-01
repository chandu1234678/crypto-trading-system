# backend/main.py
import logging
import time
import urllib.parse
import hmac
import hashlib
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.config import settings

log = logging.getLogger("uvicorn.error")

app = FastAPI(title="crypto-trade-professional - spot-testnet")

# CORS origins: settings.ALLOWED_ORIGINS may be a list (config handles conversion)
origins = settings.ALLOWED_ORIGINS or [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = None
poller = None


def verify_admin(x_admin_token: Optional[str] = Header(None)):
    if x_admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.on_event("startup")
async def on_startup():
    global client, poller
    try:
        from backend.services.exchange_client import ExchangeClient
        from backend.services.poller import Poller
    except Exception as e:
        log.error("Import error ExchangeClient/Poller: %s", e)
        return

    try:
        client = ExchangeClient()
    except Exception as e:
        log.exception("Failed to init ExchangeClient: %s", e)
        client = None

    try:
        poller = Poller(client) if client is not None else None
    except Exception as e:
        log.exception("Failed to init Poller: %s", e)
        poller = None

    log.info(
        "Startup complete. client=%s poller=%s",
        client is not None,
        poller is not None,
    )


@app.on_event("shutdown")
async def on_shutdown():
    try:
        if poller:
            poller.stop()
    except Exception:
        log.exception("Error stopping poller on shutdown")


@app.get("/")
def root():
    return {"status": "ok", "service": "spot-testnet"}


@app.get("/klines")
def klines(symbol: str, interval: str, limit: int = 50):
    if client is None:
        raise HTTPException(status_code=503, detail="Service not ready")
    return client.get_klines(symbol, interval, limit)


@app.get("/strategy/signal")
def strategy(symbol: str = "BTCUSDT", interval: str = "1m"):
    if client is None:
        raise HTTPException(status_code=503, detail="Service not ready")
    data = client.get_klines(symbol, interval, 100)
    from backend.services.strategy_service import get_signal

    return get_signal(data)


@app.post("/run-now")
def run_now(admin=Depends(verify_admin)):
    if client is None:
        raise HTTPException(status_code=503, detail="Service not ready")
    from backend.services.strategy_service import get_signal

    data = client.get_klines(settings.SYMBOL, "1m", 100)
    result = get_signal(data)
    return result


@app.post("/poller/start")
def poller_start(admin=Depends(verify_admin)):
    if poller is None:
        raise HTTPException(status_code=503, detail="Service not ready")
    poller.start()
    return {"status": "poller started"}


@app.post("/poller/stop")
def poller_stop(admin=Depends(verify_admin)):
    if poller is None:
        raise HTTPException(status_code=503, detail="Service not ready")
    poller.stop()
    return {"status": "poller stopped"}


# ------------- Gemini Chat ----------------
class ChatRequest(BaseModel):
    q: str


class ChatResponse(BaseModel):
    answer: str
    raw: Optional[Dict[str, Any]] = None


def _extract_text_from_gemini(resp_json: Dict[str, Any]) -> str:
    try:
        candidates = resp_json.get("candidates") or resp_json.get("output") or []
        if isinstance(candidates, dict):
            candidates = [candidates]
        texts: List[str] = []
        for c in candidates:
            content = c.get("content") or c.get("message") or {}
            if isinstance(content, dict):
                parts = content.get("parts") or content.get("text") or []
                if isinstance(parts, list):
                    for p in parts:
                        if isinstance(p, dict) and "text" in p:
                            texts.append(p["text"])
                        elif isinstance(p, str):
                            texts.append(p)
                elif isinstance(parts, str):
                    texts.append(parts)
            if isinstance(c, dict) and isinstance(c.get("text"), str):
                texts.append(c["text"])
        if texts:
            return "\n\n".join(t.strip() for t in texts if t and t.strip())
    except Exception as e:
        log.debug("gemini extractor failed: %s", e)

    for key in ("text", "message", "output"):
        if key in resp_json and isinstance(resp_json[key], str):
            return resp_json[key]
    return str(resp_json)


async def _call_gemini_api(prompt: str) -> Dict[str, Any]:
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    model = settings.GEMINI_MODEL or "gemini-2.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
    }
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": settings.GEMINI_API_KEY,
    }
    async with httpx.AsyncClient(timeout=30.0) as http:
        r = await http.post(url, json=payload, headers=headers)
        try:
            r.raise_for_status()
        except httpx.HTTPStatusError:
            body = r.text
            log.error("Gemini API failed: status=%s body=%s", r.status_code, body)
            raise HTTPException(status_code=502, detail=f"Gemini API error: {r.status_code}")
        return r.json()


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    prompt = (req.q or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Empty query")
    try:
        gemini_resp = await _call_gemini_api(prompt)
    except HTTPException:
        raise
    except Exception as exc:
        log.exception("Unexpected Gemini error")
        raise HTTPException(status_code=500, detail=str(exc))
    answer = _extract_text_from_gemini(gemini_resp)
    return ChatResponse(answer=answer, raw=gemini_resp)


# ------------- Trade endpoint ----------------
class TradeRequest(BaseModel):
    symbol: str
    side: str
    type: Optional[str] = "MARKET"
    quantity: Optional[float] = None
    price: Optional[float] = None
    timeInForce: Optional[str] = "GTC"
    force_execute: Optional[bool] = False


class TradeResponse(BaseModel):
    executed: bool
    dry_run: bool
    intended_payload: dict
    exchange_result: Optional[Dict[str, Any]] = None


@app.post("/trade", response_model=TradeResponse)
def trade(req: TradeRequest, admin=Depends(verify_admin)):
    if client is None:
        raise HTTPException(status_code=503, detail="Service not ready")

    side = (req.side or "").upper()
    if side not in ("BUY", "SELL"):
        raise HTTPException(status_code=400, detail="side must be BUY or SELL")

    typ = (req.type or "MARKET").upper()

    payload = {
        "symbol": req.symbol,
        "side": side,
        "type": typ,
        "quantity": req.quantity,
        "price": req.price,
        "timeInForce": req.timeInForce,
    }

    if not settings.USE_TEST_ORDER:
        return TradeResponse(
            executed=False,
            dry_run=True,
            intended_payload=payload,
            exchange_result={
                "error": "USE_TEST_ORDER is false — refusing to execute orders"
            },
        )

    do_execute = (not settings.DRY_RUN) or bool(req.force_execute)
    if not do_execute:
        return TradeResponse(executed=False, dry_run=True, intended_payload=payload)

    try:
        order_resp = client.create_order(
            symbol=req.symbol,
            side=side,
            type=typ,
            quantity=req.quantity,
            price=req.price,
            test=True,
            time_in_force=req.timeInForce,
        )
    except Exception as exc:
        log.exception("Order placement failed")
        raise HTTPException(status_code=502, detail=str(exc))

    return TradeResponse(
        executed=True,
        dry_run=False,
        intended_payload=payload,
        exchange_result=order_resp,
    )


# ------------- Account + Open orders ----------------
class AccountResponse(BaseModel):
    balances: List[Dict[str, Any]]
    raw: Dict[str, Any]


@app.get("/account", response_model=AccountResponse)
def account(admin=Depends(verify_admin)):
    if client is None:
        raise HTTPException(status_code=503, detail="Service not ready")
    try:
        acc = client.get_account()
    except Exception as exc:
        log.exception("get_account failed")
        raise HTTPException(status_code=502, detail=str(exc))

    balances = [
        b
        for b in acc.get("balances", [])
        if float(b.get("free", "0")) > 0 or float(b.get("locked", "0")) > 0
    ]
    return AccountResponse(balances=balances, raw=acc)


class OpenOrdersResponse(BaseModel):
    value: List[Dict[str, Any]]
    Count: int


@app.get("/open-orders", response_model=OpenOrdersResponse)
def open_orders(symbol: Optional[str] = None, admin=Depends(verify_admin)):
    if client is None:
        raise HTTPException(status_code=503, detail="Service not ready")
    try:
        orders = client.get_open_orders(symbol=symbol)
    except Exception as exc:
        log.exception("get_open_orders failed")
        raise HTTPException(status_code=502, detail=str(exc))
    return OpenOrdersResponse(value=orders, Count=len(orders))
