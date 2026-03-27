# backend/api/automation.py
"""
Automation endpoints — AI-assisted signal analysis, auto-trade triggers,
scheduled strategy runs, and risk management controls.
"""
import logging
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.api.deps import require_admin
from backend.config import settings
from backend.models.db import get_db
from backend.services.strategy_service import get_signal
from backend.services.trader_service import run_signal_and_place, save_trade

log = logging.getLogger(__name__)
router = APIRouter(prefix="/automation", tags=["Automation"])

# ── Schemas ───────────────────────────────────────────────────────────────────

class AutoTradeConfig(BaseModel):
    symbol: str = Field("BTCUSDT", min_length=2, max_length=20)
    interval: str = Field("1m", regex="^(1m|5m|15m|30m|1h|4h|1d)$")
    spend_quote: float = Field(10.0, gt=0, le=10000)
    dry_run_override: Optional[bool] = None   # None = use settings.DRY_RUN


class MultiSignalRequest(BaseModel):
    symbols: List[str] = Field(default=["BTCUSDT", "ETHUSDT", "BNBUSDT"])
    interval: str = Field("1m", regex="^(1m|5m|15m|30m|1h|4h|1d)$")


class AIAnalysisRequest(BaseModel):
    symbol: str = "BTCUSDT"
    interval: str = "1m"
    include_signal: bool = True


class RiskCheckRequest(BaseModel):
    symbol: str
    side: str = Field(..., regex="^(BUY|SELL)$")
    quantity: float = Field(..., gt=0)
    entry_price: float = Field(..., gt=0)
    stop_loss_pct: float = Field(2.0, gt=0, le=50)   # % below entry for BUY
    take_profit_pct: float = Field(4.0, gt=0, le=200) # % above entry for BUY
    account_balance_usdt: float = Field(1000.0, gt=0)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_client(request: Request):
    c = request.app.state.exchange_client
    if c is None:
        raise HTTPException(status_code=503, detail="Exchange client not ready")
    return c


async def _ask_gemini(prompt: str) -> str:
    """Call Gemini with fallback — returns plain text answer."""
    if not settings.GEMINI_API_KEY:
        return "AI analysis unavailable — GEMINI_API_KEY not set."

    models = [
        settings.GEMINI_MODEL or "gemini-2.5-flash-lite",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash",
        "gemini-2.5-flash",
    ]
    messages = [{"role": "user", "parts": [{"text": prompt}]}]

    async with httpx.AsyncClient(timeout=30.0) as http:
        for model in models:
            try:
                r = await http.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                    json={"contents": messages},
                    params={"key": settings.GEMINI_API_KEY},
                )
                if r.status_code == 200:
                    data = r.json()
                    parts = data["candidates"][0]["content"]["parts"]
                    return " ".join(p["text"] for p in parts if "text" in p)
            except Exception:
                continue
    return "AI analysis temporarily unavailable."


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/scan", dependencies=[Depends(require_admin)])
async def multi_symbol_scan(req: MultiSignalRequest, request: Request):
    """
    Scan multiple symbols at once and return signals for all.
    Useful for finding the best opportunity across your watchlist.
    """
    client = _get_client(request)
    results = []
    for sym in req.symbols[:20]:  # cap at 20
        try:
            klines = client.get_klines(sym, req.interval, 100)
            sig = get_signal(klines)
            results.append({"symbol": sym, **sig})
        except Exception as exc:
            results.append({"symbol": sym, "signal": "ERROR", "reason": str(exc)})

    # Sort: BUY first, then SELL, then HOLD
    order = {"BUY": 0, "SELL": 1, "HOLD": 2, "ERROR": 3}
    results.sort(key=lambda x: order.get(x["signal"], 3))
    return {"interval": req.interval, "count": len(results), "results": results}


@router.post("/auto-trade", dependencies=[Depends(require_admin)])
async def auto_trade(cfg: AutoTradeConfig, request: Request, db: Session = Depends(get_db)):
    """
    Run strategy signal and auto-place order if signal is BUY or SELL.
    Respects DRY_RUN unless dry_run_override is set.
    """
    client = _get_client(request)

    # Temporarily override DRY_RUN if requested
    original_dry_run = settings.DRY_RUN
    if cfg.dry_run_override is not None:
        settings.DRY_RUN = cfg.dry_run_override  # type: ignore

    try:
        result = run_signal_and_place(
            db=db,
            client=client,
            symbol=cfg.symbol,
            interval=cfg.interval,
            spend_quote=cfg.spend_quote,
        )
    finally:
        settings.DRY_RUN = original_dry_run  # type: ignore

    return result


