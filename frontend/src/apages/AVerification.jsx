import { useEffect, useState, useMemo } from "react";
import { Empty } from "../components/ui";
import Icon from "../components/Icon";
import { aapi } from "../aapi/client";

const KIND_LABELS = {
  website: { label: "Website", icon: "globe", color: "#4338ca", bg: "#f4f5fc", circleBg: "#e0e6fa" },
  linkedin: { label: "LinkedIn", icon: "linkedin", color: "#0077b5", bg: "#f0f6ff", circleBg: "transparent", iconBg: "#0077b5", iconColor: "#fff" },
  registry: { label: "Business", icon: "building", color: "#9333ea", bg: "#fdf5ff", circleBg: "#f5e6ff" },
  academic: { label: "Scholarly", icon: "flask", color: "#0d9488", bg: "#f0fdfa", circleBg: "#ccfbf1" },
};

function formatDate(ds) {
  if (!ds) return "";
  return new Date(ds).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AVerification() {
  const [items, setItems] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const perPage = 20;

  useEffect(() => { 
    aapi.verifications("all").then(d => setItems(d.verifications || [])); 
  }, []);

  const decide = async (item, status, note = null) => {
    setBusyId(item.id); setError("");
    try {
      await aapi.updateVerification(item.id, status, note);
      setItems(list => list.map(x => x.id === item.id ? { ...x, status, reviewedAt: new Date().toISOString(), note: status === 'rejected' ? note : x.note } : x));
      setRejectingItem(null);
      setRejectNote("");
    } catch (err) {
      setError(err.message || "Couldn't update");
    } finally { setBusyId(null); }
  };

  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter(it => {
      if (tab !== "all") {
        if (it.status !== tab) return false;
      }
      if (q) {
        const query = q.toLowerCase();
        if (!it.builderName?.toLowerCase().includes(query) && !it.email?.toLowerCase().includes(query) && !it.org?.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [items, tab, q]);

  const counts = useMemo(() => {
    if (!items) return { all: 0, pending: 0, under_review: 0, approved: 0, rejected: 0 };
    return {
      all: items.length,
      pending: items.filter(i => i.status === "pending").length,
      approved: items.filter(i => i.status === "approved").length,
      rejected: items.filter(i => i.status === "rejected").length,
    };
  }, [items]);

  const TABS = [
    { k: "all", l: "All", icon: "list", color: "var(--accent)" },
    { k: "pending", l: "Pending", icon: "clock", color: "#f59e0b" },
    { k: "approved", l: "Approved", icon: "checkCircle", color: "#10b981" },
    { k: "rejected", l: "Rejected", icon: "xCircle", color: "#ef4444" },
  ];

  if (items === null) return <div className="page rise"><div className="muted">Loading…</div></div>;

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="page rise">
      {error && <div className="err-banner rise" style={{ marginBottom: 18 }}>{error}</div>}

      <div className="row between wrap gap-3 rise-2" style={{ marginBottom: 20 }}>
        <div className="row gap-2" style={{ overflowX: "auto", flexWrap: "nowrap" }}>
          {TABS.map(t => {
            const active = tab === t.k;
            const isAll = t.k === "all";
            return (
              <button key={t.k} className="btn" onClick={() => { setTab(t.k); setPage(1); }} style={{ 
                padding: "6px 12px", fontSize: 13, fontWeight: 600, 
                background: active ? t.color : "#fff", 
                borderColor: active ? t.color : t.color, 
                color: active ? "#fff" : t.color,
                display: "flex", alignItems: "center", gap: 6,
                borderRadius: 8, border: "1px solid",
                opacity: active ? 1 : 0.7
              }}>
                <Icon name={t.icon} size={14} style={{ color: active ? "#fff" : t.color }} />
                {t.l} ({counts[t.k]})
              </button>
            );
          })}
        </div>
        <div className="row gap-2">
          <form className="search" style={{ width: 220, margin: 0, background: "#fff", border: "1px solid var(--border)", borderRadius: 8 }}>
            <Icon name="search" size={14} style={{ color: "var(--text-muted)" }} />
            <input placeholder="Search by name, email, role..." value={q} onChange={e => { setQ(e.target.value); setPage(1); }} style={{ fontSize: 13, border: "none", outline: "none", background: "transparent" }} />
          </form>
          <button className="btn btn-outline" style={{ display: 'flex', gap: 6, fontSize: 13, background: "#fff", borderRadius: 8, borderColor: "var(--border)", color: "var(--text)" }}>
            <Icon name="filter" size={14}/> Filters
          </button>
        </div>
      </div>

      <div className="row end rise-2" style={{ marginBottom: 12 }}>
        <button className="btn btn-ghost" style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", padding: "4px 8px" }}>
          <Icon name="arrowDown" size={14} /> Newest first <Icon name="chevronDown" size={14} />
        </button>
      </div>

      <div className="card rise-3" style={{ background: "#fff", padding: 0, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 200px 220px', padding: '16px 24px', background: 'var(--panel)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: "uppercase", letterSpacing: 0.5 }}>
          <div>Applicant</div>
          <div>Verification Details</div>
          <div>Status</div>
          <div>Actions</div>
        </div>

        {/* List */}
        {pageItems.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>No verifications found.</div>
        ) : (
          <div className="col">
            {pageItems.map((item, idx) => {
              const kind = KIND_LABELS[item.kind] || { label: item.kind, icon: "fileText", short: item.kind };
              const isFile = item.kind === "registry";
              let statusColor = "#f59e0b";
              let statusBg = "#fef3c7";
              let statusIcon = "clock";
              let statusText = "Pending Review";
              let statusSub = "Waiting for your review";
              let isReverify = item.status === "pending" && item.reviewedAt;
              
              if (item.status === "approved") {
                statusColor = "#10b981"; statusBg = "#d1fae5"; statusIcon = "checkCircle"; statusText = "Approved"; statusSub = `Reviewed ${formatDate(item.reviewedAt)} by Admin`;
              } else if (item.status === "rejected") {
                statusColor = "#ef4444"; statusBg = "#fee2e2"; statusIcon = "xCircle"; statusText = "Rejected"; statusSub = `Reviewed ${formatDate(item.reviewedAt)} by Admin`;
              } else if (item.status === "reviewing") {
                statusColor = "#3b82f6"; statusBg = "#dbeafe"; statusIcon = "eye"; statusText = "Under Review"; statusSub = "Review in progress";
              }

              const isDone = item.status === "approved" || item.status === "rejected";

              return (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '320px 1fr 200px 220px', padding: '24px', borderBottom: idx < pageItems.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                  
                  {/* Applicant */}
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ width: 72, height: 105, borderRadius: 12, background: kind.bg || 'var(--accent-weak)', color: kind.color || 'var(--accent)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 0 }}>
                      <div style={{ width: 40, height: 40, borderRadius: kind.iconBg ? 10 : 20, background: kind.iconBg || kind.circleBg || 'transparent', color: kind.iconColor || kind.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={kind.icon} size={22} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, textAlign: 'center', lineHeight: 1.3 }}>{kind.label}<br/><span style={{ fontWeight: 600, fontSize: 9 }}>Verification</span></span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <b style={{ fontSize: 14, display: "block", marginBottom: 2 }}>{item.builderName}</b>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.persona || "Founder"} · {item.org}</div>
                      <div style={{ display: 'flex', gap: 6, fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 4, alignItems: 'center', whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        <Icon name="mail" size={13} style={{ flexShrink: 0 }} /> {item.email}
                      </div>
                      <div style={{ display: 'flex', gap: 6, fontSize: 11.5, color: 'var(--text-muted)', alignItems: 'center' }}>
                        <Icon name="calendar" size={13} style={{ flexShrink: 0 }} /> Submitted {formatDate(item.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div style={{ paddingRight: 20, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>{isFile ? "Business Registry Document" : `${kind.label} URL`}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                      <Icon name={isFile ? "fileText" : "link"} size={14} style={{ color: isFile ? '#ef4444' : 'var(--accent)', flexShrink: 0 }} />
                      <a href={item.subject} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textDecoration: 'none', whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {isFile ? item.subject.split('/').pop() || "Document.pdf" : item.subject}
                      </a>
                      {!isFile && <Icon name="externalLink" size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
                    </div>
                    <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12, border: "1px solid var(--border)", background: "#fff", display: "inline-flex", gap: 6 }} onClick={() => window.open(item.subject, "_blank")}>
                      {isFile ? "Preview" : "Open"} {isFile ? <Icon name="eye" size={12}/> : <Icon name="externalLink" size={12} />}
                    </button>
                  </div>

                  {/* Status */}
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, border: `1px solid ${statusColor}`, color: statusColor, background: statusBg, fontSize: 12, fontWeight: 600 }}>
                      <Icon name={statusIcon} size={14} /> {statusText}
                    </div>
                    {isReverify && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 4, background: '#fef3c7', color: '#d97706', fontSize: 10, fontWeight: 700, marginLeft: 8, textTransform: 'uppercase' }}>
                        Reverify
                      </div>
                    )}
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>{statusSub}</div>
                  </div>

                  {/* Actions */}
                  <div>
                    {isDone ? (
                      <div style={{ color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: 14, marginBottom: 4 }}>—</div>
                        <div style={{ fontSize: 11.5 }}>No actions required</div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn" disabled={busyId === item.id} onClick={() => setRejectingItem(item)} style={{ 
                          padding: "8px 16px", fontSize: 13, fontWeight: 600, 
                          color: '#ef4444', 
                          background: 'transparent', 
                          border: '1px solid #ef4444',
                          display: "flex", alignItems: "center", gap: 6, borderRadius: 6
                        }}>
                          <Icon name="xCircle" size={14}/> Reject
                        </button>
                        <button className="btn btn-primary" disabled={busyId === item.id} onClick={() => decide(item, "approved")} style={{ 
                          padding: "8px 16px", fontSize: 13, fontWeight: 600, 
                          display: "flex", alignItems: "center", gap: 6, borderRadius: 6,
                          background: 'var(--accent)', color: '#fff', border: 'none'
                        }}>
                          <Icon name="checkCircle" size={14}/> Approve
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderTop: "1px solid var(--border)", background: "var(--panel)" }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Showing {Math.min((page - 1) * perPage + 1, filtered.length)} to {Math.min(page * perPage, filtered.length)} of {filtered.length} results
          </div>
          <div className="row gap-1">
            <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: "4px 8px" }}><Icon name="chevronLeft" size={14}/></button>
            <button className="btn" style={{ padding: "4px 12px", border: "1px solid var(--accent)", color: "var(--accent)", fontWeight: 600, background: "var(--accent-weak)" }}>{page}</button>
            <button className="btn btn-ghost" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)} style={{ padding: "4px 8px" }}><Icon name="chevronRight" size={14}/></button>
          </div>
        </div>
      </div>

      {rejectingItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div className="card rise" style={{ width: 400, padding: 24, background: "#fff", borderRadius: 12 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Reject Verification</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>Reason for rejection</label>
              <textarea 
                className="input" 
                style={{ width: "100%", height: 100, padding: 12, fontSize: 13 }} 
                placeholder="Explain why this was rejected. The builder will see this message."
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => { setRejectingItem(null); setRejectNote(""); }} style={{ padding: "8px 16px" }}>Cancel</button>
              <button className="btn" disabled={!rejectNote.trim() || busyId === rejectingItem.id} onClick={() => decide(rejectingItem, "rejected", rejectNote)} style={{ padding: "8px 16px", background: "#ef4444", color: "#fff", border: "none" }}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
