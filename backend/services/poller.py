# backend/services/poller.py
import logging
import threading
import time
from backend.config import settings
from backend.services.strategy_service import get_signal

log = logging.getLogger(__name__)


class Poller:
    def __init__(self, client) -> None:
        self.client = client
        self.running = False
        self._thread: threading.Thread | None = None
        self._lock = threading.Lock()

    @property
    def is_running(self) -> bool:
        return self.running and self._thread is not None and self._thread.is_alive()

    def _loop(self) -> None:
        log.info("Poller started — symbol=%s interval=%ds", settings.SYMBOL, settings.POLL_INTERVAL)
        while self.running:
            try:
                klines = self.client.get_klines(settings.SYMBOL, "1m", 100)
                sig = get_signal(klines)
                log.info("Poller signal: %s", sig)
            except Exception:
                log.exception("Poller iteration error — continuing")
            time.sleep(settings.POLL_INTERVAL)
        log.info("Poller stopped")

    def start(self) -> None:
        with self._lock:
            if self.is_running:
                return
            self.running = True
            self._thread = threading.Thread(target=self._loop, daemon=True, name="poller")
            self._thread.start()

    def stop(self) -> None:
        with self._lock:
            self.running = False
