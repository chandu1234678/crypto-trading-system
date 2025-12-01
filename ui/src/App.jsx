import { useState } from "react";
import api from "./api";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

function Sidebar({ current, onChange }) {
  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "trading", label: "Trading" },
    { id: "assistant", label: "AI Assistant" }
  ];

  return (
    <aside className="sidebar">
      <div className="nav-section">
        <div className="nav-label">Sections</div>
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`nav-btn ${current === t.id ? "active" : ""}`}
            onClick={() => onChange(t.id)}
          >
            <span className="dot" />
            {t.label}
          </button>
        ))}
      </div>
      <div className="nav-footer">
        Backend URL: <br />
        {BACKEND_URL}
      </div>
    </aside>
  );
}

/* -------- DASHBOARD PAGE -------- */

function DashboardPage({ setGlobalAlert }) {
  const [signal, setSignal] = useState(null);
  const [signalLoading, setSignalLoading] = useState(false);

  const [account, setAccount] = useState(null);
  const [accountLoading, setAccountLoading] = useState(false);

  const [orders, setOrders] = useState(null);
  const [ordersLoading, setOrdersLoading] = useState(false);

  async function loadSignal() {
    setSignalLoading(true);
    try {
      const res = await api.getSignal();
      setSignal(res);
      setGlobalAlert({ type: "ok", text: "Signal updated." });
    } catch (err) {
      setGlobalAlert({ type: "err", text: err.message });
    } finally {
      setSignalLoading(false);
    }
  }

  async function loadAccount() {
    setAccountLoading(true);
    try {
      const res = await api.getAccount();
      setAccount(res);
      setGlobalAlert({ type: "ok", text: "Account loaded." });
    } catch (err) {
      setGlobalAlert({ type: "err", text: err.message });
    } finally {
      setAccountLoading(false);
    }
  }

  async function loadOrders() {
    setOrdersLoading(true);
    try {
      const res = await api.getOrders();
      setOrders(res);
      setGlobalAlert({ type: "ok", text: "Open orders loaded." });
    } catch (err) {
      setGlobalAlert({ type: "err", text: err.message });
    } finally {
      setOrdersLoading(false);
    }
  }

  return (
    <div className="content">
      <div>
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">
          Quick view of market signal, balances and open orders.
        </div>
      </div>

      <div className="card-grid">

        {/* Market Snapshot */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Market Snapshot</div>
              <div className="card-meta">BTCUSDT · 1m</div>
            </div>
            <button className="btn btn-primary" onClick={loadSignal} disabled={signalLoading}>
              {signalLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          <div className="metric-row">
            <div>
              <div className="metric-label">Signal</div>
              <div className="metric-value">{signal?.signal || "--"}</div>
            </div>
            <div>
              <div className="metric-label">Price</div>
              <div className="metric-value">
                {signal ? Number(signal.price).toFixed(2) : "--"}
              </div>
            </div>
            <div>
              <div className="metric-label">RSI</div>
              <div className="metric-value">
                {signal ? Number(signal.rsi).toFixed(2) : "--"}
              </div>
            </div>
          </div>
        </div>

        {/* Account balances */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Account Balances</div>
              <div className="card-meta">Binance Spot Testnet</div>
            </div>
            <button className="btn btn-ghost" onClick={loadAccount} disabled={accountLoading}>
              {accountLoading ? "Loading…" : "Refresh"}
            </button>
          </div>

          <div style={{ maxHeight: 150, overflow: "auto" }}>
            {account?.balances ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Asset</th><th>Free</th><th>Locked</th>
                  </tr>
                </thead>
                <tbody>
                  {account.balances
                    .filter(b => Number(b.free) > 0 || Number(b.locked) > 0)
                    .slice(0,8)
                    .map(b => (
                      <tr key={b.asset}>
                        <td>{b.asset}</td>
                        <td>{b.free}</td>
                        <td>{b.locked}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : <div>No data yet.</div>}
          </div>
        </div>
      </div>

      {/* Orders */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Open Orders</div>
            <div className="card-meta">BTCUSDT</div>
          </div>
          <button className="btn btn-ghost" onClick={loadOrders} disabled={ordersLoading}>
            {ordersLoading ? "Loading…" : "Refresh"}
          </button>
        </div>

        <div style={{ maxHeight: 180, overflow: "auto" }}>
          {orders?.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th><th>Side</th><th>Price</th><th>Qty</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.orderId}>
                    <td>{o.orderId}</td>
                    <td>{o.side}</td>
                    <td>{o.price}</td>
                    <td>{o.origQty}</td>
                    <td>{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div>No open orders.</div>}
        </div>
      </div>
    </div>
  );
}

/* -------- TRADING PAGE -------- */

function TradingPage({ setGlobalAlert }) {
  const [side, setSide] = useState("BUY");
  const [qty, setQty] = useState("0.001");
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);

  async function submitTrade() {
    setExecuting(true);
    setResult(null);

    try {
      const res = await api.trade(side, Number(qty));
      setResult(res);
      setGlobalAlert({ type: "ok", text: "Trade executed." });
    } catch (err) {
      setGlobalAlert({ type: "err", text: err.message });
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="content">
      <div className="page-title">Trading</div>
      <div className="card">
        <div className="card-header">Place Test Order</div>

        <div className="row">
          <button className="btn btn-buy" onClick={() => setSide("BUY")}>BUY</button>
          <button className="btn btn-sell" onClick={() => setSide("SELL")}>SELL</button>
        </div>

        <input
          className="input"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />

        <button className="btn btn-primary" onClick={submitTrade} disabled={executing}>
          {executing ? "Sending…" : "Execute"}
        </button>
      </div>

      {result && (
        <pre>{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}

/* -------- AI ASSISTANT -------- */

function AssistantPage({ setGlobalAlert }) {
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await api.chat(input);
      setAnswer(res.answer);
      setGlobalAlert({ type: "ok", text: "AI Responded" });
    } catch (err) {
      setGlobalAlert({ type: "err", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="content">
      <textarea value={input} onChange={(e)=>setInput(e.target.value)} />
      <button className="btn btn-primary" onClick={send} disabled={loading}>
        {loading ? "Thinking..." : "Send"}
      </button>
      {answer && <pre>{answer}</pre>}
    </div>
  );
}

/* -------- ROOT APP -------- */

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [alert, setAlert] = useState(null);

  function pushAlert(a) {
    setAlert(a);
    setTimeout(() => setAlert(null), 5000);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">CTP<span>·BOT</span></div>
        <div className="backend-pill">{BACKEND_URL}</div>
      </header>

      {alert && (
        <div className={`alert ${alert.type === "ok" ? "alert-ok" : "alert-err"}`}>
          {alert.text}
        </div>
      )}

      <main className="app-main">
        <Sidebar current={tab} onChange={setTab} />
        {tab === "dashboard" && <DashboardPage setGlobalAlert={pushAlert} />}
        {tab === "trading" && <TradingPage setGlobalAlert={pushAlert} />}
        {tab === "assistant" && <AssistantPage setGlobalAlert={pushAlert} />}
      </main>
    </div>
  );
}
