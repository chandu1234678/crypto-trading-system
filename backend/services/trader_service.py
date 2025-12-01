# backend/services/trader_service.py
import json
import pandas as pd
from backend.services.exchange_client import ExchangeClient
from backend.services.strategy_service import generate_signal
from backend.models.db import SessionLocal, Trade, init_db
from backend.config import settings

init_db()
exchange = ExchangeClient(settings.API_KEY, settings.API_SECRET, settings.API_BASE_URL)
db = SessionLocal()

def save_trade(symbol, side, quantity, price, status="submitted", details=None):
    t = Trade(symbol=symbol, side=side, quantity=quantity, price=price, status=status, details=details)
    db.add(t); db.commit(); db.refresh(t)
    return t

def run_signal_and_place(symbol="BTCUSDT", interval="1m", spend_quote=None, use_test=None):
    spend = spend_quote if spend_quote is not None else settings.SPEND_QUOTE
    use_test = True if use_test is None else use_test
    raw = exchange.get_klines(symbol, interval, limit=200)
    # raw is list-of-lists; close is index 4
    cols = ["open_time","open","high","low","close","volume","close_time","quote_asset_vol","num_trades","taker_base_vol","taker_quote_vol","ignore"]
    df = pd.DataFrame(raw, columns=cols)
    df["close"] = pd.to_numeric(df["close"], errors="coerce")

    sig = generate_signal(df)
    result = {"signal": sig, "action": "none"}

    if sig == "BUY":
        last_price = float(df["close"].iloc[-1])
        qty = round(spend / last_price, 8)
        order = exchange.place_market_order(symbol, "BUY", qty, use_test=use_test)
        t = save_trade(symbol, "BUY", qty, last_price, "submitted", json.dumps(order))
        result.update({"action":"buy", "quantity": qty, "price": last_price, "order": order, "trade_id": t.id})
    elif sig == "SELL":
        last_price = float(df["close"].iloc[-1])
        qty = round(spend / last_price, 8)
        order = exchange.place_market_order(symbol, "SELL", qty, use_test=use_test)
        t = save_trade(symbol, "SELL", qty, last_price, "submitted", json.dumps(order))
        result.update({"action":"sell", "quantity": qty, "price": last_price, "order": order, "trade_id": t.id})
    else:
        result.update({"action":"hold"})
    return result
