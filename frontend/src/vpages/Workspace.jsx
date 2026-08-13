import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Btn } from "../components/ui";
import { vapi } from "../vapi/client";
import { useVAuth } from "../vcontext/VAuthContext";
import { useTranslation } from "../i18n/index.jsx";

function Timer({ secs, onDone, taskKey, isDone }) {
  const { t } = useTranslation();
  const getInitialRem = () => {
    if (!taskKey) return secs;
    const startStr = localStorage.getItem("timer_start_" + taskKey);
    if (startStr) {
      const elapsed = Math.floor((Date.now() - parseInt(startStr)) / 1000);
      return Math.max(0, secs - elapsed);
    }
    localStorage.setItem("timer_start_" + taskKey, Date.now().toString());
    return secs;
  };
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  const [rem, setRem] = useState(getInitialRem);
  const done = rem <= 0 || rem === 9999;
  useEffect(() => {
    if (done) { 
      if (!isDone) onDoneRef.current?.(); 
      return; 
    }
    const id = setInterval(() => setRem(r => r - 1), 1000);
    return () => clearInterval(id);
  }, [done, isDone]);
  const m = Math.floor(Math.abs(rem) / 60), s = Math.abs(rem) % 60;
  const cls = done ? "done" : rem < 30 ? "warn" : "";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 14px",
      borderRadius: 20, fontFamily: "var(--mono)", fontWeight: 600, fontSize: 14,
      border: `1.5px solid ${done ? "color-mix(in srgb, var(--success) 35%, transparent)" : "var(--border)"}`,
      background: done ? "var(--success-weak)" : "var(--panel)",
      color: done ? "var(--success)" : rem < 30 ? "var(--warning)" : "var(--text)",
      transition: "all .3s",
    }}>
      <Icon name="clock" size={14} />
      {done || rem === 9999 ? `✓ ${t("status.completed", null, "Completed")}` : `${m}:${String(s).padStart(2, "0")} ${t("missions.remaining", null, "remaining")}`}
    </span>
  );
}

function RatingQ({ ans, setAns, readOnly }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {[1, 2, 3, 4, 5].map(v => (
        <button key={v} disabled={readOnly} onClick={() => setAns(v)} style={{
          width: 40, height: 40, borderRadius: "var(--radius-sm)",
          border: `1px solid ${ans >= v ? "var(--warning)" : "var(--border)"}`,
          background: ans >= v ? "var(--warning)" : "var(--panel)",
          display: "grid", placeItems: "center", cursor: readOnly ? "default" : "pointer", transition: "all .12s",
          opacity: readOnly && ans < v ? 0.6 : 1,
        }}>
          <svg viewBox="0 0 24 24" width={18} height={18} fill={ans >= v ? "#fff" : "none"} stroke={ans >= v ? "#fff" : "var(--border-strong)"} strokeWidth="1.8" strokeLinejoin="round">
            <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function MCQ({ q, ans, setAns, readOnly }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {q.options.map(o => (
        <button key={o} disabled={readOnly} onClick={() => setAns(o)} style={{
          padding: "8px 16px", borderRadius: 30,
          border: `1.5px solid ${ans === o ? "var(--accent)" : "var(--border)"}`,
          background: ans === o ? "var(--accent-weak)" : "var(--panel)",
          color: ans === o ? "var(--accent)" : "var(--text-muted)",
          fontSize: 13.5, fontWeight: 600, cursor: readOnly ? "default" : "pointer", transition: "all .13s",
          opacity: readOnly && ans !== o ? 0.6 : 1,
        }}>{o}</button>
      ))}
    </div>
  );
}

function YNQ({ ans, detail, setAns, setDetail, readOnly }) {
  const { t } = useTranslation();
  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: ans === "yes" ? 12 : 0 }}>
        {["yes", "no"].map(v => (
          <button key={v} disabled={readOnly} onClick={() => setAns(ans === v ? null : v)} style={{
            flex: 1, padding: 11, borderRadius: "var(--radius-sm)",
            border: `1.5px solid ${ans === v ? (v === "yes" ? "var(--success)" : "var(--danger)") : "var(--border)"}`,
            background: ans === v ? (v === "yes" ? "var(--success-weak)" : "var(--danger-weak)") : "var(--panel)",
            color: ans === v ? (v === "yes" ? "var(--success)" : "var(--danger)") : "var(--text-muted)",
            fontSize: 14, fontWeight: 700, cursor: readOnly ? "default" : "pointer", transition: "all .13s",
            opacity: readOnly && ans !== v ? 0.6 : 1,
          }}>{v === "yes" ? t("actions.yes", null, "Yes") : t("actions.no", null, "No")}</button>
        ))}
      </div>
      {ans === "yes" && <textarea className="field" placeholder={t("missions.tellUsMoreBroken", null, "Tell us more — what was confusing or broken?")} rows={3} disabled={readOnly} value={detail || ""} onChange={e => setDetail(e.target.value)} />}
    </div>
  );
}

