import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import { Avatar, Btn, Donut, KpiCard, MissionLogo, StatusTag, TypeTag, UpdatingBadge, inr, inrK } from "../components/ui";
import { useMeta } from "../context/MetaContext";
import { api } from "../api/client";
import { InviteValidatorModal } from "../components/InviteValidatorModal";
import { Modal } from "../components/Modal";
import { STAGES, FILE_KIND } from "../constants";
import { exportCSV } from "../exportUtils";
import { useTranslation } from "../i18n/index.jsx";
import { trFilterLabel } from "../data/audienceFilterLabels";

// "YYYY-MM-DDTHH:mm" for the current moment in local time — the format
// datetime-local inputs use for their own value/min, so passing this as
// `min` blocks past dates AND past times on today's date in one shot
// (native browser behavior for datetime-local's min boundary).
function nowLocalDatetimeString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Native date/datetime-local inputs only open the picker when you click the
// small calendar glyph — clicking the text itself just places a cursor for
// manual typing. This makes the whole field open the picker on click too.
function openPickerOnClick(e) {
  e.currentTarget.showPicker?.();
}

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

const TC_SEV = {
  crit: { l: "Critical", color: "var(--danger)", bg: "var(--danger-weak)" },
  imp: { l: "Important", color: "var(--warning)", bg: "var(--warning-weak)" },
  nice: { l: "Nice to have", color: "var(--success)", bg: "var(--success-weak)" },
};
const TC_QTYPE_LABEL = {
  multiple_choice: "Multiple choice", yes_no_detail: "Yes/No + detail", rating: "Rating (1-5)", text: "Open text",
};

