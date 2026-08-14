import React, { useState, useRef } from "react";
import { toast } from "react-hot-toast";
import Icon from "../components/Icon";
import { Btn } from "../components/ui";
import { api } from "../api/client";
import { useTranslation } from "../i18n/index.jsx";

const TC_PLATFORMS = ["Web", "iOS", "Android"];
const TC_GOALS = ["Core flow", "UX", "Willingness to pay", "All"];

const SEV = {
  crit: { l: "Critical", color: "var(--danger)", bg: "var(--danger-weak)" },
  imp:  { l: "Important", color: "var(--warning)", bg: "var(--warning-weak)" },
  nice: { l: "Nice to have", color: "var(--success)", bg: "var(--success-weak)" },
};

function TaskCard({ task, idx, total, dragging, dragOver, onDragStart, onDragOverCard, onDrop, onDragEnd, expanded, onToggle, onDelete, onEdit }) {
  const { t } = useTranslation();
  const sev = SEV[task.severity] || SEV.imp;
  const incomplete = task.steps.length === 0 || task.questions.length === 0;
  const sevLabel = {
    crit: t("testCases.severityCritical", null, "Critical"),
    imp: t("testCases.severityImportant", null, "Important"),
    nice: t("testCases.severityNiceToHave", null, "Nice to have"),
  };

  const updateStep = (stepIdx, val) => {
    const s = [...task.steps];
    s[stepIdx] = val;
    onEdit(idx, { steps: s });
  };
  
  const deleteStep = (stepIdx) => {
    const s = [...task.steps];
    s.splice(stepIdx, 1);
    onEdit(idx, { steps: s });
  };

  const updateQuestion = (qIdx, val) => {
    const qs = [...task.questions];
    qs[qIdx] = { ...qs[qIdx], text: val };
    onEdit(idx, { questions: qs });
  };
  
  const deleteQuestion = (qIdx) => {
    const qs = [...task.questions];
    qs.splice(qIdx, 1);
    onEdit(idx, { questions: qs });
  };

  const addQuestion = () => {
    const qs = [...task.questions, { id: "q" + Date.now(), text: "", type: "text" }];
    onEdit(idx, { questions: qs });
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={e => { e.preventDefault(); onDragOverCard(); }}
      onDrop={e => { e.preventDefault(); onDrop(); }}
      onDragEnd={onDragEnd}
      className={`card rise`} style={{
      overflow: "hidden",
      marginBottom: 10,
      border: incomplete ? "1.5px solid var(--danger)" : expanded ? "1.5px solid var(--accent)" : "1px solid var(--border)",
      boxShadow: dragOver ? "0 -2px 0 0 var(--accent)" : expanded ? "0 0 0 1px var(--accent)" : undefined,
      opacity: dragging ? 0.45 : 1,
      animationDelay: `${idx * 0.07}s`,
    }}>
      {/* Header */}
      <div
        onClick={onToggle}
        style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 14px", cursor: "pointer", userSelect: "none" }}
      >
        <span title={t("testCases.dragToReorder", null, "Drag to reorder")} style={{ cursor: "grab", color: "var(--text-faint)", flexShrink: 0, display: "grid", placeItems: "center" }} onClick={e => e.stopPropagation()}>
          <Icon name="moreVertical" size={14} />
        </span>
        <span style={{
          width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center",
          fontFamily: "var(--mono)", fontWeight: 600, fontSize: 11.5,
          background: "var(--accent-weak)", color: "var(--accent)", flexShrink: 0,
        }}>{idx + 1}</span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{task.title}</span>
        {incomplete && (
          <span title={t("testCases.taskIncomplete", null, "Needs at least 1 step and 1 question")} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 800, background: "var(--danger-weak)", color: "var(--danger)" }}>
            <Icon name="alertTriangle" size={11} />{t("testCases.incomplete", null, "Incomplete")}
          </span>
        )}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 800, background: sev.bg, color: sev.color }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
          {sevLabel[task.severity] || sevLabel.imp}
        </span>
        <button
            onClick={e => { e.stopPropagation(); onDelete(idx); }}
            style={{ width: 28, height: 28, borderRadius: 6, background: "var(--danger-weak)", border: "1px solid color-mix(in srgb,var(--danger) 25%,transparent)", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}
          ><Icon name="x" size={12} style={{ color: "var(--danger)" }} /></button>
          <Icon name={expanded ? "chevronDown" : "chevronRight"} size={15} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ padding: 14, borderTop: "1px solid var(--border)", background: "var(--panel-2)" }}>
          {/* Editable title */}
          <div style={{ marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>{t("testCases.taskTitle", null, "Task title")}</div>
            <input className="fin" value={task.title} onChange={e => onEdit(idx, { title: e.target.value })} onClick={e => e.stopPropagation()} style={{ fontSize: 14, fontWeight: 600 }} />
          </div>
          {/* Steps */}
          <div style={{ marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 9 }}>{t("testCases.steps", null, "Steps")}</div>
            <div style={{ display: "grid", gap: 7 }}>
              {task.steps.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13.5 }}>
                  <span style={{ width: 20, height: 20, borderRadius: 6, display: "grid", placeItems: "center", background: "var(--accent-weak)", color: "var(--accent)", fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                  <input className="fin" value={s} onChange={e => updateStep(i, e.target.value)} onClick={e => e.stopPropagation()} style={{ padding: "4px 8px", fontSize: 13, flex: 1 }} />
                  <button onClick={e => { e.stopPropagation(); deleteStep(i); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}><Icon name="trash" size={14} /></button>
                </div>
              ))}
            </div>
            <button className="btn btn-quiet" style={{ fontSize: 12, marginTop: 8 }} onClick={e => { e.stopPropagation(); onEdit(idx, { steps: [...task.steps, ""] }); }}>
              <Icon name="plus" size={12} /> {t("testCases.addStep", null, "Add step")}
            </button>
          </div>

          {/* Questions */}
          <div style={{ marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 9 }}>{t("testCases.questions", null, "Questions")}</div>
            <div style={{ display: "grid", gap: 7 }}>
              {task.questions.map((q, i) => (
                <div key={q.id} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "8px 10px", background: "var(--panel)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, color: "var(--text-faint)", paddingTop: 8, flexShrink: 0 }}>{t("testCases.questionN", { n: i + 1 }, `Q${i + 1}`)}</span>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input className="fin" value={q.text} onChange={e => updateQuestion(i, e.target.value)} onClick={e => e.stopPropagation()} style={{ padding: "4px 8px", fontSize: 13, flex: 1, fontWeight: 600 }} placeholder={t("testCases.askQuestionPlaceholder", null, "Ask a question...")} />
                      <button onClick={e => { e.stopPropagation(); deleteQuestion(i); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}><Icon name="trash" size={14} /></button>
                    </div>
                    <div>
                      <select className="fin" value={q.type} onChange={e => { const qs = [...task.questions]; qs[i] = { ...qs[i], type: e.target.value }; onEdit(idx, { questions: qs }); }} onClick={e => e.stopPropagation()} style={{ fontSize: 12, padding: "2px 8px", width: "auto", display: "inline-block" }}>
                        <option value="multiple_choice">{t("testCases.qTypeMultipleChoice", null, "Multiple choice")}</option>
                        <option value="yes_no_detail">{t("testCases.qTypeYesNoDetail", null, "Yes/No + detail")}</option>
                        <option value="rating">{t("testCases.qTypeRating", null, "Rating (1-5)")}</option>
                        <option value="text">{t("testCases.qTypeOpenText", null, "Open text")}</option>
                      </select>
                    </div>
                    {q.options && (
                      <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                        {q.options.map((o, oi) => (
                          <span key={oi} style={{ padding: "2px 9px", borderRadius: 20, background: "var(--panel-inset)", border: "1px solid var(--border)", fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)" }}>{o}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-quiet" style={{ fontSize: 12, marginTop: 8 }} onClick={e => { e.stopPropagation(); addQuestion(); }}>
              <Icon name="plus" size={12} /> {t("testCases.addQuestion", null, "Add question")}
            </button>
          </div>

          {/* Settings */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="eyebrow" style={{ letterSpacing: 0 }}>{t("testCases.severity", null, "Severity")}</span>
              <select className="fin" value={task.severity} onChange={e => onEdit(idx, { severity: e.target.value })} onClick={e => e.stopPropagation()} style={{ fontSize: 13, padding: "4px 8px", width: 130 }}>
                <option value="crit">{sevLabel.crit}</option>
                <option value="imp">{sevLabel.imp}</option>
                <option value="nice">{sevLabel.nice}</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="eyebrow" style={{ letterSpacing: 0 }}>{t("testCases.minTimeMin", null, "Min time (min)")}</span>
              <input type="number" min="1" className="fin" value={Math.ceil((task.min_time_seconds || 120) / 60)} onChange={e => onEdit(idx, { min_time_seconds: Math.max(1, parseInt(e.target.value || 1)) * 60 })} onClick={e => e.stopPropagation()} style={{ fontSize: 13, padding: "4px 8px", width: 60, textAlign: "center" }} />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", marginLeft: 10 }}>
              <input 
                type="checkbox" 
                checked={task.proof === "screenshot"} 
                onChange={e => onEdit(idx, { proof: e.target.checked ? "screenshot" : null })} 
                onClick={e => e.stopPropagation()} 
              />
              {t("testCases.requireProof", null, "Require screenshot or video proof")}
            </label>

            <div style={{ flex: 1 }} />

            <button className="btn" style={{ background: "var(--danger-weak)", color: "var(--danger)", border: "none", fontSize: 13 }} onClick={e => { e.stopPropagation(); onDelete(idx); }}>
              <Icon name="trash" size={14} /> {t("testCases.deleteTask", null, "Delete Task")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StepTestCases({ d, set }) {
  const { t } = useTranslation();
  const platformLabel = {
    Web: t("testCases.platformWeb", null, "Web"),
    iOS: t("testCases.platformIOS", null, "iOS"),
    Android: t("testCases.platformAndroid", null, "Android"),
  };
  const goalLabel = {
    "Core flow": t("testCases.goalCoreFlow", null, "Core flow"),
    UX: t("testCases.goalUX", null, "UX"),
    "Willingness to pay": t("testCases.goalWillingnessToPay", null, "Willingness to pay"),
    All: t("testCases.goalAll", null, "All"),
  };
  // Lives on the shared wizard draft (not local state) so it survives
  // navigating away to another step and back — StepTestCases fully
  // unmounts/remounts on step switches (CreateMissionWizard swaps the
  // rendered step by array index), which would otherwise wipe it while
  // d.tasks (already on the draft) kept surviving, silently emptying the
  // form under already-generated test cases.
  const form = d.testCaseForm || { desc: "", url: "", platforms: [], goals: [], users: "" };
  const [genState, setGenState] = useState("idle"); // idle | fetching | loading | done
  const [fallbackReason, setFallbackReason] = useState(null); // null when the current tasks came from a real AI generation
  const [urlFetched, setUrlFetched] = useState(false);
  const [urlContext, setUrlContext] = useState(null);
  const [urlFormatInvalid, setUrlFormatInvalid] = useState(false);
  const [fetchFailReason, setFetchFailReason] = useState(null);
  const [expanded, setExpanded] = useState(null);
  // The generated test cases render in the right-hand column, which on
  // narrower viewports sits below the fold relative to the form — scroll it
  // into view the moment generation starts so the loading state (and then
  // the results) are immediately visible instead of requiring a manual scroll.
  const resultsRef = useRef(null);

  const tasks = d.tasks || [];
  const patch = (p) => set({ testCaseForm: { ...form, ...p } });
  const toggleChip = (key, val) => {
    const cur = form[key] || [];
    patch({ [key]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] });
  };
  const descOk = form.desc.trim().length > 0;
  const platformOk = form.platforms.length > 0;
  const goalsOk = form.goals.length > 0;
  const usersOk = form.users.trim().length > 0;
  const canGen = descOk && platformOk && goalsOk && usersOk;
  const missingFields = [
    !descOk && t("testCases.whatDidYouBuild", null, "What did you build?"),
    !platformOk && t("testCases.platform", null, "Platform"),
    !goalsOk && t("testCases.validationGoals", null, "Validation goals"),
    !usersOk && t("testCases.targetUsers", null, "Target users"),
  ].filter(Boolean);
  const hasTasks = tasks.length > 0;
  const totalMins = tasks.reduce((a, t) => a + (t.min_time_seconds || 120), 0);

  const isValidUrl = (u) => {
    try {
      const parsed = new URL(u);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const fetchUrl = async () => {
    if (!form.url.trim()) return;
    if (!isValidUrl(form.url.trim())) {
      setUrlFormatInvalid(true);
      setUrlFetched(true);
      setUrlContext(null);
      return;
    }
    setUrlFormatInvalid(false);
    setGenState("fetching");
    try {
      const res = await api.post("/missions/fetch-url-context", { url: form.url });
      setUrlContext(res.context || null);
      setFetchFailReason(res.context ? null : (res.reason || "unreachable"));
    } catch {
      setUrlContext(null);
      setFetchFailReason("unreachable");
    } finally {
      setUrlFetched(true);
      setGenState("idle");
    }
  };

  const generate = async () => {
    if (!canGen) return;
    if (hasTasks && !window.confirm(t("testCases.regenerateConfirm", null, "Generate new test cases? This replaces the current ones, including any you've added or edited."))) return;
    setGenState("loading");
    set({ tasks: [] });
    setExpanded(null);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const res = await api.post("/missions/generate-tasks", {
        description: form.desc,
        url: form.url,
        platform: form.platforms.join(", "),
        goals: form.goals.join(", "),
        targetUsers: form.users,
        category: d.cat,
        ptype: d.ptype,
        urlContext,
      });
      set({ tasks: res.tasks || [] });
      setGenState("done");
      setExpanded(0);
      setFallbackReason(res.fallback ? (res.reason || "unknown") : null);
    } catch (err) {
      set({ tasks: [] });
      setGenState("idle");
      setFallbackReason(null);
      toast.error(t("testCases.generateFailed", null, "Failed to generate test cases. Make sure the backend server is running and AI services are configured."));
    }
    set({ genFor: { cat: d.cat, ptype: d.ptype } });
  };

  const FALLBACK_REASON_COPY = {
    not_configured: t("testCases.aiReasonNotConfigured", null, "AI generation isn't configured on this server yet."),
    rate_limited: t("testCases.aiReasonRateLimited", null, "The AI service is getting too many requests right now."),
    auth_error: t("testCases.aiReasonAuthError", null, "The AI service rejected the request (a configuration issue on our end)."),
    invalid_response: t("testCases.aiReasonInvalidResponse", null, "The AI returned something we couldn't read."),
    service_down: t("testCases.aiReasonServiceDown", null, "The AI service is temporarily down."),
    unknown: t("testCases.aiReasonUnknown", null, "The AI service didn't respond as expected."),
  };

  const reorderTask = (from, to) => {
    if (from === to) return;
    const a = [...tasks];
    const [moved] = a.splice(from, 1);
    a.splice(to, 0, moved);
    set({ tasks: a });
  };
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const addCustom = () => {
    const newTask = { id: Date.now(), title: t("testCases.customTaskTitle", null, "Custom task"), severity: "imp", steps: [t("testCases.customTaskStep", null, "Describe the action you want the tester to perform")], questions: [{ id: "cq" + Date.now(), text: t("testCases.customTaskQuestion", null, "How did this feel to use?"), type: "rating", scale: 5 }], proof: null, min_time_seconds: 120 };
    set({ tasks: [...tasks, newTask] });
    setExpanded(tasks.length);
  };

  return (
    <div className="rise tc-split">
      <div className="sticky-side">
        {/* FORM */}
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--panel-2)", padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="fld" style={{ marginBottom: 0 }}>
            <label>{t("testCases.whatDidYouBuild", null, "What did you build?")} <span className="req-star" aria-hidden="true">*</span> <span className="opt">{t("testCases.beSpecific", null, "be specific")}</span></label>
            <textarea className="fin" rows={4} placeholder={t("testCases.descPlaceholder", null, "e.g. A subscription app for curated D2C products. Users browse, subscribe, and manage deliveries. We want to test the core shopping flow before launch.")} value={form.desc} onChange={e => patch({ desc: e.target.value })} style={{ minHeight: 108 }} />
          </div>

          <div className="fld" style={{ marginBottom: 0 }}>
            <label>{t("testCases.productUrl", null, "Product URL")} <span className="opt">{t("testCases.optional", null, "optional")}</span></label>
            <div style={{ display: "flex", gap: 8 }}>
              <div className="inw has-pre" style={{ flex: 1 }}>
                <span className="pre"><Icon name="link" size={14} /></span>
                <input className="fin" placeholder={t("testCases.urlPlaceholder", null, "https://yourapp.com or TestFlight link")} value={form.url} onChange={e => patch({ url: e.target.value })} onKeyDown={e => e.key === "Enter" && fetchUrl()} />
              </div>
              <button className="btn btn-ghost" onClick={fetchUrl} disabled={!form.url.trim() || genState === "fetching"} style={{ flexShrink: 0, fontSize: 13 }}>
                {genState === "fetching" ? t("testCases.fetching", null, "Fetching…") : t("testCases.fetchAndAnalyse", null, "Fetch & analyse")}
              </button>
            </div>
            {urlFetched && (
              urlFormatInvalid
                ? <p className="fhint" style={{ color: "var(--danger)", marginTop: 6 }}>{t("testCases.urlFormatInvalid", null, "Please enter a valid URL, starting with http:// or https://")}</p>
                : urlContext
                ? <p className="fhint" style={{ color: "var(--success)", marginTop: 6 }}>{t("testCases.pageAnalysed", null, "✓ Page analysed — context added")}</p>
                : <p className="fhint" style={{ color: "var(--text-faint)", marginTop: 6 }}>
                    {fetchFailReason === "timeout" ? t("testCases.fetchTimeout", null, "This page took too long to respond — you can still generate from your description")
                    : fetchFailReason === "non_html" ? t("testCases.fetchNonHtml", null, "That link doesn't point to a webpage (not HTML) — you can still generate from your description")
                    : fetchFailReason === "empty" ? t("testCases.fetchEmpty", null, "Couldn't find any usable content on that page — you can still generate from your description")
                    : t("testCases.pageAnalyseFailed", null, "Couldn't reach that page — you can still generate from your description")}
                  </p>
            )}
          </div>

          <div>
            <div className="fsec" style={{ marginTop: 0 }}><b>{t("testCases.platform", null, "Platform")} <span className="req-star" aria-hidden="true">*</span></b><span className="line" /></div>
            <div className="chips">
              {TC_PLATFORMS.map(p => (
                <button key={p} className={`chip ${form.platforms.includes(p) ? "on" : ""}`} onClick={() => toggleChip("platforms", p)}>
                  <span className="ck"><Icon name="check" size={10} /></span>{platformLabel[p] || p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="fsec" style={{ marginTop: 0 }}><b>{t("testCases.validationGoals", null, "Validation goals")} <span className="req-star" aria-hidden="true">*</span></b><span className="line" /></div>
            <div className="chips">
              {TC_GOALS.map(g => (
                <button key={g} className={`chip ${form.goals.includes(g) ? "on" : ""}`} onClick={() => toggleChip("goals", g)}>
                  <span className="ck"><Icon name="check" size={10} /></span>{goalLabel[g] || g}
                </button>
              ))}
            </div>
          </div>

          <div className="fld" style={{ marginBottom: 0 }}>
            <label>{t("testCases.targetUsers", null, "Target users")} <span className="req-star" aria-hidden="true">*</span> <Icon name="info" size={13} style={{ verticalAlign: -2, color: "var(--text-faint)", cursor: "help" }} title={t("testCases.targetUsersInfo", null, "Who this mission is meant for — their role, experience level, or context (e.g. \"first-time app users\", \"B2B SaaS buyers\"). This shapes who AI writes the test tasks for.")} /></label>
            <input className="fin" placeholder={t("testCases.targetUsersPlaceholder", null, "e.g. Urban millennials, SaaS buyers, first-time app users")} value={form.users} onChange={e => patch({ users: e.target.value })} />
          </div>

          <Btn variant="primary" block disabled={!canGen || genState === "loading"} onClick={generate} style={{ justifyContent: "center", gap: 10, fontSize: 15 }}>
            <Icon name="sparkle" size={18} />{genState === "loading" ? t("testCases.generating", null, "Generating…") : hasTasks ? t("testCases.regenerateWithAI", null, "Regenerate test cases with AI ✦") : t("testCases.generateWithAI", null, "Generate test cases with AI ✦")}
          </Btn>
          {!canGen && missingFields.length > 0 && (
            <p className="fhint" style={{ textAlign: "center", color: "var(--text-faint)" }}>
              {t("testCases.missingFieldsHint", { fields: missingFields.join(", ") }, `Fill in ${missingFields.join(", ")} to generate test cases.`)}
            </p>
          )}
        </div>

      </div>

      <div ref={resultsRef} className="tc-results">
        {genState === "loading" ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", display: "inline-block", animation: "pulse 1.1s ease infinite" }} />
              <span style={{ fontSize: 13.5, color: "var(--text-muted)", fontWeight: 600 }}>{t("testCases.analysingProduct", null, "Analysing your product and generating test cases…")}</span>
            </div>
            {[0, 1, 2].map(i => (
              <div key={i} className="card" style={{ padding: "13px 14px", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div className="sk" style={{ width: 26, height: 26, borderRadius: 8 }} />
                  <div className="sk sk-line" style={{ flex: 1, height: 14, maxWidth: 200 }} />
                  <div className="sk" style={{ width: 74, height: 22, borderRadius: 20 }} />
                </div>
              </div>
            ))}
          </div>
        ) : hasTasks ? (
          <div className="rise">
            {fallbackReason && (
              <div className="card" style={{ padding: "14px 16px", marginBottom: 14, borderColor: "var(--warning)", background: "var(--warning-weak, color-mix(in srgb, var(--warning) 12%, transparent))", display: "flex", alignItems: "flex-start", gap: 12 }}>
                <Icon name="alertTriangle" size={18} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{t("testCases.aiUnavailableTitle", null, "AI generation is unavailable right now")}</div>
                  <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
                    {FALLBACK_REASON_COPY[fallbackReason] || FALLBACK_REASON_COPY.unknown} {t("testCases.aiUnavailableShowingExamples", null, "Showing example test cases you can edit instead.")}
                  </p>
                </div>
                <button className="btn btn-ghost" style={{ fontSize: 13, flexShrink: 0 }} onClick={generate} disabled={genState === "loading"}>
                  <Icon name="refresh" size={14} /> {t("actions.retry", null, "Retry")}
                </button>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div className="eyebrow">{t("testCases.generatedTestCases", null, "Generated test cases")}</div>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>{t("testCases.tasksMinTotal", { count: tasks.length, mins: Math.ceil(totalMins / 60) }, `${tasks.length} tasks · ~${Math.ceil(totalMins / 60)} min total`)}</p>
              </div>
              <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={addCustom}>
                <Icon name="plus" size={15} /> {t("testCases.addCustomTask", null, "Add custom task")}
              </button>
            </div>
            {d.genFor && (d.genFor.cat !== d.cat || d.genFor.ptype !== d.ptype) && (
              <div style={{ marginBottom: 14, padding: "10px 14px", background: "var(--warning-weak)", border: "1px solid color-mix(in srgb, var(--warning) 25%, transparent)", borderRadius: "var(--radius)", fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name="flag" size={15} style={{ color: "var(--warning)", flexShrink: 0 }} />
                <span style={{ color: "var(--warning)", fontWeight: 600 }}>{t("testCases.categoryChangedWarning", null, "Category or participation type changed since these were generated — regenerate to match.")}</span>
              </div>
            )}
            {tasks.map((t, i) => (
              <TaskCard key={t.id} task={t} idx={i} total={tasks.length}
                dragging={dragIdx === i} dragOver={overIdx === i}
                onDragStart={() => setDragIdx(i)}
                onDragOverCard={() => dragIdx !== null && dragIdx !== i && setOverIdx(i)}
                onDrop={() => { if (dragIdx !== null && dragIdx !== i) reorderTask(dragIdx, i); setDragIdx(null); setOverIdx(null); }}
                onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                expanded={expanded === i} onToggle={() => setExpanded(expanded === i ? null : i)} onDelete={(i) => { const a = [...tasks]; a.splice(i, 1); set({ tasks: a }); setExpanded(null); }} onEdit={(i, patch) => { const a = [...tasks]; a[i] = { ...a[i], ...patch }; set({ tasks: a }); }} />
            ))}
            <div style={{ marginTop: 12, padding: "12px 14px", background: "var(--success-weak)", border: "1px solid color-mix(in srgb, var(--success) 25%, transparent)", borderRadius: "var(--radius)", fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="shield" size={15} style={{ color: "var(--success)", flexShrink: 0 }} />
              <span style={{ color: "var(--success)", fontWeight: 600 }}>{t("testCases.savedAsStructuredTasks", null, "Test cases will be saved as structured tasks on the mission when published.")}</span>
            </div>
          </div>
        ) : (
          <div className="rise-2" style={{ border: "2px dashed var(--border)", borderRadius: "var(--radius)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "60px 24px", minHeight: 360 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--accent-weak)", display: "grid", placeItems: "center", marginBottom: 14 }}>
              <Icon name="sparkle" size={26} style={{ color: "var(--accent)" }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 7 }}>{t("testCases.emptyStateTitle", null, "Test cases will appear here")}</div>
            <p style={{ margin: 0, color: "var(--text-faint)", fontSize: 13.5, maxWidth: "36ch" }}>{t("testCases.emptyStateBody", { btn: t("testCases.generateWithAI", null, "Generate test cases with AI ✦") }, `Fill in the form and click "Generate test cases with AI ✦" to create structured tasks for your validators.`)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
