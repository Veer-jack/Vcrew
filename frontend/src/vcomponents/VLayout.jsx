import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import Icon from "../components/Icon";
import { BrandMark, BrandLogoFull } from "../components/BrandMark";
import { VAvatar } from "./vui";
import { useVAuth } from "../vcontext/VAuthContext";
import { vapi } from "../vapi/client";

function VNotifPanel({ onClose }) {
  const [items, setItems] = useState([]);
  const [cat, setCat] = useState("all");
  useEffect(() => { vapi.notifications().then(d => setItems(d.notifications)); }, []);

  const rows = cat === "all" ? items : items.filter(n => n.cat === cat);
  const cats = [
    { k: "all", l: "All" }, { k: "invite", l: "Invitations" }, { k: "application", l: "Applications" },
    { k: "reward", l: "Rewards" }, { k: "system", l: "System" },
  ];

  const markAll = async () => { await vapi.markAllRead(); setItems(its => its.map(i => ({ ...i, unread: false }))); };
  const open = async (n) => {
    if (n.unread) { await vapi.markRead(n.id); setItems(its => its.map(i => i.id === n.id ? { ...i, unread: false } : i)); }
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
        <div style={{ display: "flex", gap: 6, padding: "12px 16px", borderBottom: "var(--hairline) solid var(--border)", overflowX: "auto" }}>
          {cats.map(c => (
            <button key={c.k} className="pill" onClick={() => setCat(c.k)} style={{ cursor: "pointer", whiteSpace: "nowrap", flex: "none",
              background: cat === c.k ? "var(--accent)" : "var(--panel)", borderColor: cat === c.k ? "var(--accent)" : "var(--border)", color: cat === c.k ? "#fff" : "var(--text-muted)" }}>{c.l}</button>
          ))}
        </div>
        <div className="notif-list">
          {rows.length === 0 && <div className="muted" style={{ padding: 24, textAlign: "center" }}>No notifications here.</div>}
          {rows.map(n => (
            <div key={n.id} className={`notif-item ${n.unread ? "unread" : ""}`} onClick={() => open(n)}>
              <span className="notif-dot" />
              <span className={`feed-ic ${n.tone}`} style={{ width: 34, height: 34 }}><Icon name={n.icon} size={16} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row between" style={{ gap: 8 }}><b style={{ fontSize: 13.5 }}>{n.title}</b><span className="feed-time">{n.time}</span></div>
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
  const { validator, logout } = useVAuth();
  const [bell, setBell] = useState(false);
  const [mobOpen, setMobOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className={`app ${mobOpen ? "mob-open" : ""}`}>
      <div className="mob-scrim" onClick={() => setMobOpen(false)} />
      <aside className="side">
        <div className="brand">
          <a href="/validator" style={{ display: "block" }}><BrandLogoFull height={56} /></a>
          <div><div className="brand-name">Validation<span style={{ color: "var(--text-faint)" }}>Crew</span></div><div className="brand-sub">Validator</div></div>
        </div>
        {NAV.map(it => (
          <NavLink key={it.to} to={it.to} end={it.end} onClick={() => setMobOpen(false)}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <Icon name={it.icon} />{it.label}
          </NavLink>
        ))}
        <div style={{ marginTop: 8 }}>
          <NavLink to="/validator/support" onClick={() => setMobOpen(false)} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <Icon name="life" />Help &amp; support
          </NavLink>
        </div>
        <div className="side-foot">
          <button onClick={() => navigate("/validator/profile")} style={{ all: "unset", cursor: "pointer", display: "block" }}>
            <div className="lvl-card">
              <div className="lvl-top">
                <VAvatar name={validator?.name || ""} size={36} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{validator?.name}</div>
                  <div className="faint" style={{ fontSize: 11.5 }}>Lvl {validator?.level} · {validator?.levelName}</div>
                </div>
              </div>
              <div className="lvl-meter"><i style={{ width: "72%" }} /></div>
              <div className="faint" style={{ fontSize: 11, marginTop: 7 }}>{validator ? Math.max(0, 400 - validator.completed) : 0} validations to Elite</div>
            </div>
          </button>
        </div>
      </aside>

      <main className="main" id="main-content">
        <header className="topbar">
          <button className="icon-btn mob-burger" onClick={() => setMobOpen(true)} title="Menu" style={{ marginRight: 4 }}><Icon name="menu" size={18} /></button>
          <h1>{pageTitle(location.pathname)}</h1>
          <span className="topbar-spacer" />
          <button className="icon-btn" onClick={() => setBell(true)} title="Notifications"><Icon name="bell" size={17} /></button>
          <button className="icon-btn" onClick={async () => { await logout(); navigate("/validator/login"); }} title="Log out"><Icon name="logout" size={17} /></button>
          <VAvatar name={validator?.name || ""} size={38} ring />
        </header>
        <Outlet />
      </main>
      {bell && <VNotifPanel onClose={() => setBell(false)} />}
    </div>
  );
}
