import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "../components/Icon";
import { Btn } from "../components/ui";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("aarav@kettleand.co");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      await login(email, password);
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(err.message || "Couldn't sign in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card rise">
        <div className="brand-mark" style={{ marginBottom: 14 }}><Icon name="shield" size={18} /></div>
        <h1>Welcome back</h1>
        <p className="muted" style={{ margin: "0 0 22px", fontSize: 14 }}>Sign in to your ValidationCrew builder workspace.</p>
        {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}
        <form onSubmit={submit} className="col gap-4">
          <div className="fld">
            <label>Email</label>
            <input className="fin" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
          </div>
          <div className="fld">
            <label>Password</label>
            <input className="fin" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <Btn type="submit" variant="primary" size="lg" block disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Btn>
        </form>
        <p className="faint" style={{ marginTop: 18, fontSize: 12.5 }}>
          Demo account — aarav@kettleand.co / password123
        </p>
      </div>
    </div>
  );
}
