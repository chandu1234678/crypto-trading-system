// ui/src/App.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import api from "./api";
import { useAuth } from "./context/AuthContext";
import Dashboard  from "./components/Dashboard";
import Trading    from "./components/Trading";
import Assistant  from "./components/Assistant";
import Automation from "./components/Automation";
import Settings   from "./components/Settings";
import LoginPage  from "./components/LoginPage";
import Toast      from "./components/Toast";

const NAV = [
  { id: "dashboard",  label: "Dashboard",    icon: "◈" },
  { id: "trading",    label: "Trading",      icon: "⇅" },
  { id: "automation", label: "Automation",   icon: "⚡" },
  { id: "assistant",  label: "AI Assistant", icon: "✦" },
  { id: "settings",   label: "Settings",     icon: "⚙" },
];

let _toastId = 0;

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();
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
    if (!user) return;
    async function tick() {
      try { setHealth(await api.health()); } catch (_) {}
      try { setSignal(await api.signal("BTCUSDT", "1m")); } catch (_) {}
    }
    tick();
    timerRef.current = setInterval(tick, 30000);
    return () => clearInterval(timerRef.current);
  }, [user]);

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
        background:"var(--bg)", color:"var(--muted)", fontSize:14 }}>
        <span className="spin" style={{ marginRight:8 }}>⟳</span> Loading…
      </div>
    );
  }

  // Not logged in — show login page
  if (!user) {
    return (
      <>
        <LoginPage toast={toast} />
        <Toast toasts={toasts} remove={removeToast} />
      </>
    );
  }

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
          {/* User info */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10,
            padding:"8px 10px", background:"var(--bg-input)", borderRadius:8 }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:"var(--accent-soft)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:12, fontWeight:700, color:"var(--accent)", flexShrink:0 }}>
              {user.username?.[0]?.toUpperCase()}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {user.username}
              </div>
              {user.is_admin && <div style={{ fontSize:10, color:"var(--accent)" }}>Admin</div>}
            </div>
          </div>
          {/* Health */}
          <div style={{ marginBottom:4 }}>
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
            {signal?.rsi != null && <span className="pill">RSI {Number(signal.rsi).toFixed(1)}</span>}
            <span className={`pill ${health?.status === "ok" ? "" : "sell"}`}>{health?.status ?? "…"}</span>
          </div>
        </div>

        {tab === "dashboard"  && <Dashboard  toast={toast} />}
        {tab === "trading"    && <Trading    toast={toast} />}
        {tab === "automation" && <Automation toast={toast} />}
        {tab === "assistant"  && <Assistant  toast={toast} />}
        {tab === "settings"   && <Settings   toast={toast} />}
      </div>

      <Toast toasts={toasts} remove={removeToast} />
    </div>
  );
}
