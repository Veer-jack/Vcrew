import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Icon from "../components/Icon";
import { Avatar, Btn, Donut, KpiCard, MissionLogo, StatusTag, Stars, TypeTag, UpdatingBadge, inr, inrK } from "../components/ui";
import { useMeta } from "../context/MetaContext";
import { api } from "../api/client";
import { InviteValidatorModal } from "../components/InviteValidatorModal";
import { Modal } from "../components/Modal";
import { STAGES, FILE_KIND } from "../constants";
import { exportCSV } from "../exportUtils";
import { useTranslation } from "../i18n/index.jsx";
import { trFilterLabel } from "../data/audienceFilterLabels";

function timeAgo(t, dateString) {
  if (!dateString) return t("missionDetail.recently", null, "recently");
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);

  let interval = seconds / 31536000;
  if (interval >= 1) { const n = Math.floor(interval); return n + ' ' + (n === 1 ? t("missionDetail.timeUnit.year", null, "year") : t("missionDetail.timeUnit.years", null, "years")); }
  interval = seconds / 2592000;
  if (interval >= 1) { const n = Math.floor(interval); return n + ' ' + (n === 1 ? t("missionDetail.timeUnit.month", null, "month") : t("missionDetail.timeUnit.months", null, "months")); }
  interval = seconds / 604800;
  if (interval >= 1) { const n = Math.floor(interval); return n + ' ' + (n === 1 ? t("missionDetail.timeUnit.week", null, "week") : t("missionDetail.timeUnit.weeks", null, "weeks")); }
  interval = seconds / 86400;
  if (interval >= 1) { const n = Math.floor(interval); return n + ' ' + (n === 1 ? t("missionDetail.timeUnit.day", null, "day") : t("missionDetail.timeUnit.days", null, "days")); }
  interval = seconds / 3600;
  if (interval >= 1) { const n = Math.floor(interval); return n + ' ' + (n === 1 ? t("missionDetail.timeUnit.hour", null, "hour") : t("missionDetail.timeUnit.hours", null, "hours")); }
  interval = seconds / 60;
  if (interval >= 1) { const n = Math.floor(interval); return n + ' ' + (n === 1 ? t("missionDetail.timeUnit.minute", null, "minute") : t("missionDetail.timeUnit.minutes", null, "minutes")); }

  if (seconds < 10) return t("missionDetail.justNow", null, "just now");
  return Math.floor(seconds) + ' ' + t("missionDetail.timeUnit.seconds", null, "seconds");
}

// "Joined X ago" / "Joined just now" / "Joined <time_label>" composed from timeAgo() above
function joinedLabel(t, p) {
  if (!p.joined_at) return t("missionDetail.joinedTime", { time: p.time_label || t("missionDetail.recently", null, "recently") }, "Joined {{time}}");
  const ago = timeAgo(t, p.joined_at);
  return ago === t("missionDetail.justNow", null, "just now")
    ? t("missionDetail.joinedTime", { time: ago }, "Joined {{time}}")
    : t("missionDetail.joinedTimeAgo", { time: ago }, "Joined {{time}} ago");
}

const TABS = [
  { k: "overview", lk: "missionDetail.tabs.overview", l: "Overview", ic: "target" },
  { k: "audience", lk: "missionDetail.tabs.audience", l: "Audience", ic: "compass" },
  { k: "participants", lk: "missionDetail.tabs.participants", l: "Participants", ic: "users" },
  { k: "responses", lk: "missionDetail.tabs.responses", l: "Responses", ic: "message" },
  { k: "files", lk: "missionDetail.tabs.files", l: "Files", ic: "fileText" },
  { k: "payments", lk: "missionDetail.tabs.payments", l: "Payments", ic: "wallet" },
];

function MissionOverview({ mission, participants, setTab, navigate }) {
  const { t } = useTranslation();
  const pipeline = STAGES.map(s => ({ ...s, n: participants.filter(p => p.stage === s.id).length }));
  const maxN = Math.max(...pipeline.map(p => p.n), 1);
  return (
    <div className="split rise">
      <div className="col gap-5">
        <div className="card" style={{ padding: 20 }}>
          <span className="eyebrow">{t("missionDetail.theBrief", null, "The brief")}</span>
          <p style={{ fontSize: 15, lineHeight: 1.65, margin: "10px 0 0" }}>{mission.description || t("missionDetail.noDescription", null, "No description provided yet.")}</p>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="sec-head"><h3 className="h-md">{t("missionDetail.participantPipeline", null, "Participant pipeline")}</h3><Btn variant="quiet" size="sm" iconRight="arrowRight" onClick={() => setTab("participants")}>{t("actions.openBoard", null, "Open board")}</Btn></div>
          <div className="col gap-3" style={{ marginTop: 6 }}>
            {pipeline.map(s => <div className="geo-row" key={s.id}><span className="gn">{s.label}</span><span className="gbar"><i style={{ width: (s.n / maxN) * 100 + "%", background: s.color }} /></span><span className="gv">{s.n}</span></div>)}
          </div>
        </div>
      </div>
      <div className="sticky-side col gap-4">
        <div className="card" style={{ padding: 18 }}>
          <span className="eyebrow">{t("missionDetail.progress", null, "Progress")}</span>
          <div className="row gap-3" style={{ alignItems: "center", margin: "12px 0" }}>
            <div className="ring" style={{ "--p": mission.completion, width: 64, height: 64 }}><span style={{ width: 52, height: 52, fontSize: 15 }}>{mission.completion}<i>%</i></span></div>
            <div><div style={{ fontWeight: 700, fontSize: 14 }}>{mission.participants.submitted} of {mission.participants.target}</div><div className="faint" style={{ fontSize: 12 }}>{t("missionDetail.submissionsIn", null, "submissions in")}</div></div>
          </div>
          <div className="est-row"><span className="lab">{t("missionDetail.rewardEach", null, "Reward each")}</span><span className="v">{mission.reward.type === "sample" ? t("reward.sample", null, "Sample") : mission.reward.type === "free" ? t("reward.free", null, "Free") : inr(mission.reward.amount)}</span></div>
          <div className="est-row"><span className="lab">{t("missionDetail.avgRating", null, "Avg rating")}</span><span className="v">{mission.rating || "—"} ★</span></div>
          <div className="est-row"><span className="lab">{t("missionDetail.spendToDate", null, "Spend to date")}</span><span className="v">{inr(mission.spend)}</span></div>
        </div>
        <Btn variant="primary" block icon="message" onClick={() => navigate(`/missions/${mission.id}/submissions`)}>{t("actions.reviewSubmissions", null, "Review submissions")}</Btn>
      </div>
    </div>
  );
}
function Toast({ message, type, onClose }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!message) {
      setTimeout(() => setExiting(false), 0);
      return;
    }

    const mountTime = Date.now();

    const startExit = () => {
      setExiting(true);
      setTimeout(onClose, 300);
    };

    // Auto-dismiss after 1.5 seconds
    const autoTimer = setTimeout(startExit, 1500);

    // Close on clicking anywhere, but only if it's been visible for at least 800ms
    // so accidental clicks while dropping don't instantly hide it before they can read it.
    const handleGlobalClick = () => {
      if (Date.now() - mountTime > 800 && !exiting) {
        startExit();
      }
    };

    document.addEventListener("mousedown", handleGlobalClick);
    return () => {
      clearTimeout(autoTimer);
      document.removeEventListener("mousedown", handleGlobalClick);
    };
  }, [message, onClose, exiting]);

  if (!message) return null;
  const colors = { success: "var(--success)", error: "var(--danger)", warning: "var(--warning)" };
  const icons = { success: "checkCircle", error: "alertTriangle", warning: "edit" };

  return createPortal(
    <div style={{
      position: "fixed", top: 80, right: 24, zIndex: 999999,
      background: "var(--bg)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", borderRadius: 8,
      padding: "14px 18px", display: "flex", alignItems: "center", gap: 12,
      borderLeft: `4px solid ${colors[type] || colors.success}`,
      maxWidth: 350,
      opacity: exiting ? 0 : 1,
      transform: exiting ? "translateY(-10px) scale(0.98)" : "translateY(0) scale(1)",
      transition: "opacity 0.3s ease, transform 0.3s ease",
    }}>
      <Icon name={icons[type] || "info"} size={20} style={{ color: colors[type] || colors.success }} />
      <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{message}</div>
      <button className="btn btn-ghost" style={{ padding: 4, margin: "-4px -4px -4px 4px" }} onClick={() => { setExiting(true); setTimeout(onClose, 300); }}><Icon name="x" size={14} /></button>
    </div>,
    document.body
  );
}

