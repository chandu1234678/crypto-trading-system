# backend/schemas.py
from pydantic import BaseModel
from typing import List, Any, Optional
from datetime import datetime

class KlineResponse(BaseModel):
    symbol: str
    interval: str
    data: List[Any]

class OrderRequest(BaseModel):
    symbol: str
    side: str
    quantity: float

class OrderResult(BaseModel):
    status: str
    order: Optional[dict]

class TradeOut(BaseModel):
    id: int
    timestamp: datetime
    symbol: str
    side: str
    quantity: float
    price: Optional[float]
    status: str
    details: Optional[str]
