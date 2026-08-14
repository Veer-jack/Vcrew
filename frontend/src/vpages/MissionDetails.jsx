import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Icon from "../components/Icon";
import { VReward, VTypeTag } from "../vcomponents/vui";
import { useVMeta } from "../vcontext/VMetaContext";
import { vapi } from "../vapi/client";
import { deadlineLabel } from "../vutil";
import { useTranslation } from "../i18n/index.jsx";

export default function MissionDetails() {
  const { t, dataVersion } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { vtypes, ptypes } = useVMeta();
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
  const spotPct = (task.spotsLeft / task.spotsTotal) * 100;
  const accepted = task.myStatus === "active" || task.myStatus === "submitted" || task.myStatus === "completed";

  const apply = async () => {
    setBusy(true);
    try {
      await vapi.applyTask(task.id);
      setData(d => ({ ...d, task: { ...d.task, myStatus: "active" } }));
    } finally { setBusy(false); }
  };

  const acceptInvite = async () => {
    setBusy(true);
    try {
      await vapi.post(`/missions/invitations/${task.inviteId}/accept`);
      setData(d => ({ ...d, task: { ...d.task, myStatus: "active", inviteId: null } }));
    } catch (e) {
      alert(e.message || t("vMissionDetails.failedToAcceptInvite", null, "Failed to accept invite"));
      // refresh task to get updated slots
      vapi.task(id).then(setData);
    } finally { setBusy(false); }
  };

  const declineInvite = async () => {
    try {
      await vapi.post(`/missions/invitations/${task.inviteId}/decline`);
      setData(d => ({ ...d, task: { ...d.task, inviteId: null } }));
      navigate("/validator");
    } catch (e) {
      alert(e.message || t("vMissionDetails.failedToDeclineInvite", null, "Failed to decline invite"));
    }
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
                  {task.hot && <span className="tag" style={{ background: "var(--warning-weak)", color: "var(--warning)" }}><Icon name="bolt" size={12} />{t("missions.highDemand", null, "High demand")}</span>}
                  <span className="tag" style={{ background: "var(--accent-weak)", color: "var(--accent)" }}><Icon name="target" size={12} />{task.match}% {t("missions.match", null, "match")}</span>
                </div>
                <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-.025em" }}>{task.product}</h2>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 15 }}>{task.tagline} · {task.company}</p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}><VReward amount={task.reward} big /><div className="faint" style={{ fontSize: 11 }}>{t("missions.onApproval", null, "on approval")}</div></div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderBottom: "var(--hairline) solid var(--border)" }}>
          {[
            { ic: "clock", l: t("missions.time", null, "Time"), v: `~${task.minutes} min` },
            { ic: "users", l: t("missions.spotsLeft", null, "Spots left"), v: `${task.spotsLeft} / ${task.spotsTotal}` },
            { ic: "calendar", l: t("missions.deadline", null, "Deadline"), v: deadlineLabel(task.deadline) },
            { ic: "target", l: t("missions.yourMatch", null, "Your match"), v: `${task.match}%` },
          ].map((x, i) => (
            <div key={i} style={{ padding: "16px var(--pad-card)", borderLeft: i ? "var(--hairline) solid var(--border)" : "none" }}>
              <div className="row gap-2 faint" style={{ fontSize: 11.5, marginBottom: 5 }}><Icon name={x.ic} size={13} />{x.l}</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{x.v}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: "var(--pad-card)" }}>
          <div className="eyebrow" style={{ marginBottom: 9 }}>{t("missions.aboutThisMission", null, "About this mission")}</div>
          <p style={{ margin: "0 0 22px", fontSize: 15, lineHeight: 1.6 }}>{task.brief}</p>
          <div className="m2" style={{ gap: 22 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 11 }}>{t("missions.whatYoullDo", null, "What you'll do")}</div>
              <div style={{ display: "grid", gap: 9 }}>
                {task.steps.map((s, i) => (
                  <div key={i} className="row gap-3" style={{ alignItems: "flex-start" }}>
                    <span className="mono" style={{ width: 22, height: 22, flex: "none", borderRadius: 6, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, background: "var(--accent-weak)", color: "var(--accent)" }}>{i + 1}</span>
                    <span style={{ fontSize: 14 }}>{s}</span>
                  </div>
                ))}
              </div>
              {task.ptype && ptypes && ptypes.find(p => p.id === task.ptype) && (() => {
                const pt = ptypes.find(p => p.id === task.ptype);
                return (
                  <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
                    <h3 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 800 }}>{t("missions.missionRequirements", null, "Mission requirements")}</h3>
                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14.5, color: "var(--text)", lineHeight: 1.6 }}>
                      <li>{t("missions.feedbackFormat", null, "Feedback Format:")} {pt.label}</li>
                      <li>{t("missions.estimatedTime", null, "Estimated time:")} {pt.est}</li>
                    </ul>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", paddingLeft: 23, marginTop: 10 }}>{pt.desc}</div>
                  </div>
                );
              })()}
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 11 }}>{t("missions.gradedOn", null, "What you'll be graded on")}</div>
              <div style={{ display: "grid", gap: 8 }}>
                {rubric.rubric.map(d => (
                  <div key={d.id} className="row gap-2" style={{ fontSize: 13.5 }}>
                    <Icon name="check" size={15} style={{ color: "var(--success)", flex: "none", marginTop: 2 }} />
                    <span><b style={{ fontWeight: 700 }}>{d.label}</b> <span className="faint">— {d.help}</span></span>
                  </div>
                ))}
              </div>
              <div className="eyebrow" style={{ margin: "20px 0 11px" }}>{t("missions.requirements", null, "Requirements")}</div>
              <div className="row gap-2 wrap">
                <span className="pill"><Icon name="shield" size={13} />{t("missions.verifiedProfile", null, "Verified profile")}</span>
                <span className="pill"><Icon name="cpu" size={13} />{rubric.label} {t("missions.expertise", null, "expertise")}</span>
                <span className="pill"><Icon name="star" size={13} />4.0+ {t("missions.rating", null, "rating")}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "0 var(--pad-card) var(--pad-card)" }}>
          <div className="row between" style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 6 }}>
            <span>{task.spotsLeft} of {task.spotsTotal} {t("missions.spotsRemaining", null, "spots remaining")}</span>
            <span className="mono" style={{ color: spotPct < 25 ? "var(--danger)" : "inherit" }}>{Math.round(100 - spotPct)}% {t("missions.filled", null, "filled")}</span>
          </div>
          <div className="lvl-meter"><i style={{ width: (100 - spotPct) + "%", background: spotPct < 25 ? "var(--danger)" : undefined }} /></div>
        </div>
      </div>

      <div className="row gap-3 wrap rise-2" style={{ position: "sticky", bottom: 0, marginTop: 18, padding: "14px 16px",
        background: "color-mix(in srgb, var(--bg) 88%, transparent)", backdropFilter: "blur(12px)",
        border: "var(--hairline) solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)" }}>
        <button className="btn btn-ghost" onClick={toggleSave}>
          {task.spotsLeft <= 0 && !accepted && !task.saved ? <>🔔 {t("actions.notifyMe", null, "Notify me if a slot opens")}</> : <><Icon name="bookmark" style={{ fill: task.saved ? "currentColor" : "none" }} />{task.saved ? t("actions.saved", null, "Saved") : t("actions.save", null, "Save")}</>}
        </button>
        {!task.inviteId && (
          <button className="btn btn-quiet" onClick={() => navigate("/validator")}>{t("actions.decline", null, "Decline")}</button>
        )}
        {!reportDone
          ? <button className="btn btn-quiet" style={{ color: "var(--text-faint)", fontSize: 12.5 }} onClick={() => setReportOpen(o => !o)}>
              <Icon name="flag" size={14} />{t("actions.reportMission", null, "Report Mission")}
            </button>
          : <span className="faint" style={{ fontSize: 12.5 }}><Icon name="checkCircle" size={13} /> {t("actions.reported", null, "Reported — admin will review")}</span>
        }
        <span className="grow" />
        <span className="muted" style={{ fontSize: 13, alignSelf: "center" }}>{t("missions.earn", null, "Earn")} <b style={{ color: "var(--success)" }}>₹{task.reward}</b> {t("missions.onApproval", null, "on approval")}</span>
        
        {task.inviteId ? (
          <div className="row gap-2">
            <button className="btn btn-ghost" disabled={busy} onClick={declineInvite} style={{ color: "var(--danger)" }}>{t("actions.decline", null, "Decline")}</button>
            <button className="btn btn-primary btn-lg" disabled={busy || task.spotsLeft <= 0} onClick={task.spotsLeft <= 0 ? undefined : acceptInvite}>
              <Icon name="userplus" />
              {busy ? t("actions.accepting", null, "Accepting…") : task.spotsLeft <= 0 ? t("missions.slotsFilled", null, "Slots Filled") : t("actions.acceptInvitation", null, "Accept Invitation")}
            </button>
          </div>
        ) : task.myStatus === "completed" || task.myStatus === "submitted" || task.myStatus === "active" || task.myStatus === "rejected" || task.myStatus === "applied" ? (
          <button className="btn btn-primary btn-lg" onClick={() => {
              const inProgress = task.myStatus === "active" || task.myStatus === "applied";
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
              background: task.myStatus === "completed" ? "var(--warning)" : task.myStatus === "submitted" ? "var(--accent)" : (task.myStatus === "active" || task.myStatus === "applied") ? "var(--success)" : task.myStatus === "rejected" ? "var(--danger)" : undefined,
              borderColor: task.myStatus === "completed" ? "var(--warning)" : task.myStatus === "submitted" ? "var(--accent)" : (task.myStatus === "active" || task.myStatus === "applied") ? "var(--success)" : task.myStatus === "rejected" ? "var(--danger)" : undefined,
              opacity: task.myStatus === "rejected" ? 0.8 : 1
            }}><Icon name={task.myStatus === "completed" ? "award" : task.myStatus === "rejected" ? "xCircle" : "check"} /> {task.myStatus === "completed" ? t("actions.viewResults", null, "View results") : task.myStatus === "submitted" ? t("actions.viewSubmission", null, "View submission") : (task.myStatus === "active" || task.myStatus === "applied") ? t("actions.acceptedStartNow", null, "Accepted · Start now") : t("actions.viewReason", null, "View reason")}</button>
        ) : (
          <button className="btn btn-primary btn-lg" disabled={busy || task.spotsLeft <= 0 || (task.status !== "active" && task.status !== "live" && task.status !== "published")} onClick={task.spotsLeft <= 0 || (task.status !== "active" && task.status !== "live" && task.status !== "published") ? undefined : apply}>
            {busy ? t("actions.applying", null, "Applying…") : (task.status !== "active" && task.status !== "live" && task.status !== "published") ? t("missions.missionClosed", null, "Mission Closed") : task.spotsLeft <= 0 ? t("missions.outOfSlots", null, "Out of slots") : t("actions.applyToMission", null, "Apply to this mission")} {task.spotsLeft > 0 && (task.status === "active" || task.status === "live" || task.status === "published") && <Icon name="arrowRight" />}
          </button>
        )}
      </div>

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
