import { useEffect, useState } from "react";
import { KpiCard, inr } from "../components/ui";
import { aapi } from "../aapi/client";

function MiniBars({ labels, values, format }) {
  const max = Math.max(1, ...values);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140, padding: "0 4px" }}>
      {values.map((v, i) => (
        <div key={i} style={{ flex: 1, textAlign: "center" }} title={`${labels[i]}: ${format ? format(v) : v}`}>
          <div style={{
            height: Math.max(3, Math.round((v / max) * 110)), background: "var(--accent)",
            borderRadius: "4px 4px 0 0", opacity: i === values.length - 1 ? 1 : 0.55,
          }} />
          <div className="faint" style={{ fontSize: 10, marginTop: 6 }}>{labels[i].slice(5)}</div>
        </div>
      ))}
    </div>
  );
}

function Breakdown({ title, rows, total }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <b style={{ fontSize: 13.5 }}>{title}</b>
      <div className="col gap-2" style={{ marginTop: 12 }}>
        {rows.map(r => (
          <div key={r.label} className="row gap-2" style={{ alignItems: "center" }}>
            <span style={{ fontSize: 12.5, width: 110, flex: "none", textTransform: "capitalize" }}>{r.label}</span>
            <div style={{ flex: 1, height: 7, borderRadius: 6, background: "var(--panel-inset)", overflow: "hidden" }}>
              <div style={{ width: `${total ? Math.round((r.n / total) * 100) : 0}%`, height: "100%", background: "var(--accent)" }} />
            </div>
            <span className="mono faint" style={{ fontSize: 11.5, width: 28, textAlign: "right" }}>{r.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AAnalytics() {
  const [data, setData] = useState(null);
  useEffect(() => { aapi.analytics().then(setData); }, []);
  if (!data) return <div className="page rise"><div className="muted">Loading…</div></div>;

  const lastUsers = data.userGrowth[data.userGrowth.length - 1] || 0;
  const firstUsers = data.userGrowth[0] || 0;
  const lastMissions = data.missionGrowth[data.missionGrowth.length - 1] || 0;
  const lastRevenue = data.revenueByMonth[data.revenueByMonth.length - 1] || 0;
  const categoryTotal = data.byCategory.reduce((s, c) => s + c.n, 0);
  const personaTotal = data.byPersona.reduce((s, p) => s + p.n, 0);

  return (
    <div className="page rise">
      <div className="ph">
        <div><span className="eyebrow">Operations</span><h1>Analytics</h1>
          <p className="lead">Real platform growth, computed from actual signup, mission, and transaction timestamps — not sample data.</p>
        </div>
      </div>

      <div className="rise-2 m2" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 22 }}>
        <KpiCard label="Total members" value={lastUsers.toLocaleString("en-IN")} icon="users" footer={firstUsers ? `+${lastUsers - firstUsers} over 12mo` : ""} />
        <KpiCard label="Total missions" value={lastMissions.toLocaleString("en-IN")} icon="layers" footer="" />
        <KpiCard label="Wallet top-ups (all-time)" value={inr(lastRevenue)} icon="wallet" footer="" />
      </div>

      <div className="rise-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }}>
        <div className="card" style={{ padding: 16 }}>
          <b style={{ fontSize: 13.5 }}>Member growth (12 months)</b>
          <MiniBars labels={data.months} values={data.userGrowth} />
        </div>
        <div className="card" style={{ padding: 16 }}>
          <b style={{ fontSize: 13.5 }}>Mission growth (12 months)</b>
          <MiniBars labels={data.months} values={data.missionGrowth} />
        </div>
      </div>

      <div className="rise-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Breakdown title="Missions by category" rows={data.byCategory.map(c => ({ label: c.category, n: c.n }))} total={categoryTotal} />
        <Breakdown title="Builders by persona" rows={data.byPersona.map(p => ({ label: p.persona, n: p.n }))} total={personaTotal} />
      </div>
    </div>
  );
}
