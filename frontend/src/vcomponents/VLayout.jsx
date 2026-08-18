import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import Icon from "../components/Icon";
import { BrandLogoFull, BrandMark } from "../components/BrandMark";
import { VAvatar } from "./vui";
import { useVAuth } from "../vcontext/VAuthContext";
import { vapi } from "../vapi/client";
import { useTranslation } from "../i18n/index.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher";

function timeAgo(dateString, t) {
  if (!dateString) return null;
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  let interval = seconds / 31536000;
  if (interval >= 1) return t("vLayout.yearsAgo", { count: Math.floor(interval) }, `${Math.floor(interval)} ${Math.floor(interval) === 1 ? 'year' : 'years'} ago`);
  interval = seconds / 2592000;
  if (interval >= 1) return t("vLayout.monthsAgo", { count: Math.floor(interval) }, `${Math.floor(interval)} ${Math.floor(interval) === 1 ? 'month' : 'months'} ago`);
  interval = seconds / 604800;
  if (interval >= 1) return t("vLayout.weeksAgo", { count: Math.floor(interval) }, `${Math.floor(interval)} ${Math.floor(interval) === 1 ? 'week' : 'weeks'} ago`);
  interval = seconds / 86400;
  if (interval >= 1) return t("vLayout.daysAgo", { count: Math.floor(interval) }, `${Math.floor(interval)} ${Math.floor(interval) === 1 ? 'day' : 'days'} ago`);
  interval = seconds / 3600;
  if (interval >= 1) return t("vLayout.hrsAgo", { count: Math.floor(interval) }, `${Math.floor(interval)} ${Math.floor(interval) === 1 ? 'hr' : 'hrs'} ago`);
  interval = seconds / 60;
  if (interval >= 1) return t("vLayout.minsAgo", { count: Math.floor(interval) }, `${Math.floor(interval)} ${Math.floor(interval) === 1 ? 'min' : 'mins'} ago`);
  return t("vLayout.justNow", null, "Just now");
}

