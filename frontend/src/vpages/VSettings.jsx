import { useState } from "react";
import { useVAuth } from "../vcontext/VAuthContext";
import { vapi } from "../vapi/client";
import { Btn, PasswordInput } from "../components/ui";
import Icon from "../components/Icon";
import { useTranslation } from "../i18n/index.jsx";

export default function VSettings() {
  const { t } = useTranslation();
  const { validator, refresh, logout } = useVAuth();
  const [name, setName] = useState(validator?.name || "");
  const [email, setEmail] = useState(validator?.email || "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const sendForgotLink = async () => {
    setForgotBusy(true);
    try { await vapi.forgotPassword(validator.email); } finally { setForgotBusy(false); setForgotSent(true); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwdError(""); setPwdSuccess("");
    if (pwdNew !== pwdConfirm) {
      return setPwdError(t("settings.errPwdMatch", null, "New passwords do not match."));
    }
    if (pwdNew.length < 8) {
      return setPwdError(t("settings.errPwdLength", null, "New password must be at least 8 characters."));
    }
    setPwdBusy(true);
    try {
      await vapi.changePassword(pwdCurrent, pwdNew);
      setPwdSuccess(t("settings.pwdSuccess", null, "Password updated successfully."));
      setPwdCurrent(""); setPwdNew(""); setPwdConfirm("");
    } catch (err) {
      setPwdError(err.message || t("settings.pwdFailed", null, "Failed to change password."));
    } finally {
      setPwdBusy(false);
    }
  };

  const save = async () => {
    setBusy(true); setError(""); setSaved(false);
    try {
      await vapi.updateProfile({ name, email });
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || t("settings.saveFailed", null, "Couldn't save changes"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page rise">
      <div className="ph" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{t("settings.title", null, "Settings")}</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24, maxWidth: 1000 }}>
        {/* Left Column */}
        <div className="col gap-4">
          {/* Profile Card */}
          <div className="card" style={{ padding: 24 }}>
            <div className="row gap-3" style={{ alignItems: "center", marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                <Icon name="user" size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t("settings.profileInfo", null, "Profile Information")}</h3>
                <p className="faint" style={{ margin: "4px 0 0", fontSize: 13 }}>{t("settings.profileDesc", null, "Update your personal details and email address.")}</p>
              </div>
            </div>
            
            <div className="col gap-4">
              <div className="fld">
                <label style={{ fontSize: 13, fontWeight: 600 }}>{t("settings.fullName", null, "Full Name")}</label>
                <input className="fin" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="fld">
                <label style={{ fontSize: 13, fontWeight: 600 }}>{t("settings.emailAddress", null, "Email Address")}</label>
                <input className="fin" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              {error && <p style={{ color: "var(--danger)", fontSize: 13, margin: "4px 0 8px" }}>{error}</p>}
              {saved && <p style={{ color: "var(--success)", fontSize: 13, margin: "4px 0 8px" }}>✓ {t("settings.changesSaved", null, "Changes saved")}</p>}
              <div>
                <Btn variant="primary" onClick={save} disabled={busy}>
                  {busy ? t("actions.saving", null, "Saving…") : t("actions.saveChanges", null, "Save Changes")}
                </Btn>
              </div>
            </div>
          </div>

          {/* Account Card */}
          <div className="card" style={{ padding: 24 }}>
            <div className="row gap-3" style={{ alignItems: "center", marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                <Icon name="userCheck" size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t("settings.accountInfo", null, "Account Information")}</h3>
                <p className="faint" style={{ margin: "4px 0 0", fontSize: 13 }}>{t("settings.accountDesc", null, "View your account details and unique identifiers.")}</p>
              </div>
            </div>
            
            <div className="col gap-3">
              <div className="fld">
                <label style={{ fontSize: 13, fontWeight: 600 }}>{t("settings.validatorId", null, "Validator ID")}</label>
                <input className="fin" value={`#${validator?.id}`} disabled style={{ background: "var(--surface-1)", cursor: "not-allowed" }} />
              </div>
              <div className="fld">
                <label style={{ fontSize: 13, fontWeight: 600 }}>{t("settings.handle", null, "Handle")}</label>
                <input className="fin" value={`@${validator?.handle}`} disabled style={{ background: "var(--surface-1)", cursor: "not-allowed" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col gap-4">
          {/* Security Card */}
          {!validator?.oauthProvider && (
            <div className="card" style={{ padding: 24 }}>
              <div className="row gap-3" style={{ alignItems: "center", marginBottom: 24 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                  <Icon name="shield" size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t("settings.security", null, "Security")}</h3>
                  <p className="faint" style={{ margin: "4px 0 0", fontSize: 13 }}>{t("settings.securityDesc", null, "Change your password to keep your account secure.")}</p>
                </div>
              </div>
              
              <form onSubmit={savePassword} className="col gap-4">
                {pwdError && <div className="err-banner" style={{ margin: 0 }}>{pwdError}</div>}
                {pwdSuccess && <div className="banner success" style={{ margin: 0 }}>{pwdSuccess}</div>}
                {forgotSent && <div className="banner success" style={{ margin: 0 }}>{t("settings.forgotPwdSent", null, "If an account exists for this email, a reset link is on its way.")}</div>}
                <div className="fld">
                  <div className="row between" style={{ alignItems: "baseline" }}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>{t("settings.currentPwd", null, "Current Password")}</label>
                    <button type="button" className="backlink" style={{ fontSize: 12.5 }} onClick={sendForgotLink} disabled={forgotBusy}>
                      {forgotBusy ? t("auth.sending", null, "Sending…") : t("settings.forgotCurrentPwd", null, "Forgot it?")}
                    </button>
                  </div>
                  <PasswordInput className="fin" placeholder={t("settings.enterCurrentPwd", null, "Enter current password")} value={pwdCurrent} onChange={e => setPwdCurrent(e.target.value)} required />
                </div>
                <div className="row gap-3 wrap">
                  <div className="fld" style={{ flex: 1, minWidth: 160 }}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>{t("settings.newPwd", null, "New Password")}</label>
                    <PasswordInput className="fin" placeholder={t("settings.enterNewPwd", null, "Enter new password")} value={pwdNew} onChange={e => setPwdNew(e.target.value)} required />
                  </div>
                  <div className="fld" style={{ flex: 1, minWidth: 160 }}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>{t("settings.confirmNewPwd", null, "Confirm New Password")}</label>
                    <PasswordInput className="fin" placeholder={t("settings.confirmNewPwdPlaceholder", null, "Confirm new password")} value={pwdConfirm} onChange={e => setPwdConfirm(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <Btn variant="primary" type="submit" disabled={pwdBusy}>{pwdBusy ? t("actions.saving", null, "Saving…") : t("actions.updatePassword", null, "Update Password")}</Btn>
                </div>
              </form>
            </div>
          )}

          {/* More Settings Coming Soon */}
          <div className="card" style={{ padding: 24, background: "var(--surface-1)", border: "1px dashed var(--border)" }}>
            <div className="row gap-3" style={{ alignItems: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                <Icon name="sparkle" size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t("settings.moreSettings", null, "More settings coming soon")}</h3>
                <p className="faint" style={{ margin: "4px 0 0", fontSize: 13 }}>{t("settings.moreSettingsDesc", null, "We're working on new preferences and customizations for your account.")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Validator type & status */}
      <div className="card" style={{ padding: 22, marginBottom: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>{t("settings.accountType", null, "Account type")}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{t("settings.type", null, "Type")}</div>
            <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
              {validator?.validator_type === "user" ? t("settings.userTester", null, "User — Consumer tester") : validator?.validator_type === "tester" ? t("settings.verifiedTester", null, "Verified Tester") : t("settings.validatorPro", null, "Validator — Professional")}
            </div>
          </div>
          <span style={{
            padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: validator?.validator_type === "user" ? "var(--success-weak)" : validator?.validator_type === "tester" ? "var(--warning-weak)" : "var(--accent-weak)",
            color: validator?.validator_type === "user" ? "var(--success)" : validator?.validator_type === "tester" ? "var(--warning)" : "var(--accent)",
          }}>
            {validator?.validator_type === "user" ? t("badge.user", null, "User") : validator?.validator_type === "tester" ? t("badge.tester", null, "Tester") : t("badge.validator", null, "Validator")}
          </span>
        </div>

        {/* Tester status */}
        {validator?.validator_type === "tester" && (
          <div style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{t("settings.verificationStatus", null, "Verification status")}</div>
            {validator?.tester_status === "pending_review" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--warning)" }}>
                <span>⏳</span> {t("settings.underReview", null, "Under review — admin will respond within 72 hours")}
              </div>
            )}
            {validator?.tester_status === "approved" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--success)" }}>
                <span>✓</span> {t("settings.verifiedTag", null, "Verified")} {validator?.tester_tier === "senior" ? t("settings.senior", null, "Senior") : t("settings.junior", null, "Junior")} {t("settings.testerUnlocked", null, "Tester — premium missions unlocked")}
              </div>
            )}
            {validator?.tester_status === "rejected" && (
              <div>
                <div style={{ fontSize: 13, color: "var(--danger)", marginBottom: 8 }}>✗ {t("settings.applicationNotApproved", null, "Application not approved — you can update your profile and reapply")}</div>
                <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => window.location.href = "/validator/onboarding"}>{t("settings.reapplyTester", null, "Reapply for Verified Tester")}</button>
              </div>
            )}
          </div>
        )}

        {/* Upgrade options */}
        {validator?.validator_type === "user" && (
          <div style={{ padding: "12px 0" }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{t("settings.upgradeAccount", null, "Upgrade your account")}</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 10px" }}>{t("settings.upgradeDesc", null, "Have professional expertise? Upgrade to Validator to access app testing and digital product missions.")}</p>
            <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => window.location.href = "/validator/onboarding"}>
              {t("settings.upgradeValidator", null, "Upgrade to Validator →")}
            </button>
          </div>
        )}
        {validator?.validator_type === "validator" && validator?.tester_status !== "pending_review" && (
          <div style={{ padding: "12px 0" }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{t("settings.applyTester", null, "Apply for Verified Tester")}</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 10px" }}>{t("settings.applyTesterDesc", null, "Have QA or product testing experience? Apply for verified status to access premium high-pay missions.")}</p>
            <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => window.location.href = "/validator/onboarding"}>
              {t("settings.applyTesterBtn", null, "Apply for Verified Tester →")}
            </button>
          </div>
        )}
      </div>

      {/* Sign Out */}
      <div className="card row between wrap" style={{ marginTop: 24, padding: 24, background: "color-mix(in srgb, var(--danger) 5%, transparent)", border: "1px solid color-mix(in srgb, var(--danger) 20%, transparent)", maxWidth: 1000, alignItems: "center", gap: 16 }}>
        <div className="row gap-4" style={{ alignItems: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "color-mix(in srgb, var(--danger) 10%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--danger)" }}>
            <Icon name="logout" size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--danger)" }}>{t("settings.signOutTitle", null, "Sign Out")}</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>{t("settings.signOutDesc", null, "You'll need to sign back in to access your missions and earnings.")}</p>
          </div>
        </div>
        <button className="btn btn-outline" style={{ color: "var(--danger)", borderColor: "var(--danger)", background: "transparent" }} onClick={logout}>
          {t("actions.signOut", null, "Sign out")}
        </button>
      </div>
    </div>
  );
}
