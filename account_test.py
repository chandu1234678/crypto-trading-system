from backend.services.exchange_client import ExchangeClient
import json, traceback

c = ExchangeClient()
try:
    ac = c.get_account()
    print(json.dumps(ac, indent=2))
except Exception:
    traceback.print_exc()
