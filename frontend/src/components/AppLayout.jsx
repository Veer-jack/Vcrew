import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import Icon from "./Icon";
import { Avatar, Btn, inrK } from "./ui";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import LanguageSwitcher from "./LanguageSwitcher";
import { useTranslation } from "../i18n/index.jsx";

function NotifPanel({ onClose }) {
  const [items, setItems] = useState([]);
  useEffect(() => { api.notifications().then(d => setItems(d.notifications)); }, []);

  const markAll = async () => {
    await api.markAllRead();
    setItems(its => its.map(i => ({ ...i, unread: false })));
  };
  const open = async (n) => {
    if (n.unread) {
      await api.markRead(n.id);
      setItems(its => its.map(i => i.id === n.id ? { ...i, unread: false } : i));
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
            <button className="icon-btn" aria-label="Close" style={{ width: 32, height: 32 }} onClick={onClose}><Icon name="x" size={16} /></button>
          </div>
        </div>
        <div className="notif-list">
          {items.map(n => (
            <div key={n.id} className={`notif-item ${n.unread ? "unread" : ""}`} onClick={() => open(n)}>
              <span className="notif-dot" />
              <span className={`feed-ic ${n.tone}`} style={{ width: 34, height: 34 }}><Icon name={n.icon} size={16} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row between" style={{ gap: 8 }}><b style={{ fontSize: 13.5 }}>{n.title}</b><span className="feed-time">{n.time}</span></div>
                <p className="muted" style={{ margin: "3px 0 0", fontSize: 13, lineHeight: 1.45 }}>{n.body}</p>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="muted" style={{ padding: 24, textAlign: "center" }}>No notifications yet.</div>}
        </div>
      </div>
    </div>
  );
}

const NAV_GROUPS = [
  { label: "Workspace", items: [
    { to: "/", label: "Dashboard", icon: "home", end: true },
    { to: "/missions", label: "Missions", icon: "layers" },
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

function Sidebar({ mobOpen, closeMobile, builder }) {
  const navigate = useNavigate();
  return (
    <aside className="side">
      <div className="brand">
        <BrandMark size={32} />
        <div><div className="brand-name">Validation<span style={{ color: "var(--text-faint)" }}>Crew</span></div><div className="brand-sub">{builder?.org}</div></div>
      </div>
      <Btn variant="primary" icon="plus" onClick={() => { navigate("/missions/new"); closeMobile(); }} style={{ margin: "2px 4px 8px", width: "calc(100% - 8px)" }}>Create Mission</Btn>
      {NAV_GROUPS.flatMap(g => [
        <div key={g.label} className="nav-group-label">{g.label}</div>,
        ...g.items.map(it => (
          <NavLink key={it.to} to={it.to} end={it.end} onClick={closeMobile}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <Icon name={it.icon} />{it.label}
          </NavLink>
        )),
      ])}
      <div className="side-foot">
        <div className="lvl-card" style={{ marginBottom: 8 }}>
          <div className="lvl-top"><Icon name="wallet" size={15} style={{ color: "var(--accent)" }} /><span style={{ fontWeight: 700, fontSize: 13 }}>Wallet</span><span className="mono faint" style={{ marginLeft: "auto", fontSize: 12 }}>{inrK(builder?.balance)}</span></div>
          <div className="lvl-meter"><i style={{ width: "68%" }} /></div>
        </div>
        <NavLink to="/wallet" className="nav-item" style={{ width: "100%" }} onClick={closeMobile}>
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
  const { builder, logout } = useAuth();
  const [bell, setBell] = useState(false);
  const [mobOpen, setMobOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className={`app ${mobOpen ? "mob-open" : ""}`}>
      <div className="mob-scrim" onClick={() => setMobOpen(false)} />
      <Sidebar mobOpen={mobOpen} closeMobile={() => setMobOpen(false)} builder={builder} />
      <div className="main" id="main-content">
        <header className="topbar">
          <button className="icon-btn mob-burger" onClick={() => setMobOpen(true)} title="Menu" style={{ marginRight: 4 }}><Icon name="menu" size={18} /></button>
          <h1>{pageTitle(location.pathname)}</h1>
          <div className="search" style={{ marginLeft: 18 }}><Icon name="search" size={16} /><input placeholder="Search missions, members, responses…" /></div>
          <span className="topbar-spacer" />
          <button className="icon-btn" onClick={() => setBell(true)} title="Notifications"><Icon name="bell" size={17} /></button>
          <button className="icon-btn" onClick={async () => { await logout(); navigate("/login"); }} title="Log out"><Icon name="logout" size={17} /></button>
        </header>
        <Outlet />
      </div>
      {bell && <NotifPanel onClose={() => setBell(false)} />}
    </div>
  );
}
