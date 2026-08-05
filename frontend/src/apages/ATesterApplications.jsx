import { useEffect, useState, useMemo } from "react";
import { Empty, initials } from "../components/ui";
import Icon from "../components/Icon";
import { aapi } from "../aapi/client";

// Helper for pastel avatar colors
const getAvatarTheme = (name) => {
  const char = name.charCodeAt(0) || 65;
  const mod = char % 4;
  if (mod === 0) return { bg: "#f3e8ff", color: "#6366f1" }; // Purple
  if (mod === 1) return { bg: "#ffedd5", color: "#ea580c" }; // Orange
  if (mod === 2) return { bg: "#dcfce7", color: "#16a34a" }; // Green
  return { bg: "#e0f2fe", color: "#0284c7" }; // Blue
};

export default function ATesterApplications() {
  const [items, setItems] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => { aapi.testerApplications().then(d => setItems(d.applications)); }, []);

  const decide = async (item, status) => {
    const body = { status };
    if (status === "approved") body.tier = "junior";
    
    setBusyId(item.id); setError("");
    try {
      await aapi.updateTesterApplication(item.id, body);
      setItems(list => list.map(x => x.id === item.id ? { ...x, status } : x));
    } catch (err) {
      setError(err.message || "Couldn't update");
    } finally { setBusyId(null); }
  };

  const filtered = useMemo(() => {
    if (!items) return [];
    let res = items;
    if (activeTab === "pending_review") res = res.filter(x => x.status === "pending_review");
    if (activeTab === "approved") res = res.filter(x => x.status === "approved");
    if (activeTab === "rejected") res = res.filter(x => x.status === "rejected");
    if (activeTab === "under_review") res = res.filter(x => x.status === "under_review"); // Just in case
    
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(x => 
        (x.name || "").toLowerCase().includes(q) || 
        (x.email || "").toLowerCase().includes(q) || 
        (x.occupation || "").toLowerCase().includes(q)
      );
    }
    
    res = [...res].sort((a, b) => {
      const tA = new Date(a.createdAt).getTime();
      const tB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? tB - tA : tA - tB;
    });
    return res;
  }, [items, activeTab, search, sortOrder]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  useEffect(() => {
    setTimeout(() => setPage(1), 0);
  }, [activeTab, search, sortOrder]);

  if (items === null) return <div className="page rise"><div className="muted">Loading…</div></div>;

  const countTab = (t) => items.filter(x => x.status === t).length;

  return (
    <div className="page rise" style={{ padding: "32px 40px", maxWidth: 1200 }}>
      <div className="row between" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px", color: "#111827" }}>Tester applications</h1>
          <p className="muted" style={{ fontSize: 14, margin: 0, maxWidth: 600, lineHeight: 1.5 }}>
            Validators who applied for Verified Tester status wait here for manual review —
            they keep full validator access until you approve or reject their proof.
          </p>
        </div>
      </div>

      {error && <div className="err-banner rise" style={{ marginBottom: 18 }}>{error}</div>}

      <div className="row between wrap" style={{ marginBottom: 16, gap: 16 }}>
        <div className="row" style={{ gap: 12, overflowX: "auto" }}>
          <button style={{ padding: "8px 16px", borderRadius: 8, background: activeTab === "all" ? "#4f46e5" : "#fff", color: activeTab === "all" ? "#fff" : "#4f46e5", border: activeTab === "all" ? "1px solid #4f46e5" : "1px solid #c7d2fe", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", cursor: "pointer", transition: "0.2s" }} onClick={() => setActiveTab("all")}>
            <Icon name="list" size={16} style={{ marginRight: 8 }} /> All ({items.length})
          </button>
          <button style={{ padding: "8px 16px", borderRadius: 8, background: activeTab === "pending_review" ? "#fffbeb" : "#fff", color: "#d97706", border: "1px solid #fde68a", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", cursor: "pointer", transition: "0.2s" }} onClick={() => setActiveTab("pending_review")}>
            <Icon name="clock" size={16} style={{ marginRight: 8 }} /> Pending ({countTab("pending_review")})
          </button>
          <button style={{ padding: "8px 16px", borderRadius: 8, background: activeTab === "approved" ? "#f0fdf4" : "#fff", color: "#16a34a", border: "1px solid #bbf7d0", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", cursor: "pointer", transition: "0.2s" }} onClick={() => setActiveTab("approved")}>
            <Icon name="checkCircle" size={16} style={{ marginRight: 8 }} /> Approved ({countTab("approved")})
          </button>
          <button style={{ padding: "8px 16px", borderRadius: 8, background: activeTab === "rejected" ? "#fef2f2" : "#fff", color: "#dc2626", border: "1px solid #fecaca", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", cursor: "pointer", transition: "0.2s" }} onClick={() => setActiveTab("rejected")}>
            <Icon name="xCircle" size={16} style={{ marginRight: 8 }} /> Rejected ({countTab("rejected")})
          </button>
        </div>
        <div className="row gap-3">
          <div style={{ position: "relative" }}>
            <Icon name="search" size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
            <input type="text" placeholder="Search by name, email, role..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: "8px 12px 8px 36px", width: 240, fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 8, outline: "none", color: "#111827", background: "#fff" }} />
          </div>
          <button style={{ padding: "8px 16px", borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb", color: "#374151", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", cursor: "pointer" }}>
            <Icon name="filter" size={14} style={{ marginRight: 6 }}/> Filters
          </button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
        <div style={{ position: "relative" }}>
          <select style={{ fontSize: 13, padding: "8px 32px 8px 16px", borderRadius: 8, border: "1px solid #e5e7eb", color: "#374151", fontWeight: 600, outline: "none", cursor: "pointer", background: "#fff", appearance: "none" }} value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <Icon name="arrowDown" size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#6b7280", pointerEvents: "none", display: "none" }} />
          <Icon name="chevronDown" size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#6b7280", pointerEvents: "none" }} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card rise-2"><Empty icon="star" title="No applications found">Try adjusting your filters or search.</Empty></div>
      ) : (
        <div className="col gap-4 rise-2">
          {paginated.map(item => {
            const avatarTheme = getAvatarTheme(item.name);
            const isFinished = busyId === item.id || item.status !== 'pending_review';
            
            return (
            <div key={item.id} style={{ background: "#fff", border: "1px solid #f3f4f6", borderRadius: 12, padding: "24px 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
              {/* TOP ROW */}
              <div className="row between" style={{ alignItems: "flex-start", marginBottom: 24 }}>
                <div className="row gap-4" style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: "none", width: 64, height: 64, borderRadius: "50%", background: avatarTheme.bg, color: avatarTheme.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700 }}>
                    {initials(item.name)}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <h3 style={{ margin: "0 0 4px", fontSize: 18, color: "#111827", fontWeight: 700 }}>{item.name}</h3>
                      <span style={{ fontSize: 14, color: "#6b7280" }}>{item.email}</span>
                    </div>
                    <div className="row gap-3 wrap">
                      {item.occupation && <span style={{ background: "#f3e8ff", color: "#4f46e5", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><Icon name="briefcase" size={14} /> {item.occupation}</span>}
                      {item.experience && <span style={{ background: "#dcfce7", color: "#16a34a", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><Icon name="clock" size={14} /> {item.experience}</span>}
                      {item.company && <span style={{ background: "#fff", border: "1px solid #e5e7eb", color: "#2563eb", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><Icon name="building" size={14} /> {item.company}</span>}
                    </div>
                  </div>
                </div>

                <div className="row gap-4" style={{ alignItems: "center", height: 64 }}>
                  {item.status === 'pending_review' && <span style={{ background: "#ffedd5", color: "#ea580c", padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><Icon name="clock" size={14} /> Pending Review</span>}
                  {item.status === 'approved' && <span style={{ background: "#dcfce7", color: "#16a34a", padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><Icon name="checkCircle" size={14} /> Approved</span>}
                  {item.status === 'rejected' && <span style={{ background: "#fee2e2", color: "#dc2626", padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><Icon name="xCircle" size={14} /> Rejected</span>}
                  <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500, marginLeft: 24, marginRight: 24 }}>Applied {new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <Icon name="chevronRight" size={20} style={{ color: "#9ca3af" }} />
                </div>
              </div>

              <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "0 0 24px" }} />

              {/* BOTTOM */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr 1.5fr auto", gap: 24, alignItems: "flex-start" }}>
                {/* Industries */}
                <div>
                  <b style={{ fontSize: 12, display: "block", marginBottom: 12, color: "#111827", fontWeight: 700 }}>Industries</b>
                  <div className="row gap-2 wrap">
                    {(item.industry || []).map(ind => <span key={ind} style={{ background: "#f1f5f9", borderRadius: 6, padding: "6px 10px", fontSize: 12, color: "#475569", fontWeight: 500 }}>{ind}</span>)}
                    {!(item.industry?.length) && <span style={{ fontSize: 12, color: "#9ca3af" }}>—</span>}
                  </div>
                </div>
                
                {/* About */}
                <div>
                  <b style={{ fontSize: 12, display: "block", marginBottom: 12, color: "#111827", fontWeight: 700 }}>About</b>
                  <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 16px", minHeight: 64 }}>
                    <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: "#475569", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.testingBio || "—"}</p>
                  </div>
                </div>
                
                {/* Links & Resume */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <b style={{ fontSize: 12, display: "block", marginBottom: 12, color: "#111827", fontWeight: 700 }}>Links & Resume:</b>
                  <div className="row gap-3" style={{ marginBottom: 12 }}>
                    <a href={item.linkedinUrl || "#"} onClick={(e) => { if (!item.linkedinUrl) e.preventDefault(); }} target={item.linkedinUrl ? "_blank" : undefined} rel="noreferrer" title={item.linkedinUrl ? "" : "Link is not provided"} style={{ width: 36, height: 36, borderRadius: 8, background: item.linkedinUrl ? "#1d4ed8" : "#fff", border: item.linkedinUrl ? "none" : "1px solid #e5e7eb", color: item.linkedinUrl ? "#fff" : "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", opacity: item.linkedinUrl ? 1 : 0.4, cursor: item.linkedinUrl ? "pointer" : "not-allowed" }}>
                      <Icon name="linkedin" size={18} strokeWidth={item.linkedinUrl ? 2 : 1.9} />
                    </a>
                    <a href={item.githubUrl || "#"} onClick={(e) => { if (!item.githubUrl) e.preventDefault(); }} target={item.githubUrl ? "_blank" : undefined} rel="noreferrer" title={item.githubUrl ? "" : "Link is not provided"} style={{ width: 36, height: 36, borderRadius: 8, background: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", opacity: item.githubUrl ? 1 : 0.4, cursor: item.githubUrl ? "pointer" : "not-allowed" }}>
                      <Icon name="github" size={18} strokeWidth={2.2} />
                    </a>
                    <a href={item.portfolioUrl || "#"} onClick={(e) => { if (!item.portfolioUrl) e.preventDefault(); }} target={item.portfolioUrl ? "_blank" : undefined} rel="noreferrer" title={item.portfolioUrl ? "" : "Link is not provided"} style={{ width: 36, height: 36, borderRadius: 8, background: "#fff", border: "1px solid #c7d2fe", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", opacity: item.portfolioUrl ? 1 : 0.4, cursor: item.portfolioUrl ? "pointer" : "not-allowed" }}>
                      <Icon name="globe" size={18} strokeWidth={2} />
                    </a>
                    
                    <a href={item.resumeUrl || "#"} onClick={(e) => { if (!item.resumeUrl) e.preventDefault(); }} target={item.resumeUrl ? "_blank" : undefined} rel="noreferrer" title={item.resumeUrl ? "" : "Link is not provided"} style={{ width: 36, height: 36, borderRadius: 8, background: "#fff", border: "1px solid #c7d2fe", color: "#1e1b4b", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", opacity: item.resumeUrl ? 1 : 0.4, cursor: item.resumeUrl ? "pointer" : "not-allowed" }}>
                      <Icon name="fileText" size={18} strokeWidth={2} />
                      {item.resumeUrl && (
                        <div style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, background: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <div style={{ width: 12, height: 12, background: "#22c55e", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                            <Icon name="checkCircle" size={10} strokeWidth={4} />
                          </div>
                        </div>
                      )}
                    </a>
                  </div>
                  
                  <div className="row gap-3" style={{ alignItems: "center" }}>
                    {item.resumeUrl ? <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 700 }}>Resume uploaded</span> : <span style={{ fontSize: 12, color: "#9ca3af" }}>No resume</span>}
                    {item.resumeUrl && <a href={item.resumeUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#4f46e5", fontWeight: 700, textDecoration: "none", alignItems: "center", background: "#f5f3ff", padding: "6px 12px", borderRadius: 6, display: "flex", gap: 6 }}><Icon name="eye" size={14} /> Preview Resume</a>}
                  </div>
                </div>
                
                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, height: "100%", alignSelf: "center", paddingTop: 16 }}>
                  {!isFinished && (
                    <>
                      <button style={{ background: "#fff", border: "1px solid #fda4af", color: "#ef4444", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "0.2s" }} onClick={() => decide(item, "rejected")}>
                        <Icon name="xCircle" size={16} strokeWidth={2.5} /> Reject
                      </button>
                      <button style={{ background: "#4f46e5", border: "none", color: "#fff", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "0.2s" }} onClick={() => decide(item, "approved")}>
                        <Icon name="checkCircle" size={16} strokeWidth={2.5} /> Approve
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", marginTop: 24 }}>
            <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
              Showing {filtered.length === 0 ? 0 : (page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filtered.length)} of {filtered.length} results
            </div>
            
            <div className="row gap-2">
              <button style={{ width: 32, height: 32, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb", color: "#374151", display: "flex", alignItems: "center", justifyContent: "center", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1 }} disabled={page === 1} onClick={() => setPage(p => p - 1)}><Icon name="chevronLeft" size={16} /></button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} style={{ width: 32, height: 32, borderRadius: 8, background: page === i + 1 ? "#f5f3ff" : "#fff", border: page === i + 1 ? "1px solid #c7d2fe" : "1px solid #e5e7eb", color: page === i + 1 ? "#4f46e5" : "#374151", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontWeight: 600, fontSize: 13 }} onClick={() => setPage(i + 1)}>{i + 1}</button>
              ))}
              <button style={{ width: 32, height: 32, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb", color: "#374151", display: "flex", alignItems: "center", justifyContent: "center", cursor: page === totalPages || totalPages === 0 ? "not-allowed" : "pointer", opacity: page === totalPages || totalPages === 0 ? 0.5 : 1 }} disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)}><Icon name="chevronRight" size={16} /></button>
            </div>
            
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ position: "relative" }}>
                <select style={{ fontSize: 13, padding: "8px 32px 8px 16px", borderRadius: 8, border: "1px solid #e5e7eb", color: "#374151", fontWeight: 500, outline: "none", cursor: "pointer", background: "#fff", appearance: "none" }} value={itemsPerPage} disabled>
                  <option value="10">10 / page</option>
                </select>
                <Icon name="chevronDown" size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#6b7280", pointerEvents: "none" }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
