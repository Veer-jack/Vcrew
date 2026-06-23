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
      flaggedMissions: d.flaggedMissions,
      withdrawalQueue: d.withdrawalQueue,
      openTickets: d.openTickets,
    })).catch(() => {});
  }, [location.pathname]);

  const NAV = [
    { to: "/admin", label: "Control center", icon: "home", end: true },
    { to: "/admin/members", label: "Members", icon: "users" },
    { to: "/admin/verification", label: "Verification", icon: "shield", count: counts.pendingVerifications },
    { to: "/admin/mission-review", label: "Mission review", icon: "layers", count: counts.flaggedMissions },
    { to: "/admin/withdrawals", label: "Revenue & payouts", icon: "wallet", count: counts.withdrawalQueue },
    { to: "/admin/analytics", label: "Analytics", icon: "chart" },
    { to: "/admin/support", label: "Support", icon: "life", count: counts.openTickets },
  ];
  const TITLES = {
    "/admin": "Control center", "/admin/members": "Members", "/admin/verification": "Verification queue",
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
        </header>
        <Outlet />
      </main>
    </div>
  );
}
