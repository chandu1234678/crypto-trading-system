export default function BalancesList({ balances, loading, error }) {
  if (loading) return <div>Loading balances…</div>;
  if (error) return <div>Error: {error}</div>;
  if (!balances.length) return <div>No balances</div>;

  return (
    <>
      <div className="balances-header">
        <span>Asset</span>
        <span>Free</span>
        <span>Locked</span>
      </div>
      <div className="balances-list">
        {balances.map((b) => (
          <div key={b.asset} className="balances-row">
            <span>{b.asset}</span>
            <span>{b.free}</span>
            <span>{b.locked}</span>
          </div>
        ))}
      </div>
    </>
  );
}
