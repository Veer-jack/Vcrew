import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "../components/Icon";
import { Btn } from "../components/ui";
import { PROVIDER_META, PROVIDER_ICONS } from "../components/SocialIcons";
import { useVAuth } from "../vcontext/VAuthContext";
import { vapi } from "../vapi/client";

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
