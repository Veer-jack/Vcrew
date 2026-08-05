import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import Icon from "../components/Icon";
import { BrandMark } from "../components/BrandMark";
import { Avatar } from "../components/ui";
import { useAAuth } from "../acontext/AAuthContext";
import { aapi } from "../aapi/client";

export default function ALayout() {
  const { logout } = useAAuth();
  const [mobOpen, setMobOpen] = useState(false);
  const [counts, setCounts] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    aapi.dashboard().then(d => setCounts({
      pendingVerifications: d.pendingVerifications,
      pendingTesterApplications: d.pendingTesterApplications,
      flaggedMissions: d.flaggedMissions,
      withdrawalQueue: d.withdrawalQueue,
      openTickets: d.openTickets,
    })).catch(() => {});
  }, [location.pathname]);

  const NAV = [
    { to: "/admin", label: "Control center", icon: "home", end: true },
    { to: "/admin/members", label: "Members", icon: "users" },
    { to: "/admin/verification", label: "Verification", icon: "shield", count: counts.pendingVerifications },
    { to: "/admin/tester-applications", label: "Tester applications", icon: "star", count: counts.pendingTesterApplications },
    { to: "/admin/mission-review", label: "Mission review", icon: "layers", count: counts.flaggedMissions },
    { to: "/admin/withdrawals", label: "Revenue & payouts", icon: "wallet", count: counts.withdrawalQueue },
    { to: "/admin/analytics", label: "Analytics", icon: "chart" },
    { to: "/admin/support", label: "Support", icon: "life", count: counts.openTickets },
  ];
  const TITLES = {
    "/admin": "Control center", "/admin/members": "Members", "/admin/verification": "Verification queue",
    "/admin/tester-applications": "Tester applications",
    "/admin/mission-review": "Mission review", "/admin/withdrawals": "Revenue & payouts",
    "/admin/analytics": "Analytics", "/admin/support": "Support tickets",
  };

  return (
    <div className={`app ${mobOpen ? "mob-open" : ""}`}>
      <div className="mob-scrim" onClick={() => setMobOpen(false)} />
      <aside className="side">
        <div className="brand">
          <BrandMark size={80} />
          <div><div className="brand-name">Validation<span style={{ color: "var(--text-faint)" }}>Crew</span></div><div className="brand-sub">Admin console</div></div>
        </div>
        {NAV.map(it => (
          <NavLink key={it.to} to={it.to} end={it.end} onClick={() => setMobOpen(false)}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <Icon name={it.icon} />{it.label}
            {!!it.count && <span className="nav-count">{it.count}</span>}
          </NavLink>
        ))}
        <div className="side-foot">
          <div className="row gap-3" style={{ alignItems: "center" }}>
            <Avatar name="Admin" size={36} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>Admin</div>
              <div className="faint" style={{ fontSize: 11.5 }}>Platform operator</div>
            </div>
            <button className="icon-btn" onClick={async () => { await logout(); navigate("/admin/login"); }} title="Log out"><Icon name="logout" size={16} /></button>
          </div>
        </div>
      </aside>

      <main className="main" id="main-content">
        <header className="topbar">
          <button className="icon-btn mob-burger" onClick={() => setMobOpen(true)} title="Menu" style={{ marginRight: 4 }}><Icon name="menu" size={18} /></button>
          <h1>{TITLES[location.pathname] || "Admin"}</h1>
          <span className="topbar-spacer" />
          <AdminNotifications />
        </header>
        <Outlet />
      </main>
    </div>
  );
}

function AdminNotifications() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  
  useEffect(() => {
    aapi.notifications().then(d => setNotifs(d.notifications || [])).catch(() => {});
    const t = setInterval(() => {
      aapi.notifications().then(d => setNotifs(d.notifications || [])).catch(() => {});
    }, 30000); // refresh every 30s
    return () => clearInterval(t);
  }, []);

  const unreadCount = notifs.filter(n => n.unread).length;

  const handleRead = async (id, e) => {
    if (e) e.stopPropagation();
    await aapi.readNotification(id);
    setNotifs(curr => id === 'all' 
      ? curr.map(n => ({ ...n, unread: false }))
      : curr.map(n => n.id === id ? { ...n, unread: false } : n)
    );
  };

  return (
    <div style={{ position: "relative" }}>
      <button className="icon-btn" onClick={() => setOpen(!open)} style={{ position: "relative" }}>
        <Icon name="bell" size={20} />
        {unreadCount > 0 && <span className="nav-count" style={{ position: "absolute", top: 2, right: 2, transform: "scale(0.8)" }}>{unreadCount}</span>}
      </button>
      
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div className="card" style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 340, maxHeight: 400, overflowY: "auto", zIndex: 100, padding: 0, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
            <div className="row between" style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--panel)" }}>
              <b style={{ fontSize: 13.5 }}>Notifications</b>
              {unreadCount > 0 && <button className="btn btn-ghost" style={{ fontSize: 11.5, padding: "2px 6px" }} onClick={(e) => handleRead('all', e)}>Mark all read</button>}
            </div>
            {notifs.length === 0 ? (
              <div className="muted" style={{ padding: 32, textAlign: "center" }}>No notifications</div>
            ) : (
              notifs.map(n => (
                <div key={n.id} onClick={() => { if(n.unread) handleRead(n.id); }} style={{ padding: 12, borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "flex-start", cursor: n.unread ? "pointer" : "default", background: n.unread ? "var(--accent-faint)" : "transparent" }}>
                  <span className={`intent-ic`} style={{ background: n.tone ? `var(--${n.tone}-faint)` : "var(--accent-weak)", color: n.tone ? `var(--${n.tone})` : "var(--accent)", flex: "none", padding: 6, borderRadius: "50%" }}><Icon name={n.icon || "bell"} size={14} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: n.unread ? 600 : 500, color: "var(--text)" }}>{n.title}</div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>
                    <div className="faint" style={{ fontSize: 10, marginTop: 4 }}>{n.timeLabel}</div>
                  </div>
                  {n.unread && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flex: "none", marginTop: 4 }} />}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
