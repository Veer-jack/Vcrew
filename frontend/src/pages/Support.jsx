import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import { Empty } from "../components/ui";
import { api } from "../api/client";

function RaiseTicket({ onClose, onCreated }) {
  const [cat, setCat] = useState("Payments");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [sent, setSent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true); setError("");
    try {
      const { ticket } = await api.raiseTicket({ category: cat, subject, details });
      setSent(ticket);
      onCreated(ticket);
    } catch (err) {
      setError(err.message || "Couldn't raise ticket");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ display: "contents" }}>
      <div className="notif-overlay" onClick={onClose} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 520, maxWidth: "94vw", maxHeight: "90vh", overflow: "auto", zIndex: 61,
        background: "var(--panel)", border: "var(--hairline) solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)" }} className="rise">
        {sent ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <span style={{ width: 64, height: 64, borderRadius: 18, display: "grid", placeItems: "center", margin: "0 auto 18px", background: "var(--success-weak)", color: "var(--success)" }}><Icon name="check" size={30} /></span>
            <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800 }}>Ticket raised</h3>
            <p className="muted" style={{ margin: "0 0 20px", fontSize: 14 }}>We've logged your request as <b className="mono" style={{ color: "var(--text)" }}>{sent.id}</b>. Expect a reply within a few hours.</p>
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <div className="row between" style={{ padding: "18px 22px", borderBottom: "var(--hairline) solid var(--border)" }}>
              <b style={{ fontSize: 16 }}>Raise a ticket</b>
              <button className="icon-btn" aria-label="Close" style={{ width: 32, height: 32 }} onClick={onClose}><Icon name="x" size={16} /></button>
            </div>
            <div style={{ padding: 22, display: "grid", gap: 16 }}>
              {error && <div className="err-banner">{error}</div>}
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8 }}>Category</label>
                <div className="row gap-2 wrap">
                  {["Payments", "Missions", "Account", "Validators", "Other"].map(c => (
                    <button key={c} className="pill" onClick={() => setCat(c)} style={{ cursor: "pointer", fontWeight: 600,
                      background: cat === c ? "var(--accent)" : "var(--panel)", borderColor: cat === c ? "var(--accent)" : "var(--border)", color: cat === c ? "#fff" : "var(--text-muted)" }}>{c}</button>
                  ))}
                </div>
              </div>
              <div className="fld">
                <label>Subject</label>
                <input className="fin" placeholder="Briefly, what's going on?" value={subject} onChange={e => setSubject(e.target.value)} />
              </div>
              <div className="fld">
                <label>Details</label>
                <textarea className="field" placeholder="Share any details, mission names, or screenshots that help us help you faster." value={details} onChange={e => setDetails(e.target.value)} />
              </div>
              <div className="row gap-2" style={{ justifyContent: "flex-end" }}>
                <button className="btn btn-quiet" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" disabled={busy || !subject.trim()} onClick={submit}><Icon name="send" size={16} />{busy ? "Submitting…" : "Submit ticket"}</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const TICKET_STATUS = {
  open: { l: "Open", c: "var(--warning)", bg: "var(--warning-weak)" },
  answered: { l: "Answered", c: "var(--accent)", bg: "var(--accent-weak)" },
  resolved: { l: "Resolved", c: "var(--success)", bg: "var(--success-weak)" },
};