function ParticipantKanban({ mission, participants, setParticipants, onInvite, navigate, showToast }) {
  const { t } = useTranslation();
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);

  const move = async (id, stage) => {
    let prevStage;
    setParticipants(ps => ps.map(p => {
      if (p.id !== id) return p;
      prevStage = p.stage;
      return { ...p, stage };
    }));
    try {
      await api.moveParticipant(mission.id, id, stage);
    } catch {
      // Roll back the optimistic move — e.g. the backend rejected a stage it doesn't allow.
      setParticipants(ps => ps.map(p => p.id === id ? { ...p, stage: prevStage } : p));
    }
  };

  return (
    <div>
      <div className="row between" style={{ marginBottom: 14 }}>
        <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>{t("missionDetail.dragParticipants", null, "Drag participants across the pipeline.")} {participants.length} {t("missionDetail.totalInMission", null, "total in this mission.")}</p>
        <Btn variant="ghost" size="sm" icon="userplus" onClick={onInvite}>{t("actions.inviteMore", null, "Invite more")}</Btn>
      </div>
      <div className="kanban">
        {STAGES.map(st => {
          const col = participants.filter(p => p.stage === st.id);
          const droppable = st.id !== "rewarded" && st.id !== "rejected";
          return (
            <div key={st.id} className={`kcol ${over === st.id ? "dragover" : ""} ${drag && !droppable ? "kcol-locked" : ""}`}
              onDragOver={e => { e.preventDefault(); if (droppable) setOver(st.id); }}
              onDragLeave={() => setOver(o => o === st.id ? null : o)}
              onDrop={e => {
                e.preventDefault();
                if ((st.id === "rewarded" || st.id === "rejected") && drag != null) {
                  showToast(t("missionDetail.reviewToMoveThem", { stage: st.label.toLowerCase() }, "Please review their submission to move them to {{stage}}."), "error");
                } else if (droppable && drag != null) {
                  move(drag, st.id);
                }
                setOver(null);
                setDrag(null);
              }}
              style={drag && !droppable ? { cursor: "not-allowed" } : {}}>
              <div className="kcol-h">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="kdot" style={{ background: st.color }} />
                  <b>{st.label}</b>
                  {drag && !droppable && <Icon name="lock" size={13} style={{ color: "var(--warning)" }} title="Review submission to reward" />}
                </div>
                <span className="cnt">{col.length}</span>
              </div>
              <div className="kcol-body">
                {col.map(p => (
                  <div key={p.id} className={`kcard ${drag === p.id ? "dragging" : ""} ${(p.stage === "rewarded" || p.stage === "rejected") ? "kcard-locked" : ""}`} draggable={p.stage !== "rewarded" && p.stage !== "rejected"}
                    onDragStart={(e) => {
                      if (p.stage === "rewarded" || p.stage === "rejected") {
                        e.preventDefault();
                        return;
                      }
                      setDrag(p.id);
                    }}
                    onDragEnd={() => { setDrag(null); setOver(null); }}
                    style={(p.stage === "rewarded" || p.stage === "rejected") ? { cursor: "default", opacity: 0.85 } : {}}>
                    <div className="kcard-top">
                      <Avatar name={p.name} size={32} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="row between">
                          <div className="kn">{p.name}</div>
                        </div>
                        <div className="kl row gap-2" style={{ margin: "2px 0 0" }}>
                          {trFilterLabel(t, p.role)}
                          {st.id === "rewarded" && <span className="st st-completed" style={{ fontSize: 9, padding: "2px 6px" }}>{t("status.rewarded", null, "Rewarded")}</span>}
                          {st.id === "rejected" && <span style={{ fontSize: 9, padding: "2px 6px", background: "var(--danger, #ff4d4f)", color: "#fff", borderRadius: 12, fontWeight: 600 }}>{t("status.rejected", null, "Rejected")}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="kcard-foot" style={{ marginTop: 12 }}>
                      <div className="faint" style={{ fontSize: 10 }}>
                        <span style={{ color: "var(--warning)", fontWeight: 700, marginRight: 2 }}>★ {p.trust}</span><br />
                        {joinedLabel(t, p)}
                      </div>
                      <span className="kreward" style={{ fontSize: 13, color: "var(--text)" }}>{inr(p.reward || mission.reward.amount)}</span>
                    </div>
                  </div>
                ))}
                {col.length === 0 && (
                  <div className="empty-kcol">
                    <div className="ec-ic" style={{ color: st.color, background: `color-mix(in srgb, ${st.color} 10%, transparent)` }}>
                      <Icon name={st.id === "invited" ? "mail" : st.id === "accepted" ? "userCheck" : st.id === "started" ? "rocket" : (st.id === "rewarded" || st.id === "rejected") ? "lock" : "fileText"} size={20} />
                    </div>
                    <b>{st.id === "rewarded" ? t("missionDetail.reviewToReward", null, "Review to reward") : st.id === "rejected" ? t("missionDetail.noRejectedParticipants", null, "No rejected participants") : t("missionDetail.noParticipantsYet", null, "No participants yet")}</b>
                    <p>{st.id === "invited" ? t("missionDetail.emptyInvited", null, "Invite users to grow your pipeline.") : st.id === "accepted" ? t("missionDetail.emptyAccepted", null, "Participants who accept will appear here.") : st.id === "started" ? t("missionDetail.emptyStarted", null, "Participants who start will appear here.") : st.id === "rewarded" ? t("missionDetail.emptyRewarded", null, "Approve submissions to move participants here and pay them.") : st.id === "rejected" ? t("missionDetail.emptyRejected", null, "Participants whose submissions are rejected will appear here.") : t("missionDetail.emptySubmitted", null, "Submitted participants will appear here.")}</p>
                    {(st.id === "rewarded" || st.id === "rejected") && (
                      <Btn variant="quiet" size="sm" onClick={() => navigate(`/missions/${mission.id}/submissions`)} style={{ marginTop: 8 }}>{t("actions.reviewSubmissions", null, "Review submissions")}</Btn>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="faint" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginTop: 24, padding: "12px 16px", background: "var(--accent-weak)", borderRadius: "var(--radius)", color: "var(--accent)" }}>
        <div style={{ background: "var(--accent)", color: "#fff", borderRadius: "50%", padding: 4, display: 'flex' }}><Icon name="zap" size={12} /></div>
        <b>{t("missionDetail.tip", null, "Tip:")}</b> {t("missionDetail.dragAndDropTip", null, "Drag and drop participants between stages to update their progress.")}
        <a href="#" style={{ marginLeft: 'auto', fontWeight: 600, color: "var(--accent)" }}>{t("missionDetail.learnMorePipeline", null, "Learn more about participant pipeline")} <Icon name="externalLink" size={12} style={{ verticalAlign: -2 }} /></a>
      </div>
    </div>
  );
}

function ResponseCard({ r, missionId, onFlag, navigate }) {
  const { t } = useTranslation();
  const [replying, setReplying] = useState(false);
  const reply = async () => {
    setReplying(true);
    try {
      const { threadId } = await api.findOrCreateThread(r.validator_id, missionId);
      navigate(`/messages?thread=${threadId}`);
    } catch (err) {
      alert(err.message || t("missionDetail.couldntStartConversation", null, "Couldn't start conversation"));
    } finally {
      setReplying(false);
    }
  };
  return (
    <div className="resp-card" style={r.flagged ? { borderColor: "color-mix(in srgb, var(--danger) 40%, var(--border))" } : null}>
      <div className="resp-head">
        <Avatar name={r.name} size={42} />
        <div style={{ flex: 1 }}>
          <div className="row between">
            <div><div className="row gap-2"><b style={{ fontSize: 14.5 }}>{r.name}</b><span className="verif"><Icon name="checkCircle" size={13} /></span> {r.status === 'rejected' && <span style={{ fontSize: 11, padding: "2px 8px", background: "var(--danger, #ff4d4f)", color: "#fff", borderRadius: 12, fontWeight: 600, letterSpacing: "0.2px" }}>{t("status.rejected", null, "Rejected")}</span>}</div><div className="faint" style={{ fontSize: 12 }}>{trFilterLabel(t, r.role)} · {trFilterLabel(t, r.city)} · {r.time_label}</div></div>
            <div style={{ textAlign: "right" }}><Stars value={r.rating} /><div className="faint" style={{ fontSize: 11, marginTop: 2 }}>{t("metrics.trust", null, "Trust")} {r.trust}</div></div>
          </div>
        </div>
      </div>
      <p className="resp-quote">"{r.quote}"</p>
      <div className="row between wrap gap-3">
        <div className="row gap-2 wrap">{r.tags.map((t, j) => <span key={j} className="mtag">{t}</span>)}</div>
        {r.attachments.length > 0 && <div className="resp-attach">{r.attachments.map((a, j) => <div key={j} className="attach" style={{ padding: 0, overflow: "hidden", border: "1px solid var(--border)", borderRadius: 6, background: "var(--panel-inset)" }}><a href={`/api/uploads/${a}`} target="_blank" rel="noreferrer"><img src={`/api/uploads/${a}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} alt={t("missionDetail.proofAlt", null, "Proof")} /></a></div>)}</div>}
      </div>
      {r.flagged && <div className="row gap-2" style={{ marginTop: 12, color: "var(--danger)", fontSize: 12.5, fontWeight: 600 }}><Icon name="flag" size={14} /> {t("missionDetail.autoFlagged", null, "Auto-flagged: possible low-effort or broken-link report")}</div>}
      <div className="row gap-2" style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
        <Btn variant="primary" size="sm" icon="check" onClick={() => navigate(`/missions/${missionId}/submissions`)}>{t("actions.reviewSubmission", null, "Review submission")}</Btn>
        <Btn variant="ghost" size="sm" icon="message" disabled={replying} onClick={reply}>{replying ? t("actions.opening", null, "Opening…") : t("actions.reply", null, "Reply")}</Btn>
        <Btn variant={r.flagged ? "primary" : "quiet"} size="sm" icon="flag" onClick={() => onFlag(r, !r.flagged)}>{r.flagged ? t("actions.unflag", null, "Unflag") : t("actions.flag", null, "Flag")}</Btn>
      </div>
    </div>
  );
}

function ResponseReview({ missionId, responses, setResponses, navigate }) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [minR, setMinR] = useState(0);
  const rows = responses.filter(r => (!q || (r.name + r.quote).toLowerCase().includes(q.toLowerCase())) && r.rating >= minR);

  const onFlag = async (r, flagged) => {
    setResponses(rs => rs.map(x => x.id === r.id ? { ...x, flagged } : x));
    try { await api.flagResponse(missionId, r.id, flagged); } catch { /* best effort */ }
  };

  return (
    <div>
      <div className="toolbar">
        <div className="seg-search"><Icon name="search" size={16} /><input placeholder={t("missionDetail.searchResponses", null, "Search responses…")} value={q} onChange={e => setQ(e.target.value)} /></div>
        <div className="tabs">{[0, 3, 4, 5].map(r => <button key={r} className={minR === r ? "on" : ""} onClick={() => setMinR(r)}>{r === 0 ? t("status.all", null, "All") : <><Icon name="star" size={12} />{r}+</>}</button>)}</div>
        <span className="grow" />
        <Btn variant="ghost" size="sm" icon="download" onClick={() => exportCSV(
          "responses.csv",
          [t("missionDetail.thName", null, "Name"), t("missionDetail.thRole", null, "Role"), t("missionDetail.thCity", null, "City"), t("missionDetail.thRating", null, "Rating"), t("missionDetail.thTrust", null, "Trust"), t("missionDetail.thSubmitted", null, "Submitted"), t("missionDetail.thFlagged", null, "Flagged"), t("missionDetail.thQuote", null, "Quote")],
          rows.map(r => [r.name, r.role, r.city, r.rating, r.trust, r.time_label, r.flagged ? t("common.yes", null, "Yes") : t("common.no", null, "No"), r.quote])
        )}>{t("actions.export", null, "Export")}</Btn>
      </div>
      {rows.length === 0
        ? <div className="muted" style={{ padding: 24 }}>{t("missionDetail.noResponsesYet", null, "No responses yet for this mission.")}</div>
        : <div className="col gap-4">{rows.map(r => <ResponseCard key={r.id} r={r} missionId={missionId} onFlag={onFlag} navigate={navigate} />)}</div>}
    </div>
  );
}

function EditMissionModal({ mission, onClose, onSaved }) {
  const { t } = useTranslation();
  const [name, setName] = useState(mission.name || "");
  const [description, setDescription] = useState(mission.description || "");
  const [region, setRegion] = useState(mission.region || "");
  const [target, setTarget] = useState(mission.participants.target || 0);
  const [deadline, setDeadline] = useState(mission.deadline ? mission.deadline.slice(0, 10) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const todayStr = new Date().toISOString().slice(0, 10);
  const nameInvalid = !name.trim();
  const targetInvalid = !(Number(target) >= 1);
  const deadlineInvalid = deadline && deadline < todayStr;

  const save = async () => {
    setErr("");
    if (nameInvalid) { setShowErrors(true); return setErr(t("missionDetail.errNameRequired", null, "Name is required")); }
    if (targetInvalid) { setShowErrors(true); return setErr(t("missionDetail.errTargetMin", null, "Target participants must be at least 1")); }
    if (deadlineInvalid) { setShowErrors(true); return setErr(t("missionDetail.errDeadlinePast", null, "Deadline can't be in the past")); }
    setShowErrors(false);
    setBusy(true);
    try {
      const { mission: updated } = await api.updateMission(mission.id, { name, description, region, target: Number(target), deadline: deadline || null });
      onSaved(updated);
      onClose();
    } catch (e) {
      setErr(e.message || t("missionDetail.couldntSaveChanges", null, "Couldn't save changes"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={t("missionDetail.editMission", null, "Edit mission")} onClose={onClose} width={480}>
      <div className="col gap-3" style={{ padding: "0 20px 20px" }}>
        {err && <div className="err-banner">{err}</div>}
        <div className={`fld ${(showErrors || name) && nameInvalid ? "fld-invalid" : ""}`}><label>{t("missionDetail.nameLabel", null, "Name")} <span className="req-star" aria-hidden="true">*</span></label><input className="fin" value={name} onChange={e => setName(e.target.value)} /></div>
        <div className="fld"><label>{t("missionDetail.descLabel", null, "Description")}</label><textarea className="fin" rows={4} value={description} onChange={e => setDescription(e.target.value)} /></div>
        <div className="row gap-3">
          <div className="fld" style={{ flex: 1 }}><label>{t("missionDetail.regionLabel", null, "Region")}</label><input className="fin" value={region} onChange={e => setRegion(e.target.value)} /></div>
          <div className={`fld ${targetInvalid ? "fld-invalid" : ""}`} style={{ flex: 1 }}><label>{t("missionDetail.targetParticipantsLabel", null, "Target participants")} <span className="req-star" aria-hidden="true">*</span></label><input className="fin" type="number" min="1" value={target} onChange={e => setTarget(e.target.value)} /></div>
        </div>
        <div className={`fld ${deadlineInvalid ? "fld-invalid" : ""}`}>
          <label>{t("missionDetail.deadlineLabel", null, "Deadline")}</label>
          <input className="fin" type="date" min={todayStr} value={deadline} onChange={e => setDeadline(e.target.value)} />
          {deadlineInvalid && <p className="fhint" style={{ color: "var(--danger)" }}>{t("missionDetail.errDeadlinePast", null, "Deadline can't be in the past")}</p>}
        </div>
        <div className="row gap-2" style={{ justifyContent: "flex-end", marginTop: 8 }}>
          <Btn variant="quiet" onClick={onClose}>{t("actions.cancel", null, "Cancel")}</Btn>
          <Btn variant="primary" disabled={busy} onClick={save}>{busy ? t("actions.saving", null, "Saving…") : t("actions.saveChanges", null, "Save changes")}</Btn>
        </div>
      </div>
    </Modal>
  );
}

function EditAudienceModal({ mission, audience, onClose, onSaved }) {
  const { t } = useTranslation();
  const { filters } = useMeta();
  const [sel, setSel] = useState(() => Object.fromEntries(
    Object.keys(filters).map(g => [g, new Set(audience.defn.find(d => d.group === g)?.values || [])])
  ));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const toggle = (g, o) => setSel(p => { const s = new Set(p[g]); s.has(o) ? s.delete(o) : s.add(o); return { ...p, [g]: s }; });

  const save = async () => {
    setBusy(true); setErr("");
    try {
      const payload = Object.fromEntries(Object.entries(sel).map(([g, s]) => [g, [...s]]));
      await api.updateMission(mission.id, { audience: payload });
      onSaved(Object.entries(payload).filter(([, values]) => values.length).map(([group, values]) => ({ group, values })));
      onClose();
    } catch (e) {
      setErr(e.message || t("missionDetail.couldntSaveAudience", null, "Couldn't save audience"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={t("missionDetail.editAudience", null, "Edit audience")} onClose={onClose} width={560}>
      <div className="col gap-4" style={{ padding: "0 20px 16px", maxHeight: "55vh", overflowY: "auto" }}>
        {err && <div className="err-banner">{err}</div>}
        <p className="faint" style={{ fontSize: 12.5, margin: 0 }}>{t("missionDetail.changesOnlyAffect", null, "Changes only affect future matching and invites")} {t("missionDetail.unaffectedValidatorsNote", null, "— validators who already joined this mission are unaffected.")}</p>
        {Object.entries(filters).map(([g, opts]) => (
          <div key={g}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>{g}</div>
            <div className="row gap-2 wrap">
              {(Array.isArray(opts) ? opts : Object.values(opts).flat()).map(o => {
                const on = sel[g]?.has(o);
                return (
                  <button key={o} type="button" className={`fcheck ${on ? "on" : ""}`} onClick={() => toggle(g, o)}>
                    <span className="box">{on && <Icon name="check" size={11} />}</span>{o}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="row gap-2" style={{ justifyContent: "flex-end", padding: "0 20px 20px" }}>
        <Btn variant="quiet" onClick={onClose}>{t("actions.cancel", null, "Cancel")}</Btn>
        <Btn variant="primary" disabled={busy} onClick={save}>{busy ? t("actions.saving", null, "Saving…") : t("actions.saveAudience", null, "Save audience")}</Btn>
      </div>
    </Modal>
  );
}

function MissionAudienceTab({ audience, onEdit }) {
  const { t } = useTranslation();
  return (
    <div className="split rise">
      <div className="col gap-5">
        <div className="card" style={{ padding: 20 }}>
          <div className="sec-head"><h3 className="h-md">{t("missionDetail.audienceDef", null, "Audience definition")}</h3><Btn variant="ghost" size="sm" icon="edit" onClick={onEdit}>{t("actions.edit", null, "Edit")}</Btn></div>
          {audience.defn.length === 0
            ? <p className="muted" style={{ margin: "6px 0 0", fontSize: 14 }}>{t("missionDetail.noAudienceFilters", null, "No audience filters were set")} {t("missionDetail.openToAllEligibleNote", null, "for this mission — it's open to all eligible members.")}</p>
            : (
              <div className="col gap-3" style={{ marginTop: 6 }}>
                {audience.defn.map((d, i) => (
                  <div key={i} className="row gap-3" style={{ alignItems: "flex-start", paddingTop: i ? 12 : 0, borderTop: i ? "1px solid var(--border)" : "none" }}>
                    <span className="eyebrow" style={{ width: 140, flex: "none", paddingTop: 4 }}>{d.group}</span>
                    <div className="row gap-2 wrap">{d.values.map(v => <span key={v} className="mtag">{v}</span>)}</div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
      <div className="sticky-side col gap-4">
        <div className="reach">
          <div className="reach-top"><span className="r-ic"><Icon name="users" size={22} /></span><div><div className="r-num">{audience.matched.toLocaleString("en-IN")}</div><div className="r-lab">{t("missionDetail.membersMatch", null, "members match this audience")}</div></div></div>
          <div className="r-bar"><i style={{ width: Math.max(2, Math.min(100, Math.round((audience.invited / Math.max(audience.matched, 1)) * 100))) + "%" }} /></div>
          <div className="r-foot"><span>{audience.invited} {t("missionDetail.invited", null, "invited")}</span><span>{((audience.invited / Math.max(audience.matched, 1)) * 100).toFixed(2)}% {t("missionDetail.reach", null, "reach")}</span></div>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <span className="eyebrow" style={{ display: "block", marginBottom: 12 }}>{t("missionDetail.composition", null, "Composition")}</span>
          <Donut data={audience.segments} centerVal={audience.invited.toLocaleString("en-IN")} centerLabel={t("missionDetail.joined", null, "joined")} size={134} />
        </div>
      </div>
    </div>
  );
}

function FileCard({ f, onDelete }) {
  const { t } = useTranslation();
  const k = FILE_KIND[f.kind] || FILE_KIND.pdf;
  return (
    <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{
        height: 96, borderRadius: "var(--radius-sm)", border: "var(--hairline) solid var(--border)", display: "grid", placeItems: "center",
        background: f.kind === "image" ? "repeating-linear-gradient(45deg, var(--panel-inset), var(--panel-inset) 8px, var(--panel-2) 8px, var(--panel-2) 16px)" : "var(--panel-inset)", color: k.tc
      }}>
        <Icon name={k.icon} size={30} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
        <div className="faint" style={{ fontSize: 11.5 }}>{f.by} · {f.when}{f.size !== "—" ? " · " + f.size : ""}</div>
      </div>
      <div className="row gap-2">
        {f.filename && (
          <a href={`/api/uploads/${f.filename}`} download={f.name}
            className="btn btn-ghost" style={{ fontSize: 12, flex: 1, justifyContent: "center" }}>
            <Icon name="download" size={13} /> {t("actions.download", null, "Download")}
          </a>
        )}
        {onDelete && (
          <button className="btn btn-ghost" style={{ fontSize: 12, color: "var(--danger)" }}
            onClick={() => onDelete(f.filename)}>
            <Icon name="x" size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function MissionFilesTab({ missionId, files: initialFiles }) {
  const { t } = useTranslation();
  const [files, setFiles] = useState(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try {
      const res = await api.uploadMissionFile(missionId, file, "brief");
      setFiles(f => ({ ...f, brief: [...f.brief, { ...res.file, filename: res.file.filename }] }));
    } catch (err) {
      setError(err.message || t("missionDetail.uploadFailed", null, "Upload failed"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (filename) => {
    if (!filename) return;
    try {
      await api.deleteMissionFile(missionId, filename);
      setFiles(f => ({ ...f, brief: f.brief.filter(x => x.filename !== filename) }));
    } catch { /* best effort */ }
  };

  return (
    <div className="rise col gap-5">
      {error && <div className="err-banner">{error}</div>}
      <div>
        <div className="sec-head">
          <h3 className="h-md">{t("missionDetail.briefAssets", null, "Brief & assets")}</h3>
          <input ref={inputRef} type="file" style={{ display: "none" }} onChange={handleUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.jpg,.jpeg,.png,.gif,.webp" />
          <Btn variant="ghost" size="sm" icon="upload" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? t("actions.uploading", null, "Uploading…") : t("actions.upload", null, "Upload")}
          </Btn>
        </div>
        {files.brief.length === 0
          ? <div className="muted" style={{ padding: "12px 0" }}>{t("missionDetail.noBriefFiles", null, "No brief files uploaded yet.")}</div>
          : <div className="files-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            {files.brief.map((f, i) => <FileCard key={i} f={f} onDelete={handleDelete} />)}
          </div>}
      </div>
      <div>
        <div className="sec-head"><h3 className="h-md">{t("missionDetail.participantSubmissions", null, "Participant submissions")}</h3><span className="muted" style={{ fontSize: 12.5 }}>{files.submissions.length} {t("missionDetail.filesCount", null, "files")}</span></div>
        {files.submissions.length === 0
          ? <div className="muted" style={{ padding: "12px 0" }}>{t("missionDetail.noSubmissionsYet", null, "No submissions yet.")}</div>
          : <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {Object.entries(
                files.submissions.reduce((acc, f) => {
                  if (!acc[f.by]) acc[f.by] = [];
                  acc[f.by].push(f);
                  return acc;
                }, {})
              ).map(([validatorName, vFiles], idx) => (
                <div key={idx}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, borderBottom: "var(--hairline) solid var(--border)", paddingBottom: 8 }}>{validatorName}</h4>
                  <div className="files-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                    {vFiles.map((f, i) => <FileCard key={i} f={f} />)}
                  </div>
                </div>
              ))}
            </div>}
      </div>
    </div>
  );
}

function MissionPaymentsTab({ payments, navigate, missionId }) {
  const { t } = useTranslation();
  const STATUS = { paid: { l: t("status.paid", null, "Paid"), c: "st-active" }, review: { l: t("status.inReview", null, "In review"), c: "st-closed" } };
  return (
    <div className="split rise">
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>{t("metrics.participant", null, "Participant")}</th><th>{t("metrics.stage", null, "Stage")}</th><th>{t("metrics.status", null, "Status")}</th><th className="num">{t("metrics.reward", null, "Reward")}</th><th></th></tr></thead>
          <tbody>
            {payments.rows.length === 0 && <tr><td colSpan={5} className="muted" style={{ padding: 20 }}>{t("missionDetail.noSubsPayment", null, "No submissions awaiting payment yet.")}</td></tr>}
            {payments.rows.map((r, i) => {
              const st = STATUS[r.status];
              return (
                <tr key={i}>
                  <td><div className="t-name"><Avatar name={r.name} size={32} /><div>{r.name}</div></div></td>
                  <td><span className="mtag">{r.stage}</span></td>
                  <td><span className={`st ${st.c}`}><span className="d" />{st.l}</span></td>
                  <td className="num">{inr(r.amount)}</td>
                  <td>{r.status === "review" ? <Btn variant="ghost" size="sm" icon="eye" onClick={() => navigate(`/missions/${missionId}/submissions`)}>{t("actions.review", null, "Review")}</Btn> : <span className="verif"><Icon name="checkCircle" size={14} />{t("actions.done", null, "Done")}</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="sticky-side col gap-4">
        <div className="card" style={{ padding: 18 }}>
          <span className="eyebrow" style={{ display: "block", marginBottom: 12 }}>{t("missionDetail.budget", null, "Budget")}</span>
          <div className="est-row"><span className="lab">{t("missionDetail.heldInEscrow", null, "Held in escrow")}</span><span className="v">{inr(payments.held)}</span></div>
          <div className="est-row"><span className="lab">{t("status.released", null, "Released")}</span><span className="v" style={{ color: "var(--success)" }}>{inr(payments.released)}</span></div>
          <div className="est-row"><span className="lab">{t("status.pendingReview", null, "Pending review")}</span><span className="v" style={{ color: "var(--warning)" }}>{inr(payments.pending)}</span></div>
          <div className="est-total"><span>{t("missionDetail.refundable", null, "Refundable")}</span><span className="v">{inr(payments.refundable)}</span></div>
        </div>
        <p className="faint" style={{ fontSize: 12, margin: 0, textAlign: "center" }}>{t("missionDetail.escrowExplanation", null, "Approving a submission in Review pays the validator immediately. Unused reward slots are refunded when the mission closes.")}</p>
      </div>
    </div>
  );
}

function MissionShipmentsTab({ missionId }) {
  const { t } = useTranslation();
  const [shipments, setShipments] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [trackingInputs, setTrackingInputs] = useState({});

  useEffect(() => {
    api.missionShipments(missionId).then(d => setShipments(d.shipments)).catch(err => setError(err.message));
  }, [missionId]);

  if (error) return <div className="muted">{error}</div>;
  if (!shipments) return <div className="muted">{t("missionDetail.loadingShipments", null, "Loading shipments…")}</div>;
  if (shipments.length === 0) return <div className="muted">{t("missionDetail.noValidatorsAccepted", null, "No validators have accepted this mission yet.")}</div>;

  const markShipped = async (validatorId) => {
    setBusyId(validatorId);
    try {
      const input = trackingInputs[validatorId] || {};
      await api.markShipmentShipped(missionId, validatorId, { trackingNumber: input.trackingNumber || "", carrier: input.carrier || "" });
      setShipments(s => s.map(sh => sh.validatorId === validatorId ? { ...sh, status: "shipped", tracking_number: input.trackingNumber || null, carrier: input.carrier || null } : sh));
    } catch (err) {
      setError(err.message || t("missionDetail.couldntMarkShipped", null, "Couldn't mark as shipped"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="col gap-3 sec">
      {shipments.map(s => (
        <div key={s.validatorId} className="card" style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{s.name}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {[s.address.line1, s.address.line2, s.address.city, s.address.state, s.address.postalCode, s.address.country].filter(Boolean).join(", ") || t("missionDetail.noAddress", null, "No address on file")}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {s.status === "awaiting_shipment" ? (
              <>
                <input className="fin" style={{ width: 130 }} placeholder={t("missionDetail.carrier", null, "Carrier")} onChange={e => setTrackingInputs(t => ({ ...t, [s.validatorId]: { ...t[s.validatorId], carrier: e.target.value } }))} />
                <input className="fin" style={{ width: 150 }} placeholder={t("missionDetail.trackingNumber", null, "Tracking number")} onChange={e => setTrackingInputs(t => ({ ...t, [s.validatorId]: { ...t[s.validatorId], trackingNumber: e.target.value } }))} />
                <button className="btn btn-primary" disabled={busyId === s.validatorId} onClick={() => markShipped(s.validatorId)}>
                  {busyId === s.validatorId ? t("actions.saving", null, "Saving…") : t("actions.markAsShipped", null, "Mark as shipped")}
                </button>
              </>
            ) : (
              <span className="tag" style={{ background: s.status === "received" ? "var(--success-weak)" : "var(--accent-weak)", color: s.status === "received" ? "var(--success)" : "var(--accent)" }}>
                {s.status === "received" ? t("status.received", null, "Received") : t("status.shipped", null, "Shipped")}{s.tracking_number ? ` · ${s.tracking_number}` : ""}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function MissionInterviewsTab({ missionId }) {
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [proposeInputs, setProposeInputs] = useState({});

  useEffect(() => {
    api.missionSchedules(missionId).then(d => setSchedules(d.schedules)).catch(err => setError(err.message));
  }, [missionId]);

  if (error) return <div className="muted">{error}</div>;
  if (!schedules) return <div className="muted">{t("missionDetail.loadingSchedules", null, "Loading schedules…")}</div>;
  if (schedules.length === 0) return <div className="muted">{t("missionDetail.noValidatorsAccepted", null, "No validators have accepted this mission yet.")}</div>;

  const propose = async (validatorId) => {
    setBusyId(validatorId);
    try {
      const input = proposeInputs[validatorId] || {};
      if (!input.scheduledAt) throw new Error(t("missionDetail.pickDateTimeFirst", null, "Pick a date and time first"));
      await api.proposeInterviewTime(missionId, validatorId, { scheduledAt: input.scheduledAt, meetingLink: input.meetingLink || "" });
      setSchedules(s => s.map(sc => sc.validatorId === validatorId ? { ...sc, status: "proposed", scheduled_at: input.scheduledAt, meeting_link: input.meetingLink || null } : sc));
    } catch (err) {
      setError(err.message || t("missionDetail.couldntProposeTime", null, "Couldn't propose a time"));
    } finally {
      setBusyId(null);
    }
  };

  const complete = async (validatorId) => {
    setBusyId(validatorId);
    try {
      await api.markInterviewCompleted(missionId, validatorId);
      setSchedules(s => s.map(sc => sc.validatorId === validatorId ? { ...sc, status: "completed" } : sc));
    } catch (err) {
      setError(err.message || t("missionDetail.couldntMarkCompleted", null, "Couldn't mark as completed"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="col gap-3 sec">
      {schedules.map(s => (
        <div key={s.validatorId} className="card" style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{s.name}</div>
            {s.scheduled_at && <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{new Date(s.scheduled_at).toLocaleString()}{s.meeting_link ? ` · ${s.meeting_link}` : ""}</div>}
            {s.status === "declined" && s.notes && (
              <div style={{ marginTop: 10, padding: "8px 12px", borderLeft: "3px solid var(--warning)", background: "var(--warning-weak)", fontSize: 13 }}>
                <div style={{ color: "var(--warning)" }}><b>{t("missionDetail.reasonDeclined", null, "Reason declined:")}</b> {s.notes.reason}</div>
                {s.notes.timeRange && <div style={{ color: "var(--warning)", marginTop: 4 }}><b>{t("missionDetail.preferredTimeHint", null, "Preferred time hint:")}</b> {s.notes.timeRange}</div>}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {(!s.status || s.status === "declined") && (
              <>
                <input className="fin" type="datetime-local" style={{ width: 200 }} onChange={e => setProposeInputs(t => ({ ...t, [s.validatorId]: { ...t[s.validatorId], scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : "" } }))} />
                <input className="fin" style={{ width: 200 }} placeholder={t("missionDetail.meetingLink", null, "Meeting link")} onChange={e => setProposeInputs(t => ({ ...t, [s.validatorId]: { ...t[s.validatorId], meetingLink: e.target.value } }))} />
                <button className="btn btn-primary" disabled={busyId === s.validatorId} onClick={() => propose(s.validatorId)}>
                  {busyId === s.validatorId ? t("actions.saving", null, "Saving…") : s.status === "declined" ? t("actions.proposeNewTime", null, "Propose new time") : t("actions.proposeTime", null, "Propose time")}
                </button>
              </>
            )}
            {s.status === "proposed" && <span className="tag" style={{ background: "var(--accent-weak)", color: "var(--accent)" }}>{t("missionDetail.awaitingResponse", null, "Awaiting response")}</span>}
            {s.status === "accepted" && (
              <button className="btn btn-primary" disabled={busyId === s.validatorId} onClick={() => complete(s.validatorId)}>
                {busyId === s.validatorId ? t("actions.saving", null, "Saving…") : t("actions.markSessionCompleted", null, "Mark session completed")}
              </button>
            )}
            {s.status === "completed" && <span className="tag" style={{ background: "var(--success-weak)", color: "var(--success)" }}>{t("status.completed", null, "Completed")}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

  // --- MISSION FOCUS GROUP TAB ---
function MissionFocusGroupTab({ mission, missionId, onParticipantRemoved, showToast }) {
  const { t } = useTranslation();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [meetingLink, setMeetingLink] = useState("");
  const [slotInputs, setSlotInputs] = useState(["", "", "", ""]);
  const [expandedSlot, setExpandedSlot] = useState(null);

  const removeParticipant = async (validatorId) => {
    if (!window.confirm(t("missionDetail.confirmRemove", null, "Are you sure you want to remove this participant from the mission?"))) return;
    setBusy(true);
    try {
      await api.removeParticipant(missionId, validatorId);
      if (onParticipantRemoved) onParticipantRemoved(validatorId);
      if (showToast) showToast(t("missionDetail.participantRemoved", null, "Participant removed successfully!"));
      load();
    } catch (err) {
      setError(err.message || t("missionDetail.couldntRemoveParticipant", null, "Couldn't remove participant"));
    } finally {
      setBusy(false);
    }
  };
  const load = () => {
    api.missionPoll(missionId).then(d => { setPoll(d.poll); setLoading(false); }).catch(err => { setError(err.message); setLoading(false); });
  };
  useEffect(load, [missionId]);

  if (loading) return <div className="muted">{t("missionDetail.loadingPoll", null, "Loading focus group poll…")}</div>;
  if (error) return <div className="muted">{error}</div>;

  const createPoll = async () => {
    setBusy(true);
    setError("");
    try {
      const slots = slotInputs.filter(Boolean).map(s => new Date(s).toISOString());
      if (slots.length < 2) throw new Error(t("missionDetail.enterAtLeast2Times", null, "Enter at least 2 candidate times"));
      await api.createMissionPoll(missionId, { meetingLink, slots });
      load();
    } catch (err) {
      setError(err.message || t("missionDetail.couldntCreatePoll", null, "Couldn't create the poll"));
    } finally {
      setBusy(false);
    }
  };

  const lock = async (slotId) => {
    setBusy(true);
    try {
      await api.lockPollSlot(missionId, slotId);
      load();
    } catch (err) {
      setError(err.message || t("missionDetail.couldntLockSlot", null, "Couldn't lock this slot"));
    } finally {
      setBusy(false);
    }
  };

  const complete = async () => {
    setBusy(true);
    try {
      await api.completeMissionPoll(missionId);
      load();
    } catch (err) {
      setError(err.message || t("missionDetail.couldntMarkSessionCompleted", null, "Couldn't mark the session completed"));
    } finally {
      setBusy(false);
    }
  };

  const deletePoll = async () => {
    if (!window.confirm(t("missionDetail.confirmDeletePoll", null, "Are you sure you want to restart this poll? All current votes will be permanently lost."))) return;
    setBusy(true);
    try {
      await api.deleteMissionPoll(missionId);
      load();
    } catch (err) {
      setError(err.message || t("missionDetail.couldntDeletePoll", null, "Couldn't delete the poll"));
      setBusy(false);
    }
  };

  const getGCalLink = () => {
    if (!poll || !poll.lockedSlotId) return "#";
    const slot = poll.slots.find(s => s.id === poll.lockedSlotId);
    if (!slot) return "#";
    const start = new Date(slot.scheduledAt);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // Assume 1 hr
    const fmt = d => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const title = mission?.name ? t("missionDetail.gcalTitle", { name: mission.name }, "Focus Group: {{name}}") : t("missionDetail.gcalDefaultTitle", null, "ValidationCrew Focus Group");
    const details = t("missionDetail.gcalDetails", { link: poll.meetingLink || t("missionDetail.noLinkProvided", null, "No link provided yet") }, "Join the focus group meeting here:\n{{link}}");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(poll.meetingLink || "")}`;
  };

  if (!poll) {
    return (
      <div className="card sec" style={{ padding: 20 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>{t("missionDetail.createPoll", null, "Create a focus group poll")}</div>
        <input className="fin" style={{ marginBottom: 10 }} placeholder={t("missionDetail.meetingLinkPlaceholder", null, "Meeting link (shared for whichever time is picked)")} value={meetingLink} onChange={e => setMeetingLink(e.target.value)} />
        {slotInputs.map((val, i) => (
          <input key={i} className="fin" style={{ marginBottom: 10 }} type="datetime-local" value={val} onChange={e => setSlotInputs(inputs => inputs.map((v, idx) => idx === i ? e.target.value : v))} />
        ))}
        {error && <div className="err-banner" style={{ marginBottom: 10 }}>{error}</div>}
        <button className="btn btn-primary" disabled={busy} onClick={createPoll}>{busy ? t("actions.creating", null, "Creating…") : t("actions.createPoll", null, "Create poll")}</button>
      </div>
    );
  }

  return (
    <div className="col gap-3 sec">
      {error && <div className="err-banner">{error}</div>}
      {poll.status === "open" && poll.slots.some(s => s.tally > 0) && (
        <div style={{ padding: "12px 16px", background: "var(--accent-weak)", color: "var(--accent)", borderRadius: "var(--radius-sm)", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
          <Icon name="info" size={16} />
          {t("missionDetail.pollTip", null, "The time slot with the most votes is marked as 'Recommended'.")}
        </div>
      )}
      <div className="card" style={{ padding: 16 }}>
        <div className="row between" style={{ alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>{t("metrics.status", null, "Status")}</div>
            <div style={{ fontWeight: 700 }}>{poll.status}</div>
          </div>
          {poll.status !== "completed" && (
            <button className="btn btn-ghost" style={{ color: "var(--danger)", padding: "4px 8px" }} disabled={busy} onClick={deletePoll}>
              <Icon name="trash-2" size={16} style={{ marginRight: 6 }} /> {t("actions.restartPoll", null, "Restart Poll")}
            </button>
          )}
        </div>
        {poll.slots.map(s => {
          const maxTally = Math.max(...poll.slots.map(slot => slot.tally));
          const isRecommended = s.tally > 0 && s.tally === maxTally;
          
          return (
          <div key={s.id} style={{ borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", cursor: "pointer" }} onClick={() => setExpandedSlot(expandedSlot === s.id ? null : s.id)}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name={expandedSlot === s.id ? "chevron-down" : "chevron-right"} size={16} />
                {new Date(s.scheduledAt).toLocaleString()} — {s.tally} {t("missionDetail.available", null, "available")}
                {isRecommended && poll.status === "open" && <span className="tag" style={{ background: "var(--accent)", color: "#fff", marginLeft: 8 }}><Icon name="star" size={12} style={{marginRight: 4}}/>{t("status.recommended", null, "Recommended")}</span>}
              </span>
              <div>
                {poll.status === "open" && (
                  <button className="btn btn-quiet" style={{ marginRight: 8 }} disabled={busy} onClick={(e) => { e.stopPropagation(); lock(s.id); }}>{t("actions.lockTime", null, "Lock this time")}</button>
                )}
                {s.id === poll.lockedSlotId && <span className="tag" style={{ background: "var(--success-weak)", color: "var(--success)" }}>{t("status.locked", null, "Locked")}</span>}
              </div>
            </div>
            {expandedSlot === s.id && (
              <div style={{ padding: "0 0 12px 24px", color: "var(--fg-muted)", fontSize: 13 }}>
                {s.voters && s.voters.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {s.voters.map(v => <li key={v.id}>{v.name}</li>)}
                  </ul>
                ) : (
                  <div>{t("missionDetail.noVotes", null, "No votes yet.")}</div>
                )}
              </div>
            )}
          </div>
          );
        })}
        
        {poll.status === "locked" && (
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button className="btn btn-primary" disabled={busy} onClick={complete}>{busy ? t("actions.saving", null, "Saving…") : t("actions.markSessionCompleted", null, "Mark session completed")}</button>
            <a href={getGCalLink()} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="calendar" size={16} /> {t("actions.addToCalendar", null, "Add to Google Calendar")}
            </a>
          </div>
        )}
        
        {poll.status === "completed" && <span className="tag" style={{ marginTop: 12, background: "var(--success-weak)", color: "var(--success)" }}>{t("status.completed", null, "Completed")}</span>}
      </div>

      {poll.missing && poll.missing.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 12, color: "var(--accent)" }}>{t("missionDetail.pendingResponses", null, "Pending Responses")}</div>
          <div style={{ fontSize: 13, color: "var(--fg-muted)", marginBottom: 12 }}>
            {t("missionDetail.pendingResponsesDesc", null, "These participants have not selected a time slot yet.")}
          </div>
          <div className="col gap-2">
            {poll.missing.map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--panel-inset)", borderRadius: "var(--radius-sm)" }}>
                <span style={{ fontWeight: 500 }}>{p.name}</span>
                <button className="btn btn-ghost" style={{ color: "var(--danger)", fontSize: 12 }} disabled={busy} onClick={() => removeParticipant(p.id)}>
                  {t("actions.removeFromMission", null, "Remove from mission")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



// --- WAITLIST INVITE MODAL ---
function WaitlistInviteModal({ mission, waitlist, onClose, showToast }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState({});

  const handleInvite = async (valId) => {
    setBusy(b => ({ ...b, [valId]: true }));
    try {
      await api.inviteValidator(mission.id, valId);
      showToast(t("missionDetail.inviteSent", null, "Invite sent successfully!"));
    } catch (err) {
      showToast(err.message || t("missionDetail.inviteFailed", null, "Failed to send invite"), "error");
    } finally {
      setBusy(b => ({ ...b, [valId]: false }));
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h3>{t("missionDetail.waitlistTitle", null, "Invite Waitlisted Validators")}</h3>
          <button className="btn btn-ghost" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="modal-body">
          <p className="muted" style={{ marginBottom: 16 }}>
            {t("missionDetail.waitlistDesc", null, "These users saved your mission and are waiting for a slot to open up. Invite them now to quickly fill the missing spot!")}
          </p>
          <div className="validator-list" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {waitlist.map(v => (
              <div key={v.id} className="card-box row between" style={{ padding: 12, alignItems: "center" }}>
                <div className="row" style={{ gap: 12, flex: 1 }}>
                  <img src={v.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + v.name} style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--border)" }} />
                  <div>
                    <h4 style={{ margin: "0 0 2px" }}>{v.name}</h4>
                    <div className="row" style={{ gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
                      <span><Icon name="star" size={14} style={{ color: "var(--accent)" }} /> {v.rating || 0} ({v.reviews_count || 0})</span>
                      <span><Icon name="shield" size={14} style={{ color: "var(--success)" }} /> {t("missionDetail.trustLabel", null, "Trust:")} {v.trust || 50}</span>
                    </div>
                  </div>
                </div>
                <Btn variant="primary" size="sm" icon="send" busy={busy[v.id]} onClick={() => handleInvite(v.id)}>
                  {t("actions.invite", null, "Invite")}
                </Btn>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}



export default function MissionDetail() {
  const { t, dataVersion } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { categories } = useMeta();
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [refetching, setRefetching] = useState(false);
  const mountedRef = useRef(false);
  const [participants, setParticipants] = useState([]);
  const [responses, setResponses] = useState([]);
  const [error, setError] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [waitlist, setWaitlist] = useState([]);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditAudience, setShowEditAudience] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    // Toast component handles its own timeout and exit animations now!
  };

  const handleParticipantRemoved = async (validatorId) => {
    // Remove from UI immediately without reload
    setParticipants(prev => prev.filter(p => p.validator_id !== validatorId && p.id !== validatorId));
    
    // Check waitlist to see if we should pop the suggestion modal
    try {
      const res = await api.missionWaitlist(id);
      if (res.waitlist && res.waitlist.length > 0) {
        setWaitlist(res.waitlist);
        setShowWaitlistModal(true);
      }
    } catch {
      // fail silently
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!window.confirm(t("missionDetail.confirmStatusChange", { status: newStatus }, "Are you sure you want to change the status to {{status}}?"))) return;
    try {
      const { mission: updated } = await api.updateMission(id, { status: newStatus });
      setData(d => ({ ...d, mission: updated }));
      showToast(t("missionDetail.missionMarkedAs", { status: newStatus }, "Mission marked as {{status}}"));
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  useEffect(() => {
    setTimeout(() => setData(null), 0);
    api.mission(id)
      .then(d => {
        setData(d);
        setParticipants(d?.participants?.map(p => ({ ...p })) || []);
        setResponses(d?.responses || []);
      })
      .catch(err => setError(err.message));
  }, [id, location.state?.refresh]);

  // Language switch: refetch translated content in the background instead of
  // blanking the page like a real navigation does above.
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    setTimeout(() => setRefetching(true), 0);
    api.mission(id)
      .then(d => {
        setData(d);
        setParticipants(d?.participants?.map(p => ({ ...p })) || []);
        setResponses(d?.responses || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setRefetching(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion]);

  if (error) return <div className="page rise"><Icon name="layers" /> <span className="muted">{error}</span></div>;
  if (!data) return <div className="page rise"><div className="muted">{t("missionDetail.loading", null, "Loading…")}</div></div>;

  const { mission } = data;
  const baseTabs = TABS.map(tb => ({ ...tb, l: t(tb.lk, null, tb.l), c: tb.k === "participants" ? participants.length : tb.k === "responses" ? responses.length : null }));

  let tabs = mission.category === "sample" ? [...baseTabs.slice(0, 3), { k: "shipments", l: t("missionDetail.tabs.shipments", null, "Shipments"), ic: "box", c: participants.length }, ...baseTabs.slice(3)] : baseTabs;

  if (mission.ptype === "interview") {
    const idx1 = tabs.findIndex(t => t.k === "responses") + 1;
    tabs = [...tabs.slice(0, idx1), { k: "interviews", l: t("missionDetail.tabs.interviews", null, "Interviews"), ic: "calendar", c: participants.length }, ...tabs.slice(idx1)];
  }
  if (mission.ptype === "focus") {
    const idx2 = tabs.findIndex(t => t.k === "responses") + 1;
    tabs = [...tabs.slice(0, idx2), { k: "focusgroup", l: t("missionDetail.tabs.focusGroup", null, "Focus Group"), ic: "users", c: participants.length }, ...tabs.slice(idx2)];
  }
  if (mission.ptype === "trial") {
    const idx3 = tabs.findIndex(t => t.k === "responses") + 1;
    tabs = [...tabs.slice(0, idx3), { k: "checkins", l: t("missionDetail.tabs.checkins", null, "Check-ins"), ic: "calendar", c: participants.length }, ...tabs.slice(idx3)];
  }

  return (
    <div className="page rise">
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
      <div className="crumbs"><a onClick={() => navigate("/missions")} style={{ cursor: "pointer" }}>{t("missionDetail.missionsLink", null, "Missions")}</a><Icon name="chevronRight" size={13} /><span>{mission.name}</span></div>
      <div className="ph" style={{ marginBottom: 18 }}>
        <div className="row gap-3" style={{ alignItems: "flex-start" }}>
          <MissionLogo name={mission.name} cat={mission.category} size={54} />
          <div>
            <div className="row gap-2 wrap" style={{ marginBottom: 7 }}><h1 style={{ fontSize: 23, margin: 0 }}>{mission.name}</h1><StatusTag status={mission.status} /></div>
            <div className="row gap-3 wrap"><TypeTag cat={mission.category} categories={categories} /><span className="muted" style={{ fontSize: 13 }}><Icon name="mapPin" size={13} style={{ verticalAlign: -2 }} /> {mission.region}</span><span className="muted" style={{ fontSize: 13 }}><Icon name="calendar" size={13} style={{ verticalAlign: -2 }} /> {t("missionDetail.closes", null, "Closes")} {mission.deadline}</span></div>
          </div>
        </div>
        <div className="ph-actions" style={{ flexWrap: "wrap", alignItems: "center" }}>
          <UpdatingBadge show={refetching} />
          {mission.status === "active" && <Btn variant="ghost" icon="xCircle" onClick={() => handleStatusChange("closed")}>{t("actions.close", null, "Close")}</Btn>}
          {mission.status === "closed" && <Btn variant="ghost" icon="checkCircle" onClick={() => handleStatusChange("completed")}>{t("actions.complete", null, "Complete")}</Btn>}
          {(mission.status === "completed" || mission.status === "draft") && <Btn variant="ghost" icon="archive" onClick={() => handleStatusChange("archived")}>{t("actions.archive", null, "Archive")}</Btn>}
          <Btn variant="ghost" icon="edit" onClick={() => setShowEditModal(true)}>{t("actions.edit", null, "Edit")}</Btn>
          <Btn variant="ghost" icon="download" onClick={() => exportCSV(
            `${mission.name.replace(/[^a-z0-9]+/gi, "_")}_participants.csv`,
            [t("missionDetail.thName", null, "Name"), t("missionDetail.thRole", null, "Role"), t("missionDetail.thCity", null, "City"), t("missionDetail.thStage", null, "Stage"), t("missionDetail.thTrust", null, "Trust"), t("missionDetail.thReward", null, "Reward")],
            participants.map(p => [p.name, p.role, p.city, p.stage, p.trust, p.reward])
          )}>{t("actions.export", null, "Export")}</Btn>
          {mission.status === "active" && <Btn variant="primary" icon="userplus" onClick={() => setShowInviteModal(true)}>{t("actions.invite", null, "Invite")}</Btn>}
        </div>
      </div>

      <div className="kpis sec">
        <KpiCard label={t("metrics.participants", null, "Participants")} value={mission.participants.joined} unit={` / ${mission.participants.target}`} icon="users" />
        <KpiCard label={t("metrics.submitted", null, "Submitted")} value={mission.participants.submitted} icon="check" tone="green" />
        <KpiCard label={t("metrics.completion", null, "Completion")} value={mission.completion} unit="%" icon="target" />
        <KpiCard label={t("metrics.spend", null, "Spend")} value={inrK(mission.spend)} icon="wallet" />
      </div>

      <div className="utabs sec">{tabs.map(t => <button key={t.k} className={tab === t.k ? "on" : ""} onClick={() => setTab(t.k)}><Icon name={t.ic} size={15} />{t.l}{t.c != null && <span className="cnt">{t.c}</span>}</button>)}</div>

      {tab === "overview" && <MissionOverview mission={mission} participants={participants} setTab={setTab} navigate={navigate} />}
      {tab === "audience" && <MissionAudienceTab audience={data.audience} onEdit={() => setShowEditAudience(true)} />}
      {tab === "participants" && <ParticipantKanban mission={mission} participants={participants} setParticipants={setParticipants} onInvite={() => setShowInviteModal(true)} navigate={navigate} showToast={showToast} />}
      {tab === "responses" && <ResponseReview missionId={id} responses={responses} setResponses={setResponses} navigate={navigate} />}
      {tab === "shipments" && <MissionShipmentsTab missionId={id} />}
      {tab === "interviews" && <MissionInterviewsTab missionId={id} />}
      {tab === "focusgroup" && <MissionFocusGroupTab mission={mission} missionId={id} onParticipantRemoved={handleParticipantRemoved} showToast={showToast} />}
      {tab === "checkins" && <MissionCheckinsTab responses={responses} />}
      {tab === "files" && <MissionFilesTab missionId={data.mission.id} files={data.files} />}
      {tab === "payments" && <MissionPaymentsTab payments={data.payments} navigate={navigate} missionId={id} />}

      {showInviteModal && mission && (
        <InviteValidatorModal mission={mission} onClose={() => setShowInviteModal(false)} />
      )}
      {showWaitlistModal && mission && waitlist.length > 0 && (
        <WaitlistInviteModal mission={mission} waitlist={waitlist} onClose={() => setShowWaitlistModal(false)} showToast={showToast} />
      )}
      {showEditModal && mission && (
        <EditMissionModal mission={mission} onClose={() => setShowEditModal(false)} onSaved={(updated) => setData(d => ({ ...d, mission: updated }))} />
      )}
      {showEditAudience && mission && (
        <EditAudienceModal mission={mission} audience={data.audience} onClose={() => setShowEditAudience(false)} onSaved={(defn) => setData(d => ({ ...d, audience: { ...d.audience, defn } }))} />
      )}
    </div>
  );
}

function MissionCheckinsTab({ responses }) {
  const { t } = useTranslation();
  if (!responses || responses.length === 0) return <div className="card rise" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>{t("missionDetail.noCheckinsYet", null, "No validators have submitted check-ins yet.")}</div>;

  return (
    <div className="col gap-3 sec">
      {responses.map(r => (
        <div key={r.id} className="card rise" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{r.name}</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{t("metrics.trustScore", null, "Trust score:")} {r.trust}%</div>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--success)" }}>{(r.checkins || []).length} / 7 {t("missionDetail.daysLogged", null, "days logged")}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {(r.checkins || []).map((c, i) => (
              <div key={i} style={{ background: "var(--panel-2)", padding: 16, borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 700, marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
                  <span>{t("missionDetail.dayNumber", { n: c.dayNumber }, "Day {{n}}")}</span>
                  <span style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 400 }}>{new Date(c.submittedAt).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div><span style={{ color: "var(--text-muted)" }}>{t("missionDetail.usedIt", null, "Used it?")}</span> {c.answers?.used || "N/A"}</div>
                  <div><span style={{ color: "var(--text-muted)" }}>{t("missionDetail.whatDidYouDo", null, "What did you do?")}</span><br />{c.answers?.what || "N/A"}</div>
                  {c.answers?.frustration === "yes" && <div><span style={{ color: "var(--danger)" }}>{t("missionDetail.frustrated", null, "Frustrated:")}</span> {c.answers?.frustrationDetail}</div>}
                  {c.screenshotUrl && (
                    <a href={c.screenshotUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 8, color: "var(--accent)", fontSize: 12, fontWeight: 600 }}>
                      <Icon name="image" size={14} style={{ verticalAlign: -2 }} /> {t("actions.viewScreenshot", null, "View Screenshot")}
                    </a>
                  )}
                </div>
              </div>
            ))}
            {(r.checkins || []).length === 0 && <div className="muted" style={{ fontSize: 13 }}>{t("missionDetail.noDailyCheckins", null, "No daily check-ins logged yet.")}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
