// ui/src/components/Assistant.jsx
import { useState, useRef, useEffect } from "react";
import api from "../api";
import Markdown from "./Markdown";

const SUGGESTIONS = [
  "What does an RSI below 30 mean?",
  "Explain EMA crossover strategy",
  "What is a MARKET vs LIMIT order?",
  "How does the Binance testnet work?",
];

export default function Assistant({ toast }) {
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! I'm your crypto trading assistant powered by Gemini. Ask me anything about markets, strategies, or this app." }
  ]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  async function send(q) {
    const text = (q || input).trim();
    if (!text || loading) return;
    setInput("");
    setMessages(m => [...m, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await api.chat(text);
      setMessages(m => [...m, { role: "bot", text: res.answer, model: res.raw?.model_used || null }]);
    } catch (e) {
      toast("err", e.message);
      setMessages(m => [...m, { role: "bot", text: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="page fade-in" style={{ height:"100%" }}>
      <div className="card" style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0 }}>
        <div className="card-title">AI Assistant · Gemini</div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
          {SUGGESTIONS.map(s => (
            <button key={s} className="btn btn-sm" onClick={() => send(s)} style={{ fontSize:11 }} disabled={loading}>{s}</button>
          ))}
        </div>
        <div className="chat-log" ref={logRef} style={{ flex:1, overflowY:"auto", minHeight:0 }}>
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role}`}>
              {m.role === "bot" ? <Markdown>{m.text}</Markdown> : m.text}
              {m.model && <div style={{ fontSize:10, color:"var(--muted)", marginTop:6, opacity:.7 }}>via {m.model}</div>}
            </div>
          ))}
          {loading && (
            <div className="bubble bot" style={{ color:"var(--muted)" }}>
              <span className="spin">⟳</span> Thinking…
            </div>
          )}
        </div>
        <div className="chat-input">
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            placeholder="Ask anything… (Enter to send, Shift+Enter for newline)" disabled={loading} />
          <button className="btn btn-primary" onClick={() => send()} disabled={loading || !input.trim()}>Send</button>
        </div>
      </div>
    </div>
  );
}
