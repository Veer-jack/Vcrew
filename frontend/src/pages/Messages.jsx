import { useEffect, useRef, useState } from "react";
import Icon from "../components/Icon";
import { Avatar, Btn } from "../components/ui";
import { api } from "../api/client";

export default function Messages() {
  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [active, setActive] = useState(null);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    api.threads().then(d => {
      setThreads(d.threads);
      if (d.threads.length) setActiveId(d.threads[0].id);
    });
  }, []);

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

  if (!threads.length) return <div className="page rise"><div className="muted">No conversations yet.</div></div>;

  return (
    <div className="msg-grid" style={{ display: "grid", gridTemplateColumns: "330px minmax(0,1fr)", height: "calc(100vh - 64px)" }}>
      <div style={{ borderRight: "var(--hairline) solid var(--border)", display: "flex", flexDirection: "column", background: "var(--panel)", minWidth: 0 }}>
        <div style={{ padding: "16px 18px 12px", borderBottom: "var(--hairline) solid var(--border)" }}>
          <div className="seg-search" style={{ maxWidth: "100%" }}><Icon name="search" size={16} /><input placeholder="Search conversations…" /></div>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {threads.map(t => (
            <button key={t.id} onClick={() => setActiveId(t.id)} style={{ display: "flex", gap: 12, width: "100%", textAlign: "left", padding: "14px 18px",
              border: "none", borderBottom: "var(--hairline) solid var(--border)", background: t.id === activeId ? "var(--accent-weak)" : "transparent", cursor: "pointer" }}>
              <Avatar name={t.name} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row between" style={{ gap: 6 }}><b style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</b><span className="feed-time" style={{ flex: "none" }}>{t.time}</span></div>
                <div className="faint" style={{ fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.mission}</div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.last}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      {active && (
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div className="row gap-3" style={{ padding: "12px 24px", borderBottom: "var(--hairline) solid var(--border)", background: "var(--panel)" }}>
            <Avatar name={active.name} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}><b style={{ fontSize: 15 }}>{active.name}</b><div className="faint" style={{ fontSize: 12.5 }}>{active.role}</div></div>
            {active.mission && <span className="pill" style={{ fontSize: 12 }}><Icon name="layers" size={13} />{active.mission}</span>}
          </div>
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 12, background: "var(--bg)" }}>
            {active.messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.from === "me" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "66%" }}>
                  <div style={{ padding: "10px 14px", borderRadius: 14, fontSize: 14, lineHeight: 1.5,
                    background: m.from === "me" ? "var(--accent)" : "var(--panel)", color: m.from === "me" ? "#fff" : "var(--text)",
                    border: m.from === "me" ? "none" : "var(--hairline) solid var(--border)",
                    borderBottomRightRadius: m.from === "me" ? 4 : 14, borderBottomLeftRadius: m.from === "me" ? 14 : 4 }}>{m.text}</div>
                  <div className="feed-time" style={{ textAlign: m.from === "me" ? "right" : "left", marginTop: 4, padding: "0 4px" }}>{m.time}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="row gap-2" style={{ padding: "14px 24px", borderTop: "var(--hairline) solid var(--border)", background: "var(--panel)" }}>
            <button className="icon-btn"><Icon name="paperclip" size={18} /></button>
            <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder={`Message ${active.name}…`}
              style={{ flex: 1, padding: "11px 14px", border: "var(--hairline) solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--panel-inset)", fontFamily: "inherit", fontSize: 14, color: "var(--text)", outline: "none" }} />
            <Btn variant="primary" icon="send" onClick={send} disabled={!draft.trim()}>Send</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
