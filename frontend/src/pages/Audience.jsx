import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Avatar, Btn, Empty, KpiCard } from "../components/ui";
import { api } from "../api/client";
import { InviteToMissionModal } from "../components/InviteToMissionModal";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useTranslation } from "../i18n/index.jsx";
import { trFilterLabel } from "../data/audienceFilterLabels";
import { ValidatorProfileDrawer } from "../components/ValidatorProfileDrawer";

const EMPTY_SEL = (filters) => Object.fromEntries(Object.keys(filters).map(k => [k, new Set()]));

const COUNTRY_MAP = {
  "India": ["Bengaluru", "Mumbai", "Delhi NCR", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad", "Jaipur"]
};

// Country used to be a single string on the profile; it's now multi-select,
// but older saved profiles still have the scalar shape — normalize both to
// an array so every reader below can treat it uniformly.
const profileCountries = (profile) => {
  const c = profile?.country;
  return Array.isArray(c) ? c.filter(Boolean) : (c ? [c] : []);
};

// Defaults the filter panel to whatever the builder picked on the Audience step during
// onboarding (real values, same taxonomy — Demographics/Professional/Interests match
// exactly). State/City were free text there, not checkboxes here, so those carry
// forward as search text instead of a checkbox — see the `q` default below.
function defaultSelFromProfile(filters, profile) {
  const sel = EMPTY_SEL(filters);
  if (!profile) return sel;
  const add = (group, values) => { (values || []).forEach(v => v && sel[group] && sel[group].add(v)); };
  // Demographics specifically also gets checked against the *current* known
  // option list — selToProfilePatch's reverse mapping below does the same
  // filtering, and without this the two directions are asymmetric: a stale
  // ageBand/gender/income value from before the option list changed would
  // load into sel fine, then silently vanish from the saved profile the
  // moment the reverse sync runs, even with zero user interaction.
  const addKnown = (group, values, known) => { (values || []).forEach(v => v && known?.includes(v) && sel[group] && sel[group].add(v)); };
  addKnown("Demographics", profile.ageBands, filters.Demographics?.Age);
  addKnown("Demographics", (profile.genders || []).filter(g => g !== "Any"), filters.Demographics?.Gender);
  addKnown("Demographics", profile.incomeBands, filters.Demographics?.["Income Bracket"]);
  add("Professional", profile.occupations);
  add("Interests", profile.interests);
  add("ValidationCrew Role", profile.validatorTypes);
  // Only countries with a known city breakdown map onto a Geography chip —
  // others have no equivalent checkbox to select (same limitation as before).
  profileCountries(profile).forEach(c => { if (COUNTRY_MAP[c]) sel.Geography.add(c); });
  return sel;
}

// Reverse of the above — the fields Settings understands, derived from the
// current Explorer selection, for the bidirectional sync (Explorer edits
// should update the saved profile, not just read from it). Geography city-
// level picks and the Demographics-only Marital Status/Has Kids subgroups
// have no Settings equivalent, so they stay Explorer-local and aren't synced.
function selToProfilePatch(sel, filters) {
  const demo = sel.Demographics || new Set();
  const pick = (list) => [...demo].filter(o => (list || []).includes(o));
  return {
    ageBands: pick(filters.Demographics?.Age),
    genders: pick(filters.Demographics?.Gender),
    incomeBands: pick(filters.Demographics?.["Income Bracket"]),
    occupations: [...(sel.Professional || [])],
    interests: [...(sel.Interests || [])],
    country: [...(sel.Geography || [])].filter(c => COUNTRY_MAP[c]),
    validatorTypes: [...(sel["ValidationCrew Role"] || [])],
  };
}

// Real match against whatever the builder actually selected, instead of a
// fixed per-validator "profile richness" score — each selected filter group
// (Geography, Role, Professional, Interests, and each Demographics subgroup
// independently) counts as one vote, using the exact same matchOption() the
// results list itself filters by, so "100% match" and "shows up in results"
// can never disagree. No filters selected at all means there's nothing to
// differentiate members by, so match is undefined rather than a fake 100.
function computeMatch(m, sel, filters) {
  const groups = [];
  // matchOption() already treats "Worldwide"/"Remote" as a universal match
  // (see line ~101) -- voting on the raw selection directly, instead of
  // stripping those out first, lets a Worldwide-only selection register as
  // a real (if trivially satisfied) vote instead of an empty one, which
  // used to fall through to the "no filters selected" case and show "--"
  // instead of the 100% every validator legitimately gets there.
  const vote = (g, opts) => { if (opts && opts.size > 0) groups.push([...opts].some(o => matchOption(m, g, o))); };
  vote("Geography", sel.Geography);
  vote("ValidationCrew Role", sel["ValidationCrew Role"]);
  vote("Professional", sel.Professional);
  vote("Interests", sel.Interests);
  for (const key of ["Age", "Gender", "Income Bracket", "Marital Status", "Has Kids"]) {
    const opts = sel.Demographics ? new Set([...sel.Demographics].filter(o => filters.Demographics?.[key]?.includes(o))) : null;
    vote("Demographics", opts);
  }
  if (!groups.length) return null;
  return Math.round((groups.filter(Boolean).length / groups.length) * 100);
}

const matchOption = (m, g, o) => {
  if (g === "Geography") {
    const qGeo = o.toLowerCase();
    if (qGeo.includes("worldwide") || qGeo.includes("remote")) return true;
    // Same four-field OR the backend's real match-count query runs (see
    // buildAudienceClauses in backend/src/routes/audience.js) — checking
    // only `city` here let a validator matched server-side by state/country
    // alone silently disappear from this list, producing a mismatched count
    // for the identical filters.
    const fields = [m.city, m.addressCity, m.addressState, m.addressCountry];
    if (fields.some(f => f && f.toLowerCase().includes(qGeo))) return true;
    if (COUNTRY_MAP[o] && COUNTRY_MAP[o].some(city => (m.city || "").toLowerCase().includes(city.toLowerCase()))) return true;
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

// A validator with a long expertise list wrapped to many rows and blew the
// card's height out -- the full list is only ever a click away anyway (View
// Profile's drawer shows every tag), so this clamps to whatever fits within
// the first 2 rows and folds the rest into a "+N" chip instead. Same real-
// layout-measurement technique as Settings' ChipField (a fixed item-count
// cutoff doesn't work consistently across validators with different
// tag-label widths).
function ExpertiseChips({ items, t }) {
  const rowRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(null);
  // Primitive fingerprint, not the array itself -- the caller passes a
  // freshly-mapped array literal every render, so depending on `items` by
  // reference would re-run this (and its setState) every render, looping.
  const itemsKey = (items || []).join("|");

  useLayoutEffect(() => {
    if (!rowRef.current) { setVisibleCount(null); return; }
    const chips = Array.from(rowRef.current.children);
    if (chips.length < 2) { setVisibleCount(null); return; }
    const tops = [...new Set(chips.map(c => c.offsetTop))];
    if (tops.length <= 2) { setVisibleCount(null); return; } // already fits within 2 rows
    const thirdRowTop = tops[2];
    const fitCount = chips.filter(c => c.offsetTop < thirdRowTop).length;
    setVisibleCount(Math.max(1, fitCount - 1)); // reserve a slot for the +N chip
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  const shown = visibleCount != null ? items.slice(0, visibleCount) : items;
  const remaining = visibleCount != null ? items.length - visibleCount : 0;
  return (
    <div ref={rowRef} className="aud-tags">
      {shown.map(e => <span key={e} className="mtag accent">{trFilterLabel(t, e)}</span>)}
      {remaining > 0 && <span className="mtag accent" style={{ opacity: .85 }}>+{remaining}</span>}
    </div>
  );
}

export default function AudienceExplorer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { builder, setBuilder } = useAuth();
  const [members, setMembers] = useState([]);
  const [filters, setFilters] = useState({});
  const [sel, setSel] = useState({});
  const [closed, setClosed] = useState(new Set(["Interests", "Demographics"]));
  const [closedSub, setClosedSub] = useState(new Set(["Income Bracket", "Marital Status", "Has Kids"]));
  const [q, setQ] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [inviteModalValidator, setInviteModalValidator] = useState(null);
  const [viewProfileValidator, setViewProfileValidator] = useState(null);
  const [visibleCount, setVisibleCount] = useState(50);
  const [usingDefaults, setUsingDefaults] = useState(false);
  const [citySuggestion, setCitySuggestion] = useState("");
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [sortKey, setSortKey] = useState("match");

  useEffect(() => {
    // isLoading already starts true (useState(true) above) and this effect
    // only ever runs once on mount ([] deps) -- setting it again here was
    // dead code that just tripped the "no setState synchronously in an
    // effect" lint rule for no actual behavior change.
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
          // The country(ies) on file can change after this tab's snapshot was
          // taken (e.g. edited in Settings > Audience & Demographics after
          // an earlier Explorer visit already cached a stale sessionStorage
          // entry) — resync just that delta so new countries show up without
          // discarding the rest of the user's custom filter picks.
          const savedCountries = new Set((parsed.profileCountries || []).filter(c => COUNTRY_MAP[c]));
          const liveCountries = new Set(profileCountries(builder?.profile).filter(c => COUNTRY_MAP[c]));
          for (const c of savedCountries) if (!liveCountries.has(c)) restoredSel.Geography?.delete(c);
          for (const c of liveCountries) if (!savedCountries.has(c)) restoredSel.Geography?.add(c);
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
        usingDefaults: usingDefaults,
        profileCountries: profileCountries(builder?.profile)
      }));
    }
  }, [sel, q, usingDefaults, isLoading, builder]);

  // Bidirectional sync: any Explorer filter change also writes back to the
  // saved profile, so Settings and Explorer always agree — not just the
  // read direction (profile -> Explorer defaults) above. Skips the write
  // when nothing the profile understands actually changed, so this doesn't
  // fire a redundant PATCH on every mount just from re-deriving the same
  // sel that was itself seeded from the profile a moment ago.
  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(() => {
      const patch = selToProfilePatch(sel, filters);
      const current = builder?.profile || {};
      const norm = (v) => JSON.stringify([...(v || [])].sort());
      const changed = ["ageBands", "genders", "incomeBands", "occupations", "interests", "validatorTypes"].some(k => norm(current[k]) !== norm(patch[k]))
        || norm(profileCountries(current)) !== norm(patch.country);
      if (!changed) return;
      api.updateProfile({ profile: patch }).then(res => setBuilder(res.builder)).catch(() => {});
    }, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, isLoading, filters]);

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
    // Used to require matching every single selected filter group (a hard
    // AND across Geography/Role/Professional/Interests/each Demographics
    // subgroup) to show up at all -- a validator who matched 2 of 3 selected
    // groups was excluded outright, even though computeMatch would've
    // scored them a very reasonable 67%. Now anyone at or above a 75% match
    // shows up, using the exact same per-group vote computeMatch already
    // does, so "shows up in results" and "match%" can't disagree.
    return members
      .filter(m => !q || (m.name + m.occ + m.city).toLowerCase().includes(q.toLowerCase()))
      .map(m => ({ ...m, match: computeMatch(m, sel, filters) }))
      .filter(m => m.match === null || m.match >= 75)
      .sort((a, b) => {
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
      typeof m.match === "number" ? `${m.match}%` : "—",
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
  // Averaged over the currently matching set (results), same cohort the
  // "Matching members" card counts — previously a hardcoded "88" with no
  // relationship to who's actually in the pool.
  const avgTrust = results.length ? Math.round(results.reduce((s, m) => s + (m.trust || 0), 0) / results.length) : 0;
  const activeThisWeekPct = results.length ? Math.round((results.filter(m => m.activeThisWeek).length / results.length) * 100) : 0;
  const hasAnyFilter = Object.values(sel).some(s => s.size > 0);

  return (
    <div className="page rise">
      <div className="ph">
        <div>
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
      {/* "Custom audience" implies deliberate filters are active -- right
          after "Reset to see everyone" there are none at all, so that
          copy was actively misleading (looked like the reset hadn't
          worked). Split into the two states it was conflating. */}
      {!usingDefaults && hasAnyFilter && Object.keys(builder?.profile || {}).length > 0 && (
        <div className="row between" style={{ alignItems: "center", padding: "10px 16px", background: "var(--panel)", border: "1px dashed var(--border)", borderRadius: "var(--radius)", marginBottom: 16, fontSize: 13 }}>
          <span className="muted" style={{ fontWeight: 500 }}><Icon name="info" size={14} style={{ verticalAlign: -2, marginRight: 6 }} />{t("audience.customAudience", null, "You are exploring a custom audience.")}</span>
          <button className="backlink" style={{ fontSize: 13, color: "var(--accent)", fontWeight: 500 }} onClick={() => setShowRestoreModal(true)}>{t("actions.restoreDefaults", null, "Restore profile defaults")}</button>
        </div>
      )}
      {!usingDefaults && !hasAnyFilter && Object.keys(builder?.profile || {}).length > 0 && (
        <div className="row between" style={{ alignItems: "center", padding: "10px 16px", background: "var(--panel)", border: "1px dashed var(--border)", borderRadius: "var(--radius)", marginBottom: 16, fontSize: 13 }}>
          <span className="muted" style={{ fontWeight: 500 }}><Icon name="users" size={14} style={{ verticalAlign: -2, marginRight: 6 }} />{t("audience.showingEveryone", null, "Showing everyone — no filters applied.")}</span>
          <button className="backlink" style={{ fontSize: 13, color: "var(--accent)", fontWeight: 500 }} onClick={() => setShowRestoreModal(true)}>{t("actions.restoreDefaults", null, "Restore profile defaults")}</button>
        </div>
      )}

      {/* "Matching" implies matched against something -- with every checkbox
          unticked (no onboarding-selected audience, and nothing picked here
          either) there's no actual criteria being matched, just the raw
          pool, so the honest label there is "Available" instead. */}
      <div className="kpis sec" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <KpiCard label={hasAnyFilter ? t("audience.matchingMembers", null, "Matching members") : t("audience.availableMembers", null, "Available members")} value={results.length} icon="users" />
        <KpiCard label={t("audience.verified", null, "Verified")} value={verifiedPct} unit="%" icon="shield" tone="green" />
        <KpiCard label={t("audience.avgTrustScore", null, "Avg trust score")} value={avgTrust} icon="award" />
        <KpiCard label={t("audience.activeThisWeek", null, "Active this week")} value={activeThisWeekPct} unit="%" icon="bolt" tone="amber" />
      </div>

      <div className="aud">
        <div className="filter-panel">
          <div className="row between" style={{ marginBottom: 16, alignItems: 'center' }}>
            <b style={{ fontSize: 15, fontWeight: 800 }}>{t("audience.filters", null, "Filters")}{activeFilters > 0 && <span className="mono" style={{ color: "var(--accent)", fontWeight: 700 }}> ({activeFilters})</span>}</b>
            <button style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '5px 6px', background: 'var(--panel)', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <Icon name="filter" size={14} />
            </button>
          </div>
          {Object.entries(filters).map(([g, opts]) => (
            <div key={g} className={`fgroup ${closed.has(g) ? "closed" : ""}`}>
              <button className="fgroup-h" onClick={() => toggleGroup(g)}>
                <span>{trFilterLabel(t, g)}</span>
                <span className="row gap-2" style={{ alignItems: "center", flexShrink: 0 }}>
                  {sel[g]?.size > 0 && <span className="mono" style={{ color: "var(--accent)", fontWeight: 700, textTransform: "none" }}>({sel[g].size})</span>}
                  <Icon name="chevronDown" size={15} />
                </span>
              </button>
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
              <div className="row between" style={{ alignItems: "center" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{t("audience.activeFilters", null, "Active Filters")} <span className="mono" style={{ color: "var(--accent)" }}>({activeFilters})</span></span>
                <button className="backlink" style={{ flexShrink: 0, fontSize: 13, color: "var(--accent)" }} onClick={() => { setSel(EMPTY_SEL(filters)); setUsingDefaults(false); }}>
                  <Icon name="trash" size={13} style={{ marginRight: 4, verticalAlign: -2 }}/>{t("actions.clearAll", null, "Clear all")}
                </button>
              </div>
              <div className="row afilter-scroll" style={{ gap: 8, alignItems: "center" }}>
                {Object.entries(sel).map(([g, s]) => [...s].map(o => (
                  <div key={g+o} className="afilter-chip">
                    {trFilterLabel(t, o)} <button onClick={() => toggle(g, o)}><Icon name="x" size={12} /></button>
                  </div>
                )))}
              </div>
            </div>
          )}
          
          <div className="toolbar">
            <div className="seg-search"><Icon name="search" size={16} /><input placeholder={citySuggestion || t("audience.searchPlaceholder", null, "Search by name, role, city…")} value={q} onChange={e => { setQ(e.target.value); setUsingDefaults(false); }} /></div>
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
              <div className="aud-grid">
                {results.slice(0, visibleCount).map((m) => (
                  <div className="aud-card rise" key={m.id}>
                  {/* Reordered per tester feedback: name, then a single
                      occupation | location | role line, then the trust pill
                      + profile completion together, then match% last -- was
                      trust pill/match% crammed into the name/occupation
                      rows themselves. */}
                  <div className="row gap-3" style={{ alignItems: "flex-start" }}>
                    <Avatar name={m.name} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="aud-name" style={{ minWidth: 0 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                        {m.verified && <span className="verif" style={{ flexShrink: 0 }}><Icon name="checkCircle" size={13} /></span>}
                      </div>
                      <div className="aud-sub" style={{ marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {[trFilterLabel(t, m.occ), trFilterLabel(t, m.city), trFilterLabel(t, m.role)].filter(Boolean).join(" | ")}
                      </div>
                    </div>
                  </div>
                  {/* Pulled out of the indented name column (which sits to
                      the right of the avatar) so these start at the card's
                      true left edge, same as Bio below -- nested under the
                      name column, they were indented ~56px further right
                      than Bio, so no amount of spacing between items here
                      could ever line the two up. */}
                  <div className="row" style={{ alignItems: "center", gap: 28, marginTop: 8 }}>
                    {m.trust > 0 ? (
                      <span className="mtag" style={{ background: "var(--success-weak)", color: "var(--success)", border: "none", flexShrink: 0 }}>
                        <Icon name="shield" size={11} style={{ verticalAlign: -2, marginRight: 3 }} />{t("audience.buildingTrust", null, "Building Trust")}
                      </span>
                    ) : (
                      <span className="mtag" style={{ background: "var(--accent-weak)", color: "var(--accent)", border: "none", flexShrink: 0 }}>
                        <Icon name="bolt" size={11} style={{ verticalAlign: -2, marginRight: 3 }} />{t("audience.establishingTrust", null, "Establishing Trust")}
                      </span>
                    )}
                    <span className="mtag" style={{ flexShrink: 0 }}>
                      {t("audience.missionsDoneCount", { count: m.missionsDone || 0 }, `${m.missionsDone || 0} mission${(m.missionsDone || 0) === 1 ? "" : "s"} done`)}
                    </span>
                  </div>
                  <div className="row" style={{ alignItems: "center", gap: 28, marginTop: 6 }}>
                    {/* .mtag has 9px of left padding inside its pill shape
                        (see builder.css), so "Building Trust"'s own text
                        sits 9px in from the row's left edge -- matching
                        that here lines this line's first letter up with
                        the row above instead of both looking offset even
                        though their containers start at the same x. */}
                    <span className="muted" style={{ fontSize: 11.5, flexShrink: 0, marginLeft: 9 }}>{t("audience.profileComplete", { pct: m.profileCompletion }, `Profile ${m.profileCompletion}% complete`)}</span>
                    <span style={{ flexShrink: 0 }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "var(--accent)" }}>{typeof m.match === "number" ? `${m.match}%` : "—"}</span>
                      <span className="muted" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".03em", marginLeft: 5 }}>{t("audience.matchScore", null, "Match")}</span>
                    </span>
                  </div>
                  {/* Bio, clamped to 2 lines with an ellipsis -- wasn't shown
                      on the card at all before, only after opening View
                      Profile. Same clamp technique already used for bio-like
                      text elsewhere (ATesterApplications.jsx, Discover.jsx). */}
                  {m.bio && (
                    <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {m.bio}
                    </div>
                  )}
                  {/* Blue accent chips (.mtag.accent), matching the reference
                      -- was the plain gray .mtag look every other tag list
                      already moved away from earlier this session. */}
                  <ExpertiseChips items={m.expertise} t={t} />
                  {/* Invite is the action a builder actually comes here to
                      take, so it's the filled/primary button now -- the
                      reference has View Profile filled instead, but the
                      tester asked for these two swapped from how it shows
                      there. */}
                  <div className="aud-card-actions">
                    <Btn size="sm" icon="eye" style={{ border: "1.5px solid var(--accent)", color: "var(--accent)", background: "transparent" }} onClick={() => setViewProfileValidator(m)}>{t("actions.view", null, "View")}</Btn>
                    <Btn variant="primary" size="sm" icon="userplus" onClick={() => setInviteModalValidator(m)}>{t("actions.invite", null, "Invite")}</Btn>
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
      {viewProfileValidator && (
        <ValidatorProfileDrawer
          validator={viewProfileValidator}
          t={t}
          onClose={() => setViewProfileValidator(null)}
          onInvite={(v) => { setInviteModalValidator(v); setViewProfileValidator(null); }}
        />
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
