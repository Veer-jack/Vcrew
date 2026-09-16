import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Btn, Avatar } from "./ui";
import { Modal } from "./Modal";
import { api } from "../api/client";
import { toast } from "react-hot-toast";
import Icon from "./Icon";
import { useTranslation } from "../i18n/index.jsx";
import { trFilterLabel } from "../data/audienceFilterLabels";

const ValidatorListItem = memo(({ v, isSelected, toggleSelection, t }) => {
  return (
    <div className={`modal-list-item ${isSelected ? 'selected' : ''}`}>
      <div className="row ac gap-3">
        <Avatar name={v.name} size={38} />
        <div>
          <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6, fontSize: 13.5 }}>
            {v.name}
            {v.verified && <Icon name="checkCircle" size={13} color="var(--success)" />}
            {v.match >= 80 && (
              <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--accent)", background: "var(--accent-weak)", padding: "2px 7px", borderRadius: 10, textTransform: "uppercase", letterSpacing: ".02em" }}>
                {t("invite.recommended", null, "Recommended")}
              </span>
            )}
            {/* Flags a validator the builder already turned down (a
                rejected application) or who already declined -- on this
                same mission -- so re-inviting is still possible (this is
                just a heads-up, not a block) but never silent. */}
            {v.invitedStatus === "not_selected" && (
              <span style={{ fontSize: 9, padding: "2px 6px", background: "var(--danger, #ff4d4f)", color: "#fff", borderRadius: 12, fontWeight: 600 }}>
                {t("status.notSelected", null, "Not selected")}
              </span>
            )}
            {v.invitedStatus === "declined" && (
              <span style={{ fontSize: 9, padding: "2px 6px", background: "var(--danger, #ff4d4f)", color: "#fff", borderRadius: 12, fontWeight: 600 }}>
                {t("status.declined", null, "Declined")}
              </span>
            )}
          </div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 2, display: "flex", alignItems: "center" }}>
            {v.occ ? trFilterLabel(t, v.occ) : t("roles.member", null, "Member")} <span style={{ margin: "0 6px", fontSize: 16, color: "var(--border)" }}>•</span> {v.city ? trFilterLabel(t, v.city) : t("locations.remote", null, "Remote")}
          </div>
          <div className="row gap-2" style={{ marginTop: 6, flexWrap: "wrap" }}>
            {(v.expertise || []).slice(0, 3).map(e => (
              <span key={e} style={{ fontSize: 10.5, background: "var(--panel-inset)", padding: "2px 8px", borderRadius: 12, color: "var(--text-muted)", border: "none", fontWeight: 500 }}>{trFilterLabel(t, e)}</span>
            ))}
          </div>
        </div>
      </div>
      
      <div className="modal-list-actions">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 45 }}>
          <span style={{ fontWeight: 700, color: "var(--accent)", fontSize: 15 }}>{v.match}%</span>
          <span className="muted" style={{ fontSize: 10.5, marginTop: 2, fontWeight: 500 }}>{t("invite.matchLabel", null, "Profile Score")}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 60 }}>
          <span style={{ fontWeight: 700, color: "var(--success)", fontSize: 15, display: "flex", alignItems: "center", gap: 4 }}>
            <Icon name="shieldCheck" size={13} />
            {v.trust}
          </span>
          <span className="muted" style={{ fontSize: 10.5, marginTop: 2, fontWeight: 500 }}>{t("metrics.trustScore", null, "Trust Score")}</span>
        </div>
        <div style={{ width: 100, textAlign: "right" }}>
          {/* Declined/not_selected stay re-invitable -- the chip next to
              their name is the warning, not a block -- so only a live
              pending invite or an already-joined participant locks this out. */}
          {v.invitedStatus === "pending" || v.invitedStatus === "accepted" ? (
            <span className="faint" style={{ fontSize: 12.5, fontWeight: 600 }}>
              {v.invitedStatus === "accepted" ? t("invite.alreadyJoined", null, "Already joined") : t("invite.alreadyInvited", null, "Already invited")}
            </span>
          ) : (
            <Btn
              variant={isSelected ? "primary" : "ghost"}
              size="sm"
              icon={isSelected ? "check" : "plus"}
              onClick={() => toggleSelection(v.id)}
              style={{
                border: isSelected ? "none" : "1px solid var(--accent)",
                color: isSelected ? "#fff" : "var(--accent)",
                background: isSelected ? "var(--accent)" : "transparent",
                fontWeight: 600,
                padding: "6px 16px",
                borderRadius: 6
              }}
            >
              {isSelected ? t("actions.selected", null, "Selected") : t("actions.invite", null, "Invite")}
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
});

