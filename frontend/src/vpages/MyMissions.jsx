import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import { VEmpty, VReward, VTypeTag } from "../vcomponents/vui";
import { useVMeta } from "../vcontext/VMetaContext";
import { vapi } from "../vapi/client";
import { useTranslation } from "../i18n/index.jsx";

const MM_STATUS = {
  applied:   { label: "Applied", labelKey: "status.applied", tone: "var(--warning)", bg: "var(--warning-weak)" },
  active:    { label: "Active", labelKey: "status.active", tone: "var(--accent)", bg: "var(--accent-weak)" },
  revision:  { label: "Revision Requested", labelKey: "status.revisionRequested", tone: "var(--danger)", bg: "var(--danger-weak)" },
  submitted: { label: "In review", labelKey: "status.inReview", tone: "var(--warning)", bg: "var(--warning-weak)" },
  completed: { label: "Paid", labelKey: "status.paid", tone: "var(--success)", bg: "var(--success-weak)" },
  rejected:  { label: "Not selected", labelKey: "status.notSelected", tone: "var(--text-faint)", bg: "var(--panel-inset)" },
  closed:    { label: "Closed", labelKey: "status.closed", tone: "var(--text-faint)", bg: "var(--panel-inset)" },
  declined:  { label: "Declined", labelKey: "status.declined", tone: "var(--text-faint)", bg: "var(--panel-inset)" },
  saved:     { label: "Saved", labelKey: "status.saved", tone: "var(--accent)", bg: "var(--accent-weak)" },
};

const TABS = [
  { k: "applied", l: "Applied", lKey: "status.applied" },
  { k: "active", l: "Active", lKey: "status.active" },
  { k: "submitted", l: "Submitted", lKey: "status.submitted" },
  { k: "completed", l: "Completed", lKey: "status.completed" },
  { k: "rejected", l: "Rejected", lKey: "status.rejected" },
  { k: "closed", l: "Closed", lKey: "status.closed" },
  { k: "declined", l: "Declined", lKey: "status.declined" },
  { k: "invited", l: "Invited", lKey: "status.invited" },
  { k: "saved", l: "Saved", lKey: "status.saved" },
];

