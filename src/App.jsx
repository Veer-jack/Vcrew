import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { MetaProvider } from "./context/MetaContext";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Missions from "./pages/Missions";
import MissionDetail from "./pages/MissionDetail";
import CreateMissionWizard from "./pages/CreateMissionWizard";
import Audience from "./pages/Audience";
import Analytics from "./pages/Analytics";
import Wallet from "./pages/Wallet";
import Messages from "./pages/Messages";

import { VAuthProvider, useVAuth } from "./vcontext/VAuthContext";
import { VMetaProvider } from "./vcontext/VMetaContext";
import VLayout from "./vcomponents/VLayout";
import VLogin from "./vpages/VLogin";
import OAuthCallback from "./vpages/OAuthCallback";
import Discover from "./vpages/Discover";
import MissionDetails from "./vpages/MissionDetails";
import Workspace from "./vpages/Workspace";
import Submitted from "./vpages/Submitted";
import MyMissions from "./vpages/MyMissions";
import Earnings from "./vpages/Earnings";
import Profile from "./vpages/Profile";
import VMessages from "./vpages/Messages";
import Support from "./vpages/Support";

/* ---------------- Builder (existing) ---------------- */

function RequireAuth({ children }) {
  const { builder, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="page rise"><div className="muted">Loading…</div></div>;
  if (!builder) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

function BuilderRoutes() {
  const { builder, loading } = useAuth();
  if (loading) return <div className="page rise"><div className="muted">Loading…</div></div>;

  return (
    <Routes>
      <Route path="/login" element={builder ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/missions/new" element={<RequireAuth><CreateMissionWizard /></RequireAuth>} />
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/missions" element={<Missions />} />
        <Route path="/missions/:id" element={<MissionDetail />} />
        <Route path="/audience" element={<Audience />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/messages" element={<Messages />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/* ---------------- Validator (new) ---------------- */

function RequireVAuth({ children }) {
  const { validator, loading } = useVAuth();
  const location = useLocation();
  if (loading) return <div className="page rise"><div className="muted">Loading…</div></div>;
  if (!validator) return <Navigate to="/validator/login" state={{ from: location.pathname }} replace />;
  return children;
}

function ValidatorRoutes() {
  const { validator, loading } = useVAuth();
  if (loading) return <div className="page rise"><div className="muted">Loading…</div></div>;

  return (
    <Routes>
      <Route path="login" element={validator ? <Navigate to="/validator" replace /> : <VLogin />} />
      <Route path="oauth-callback" element={<OAuthCallback />} />
      <Route path="missions/:id/workspace" element={<RequireVAuth><Workspace /></RequireVAuth>} />
      <Route element={<RequireVAuth><VLayout /></RequireVAuth>}>
        <Route index element={<Discover />} />
        <Route path="missions" element={<MyMissions />} />
        <Route path="missions/:id" element={<MissionDetails />} />
        <Route path="missions/:id/submitted" element={<Submitted />} />
        <Route path="earnings" element={<Earnings />} />
        <Route path="profile" element={<Profile />} />
        <Route path="messages" element={<VMessages />} />
        <Route path="support" element={<Support />} />
      </Route>
      <Route path="*" element={<Navigate to="/validator" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/validator/*" element={
          <VAuthProvider><VMetaProvider><ValidatorRoutes /></VMetaProvider></VAuthProvider>
        } />
        <Route path="/*" element={
          <AuthProvider><MetaProvider><BuilderRoutes /></MetaProvider></AuthProvider>
        } />
      </Routes>
    </BrowserRouter>
  );
}
