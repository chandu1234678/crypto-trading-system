# backend/api/market.py
from fastapi import APIRouter, HTTPException, Request

from backend.schemas import KlinesResponse, TickerResponse, OrderBookResponse, SignalResponse
from backend.services.strategy_service import get_signal

router = APIRouter(prefix="/market", tags=["Market Data"])


def _get_client(request: Request):
    client = request.app.state.exchange_client
    if client is None:
        raise HTTPException(status_code=503, detail="Exchange client not ready")
    return client


@router.get("/klines", response_model=KlinesResponse)
def klines(request: Request, symbol: str, interval: str, limit: int = 50):
    """Fetch OHLCV candlestick data."""
    client = _get_client(request)
    data = client.get_klines(symbol, interval, limit)
    return KlinesResponse(symbol=symbol, interval=interval, count=len(data), data=data)


@router.get("/ticker", response_model=TickerResponse)
def ticker(request: Request, symbol: str):
    """Get latest price for a symbol."""
    client = _get_client(request)
    result = client.get_ticker_price(symbol)
    return TickerResponse(symbol=result["symbol"], price=result["price"])


@router.get("/orderbook", response_model=OrderBookResponse)
def order_book(request: Request, symbol: str, limit: int = 20):
    """Get current order book depth."""
    client = _get_client(request)
    book = client.get_order_book(symbol, limit)
    return OrderBookResponse(symbol=symbol, bids=book["bids"], asks=book["asks"])


@router.get("/signal", response_model=SignalResponse)
def signal(request: Request, symbol: str = "BTCUSDT", interval: str = "1m"):
    """Run strategy and return current signal."""
    client = _get_client(request)
    data = client.get_klines(symbol, interval, 100)
    return get_signal(data)


@router.get("/exchange-info")
def exchange_info(request: Request, symbol: str = None):
    """Get exchange/symbol trading rules."""
    client = _get_client(request)
    return client.get_exchange_info(symbol)
