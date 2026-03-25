# backend/api/chat.py
import logging
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException

from backend.schemas import ChatRequest, ChatResponse
from backend.config import settings

log = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["AI Assistant"])

# Fallback chain — tried in order until one succeeds
_MODEL_FALLBACKS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-flash-latest",
]

# System prompt that makes the AI crypto-trading aware
_SYSTEM_PROMPT = """You are an expert crypto trading assistant integrated into a 
professional trading platform connected to Binance Spot Testnet.

You have deep knowledge of:
- Technical analysis: RSI, EMA, MACD, Bollinger Bands, support/resistance
- Trading strategies: trend following, mean reversion, momentum, scalping
- Risk management: position sizing, stop-loss, take-profit, portfolio allocation
- Crypto markets: Bitcoin, Ethereum, altcoins, DeFi, market cycles
- Order types: MARKET, LIMIT, STOP-LIMIT, OCO
- The platform's EMA20 + RSI strategy (BUY when price crosses above EMA20 and RSI < 30, SELL when price crosses below EMA20 and RSI > 70)

Be concise, practical, and data-driven. When asked about signals or strategy, 
explain the reasoning clearly. Always remind users this is a testnet environment."""


def _extract_text(resp_json: Dict[str, Any]) -> str:
    try:
        candidates = resp_json.get("candidates") or []
        for c in candidates:
            content = c.get("content") or {}
            parts = content.get("parts") or []
            texts = [p["text"] for p in parts if isinstance(p, dict) and "text" in p]
            if texts:
                return "\n\n".join(t.strip() for t in texts if t.strip())
    except Exception as exc:
        log.debug("Text extraction failed: %s", exc)
    for key in ("text", "message", "output"):
        if key in resp_json and isinstance(resp_json[key], str):
            return resp_json[key]
    return str(resp_json)


async def _call_model(model: str, messages: List[Dict], api_key: str) -> Dict[str, Any]:
    """Call a specific Gemini model. Key goes as query param."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {"contents": messages}
    async with httpx.AsyncClient(timeout=30.0) as http:
        r = await http.post(url, json=payload, params={"key": api_key})
        r.raise_for_status()
        return r.json()


async def _call_gemini_with_fallback(prompt: str) -> tuple[Dict[str, Any], str]:
    """Try each model in the fallback chain, return (response, model_used)."""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    # Build message list with system context injected as first user turn
    messages = [
        {"role": "user",  "parts": [{"text": _SYSTEM_PROMPT}]},
        {"role": "model", "parts": [{"text": "Understood. I'm ready to assist with crypto trading analysis and strategy."}]},
        {"role": "user",  "parts": [{"text": prompt}]},
    ]

    # Build model list: configured model first, then fallbacks
    configured = settings.GEMINI_MODEL or "gemini-2.5-flash"
    models = [configured] + [m for m in _MODEL_FALLBACKS if m != configured]

    last_error: Optional[Exception] = None
    for model in models:
        try:
            log.info("Trying Gemini model: %s", model)
            resp = await _call_model(model, messages, settings.GEMINI_API_KEY)
            log.info("Gemini success with model: %s", model)
            return resp, model
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code
            log.warning("Model %s failed with HTTP %d", model, status)
            last_error = exc
            if status == 429:
                # Rate limited — try next model immediately
                continue
            if status in (404, 400):
                # Model not found or bad request — try next
                continue
            # Other errors (5xx) — try next
            continue
        except Exception as exc:
            log.warning("Model %s failed: %s", model, exc)
            last_error = exc
            continue

    raise HTTPException(
        status_code=502,
        detail=f"All Gemini models failed. Last error: {last_error}"
    )


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Send a question to the Gemini AI assistant with automatic model fallback."""
    try:
        resp, model_used = await _call_gemini_with_fallback(req.q.strip())
    except HTTPException:
        raise
    except Exception as exc:
        log.exception("Unexpected Gemini error")
        raise HTTPException(status_code=500, detail=str(exc))

    answer = _extract_text(resp)
    return ChatResponse(answer=answer, raw={"model_used": model_used, **resp})


@router.get("/models", tags=["AI Assistant"])
async def list_models():
    """List available Gemini models for this API key."""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    async with httpx.AsyncClient(timeout=10.0) as http:
        r = await http.get(
            "https://generativelanguage.googleapis.com/v1beta/models",
            params={"key": settings.GEMINI_API_KEY}
        )
        r.raise_for_status()
        data = r.json()
    # Return only text-generation capable models
    models = [
        {"name": m["name"].replace("models/", ""), "displayName": m.get("displayName", "")}
        for m in data.get("models", [])
        if "generateContent" in m.get("supportedGenerationMethods", [])
    ]
    return {"models": models, "count": len(models)}
