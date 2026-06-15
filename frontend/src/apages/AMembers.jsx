import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import { inr } from "../components/ui";
import { aapi } from "../aapi/client";

const TABS = [
  { k: "all", l: "All" },
  { k: "builder", l: "Builders" },
  { k: "validator", l: "Validators" },
];

export default function AMembers() {
  const [members, setMembers] = useState(null);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = (params) => aapi.members(params).then(d => setMembers(d.members));
  useEffect(() => { load({ q, type: tab === "all" ? undefined : tab }); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const search = (e) => {
    e.preventDefault();
    load({ q, type: tab === "all" ? undefined : tab });
  };

  const toggleStatus = async (m) => {
    setBusyId(`${m.type}-${m.id}`); setError("");
    const next = m.status === "active" ? "suspended" : "active";
    try {
      await aapi.setMemberStatus(m.type, m.id, next);
      setMembers(ms => ms.map(x => (x.type === m.type && x.id === m.id) ? { ...x, status: next } : x));
    } catch (err) {
      setError(err.message || "Couldn't update status");
    } finally { setBusyId(null); }
  };

  return (
    <div className="page rise">
      <div className="ph">
        <div><span className="eyebrow">Operations</span><h1>Members</h1><p className="lead">Search builders and validators, and manage account status.</p></div>
      </div>

      {error && <div className="err-banner rise" style={{ marginBottom: 18 }}>{error}</div>}

      <div className="row between wrap gap-3 rise-2" style={{ marginBottom: 18 }}>
        <div className="row gap-2">
          {TABS.map(t => (
            <button key={t.k} className="pill" onClick={() => setTab(t.k)} style={{ cursor: "pointer", fontWeight: 700,
              background: tab === t.k ? "var(--accent)" : "var(--panel)", borderColor: tab === t.k ? "var(--accent)" : "var(--border)", color: tab === t.k ? "#fff" : "var(--text-muted)" }}>{t.l}</button>
          ))}
        </div>
        <form onSubmit={search} className="search" style={{ maxWidth: 320 }}>
          <Icon name="search" size={16} /><input placeholder="Search name, email, org…" value={q} onChange={e => setQ(e.target.value)} />
        </form>
      </div>

      <div className="tbl-wrap rise-3">
        <table className="tbl">
          <thead><tr><th>Name</th><th>Type</th><th>Org / handle</th><th>Status</th><th style={{ textAlign: "right" }}>Balance</th><th style={{ width: 60 }}></th></tr></thead>
          <tbody>
            {members === null ? (
              <tr><td colSpan={6} className="muted" style={{ padding: 24 }}>Loading…</td></tr>
            ) : members.length === 0 ? (
              <tr><td colSpan={6} className="muted" style={{ padding: 24 }}>No members match your search.</td></tr>
            ) : members.map(m => (
              <tr key={`${m.type}-${m.id}`}>
                <td style={{ fontWeight: 600 }}>{m.name}<div className="faint" style={{ fontSize: 12 }}>{m.email}</div></td>
                <td><span className="tag" style={{ background: "var(--panel-inset)", color: "var(--text-muted)" }}>{m.type === "builder" ? "Builder" : "Validator"}</span></td>
                <td className="muted">{m.org}</td>
                <td>
                  <span className={`st ${m.status === "active" ? "st-active" : "st-draft"}`} style={m.status !== "active" ? { color: "var(--danger)" } : undefined}>
                    <span className="d" />{m.status === "active" ? "Active" : "Suspended"}
                  </span>
                </td>
                <td className="num">{inr(m.balance)}</td>
                <td>
                  <button className="btn btn-quiet" disabled={busyId === `${m.type}-${m.id}`}
                    onClick={() => toggleStatus(m)} style={{ fontSize: 12.5, padding: "6px 10px", color: m.status === "active" ? "var(--danger)" : "var(--success)" }}>
                    {m.status === "active" ? "Suspend" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
