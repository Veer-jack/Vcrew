import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Icon from "../components/Icon";
import { BrandMark } from "../components/BrandMark";
import { Btn, PasswordInput } from "../components/ui";
import { useAAuth } from "../acontext/AAuthContext";
import { useTranslation } from "../i18n/index.jsx";

export default function ALogin() {
  const { admin, login, totpSetupStart, totpSetupConfirm, totpVerify } = useAAuth();
  const { t } = useTranslation();
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
  const [backupCodes, setBackupCodes] = useState(null);
  const [busy, setBusy] = useState(false);

  const goToApp = () => navigate(location.state?.from || "/admin", { replace: true });

  if (admin) {
    return (
      <div className="page rise" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg)" }}>
        <div style={{ textAlign: "center", background: "var(--panel)", padding: "40px 32px", borderRadius: "var(--radius)", border: "1px solid var(--border)", maxWidth: 400, boxShadow: "var(--shadow-sm)" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 24, fontWeight: 800 }}>{t("auth.alreadyLoggedIn", null, "Already logged in")}</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 24, fontSize: 15 }}><span dangerouslySetInnerHTML={{ __html: t("auth.loggedInAs", { email: `<strong>${admin.email}</strong>` }, "You are currently logged in as {email}.") }} /></p>
          <Link to="/admin" className="btn btn-primary" style={{ display: "inline-flex", width: "100%", justifyContent: "center" }}>{t("admin.goToDashboard", null, "Go to Admin Dashboard →")}</Link>
        </div>
      </div>
    );
  }

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
      const res = await totpSetupConfirm(email, password, code);
      if (res.backupCodes) {
        setBackupCodes(res.backupCodes); // show backup codes before entering the app
      } else {
        goToApp();
      }
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
        <div style={{ marginBottom: 14 }}><BrandMark size={80} /></div>

        {stage === "credentials" && (
          <>
            <h1>{t("admin.signIn", null, "Admin console")}</h1>
            <p className="muted" style={{ margin: "0 0 22px", fontSize: 14 }}>{t("admin.signInDesc", null, "Sign in with the platform operator account.")}</p>
            {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}
            <form onSubmit={submitCredentials} className="col gap-4">
              <div className="fld">
                <label>{t("auth.email", null, "Email")}</label>
                <input className="fin" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
              </div>
              <div className="fld">
                <label>{t("auth.password", null, "Password")}</label>
                <PasswordInput className="fin" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <Btn type="submit" variant="primary" size="lg" block disabled={busy}>{busy ? t("auth.signingIn", null, "Signing in…") : t("actions.continue", null, "Continue")}</Btn>
            </form>
          </>
        )}

        {stage === "setup" && backupCodes && (
          <>
            <h1>{t("admin.saveBackupCodes", null, "Save your backup codes")}</h1>
            <p className="muted" style={{ margin: "0 0 16px", fontSize: 14 }}>
              <span dangerouslySetInnerHTML={{ __html: t("admin.backupCodesDesc", null, "These 8 codes let you regain access if you ever lose your authenticator app. Each can only be used once. <b>Save them somewhere safe — they won't be shown again.</b>") }} />
            </p>
            <div style={{ background: "var(--panel-inset)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 16px", marginBottom: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600 }}>
                {backupCodes.map((c, i) => <span key={i}>{c}</span>)}
              </div>
            </div>
            <Btn variant="primary" size="lg" block onClick={goToApp}>{t("admin.savedCodes", null, "I've saved these — continue to admin")}</Btn>
          </>
        )}

        {stage === "setup" && !backupCodes && (
          <>
            <h1>{t("admin.setupTwoFactor", null, "Set up two-factor authentication")}</h1>
            <p className="muted" style={{ margin: "0 0 18px", fontSize: 14 }}>
              {t("admin.setupTwoFactorDesc", null, "No authenticator is configured yet for this admin account. Scan this QR code with Google Authenticator, 1Password, or any TOTP app, then enter the 6-digit code it generates.")}
            </p>
            {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}
            {qrCode && (
              <div style={{ textAlign: "center", marginBottom: 18 }}>
                <img src={qrCode} alt="TOTP QR code" style={{ width: 180, height: 180, borderRadius: 8, border: "1px solid var(--border)" }} />
                <p className="faint" style={{ fontSize: 11, marginTop: 8, wordBreak: "break-all" }}>
                  {t("admin.cantScan", null, "Can't scan? Enter manually:")} <code>{secretUri && new URL(secretUri).searchParams.get("secret")}</code>
                </p>
              </div>
            )}
            <form onSubmit={submitSetupCode} className="col gap-4">
              <div className="fld">
                <label>{t("admin.sixDigitCode", null, "6-digit code")}</label>
                <input className="fin" inputMode="numeric" maxLength={6} value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" required autoFocus />
              </div>
              <Btn type="submit" variant="primary" size="lg" block disabled={busy || code.length !== 6}>
                {busy ? t("auth.verifying", null, "Verifying…") : t("admin.confirmAndFinish", null, "Confirm & finish setup")}
              </Btn>
            </form>
          </>
        )}

        {stage === "code" && (
          <>
            <h1>{t("admin.enterCode", null, "Enter your code")}</h1>
            <p className="muted" style={{ margin: "0 0 22px", fontSize: 14 }}>
              {t("admin.enterCodeDesc", null, "Open your authenticator app and enter the current 6-digit code.")}
            </p>
            {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}
            <form onSubmit={submitVerifyCode} className="col gap-4">
              <div className="fld">
                <label>{t("admin.sixDigitCode", null, "6-digit code")}</label>
                <input className="fin" inputMode="numeric" maxLength={6} value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" required autoFocus />
              </div>
              <Btn type="submit" variant="primary" size="lg" block disabled={busy || code.length !== 6}>
                {busy ? t("auth.verifying", null, "Verifying…") : t("auth.signIn", null, "Sign in")}
              </Btn>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
