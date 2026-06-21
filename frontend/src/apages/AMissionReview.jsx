import { useEffect, useState } from "react";
import { Empty, inr } from "../components/ui";
import Icon from "../components/Icon";
import { aapi } from "../aapi/client";

export default function AMissionReview() {
  const [filter, setFilter] = useState("flagged");
  const [missions, setMissions] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [reasonDraft, setReasonDraft] = useState({});

  const load = (f) => { setMissions(null); aapi.moderationMissions(f).then(d => setMissions(d.missions)); };
  useEffect(() => { load(filter); }, [filter]);

  const act = async (m, action, reason) => {
    setBusyId(m.id); setError("");
    try {
      await aapi.updateMissionModeration(m.id, { action, reason });
      if (filter === "flagged" && action !== "flag") {
        setMissions(list => list.filter(x => x.id !== m.id));
      } else {
        load(filter);
      }
    } catch (err) {
      setError(err.message || "Couldn't update");
    } finally { setBusyId(null); }
  };

  return (
    <div className="page rise">
      <div className="ph">
        <div><span className="eyebrow">Operations</span><h1>Mission review</h1>
          <p className="lead">
            Missions publish immediately — this is post-publish moderation. Flag something for review,
            or remove it outright if it breaks policy.
          </p>
        </div>
      </div>

      <div className="row gap-2" style={{ marginBottom: 18 }}>
        <button className={`pill ${filter === "flagged" ? "chip-on" : ""}`} onClick={() => setFilter("flagged")} style={{ cursor: "pointer" }}>Flagged</button>
        <button className={`pill ${filter === "all" ? "chip-on" : ""}`} onClick={() => setFilter("all")} style={{ cursor: "pointer" }}>All missions</button>
      </div>

      {error && <div className="err-banner rise" style={{ marginBottom: 18 }}>{error}</div>}

      {missions === null ? <div className="muted">Loading…</div> : missions.length === 0 ? (
        <div className="card rise-2"><Empty icon="layers" title={filter === "flagged" ? "Nothing flagged" : "No missions"}>
          {filter === "flagged" ? "Flagged missions will appear here." : "Missions will appear here once builders publish them."}
        </Empty></div>
      ) : (
        <div className="col gap-3 rise-2">
          {missions.map(m => (
            <div key={m.id} className="card" style={{ padding: 16 }}>
              <div className="row between" style={{ alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <div className="row gap-2" style={{ alignItems: "center" }}>
                    <b style={{ fontSize: 14 }}>{m.name}</b>
                    {m.flagged && <span className="pill" style={{ fontSize: 11, color: "var(--danger)", background: "var(--danger-weak)" }}><Icon name="flag" size={11} /> Flagged</span>}
                    <span className="pill" style={{ fontSize: 11 }}>{m.status}</span>
                  </div>
                  <p className="faint" style={{ fontSize: 12.5, margin: "4px 0" }}>{m.builderName} · {m.org} · {m.category}</p>
                  {m.flagReason && <p className="faint" style={{ fontSize: 12, color: "var(--danger)", margin: "4px 0" }}>Reason: {m.flagReason}</p>}
                </div>
                <div style={{ textAlign: "right", flex: "none" }}>
                  <div className="mono" style={{ fontWeight: 700, fontSize: 14 }}>{inr(m.rewardAmount)}</div>
                  <div className="faint" style={{ fontSize: 11.5 }}>{m.joined}/{m.target} joined</div>
                </div>
              </div>

              <div className="row gap-2" style={{ marginTop: 12 }}>
                {!m.flagged ? (
                  <>
                    <input className="fin" style={{ fontSize: 12.5, flex: 1 }} placeholder="Reason for flagging…"
                      value={reasonDraft[m.id] || ""} onChange={e => setReasonDraft(d => ({ ...d, [m.id]: e.target.value }))} />
                    <button className="btn btn-ghost" style={{ fontSize: 12.5 }} disabled={busyId === m.id || !reasonDraft[m.id]}
                      onClick={() => act(m, "flag", reasonDraft[m.id])}>Flag</button>
                  </>
                ) : (
                  <button className="btn btn-ghost" style={{ fontSize: 12.5 }} disabled={busyId === m.id} onClick={() => act(m, "unflag")}>Clear flag</button>
                )}
                <button className="btn btn-ghost" style={{ fontSize: 12.5, color: "var(--danger)" }} disabled={busyId === m.id} onClick={() => act(m, "remove")}>Remove mission</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
