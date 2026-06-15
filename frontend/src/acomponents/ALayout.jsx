import { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import Icon from "../components/Icon";
import { Avatar } from "../components/ui";
import { useAAuth } from "../acontext/AAuthContext";

const NAV = [
  { to: "/admin", label: "Control center", icon: "home", end: true },
  { to: "/admin/members", label: "Members", icon: "users" },
  { to: "/admin/support", label: "Support", icon: "life" },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: "wallet" },
];

const TITLES = {
  "/admin": "Control center", "/admin/members": "Members", "/admin/support": "Support tickets", "/admin/withdrawals": "Withdrawals",
};

export default function ALayout() {
  const { logout } = useAAuth();
  const [mobOpen, setMobOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className={`app ${mobOpen ? "mob-open" : ""}`}>
      <div className="mob-scrim" onClick={() => setMobOpen(false)} />
      <aside className="side">
        <div className="brand">
          <div className="brand-mark"><Icon name="shield" size={18} /></div>
          <div><div className="brand-name">Validation<span style={{ color: "var(--text-faint)" }}>Crew</span></div><div className="brand-sub">Admin console</div></div>
        </div>
        {NAV.map(it => (
          <NavLink key={it.to} to={it.to} end={it.end} onClick={() => setMobOpen(false)}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <Icon name={it.icon} />{it.label}
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

      <main className="main">
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
