import threading
import time
from backend.config import settings
from backend.services.strategy_service import get_signal


class Poller:
    def __init__(self, client):
        self.client = client
        self.running = False
        self.thread = None

    def loop(self):
        while self.running:
            klines = self.client.get_klines(settings.SYMBOL, "1m", 100)
            sig = get_signal(klines)
            print("[POLLER]", sig)
            time.sleep(settings.POLL_INTERVAL)

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self.loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False
