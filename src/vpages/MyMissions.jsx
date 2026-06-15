import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { VEmpty, VReward, VTypeTag } from "../vcomponents/vui";
import { useVMeta } from "../vcontext/VMetaContext";
import { vapi } from "../vapi/client";

const MM_STATUS = {
  applied:   { label: "Applied", tone: "var(--warning)", bg: "var(--warning-weak)" },
  active:    { label: "Active", tone: "var(--accent)", bg: "var(--accent-weak)" },
  submitted: { label: "In review", tone: "var(--warning)", bg: "var(--warning-weak)" },
  completed: { label: "Paid", tone: "var(--success)", bg: "var(--success-weak)" },
  rejected:  { label: "Not selected", tone: "var(--text-faint)", bg: "var(--panel-inset)" },
};

const TABS = [
  { k: "applied", l: "Applied" },
  { k: "active", l: "Active" },
  { k: "submitted", l: "Submitted" },
  { k: "completed", l: "Completed" },
  { k: "rejected", l: "Rejected" },
];

function MyMissionRow({ m, vtypes, navigate }) {
  const t = vtypes[m.type];
  const s = MM_STATUS[m.status];
  return (
    <div className="card" style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "center" }}>
      <span style={{ width: 46, height: 46, borderRadius: 13, display: "grid", placeItems: "center", flex: "none",
        background: `color-mix(in srgb, var(${t.accentVar}) 14%, transparent)`, color: `var(${t.accentVar})` }}>
        <Icon name={t.icon} size={22} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="row gap-2" style={{ alignItems: "baseline" }}>
          <b style={{ fontSize: 16, letterSpacing: "-.01em" }}>{m.product}</b>
          <span className="muted" style={{ fontSize: 13.5 }}>· {m.tagline}</span>
        </div>
        <div className="row gap-3 wrap faint" style={{ fontSize: 12.5, marginTop: 5 }}>
          <span className="tag" style={{ background: s.bg, color: s.tone }}>{s.label}</span>
          <span className="row gap-2"><Icon name="clock" size={13} />{m.deadline}</span>
          {m.status === "active" && <span className="row gap-2"><Icon name="list" size={13} />{m.progress}% complete</span>}
          {m.quality && m.quality !== "—" && <span className="row gap-2" style={{ color: "var(--success)" }}><Icon name="sparkle" size={13} />{m.quality}</span>}
        </div>
        {m.status === "active" && <div className="lvl-meter" style={{ marginTop: 10, maxWidth: 320 }}><i style={{ width: m.progress + "%" }} /></div>}
        {m.reason && <p className="faint" style={{ margin: "7px 0 0", fontSize: 12.5 }}>{m.reason}</p>}
      </div>
      <div className="col" style={{ alignItems: "flex-end", gap: 10 }}>
        <div style={{ textAlign: "right" }}><VReward amount={m.reward} /><div className="faint" style={{ fontSize: 11 }}>reward</div></div>
        {m.status === "active" && <button className="btn btn-primary" onClick={() => navigate(`/validator/missions/${m.taskId}/workspace`)}>Resume <Icon name="arrowRight" /></button>}
        {m.status === "applied" && <span className="pill" style={{ fontSize: 12 }}><Icon name="clock" size={13} />Awaiting</span>}
        {m.status === "submitted" && <span className="pill" style={{ fontSize: 12, color: "var(--warning)" }}><Icon name="clock" size={13} />In review</span>}
        {m.status === "completed" && <span className="pill" style={{ fontSize: 12, color: "var(--success)" }}><Icon name="check" size={13} />Paid</span>}
      </div>
    </div>
  );
}

export default function MyMissions() {
  const navigate = useNavigate();
  const { vtypes } = useVMeta();
  const [tab, setTab] = useState("active");
  const [data, setData] = useState(null);

  useEffect(() => { vapi.myMissions(tab).then(setData); }, [tab]);

  const tabs = TABS.map(t => ({ ...t, c: data?.counts?.[t.k] ?? "·" }));

  return (
    <div className="page">
      <div className="row between wrap gap-4 rise" style={{ marginBottom: 20 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Your work</div>
          <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: "-.03em" }}>My missions</h2>
          <p className="muted" style={{ margin: "6px 0 0", fontSize: 15 }}>Everything you've applied to, are working on, or have wrapped up.</p>
        </div>
      </div>

      <div className="row gap-2 wrap rise-2" style={{ marginBottom: 18 }}>
        {tabs.map(t => (
          <button key={t.k} className="pill" onClick={() => setTab(t.k)} style={{ cursor: "pointer", fontWeight: 700,
            background: tab === t.k ? "var(--accent)" : "var(--panel)", borderColor: tab === t.k ? "var(--accent)" : "var(--border)", color: tab === t.k ? "#fff" : "var(--text-muted)" }}>
            {t.l}<span style={{ opacity: .7, fontFamily: "var(--mono)", fontSize: 11 }}>{t.c}</span>
          </button>
        ))}
      </div>

      {!data ? <div className="muted">Loading…</div> : data.missions.length === 0
        ? <div className="card" style={{ padding: 0 }}>
            <VEmpty icon="inbox" title={`Nothing ${tab} yet`}
              body={tab === "applied" ? "Missions you apply to will wait here for a decision." : tab === "completed" ? "Approved, paid missions will collect here." : "When you take on a mission it'll show up here."}
              cta={tab !== "completed" && tab !== "rejected" ? <button className="btn btn-primary" onClick={() => navigate("/validator")}>Discover missions</button> : null} />
          </div>
        : <div className="rise-3" style={{ display: "grid", gap: 12 }}>{data.missions.map(m => <MyMissionRow key={m.id} m={m} vtypes={vtypes} navigate={navigate} />)}</div>}
    </div>
  );
}
