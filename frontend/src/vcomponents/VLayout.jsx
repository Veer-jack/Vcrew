import { useEffect, useState } from "react";
import { NavLink, Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import Icon from "../components/Icon";
import { BrandLogoFull } from "../components/BrandMark";
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
  const cats = [
    { k: "all", l: t("vLayout.catAll", null, "All") }, { k: "invite", l: t("vLayout.catInvitations", null, "Invitations") }, { k: "application", l: t("vLayout.catApplications", null, "Applications") },
    { k: "reward", l: t("vLayout.catRewards", null, "Rewards") }, { k: "system", l: t("vLayout.catSystem", null, "System") },
  ];

  const markAll = async () => { await vapi.markAllRead(); setItems(its => its.map(i => ({ ...i, unread: false }))); };
  const clearAll = async () => { await vapi.clearAllNotifications(); setItems([]); };
  const navigate = useNavigate();
  const open = async (n) => {
    if (n.unread) { await vapi.markRead(n.id); setItems(its => its.map(i => i.id === n.id ? { ...i, unread: false } : i)); }
    if ((n.type === 'mission_full' || n.type === 'new_mission' || n.type === 'slot_available') && n.target_id) {
      onClose();
      navigate(`/validator/missions/${n.target_id}`, { state: { refresh: Date.now() } });
    } else if (n.type === 'submission_approved' || n.type === 'mission_completed') {
      onClose();
      navigate(`/validator/missions?tab=completed`, { state: { refresh: Date.now() } });
    } else if (n.type === 'submission_rejected') {
      onClose();
      navigate(`/validator/missions?tab=rejected`, { state: { refresh: Date.now() } });
    } else if (n.type === 'submission_revision') {
      onClose();
      navigate(`/validator/missions?tab=active`, { state: { refresh: Date.now() } });
    } else if (n.target_id) {
      onClose();
      navigate(`/validator/missions/${n.target_id}`, { state: { refresh: Date.now() } });
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

const NAV = [
  { to: "/validator", label: "Discover", icon: "compass", end: true },
  { to: "/validator/missions", label: "My missions", icon: "bookmark" },
  { to: "/validator/messages", label: "Messages", icon: "inbox" },
  { to: "/validator/earnings", label: "Earnings", icon: "wallet" },
  { to: "/validator/profile", label: "Profile", icon: "userplus" },
  { to: "/validator/settings", label: "Settings", icon: "settings" },
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
  const [mobOpen, setMobOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchNotifs = () => vapi.notifications().then(d => setNotifs(d.notifications || [])).catch(() => {});
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, [dataVersion]);

  const unreadCount = notifs.filter(n => n.unread).length;

  return (
    <div className={`app ${mobOpen ? "mob-open" : ""}`}>
      <div className="mob-scrim" onClick={() => setMobOpen(false)} />
      <aside className="side">
        <div className="brand">
          <a href="/validator" style={{ display: "block" }}><BrandLogoFull height={52} /></a>
        </div>
        {NAV.map(it => {
          let customActive;
          if (it.to === "/validator") {
            customActive = location.pathname === "/validator" || (location.pathname.startsWith("/validator/missions/") && location.state?.fromDiscover);
          } else if (it.to === "/validator/missions") {
            customActive = location.pathname === "/validator/missions" || (location.pathname.startsWith("/validator/missions/") && !location.state?.fromDiscover);
          } else {
            customActive = location.pathname.startsWith(it.to);
          }
          return (
            <Link key={it.to} to={it.to} onClick={() => setMobOpen(false)}
              className={`nav-item ${customActive ? "active" : ""}`}>
              <Icon name={it.icon} />{t("nav." + it.label.toLowerCase().replace(/ /g, ""), null, it.label)}
            </Link>
          );
        })}
        <div style={{ marginTop: 8 }}>
          <NavLink to="/validator/support" onClick={() => setMobOpen(false)} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <Icon name="life" />{t("nav.support", null, "Help & support")}
          </NavLink>
        </div>
        <div className="side-foot">
          <button onClick={() => navigate("/validator/profile")} style={{ all: "unset", cursor: "pointer", display: "block" }}>
            <div className="lvl-card">
              <div className="lvl-top">
                <VAvatar name={validator?.name || ""} size={36} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{validator?.name}</div>
                  <div className="faint" style={{ fontSize: 11.5 }}>{t("vLayout.lvlPrefix", { level: validator?.level }, `Lvl ${validator?.level}`)} · {validator?.levelName}</div>
                </div>
              </div>
              <div className="lvl-meter"><i style={{ width: "72%" }} /></div>
              <div className="faint" style={{ fontSize: 11, marginTop: 7 }}>{t("vLayout.validationsToElite", { count: validator ? Math.max(0, 400 - (validator.completed || 0)) : 0 }, `${validator ? Math.max(0, 400 - (validator.completed || 0)) : 0} validations to Elite`)}</div>
            </div>
          </button>
          <LanguageSwitcher
            onSave={(lang) => vapi.setLanguage(lang).catch(() => {})}
            style={{ marginTop: 8, width: "100%" }}
          />
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
          <button className="icon-btn" onClick={async () => { await logout(); navigate("/validator/login"); }} title={t("vLayout.logOut", null, "Log out")}><Icon name="logout" size={17} /></button>
          <VAvatar name={validator?.name || ""} size={38} ring />
        </header>
        <Outlet />
      </main>
      {bell && <VNotifPanel onClose={() => setBell(false)} items={notifs} setItems={setNotifs} />}
    </div>
  );
}
