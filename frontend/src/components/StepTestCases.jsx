import React, { useState } from "react";
import Icon from "../components/Icon";
import { Btn } from "../components/ui";
import { api } from "../api/client";

const TC_PLATFORMS = ["Web", "iOS", "Android", "Both"];
const TC_GOALS = ["Core flow", "UX", "Willingness to pay", "All"];

const SEV = {
  crit: { l: "Critical", color: "var(--danger)", bg: "var(--danger-weak)" },
  imp:  { l: "Important", color: "var(--warning)", bg: "var(--warning-weak)" },
  nice: { l: "Nice to have", color: "var(--success)", bg: "var(--success-weak)" },
};

function TaskCard({ task, idx, total, onMove, expanded, onToggle, onDelete, onEdit }) {
  const sev = SEV[task.severity] || SEV.imp;
  
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
    <div className={`card rise`} style={{
      overflow: "hidden",
      marginBottom: 10,
      border: expanded ? "1.5px solid var(--accent)" : "1px solid var(--border)",
      boxShadow: expanded ? "0 0 0 1px var(--accent)" : undefined,
      animationDelay: `${idx * 0.07}s`,
    }}>
      {/* Header */}
      <div
        onClick={onToggle}
        style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 14px", cursor: "pointer", userSelect: "none" }}
      >
        <span style={{
          width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center",
          fontFamily: "var(--mono)", fontWeight: 600, fontSize: 11.5,
          background: "var(--accent-weak)", color: "var(--accent)", flexShrink: 0,
        }}>{idx + 1}</span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{task.title}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 800, background: sev.bg, color: sev.color }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
          {sev.l}
        </span>
        {/* Move buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }} onClick={e => e.stopPropagation()}>
          <button
            disabled={idx === 0}
            onClick={() => onMove(idx, -1)}
            style={{ width: 22, height: 20, borderRadius: 5, background: "var(--panel-inset)", border: "1px solid var(--border)", cursor: "pointer", display: "grid", placeItems: "center", opacity: idx === 0 ? 0.28 : 1 }}
          ><Icon name="chevUp" size={10} /></button>
          <button
            disabled={idx === total - 1}
            onClick={() => onMove(idx, 1)}
            style={{ width: 22, height: 20, borderRadius: 5, background: "var(--panel-inset)", border: "1px solid var(--border)", cursor: "pointer", display: "grid", placeItems: "center", opacity: idx === total - 1 ? 0.28 : 1 }}
          ><Icon name="chevDown" size={10} /></button>
        </div>
        <button
            onClick={e => { e.stopPropagation(); onDelete(idx); }}
            style={{ width: 28, height: 28, borderRadius: 6, background: "var(--danger-weak)", border: "1px solid color-mix(in srgb,var(--danger) 25%,transparent)", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}
          ><Icon name="x" size={12} style={{ color: "var(--danger)" }} /></button>
          <Icon name={expanded ? "chevDown" : "chevRight"} size={15} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ padding: 14, borderTop: "1px solid var(--border)", background: "var(--panel-2)" }}>
          {/* Editable title */}
          <div style={{ marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Task title</div>
            <input className="fin" value={task.title} onChange={e => onEdit(idx, { title: e.target.value })} onClick={e => e.stopPropagation()} style={{ fontSize: 14, fontWeight: 600 }} />
          </div>
          {/* Steps */}
          <div style={{ marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 9 }}>Steps</div>
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
              <Icon name="plus" size={12} /> Add step
            </button>
          </div>

          {/* Questions */}
          <div style={{ marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 9 }}>Questions</div>
            <div style={{ display: "grid", gap: 7 }}>
              {task.questions.map((q, i) => (
                <div key={q.id} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "8px 10px", background: "var(--panel)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, color: "var(--text-faint)", paddingTop: 8, flexShrink: 0 }}>Q{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input className="fin" value={q.text} onChange={e => updateQuestion(i, e.target.value)} onClick={e => e.stopPropagation()} style={{ padding: "4px 8px", fontSize: 13, flex: 1, fontWeight: 600 }} placeholder="Ask a question..." />
                      <button onClick={e => { e.stopPropagation(); deleteQuestion(i); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}><Icon name="trash" size={14} /></button>
                    </div>
                    <div>
                      <select className="fin" value={q.type} onChange={e => { const qs = [...task.questions]; qs[i] = { ...qs[i], type: e.target.value }; onEdit(idx, { questions: qs }); }} onClick={e => e.stopPropagation()} style={{ fontSize: 12, padding: "2px 8px", width: "auto", display: "inline-block" }}>
                        <option value="multiple_choice">Multiple choice</option>
                        <option value="yes_no_detail">Yes/No + detail</option>
                        <option value="rating">Rating (1-5)</option>
                        <option value="text">Open text</option>
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
              <Icon name="plus" size={12} /> Add question
            </button>
          </div>

          {/* Settings */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="eyebrow" style={{ letterSpacing: 0 }}>Severity</span>
              <select className="fin" value={task.severity} onChange={e => onEdit(idx, { severity: e.target.value })} onClick={e => e.stopPropagation()} style={{ fontSize: 13, padding: "4px 8px", width: 130 }}>
                <option value="crit">Critical</option>
                <option value="imp">Important</option>
                <option value="nice">Nice to have</option>
              </select>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="eyebrow" style={{ letterSpacing: 0 }}>Min time (min)</span>
              <input type="number" min="1" className="fin" value={Math.ceil((task.min_time_seconds || 120) / 60)} onChange={e => onEdit(idx, { min_time_seconds: Math.max(1, parseInt(e.target.value || 1)) * 60 })} onClick={e => e.stopPropagation()} style={{ fontSize: 13, padding: "4px 8px", width: 60, textAlign: "center" }} />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", marginLeft: 10 }}>
              <input 
                type="checkbox" 
                checked={task.proof === "screenshot"} 
                onChange={e => onEdit(idx, { proof: e.target.checked ? "screenshot" : null })} 
                onClick={e => e.stopPropagation()} 
              />
              Require screenshot or video proof
            </label>

            <div style={{ flex: 1 }} />
            
            <button className="btn" style={{ background: "var(--danger-weak)", color: "var(--danger)", border: "none", fontSize: 13 }} onClick={e => { e.stopPropagation(); onDelete(idx); }}>
              <Icon name="trash" size={14} /> Delete Task
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StepTestCases({ d, set }) {
  const [form, setForm] = useState({ desc: "", url: "", platforms: new Set(), goals: new Set(), users: "" });
  const [genState, setGenState] = useState("idle"); // idle | fetching | loading | done
  const [urlFetched, setUrlFetched] = useState(false);
  const [urlContext, setUrlContext] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const tasks = d.tasks || [];
  const patch = (p) => setForm(f => ({ ...f, ...p }));
  const toggleChip = (key, val) => setForm(f => { const s = new Set(f[key]); s.has(val) ? s.delete(val) : s.add(val); return { ...f, [key]: s }; });
  const canGen = form.desc.trim().length > 20 || urlFetched;
  const hasTasks = tasks.length > 0;
  const totalMins = tasks.reduce((a, t) => a + (t.min_time_seconds || 120), 0);
  const showRight = hasTasks || genState === "loading";

  const fetchUrl = async () => {
    if (!form.url.trim()) return;
    setGenState("fetching");
    try {
      const res = await api.post("/missions/fetch-url-context", { url: form.url });
      setUrlContext(res.context || null);
    } catch {
      setUrlContext(null);
    } finally {
      setUrlFetched(true);
      setGenState("idle");
    }
  };

  const generate = async () => {
    setGenState("loading");
    set({ tasks: [] });
    setExpanded(null);
    try {
      const res = await api.post("/missions/generate-tasks", {
        description: form.desc,
        url: form.url,
        platform: [...form.platforms].join(", "),
        goals: [...form.goals].join(", "),
        targetUsers: form.users,
        category: d.cat,
        ptype: d.ptype,
        urlContext,
      });
      set({ tasks: res.tasks || [] });
      setGenState("done");
      setExpanded(0);
    } catch (err) {
      // Handle API failure
      set({ tasks: [] });
      setGenState("idle");
      alert("Failed to generate test cases. Make sure the backend server is running and AI services are configured.");
    }
    set({ genFor: { cat: d.cat, ptype: d.ptype } });
  };

  const moveTask = (idx, dir) => {
    const a = [...tasks];
    const t = idx + dir;
    if (t < 0 || t >= a.length) return;
    [a[idx], a[t]] = [a[t], a[idx]];
    set({ tasks: a });
  };

  const addCustom = () => {
    const t = { id: Date.now(), title: "Custom task", severity: "imp", steps: ["Describe the action you want the tester to perform"], questions: [{ id: "cq" + Date.now(), text: "How did this feel to use?", type: "rating", scale: 5 }], proof: null, min_time_seconds: 120 };
    set({ tasks: [...tasks, t] });
    setExpanded(tasks.length);
  };

  return (
    <div className="rise">
      <div style={{ display: showRight ? "grid" : "block", gridTemplateColumns: "370px 1fr", gap: 26, alignItems: "start" }}>
        {/* LEFT PANEL */}
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--panel-2)", padding: 22, display: "flex", flexDirection: "column", gap: 18, position: "sticky", top: 80 }}>
          <div className="fld" style={{ marginBottom: 0 }}>
            <label>What did you build? <span className="opt">be specific</span></label>
            <textarea className="fin" rows={4} placeholder="e.g. A subscription app for curated D2C products. Users browse, subscribe, and manage deliveries. We want to test the core shopping flow before launch." value={form.desc} onChange={e => patch({ desc: e.target.value })} style={{ minHeight: 108 }} />
          </div>

          <div className="fld" style={{ marginBottom: 0 }}>
            <label>Product URL <span className="opt">optional</span></label>
            <div style={{ display: "flex", gap: 8 }}>
              <div className="inw has-pre" style={{ flex: 1 }}>
                <span className="pre"><Icon name="link" size={14} /></span>
                <input className="fin" placeholder="https://yourapp.com or TestFlight link" value={form.url} onChange={e => patch({ url: e.target.value })} onKeyDown={e => e.key === "Enter" && fetchUrl()} />
              </div>
              <button className="btn btn-ghost" onClick={fetchUrl} disabled={!form.url.trim() || genState === "fetching"} style={{ flexShrink: 0, fontSize: 13 }}>
                {genState === "fetching" ? "Fetching…" : "Fetch & analyse"}
              </button>
            </div>
            {urlFetched && (
              urlContext
                ? <p className="fhint" style={{ color: "var(--success)", marginTop: 6 }}>✓ Page analysed — context added</p>
                : <p className="fhint" style={{ color: "var(--text-faint)", marginTop: 6 }}>Couldn't analyse this page — you can still generate from your description</p>
            )}
          </div>

          <div>
            <div className="fsec" style={{ marginTop: 0 }}><b>Platform</b><span className="line" /></div>
            <div className="chips">
              {TC_PLATFORMS.map(p => (
                <button key={p} className={`chip ${form.platforms.has(p) ? "on" : ""}`} onClick={() => toggleChip("platforms", p)}>
                  <span className="ck"><Icon name="check" size={10} /></span>{p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="fsec" style={{ marginTop: 0 }}><b>Validation goals</b><span className="line" /></div>
            <div className="chips">
              {TC_GOALS.map(g => (
                <button key={g} className={`chip ${form.goals.has(g) ? "on" : ""}`} onClick={() => toggleChip("goals", g)}>
                  <span className="ck"><Icon name="check" size={10} /></span>{g}
                </button>
              ))}
            </div>
          </div>

          <div className="fld" style={{ marginBottom: 0 }}>
            <label>Target users</label>
            <input className="fin" placeholder="e.g. Urban millennials, SaaS buyers, first-time app users" value={form.users} onChange={e => patch({ users: e.target.value })} />
          </div>

          <Btn variant="primary" block disabled={!canGen || genState === "loading"} onClick={generate} style={{ justifyContent: "center", gap: 10, fontSize: 15 }}>
            <Icon name="sparkles" size={18} />{genState === "loading" ? "Generating…" : "Generate test cases with AI ✦"}
          </Btn>
        </div>

        {/* RIGHT PANEL */}
        {showRight && (
          <div style={{ minWidth: 0 }}>
            {genState === "loading" ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", display: "inline-block", animation: "pulse 1.1s ease infinite" }} />
                  <span style={{ fontSize: 13.5, color: "var(--text-muted)", fontWeight: 600 }}>Analysing your product and generating test cases…</span>
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
            ) : (
              <div className="rise">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div>
                    <div className="eyebrow">Generated test cases</div>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>{tasks.length} tasks · ~{Math.ceil(totalMins / 60)} min total</p>
                  </div>
                  <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={addCustom}>
                    <Icon name="plus" size={15} /> Add custom task
                  </button>
                </div>
                {d.genFor && (d.genFor.cat !== d.cat || d.genFor.ptype !== d.ptype) && (
                  <div style={{ marginBottom: 14, padding: "10px 14px", background: "var(--warning-weak)", border: "1px solid color-mix(in srgb, var(--warning) 25%, transparent)", borderRadius: "var(--radius)", fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon name="flag" size={15} style={{ color: "var(--warning)", flexShrink: 0 }} />
                    <span style={{ color: "var(--warning)", fontWeight: 600 }}>Category or participation type changed since these were generated — regenerate to match.</span>
                  </div>
                )}
                {tasks.map((t, i) => (
                  <TaskCard key={t.id} task={t} idx={i} total={tasks.length} onMove={moveTask} expanded={expanded === i} onToggle={() => setExpanded(expanded === i ? null : i)} onDelete={(i) => { const a = [...tasks]; a.splice(i, 1); set({ tasks: a }); setExpanded(null); }} onEdit={(i, patch) => { const a = [...tasks]; a[i] = { ...a[i], ...patch }; set({ tasks: a }); }} />
                ))}
                <div style={{ marginTop: 12, padding: "12px 14px", background: "var(--success-weak)", border: "1px solid color-mix(in srgb, var(--success) 25%, transparent)", borderRadius: "var(--radius)", fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
                  <Icon name="shield" size={15} style={{ color: "var(--success)", flexShrink: 0 }} />
                  <span style={{ color: "var(--success)", fontWeight: 600 }}>Test cases will be saved as structured tasks on the mission when published.</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Empty right state */}
      {!showRight && (
        <div className="rise-2" style={{ marginTop: 22, border: "2px dashed var(--border)", borderRadius: "var(--radius)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "60px 24px", minHeight: 360 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--accent-weak)", display: "grid", placeItems: "center", marginBottom: 14 }}>
            <Icon name="sparkles" size={26} style={{ color: "var(--accent)" }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 7 }}>Test cases will appear here</div>
          <p style={{ margin: 0, color: "var(--text-faint)", fontSize: 13.5, maxWidth: "36ch" }}>Fill in the form and click "Generate test cases with AI ✦" to create structured tasks for your validators.</p>
        </div>
      )}
    </div>
  );
}
