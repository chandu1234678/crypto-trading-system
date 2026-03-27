# backend/services/exchange_client.py
import logging
import time
from typing import Any, Dict, List, Optional
from binance.client import Client
from binance.exceptions import BinanceAPIException, BinanceRequestException
from backend.config import settings

log = logging.getLogger(__name__)
_MAX_RETRIES = 3


def _with_retry(fn, *args, **kwargs):
    last_exc = None
    for attempt in range(_MAX_RETRIES):
        try:
            return fn(*args, **kwargs)
        except BinanceRequestException as exc:
            last_exc = exc
            time.sleep(1.0 * (2 ** attempt))
        except BinanceAPIException:
            raise
    raise last_exc  # type: ignore


class ExchangeClient:
    def __init__(self) -> None:
        if not settings.API_KEY or not settings.API_SECRET:
            log.warning("ExchangeClient: empty API_KEY / API_SECRET")
        self.client = Client(api_key=settings.API_KEY, api_secret=settings.API_SECRET, testnet=True)
        if settings.API_BASE_URL:
            self.client.API_URL = settings.API_BASE_URL
        log.info("ExchangeClient ready — base_url=%s", self.client.API_URL)

    def get_klines(self, symbol: str, interval: str, limit: int = 100) -> List[Any]:
        return _with_retry(self.client.get_klines, symbol=symbol, interval=interval, limit=limit)

    def get_ticker_price(self, symbol: str) -> Dict[str, Any]:
        return _with_retry(self.client.get_symbol_ticker, symbol=symbol)

    def get_order_book(self, symbol: str, limit: int = 20) -> Dict[str, Any]:
        return _with_retry(self.client.get_order_book, symbol=symbol, limit=limit)

    def get_exchange_info(self, symbol: Optional[str] = None) -> Dict[str, Any]:
        if symbol:
            return _with_retry(self.client.get_symbol_info, symbol)
        return _with_retry(self.client.get_exchange_info)

    def get_account(self) -> Dict[str, Any]:
        return _with_retry(self.client.get_account)

    def get_open_orders(self, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        params: Dict[str, Any] = {}
        if symbol:
            params["symbol"] = symbol
        return _with_retry(self.client.get_open_orders, **params)

    def get_order(self, symbol: str, order_id: int) -> Dict[str, Any]:
        return _with_retry(self.client.get_order, symbol=symbol, orderId=order_id)

    def cancel_order(self, symbol: str, order_id: int) -> Dict[str, Any]:
        return _with_retry(self.client.cancel_order, symbol=symbol, orderId=order_id)

    def get_trade_history(self, symbol: str, limit: int = 50) -> List[Dict[str, Any]]:
        return _with_retry(self.client.get_my_trades, symbol=symbol, limit=limit)

    def create_order(self, *, symbol: str, side: str, type: str,
                     quantity: Optional[float] = None, price: Optional[float] = None,
                     time_in_force: Optional[str] = None, test: bool = True) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"symbol": symbol, "side": side, "type": type}
        if quantity is not None:
            payload["quantity"] = quantity
        if price is not None:
            payload["price"] = price
        if time_in_force is not None:
            payload["timeInForce"] = time_in_force
        log.info("create_order test=%s payload=%s", test, payload)
        if test:
            return _with_retry(self.client.create_test_order, **payload)
        return _with_retry(self.client.create_order, **payload)
