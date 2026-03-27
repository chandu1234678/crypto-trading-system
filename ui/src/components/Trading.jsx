// ui/src/components/Trading.jsx
import { useState, useEffect, useCallback } from "react";
import api from "../api";

const SYMBOLS = [
  "BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT",
  "ADAUSDT","DOGEUSDT","AVAXUSDT","DOTUSDT","MATICUSDT",
  "LTCUSDT","LINKUSDT","UNIUSDT","ATOMUSDT","NEARUSDT",
  "APTUSDT","ARBUSDT","OPUSDT","INJUSDT","SUIUSDT",
];

export default function Trading({ toast }) {
  const [symbol,     setSymbol]     = useState("BTCUSDT");
  const [side,       setSide]       = useState("BUY");
  const [type,       setType]       = useState("MARKET");
  const [qty,        setQty]        = useState("0.0001");
  const [price,      setPrice]      = useState("");
  const [force,      setForce]      = useState(false);
  const [placing,    setPlacing]    = useState(false);
  const [orderRes,   setOrderRes]   = useState(null);
  const [book,       setBook]       = useState(null);
  const [bookLoad,   setBookLoad]   = useState(false);
  const [history,    setHistory]    = useState(null);
  const [histPage,   setHistPage]   = useState(1);
  const [histLoad,   setHistLoad]   = useState(false);
  const [poller,     setPoller]     = useState(null);
  const [pollerBusy, setPollerBusy] = useState(false);
  const [runRes,     setRunRes]     = useState(null);
  const [running,    setRunning]    = useState(false);
  const [ticker,     setTicker]     = useState(null);

  const loadBook = useCallback(async () => {
    setBookLoad(true);
    try { setBook(await api.orderBook(symbol, 12)); }
    catch (e) { toast("err", e.message); }
    finally { setBookLoad(false); }
  }, [symbol, toast]);

  const loadPoller = useCallback(async () => {
    try { setPoller(await api.pollerStatus()); } catch (_) {}
  }, []);

  const loadTicker = useCallback(async () => {
    try { setTicker(await api.ticker(symbol)); } catch (_) {}
  }, [symbol]);

  useEffect(() => { loadBook(); loadPoller(); loadTicker(); }, [symbol, loadBook, loadPoller, loadTicker]);

  async function placeOrder(e) {
    e.preventDefault();
    setPlacing(true); setOrderRes(null);
    try {
      const res = await api.placeOrder({ symbol, side, type, quantity: qty ? Number(qty) : null, price: price ? Number(price) : null, force_execute: force });
      setOrderRes(res);
      toast("ok", `${side} ${qty} ${symbol} — ${res.executed ? "executed" : "dry-run"}`);
      loadHistory(1);
    } catch (e) { toast("err", e.message); }
    finally { setPlacing(false); }
  }

  const loadHistory = useCallback(async (page = 1) => {
    setHistLoad(true);
    try { const r = await api.tradeHistory({ symbol, page, page_size: 10 }); setHistory(r); setHistPage(page); }
    catch (e) { toast("err", e.message); }
    finally { setHistLoad(false); }
  }, [symbol, toast]);

  async function togglePoller() {
    setPollerBusy(true);
    try {
      if (poller?.running) { await api.pollerStop(); toast("ok", "Poller stopped"); }
      else { await api.pollerStart(); toast("ok", "Poller started"); }
      setPoller(await api.pollerStatus());
    } catch (e) { toast("err", e.message); }
    finally { setPollerBusy(false); }
  }

  async function runNow() {
    setRunning(true); setRunRes(null);
    try { const r = await api.runNow(); setRunRes(r); toast("ok", `Signal: ${r.signal} → ${r.action}`); loadHistory(1); }
    catch (e) { toast("err", e.message); }
    finally { setRunning(false); }
  }

  const currentPrice = ticker ? parseFloat(ticker.price).toLocaleString(undefined, { minimumFractionDigits:2 }) : "--";
  const spread = book && book.asks[0] && book.bids[0] ? (parseFloat(book.asks[0][0]) - parseFloat(book.bids[0][0])).toFixed(2) : null;

  return (
    <div className="page fade-in" style={{ gap:14 }}>
      {/* Symbol bar */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontSize:11, color:"var(--muted)", marginRight:4 }}>SYMBOL:</span>
        {SYMBOLS.map(s => (
          <button key={s} className={`btn btn-sm ${s === symbol ? "btn-primary" : ""}`}
            style={{ padding:"3px 10px", fontSize:11 }} onClick={() => setSymbol(s)}>
            {s.replace("USDT","")}
          </button>
        ))}
      </div>

      {/* Price banner */}
      <div className="card" style={{ padding:"10px 16px", display:"flex", alignItems:"center", gap:20 }}>
        <span style={{ fontSize:20, fontWeight:700, fontFamily:"var(--font-mono)" }}>{symbol}</span>
        <span style={{ fontSize:22, fontWeight:700, fontFamily:"var(--font-mono)", color:"var(--green)" }}>{currentPrice}</span>
        {spread && <span style={{ fontSize:11, color:"var(--muted)" }}>Spread: {spread}</span>}
        <button className="btn btn-sm" style={{ marginLeft:"auto" }} onClick={() => { loadBook(); loadTicker(); }}>↺ Refresh</button>
      </div>

      <div className="grid-2">
        {/* Order form */}
        <div className="card">
          <div className="card-title">Place Test Order</div>
          <form onSubmit={placeOrder} style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div className="form-grid">
              <div className="field"><label>Symbol</label>
                <select value={symbol} onChange={e => setSymbol(e.target.value)}>
                  {SYMBOLS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="field"><label>Order Type</label>
                <select value={type} onChange={e => setType(e.target.value)}>
                  <option>MARKET</option><option>LIMIT</option>
                </select>
              </div>
              <div className="field"><label>Quantity</label>
                <input type="number" step="0.000001" min="0" value={qty} onChange={e => setQty(e.target.value)} />
              </div>
              <div className="field"><label>Price (LIMIT only)</label>
                <input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="optional" />
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {["BUY","SELL"].map(s => (
                <button key={s} type="button" onClick={() => setSide(s)} style={{
                  padding:"10px", borderRadius:8, border:"2px solid", cursor:"pointer", fontWeight:700, fontSize:14,
                  borderColor: side===s ? (s==="BUY" ? "var(--green)" : "var(--red)") : "var(--border)",
                  background: side===s ? (s==="BUY" ? "rgba(34,197,94,.15)" : "rgba(239,68,68,.15)") : "var(--bg-input)",
                  color: side===s ? (s==="BUY" ? "var(--green)" : "var(--red)") : "var(--muted)",
                }}>{s === "BUY" ? "▲ BUY" : "▼ SELL"}</button>
              ))}
            </div>
            <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"var(--muted)", cursor:"pointer" }}>
              <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} style={{ width:"auto" }} />
              Force execute (bypass DRY_RUN)
            </label>
            <button type="submit" style={{
              padding:"11px", borderRadius:8, border:"none", cursor:"pointer", fontWeight:700, fontSize:14,
              background: side==="BUY" ? "var(--green)" : "var(--red)",
              color: side==="BUY" ? "#000" : "#fff", opacity: placing ? 0.6 : 1,
            }} disabled={placing}>{placing ? "Sending…" : `Send ${side} Order`}</button>
          </form>
          {orderRes && (
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:11, color:"var(--muted)", marginBottom:4 }}>
                {orderRes.executed ? "✓ Executed" : "○ Dry-run (no real order placed)"}
              </div>
              <pre>{JSON.stringify(orderRes, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Order book */}
        <div className="card">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div className="card-title" style={{ marginBottom:0 }}>Order Book · {symbol}</div>
            <button className="btn btn-sm" onClick={loadBook} disabled={bookLoad}>{bookLoad ? <span className="spin">⟳</span> : "↺"}</button>
          </div>
          {book ? (
            <>
              {spread && <div style={{ textAlign:"center", fontSize:11, color:"var(--muted)", marginBottom:8, padding:"4px 0", borderTop:"1px solid var(--border)", borderBottom:"1px solid var(--border)" }}>Spread: <span className="mono">{spread}</span></div>}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {[["BIDS","bids","var(--green)","text-green"],["ASKS","asks","var(--red)","text-red"]].map(([label, key, color, cls]) => (
                  <div key={key}>
                    <div style={{ fontSize:11, color, marginBottom:6, fontWeight:600 }}>{label}</div>
                    <table className="tbl" style={{ fontSize:11 }}>
                      <thead><tr><th>Price</th><th style={{textAlign:"right"}}>Qty</th></tr></thead>
                      <tbody>
                        {book[key].slice(0,10).map(([p,q],i) => (
                          <tr key={i}>
                            <td className={`mono ${cls}`}>{parseFloat(p).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                            <td className="mono" style={{textAlign:"right",color:"var(--muted)"}}>{parseFloat(q).toFixed(4)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="empty">{bookLoad ? "Loading…" : "No data"}</div>}
        </div>
      </div>

      {/* Poller + Run-now */}
      <div className="grid-2">
        <div className="card">
          <div className="card-title">Strategy Poller</div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <span className={`health-dot ${poller?.running ? "ok" : "err"}`} />
            <span style={{ fontSize:14, fontWeight:600 }}>{poller ? (poller.running ? "Running" : "Stopped") : "Unknown"}</span>
            {poller && <span className="text-muted" style={{ fontSize:11 }}>{poller.symbol} · every {poller.interval_seconds}s</span>}
          </div>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={togglePoller} disabled={pollerBusy}>
              {pollerBusy ? "…" : poller?.running ? "⏹ Stop Poller" : "▶ Start Poller"}
            </button>
            <button className="btn btn-sm" onClick={loadPoller}>↺ Status</button>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Run Strategy Now</div>
          <p style={{ fontSize:12, color:"var(--muted)", marginBottom:14, lineHeight:1.5 }}>
            Fetch latest klines for <strong style={{color:"var(--text)"}}>{symbol}</strong>, compute EMA+RSI signal, and optionally place an order.
          </p>
          <button className="btn btn-primary" onClick={runNow} disabled={running}>
            {running ? <span><span className="spin">⟳</span> Running…</span> : "▶ Run Now"}
          </button>
          {runRes && (
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:11, color:"var(--muted)", marginBottom:4 }}>
                Signal: <span style={{ color: runRes.signal==="BUY" ? "var(--green)" : runRes.signal==="SELL" ? "var(--red)" : "var(--yellow)", fontWeight:700 }}>{runRes.signal}</span> → {runRes.action}
              </div>
              <pre>{JSON.stringify(runRes, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>

      {/* Trade history */}
      <div className="card">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div className="card-title" style={{ marginBottom:0 }}>Trade History (Database)</div>
          <button className="btn btn-sm" onClick={() => loadHistory(1)} disabled={histLoad}>{histLoad ? "…" : "Load"}</button>
        </div>
        {history ? (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>ID</th><th>Time</th><th>Symbol</th><th>Side</th><th>Qty</th><th>Price</th><th>Order ID</th><th>Status</th></tr></thead>
                <tbody>
                  {history.items.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign:"center", color:"var(--muted)", padding:20 }}>No trades recorded yet</td></tr>
                  ) : history.items.map(t => (
                    <tr key={t.id}>
                      <td className="mono">{t.id}</td>
                      <td className="mono" style={{ fontSize:11 }}>{new Date(t.timestamp).toLocaleString()}</td>
                      <td className="mono">{t.symbol}</td>
                      <td><span className={`badge badge-${t.side.toLowerCase()}`}>{t.side}</span></td>
                      <td className="mono">{t.quantity}</td>
                      <td className="mono">{t.price ?? "--"}</td>
                      <td className="mono" style={{ fontSize:10, color:"var(--muted)" }}>{t.order_id || "--"}</td>
                      <td><span className="badge badge-ok">{t.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:10, alignItems:"center" }}>
              <button className="btn btn-sm" onClick={() => loadHistory(histPage-1)} disabled={histPage<=1||histLoad}>← Prev</button>
              <span style={{ fontSize:12, color:"var(--muted)" }}>Page {histPage} · {history.total} total</span>
              <button className="btn btn-sm" onClick={() => loadHistory(histPage+1)} disabled={histPage*10>=history.total||histLoad}>Next →</button>
            </div>
          </>
        ) : <div className="empty">Click Load to fetch trade history</div>}
      </div>
    </div>
  );
}