function MyMissionRow({ m, vtypes, ptypes, navigate, onUndecline, onUnsave }) {
  const { t } = useTranslation();
  const [undeclining, setUndeclining] = useState(false);
  const [unsaving, setUnsaving] = useState(false);
  const pt = ptypes?.find(p => p.id === m.type);
  const vType = vtypes[m.type] || (pt ? { icon: pt.icon, label: pt.label, accentVar: "--vt-mvp" } : vtypes["mvp"]);
  const s = MM_STATUS[m.status];
  return (
    <div className="card" style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "center" }}>
      <span style={{ width: 46, height: 46, borderRadius: 13, display: "grid", placeItems: "center", flex: "none",
        background: `color-mix(in srgb, var(${vType.accentVar}) 14%, transparent)`, color: `var(${vType.accentVar})` }}>
        <Icon name={vType.icon} size={22} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="row gap-2" style={{ alignItems: "baseline" }}>
          <b style={{ fontSize: 16, letterSpacing: "-.01em" }}>{m.product}</b>
          <span className="muted" style={{ fontSize: 13.5 }}>· {m.tagline}</span>
        </div>
        <div className="row gap-3 wrap faint" style={{ fontSize: 12.5, marginTop: 5 }}>
          <span className="tag" style={{ background: s.bg, color: s.tone }}>{t(s.labelKey, null, s.label)}</span>
          <span className="row gap-2"><Icon name="clock" size={13} />{m.deadline}</span>
          {(m.status === "active" || m.status === "revision") && <span className="row gap-2"><Icon name="list" size={13} />{m.progress}% {t("missions.complete", null, "complete")}</span>}
          {m.quality && m.quality !== "—" && <span className="row gap-2" style={{ color: "var(--success)" }}><Icon name="sparkle" size={13} />{m.quality}</span>}
        </div>
        {(m.status === "active" || m.status === "revision") && <div className="lvl-meter" style={{ marginTop: 10, maxWidth: 320 }}><i style={{ width: m.progress + "%" }} /></div>}
        {m.reason && <p className="faint" style={{ margin: "7px 0 0", fontSize: 12.5 }}>{m.reason}</p>}
      </div>
      <div className="col" style={{ alignItems: "flex-end", gap: 10 }}>
        <div style={{ textAlign: "right" }}><VReward amount={m.reward} type={m.rewardType} /><div className="faint" style={{ fontSize: 11 }}>{t("missions.reward", null, "reward")}</div></div>
        {(m.status === "active" || m.status === "revision") && <button className="btn btn-primary" onClick={() => {
          const dest = (m.type === "trial") ? "checkin"
            : (m.category === "sample") ? "shipment"
            : (m.type === "interview") ? "schedule"
            : (m.type === "focus") ? "poll"
            // Marketplace listings (vtasks) have no multi-task workspace shape —
            // route them to the rubric-based review form instead (BUG-028).
            : (m.src === "vtask") ? "rate"
            : "workspace";
          navigate(`/validator/missions/${m.taskId}/${dest}`);
        }}>{t("actions.resume", null, "Resume")} <Icon name="arrowRight" /></button>}
        {m.status === "declined" && (
          <button className="btn btn-ghost" disabled={undeclining} onClick={async () => {
            setUndeclining(true);
            try { await onUndecline(m.taskId); } finally { setUndeclining(false); }
          }}>{undeclining ? t("actions.undoing", null, "Undoing…") : t("actions.undoDecline", null, "Undo")}</button>
        )}
        {m.status === "applied" && <span className="pill" style={{ fontSize: 12 }}><Icon name="clock" size={13} />{t("status.awaiting", null, "Awaiting")}</span>}
        {m.status === "submitted" && <span className="pill" style={{ fontSize: 12, color: "var(--warning)" }}><Icon name="clock" size={13} />{t("status.inReview", null, "In review")}</span>}
        {m.status === "completed" && <span className="pill" style={{ fontSize: 12, color: "var(--success)" }}><Icon name="check" size={13} />{t("status.paid", null, "Paid")}</span>}
        {m.status === "saved" && (
          <div className="row gap-2">
            <button className="btn btn-ghost" disabled={unsaving} onClick={async () => {
              setUnsaving(true);
              try { await onUnsave(m.taskId); } finally { setUnsaving(false); }
            }}><Icon name="x" size={14} />{unsaving ? t("actions.removing", null, "Removing…") : t("actions.remove", null, "Remove")}</button>
            <button className="btn btn-primary" onClick={() => navigate(`/validator/missions/${m.taskId}`)}>{t("actions.view", null, "View")} <Icon name="arrowRight" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

// Invitations have a completely different shape (no v_my_missions row exists
// yet — nothing's been accepted or declined) so this doesn't try to force
// them through MyMissionRow's status-driven branches; a separate, simpler
// row with just the two actions that actually apply here.
function InvitedMissionRow({ inv, ptypes, navigate, onAccept, onDecline }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const pt = ptypes?.find(p => p.id === inv.ptype);
  return (
    <div className="card" style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "center" }}>
      <span style={{ width: 46, height: 46, borderRadius: 13, display: "grid", placeItems: "center", flex: "none",
        background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }}>
        <Icon name={pt?.icon || "mail"} size={22} />
      </span>
      <div style={{ minWidth: 0, cursor: "pointer" }} onClick={() => navigate(`/validator/missions/${inv.id}`)}>
        <div className="row gap-2" style={{ alignItems: "baseline" }}>
          <b style={{ fontSize: 16, letterSpacing: "-.01em" }}>{inv.name}</b>
          <span className="muted" style={{ fontSize: 13.5 }}>· {inv.builder_org || inv.builder_name}</span>
        </div>
        <div className="row gap-3 wrap faint" style={{ fontSize: 12.5, marginTop: 5 }}>
          <span className="tag" style={{ background: "var(--accent-weak)", color: "var(--accent)" }}>{t("status.invited", null, "Invited")}</span>
          {inv.deadline && <span className="row gap-2"><Icon name="clock" size={13} />{String(inv.deadline).slice(0, 10)}</span>}
        </div>
      </div>
      <div className="col" style={{ alignItems: "flex-end", gap: 10 }}>
        <div style={{ textAlign: "right" }}><VReward amount={inv.reward_amount} type={inv.reward_type} /><div className="faint" style={{ fontSize: 11 }}>{t("missions.reward", null, "reward")}</div></div>
        <div className="row gap-2">
          <button className="btn btn-ghost" disabled={busy} onClick={async () => { setBusy(true); try { await onDecline(inv.invite_id); } finally { setBusy(false); } }}>{t("actions.decline", null, "Decline")}</button>
          <button className="btn btn-primary" disabled={busy} onClick={async () => { setBusy(true); try { await onAccept(inv.invite_id); } finally { setBusy(false); } }}>{busy ? t("actions.working", null, "Working…") : t("actions.accept", null, "Accept")}</button>
        </div>
      </div>
    </div>
  );
}

