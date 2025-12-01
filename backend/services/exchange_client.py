# backend/services/exchange_client.py
import logging
from typing import Any, Dict, List, Optional

from binance.client import Client

from backend.config import settings

log = logging.getLogger(__name__)


class ExchangeClient:
    """
    Small wrapper around python-binance Client for Spot Testnet.
    """

    def __init__(self) -> None:
        if not settings.API_KEY or not settings.API_SECRET:
            log.warning("ExchangeClient created with empty API_KEY / API_SECRET")

        self.client = Client(
            api_key=settings.API_KEY,
            api_secret=settings.API_SECRET,
            testnet=True,
        )

        # Override base URL to whatever you configured (usually testnet)
        if settings.API_BASE_URL:
            self.client.API_URL = settings.API_BASE_URL
        log.info("ExchangeClient initialized with base_url=%s", self.client.API_URL)

    # ---------- Market data ----------

    def get_klines(self, symbol: str, interval: str, limit: int = 100) -> List[Dict[str, Any]]:
        return self.client.get_klines(symbol=symbol, interval=interval, limit=limit)

    # ---------- Account ----------

    def get_account(self) -> Dict[str, Any]:
        """
        Full account info (balances, etc)
        """
        return self.client.get_account()

    def get_open_orders(self, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Wrapper for GET /api/v3/openOrders

        Fix for your 502:
        'ExchangeClient' object has no attribute 'get_open_orders'
        """
        params: Dict[str, Any] = {}
        if symbol:
            params["symbol"] = symbol
        return self.client.get_open_orders(**params)

    # ---------- Orders ----------

    def create_order(
        self,
        *,
        symbol: str,
        side: str,
        type: str,
        quantity: Optional[float] = None,
        price: Optional[float] = None,
        time_in_force: Optional[str] = None,
        test: bool = True,
    ) -> Dict[str, Any]:
        """
        Place a real or test order.
        - test=True -> /order/test (no fill, used for testnet safety)
        """
        payload: Dict[str, Any] = {
            "symbol": symbol,
            "side": side,
            "type": type,
        }
        if quantity is not None:
            payload["quantity"] = quantity
        if price is not None:
            payload["price"] = price
        if time_in_force is not None:
            payload["timeInForce"] = time_in_force

        log.info("create_order(test=%s) payload=%s", test, payload)

        if test:
            return self.client.create_test_order(**payload)

        return self.client.create_order(**payload)
