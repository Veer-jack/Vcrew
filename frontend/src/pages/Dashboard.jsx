import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import Icon from "../components/Icon";
import { Btn, KpiCard, UpdatingBadge, inr, inrK } from "../components/ui";
import MissionsTable from "../components/MissionsTable";
import { useAuth } from "../context/AuthContext";
import { useMeta } from "../context/MetaContext";
import { api } from "../api/client";
import { PERSONA_CONFIG, onboardingDraftKey, stepLabel } from "../data/personaConfig";
import { useTranslation } from "../i18n/index.jsx";
import { activityWho, activityText } from "../bi18n";

// A mission draft only ever lives in this browser's localStorage until
// "Save as Draft" is explicitly clicked (see CreateMissionWizard.jsx) — so
// leaving the wizard any way other than that button (browser back, closing
// the tab, the in-app Exit link) doesn't lose anything, but it also won't
// show up in the real Drafts list. This banner is the lightweight,
// non-blocking way to surface that: informational only, no confirm dialog.
// The wizard auto-saves on every render from the moment the page mounts,
// including its own pristine defaults — so the key exists the instant
// someone opens "Create Mission," before they've typed anything. Check for
// actual content instead of just key existence.
function hasMissionDraft(builderId) {
  if (!builderId) return false;
  try {
    const raw = localStorage.getItem(`vcrew_mission_draft_${builderId}`);
    if (!raw) return false;
    const d = JSON.parse(raw);
    return !!(d.title?.trim() || d.desc?.trim() || d.deadline || d.tasks?.length > 0);
  } catch { return false; }
}

function MissionDraftBanner({ builder, nav, draftMissionId }) {
  const { t } = useTranslation();
  if (!hasMissionDraft(builder?.id) && !draftMissionId) return null;

  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", marginBottom: 16, border: "1px solid var(--accent-weak)", background: "var(--accent-weak)" }}>
      <Icon name="fileText" size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
      <p style={{ margin: 0, flex: 1, fontSize: 13, color: "var(--text)" }}>
        {draftMissionId
          ? t("dashboard.unsavedMissionDraftServer", null, "You have a mission draft in progress — you can continue building it before it goes live.")
          : t("dashboard.unsavedMissionDraft", null, "You have an unsaved mission in progress — it's kept in this browser until you continue or explicitly save it as a draft.")}
      </p>
      <button className="btn btn-primary" style={{ flexShrink: 0, fontSize: 12.5 }} onClick={() => nav(draftMissionId ? `/missions/${draftMissionId}/edit` : "/missions/new")}>
        {t("actions.continue", null, "Continue")}
      </button>
    </div>
  );
}

