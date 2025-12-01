// ui/src/api.js
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
const ADMIN_TOKEN =
  import.meta.env.VITE_ADMIN_TOKEN || "admin123";

// ---------- low-level request helper ----------
async function request(path, { method = "GET", body = undefined } = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": ADMIN_TOKEN,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    // this is what you see in the red banner
    throw new Error(`Backend error: ${res.status} → ${text}`);
  }

  // 204 No Content safety, but we always return JSON
  if (res.status === 204) return null;
  return res.json();
}

// ---------- high-level API ----------
const api = {
  // health
  testConnection() {
    return request("/");
  },

  // strategy signal
  signal() {
    // GET /strategy/signal?symbol=BTCUSDT&interval=1m
    return request("/strategy/signal?symbol=BTCUSDT&interval=1m");
  },

  // account
  account() {
    return request("/account");
  },

  // open orders
  openOrders(symbol = "BTCUSDT") {
    const q = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
    return request(`/open-orders${q}`);
  },

  // trade
  trade(payload) {
    // payload must be an object, example:
    // { symbol: "BTCUSDT", side: "BUY", type: "MARKET", quantity: 0.001, force_execute: true }
    return request("/trade", { method: "POST", body: payload });
  },

  // AI chat
  chat(q) {
    return request("/chat", { method: "POST", body: { q } });
  },
};

// Expose in devtools for manual testing
if (typeof window !== "undefined") {
  window.api = api;
  console.log("[ctp] window.api attached for dev console testing");
}

export default api;