export default function Support() {
  const [tab, setTab] = useState("help");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [raising, setRaising] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => { api.support().then(setData); }, []);
  if (!data) return <div className="page rise"><div className="muted">Loading…</div></div>;

  const help = data.helpArticles.filter(h => !q || (h.q + h.a + h.cat).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="page" style={{ maxWidth: 880, margin: "0 auto" }}>
      <div className="rise" style={{ marginBottom: 22 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Support</div>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: "-.03em" }}>Help center</h2>
        <p className="muted" style={{ margin: "6px 0 0", fontSize: 15 }}>Find an answer fast, or raise a ticket and our team will get back within a few hours.</p>
      </div>

      <div className="row between wrap gap-3 rise-2" style={{ marginBottom: 18 }}>
        <div className="row gap-2">
          {[{ k: "help", l: "Help articles" }, { k: "tickets", l: "My tickets" }].map(t => (
            <button key={t.k} className="pill" onClick={() => setTab(t.k)} style={{ cursor: "pointer", fontWeight: 700,
              background: tab === t.k ? "var(--accent)" : "var(--panel)", borderColor: tab === t.k ? "var(--accent)" : "var(--border)", color: tab === t.k ? "#fff" : "var(--text-muted)" }}>{t.l}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setRaising(true)}><Icon name="plus" size={16} />Raise a ticket</button>
      </div>

      {tab === "help" && <div className="rise-3">
        <div className="search" style={{ maxWidth: "100%", marginBottom: 16 }}><Icon name="search" size={16} /><input placeholder="Search help articles…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {help.length === 0 ? <div style={{ padding: 32 }} className="faint">No articles match "{q}".</div> : help.map((h, i) => (
            <div key={i} style={{ borderTop: i ? "var(--hairline) solid var(--border)" : "none" }}>
              <button onClick={() => setOpen(open === i ? null : i)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "16px var(--pad-card)", background: "none", border: "none", cursor: "pointer" }}>
                <span className="tag" style={{ flex: "none", background: "var(--panel-inset)", color: "var(--text-muted)" }}>{h.cat}</span>
                <b style={{ flex: 1, fontSize: 14.5 }}>{h.q}</b>
                <Icon name="chevronDown" size={18} style={{ color: "var(--text-faint)", transform: open === i ? "rotate(180deg)" : "none", transition: "transform .2s", flex: "none" }} />
              </button>
              {open === i && <p className="muted" style={{ margin: 0, padding: "0 var(--pad-card) 18px 64px", fontSize: 14, lineHeight: 1.6 }}>{h.a}</p>}
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: "var(--pad-card)", marginTop: 16, display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ width: 44, height: 44, borderRadius: 12, flex: "none", display: "grid", placeItems: "center", background: "var(--accent-weak)", color: "var(--accent)" }}><Icon name="life" size={22} /></span>
          <div style={{ flex: 1 }}><b style={{ fontSize: 14.5 }}>Still stuck?</b><div className="faint" style={{ fontSize: 13 }}>Raise a ticket and we'll reply within a few hours.</div></div>
          <button className="btn btn-ghost" onClick={() => setRaising(true)}>Contact support</button>
        </div>
      </div>}

      {tab === "tickets" && <div className="rise-3">
        {data.tickets.length === 0 ? <Empty icon="life" title="No tickets yet" action={<button className="btn btn-primary" onClick={() => setRaising(true)}>Raise a ticket</button>}>When you raise a support ticket it'll appear here.</Empty> : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {data.tickets.map((t, i) => {
              const st = TICKET_STATUS[t.status];
              return (
                <div key={t.id} className="row gap-3" style={{ padding: "15px var(--pad-card)", borderTop: i ? "var(--hairline) solid var(--border)" : "none", cursor: "pointer" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row gap-2 wrap"><b style={{ fontSize: 14.5 }}>{t.subject}</b>{t.priority === "high" && <span className="tag" style={{ background: "var(--danger-weak)", color: "var(--danger)" }}>High</span>}</div>
                    <div className="faint mono" style={{ fontSize: 11.5, marginTop: 4 }}>{t.id} · {t.cat} · updated {t.updated}</div>
                    {t.reply && <p className="muted" style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.5, padding: "10px 12px", background: "var(--panel-inset)", borderRadius: "var(--radius-sm, 8px)" }}><b style={{ color: "var(--text)" }}>Support reply:</b> {t.reply}</p>}
                  </div>
                  <span className="tag" style={{ background: st.bg, color: st.c, flex: "none" }}>{st.l}</span>
                  <Icon name="chevronRight" size={18} style={{ color: "var(--text-faint)", flex: "none" }} />
                </div>
              );
            })}
          </div>
        )}
      </div>}

      {raising && <RaiseTicket onClose={() => setRaising(false)} onCreated={(t) => setData(d => ({ ...d, tickets: [{ ...t, updated: "Just now" }, ...d.tickets] }))} />}
    </div>
  );
}
