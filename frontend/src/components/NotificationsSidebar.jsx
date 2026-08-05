import { useState } from "react";
import Icon from "./Icon";
import { useNavigate } from "react-router-dom";

function timeAgo(dateString) {
  if (!dateString) return null;
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  let interval = seconds / 31536000;
  if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? ' year ago' : ' years ago');
  interval = seconds / 2592000;
  if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? ' month ago' : ' months ago');
  interval = seconds / 604800;
  if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? ' week ago' : ' weeks ago');
  interval = seconds / 86400;
  if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? ' day ago' : ' days ago');
  interval = seconds / 3600;
  if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? ' hr ago' : ' hrs ago');
  interval = seconds / 60;
  if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? ' min ago' : ' mins ago');
  return 'Just now';
}

export default function NotificationsSidebar({ onClose, items, setItems, onMarkAllRead, onClearAll, onRead, tabs }) {
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();

  const activeTabs = tabs || [
    { k: "all", l: "All", filter: () => true }, 
    { k: "application", l: "Applications", filter: n => n.cat === "application" }, 
    { k: "message", l: "Messages", filter: n => n.cat === "message" }, 
    { k: "system", l: "System", filter: n => n.cat === "system" }
  ];
  
  const currentTab = activeTabs.find(t => t.k === activeTab) || activeTabs[0];
  const rows = items.filter(currentTab.filter || (() => true));

  const markAll = async () => {
    if (onMarkAllRead) await onMarkAllRead();
    setItems(its => its.map(i => ({ ...i, unread: false })));
  };
  
  const clearAll = async () => {
    if (onClearAll) await onClearAll();
    setItems([]);
  };
  
  const open = async (n) => {
    if (n.unread) {
      if (onRead) await onRead(n.id);
      setItems(its => its.map(i => i.id === n.id ? { ...i, unread: false } : i));
    }
    onClose();
    
    if (n.link) {
      navigate(n.link);
      return;
    }
    
    if (n.title.includes("Participant") || n.type === "participant") {
      navigate(n.missionId ? `/missions/${n.missionId}?tab=participants` : "/missions");
    } else if (n.type === "application" || n.title.includes("Accepted") || n.title.includes("Approved") || n.title.includes("Rejected")) {
      navigate("/missions");
    } else if (n.title.includes("Submission") || n.type === "submission") {
      navigate(n.missionId ? `/missions/${n.missionId}` : "/missions");
    }
  };

  return (
    <div style={{ display: "contents" }}>
      <div className="notif-overlay" onClick={onClose} />
      <div className="notif-panel">
        <div className="notif-h">
          <b>Notifications</b>
          <div className="row gap-2">
            <button className="backlink" style={{ margin: 0, fontSize: 12.5 }} onClick={markAll}>Mark all read</button>
            <button className="backlink" style={{ margin: 0, fontSize: 12.5, color: "var(--danger, #ff4d4f)" }} onClick={clearAll}>Clear all</button>
            <button className="icon-btn" aria-label="Close" style={{ width: 32, height: 32 }} onClick={onClose}><Icon name="x" size={16} /></button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, padding: "12px 16px", borderBottom: "var(--hairline) solid var(--border)", overflowX: "auto" }}>
          {activeTabs.map(c => (
            <button key={c.k} className="pill" onClick={() => setActiveTab(c.k)} style={{ cursor: "pointer", whiteSpace: "nowrap", flex: "none",
              background: activeTab === c.k ? "var(--accent)" : "var(--panel)", borderColor: activeTab === c.k ? "var(--accent)" : "var(--border)", color: activeTab === c.k ? "#fff" : "var(--text-muted)" }}>{c.l}</button>
          ))}
        </div>
        <div className="notif-list">
          {rows.length === 0 && <div className="muted" style={{ padding: 24, textAlign: "center" }}>No notifications here.</div>}
          {rows.map(n => (
            <div key={n.id} className={`notif-item ${n.unread ? "unread" : ""}`} onClick={() => open(n)}>
              <span className="notif-dot" />
              <span className={`feed-ic ${n.tone}`} style={{ width: 34, height: 34 }}><Icon name={n.icon} size={16} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row between" style={{ gap: 8 }}><b style={{ fontSize: 13.5 }}>{n.title}</b><span className="feed-time">{timeAgo(n.createdAt) || n.time || n.timeLabel}</span></div>
                <p className="muted" style={{ margin: "3px 0 0", fontSize: 13, lineHeight: 1.45 }}>{n.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