const SEV = {
  crit: { l: "Critical", color: "var(--danger)", bg: "var(--danger-weak)" },
  imp: { l: "Important", color: "var(--warning)", bg: "var(--warning-weak)" },
  nice: { l: "Nice to have", color: "var(--success)", bg: "var(--success-weak)" },
};

export default function Workspace() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { validator } = useVAuth();
  const [mission, setMission] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [curIdx, setCurIdx] = useState(0);
  const [stepsDone, setStepsDone] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [timerDone, setTimerDone] = useState([]);
  const [proofUploaded, setProofUploaded] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState(null);
  const [isRevision, setIsRevision] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");
  const [loadError, setLoadError] = useState(null);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (loading || isReadOnly) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timerId = setTimeout(() => {
      saveDraft(curIdx);
    }, 1200);
    return () => clearTimeout(timerId);
  }, [answers, proofUploaded]);

  useEffect(() => {
    (async () => {
      try {
        const data = await vapi.workspaceData(id);
        const t = data.tasks || [];
        setMission(data.mission);
        setTasks(t);
        setScheduleStatus(data.scheduleStatus);
        if (data.responses && !data.isDraft) {
          setIsReadOnly(true);
          setAnswers(data.responses);
          setStepsDone(t.map(tk => new Set(tk.steps.map((_, j) => j))));
          setTimerDone(t.map(() => true));
          setProofUploaded(t.map((_, i) => data.responses[i]?._proof || false));
        } else {
          let savedAnswers = t.map(() => ({}));
          let savedIdx = 0;
          if (data.responses && data.isDraft) {
            // A real draft-save wraps data_json as {answers, curIdx}. A
            // revision-requested response still holds whatever the last
            // *submit* stored instead — a bare per-task answers array, with
            // no curIdx — so detect which shape we actually got.
            const wrapped = data.responses && !Array.isArray(data.responses) && Array.isArray(data.responses.answers);
            const rawAnswers = wrapped ? data.responses.answers : (Array.isArray(data.responses) ? data.responses : []);
            savedAnswers = t.map((_, i) => rawAnswers[i] || {});
            savedIdx = wrapped ? (data.responses.curIdx || 0) : 0;
            setCurIdx(savedIdx);
          }
          setIsRevision(!!data.isRevision);
          setRevisionReason(data.revisionReason || "");
          setAnswers(savedAnswers);
          setStepsDone(t.map((tk, i) => {
             const hasAns = savedAnswers[i] && Object.keys(savedAnswers[i]).length > 0;
             return hasAns ? new Set(tk.steps.map((_, j) => j)) : new Set();
          }));
          setTimerDone(t.map((_, i) => i < savedIdx));
          setProofUploaded(t.map((_, i) => savedAnswers[i]?._proof || false));
        }
      } catch (err) {
        // do not fallback to mock
        setTasks([]);
        if (err?.code === "UNSUPPORTED_WORKSPACE_TASK") setLoadError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="page rise"><div className="muted">{t("missions.loadingWorkspace", null, "Loading workspace…")}</div></div>;

  if (tasks.length === 0) return (
    <div className="page rise" style={{ textAlign: "center", paddingTop: 80 }}>
      <Icon name="alertCircle" size={48} style={{ color: "var(--text-muted)", marginBottom: 16 }} />
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>{loadError ? t("missions.cantOpenHere", null, "Can't open this mission here") : t("missions.noTasksFound", null, "No tasks found")}</h2>
      <p style={{ color: "var(--text-muted)" }}>{loadError || t("missions.noTasksDesc", null, "This mission does not have any tasks generated yet.")}</p>
      <Btn variant="primary" style={{ marginTop: 24 }} onClick={() => navigate("/validator/missions")}>{t("actions.goBack", null, "Go Back")}</Btn>
    </div>
  );

  const task = tasks[curIdx];
  if (!task) return null;

  const sev = SEV[task.severity] || SEV.imp;
  SEV.crit.l = t("missions.sevCrit", null, "Critical"); SEV.imp.l = t("missions.sevImp", null, "Important"); SEV.nice.l = t("missions.sevNice", null, "Nice to have");
  const stepsComplete = stepsDone[curIdx]?.size === task.steps.length;
  const allAnswered = task.questions.every(q => answers[curIdx]?.[q.id] !== undefined);
  const proofOk = !task.proof || proofUploaded[curIdx];
  const isFinalTask = curIdx === tasks.length - 1;
  const requiresLiveSession = mission?.ptype === "interview" || mission?.ptype === "focus";
  const liveSessionOk = !isFinalTask || !requiresLiveSession || scheduleStatus === "completed";
  const canNext = timerDone[curIdx] && stepsComplete && allAnswered && proofOk && liveSessionOk;

  const toggleStep = (si) => {
    setStepsDone(p => { const a = [...p]; const s = new Set(a[curIdx]); s.has(si) ? s.delete(si) : s.add(si); a[curIdx] = s; return a; });
  };
  const setAns = (qid, val) => {
    setAnswers(p => { const a = [...p]; a[curIdx] = { ...a[curIdx], [qid]: val }; return a; });
  };
  async function saveDraft(newIdx = curIdx) {
    if (isReadOnly) return;
    try {
      const finalAnswers = answers.map((ans, i) => {
        const c = { ...ans };
        if (proofUploaded[i]) c._proof = proofUploaded[i];
        return c;
      });
      await vapi.saveWorkspaceDraft(id, { answers: finalAnswers, curIdx: newIdx });
    } catch (e) {
      console.warn("Auto-save failed", e);
    }
  }

  const goNext = async () => {
    if (curIdx === tasks.length - 1) {
      setSubmitting(true);
      try {
        const finalAnswers = answers.map((ans, i) => {
          const c = { ...ans };
          if (proofUploaded[i]) c._proof = proofUploaded[i];
          return c;
        });
        await vapi.submitWorkspaceData(id, { answers: finalAnswers });
      } catch (err) {
        console.error("Submission failed:", err);
      }
      setShowSummary(true);
      setSubmitting(false);
    } else {
      setCurIdx(i => i + 1);
      window.scrollTo(0, 0);
      saveDraft(curIdx + 1);
    }
  };

  if (showSummary) return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--bg)" }}>
      <div className="rise" style={{ maxWidth: 480, textAlign: "center" }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: "var(--success-weak)", display: "grid", placeItems: "center", margin: "0 auto 22px" }}>
          <Icon name="check" size={40} style={{ color: "var(--success)" }} />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 10px" }}>{t("missions.allTasksComplete", null, "All tasks complete")}</h1>
        <p style={{ color: "var(--text-muted)", margin: "0 0 26px", fontSize: 15 }}>{t("missions.responsesSubmittedReview", null, "Your responses have been submitted and are being reviewed.")}</p>
        <div className="card" style={{ padding: "16px 20px", marginBottom: 22, textAlign: "left" }}>
          {tasks.map((t, i) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--success)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Icon name="check" size={12} style={{ color: "#fff" }} />
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{t.title}</span>
              <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-faint)" }}>{Math.ceil(t.min_time_seconds / 60)} min</span>
            </div>
          ))}
        </div>
        <Btn variant="primary" onClick={() => navigate("/validator/missions")}>{t("actions.backToMyMissions", null, "Back to My Missions")}</Btn>
      </div>
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside style={{ background: "var(--panel)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ padding: "20px 18px 14px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2, marginBottom: 4 }}>{mission?.name || t("missions.validationMission", null, "Validation Mission")}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{mission?.brand || t("missions.missionBrief", null, "Mission brief")}</div>
        </div>
        <div style={{ padding: "12px 0", flex: 1 }}>
          {(mission?.ptype === "interview" || mission?.ptype === "focus") && (
            <button onClick={() => navigate(`/validator/missions/${id}/schedule`)} style={{ display: "flex", width: "100%", textAlign: "left", gap: 13, alignItems: "flex-start", padding: "10px 18px", borderBottom: "1px solid var(--border)", marginBottom: 12, paddingBottom: 16, background: "transparent", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", outline: "none" }}>
               <span style={{
                  width: 24, height: 24, borderRadius: "50%", display: "grid", placeItems: "center",
                  flexShrink: 0, zIndex: 1,
                  background: scheduleStatus === "completed" ? "var(--success)" : "var(--panel)",
                  border: `1.5px solid ${scheduleStatus === "completed" ? "var(--success)" : "var(--warning)"}`,
                  color: scheduleStatus === "completed" ? "#fff" : "var(--warning)",
                }}>
                  {scheduleStatus === "completed" ? <Icon name="check" size={12} /> : (mission?.ptype === "focus" ? <Icon name="users" size={11} /> : <Icon name="video" size={11} />)}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25, color: "var(--text)" }}>{mission?.ptype === "focus" ? t("missions.focusGroup", null, "Focus Group") : t("missions.liveInterview", null, "Live Interview")}</div>
                  <div style={{ fontSize: 11.5, color: scheduleStatus === "completed" ? "var(--success)" : "var(--warning)", marginTop: 2 }}>
                    {scheduleStatus === "completed" ? t("status.completed", null, "Completed") : scheduleStatus === "accepted" ? t("status.confirmed", null, "Confirmed") : t("missions.pendingSchedule", null, "Pending schedule")}
                  </div>
                </div>
            </button>
          )}
          {tasks.map((t, i) => {
            const state = i < curIdx ? "done" : i === curIdx ? "active" : "locked";
            return (
              <div key={t.id} style={{ display: "flex", gap: 13, alignItems: "flex-start", padding: "10px 18px", opacity: state === "locked" ? 0.45 : 1 }}>
                <span style={{
                  width: 24, height: 24, borderRadius: "50%", display: "grid", placeItems: "center",
                  fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, flexShrink: 0, zIndex: 1,
                  background: state === "done" ? "var(--success)" : state === "active" ? "var(--accent)" : "var(--panel)",
                  border: `1.5px solid ${state === "done" ? "var(--success)" : state === "active" ? "var(--accent)" : "var(--border-strong)"}`,
                  color: state === "done" || state === "active" ? "#fff" : "var(--text-faint)",
                  boxShadow: state === "active" ? "0 0 0 4px var(--accent-weak)" : undefined,
                }}>
                  {state === "done" ? <Icon name="check" size={12} /> : state === "locked" ? <Icon name="lock" size={11} /> : i + 1}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25 }}>{t.title}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{Math.ceil(t.min_time_seconds / 60)} min</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: "14px 18px", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-faint)", marginBottom: 6 }}>
            <span>{t("missions.progress", null, "Progress")}</span>
            <span style={{ fontFamily: "var(--mono)", fontWeight: 600, color: "var(--text)" }}>{curIdx + 1}/{tasks.length}</span>
          </div>
          <div style={{ height: 6, borderRadius: 20, background: "var(--panel-inset)", overflow: "hidden" }}>
            <div style={{ width: `${(curIdx / tasks.length) * 100}%`, height: "100%", borderRadius: 20, background: "linear-gradient(90deg,var(--accent),var(--accent-2))", transition: "width .4s" }} />
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ display: "flex", flexDirection: "column", background: "var(--bg)" }}>
        {/* Topbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 28px", height: 60, background: "color-mix(in srgb,var(--bg) 86%,transparent)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text-muted)" }}>{t("missions.taskNOfTotal", { n: curIdx + 1, total: tasks.length }, `Task ${curIdx + 1} of ${tasks.length}`)} {isReadOnly && t("missions.reviewMode", null, "(Review Mode)")}</span>
          <span style={{ flex: 1 }} />
          <Timer key={curIdx} taskKey={`task_timer_${id}_${task.id}`} secs={isReadOnly ? 0 : task.min_time_seconds} isDone={timerDone[curIdx]} onDone={() => setTimerDone(p => { 
            if (p[curIdx] === true) return p;
            const a = [...p]; a[curIdx] = true; return a; 
          })} />
          <button className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: 13 }} onClick={async () => { await saveDraft(curIdx); navigate("/validator/missions"); }}>
            <Icon name="x" size={14} /> {t("actions.exit", null, "Exit")}
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "28px 36px 140px", maxWidth: 780, margin: "0 auto", width: "100%" }} className="rise">
          {isRevision && revisionReason && (
            <div className="card" style={{ padding: "14px 18px", marginBottom: 18, borderColor: "var(--warning)", background: "var(--warning-weak, color-mix(in srgb, var(--warning) 12%, transparent))" }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--warning)", marginBottom: 6 }}>
                {t("missions.revisionRequestedBy", null, "Revision requested — builder's comments")}
              </div>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>{revisionReason}</p>
            </div>
          )}
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 800, background: sev.bg, color: sev.color }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />{sev.l}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-.025em" }}>{task.title}</h2>
          </div>

          {/* Steps */}
          <div className="card" style={{ padding: "16px 20px", marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
              {t("missions.steps", null, "Steps")} <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>
            {task.steps.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
                <div onClick={() => !isReadOnly && toggleStep(i)} style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0, cursor: isReadOnly ? "default" : "pointer", display: "grid", placeItems: "center",
                  background: stepsDone[curIdx]?.has(i) ? "var(--success)" : "var(--panel)",
                  border: `1.5px solid ${stepsDone[curIdx]?.has(i) ? "var(--success)" : "var(--border-strong)"}`,
                  transition: "all .15s",
                }}>
                  {stepsDone[curIdx]?.has(i) && <Icon name="check" size={13} style={{ color: "#fff" }} />}
                </div>
                <span style={{ fontSize: 14, lineHeight: 1.5, textDecoration: stepsDone[curIdx]?.has(i) ? "line-through" : "none", color: stepsDone[curIdx]?.has(i) ? "var(--text-faint)" : "var(--text)" }}>{s}</span>
              </div>
            ))}
          </div>

          {/* Questions */}
          <div className="card" style={{ padding: "16px 20px", marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
              {t("missions.questions", null, "Questions")} <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>
            {task.questions.map((q, i) => (
              <div key={q.id} style={{ paddingBottom: 20, marginBottom: 20, borderBottom: i < task.questions.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, color: "var(--text-faint)", paddingTop: 3, flexShrink: 0 }}>Q{i + 1}</span>
                  <span style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.4 }}>{q.text}</span>
                </div>
                {q.type === "rating" && <RatingQ ans={answers[curIdx]?.[q.id]} setAns={v => setAns(q.id, v)} readOnly={isReadOnly} />}
                {q.type === "multiple_choice" && <MCQ q={q} ans={answers[curIdx]?.[q.id]} setAns={v => setAns(q.id, v)} readOnly={isReadOnly} />}
                {q.type === "yes_no_detail" && <YNQ ans={answers[curIdx]?.[q.id]} detail={answers[curIdx]?.[q.id + "_detail"]} setAns={v => setAns(q.id, v)} setDetail={v => setAns(q.id + "_detail", v)} readOnly={isReadOnly} />}
                {q.type === "text" && <textarea className="field" placeholder={t("missions.typeYourAnswer", null, "Type your answer…")} rows={3} disabled={isReadOnly} value={answers[curIdx]?.[q.id] || ""} onChange={e => setAns(q.id, e.target.value)} />}
              </div>
            ))}
          </div>

          {/* Proof upload */}
          {task.proof && (
            <div className="card" style={{ padding: "16px 20px", marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
                {t("missions.proofRequired", null, "Proof required — screenshot or video")} <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>
              {proofUploaded[curIdx] ? (
                <div style={{ border: "2px solid var(--success)", borderRadius: "var(--radius)", padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", background: "var(--success-weak)" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--success-weak)", display: "grid", placeItems: "center", marginBottom: 12 }}>
                    <Icon name="check" size={26} style={{ color: "var(--success)" }} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--success)" }}>{t("missions.fileUploaded", null, "File uploaded")}</div>
                  {!isReadOnly && <button className="btn btn-quiet" style={{ marginTop: 8, fontSize: 12 }} onClick={() => setProofUploaded(p => { const a = [...p]; a[curIdx] = false; return a; })}>{t("actions.removeReupload", null, "Remove & re-upload")}</button>}
                </div>
              ) : (
                <label style={{ border: "2px dashed var(--border)", borderRadius: "var(--radius)", padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", cursor: uploadingProof ? "not-allowed" : "pointer", background: "var(--panel-2)", opacity: uploadingProof ? 0.7 : 1, transition: "all .15s" }}>
                  <input type="file" accept="image/png, image/jpeg, image/webp, video/mp4, video/webm, video/quicktime" style={{ display: "none" }} disabled={uploadingProof} onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setUploadingProof(true);
                    try {
                      const res = await vapi.uploadWorkspaceProof(id, file);
                      setProofUploaded(p => { const a = [...p]; a[curIdx] = res.file.filename; return a; });
                    } catch (err) {
                      alert(err.message || t("missions.failedUploadProof", null, "Failed to upload proof"));
                    } finally {
                      setUploadingProof(false);
                    }
                  }} />
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--panel-inset)", display: "grid", placeItems: "center", marginBottom: 12 }}>
                    {uploadingProof ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : <Icon name="upload" size={26} style={{ color: "var(--text-faint)" }} />}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{uploadingProof ? t("actions.uploading", null, "Uploading...") : t("actions.dropFileHere", null, "Drop file here")}</div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-faint)" }}>{t("missions.acceptedFileTypes", null, "or click to browse — PNG, JPG, WebP, MP4, WebM, MOV accepted")}</p>
                </label>
              )}
            </div>
          )}

          {/* Readiness checklist */}
          {!isReadOnly && !canNext && (
            <div style={{ background: "var(--warning-weak)", border: "1px solid color-mix(in srgb,var(--warning) 30%,transparent)", borderRadius: "var(--radius)", padding: "12px 16px", fontSize: 13, color: "var(--warning)" }}>
              <b>{t("missions.beforeContinuing", null, "Before continuing:")}</b>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, display: "grid", gap: 4 }}>
                {!timerDone[curIdx] && <li>{t("missions.waitForTimer", null, "Wait for the timer to reach zero")}</li>}
                {!stepsComplete && <li>{t("missions.checkOffSteps", null, "Check off all steps above")}</li>}
                {!allAnswered && <li>{t("missions.answerAllQuestions", null, "Answer all questions")}</li>}
                {!proofOk && <li>{t("missions.uploadProof", null, "Upload a screenshot as proof")}</li>}
                {!liveSessionOk && <li>{t("missions.waitForLiveSessionCompletion", { session: mission?.ptype === "focus" ? t("missions.focusGroupText", null, "focus group") : t("missions.interviewText", null, "live interview") }, `Wait for the builder to mark the ${mission?.ptype === "focus" ? "focus group" : "live interview"} as completed`)}</li>}
              </ul>
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div style={{ position: "fixed", bottom: 0, left: 240, right: 0, display: "flex", alignItems: "center", gap: 14, padding: "14px 36px", background: "color-mix(in srgb,var(--bg) 90%,transparent)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--border)", zIndex: 30 }}>
          <button className="btn btn-ghost" onClick={() => { if (curIdx > 0) { setCurIdx(i => i - 1); window.scrollTo(0, 0); saveDraft(curIdx - 1); } }} disabled={curIdx === 0}>
            <Icon name="arrowLeft" size={16} /> {t("actions.previous", null, "Previous")}
          </button>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 13, color: "var(--text-faint)", fontFamily: "var(--mono)" }}>{curIdx + 1} / {tasks.length}</span>
          <span style={{ flex: 1 }} />
          <Btn variant="primary" onClick={isReadOnly ? (curIdx === tasks.length - 1 ? () => navigate("/validator/missions") : goNext) : goNext} disabled={!isReadOnly && (!canNext || submitting)} style={{ opacity: isReadOnly || canNext ? 1 : 0.55 }}>
            {isReadOnly ? (curIdx === tasks.length - 1 ? t("actions.backToMissions", null, "Back to Missions") : t("actions.nextTask", null, "Next task")) : (submitting ? t("actions.submitting", null, "Submitting…") : curIdx === tasks.length - 1 ? t("actions.submitAllResponses", null, "Submit all responses") : t("actions.nextTask", null, "Next task"))}
            {curIdx < tasks.length - 1 && <Icon name="arrowRight" size={16} />}
          </Btn>
        </div>
      </div>
    </div>
  );
}
