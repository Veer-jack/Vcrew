import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import { Empty } from "../components/ui";
import { aapi } from "../aapi/client";

const STATUS = {
  open: { l: "Open", c: "var(--warning)", bg: "var(--warning-weak)" },
  answered: { l: "Answered", c: "var(--accent)", bg: "var(--accent-weak)" },
  resolved: { l: "Resolved", c: "var(--success)", bg: "var(--success-weak)" },
};

function TicketDrawer({ ticket, onClose, onSave }) {
  const [reply, setReply] = useState(ticket.reply || "");
  const [status, setStatus] = useState(ticket.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setBusy(true); setError("");
    try {
      const body = {};
      if (status !== ticket.status) body.status = status;
      if (reply !== (ticket.reply || "")) body.reply = reply;
      await aapi.updateTicket(ticket.userType, ticket.id, body);
      onSave({ ...ticket, status: body.reply !== undefined ? "answered" : status, reply: reply || ticket.reply });
    } catch (err) {
      setError(err.message || "Couldn't save");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ display: "contents" }}>
      <div className="notif-overlay" onClick={onClose} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 560, maxWidth: "94vw", maxHeight: "90vh", overflow: "auto", zIndex: 61,
        background: "var(--panel)", border: "var(--hairline) solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)" }} className="rise">
        <div className="row between" style={{ padding: "18px 22px", borderBottom: "var(--hairline) solid var(--border)" }}>
          <div>
            <b style={{ fontSize: 16 }}>{ticket.subject}</b>
            <div className="faint mono" style={{ fontSize: 11.5, marginTop: 4 }}>{ticket.id} · {ticket.userType === "builder" ? "Builder" : "Validator"} · {ticket.userName} ({ticket.userEmail})</div>
          </div>
          <button className="icon-btn" aria-label="Close" style={{ width: 32, height: 32 }} onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: 22, display: "grid", gap: 16 }}>
          {error && <div className="err-banner">{error}</div>}
          <div>
            <span className="tag" style={{ background: "var(--panel-inset)", color: "var(--text-muted)", marginRight: 8 }}>{ticket.category}</span>
            {ticket.priority === "high" && <span className="tag" style={{ background: "var(--danger-weak)", color: "var(--danger)" }}>High priority</span>}
          </div>
          {ticket.details && <div className="card" style={{ padding: 14, background: "var(--panel-inset)" }}><p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{ticket.details}</p></div>}

          <div>
            <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8 }}>Status</label>
            <div className="row gap-2">
              {Object.entries(STATUS).map(([k, s]) => (
                <button key={k} className="pill" onClick={() => setStatus(k)} style={{ cursor: "pointer", fontWeight: 600,
                  background: status === k ? "var(--accent)" : "var(--panel)", borderColor: status === k ? "var(--accent)" : "var(--border)", color: status === k ? "#fff" : "var(--text-muted)" }}>{s.l}</button>
              ))}
            </div>
          </div>

          <div className="fld">
            <label>Reply to {ticket.userType === "builder" ? "builder" : "validator"}</label>
            <textarea className="field" placeholder="Write a response…" value={reply} onChange={e => setReply(e.target.value)} />
          </div>

          <div className="row gap-2" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn-quiet" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ASupport() {
  const [tickets, setTickets] = useState(null);
  const [open, setOpen] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => { aapi.tickets().then(d => setTickets(d.tickets)); }, []);
  if (tickets === null) return <div className="page rise"><div className="muted">Loading…</div></div>;

  const rows = filter === "all" ? tickets : tickets.filter(t => t.status === filter);

  const handleSave = (updated) => {
    setTickets(ts => ts.map(t => (t.id === updated.id && t.userType === updated.userType) ? updated : t));
    setOpen(null);
  };

  return (
    <div className="page rise">
      <div className="ph">
        <div><span className="eyebrow">Operations</span><h1>Support tickets</h1><p className="lead">Respond to builder and validator support requests.</p></div>
      </div>

      <div className="row gap-2 rise-2" style={{ marginBottom: 18 }}>
        {[{ k: "all", l: "All" }, ...Object.entries(STATUS).map(([k, s]) => ({ k, l: s.l }))].map(t => (
          <button key={t.k} className="pill" onClick={() => setFilter(t.k)} style={{ cursor: "pointer", fontWeight: 700,
            background: filter === t.k ? "var(--accent)" : "var(--panel)", borderColor: filter === t.k ? "var(--accent)" : "var(--border)", color: filter === t.k ? "#fff" : "var(--text-muted)" }}>{t.l}</button>
        ))}
      </div>

      {rows.length === 0 ? <div className="card rise-3"><Empty icon="life" title="No tickets here">Nothing matches this filter right now.</Empty></div> : (
        <div className="card rise-3" style={{ padding: 0, overflow: "hidden" }}>
          {rows.map((t, i) => {
            const st = STATUS[t.status];
            return (
              <div key={`${t.userType}-${t.id}`} className="row gap-3" style={{ padding: "15px var(--pad-card)", borderTop: i ? "var(--hairline) solid var(--border)" : "none", cursor: "pointer" }} onClick={() => setOpen(t)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row gap-2 wrap">
                    <b style={{ fontSize: 14.5 }}>{t.subject}</b>
                    {t.priority === "high" && <span className="tag" style={{ background: "var(--danger-weak)", color: "var(--danger)" }}>High</span>}
                  </div>
                  <div className="faint mono" style={{ fontSize: 11.5, marginTop: 4 }}>{t.id} · {t.userType === "builder" ? "Builder" : "Validator"} · {t.userName} · {t.category} · updated {t.updated}</div>
                </div>
                <span className="tag" style={{ background: st.bg, color: st.c, flex: "none" }}>{st.l}</span>
                <Icon name="chevronRight" size={18} style={{ color: "var(--text-faint)", flex: "none" }} />
              </div>
            );
          })}
        </div>
      )}

      {open && <TicketDrawer ticket={open} onClose={() => setOpen(null)} onSave={handleSave} />}
    </div>
  );
}
