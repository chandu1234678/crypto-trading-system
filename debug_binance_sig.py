# debug_binance_sig.py
import os, time, urllib.parse, hmac, hashlib
from dotenv import load_dotenv
load_dotenv(".env")

API_KEY = os.getenv("API_KEY", "").strip()
API_SECRET = os.getenv("API_SECRET", "").strip()
API_BASE_URL = os.getenv("API_BASE_URL", "https://testnet.binance.vision").strip()

if not API_KEY or not API_SECRET:
    print("ERROR: API_KEY or API_SECRET missing in .env")
    raise SystemExit(1)

ts = int(time.time() * 1000)
params = {"timestamp": ts}
qs = urllib.parse.urlencode(params, doseq=True)
sig = hmac.new(API_SECRET.encode("utf-8"), qs.encode("utf-8"), hashlib.sha256).hexdigest()
url = f"{API_BASE_URL.rstrip('/')}/api/v3/account?{qs}&signature={sig}"

print("API_BASE_URL:", API_BASE_URL)
print("Timestamp:", ts)
print("QueryString:", qs)
print("Signature:", sig)
print("Signed URL (no secret printed):")
print(url)
print("Header X-MBX-APIKEY:", API_KEY)
