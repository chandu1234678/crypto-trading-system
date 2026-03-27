// ui/src/App.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import api from "./api";
import Dashboard  from "./components/Dashboard";
import Trading    from "./components/Trading";
import Assistant  from "./components/Assistant";
import Automation from "./components/Automation";
import Toast      from "./components/Toast";

const NAV = [
  { id: "dashboard",  label: "Dashboard",    icon: "◈" },
  { id: "trading",    label: "Trading",      icon: "⇅" },
  { id: "automation", label: "Automation",   icon: "⚡" },
  { id: "assistant",  label: "AI Assistant", icon: "✦" },
];

let _toastId = 0;

export default function App() {
  const [tab,    setTab]    = useState("dashboard");
  const [toasts, setToasts] = useState([]);
  const [health, setHealth] = useState(null);
  const [signal, setSignal] = useState(null);
  const timerRef = useRef(null);

  const toast = useCallback((type, msg) => {
    const id = ++_toastId;
    setToasts(t => [...t, { id, type, msg }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  useEffect(() => {
    async function tick() {
      try { setHealth(await api.health()); } catch (_) {}
      try { setSignal(await api.signal("BTCUSDT", "1m")); } catch (_) {}
    }
    tick();
    timerRef.current = setInterval(tick, 30000);
    return () => clearInterval(timerRef.current);
  }, []);

  const sig      = signal?.signal ?? "…";
  const sigClass = sig === "BUY" ? "buy" : sig === "SELL" ? "sell" : "hold";
  const btcPrice = signal?.price
    ? parseFloat(signal.price).toLocaleString(undefined, { minimumFractionDigits: 2 })
    : "--";

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">CTP<span>·BOT</span></div>
        {NAV.map(n => (
          <button key={n.id} className={`nav-item ${tab === n.id ? "active" : ""}`}
            onClick={() => setTab(n.id)}>
            <span className="nav-icon">{n.icon}</span>
            {n.label}
          </button>
        ))}
        <div className="sidebar-footer">
          <div style={{ marginBottom:6 }}>
            <span className={`health-dot ${health?.exchange_connected ? "ok" : "err"}`} />
            <span className="health-label">
              {health ? (health.exchange_connected ? "Exchange OK" : "Exchange down") : "Connecting…"}
            </span>
          </div>
          <div style={{ paddingLeft:14, display:"flex", flexDirection:"column", gap:2 }}>
            <span className="health-label">
              DB: <span style={{ color: health?.db_connected ? "var(--green)" : "var(--red)" }}>
                {health?.db_connected ? "✓" : "✗"}
              </span>
            </span>
            <span className="health-label">
              Poller: <span style={{ color: health?.poller_running ? "var(--green)" : "var(--muted)" }}>
                {health?.poller_running ? "on" : "off"}
              </span>
            </span>
            <span className="health-label" style={{ color:"var(--muted)", marginTop:4, fontSize:10 }}>
              {import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000"}
            </span>
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Crypto Trade Professional</div>
            <div className="topbar-sub">Binance Spot Testnet · live data</div>
          </div>
          <div className="topbar-pills">
            <span className={`pill ${sigClass}`}>BTC {sig}</span>
            <span className="pill">{btcPrice}</span>
            {signal?.rsi != null && (
              <span className="pill">RSI {Number(signal.rsi).toFixed(1)}</span>
            )}
            <span className={`pill ${health?.status === "ok" ? "" : "sell"}`}>
              {health?.status ?? "…"}
            </span>
          </div>
        </div>

        {tab === "dashboard"  && <Dashboard  toast={toast} />}
        {tab === "trading"    && <Trading    toast={toast} />}
        {tab === "automation" && <Automation toast={toast} />}
        {tab === "assistant"  && <Assistant  toast={toast} />}
      </div>

      <Toast toasts={toasts} remove={removeToast} />
    </div>
  );
}
