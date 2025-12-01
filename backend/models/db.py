# backend/models/db.py
import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.config import settings

# ensure data folder exists
cwd = os.path.abspath(os.getcwd())
os.makedirs(os.path.join(cwd, "data"), exist_ok=True)

engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

class Trade(Base):
    __tablename__ = "trades"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    symbol = Column(String(32), index=True)
    side = Column(String(8))
    quantity = Column(Float)
    price = Column(Float, nullable=True)
    status = Column(String(32), default="submitted")
    details = Column(Text, nullable=True)

def init_db():
    Base.metadata.create_all(bind=engine)