export default function MyMissions() {
  const { t, dataVersion } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { vtypes, ptypes } = useVMeta();
  
  // Use the search param tab if it exists and is valid, otherwise default to "active"
  const urlTab = searchParams.get("tab");
  const initialTab = (urlTab && TABS.some(tabObj => tabObj.k === urlTab)) ? urlTab : "active";
  
  const [tab, setTab] = useState(initialTab);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(20);

  // Re-sync when the URL's tab param changes while already mounted here
  // (e.g. clicking a notification that deep-links to a tab on this same page) —
  // the useState above only seeds the initial value on mount.
  useEffect(() => {
    if (urlTab && TABS.some(tabObj => tabObj.k === urlTab) && urlTab !== tab) {
      setTab(urlTab);
    }
  }, [urlTab]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setVisibleCount(20);
    if (tab === "invited") {
      // Invitations live in a different table entirely (nothing's been
      // accepted/declined yet, so there's no v_my_missions row to read) —
      // counts still come from the regular endpoint since every response
      // includes the full tab-count set regardless of which status was asked for.
      Promise.all([vapi.invitations(), vapi.myMissions("active")]).then(([inv, counts]) => {
        if (active) { setData({ missions: inv.invitations || [], counts: counts.counts }); setLoading(false); }
      }).catch(() => {
        if (active) { setLoading(false); setData({ missions: [], counts: data?.counts || {} }); }
      });
    } else {
      vapi.myMissions(tab).then(d => {
        if (active) { setData(d); setLoading(false); }
      }).catch(() => {
        if (active) { setLoading(false); setData({ missions: [], counts: data?.counts || {} }); }
      });
    }
    return () => { active = false; };
  }, [tab, dataVersion]);

  const tabs = TABS.map(tabObj => ({ ...tabObj, c: data?.counts?.[tabObj.k] ?? "·" }));

  const selectTab = (k) => {
    setTab(k);
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.set("tab", k);
      return p;
    }, { replace: true });
  };

  const undecline = async (taskId) => {
    try { await vapi.undeclineMission(taskId); } catch { /* best effort */ }
    vapi.myMissions(tab).then(setData).catch(() => {});
  };

  const unsave = async (taskId) => {
    try { await vapi.saveTask(taskId, false); } catch { /* best effort */ }
    setData(d => d && { ...d, missions: d.missions.filter(m => m.taskId !== taskId), counts: { ...d.counts, saved: Math.max(0, (d.counts.saved || 0) - 1) } });
  };

  const acceptInvite = async (inviteId) => {
    await vapi.acceptInvitation(inviteId);
    setData(d => d && { ...d, missions: d.missions.filter(inv => inv.invite_id !== inviteId), counts: { ...d.counts, invited: Math.max(0, (d.counts.invited || 0) - 1), active: (d.counts.active || 0) + 1 } });
  };

  const declineInvite = async (inviteId) => {
    await vapi.declineInvitation(inviteId);
    setData(d => d && { ...d, missions: d.missions.filter(inv => inv.invite_id !== inviteId), counts: { ...d.counts, invited: Math.max(0, (d.counts.invited || 0) - 1) } });
  };

  return (
    <div className="page">
      <div className="row between wrap gap-4 rise" style={{ marginBottom: 20 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>{t("missions.yourWork", null, "Your work")}</div>
          <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: "-.03em" }}>{t("missions.myMissions", null, "My missions")}</h2>
          <p className="muted" style={{ margin: "6px 0 0", fontSize: 15 }}>{t("missions.subtitle", null, "Everything you've applied to, are working on, or have wrapped up.")}</p>
        </div>
      </div>

      <div className="row gap-2 wrap rise-2" style={{ marginBottom: 18 }}>
        {tabs.map(tabObj => (
          <button key={tabObj.k} className="pill" onClick={() => selectTab(tabObj.k)} style={{ cursor: "pointer", fontWeight: 700,
            background: tab === tabObj.k ? "var(--accent)" : "var(--panel)", borderColor: tab === tabObj.k ? "var(--accent)" : "var(--border)", color: tab === tabObj.k ? "#fff" : "var(--text-muted)" }}>
            {t(tabObj.lKey, null, tabObj.l)}<span style={{ opacity: .7, fontFamily: "var(--mono)", fontSize: 11 }}>{tabObj.c}</span>
          </button>
        ))}
      </div>

      {loading ? <div className="muted">{t("actions.loading", null, "Loading…")}</div> : (!data || data.missions.length === 0)
        ? <div className="card" style={{ padding: 0 }}>
            <VEmpty icon="inbox" title={t("missions.nothingYet", { tab }, `Nothing ${tab} yet`)}
              body={tab === "applied" ? t("missions.emptyApplied", null, "Missions you apply to will wait here for a decision.") : tab === "completed" ? t("missions.emptyCompleted", null, "Approved, paid missions will collect here.") : tab === "closed" ? t("missions.emptyClosed", null, "Missions closed by the builder before you finished will collect here.") : tab === "declined" ? t("missions.emptyDeclined", null, "Missions you decline will collect here.") : tab === "invited" ? t("missions.emptyInvited", null, "Missions a Builder invites you to will wait here until you accept or decline.") : tab === "saved" ? t("missions.emptySaved", null, "Bookmark a mission from Discover to come back to it here.") : t("missions.emptyActive", null, "When you take on a mission it'll show up here.")}
              cta={tab !== "completed" && tab !== "rejected" && tab !== "closed" && tab !== "declined" ? <button className="btn btn-primary" onClick={() => navigate("/validator")}>{t("actions.discoverMissions", null, "Discover missions")}</button> : null} />
          </div>
        : (
            <div className="rise-3" style={{ display: "grid", gap: 12 }}>
              {tab === "invited"
                ? data.missions.slice(0, visibleCount).map(inv => <InvitedMissionRow key={inv.invite_id} inv={inv} ptypes={ptypes} navigate={navigate} onAccept={acceptInvite} onDecline={declineInvite} />)
                : data.missions.slice(0, visibleCount).map(m => <MyMissionRow key={m.id ?? `saved-${m.taskId}`} m={m} vtypes={vtypes} ptypes={ptypes} navigate={navigate} onUndecline={undecline} onUnsave={unsave} />)}
              {visibleCount < data.missions.length && (
                <div style={{ textAlign: "center", marginTop: 12, paddingBottom: 24 }}>
                  <button className="btn btn-outline" onClick={() => setVisibleCount(c => c + 20)}>{t("actions.loadMoreMissions", null, "Load more missions")}</button>
                </div>
              )}
            </div>
          )}
    </div>
  );
}
