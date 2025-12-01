export default function OrdersList({ data, loading, error }) {
  if (loading) return <div>Loading orders…</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data || !data.Count) return <div>No open orders</div>;

  return (
    <>
      <div className="orders-header">
        <span>ID</span>
        <span>Side</span>
        <span>Price</span>
        <span>Qty</span>
        <span>Status</span>
      </div>
      <div className="orders-list">
        {data.value.map((o) => (
          <div key={o.orderId} className="orders-row">
            <span>{o.orderId}</span>
            <span>{o.side}</span>
            <span>{o.price}</span>
            <span>{o.origQty}</span>
            <span>{o.status}</span>
          </div>
        ))}
      </div>
    </>
  );
}
