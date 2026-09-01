import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { toast as hotToast } from "react-hot-toast";
import Icon from "../components/Icon";
import { Btn, Empty, UpdatingBadge } from "../components/ui";
import MissionsTable, { DELETABLE_STATUSES } from "../components/MissionsTable";
import { useMeta } from "../context/MetaContext";
import { api } from "../api/client";
import { useTranslation } from "../i18n/index.jsx";
import { useAuth } from "../context/AuthContext";
import { getRecentDraftId, hasResumableDraft, clearAllLocalDraftState } from "../utils/missionDraft";
import { exportCSV } from "../exportUtils";

// Tabs defined dynamically inside component to use translations

export default function Missions() {
  const { t, dataVersion } = useTranslation();
  const { builder } = useAuth();
  const TABS = [
    { k: "all", l: t("missions.tabAll", null, "All") },
    { k: "active", l: t("missions.tabActive", null, "Active") },
    { k: "draft", l: t("missions.tabDraft", null, "Draft") },
    { k: "closed", l: t("missions.tabClosed", null, "Closed") },
    { k: "completed", l: t("missions.tabCompleted", null, "Completed") },
    { k: "archived", l: t("missions.tabArchived", null, "Archived") }
  ];
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories } = useMeta();
  const [tab, setTab] = useState(searchParams.get("tab") || "all");
  const [q, setQ] = useState(searchParams.get("q") || "");

  // Only the initial mount read the tab from the URL — a notification link
  // to a tab (e.g. /missions?tab=draft) while the Missions page was already
  // open wouldn't remount the component, so this state never picked it up
  // and the URL and the visible tab silently disagreed.
  useEffect(() => {
    const urlTab = searchParams.get("tab") || "all";
    setTab(prev => (prev === urlTab ? prev : urlTab));
  }, [searchParams]);

  const selectTab = (k) => {
    setTab(k);
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.set("tab", k);
      return p;
    }, { replace: true });
  };
  const [missions, setMissions] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [toast, setToast] = useState(null);
  const [visibleCount, setVisibleCount] = useState(20);
  // Selection is scoped to whatever's currently loaded for this tab/search —
  // switching either one starts fresh rather than carrying over ids that
  // might not even be in the new list.
  const [selectedIds, setSelectedIds] = useState(new Set());
  // Type filter — a genuinely separate dimension from the status tabs, so it
  // applies on top of whichever tab is active rather than replacing it.
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setVisibleCount(20); setSelectedIds(new Set()); }, 0);
    return () => clearTimeout(t);
  }, [tab, q, selectedCategories]);

  useEffect(() => {
    setTimeout(() => setRefetching(true), 0);
    // "all" means no status filter at all (GET /missions with status
    // omitted returns every status) -- there's no literal "all" status
    // in the database to filter by.
    api.missions({ status: tab === "all" ? "" : tab, q, category: selectedCategories.join(",") }).then(d => { setMissions(d.missions); setLoading(false); }).finally(() => setRefetching(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q, selectedCategories, dataVersion]);

  useEffect(() => {
    if (location.state?.toast) {
      setTimeout(() => setToast(location.state.toast), 0);
      setTimeout(() => setToast(null), 3000);
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    let flagged = false;
    try { flagged = sessionStorage.getItem("vcrew_mission_draft_backnav") === "1"; } catch { /* ignore */ }
    if (!flagged) return;
    try { sessionStorage.removeItem("vcrew_mission_draft_backnav"); } catch { /* ignore */ }

    if (hasResumableDraft(builder?.id)) {
      hotToast.success(t("createMission.draftAutoSaved", null, "Your draft has been auto-saved!"), { position: "top-center" });
    }
  }, [builder?.id, t]);

  // Same idea as above, for leaving an in-progress edit of an already-live
  // mission — MissionDetail shows this itself when landing back on that
  // exact mission's own page; this is the fallback for landing here instead
  // (e.g. Back went further than one page). Any non-empty value counts —
  // this page doesn't care which mission it was.
  useEffect(() => {
    let flagged = "";
    try { flagged = sessionStorage.getItem("vcrew_mission_live_edit_backnav") || ""; } catch { /* ignore */ }
    if (!flagged) return;
    try { sessionStorage.removeItem("vcrew_mission_live_edit_backnav"); } catch { /* ignore */ }
    hotToast.success(t("createMission.liveEditSaved", null, "Changes are saved"), { position: "top-center" });
  }, [t]);

  const handleDelete = (id) => {
    if (window.confirm(t("missions.deleteConfirm", null, "Are you sure you want to delete this mission?"))) {
      api.deleteMission(id).then(() => {
        // If the deleted draft was also the one the recent-draft pointer
        // names, clear it too — otherwise "Create Mission" would keep
        // trying to resume a draft that no longer exists.
        if (getRecentDraftId(builder?.id) === String(id)) {
          clearAllLocalDraftState(builder?.id);
        }
        setMissions(prev => prev.filter(m => m.id !== id));
        setSelectedIds(prev => { if (!prev.has(id)) return prev; const next = new Set(prev); next.delete(id); return next; });
        setToast(t("missions.deleteSuccess", null, "Mission deleted successfully"));
        setTimeout(() => setToast(null), 3000);
      }).catch(err => hotToast.error(err.message || t("missions.deleteFailed", null, "Couldn't delete this mission")));
    }
  };

  // Every visible row is selectable — selection also drives Export, which
  // has no reason to exclude Active/Completed rows. Only Delete, below,
  // narrows down to the deletable subset of whatever's selected.
  const visibleRows = missions.slice(0, visibleCount);
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every(m => selectedIds.has(m.id));

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleSelectAll = () => setSelectedIds(prev => {
    const next = new Set(prev);
    if (allVisibleSelected) visibleRows.forEach(m => next.delete(m.id));
    else visibleRows.forEach(m => next.add(m.id));
    return next;
  });

  const selectedMissions = missions.filter(m => selectedIds.has(m.id));
  const selectedDeletableCount = selectedMissions.filter(m => DELETABLE_STATUSES.has(m.status)).length;

  const handleBulkExport = () => {
    exportCSV(
      "missions.csv",
      [t("missions.missionCol", null, "Mission"), t("missions.typeCol", null, "Type"), t("missions.statusCol", null, "Status"), t("missions.createdCol", null, "Created"), t("missions.deadlineCol", null, "Deadline"), t("metrics.participants", null, "Participants"), t("metrics.reward", null, "Reward"), t("metrics.completion", null, "Completion")],
      selectedMissions.map(m => [
        m.name, m.category, m.status, m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "",
        m.deadline ? new Date(m.deadline).toLocaleDateString() : "",
        `${m.participants?.joined ?? 0}/${m.participants?.target ?? 0}`,
        m.reward?.type === "sample" ? "Sample" : m.reward?.type === "free" ? "Free" : m.reward?.amount ?? "",
        m.completion ?? "",
      ])
    );
  };

  const handleBulkDelete = () => {
    const ids = selectedMissions.filter(m => DELETABLE_STATUSES.has(m.status)).map(m => m.id);
    if (!ids.length) return;
    if (!window.confirm(t("missions.bulkDeleteConfirm", { count: ids.length }, `Delete ${ids.length} mission(s)? This can't be undone.`))) return;
    api.bulkDeleteMissions(ids).then(({ deleted }) => {
      const deletedSet = new Set(deleted);
      if (deletedSet.has(getRecentDraftId(builder?.id))) clearAllLocalDraftState(builder?.id);
      setMissions(prev => prev.filter(m => !deletedSet.has(m.id)));
      setSelectedIds(new Set());
      setToast(t("missions.bulkDeleteSuccess", { count: deleted.length }, `${deleted.length} mission(s) deleted`));
      setTimeout(() => setToast(null), 3000);
    }).catch(err => hotToast.error(err.message || t("missions.bulkDeleteFailed", null, "Couldn't delete these missions")));
  };

  // counts per tab (one extra call, cheap and infrequent)
  useEffect(() => {
    Promise.all(TABS.map(t => api.missions({ status: t.k === "all" ? "" : t.k }).then(d => [t.k, d.missions.length])))
      .then(entries => setCounts(Object.fromEntries(entries)));
  }, [missions]);

  return (
    <div className="page rise">
      <style>{`
        @keyframes toastSlideIn {
          from { top: 4px; opacity: 0; }
          to { top: 24px; opacity: 1; }
        }
        @keyframes toastFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
      
      {toast && (
        <div style={{
          position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", background: "var(--panel)",
          border: "1px solid var(--border)", boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
          padding: "12px 20px", borderRadius: 30, zIndex: 100,
          display: "flex", alignItems: "center", gap: 10,
          animation: "toastSlideIn 0.3s ease-out, toastFadeOut 0.3s ease-in 2.7s forwards"
        }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--success)", display: "grid", placeItems: "center" }}>
            <Icon name="check" size={12} style={{ color: "#fff" }} />
          </div>
          <span style={{ fontWeight: 600, fontSize: 13.5 }}>{toast}</span>
        </div>
      )}

      <div className="ph">
        <div><span className="eyebrow">{t("missions.eyebrow", null, "Mission management")}</span><h1>{t("missions.title", null, "Missions")}</h1><p className="lead">{t("missions.lead", null, "Every study you've run, in flight, or drafted.")}</p></div>
        <div className="ph-actions" style={{ alignItems: "center", gap: 12 }}><UpdatingBadge show={refetching} /><Btn variant="primary" icon="plus" onClick={() => navigate("/missions/new")}>{t("actions.createMission", null, "Create Mission")}</Btn></div>
      </div>
      <div className="toolbar">
        <div className="tabs">{TABS.map(t => <button key={t.k} className={tab === t.k ? "on" : ""} onClick={() => selectTab(t.k)}>{t.l}<span className="cnt">{counts[t.k] ?? "·"}</span></button>)}</div>
        <span className="grow" />
        <div style={{ position: "relative" }}>
          <button title={t("missions.filterTitle", null, "Filter")} onClick={() => setFilterOpen(o => !o)}
            style={{ position: "relative", width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--panel)", display: "grid", placeItems: "center", cursor: "pointer" }}>
            <Icon name="filter" size={16} />
            {selectedCategories.length > 0 && (
              <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
            )}
          </button>
          {filterOpen && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setFilterOpen(false)} />
              <div role="menu" style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50, width: 240,
                background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
                boxShadow: "var(--shadow-md)", padding: "12px 14px",
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 8 }}>
                  {t("missions.filterStatus", null, "Status")}
                </div>
                <div className="col gap-1" style={{ marginBottom: 14 }}>
                  {TABS.map(tb => (
                    <button key={tb.k} className="menu-item" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "7px 8px", background: "none", border: "none", cursor: "pointer", borderRadius: "var(--radius-sm)", textAlign: "left", fontSize: 13.5, fontFamily: "inherit", fontWeight: tab === tb.k ? 700 : 500, color: tab === tb.k ? "var(--accent)" : "var(--text)" }}
                      onClick={() => { selectTab(tb.k); setFilterOpen(false); }}>
                      {tb.l}<span className="cnt">{counts[tb.k] ?? "·"}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="seg-search"><Icon name="search" size={16} /><input placeholder={t("missions.searchPlaceholder", null, "Search missions…")} value={q} onChange={e => setQ(e.target.value)} /></div>
      </div>
      {selectedIds.size > 0 && (
        <div className="row" style={{ alignItems: "center", gap: 12, padding: "10px 16px", margin: "0 0 14px", background: "var(--accent-weak)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", borderRadius: "var(--radius)" }}>
          <span style={{ fontWeight: 600, fontSize: 13.5, color: "var(--accent)" }}>{t("missions.selectedCount", { count: selectedIds.size }, `${selectedIds.size} selected`)}</span>
          <span className="grow" />
          <Btn variant="ghost" size="sm" icon="download" onClick={handleBulkExport}>{t("actions.export", null, "Export")}</Btn>
          {selectedDeletableCount > 0 && (
            <Btn variant="ghost" size="sm" icon="trash" onClick={handleBulkDelete}>
              {t("missions.bulkDeleteLabel", { count: selectedDeletableCount }, `Delete (${selectedDeletableCount})`)}
            </Btn>
          )}
          <Btn variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>{t("actions.clearSelection", null, "Clear")}</Btn>
        </div>
      )}
      {loading ? <div className="muted" style={{ padding: 24 }}>{t("actions.loading", null, "Loading…")}</div>
        : missions.length === 0
          ? <Empty icon="layers" title={tab === "all" ? t("missions.noMissionsYet", null, "No missions yet — create your first one.") : `${t("missions.no", null, "No")} ${tab} ${t("missions.missionsLower", null, "missions")}`} action={tab === "draft" || tab === "active" || tab === "all" ? <Btn variant="primary" icon="plus" onClick={() => navigate("/missions/new")}>{t("actions.createFirstMission", null, "Create your first mission")}</Btn> : null}>{tab === "completed" ? t("missions.completedEmpty", null, "Completed missions will appear here once they wrap.") : t("missions.emptyDefault", null, "Nothing here yet.")}</Empty>
          : (
            <div style={{ paddingBottom: 32 }}>
              <MissionsTable rows={visibleRows} nav={navigate} categories={categories} onDelete={handleDelete} tab={tab}
                selectedIds={selectedIds} onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAll} />
              {visibleCount < missions.length && (
                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <Btn variant="outline" onClick={() => setVisibleCount(c => c + 20)}>{t("actions.loadMore", null, "Load more missions")}</Btn>
                </div>
              )}
            </div>
          )}
    </div>
  );
}
