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
          <span className="muted" style={{ fontSize: 10.5, marginTop: 2, fontWeight: 500 }}>{t("invite.matchLabel", null, "Match")}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 60 }}>
          <span style={{ fontWeight: 700, color: "var(--success)", fontSize: 15, display: "flex", alignItems: "center", gap: 4 }}>
            <Icon name="shieldCheck" size={13} />
            {v.trust}
          </span>
          <span className="muted" style={{ fontSize: 10.5, marginTop: 2, fontWeight: 500 }}>{t("metrics.trustScore", null, "Trust Score")}</span>
        </div>
        <div style={{ width: 100, textAlign: "right" }}>
          {v.invitedStatus ? (
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
  
  // New States for UI
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [viewOnlySelected, setViewOnlySelected] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    api.audience({ missionId: mission.id })
      .then(res => {
        const reqRole = mission.ptype === 'trial' ? 'Tester' : 'Validator';
        const filtered = (res.members || []).filter(v => v.role === reqRole || v.role === 'Validator');
        setValidators(filtered);
      })
      .catch(() => toast.error(t("invite.failedToLoadAudience", null, "Failed to load audience")))
      .finally(() => setLoading(false));
  }, [mission, t]);

  // Derived state for skills to show in filter pills
  const availableSkills = useMemo(() => {
    const skills = new Set();
    validators.forEach(v => {
      (v.expertise || []).forEach(e => skills.add(e));
    });
    return Array.from(skills).slice(0, 5); // Take top 5 skills
  }, [validators]);

  // Derived state for occupations to show in filter pills
  const availableOccupations = useMemo(() => {
    const occs = new Set();
    validators.forEach(v => {
      if (v.occ && v.occ !== "Unspecified") occs.add(v.occ);
    });
    return Array.from(occs); // Show all occupations
  }, [validators]);

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

  // Filtered validators based on search, pills, and view toggle
  const displayList = useMemo(() => {
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
    
    if (activeFilters.has(t("invite.recommended", null, "Recommended"))) {
      list = list.filter(v => v.match >= 80).sort((a, b) => b.match - a.match);
    }
    if (activeFilters.has(t("invite.trust90", null, "Trust 90+"))) {
      list = list.filter(v => v.trust >= 90);
    }
    
    availableSkills.forEach(s => {
      if (activeFilters.has(s)) {
        list = list.filter(v => (v.expertise || []).includes(s));
      }
    });

    availableOccupations.forEach(o => {
      if (activeFilters.has(o)) {
        list = list.filter(v => v.occ === o);
      }
    });

    return list;
  }, [validators, search, activeFilters, viewOnlySelected, selectedIds, availableSkills, availableOccupations, t]);

  const handleBulkInvite = async () => {
    if (selectedIds.size === 0) return;
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

  return (
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
                style={{ borderRadius: 20, border: activeFilters.has(t("invite.recommended", null, "Recommended")) ? "none" : "1px solid var(--border)", background: activeFilters.has(t("invite.recommended", null, "Recommended")) ? "var(--accent-weak)" : "transparent", color: activeFilters.has(t("invite.recommended", null, "Recommended")) ? "var(--accent)" : "inherit" }}
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
              {availableOccupations.map(o => (
                <Btn 
                  key={o}
                  variant={activeFilters.has(o) ? "primary" : "ghost"} 
                  size="sm" 
                  onClick={() => toggleFilter(o)}
                  style={{ borderRadius: 20, border: activeFilters.has(o) ? "none" : "1px solid var(--border)" }}
                >
                  {trFilterLabel(t, o)}
                </Btn>
              ))}
              {availableSkills.map(s => (
                <Btn
                  key={s}
                  variant={activeFilters.has(s) ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => toggleFilter(s)}
                  style={{ borderRadius: 20, border: activeFilters.has(s) ? "none" : "1px solid var(--border)" }}
                >
                  {trFilterLabel(t, s)}
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
          ) : displayList.length === 0 ? (
            <div className="muted" style={{ padding: 20, textAlign: "center" }}>{t("invite.noMatchesFound", null, "No matches found for these filters.")}</div>
          ) : (
            <div className="col gap-0">
              {displayList.slice(0, visibleCount).map(v => (
                <ValidatorListItem
                  key={v.id}
                  v={v}
                  isSelected={selectedIds.has(v.id)}
                  toggleSelection={toggleSelection}
                  t={t}
                />
              ))}
              
              {visibleCount < displayList.length && (
                <div style={{ textAlign: "center", marginTop: 24, marginBottom: 12 }}>
                  <Btn variant="outline" onClick={() => setVisibleCount(c => c + 50)}>
                    {t("actions.loadMore", null, "Load more")} ({displayList.length - visibleCount})
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
  );
}
