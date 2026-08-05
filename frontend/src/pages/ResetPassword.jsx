import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { Btn, PasswordInput } from "../components/ui";
import { useTranslation } from "../i18n/index.jsx";

/**
 * Shared reset-password page used by both builder (/reset-password)
 * and validator (/validator/reset-password).
 * Pass the right apiClient (api or vapi) and loginPath via props.
 */
export default function ResetPassword({ apiClient, loginPath }) {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="auth-shell">
        <div className="card auth-card rise">
          <div style={{ marginBottom: 14 }}><BrandMark size={80} /></div>
          <h1>{t("auth.invalidResetLink", null, "Invalid reset link")}</h1>
          <p className="muted">{t("auth.invalidResetBody", null, "This link is missing a reset token. Please request a new one.")}</p>
          <Btn variant="primary" block onClick={() => navigate(loginPath)}>{t("auth.backToSignIn", null, "Back to sign in")}</Btn>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="auth-shell">
        <div className="card auth-card rise">
          <div style={{ marginBottom: 14 }}><BrandMark size={80} /></div>
          <h1>{t("auth.pwdUpdatedTitle", null, "Password updated ✅")}</h1>
          <p className="muted">{t("auth.pwdUpdatedBody", null, "Your password has been changed and all existing sessions signed out. You can now sign in with your new password.")}</p>
          <Btn variant="primary" block onClick={() => navigate(loginPath)}>{t("auth.signInAction", null, "Sign in")}</Btn>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setError(t("auth.errPwdLength", null, "Password must be at least 8 characters")); return; }
    if (password !== confirm) { setError(t("auth.errPwdMatch", null, "Passwords don't match")); return; }
    setError(""); setBusy(true);
    try {
      await apiClient.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message || t("auth.errPwdReset", null, "Couldn't reset your password — the link may have expired"));
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card rise">
        <div style={{ marginBottom: 14 }}><BrandMark size={80} /></div>
        <h1>{t("auth.setNewPwd", null, "Set a new password")}</h1>
        <p className="muted" style={{ margin: "0 0 22px", fontSize: 14 }}>{t("auth.setNewPwdBody", null, "Choose a strong password for your account.")}</p>
        {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}
        <form onSubmit={submit} className="col gap-4">
          <div className="fld">
            <label>{t("auth.password", null, "Password")}</label>
            <PasswordInput className="fin" value={password}
              onChange={e => setPassword(e.target.value)} placeholder={t("auth.atLeast8Chars", null, "At least 8 characters")} autoFocus required />
          </div>
          <div className="fld">
            <label>{t("auth.confirmPwd", null, "Confirm password")}</label>
            <PasswordInput className="fin" value={confirm}
              onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required />
          </div>
          <Btn type="submit" variant="primary" size="lg" block disabled={busy}>
            {busy ? t("auth.updating", null, "Updating…") : t("auth.setNewPwdAction", null, "Set new password")}
          </Btn>
        </form>
      </div>
    </div>
  );
}
