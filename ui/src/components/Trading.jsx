import { useState } from "react";
import Card from "./Card";

export default function Trading({ onTrade, tradeResult, signalData }) {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [side, setSide] = useState("BUY");
  const [type, setType] = useState("MARKET");
  const [qty, setQty] = useState("0.0001");
  const [price, setPrice] = useState("");
  const [force, setForce] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onTrade({
      symbol,
      side,
      type,
      quantity: qty ? Number(qty) : null,
      price: price ? Number(price) : null,
      force_execute: force
    });
  };

  return (
    <section className="section">
      <div className="grid-two">
        <Card title="Quick Trade">
          <form className="form" onSubmit={handleSubmit}>
            <label>
              Symbol
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              />
            </label>
            <label>
              Side
              <select value={side} onChange={(e) => setSide(e.target.value)}>
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </label>
            <label>
              Type
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="MARKET">MARKET</option>
                <option value="LIMIT">LIMIT</option>
              </select>
            </label>
            <label>
              Quantity
              <input
                type="number"
                step="0.000001"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </label>
            <label>
              Price (for LIMIT)
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
              />
              Force execute (bypass DRY_RUN)
            </label>
            <button type="submit" className="btn danger">
              Send Test Order
            </button>
          </form>
          <pre className="code-block">
            {tradeResult || "Order result will appear here…"}
          </pre>
        </Card>

        <Card title="Raw Strategy Signal">
          <pre className="code-block small">
            {signalData
              ? JSON.stringify(signalData, null, 2)
              : "No signal loaded yet."}
          </pre>
        </Card>
      </div>
    </section>
  );
}
