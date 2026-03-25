# backend/api/account.py
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request

from backend.schemas import AccountResponse, OpenOrdersResponse
from backend.api.deps import require_admin

log = logging.getLogger(__name__)
router = APIRouter(prefix="/account", tags=["Account"])


def _get_client(request: Request):
    client = request.app.state.exchange_client
    if client is None:
        raise HTTPException(status_code=503, detail="Exchange client not ready")
    return client


@router.get("", response_model=AccountResponse, dependencies=[Depends(require_admin)])
def get_account(request: Request):
    """Get account balances (non-zero only)."""
    client = _get_client(request)
    try:
        acc = client.get_account()
    except Exception as exc:
        log.exception("get_account failed")
        raise HTTPException(status_code=502, detail=str(exc))

    balances = [
        b for b in acc.get("balances", [])
        if float(b.get("free", "0")) > 0 or float(b.get("locked", "0")) > 0
    ]
    return AccountResponse(balances=balances, raw=acc)


@router.get("/orders/open", response_model=OpenOrdersResponse, dependencies=[Depends(require_admin)])
def open_orders(request: Request, symbol: Optional[str] = None):
    """Get all open orders, optionally filtered by symbol."""
    client = _get_client(request)
    try:
        orders = client.get_open_orders(symbol=symbol)
    except Exception as exc:
        log.exception("get_open_orders failed")
        raise HTTPException(status_code=502, detail=str(exc))
    return OpenOrdersResponse(value=orders, count=len(orders))


@router.get("/orders/{symbol}/{order_id}", dependencies=[Depends(require_admin)])
def get_order(symbol: str, order_id: int, request: Request):
    """Get a specific order by symbol and order ID."""
    client = _get_client(request)
    try:
        return client.get_order(symbol.upper(), order_id)
    except Exception as exc:
        log.exception("get_order failed")
        raise HTTPException(status_code=502, detail=str(exc))


@router.delete("/orders/{symbol}/{order_id}", dependencies=[Depends(require_admin)])
def cancel_order(symbol: str, order_id: int, request: Request):
    """Cancel an open order."""
    client = _get_client(request)
    try:
        return client.cancel_order(symbol.upper(), order_id)
    except Exception as exc:
        log.exception("cancel_order failed")
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/trades/{symbol}", dependencies=[Depends(require_admin)])
def trade_history_exchange(symbol: str, request: Request, limit: int = 50):
    """Get trade history from the exchange for a symbol."""
    client = _get_client(request)
    try:
        return client.get_trade_history(symbol.upper(), limit)
    except Exception as exc:
        log.exception("get_trade_history failed")
        raise HTTPException(status_code=502, detail=str(exc))
