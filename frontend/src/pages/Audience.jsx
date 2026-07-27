import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Avatar, Btn, Empty, KpiCard, MatchRing } from "../components/ui";
import { api } from "../api/client";
import { InviteToMissionModal } from "../components/InviteToMissionModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const EMPTY_SEL = (filters) => Object.fromEntries(Object.keys(filters).map(k => [k, new Set()]));

const COUNTRY_MAP = {
  "India": ["Bengaluru", "Mumbai", "Delhi NCR", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad", "Jaipur"]
};

const matchOption = (m, g, o) => {
  if (g === "Geography") {
    const qGeo = o.toLowerCase();
    if (qGeo.includes("worldwide") || qGeo.includes("remote")) return true;
    const c = m.city.toLowerCase();
    if (c.includes(qGeo)) return true;
    if (COUNTRY_MAP[o] && COUNTRY_MAP[o].some(city => c.includes(city.toLowerCase()))) return true;
    return false;
  }
  if (g === "ValidationCrew Role") return m.role === o;
  if (g === "Professional") return m.occ === o;
  if (g === "Interests") return m.industry === o || (m.expertise && m.expertise.includes(o));
  if (g === "Demographics") {
    return m.age_group === o || m.gender === o || m.income === o || m.marital === o || 
           (o === "Yes" && m.has_kids === "Yes") || (o === "No" && m.has_kids === "No");
  }
  return false;
};

export default function AudienceExplorer() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [filters, setFilters] = useState({});
  const [sel, setSel] = useState({});
  const [closed, setClosed] = useState(new Set());
  const [q, setQ] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [inviteModalValidator, setInviteModalValidator] = useState(null);

  useEffect(() => {
    api.audience().then(d => { 
      setMembers(d.members); 
      setFilters(d.filters); 
      setSel(EMPTY_SEL(d.filters)); 
      setIsLoading(false);
    });
  }, []);

  const toggle = (g, o) => setSel(p => { const s = new Set(p[g]); s.has(o) ? s.delete(o) : s.add(o); return { ...p, [g]: s }; });
  const toggleGroup = (g) => setClosed(p => { const s = new Set(p); s.has(g) ? s.delete(g) : s.add(g); return s; });
  const toggleSubgroup = (sub) => setClosedSub(p => { const s = new Set(p); s.has(sub) ? s.delete(sub) : s.add(sub); return s; });
  
  const [closedSub, setClosedSub] = useState(new Set());
  
  const activeFilters = Object.values(sel).reduce((a, s) => a + (s?.size || 0), 0);

  const counts = useMemo(() => {
    const map = {};
    for (const [g, opts] of Object.entries(filters)) {
      map[g] = {};
      const flatOpts = Array.isArray(opts) ? opts : Object.values(opts).flat();
      for (const o of flatOpts) {
        map[g][o] = members.filter(m => matchOption(m, g, o)).length;
      }
    }
    return map;
  }, [members, filters]);

  const results = useMemo(() => {
    if (!sel.Geography) return members;
    return members.filter(m => {
      const geo = sel.Geography.size === 0 || [...sel.Geography].some(o => matchOption(m, "Geography", o));
      const role = !sel["ValidationCrew Role"] || sel["ValidationCrew Role"].size === 0 || [...sel["ValidationCrew Role"]].some(o => matchOption(m, "ValidationCrew Role", o));
      const occ = !sel.Professional || sel.Professional.size === 0 || [...sel.Professional].some(o => matchOption(m, "Professional", o));
      const int = sel.Interests.size === 0 || [...sel.Interests].some(o => matchOption(m, "Interests", o));
      const demo = !sel.Demographics || sel.Demographics.size === 0 || [...sel.Demographics].some(o => matchOption(m, "Demographics", o));
      const qq = !q || (m.name + m.occ + m.city).toLowerCase().includes(q.toLowerCase());
      return geo && role && occ && int && demo && qq;
    }).sort((a, b) => b.match - a.match);
  }, [members, sel, q]);

  const exportPDF = () => {
    if (!results.length) return;
    const doc = new jsPDF();
    
    // Add Title
    doc.setFontSize(18);
    doc.setTextColor(20, 20, 20);
    doc.text("ValidationCrew — Audience Export", 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on ${new Date().toLocaleDateString()} · ${results.length} members`, 14, 30);

    // Prepare table data
    const tableColumn = ["Name", "Occupation", "Location", "Role", "Trust", "Match %", "Verified"];
    const tableRows = results.map(m => [
      m.name,
      m.occ,
      m.city,
      m.role,
      m.trust > 0 ? m.trust.toString() : "Establishing Trust",
      `${m.match}%`,
      m.verified ? "Yes" : "No"
    ]);

    // Draw table using autoTable function directly
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 36,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      styles: { fontSize: 10, cellPadding: 4, textColor: [50, 50, 50] },
    });

    doc.save("audience_export.pdf");
  };

  const verifiedPct = members.length ? Math.round((members.filter(a => a.verified).length / members.length) * 100) : 0;

  return (
    <div className="page rise">
      <div className="ph">
        <div>
          <span className="eyebrow">Discovery</span>
          <h1>Audience Explorer</h1>
          <p className="lead">Search verified members and layer filters to find exactly who should validate your product.</p>
        </div>
        <div className="ph-actions"><Btn variant="primary" icon="plus" onClick={() => navigate("/missions/new")}>Create Mission</Btn></div>
      </div>

      <div className="kpis sec" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <KpiCard label="Matching members" value={results.length} icon="users" />
        <KpiCard label="Verified" value={verifiedPct} unit="%" icon="shield" tone="green" />
        <KpiCard label="Avg trust score" value="88" icon="award" />
        <KpiCard label="Active this week" value="71%" icon="bolt" tone="amber" />
      </div>

      <div className="aud">
        <div className="filter-panel">
          <div className="row between" style={{ marginBottom: 16, alignItems: 'center' }}>
            <b style={{ fontSize: 15, fontWeight: 800 }}>Filters</b>
            <button style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '5px 6px', background: 'var(--panel)', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <Icon name="filter" size={14} />
            </button>
          </div>
          {Object.entries(filters).map(([g, opts]) => (
            <div key={g} className={`fgroup ${closed.has(g) ? "closed" : ""}`}>
              <button className="fgroup-h" onClick={() => toggleGroup(g)}>{g}<Icon name="chevronDown" size={15} /></button>
              <div className="fgroup-body">
                {Array.isArray(opts) ? opts.map(o => {
                  const on = sel[g]?.has(o);
                  return (
                    <button key={o} className={`fcheck ${on ? "on" : ""}`} onClick={() => toggle(g, o)}>
                      <span className="box">{on && <Icon name="check" size={11} />}</span>{o}
                      <span className="fcount">{counts[g]?.[o] || 0}</span>
                    </button>
                  );
                }) : Object.entries(opts).map(([sub, subOpts]) => (
                  <div key={sub} className={`subgroup ${closedSub.has(sub) ? "" : "open"}`}>
                    <button className="subgroup-h" onClick={() => toggleSubgroup(sub)}>{sub} <Icon name="chevronDown" size={14} /></button>
                    <div className="subgroup-body">
                      {subOpts.map(o => {
                        const on = sel[g]?.has(o);
                        return (
                          <button key={o} className={`fcheck ${on ? "on" : ""}`} onClick={() => toggle(g, o)}>
                            <span className="box">{on && <Icon name="check" size={11} />}</span>{o}
                            <span className="fcount">{counts[g]?.[o] || 0}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <Btn variant="outline" size="sm" icon="refresh" style={{ width: '100%', marginTop: 20 }} onClick={() => setSel(EMPTY_SEL(filters))}>Reset Filters</Btn>
        </div>

        <div>
          {activeFilters > 0 && (
            <div className="active-filters-bar">
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>Active Filters</span>
              <div className="row" style={{ flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {Object.entries(sel).map(([g, s]) => [...s].map(o => (
                  <div key={g+o} className="afilter-chip">
                    {o} <button onClick={() => toggle(g, o)}><Icon name="x" size={12} /></button>
                  </div>
                )))}
                <button className="backlink" style={{ marginLeft: "auto", fontSize: 13, color: "var(--accent)" }} onClick={() => setSel(EMPTY_SEL(filters))}>
                  <Icon name="trash" size={13} style={{ marginRight: 4, verticalAlign: -2 }}/>Clear all
                </button>
              </div>
            </div>
          )}
          
          <div className="toolbar">
            <div className="seg-search"><Icon name="search" size={16} /><input placeholder="Search by name, role, city…" value={q} onChange={e => setQ(e.target.value)} /></div>
            <span className="muted" style={{ fontSize: 13 }}>{results.length} results</span>
            <span className="grow" />
            <span style={{ fontSize: 13, fontWeight: 500, marginRight: 16 }}>Sort by: Match <Icon name="chevronDown" size={14} style={{ verticalAlign: -2, marginLeft: 4 }}/></span>
            <Btn variant="ghost" size="sm" icon="download" onClick={exportPDF} disabled={results.length === 0}>Export PDF</Btn>
          </div>
          {isLoading ? (
            <div className="col gap-3" style={{ opacity: 0.6 }}>
              {[1, 2, 3].map(i => (
                <div className="aud-card" key={i} style={{ minHeight: 90 }}>
                  <div className="muted">Loading members...</div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <Empty icon="users" title="No members match these filters" action={<Btn variant="ghost" icon="refresh" onClick={() => { setSel(EMPTY_SEL(filters)); setQ(""); }}>Reset filters</Btn>}>Try widening your geography or removing an interest to grow the pool.</Empty>
          ) : (
            <div className="col gap-3">
              {results.map((m) => (
                <div className="aud-card" key={m.id}>
                  <Avatar name={m.name} size={46} />
                  <div className="aud-meta">
                    <div className="aud-name">{m.name} {m.verified && <span className="verif"><Icon name="checkCircle" size={14} /> Verified</span>}</div>
                    <div className="aud-sub">{m.occ} · {m.city} · <span className="mono">{m.role}</span></div>
                    <div className="aud-tags">{m.expertise.map(e => <span key={e} className="mtag">{e}</span>)}</div>
                  </div>
                  <div className="aud-right">
                    <MatchRing value={m.match} />
                    {m.trust >= 90 && (
                      <span className="mtag" style={{ background: "var(--success-weak)", color: "var(--success)", border: "none" }}>
                        <Icon name="award" size={11} style={{ verticalAlign: -2, marginRight: 3 }} />Trust 90+
                      </span>
                    )}
                    {m.trust > 0 && m.trust < 90 && (
                      <span className="mtag" style={{ background: "var(--panel-inset)", color: "var(--text-muted)", border: "none" }}>
                        Trust {m.trust}
                      </span>
                    )}
                    {m.trust === 0 && (
                      <span className="mtag" style={{ background: "var(--accent-weak)", color: "var(--accent)", border: "none" }}>
                        <Icon name="zap" size={11} style={{ verticalAlign: -2, marginRight: 3 }} />Establishing Trust
                      </span>
                    )}
                    <Btn variant="ghost" size="sm" icon="userplus" onClick={() => setInviteModalValidator(m)}>Invite</Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {inviteModalValidator && (
        <InviteToMissionModal validator={inviteModalValidator} onClose={() => setInviteModalValidator(null)} />
      )}
    </div>
  );
}
