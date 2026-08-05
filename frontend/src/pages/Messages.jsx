import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import { Avatar, Btn } from "../components/ui";
import { api } from "../api/client";
import { useTranslation } from "../i18n/index.jsx";
import { trFilterLabel } from "../data/audienceFilterLabels";

export default function Messages() {
  const { t } = useTranslation();
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

  useEffect(() => {
    const t = setTimeout(() => setVisibleThreadsCount(30), 0);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const t = setTimeout(() => setVisibleMessagesCount(50), 0);
    return () => clearTimeout(t);
  }, [activeId]);

  useEffect(() => {
    api.threads().then(d => {
      setThreads(d.threads);
      const requested = requestedThreadId && d.threads.find(t => String(t.id) === requestedThreadId);
      if (requested) setActiveId(requested.id);
      else if (d.threads.length) setActiveId(d.threads[0].id);
    });
  }, [requestedThreadId]);

  useEffect(() => {
    if (!activeId) return;
    api.thread(activeId).then(d => setActive(d.thread));
  }, [activeId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [active?.messages?.length]);

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

  if (!threads.length) return <div className="page rise"><div className="muted">{t("messages.noConversations", null, "No conversations yet.")}</div></div>;

  const visibleThreads = q.trim()
    ? threads.filter(t => (t.name + " " + (t.mission || "")).toLowerCase().includes(q.trim().toLowerCase()))
    : threads;

  return (
    <div className="msg-grid" style={{ display: "grid", gridTemplateColumns: "330px minmax(0,1fr)", height: "calc(100vh - 64px)" }}>
      <div style={{ borderRight: "var(--hairline) solid var(--border)", display: "flex", flexDirection: "column", background: "var(--panel)", minWidth: 0 }}>
        <div style={{ padding: "16px 18px 12px", borderBottom: "var(--hairline) solid var(--border)" }}>
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
                <div className="muted" style={{ fontSize: 12.5, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{th.last}</div>
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
      {active && (
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
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
                      ? <a href={m.attachment.url} target="_blank" rel="noreferrer" style={{ color: "inherit", display: "flex", alignItems: "center", gap: 6 }}><Icon name="paperclip" size={14} />{m.attachment.name}</a>
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
      )}
    </div>
  );
}
