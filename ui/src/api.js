// ui/src/api.js
const BASE = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

function getToken() { return localStorage.getItem("access_token") || ""; }
function getAdminToken() { return import.meta.env.VITE_ADMIN_TOKEN || "admin123"; }

async function req(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    headers["x-admin-token"] = getAdminToken();
  }
  const res = await fetch(`${BASE}${path}`, {
    method, headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    // Try refresh
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getToken()}`;
      const retry = await fetch(`${BASE}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
      if (retry.ok) return retry.status === 204 ? null : retry.json();
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.dispatchEvent(new Event("auth:logout"));
    throw new Error("Session expired — please log in again");
  }
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail ?? detail; } catch (_) {}
    throw new Error(`${res.status}: ${detail}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function tryRefresh() {
  const rt = localStorage.getItem("refresh_token");
  if (!rt) return false;
  try {
    const r = await fetch(`${BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: rt }),
    });
    if (!r.ok) return false;
    const data = await r.json();
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    return true;
  } catch { return false; }
}

// Form-encoded login (OAuth2 spec)
async function loginReq(email, password) {
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    let detail = "Login failed";
    try { detail = (await res.json()).detail ?? detail; } catch (_) {}
    throw new Error(detail);
  }
  return res.json();
}

const api = {
  // ── Auth ────────────────────────────────────────────────────────────────────
  login:          (email, password)   => loginReq(email, password),
  register:       (email, username, password) => req("/api/v1/auth/register", { method:"POST", body:{email,username,password}, auth:false }),
  me:             ()                  => req("/api/v1/auth/me"),
  forgotPassword: (email)             => req("/api/v1/auth/forgot-password", { method:"POST", body:{email}, auth:false }),
  resetPassword:  (token, new_password) => req("/api/v1/auth/reset-password", { method:"POST", body:{token,new_password}, auth:false }),
  changePassword: (current_password, new_password) => req("/api/v1/auth/change-password", { method:"POST", body:{current_password,new_password} }),
  saveExchangeKeys: (api_key, api_secret, api_base_url) => req("/api/v1/auth/keys/exchange", { method:"POST", body:{api_key,api_secret,api_base_url} }),
  deleteExchangeKeys: () => req("/api/v1/auth/keys/exchange", { method:"DELETE" }),
  saveGeminiKey:  (gemini_api_key, gemini_model) => req("/api/v1/auth/keys/gemini", { method:"POST", body:{gemini_api_key,gemini_model} }),
  deleteGeminiKey: () => req("/api/v1/auth/keys/gemini", { method:"DELETE" }),
  keysStatus:     ()                  => req("/api/v1/auth/keys/status"),

  // ── Health ──────────────────────────────────────────────────────────────────
  health: ()                          => req("/health", { auth:false }),

  // ── Market ──────────────────────────────────────────────────────────────────
  klines:       (symbol, interval, limit) => req(`/api/v1/market/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`),
  ticker:       (symbol)              => req(`/api/v1/market/ticker?symbol=${symbol}`),
  orderBook:    (symbol, limit=10)    => req(`/api/v1/market/orderbook?symbol=${symbol}&limit=${limit}`),
  signal:       (symbol="BTCUSDT", interval="1m") => req(`/api/v1/market/signal?symbol=${symbol}&interval=${interval}`),
  exchangeInfo: (symbol)              => req(`/api/v1/market/exchange-info${symbol?`?symbol=${symbol}`:""}`),

  // ── Trading ─────────────────────────────────────────────────────────────────
  placeOrder:   (payload)             => req("/api/v1/trading/order", { method:"POST", body:payload }),
  runNow:       ()                    => req("/api/v1/trading/run-now", { method:"POST" }),
  tradeHistory: (params={})           => { const q = new URLSearchParams(Object.entries(params).filter(([,v])=>v!=null)).toString(); return req(`/api/v1/trading/history${q?`?${q}`:""}`); },
  getTrade:     (id)                  => req(`/api/v1/trading/history/${id}`),

  // ── Account ─────────────────────────────────────────────────────────────────
  account:        ()                  => req("/api/v1/account"),
  openOrders:     (symbol)            => req(`/api/v1/account/orders/open${symbol?`?symbol=${symbol}`:""}`),
  cancelOrder:    (symbol, orderId)   => req(`/api/v1/account/orders/${symbol}/${orderId}`, { method:"DELETE" }),
  exchangeTrades: (symbol, limit=50)  => req(`/api/v1/account/trades/${symbol}?limit=${limit}`),

  // ── Poller ──────────────────────────────────────────────────────────────────
  pollerStatus: ()                    => req("/api/v1/poller/status"),
  pollerStart:  ()                    => req("/api/v1/poller/start", { method:"POST" }),
  pollerStop:   ()                    => req("/api/v1/poller/stop", { method:"POST" }),

  // ── Chat ────────────────────────────────────────────────────────────────────
  chat:       (q)                     => req("/api/v1/chat", { method:"POST", body:{q} }),
  chatModels: ()                      => req("/api/v1/chat/models"),

  // ── Automation ──────────────────────────────────────────────────────────────
  scan:               (symbols, interval) => req("/api/v1/automation/scan", { method:"POST", body:{symbols,interval} }),
  autoTrade:          (cfg)           => req("/api/v1/automation/auto-trade", { method:"POST", body:cfg }),
  aiAnalysis:         (symbol, interval) => req("/api/v1/automation/ai-analysis", { method:"POST", body:{symbol,interval,include_signal:true} }),
  riskCheck:          (payload)       => req("/api/v1/automation/risk-check", { method:"POST", body:payload }),
  automationSummary:  ()              => req("/api/v1/automation/summary"),
};

if (typeof window !== "undefined") window._api = api;
export default api;
