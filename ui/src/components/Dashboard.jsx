import Card from "./Card";
import MetricsRow from "./MetricsRow";
import BalancesList from "./BalancesList";
import OrdersList from "./OrdersList";

export default function Dashboard({
  signalData,
  onRefreshSignal,
  balances,
  balancesLoading,
  balancesError,
  orders,
  ordersLoading,
  ordersError,
  onRefreshBalances,
  onRefreshOrders
}) {
  const price = signalData?.price;
  const ema =
    signalData?.ema != null
      ? Number(signalData.ema).toFixed(2)
      : undefined;
  const rsi =
    signalData?.rsi != null
      ? Number(signalData.rsi).toFixed(2)
      : undefined;

  return (
    <section className="section">
      <div className="grid-two">
        <Card title="Market Snapshot">
          <MetricsRow price={price} ema={ema} rsi={rsi} />
          <button className="btn primary" onClick={onRefreshSignal}>
            Refresh Signal
          </button>
        </Card>

        <Card title="Account Balances">
          <BalancesList
            balances={balances}
            loading={balancesLoading}
            error={balancesError}
          />
          <button className="btn" onClick={onRefreshBalances}>
            Refresh Account
          </button>
        </Card>
      </div>

      <Card title="Open Orders">
        <OrdersList
          data={orders}
          loading={ordersLoading}
          error={ordersError}
        />
        <button className="btn" onClick={onRefreshOrders}>
          Refresh Orders
        </button>
      </Card>
    </section>
  );
}
