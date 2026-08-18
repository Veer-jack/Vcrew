/* eslint-disable react-hooks/purity */
import { useState } from "react";
import Icon from "./Icon";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n/index.jsx";

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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();

  const getActiveTabs = (t) => tabs || [
    { k: "all", l: t("status.all", null, "All"), filter: () => true }, 
    { k: "application", l: t("notifications.applications", null, "Applications"), filter: n => n.cat === "application" }, 
    { k: "message", l: t("notifications.messages", null, "Messages"), filter: n => n.cat === "message" }, 
    { k: "system", l: t("notifications.system", null, "System"), filter: n => n.cat === "system" }
  ];
  const activeTabs = getActiveTabs(t);
  
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
  
  // Each entry builds the /missions/:id path (with a tab where one applies)
  // for a target_id-bearing notification, keyed by its real `type` column
  // instead of guessing from title substrings (title wording drifts, type
  // doesn't).
  const MISSION_TAB_ROUTE = {
    participant_joined: id => `/missions/${id}?tab=participants`,
    invite_declined: id => `/missions/${id}?tab=participants`,
    user_minus: id => `/missions/${id}?tab=participants`,
    mission_failed: id => `/missions/${id}?tab=participants`,
    shipment_received: id => `/missions/${id}?tab=shipments`,
    schedule_accepted: id => `/missions/${id}?tab=interviews`,
    schedule_declined: id => `/missions/${id}?tab=interviews`,
    checkin: id => `/missions/${id}?tab=checkins`,
    mission_full_submissions: id => `/missions/${id}?tab=responses`,
  };

  const open = (n) => {
    // Mark-as-read is fire-and-forget — the click should close the panel
    // and navigate immediately, not wait on a network round-trip first.
    // Local state updates optimistically so the unread dot clears right away.
    if (n.unread) {
      setItems(its => its.map(i => i.id === n.id ? { ...i, unread: false } : i));
      if (onRead) onRead(n.id).catch?.(() => {});
    }
    onClose();
    const go = (path) => navigate(path, { state: { refresh: Date.now() } });

    if (n.link) {
      go(n.link);
      return;
    }

    if (n.type === "new_message") {
      go(n.target_id ? `/messages?thread=${n.target_id}` : "/messages");
    } else if (n.type === "verification") {
      go("/settings");
    } else if (n.type === "ticket_reply") {
      go("/support?tab=tickets");
    } else if (n.type === "submission" && n.missionId) {
      // "submission" also covers a Focus Group availability submission —
      // same type, different tab, title is the only thing that tells them apart.
      go(`/missions/${n.missionId}?tab=${n.title?.includes("Focus Group") ? "focusgroup" : "responses"}`);
    } else if (n.type && MISSION_TAB_ROUTE[n.type] && n.missionId) {
      go(MISSION_TAB_ROUTE[n.type](n.missionId));
    } else if (n.missionId) {
      go(`/missions/${n.missionId}`);
    } else {
      // No target to deep-link to (invite_expired, the account-created
      // welcomes) — dashboard beats doing nothing when the panel already
      // closed on click.
      go("/");
    }
  };

  return (
    <div style={{ display: "contents" }}>
      <div className="notif-overlay" onClick={onClose} />
      <div className="notif-panel">
        <div className="notif-h">
          <b>{t("notifications.title", null, "Notifications")}</b>
          <div className="row gap-2">
            <button className="backlink" style={{ margin: 0, fontSize: 12.5 }} onClick={markAll}>{t("actions.markAllRead", null, "Mark all read")}</button>
            <button className="backlink" style={{ margin: 0, fontSize: 12.5, color: "var(--danger, #ff4d4f)" }} onClick={clearAll}>{t("actions.clearAll", null, "Clear all")}</button>
            <button className="icon-btn" aria-label={t("actions.close", null, "Close")} style={{ width: 32, height: 32 }} onClick={onClose}><Icon name="x" size={16} /></button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, padding: "12px 16px", borderBottom: "var(--hairline) solid var(--border)", overflowX: "auto" }}>
          {activeTabs.map(c => (
            <button key={c.k} className="pill" onClick={() => setActiveTab(c.k)} style={{ cursor: "pointer", whiteSpace: "nowrap", flex: "none",
              background: activeTab === c.k ? "var(--accent)" : "var(--panel)", borderColor: activeTab === c.k ? "var(--accent)" : "var(--border)", color: activeTab === c.k ? "#fff" : "var(--text-muted)" }}>{c.l}</button>
          ))}
        </div>
        <div className="notif-list">
          {rows.length === 0 && <div className="muted" style={{ padding: 24, textAlign: "center" }}>{t("notifications.noNotifications", null, "No notifications here.")}</div>}
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
