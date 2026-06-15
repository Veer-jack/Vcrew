import { useEffect, useState } from "react";
import { KpiCard, inr, inrK } from "../components/ui";
import { aapi } from "../aapi/client";

export default function ADashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { aapi.dashboard().then(setData); }, []);
  if (!data) return <div className="page rise"><div className="muted">Loading…</div></div>;

  return (
    <div className="page rise">
      <div className="ph">
        <div><span className="eyebrow">Platform overview</span><h1>Control center</h1><p className="lead">A real-time snapshot of ValidationCrew's marketplace.</p></div>
      </div>

      <div className="rise-2 m2" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 26 }}>
        <KpiCard label="Total members" value={data.totalUsers.toLocaleString("en-IN")} icon="users" footer="" />
        <KpiCard label="Builders" value={data.builders.toLocaleString("en-IN")} icon="briefcase" footer="" />
        <KpiCard label="Validators" value={data.validators.toLocaleString("en-IN")} icon="userplus" footer="" />
        <KpiCard label="Active missions" value={`${data.activeMissions} / ${data.totalMissions}`} icon="layers" footer="" />
      </div>

      <div className="rise-3 m2" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 26 }}>
        <KpiCard label="Wallet top-ups (all-time)" value={inrK(data.gmv)} icon="wallet" footer="" />
        <KpiCard label="Mission spend (all-time)" value={inrK(data.spend)} icon="trendingUp" footer="" />
        <KpiCard label="Open support tickets" value={data.openTickets} icon="life" tone={data.openTickets > 0 ? "amber" : undefined} footer="" />
      </div>

      <div className="rise-3 m2" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        <KpiCard label="Withdrawal queue" value={data.withdrawalQueue} unit={data.withdrawalQueue ? ` (${inr(data.withdrawalQueueAmount)})` : ""} icon="wallet" tone={data.withdrawalQueue > 0 ? "amber" : undefined} footer="" />
        <KpiCard label="Suspended accounts" value={data.suspended} icon="shield" tone={data.suspended > 0 ? "danger" : undefined} footer="" />
      </div>
    </div>
  );
}
