import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Btn, Empty, MissionLogo, PBarRow, StatusTag, TypeTag, inr } from "../components/ui";
import { useMeta } from "../context/MetaContext";
import { api } from "../api/client";

const TABS = [
  { k: "active", l: "Active" },
  { k: "draft", l: "Draft" },
  { k: "closed", l: "Closed" },
  { k: "completed", l: "Completed" },
  { k: "archived", l: "Archived" },
];

function MissionsTable({ rows, nav, categories }) {
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

export default function Missions() {
  const navigate = useNavigate();
  const { categories } = useMeta();
  const [tab, setTab] = useState("active");
  const [q, setQ] = useState("");
  const [missions, setMissions] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.missions({ status: tab, q }).then(d => { setMissions(d.missions); setLoading(false); });
  }, [tab, q]);

  // counts per tab (one extra call, cheap and infrequent)
  useEffect(() => {
    Promise.all(TABS.map(t => api.missions({ status: t.k }).then(d => [t.k, d.missions.length])))
      .then(entries => setCounts(Object.fromEntries(entries)));
  }, [missions.length]);

  return (
    <div className="page rise">
      <div className="ph">
        <div><span className="eyebrow">Mission management</span><h1>Missions</h1><p className="lead">Every study you've run, in flight, or drafted.</p></div>
        <div className="ph-actions"><Btn variant="primary" icon="plus" onClick={() => navigate("/missions/new")}>Create Mission</Btn></div>
      </div>
      <div className="toolbar">
        <div className="tabs">{TABS.map(t => <button key={t.k} className={tab === t.k ? "on" : ""} onClick={() => setTab(t.k)}>{t.l}<span className="cnt">{counts[t.k] ?? "·"}</span></button>)}</div>
        <span className="grow" />
        <div className="seg-search"><Icon name="search" size={16} /><input placeholder="Search missions…" value={q} onChange={e => setQ(e.target.value)} /></div>
      </div>
      {loading ? <div className="muted" style={{ padding: 24 }}>Loading…</div>
        : missions.length === 0
          ? <Empty icon="layers" title={`No ${tab} missions`} action={tab === "draft" || tab === "active" ? <Btn variant="primary" icon="plus" onClick={() => navigate("/missions/new")}>Create your first mission</Btn> : null}>{tab === "completed" ? "Completed missions will appear here once they wrap." : "Nothing here yet."}</Empty>
          : <MissionsTable rows={missions} nav={navigate} categories={categories} />}
    </div>
  );
}
