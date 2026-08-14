import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Avatar, Btn, Empty, KpiCard, MatchRing } from "../components/ui";
import { api } from "../api/client";
import { InviteToMissionModal } from "../components/InviteToMissionModal";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useTranslation } from "../i18n/index.jsx";
import { trFilterLabel } from "../data/audienceFilterLabels";

const EMPTY_SEL = (filters) => Object.fromEntries(Object.keys(filters).map(k => [k, new Set()]));

// Defaults the filter panel to whatever the builder picked on the Audience step during
// onboarding (real values, same taxonomy — Demographics/Professional/Interests match
// exactly). State/City were free text there, not checkboxes here, so those carry
// forward as search text instead of a checkbox — see the `q` default below.
function defaultSelFromProfile(filters, profile) {
  const sel = EMPTY_SEL(filters);
  if (!profile) return sel;
  const add = (group, values) => { (values || []).forEach(v => v && sel[group] && sel[group].add(v)); };
  add("Demographics", profile.ageBands);
  add("Demographics", (profile.genders || []).filter(g => g !== "Any"));
  add("Demographics", profile.incomeBands);
  add("Professional", profile.occupations);
  add("Interests", profile.interests);
  if (profile.country && profile.country.trim().toLowerCase() === "india") sel.Geography.add("India");
  return sel;
}

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { builder } = useAuth();
  const [members, setMembers] = useState([]);
  const [filters, setFilters] = useState({});
  const [sel, setSel] = useState({});
  const [closed, setClosed] = useState(new Set(["Interests", "Demographics"]));
  const [closedSub, setClosedSub] = useState(new Set(["Income Bracket", "Marital Status", "Has Kids"]));
  const [q, setQ] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [inviteModalValidator, setInviteModalValidator] = useState(null);
  const [visibleCount, setVisibleCount] = useState(50);
  const [usingDefaults, setUsingDefaults] = useState(false);
  const [citySuggestion, setCitySuggestion] = useState("");
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [sortKey, setSortKey] = useState("match");

  useEffect(() => {
    setIsLoading(true);
    api.audience().then(res => {
      // 1) Find custom cities, occs, and interests from DB that don't match standard lists
      const stdGeo = new Set(Object.values(res.filters.Geography || {}).flat().map(s => s.toLowerCase()));
      const customGeo = Array.from(new Set(res.members.map(m => m.city).filter(c => c && c !== "Unknown" && !stdGeo.has(c.toLowerCase())))).sort();
      if (customGeo.length) res.filters.Geography["Other"] = customGeo;

      const stdOcc = new Set((res.filters.Professional || []).map(s => s.toLowerCase()));
      const customOcc = Array.from(new Set(res.members.map(m => m.occ).filter(o => o && o !== "Unspecified" && !stdOcc.has(o.toLowerCase())))).sort();
      if (customOcc.length) {
        // Change Professional from flat array to subgroups to support "Other" dropdown
        res.filters.Professional = {
          "Standard": res.filters.Professional.filter(p => p !== "Other"),
          "Other": customOcc
        };
      }

      const stdInt = new Set(Object.values(res.filters.Interests || {}).flat().map(s => s.toLowerCase()));
      const customInt = Array.from(new Set(res.members.flatMap(m => m.expertise || []).filter(e => e && !stdInt.has(e.toLowerCase())))).sort();
      if (customInt.length && res.filters.Interests["Industry"]) {
        res.filters.Interests["Other"] = customInt;
      }

      setMembers(res.members);
      setFilters(res.filters);
      
      const stored = sessionStorage.getItem("audienceFilters");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const restoredSel = {};
          for (const k of Object.keys(parsed.sel || {})) {
            restoredSel[k] = new Set(parsed.sel[k]);
          }
          setSel(restoredSel);
          setQ(parsed.q || "");
          setUsingDefaults(parsed.usingDefaults || false);
        } catch {
          setSel(defaultSelFromProfile(res.filters, builder?.profile));
        }
      } else {
        const profile = builder?.profile;
        setSel(defaultSelFromProfile(res.filters, profile));
        // Free-text state/city from onboarding has no matching checkbox in
        // this panel's curated city list — surface it as a placeholder hint
        // in the search box rather than an applied filter, since silently
        // filtering to a city string that doesn't exactly match any
        // member's city field would zero out results with no explanation.
        if (profile && (profile.district || profile.state)) {
          setCitySuggestion(profile.district || profile.state);
          setUsingDefaults(true);
        }
      }
      setIsLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const serializedSel = {};
      for (const k of Object.keys(sel || {})) {
        serializedSel[k] = Array.from(sel[k] || []);
      }
      sessionStorage.setItem("audienceFilters", JSON.stringify({
        sel: serializedSel,
        q: q,
        usingDefaults: usingDefaults
      }));
    }
  }, [sel, q, usingDefaults, isLoading]);

  const toggle = (g, o) => { setUsingDefaults(false); setSel(p => { const s = new Set(p[g]); s.has(o) ? s.delete(o) : s.add(o); return { ...p, [g]: s }; }); };
  const toggleGroup = (g) => setClosed(p => { const s = new Set(p); s.has(g) ? s.delete(g) : s.add(g); return s; });
  const toggleSubgroup = (sub) => setClosedSub(p => { const s = new Set(p); s.has(sub) ? s.delete(sub) : s.add(sub); return s; });
  
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
      const specificGeo = sel.Geography.size > 0 ? [...sel.Geography].filter(v => !/worldwide|remote/i.test(v)) : [];
      const geo = sel.Geography.size === 0 || (specificGeo.length === 0 ? true : specificGeo.some(o => matchOption(m, "Geography", o)));
      const role = !sel["ValidationCrew Role"] || sel["ValidationCrew Role"].size === 0 || [...sel["ValidationCrew Role"]].some(o => matchOption(m, "ValidationCrew Role", o));
      const occ = !sel.Professional || sel.Professional.size === 0 || [...sel.Professional].some(o => matchOption(m, "Professional", o));
      const int = sel.Interests.size === 0 || [...sel.Interests].some(o => matchOption(m, "Interests", o));
      const ageOpts = new Set([...(sel.Demographics || [])].filter(o => filters.Demographics?.Age?.includes(o)));
      const genOpts = new Set([...(sel.Demographics || [])].filter(o => filters.Demographics?.Gender?.includes(o)));
      const incOpts = new Set([...(sel.Demographics || [])].filter(o => filters.Demographics?.["Income Bracket"]?.includes(o)));
      const marOpts = new Set([...(sel.Demographics || [])].filter(o => filters.Demographics?.["Marital Status"]?.includes(o)));
      const kidOpts = new Set([...(sel.Demographics || [])].filter(o => filters.Demographics?.["Has Kids"]?.includes(o)));

      const demoAge = ageOpts.size === 0 || [...ageOpts].some(o => matchOption(m, "Demographics", o));
      const demoGen = genOpts.size === 0 || [...genOpts].some(o => matchOption(m, "Demographics", o));
      const demoInc = incOpts.size === 0 || [...incOpts].some(o => matchOption(m, "Demographics", o));
      const demoMar = marOpts.size === 0 || [...marOpts].some(o => matchOption(m, "Demographics", o));
      const demoKids = kidOpts.size === 0 || [...kidOpts].some(o => matchOption(m, "Demographics", o));
      const demo = demoAge && demoGen && demoInc && demoMar && demoKids;
      
      const qq = !q || (m.name + m.occ + m.city).toLowerCase().includes(q.toLowerCase());
      return geo && role && occ && int && demo && qq;
    }).sort((a, b) => {
      if (sortKey === "trust") return (b.trust || 0) - (a.trust || 0);
      if (sortKey === "name") return a.name.localeCompare(b.name);
      return b.match - a.match;
    });
  }, [members, sel, q, filters, sortKey]);

  useEffect(() => {
    const t = setTimeout(() => setVisibleCount(50), 0);
    return () => clearTimeout(t);
  }, [sel, q]);

  const exportPDF = () => {
    if (!results.length) return;
    const doc = new jsPDF();
    
    // Add Title
    doc.setFontSize(18);
    doc.setTextColor(20, 20, 20);
    doc.text(t("audience.exportTitle", null, "ValidationCrew — Audience Export"), 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`${t("audience.generatedOn", null, "Generated on")} ${new Date().toLocaleDateString()} · ${results.length} ${t("audience.membersLower", null, "members")}`, 14, 30);

    // Prepare table data
    const tableColumn = [t("audience.thName", null, "Name"), t("audience.thOccupation", null, "Occupation"), t("audience.thLocation", null, "Location"), t("audience.thRole", null, "Role"), t("audience.thTrust", null, "Trust"), t("audience.thMatch", null, "Match %"), t("audience.thVerified", null, "Verified")];
    const tableRows = results.map(m => [
      m.name,
      m.occ,
      m.city,
      m.role,
      m.trust > 0 ? m.trust.toString() : t("audience.establishingTrust", null, "Establishing Trust"),
      `${m.match}%`,
      m.verified ? t("audience.yes", null, "Yes") : t("audience.no", null, "No")
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
          <span className="eyebrow">{t("audience.discovery", null, "Discovery")}</span>
          <h1>{t("audience.title", null, "Audience Explorer")}</h1>
          <p className="lead">{t("audience.lead", null, "Search verified members and layer filters to find exactly who should validate your product.")}</p>
        </div>
        <div className="ph-actions"><Btn variant="primary" icon="plus" onClick={() => navigate("/missions/new")}>{t("actions.createMission", null, "Create Mission")}</Btn></div>
      </div>

      {usingDefaults && (
        <div className="row between" style={{ alignItems: "center", padding: "10px 16px", background: "var(--accent-weak)", borderRadius: "var(--radius)", marginBottom: 16, fontSize: 13 }}>
          <span style={{ color: "var(--accent)" }}><Icon name="filter" size={14} style={{ verticalAlign: -2, marginRight: 6 }} />{t("audience.showingDefaults", null, "Showing the audience you picked when setting up your account.")}</span>
          <button className="backlink" style={{ fontSize: 13, color: "var(--accent)" }} onClick={() => { setSel(EMPTY_SEL(filters)); setQ(""); setUsingDefaults(false); }}>{t("actions.resetEveryone", null, "Reset to see everyone")}</button>
        </div>
      )}
      {!usingDefaults && Object.keys(builder?.profile || {}).length > 0 && (
        <div className="row between" style={{ alignItems: "center", padding: "10px 16px", background: "var(--panel)", border: "1px dashed var(--border)", borderRadius: "var(--radius)", marginBottom: 16, fontSize: 13 }}>
          <span className="muted" style={{ fontWeight: 500 }}><Icon name="info" size={14} style={{ verticalAlign: -2, marginRight: 6 }} />{t("audience.customAudience", null, "You are exploring a custom audience.")}</span>
          <button className="backlink" style={{ fontSize: 13, color: "var(--accent)", fontWeight: 500 }} onClick={() => setShowRestoreModal(true)}>{t("actions.restoreDefaults", null, "Restore profile defaults")}</button>
        </div>
      )}

      <div className="kpis sec" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <KpiCard label={t("audience.matchingMembers", null, "Matching members")} value={results.length} icon="users" />
        <KpiCard label={t("audience.verified", null, "Verified")} value={verifiedPct} unit="%" icon="shield" tone="green" />
        <KpiCard label={t("audience.avgTrustScore", null, "Avg trust score")} value="88" icon="award" />
        <KpiCard label={t("audience.activeThisWeek", null, "Active this week")} value="71%" icon="bolt" tone="amber" />
      </div>

      <div className="aud">
        <div className="filter-panel">
          <div className="row between" style={{ marginBottom: 16, alignItems: 'center' }}>
            <b style={{ fontSize: 15, fontWeight: 800 }}>{t("audience.filters", null, "Filters")}</b>
            <button style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '5px 6px', background: 'var(--panel)', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <Icon name="filter" size={14} />
            </button>
          </div>
          {Object.entries(filters).map(([g, opts]) => (
            <div key={g} className={`fgroup ${closed.has(g) ? "closed" : ""}`}>
              <button className="fgroup-h" onClick={() => toggleGroup(g)}>{trFilterLabel(t, g)}<Icon name="chevronDown" size={15} /></button>
              <div className="fgroup-body">
                {Array.isArray(opts) ? opts.map(o => {
                  const on = sel[g]?.has(o);
                  return (
                    <button key={o} className={`fcheck ${on ? "on" : ""}`} onClick={() => toggle(g, o)}>
                      <span className="box">{on && <Icon name="check" size={11} />}</span>{trFilterLabel(t, o)}
                      <span className="fcount">{counts[g]?.[o] || 0}</span>
                    </button>
                  );
                }) : Object.entries(opts).map(([sub, subOpts]) => (
                  <div key={sub} className={`subgroup ${closedSub.has(sub) ? "" : "open"}`}>
                    <button className="subgroup-h" onClick={() => toggleSubgroup(sub)}>{trFilterLabel(t, sub)} <Icon name="chevronDown" size={14} /></button>
                    <div className="subgroup-body">
                      {subOpts.map(o => {
                        const on = sel[g]?.has(o);
                        return (
                          <button key={o} className={`fcheck ${on ? "on" : ""}`} onClick={() => toggle(g, o)}>
                            <span className="box">{on && <Icon name="check" size={11} />}</span>{trFilterLabel(t, o)}
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
          <Btn variant="outline" size="sm" icon="refresh" style={{ width: '100%', marginTop: 20 }} onClick={() => setSel(EMPTY_SEL(filters))}>{t("actions.resetFilters", null, "Reset Filters")}</Btn>
        </div>

        <div>
          {activeFilters > 0 && (
            <div className="active-filters-bar">
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{t("audience.activeFilters", null, "Active Filters")}</span>
              <div className="row" style={{ flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {Object.entries(sel).map(([g, s]) => [...s].map(o => (
                  <div key={g+o} className="afilter-chip">
                    {trFilterLabel(t, o)} <button onClick={() => toggle(g, o)}><Icon name="x" size={12} /></button>
                  </div>
                )))}
                <button className="backlink" style={{ marginLeft: "auto", fontSize: 13, color: "var(--accent)" }} onClick={() => { setSel(EMPTY_SEL(filters)); setUsingDefaults(false); }}>
                  <Icon name="trash" size={13} style={{ marginRight: 4, verticalAlign: -2 }}/>{t("actions.clearAll", null, "Clear all")}
                </button>
              </div>
            </div>
          )}
          
          <div className="toolbar">
            <div className="seg-search"><Icon name="search" size={16} /><input placeholder={citySuggestion || t("audience.searchPlaceholder", null, "Search by name, role, city…")} value={q} onChange={e => { setQ(e.target.value); setUsingDefaults(false); }} /></div>
            <span className="muted" style={{ fontSize: 13 }}>{results.length} {t("audience.results", null, "results")}</span>
            <span className="grow" />
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value)}
              aria-label={t("audience.sortBy", null, "Sort by")}
              style={{ fontSize: 13, fontWeight: 500, marginRight: 16, border: "1px solid var(--border)", borderRadius: 6, padding: "5px 8px", background: "var(--panel)", color: "inherit", cursor: "pointer" }}
            >
              <option value="match">{t("audience.sortByMatch", null, "Sort by: Match")}</option>
              <option value="trust">{t("audience.sortByTrust", null, "Sort by: Trust")}</option>
              <option value="name">{t("audience.sortByName", null, "Sort by: Name")}</option>
            </select>
            <Btn variant="ghost" size="sm" icon="download" onClick={exportPDF} disabled={results.length === 0}>{t("actions.exportPdf", null, "Export PDF")}</Btn>
          </div>
          <div style={{ transition: "opacity 0.3s ease", opacity: isLoading ? 0.3 : 1, pointerEvents: isLoading ? "none" : "auto" }}>
            {results.length === 0 && !isLoading ? (
              <Empty icon="users" title={t("audience.noMembersMatch", null, "No members match these filters")} action={<Btn variant="ghost" icon="refresh" onClick={() => { setSel(EMPTY_SEL(filters)); setQ(""); }}>{t("actions.resetFilters", null, "Reset filters")}</Btn>}>{t("audience.tryWidening", null, "Try widening your geography or removing an interest to grow the pool.")}</Empty>
            ) : (
              <div className="col gap-3">
                {results.slice(0, visibleCount).map((m) => (
                  <div className="aud-card rise" key={m.id}>
                  <Avatar name={m.name} size={46} />
                  <div className="aud-meta">
                    <div className="aud-name">{m.name} {m.verified && <span className="verif"><Icon name="checkCircle" size={14} /> {t("badge.verifiedBuilder", null, "Verified")}</span>}</div>
                    <div className="aud-sub">{trFilterLabel(t, m.occ)} · {trFilterLabel(t, m.city)} · <span className="mono">{trFilterLabel(t, m.role)}</span></div>
                    <div className="aud-tags">{m.expertise.map(e => <span key={e} className="mtag">{trFilterLabel(t, e)}</span>)}</div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>{t("audience.profileComplete", { pct: m.profileCompletion }, `Profile ${m.profileCompletion}% complete`)}</div>
                  </div>
                  <div className="aud-right">
                    <MatchRing value={m.match} />
                    {m.trust >= 90 && (
                      <span className="mtag" style={{ background: "var(--success-weak)", color: "var(--success)", border: "none" }}>
                        <Icon name="award" size={11} style={{ verticalAlign: -2, marginRight: 3 }} />{t("audience.trust", null, "Trust")} 90+
                      </span>
                    )}
                    {m.trust > 0 && m.trust < 90 && (
                      <span className="mtag" style={{ background: "var(--panel-inset)", color: "var(--text-muted)", border: "none" }}>
                        {t("audience.trust", null, "Trust")} {m.trust}
                      </span>
                    )}
                    {m.trust === 0 && (
                      <span className="mtag" style={{ background: "var(--accent-weak)", color: "var(--accent)", border: "none" }}>
                        <Icon name="bolt" size={11} style={{ verticalAlign: -2, marginRight: 3 }} />{t("audience.establishingTrust", null, "Establishing Trust")}
                      </span>
                    )}
                    <Btn variant="ghost" size="sm" icon="userplus" onClick={() => setInviteModalValidator(m)}>{t("actions.invite", null, "Invite")}</Btn>
                  </div>
                </div>
              ))}
              {visibleCount < results.length && (
                <div style={{ textAlign: "center", marginTop: 12, marginBottom: 24 }}>
                  <Btn variant="outline" onClick={() => setVisibleCount(c => c + 50)}>{t("actions.loadMoreMembers", null, "Load more members")} ({results.length - visibleCount} {t("audience.remaining", null, "remaining")})</Btn>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
      
      {inviteModalValidator && (
        <InviteToMissionModal validator={inviteModalValidator} onClose={() => setInviteModalValidator(null)} />
      )}
      {showRestoreModal && (
        <Modal title={t("audience.restoreTitle", null, "Restore your default audience?")} onClose={() => setShowRestoreModal(false)} width={420}>
          <div style={{ padding: "0 20px 20px" }}>
            <p className="muted" style={{ fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
              {t("audience.restoreDesc", null, "This will overwrite your current filters and instantly load the audience you specified during your profile setup. Do you want to continue?")}
            </p>
            <div className="row" style={{ gap: 12, justifyContent: "flex-end" }}>
              <Btn variant="secondary" onClick={() => setShowRestoreModal(false)}>{t("actions.cancel", null, "Cancel")}</Btn>
              <Btn variant="primary" onClick={() => {
                setShowRestoreModal(false);
                setIsLoading(true);
                setTimeout(() => {
                  setSel(defaultSelFromProfile(filters, builder?.profile));
                  setQ("");
                  setCitySuggestion(builder?.profile?.district || builder?.profile?.state || "");
                  setUsingDefaults(true);
                  setIsLoading(false);
                }, 400);
              }}>{t("actions.yesRestoreDefaults", null, "Yes, restore defaults")}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
