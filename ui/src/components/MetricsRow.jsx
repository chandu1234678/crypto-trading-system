export default function MetricsRow({ price, ema, rsi }) {
  return (
    <div className="metric-row">
      <div>
        <div className="metric-label">Last Price</div>
        <div className="metric-value">{price ?? "--"}</div>
      </div>
      <div>
        <div className="metric-label">EMA</div>
        <div className="metric-value">{ema ?? "--"}</div>
      </div>
      <div>
        <div className="metric-label">RSI</div>
        <div className="metric-value">{rsi ?? "--"}</div>
      </div>
    </div>
  );
}
