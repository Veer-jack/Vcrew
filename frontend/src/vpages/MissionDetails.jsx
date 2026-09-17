import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Icon from "../components/Icon";
import { VReward, VTypeTag } from "../vcomponents/vui";
import { useVMeta } from "../vcontext/VMetaContext";
import { vapi } from "../vapi/client";
import { deadlineLabel, rewardPaysOnApproval } from "../vutil";
import { useTranslation } from "../i18n/index.jsx";

export default function MissionDetails() {
  const { t, dataVersion } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { vtypes, ptypes, categories } = useVMeta();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const reportFormRef = useRef(null);
  useEffect(() => {
    if (reportOpen) reportFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [reportOpen]);
  const [reportDone, setReportDone] = useState(false);

  const location = useLocation();
  useEffect(() => { 
    vapi.task(id).then(d => {
      setData(d);
      // Auto-save logic if directed from notification
      if (location.state?.autoSave && !d.task.saved) {
        vapi.saveTask(id, true).catch(() => {});
        d.task.saved = true;
        setData({ ...d });
        // Clear the state so it doesn't fire again on refresh
        navigate(".", { replace: true, state: {} });
      }
    }); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, location.state?.refresh, dataVersion]); // Remove location.state from dependencies to prevent infinite loops
  if (!data) return <div className="page rise"><div className="muted">{t("actions.loading", null, "Loading…")}</div></div>;

  const { task, rubric } = data;
  const vType = vtypes[task.type];
  const accepted = task.myStatus === "active" || task.myStatus === "submitted" || task.myStatus === "completed";
  const pt = task.ptype && ptypes ? ptypes.find(p => p.id === task.ptype) : null;
  const cat = task.category && categories ? categories.find(c => c.id === task.category) : null;
  // Header metadata line -- tagline/company plus the participation format,
  // which used to sit in its own "Mission requirements" block further down
  // the page. Filtered + joined so a missing piece (no ptype, no question
  // count) doesn't leave a stray leading/trailing separator.
  const headerMeta = [
    task.tagline,
    task.company,
    pt && `${t("missions.feedbackFormat", null, "Feedback Format:")} ${pt.label}`,
    task.questionCount > 0 && t("missions.questionCount", { count: task.questionCount }, `${task.questionCount} questions`),
  ].filter(Boolean).join(" | ");

  // Shared by apply() and acceptInvite() — both actions are now gated
  // server-side on having a complete-enough profile (see vmarketplace.js /
  // vmissions.js), so both need the same "go finish onboarding" recovery path.
  const handleJoinError = (e) => {
    if (e.code === "ONBOARDING_REQUIRED") {
      if (window.confirm(t("vMissionDetails.completeProfilePrompt", null, "Complete your profile before joining a mission. Go finish onboarding now?"))) {
        navigate("/validator/onboarding");
      }
    } else {
      alert(e.message || t("vMissionDetails.failedToJoin", null, "Something went wrong"));
    }
  };

  const apply = async () => {
    setBusy(true);
    try {
      // Hardcoded to "active" here regardless of what actually happened --
      // a require-approval mission's apply genuinely lands at 'applied', not
      // 'active' (see POST /marketplace/:id/apply), so this showed "Accepted
      // · Start now" for a couple of seconds no matter what, only correcting
      // itself to "Awaiting builder review" once the validator left and came
      // back and the page did a real fetch. Using the response's own status
      // means the very first render already shows the truth.
      const { myMission } = await vapi.applyTask(task.id);
      setData(d => ({ ...d, task: { ...d.task, myStatus: myMission?.status || "active" } }));
    } catch (e) {
      handleJoinError(e);
    } finally { setBusy(false); }
  };

  const acceptInvite = async () => {
    setBusy(true);
    try {
      await vapi.post(`/missions/invitations/${task.inviteId}/accept`);
      setData(d => ({ ...d, task: { ...d.task, myStatus: "active", inviteId: null } }));
    } catch (e) {
      handleJoinError(e);
      // refresh task to get updated slots
      vapi.task(id).then(setData);
    } finally { setBusy(false); }
  };

  // Shared by both the invited "Decline" button and the plain browse
  // "Decline" button — declining blocks re-applying/re-accepting until
  // explicitly undone (see POST /marketplace/:id/decline and :id/undecline).
  const declineMission = async () => {
    setBusy(true);
    try {
      await vapi.declineMission(task.id);
      setData(d => ({ ...d, task: { ...d.task, inviteId: null, myStatus: "declined" } }));
    } catch (e) {
      alert(e.message || t("vMissionDetails.failedToDeclineMission", null, "Failed to decline this mission"));
    } finally { setBusy(false); }
  };

  const undeclineMission = async () => {
    setBusy(true);
    try {
      await vapi.undeclineMission(task.id);
      setData(d => ({ ...d, task: { ...d.task, myStatus: null } }));
    } catch (e) {
      alert(e.message || t("vMissionDetails.failedToUndoDecline", null, "Failed to undo decline"));
    } finally { setBusy(false); }
  };

  const toggleSave = async () => {
    const next = !task.saved;
    setData(d => ({ ...d, task: { ...d.task, saved: next } }));
    try { await vapi.saveTask(task.id, next); } catch { /* best effort */ }
  };


  const submitReport = async () => {
    if (!reportReason.trim()) return;
    setReportBusy(true);
    try {
      await vapi.reportMission(task.id, reportReason.trim());
      setReportDone(true);
      setReportOpen(false);
    } catch { /* best effort */ } finally { setReportBusy(false); }
  };

  return (
    <div className="page" style={{ maxWidth: 920, margin: "0 auto" }}>
      <button className="btn btn-quiet rise" onClick={() => navigate("/validator")} style={{ marginBottom: 16, marginLeft: -8 }}><Icon name="arrowLeft" />{t("missions.allMissions", null, "All missions")}</button>

      {task.status !== "active" && task.status !== "live" && task.status !== "published" && (
        <div className="card rise" style={{ padding: "16px var(--pad-card)", marginBottom: 16, background: "var(--warning-weak)", color: "var(--warning)", border: "1px solid var(--warning)", display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="alertTriangle" size={20} />
          <div style={{ fontWeight: 600 }}>{t("missions.noLongerAccepting", null, "This mission is no longer accepting participants.")}</div>
        </div>
      )}

      <div className="card rise" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "26px var(--pad-card)", borderBottom: "var(--hairline) solid var(--border)",
          background: `linear-gradient(180deg, color-mix(in srgb, var(${vType.accentVar}) 8%, var(--panel)), var(--panel))` }}>
          <div className="row between wrap gap-4" style={{ alignItems: "flex-start" }}>
            <div className="row gap-3" style={{ alignItems: "flex-start" }}>
              <span style={{ width: 56, height: 56, borderRadius: 15, display: "grid", placeItems: "center", flex: "none", background: `var(${vType.accentVar})`, color: "#fff" }}><Icon name={vType.icon} size={28} /></span>
              <div>
                <div className="row gap-2 wrap" style={{ marginBottom: 7 }}>
                  <VTypeTag type={task.type} vtypes={vtypes} />
                  {cat && <span className="tag" style={{ background: "var(--panel-inset)", color: "var(--text-muted)" }}><Icon name={cat.icon} size={12} />{cat.label}</span>}
                  {task.hot && <span className="tag" style={{ background: "var(--warning-weak)", color: "var(--warning)" }}><Icon name="bolt" size={12} />{t("missions.highDemand", null, "High demand")}</span>}
                  <span className="tag" style={{ background: "var(--accent-weak)", color: "var(--accent)" }}><Icon name="target" size={12} />{task.match}% {t("missions.match", null, "match")}</span>
                </div>
                <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-.025em" }}>{task.product}</h2>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 15 }}>{headerMeta}</p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}><VReward amount={task.reward} type={task.rewardType} big />{rewardPaysOnApproval(task.rewardType) && <div className="faint" style={{ fontSize: 11 }}>{t("missions.onApproval", null, "on approval")}</div>}</div>
          </div>
        </div>

        {/* "Your match" dropped -- it's already the one match% shown, in the
            header pill, so repeating it here was the only actual duplicate.
            Requirements moved into this row's third column instead of
            sitting in its own section further down the page. */}
        {/* Requirements needs real room for three inline chips -- equal
            thirds left it wrapping onto its own extra line and made the
            whole card look taller than it needed to be. Participants/
            Deadline only ever hold one short line of text, so they don't
            need nearly as much width. */}
        <div style={{ display: "grid", gridTemplateColumns: "0.6fr 0.6fr 1.6fr", borderBottom: "var(--hairline) solid var(--border)" }}>
          {[
            // Filled-first, matching the builder side's own "Participants:
            // joined/target" convention -- "Slots left: 5/5" on a mission
            // nobody had joined read as full rather than empty, and the two
            // sides disagreeing on which side of the fraction "matters"
            // wasn't obvious until you actually compared them side by side.
            { ic: "users", l: t("missions.participants", null, "Participants"), v: `${task.spotsTotal - task.spotsLeft} / ${task.spotsTotal}` },
            { ic: "calendar", l: t("missions.deadline", null, "Deadline"), v: deadlineLabel(task.deadline) },
          ].map((x, i) => (
            <div key={i} style={{ padding: "16px var(--pad-card)", borderLeft: i ? "var(--hairline) solid var(--border)" : "none" }}>
              <div className="row gap-2 faint" style={{ fontSize: 11.5, marginBottom: 5 }}><Icon name={x.ic} size={13} />{x.l}</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{x.v}</div>
            </div>
          ))}
          <div style={{ padding: "16px var(--pad-card)", borderLeft: "var(--hairline) solid var(--border)" }}>
            <div className="row gap-2 faint" style={{ fontSize: 11.5, marginBottom: 7 }}><Icon name="fileText" size={13} />{t("missions.requirements", null, "Requirements")}</div>
            <div className="row gap-1 wrap">
              <span className="pill" style={{ padding: "4px 9px", fontSize: 11.5 }}><Icon name="shield" size={12} />{t("missions.verifiedProfile", null, "Verified profile")}</span>
              <span className="pill" style={{ padding: "4px 9px", fontSize: 11.5 }}><Icon name="cpu" size={12} />{rubric.label} {t("missions.expertise", null, "expertise")}</span>
              <span className="pill" style={{ padding: "4px 9px", fontSize: 11.5 }}><Icon name="star" size={12} />4.0+ {t("missions.rating", null, "rating")}</span>
            </div>
          </div>
        </div>

        <div style={{ padding: "var(--pad-card)" }}>
          <div className="eyebrow" style={{ marginBottom: 9 }}>{t("missions.aboutThisMission", null, "About this mission")}</div>
          <p style={{ margin: "0 0 22px", fontSize: 15, lineHeight: 1.6, overflowWrap: "anywhere", wordBreak: "break-word" }}>{task.brief}</p>
          {/* Tinted so the two panels read as distinct blocks instead of one
              continuous section -- blue for the task list, warm/cream for
              the grading criteria. Mission-format details (Feedback Format,
              question count) moved up into the header metadata line, so the
              old "Mission requirements" sub-block here was dropped as a
              duplicate; same for the Requirements chips, now in the stats
              row above instead of repeated in this panel too. */}
          <div className="m2" style={{ gap: 22 }}>
            <div style={{ background: "var(--accent-weak)", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius: "var(--radius)", padding: 22 }}>
              <div className="eyebrow" style={{ marginBottom: 11 }}>{t("missions.whatYoullDo", null, "What you'll do")}</div>
              <div style={{ display: "grid", gap: 9 }}>
                {task.steps.map((s, i) => (
                  <div key={i} className="row gap-3" style={{ alignItems: "flex-start" }}>
                    <span className="mono" style={{ width: 22, height: 22, flex: "none", borderRadius: 6, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, background: "var(--panel)", color: "var(--accent)" }}>{i + 1}</span>
                    <span style={{ fontSize: 14, overflowWrap: "anywhere", wordBreak: "break-word" }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: "var(--warning-weak)", border: "1px solid color-mix(in srgb, var(--warning) 25%, transparent)", borderRadius: "var(--radius)", padding: 22 }}>
              <div className="eyebrow" style={{ marginBottom: 11 }}>{t("missions.gradedOn", null, "What you'll be graded on")}</div>
              <div style={{ display: "grid", gap: 8 }}>
                {rubric.rubric.map(d => (
                  <div key={d.id} className="row gap-2" style={{ fontSize: 13.5 }}>
                    <Icon name="check" size={15} style={{ color: "var(--success)", flex: "none", marginTop: 2 }} />
                    <span><b style={{ fontWeight: 700 }}>{d.label}</b> <span className="faint">— {d.help}</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {task.myStatus === "declined" ? (
        <div className="row gap-3 wrap rise-2" style={{ position: "sticky", bottom: 0, marginTop: 18, padding: "14px 16px", alignItems: "center",
          background: "color-mix(in srgb, var(--bg) 88%, transparent)", backdropFilter: "blur(12px)",
          border: "var(--hairline) solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)" }}>
          <Icon name="x" size={16} style={{ color: "var(--text-muted)" }} />
          <span className="muted" style={{ fontSize: 13.5 }}>{t("vMissionDetails.youDeclinedThisMission", null, "You declined this mission — you can't apply or get invited to it again unless you undo that.")}</span>
          <span className="grow" />
          <button className="btn btn-ghost" disabled={busy} onClick={undeclineMission}>{busy ? t("actions.undoing", null, "Undoing…") : t("actions.undoDecline", null, "Undo decline")}</button>
        </div>
      ) : (
      <div className="row gap-3 wrap rise-2" style={{ position: "sticky", bottom: 0, marginTop: 18, padding: "14px 16px",
        background: "color-mix(in srgb, var(--bg) 88%, transparent)", backdropFilter: "blur(12px)",
        border: "var(--hairline) solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)" }}>
        <button className="btn btn-ghost" onClick={toggleSave}
          title={task.spotsLeft <= 0 && !accepted && task.myStatus !== "applied" && task.myStatus !== "not_selected" && !task.saved ? t("actions.notifyMe", null, "Notify me if a slot opens") : (task.saved ? t("actions.saved", null, "Saved") : t("actions.save", null, "Save"))}>
          {task.spotsLeft <= 0 && !accepted && task.myStatus !== "applied" && task.myStatus !== "not_selected" && !task.saved ? <>🔔 {t("actions.notifyMe", null, "Notify me if a slot opens")}</> : <Icon name="bookmark" style={{ fill: task.saved ? "currentColor" : "none" }} />}
        </button>
        {!task.inviteId && !accepted && task.myStatus !== "not_selected" && (
          <button className="btn btn-quiet" disabled={busy} onClick={declineMission} style={{ color: "var(--danger)" }}>
            {task.myStatus === "applied" ? t("actions.withdrawApplication", null, "Withdraw application") : t("actions.decline", null, "Decline")}
          </button>
        )}
        {!reportDone
          ? <button className="btn btn-quiet" style={{ color: "var(--text-faint)", fontSize: 12.5 }} onClick={() => setReportOpen(o => !o)}>
              <Icon name="flag" size={14} />{t("actions.reportMission", null, "Report Mission")}
            </button>
          : <span className="faint" style={{ fontSize: 12.5 }}><Icon name="checkCircle" size={13} /> {t("actions.reported", null, "Reported — admin will review")}</span>
        }
        <span className="grow" />

        {task.inviteId ? (
          <div className="row gap-2">
            <button className="btn btn-ghost" disabled={busy} onClick={declineMission} style={{ color: "var(--danger)" }}>{t("actions.decline", null, "Decline")}</button>
            <button className="btn btn-primary btn-lg" disabled={busy || task.spotsLeft <= 0} onClick={task.spotsLeft <= 0 ? undefined : acceptInvite}>
              <Icon name="userplus" />
              {busy ? t("actions.accepting", null, "Accepting…") : task.spotsLeft <= 0 ? t("missions.slotsFilled", null, "Slots Filled") : t("actions.acceptInvitation", null, "Accept Invitation")}
            </button>
          </div>
        ) : task.myStatus === "applied" ? (
          // A "require approval" mission's open application — genuinely
          // nothing to do or see yet (no submission, no reason), so unlike
          // every other myStatus branch below this isn't a button into the
          // workspace. It used to be lumped in with "active" here, which
          // would've let a not-yet-accepted applicant straight into the
          // workspace the moment that status became reachable.
          <span className="pill" style={{ fontSize: 13, padding: "10px 16px", color: "var(--warning)" }}><Icon name="clock" size={14} />{t("missions.awaitingBuilderReview", null, "Awaiting builder review")}</span>
        ) : task.myStatus === "not_selected" ? (
          <span className="pill" style={{ fontSize: 13, padding: "10px 16px", color: "var(--text-faint)" }}><Icon name="x" size={14} />{t("missions.notSelectedThisTime", null, "Not selected this time")}</span>
        ) : task.myStatus === "completed" || task.myStatus === "submitted" || task.myStatus === "active" || task.myStatus === "rejected" ? (
          <button className="btn btn-primary btn-lg" onClick={() => {
              const inProgress = task.myStatus === "active";
              const dest = task.myStatus === "completed" ? "results"
                : (task.ptype === "trial" && inProgress) ? "checkin"
                : (task.category === "sample" && inProgress) ? "shipment"
                : (task.ptype === "interview" && inProgress) ? "schedule"
                : (task.ptype === "focus" && inProgress) ? "poll"
                // Marketplace listings (vtasks) have no multi-task workspace shape —
                // route them to the rubric-based review form instead (BUG-028).
                : (task.src === "vtask" && inProgress) ? "rate"
                : "workspace";
              navigate(`/validator/missions/${task.id}/${dest}`);
            }} style={{
              background: task.myStatus === "completed" ? "var(--warning)" : task.myStatus === "submitted" ? "var(--accent)" : task.myStatus === "active" ? "var(--success)" : task.myStatus === "rejected" ? "var(--danger)" : undefined,
              borderColor: task.myStatus === "completed" ? "var(--warning)" : task.myStatus === "submitted" ? "var(--accent)" : task.myStatus === "active" ? "var(--success)" : task.myStatus === "rejected" ? "var(--danger)" : undefined,
              opacity: task.myStatus === "rejected" ? 0.8 : 1
            }}><Icon name={task.myStatus === "completed" ? "award" : task.myStatus === "rejected" ? "xCircle" : "check"} /> {task.myStatus === "completed" ? t("actions.viewResults", null, "View results") : task.myStatus === "submitted" ? t("actions.viewSubmission", null, "View submission") : task.myStatus === "active" ? t("actions.acceptedStartNow", null, "Accepted · Start now") : t("actions.viewReason", null, "View reason")}</button>
        ) : (
          <button className="btn btn-primary btn-lg" disabled={busy || task.spotsLeft <= 0 || (task.status !== "active" && task.status !== "live" && task.status !== "published")} onClick={task.spotsLeft <= 0 || (task.status !== "active" && task.status !== "live" && task.status !== "published") ? undefined : apply}>
            {busy ? t("actions.applying", null, "Applying…") : (task.status !== "active" && task.status !== "live" && task.status !== "published") ? t("missions.missionClosed", null, "Mission Closed") : task.spotsLeft <= 0 ? t("missions.outOfSlots", null, "Out of slots") : t("actions.applyToMission", null, "Apply to this mission")} {task.spotsLeft > 0 && (task.status === "active" || task.status === "live" || task.status === "published") && <Icon name="arrowRight" />}
          </button>
        )}
      </div>
      )}

      {reportOpen && (
        <div ref={reportFormRef} className="card rise" style={{ padding: 16, marginTop: 12, border: "1px solid var(--border-strong)" }}>
          <b style={{ fontSize: 13.5 }}>{t("support.reportMission", null, "Report this mission")}</b>
          <p className="faint" style={{ fontSize: 12.5, margin: "4px 0 10px" }}>{t("support.reportDesc", null, "Tell us what's wrong — our admin team will review it promptly.")}</p>
          <textarea className="fin" rows={3} placeholder={t("support.reportPlaceholder", null, "e.g. Misleading description, inappropriate content, suspicious payout…")}
            value={reportReason} onChange={e => setReportReason(e.target.value)}
            style={{ width: "100%", resize: "vertical", fontSize: 13 }} />
          <div className="row gap-2" style={{ marginTop: 10 }}>
            <button className="btn btn-ghost" onClick={() => setReportOpen(false)}>{t("actions.cancel", null, "Cancel")}</button>
            <button className="btn btn-primary" disabled={reportBusy || !reportReason.trim()} onClick={submitReport}>
              {reportBusy ? t("actions.submitting", null, "Submitting…") : t("actions.submitReport", null, "Submit report")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