// Read-only mirror of the wizard's TaskCard (StepTestCases.jsx) — same
// severity badges, steps, and questions, minus every edit/drag/delete
// control, since a published mission's tasks aren't editable from here.
function TaskOverviewCard({ task, idx, expanded, onToggle }) {
  const { t } = useTranslation();
  const sev = TC_SEV[task.severity] || TC_SEV.imp;
  const sevLabel = {
    crit: t("testCases.severityCritical", null, "Critical"),
    imp: t("testCases.severityImportant", null, "Important"),
    nice: t("testCases.severityNiceToHave", null, "Nice to have"),
  };
  const qTypeLabel = {
    multiple_choice: t("testCases.qTypeMultipleChoice", null, "Multiple choice"),
    yes_no_detail: t("testCases.qTypeYesNoDetail", null, "Yes/No + detail"),
    rating: t("testCases.qTypeRating", null, "Rating (1-5)"),
    text: t("testCases.qTypeOpenText", null, "Open text"),
  };
  return (
    <div className="card" style={{ overflow: "hidden", marginBottom: 10, border: expanded ? "1.5px solid var(--accent)" : "1px solid var(--border)" }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 14px", cursor: "pointer", userSelect: "none" }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontWeight: 600, fontSize: 11.5, background: "var(--accent-weak)", color: "var(--accent)", flexShrink: 0 }}>{idx + 1}</span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{task.title}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 800, background: sev.bg, color: sev.color }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
          {sevLabel[task.severity] || sevLabel.imp}
        </span>
        <Icon name={expanded ? "chevronDown" : "chevronRight"} size={15} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
      </div>
      {expanded && (
        <div style={{ padding: 14, borderTop: "1px solid var(--border)", background: "var(--panel-2)" }}>
          {task.steps?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div className="eyebrow" style={{ marginBottom: 9 }}>{t("testCases.steps", null, "Steps")}</div>
              <div style={{ display: "grid", gap: 7 }}>
                {task.steps.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13.5 }}>
                    <span style={{ width: 20, height: 20, borderRadius: 6, display: "grid", placeItems: "center", background: "var(--accent-weak)", color: "var(--accent)", fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {task.questions?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div className="eyebrow" style={{ marginBottom: 9 }}>{t("testCases.questions", null, "Questions")}</div>
              <div style={{ display: "grid", gap: 7 }}>
                {task.questions.map((q, i) => (
                  <div key={q.id || i} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "8px 10px", background: "var(--panel)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13 }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, color: "var(--text-faint)", paddingTop: 2, flexShrink: 0 }}>{t("testCases.questionN", { n: i + 1 }, `Q${i + 1}`)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{q.text}</div>
                      <div className="faint" style={{ fontSize: 11.5, marginTop: 3 }}>{qTypeLabel[q.type] || q.type}</div>
                      {q.options && (
                        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                          {q.options.map((o, oi) => (
                            <span key={oi} style={{ padding: "2px 9px", borderRadius: 20, background: "var(--panel-inset)", border: "1px solid var(--border)", fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)" }}>{o}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 4, fontSize: 12.5, color: "var(--text-muted)" }}>
            <span>{t("testCases.minTimeMin", null, "Min time (min)")}: <b style={{ color: "var(--text)" }}>{Math.ceil((task.min_time_seconds || 120) / 60)}</b></span>
            {task.proof === "screenshot" && <span className="row gap-1" style={{ alignItems: "center" }}><Icon name="image" size={13} />{t("testCases.requireProof", null, "Require screenshot or video proof")}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function MissionOverview({ mission, participants, setTab, navigate }) {
  const { t } = useTranslation();
  const pipeline = STAGES.map(s => ({ ...s, n: participants.filter(p => p.stage === s.id).length }));
  const maxN = Math.max(...pipeline.map(p => p.n), 1);
  const [expandedTasks, setExpandedTasks] = useState(() => new Set());
  const toggleTask = (i) => setExpandedTasks(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  return (
    <div className="split rise">
      <div className="col gap-5">
        <div className="card" style={{ padding: 20 }}>
          <span className="eyebrow">{t("missionDetail.theBrief", null, "The brief")}</span>
          <p style={{ fontSize: 15, lineHeight: 1.65, margin: "10px 0 0", overflowWrap: "anywhere", wordBreak: "break-word" }}>{mission.description || t("missionDetail.noDescription", null, "No description provided yet.")}</p>
        </div>
        {mission.tasks?.length > 0 && (
          <div className="card" style={{ padding: 20 }}>
            <span className="eyebrow">{t("missionDetail.testCasesLabel", { n: mission.tasks.length }, `Test cases (${mission.tasks.length})`)}</span>
            <div style={{ marginTop: 10 }}>
              {mission.tasks.map((task, i) => (
                <TaskOverviewCard key={task.id || i} task={task} idx={i} expanded={expandedTasks.has(i)} onToggle={() => toggleTask(i)} />
              ))}
            </div>
          </div>
        )}
        <div className="card" style={{ padding: 20 }}>
          <div className="sec-head"><h3 className="h-md">{t("missionDetail.participantPipeline", null, "Participant pipeline")}</h3><Btn variant="quiet" size="sm" iconRight="arrowRight" onClick={() => setTab("participants")}>{t("actions.openBoard", null, "Open board")}</Btn></div>
          <div className="col gap-3" style={{ marginTop: 6 }}>
            {pipeline.map(s => <div className="geo-row" key={s.id}><span className="gn">{t(`status.${s.id}`, null, s.label)}</span><span className="gbar"><i style={{ width: (s.n / maxN) * 100 + "%", background: s.color }} /></span><span className="gv">{s.n}</span></div>)}
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
        <Btn variant="primary" block icon="message" onClick={() => navigate(`/missions/${mission.id}?tab=responses`)}>{t("actions.reviewSubmissions", null, "Review submissions")}</Btn>
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
    const target = participants.find(p => p.id === id);
    setParticipants(ps => ps.map(p => {
      if (p.id !== id) return p;
      prevStage = p.stage;
      return { ...p, stage };
    }));
    try {
      await api.moveParticipant(mission.id, id, stage);
      // Drag-and-drop on this board *is* how a participant's stage gets set — make
      // that change visible instead of it looking like a no-op (BUG-044). The
      // validator's own status view now updates from the same call too (see the
      // backend's manual stage-move handler).
      const stageLabel = STAGES.find(s => s.id === stage)?.label || stage;
      showToast(t("missionDetail.participantMoved", { name: target?.name || "Participant", stage: stageLabel }, `${target?.name || "Participant"} moved to ${stageLabel} — they'll see this update too.`));
    } catch {
      // Roll back the optimistic move — e.g. the backend rejected a stage it doesn't allow.
      setParticipants(ps => ps.map(p => p.id === id ? { ...p, stage: prevStage } : p));
    }
  };

  return (
    <div>
      <div className="row between" style={{ marginBottom: 14 }}>
        <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>{t("missionDetail.dragParticipants", null, "Drag a card into a different column to update that participant's stage — they'll see the change on their end too.")} {participants.length} {t("missionDetail.totalInMission", null, "total in this mission.")}</p>
        <Btn variant="ghost" size="sm" icon="userplus" onClick={onInvite}>{t("actions.inviteMore", null, "Invite more")}</Btn>
      </div>
      <div className="kanban">
        {STAGES.map(st => {
          // A validator auto-failed for missing check-ins gets stage 'failed',
          // not one of the six real Kanban stages — no column for it means no
          // separate 7th column (would just add more horizontal scroll to an
          // already-wide board), but it still needs to be visible somewhere
          // rather than silently vanishing. Folds into Rejected, the other
          // locked/terminal-and-unsuccessful column, with its own distinct tag
          // on the card so it doesn't read as the builder having rejected them.
          const col = st.id === "rejected"
            ? participants.filter(p => p.stage === "rejected" || p.stage === "failed")
            : participants.filter(p => p.stage === st.id);
          const droppable = st.id !== "rewarded" && st.id !== "rejected";
          return (
            <div key={st.id} className={`kcol ${over === st.id ? "dragover" : ""} ${drag && !droppable ? "kcol-locked" : ""}`}
              onDragOver={e => { e.preventDefault(); if (droppable) setOver(st.id); }}
              onDragLeave={() => setOver(o => o === st.id ? null : o)}
              onDrop={e => {
                e.preventDefault();
                if ((st.id === "rewarded" || st.id === "rejected") && drag != null) {
                  showToast(t("missionDetail.reviewToMoveThem", { stage: t(`status.${st.id}`, null, st.label).toLowerCase() }, "Please review their submission to move them to {{stage}}."), "error");
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
                  <b>{t(`status.${st.id}`, null, st.label)}</b>
                  {drag && !droppable && <Icon name="lock" size={13} style={{ color: "var(--warning)" }} title="Review submission to reward" />}
                </div>
                <span className="cnt">{col.length}</span>
              </div>
              <div className="kcol-body">
                {col.map(p => (
                  <div key={p.id} className={`kcard ${drag === p.id ? "dragging" : ""} ${(p.stage === "rewarded" || p.stage === "rejected" || p.stage === "failed") ? "kcard-locked" : ""}`} draggable={p.stage !== "rewarded" && p.stage !== "rejected" && p.stage !== "failed"}
                    onDragStart={(e) => {
                      if (p.stage === "rewarded" || p.stage === "rejected" || p.stage === "failed") {
                        e.preventDefault();
                        return;
                      }
                      setDrag(p.id);
                    }}
                    onDragEnd={() => { setDrag(null); setOver(null); }}
                    style={(p.stage === "rewarded" || p.stage === "rejected" || p.stage === "failed") ? { cursor: "default", opacity: 0.85 } : {}}>
                    <div className="kcard-top">
                      <Avatar name={p.name} size={32} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="row between">
                          <div className="kn">{p.name}</div>
                        </div>
                        <div className="kl row gap-2" style={{ margin: "2px 0 0" }}>
                          {trFilterLabel(t, p.role)}
                          {st.id === "rewarded" && <span className="st st-completed" style={{ fontSize: 9, padding: "2px 6px" }}>{t("status.rewarded", null, "Rewarded")}</span>}
                          {p.stage === "rejected" && <span style={{ fontSize: 9, padding: "2px 6px", background: "var(--danger, #ff4d4f)", color: "#fff", borderRadius: 12, fontWeight: 600 }}>{t("status.rejected", null, "Rejected")}</span>}
                          {p.stage === "failed" && <span title={t("status.failedHint", null, "Auto-failed by the system for missing daily check-ins — not a builder rejection.")} style={{ fontSize: 9, padding: "2px 6px", background: "var(--warning, #c2710c)", color: "#fff", borderRadius: 12, fontWeight: 600, cursor: "help" }}>{t("status.failed", null, "Failed — missed check-ins")}</span>}
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
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="faint" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginTop: 24, padding: "12px 16px", background: "var(--accent-weak)", borderRadius: "var(--radius)", color: "var(--accent)" }}>
        <div style={{ background: "var(--accent)", color: "#fff", borderRadius: "50%", padding: 4, display: 'flex' }}><Icon name="bolt" size={12} /></div>
        <b>{t("missionDetail.tip", null, "Tip:")}</b> {t("missionDetail.dragAndDropTip", null, "Drag and drop participants between stages to update their progress.")}
        <a href="#" style={{ marginLeft: 'auto', fontWeight: 600, color: "var(--accent)" }}>{t("missionDetail.learnMorePipeline", null, "Learn more about participant pipeline")} <Icon name="externalLink" size={12} style={{ verticalAlign: -2 }} /></a>
      </div>
    </div>
  );
}

function QualityBadge({ quality }) {
  const { t } = useTranslation();
  const cfg = {
    high: { label: t("quality.high", null, "High quality"), bg: "var(--success-weak)", color: "var(--success)" },
    medium: { label: t("quality.medium", null, "Medium"), bg: "var(--warning-weak)", color: "var(--warning)" },
    low: { label: t("quality.low", null, "Low effort"), bg: "var(--danger-weak)", color: "var(--danger)" },
    flagged: { label: t("quality.flagged", null, "Flagged"), bg: "var(--danger-weak)", color: "var(--danger)" },
  }[quality] || { label: quality, bg: "var(--panel-inset)", color: "var(--text-faint)" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 800, background: cfg.bg, color: cfg.color }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />{cfg.label}
    </span>
  );
}

// Full-detail review drawer — used to live on the standalone /submissions
// page; now opens in-place over the Responses tab instead of navigating away.
function SlideOver({ sub, onClose, onAction }) {
  const { t } = useTranslation();
  const [rejectReason, setRejectReason] = useState("");
  const [reviseNote, setReviseNote] = useState("");
  const [rating, setRating] = useState(0);
  const [view, setView] = useState("review"); // review | reject | revise | approve
  const [expandedTasks, setExpandedTasks] = useState(new Set([0]));
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleTask = (i) => setExpandedTasks(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next; });

  const handleActionSubmit = async (action, reason, rating) => {
    setIsProcessing(true);
    try {
      await onAction(sub.id, action, reason, rating);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!sub) return null;

  // Rendered via a portal straight onto <body> — mounted in place, this sat
  // deep inside the page's own DOM/stacking context, so no z-index here could
  // actually win against the topbar's own stacking context. The Notifications
  // panel gets the same "cover everything" effect by living at the layout
  // root instead; portaling is the equivalent escape hatch from here. Overlay
  // color/blur/z-index now match .drawer-overlay (builder.css) exactly, the
  // same values .notif-overlay uses under a different class name.
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex" }}>
      <div style={{ flex: 1, background: "rgba(8,10,18,.34)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div style={{ width: 660, background: "var(--bg)", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

        {/* Sticky as a group so the submission's identity + at-a-glance
            stats stay visible while scrolling through task responses below —
            expanding a long task used to push this entirely out of view,
            leaving no context for what's actually being reviewed. */}
        <div style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent)", display: "grid", placeItems: "center", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{sub.name[0]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{sub.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{trFilterLabel(t, sub.city)} · ★ {sub.trust / 10} {t("metrics.trustScore", null, "trust score")}</div>
          </div>
          <button className="btn btn-ghost" style={{ padding: 8 }} onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", gap: 12, overflowX: "auto" }}>
          <div style={{ flex: 1, minWidth: 90, padding: 12, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--panel)", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase" }}><Icon name="calendar" size={12} style={{ color: "var(--accent)" }} /> {t("metrics.submitted", null, "Submitted")}</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{sub.date}</div>
          </div>
          <div style={{ flex: 1, minWidth: 90, padding: 12, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--panel)", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase" }}><Icon name="clock" size={12} style={{ color: "var(--accent)" }} /> {t("metrics.timeTaken", null, "Time Taken")}</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{sub.mins} min</div>
          </div>
          <div style={{ flex: 1, minWidth: 90, padding: 12, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--panel)", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase" }}><Icon name="checkCircle" size={12} style={{ color: "var(--accent)" }} /> {t("metrics.tasks", null, "Tasks")}</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{sub.tasks}</div>
          </div>
          <div style={{ flex: 1, minWidth: 100, padding: 12, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--panel)", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase" }}><Icon name="shield" size={12} style={{ color: "var(--accent)" }} /> {t("metrics.quality", null, "Quality")}</div>
            <div><QualityBadge quality={sub.quality} /></div>
          </div>
        </div>
        </div>

        {sub.checkins && sub.checkins.length > 0 && (
          <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>{t("review.dailyCheckinHistory", { days: sub.checkins.length }, `Daily check-in history (${sub.checkins.length} days)`)}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sub.checkins.map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--panel)", alignItems: "flex-start" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, color: "var(--accent)", flexShrink: 0, paddingTop: 2 }}>{t("missions.dayTitle", null, "Day")} {c.dayNumber}</span>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--text)" }}>
                    <div style={{ marginBottom: 4 }}><b>{t("review.usedIt", null, "Used it:")}</b> {c.answers.used || "—"} · <b>{t("review.wouldReturn", null, "Would return:")}</b> {c.answers.comeback || "—"}</div>
                    {c.answers.what && <div style={{ color: "var(--text-muted)", marginBottom: c.answers.frustration === "yes" ? 4 : 0 }}>{c.answers.what}</div>}
                    {c.answers.frustration === "yes" && c.answers.frustrationDetail && (
                      <div style={{ color: "var(--danger)" }}>{t("review.frustration", null, "Frustration:")} {c.answers.frustrationDetail}</div>
                    )}
                  </div>
                  {c.screenshotUrl && (
                    <a href={c.screenshotUrl} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
                      <img src={c.screenshotUrl} alt={`Day ${c.dayNumber} proof`} style={{ width: 48, height: 32, objectFit: "cover", borderRadius: 4, border: "1px solid var(--border)" }} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: "16px 24px", flex: 1 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>{t("review.taskResponses", null, "Task responses")}</div>
          {(sub.breakdown || []).map((b, i) => (
            <div key={i} className="card rise" style={{ marginBottom: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
              <div onClick={() => toggleTask(i)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", cursor: "pointer", userSelect: "none", background: "var(--panel)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "2px 8px", borderRadius: 12, background: "var(--accent-weak)", color: "var(--accent)", fontSize: 11, fontWeight: 700 }}>{t("missions.taskNTitle", { n: i + 1 }, `Task ${i + 1}`)}</span>
                <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{b.t}</span>
                <Icon name={expandedTasks.has(i) ? "chevronUp" : "chevronDown"} size={16} style={{ color: "var(--text-muted)" }} />
              </div>
              {expandedTasks.has(i) && (
                <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
                  {b.ans && !b.details && <p style={{ margin: "16px 0 0", fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{b.ans}</p>}
                  {b.details && b.details.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 16, background: "var(--border)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                      {b.details.map((dt, didx) => (
                        <div key={didx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "var(--panel)" }}>
                          <div style={{ padding: "12px 14px", display: "flex", gap: 10, borderRight: "1px solid var(--border)" }}>
                            <Icon name="info" size={14} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", lineHeight: 1.4 }}>{dt.label}</div>
                          </div>
                          <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--text)", lineHeight: 1.5, background: "var(--bg)", wordBreak: "break-word" }}>
                            {dt.value}
                          </div>
                        </div>
                      ))}
                      {b.attachments && b.attachments.length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "var(--panel)" }}>
                          <div style={{ padding: "12px 14px", display: "flex", gap: 10, borderRight: "1px solid var(--border)" }}>
                            <Icon name="image" size={14} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", lineHeight: 1.4 }}>{t("review.proofLabel", null, "Proof (Screenshot / Video)")}</div>
                          </div>
                          <div style={{ padding: "12px 14px", background: "var(--bg)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {b.attachments.map((src, idx) => {
                              const isVideo = src.match(/\.(mp4|webm|mov)$/i);
                              return (
                                <div key={idx} style={{ position: "relative", width: 140, height: 80, borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)", background: "#000" }}>
                                  {isVideo ? (
                                    <>
                                      <video src={src + "#t=0.1"} preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "rgba(255,255,255,0.9)", pointerEvents: "none" }}>
                                        <Icon name="playCircle" size={28} />
                                      </div>
                                    </>
                                  ) : (
                                    <img src={src} alt="Proof" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                  )}
                                  <a href={src} target="_blank" rel="noopener noreferrer" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 600, textDecoration: "none", gap: 4, opacity: 0, transition: "opacity .2s" }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                                    <Icon name="externalLink" size={12} /> {t("actions.view", null, "View")}
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        </div>

        {view === "review" && sub.status === "pending" && (
          <div style={{ background: "var(--panel)", borderTop: "1px solid var(--border)", padding: "16px 24px", display: "flex", gap: 12, alignItems: "center" }}>
            {/* One revision cycle only — once this submission has already
                been sent back once, the only real outcomes left are Approve
                or Reject, not another round-trip with no resolution. The
                backend enforces this too (see the /revision route); this
                just keeps a dead-end action off the screen. */}
            {(sub.revisionCount || 0) < 1 && (
              <button className="btn btn-ghost" style={{ padding: "8px 12px", color: "var(--text-muted)", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }} onClick={() => setView("revise")}>
                <Icon name="message" size={14} /> {t("review.addNotes", null, "Add Reviewer Notes...")}
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button className="btn" style={{ padding: "8px 24px", color: "var(--danger)", border: "1px solid color-mix(in srgb,var(--danger) 40%,transparent)", background: "transparent", display: "flex", alignItems: "center", gap: 6 }} onClick={() => setView("reject")}>
              <Icon name="x" size={14} /> {t("actions.reject", null, "Reject")}
            </button>
            <Btn variant="primary" style={{ padding: "8px 24px", background: "var(--success-weak)", color: "var(--success)", border: "1px solid color-mix(in srgb,var(--success) 40%,transparent)", display: "flex", alignItems: "center", gap: 6 }} onClick={() => setView("approve")}>
              <Icon name="check" size={14} /> {t("actions.approve", null, "Approve")}
            </Btn>
          </div>
        )}

        {view === "approve" && (
          <div style={{ background: "var(--panel)", padding: "16px 24px", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{t("review.rateSubmission", null, "Rate this submission")}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
              {t("review.ratingImpactDesc", null, "Your rating directly impacts the validator's Trust Score.")}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map(v => (
                <div key={v} onClick={() => setRating(v)} style={{
                  cursor: "pointer", padding: "10px", borderRadius: 8,
                  background: rating >= v ? "var(--warning)" : "var(--panel-inset)",
                  color: rating >= v ? "#fff" : "var(--text-faint)",
                  display: "grid", placeItems: "center", transition: "all .15s"
                }}>
                  <Icon name="star" size={24} />
                </div>
              ))}
            </div>
            {rating > 0 && rating <= 2 && (
              <textarea className="fin" placeholder={t("review.whatWentWrong", null, "What went wrong? (Required for low ratings)")} rows={2} value={rejectReason} onChange={e => setRejectReason(e.target.value)} style={{ marginBottom: 10 }} />
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setView("review")} disabled={isProcessing}>{t("actions.cancel", null, "Cancel")}</button>
              <Btn variant="primary" style={{ flex: 1, justifyContent: "center", opacity: isProcessing ? 0.7 : 1 }} onClick={() => handleActionSubmit("approved", rejectReason, rating)} disabled={isProcessing || rating === 0 || (rating <= 2 && !rejectReason.trim())}>
                {isProcessing ? t("actions.approving", null, "Approving...") : t("actions.approveAndRate", { rating: rating > 0 ? rating : '' }, `Approve & Rate ${rating > 0 ? rating : ''} ★`)}
              </Btn>
            </div>
          </div>
        )}

        {view === "reject" && (
          <div style={{ background: "var(--panel)", padding: "16px 24px", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{t("review.reasonForRejection", null, "Reason for rejection")}</div>
            <textarea className="fin" placeholder={t("review.explainRejection", null, "Explain why this submission doesn't meet the requirements…")} rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} style={{ marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setView("review")} disabled={isProcessing}>{t("actions.cancel", null, "Cancel")}</button>
              <button className="btn btn-danger" style={{ flex: 1, opacity: isProcessing ? 0.7 : 1 }} onClick={() => handleActionSubmit("rejected", rejectReason, 1)} disabled={isProcessing || !rejectReason.trim()}>
                {isProcessing ? t("actions.rejecting", null, "Rejecting...") : t("actions.rejectSubmission", null, "Reject submission")}
              </button>
            </div>
          </div>
        )}

        {view === "revise" && (
          <div style={{ background: "var(--panel)", padding: "16px 24px", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{t("review.whatNeedsRevision", null, "What needs revision?")}</div>
            <textarea className="fin" placeholder={t("review.revisePlaceholder", null, "e.g. Please re-test the checkout flow and describe what happened at step 3…")} rows={3} value={reviseNote} onChange={e => setReviseNote(e.target.value)} style={{ marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setView("review")} disabled={isProcessing}>{t("actions.cancel", null, "Cancel")}</button>
              <Btn variant="primary" style={{ flex: 1, justifyContent: "center", opacity: isProcessing ? 0.7 : 1 }} onClick={() => handleActionSubmit("revision", reviseNote)} disabled={isProcessing || !reviseNote.trim()}>
                {isProcessing ? t("actions.sending", null, "Sending...") : t("actions.sendRequest", null, "Send request")}
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

const RESPONSE_REVIEW_TABS = (t) => [
  { k: "all", l: t("status.all", null, "All") },
  { k: "pending", l: t("status.pending", null, "Pending") },
  { k: "approved", l: t("status.approved", null, "Approved") },
  { k: "flagged", l: t("status.flagged", null, "Flagged") },
  { k: "rejected", l: t("status.rejected", null, "Rejected") },
  { k: "revision", l: t("status.revision", null, "Revision") },
];

// Absorbs what used to be the standalone /missions/:id/submissions page —
// same KPI cards, status tabs, and review drawer, now in-place on the
// Responses tab instead of a full navigation away. Reply/Flag (unique to
// this tab before) are kept as row-level quick actions.
function ResponseReview({ missionId, navigate, showToast, tabBarRef }) {
  const { t } = useTranslation();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [selected, setSelected] = useState(null);
  const [replyingId, setReplyingId] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get(`/missions/${missionId}/submissions`).then(d => {
      if (!active) return;
      setSubs(d.submissions || []);
      setLoading(false);
      // This tab's own content loads asynchronously (unlike the others, whose
      // data is already in hand from the page's initial fetch) — the scroll
      // that fires on tab click lands correctly at that instant, but the
      // one-line "Loading…" placeholder it's scrolling to is a lot shorter
      // than the real KPI cards + list that replace it a moment later, so
      // the target position needs to be re-applied once that's actually on
      // screen, not just on the click itself.
      tabBarRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [missionId]);

  const counts = {
    all: subs.length,
    pending: subs.filter(s => s.status === "pending").length,
    approved: subs.filter(s => s.status === "approved").length,
    flagged: subs.filter(s => s.flagged).length,
    rejected: subs.filter(s => s.status === "rejected").length,
    revision: subs.filter(s => s.status === "revision").length,
  };
  const visible = tab === "all" ? subs : tab === "flagged" ? subs.filter(s => s.flagged) : subs.filter(s => s.status === tab);
  const selectedSub = selected ? subs.find(s => s.id === selected) : null;
  const avgMins = subs.length ? Math.round(subs.reduce((a, s) => a + (s.mins || 0), 0) / subs.length) : 0;

  const handleAction = async (subId, action, reason, rating) => {
    const subName = subs.find(s => s.id === subId)?.name || t("review.validatorFallbackName", null, "Validator");
    try {
      if (action === "approved") {
        await api.post(`/missions/${missionId}/submissions/${subId}/approved`, { rating });
        showToast(`${t("review.approvedSubFrom", null, "Approved submission from")} ${subName}`, "success");
      } else if (action === "rejected") {
        await api.post(`/missions/${missionId}/submissions/${subId}/rejected`, { note: reason, rating });
        showToast(`${t("review.rejectedSubFrom", null, "Rejected submission from")} ${subName}`, "error");
      } else if (action === "revision") {
        await api.post(`/missions/${missionId}/submissions/${subId}/revision`, { note: reason });
        showToast(`${t("review.revisionReqSentTo", null, "Revision request sent to")} ${subName}`, "warning");
      }
    } catch (err) {
      alert(err.message || t("review.anErrorOccurred", null, "An error occurred"));
      return;
    }
    setSubs(prev => prev.map(s => s.id === subId ? { ...s, status: action === "approved" ? "approved" : action === "rejected" ? "rejected" : "revision" } : s));
    setSelected(null);
  };

  const onFlag = async (sub, flagged) => {
    setSubs(prev => prev.map(s => s.id === sub.id ? { ...s, flagged } : s));
    try { await api.flagResponse(missionId, sub.id, flagged); } catch { /* best effort */ }
  };

  const reply = async (sub) => {
    setReplyingId(sub.id);
    try {
      const { threadId } = await api.findOrCreateThread(sub.validatorId, missionId);
      navigate(`/messages?thread=${threadId}`);
    } catch (err) {
      alert(err.message || t("missionDetail.couldntStartConversation", null, "Couldn't start conversation"));
    } finally {
      setReplyingId(null);
    }
  };

  if (loading) return <div className="muted" style={{ padding: 24 }}>{t("review.loadingSubmissions", null, "Loading submissions…")}</div>;

  return (
    <div>
      {/* The four KPI cards used to repeat, almost number-for-number, both the
          Overview row above this tab (Submitted ≈ subs.length) and the status
          tabs right below (Approved/Pending ≈ counts.approved/counts.pending)
          — same shape, same numbers, twice. Avg time was the only one of the
          four that didn't exist anywhere else on the page, so it's kept, just
          as a small inline pill next to Export instead of its own card row. */}
      <div className="toolbar">
        <div className="tabs">{RESPONSE_REVIEW_TABS(t).map(tb => <button key={tb.k} className={tab === tb.k ? "on" : ""} onClick={() => setTab(tb.k)}>{tb.l} <span className="cnt mono">{counts[tb.k]}</span></button>)}</div>
        <span className="grow" />
        {subs.length > 0 && (
          <span className="pill" style={{ fontSize: 12, marginRight: 8 }}>
            <Icon name="clock" size={12} />{t("review.avgTimePill", { mins: avgMins }, `Avg ${avgMins} min`)}
          </span>
        )}
        <Btn variant="ghost" size="sm" icon="download" onClick={() => exportCSV(
          "submissions.csv",
          [t("missionDetail.thName", null, "Name"), t("missionDetail.thTrust", null, "Trust"), t("missionDetail.thSubmitted", null, "Submitted"), t("metrics.timeTaken", null, "Time Taken"), t("metrics.tasks", null, "Tasks"), t("metrics.quality", null, "Quality"), t("missionDetail.thStatus", null, "Status")],
          visible.map(s => [s.name, (s.trust / 10).toFixed(1), s.date, s.mins, s.tasks, s.quality, s.status])
        )}>{t("actions.export", null, "Export")}</Btn>
      </div>
      {visible.length === 0
        ? <div className="muted" style={{ padding: 24 }}>{t("review.noSubsInCategory", null, "No submissions in this category yet.")}</div>
        : (
          <div className="col gap-3">
            {visible.map(sub => (
              <div key={sub.id} className="card" style={{ padding: "16px 18px", cursor: "pointer", border: sub.flagged ? "1.5px solid color-mix(in srgb, var(--danger) 40%, var(--border))" : "1px solid var(--border)" }} onClick={() => setSelected(sub.id)}>
                <div className="row between wrap gap-3" style={{ alignItems: "flex-start" }}>
                  <div className="row gap-3">
                    <Avatar name={sub.name} size={42} />
                    <div>
                      <div className="row gap-2" style={{ alignItems: "center" }}>
                        <b style={{ fontSize: 15 }}>{sub.name}</b>
                        <span className="mono" style={{ fontSize: 11, padding: "2px 7px", borderRadius: 20, background: "var(--accent-weak)", color: "var(--accent)", fontWeight: 800 }}>★ {(sub.trust / 10).toFixed(1)}</span>
                      </div>
                      <div className="row gap-3 faint" style={{ fontSize: 12.5, marginTop: 4 }}>
                        <span>{sub.date}</span><span>{sub.mins} {t("metrics.min", null, "min")}</span><span>{sub.tasks} {t("metrics.tasks", null, "tasks")}</span>
                        <QualityBadge quality={sub.flagged ? "flagged" : sub.quality} />
                      </div>
                    </div>
                  </div>
                  <div className="row gap-2" onClick={e => e.stopPropagation()}>
                    {sub.status === "approved" && <span style={{ color: "var(--success)", fontWeight: 700, fontSize: 13 }}>✓ {t("status.approved", null, "Approved")}</span>}
                    {sub.status === "rejected" && <span style={{ color: "var(--text-muted)", fontWeight: 700, fontSize: 13 }}>✕ {t("status.rejected", null, "Rejected")}</span>}
                    {sub.status === "revision" && <span style={{ color: "var(--warning)", fontWeight: 700, fontSize: 13 }}>✎ {t("status.revisionReq", null, "Revision Req")}</span>}
                    <Btn variant="ghost" size="sm" icon="message" disabled={replyingId === sub.id} onClick={() => reply(sub)}>{replyingId === sub.id ? t("actions.opening", null, "Opening…") : t("actions.reply", null, "Reply")}</Btn>
                    <Btn variant={sub.flagged ? "primary" : "quiet"} size="sm" icon="flag" onClick={() => onFlag(sub, !sub.flagged)}>{sub.flagged ? t("actions.unflag", null, "Unflag") : t("actions.flag", null, "Flag")}</Btn>
                    {sub.status === "pending" && <Btn variant="primary" size="sm" icon="check" onClick={() => setSelected(sub.id)}>{t("actions.review", null, "Review")}</Btn>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      {selectedSub && <SlideOver sub={selectedSub} onClose={() => setSelected(null)} onAction={handleAction} />}
    </div>
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
                    <span className="eyebrow" style={{ width: 140, flex: "none", paddingTop: 4 }}>{trFilterLabel(t, d.group)}</span>
                    <div className="row gap-2 wrap">{d.values.map(v => <span key={v} className="mtag">{trFilterLabel(t, v)}</span>)}</div>
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
                  <td>{r.status === "review" ? <Btn variant="ghost" size="sm" icon="eye" onClick={() => navigate(`/missions/${missionId}?tab=responses`)}>{t("actions.review", null, "Review")}</Btn> : <span className="verif"><Icon name="checkCircle" size={14} />{t("actions.done", null, "Done")}</span>}</td>
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
      if (new Date(input.scheduledAt) < new Date()) throw new Error(t("missionDetail.candidateTimeInPast", null, "Candidate times can't be in the past"));
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
                <input className="fin" type="datetime-local" style={{ width: 200 }} min={nowLocalDatetimeString()} onClick={openPickerOnClick} onChange={e => setProposeInputs(t => ({ ...t, [s.validatorId]: { ...t[s.validatorId], scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : "" } }))} />
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
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Auto-saves the not-yet-submitted poll form so navigating away (or an
  // accidental reload) doesn't lose what was already typed in — same
  // scratch-draft pattern used for the mission wizard, just scoped to this
  // mission's poll instead of a whole mission draft.
  const POLL_DRAFT_KEY = `vcrew_poll_draft_${missionId}`;
  const [meetingLink, setMeetingLink] = useState(() => {
    try { return JSON.parse(localStorage.getItem(POLL_DRAFT_KEY))?.meetingLink || ""; } catch { return ""; }
  });
  const [slotInputs, setSlotInputs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(POLL_DRAFT_KEY))?.slotInputs || ["", "", "", ""]; } catch { return ["", "", "", ""]; }
  });
  const [expandedSlot, setExpandedSlot] = useState(null);

  useEffect(() => {
    localStorage.setItem(POLL_DRAFT_KEY, JSON.stringify({ meetingLink, slotInputs }));
  }, [meetingLink, slotInputs, POLL_DRAFT_KEY]);

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
    api.missionPoll(missionId).then(d => { setPoll(d.poll); setLoading(false); }).catch(err => { setLoadError(err.message); setLoading(false); });
  };
  useEffect(load, [missionId]);

  if (loading) return <div className="muted">{t("missionDetail.loadingPoll", null, "Loading focus group poll…")}</div>;
  // Only a genuine load failure replaces the whole section — action errors
  // (create/lock/complete/delete) use the separate `error` state and render
  // inline as an err-banner (see below) so the form/poll stays visible and
  // usable instead of vanishing behind a plain, unstyled error message.
  if (loadError) return <div className="muted">{loadError}</div>;

  const createPoll = async () => {
    setBusy(true);
    setError("");
    try {
      const slots = slotInputs.filter(Boolean).map(s => new Date(s).toISOString());
      if (slots.length < 2) throw new Error(t("missionDetail.enterAtLeast2Times", null, "Enter at least 2 candidate times"));
      // The datetime-local input's `min` only constrains its native picker widget —
      // typing a value directly bypasses it, so this is the actual enforcement.
      if (slots.some(s => new Date(s) < new Date())) throw new Error(t("missionDetail.candidateTimeInPast", null, "Candidate times can't be in the past"));
      await api.createMissionPoll(missionId, { meetingLink, slots });
      localStorage.removeItem(POLL_DRAFT_KEY);
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
      // The form that reappears is for a genuinely new poll — clear the old
      // (now-deleted) poll's dates instead of leaving them pre-filled, since
      // they're likely already in the past by the time a restart happens.
      setMeetingLink("");
      setSlotInputs(["", "", "", ""]);
      localStorage.removeItem(POLL_DRAFT_KEY);
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
          <input key={i} className="fin" style={{ marginBottom: 10 }} type="datetime-local" min={nowLocalDatetimeString()} value={val} onClick={openPickerOnClick} onChange={e => setSlotInputs(inputs => inputs.map((v, idx) => idx === i ? e.target.value : v))} />
        ))}
        {error && <div className="err-banner" style={{ marginBottom: 10 }}>{error}</div>}
        <button className="btn btn-primary" disabled={busy} onClick={createPoll}>{busy ? t("actions.creating", null, "Creating…") : t("actions.createPoll", null, "Create poll")}</button>
      </div>
    );
  }

  const allSlotsPast = poll.slots.length > 0 && poll.slots.every(s => new Date(s.scheduledAt) < new Date());
  const lockedSlot = poll.slots.find(s => s.id === poll.lockedSlotId);
  const lockedSlotPast = poll.status === "locked" && lockedSlot && new Date(lockedSlot.scheduledAt) < new Date();

  return (
    <div className="col gap-3 sec">
      {error && <div className="err-banner">{error}</div>}
      {poll.status === "open" && poll.slots.some(s => s.tally > 0) && !allSlotsPast && (
        <div style={{ padding: "12px 16px", background: "var(--accent-weak)", color: "var(--accent)", borderRadius: "var(--radius-sm)", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
          <Icon name="info" size={16} />
          {t("missionDetail.pollTip", null, "The time slot with the most votes is marked as 'Recommended'.")}
        </div>
      )}
      {poll.status === "open" && allSlotsPast && (
        <div style={{ padding: "12px 16px", background: "var(--warning-weak)", color: "var(--warning)", borderRadius: "var(--radius-sm)", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
          <Icon name="alertTriangle" size={16} />
          {t("missionDetail.allSlotsPast", null, "All candidate times have passed. Restart the poll to propose new times.")}
        </div>
      )}
      {lockedSlotPast && (
        <div style={{ padding: "12px 16px", background: "var(--warning-weak)", color: "var(--warning)", borderRadius: "var(--radius-sm)", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
          <Icon name="alertTriangle" size={16} />
          {t("missionDetail.lockedSlotPast", null, "This session's scheduled time has passed. Mark it as completed if it happened, or restart the poll to schedule a new time.")}
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
              <Icon name="trash" size={16} style={{ marginRight: 6 }} /> {t("actions.restartPoll", null, "Restart Poll")}
            </button>
          )}
        </div>
        {poll.slots.map(s => {
          const maxTally = Math.max(...poll.slots.map(slot => slot.tally));
          const isRecommended = s.tally > 0 && s.tally === maxTally;
          const isPast = new Date(s.scheduledAt) < new Date();

          return (
          <div key={s.id} style={{ borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", cursor: "pointer" }} onClick={() => setExpandedSlot(expandedSlot === s.id ? null : s.id)}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, opacity: isPast ? 0.55 : 1 }}>
                <Icon name={expandedSlot === s.id ? "chevronDown" : "chevronRight"} size={16} />
                {new Date(s.scheduledAt).toLocaleString()} — {s.tally} {t("missionDetail.available", null, "available")}
                {isRecommended && poll.status === "open" && <span className="tag" style={{ background: "var(--accent)", color: "#fff", marginLeft: 8 }}><Icon name="star" size={12} style={{marginRight: 4}}/>{t("status.recommended", null, "Recommended")}</span>}
                {isPast && <span className="tag" style={{ background: "var(--panel-inset)", color: "var(--text-faint)", marginLeft: 8 }}>{t("status.expired", null, "Expired")}</span>}
              </span>
              <div>
                {poll.status === "open" && !isPast && (
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories } = useMeta();
  const [tab, setTab] = useState(() => searchParams.get("tab") || "overview");
  const [data, setData] = useState(null);
  const [refetching, setRefetching] = useState(false);
  const mountedRef = useRef(false);
  const tabBarRef = useRef(null);
  const [participants, setParticipants] = useState([]);
  const [responses, setResponses] = useState([]);
  const [checkinsData, setCheckinsData] = useState([]);
  const [error, setError] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [waitlist, setWaitlist] = useState([]);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
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
        setCheckinsData(d?.checkins || []);
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
        setCheckinsData(d?.checkins || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setRefetching(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion]);

  // Notification links deep-link here with ?tab=participants etc. — without
  // this, the URL param was only ever read once by the useState initializer
  // above, so a click while this page was already open (no remount) landed
  // on the right mission but silently showed Overview instead of the tab
  // the notification was actually about. Which tabs are valid depends on
  // the mission's category/ptype, so this waits for `data` before applying.
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (!urlTab || !data?.mission) return;
    const mission = data.mission;
    const validKeys = ["overview", "audience", "participants", "responses", "files", "payments"];
    if (mission.category === "sample") validKeys.push("shipments");
    if (mission.ptype === "interview") validKeys.push("interviews");
    if (mission.ptype === "focus") validKeys.push("focusgroup");
    if (mission.ptype === "trial") validKeys.push("checkins");
    if (validKeys.includes(urlTab)) setTab(prev => (prev === urlTab ? prev : urlTab));
  }, [searchParams, data]);

  const selectTab = (k) => {
    setTab(k);
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.set("tab", k);
      return p;
    }, { replace: true });
    // Overview is meant to be read top-down from the mission header; every
    // other tab is a utility view (data list, review queue, files) where
    // making the user manually scroll past the header + KPIs on every
    // single tab switch is pure friction.
    if (k === "overview") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      tabBarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

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
    tabs = [...tabs.slice(0, idx3), { k: "checkins", l: t("missionDetail.tabs.checkins", null, "Check-ins"), ic: "calendar", c: checkinsData.length }, ...tabs.slice(idx3)];
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
            <div className="row gap-3 wrap"><TypeTag cat={mission.category} categories={categories} /><span className="muted" style={{ fontSize: 13 }}><Icon name="mapPin" size={13} style={{ verticalAlign: -2 }} /> {mission.region}</span><span className="muted" style={{ fontSize: 13 }}><Icon name="calendar" size={13} style={{ verticalAlign: -2 }} /> {t("missionDetail.closes", null, "Closes")} {mission.deadline ? new Date(mission.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : t("missionDetail.closesSoon", null, "Soon")}</span></div>
          </div>
        </div>
        <div className="ph-actions" style={{ flexWrap: "wrap", alignItems: "center" }}>
          <UpdatingBadge show={refetching} />
          {mission.status === "active" && <Btn variant="ghost" icon="xCircle" onClick={() => handleStatusChange("closed")}>{t("actions.close", null, "Close")}</Btn>}
          {mission.status === "closed" && <Btn variant="ghost" icon="checkCircle" onClick={() => handleStatusChange("completed")}>{t("actions.complete", null, "Complete")}</Btn>}
          {(mission.status === "completed" || mission.status === "draft") && <Btn variant="ghost" icon="archive" onClick={() => handleStatusChange("archived")}>{t("actions.archive", null, "Archive")}</Btn>}
          <Btn variant="ghost" icon="edit" onClick={() => navigate(`/missions/${mission.id}/edit`)}>{t("actions.edit", null, "Edit")}</Btn>
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

      <div className="utabs sec" ref={tabBarRef}>{tabs.map(t => <button key={t.k} className={tab === t.k ? "on" : ""} onClick={() => selectTab(t.k)}><Icon name={t.ic} size={15} />{t.l}{t.c != null && <span className="cnt">{t.c}</span>}</button>)}</div>

      {tab === "overview" && <MissionOverview mission={mission} participants={participants} setTab={selectTab} navigate={navigate} />}
      {tab === "audience" && <MissionAudienceTab audience={data.audience} onEdit={() => navigate(`/missions/${id}/edit?step=3`)} />}
      {tab === "participants" && <ParticipantKanban mission={mission} participants={participants} setParticipants={setParticipants} onInvite={() => setShowInviteModal(true)} navigate={navigate} showToast={showToast} />}
      {tab === "responses" && <ResponseReview missionId={id} navigate={navigate} showToast={showToast} tabBarRef={tabBarRef} />}
      {tab === "shipments" && <MissionShipmentsTab missionId={id} />}
      {tab === "interviews" && <MissionInterviewsTab missionId={id} />}
      {tab === "focusgroup" && <MissionFocusGroupTab mission={mission} missionId={id} onParticipantRemoved={handleParticipantRemoved} showToast={showToast} />}
      {tab === "checkins" && <MissionCheckinsTab checkins={checkinsData} />}
      {tab === "files" && <MissionFilesTab missionId={data.mission.id} files={data.files} />}
      {tab === "payments" && <MissionPaymentsTab payments={data.payments} navigate={navigate} missionId={id} />}

      {showInviteModal && mission && (
        <InviteValidatorModal mission={mission} onClose={(invited) => {
          setShowInviteModal(false);
          if (invited) {
            api.mission(id).then(d => {
              setData(d);
              setParticipants(d?.participants?.map(p => ({ ...p })) || []);
            });
          }
        }} />
      )}
      {showWaitlistModal && mission && waitlist.length > 0 && (
        <WaitlistInviteModal mission={mission} waitlist={waitlist} onClose={() => setShowWaitlistModal(false)} showToast={showToast} />
      )}
    </div>
  );
}

function MissionCheckinsTab({ checkins }) {
  const { t } = useTranslation();
  if (!checkins || checkins.length === 0) return <div className="card rise" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>{t("missionDetail.noCheckinsYet", null, "No validators have submitted check-ins yet.")}</div>;

  return (
    <div className="col gap-3 sec">
      {checkins.map(r => (
        <div key={r.id} className="card rise" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div className="row gap-2" style={{ alignItems: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{r.name}</div>
                {r.stage === "failed" && (
                  <span title={t("status.failedHint", null, "Auto-failed by the system for missing daily check-ins — not a builder rejection.")}
                    style={{ fontSize: 9, padding: "2px 6px", background: "var(--warning, #c2710c)", color: "#fff", borderRadius: 12, fontWeight: 600, cursor: "help" }}>
                    {t("status.failed", null, "Failed — missed check-ins")}
                  </span>
                )}
              </div>
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
