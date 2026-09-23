import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import { VAvatar } from "../vcomponents/vui";
import { vapi } from "../vapi/client";
import { useTranslation } from "../i18n/index.jsx";
import { trFilterLabel } from "../data/audienceFilterLabels";

export default function Messages() {
  const { t, dataVersion } = useTranslation();
  const [searchParams] = useSearchParams();
  const requestedThreadId = searchParams.get("thread");
  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [active, setActive] = useState(null);
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const [visibleThreadsCount, setVisibleThreadsCount] = useState(30);
  const [visibleMessagesCount, setVisibleMessagesCount] = useState(50);

  useEffect(() => { setVisibleThreadsCount(30); }, [q]);
  useEffect(() => { setVisibleMessagesCount(50); }, [activeId]);

  useEffect(() => {
    vapi.threads().then(d => {
      setThreads(d.threads);
      const requested = requestedThreadId && d.threads.find(t => String(t.id) === requestedThreadId);
      setActiveId(prev => {
        if (requested) return requested.id;
        if (prev && d.threads.some(t => t.id === prev)) return prev;
        // Used to deliberately stay unselected here (WhatsApp Web doesn't
        // open a chat until you pick one) -- tester feedback was that an
        // empty right pane on first load just reads as broken, not as a
        // deliberate blank state, so the first (most recent) thread opens
        // automatically now instead.
        return d.threads[0]?.id ?? null;
      });
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedThreadId, dataVersion]);
  useEffect(() => { if (activeId) vapi.thread(activeId).then(d => setActive(d.thread)).catch(() => {}); }, [activeId, dataVersion]);

  // No WebSocket/push infra in this app yet — polling the open thread is the
  // lazy stand-in for "real time": a few seconds of lag instead of a socket
  // server, connection handling, and auth-over-socket for one feature.
  // Best-effort: a poll tick failing (a network blip, a brief server restart)
  // shouldn't spam the console with an unhandled rejection every 5s — the
  // next tick just tries again.
  useEffect(() => {
    if (!activeId) return;
    const interval = setInterval(() => {
      // A poll can still be in flight when send() optimistically appends the
      // just-sent message. If that older response lands after the append, it
      // carries fewer messages than what's already on screen — applying it
      // would make the message just sent flicker away until the next tick
      // catches up. Never go backwards in count; only ever adopt server data
      // that has caught up to (or moved past) what we're already showing.
      vapi.thread(activeId).then(d => setActive(prev => (prev?.messages?.length >= d.thread.messages.length ? prev : d.thread))).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [activeId]);

  // The message poll above only refreshes the thread that's currently open —
  // a new message landing in a *different* conversation wouldn't move it up
  // or update its preview until the page was reloaded. Keeps activeId as-is,
  // unlike the initial load effect, so this doesn't fight the user's own
  // thread selection.
  useEffect(() => {
    const interval = setInterval(() => {
      vapi.threads().then(d => setThreads(d.threads)).catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Keyed on activeId too, not just message count — a notification deep-link
  // into a thread that was already open (same id, new message just polled
  // in) never changed messages.length by the time this ran, so the view
  // stayed scrolled wherever it happened to be instead of jumping to the
  // newest message.
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [activeId, active?.messages?.length]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !activeId) return;
    setDraft("");
    setActive(a => ({ ...a, messages: [...a.messages, { from: "me", text, time: "Now" }] }));
    try { await vapi.sendMessage(activeId, text); } catch { /* best effort */ }
  };

  const sendFile = async (file) => {
    if (!file || !activeId) return;
    try {
      const { message } = await vapi.sendAttachment(activeId, file);
      setActive(a => ({ ...a, messages: [...a.messages, message] }));
    } catch (err) {
      alert(err.message || t("vMessages.couldntSendFile", null, "Couldn't send file"));
    }
  };

  // Mirrors the builder side's Messages.jsx empty state -- same illustration
  // built from the existing inbox/send icons, same copy. No "Start a
  // conversation" button here (there was one, routing to /validator/missions)
  // -- threads require a builder/mission pairing (see backend messages.js
  // POST /threads), so there's no anyone-to-anyone DM to open, and a button
  // that just lands on Missions with no explanation read as broken rather
  // than helpful. The tip line below already says how messaging actually
  // starts.
  if (!threads.length) return (
    <div className="page rise">
      <div className="ph"><div><h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{t("messages.title", null, "Messages")}</h1><p className="lead">{t("vMessages.lead", null, "Chat directly with the builders and researchers you're working with.")}</p></div></div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6, maxWidth: 380 }}>
        <div style={{ position: "relative", width: 84, height: 84, marginBottom: 8 }}>
          <div style={{ width: 84, height: 84, borderRadius: "50%", background: "var(--accent-weak)", display: "grid", placeItems: "center" }}>
            <Icon name="inbox" size={34} style={{ color: "var(--accent)" }} />
          </div>
          <div style={{ position: "absolute", top: -6, right: -6, width: 34, height: 34, borderRadius: "50%", background: "var(--accent)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-sm)" }}>
            <Icon name="send" size={15} style={{ color: "#fff" }} />
          </div>
        </div>
        <b style={{ fontSize: 17 }}>{t("messages.noConversations", null, "No conversations yet")}</b>
        <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>{t("messages.noConversationsDesc", null, "Once you start working with participants or researchers, your conversations will appear here.")}</p>
        <p className="faint" style={{ margin: "10px 0 0", fontSize: 12 }}>{t("vMessages.startConversationTip", null, "Tip — you'll be able to message a builder once you're on a mission with them.")}</p>
      </div>
      </div>
    </div>
  );

  const visibleThreads = q.trim()
    ? threads.filter(t => (t.name + " " + (t.mission || "")).toLowerCase().includes(q.trim().toLowerCase()))
    : threads;

  return (
    // .page's own bottom padding (32px) is invisible on a normal scrolling
    // page, but here it left a dead gray strip below the chat card instead
    // of the card reaching the bottom of the viewport -- paddingBottom:0
    // lets the card's flex:1 claim that space instead.
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)", paddingBottom: 0 }}>
      <div className="ph" style={{ flex: "none" }}>
        <div><h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{t("messages.title", null, "Messages")}</h1><p className="lead">{t("vMessages.lead", null, "Chat directly with the builders and researchers you're working with.")}</p></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "320px minmax(0,1fr)", flex: 1, minHeight: 0, overflow: "hidden" }} className="msg-wrap card">
      <div style={{ borderRight: "var(--hairline) solid var(--border)", display: "flex", flexDirection: "column", background: "var(--panel)", minWidth: 0, minHeight: 0 }}>
        <div style={{ padding: "16px var(--pad-card) 12px", borderBottom: "var(--hairline) solid var(--border)" }}>
          <div className="search"><Icon name="search" size={16} /><input placeholder={t("messages.searchMessages", null, "Search messages…")} value={q} onChange={e => setQ(e.target.value)} /></div>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {visibleThreads.length === 0 && <div className="muted" style={{ padding: 18, fontSize: 13.5 }}>{t("messages.noMatch", { q }, `No conversations match "${q}".`)}</div>}
          {visibleThreads.slice(0, visibleThreadsCount).map(th => (
            <button key={th.id} onClick={() => setActiveId(th.id)} style={{ display: "flex", gap: 12, width: "100%", textAlign: "left", padding: "14px var(--pad-card)",
              border: "none", borderBottom: "var(--hairline) solid var(--border)", background: th.id === activeId ? "var(--accent-weak)" : "transparent", cursor: "pointer" }}>
              <VAvatar name={th.name} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row between" style={{ gap: 6 }}><b style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{th.name}</b><span className="feed-time" style={{ flex: "none" }}>{th.time}</span></div>
                <div className="faint" style={{ fontSize: 11.5 }}>{trFilterLabel(t, th.role)}</div>
                <div className="row between" style={{ gap: 6, marginTop: 3 }}>
                  <div className={th.unread ? undefined : "muted"} style={{ fontSize: 12.5, fontWeight: th.unread ? 700 : 400, color: th.unread ? "var(--text)" : undefined, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{th.last}</div>
                  {!!th.unread && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />}
                </div>
              </div>
            </button>
          ))}
          {visibleThreadsCount < visibleThreads.length && (
            <div style={{ textAlign: "center", padding: 16 }}>
              <button className="backlink" onClick={() => setVisibleThreadsCount(c => c + 30)}>{t("actions.loadMoreThreads", null, "Load more threads")}</button>
            </div>
          )}
        </div>
      </div>
      {active ? (
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
          <div className="row gap-3" style={{ padding: "13px var(--pad-page)", borderBottom: "var(--hairline) solid var(--border)", background: "var(--panel)" }}>
            <VAvatar name={active.name} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}><b style={{ fontSize: 15 }}>{active.name}</b><div className="faint" style={{ fontSize: 12.5 }}>{trFilterLabel(t, active.role)}</div></div>
            {active.mission && <span className="pill" style={{ fontSize: 12 }}><Icon name="layers" size={13} />{active.mission}</span>}
            {active.missionId && (
              <button className="icon-btn" aria-label={t("vMessages.openInNewTab", null, "Open mission in new tab")} onClick={() => window.open(`/validator/missions/${active.missionId}`, "_blank", "noopener")}>
                <Icon name="external" size={17} />
              </button>
            )}
          </div>
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 12, background: "var(--bg)" }}>
            {visibleMessagesCount < active.messages.length && (
              <div style={{ textAlign: "center" }}>
                <button className="btn btn-outline" style={{ fontSize: 12, padding: "4px 12px" }} onClick={() => setVisibleMessagesCount(c => c + 50)}>{t("actions.loadPrevious", null, "Load previous")}</button>
              </div>
            )}
            {active.messages.slice(-visibleMessagesCount).map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.from === "me" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "68%" }}>
                  <div style={{ padding: "10px 14px", borderRadius: 14, fontSize: 14, lineHeight: 1.5,
                    background: m.from === "me" ? "var(--accent)" : "var(--panel)", color: m.from === "me" ? "#fff" : "var(--text)",
                    border: m.from === "me" ? "none" : "var(--hairline) solid var(--border)",
                    borderBottomRightRadius: m.from === "me" ? 4 : 14, borderBottomLeftRadius: m.from === "me" ? 14 : 4 }}>
                    {m.attachment
                      ? <a href={m.attachment.url} target="_blank" rel="noreferrer" style={{ color: "inherit", display: "flex", alignItems: "center", gap: 6, textDecoration: "underline" }}><Icon name="paperclip" size={14} />{m.attachment.name}</a>
                      : m.text}
                  </div>
                  <div className="feed-time" style={{ textAlign: m.from === "me" ? "right" : "left", marginTop: 4, padding: "0 4px" }}>{m.time}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="row gap-2" style={{ padding: "14px var(--pad-page)", borderTop: "var(--hairline) solid var(--border)", background: "var(--panel)" }}>
            <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) sendFile(f); e.target.value = ""; }} />
            <button className="icon-btn" aria-label={t("vMessages.attachFile", null, "Attach file")} onClick={() => fileInputRef.current?.click()}><Icon name="paperclip" size={18} /></button>
            <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder={t("messages.messageName", { name: active.name }, `Message ${active.name}…`)}
              style={{ flex: 1, padding: "11px 14px", border: "var(--hairline) solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--panel-inset)", fontFamily: "inherit", fontSize: 14, color: "var(--text)", outline: "none" }} />
            <button className="btn btn-primary" onClick={send} disabled={!draft.trim()}><Icon name="send" size={17} />{t("actions.send", null, "Send")}</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, minWidth: 0, background: "var(--bg)" }}>
          <span style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--panel-inset)", display: "grid", placeItems: "center", color: "var(--text-faint)" }}><Icon name="message" size={24} /></span>
          <b style={{ fontSize: 15 }}>{t("messages.selectConversation", null, "Select a conversation")}</b>
          <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>{t("messages.selectConversationHint", null, "Choose someone from the list on the left to view your messages.")}</p>
        </div>
      )}
      </div>
    </div>
  );
}
