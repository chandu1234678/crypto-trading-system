# backend/services/trader_service.py
import json
import logging
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from backend.models.db import Trade
from backend.services.exchange_client import ExchangeClient
from backend.services.strategy_service import get_signal
from backend.config import settings

log = logging.getLogger(__name__)


def save_trade(db: Session, symbol: str, side: str, quantity: float,
               price: Optional[float], status: str = "submitted",
               order_id: Optional[str] = None, details: Optional[str] = None) -> Trade:
    trade = Trade(symbol=symbol, side=side, quantity=quantity, price=price,
                  status=status, order_id=order_id, details=details)
    db.add(trade)
    db.commit()
    db.refresh(trade)
    return trade


def run_signal_and_place(db: Session, client: ExchangeClient,
                         symbol: str = "BTCUSDT", interval: str = "1m",
                         spend_quote: Optional[float] = None) -> Dict[str, Any]:
    spend = spend_quote if spend_quote is not None else settings.SPEND_QUOTE
    raw = client.get_klines(symbol, interval, limit=200)
    sig_result = get_signal(raw)
    signal = sig_result.get("signal", "HOLD")
    result: Dict[str, Any] = {"signal": signal, "action": "none"}

    if signal in ("BUY", "SELL"):
        last_price = float(sig_result.get("price", 0))
        qty = round(spend / last_price, 8) if last_price > 0 else 0
        try:
            order = client.create_order(symbol=symbol, side=signal, type="MARKET",
                                        quantity=qty, test=settings.USE_TEST_ORDER)
            order_id = str(order.get("orderId", ""))
            trade = save_trade(db, symbol, signal, qty, last_price,
                               status="submitted", order_id=order_id, details=json.dumps(order))
            result.update({"action": signal.lower(), "quantity": qty, "price": last_price,
                           "order": order, "trade_id": trade.id})
        except Exception:
            log.exception("run_signal_and_place order failed")
            result["action"] = "error"
    else:
        result["action"] = "hold"
    return result
