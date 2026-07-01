import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Btn, inr } from "../components/ui";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

const TABS = [
  { k: "all", l: "All" },
  { k: "pending", l: "Pending" },
  { k: "approved", l: "Approved" },
  { k: "flagged", l: "Flagged" },
];

function QualityBadge({ quality }) {
  const cfg = {
    high: { label: "High quality", bg: "var(--success-weak)", color: "var(--success)" },
    medium: { label: "Medium", bg: "var(--warning-weak)", color: "var(--warning)" },
    low: { label: "Low effort", bg: "var(--danger-weak)", color: "var(--danger)" },
    flagged: { label: "Flagged", bg: "var(--danger-weak)", color: "var(--danger)" },
  }[quality] || { label: quality, bg: "var(--panel-inset)", color: "var(--text-faint)" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 800, background: cfg.bg, color: cfg.color }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />{cfg.label}
    </span>
  );
}

function SlideOver({ sub, onClose, onAction }) {
  const [rejectReason, setRejectReason] = useState("");
  const [reviseNote, setReviseNote] = useState("");
  const [view, setView] = useState("review"); // review | reject | revise
  if (!sub) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
      <div style={{ flex: 1, background: "rgba(0,0,0,.4)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div style={{ width: 520, background: "var(--bg)", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent)", display: "grid", placeItems: "center", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{sub.name[0]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{sub.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{sub.city} · ★ {sub.trust / 10} trust score</div>
          </div>
          <button className="btn btn-ghost" style={{ padding: 8 }} onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        {/* Meta */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", gap: 20, fontSize: 13 }}>
          <div><div style={{ color: "var(--text-faint)", fontSize: 11, fontWeight: 600, marginBottom: 2 }}>SUBMITTED</div><b>{sub.date}</b></div>
          <div><div style={{ color: "var(--text-faint)", fontSize: 11, fontWeight: 600, marginBottom: 2 }}>TIME TAKEN</div><b>{sub.mins} min</b></div>
          <div><div style={{ color: "var(--text-faint)", fontSize: 11, fontWeight: 600, marginBottom: 2 }}>TASKS</div><b>{sub.tasks}</b></div>
          <div><div style={{ color: "var(--text-faint)", fontSize: 11, fontWeight: 600, marginBottom: 2 }}>QUALITY</div><QualityBadge quality={sub.quality} /></div>
        </div>

        {/* Task breakdown */}
        <div style={{ padding: "16px 24px", flex: 1 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Task responses</div>
          {(sub.breakdown || []).map((b, i) => (
            <div key={i} className="card" style={{ padding: "14px 16px", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, color: "var(--text-faint)" }}>Task {i + 1}</span>
                <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{b.t}</span>
                <div style={{ display: "flex", gap: 2 }}>
                  {[1, 2, 3, 4, 5].map(v => (
                    <div key={v} style={{ width: 14, height: 14, borderRadius: 3, background: b.rating >= v ? "var(--warning)" : "var(--panel-inset)" }} />
                  ))}
                </div>
              </div>
              {b.ans && <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{b.ans}</p>}
            </div>
          ))}
        </div>

        {/* Actions */}
        {view === "review" && sub.status === "pending" && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setView("reject")}>
              <Icon name="x" size={14} /> Reject
            </button>
            <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setView("revise")}>
              <Icon name="edit" size={14} /> Request revision
            </button>
            <Btn variant="primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => onAction(sub.id, "approved")}>
              <Icon name="check" size={14} /> Approve
            </Btn>
          </div>
        )}
        {view === "reject" && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Reason for rejection</div>
            <textarea className="fin" placeholder="Explain why this submission doesn't meet the requirements…" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} style={{ marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setView("review")}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => onAction(sub.id, "rejected", rejectReason)} disabled={!rejectReason.trim()}>Reject submission</button>
            </div>
          </div>
        )}
        {view === "revise" && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>What needs revision?</div>
            <textarea className="fin" placeholder="e.g. Please re-test the checkout flow and describe what happened at step 3…" rows={3} value={reviseNote} onChange={e => setReviseNote(e.target.value)} style={{ marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setView("review")}>Cancel</button>
              <Btn variant="primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => onAction(sub.id, "revision", reviseNote)} disabled={!reviseNote.trim()}>Send request</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MissionReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { builder } = useAuth();
  const [tab, setTab] = useState("pending");
  const [subs, setSubs] = useState([]);
  const [mission, setMission] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get(`/missions/${id}/submissions`);
        setMission(data.mission);
        setSubs(data.submissions || []);
      } catch {
        // mock
        setMission({ name: "Subscription App — Beta Test", target: 50 });
        setSubs([
          { id: "s1", name: "Diya Krishnan", city: "Bengaluru", trust: 94, status: "pending", quality: "high", date: "Today, 9:42 am", mins: 24, tasks: "5/5", breakdown: [{ t: "Sign up & onboarding", rating: 3, ans: "3–4 steps. The email verification loop was confusing." }, { t: "Core product discovery", rating: 4, ans: "Easy to browse but search had no filters." }, { t: "First purchase", rating: 2, ans: "Checkout crashed on payment screen." }] },
          { id: "s2", name: "Arjun Mehta", city: "Mumbai", trust: 88, status: "pending", quality: "medium", date: "Today, 8:15 am", mins: 31, tasks: "5/5", breakdown: [{ t: "Sign up & onboarding", rating: 4, ans: "Smooth, 3 steps." }, { t: "Core product discovery", rating: 3, ans: "Found what I needed eventually." }] },
          { id: "s3", name: "Priya Nair", city: "Kochi", trust: 91, status: "approved", quality: "high", date: "Yesterday", mins: 28, tasks: "5/5", breakdown: [] },
          { id: "s4", name: "Rahul Singh", city: "Delhi", trust: 72, status: "flagged", quality: "low", date: "Yesterday", mins: 4, tasks: "3/5", breakdown: [] },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="page rise"><div className="muted">Loading submissions…</div></div>;

  const counts = { all: subs.length, pending: subs.filter(s => s.status === "pending").length, approved: subs.filter(s => s.status === "approved").length, flagged: subs.filter(s => s.status === "flagged").length };
  const visible = tab === "all" ? subs : subs.filter(s => s.status === tab);
  const selectedSub = selected ? subs.find(s => s.id === selected) : null;

  const handleAction = async (subId, action, note) => {
    try { await api.post(`/missions/${id}/submissions/${subId}/${action}`, { note }); } catch {}
    setSubs(prev => prev.map(s => s.id === subId ? { ...s, status: action === "approved" ? "approved" : action === "rejected" ? "rejected" : "revision" } : s));
    setSelected(null);
  };

  // Aggregate insights
  const pending = subs.filter(s => s.status === "pending");
  const approved = subs.filter(s => s.status === "approved");
  const avgMins = subs.length ? Math.round(subs.reduce((a, s) => a + (s.mins || 0), 0) / subs.length) : 0;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <button className="btn btn-ghost" style={{ padding: "8px 10px" }} onClick={() => navigate(`/missions/${id}`)}>
          <Icon name="arrowLeft" size={16} />
        </button>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Submission Review</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{mission?.name} · {subs.length} of {mission?.target} submissions received</div>
        </div>
      </div>

      {/* Insights panel */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total received", value: subs.length, icon: "users" },
          { label: "Approved", value: approved.length, icon: "check", color: "var(--success)" },
          { label: "Pending review", value: pending.length, icon: "clock", color: "var(--warning)" },
          { label: "Avg time", value: `${avgMins} min`, icon: "timer" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="card" style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Icon name={icon} size={14} style={{ color: color || "var(--text-faint)" }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-faint)" }}>{label.toUpperCase()}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: color || "var(--text)" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 3, background: "var(--panel-inset)", border: "1px solid var(--border)", borderRadius: 30, padding: 3, width: "fit-content", marginBottom: 18 }}>
        {TABS.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            padding: "7px 16px", borderRadius: 30, fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all .14s",
            background: tab === t.k ? "var(--panel)" : "transparent",
            color: tab === t.k ? "var(--text)" : "var(--text-muted)",
            border: "none", boxShadow: tab === t.k ? "var(--shadow-sm)" : "none",
            display: "inline-flex", alignItems: "center", gap: 7,
          }}>
            {t.l}
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, padding: "1px 6px", borderRadius: 20, background: tab === t.k ? "color-mix(in srgb,var(--accent) 15%,transparent)" : "var(--panel-inset)", color: tab === t.k ? "var(--accent)" : "var(--text-faint)" }}>{counts[t.k]}</span>
          </button>
        ))}
      </div>

      {/* Submission list */}
      {visible.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ color: "var(--text-faint)", fontSize: 14 }}>No submissions in this category yet.</div>
        </div>
      ) : visible.map(sub => (
        <div key={sub.id} className="card" onClick={() => setSelected(sub.id)} style={{ padding: "18px 20px", marginBottom: 12, cursor: "pointer", border: selected === sub.id ? "1.5px solid var(--accent)" : "1px solid var(--border)", transition: "all .13s" }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "start" }}>
            {/* Avatar */}
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 15, color: "#fff" }}>{sub.name[0]}</div>

            {/* Info */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{sub.name}</span>
                <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{sub.city}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, padding: "2px 7px", borderRadius: 20, background: "var(--accent-weak)", color: "var(--accent)", fontWeight: 800 }}>★ {(sub.trust / 10).toFixed(1)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12.5, color: "var(--text-muted)" }}>
                <span>{sub.date}</span>
                <span>{sub.mins} min</span>
                <span>{sub.tasks} tasks</span>
                <QualityBadge quality={sub.quality} />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {sub.status === "approved" && <span style={{ color: "var(--success)", fontWeight: 700, fontSize: 13 }}>✓ Approved</span>}
              {sub.status === "flagged" && <span style={{ color: "var(--danger)", fontWeight: 700, fontSize: 13 }}>⚑ Flagged</span>}
              {sub.status === "pending" && (
                <>
                  <button className="btn btn-ghost" style={{ fontSize: 13, padding: "7px 14px" }} onClick={e => { e.stopPropagation(); setSelected(sub.id); }}>Review</button>
                  <button className="btn btn-success" style={{ fontSize: 13, padding: "7px 14px" }} onClick={e => { e.stopPropagation(); handleAction(sub.id, "approved"); }}>✓ Approve</button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Slide-over */}
      {selectedSub && <SlideOver sub={selectedSub} onClose={() => setSelected(null)} onAction={handleAction} />}
    </div>
  );
}
