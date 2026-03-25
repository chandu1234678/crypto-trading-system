// ui/src/components/Automation.jsx
import { useState, useCallback } from "react";
import api from "../api";
import Markdown from "./Markdown";

const ALL_SYMBOLS = [
  "BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT",
  "ADAUSDT","DOGEUSDT","AVAXUSDT","DOTUSDT","MATICUSDT",
  "LTCUSDT","LINKUSDT","UNIUSDT","ATOMUSDT","NEARUSDT",
  "APTUSDT","ARBUSDT","OPUSDT","INJUSDT","SUIUSDT",
];
const INTERVALS = ["1m","5m","15m","30m","1h","4h","1d"];

function sigBadge(s) {
  const cls = s === "BUY" ? "badge-buy" : s === "SELL" ? "badge-sell" : s === "ERROR" ? "badge-err" : "badge-hold";
  return <span className={`badge ${cls}`}>{s}</span>;
}

// ── Section: Multi-symbol scanner ────────────────────────────────────────────
function Scanner({ toast }) {
  const [symbols,   setSymbols]   = useState(["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","AVAXUSDT"]);
  const [interval,  setInterval]  = useState("1m");
  const [results,   setResults]   = useState(null);
  const [loading,   setLoading]   = useState(false);

  function toggleSym(s) {
    setSymbols(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function runScan() {
    if (!symbols.length) return toast("err", "Select at least one symbol");
    setLoading(true);
    try {
      const r = await api.scan(symbols, interval);
      setResults(r);
      const buys  = r.results.filter(x => x.signal === "BUY").length;
      const sells = r.results.filter(x => x.signal === "SELL").length;
      toast("ok", `Scan complete — ${buys} BUY, ${sells} SELL signals`);
    } catch (e) { toast("err", e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="card">
      <div className="card-title">Multi-Symbol Scanner</div>
      <p style={{ fontSize:12, color:"var(--muted)", marginBottom:12 }}>
        Scan your watchlist for BUY/SELL signals simultaneously.
      </p>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
        {ALL_SYMBOLS.map(s => (
          <button key={s} className={`btn btn-sm ${symbols.includes(s) ? "btn-primary" : ""}`}
            style={{ padding:"3px 9px", fontSize:11 }}
            onClick={() => toggleSym(s)}>
            {s.replace("USDT","")}
          </button>
        ))}
      </div>

      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:12 }}>
        <select value={interval} onChange={e => setInterval(e.target.value)} style={{ width:90 }}>
          {INTERVALS.map(i => <option key={i}>{i}</option>)}
        </select>
        <span style={{ fontSize:11, color:"var(--muted)" }}>{symbols.length} symbols selected</span>
        <button className="btn btn-primary" onClick={runScan} disabled={loading} style={{ marginLeft:"auto" }}>
          {loading ? <span><span className="spin">⟳</span> Scanning…</span> : "▶ Run Scan"}
        </button>
      </div>

      {results && (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Symbol</th><th>Signal</th><th>Price</th><th>RSI</th><th>EMA</th></tr>
            </thead>
            <tbody>
              {results.results.map(r => (
                <tr key={r.symbol}>
                  <td className="mono" style={{ fontWeight:600 }}>{r.symbol}</td>
                  <td>{sigBadge(r.signal)}</td>
                  <td className="mono">{r.price ? r.price.toLocaleString(undefined,{minimumFractionDigits:2}) : "--"}</td>
                  <td className="mono" style={{
                    color: r.rsi < 30 ? "var(--green)" : r.rsi > 70 ? "var(--red)" : "var(--text)"
                  }}>{r.rsi ? Number(r.rsi).toFixed(1) : "--"}</td>
                  <td className="mono">{r.ema ? Number(r.ema).toFixed(2) : "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Section: Auto-trade ───────────────────────────────────────────────────────
function AutoTrade({ toast }) {
  const [symbol,   setSymbol]   = useState("BTCUSDT");
  const [interval, setInterval] = useState("1m");
  const [spend,    setSpend]    = useState("10");
  const [dryRun,   setDryRun]   = useState(true);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const r = await api.autoTrade({
        symbol, interval,
        spend_quote: Number(spend),
        dry_run_override: dryRun,
      });
      setResult(r);
      toast("ok", `Auto-trade: ${r.signal} → ${r.action}`);
    } catch (e) { toast("err", e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="card">
      <div className="card-title">Auto-Trade Trigger</div>
      <p style={{ fontSize:12, color:"var(--muted)", marginBottom:12 }}>
        Run strategy signal and automatically place an order if BUY or SELL is detected.
      </p>
      <div className="form-grid" style={{ marginBottom:12 }}>
        <div className="field">
          <label>Symbol</label>
          <select value={symbol} onChange={e => setSymbol(e.target.value)}>
            {ALL_SYMBOLS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Interval</label>
          <select value={interval} onChange={e => setInterval(e.target.value)}>
            {INTERVALS.map(i => <option key={i}>{i}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Spend (USDT)</label>
          <input type="number" min="1" step="1" value={spend} onChange={e => setSpend(e.target.value)} />
        </div>
        <div className="field" style={{ justifyContent:"flex-end" }}>
          <label style={{ flexDirection:"row", alignItems:"center", gap:8, cursor:"pointer" }}>
            <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)}
              style={{ width:"auto" }} />
            Dry-run (simulate only)
          </label>
        </div>
      </div>
      <button className="btn btn-primary" onClick={run} disabled={loading}>
        {loading ? <span><span className="spin">⟳</span> Running…</span> : "▶ Execute Auto-Trade"}
      </button>
      {result && (
        <div style={{ marginTop:12 }}>
          <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:8 }}>
            <span style={{ fontSize:13 }}>Signal:</span>
            {sigBadge(result.signal)}
            <span style={{ fontSize:13, color:"var(--muted)" }}>→ action: <strong style={{color:"var(--text)"}}>{result.action}</strong></span>
          </div>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// ── Section: AI Analysis ──────────────────────────────────────────────────────
function AIAnalysis({ toast }) {
  const [symbol,   setSymbol]   = useState("BTCUSDT");
  const [interval, setInterval] = useState("1m");
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const r = await api.aiAnalysis(symbol, interval);
      setResult(r);
      toast("ok", "AI analysis complete");
    } catch (e) { toast("err", e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="card">
      <div className="card-title">AI Market Analysis</div>
      <p style={{ fontSize:12, color:"var(--muted)", marginBottom:12 }}>
        Combines live EMA+RSI signal with Gemini AI for a full market interpretation.
      </p>
      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:12 }}>
        <select value={symbol} onChange={e => setSymbol(e.target.value)} style={{ width:140 }}>
          {ALL_SYMBOLS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={interval} onChange={e => setInterval(e.target.value)} style={{ width:90 }}>
          {INTERVALS.map(i => <option key={i}>{i}</option>)}
        </select>
        <button className="btn btn-primary" onClick={run} disabled={loading} style={{ marginLeft:"auto" }}>
          {loading ? <span><span className="spin">⟳</span> Analysing…</span> : "✦ Analyse with AI"}
        </button>
      </div>

      {result && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            {sigBadge(result.signal_data?.signal)}
            <span className="mono" style={{ fontSize:13 }}>
              {result.signal_data?.price?.toLocaleString(undefined,{minimumFractionDigits:2})}
            </span>
            <span style={{ fontSize:11, color:"var(--muted)" }}>
              RSI {result.signal_data?.rsi ? Number(result.signal_data.rsi).toFixed(1) : "--"} ·
              EMA {result.signal_data?.ema ? Number(result.signal_data.ema).toFixed(2) : "--"}
            </span>
          </div>
          <div style={{
            background:"var(--bg-input)", border:"1px solid var(--border)",
            borderRadius:10, padding:"14px 16px",
          }}>
            <Markdown>{result.ai_analysis}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section: Risk Calculator ──────────────────────────────────────────────────
function RiskCalculator({ toast }) {
  const [form, setForm] = useState({
    symbol: "BTCUSDT", side: "BUY",
    quantity: "0.001", entry_price: "",
    stop_loss_pct: "2", take_profit_pct: "4",
    account_balance_usdt: "1000",
  });
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function calculate() {
    if (!form.entry_price) return toast("err", "Enter an entry price");
    setLoading(true);
    try {
      const r = await api.riskCheck({
        symbol: form.symbol,
        side: form.side,
        quantity: Number(form.quantity),
        entry_price: Number(form.entry_price),
        stop_loss_pct: Number(form.stop_loss_pct),
        take_profit_pct: Number(form.take_profit_pct),
        account_balance_usdt: Number(form.account_balance_usdt),
      });
      setResult(r);
    } catch (e) { toast("err", e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="card">
      <div className="card-title">Risk / Reward Calculator</div>
      <p style={{ fontSize:12, color:"var(--muted)", marginBottom:12 }}>
        Calculate stop-loss, take-profit, position sizing, and R:R ratio before placing a trade.
      </p>
      <div className="form-grid" style={{ marginBottom:12 }}>
        <div className="field">
          <label>Symbol</label>
          <select value={form.symbol} onChange={e => set("symbol", e.target.value)}>
            {ALL_SYMBOLS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Side</label>
          <select value={form.side} onChange={e => set("side", e.target.value)}>
            <option>BUY</option><option>SELL</option>
          </select>
        </div>
        <div className="field">
          <label>Entry Price (USDT)</label>
          <input type="number" step="0.01" value={form.entry_price}
            onChange={e => set("entry_price", e.target.value)} placeholder="e.g. 70000" />
        </div>
        <div className="field">
          <label>Quantity</label>
          <input type="number" step="0.000001" value={form.quantity}
            onChange={e => set("quantity", e.target.value)} />
        </div>
        <div className="field">
          <label>Stop-Loss %</label>
          <input type="number" step="0.1" min="0.1" max="50" value={form.stop_loss_pct}
            onChange={e => set("stop_loss_pct", e.target.value)} />
        </div>
        <div className="field">
          <label>Take-Profit %</label>
          <input type="number" step="0.1" min="0.1" max="200" value={form.take_profit_pct}
            onChange={e => set("take_profit_pct", e.target.value)} />
        </div>
        <div className="field">
          <label>Account Balance (USDT)</label>
          <input type="number" step="1" value={form.account_balance_usdt}
            onChange={e => set("account_balance_usdt", e.target.value)} />
        </div>
      </div>
      <button className="btn btn-primary" onClick={calculate} disabled={loading}>
        {loading ? "…" : "Calculate Risk"}
      </button>

      {result && (
        <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:8 }}>
          <div className="grid-2" style={{ gap:8 }}>
            {[
              ["Entry",       result.entry_price?.toLocaleString(undefined,{minimumFractionDigits:2})],
              ["Stop-Loss",   result.stop_loss_price?.toLocaleString(undefined,{minimumFractionDigits:2})],
              ["Take-Profit", result.take_profit_price?.toLocaleString(undefined,{minimumFractionDigits:2})],
              ["R:R Ratio",   result.risk_reward_ratio + ":1"],
              ["Trade Value", "$" + result.trade_value_usdt],
              ["Risk (USDT)", "$" + result.risk_usdt],
            ].map(([label, val]) => (
              <div key={label} style={{ background:"var(--bg-input)", borderRadius:8,
                padding:"8px 12px", border:"1px solid var(--border)" }}>
                <div style={{ fontSize:10, color:"var(--muted)", textTransform:"uppercase" }}>{label}</div>
                <div className="mono" style={{ fontSize:15, fontWeight:600, marginTop:2 }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:12, padding:"8px 12px", borderRadius:8,
            background: result.risk_reward_ratio >= 2 ? "rgba(34,197,94,.1)" : "rgba(234,179,8,.1)",
            border: `1px solid ${result.risk_reward_ratio >= 2 ? "var(--green)" : "var(--yellow)"}`,
            color: result.risk_reward_ratio >= 2 ? "var(--green)" : "var(--yellow)" }}>
            {result.recommendation}
          </div>
          <div style={{ fontSize:12, padding:"8px 12px", borderRadius:8,
            background: result.risk_pct_of_balance <= 2 ? "rgba(34,197,94,.1)" : "rgba(239,68,68,.1)",
            border: `1px solid ${result.risk_pct_of_balance <= 2 ? "var(--green)" : "var(--red)"}`,
            color: result.risk_pct_of_balance <= 2 ? "var(--green)" : "var(--red)" }}>
            {result.risk_warning} · Risk: {result.risk_pct_of_balance}% of balance ·
            Max qty (2% rule): {result.max_qty_2pct_rule}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Automation({ toast }) {
  const [summary, setSummary] = useState(null);
  const [sumLoad, setSumLoad] = useState(false);

  const loadSummary = useCallback(async () => {
    setSumLoad(true);
    try { setSummary(await api.automationSummary()); }
    catch (e) { toast("err", e.message); }
    finally { setSumLoad(false); }
  }, [toast]);

  return (
    <div className="page fade-in" style={{ gap:16 }}>
      {/* Summary bar */}
      <div className="card" style={{ padding:"12px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
          <div className="card-title" style={{ marginBottom:0 }}>Automation Overview</div>
          {summary ? (
            <>
              <span style={{ fontSize:12 }}>
                <span className={`health-dot ${summary.poller_running ? "ok" : "err"}`} />
                Poller: {summary.poller_running ? "Running" : "Stopped"} · {summary.poller_symbol}
              </span>
              <span style={{ fontSize:12, color:"var(--muted)" }}>
                Trades (24h): <strong style={{color:"var(--text)"}}>{summary.recent_trades_24h}</strong>
              </span>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {summary.top_signals?.map(s => (
                  <span key={s.symbol} style={{ fontSize:11, fontFamily:"var(--font-mono)" }}>
                    {s.symbol.replace("USDT","")}: {sigBadge(s.signal)}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <span style={{ fontSize:12, color:"var(--muted)" }}>Click Load to fetch overview</span>
          )}
          <button className="btn btn-sm" onClick={loadSummary} disabled={sumLoad} style={{ marginLeft:"auto" }}>
            {sumLoad ? "…" : "↺ Load"}
          </button>
        </div>
      </div>

      {/* Scanner + Auto-trade */}
      <div className="grid-2">
        <Scanner toast={toast} />
        <AutoTrade toast={toast} />
      </div>

      {/* AI Analysis + Risk Calc */}
      <div className="grid-2">
        <AIAnalysis toast={toast} />
        <RiskCalculator toast={toast} />
      </div>
    </div>
  );
}
