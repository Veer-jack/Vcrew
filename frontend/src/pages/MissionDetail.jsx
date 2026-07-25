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

function MissionOverview({ mission, participants, setTab, navigate }) {
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
        <Btn variant="primary" block icon="message" onClick={() => navigate(`/missions/${mission.id}/submissions`)}>Review submissions</Btn>
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

function ResponseCard({ r, missionId, onFlag, navigate }) {
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
        <div className="row gap-2 wrap">{r.tags.map((t, j) => <span key={j} className="mtag">{t}</span>)}</div>
        {r.attachments.length > 0 && <div className="resp-attach">{r.attachments.map((a, j) => <div key={j} className="attach" style={{ padding: 0, overflow: "hidden", border: "1px solid var(--border)", borderRadius: 6, background: "var(--panel-inset)" }}><a href={`/api/uploads/${a}`} target="_blank" rel="noreferrer"><img src={`/api/uploads/${a}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} alt="Proof" /></a></div>)}</div>}
      </div>
      {r.flagged && <div className="row gap-2" style={{ marginTop: 12, color: "var(--danger)", fontSize: 12.5, fontWeight: 600 }}><Icon name="flag" size={14} /> Auto-flagged: possible low-effort or broken-link report</div>}
      <div className="row gap-2" style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
        <Btn variant="primary" size="sm" icon="check" onClick={() => navigate(`/missions/${missionId}/submissions`)}>Review submission</Btn>
        <Btn variant="ghost" size="sm" icon="message">Reply</Btn>
        <Btn variant={r.flagged ? "primary" : "quiet"} size="sm" icon="flag" onClick={() => onFlag(r, !r.flagged)}>{r.flagged ? "Unflag" : "Flag"}</Btn>
      </div>
    </div>
  );
}

function ResponseReview({ missionId, responses, setResponses, navigate }) {
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
        : <div className="col gap-4">{rows.map(r => <ResponseCard key={r.id} r={r} missionId={missionId} onFlag={onFlag} navigate={navigate} />)}</div>}
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

function MissionPaymentsTab({ payments, navigate, missionId }) {
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
                  <td>{r.status === "queued" ? <Btn variant="primary" size="sm" icon="check">Release</Btn> : r.status === "review" ? <Btn variant="ghost" size="sm" icon="eye" onClick={() => navigate(`/missions/${missionId}/submissions`)}>Review</Btn> : <span className="verif"><Icon name="checkCircle" size={14} />Done</span>}</td>
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

function MissionShipmentsTab({ missionId }) {
  const [shipments, setShipments] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [trackingInputs, setTrackingInputs] = useState({});

  useEffect(() => {
    api.missionShipments(missionId).then(d => setShipments(d.shipments)).catch(err => setError(err.message));
  }, [missionId]);

  if (error) return <div className="muted">{error}</div>;
  if (!shipments) return <div className="muted">Loading shipments…</div>;
  if (shipments.length === 0) return <div className="muted">No validators have accepted this mission yet.</div>;

  const markShipped = async (validatorId) => {
    setBusyId(validatorId);
    try {
      const input = trackingInputs[validatorId] || {};
      await api.markShipmentShipped(missionId, validatorId, { trackingNumber: input.trackingNumber || "", carrier: input.carrier || "" });
      setShipments(s => s.map(sh => sh.validatorId === validatorId ? { ...sh, status: "shipped", tracking_number: input.trackingNumber || null, carrier: input.carrier || null } : sh));
    } catch (err) {
      setError(err.message || "Couldn't mark as shipped");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="col gap-3 sec">
      {shipments.map(s => (
        <div key={s.validatorId} className="card" style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{s.name}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {[s.address.line1, s.address.line2, s.address.city, s.address.state, s.address.postalCode, s.address.country].filter(Boolean).join(", ") || "No address on file"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {s.status === "awaiting_shipment" ? (
              <>
                <input className="fin" style={{ width: 130 }} placeholder="Carrier" onChange={e => setTrackingInputs(t => ({ ...t, [s.validatorId]: { ...t[s.validatorId], carrier: e.target.value } }))} />
                <input className="fin" style={{ width: 150 }} placeholder="Tracking number" onChange={e => setTrackingInputs(t => ({ ...t, [s.validatorId]: { ...t[s.validatorId], trackingNumber: e.target.value } }))} />
                <button className="btn btn-primary" disabled={busyId === s.validatorId} onClick={() => markShipped(s.validatorId)}>
                  {busyId === s.validatorId ? "Saving…" : "Mark as shipped"}
                </button>
              </>
            ) : (
              <span className="tag" style={{ background: s.status === "received" ? "var(--success-weak)" : "var(--accent-weak)", color: s.status === "received" ? "var(--success)" : "var(--accent)" }}>
                {s.status === "received" ? "Received" : "Shipped"}{s.tracking_number ? ` · ${s.tracking_number}` : ""}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function MissionInterviewsTab({ missionId }) {
  const [schedules, setSchedules] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [proposeInputs, setProposeInputs] = useState({});

  useEffect(() => {
    api.missionSchedules(missionId).then(d => setSchedules(d.schedules)).catch(err => setError(err.message));
  }, [missionId]);

  if (error) return <div className="muted">{error}</div>;
  if (!schedules) return <div className="muted">Loading schedules…</div>;
  if (schedules.length === 0) return <div className="muted">No validators have accepted this mission yet.</div>;

  const propose = async (validatorId) => {
    setBusyId(validatorId);
    try {
      const input = proposeInputs[validatorId] || {};
      if (!input.scheduledAt) throw new Error("Pick a date and time first");
      await api.proposeInterviewTime(missionId, validatorId, { scheduledAt: input.scheduledAt, meetingLink: input.meetingLink || "" });
      setSchedules(s => s.map(sc => sc.validatorId === validatorId ? { ...sc, status: "proposed", scheduled_at: input.scheduledAt, meeting_link: input.meetingLink || null } : sc));
    } catch (err) {
      setError(err.message || "Couldn't propose a time");
    } finally {
      setBusyId(null);
    }
  };

  const complete = async (validatorId) => {
    setBusyId(validatorId);
    try {
      await api.markInterviewCompleted(missionId, validatorId);
      setSchedules(s => s.map(sc => sc.validatorId === validatorId ? { ...sc, status: "completed" } : sc));
    } catch (err) {
      setError(err.message || "Couldn't mark as completed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="col gap-3 sec">
      {schedules.map(s => (
        <div key={s.validatorId} className="card" style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{s.name}</div>
            {s.scheduled_at && <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{new Date(s.scheduled_at).toLocaleString()}{s.meeting_link ? ` · ${s.meeting_link}` : ""}</div>}
            {s.status === "declined" && s.notes && (
              <div style={{ marginTop: 10, padding: "8px 12px", borderLeft: "3px solid var(--warning)", background: "var(--warning-weak)", fontSize: 13 }}>
                <div style={{ color: "var(--warning)" }}><b>Reason declined:</b> {s.notes.reason}</div>
                {s.notes.timeRange && <div style={{ color: "var(--warning)", marginTop: 4 }}><b>Preferred time hint:</b> {s.notes.timeRange}</div>}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {(!s.status || s.status === "declined") && (
              <>
                <input className="fin" type="datetime-local" style={{ width: 200 }} onChange={e => setProposeInputs(t => ({ ...t, [s.validatorId]: { ...t[s.validatorId], scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : "" } }))} />
                <input className="fin" style={{ width: 200 }} placeholder="Meeting link" onChange={e => setProposeInputs(t => ({ ...t, [s.validatorId]: { ...t[s.validatorId], meetingLink: e.target.value } }))} />
                <button className="btn btn-primary" disabled={busyId === s.validatorId} onClick={() => propose(s.validatorId)}>
                  {busyId === s.validatorId ? "Saving…" : s.status === "declined" ? "Propose new time" : "Propose time"}
                </button>
              </>
            )}
            {s.status === "proposed" && <span className="tag" style={{ background: "var(--accent-weak)", color: "var(--accent)" }}>Awaiting response</span>}
            {s.status === "accepted" && (
              <button className="btn btn-primary" disabled={busyId === s.validatorId} onClick={() => complete(s.validatorId)}>
                {busyId === s.validatorId ? "Saving…" : "Mark session completed"}
              </button>
            )}
            {s.status === "completed" && <span className="tag" style={{ background: "var(--success-weak)", color: "var(--success)" }}>Completed</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function MissionFocusGroupTab({ missionId }) {
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [meetingLink, setMeetingLink] = useState("");
  const [slotInputs, setSlotInputs] = useState(["", "", "", ""]);

  const load = () => {
    api.missionPoll(missionId).then(d => { setPoll(d.poll); setLoading(false); }).catch(err => { setError(err.message); setLoading(false); });
  };
  useEffect(load, [missionId]);

  if (loading) return <div className="muted">Loading focus group poll…</div>;
  if (error) return <div className="muted">{error}</div>;

  const createPoll = async () => {
    setBusy(true);
    setError("");
    try {
      const slots = slotInputs.filter(Boolean).map(s => new Date(s).toISOString());
      if (slots.length < 2) throw new Error("Enter at least 2 candidate times");
      await api.createMissionPoll(missionId, { meetingLink, slots });
      load();
    } catch (err) {
      setError(err.message || "Couldn't create the poll");
    } finally {
      setBusy(false);
    }
  };

  const lock = async (slotId) => {
    setBusy(true);
    try {
      await api.lockPollSlot(missionId, slotId);
      load();
    } catch (err) {
      setError(err.message || "Couldn't lock this slot");
    } finally {
      setBusy(false);
    }
  };

  const complete = async () => {
    setBusy(true);
    try {
      await api.completeMissionPoll(missionId);
      load();
    } catch (err) {
      setError(err.message || "Couldn't mark the session completed");
    } finally {
      setBusy(false);
    }
  };

  if (!poll) {
    return (
      <div className="card sec" style={{ padding: 20 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Create a focus group poll</div>
        <input className="fin" style={{ marginBottom: 10 }} placeholder="Meeting link (shared for whichever time is picked)" value={meetingLink} onChange={e => setMeetingLink(e.target.value)} />
        {slotInputs.map((val, i) => (
          <input key={i} className="fin" style={{ marginBottom: 10 }} type="datetime-local" value={val} onChange={e => setSlotInputs(inputs => inputs.map((v, idx) => idx === i ? e.target.value : v))} />
        ))}
        {error && <div className="err-banner" style={{ marginBottom: 10 }}>{error}</div>}
        <button className="btn btn-primary" disabled={busy} onClick={createPoll}>{busy ? "Creating…" : "Create poll"}</button>
      </div>
    );
  }

  return (
    <div className="col gap-3 sec">
      {error && <div className="err-banner">{error}</div>}
      <div className="card" style={{ padding: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 4 }}>Status</div>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>{poll.status}</div>
        {poll.slots.map(s => (
          <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--border)" }}>
            <span>{new Date(s.scheduledAt).toLocaleString()} — {s.tally} available</span>
            {poll.status === "open" && (
              <button className="btn btn-quiet" disabled={busy} onClick={() => lock(s.id)}>Lock this time</button>
            )}
            {s.id === poll.lockedSlotId && <span className="tag" style={{ background: "var(--success-weak)", color: "var(--success)" }}>Locked</span>}
          </div>
        ))}
        {poll.status === "locked" && (
          <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy} onClick={complete}>{busy ? "Saving…" : "Mark session completed"}</button>
        )}
        {poll.status === "completed" && <span className="tag" style={{ marginTop: 12, background: "var(--success-weak)", color: "var(--success)" }}>Completed</span>}
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
  const baseTabs = TABS.map(t => ({ ...t, c: t.k === "participants" ? participants.length : t.k === "responses" ? responses.length : null }));
  let tabs = mission.category === "sample" ? [...baseTabs.slice(0, 3), { k: "shipments", l: "Shipments", ic: "box", c: null }, ...baseTabs.slice(3)] : baseTabs;
  if (mission.ptype === "interview") {
    const idx = tabs.findIndex(t => t.k === "responses") + 1;
    tabs = [...tabs.slice(0, idx), { k: "interviews", l: "Interviews", ic: "calendar", c: null }, ...tabs.slice(idx)];
  }
  if (mission.ptype === "focus") {
    const idx = tabs.findIndex(t => t.k === "responses") + 1;
    tabs = [...tabs.slice(0, idx), { k: "focusgroup", l: "Focus Group", ic: "users", c: null }, ...tabs.slice(idx)];
  }
  if (mission.ptype === "trial") {
    const idx = tabs.findIndex(t => t.k === "responses") + 1;
    tabs = [...tabs.slice(0, idx), { k: "checkins", l: "Check-ins", ic: "calendar", c: null }, ...tabs.slice(idx)];
  }

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

      {tab === "overview" && <MissionOverview mission={mission} participants={participants} setTab={setTab} navigate={navigate} />}
      {tab === "audience" && <MissionAudienceTab audience={data.audience} />}
      {tab === "participants" && <ParticipantKanban missionId={id} participants={participants} setParticipants={setParticipants} />}
      {tab === "responses" && <ResponseReview missionId={id} responses={responses} setResponses={setResponses} navigate={navigate} />}
      {tab === "shipments" && <MissionShipmentsTab missionId={id} />}
      {tab === "interviews" && <MissionInterviewsTab missionId={id} />}
      {tab === "focusgroup" && <MissionFocusGroupTab missionId={id} />}
      {tab === "checkins" && <MissionCheckinsTab responses={responses} />}
      {tab === "files" && <MissionFilesTab missionId={data.mission.id} files={data.files} />}
      {tab === "payments" && <MissionPaymentsTab payments={data.payments} navigate={navigate} missionId={id} />}
    </div>
  );
}

function MissionCheckinsTab({ responses }) {
  if (!responses || responses.length === 0) return <div className="card rise" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>No validators have submitted check-ins yet.</div>;
  
  return (
    <div className="col gap-3 sec">
      {responses.map(r => (
        <div key={r.id} className="card rise" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{r.name}</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Trust score: {r.trust}%</div>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--success)" }}>{(r.checkins || []).length} / 7 days logged</div>
            </div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {(r.checkins || []).map((c, i) => (
              <div key={i} style={{ background: "var(--panel-2)", padding: 16, borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 700, marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
                  <span>Day {c.dayNumber}</span>
                  <span style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 400 }}>{new Date(c.submittedAt).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div><span style={{ color: "var(--text-muted)" }}>Used it?</span> {c.answers?.used || "N/A"}</div>
                  <div><span style={{ color: "var(--text-muted)" }}>What did you do?</span><br />{c.answers?.what || "N/A"}</div>
                  {c.answers?.frustration === "yes" && <div><span style={{ color: "var(--danger)" }}>Frustrated:</span> {c.answers?.frustrationDetail}</div>}
                  {c.screenshotUrl && (
                    <a href={c.screenshotUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 8, color: "var(--accent)", fontSize: 12, fontWeight: 600 }}>
                      <Icon name="image" size={14} style={{ verticalAlign: -2 }} /> View Screenshot
                    </a>
                  )}
                </div>
              </div>
            ))}
            {(r.checkins || []).length === 0 && <div className="muted" style={{ fontSize: 13 }}>No daily check-ins logged yet.</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
