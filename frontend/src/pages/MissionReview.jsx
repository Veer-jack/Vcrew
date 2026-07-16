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
  { k: "rejected", l: "Rejected" },
  { k: "revision", l: "Revision" },
];

function Toast({ message, type, onClose }) {
  if (!message) return null;
  const colors = { success: "var(--success)", error: "var(--danger)", warning: "var(--warning)" };
  const icons = { success: "checkCircle", error: "alertTriangle", warning: "edit" };
  
  return (
    <div style={{
      position: "fixed", top: 80, right: 24, zIndex: 100,
      background: "var(--bg)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", borderRadius: 8,
      padding: "14px 18px", display: "flex", alignItems: "center", gap: 12,
      borderLeft: `4px solid ${colors[type] || colors.success}`,
      animation: "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      maxWidth: 350
    }}>
      <Icon name={icons[type] || "info"} size={20} style={{ color: colors[type] || colors.success }} />
      <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{message}</div>
      <button className="btn btn-ghost" style={{ padding: 4, margin: "-4px -4px -4px 4px" }} onClick={onClose}><Icon name="x" size={14} /></button>
    </div>
  );
}

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
  const [rating, setRating] = useState(0); // Add rating state
  const [view, setView] = useState("review"); // review | reject | revise | approve
  const [expandedTasks, setExpandedTasks] = useState(new Set([0]));
  const toggleTask = (i) => setExpandedTasks(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next; });

  if (!sub) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
      <div style={{ flex: 1, background: "rgba(0,0,0,.4)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div style={{ width: 660, background: "var(--bg)", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

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
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", gap: 12, overflowX: "auto" }}>
          <div style={{ flex: 1, minWidth: 90, padding: 12, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--panel)", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase" }}><Icon name="calendar" size={12} style={{ color: "var(--accent)" }} /> Submitted</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{sub.date}</div>
          </div>
          <div style={{ flex: 1, minWidth: 90, padding: 12, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--panel)", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase" }}><Icon name="clock" size={12} style={{ color: "var(--accent)" }} /> Time Taken</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{sub.mins} min</div>
          </div>
          <div style={{ flex: 1, minWidth: 90, padding: 12, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--panel)", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase" }}><Icon name="checkCircle" size={12} style={{ color: "var(--accent)" }} /> Tasks</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{sub.tasks}</div>
          </div>
          <div style={{ flex: 1, minWidth: 100, padding: 12, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--panel)", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase" }}><Icon name="shield" size={12} style={{ color: "var(--accent)" }} /> Quality</div>
            <div><QualityBadge quality={sub.quality} /></div>
          </div>
        </div>

        {/* Task breakdown */}
        <div style={{ padding: "16px 24px", flex: 1 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Task responses</div>
          {(sub.breakdown || []).map((b, i) => (
            <div key={i} className="card rise" style={{ marginBottom: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
              <div onClick={() => toggleTask(i)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", cursor: "pointer", userSelect: "none", background: "var(--panel)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "2px 8px", borderRadius: 12, background: "var(--accent-weak)", color: "var(--accent)", fontSize: 11, fontWeight: 700 }}>Task {i + 1}</span>
                <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{b.t}</span>
                <div style={{ display: "flex", gap: 2, marginRight: 8 }}>
                  {[1, 2, 3, 4, 5].map(v => (
                    <Icon key={v} name="star" size={12} style={{ color: b.rating >= v ? "var(--warning)" : "var(--border-strong)" }} />
                  ))}
                  <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 4 }}>5/5</span>
                </div>
                <Icon name={expandedTasks.has(i) ? "chevUp" : "chevDown"} size={16} style={{ color: "var(--text-muted)" }} />
              </div>
              
              {expandedTasks.has(i) && (
                <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
                  {b.ans && !b.details && <p style={{ margin: "16px 0 0", fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{b.ans}</p>}
                  {b.details && b.details.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 16, background: "var(--border)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                      {b.details.map((dt, didx) => (
                        <div key={didx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "var(--panel)" }}>
                          <div style={{ padding: "12px 14px", display: "flex", gap: 10, borderRight: "1px solid var(--border)" }}>
                            <Icon name="helpCircle" size={14} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", lineHeight: 1.4 }}>{dt.label}</div>
                          </div>
                          <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--text)", lineHeight: 1.5, background: "var(--bg)", wordBreak: "break-word" }}>
                            {dt.value}
                          </div>
                        </div>
                      ))}
                      {b.attachments && b.attachments.length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "var(--panel)" }}>
                          <div style={{ padding: "12px 14px", display: "flex", gap: 10, borderRight: "1px solid var(--border)" }}>
                            <Icon name="image" size={14} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", lineHeight: 1.4 }}>Screenshot (if any)</div>
                          </div>
                          <div style={{ padding: "12px 14px", background: "var(--bg)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {b.attachments.map((src, idx) => (
                              <div key={idx} style={{ position: "relative", width: 140, height: 80, borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)" }}>
                                <img src={src} alt="Proof" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                <a href={src} target="_blank" rel="noopener noreferrer" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 600, textDecoration: "none", gap: 4, opacity: 0, transition: "opacity .2s" }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                                  <Icon name="externalLink" size={12} /> View
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        </div>

        {/* Actions Footer */}
        {view === "review" && sub.status === "pending" && (
          <div style={{ background: "var(--panel)", borderTop: "1px solid var(--border)", padding: "16px 24px", display: "flex", gap: 12, alignItems: "center" }}>
            <button className="btn btn-ghost" style={{ padding: "8px 12px", color: "var(--text-muted)", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }} onClick={() => setView("revise")}>
              <Icon name="messageSquare" size={14} /> Add Reviewer Notes...
            </button>
            <div style={{ flex: 1 }} />
            <button className="btn" style={{ padding: "8px 24px", color: "var(--danger)", border: "1px solid color-mix(in srgb,var(--danger) 40%,transparent)", background: "transparent", display: "flex", alignItems: "center", gap: 6 }} onClick={() => setView("reject")}>
              <Icon name="x" size={14} /> Reject
            </button>
            <Btn variant="primary" style={{ padding: "8px 24px", background: "var(--success-weak)", color: "var(--success)", border: "1px solid color-mix(in srgb,var(--success) 40%,transparent)", display: "flex", alignItems: "center", gap: 6 }} onClick={() => setView("approve")}>
              <Icon name="check" size={14} /> Approve
            </Btn>
          </div>
        )}
        
        {view === "approve" && (
          <div style={{ background: "var(--panel)", padding: "16px 24px", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Rate this submission</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
              Your rating directly impacts the validator's Trust Score.
            </div>
            
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map(v => (
                <div 
                  key={v} 
                  onClick={() => setRating(v)}
                  style={{ 
                    cursor: "pointer", padding: "10px", borderRadius: 8,
                    background: rating >= v ? "var(--warning)" : "var(--panel-inset)",
                    color: rating >= v ? "#fff" : "var(--text-faint)",
                    display: "grid", placeItems: "center", transition: "all .15s"
                  }}
                >
                  <Icon name="star" size={24} />
                </div>
              ))}
            </div>

            {rating > 0 && rating <= 2 && (
              <textarea 
                className="fin" 
                placeholder="What went wrong? (Required for low ratings)" 
                rows={2} 
                value={rejectReason} 
                onChange={e => setRejectReason(e.target.value)} 
                style={{ marginBottom: 10 }} 
              />
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setView("review")}>Cancel</button>
              <Btn 
                variant="primary" 
                style={{ flex: 1, justifyContent: "center" }} 
                onClick={() => onAction(sub.id, "approved", rejectReason, rating)} 
                disabled={rating === 0 || (rating <= 2 && !rejectReason.trim())}
              >
                Approve & Rate {rating > 0 ? rating : ''} ★
              </Btn>
            </div>
          </div>
        )}

        {view === "reject" && (
          <div style={{ background: "var(--panel)", padding: "16px 24px", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Reason for rejection</div>
            <textarea className="fin" placeholder="Explain why this submission doesn't meet the requirements…" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} style={{ marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setView("review")}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => onAction(sub.id, "rejected", rejectReason, 1)} disabled={!rejectReason.trim()}>Reject submission</button>
            </div>
          </div>
        )}

        {view === "revise" && (
          <div style={{ background: "var(--panel)", padding: "16px 24px", borderTop: "1px solid var(--border)" }}>
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
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get(`/missions/${id}/submissions`);
        setMission(data.mission);
        setSubs(data.submissions || []);
      } catch (err) {
        console.error("Failed to load submissions:", err);
        showToast(err.message || "Failed to load submissions", "error");
        setSubs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="page rise"><div className="muted">Loading submissions…</div></div>;

  const counts = { 
    all: subs.length, 
    pending: subs.filter(s => s.status === "pending").length, 
    approved: subs.filter(s => s.status === "approved").length, 
    flagged: subs.filter(s => s.status === "flagged").length,
    rejected: subs.filter(s => s.status === "rejected").length,
    revision: subs.filter(s => s.status === "revision").length,
  };
  const visible = tab === "all" ? subs : subs.filter(s => s.status === tab);
  const selectedSub = selected ? subs.find(s => s.id === selected) : null;

  const handleAction = async (subId, action, reason, rating) => {
    const subName = subs.find(s => s.id === subId)?.name || "Validator";
    try {
      if (action === "approved") {
        await api.post(`/missions/${id}/submissions/${subId}/approved`, { rating });
        showToast(`Approved submission from ${subName}`, "success");
      } else if (action === "rejected") {
        await api.post(`/missions/${id}/submissions/${subId}/rejected`, { note: reason, rating });
        showToast(`Rejected submission from ${subName}`, "error");
      } else if (action === "revision") {
        await api.post(`/missions/${id}/submissions/${subId}/revision`, { note: reason });
        showToast(`Revision request sent to ${subName}`, "warning");
      }
    } catch (err) {
      alert(err.message || "An error occurred");
      return; // Stop execution on error
    }
    setSubs(prev => prev.map(s => s.id === subId ? { ...s, status: action === "approved" ? "approved" : action === "rejected" ? "rejected" : "revision" } : s));
    setSelected(null);
  };

  // Aggregate insights
  const pending = subs.filter(s => s.status === "pending");
  const approved = subs.filter(s => s.status === "approved");
  const avgMins = subs.length ? Math.round(subs.reduce((a, s) => a + (s.mins || 0), 0) / subs.length) : 0;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}>
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
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
              {sub.status === "rejected" && <span style={{ color: "var(--text-muted)", fontWeight: 700, fontSize: 13 }}>✕ Rejected</span>}
              {sub.status === "revision" && <span style={{ color: "var(--warning)", fontWeight: 700, fontSize: 13 }}>✎ Revision Req</span>}
              {sub.status === "pending" && (
                <>
                  <button className="btn btn-ghost" style={{ fontSize: 13, padding: "7px 14px" }} onClick={e => { e.stopPropagation(); setSelected(sub.id); }}>Review</button>
                  <button className="btn btn-success" style={{ fontSize: 13, padding: "7px 14px" }} onClick={e => { e.stopPropagation(); setSelected(sub.id); }}>✓ Approve</button>
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
