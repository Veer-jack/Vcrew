import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Btn } from "../components/ui";
import { vapi } from "../vapi/client";
import { useVAuth } from "../vcontext/VAuthContext";

function Timer({ secs, onDone }) {
  const [rem, setRem] = useState(secs);
  const done = rem <= 0;
  useEffect(() => {
    if (done) { onDone?.(); return; }
    const id = setInterval(() => setRem(r => r - 1), 1000);
    return () => clearInterval(id);
  }, [done]);
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
      {done ? "✓ Time met" : `${m}:${String(s).padStart(2, "0")} remaining`}
    </span>
  );
}

function RatingQ({ ans, setAns }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {[1, 2, 3, 4, 5].map(v => (
        <button key={v} onClick={() => setAns(v)} style={{
          width: 40, height: 40, borderRadius: "var(--radius-sm)",
          border: `1px solid ${ans >= v ? "var(--warning)" : "var(--border)"}`,
          background: ans >= v ? "var(--warning)" : "var(--panel)",
          display: "grid", placeItems: "center", cursor: "pointer", transition: "all .12s",
        }}>
          <svg viewBox="0 0 24 24" width={18} height={18} fill={ans >= v ? "#fff" : "none"} stroke={ans >= v ? "#fff" : "var(--border-strong)"} strokeWidth="1.8" strokeLinejoin="round">
            <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function MCQ({ q, ans, setAns }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {q.options.map(o => (
        <button key={o} onClick={() => setAns(o)} style={{
          padding: "8px 16px", borderRadius: 30,
          border: `1.5px solid ${ans === o ? "var(--accent)" : "var(--border)"}`,
          background: ans === o ? "var(--accent-weak)" : "var(--panel)",
          color: ans === o ? "var(--accent)" : "var(--text-muted)",
          fontSize: 13.5, fontWeight: 600, cursor: "pointer", transition: "all .13s",
        }}>{o}</button>
      ))}
    </div>
  );
}

function YNQ({ ans, setAns }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: ans === "yes" ? 12 : 0 }}>
        {["yes", "no"].map(v => (
          <button key={v} onClick={() => setAns(ans === v ? null : v)} style={{
            flex: 1, padding: 11, borderRadius: "var(--radius-sm)",
            border: `1.5px solid ${ans === v ? (v === "yes" ? "var(--success)" : "var(--danger)") : "var(--border)"}`,
            background: ans === v ? (v === "yes" ? "var(--success-weak)" : "var(--danger-weak)") : "var(--panel)",
            color: ans === v ? (v === "yes" ? "var(--success)" : "var(--danger)") : "var(--text-muted)",
            fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all .13s",
          }}>{v === "yes" ? "Yes" : "No"}</button>
        ))}
      </div>
      {ans === "yes" && <textarea className="field" placeholder="Tell us more — what was confusing or broken?" rows={3} />}
    </div>
  );
}

const SEV = {
  crit: { l: "Critical", color: "var(--danger)", bg: "var(--danger-weak)" },
  imp: { l: "Important", color: "var(--warning)", bg: "var(--warning-weak)" },
  nice: { l: "Nice to have", color: "var(--success)", bg: "var(--success-weak)" },
};

