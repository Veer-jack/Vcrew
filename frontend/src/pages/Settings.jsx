import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { Avatar, Btn, PasswordInput } from "../components/ui";
import PhoneSetup from "../components/PhoneSetup";
import { useTranslation } from "../i18n/index.jsx";
import { INDUSTRIES, COMPANY_INDUSTRIES, EMP_SIZES } from "../data/onboarding";

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

  const [editingCompany, setEditingCompany] = useState(false);
  const [industry, setIndustry] = useState(builder?.profile?.industry || "");
  const [companySize, setCompanySize] = useState(builder?.profile?.size || "");
  const [companyBusy, setCompanyBusy] = useState(false);
  const [companyError, setCompanyError] = useState("");
  const industryOptions = (builder?.persona === "company" ? COMPANY_INDUSTRIES : INDUSTRIES)(t);
  const sizeOptions = EMP_SIZES(t);

  const startEditCompany = () => {
    setIndustry(builder?.profile?.industry || "");
    setCompanySize(builder?.profile?.size || "");
    setCompanyError(""); setEditingCompany(true);
  };
  const saveCompany = async (e) => {
    e.preventDefault();
    setCompanyBusy(true); setCompanyError("");
    try {
      const res = await api.updateProfile({ name: builder.name, org: builder.org, email: builder.email, website: builder.website, designation: builder.designation, profile: { industry, size: companySize } });
      setBuilder(res.builder);
      setEditingCompany(false);
    } catch (err) {
      setCompanyError(err.message || t("settings.errSave", null, "Couldn't save changes"));
    } finally { setCompanyBusy(false); }
  };

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
          prefillPhone={builder?.profile?.mobile}
          onUpdate={(phone) => setBuilder(b => ({ ...b, phone, phoneVerified: !!phone }))} />

        <div className="card" style={{ padding: "var(--pad-card)" }}>
          <div className="row between" style={{ alignItems: "center", marginBottom: 8 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>{t("settings.companyDetails", null, "Company Details")}</h2>
            {!editingCompany && <Btn variant="ghost" icon="edit" onClick={startEditCompany}>{t("actions.edit", null, "Edit")}</Btn>}
          </div>
          {!editingCompany ? (
            <div className="row gap-3 wrap">
              <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                <label>{t("onboarding.founder.company.industryLabel", null, "Industry")}</label>
                <div className="fin" style={{ display: "flex", alignItems: "center", color: builder?.profile?.industry ? undefined : "var(--text-faint)" }}>{builder?.profile?.industry || t("settings.notSet", null, "Not set")}</div>
              </div>
              <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                <label>{t("settings.companySize", null, "Company size")}</label>
                <div className="fin" style={{ display: "flex", alignItems: "center", color: builder?.profile?.size ? undefined : "var(--text-faint)" }}>{builder?.profile?.size || t("settings.notSet", null, "Not set")}</div>
              </div>
            </div>
          ) : (
            <form onSubmit={saveCompany} className="col gap-4">
              {companyError && <div className="err-banner">{companyError}</div>}
              <div className="row gap-3 wrap">
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>{t("onboarding.founder.company.industryLabel", null, "Industry")}</label>
                  <select className="fin" value={industry} onChange={e => setIndustry(e.target.value)}>
                    <option value="" disabled>{t("onboardingFields.selectPlaceholder", null, "Select…")}</option>
                    {industryOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>{t("settings.companySize", null, "Company size")}</label>
                  <select className="fin" value={companySize} onChange={e => setCompanySize(e.target.value)}>
                    <option value="" disabled>{t("onboardingFields.selectPlaceholder", null, "Select…")}</option>
                    {sizeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div className="row gap-2">
                <Btn variant="primary" type="submit" disabled={companyBusy}>{companyBusy ? t("actions.saving", null, "Saving…") : t("actions.saveChanges", null, "Save changes")}</Btn>
                <Btn variant="quiet" type="button" onClick={() => { setEditingCompany(false); setCompanyError(""); }}>{t("actions.cancel", null, "Cancel")}</Btn>
              </div>
            </form>
          )}
          {builder?.profile?.vWebsiteInput && (
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
              <div className="row between" style={{ alignItems: "center" }}>
                <b style={{ fontSize: 13.5 }}>{t("settings.verificationWebsite", null, "Verification website")}</b>
                {builder?.profile?.vWebsite && <span className="pill" style={{ color: "var(--success)", fontSize: 11 }}>{t("onboardingFields.submitted", null, "Submitted")}</span>}
              </div>
              <div className="fin" style={{ display: "flex", alignItems: "center", marginTop: 6, color: "var(--text-muted)" }}>{builder.profile.vWebsiteInput}</div>
              <p className="fhint">{t("settings.verificationLockedHint", null, "Submitted during onboarding and can't be changed here — contact support if this needs to be corrected.")}</p>
            </div>
          )}
        </div>

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
