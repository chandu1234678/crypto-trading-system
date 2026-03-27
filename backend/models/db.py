# backend/models/db.py
import os
from datetime import datetime
from typing import Generator
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from backend.config import settings

os.makedirs(os.path.join(os.path.abspath(os.getcwd()), "data"), exist_ok=True)

engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False}, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class Trade(Base):
    __tablename__ = "trades"
    id       = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    symbol   = Column(String(32), index=True)
    side     = Column(String(8))
    quantity = Column(Float)
    price    = Column(Float, nullable=True)
    status   = Column(String(32), default="submitted", index=True)
    order_id = Column(String(64), nullable=True, index=True)
    details  = Column(Text, nullable=True)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