@router.post("/ai-analysis", dependencies=[Depends(require_admin)])
async def ai_analysis(req: AIAnalysisRequest, request: Request):
    """
    Get AI-powered market analysis for a symbol.
    Combines live signal data with Gemini's market insight.
    """
    client = _get_client(request)

    signal_data: Dict[str, Any] = {}
    if req.include_signal:
        try:
            klines = client.get_klines(req.symbol, req.interval, 100)
            signal_data = get_signal(klines)
        except Exception as exc:
            signal_data = {"error": str(exc)}

    # Build a rich prompt with live data
    prompt = f"""You are a professional crypto trading analyst. Analyze the following live market data and provide a concise trading recommendation.

Symbol: {req.symbol}
Interval: {req.interval}
Current Signal: {signal_data.get('signal', 'N/A')}
Current Price: {signal_data.get('price', 'N/A')}
EMA20: {signal_data.get('ema', 'N/A')}
RSI(14): {signal_data.get('rsi', 'N/A')}

Strategy rules:
- BUY: price crosses above EMA20 AND RSI < 30 (oversold)
- SELL: price crosses below EMA20 AND RSI > 70 (overbought)
- HOLD: no clear signal

Provide:
1. Signal interpretation (2-3 sentences)
2. Key risk factors to watch
3. Suggested action with reasoning
4. Confidence level (Low/Medium/High)

Keep response under 200 words. Be direct and actionable."""

    analysis = await _ask_gemini(prompt)

    return {
        "symbol": req.symbol,
        "interval": req.interval,
        "signal_data": signal_data,
        "ai_analysis": analysis,
    }


@router.post("/risk-check")
async def risk_check(req: RiskCheckRequest):
    """
    Calculate risk/reward metrics for a potential trade.
    Returns stop-loss price, take-profit price, position size, and R:R ratio.
    """
    entry = req.entry_price
    balance = req.account_balance_usdt
    side = req.side.upper()

    if side == "BUY":
        stop_loss_price  = entry * (1 - req.stop_loss_pct / 100)
        take_profit_price = entry * (1 + req.take_profit_pct / 100)
    else:
        stop_loss_price  = entry * (1 + req.stop_loss_pct / 100)
        take_profit_price = entry * (1 - req.take_profit_pct / 100)

    risk_per_unit   = abs(entry - stop_loss_price)
    reward_per_unit = abs(take_profit_price - entry)
    rr_ratio        = reward_per_unit / risk_per_unit if risk_per_unit > 0 else 0

    # Max position size based on 2% account risk rule
    max_risk_usdt   = balance * 0.02
    max_qty_by_risk = max_risk_usdt / risk_per_unit if risk_per_unit > 0 else 0
    trade_value     = req.quantity * entry
    actual_risk     = req.quantity * risk_per_unit
    risk_pct_of_bal = (actual_risk / balance) * 100 if balance > 0 else 0

    return {
        "symbol": req.symbol,
        "side": side,
        "entry_price": entry,
        "stop_loss_price": round(stop_loss_price, 4),
        "take_profit_price": round(take_profit_price, 4),
        "risk_reward_ratio": round(rr_ratio, 2),
        "trade_value_usdt": round(trade_value, 2),
        "risk_usdt": round(actual_risk, 2),
        "risk_pct_of_balance": round(risk_pct_of_bal, 2),
        "max_qty_2pct_rule": round(max_qty_by_risk, 6),
        "recommendation": (
            "Good R:R ratio (>= 2:1)" if rr_ratio >= 2 else
            "Low R:R ratio — consider adjusting targets"
        ),
        "risk_warning": (
            "Risk exceeds 2% of balance — reduce position size" if risk_pct_of_bal > 2 else
            "Risk within 2% rule"
        ),
    }


@router.get("/summary", dependencies=[Depends(require_admin)])
async def automation_summary(request: Request, db: Session = Depends(get_db)):
    """
    Dashboard summary: scan top 5 symbols + poller status + recent trade count.
    """
    client = _get_client(request)
    poller = request.app.state.poller

    # Quick scan of top 5
    top_symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"]
    signals = []
    for sym in top_symbols:
        try:
            klines = client.get_klines(sym, "1m", 100)
            sig = get_signal(klines)
            signals.append({"symbol": sym, **sig})
        except Exception:
            signals.append({"symbol": sym, "signal": "ERROR"})

    from backend.models.db import Trade
    from datetime import datetime, timedelta
    since = datetime.utcnow() - timedelta(hours=24)
    recent_trades = db.query(Trade).filter(Trade.timestamp >= since).count()

    return {
        "poller_running": poller.is_running if poller else False,
        "poller_symbol": settings.SYMBOL,
        "recent_trades_24h": recent_trades,
        "top_signals": signals,
    }
