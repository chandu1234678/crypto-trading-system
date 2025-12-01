import pandas as pd
from ta.momentum import RSIIndicator


def klines_to_df(klines):
    df = pd.DataFrame(klines, columns=[
        "open_time","open","high","low","close","volume",
        "close_time","quote_vol","num_trades","taker_base","taker_quote","ignore"
    ])
    df["close"] = pd.to_numeric(df["close"], errors="coerce")
    return df


def get_signal(klines):
    df = klines_to_df(klines)

    if df.shape[0] < 20:
        return {"signal": "HOLD", "reason": "not enough data"}

    df["ema20"] = df["close"].ewm(span=20, adjust=False).mean()
    df["rsi"] = RSIIndicator(df["close"], window=14).rsi()

    last = df.iloc[-1]
    prev = df.iloc[-2]

    price = float(last["close"])
    ema = float(last["ema20"])
    rsi = float(last["rsi"])

    # Buy rule
    if prev["close"] < prev["ema20"] and price > ema and rsi < 30:
        return {"signal": "BUY", "price": price, "ema": ema, "rsi": rsi}

    # Sell rule
    if prev["close"] > prev["ema20"] and price < ema and rsi > 70:
        return {"signal": "SELL", "price": price, "ema": ema, "rsi": rsi}

    return {"signal": "HOLD", "price": price, "ema": ema, "rsi": rsi}
