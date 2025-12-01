import { useState } from "react";
import Card from "./Card";

export default function Assistant({ onSend, history }) {
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || pending) return;
    setInput("");
    setPending(true);
    try {
      await onSend(q);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="section">
      <Card title="AI Assistant (Gemini)" className="chat">
        <div className="chat-log">
          {history.map((m, idx) => (
            <div
              key={idx}
              className={`chat-bubble ${m.role === "user" ? "user" : "bot"}`}
            >
              {m.text}
            </div>
          ))}
          {pending && (
            <div className="chat-bubble bot">Thinking…</div>
          )}
        </div>
        <form className="chat-input" onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the bot anything about the market…"
          />
          <button className="btn primary" type="submit">
            Send
          </button>
        </form>
      </Card>
    </section>
  );
}
