# backend/api/trading.py
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.models.db import get_db, Trade
from backend.schemas import (
    TradeRequest, TradeResponse,
    TradeHistoryResponse, TradeOut,
    SignalResponse,
)
from backend.services.strategy_service import get_signal
from backend.services.trader_service import run_signal_and_place, save_trade
from backend.config import settings
from backend.api.deps import require_admin

log = logging.getLogger(__name__)
router = APIRouter(prefix="/trading", tags=["Trading"])


def _get_client(request: Request):
    client = request.app.state.exchange_client
    if client is None:
        raise HTTPException(status_code=503, detail="Exchange client not ready")
    return client


@router.post("/order", response_model=TradeResponse, dependencies=[Depends(require_admin)])
def place_order(req: TradeRequest, request: Request, db: Session = Depends(get_db)):
    """Place a market or limit order."""
    client = _get_client(request)

    payload = {
        "symbol": req.symbol,
        "side": req.side,
        "type": req.type,
        "quantity": req.quantity,
        "price": req.price,
        "timeInForce": req.timeInForce,
    }

    if not settings.USE_TEST_ORDER:
        return TradeResponse(
            executed=False, dry_run=True, intended_payload=payload,
            exchange_result={"error": "USE_TEST_ORDER is False — live orders disabled"},
        )

    do_execute = (not settings.DRY_RUN) or req.force_execute
    if not do_execute:
        return TradeResponse(executed=False, dry_run=True, intended_payload=payload)

    try:
        order_resp = client.create_order(
            symbol=req.symbol,
            side=req.side,
            type=req.type,
            quantity=req.quantity,
            price=req.price,
            time_in_force=req.timeInForce,
            test=True,
        )
    except Exception as exc:
        log.exception("Order placement failed")
        raise HTTPException(status_code=502, detail=str(exc))

    save_trade(
        db,
        symbol=req.symbol,
        side=req.side,
        quantity=req.quantity or 0,
        price=req.price,
        status="submitted",
        order_id=str(order_resp.get("orderId", "")),
        details=str(order_resp),
    )

    return TradeResponse(
        executed=True, dry_run=False,
        intended_payload=payload, exchange_result=order_resp,
    )


@router.post("/run-now", response_model=SignalResponse, dependencies=[Depends(require_admin)])
def run_now(request: Request, db: Session = Depends(get_db)):
    """Run strategy signal and optionally place order."""
    client = _get_client(request)
    result = run_signal_and_place(db, client, symbol=settings.SYMBOL)
    return result


@router.get("/history", response_model=TradeHistoryResponse, dependencies=[Depends(require_admin)])
def trade_history(
    db: Session = Depends(get_db),
    symbol: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
):
    """Paginated trade history from the database."""
    page_size = min(page_size, 100)
    query = db.query(Trade)
    if symbol:
        query = query.filter(Trade.symbol == symbol.upper())
    if status:
        query = query.filter(Trade.status == status)
    total = query.count()
    items = query.order_by(Trade.timestamp.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return TradeHistoryResponse(total=total, page=page, page_size=page_size, items=items)


@router.get("/history/{trade_id}", response_model=TradeOut, dependencies=[Depends(require_admin)])
def get_trade(trade_id: int, db: Session = Depends(get_db)):
    """Get a single trade record by ID."""
    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade
