# backend/services/strategy_service.py
from typing import Any, Dict, List
import pandas as pd
from ta.momentum import RSIIndicator
from backend.config import settings


def klines_to_df(klines: List[Any]) -> pd.DataFrame:
    df = pd.DataFrame(klines, columns=[
        "open_time","open","high","low","close","volume",
        "close_time","quote_vol","num_trades","taker_base","taker_quote","ignore",
    ])
    for col in ("open","high","low","close","volume"):
        df[col] = pd.to_numeric(df[col], errors="coerce")
    return df


def get_signal(klines: List[Any]) -> Dict[str, Any]:
    df = klines_to_df(klines)
    min_rows = max(settings.EMA_SPAN, settings.RSI_WINDOW) + 2
    if df.shape[0] < min_rows:
        return {"signal": "HOLD", "reason": "not enough data"}

    df["ema"] = df["close"].ewm(span=settings.EMA_SPAN, adjust=False).mean()
    df["rsi"] = RSIIndicator(df["close"], window=settings.RSI_WINDOW).rsi()

    last = df.iloc[-1]
    prev = df.iloc[-2]
    price = float(last["close"])
    ema   = float(last["ema"])
    rsi   = float(last["rsi"])

    if prev["close"] < prev["ema"] and price > ema and rsi < settings.RSI_OVERSOLD:
        return {"signal": "BUY",  "price": price, "ema": ema, "rsi": rsi}
    if prev["close"] > prev["ema"] and price < ema and rsi > settings.RSI_OVERBOUGHT:
        return {"signal": "SELL", "price": price, "ema": ema, "rsi": rsi}
    return {"signal": "HOLD", "price": price, "ema": ema, "rsi": rsi}