function VNotifPanel({ onClose, items, setItems }) {
  const { t } = useTranslation();
  const [cat, setCat] = useState("all");

  const rows = cat === "all" ? items : items.filter(n => n.cat === cat);
  // "application" was never an actual notification cat in the data (every
  // insert uses system/invite/mission/reward/alert) — this tab always showed
  // zero rows for everyone. Repointed at "alert" (submission rejected/revision,
  // the closest real equivalent of "your application status changed"), and
  // "mission" is a new tab for mission-lifecycle notifications (new match,
  // completed, slot opened, etc.) that previously had no dedicated filter.
  const cats = [
    { k: "all", l: t("vLayout.catAll", null, "All") }, { k: "invite", l: t("vLayout.catInvitations", null, "Invitations") },
    { k: "mission", l: t("vLayout.catMissions", null, "Missions") }, { k: "alert", l: t("vLayout.catApplications", null, "Applications") },
    { k: "message", l: t("vLayout.catMessages", null, "Messages") },
    { k: "reward", l: t("vLayout.catRewards", null, "Rewards") }, { k: "system", l: t("vLayout.catSystem", null, "System") },
  ];

  const markAll = async () => { await vapi.markAllRead(); setItems(its => its.map(i => ({ ...i, unread: false }))); };
  const clearAll = async () => { await vapi.clearAllNotifications(); setItems([]); };
  const navigate = useNavigate();

  // Each entry builds the path for a target_id-bearing mission notification.
  // Routes to the dedicated workflow page for that action where one exists
  // (schedule/poll/shipment/workspace) instead of dumping everyone on the
  // generic mission page regardless of what actually happened.
  const MISSION_TAB_ROUTE = {
    mission_full: id => `/validator/missions/${id}`,
    new_mission: id => `/validator/missions/${id}`,
    slot_available: id => `/validator/missions/${id}`,
    waitlist_invite: id => `/validator/missions/${id}`,
    mission_invite: id => `/validator/missions/${id}`,
    mission_updated: id => `/validator/missions/${id}`,
    removed: () => `/validator/missions`,
    invite_cancelled: () => `/validator/missions`,
    stage_update: id => `/validator/missions/${id}/workspace`,
    interview_completed: id => `/validator/missions/${id}/workspace`,
    focus_completed: id => `/validator/missions/${id}/workspace`,
    shipped: id => `/validator/missions/${id}/shipment`,
    schedule_proposed: id => `/validator/missions/${id}/schedule`,
    poll_created: id => `/validator/missions/${id}/poll`,
    poll_restarted: id => `/validator/missions/${id}/poll`,
    poll_locked: id => `/validator/missions/${id}/poll`,
    submission_approved: () => `/validator/missions?tab=completed`,
    mission_completed: () => `/validator/missions?tab=completed`,
    submission_rejected: () => `/validator/missions?tab=rejected`,
    submission_revision: () => `/validator/missions?tab=active`,
    mission_failed: () => `/validator/missions?tab=closed`,
  };

  const open = (n) => {
    // Mark-as-read is fire-and-forget — the click should close the panel
    // and navigate immediately, not wait on a network round-trip first.
    // Local state updates optimistically so the unread dot clears right away.
    if (n.unread) {
      setItems(its => its.map(i => i.id === n.id ? { ...i, unread: false } : i));
      vapi.markRead(n.id).catch(() => {});
    }
    onClose();
    const go = (path) => navigate(path, { state: { refresh: Date.now() } });

    if (n.type === 'new_message') {
      go(n.target_id ? `/validator/messages?thread=${n.target_id}` : "/validator/messages");
    } else if (n.type === 'ticket_reply') {
      go(`/validator/support?tab=tickets`);
    } else if (n.type === 'verified') {
      go(`/validator/profile`);
    } else if (n.type === 'payout') {
      go(`/validator/earnings`);
    } else if (n.type && MISSION_TAB_ROUTE[n.type]) {
      go(MISSION_TAB_ROUTE[n.type](n.target_id));
    // Everything below has no `type` column at all (see notificationsHelper.js
    // call sites without one, and the untyped inserts in missions.js/vearnings.js/
    // sweepFailures.js) — title is the only signal available to route them.
    } else if (!n.type && n.title?.includes("Submission received") && n.target_id) {
      go(`/validator/missions/${n.target_id}/submitted`);
    } else if (!n.type && n.title === "Mission Failed") {
      go(`/validator/missions?tab=closed`);
    } else if (!n.type && n.title?.includes("Level Up")) {
      go(`/validator/profile`);
    } else if (!n.type && n.title?.includes("Withdrawal")) {
      go(`/validator/earnings`);
    } else if (n.target_id) {
      go(`/validator/missions/${n.target_id}`);
    } else {
      // No target to deep-link to (tester-application decision, the
      // account-created welcomes) — dashboard beats doing nothing when the
      // panel already closed on click.
      go("/validator");
    }
  };

  return (
    <div style={{ display: "contents" }}>
      <div className="notif-overlay" onClick={onClose} />
      <div className="notif-panel">
        <div className="notif-h">
          <b>{t("vLayout.notifications", null, "Notifications")}</b>
          <div className="row gap-2">
            <button className="backlink" style={{ margin: 0, fontSize: 12.5 }} onClick={markAll}>{t("vLayout.markAllRead", null, "Mark all read")}</button>
            <button className="backlink" style={{ margin: 0, fontSize: 12.5, color: "var(--danger, #ff4d4f)" }} onClick={clearAll}>{t("vLayout.clearAll", null, "Clear all")}</button>
            <button className="icon-btn" aria-label={t("vLayout.close", null, "Close")} style={{ width: 32, height: 32 }} onClick={onClose}><Icon name="x" size={16} /></button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, padding: "12px 16px", borderBottom: "var(--hairline) solid var(--border)", overflowX: "auto" }}>
          {cats.map(c => (
            <button key={c.k} className="pill" onClick={() => setCat(c.k)} style={{ cursor: "pointer", whiteSpace: "nowrap", flex: "none",
              background: cat === c.k ? "var(--accent)" : "var(--panel)", borderColor: cat === c.k ? "var(--accent)" : "var(--border)", color: cat === c.k ? "#fff" : "var(--text-muted)" }}>{c.l}</button>
          ))}
        </div>
        <div className="notif-list">
          {rows.length === 0 && <div className="muted" style={{ padding: 24, textAlign: "center" }}>{t("vLayout.noNotificationsHere", null, "No notifications here.")}</div>}
          {rows.map(n => (
            <div key={n.id} className={`notif-item ${n.unread ? "unread" : ""}`} onClick={() => open(n)}>
              <span className="notif-dot" />
              <span className={`feed-ic ${n.tone}`} style={{ width: 34, height: 34 }}><Icon name={n.icon} size={16} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row between" style={{ gap: 8 }}><b style={{ fontSize: 13.5 }}>{n.title}</b><span className="feed-time">{timeAgo(n.createdAt, t) || n.time}</span></div>
                <p className="muted" style={{ margin: "3px 0 0", fontSize: 13, lineHeight: 1.45 }}>{n.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Grouped the same way the builder sidebar groups its nav (Workspace/Insights
// section labels via .nav-group-label) instead of one flat unlabeled list.
const NAV_GROUPS = [
  { label: "Workspace", tKey: "vworkspace", items: [
    { to: "/validator", label: "Discover", icon: "compass", end: true },
    { to: "/validator/missions", label: "My missions", icon: "bookmark" },
    { to: "/validator/messages", label: "Messages", icon: "inbox" },
  ] },
  { label: "Account", tKey: "account", items: [
    { to: "/validator/earnings", label: "Earnings", icon: "wallet" },
    { to: "/validator/profile", label: "Profile", icon: "userplus" },
    { to: "/validator/settings", label: "Settings", icon: "settings" },
    { to: "/validator/support", label: "Help & support", icon: "life", tKey: "support" },
  ] },
];

const TITLES = {
  "/validator": "Discover", "/validator/missions": "My missions", "/validator/messages": "Messages",
  "/validator/earnings": "Earnings & reputation", "/validator/profile": "Profile", "/validator/support": "Help center", "/validator/settings": "Settings",
};
function pageTitle(pathname) {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/validator/missions/")) return "Validation session";
  return "ValidationCrew";
}

export default function VLayout() {
  const { t, dataVersion } = useTranslation();
  const { validator, logout } = useVAuth();
  const [bell, setBell] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [mobOpen, setMobOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("vc_side_collapsed") === "1");
  const toggleCollapsed = () => setCollapsed(v => {
    localStorage.setItem("vc_side_collapsed", v ? "0" : "1");
    return !v;
  });
  const [notifs, setNotifs] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const profileRef = useRef(null);

  useEffect(() => {
    const fetchNotifs = () => vapi.notifications().then(d => setNotifs(d.notifications || [])).catch(() => {});
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, [dataVersion]);

  useEffect(() => { setShowProfile(false); }, [location.pathname]);

  // A "cover the whole page and close on click" overlay doesn't work here:
  // .topbar has backdrop-filter, which makes it the containing block for any
  // position:fixed descendant, so a fixed overlay nested inside it only ever
  // spans the topbar strip, not the page below. A document-level listener
  // isn't affected by that.
  useEffect(() => {
    if (!showProfile) return;
    const onDocClick = (e) => { if (!profileRef.current?.contains(e.target)) setShowProfile(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showProfile]);

  const unreadCount = notifs.filter(n => n.unread).length;
  // 'support_update'/"Support Update" never matched anything real — the
  // actual notification is type 'ticket_reply', title "Support Reply".
  const supportUnreadCount = notifs.filter(n => n.unread && n.type === 'ticket_reply').length;
  const messageUnreadCount = notifs.filter(n => n.unread && n.type === 'new_message').length;

  return (
    <div className={`app ${mobOpen ? "mob-open" : ""} ${collapsed ? "side-collapsed" : ""}`}>
      <div className="mob-scrim" onClick={() => { setMobOpen(false); setShowProfile(false); }} />
      <aside className="side">
        <div className="brand">
          {collapsed ? (
            // Same slot does double duty, like ChatGPT's sidebar: the logo mark
            // sits there at rest, and swaps to the expand icon on hover instead
            // of permanently showing a separate toggle button next to it.
            <button type="button" className="brand-swap" onClick={toggleCollapsed} data-tooltip={t("appLayout.expandSidebar", null, "Open sidebar")}>
              <span className="brand-swap-logo"><BrandMark size={34} /></span>
              <span className="brand-swap-toggle"><Icon name="sidebarPanel" size={16} /></span>
            </button>
          ) : (
            <>
              <a href="/validator" style={{ display: "block" }}><BrandLogoFull height={52} /></a>
              <button type="button" className="side-collapse-btn" onClick={toggleCollapsed} data-tooltip={t("appLayout.collapseSidebar", null, "Close sidebar")}>
                <Icon name="sidebarPanel" size={15} />
              </button>
            </>
          )}
        </div>
        {NAV_GROUPS.flatMap(g => [
          <div key={g.label} className="nav-group-label">{t("nav." + g.tKey, null, g.label)}</div>,
          ...g.items.map(it => {
            let customActive;
            if (it.to === "/validator") {
              customActive = location.pathname === "/validator" || (location.pathname.startsWith("/validator/missions/") && location.state?.fromDiscover);
            } else if (it.to === "/validator/missions") {
              customActive = location.pathname === "/validator/missions" || (location.pathname.startsWith("/validator/missions/") && !location.state?.fromDiscover);
            } else {
              customActive = location.pathname.startsWith(it.to);
            }
            const itLabel = t("nav." + (it.tKey || it.label.toLowerCase().replace(/ /g, "")), null, it.label);
            return (
              <Link key={it.to} to={it.to} onClick={() => setMobOpen(false)}
                data-tooltip={collapsed ? itLabel : undefined}
                className={`nav-item ${customActive ? "active" : ""}`}>
                <Icon name={it.icon} /><span className="nav-label">{itLabel}</span>
                {it.to === "/validator/support" && supportUnreadCount > 0 && <span className="nav-badge" style={{ marginLeft: "auto", background: "var(--danger)", color: "#fff", padding: "2px 6px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{supportUnreadCount}</span>}
                {it.to === "/validator/messages" && messageUnreadCount > 0 && <span className="nav-badge" style={{ marginLeft: "auto", background: "var(--danger)", color: "#fff", padding: "2px 6px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{messageUnreadCount}</span>}
              </Link>
            );
          }),
        ])}
        <div className="side-foot">
          <button onClick={() => navigate("/validator/profile")} data-tooltip={collapsed ? validator?.name : undefined} style={{ all: "unset", cursor: "pointer", display: "block" }}>
            <div className="lvl-card">
              <div className="lvl-top">
                <VAvatar name={validator?.name || ""} size={36} />
                <div className="nav-label" style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{validator?.name}</div>
                  <div className="faint" style={{ fontSize: 11.5 }}>{t("vLayout.lvlPrefix", { level: validator?.level }, `Lvl ${validator?.level}`)} · {validator?.levelName}</div>
                </div>
              </div>
              <div className="lvl-meter nav-label"><i style={{ width: "72%" }} /></div>
              <div className="faint nav-label" style={{ fontSize: 11, marginTop: 7 }}>{t("vLayout.validationsToElite", { count: validator ? Math.max(0, 400 - (validator.completed || 0)) : 0 }, `${validator ? Math.max(0, 400 - (validator.completed || 0)) : 0} validations to Elite`)}</div>
            </div>
          </button>
          <div className="nav-label">
            <LanguageSwitcher
              onSave={(lang) => vapi.setLanguage(lang).catch(() => {})}
              style={{ marginTop: 8, width: "100%" }}
              openUp
            />
          </div>
        </div>
      </aside>

      <main className="main" id="main-content">
        <header className="topbar">
          <button className="icon-btn mob-burger" onClick={() => setMobOpen(true)} title={t("vLayout.menu", null, "Menu")} style={{ marginRight: 4 }}><Icon name="menu" size={18} /></button>
          <h1>{t("nav." + pageTitle(location.pathname).toLowerCase().replace(/ /g, ""), null, pageTitle(location.pathname))}</h1>
          <span className="topbar-spacer" />
          <button className="icon-btn" style={{ position: 'relative' }} onClick={() => setBell(true)} title={t("vLayout.notifications", null, "Notifications")}>
            <Icon name="bell" size={17} />
            {unreadCount > 0 && <span className="bell-unread-dot blink" />}
          </button>
          <div ref={profileRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowProfile(p => !p)}
              title={t("appLayout.profile", null, "Profile")}
              style={{ all: "unset", cursor: "pointer", display: "block" }}
            >
              <VAvatar name={validator?.name || ""} size={38} ring />
            </button>
            {showProfile && (
              <>
                <div style={{ position: "absolute", top: 46, right: 0, width: 240, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)", zIndex: 100, overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{validator?.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{validator?.email}</div>
                  </div>
                  <div style={{ padding: "6px 0" }}>
                    <button className="nav-item" style={{ width: "100%", padding: "9px 16px", justifyContent: "flex-start", borderRadius: 0 }} onClick={() => { setShowProfile(false); navigate("/validator/settings"); }}>
                      <Icon name="settings" size={15} /> {t("nav.settings", null, "Settings")}
                    </button>
                    <button className="nav-item" style={{ width: "100%", padding: "9px 16px", justifyContent: "flex-start", borderRadius: 0, color: "var(--danger)" }} onClick={async () => { setShowProfile(false); await logout(); navigate("/validator/login"); }}>
                      <Icon name="logout" size={15} /> {t("vLayout.logOut", null, "Log out")}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>
        <Outlet context={{ notifs }} />
      </main>
      {bell && <VNotifPanel onClose={() => setBell(false)} items={notifs} setItems={setNotifs} />}
    </div>
  );
}
