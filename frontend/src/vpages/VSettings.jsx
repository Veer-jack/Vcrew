import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVAuth } from "../vcontext/VAuthContext";
import { vapi } from "../vapi/client";
import { Btn, PasswordInput } from "../components/ui";
import Icon from "../components/Icon";
import { useTranslation } from "../i18n/index.jsx";
import { settingsStepsFor } from "./VOnboarding.jsx";

// Bare label + chips, no card-inside-a-card nesting -- matches the builder
// Settings page's own ChipField (pages/Settings.jsx), just without its
// dropdown/"show all" truncation, since nothing here runs anywhere near
// that Country-with-115-selected scale.
function VChipField({ label, values }) {
  const { t } = useTranslation();
  return (
    <div>
      <label className="faint" style={{ fontSize: 12.5, textTransform: "uppercase", letterSpacing: ".02em" }}>{label}</label>
      {values?.length ? (
        <div className="row gap-2 wrap" style={{ marginTop: 7 }}>
          {values.map(v => <span key={v} className="mtag accent">{v}</span>)}
        </div>
      ) : (
        <div className="faint" style={{ marginTop: 7, fontSize: 13 }}>{t("settings.notSet", null, "Not set")}</div>
      )}
    </div>
  );
}

// One read-only summary card per settings step -- title, an Edit button
// into /validator/settings/edit-step/:step (VEditAccountStep.jsx, the real
// step form), and its saved values as chips. Mirrors the builder Settings
// page's own card-per-step pattern (tester's explicit ask), instead of the
// single long scrolling "answer everything at once" card this replaced.
function StepCard({ title, stepKey, navigate, children }) {
  const { t } = useTranslation();
  return (
    <div className="card" style={{ padding: "var(--pad-card)" }}>
      <div className="row between" style={{ alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>{title}</h2>
        <Btn variant="ghost" icon="edit" onClick={() => navigate(`/validator/settings/edit-step/${stepKey}`)}>{t("actions.edit", null, "Edit")}</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

export default function VSettings() {
  const { t } = useTranslation();
  const { validator, refresh } = useVAuth();
  const navigate = useNavigate();
  // The onboarding wizard's own role picker is skipped whenever a draft
  // type is already sitting in localStorage (VC_V_TYPE_<id>), which is
  // exactly what's left behind by an earlier onboarding attempt that never
  // reached the final "Complete setup" (that's the only place it gets
  // cleared) -- landing here from "Upgrade to Validator" resumed that old,
  // possibly different, draft instead of showing "Which best describes
  // you?" fresh. Clearing it first guarantees the picker actually shows,
  // with the current role already highlighted there (see TypeSelector).
  const goReOnboard = () => {
    localStorage.removeItem(`VC_V_TYPE_${validator?.id}`);
    window.location.href = "/validator/onboarding";
  };

  const isUser = validator?.validator_type === "user";
  // tester_status defaults to the literal string "none" in the DB (see
  // schema.sql), not null/empty -- a plain truthy check treats "none" as
  // "has applied", showing the Verification card/step for every validator
  // who never actually applied.
  const hasTesterFields = !!validator?.tester_status && validator.tester_status !== "none";
  const steps = settingsStepsFor(validator?.validator_type, hasTesterFields);
  const stepLabel = (key, fallback) => t(`vOnboarding.steps.${key}`, null, fallback);
  const stepTitle = (key) => { const s = steps.find(([k]) => k === key); return s ? stepLabel(s[0], s[1]) : ""; };

  const [changingPassword, setChangingPassword] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const cancelPasswordChange = () => {
    setChangingPassword(false);
    setPwdCurrent(""); setPwdNew(""); setPwdConfirm("");
    setPwdError(""); setForgotSent(false);
  };

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

  return (
    <div className="page rise">
      <div className="ph" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{t("settings.title", null, "Settings")}</h1>
      </div>

      {/* Account type card -- top of the page instead of buried at the
          bottom. Tester is the last role, nothing left to apply for, so the
          whole card is skipped once approved. tester_status is checked
          directly here (not gated behind validator_type === "tester" like
          before) -- an application stays validator_type "validator" with
          tester_status "pending_review"/"rejected" right up until an admin
          approves it (see vauth.js), so that old gate never actually
          matched those two states. */}
      {validator?.validator_type !== "tester" && (
        <div className="card" style={{ padding: 22, marginBottom: 24, maxWidth: 980 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>{t("settings.accountType", null, "Account type")}</div>
          <div style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{t("settings.type", null, "Type")}</div>
            <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
              {validator?.validator_type === "user" ? t("settings.userTester", null, "User — Consumer tester") : t("settings.validatorPro", null, "Validator — Professional")}
            </div>
          </div>

          {validator?.validator_type === "user" && (
            <div style={{ padding: "12px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{t("settings.upgradeDesc", null, "Have professional expertise? Upgrade to Validator to access app testing and digital product missions.")}</p>
              <button className="btn btn-primary" style={{ fontSize: 13, flexShrink: 0 }} onClick={goReOnboard}>{t("settings.upgradeValidator", null, "Upgrade to Validator →")}</button>
            </div>
          )}

          {validator?.validator_type === "validator" && validator?.tester_status === "pending_review" && (
            <div style={{ padding: "12px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--warning)" }}>
                <span>⏳</span> {t("settings.underReview", null, "Under review — admin will respond within 72 hours")}
              </div>
            </div>
          )}

          {validator?.validator_type === "validator" && validator?.tester_status === "rejected" && (
            <div style={{ padding: "12px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div style={{ fontSize: 13, color: "var(--danger)" }}>✗ {t("settings.applicationNotApproved", null, "Application not approved — you can update your profile and reapply")}</div>
              <button className="btn btn-primary" style={{ fontSize: 13, flexShrink: 0 }} onClick={goReOnboard}>{t("settings.reapplyTester", null, "Reapply for Verified Tester →")}</button>
            </div>
          )}

          {/* Anything other than pending/rejected -- covers a never-applied
              validator (tester_status null) and also any stale/out-of-sync
              record where tester_status is already "approved" but
              validator_type was never bumped to "tester", so the apply
              option doesn't just silently vanish for them. */}
          {validator?.validator_type === "validator" && validator?.tester_status !== "pending_review" && validator?.tester_status !== "rejected" && (
            <div style={{ padding: "12px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{t("settings.applyTesterDesc", null, "Have QA or product testing experience? Apply for verified status to access premium high-pay missions.")}</p>
              <button className="btn btn-primary" style={{ fontSize: 13, flexShrink: 0 }} onClick={goReOnboard}>{t("settings.applyTesterBtn", null, "Apply for Verified Tester →")}</button>
            </div>
          )}
        </div>
      )}

      <div className="col gap-5" style={{ maxWidth: 980 }}>
          {/* Profile Details' one giant scrolling card (every onboarding
              field, answered inline, one Save at the very bottom) replaced
              with a card per step -- read-only chips plus an Edit button
              into the real step form (VEditAccountStep.jsx), same pattern
              as the builder side's own Settings page. */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20, alignItems: "start" }}>
            <StepCard title={stepTitle("basicInfo")} stepKey="basicInfo" navigate={navigate}>
              <VChipField label={t("onboardingFields.country", null, "Country")} values={validator?.country ? [validator.country] : []} />
              <VChipField label={t("onboardingFields.stateRegion", null, "State / Region")} values={validator?.state ? [validator.state] : []} />
              <div style={{ gridColumn: "1 / -1" }}><VChipField label={t("vOnboarding.fields.languages", null, "Languages")} values={validator?.languages} /></div>
              {!isUser && <div style={{ gridColumn: "1 / -1" }}><VChipField label={t("vOnboarding.fields.shortBio", null, "Short bio")} values={validator?.bio ? [validator.bio] : []} /></div>}
            </StepCard>

            {isUser ? (
              <>
                <StepCard title={stepTitle("demographics")} stepKey="demographics" navigate={navigate}>
                  <VChipField label={t("vOnboarding.fields.ageGroup", null, "Age group")} values={validator?.ageGroup ? [validator.ageGroup] : []} />
                  <VChipField label={t("vOnboarding.fields.gender", null, "Gender")} values={validator?.gender ? [validator.gender] : []} />
                  <VChipField label={t("vOnboarding.fields.maritalStatus", null, "Marital status")} values={validator?.marital ? [validator.marital] : []} />
                  <VChipField label={t("vOnboarding.fields.kids", null, "Kids?")} values={validator?.hasKids ? [validator.hasKids] : []} />
                  <VChipField label={t("vOnboarding.fields.income", null, "Income")} values={validator?.income ? [validator.income] : []} />
                </StepCard>
                <StepCard title={stepTitle("physicalProfile")} stepKey="physicalProfile" navigate={navigate}>
                  <VChipField label={t("vOnboarding.fields.height", null, "Height")} values={validator?.height ? [validator.height] : []} />
                  <VChipField label={t("vOnboarding.fields.weight", null, "Weight")} values={validator?.weight ? [validator.weight] : []} />
                  <VChipField label={t("vOnboarding.fields.skinTone", null, "Skin tone")} values={validator?.skinTone ? [validator.skinTone] : []} />
                  <VChipField label={t("vOnboarding.fields.hairType", null, "Hair type")} values={validator?.hairType ? [validator.hairType] : []} />
                  <VChipField label={t("vOnboarding.fields.hairLength", null, "Hair length")} values={validator?.hairLength ? [validator.hairLength] : []} />
                  <VChipField label={t("vOnboarding.fields.bodyType", null, "Body type")} values={validator?.bodyType ? [validator.bodyType] : []} />
                </StepCard>
                <StepCard title={stepTitle("lifestyle")} stepKey="lifestyle" navigate={navigate}>
                  <VChipField label={t("vOnboarding.fields.occupation", null, "Occupation")} values={validator?.occupation ? [validator.occupation] : []} />
                  <VChipField label={t("vOnboarding.fields.foodPreference", null, "Food preference")} values={validator?.foodPref ? [validator.foodPref] : []} />
                  <div style={{ gridColumn: "1 / -1" }}><VChipField label={t("vOnboarding.fields.lifestyleInterests", null, "Lifestyle interests")} values={validator?.lifestyle} /></div>
                  <div style={{ gridColumn: "1 / -1" }}><VChipField label={t("vOnboarding.fields.devices", null, "Devices")} values={validator?.devices} /></div>
                  <VChipField label={t("vOnboarding.fields.timePerWeek", null, "Time per week")} values={validator?.hours ? [validator.hours] : []} />
                </StepCard>
              </>
            ) : (
              <>
                <StepCard title={stepTitle("professional")} stepKey="professional" navigate={navigate}>
                  <VChipField label={t("vOnboarding.fields.role", null, "Role")} values={validator?.occupation ? [validator.occupation] : []} />
                  <VChipField label={t("vOnboarding.fields.experience", null, "Experience")} values={validator?.experience ? [validator.experience] : []} />
                  <div style={{ gridColumn: "1 / -1" }}><VChipField label={t("vOnboarding.fields.industry", null, "Industry")} values={validator?.industry} /></div>
                  <VChipField label={t("vOnboarding.fields.company", null, "Company")} values={validator?.company ? [validator.company] : []} />
                </StepCard>
                <StepCard title={stepTitle("expertise")} stepKey="expertise" navigate={navigate}>
                  <div style={{ gridColumn: "1 / -1" }}><VChipField label={t("vOnboarding.fields.productTypesYouTest", null, "Product types you test")} values={validator?.productTypes} /></div>
                  <div style={{ gridColumn: "1 / -1" }}><VChipField label={t("vOnboarding.fields.toolsYouUse", null, "Tools you use")} values={validator?.techTools} /></div>
                </StepCard>
                <StepCard title={stepTitle("availability")} stepKey="availability" navigate={navigate}>
                  <div style={{ gridColumn: "1 / -1" }}><VChipField label={t("vOnboarding.fields.devices", null, "Devices")} values={validator?.devices} /></div>
                  <VChipField label={t("vOnboarding.fields.timePerWeek", null, "Time per week")} values={validator?.hours ? [validator.hours] : []} />
                </StepCard>
                {hasTesterFields && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <StepCard title={stepTitle("verification")} stepKey="verification" navigate={navigate}>
                      <div style={{ gridColumn: "1 / -1" }}><VChipField label={t("vOnboarding.fields.testingDomains", null, "Testing domains")} values={validator?.testingDomains} /></div>
                      <div style={{ gridColumn: "1 / -1" }}><VChipField label={t("vOnboarding.fields.certifications", null, "Certifications")} values={validator?.certifications} /></div>
                      <VChipField label={t("vOnboarding.fields.linkedinUrl", null, "LinkedIn URL")} values={validator?.linkedinUrl ? [validator.linkedinUrl] : []} />
                      <VChipField label={t("vOnboarding.fields.portfolioGithub", null, "Portfolio / GitHub")} values={validator?.portfolioUrl ? [validator.portfolioUrl] : []} />
                      <div style={{ gridColumn: "1 / -1" }}><VChipField label={t("vOnboarding.fields.describeTestingExperience", null, "Describe your testing experience")} values={validator?.testingBio ? [validator.testingBio] : []} /></div>
                    </StepCard>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Security Card */}
          {!validator?.oauthProvider && (
            <div className="card" style={{ padding: 24 }}>
              <div className="row between" style={{ alignItems: "center", marginBottom: changingPassword ? 24 : 0 }}>
                <div className="row gap-3" style={{ alignItems: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                    <Icon name="shield" size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t("settings.security", null, "Security")}</h3>
                    <p className="faint" style={{ margin: "4px 0 0", fontSize: 13 }}>{t("settings.securityDesc", null, "Change your password to keep your account secure.")}</p>
                  </div>
                </div>
                {!changingPassword && <Btn variant="ghost" onClick={() => setChangingPassword(true)}>{t("settings.changePassword", null, "Change password")}</Btn>}
              </div>

              {changingPassword && (
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
                  <div className="row gap-2">
                    <Btn variant="primary" type="submit" disabled={pwdBusy}>{pwdBusy ? t("actions.saving", null, "Saving…") : t("actions.updatePassword", null, "Update Password")}</Btn>
                    <Btn variant="quiet" type="button" onClick={cancelPasswordChange}>{t("actions.cancel", null, "Cancel")}</Btn>
                  </div>
                </form>
              )}
            </div>
          )}

      </div>

    </div>
  );
}
