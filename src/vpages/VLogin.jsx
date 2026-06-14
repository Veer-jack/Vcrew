import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "../components/Icon";
import { Btn } from "../components/ui";
import { useVAuth } from "../vcontext/VAuthContext";
import { vapi } from "../vapi/client";

const PROVIDER_META = {
  github: { label: "GitHub", color: "#181717" },
  google: { label: "Google", color: "#EA4335" },
  linkedin: { label: "LinkedIn", color: "#0A66C2" },
};

function GithubMark({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.5 2.87 8.32 6.84 9.67.5.1.68-.22.68-.48 0-.24-.01-1.02-.01-1.85-2.78.61-3.37-1.2-3.37-1.2-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.32 2.75-1.05 2.75-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.62 1.03 2.75 0 3.93-2.35 4.8-4.58 5.05.36.32.68.95.68 1.92 0 1.39-.01 2.5-.01 2.84 0 .27.18.59.69.48A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

function GoogleMark({ size = 18 }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691Z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44Z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C40.971 35.205 44 30 44 24c0-1.341-.138-2.65-.389-3.917Z" />
    </svg>
  );
}

function LinkedInMark({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="#0A66C2" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124ZM7.114 20.452H3.558V9h3.556v11.452ZM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003Z" />
    </svg>
  );
}

const PROVIDER_ICONS = { github: GithubMark, google: GoogleMark, linkedin: LinkedInMark };

export default function VLogin() {
  const { login } = useVAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("riya@validationcrew.app");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [providers, setProviders] = useState({});

  useEffect(() => {
    vapi.oauthProviders().then(d => setProviders(d.providers)).catch(() => {});
    const params = new URLSearchParams(location.search);
    const oauthError = params.get("error");
    if (oauthError) setError(oauthError);
  }, [location.search]);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      await login(email, password);
      navigate(location.state?.from || "/validator", { replace: true });
    } catch (err) {
      setError(err.message || "Couldn't sign in");
    } finally {
      setBusy(false);
    }
  };

  const activeProviders = Object.entries(providers).filter(([, on]) => on);

  return (
    <div className="auth-shell">
      <div className="card auth-card rise">
        <div className="brand-mark" style={{ marginBottom: 14 }}><Icon name="shield" size={18} /></div>
        <h1>Welcome back</h1>
        <p className="muted" style={{ margin: "0 0 22px", fontSize: 14 }}>Sign in to your ValidationCrew validator account.</p>
        {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}

        {activeProviders.length > 0 && (
          <div className="col gap-3" style={{ marginBottom: 18 }}>
            {activeProviders.map(([key]) => {
              const meta = PROVIDER_META[key];
              const Mark = PROVIDER_ICONS[key];
              return (
                <a key={key} href={`/api/v/auth/oauth/${key}`} className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", gap: 10 }}>
                  {Mark ? <Mark size={18} /> : null}
                  Continue with {meta?.label || key}
                </a>
              );
            })}
            <div className="row gap-3" style={{ alignItems: "center", margin: "6px 0" }}>
              <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span className="faint" style={{ fontSize: 12 }}>or</span>
              <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>
          </div>
        )}

        <form onSubmit={submit} className="col gap-4">
          <div className="fld">
            <label>Email</label>
            <input className="fin" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required />
          </div>
          <div className="fld">
            <label>Password</label>
            <input className="fin" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <Btn type="submit" variant="primary" size="lg" block disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Btn>
        </form>
        <p className="faint" style={{ marginTop: 18, fontSize: 12.5 }}>
          Demo account — riya@validationcrew.app / password123
        </p>
      </div>
    </div>
  );
}