export function InviteValidatorModal({ mission, onClose }) {
  const { t } = useTranslation();
  const [validators, setValidators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  // The mission's own saved audience definition (Geography/Professional/
  // Interests/etc.) — used to turn it into the same interactive pills as
  // Recommended/Trust 90+ below, so there's one filter row instead of a
  // separate read-only "Targeting" line.
  const [missionAudience, setMissionAudience] = useState(null);
  // The filter taxonomy (backend/src/meta.js FILTERS) — tells us which group
  // (and, for Demographics, which sub-group) each selected audience value
  // belongs to, so a pill click can filter validators by the right field.
  const [filtersMeta, setFiltersMeta] = useState(null);

  // New States for UI
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  // Recommended used to be an active filter from first open, which *hid*
  // everyone below the match threshold — a tester flagged this as a bad
  // first impression (a builder shouldn't see a shorter list than actually
  // exists). It starts off now: strong matches lead the default list with
  // their own "Recommended" section (see displayList below) and an inline
  // chip on each card, but the pill itself stays as an explicit opt-in
  // narrowing for anyone who wants the list actually cut down, not just
  // reordered.
  const [activeFilters, setActiveFilters] = useState(() => new Set());
  const [viewOnlySelected, setViewOnlySelected] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    api.audience({ missionId: mission.id })
      .then(res => {
        // The server already scopes `members` to the mission's full saved
        // audience (every group, including "ValidationCrew Role") via the
        // same buildAudienceClauses the Audience tab's "N matching members"
        // count uses — re-filtering to just Validator/Tester here used to
        // silently drop real matches whose role is "User", undercounting
        // vs. the Audience tab. Trust the server's list as-is.
        setValidators(res.members || []);
        setMissionAudience(res.missionAudience || null);
        setFiltersMeta(res.filters || null);
      })
      .catch(() => toast.error(t("invite.failedToLoadAudience", null, "Failed to load audience")))
      .finally(() => setLoading(false));
  }, [mission, t]);

  // value -> { group, subgroup } lookup built from the filter taxonomy, so a
  // clicked pill knows which validator field to match against (e.g.
  // "Product Manager" -> Professional -> v.occ, "25-34" -> Demographics/Age
  // -> v.age_group). Mirrors the backend's own buildAudienceClauses grouping.
  const filterIndex = useMemo(() => {
    const idx = {};
    if (!filtersMeta) return idx;
    for (const [group, val] of Object.entries(filtersMeta)) {
      if (Array.isArray(val)) {
        for (const v of val) idx[v] = { group };
      } else if (val && typeof val === "object") {
        for (const [subgroup, arr] of Object.entries(val)) {
          for (const v of arr) idx[v] = { group, subgroup };
        }
      }
    }
    return idx;
  }, [filtersMeta]);

  // Flattened, de-duplicated list of the mission's own selected audience
  // values (skipping the same no-op markers the backend's own matching does —
  // Worldwide/Remote/Other carry no filter meaning of their own). These
  // become interactive pills alongside Recommended/Trust 90+ below, instead
  // of a separate read-only "Targeting" line — only ever what this mission
  // actually asked for, never auto-guessed from whoever happens to be in the
  // matched pool.
  const audienceFilterChips = useMemo(() => {
    if (!missionAudience) return [];
    const vals = new Set();
    for (const values of Object.values(missionAudience)) {
      if (!Array.isArray(values)) continue;
      for (const v of values) {
        if (/^(worldwide|remote|other)$/i.test(v)) continue;
        vals.add(v);
      }
    }
    return Array.from(vals);
  }, [missionAudience]);

  // Does a candidate match one specific audience value, given which
  // group/sub-group it belongs to? Same field mapping the backend's SQL uses.
  const matchesAudienceValue = useCallback((v, val) => {
    const meta = filterIndex[val];
    if (!meta) return true; // unknown value — don't block on it
    const { group, subgroup } = meta;
    if (group === "ValidationCrew Role") return v.role === val;
    if (group === "Professional") return v.occ === val;
    if (group === "Interests") return v.industry === val || (v.expertise || []).includes(val);
    if (group === "Geography") {
      if (/worldwide|remote/i.test(val) || val.toLowerCase() === "other") return true;
      return (v.city || "").toLowerCase().includes(val.toLowerCase());
    }
    if (group === "Demographics") {
      if (subgroup === "Age") return v.age_group === val;
      if (subgroup === "Gender") return v.gender === val;
      if (subgroup === "Income Bracket") return v.income === val;
      if (subgroup === "Marital Status") return v.marital === val;
      if (subgroup === "Has Kids") return !!v.has_kids === (val === "Yes");
    }
    return true;
  }, [filterIndex]);

  const toggleFilter = useCallback((f) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
    setVisibleCount(20);
  }, []);

  const toggleSelection = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Filtered validators based on search, pills, and view toggle. Recommended
  // no longer hides anyone by default — the list always leads with strong
  // matches (>= 80%) and keeps everyone else below them, with the render
  // side using recommendedCount to draw one divider at that boundary — but
  // the pill still narrows the list down to just those matches when a
  // builder explicitly wants that instead of just the reordering.
  const { displayList, recommendedCount } = useMemo(() => {
    let list = validators;

    if (viewOnlySelected) {
      list = list.filter(v => selectedIds.has(v.id));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.role.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q) ||
        (v.expertise || []).some(e => e.toLowerCase().includes(q))
      );
    }

    // These two are both "quality signal" chips rather than different
    // criteria — a strong match and a high trust score aren't things a
    // person needs both of, so with both active this is an OR (either signal
    // is good enough), not the AND every other filter chip here uses. With
    // only one active, it behaves exactly like any other single filter.
    const recommendedOn = activeFilters.has(t("invite.recommended", null, "Recommended"));
    const trust90On = activeFilters.has(t("invite.trust90", null, "Trust 90+"));
    if (recommendedOn && trust90On) {
      list = list.filter(v => v.match >= 80 || v.trust >= 90);
    } else if (recommendedOn) {
      list = list.filter(v => v.match >= 80);
    } else if (trust90On) {
      list = list.filter(v => v.trust >= 90);
    }

    // Active audience-filter pills, grouped by which taxonomy group they
    // came from — values within the same group are OR'd (matching any one
    // is enough, same as the backend's own ANY() clauses), different groups
    // are AND'd together.
    const activeByGroup = {};
    for (const val of audienceFilterChips) {
      if (!activeFilters.has(val)) continue;
      const group = filterIndex[val]?.group || "_";
      (activeByGroup[group] ||= []).push(val);
    }
    for (const vals of Object.values(activeByGroup)) {
      list = list.filter(v => vals.some(val => matchesAudienceValue(v, val)));
    }

    const recommended = list.filter(v => v.match >= 80).sort((a, b) => b.match - a.match);
    const rest = list.filter(v => v.match < 80);
    return { displayList: [...recommended, ...rest], recommendedCount: recommended.length };
  }, [validators, search, activeFilters, viewOnlySelected, selectedIds, audienceFilterChips, filterIndex, matchesAudienceValue, t]);

  // { rejectedCount, total } while the "you sure?" dialog is up, otherwise
  // null -- kept separate from just sending the request straight through so
  // a builder re-inviting someone with negative history on this mission
  // (declined an earlier invite, or had an application rejected) gets one
  // deliberate confirmation instead of it happening silently.
  const [rejectedConfirm, setRejectedConfirm] = useState(null);

  const sendInvites = async () => {
    setInviting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => api.inviteValidator(mission.id, id))
      );
      toast.success(t("invite.invitedMembersSuccess", { count: selectedIds.size }, `Invited ${selectedIds.size} members to mission!`));
      onClose(true);
    } catch (err) {
      toast.error(err.message || t("invite.failedToSendInvites", null, "Failed to send some invites"));
      setInviting(false);
    }
  };

  const handleBulkInvite = () => {
    if (selectedIds.size === 0) return;
    const rejectedCount = Array.from(selectedIds).filter(id => {
      const v = validators.find(vv => vv.id === id);
      return v?.invitedStatus === "not_selected" || v?.invitedStatus === "declined";
    }).length;
    if (rejectedCount > 0) {
      setRejectedConfirm({ rejectedCount, total: selectedIds.size });
      return;
    }
    sendInvites();
  };

  return (
    <>
    <Modal hideHeader={true} onClose={onClose} width={850}>
      <div className="col" style={{ height: "92vh", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>

        {/* Fixed Header Section */}
        <div style={{ padding: "16px 24px 12px", flexShrink: 0 }}>
          
          <style>{`
            .modal-scroll::-webkit-scrollbar { width: 8px; }
            .modal-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
            .modal-scroll::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; border: 2px solid #fff; }
            .modal-scroll::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
            
            .pill-row-scroll::-webkit-scrollbar { height: 8px !important; display: block !important; -webkit-appearance: none !important; }
            .pill-row-scroll::-webkit-scrollbar-track { background: #e2e8f0 !important; border-radius: 10px; margin: 0 4px; }
            .pill-row-scroll::-webkit-scrollbar-thumb { background: var(--accent) !important; border-radius: 10px; border: 2px solid #e2e8f0; }
            .pill-row-scroll > button { flex-shrink: 0; }
            
            .modal-list-item { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px dashed var(--border); gap: 12px; border-radius: 8px; transition: all 0.2s ease; margin-bottom: 4px; }
            .modal-list-item:hover { background: var(--panel-inset); border-bottom-color: transparent; }
            .modal-list-item.selected { background: var(--accent-weak); border-bottom-color: transparent; box-shadow: 0 0 0 1px var(--accent); }
            
            .modal-list-actions { display: flex; align-items: center; gap: 24px; }
            
            .search-wrapper { transition: all 0.2s ease; border: 1px solid var(--border) !important; }
            .search-wrapper:focus-within { border-color: var(--accent) !important; box-shadow: 0 0 0 3px var(--accent-weak); }
            
            .modal-footer-bar { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 12px 24px; border-top: 1px solid var(--border); background: var(--panel); border-bottom-left-radius: var(--radius-lg); border-bottom-right-radius: var(--radius-lg); gap: 16px; }
            
            @media (max-width: 600px) {
              .modal-list-item { flex-direction: column; align-items: flex-start; }
              .modal-list-actions { width: 100%; justify-content: space-between; gap: 10px; }
              .modal-footer-bar { flex-direction: column; align-items: stretch; padding: 16px; }
              .modal-footer-bar > .row { width: 100%; justify-content: space-between; }
              .modal-footer-bar > .row:last-child { justify-content: stretch; }
              .modal-footer-bar > .row:last-child > button { flex: 1; }
            }
          `}</style>
          
          <div className="row" style={{ marginBottom: 16, width: "100%", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="row ac gap-3">
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent-weak)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="send" size={20} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{t("invite.inviteParticipants", null, "Invite Participants")}</h2>
                <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
                  {displayList.length} {t("invite.membersMatchReqs", null, "members match your mission requirements.")}
                </p>
              </div>
            </div>
            <button className="icon-btn" aria-label={t("actions.close", null, "Close")} style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
              <Icon name="x" size={15} />
            </button>
          </div>
          
          <div className="row ac search-wrapper" style={{ background: "#fff", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
            <Icon name="search" size={16} color="var(--text-muted)" style={{ marginRight: 10 }} />
            <input 
              type="text" 
              placeholder={t("invite.searchPlaceholder", null, "Search by name, role, skills, city...")} 
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setVisibleCount(20);
              }}
              style={{ border: "none", background: "transparent", padding: 0, width: "100%", outline: "none", fontSize: 14 }}
            />
          </div>

          {/* Filter Pills */}
          <div className="row" style={{ paddingBottom: 8, gap: 8, alignItems: "flex-start", borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
            <div 
              className="row ac gap-2 pill-row-scroll" 
              style={{ 
                flexWrap: "nowrap", 
                flex: 1, 
                overflowX: "auto", 
                paddingBottom: 12,
                WebkitOverflowScrolling: "touch"
              }}
            >
              <Btn
                variant={activeFilters.has(t("invite.recommended", null, "Recommended")) ? "primary" : "ghost"}
                size="sm"
                icon="zap"
                onClick={() => toggleFilter(t("invite.recommended", null, "Recommended"))}
                style={{ borderRadius: 20, border: activeFilters.has(t("invite.recommended", null, "Recommended")) ? "none" : "1px solid var(--border)" }}
              >
                {t("invite.recommended", null, "Recommended")}
              </Btn>
              <Btn
                variant={activeFilters.has(t("invite.trust90", null, "Trust 90+")) ? "primary" : "ghost"}
                size="sm"
                icon="award"
                onClick={() => toggleFilter(t("invite.trust90", null, "Trust 90+"))}
                style={{ borderRadius: 20, border: activeFilters.has(t("invite.trust90", null, "Trust 90+")) ? "none" : "1px solid var(--border)" }}
              >
                {t("invite.trust90", null, "Trust 90+")}
              </Btn>
              {audienceFilterChips.map(f => (
                <Btn
                  key={f}
                  variant={activeFilters.has(f) ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => toggleFilter(f)}
                  style={{ borderRadius: 20, border: activeFilters.has(f) ? "none" : "1px solid var(--border)" }}
                >
                  {trFilterLabel(t, f)}
                </Btn>
              ))}
            </div>
            
            {activeFilters.size > 0 && (
              <div style={{ marginLeft: "auto", flexShrink: 0, alignSelf: "flex-start", marginTop: 4 }}>
                <button 
                  className="btn btn-ghost"
                  onClick={() => setActiveFilters(new Set())} 
                  style={{ 
                    fontWeight: 600, 
                    color: "var(--accent)",
                    background: "transparent",
                    border: "none",
                    fontSize: 13,
                    padding: "4px 8px"
                  }}
                >
                  {t("actions.clearAll", null, "Clear all")}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* List Section - Now scrolling independently with flush scrollbar */}
        <div className="modal-scroll" style={{ flex: 1, overflowY: "scroll", minHeight: 0 }}>
          <div style={{ padding: "0 24px 16px" }}>
          {loading ? (
            <div className="muted" style={{ padding: 20, textAlign: "center" }}>{t("invite.loadingMatches", null, "Loading perfect matches...")}</div>
          ) : validators.length === 0 ? (
            // Nobody in the audience-scoped list at all — different from the
            // list below just being filtered down to nothing by search/pills
            // within this modal, which the plain "no matches for these
            // filters" message still covers. There's no filter control here
            // that can fix this (the mission's own audience is edited from
            // its Audience tab, not from this modal), so the copy points
            // there instead of suggesting a change the builder can't make
            // from this screen.
            <div className="muted" style={{ padding: 20, textAlign: "center" }}>{t("invite.noAudienceMatch", null, "No one in the validator pool currently matches this mission's audience. Widen your targeting from the Audience tab to reach more people — matches update live as new members join.")}</div>
          ) : displayList.length === 0 ? (
            <div className="muted" style={{ padding: 20, textAlign: "center" }}>{t("invite.noMatchesFound", null, "No matches found for these filters.")}</div>
          ) : (
            <div className="col gap-0">
              {displayList.slice(0, visibleCount).map((v, i) => (
                <div key={v.id}>
                  {i === 0 && recommendedCount > 0 && recommendedCount < displayList.length && (
                    <div className="row ac" style={{ gap: 10, margin: "0 0 10px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                        {t("invite.recommended", null, "Recommended")}
                      </span>
                      <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    </div>
                  )}
                  {i === recommendedCount && recommendedCount > 0 && recommendedCount < displayList.length && (
                    <div className="row ac" style={{ gap: 10, margin: "14px 0 10px" }}>
                      <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                        {t("invite.otherMembers", null, "Other members")}
                      </span>
                      <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    </div>
                  )}
                  <ValidatorListItem
                    v={v}
                    isSelected={selectedIds.has(v.id)}
                    toggleSelection={toggleSelection}
                    t={t}
                  />
                </div>
              ))}

              {visibleCount < displayList.length && (
                <div style={{ textAlign: "center", marginTop: 24, marginBottom: 12 }}>
                  <Btn variant="outline" onClick={() => setVisibleCount(c => c + 50)}>
                    {t("actions.loadMoreMembers", null, "Load more members")} ({displayList.length - visibleCount})
                  </Btn>
                </div>
              )}
            </div>
          )}
        </div>
        </div>

        {/* Sticky Footer Action Bar */}
        <div className="modal-footer-bar">
          <div className="row ac gap-4">
            {selectedIds.size > 0 && (
              <div className="row ac" style={{ position: "relative", width: Math.min(selectedIds.size, 3) * 20 + 28, height: 28 }}>
                {Array.from(selectedIds).slice(0, 3).map((id, i) => {
                  const validator = validators.find(v => v.id === id);
                  return (
                    <div key={id} style={{ position: "absolute", left: i * 20, zIndex: 3 - i, border: "2px solid var(--panel)", borderRadius: "50%" }}>
                      <Avatar name={validator?.name || "?"} size={28} />
                    </div>
                  );
                })}
                {selectedIds.size > 3 && (
                  <div style={{ position: "absolute", left: 3 * 20, zIndex: 0, border: "2px solid var(--panel)", borderRadius: "50%", background: "var(--panel-inset)", color: "var(--accent)", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                    +{selectedIds.size - 3}
                  </div>
                )}
              </div>
            )}
            
            <div className="row ac gap-3" style={{ fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{t("invite.membersSelected", { count: selectedIds.size }, `${selectedIds.size} members selected`)}</span>
              {selectedIds.size > 0 && (
                <span 
                  style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 600 }} 
                  onClick={() => {
                    setViewOnlySelected(!viewOnlySelected);
                    setVisibleCount(20);
                  }}
                >
                  {viewOnlySelected ? t("actions.viewAll", null, "View all") : t("actions.viewSelected", null, "View selected")}
                </span>
              )}
            </div>
          </div>
          
          <div className="row gap-3">
            <Btn variant="ghost" onClick={onClose} style={{ fontWeight: 600, border: "1px solid var(--border)", background: "#fff", padding: "8px 16px", borderRadius: 6, color: "var(--text)" }}>{t("actions.cancel", null, "Cancel")}</Btn>
            <Btn 
              variant="primary" 
              onClick={handleBulkInvite} 
              loading={inviting}
              disabled={selectedIds.size === 0 || inviting}
              style={{ fontWeight: 600, padding: "8px 20px", borderRadius: 6 }}
            >
              {t("actions.inviteMembers", { count: selectedIds.size > 0 ? selectedIds.size : "" }, `Invite ${selectedIds.size > 0 ? `${selectedIds.size} Members` : ""}`)}
            </Btn>
          </div>
        </div>

      </div>
    </Modal>
    {rejectedConfirm && (
      <Modal title={rejectedConfirm.total === 1
        ? t("invite.confirmRejectedSingleTitle", null, "Invite Rejected User?")
        : t("invite.confirmRejectedMultiTitle", null, "Rejected Users Selected")} onClose={() => setRejectedConfirm(null)} width={440}>
        <div style={{ padding: "0 20px 20px" }}>
          <p style={{ fontSize: 14, margin: 0, lineHeight: 1.5 }}>
            {rejectedConfirm.total === 1
              ? t("invite.confirmRejectedSingleBody", null, "This user was previously rejected. Do you still want to send them an invite to join this mission?")
              : t("invite.confirmRejectedMultiBody", { n: rejectedConfirm.rejectedCount, total: rejectedConfirm.total }, `${rejectedConfirm.rejectedCount} of ${rejectedConfirm.total} selected participants were previously rejected. Do you still want to send invites to them?`)}
          </p>
          <div className="row gap-2" style={{ marginTop: 20, justifyContent: "flex-end" }}>
            <button className="btn" onClick={() => setRejectedConfirm(null)}>{t("actions.noCancel", null, "No, Cancel")}</button>
            <Btn variant="primary" onClick={() => { setRejectedConfirm(null); sendInvites(); }}>{t("actions.yesSendInvite", null, "Yes, Send Invite")}</Btn>
          </div>
        </div>
      </Modal>
    )}
    </>
  );
}