export default function Workspace() {
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

  useEffect(() => {
    (async () => {
      try {
        const data = await vapi.get(`/v/missions/${id}/workspace`);
        const t = data.tasks || [];
        setMission(data.mission);
        setTasks(t);
        setStepsDone(t.map(() => new Set()));
        setAnswers(t.map(() => ({})));
        setTimerDone(t.map(() => false));
        setProofUploaded(t.map(() => false));
      } catch {
        // use mock for now
        const mock = [
          { id: 1, title: "Sign up & onboarding", severity: "crit", min_time_seconds: 10, steps: ["Open the app", "Create account", "Complete onboarding", "Reach dashboard"], questions: [{ id: "q1", text: "How many steps did signup take?", type: "multiple_choice", options: ["1–2", "3–4", "5+"] }, { id: "q2", text: "Was anything confusing?", type: "yes_no_detail" }, { id: "q3", text: "Rate the signup experience", type: "rating", scale: 5 }], proof: true },
          { id: 2, title: "Core product flow", severity: "crit", min_time_seconds: 10, steps: ["Browse main content", "Try the core feature", "Complete one full action"], questions: [{ id: "q4", text: "How easy was the core flow?", type: "rating", scale: 5 }, { id: "q5", text: "Describe your experience", type: "text" }], proof: true },
          { id: 3, title: "Overall feedback", severity: "imp", min_time_seconds: 10, steps: ["Reflect on full experience", "Answer final questions"], questions: [{ id: "q6", text: "Would you use this again?", type: "yes_no_detail" }, { id: "q7", text: "Overall rating", type: "rating", scale: 5 }], proof: false },
        ];
        setTasks(mock);
        setStepsDone(mock.map(() => new Set()));
        setAnswers(mock.map(() => ({})));
        setTimerDone(mock.map(() => false));
        setProofUploaded(mock.map(() => false));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="page rise"><div className="muted">Loading workspace…</div></div>;

  const task = tasks[curIdx];
  if (!task) return null;

  const sev = SEV[task.severity] || SEV.imp;
  const stepsComplete = stepsDone[curIdx]?.size === task.steps.length;
  const allAnswered = task.questions.every(q => answers[curIdx]?.[q.id] !== undefined);
  const proofOk = !task.proof || proofUploaded[curIdx];
  const canNext = timerDone[curIdx] && stepsComplete && allAnswered && proofOk;

  const toggleStep = (si) => {
    setStepsDone(p => { const a = [...p]; const s = new Set(a[curIdx]); s.has(si) ? s.delete(si) : s.add(si); a[curIdx] = s; return a; });
  };
  const setAns = (qid, val) => {
    setAnswers(p => { const a = [...p]; a[curIdx] = { ...a[curIdx], [qid]: val }; return a; });
  };
  const goNext = async () => {
    if (curIdx === tasks.length - 1) {
      setSubmitting(true);
      try {
        await vapi.patch(`/v/missions/${id}/workspace/submit`, { answers });
      } catch {}
      setShowSummary(true);
      setSubmitting(false);
    } else {
      setCurIdx(i => i + 1);
      window.scrollTo(0, 0);
    }
  };

  if (showSummary) return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--bg)" }}>
      <div className="rise" style={{ maxWidth: 480, textAlign: "center" }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: "var(--success-weak)", display: "grid", placeItems: "center", margin: "0 auto 22px" }}>
          <Icon name="check" size={40} style={{ color: "var(--success)" }} />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 10px" }}>All tasks complete</h1>
        <p style={{ color: "var(--text-muted)", margin: "0 0 26px", fontSize: 15 }}>Your responses have been submitted and are being reviewed.</p>
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
        <Btn variant="primary" onClick={() => navigate("/validator/missions")}>Back to My Missions</Btn>
      </div>
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside style={{ background: "var(--panel)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ padding: "20px 18px 14px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2, marginBottom: 4 }}>{mission?.name || "Validation Mission"}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{mission?.brand || "Mission brief"}</div>
        </div>
        <div style={{ padding: "12px 0", flex: 1 }}>
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
            <span>Progress</span>
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
          <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text-muted)" }}>Task {curIdx + 1} of {tasks.length}</span>
          <span style={{ flex: 1 }} />
          <Timer secs={task.min_time_seconds} onDone={() => setTimerDone(p => { const a = [...p]; a[curIdx] = true; return a; })} />
          <button className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: 13 }} onClick={() => navigate("/validator/missions")}>
            <Icon name="x" size={14} /> Exit
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "28px 36px 140px", maxWidth: 780, margin: "0 auto", width: "100%" }} className="rise">
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
              Steps <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>
            {task.steps.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
                <div onClick={() => toggleStep(i)} style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0, cursor: "pointer", display: "grid", placeItems: "center",
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
              Questions <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>
            {task.questions.map((q, i) => (
              <div key={q.id} style={{ paddingBottom: 20, marginBottom: 20, borderBottom: i < task.questions.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, color: "var(--text-faint)", paddingTop: 3, flexShrink: 0 }}>Q{i + 1}</span>
                  <span style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.4 }}>{q.text}</span>
                </div>
                {q.type === "rating" && <RatingQ ans={answers[curIdx]?.[q.id]} setAns={v => setAns(q.id, v)} />}
                {q.type === "multiple_choice" && <MCQ q={q} ans={answers[curIdx]?.[q.id]} setAns={v => setAns(q.id, v)} />}
                {q.type === "yes_no_detail" && <YNQ ans={answers[curIdx]?.[q.id]} setAns={v => setAns(q.id, v)} />}
                {q.type === "text" && <textarea className="field" placeholder="Type your answer…" rows={3} onChange={e => setAns(q.id, e.target.value)} />}
              </div>
            ))}
          </div>

          {/* Proof upload */}
          {task.proof && (
            <div className="card" style={{ padding: "16px 20px", marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
                Proof required — screenshot <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>
              {proofUploaded[curIdx] ? (
                <div style={{ border: "2px solid var(--success)", borderRadius: "var(--radius)", padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", background: "var(--success-weak)" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--success-weak)", display: "grid", placeItems: "center", marginBottom: 12 }}>
                    <Icon name="check" size={26} style={{ color: "var(--success)" }} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--success)" }}>Screenshot uploaded</div>
                  <button className="btn btn-quiet" style={{ marginTop: 8, fontSize: 12 }} onClick={() => setProofUploaded(p => { const a = [...p]; a[curIdx] = false; return a; })}>Remove & re-upload</button>
                </div>
              ) : (
                <div onClick={() => setProofUploaded(p => { const a = [...p]; a[curIdx] = true; return a; })} style={{ border: "2px dashed var(--border)", borderRadius: "var(--radius)", padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", cursor: "pointer", background: "var(--panel-2)", transition: "all .15s" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--panel-inset)", display: "grid", placeItems: "center", marginBottom: 12 }}>
                    <Icon name="upload" size={26} style={{ color: "var(--text-faint)" }} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Drop screenshot here</div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-faint)" }}>or click to browse — PNG, JPG accepted</p>
                </div>
              )}
            </div>
          )}

          {/* Readiness checklist */}
          {!canNext && (
            <div style={{ background: "var(--warning-weak)", border: "1px solid color-mix(in srgb,var(--warning) 30%,transparent)", borderRadius: "var(--radius)", padding: "12px 16px", fontSize: 13, color: "var(--warning)" }}>
              <b>Before continuing:</b>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, display: "grid", gap: 4 }}>
                {!timerDone[curIdx] && <li>Wait for the timer to reach zero</li>}
                {!stepsComplete && <li>Check off all steps above</li>}
                {!allAnswered && <li>Answer all questions</li>}
                {!proofOk && <li>Upload a screenshot as proof</li>}
              </ul>
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div style={{ position: "fixed", bottom: 0, left: 240, right: 0, display: "flex", alignItems: "center", gap: 14, padding: "14px 36px", background: "color-mix(in srgb,var(--bg) 90%,transparent)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--border)", zIndex: 30 }}>
          <button className="btn btn-ghost" onClick={() => { if (curIdx > 0) { setCurIdx(i => i - 1); window.scrollTo(0, 0); } }} disabled={curIdx === 0}>
            <Icon name="arrowLeft" size={16} /> Previous
          </button>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 13, color: "var(--text-faint)", fontFamily: "var(--mono)" }}>{curIdx + 1} / {tasks.length}</span>
          <span style={{ flex: 1 }} />
          <Btn variant="primary" onClick={goNext} disabled={!canNext || submitting} style={{ opacity: canNext ? 1 : 0.55 }}>
            {submitting ? "Submitting…" : curIdx === tasks.length - 1 ? "Submit all responses" : "Next task"}
            {curIdx < tasks.length - 1 && <Icon name="arrowRight" size={16} />}
          </Btn>
        </div>
      </div>
    </div>
  );
}
