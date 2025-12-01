# backend/logging_config.py
from loguru import logger
import sys
from backend.config import settings
import os

LOG_DIR = os.path.join(os.getcwd(), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

logger.remove()  # remove default
logger.add(sys.stderr, level=settings.LOG_LEVEL)
logger.add(os.path.join(LOG_DIR, "app.log"), rotation="10 MB", retention="14 days", level=settings.LOG_LEVEL)
