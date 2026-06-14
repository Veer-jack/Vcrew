import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icon";
import { ScoreRing, VTypeTag } from "../vcomponents/vui";
import { vapi } from "../vapi/client";
import { useVMeta } from "../vcontext/VMetaContext";

function ProductPreview({ task }) {
  const url = `${task.product.toLowerCase()}.app`;
  return (
    <div className="browser">
      <div className="browser-bar">
        <div className="browser-dots"><i /><i /><i /></div>
        <div className="browser-url">{url}/review-session</div>
        <Icon name="external" size={15} style={{ color: "var(--text-faint)" }} />
      </div>
      <div style={{ minHeight: 240, padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="eyebrow">{task.company}</div>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{task.product}</h3>
        <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{task.tagline}. This is a simulated session — explore the product as described in the brief, then capture your impressions in the rubric on the right.</p>
        <div className="row gap-2 wrap" style={{ marginTop: 8 }}>
          <span className="pill"><Icon name="external" size={13} />Open {url}</span>
          <span className="pill"><Icon name="clock" size={13} />~{task.minutes} min session</span>
        </div>
      </div>
    </div>
  );
}

const SCORE_WORDS = ["", "Poor", "Weak", "OK", "Good", "Great"];

export default function Workspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { vtypes } = useVMeta();
  const [data, setData] = useState(null);
  const [ratings, setRatings] = useState({});
  const [flags, setFlags] = useState([]);
  const [notes, setNotes] = useState("");
  const [started] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { vapi.workspace(id).then(setData); }, [id]);

  if (!data) return <div className="page rise"><div className="muted">Loading…</div></div>;
  const { task, rubric, myMission } = data;
  const t = vtypes[task.type] || rubric;

  if (!myMission) {
    return (
      <div className="page rise" style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", paddingTop: 60 }}>
        <h2>You haven't accepted this mission yet</h2>
        <p className="muted">Apply from the mission details page to start a validation session.</p>
        <button className="btn btn-primary" onClick={() => navigate(`/validator/missions/${id}`)}>View mission</button>
      </div>
    );
  }
  if (myMission.status !== "active") {
    return (
      <div className="page rise" style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", paddingTop: 60 }}>
        <h2>Already submitted</h2>
        <p className="muted">This validation is {myMission.status === "completed" ? "complete and paid out" : "in review"}. You'll hear back soon.</p>
        <button className="btn btn-primary" onClick={() => navigate("/validator/missions")}>Go to my missions</button>
      </div>
    );
  }

  const setR = (id, v) => setRatings(p => ({ ...p, [id]: v }));
  const toggleFlag = (f) => setFlags(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f]);

  const total = rubric.rubric.length;
  const rated = rubric.rubric.filter(d => ratings[d.id]).length;
  const complete = rated === total && notes.trim().length >= 12;
  const score = total ? Math.round((rubric.rubric.reduce((s, d) => s + (ratings[d.id] || 0), 0) / (total * 5)) * 100) : 0;

  const submit = async () => {
    setBusy(true); setError("");
    try {
      const minutes = Math.max(1, Math.round((Date.now() - started) / 60000));
      await vapi.submit(task.id, { ratings, flags, notes, minutes, score });
      navigate(`/validator/missions/${task.id}/submitted`, { state: { task, score, flags, minutes } });
    } catch (err) {
      setError(err.message || "Couldn't submit");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 480px", height: "calc(100vh - 64px)" }} className="ws-grid">
      <div style={{ overflow: "auto", padding: "var(--pad-page)", borderRight: "var(--hairline) solid var(--border)" }}>
        <button className="btn btn-quiet" onClick={() => navigate("/validator")} style={{ marginBottom: 16, marginLeft: -8 }}><Icon name="arrowLeft" />All missions</button>
        <div className="row gap-2 wrap" style={{ marginBottom: 12 }}>
          <VTypeTag type={task.type} vtypes={vtypes} />
          <span className="pill"><Icon name="clock" size={14} />~{task.minutes} min</span>
          <span className="pill" style={{ color: "var(--success)" }}><Icon name="coin" size={14} />₹{task.reward} on approval</span>
        </div>
        <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, letterSpacing: "-.02em" }}>{task.product}</h2>
        <p className="muted" style={{ margin: "0 0 20px", fontSize: 15 }}>{task.tagline} · {task.company}</p>
        <ProductPreview task={task} />
        <div className="card" style={{ padding: "var(--pad-card)", marginTop: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Your task</div>
          <p style={{ margin: "0 0 14px", fontSize: 14.5 }}>{task.brief}</p>
          <div style={{ display: "grid", gap: 9 }}>
            {task.steps.map((s, i) => (
              <div key={i} className="row gap-3" style={{ alignItems: "flex-start" }}>
                <span className="mono" style={{ width: 22, height: 22, flex: "none", borderRadius: 6, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, background: "var(--accent-weak)", color: "var(--accent)" }}>{i + 1}</span>
                <span style={{ fontSize: 14 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--panel)" }}>
        <div style={{ padding: "18px var(--pad-page) 14px", borderBottom: "var(--hairline) solid var(--border)" }}>
          <div className="row between">
            <div>
              <div className="eyebrow">Structured feedback</div>
              <h3 style={{ margin: "4px 0 0", fontSize: 17, fontWeight: 800 }}>{t.label} rubric</h3>
            </div>
            <div className="row gap-3">
              <ScoreRing value={score} size={52} />
              <div className="col" style={{ justifyContent: "center" }}>
                <span className="faint" style={{ fontSize: 11 }}>Score</span>
                <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{rated}/{total} rated</span>
              </div>
            </div>
          </div>
          <div className="lvl-meter" style={{ marginTop: 12 }}><i style={{ width: `${(rated / total) * 100}%`, transition: "width .3s" }} /></div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "var(--pad-page)", display: "grid", gap: 22 }}>
          {rubric.rubric.map(d => (
            <div key={d.id}>
              <div className="row between" style={{ marginBottom: 4 }}>
                <label style={{ fontWeight: 700, fontSize: 14.5 }}>{d.label}</label>
                {ratings[d.id] && <span className="mono faint" style={{ fontSize: 12 }}>{SCORE_WORDS[ratings[d.id]]}</span>}
              </div>
              <p className="faint" style={{ margin: "0 0 9px", fontSize: 12.5 }}>{d.help}</p>
              <div className={`rate sc-${ratings[d.id] || 0}`}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} className={ratings[d.id] === n ? "on" : ""} onClick={() => setR(d.id, n)}>{n}</button>
                ))}
              </div>
            </div>
          ))}

          {rubric.askFlags && (
            <div>
              <label style={{ fontWeight: 700, fontSize: 14.5 }}>Flag any issues</label>
              <p className="faint" style={{ margin: "0 0 10px", fontSize: 12.5 }}>Founders rely on these. Only flag what you actually saw.</p>
              <div className="row gap-2 wrap">
                {rubric.flags.map(f => (
                  <button key={f} className={`flag ${flags.includes(f) ? "on" : ""}`} onClick={() => toggleFlag(f)}>
                    <span className="x">{flags.includes(f) ? "✓" : "+"}</span>{f}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="row between" style={{ marginBottom: 9 }}>
              <label style={{ fontWeight: 700, fontSize: 14.5 }}>What stood out? <span className="faint" style={{ fontWeight: 500 }}>(required)</span></label>
              <span className="faint mono" style={{ fontSize: 11 }}>{notes.trim().length} chars</span>
            </div>
            <textarea className="field" value={notes} onChange={e => setNotes(e.target.value)} placeholder={rubric.key === "ai" ? "Be specific — which output, what was wrong or impressive, and why it matters to a launch decision…" : "Concrete, specific feedback beats vague praise. What would you change first?"} />
          </div>
        </div>

        <div style={{ padding: "16px var(--pad-page)", borderTop: "var(--hairline) solid var(--border)", background: "var(--panel-2)" }}>
          {error && <div className="err-banner" style={{ marginBottom: 10 }}>{error}</div>}
          {!complete && <p className="faint" style={{ margin: "0 0 10px", fontSize: 12.5 }}>{rated < total ? `Rate all ${total} dimensions` : "Add at least one sentence of written feedback"} to submit.</p>}
          <button className="btn btn-primary btn-lg" disabled={!complete || busy} style={{ width: "100%" }} onClick={submit}>
            {busy ? "Submitting…" : <>Submit validation · earn ₹{task.reward} <Icon name="arrowRight" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
