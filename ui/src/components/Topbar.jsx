export default function Topbar({ signal, price }) {
  return (
    <header className="topbar">
      <div>
        <h1>Crypto Trade Professional</h1>
        <p className="subtitle">Binance Spot Testnet · BTCUSDT</p>
      </div>
      <div className="pill-group">
        <span className="pill">Signal: {signal ?? "--"}</span>
        <span className="pill">Price: {price ?? "--"}</span>
      </div>
    </header>
  );
}
