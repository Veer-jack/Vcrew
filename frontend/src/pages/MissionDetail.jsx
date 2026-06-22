import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icon";
import { Avatar, Btn, Donut, KpiCard, MissionLogo, StatusTag, Stars, TypeTag, inr, inrK } from "../components/ui";
import { useMeta } from "../context/MetaContext";
import { api } from "../api/client";
import { STAGES, FILE_KIND } from "../constants";

const TABS = [
  { k: "overview", l: "Overview", ic: "target" },
  { k: "audience", l: "Audience", ic: "compass" },
  { k: "participants", l: "Participants", ic: "users" },
  { k: "responses", l: "Responses", ic: "message" },
  { k: "files", l: "Files", ic: "fileText" },
  { k: "payments", l: "Payments", ic: "wallet" },
];

function MissionOverview({ mission, participants, setTab }) {
  const pipeline = STAGES.map(s => ({ ...s, n: participants.filter(p => p.stage === s.id).length }));
  const maxN = Math.max(...pipeline.map(p => p.n), 1);
  return (
    <div className="split rise">
      <div className="col gap-5">
        <div className="card" style={{ padding: 20 }}>
          <span className="eyebrow">The brief</span>
          <p style={{ fontSize: 15, lineHeight: 1.65, margin: "10px 0 0" }}>{mission.description || "No description provided yet."}</p>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="sec-head"><h3 className="h-md">Participant pipeline</h3><Btn variant="quiet" size="sm" iconRight="arrowRight" onClick={() => setTab("participants")}>Open board</Btn></div>
          <div className="col gap-3" style={{ marginTop: 6 }}>
            {pipeline.map(s => <div className="geo-row" key={s.id}><span className="gn">{s.label}</span><span className="gbar"><i style={{ width: (s.n / maxN) * 100 + "%", background: s.color }} /></span><span className="gv">{s.n}</span></div>)}
          </div>
        </div>
      </div>
      <div className="sticky-side col gap-4">
        <div className="card" style={{ padding: 18 }}>
          <span className="eyebrow">Progress</span>
          <div className="row gap-3" style={{ alignItems: "center", margin: "12px 0" }}>
            <div className="ring" style={{ "--p": mission.completion, width: 64, height: 64 }}><span style={{ width: 52, height: 52, fontSize: 15 }}>{mission.completion}<i>%</i></span></div>
            <div><div style={{ fontWeight: 700, fontSize: 14 }}>{mission.participants.submitted} of {mission.participants.target}</div><div className="faint" style={{ fontSize: 12 }}>submissions in</div></div>
          </div>
          <div className="est-row"><span className="lab">Reward each</span><span className="v">{mission.reward.type === "sample" ? "Sample" : mission.reward.type === "free" ? "Free" : inr(mission.reward.amount)}</span></div>
          <div className="est-row"><span className="lab">Avg rating</span><span className="v">{mission.rating || "—"} ★</span></div>
          <div className="est-row"><span className="lab">Spend to date</span><span className="v">{inr(mission.spend)}</span></div>
        </div>
        <Btn variant="primary" block icon="message" onClick={() => setTab("responses")}>Review responses</Btn>
      </div>
    </div>
  );
}

