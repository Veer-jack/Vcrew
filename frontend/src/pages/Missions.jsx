import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { toast as hotToast } from "react-hot-toast";
import Icon from "../components/Icon";
import { Btn, Empty, UpdatingBadge } from "../components/ui";
import MissionsTable from "../components/MissionsTable";
import { useMeta } from "../context/MetaContext";
import { api } from "../api/client";
import { useTranslation } from "../i18n/index.jsx";
import { useAuth } from "../context/AuthContext";
import { getRecentDraftId, hasResumableDraft, clearAllLocalDraftState } from "../utils/missionDraft";

// Tabs defined dynamically inside component to use translations

export default function Missions() {
  const { t, dataVersion } = useTranslation();
  const { builder } = useAuth();
  const TABS = [
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
  const [tab, setTab] = useState(searchParams.get("tab") || "active");
  const [q, setQ] = useState(searchParams.get("q") || "");

  // Only the initial mount read the tab from the URL — a notification link
  // to a tab (e.g. /missions?tab=draft) while the Missions page was already
  // open wouldn't remount the component, so this state never picked it up
  // and the URL and the visible tab silently disagreed.
  useEffect(() => {
    const urlTab = searchParams.get("tab") || "active";
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

  useEffect(() => {
    const t = setTimeout(() => setVisibleCount(20), 0);
    return () => clearTimeout(t);
  }, [tab, q]);

  useEffect(() => {
    setTimeout(() => setRefetching(true), 0);
    api.missions({ status: tab, q }).then(d => { setMissions(d.missions); setLoading(false); }).finally(() => setRefetching(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q, dataVersion]);

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
        setToast(t("missions.deleteSuccess", null, "Mission deleted successfully"));
        setTimeout(() => setToast(null), 3000);
      });
    }
  };

  // counts per tab (one extra call, cheap and infrequent)
  useEffect(() => {
    Promise.all(TABS.map(t => api.missions({ status: t.k }).then(d => [t.k, d.missions.length])))
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
        <div className="seg-search"><Icon name="search" size={16} /><input placeholder={t("missions.searchPlaceholder", null, "Search missions…")} value={q} onChange={e => setQ(e.target.value)} /></div>
      </div>
      {loading ? <div className="muted" style={{ padding: 24 }}>{t("actions.loading", null, "Loading…")}</div>
        : missions.length === 0
          ? <Empty icon="layers" title={`${t("missions.no", null, "No")} ${tab} ${t("missions.missionsLower", null, "missions")}`} action={tab === "draft" || tab === "active" ? <Btn variant="primary" icon="plus" onClick={() => navigate("/missions/new")}>{t("actions.createFirstMission", null, "Create your first mission")}</Btn> : null}>{tab === "completed" ? t("missions.completedEmpty", null, "Completed missions will appear here once they wrap.") : t("missions.emptyDefault", null, "Nothing here yet.")}</Empty>
          : (
            <div style={{ paddingBottom: 32 }}>
              <MissionsTable rows={missions.slice(0, visibleCount)} nav={navigate} categories={categories} onDelete={handleDelete} />
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