function ProfileCompletionBanner({ builder, nav }) {
  const { t } = useTranslation();
  // profile_json alone doesn't prove onboarding actually happened — Settings'
  // partial-field saves populate it too. onboardingCompleted is the real,
  // dedicated signal (only set by the actual onboarding-completion route).
  if (builder?.onboardingCompleted) return null; // already completed

  let activePersonaKey = builder?.persona;
  let draftStepNum = null;

  // If the user hasn't saved a persona to the DB yet, check if they started a draft
  if (!activePersonaKey) {
    for (const key of Object.keys(PERSONA_CONFIG)) {
      try {
        const draft = JSON.parse(localStorage.getItem(onboardingDraftKey(builder?.id, key)));
        if (draft && typeof draft.step === "number") {
          activePersonaKey = key;
          draftStepNum = draft.step + 1; // 1-indexed
          break;
        }
      } catch { /* ignore */ }
    }
  } else {
    // They have a persona in DB, but profile is incomplete. Check their draft for progress.
    try {
      const draft = JSON.parse(localStorage.getItem(onboardingDraftKey(builder?.id, activePersonaKey)));
      if (draft && typeof draft.step === "number") {
        draftStepNum = draft.step + 1;
      }
    } catch { /* ignore */ }
  }

  if (!activePersonaKey) {
    return (
      <div className="card" style={{ border: "1px solid var(--accent-weak)", padding: 0, marginBottom: 20, display: "flex", overflow: "hidden" }}>
        {/* Left Side */}
        <div style={{ flex: "1", padding: 32, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ width: 54, height: 54, borderRadius: "50%", background: "#eff6ff", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <Icon name="user" size={26} />
          </div>
          <h3 style={{ fontSize: 20, marginBottom: 8, color: "var(--heading)", fontWeight: 600 }}>{t("dashboard.selectRole", null, "Select your role and complete setup")}</h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.5 }}>
            {t("dashboard.selectRoleDesc", null, "Choose the role that best describes you to personalize your workspace and begin the setup process.")}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text)" }}>
              <div style={{ color: "#3b82f6" }}><Icon name="alertCircle" size={16} /></div>
              {t("dashboard.noRoleSelected", null, "No role selected")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text-muted)" }}>
              <div style={{ color: "#9ca3af" }}><Icon name="xCircle" size={16} /></div>
              {t("dashboard.setupNotStarted", null, "Setup not started")}
            </div>
          </div>
        </div>
        {/* Right Side */}
        <div style={{ flex: "1.5", padding: 32, background: "#f8fafc", borderLeft: "1px solid var(--border)" }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)", marginBottom: 16 }}>{t("dashboard.chooseRole", null, "Choose your role")}</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { icon: "rocket", name: t("role.founder", null, "Founder / Startup"), desc: t("role.founderDesc", null, "Validate your startup ideas, get feedback and grow faster."), color: "#4f46e5" },
              { icon: "building", name: t("role.company", null, "Company"), desc: t("role.companyDesc", null, "Test products, understand users and make data-driven decisions."), color: "#0891b2" },
              { icon: "flask", name: t("role.researcher", null, "Researcher"), desc: t("role.researchDesc", null, "Conduct research, collect insights and contribute to knowledge."), color: "#0d9488" },
              { icon: "users", name: t("role.organization", null, "Organization"), desc: t("role.orgDesc", null, "Drive programs, measure impact and engage your community."), color: "#c2710c" }
            ].map(r => (
              <div key={r.name} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, padding: 16, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ color: r.color, marginBottom: 12 }}>
                  <Icon name={r.icon} size={24} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--heading)", marginBottom: 6, lineHeight: 1.2 }}>{r.name}</div>
                <div style={{ fontSize: 9.5, color: "var(--text-muted)", lineHeight: 1.4 }}>{r.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <Btn variant="primary" onClick={() => nav(`/get-started/feedback`)}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "0 12px" }}>
                <Icon name="user" size={16} />
                {t("actions.selectRole", null, "Select Role")}
              </div>
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  const persona = PERSONA_CONFIG[activePersonaKey];
  if (!persona) return null;

  let currentStepNum = draftStepNum || 1;
  currentStepNum = Math.min(currentStepNum, persona.steps.length);

  const totalSteps = persona.steps.length;
  const pct = Math.round(((currentStepNum - 1) / totalSteps) * 100);
  const nextStep = persona.steps[currentStepNum - 1];

  let icName = "rocket";
  let title = t("dashboard.personaTitle.founder", null, "Founder / Startup");
  let desc = t("dashboard.personaDesc.founder", null, "Set up your startup details to unlock all platform features.");
  if (activePersonaKey === "company") { icName = "building"; title = t("dashboard.personaTitle.company", null, "Company"); desc = t("dashboard.personaDesc.company", null, "Add your company information to build trust and credibility."); }
  else if (activePersonaKey === "researcher") { icName = "flask"; title = t("dashboard.personaTitle.researcher", null, "Researcher"); desc = t("dashboard.personaDesc.researcher", null, "Tell us about your research interests and goals."); }
  else if (activePersonaKey === "organization") { icName = "users"; title = t("dashboard.personaTitle.organization", null, "Organization"); desc = t("dashboard.personaDesc.organization", null, "Provide organization details to manage your account."); }

  return (
    <div className="card" style={{
      border: "1px solid var(--accent)", padding: 24, marginBottom: 20, display: "flex", gap: 32, alignItems: "center"
    }}>
      {/* Left */}
      <div style={{ flex: "0 0 160px", textAlign: "center" }}>
        <div style={{
          width: 54, height: 54, borderRadius: "50%", background: "var(--accent-weak)", color: "var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px"
        }}>
          <Icon name={icName} size={26} />
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>{currentStepNum - 1} {t("dashboard.of", null, "of")} {totalSteps} {t("dashboard.completed", null, "completed")}</div>
        <div style={{ height: 4, background: "var(--border)", borderRadius: 2, marginBottom: 10, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", transition: "width 0.3s" }} />
        </div>
        <a href={`/signup?role=${activePersonaKey}`} className="faint" style={{ fontSize: 12, fontWeight: 500 }}>{t("actions.viewAllSteps", null, "View all steps →")}</a>
      </div>

      {/* Middle */}
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: 18, marginBottom: 4, color: "var(--heading)" }}>{t("dashboard.completeProfile", null, "Complete your")} {title} {t("dashboard.profile", null, "profile")}</h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>{desc}</p>
        <span className="pill" style={{ fontSize: 11, background: "var(--accent-weak)", color: "var(--accent)", fontWeight: 600 }}>{t("dashboard.step", null, "Step")} {currentStepNum} {t("dashboard.of", null, "of")} {totalSteps}</span>
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{t("dashboard.nextStep", null, "Next step")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="layout" size={16} style={{ color: "var(--accent)" }} />
            <b style={{ fontSize: 14 }}>{nextStep ? stepLabel(t, nextStep.key, nextStep.label) : t("dashboard.details", null, "Details")}</b>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, marginLeft: 24 }}>{t("dashboard.continueFilling", null, "Continue filling out your")} {nextStep ? stepLabel(t, nextStep.key, nextStep.label).toLowerCase() : t("dashboard.details", null, "details")}.</div>
        </div>
      </div>

      {/* Right */}
      <div style={{ flex: "0 0 240px", borderLeft: "1px solid var(--border)", paddingLeft: 32 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {persona.steps.map((s, i) => {
            const isDone = i < currentStepNum - 1;
            const isCurr = i === currentStepNum - 1;
            return (
              <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 10, opacity: (isDone || isCurr) ? 1 : 0.5 }}>
                {isDone ? (
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--success)", color: "#fff", display: "grid", placeItems: "center" }}>
                    <Icon name="check" size={12} strokeWidth={3} />
                  </div>
                ) : (
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: isCurr ? "var(--accent)" : "var(--panel)", border: isCurr ? "none" : "1px solid var(--border)", color: isCurr ? "#fff" : "var(--text-muted)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>
                    {i + 1}
                  </div>
                )}
                <span style={{ fontSize: 13, fontWeight: isCurr ? 600 : 500, color: isCurr ? "var(--heading)" : "var(--text)" }}>{stepLabel(t, s.key, s.label)}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Btn variant="primary" block onClick={() => nav(`/signup?role=${activePersonaKey}`)}>{t("actions.continueSetup", null, "Continue Setup →")}</Btn>
          {!builder?.persona && (
            <Btn variant="ghost" block onClick={() => {
              Object.keys(PERSONA_CONFIG).forEach(k => { try { localStorage.removeItem(onboardingDraftKey(builder?.id, k)); } catch { /* ignore */ } });
              nav(`/get-started/feedback`);
            }}>{t("actions.changeRole", null, "Change role")}</Btn>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickActions({ nav, balance }) {
  const { t } = useTranslation();
  const items = [
    { ic: "plus", t: t("actions.createMission", null, "Create Mission"), s: t("dashboard.qaLaunchNew", null, "Launch a new study"), go: () => nav("/missions/new") },
    { ic: "compass", t: t("actions.browseAudience", null, "Browse Audience"), s: t("dashboard.qaFindMembers", null, "Find the right members"), go: () => nav("/audience") },
    { ic: "chart", t: t("actions.viewReports", null, "View Reports"), s: t("dashboard.qaAnalytics", null, "Analytics & exports"), go: () => nav("/analytics") },
    { ic: "wallet", t: t("actions.manageWallet", null, "Manage Wallet"), s: `${inr(balance)} ${t("dashboard.available", null, "available")}`, go: () => nav("/wallet") },
  ];
  return (
    <div className="qa-grid">
      {items.map((it, i) => (
        <button className="qa" key={i} onClick={it.go}>
          <span className="qa-ic"><Icon name={it.ic} size={20} /></span>
          <span className="qa-meta"><b>{it.t}</b><span>{it.s}</span></span>
        </button>
      ))}
    </div>
  );
}

function ActivityFeed({ rows }) {
  const { t } = useTranslation();
  if (!rows.length) return <div className="muted" style={{ padding: "12px 0" }}>{t("dashboard.noActivity", null, "No recent activity yet.")}</div>;
  return (
    <div className="feed">
      {rows.map((a) => (
        <div className="feed-row" key={a.id} style={{ alignItems: "center", padding: "16px 12px" }}>
          <span className={`feed-ic ${a.tone}`}><Icon name={a.icon} size={16} /></span>
          <div className="feed-body" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <p style={{ fontSize: "14.5px" }}><b>{activityWho(t, a)}</b> {activityText(t, a)} <b>{a.mission_name}</b></p>
          </div>
          <div className="feed-time" style={{ marginTop: 0, fontSize: "13px" }}>{a.time_label}</div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { t, dataVersion } = useTranslation();
  const { builder, refreshBuilder } = useAuth();
  const { categories } = useMeta();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [refetching, setRefetching] = useState(false);
  const [showAllMissions, setShowAllMissions] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [loadErr, setLoadErr] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    // Prevent back-button going to login page
    window.history.pushState(null, "", window.location.href);
    const onPop = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // One-shot: the wizard flags this when left via browser back/swipe-back
  // (which can't be reliably intercepted with a confirm dialog) instead of
  // leaving the user to wonder whether their in-progress mission is gone.
  useEffect(() => {
    let flagged = false;
    try { flagged = sessionStorage.getItem("vcrew_mission_draft_backnav") === "1"; } catch { /* ignore */ }
    if (!flagged) return;
    try { sessionStorage.removeItem("vcrew_mission_draft_backnav"); } catch { /* ignore */ }
    if (hasMissionDraft(builder?.id)) {
      toast(t("dashboard.draftSavedBackNav", null, "Your mission draft was saved — Continue from here anytime."), { icon: "📝" });
    }
  }, [builder?.id, t]);

  useEffect(() => {
    refreshBuilder().catch(() => {});
    setTimeout(() => setRefetching(true), 0);
    api.dashboard()
      .then(setData)
      .catch(() => setLoadErr(true))
      .finally(() => setRefetching(false));
  }, [refreshBuilder, dataVersion]);

  if (loadErr) return (
    <div className="page rise" style={{ textAlign: "center", paddingTop: 60 }}>
      <div style={{ fontSize: 15, color: "var(--text-muted)", marginBottom: 14 }}>{t("dashboard.loadError", null, "Couldn't load dashboard data.")}</div>
      <button className="btn btn-ghost" onClick={() => { setLoadErr(false); api.dashboard().then(setData).catch(() => setLoadErr(true)); }}>{t("actions.retry", null, "Retry")}</button>
    </div>
  );
  if (!data) return <div className="page rise"><div className="muted">{t("actions.loading", null, "Loading…")}</div></div>;

  const { kpi, activity, recentMissions } = data;
  const firstName = (builder?.name || "").split(" ")[0];

  return (
    <div className="page rise">
      {!builder?.verified && (
        data.latestVerification?.status === 'rejected' ? (
          <div style={{
            background: "#fef2f2",
            border: "1px solid #fecaca", borderRadius: "var(--radius)", padding: "14px 18px",
            marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12, justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", gap: 12 }}>
              <Icon name="alertTriangle" size={18} style={{ color: "#ef4444", flex: "none", marginTop: 2 }} />
              <div>
                <b style={{ fontSize: 13.5, color: "#991b1b" }}>{t("dashboard.accountRejected", null, "Your account has been rejected")}</b>
                <p style={{ fontSize: 13, color: "#b91c1c", margin: "3px 0 0", lineHeight: 1.5 }}>
                  {t("dashboard.reason", null, "Reason: ")}{data.latestVerification?.reviewer_note || t("dashboard.verificationFailed", null, "The website provided could not be verified. Please ensure the link is correct.")}
                  <br />{t("dashboard.reapplyDesc", null, "You can edit your details and apply for re-verification.")}
                </p>
              </div>
            </div>
            <button 
              className="btn btn-outline" 
              disabled={isApplying}
              onClick={async () => {
                setIsApplying(true);
                try {
                  await api.auth.reapplyVerification();
                  // Re-fetch dashboard to update banner back to pending
                  api.dashboard().then(setData).catch(() => setLoadErr(true));
                } catch (e) {
                  alert(e.message || t("dashboard.reapplyFailed", null, "Failed to reapply"));
                  setIsApplying(false);
                }
              }}
              style={{ flexShrink: 0, fontSize: 13, borderColor: "#ef4444", color: "#ef4444" }}
            >
              {isApplying ? t("actions.applying", null, "Applying...") : t("actions.applyReverification", null, "Apply for Re-verification")}
            </button>
          </div>
        ) : (
          <div style={{
            background: "linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)",
            border: "1px solid #f59e0b", borderRadius: "var(--radius)", padding: "14px 18px",
            marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12, justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", gap: 12 }}>
              <Icon name="shield" size={18} style={{ color: "#c2710c", flex: "none", marginTop: 2 }} />
              <div>
                <b style={{ fontSize: 13.5, color: "#92400e" }}>{t("dashboard.accountUnverified", null, "Your account is unverified")}</b>
                <p style={{ fontSize: 13, color: "#92400e", margin: "3px 0 0", lineHeight: 1.5 }}>
                  {t("dashboard.unverifiedDesc1", null, "You can run up to 3 active missions with a maximum of 25 participants each.")}
                  {t("dashboard.unverifiedDesc2", null, "To unlock unlimited campaigns, verify your website through your profile settings — an admin will review it within 24 hours.")}
                </p>
              </div>
            </div>
            <button className="btn btn-outline" onClick={() => navigate("/settings")} style={{ flexShrink: 0, fontSize: 13, borderColor: "#f59e0b", color: "#d97706" }}>{t("actions.viewProfile", null, "View Profile")}</button>
          </div>
        )
      )}
      <ProfileCompletionBanner builder={builder} nav={navigate} />
      <MissionDraftBanner builder={builder} nav={navigate} draftMissionId={data?.draftMissionId} />
      <div className="ph">
        <div>
          <span className="eyebrow">{t("dashboard.builderWorkspace", null, "Builder workspace")}</span>
          <h1>{t("dashboard.welcomeBack", null, "Welcome back,")} {firstName}</h1>
          <p className="lead">{t("dashboard.howMissionsTracking", { org: builder?.org }, `Here's how ${builder?.org || ""}'s validation missions are tracking today.`)}</p>
        </div>
        <div className="ph-actions" style={{ alignItems: "center", gap: 12 }}>
          <UpdatingBadge show={refetching} />
          <Btn variant="ghost" icon="compass" onClick={() => navigate("/audience")}>{t("actions.browseAudience", null, "Browse audience")}</Btn>
          <Btn variant="primary" icon="plus" onClick={() => navigate("/missions/new")}>{t("actions.createMission", null, "Create Mission")}</Btn>
        </div>
      </div>

      <div className="kpis sec">
        <KpiCard label={t("dashboard.activeMissions", null, "Active Missions")} value={kpi.activeMissions} icon="bolt" />
        <KpiCard label={t("dashboard.completedMissions", null, "Completed Missions")} value={kpi.completedMissions} icon="checkCircle" tone="green" />
        <KpiCard label={t("dashboard.totalParticipants", null, "Total Participants")} value={kpi.totalParticipants.toLocaleString("en-IN")} icon="users" spark={kpi.spark.participants} />
        <KpiCard label={t("dashboard.pendingParticipants", null, "Pending Participants")} value={kpi.pendingParticipants} icon="clock" tone="amber" />
      </div>
      <div className="kpis sec" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <KpiCard label={t("dashboard.totalSpend", null, "Total Spend")} value={inrK(kpi.totalSpend)} icon="wallet" spark={kpi.spark.spend} />
        <KpiCard label={t("dashboard.avgCompletionRate", null, "Avg Completion Rate")} value={kpi.avgCompletion} unit="%" icon="target" tone="green" />
        <KpiCard label={t("dashboard.walletBalance", null, "Wallet Balance")} value={inrK(builder?.balance)} icon="coins" onClick={() => navigate("/wallet")} />
      </div>

      <div className="sec">
        <div className="sec-head"><h2 className="h-lg">{t("dashboard.quickActions", null, "Quick actions")}</h2></div>
        <QuickActions nav={navigate} balance={builder?.balance} />
      </div>

      <div className="sec" style={{ marginBottom: 40 }}>
        <div className="card" style={{ padding: "18px 0" }}>
          <div className="sec-head" style={{ marginBottom: 12, padding: "0 18px" }}>
            <h3 className="h-md">{t("dashboard.recentMissions", null, "Recent missions")}</h3>
            <Btn 
              variant="quiet" 
              size="sm" 
              iconRight={showAllMissions ? "x" : "arrowRight"} 
              onClick={() => setShowAllMissions(!showAllMissions)}
            >
              {showAllMissions ? t("actions.close", null, "Close") : t("actions.viewAllMissions", null, "View all missions")}
            </Btn>
          </div>
          <MissionsTable rows={showAllMissions ? recentMissions : recentMissions.slice(0, 3)} nav={navigate} categories={categories} />
        </div>
      </div>

      <div className="sec">
        <div className="card" style={{ padding: 18 }}>
          <div className="sec-head" style={{ marginBottom: 6 }}>
            <h3 className="h-md">{t("dashboard.activityFeed", null, "Activity feed")}</h3>
            <Btn 
              variant="quiet" 
              size="sm" 
              iconRight={showAllActivity ? "x" : "arrowRight"} 
              onClick={() => setShowAllActivity(!showAllActivity)}
            >
              {showAllActivity ? t("actions.close", null, "Close") : t("actions.viewAll", null, "View all")}
            </Btn>
          </div>
          <ActivityFeed rows={showAllActivity ? activity : activity.slice(0, 4)} />
        </div>
      </div>
    </div>
  );
}
