import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icon";
import { Btn } from "../components/ui";
import { vapi } from "../vapi/client";
import { useVMeta } from "../vcontext/VMetaContext";
import { VTypeTag } from "../vcomponents/vui";
import { useTranslation } from "../i18n/index.jsx";

// A marketplace (vtasks) listing has no per-task steps/questions/proof flow —
// it's "go use the product, come back and rate it against the type's rubric."
// This is that completion form. Real missions (rich multi-task, tasks_json)
// go through Workspace.jsx instead; MissionDetails.jsx's dest picker routes
// here only for task.src === "vtask" (BUG-028).
function RatingButtons({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {[1, 2, 3, 4, 5].map(v => (
        <button key={v} onClick={() => onChange(v)} style={{
          width: 40, height: 40, borderRadius: "var(--radius-sm)",
          border: `1px solid ${value >= v ? "var(--warning)" : "var(--border)"}`,
          background: value >= v ? "var(--warning)" : "var(--panel)",
          display: "grid", placeItems: "center", cursor: "pointer", transition: "all .12s",
        }}>
          <svg viewBox="0 0 24 24" width={18} height={18} fill={value >= v ? "#fff" : "none"} stroke={value >= v ? "#fff" : "var(--border-strong)"} strokeWidth="1.8" strokeLinejoin="round">
            <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function VtaskReview() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { vtypes } = useVMeta();
  const [data, setData] = useState(null);
  const [ratings, setRatings] = useState({});
  const [flags, setFlags] = useState([]);
  const [notes, setNotes] = useState("");
  const [minutes, setMinutes] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(null);

  useEffect(() => {
    vapi.task(id).then(d => {
      setData(d);
      setMinutes(d.task.minutes || 10);
      if (d.myMission?.ratings) setRatings(d.myMission.ratings);
      if (d.myMission?.flags) setFlags(d.myMission.flags);
      if (d.myMission?.notes) setNotes(d.myMission.notes);
    });
  }, [id]);

  if (!data) return <div className="page rise"><div className="muted">{t("actions.loading", null, "Loading…")}</div></div>;

  const { task, rubric } = data;
  const vType = vtypes[task.type];
  const ratingIds = (rubric?.rubric || []).map(r => r.id);
  const allRated = ratingIds.length > 0 && ratingIds.every(rid => ratings[rid] > 0);

  const toggleFlag = (f) => setFlags(fs => fs.includes(f) ? fs.filter(x => x !== f) : [...fs, f]);

  const submit = async () => {
    if (!allRated) return;
    setBusy(true);
    setError("");
    try {
      const avg = ratingIds.reduce((a, rid) => a + ratings[rid], 0) / ratingIds.length;
      const score = Math.round(avg * 20);
      const res = await vapi.submit(id, { ratings, flags, notes, minutes: Number(minutes) || 1, score });
      setSubmitted(res);
    } catch (err) {
      setError(err.message || t("vtaskReview.submitFailed", null, "Couldn't submit your review — please try again."));
    } finally {
      setBusy(false);
    }
  };

  if (submitted) return (
    <div className="page" style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", paddingTop: "8vh" }}>
      <div className="rise" style={{ width: 80, height: 80, borderRadius: 24, background: "var(--success)", color: "#fff", display: "grid", placeItems: "center", margin: "0 auto 24px" }}>
        <Icon name="check" size={40} />
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px" }}>{t("vtaskReview.submitted", null, "Review submitted!")}</h1>
      <p className="muted" style={{ fontSize: 15, marginBottom: 28 }}>{t("vtaskReview.submittedDesc", { reward: task.reward }, `₹${task.reward} will clear to your pending balance once the builder reviews it.`)}</p>
      <Btn variant="primary" size="lg" onClick={() => navigate("/validator/missions")}>{t("actions.myMissions", null, "My missions")}</Btn>
    </div>
  );

  return (
    <div className="page" style={{ maxWidth: 720, margin: "0 auto" }}>
      <button className="btn btn-quiet rise" onClick={() => navigate("/validator/missions")} style={{ marginBottom: 16, marginLeft: -8 }}>
        <Icon name="arrowLeft" />{t("actions.myMissions", null, "My missions")}
      </button>

      <div className="card rise" style={{ padding: "22px var(--pad-card)", marginBottom: 16 }}>
        <div className="row gap-3" style={{ alignItems: "flex-start", marginBottom: 12 }}>
          <span style={{ width: 48, height: 48, borderRadius: 13, display: "grid", placeItems: "center", flex: "none", background: `var(${vType.accentVar})`, color: "#fff" }}><Icon name={vType.icon} size={24} /></span>
          <div>
            <VTypeTag type={task.type} vtypes={vtypes} />
            <h2 style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 800 }}>{task.product}</h2>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>{task.tagline} &middot; {task.company}</p>
          </div>
        </div>
        {task.brief && <p style={{ fontSize: 14, lineHeight: 1.6, margin: "12px 0 0" }}>{task.brief}</p>}
        {task.steps?.length > 0 && (
          <ol style={{ margin: "14px 0 0", paddingLeft: 20, fontSize: 13.5, color: "var(--text-muted)" }}>
            {task.steps.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
          </ol>
        )}
      </div>

      <div className="card rise" style={{ padding: "22px var(--pad-card)", marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800 }}>{t("vtaskReview.rateExperience", null, "Rate your experience")}</h3>
        <p className="muted" style={{ fontSize: 13, margin: "0 0 18px" }}>{t("vtaskReview.rateHint", null, "Base this on what you actually did just now, not general expectations.")}</p>
        <div className="col gap-4">
          {(rubric?.rubric || []).map(r => (
            <div key={r.id} className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{r.label}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>{r.help}</div>
              </div>
              <RatingButtons value={ratings[r.id] || 0} onChange={v => setRatings(rs => ({ ...rs, [r.id]: v }))} />
            </div>
          ))}
        </div>
      </div>

      {rubric?.askFlags && rubric.flags?.length > 0 && (
        <div className="card rise" style={{ padding: "22px var(--pad-card)", marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>{t("vtaskReview.anythingWrong", null, "Anything go wrong? (optional)")}</h3>
          <div className="chips">
            {rubric.flags.map(f => (
              <button key={f} className={`chip ${flags.includes(f) ? "on" : ""}`} onClick={() => toggleFlag(f)}>
                <span className="ck"><Icon name="check" size={10} /></span>{f}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card rise" style={{ padding: "22px var(--pad-card)", marginBottom: 16 }}>
        <div className="fld" style={{ marginBottom: 16 }}>
          <label>{t("vtaskReview.notesLabel", null, "Notes for the builder")} <span className="opt">{t("testCases.optional", null, "optional")}</span></label>
          <textarea className="field" rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t("vtaskReview.notesPlaceholder", null, "What stood out, good or bad?")} />
        </div>
        <div className="fld" style={{ maxWidth: 200 }}>
          <label>{t("vtaskReview.minutesLabel", null, "Minutes spent")}</label>
          <input className="fin" type="number" min="1" value={minutes} onChange={e => setMinutes(e.target.value)} />
        </div>
      </div>

      {error && <p className="ferr" style={{ marginBottom: 12 }}>{error}</p>}
      <Btn variant="primary" size="lg" block disabled={!allRated || busy} onClick={submit} title={!allRated ? t("vtaskReview.rateAllHint", null, "Rate every item above to submit") : undefined}>
        {busy ? t("vtaskReview.submitting", null, "Submitting…") : t("vtaskReview.submitReview", null, "Submit review")}
      </Btn>
    </div>
  );
}
