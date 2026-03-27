// ui/src/api.js
const BASE = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
const TOKEN = import.meta.env.VITE_ADMIN_TOKEN || "admin123";

async function req(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "x-admin-token": TOKEN },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail ?? detail; } catch (_) {}
    throw new Error(`${res.status}: ${detail}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

const api = {
  health: ()                          => req("/health"),
  klines: (symbol, interval, limit)   => req(`/api/v1/market/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`),
  ticker: (symbol)                    => req(`/api/v1/market/ticker?symbol=${symbol}`),
  orderBook: (symbol, limit = 10)     => req(`/api/v1/market/orderbook?symbol=${symbol}&limit=${limit}`),
  signal: (symbol = "BTCUSDT", interval = "1m") => req(`/api/v1/market/signal?symbol=${symbol}&interval=${interval}`),
  exchangeInfo: (symbol)              => req(`/api/v1/market/exchange-info${symbol ? `?symbol=${symbol}` : ""}`),
  placeOrder: (payload)               => req("/api/v1/trading/order", { method: "POST", body: payload }),
  runNow: ()                          => req("/api/v1/trading/run-now", { method: "POST" }),
  tradeHistory: (params = {})         => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null)).toString();
    return req(`/api/v1/trading/history${q ? `?${q}` : ""}`);
  },
  getTrade: (id)                      => req(`/api/v1/trading/history/${id}`),
  account: ()                         => req("/api/v1/account"),
  openOrders: (symbol)                => req(`/api/v1/account/orders/open${symbol ? `?symbol=${symbol}` : ""}`),
  cancelOrder: (symbol, orderId)      => req(`/api/v1/account/orders/${symbol}/${orderId}`, { method: "DELETE" }),
  exchangeTrades: (symbol, limit=50)  => req(`/api/v1/account/trades/${symbol}?limit=${limit}`),
  pollerStatus: ()                    => req("/api/v1/poller/status"),
  pollerStart: ()                     => req("/api/v1/poller/start", { method: "POST" }),
  pollerStop: ()                      => req("/api/v1/poller/stop", { method: "POST" }),
  chat: (q)                           => req("/api/v1/chat", { method: "POST", body: { q } }),
  chatModels: ()                      => req("/api/v1/chat/models"),
  scan: (symbols, interval)           => req("/api/v1/automation/scan", { method: "POST", body: { symbols, interval } }),
  autoTrade: (cfg)                    => req("/api/v1/automation/auto-trade", { method: "POST", body: cfg }),
  aiAnalysis: (symbol, interval)      => req("/api/v1/automation/ai-analysis", { method: "POST", body: { symbol, interval, include_signal: true } }),
  riskCheck: (payload)                => req("/api/v1/automation/risk-check", { method: "POST", body: payload }),
  automationSummary: ()               => req("/api/v1/automation/summary"),
};

if (typeof window !== "undefined") window._api = api;
export default api;