function ParticipantKanban({ missionId, participants, setParticipants }) {
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);

  const move = async (id, stage) => {
    setParticipants(ps => ps.map(p => p.id === id ? { ...p, stage } : p));
    try { await api.moveParticipant(missionId, id, stage); } catch { /* best effort */ }
  };

  return (
    <div>
      <div className="row between" style={{ marginBottom: 14 }}>
        <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>Drag participants across the pipeline. {participants.length} total in this mission.</p>
        <Btn variant="ghost" size="sm" icon="userplus">Invite more</Btn>
      </div>
      <div className="kanban">
        {STAGES.map(st => {
          const col = participants.filter(p => p.stage === st.id);
          return (
            <div key={st.id} className={`kcol ${over === st.id ? "dragover" : ""}`}
              onDragOver={e => { e.preventDefault(); setOver(st.id); }}
              onDragLeave={() => setOver(o => o === st.id ? null : o)}
              onDrop={e => { e.preventDefault(); if (drag != null) move(drag, st.id); setOver(null); setDrag(null); }}>
              <div className="kcol-h"><span className="kdot" style={{ background: st.color }} /><b>{st.label}</b><span className="cnt">{col.length}</span></div>
              <div className="kcol-body">
                {col.map(p => (
                  <div key={p.id} className={`kcard ${drag === p.id ? "dragging" : ""}`} draggable
                    onDragStart={() => setDrag(p.id)} onDragEnd={() => { setDrag(null); setOver(null); }}>
                    <div className="kcard-top"><Avatar name={p.name} size={30} /><div style={{ minWidth: 0 }}><div className="kn">{p.name}</div><div className="kl">{p.role} · {p.city}</div></div></div>
                    <div className="kcard-foot"><span className="mtag" style={{ fontSize: 10 }}><Icon name="award" size={10} style={{ verticalAlign: -2, marginRight: 2 }} />{p.trust}</span><span className="kreward">{inr(p.reward)}</span></div>
                  </div>
                ))}
                {col.length === 0 && <div className="faint" style={{ fontSize: 12, textAlign: "center", padding: "14px 0" }}>Drop here</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResponseCard({ r, missionId, onFlag }) {
  return (
    <div className="resp-card" style={r.flagged ? { borderColor: "color-mix(in srgb, var(--danger) 40%, var(--border))" } : null}>
      <div className="resp-head">
        <Avatar name={r.name} size={42} />
        <div style={{ flex: 1 }}>
          <div className="row between">
            <div><div className="row gap-2"><b style={{ fontSize: 14.5 }}>{r.name}</b><span className="verif"><Icon name="checkCircle" size={13} /></span></div><div className="faint" style={{ fontSize: 12 }}>{r.role} · {r.city} · {r.time_label}</div></div>
            <div style={{ textAlign: "right" }}><Stars value={r.rating} /><div className="faint" style={{ fontSize: 11, marginTop: 2 }}>Trust {r.trust}</div></div>
          </div>
        </div>
      </div>
      <p className="resp-quote">"{r.quote}"</p>
      <div className="row between wrap gap-3">
        <div className="row gap-2 wrap">{r.tags.map(t => <span key={t} className="mtag">{t}</span>)}</div>
        {r.attachments.length > 0 && <div className="resp-attach">{r.attachments.map((a, j) => <div key={j} className="attach"><span className="lbl">{a}</span></div>)}</div>}
      </div>
      {r.flagged && <div className="row gap-2" style={{ marginTop: 12, color: "var(--danger)", fontSize: 12.5, fontWeight: 600 }}><Icon name="flag" size={14} /> Auto-flagged: possible low-effort or broken-link report</div>}
      <div className="row gap-2" style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
        <Btn variant="primary" size="sm" icon="check">Approve &amp; reward</Btn>
        <Btn variant="ghost" size="sm" icon="message">Reply</Btn>
        <Btn variant={r.flagged ? "primary" : "quiet"} size="sm" icon="flag" onClick={() => onFlag(r, !r.flagged)}>{r.flagged ? "Unflag" : "Flag"}</Btn>
      </div>
    </div>
  );
}

function ResponseReview({ missionId, responses, setResponses }) {
  const [q, setQ] = useState("");
  const [minR, setMinR] = useState(0);
  const rows = responses.filter(r => (!q || (r.name + r.quote).toLowerCase().includes(q.toLowerCase())) && r.rating >= minR);

  const onFlag = async (r, flagged) => {
    setResponses(rs => rs.map(x => x.id === r.id ? { ...x, flagged } : x));
    try { await api.flagResponse(missionId, r.id, flagged); } catch { /* best effort */ }
  };

  return (
    <div>
      <div className="toolbar">
        <div className="seg-search"><Icon name="search" size={16} /><input placeholder="Search responses…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <div className="tabs">{[0, 3, 4, 5].map(r => <button key={r} className={minR === r ? "on" : ""} onClick={() => setMinR(r)}>{r === 0 ? "All" : <><Icon name="star" size={12} />{r}+</>}</button>)}</div>
        <span className="grow" />
        <Btn variant="ghost" size="sm" icon="download">Export</Btn>
      </div>
      {rows.length === 0
        ? <div className="muted" style={{ padding: 24 }}>No responses yet for this mission.</div>
        : <div className="col gap-4">{rows.map(r => <ResponseCard key={r.id} r={r} missionId={missionId} onFlag={onFlag} />)}</div>}
    </div>
  );
}

function MissionAudienceTab({ audience }) {
  return (
    <div className="split rise">
      <div className="col gap-5">
        <div className="card" style={{ padding: 20 }}>
          <div className="sec-head"><h3 className="h-md">Audience definition</h3><Btn variant="ghost" size="sm" icon="edit">Edit</Btn></div>
          {audience.defn.length === 0
            ? <p className="muted" style={{ margin: "6px 0 0", fontSize: 14 }}>No audience filters were set for this mission — it's open to all eligible members.</p>
            : (
              <div className="col gap-3" style={{ marginTop: 6 }}>
                {audience.defn.map((d, i) => (
                  <div key={i} className="row gap-3" style={{ alignItems: "flex-start", paddingTop: i ? 12 : 0, borderTop: i ? "1px solid var(--border)" : "none" }}>
                    <span className="eyebrow" style={{ width: 140, flex: "none", paddingTop: 4 }}>{d.group}</span>
                    <div className="row gap-2 wrap">{d.values.map(v => <span key={v} className="mtag">{v}</span>)}</div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
      <div className="sticky-side col gap-4">
        <div className="reach">
          <div className="reach-top"><span className="r-ic"><Icon name="users" size={22} /></span><div><div className="r-num">{audience.matched.toLocaleString("en-IN")}</div><div className="r-lab">members match this audience</div></div></div>
          <div className="r-bar"><i style={{ width: Math.max(2, Math.min(100, Math.round((audience.invited / Math.max(audience.matched, 1)) * 100))) + "%" }} /></div>
          <div className="r-foot"><span>{audience.invited} invited</span><span>{((audience.invited / Math.max(audience.matched, 1)) * 100).toFixed(2)}% reach</span></div>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <span className="eyebrow" style={{ display: "block", marginBottom: 12 }}>Composition</span>
          <Donut data={audience.segments} centerVal={audience.invited.toLocaleString("en-IN")} centerLabel="joined" size={134} />
        </div>
      </div>
    </div>
  );
}

function FileCard({ f, onDelete }) {
  const k = FILE_KIND[f.kind] || FILE_KIND.pdf;
  return (
    <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ height: 96, borderRadius: "var(--radius-sm)", border: "var(--hairline) solid var(--border)", display: "grid", placeItems: "center",
        background: f.kind === "image" ? "repeating-linear-gradient(45deg, var(--panel-inset), var(--panel-inset) 8px, var(--panel-2) 8px, var(--panel-2) 16px)" : "var(--panel-inset)", color: k.tc }}>
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
            <Icon name="download" size={13} /> Download
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
      setError(err.message || "Upload failed");
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
          <h3 className="h-md">Brief &amp; assets</h3>
          <input ref={inputRef} type="file" style={{ display: "none" }} onChange={handleUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.jpg,.jpeg,.png,.gif,.webp" />
          <Btn variant="ghost" size="sm" icon="upload" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? "Uploading…" : "Upload"}
          </Btn>
        </div>
        {files.brief.length === 0
          ? <div className="muted" style={{ padding: "12px 0" }}>No brief files uploaded yet.</div>
          : <div className="files-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              {files.brief.map((f, i) => <FileCard key={i} f={f} onDelete={handleDelete} />)}
            </div>}
      </div>
      <div>
        <div className="sec-head"><h3 className="h-md">Participant submissions</h3><span className="muted" style={{ fontSize: 12.5 }}>{files.submissions.length} files</span></div>
        {files.submissions.length === 0
          ? <div className="muted" style={{ padding: "12px 0" }}>No submissions yet.</div>
          : <div className="files-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              {files.submissions.map((f, i) => <FileCard key={i} f={f} />)}
            </div>}
      </div>
    </div>
  );
}

function MissionPaymentsTab({ payments }) {
  const STATUS = { paid: { l: "Paid", c: "st-active" }, queued: { l: "Queued", c: "st-completed" }, review: { l: "In review", c: "st-closed" } };
  return (
    <div className="split rise">
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Participant</th><th>Stage</th><th>Status</th><th className="num">Reward</th><th></th></tr></thead>
          <tbody>
            {payments.rows.length === 0 && <tr><td colSpan={5} className="muted" style={{ padding: 20 }}>No submissions awaiting payment yet.</td></tr>}
            {payments.rows.map((r, i) => {
              const st = STATUS[r.status];
              return (
                <tr key={i}>
                  <td><div className="t-name"><Avatar name={r.name} size={32} /><div>{r.name}</div></div></td>
                  <td><span className="mtag">{r.stage}</span></td>
                  <td><span className={`st ${st.c}`}><span className="d" />{st.l}</span></td>
                  <td className="num">{inr(r.amount)}</td>
                  <td>{r.status === "queued" ? <Btn variant="primary" size="sm" icon="check">Release</Btn> : r.status === "review" ? <Btn variant="ghost" size="sm" icon="eye">Review</Btn> : <span className="verif"><Icon name="checkCircle" size={14} />Done</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="sticky-side col gap-4">
        <div className="card" style={{ padding: 18 }}>
          <span className="eyebrow" style={{ display: "block", marginBottom: 12 }}>Budget</span>
          <div className="est-row"><span className="lab">Held in escrow</span><span className="v">{inr(payments.held)}</span></div>
          <div className="est-row"><span className="lab">Released</span><span className="v" style={{ color: "var(--success)" }}>{inr(payments.released)}</span></div>
          <div className="est-row"><span className="lab">Pending approval</span><span className="v" style={{ color: "var(--warning)" }}>{inr(payments.pending)}</span></div>
          <div className="est-total"><span>Refundable</span><span className="v">{inr(payments.refundable)}</span></div>
        </div>
        <Btn variant="primary" block icon="check">Release all approved</Btn>
        <p className="faint" style={{ fontSize: 12, margin: 0, textAlign: "center" }}>Unused reward slots are refunded when the mission closes.</p>
      </div>
    </div>
  );
}

export default function MissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { categories } = useMeta();
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [responses, setResponses] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    api.mission(id)
      .then(d => {
        setData(d);
        setParticipants(d.participants.map(p => ({ ...p })));
        setResponses(d.responses);
      })
      .catch(err => setError(err.message));
  }, [id]);

  if (error) return <div className="page rise"><Icon name="layers" /> <span className="muted">{error}</span></div>;
  if (!data) return <div className="page rise"><div className="muted">Loading…</div></div>;

  const { mission } = data;
  const tabs = TABS.map(t => ({ ...t, c: t.k === "participants" ? participants.length : t.k === "responses" ? responses.length : null }));

  return (
    <div className="page rise">
      <div className="crumbs"><a onClick={() => navigate("/missions")} style={{ cursor: "pointer" }}>Missions</a><Icon name="chevronRight" size={13} /><span>{mission.name}</span></div>
      <div className="ph" style={{ marginBottom: 18 }}>
        <div className="row gap-3" style={{ alignItems: "flex-start" }}>
          <MissionLogo name={mission.name} cat={mission.category} size={54} />
          <div>
            <div className="row gap-2 wrap" style={{ marginBottom: 7 }}><h1 style={{ fontSize: 23, margin: 0 }}>{mission.name}</h1><StatusTag status={mission.status} /></div>
            <div className="row gap-3 wrap"><TypeTag cat={mission.category} categories={categories} /><span className="muted" style={{ fontSize: 13 }}><Icon name="mapPin" size={13} style={{ verticalAlign: -2 }} /> {mission.region}</span><span className="muted" style={{ fontSize: 13 }}><Icon name="calendar" size={13} style={{ verticalAlign: -2 }} /> Closes {mission.deadline}</span></div>
          </div>
        </div>
        <div className="ph-actions"><Btn variant="ghost" icon="edit">Edit</Btn><Btn variant="ghost" icon="download">Export</Btn><Btn variant="primary" icon="userplus">Invite</Btn></div>
      </div>

      <div className="kpis sec" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <KpiCard label="Participants" value={mission.participants.joined} unit={` / ${mission.participants.target}`} icon="users" />
        <KpiCard label="Submitted" value={mission.participants.submitted} icon="check" tone="green" />
        <KpiCard label="Completion" value={mission.completion} unit="%" icon="target" />
        <KpiCard label="Spend" value={inrK(mission.spend)} icon="wallet" />
      </div>

      <div className="utabs sec">{tabs.map(t => <button key={t.k} className={tab === t.k ? "on" : ""} onClick={() => setTab(t.k)}><Icon name={t.ic} size={15} />{t.l}{t.c != null && <span className="cnt">{t.c}</span>}</button>)}</div>

      {tab === "overview" && <MissionOverview mission={mission} participants={participants} setTab={setTab} />}
      {tab === "audience" && <MissionAudienceTab audience={data.audience} />}
      {tab === "participants" && <ParticipantKanban missionId={id} participants={participants} setParticipants={setParticipants} />}
      {tab === "responses" && <ResponseReview missionId={id} responses={responses} setResponses={setResponses} />}
      {tab === "files" && <MissionFilesTab missionId={data.mission.id} files={data.files} />}
      {tab === "payments" && <MissionPaymentsTab payments={data.payments} />}
    </div>
  );
}
