import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import { Empty, UpdatingBadge } from "../components/ui";
import { api } from "../api/client";
import { useTranslation } from "../i18n/index.jsx";
import { helpCatLabel, builderHelpArticleField } from "../bi18n";

function RaiseTicket({ onClose, onCreated }) {
  const { t } = useTranslation();
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
      setError(err.message || t("support.errRaiseTicket", null, "Couldn't raise ticket"));
    } finally { setBusy(false); }
  };

  return (
    <div style={{ display: "contents" }}>
      <div className="notif-overlay" onClick={onClose} />
      <div style={{ position: "fixed", top: "50%", left: "calc(50% + 120px)", transform: "translate(-50%,-50%)", zIndex: 61 }}>
        <div style={{ width: 520, maxWidth: "94vw", maxHeight: "90vh", overflow: "auto", background: "var(--panel)", border: "var(--hairline) solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)" }} className="rise">
        {sent ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <span style={{ width: 64, height: 64, borderRadius: 18, display: "grid", placeItems: "center", margin: "0 auto 18px", background: "var(--success-weak)", color: "var(--success)" }}><Icon name="check" size={30} /></span>
            <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800 }}>{t("support.ticketRaised", null, "Ticket raised")}</h3>
            <p className="muted" style={{ margin: "0 0 20px", fontSize: 14 }}>{t("support.loggedRequest", null, "We've logged your request as")} <b className="mono" style={{ color: "var(--text)" }}>{sent.id}</b>. {t("support.expectReply", null, "Expect a reply within a few hours.")}</p>
            <button className="btn btn-primary" onClick={onClose}>{t("actions.done", null, "Done")}</button>
          </div>
        ) : (
          <>
            <div className="row between" style={{ padding: "18px 22px", borderBottom: "var(--hairline) solid var(--border)" }}>
              <b style={{ fontSize: 16 }}>{t("support.raiseTicket", null, "Raise a ticket")}</b>
              <button className="icon-btn" aria-label={t("actions.close", null, "Close")} style={{ width: 32, height: 32 }} onClick={onClose}><Icon name="x" size={16} /></button>
            </div>
            <div style={{ padding: 22, display: "grid", gap: 16 }}>
              {error && <div className="err-banner">{error}</div>}
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8 }}>{t("support.category", null, "Category")}</label>
                <div className="row gap-2 wrap">
                  {[
                    { k: "Payments", l: t("support.catPayments", null, "Payments") },
                    { k: "Missions", l: t("support.catMissions", null, "Missions") },
                    { k: "Account", l: t("support.catAccount", null, "Account") },
                    { k: "Validators", l: t("support.catValidators", null, "Validators") },
                    { k: "Other", l: t("support.catOther", null, "Other") }
                  ].map(c => (
                    <button key={c.k} className="pill" onClick={() => setCat(c.k)} style={{ cursor: "pointer", fontWeight: 600,
                      background: cat === c.k ? "var(--accent)" : "var(--panel)", borderColor: cat === c.k ? "var(--accent)" : "var(--border)", color: cat === c.k ? "#fff" : "var(--text-muted)" }}>{c.l}</button>
                  ))}
                </div>
              </div>
              <div className="fld">
                <label>{t("support.subject", null, "Subject")}</label>
                <input className="fin" placeholder={t("support.subjectPlaceholder", null, "Briefly, what's going on?")} value={subject} onChange={e => setSubject(e.target.value)} />
              </div>
              <div className="fld">
                <label>{t("support.details", null, "Details")}</label>
                <textarea className="field" placeholder={t("support.detailsPlaceholder", null, "Share any details, mission names, or screenshots that help us help you faster.")} value={details} onChange={e => setDetails(e.target.value)} />
              </div>
              <div className="row gap-2" style={{ justifyContent: "flex-end" }}>
                <button className="btn btn-quiet" onClick={onClose}>{t("actions.cancel", null, "Cancel")}</button>
                <button className="btn btn-primary" disabled={busy || !subject.trim()} onClick={submit}><Icon name="send" size={16} />{busy ? t("actions.submitting", null, "Submitting…") : t("actions.submitTicket", null, "Submit ticket")}</button>
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}

