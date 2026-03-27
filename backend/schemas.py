# backend/schemas.py
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, validator


class HealthResponse(BaseModel):
    status: str
    service: str
    env: str
    exchange_connected: bool
    poller_running: bool
    db_connected: bool


class KlinesResponse(BaseModel):
    symbol: str
    interval: str
    count: int
    data: List[Any]


class TickerResponse(BaseModel):
    symbol: str
    price: str


class OrderBookResponse(BaseModel):
    symbol: str
    bids: List[Any]
    asks: List[Any]


class SignalResponse(BaseModel):
    signal: str
    price: Optional[float] = None
    ema: Optional[float] = None
    rsi: Optional[float] = None
    reason: Optional[str] = None


class TradeRequest(BaseModel):
    symbol: str = Field(..., min_length=2, max_length=20)
    side: str = Field(..., regex="^(BUY|SELL)$")
    type: str = Field("MARKET", regex="^(MARKET|LIMIT)$")
    quantity: Optional[float] = Field(None, gt=0)
    price: Optional[float] = Field(None, gt=0)
    timeInForce: Optional[str] = Field("GTC", regex="^(GTC|IOC|FOK)$")
    force_execute: bool = False

    @validator("side", "type", pre=True)
    def to_upper(cls, v):
        return v.upper() if isinstance(v, str) else v


class TradeResponse(BaseModel):
    executed: bool
    dry_run: bool
    intended_payload: Dict[str, Any]
    exchange_result: Optional[Dict[str, Any]] = None


class TradeOut(BaseModel):
    id: int
    timestamp: datetime
    symbol: str
    side: str
    quantity: float
    price: Optional[float]
    status: str
    order_id: Optional[str]
    details: Optional[str]

    class Config:
        orm_mode = True


class TradeHistoryResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[TradeOut]


class AccountResponse(BaseModel):
    balances: List[Dict[str, Any]]
    raw: Dict[str, Any]


class OpenOrdersResponse(BaseModel):
    value: List[Dict[str, Any]]
    count: int


class PollerStatusResponse(BaseModel):
    running: bool
    symbol: str
    interval_seconds: int


class ChatRequest(BaseModel):
    q: str = Field(..., min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    answer: str
    raw: Optional[Dict[str, Any]] = None
