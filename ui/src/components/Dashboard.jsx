// ui/src/components/Dashboard.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import api from "../api";

const SYMBOLS = [
  "BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT",
  "ADAUSDT","DOGEUSDT","AVAXUSDT","DOTUSDT","MATICUSDT",
  "LTCUSDT","LINKUSDT","UNIUSDT","ATOMUSDT","NEARUSDT",
  "APTUSDT","ARBUSDT","OPUSDT","INJUSDT","SUIUSDT",
];
const INTERVALS = ["1m","5m","15m","30m","1h","4h","1d"];

// Throttled watchlist — fetches sequentially with 150ms gap to avoid rate limits
function useWatchlistPrices() {
  const [prices, setPrices] = useState({});
  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      for (const sym of SYMBOLS) {
        if (cancelled) break;
        try {
          const r = await api.ticker(sym);
          if (!cancelled) setPrices(p => ({ ...p, [sym]: parseFloat(r.price) }));
        } catch (_) {}
        await new Promise(res => setTimeout(res, 150));
      }
    }
    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);
  return prices;
}

function sigColor(s) {
  if (s === "BUY")  return "var(--green)";
  if (s === "SELL") return "var(--red)";
  return "var(--yellow)";
}

export default function Dashboard({ toast }) {
  const [symbol,   setSymbol]   = useState("BTCUSDT");
  const [interval, setInterval] = useState("1m");
  const [ticker,   setTicker]   = useState(null);
  const [signal,   setSignal]   = useState(null);
  const [klines,   setKlines]   = useState([]);
  const [account,  setAccount]  = useState(null);
  const [orders,   setOrders]   = useState(null);
  const [loading,  setLoading]  = useState({});
  const watchPrices = useWatchlistPrices();

  const load = useCallback(async (key, fn) => {
    setLoading(l => ({ ...l, [key]: true }));
    try { return await fn(); }
    catch (e) { toast("err", e.message); }
    finally { setLoading(l => ({ ...l, [key]: false })); }
  }, [toast]);

  const fetchMarket = useCallback((sym, ivl) => {
    load("ticker", () => api.ticker(sym).then(setTicker));
    load("signal", () => api.signal(sym, ivl).then(setSignal));
    load("klines", () => api.klines(sym, ivl, 100).then(r => {
      setKlines((r.data || []).map(k => ({
        t:     new Date(k[0]).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }),
        close: parseFloat(k[4]),
        open:  parseFloat(k[1]),
        high:  parseFloat(k[2]),
        low:   parseFloat(k[3]),
      })));
    }));
  }, [load]);

  useEffect(() => {
    setKlines([]); setTicker(null); setSignal(null);
    fetchMarket(symbol, interval);
  }, [symbol, interval]); // eslint-disable-line

  const price    = ticker?.price ? parseFloat(ticker.price).toLocaleString(undefined, { minimumFractionDigits:2 }) : "--";
  const sig      = signal?.signal ?? "--";
  const rsi      = signal?.rsi   != null ? Number(signal.rsi).toFixed(1)  : "--";
  const ema      = signal?.ema   != null ? Number(signal.ema).toFixed(2)  : "--";
  const chartClr = sig === "BUY" ? "#22c55e" : sig === "SELL" ? "#ef4444" : "#6366f1";
  const lastCandle = klines[klines.length - 1];
  const priceUp    = lastCandle ? lastCandle.close >= lastCandle.open : null;

  return (
    <div className="page fade-in" style={{ gap:14 }}>
      <div style={{ display:"grid", gridTemplateColumns:"200px 1fr", gap:14 }}>
        {/* Watchlist */}
        <div className="card" style={{ padding:"12px 0" }}>
          <div className="card-title" style={{ padding:"0 12px 8px" }}>Watchlist</div>
          <div style={{ overflowY:"auto", maxHeight:260 }}>
            <table className="tbl" style={{ fontSize:12 }}>
              <tbody>
                {SYMBOLS.map(s => {
                  const p = watchPrices[s];
                  return (
                    <tr key={s} onClick={() => setSymbol(s)}
                      style={{ cursor:"pointer", background: s === symbol ? "var(--accent-soft)" : "transparent" }}>
                      <td className="mono" style={{ fontWeight: s === symbol ? 700 : 400, paddingLeft:12 }}>
                        {s.replace("USDT","")}
                      </td>
                      <td className="mono" style={{ textAlign:"right" }}>
                        {p ? p.toLocaleString(undefined, { minimumFractionDigits:2, maximumFractionDigits:2 }) : "…"}
                      </td>
                      <td style={{ textAlign:"right", fontSize:10, color:"var(--muted)", paddingRight:12 }}>USDT</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats + controls */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <div style={{ fontSize:18, fontWeight:700, fontFamily:"var(--font-mono)" }}>
              {symbol.replace("USDT","")}
              <span style={{ fontSize:12, color:"var(--muted)", marginLeft:6 }}>/ USDT</span>
            </div>
            <select value={interval} onChange={e => setInterval(e.target.value)} style={{ width:80 }}>
              {INTERVALS.map(i => <option key={i}>{i}</option>)}
            </select>
            <button className="btn btn-sm" onClick={() => fetchMarket(symbol, interval)} disabled={loading.ticker}>
              {loading.ticker ? <span className="spin">⟳</span> : "↺ Refresh"}
            </button>
          </div>
          <div className="grid-3">
            <div className="card">
              <div className="card-title">Price</div>
              <div className="stat-val mono" style={{ color: priceUp === null ? "var(--text)" : priceUp ? "var(--green)" : "var(--red)" }}>{price}</div>
              <div className="stat-lbl">{symbol}</div>
            </div>
            <div className="card">
              <div className="card-title">Signal</div>
              <div className="stat-val" style={{ color: sigColor(sig) }}>{sig}</div>
              <div className="stat-lbl">EMA {ema}</div>
            </div>
            <div className="card">
              <div className="card-title">RSI (14)</div>
              <div className="stat-val mono" style={{
                color: rsi !== "--" ? (Number(rsi) < 30 ? "var(--green)" : Number(rsi) > 70 ? "var(--red)" : "var(--text)") : "var(--muted)"
              }}>{rsi}</div>
              <div className="stat-lbl">{rsi !== "--" && Number(rsi) < 30 ? "Oversold" : rsi !== "--" && Number(rsi) > 70 ? "Overbought" : "Neutral"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div className="card-title" style={{ marginBottom:0 }}>{symbol} · {interval} · Close Price</div>
          {klines.length > 0 && (
            <span style={{ fontSize:11, color:"var(--muted)", fontFamily:"var(--font-mono)" }}>
              H: {Math.max(...klines.map(k=>k.high)).toLocaleString(undefined,{minimumFractionDigits:2})} &nbsp;
              L: {Math.min(...klines.map(k=>k.low)).toLocaleString(undefined,{minimumFractionDigits:2})}
            </span>
          )}
        </div>
        {loading.klines && klines.length === 0 ? (
          <div className="empty" style={{ height:240, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span><span className="spin">⟳</span>&nbsp; Loading {symbol} chart…</span>
          </div>
        ) : klines.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={klines} margin={{ top:4, right:8, bottom:0, left:0 }}>
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={chartClr} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartClr} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2235" />
              <XAxis dataKey="t" tick={{ fill:"#64748b", fontSize:10 }} interval="preserveStartEnd" />
              <YAxis domain={["auto","auto"]} tick={{ fill:"#64748b", fontSize:10 }} width={72}
                tickFormatter={v => v.toLocaleString(undefined,{minimumFractionDigits:0})} />
              <Tooltip
                contentStyle={{ background:"#080b1a", border:"1px solid #1e2235", borderRadius:8, fontSize:12 }}
                formatter={v => [v.toLocaleString(undefined,{minimumFractionDigits:2}), "Close"]}
                labelStyle={{ color:"#64748b" }}
              />
              <Area type="monotone" dataKey="close" stroke={chartClr} strokeWidth={2}
                fill="url(#cg)" dot={false} activeDot={{ r:4, fill:chartClr }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty" style={{ height:240, display:"flex", alignItems:"center", justifyContent:"center" }}>No data</div>
        )}
      </div>

      {/* Account + Orders */}
      <div className="grid-2">
        <div className="card">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div className="card-title" style={{ marginBottom:0 }}>Account Balances</div>
            <button className="btn btn-sm" onClick={() => load("account", () => api.account().then(setAccount))} disabled={loading.account}>
              {loading.account ? "…" : "Load"}
            </button>
          </div>
          {account ? (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Asset</th><th>Free</th><th>Locked</th></tr></thead>
                <tbody>
                  {account.balances.map(b => (
                    <tr key={b.asset}>
                      <td className="mono" style={{ fontWeight:600 }}>{b.asset}</td>
                      <td className="mono">{parseFloat(b.free).toFixed(6)}</td>
                      <td className="mono">{parseFloat(b.locked).toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty">Click Load to fetch balances</div>}
        </div>
        <div className="card">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div className="card-title" style={{ marginBottom:0 }}>Open Orders · {symbol}</div>
            <button className="btn btn-sm" onClick={() => load("orders", () => api.openOrders(symbol).then(setOrders))} disabled={loading.orders}>
              {loading.orders ? "…" : "Load"}
            </button>
          </div>
          {orders ? (
            orders.count > 0 ? (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead><tr><th>ID</th><th>Side</th><th>Price</th><th>Qty</th></tr></thead>
                  <tbody>
                    {orders.value.map(o => (
                      <tr key={o.orderId}>
                        <td className="mono">{o.orderId}</td>
                        <td><span className={`badge badge-${o.side.toLowerCase()}`}>{o.side}</span></td>
                        <td className="mono">{o.price}</td>
                        <td className="mono">{o.origQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="empty">No open orders for {symbol}</div>
          ) : <div className="empty">Click Load to fetch orders</div>}
        </div>
      </div>
    </div>
  );
}