function ViewTicket({ ticket, onClose }) {
  const { t } = useTranslation();
  const [convos, setConvos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getTicket(ticket.id)
      .then(res => setConvos(res.conversations))
      .catch(err => setError(err.message || t("support.errLoadTicket", null, "Failed to load ticket")));
  }, [ticket.id, t]);

  return (
    <div style={{ display: "contents" }}>
      <div className="notif-overlay" onClick={onClose} />
      <div style={{ position: "fixed", top: "50%", left: "calc(50% + 120px)", transform: "translate(-50%,-50%)", zIndex: 61 }}>
        <div style={{ width: 600, maxWidth: "94vw", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", background: "var(--panel)", border: "var(--hairline) solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)" }} className="rise">
        <div className="row between" style={{ padding: "18px 22px", borderBottom: "var(--hairline) solid var(--border)", flex: "none" }}>
          <div>
            <div className="faint mono" style={{ fontSize: 11 }}>{ticket.id}</div>
            <b style={{ fontSize: 16 }}>{ticket.subject}</b>
          </div>
          <button className="icon-btn" aria-label={t("actions.close", null, "Close")} style={{ width: 32, height: 32 }} onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: 22, overflow: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {error && <div className="err-banner">{error}</div>}
          {!convos && !error && <div className="muted" style={{ textAlign: "center", padding: 40 }}>{t("support.loadingConversation", null, "Loading conversation...")}</div>}
          {convos && convos.length === 0 && <div className="muted" style={{ textAlign: "center", padding: 40 }}>{t("support.noRepliesYet", null, "No replies yet.")}</div>}
          {convos && convos.map(c => (
            <div key={c.id} style={{ alignSelf: c.fromAdmin ? "flex-start" : "flex-end", maxWidth: "85%", background: c.fromAdmin ? "var(--panel-inset)" : "var(--accent-weak)", padding: "12px 16px", borderRadius: 12 }}>
              <div className="row between gap-3" style={{ marginBottom: 6, fontSize: 12 }}>
                <b style={{ color: c.fromAdmin ? "var(--text)" : "var(--accent)" }}>{c.fromAdmin ? t("support.agent", null, "Support Agent") : t("support.you", null, "You")}</b>
                <span className="faint">{c.created_at}</span>
              </div>
              <div style={{ fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.5, color: c.fromAdmin ? "var(--text-muted)" : "var(--accent-strong)" }}>{c.body}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: "16px 22px", borderTop: "var(--hairline) solid var(--border)", background: "var(--panel-inset)", fontSize: 13, textAlign: "center", color: "var(--text-faint)" }}>
          {t("support.replyInstructions", null, "To reply to this ticket, please reply to the email sent to your inbox.")}
        </div>
        </div>
      </div>
    </div>
  );
}

const getTicketStatus = (t) => ({
  open: { l: t("status.open", null, "Open"), c: "var(--warning)", bg: "var(--warning-weak)" },
  answered: { l: t("status.answered", null, "Answered"), c: "var(--accent)", bg: "var(--accent-weak)" },
  resolved: { l: t("status.resolved", null, "Resolved"), c: "var(--success)", bg: "var(--success-weak)" },
  // freshdesk.js's getTickets() collapses every non-open Freshdesk status (Pending,
  // Resolved, Closed) into the single string "closed" -- without this entry, that
  // lookup misses and silently falls back to "open", mislabeling closed tickets.
  closed: { l: t("status.resolved", null, "Resolved"), c: "var(--success)", bg: "var(--success-weak)" },
});

export default function Support() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("help");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [raising, setRaising] = useState(false);
  const [viewingTicket, setViewingTicket] = useState(null);
  const [data, setData] = useState(null);
  const [refetching, setRefetching] = useState(false);
  const [visibleTicketsCount, setVisibleTicketsCount] = useState(20);

  useEffect(() => {
    setTimeout(() => setRefetching(true), 0);
    api.support().then(setData).finally(() => setRefetching(false));
  }, []);
  if (!data) return <div className="page rise"><div className="muted">{t("actions.loading", null, "Loading…")}</div></div>;

  const help = data.helpArticles
    .map((h, i) => ({ ...h, _idx: i }))
    .filter(h => !q || (h.q + h.a + h.cat).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="page" style={{ maxWidth: 880, margin: "0 auto" }}>
      <div className="rise" style={{ marginBottom: 22 }}>
        <div className="row between" style={{ alignItems: "flex-start" }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>{t("support.title", null, "Support")}</div>
          <UpdatingBadge show={refetching} />
        </div>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: "-.03em" }}>{t("support.helpCenter", null, "Help center")}</h2>
        <p className="muted" style={{ margin: "6px 0 0", fontSize: 15 }}>{t("support.subtitle", null, "Find an answer fast, or raise a ticket and our team will get back within a few hours.")}</p>
      </div>

      <div className="row between wrap gap-3 rise-2" style={{ marginBottom: 18 }}>
        <div className="row gap-2">
          {[{ k: "help", l: t("support.helpArticles", null, "Help articles") }, { k: "tickets", l: t("support.myTickets", null, "My tickets") }].map(t => (
            <button key={t.k} className="pill" onClick={() => setTab(t.k)} style={{ cursor: "pointer", fontWeight: 700,
              background: tab === t.k ? "var(--accent)" : "var(--panel)", borderColor: tab === t.k ? "var(--accent)" : "var(--border)", color: tab === t.k ? "#fff" : "var(--text-muted)" }}>{t.l}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setRaising(true)}><Icon name="plus" size={16} />{t("support.raiseTicket", null, "Raise a ticket")}</button>
      </div>

      {tab === "help" && <div className="rise-3">
        <div className="search" style={{ maxWidth: "100%", marginBottom: 16 }}><Icon name="search" size={16} /><input placeholder={t("support.searchHelp", null, "Search help articles…")} value={q} onChange={e => setQ(e.target.value)} /></div>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {help.length === 0 ? <div style={{ padding: 32 }} className="faint">{t("support.noArticlesMatch", null, "No articles match")} "{q}".</div> : help.map((h, i) => (
            <div key={i} style={{ borderTop: i ? "var(--hairline) solid var(--border)" : "none" }}>
              <button onClick={() => setOpen(open === i ? null : i)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "16px var(--pad-card)", background: "none", border: "none", cursor: "pointer" }}>
                <span className="tag" style={{ flex: "none", background: "var(--panel-inset)", color: "var(--text-muted)" }}>{helpCatLabel(t, h.cat)}</span>
                <b style={{ flex: 1, fontSize: 14.5 }}>{builderHelpArticleField(t, h._idx, "q", h.q)}</b>
                <Icon name="chevronDown" size={18} style={{ color: "var(--text-faint)", transform: open === i ? "rotate(180deg)" : "none", transition: "transform .2s", flex: "none" }} />
              </button>
              {open === i && <p className="muted" style={{ margin: 0, padding: "0 var(--pad-card) 18px 64px", fontSize: 14, lineHeight: 1.6 }}>{builderHelpArticleField(t, h._idx, "a", h.a)}</p>}
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: "var(--pad-card)", marginTop: 16, display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ width: 44, height: 44, borderRadius: 12, flex: "none", display: "grid", placeItems: "center", background: "var(--accent-weak)", color: "var(--accent)" }}><Icon name="life" size={22} /></span>
          <div style={{ flex: 1 }}><b style={{ fontSize: 14.5 }}>{t("support.stillStuck", null, "Still stuck?")}</b><div className="faint" style={{ fontSize: 13 }}>{t("support.raiseTicketReply", null, "Raise a ticket and we'll reply within a few hours.")}</div></div>
          <button className="btn btn-ghost" onClick={() => setRaising(true)}>{t("support.contactSupport", null, "Contact support")}</button>
        </div>
      </div>}

      {tab === "tickets" && <div className="rise-3">
        {data.tickets.length === 0 ? <Empty icon="life" title={t("support.noTicketsYet", null, "No tickets yet")} action={<button className="btn btn-primary" onClick={() => setRaising(true)}>{t("support.raiseTicket", null, "Raise a ticket")}</button>}>{t("support.ticketsAppearHere", null, "When you raise a support ticket it'll appear here.")}</Empty> : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {data.tickets.slice(0, visibleTicketsCount).map((ticketObj, i) => {
              const st = getTicketStatus(t)[ticketObj.status] || getTicketStatus(t).open;
              const tObj = ticketObj;
              /* st defined above */
              return (
                <div key={tObj.id} onClick={() => setViewingTicket(tObj)} className="row gap-3" style={{ padding: "15px var(--pad-card)", borderTop: i ? "var(--hairline) solid var(--border)" : "none", cursor: "pointer" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row gap-2 wrap"><b style={{ fontSize: 14.5 }}>{tObj.subject}</b>{tObj.priority === "urgent" && <span className="tag" style={{ background: "var(--danger-weak)", color: "var(--danger)" }}>{t("status.urgent", null, "Urgent")}</span>}</div>
                    <div className="faint mono" style={{ fontSize: 11.5, marginTop: 4 }}>{tObj.id} · {helpCatLabel(t, tObj.cat)} · {t("support.updated", null, "updated")} {tObj.updated}</div>
                    {tObj.reply && <p className="muted" style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.5, padding: "10px 12px", background: "var(--panel-inset)", borderRadius: "var(--radius-sm, 8px)" }}><b style={{ color: "var(--text)" }}>{t("support.supportReply", null, "Support reply:")}</b> {tObj.reply}</p>}
                  </div>
                  <span className="tag" style={{ background: st.bg, color: st.c, flex: "none" }}>{st.l}</span>
                  <Icon name="chevronRight" size={18} style={{ color: "var(--text-faint)", flex: "none" }} />
                </div>
              );
            })}
            {visibleTicketsCount < data.tickets.length && (
              <div style={{ textAlign: "center", padding: 16 }}>
                <button className="btn btn-ghost" onClick={() => setVisibleTicketsCount(c => c + 20)}>{t("actions.loadMoreTickets", null, "Load more tickets")}</button>
              </div>
            )}
          </div>
        )}
      </div>}

      {raising && <RaiseTicket onClose={() => setRaising(false)} onCreated={(t) => setData(d => ({ ...d, tickets: [{ ...t, updated: "Just now" }, ...d.tickets] }))} />}
      {viewingTicket && <ViewTicket ticket={viewingTicket} onClose={() => setViewingTicket(null)} />}
    </div>
  );
}
