import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icon";
import { VReward, VTypeTag } from "../vcomponents/vui";
import { useVMeta } from "../vcontext/VMetaContext";
import { vapi } from "../vapi/client";
import { deadlineLabel } from "../vutil";

export default function MissionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { vtypes } = useVMeta();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { vapi.task(id).then(setData); }, [id]);
  if (!data) return <div className="page rise"><div className="muted">Loading…</div></div>;

  const { task, rubric } = data;
  const t = vtypes[task.type];
  const spotPct = (task.spotsLeft / task.spotsTotal) * 100;
  const accepted = task.myStatus === "active" || task.myStatus === "submitted" || task.myStatus === "completed";

  const apply = async () => {
    setBusy(true);
    try {
      await vapi.applyTask(task.id);
      setData(d => ({ ...d, task: { ...d.task, myStatus: "active" } }));
    } finally { setBusy(false); }
  };
  const toggleSave = async () => {
    const next = !task.saved;
    setData(d => ({ ...d, task: { ...d.task, saved: next } }));
    try { await vapi.saveTask(task.id, next); } catch { /* best effort */ }
  };

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportDone, setReportDone] = useState(false);
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
      <button className="btn btn-quiet rise" onClick={() => navigate("/validator")} style={{ marginBottom: 16, marginLeft: -8 }}><Icon name="arrowLeft" />All missions</button>

      <div className="card rise" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "26px var(--pad-card)", borderBottom: "var(--hairline) solid var(--border)",
          background: `linear-gradient(180deg, color-mix(in srgb, var(${t.accentVar}) 8%, var(--panel)), var(--panel))` }}>
          <div className="row between wrap gap-4" style={{ alignItems: "flex-start" }}>
            <div className="row gap-3" style={{ alignItems: "flex-start" }}>
              <span style={{ width: 56, height: 56, borderRadius: 15, display: "grid", placeItems: "center", flex: "none", background: `var(${t.accentVar})`, color: "#fff" }}><Icon name={t.icon} size={28} /></span>
              <div>
                <div className="row gap-2 wrap" style={{ marginBottom: 7 }}>
                  <VTypeTag type={task.type} vtypes={vtypes} />
                  {task.hot && <span className="tag" style={{ background: "var(--warning-weak)", color: "var(--warning)" }}><Icon name="bolt" size={12} />High demand</span>}
                  <span className="tag" style={{ background: "var(--accent-weak)", color: "var(--accent)" }}><Icon name="target" size={12} />{task.match}% match</span>
                </div>
                <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-.025em" }}>{task.product}</h2>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 15 }}>{task.tagline} · {task.company}</p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}><VReward amount={task.reward} big /><div className="faint" style={{ fontSize: 11 }}>on approval</div></div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderBottom: "var(--hairline) solid var(--border)" }}>
          {[
            { ic: "clock", l: "Time", v: `~${task.minutes} min` },
            { ic: "users", l: "Spots left", v: `${task.spotsLeft} / ${task.spotsTotal}` },
            { ic: "calendar", l: "Deadline", v: deadlineLabel(task.deadline) },
            { ic: "target", l: "Your match", v: `${task.match}%` },
          ].map((x, i) => (
            <div key={i} style={{ padding: "16px var(--pad-card)", borderLeft: i ? "var(--hairline) solid var(--border)" : "none" }}>
              <div className="row gap-2 faint" style={{ fontSize: 11.5, marginBottom: 5 }}><Icon name={x.ic} size={13} />{x.l}</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{x.v}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: "var(--pad-card)" }}>
          <div className="eyebrow" style={{ marginBottom: 9 }}>About this mission</div>
          <p style={{ margin: "0 0 22px", fontSize: 15, lineHeight: 1.6 }}>{task.brief}</p>
          <div className="m2" style={{ gap: 22 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 11 }}>What you'll do</div>
              <div style={{ display: "grid", gap: 9 }}>
                {task.steps.map((s, i) => (
                  <div key={i} className="row gap-3" style={{ alignItems: "flex-start" }}>
                    <span className="mono" style={{ width: 22, height: 22, flex: "none", borderRadius: 6, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, background: "var(--accent-weak)", color: "var(--accent)" }}>{i + 1}</span>
                    <span style={{ fontSize: 14 }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 11 }}>What you'll be graded on</div>
              <div style={{ display: "grid", gap: 8 }}>
                {rubric.rubric.map(d => (
                  <div key={d.id} className="row gap-2" style={{ fontSize: 13.5 }}>
                    <Icon name="check" size={15} style={{ color: "var(--success)", flex: "none", marginTop: 2 }} />
                    <span><b style={{ fontWeight: 700 }}>{d.label}</b> <span className="faint">— {d.help}</span></span>
                  </div>
                ))}
              </div>
              <div className="eyebrow" style={{ margin: "20px 0 11px" }}>Requirements</div>
              <div className="row gap-2 wrap">
                <span className="pill"><Icon name="shield" size={13} />Verified profile</span>
                <span className="pill"><Icon name="cpu" size={13} />{rubric.label} expertise</span>
                <span className="pill"><Icon name="star" size={13} />4.0+ rating</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "0 var(--pad-card) var(--pad-card)" }}>
          <div className="row between" style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 6 }}>
            <span>{task.spotsLeft} of {task.spotsTotal} spots remaining</span>
            <span className="mono" style={{ color: spotPct < 25 ? "var(--danger)" : "inherit" }}>{Math.round(100 - spotPct)}% filled</span>
          </div>
          <div className="lvl-meter"><i style={{ width: (100 - spotPct) + "%", background: spotPct < 25 ? "var(--danger)" : undefined }} /></div>
        </div>
      </div>

      <div className="row gap-3 wrap rise-2" style={{ position: "sticky", bottom: 0, marginTop: 18, padding: "14px 16px",
        background: "color-mix(in srgb, var(--bg) 88%, transparent)", backdropFilter: "blur(12px)",
        border: "var(--hairline) solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)" }}>
        <button className="btn btn-ghost" onClick={toggleSave}>
          <Icon name="bookmark" style={{ fill: task.saved ? "currentColor" : "none" }} />{task.saved ? "Saved" : "Save"}
        </button>
        <button className="btn btn-quiet" onClick={() => navigate("/validator")}>Decline</button>
        {!reportDone
          ? <button className="btn btn-quiet" style={{ color: "var(--text-faint)", fontSize: 12.5 }} onClick={() => setReportOpen(o => !o)}>
              <Icon name="flag" size={14} />Report
            </button>
          : <span className="faint" style={{ fontSize: 12.5 }}><Icon name="checkCircle" size={13} /> Reported — admin will review</span>
        }
        <span className="grow" />
        <span className="muted" style={{ fontSize: 13, alignSelf: "center" }}>Earn <b style={{ color: "var(--success)" }}>₹{task.reward}</b> on approval</span>
        {accepted
          ? <button className="btn btn-primary" onClick={() => navigate(`/validator/missions/${task.id}/workspace`)} style={{ background: "var(--success)", borderColor: "var(--success)" }}><Icon name="check" />{task.myStatus === "active" ? "Accepted · Start now" : "View submission"}</button>
          : <button className="btn btn-primary btn-lg" disabled={busy} onClick={apply}>{busy ? "Applying…" : "Apply to this mission"} <Icon name="arrowRight" /></button>}
      </div>

      {reportOpen && (
        <div className="card rise" style={{ padding: 16, marginTop: 12, border: "1px solid var(--border-strong)" }}>
          <b style={{ fontSize: 13.5 }}>Report this mission</b>
          <p className="faint" style={{ fontSize: 12.5, margin: "4px 0 10px" }}>Tell us what's wrong — our admin team will review it promptly.</p>
          <textarea className="fin" rows={3} placeholder="e.g. Misleading description, inappropriate content, suspicious payout…"
            value={reportReason} onChange={e => setReportReason(e.target.value)}
            style={{ width: "100%", resize: "vertical", fontSize: 13 }} />
          <div className="row gap-2" style={{ marginTop: 10 }}>
            <button className="btn btn-ghost" onClick={() => setReportOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={reportBusy || !reportReason.trim()} onClick={submitReport}>
              {reportBusy ? "Submitting…" : "Submit report"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
