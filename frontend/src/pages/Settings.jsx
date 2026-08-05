import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { Avatar, Btn, PasswordInput } from "../components/ui";
import PhoneSetup from "../components/PhoneSetup";
import { useTranslation } from "../i18n/index.jsx";

export default function Settings() {
  const { t } = useTranslation();
  const { builder, setBuilder } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(builder?.name || "");
  const [designation, setDesignation] = useState(builder?.designation || "");
  const [org, setOrg] = useState(builder?.org || "");
  const [website, setWebsite] = useState(builder?.website || "");
  const [email, setEmail] = useState(builder?.email || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
    try { await api.forgotPassword(builder.email); } finally { setForgotBusy(false); setForgotSent(true); }
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
      await api.changePassword(pwdCurrent, pwdNew);
      setPwdSuccess(t("settings.pwdSuccess", null, "Password updated successfully."));
      setPwdCurrent(""); setPwdNew(""); setPwdConfirm("");
    } catch (err) {
      setPwdError(err.message || t("settings.errPwdChange", null, "Failed to change password."));
    } finally {
      setPwdBusy(false);
    }
  };

  const startEdit = () => {
    setName(builder?.name || ""); 
    setDesignation(builder?.designation || "");
    setOrg(builder?.org || ""); 
    setWebsite(builder?.website || "");
    setEmail(builder?.email || "");
    setError(""); setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await api.updateProfile({ name, org, email, website, designation });
      setBuilder(res.builder);
      setEditing(false);
    } catch (err) {
      setError(err.message || t("settings.errSave", null, "Couldn't save changes"));
    } finally { setBusy(false); }
  };

  return (
    <div className="page rise">
      <div className="ph">
        <div><span className="eyebrow">{t("settings.account", null, "Account")}</span><h1>{t("settings.title", null, "Settings")}</h1><p className="lead">{t("settings.leadBuilder", null, "Manage your workspace, sign-in and security options.")}</p></div>
      </div>

      <div className="col gap-5" style={{ maxWidth: 640 }}>
        <div className="card" style={{ padding: "var(--pad-card)" }}>
          {!editing ? (
            <div className="row between" style={{ alignItems: "center" }}>
              <div className="row gap-4" style={{ alignItems: "center" }}>
                <Avatar name={builder?.name || ""} size={52} color={builder?.color} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{builder?.name}</div>
                  <div className="faint" style={{ fontSize: 13 }}>{builder?.email} · {builder?.org}</div>
                </div>
              </div>
              <Btn variant="ghost" icon="edit" onClick={startEdit}>{t("actions.editProfile", null, "Edit profile")}</Btn>
            </div>
          ) : (
            <form onSubmit={save} className="col gap-4">
              {error && <div className="err-banner">{error}</div>}
              <div className="row gap-3 wrap">
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>{t("settings.yourName", null, "Your name")}</label>
                  <input className="fin" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>{t("settings.designation", null, "Designation")}</label>
                  <input className="fin" placeholder={t("settings.designationPlaceholder", null, "e.g. Founder, Product Manager")} value={designation} onChange={e => setDesignation(e.target.value)} />
                </div>
              </div>
              <div className="row gap-3 wrap">
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>{t("settings.workspaceName", null, "Workspace name")}</label>
                  <input className="fin" value={org} onChange={e => setOrg(e.target.value)} required />
                </div>
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>{t("settings.companyWebsite", null, "Company Website")}</label>
                  <input className="fin" type="url" placeholder="https://..." value={website} onChange={e => setWebsite(e.target.value)} />
                </div>
              </div>
              <div className="fld">
                <label>{t("settings.email", null, "Email")}</label>
                <input className="fin" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="row gap-2">
                <Btn variant="primary" type="submit" disabled={busy}>{busy ? t("actions.saving", null, "Saving…") : t("actions.saveChanges", null, "Save changes")}</Btn>
                <Btn variant="quiet" type="button" onClick={() => { setEditing(false); setError(""); }}>{t("actions.cancel", null, "Cancel")}</Btn>
              </div>
            </form>
          )}
        </div>

        <PhoneSetup client={api} phone={builder?.phone} phoneVerified={builder?.phoneVerified}
          onUpdate={(phone) => setBuilder(b => ({ ...b, phone, phoneVerified: !!phone }))} />

        {!builder?.oauthProvider && (
          <div className="card" style={{ padding: "var(--pad-card)" }}>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>{t("settings.security", null, "Security")}</h2>
            <p className="faint mb-5">{t("settings.securityDesc", null, "Change your password to keep your account secure.")}</p>
            <form onSubmit={savePassword} className="col gap-4">
              {pwdError && <div className="err-banner">{pwdError}</div>}
              {pwdSuccess && <div className="banner success">{pwdSuccess}</div>}
              {forgotSent && <div className="banner success">{t("settings.forgotPwdSent", null, "If an account exists for this email, a reset link is on its way.")}</div>}
              <div className="fld">
                <div className="row between" style={{ alignItems: "baseline" }}>
                  <label>{t("settings.currentPwd", null, "Current Password")}</label>
                  <button type="button" className="backlink" style={{ fontSize: 12.5 }} onClick={sendForgotLink} disabled={forgotBusy}>
                    {forgotBusy ? t("auth.sending", null, "Sending…") : t("settings.forgotCurrentPwd", null, "Forgot it?")}
                  </button>
                </div>
                <PasswordInput className="fin" value={pwdCurrent} onChange={e => setPwdCurrent(e.target.value)} required />
              </div>
              <div className="row gap-3 wrap">
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>{t("settings.newPwd", null, "New Password")}</label>
                  <PasswordInput className="fin" value={pwdNew} onChange={e => setPwdNew(e.target.value)} required />
                </div>
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>{t("settings.confirmNewPwd", null, "Confirm New Password")}</label>
                  <PasswordInput className="fin" value={pwdConfirm} onChange={e => setPwdConfirm(e.target.value)} required />
                </div>
              </div>
              <div>
                <Btn variant="primary" type="submit" disabled={pwdBusy}>{pwdBusy ? t("actions.saving", null, "Saving…") : t("actions.updatePassword", null, "Update password")}</Btn>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
