import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "../components/Icon";
import { BrandMark } from "../components/BrandMark";
import { Btn } from "../components/ui";
import { useAAuth } from "../acontext/AAuthContext";

export default function ALogin() {
  const { login, totpSetupStart, totpSetupConfirm, totpVerify } = useAAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [stage, setStage] = useState("credentials"); // credentials | setup | code
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [qrCode, setQrCode] = useState(null);
  const [secretUri, setSecretUri] = useState(null);
  const [pendingToken, setPendingToken] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const goToApp = () => navigate(location.state?.from || "/admin", { replace: true });

  const submitCredentials = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const res = await login(email, password);
      if (res.needsTotpSetup) {
        const setup = await totpSetupStart(email, password);
        setQrCode(setup.qrCode);
        setSecretUri(setup.uri);
        setStage("setup");
      } else if (res.needsTotpCode) {
        setPendingToken(res.pendingToken);
        setStage("code");
      }
    } catch (err) {
      setError(err.message || "Couldn't sign in");
    } finally {
      setBusy(false);
    }
  };

  const submitSetupCode = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      await totpSetupConfirm(email, password, code);
      goToApp();
    } catch (err) {
      setError(err.message || "Incorrect code");
    } finally {
      setBusy(false);
    }
  };

  const submitVerifyCode = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      await totpVerify(pendingToken, code);
      goToApp();
    } catch (err) {
      setError(err.message || "Incorrect code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card rise">
        <div style={{ marginBottom: 14 }}><BrandMark size={40} /></div>

        {stage === "credentials" && (
          <>
            <h1>Admin console</h1>
            <p className="muted" style={{ margin: "0 0 22px", fontSize: 14 }}>Sign in with the platform operator account.</p>
            {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}
            <form onSubmit={submitCredentials} className="col gap-4">
              <div className="fld">
                <label>Email</label>
                <input className="fin" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
              </div>
              <div className="fld">
                <label>Password</label>
                <input className="fin" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <Btn type="submit" variant="primary" size="lg" block disabled={busy}>{busy ? "Signing in…" : "Continue"}</Btn>
            </form>
          </>
        )}

        {stage === "setup" && (
          <>
            <h1>Set up two-factor authentication</h1>
            <p className="muted" style={{ margin: "0 0 18px", fontSize: 14 }}>
              No authenticator is configured yet for this admin account. Scan this QR code with Google Authenticator, 1Password, or any TOTP app, then enter the 6-digit code it generates.
            </p>
            {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}
            {qrCode && (
              <div style={{ textAlign: "center", marginBottom: 18 }}>
                <img src={qrCode} alt="TOTP QR code" style={{ width: 180, height: 180, borderRadius: 8, border: "1px solid var(--border)" }} />
                <p className="faint" style={{ fontSize: 11, marginTop: 8, wordBreak: "break-all" }}>
                  Can't scan? Enter manually: <code>{secretUri && new URL(secretUri).searchParams.get("secret")}</code>
                </p>
              </div>
            )}
            <form onSubmit={submitSetupCode} className="col gap-4">
              <div className="fld">
                <label>6-digit code</label>
                <input className="fin" inputMode="numeric" maxLength={6} value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" required autoFocus />
              </div>
              <Btn type="submit" variant="primary" size="lg" block disabled={busy || code.length !== 6}>
                {busy ? "Verifying…" : "Confirm & finish setup"}
              </Btn>
            </form>
          </>
        )}

        {stage === "code" && (
          <>
            <h1>Enter your code</h1>
            <p className="muted" style={{ margin: "0 0 22px", fontSize: 14 }}>
              Open your authenticator app and enter the current 6-digit code.
            </p>
            {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}
            <form onSubmit={submitVerifyCode} className="col gap-4">
              <div className="fld">
                <label>6-digit code</label>
                <input className="fin" inputMode="numeric" maxLength={6} value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" required autoFocus />
              </div>
              <Btn type="submit" variant="primary" size="lg" block disabled={busy || code.length !== 6}>
                {busy ? "Verifying…" : "Sign in"}
              </Btn>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
