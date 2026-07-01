import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { trackPageview } from "./analytics";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { I18nProvider } from "./i18n/index.jsx";
import { MetaProvider } from "./context/MetaContext";
import { api } from "./api/client";
import { vapi } from "./vapi/client";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import IntentFork from "./pages/IntentFork";
import RoleSelect from "./pages/RoleSelect";
import OnboardingWizard from "./pages/OnboardingWizard";
import BuilderOAuthCallback from "./pages/OAuthCallback";
import Dashboard from "./pages/Dashboard";
import Missions from "./pages/Missions";
import MissionDetail from "./pages/MissionDetail";
import CreateMissionWizard from "./pages/CreateMissionWizard";
import Audience from "./pages/Audience";
import Analytics from "./pages/Analytics";
import Wallet from "./pages/Wallet";
import Support from "./pages/Support";
import Settings from "./pages/Settings";
import Messages from "./pages/Messages";

import { VAuthProvider, useVAuth } from "./vcontext/VAuthContext";
import { VMetaProvider } from "./vcontext/VMetaContext";
import VLayout from "./vcomponents/VLayout";
import VLogin from "./vpages/VLogin";
import VOAuthCallback from "./vpages/OAuthCallback";
import VOnboarding from "./vpages/VOnboarding";
import MissionBrief from "./vpages/MissionBrief";
import DailyCheckin from "./vpages/DailyCheckin";
import MissionReview from "./pages/MissionReview";
import Discover from "./vpages/Discover";
import MissionDetails from "./vpages/MissionDetails";
import Workspace from "./vpages/Workspace";
import Submitted from "./vpages/Submitted";
import MyMissions from "./vpages/MyMissions";
import Earnings from "./vpages/Earnings";
import Profile from "./vpages/Profile";
import VMessages from "./vpages/Messages";
import VSupport from "./vpages/Support";

import { AAuthProvider, useAAuth } from "./acontext/AAuthContext";
import ALayout from "./acomponents/ALayout";
import ALogin from "./apages/ALogin";
import ADashboard from "./apages/ADashboard";
import AMembers from "./apages/AMembers";
import AVerification from "./apages/AVerification";
import AMissionReview from "./apages/AMissionReview";
import ASupport from "./apages/ASupport";
import AWithdrawals from "./apages/AWithdrawals";
import AAnalytics from "./apages/AAnalytics";

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
      <Route path="/reset-password" element={<ResetPassword apiClient={api} loginPath="/login" />} />
      <Route path="/get-started" element={builder ? <Navigate to="/" replace /> : <IntentFork />} />
      <Route path="/get-started/feedback" element={builder ? <Navigate to="/" replace /> : <RoleSelect />} />
      <Route path="/signup" element={builder ? <Navigate to="/" replace /> : <OnboardingWizard />} />
      <Route path="/oauth-callback" element={<BuilderOAuthCallback />} />
      <Route path="/missions/new" element={<RequireAuth><CreateMissionWizard /></RequireAuth>} />
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/missions" element={<Missions />} />
        <Route path="/missions/:id" element={<MissionDetail />} />
        <Route path="/audience" element={<Audience />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/support" element={<Support />} />
        <Route path="/settings" element={<Settings />} />
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
        <Route path="onboarding" element={<VOnboarding />} />
      <Route path="reset-password" element={<ResetPassword apiClient={vapi} loginPath="/validator/login" />} />
      <Route path="oauth-callback" element={<VOAuthCallback />} />
      <Route path="missions/:id/workspace" element={<RequireVAuth><Workspace /></RequireVAuth>} />
      <Route path="missions/:id/brief" element={<RequireVAuth><MissionBrief /></RequireVAuth>} />
      <Route path="missions/:id/checkin" element={<RequireVAuth><DailyCheckin /></RequireVAuth>} />
      <Route element={<RequireVAuth><VLayout /></RequireVAuth>}>
        <Route index element={<Discover />} />
        <Route path="missions" element={<MyMissions />} />
        <Route path="missions/:id/review" element={<MissionReview />} />
      <Route path="missions/:id" element={<MissionDetails />} />
        <Route path="missions/:id/submitted" element={<Submitted />} />
        <Route path="earnings" element={<Earnings />} />
        <Route path="profile" element={<Profile />} />
        <Route path="messages" element={<VMessages />} />
        <Route path="support" element={<VSupport />} />
      </Route>
      <Route path="*" element={<Navigate to="/validator" replace />} />
    </Routes>
  );
}

function RequireAAuth({ children }) {
  const { admin, loading } = useAAuth();
  const location = useLocation();
  if (loading) return <div className="page rise"><div className="muted">Loading…</div></div>;
  if (!admin) return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  return children;
}

function AdminRoutes() {
  const { admin, loading } = useAAuth();
  if (loading) return <div className="page rise"><div className="muted">Loading…</div></div>;

  return (
    <Routes>
      <Route path="login" element={admin ? <Navigate to="/admin" replace /> : <ALogin />} />
      <Route element={<RequireAAuth><ALayout /></RequireAAuth>}>
        <Route index element={<ADashboard />} />
        <Route path="members" element={<AMembers />} />
        <Route path="verification" element={<AVerification />} />
        <Route path="mission-review" element={<AMissionReview />} />
        <Route path="support" element={<ASupport />} />
        <Route path="withdrawals" element={<AWithdrawals />} />
        <Route path="analytics" element={<AAnalytics />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

/* ---------------- Analytics ---------------- */

function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageview(location.pathname + location.search);
  }, [location.pathname, location.search]);
  return null;
}

function SkipLink() {
  return <a href="#main-content" className="skip-link">Skip to main content</a>;
}

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <SkipLink />
        <RouteTracker />
        <Routes>
          <Route path="/validator/*" element={
            <VAuthProvider><VMetaProvider><ValidatorRoutes /></VMetaProvider></VAuthProvider>
          } />
          <Route path="/admin/*" element={
            <AAuthProvider><AdminRoutes /></AAuthProvider>
          } />
          <Route path="/*" element={
            <AuthProvider><MetaProvider><BuilderRoutes /></MetaProvider></AuthProvider>
          } />
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  );
}
