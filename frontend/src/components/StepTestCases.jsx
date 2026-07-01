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

function TaskCard({ task, idx, total, onMove, expanded, onToggle }) {
  const sev = SEV[task.severity] || SEV.imp;
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
        <Icon name={expanded ? "chevDown" : "chevRight"} size={15} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ padding: 14, borderTop: "1px solid var(--border)", background: "var(--panel-2)" }}>
          {/* Steps */}
          <div style={{ marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 9 }}>Steps</div>
            <div style={{ display: "grid", gap: 7 }}>
              {task.steps.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5 }}>
                  <span style={{ width: 20, height: 20, borderRadius: 6, display: "grid", placeItems: "center", background: "var(--accent-weak)", color: "var(--accent)", fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Questions */}
          <div style={{ marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 9 }}>Questions</div>
            <div style={{ display: "grid", gap: 7 }}>
              {task.questions.map((q, i) => (
                <div key={q.id} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "8px 10px", background: "var(--panel)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, color: "var(--text-faint)", paddingTop: 2, flexShrink: 0 }}>Q{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, marginBottom: 5, lineHeight: 1.4 }}>{q.text}</div>
                    <span style={{ display: "inline-flex", fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: "var(--panel-inset)", color: "var(--text-faint)" }}>
                      {q.type === "multiple_choice" ? "multiple choice" : q.type === "yes_no_detail" ? "yes / no + detail" : q.type === "rating" ? `rating /${q.scale}` : "open text"}
                    </span>
                    {q.options && (
                      <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
                        {q.options.map(o => (
                          <span key={o} style={{ padding: "2px 9px", borderRadius: 20, background: "var(--panel-inset)", border: "1px solid var(--border)", fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)" }}>{o}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Proof + Time */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {task.proof && (
              <span className="pill" style={{ fontSize: 12 }}>
                <Icon name="image" size={13} /> Proof: {task.proof}
              </span>
            )}
            <span className="pill" style={{ fontSize: 12 }}>
              <Icon name="clock" size={13} /> Min: {Math.ceil(task.min_time_seconds / 60)} min
            </span>
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
    setTimeout(() => { setUrlFetched(true); setGenState("idle"); }, 1600);
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
      });
      set({ tasks: res.tasks || [] });
      setGenState("done");
      setExpanded(0);
    } catch {
      // Fallback mock if API not ready
      const mock = [
        { id: 1, title: "Sign up & onboarding", severity: "crit", steps: ["Open the app on your device", "Create an account with email", "Complete the onboarding screens", "Arrive at the main dashboard"], questions: [{ id: "q1", text: "How many steps did signup take?", type: "multiple_choice", options: ["1–2", "3–4", "5+"] }, { id: "q2", text: "Was anything confusing during onboarding?", type: "yes_no_detail" }, { id: "q3", text: "Rate the overall signup experience", type: "rating", scale: 5 }], proof: "screenshot", min_time_seconds: 180 },
        { id: 2, title: "Core product discovery", severity: "crit", steps: ["Browse the main catalogue", "Search for at least two specific items", "Open a product detail page", "Add one item to cart"], questions: [{ id: "q4", text: "How easy was it to find what you needed?", type: "rating", scale: 5 }, { id: "q5", text: "Describe your first impression of the layout", type: "text" }, { id: "q6", text: "Did search results feel relevant?", type: "yes_no_detail" }], proof: "screenshot", min_time_seconds: 240 },
        { id: 3, title: "First purchase / conversion", severity: "imp", steps: ["Navigate to checkout", "Select delivery address", "Choose payment and confirm"], questions: [{ id: "q7", text: "How confident did you feel completing the purchase?", type: "rating", scale: 5 }, { id: "q8", text: "Were there any blockers during checkout?", type: "yes_no_detail" }], proof: "screenshot", min_time_seconds: 180 },
        { id: 4, title: "Overall feedback", severity: "imp", steps: ["Think back on the full experience", "Answer the final questions"], questions: [{ id: "q9", text: "Would you use this app regularly?", type: "yes_no_detail" }, { id: "q10", text: "Rate the overall experience", type: "rating", scale: 5 }], proof: null, min_time_seconds: 120 },
      ];
      set({ tasks: mock });
      setGenState("done");
      setExpanded(0);
    }
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
            {urlFetched && <p className="fhint" style={{ color: "var(--success)", marginTop: 6 }}>✓ Page analysed — context added</p>}
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
                {tasks.map((t, i) => (
                  <TaskCard key={t.id} task={t} idx={i} total={tasks.length} onMove={moveTask} expanded={expanded === i} onToggle={() => setExpanded(expanded === i ? null : i)} />
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
