import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import Icon from "./Icon";
import { Avatar, Btn, inrK } from "./ui";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import LanguageSwitcher from "./LanguageSwitcher";
import { useTranslation } from "../i18n/index.jsx";
import { BrandLogoFull } from "./BrandMark";
import NotificationsSidebar from "./NotificationsSidebar";



const NAV_GROUPS = [
  { label: "Workspace", items: [
    { to: "/", label: "Dashboard", icon: "home", end: true },
    { to: "/missions", label: "Missions", icon: "layers" },
    { to: "/invitations", label: "Invitations", icon: "send" },
    { to: "/audience", label: "Audience", icon: "compass" },
    { to: "/messages", label: "Messages", icon: "inbox" },
  ] },
  { label: "Insights", items: [
    { to: "/analytics", label: "Analytics", icon: "chart" },
    { to: "/wallet", label: "Wallet", icon: "wallet" },
    { to: "/support", label: "Support", icon: "life" },
    { to: "/settings", label: "Settings", icon: "settings" },
  ] },
];

function Sidebar({ closeMobile, builder }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <aside className="side">
      <div className="brand">
        <a href="/" style={{ display: "block" }}><BrandLogoFull height={52} /></a>
      </div>
      <Btn variant="primary" icon="plus" onClick={() => { navigate("/missions/new"); closeMobile(); }} style={{ margin: "2px 4px 8px", width: "calc(100% - 8px)" }}>{t("builder.createMission", null, "Create Mission")}</Btn>
      {NAV_GROUPS.flatMap(g => [
        <div key={g.label} className="nav-group-label">{t("nav." + g.label.toLowerCase(), null, g.label)}</div>,
        ...g.items.map(it => (
          <NavLink key={it.to} to={it.to} end={it.end} onClick={closeMobile}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <Icon name={it.icon} />{t("nav." + it.label.toLowerCase(), null, it.label)}
          </NavLink>
        )),
      ])}
      <div className="side-foot">
        <div className="lvl-card" style={{ marginBottom: 8 }}>
          <div className="lvl-top"><Icon name="wallet" size={15} style={{ color: "var(--accent)" }} /><span style={{ fontWeight: 700, fontSize: 13 }}>{t("nav.wallet", null, "Wallet")}</span><span className="mono faint" style={{ marginLeft: "auto", fontSize: 12 }}>{inrK(builder?.balance)}</span></div>
          <div className="lvl-meter"><i style={{ width: "68%" }} /></div>
        </div>
        <NavLink to="/settings" className="nav-item" style={{ width: "100%" }} onClick={closeMobile}>
          <Avatar name={builder?.name || ""} size={30} color={builder?.color} />
          <div style={{ textAlign: "left", lineHeight: 1.2 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{builder?.name}</div>
            <div className="faint" style={{ fontSize: 11 }}>
              {builder?.role} · {builder?.plan}
              {builder?.verified
                ? <span style={{ color: "var(--success)", marginLeft: 6 }}>✓ Verified</span>
                : <span style={{ color: "var(--warning, #c2710c)", marginLeft: 6 }}>· Unverified</span>
              }
            </div>
          </div>
        </NavLink>
        <LanguageSwitcher
          onSave={(lang) => api.setLanguage(lang).catch(() => {})}
          style={{ marginTop: 8, width: "100%" }}
        />
      </div>
    </aside>
  );
}

const TITLES = {
  "/": "Dashboard", "/missions": "Missions", "/audience": "Audience Explorer",
  "/analytics": "Analytics", "/wallet": "Wallet", "/messages": "Messages",
};
function pageTitle(pathname) {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/missions/new")) return "Create Mission";
  if (pathname.startsWith("/missions/")) return "Mission";
  return "ValidationCrew";
}

export default function AppLayout() {
  const { t } = useTranslation();
  const { builder, logout } = useAuth();
  const [bell, setBell] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [mobOpen, setMobOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [topbarQ, setTopbarQ] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchNotifs = () => api.notifications().then(d => setNotifs(d.notifications || [])).catch(() => {});
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifs.filter(n => n.unread).length;

  return (
    <div className={`app ${mobOpen ? "mob-open" : ""}`}>
      <div className="mob-scrim" onClick={() => { setMobOpen(false); setShowProfile(false); }} />
      <Sidebar mobOpen={mobOpen} closeMobile={() => setMobOpen(false)} builder={builder} />
      <div className="main" id="main-content">
        <header className="topbar">
          <button className="icon-btn mob-burger" onClick={() => setMobOpen(true)} title="Menu" style={{ marginRight: 4 }}><Icon name="menu" size={18} /></button>
          <h1>{t("nav." + pageTitle(location.pathname).toLowerCase(), null, pageTitle(location.pathname))}</h1>
          <div className="search" style={{ marginLeft: 18 }}>
            <Icon name="search" size={16} />
            <input
              placeholder={t("actions.search", null, "Search missions…")}
              value={topbarQ}
              onChange={e => setTopbarQ(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && topbarQ.trim()) {
                  navigate(`/missions?q=${encodeURIComponent(topbarQ.trim())}`);
                }
              }}
            />
          </div>
          <span className="topbar-spacer" />
          <button className="icon-btn" style={{ position: 'relative' }} onClick={() => setBell(true)} title="Notifications">
            <Icon name="bell" size={17} />
            {unreadCount > 0 && <span className="bell-unread-dot blink" />}
          </button>
          <button className="icon-btn" style={{ color: "var(--danger, red)" }} onClick={async () => { await logout(); navigate("/login"); }} title="Log out"><Icon name="logout" size={17} /></button>
          <div style={{ position: "relative" }}>
            <button
              className="icon-btn"
              onClick={() => setShowProfile(p => !p)}
              title="Profile"
              style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--accent)", color: "#fff", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", display: "grid", placeItems: "center" }}
            >
              {(builder?.name || "B")[0].toUpperCase()}
            </button>
            {showProfile && (
              <div style={{ position: "absolute", top: 42, right: 0, width: 240, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)", zIndex: 100, overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{builder?.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{builder?.email}</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{builder?.org}</div>
                </div>
                <div style={{ padding: "6px 0" }}>
                  <button className="nav-item" style={{ width: "100%", padding: "9px 16px", justifyContent: "flex-start", borderRadius: 0 }} onClick={() => { setShowProfile(false); navigate("/settings"); }}>
                    <Icon name="settings" size={15} /> {t("nav.settings", null, "Settings")}
                  </button>
                  <button className="nav-item" style={{ width: "100%", padding: "9px 16px", justifyContent: "flex-start", borderRadius: 0, color: "var(--danger)" }} onClick={async () => { setShowProfile(false); await logout(); navigate("/login"); }}>
                    <Icon name="logout" size={15} /> {t("nav.logout", null, "Sign out")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>
        <Outlet />
      </div>
      {bell && <NotificationsSidebar 
            onClose={() => setBell(false)} 
            items={notifs} 
            setItems={setNotifs}
            onMarkAllRead={() => api.markAllRead()}
            onClearAll={() => api.clearAllNotifications()}
            onRead={(id) => api.markRead(id)}
          />}
    </div>
  );
}
