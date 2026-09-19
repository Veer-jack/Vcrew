import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import { Avatar, Btn, UpdatingBadge } from "../components/ui";
import { api } from "../api/client";
import { useTranslation } from "../i18n/index.jsx";
import { trFilterLabel } from "../data/audienceFilterLabels";

export default function Messages() {
  const { t, dataVersion } = useTranslation();
  const navigate = useNavigate();
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
  const [refetching, setRefetching] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisibleThreadsCount(30), 0);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const t = setTimeout(() => setVisibleMessagesCount(50), 0);
    return () => clearTimeout(t);
  }, [activeId]);

  useEffect(() => {
    setTimeout(() => setRefetching(true), 0);
    api.threads().then(d => {
      setThreads(d.threads);
      const requested = requestedThreadId && d.threads.find(t => String(t.id) === requestedThreadId);
      setActiveId(prev => {
        if (requested) return requested.id;
        if (prev && d.threads.some(t => t.id === prev)) return prev;
        // Deliberately not defaulting to threads[0] — WhatsApp Web doesn't
        // open a chat until you pick one, and neither should this, unless a
        // notification link or an explicit click asked for a specific one.
        return null;
      });
    }).catch(() => {}).finally(() => setRefetching(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedThreadId, dataVersion]);

  useEffect(() => {
    if (!activeId) return;
    api.thread(activeId).then(d => setActive(d.thread)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, dataVersion]);

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
      api.thread(activeId).then(d => setActive(prev => (prev?.messages?.length >= d.thread.messages.length ? prev : d.thread))).catch(() => {});
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
      api.threads().then(d => setThreads(d.threads)).catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Keyed on activeId too, not just message count — a notification deep-link
  // into a thread that was already open (same id, new message just polled
  // in) never changed messages.length by the time this ran, so the view
  // stayed scrolled wherever it happened to be instead of jumping to the
  // newest message.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeId, active?.messages?.length]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !activeId) return;
    setDraft("");
    setActive(a => ({ ...a, messages: [...a.messages, { from: "me", text, time: "Now" }] }));
    try { await api.sendMessage(activeId, text); } catch { /* best effort */ }
  };

  const sendFile = async (file) => {
    if (!file || !activeId) return;
    try {
      const { message } = await api.sendAttachment(activeId, file);
      setActive(a => ({ ...a, messages: [...a.messages, message] }));
    } catch (err) {
      alert(err.message || t("messages.errSendFile", null, "Couldn't send file"));
    }
  };

  // Every thread requires a validatorId + missionId (see backend messages.js
  // POST /threads) -- there's no anyone-to-anyone DM in this app, so
  // "Start a conversation" can't open a composer of its own. It routes to
  // Missions instead, which is genuinely where every conversation begins
  // today (a participant row, an application, a submission reply) -- same
  // flow the tip line below already points to in words.
  if (!threads.length) return (
    <div className="page rise">
      <div className="ph" style={{ marginBottom: 16 }}>
        <div><h1 style={{ margin: 0 }}>{t("messages.title", null, "Messages")}</h1><p className="lead">{t("messages.lead", null, "Chat directly with your validators and researchers.")}</p></div>
      </div>
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
        <Btn variant="primary" icon="send" onClick={() => navigate("/missions")} style={{ marginTop: 10 }}>{t("actions.startConversation", null, "Start a conversation")}</Btn>
        <p className="faint" style={{ margin: "10px 0 0", fontSize: 12 }}>{t("messages.startConversationTip", null, "Tip — invite participants from a Mission to message them directly.")}</p>
      </div>
      </div>
    </div>
  );

  const visibleThreads = q.trim()
    ? threads.filter(t => (t.name + " " + (t.mission || "")).toLowerCase().includes(q.trim().toLowerCase()))
    : threads;

  return (
    // .page (like every other page) for the same max-width + centering,
    // with a flex column layout on top so the standard .ph header sits
    // above the conversation grid without breaking full-height, no-page-
    // scroll behavior -- flex:1/minHeight:0 on the grid below just fills
    // whatever height the header doesn't use, instead of a hardcoded
    // "100vh minus header px" guess that drifts if the header ever wraps.
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)" }}>
      <div className="ph" style={{ flex: "none" }}>
        <div><h1 style={{ margin: 0 }}>{t("messages.title", null, "Messages")}</h1><p className="lead">{t("messages.lead", null, "Chat directly with your validators and researchers.")}</p></div>
      </div>
      <div className="msg-grid card" style={{ display: "grid", gridTemplateColumns: "330px minmax(0,1fr)", flex: 1, minHeight: 0, overflow: "hidden" }}>
      <div style={{ borderRight: "var(--hairline) solid var(--border)", display: "flex", flexDirection: "column", background: "var(--panel)", minWidth: 0, minHeight: 0 }}>
        <div style={{ padding: "16px 18px 12px", borderBottom: "var(--hairline) solid var(--border)" }}>
          {refetching && <div style={{ marginBottom: 8 }}><UpdatingBadge show /></div>}
          <div className="seg-search" style={{ maxWidth: "100%" }}><Icon name="search" size={16} /><input placeholder={t("messages.searchPlaceholder", null, "Search conversations…")} value={q} onChange={e => setQ(e.target.value)} /></div>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {visibleThreads.length === 0 && <div className="muted" style={{ padding: 18, fontSize: 13.5 }}>{t("messages.noMatch", { q }, `No conversations match "${q}".`)}</div>}
          {visibleThreads.slice(0, visibleThreadsCount).map(th => (
            <button key={th.id} onClick={() => setActiveId(th.id)} style={{ display: "flex", gap: 12, width: "100%", textAlign: "left", padding: "14px 18px",
              border: "none", borderBottom: "var(--hairline) solid var(--border)", background: th.id === activeId ? "var(--accent-weak)" : "transparent", cursor: "pointer" }}>
              <Avatar name={th.name} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row between" style={{ gap: 6 }}><b style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{th.name}</b><span className="feed-time" style={{ flex: "none" }}>{th.time}</span></div>
                <div className="faint" style={{ fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{th.mission}</div>
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
          <div className="row gap-3" style={{ padding: "12px 24px", borderBottom: "var(--hairline) solid var(--border)", background: "var(--panel)" }}>
            <Avatar name={active.name} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}><b style={{ fontSize: 15 }}>{active.name}</b><div className="faint" style={{ fontSize: 12.5 }}>{trFilterLabel(t, active.role)}</div></div>
            {active.mission && <span className="pill" style={{ fontSize: 12 }}><Icon name="layers" size={13} />{active.mission}</span>}
          </div>
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 12, background: "var(--bg)" }}>
            {visibleMessagesCount < active.messages.length && (
              <div style={{ textAlign: "center" }}>
                <Btn variant="outline" size="sm" onClick={() => setVisibleMessagesCount(c => c + 50)}>{t("actions.loadPrevious", null, "Load previous")}</Btn>
              </div>
            )}
            {active.messages.slice(-visibleMessagesCount).map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.from === "me" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "66%" }}>
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
          <div className="row gap-2" style={{ padding: "14px 24px", borderTop: "var(--hairline) solid var(--border)", background: "var(--panel)" }}>
            <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) sendFile(f); e.target.value = ""; }} />
            <button className="icon-btn" aria-label={t("actions.attachFile", null, "Attach file")} onClick={() => fileInputRef.current?.click()}><Icon name="paperclip" size={18} /></button>
            <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder={t("messages.messagePlaceholder", { name: active.name }, `Message ${active.name}…`)}
              style={{ flex: 1, padding: "11px 14px", border: "var(--hairline) solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--panel-inset)", fontFamily: "inherit", fontSize: 14, color: "var(--text)", outline: "none" }} />
            <Btn variant="primary" icon="send" onClick={send} disabled={!draft.trim()}>{t("actions.send", null, "Send")}</Btn>
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
