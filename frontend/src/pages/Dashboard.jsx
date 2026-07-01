import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Btn, KpiCard, MissionLogo, PBarRow, StatusTag, TypeTag, inr, inrK } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useMeta } from "../context/MetaContext";
import { api } from "../api/client";

function QuickActions({ nav, balance }) {
  const items = [
    { ic: "plus", t: "Create Mission", s: "Launch a new study", go: () => nav("/missions/new") },
    { ic: "compass", t: "Browse Audience", s: "Find the right members", go: () => nav("/audience") },
    { ic: "chart", t: "View Reports", s: "Analytics & exports", go: () => nav("/analytics") },
    { ic: "wallet", t: "Manage Wallet", s: `${inr(balance)} available`, go: () => nav("/wallet") },
  ];
  return (
    <div className="qa-grid">
      {items.map((it, i) => (
        <button className="qa" key={i} onClick={it.go}>
          <span className="qa-ic"><Icon name={it.ic} size={20} /></span>
          <span className="qa-meta"><b>{it.t}</b><span>{it.s}</span></span>
        </button>
      ))}
    </div>
  );
}

function ActivityFeed({ rows }) {
  if (!rows.length) return <div className="muted" style={{ padding: "12px 0" }}>No recent activity yet.</div>;
  return (
    <div className="feed">
      {rows.map((a) => (
        <div className="feed-row" key={a.id}>
          <span className={`feed-ic ${a.tone}`}><Icon name={a.icon} size={16} /></span>
          <div className="feed-body">
            <p><b>{a.who}</b> {a.text} <b>{a.mission_name}</b></p>
            <div className="feed-time">{a.time_label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MissionsTable({ rows, nav, categories }) {
  if (!rows.length) return <div className="muted" style={{ padding: 24 }}>No missions yet — create your first one.</div>;
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Mission</th><th>Type</th><th>Status</th>
            <th style={{ textAlign: "right" }}>Participants</th>
            <th style={{ textAlign: "right" }}>Reward</th>
            <th style={{ width: 150 }}>Completion</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(m => (
            <tr className="click" key={m.id} onClick={() => nav(`/missions/${m.id}`)}>
              <td>
                <div className="t-name">
                  <MissionLogo name={m.name} cat={m.category} size={34} />
                  <div><div>{m.name}</div><div className="t-sub">{m.region}</div></div>
                </div>
              </td>
              <td><TypeTag cat={m.category} categories={categories} /></td>
              <td><StatusTag status={m.status} /></td>
              <td className="num">{m.participants.joined}<span className="faint"> / {m.participants.target}</span></td>
              <td className="num">{m.reward.type === "sample" ? "Sample" : m.reward.type === "free" ? "Free" : inr(m.reward.amount)}</td>
              <td>{m.status === "draft" ? <span className="faint" style={{ fontSize: 12.5 }}>Not started</span> : <PBarRow value={m.completion} green={m.completion >= 90} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Dashboard() {
  const { builder } = useAuth();
  const { categories } = useMeta();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loadErr, setLoadErr] = useState(false);

  useEffect(() => {
    setLoadErr(false);
    api.dashboard()
      .then(setData)
      .catch(() => setLoadErr(true));
  }, []);

  if (loadErr) return (
    <div className="page rise" style={{ textAlign: "center", paddingTop: 60 }}>
      <div style={{ fontSize: 15, color: "var(--text-muted)", marginBottom: 14 }}>Couldn't load dashboard data.</div>
      <button className="btn btn-ghost" onClick={() => { setLoadErr(false); api.dashboard().then(setData).catch(() => setLoadErr(true)); }}>Retry</button>
    </div>
  );
  if (!data) return <div className="page rise"><div className="muted">Loading…</div></div>;

  const { kpi, activity, recentMissions } = data;
  const firstName = (builder?.name || "").split(" ")[0];

  return (
    <div className="page rise">
      {!builder?.verified && (
        <div style={{
          background: "linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)",
          border: "1px solid #f59e0b", borderRadius: "var(--radius)", padding: "14px 18px",
          marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12
        }}>
          <Icon name="shield" size={18} style={{ color: "#c2710c", flex: "none", marginTop: 2 }} />
          <div>
            <b style={{ fontSize: 13.5, color: "#92400e" }}>Your account is unverified</b>
            <p style={{ fontSize: 13, color: "#92400e", margin: "3px 0 0", lineHeight: 1.5 }}>
              You can run up to 3 active missions with a maximum of 25 participants each.
              To unlock unlimited campaigns, verify your website through your profile settings — an admin will review it within 24 hours.
            </p>
          </div>
        </div>
      )}
      <div className="ph">
        <div>
          <span className="eyebrow">Builder workspace</span>
          <h1>Welcome back, {firstName}</h1>
          <p className="lead">Here's how {builder?.org}'s validation missions are tracking today.</p>
        </div>
        <div className="ph-actions">
          <Btn variant="ghost" icon="compass" onClick={() => navigate("/audience")}>Browse audience</Btn>
          <Btn variant="primary" icon="plus" onClick={() => navigate("/missions/new")}>Create Mission</Btn>
        </div>
      </div>

      <div className="kpis sec">
        <KpiCard label="Active Missions" value={kpi.activeMissions} icon="bolt" />
        <KpiCard label="Completed Missions" value={kpi.completedMissions} icon="checkCircle" tone="green" />
        <KpiCard label="Total Participants" value={kpi.totalParticipants.toLocaleString("en-IN")} icon="users" spark={kpi.spark.participants} />
        <KpiCard label="Pending Participants" value={kpi.pendingParticipants} icon="clock" tone="amber" />
      </div>
      <div className="kpis sec" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <KpiCard label="Total Spend" value={inrK(kpi.totalSpend)} icon="wallet" spark={kpi.spark.spend} />
        <KpiCard label="Avg Completion Rate" value={kpi.avgCompletion} unit="%" icon="target" tone="green" />
        <KpiCard label="Wallet Balance" value={inrK(builder?.balance)} icon="coins" onClick={() => navigate("/wallet")} />
      </div>

      <div className="sec">
        <div className="sec-head"><h2 className="h-lg">Quick actions</h2></div>
        <QuickActions nav={navigate} balance={builder?.balance} />
      </div>

      <div className="split">
        <div className="sec" style={{ marginBottom: 0 }}>
          <div className="sec-head">
            <h2 className="h-lg">Recent missions</h2>
            <Btn variant="quiet" size="sm" iconRight="arrowRight" onClick={() => navigate("/missions")}>All missions</Btn>
          </div>
          <MissionsTable rows={recentMissions} nav={navigate} categories={categories} />
        </div>
        <div className="sticky-side">
          <div className="card" style={{ padding: 18 }}>
            <div className="sec-head" style={{ marginBottom: 6 }}><h3 className="h-md">Activity feed</h3></div>
            <ActivityFeed rows={activity} />
          </div>
        </div>
      </div>
    </div>
  );
}
