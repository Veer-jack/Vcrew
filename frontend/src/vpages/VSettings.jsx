import { useState } from "react";
import { useVAuth } from "../vcontext/VAuthContext";
import { vapi } from "../vapi/client";
import { Btn, PasswordInput } from "../components/ui";
import Icon from "../components/Icon";
import { useTranslation } from "../i18n/index.jsx";
import {
  Chips, Field, optLabel, AGE_GROUPS, GENDERS, INCOME, HEIGHT, WEIGHT, SKIN_TONE, HAIR_TYPE, HAIR_LENGTH, BODY_TYPE,
  OCCUPATIONS, FOOD_PREF, LIFESTYLE, DEVICES, HOURS, ROLES, EXP, INDUSTRIES, PRODUCT_TYPES, TECH_TOOLS, TESTER_DOMAINS, CERT,
  LANGUAGES, CountryStateFields, filterGroupAdapter, resolveOnboardingOther,
} from "./VOnboarding.jsx";
import { SelectAllToggle } from "../components/OnboardingFields.jsx";
import { FilterGroup } from "../pages/CreateMissionWizard";

export default function VSettings() {
  const { t } = useTranslation();
  const { validator, refresh, setValidator } = useVAuth();
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
  const [name, setName] = useState(validator?.name || "");
  const [email, setEmail] = useState(validator?.email || "");
  const [handle, setHandle] = useState(validator?.handle || "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Everything collected during onboarding, keyed the same way the
  // onboarding draft itself uses (and PATCH /profile expects) -- the
  // camelCase fields below (ageGroup, hasKids, ...) are what publicValidator
  // actually returns, so this is the one place converting between the two.
  // A saved custom value (someone picked "Other" during onboarding) is
  // just its own typed text in the DB, not the "Other" sentinel + a
  // separate *Other field -- reconstruct that shape here once, on load,
  // the same way CountryStateFields normalizes country/state itself,
  // otherwise the saved value doesn't match any known chip/checkbox and
  // silently renders as if nothing were ever set.
  const savedOccupation = validator?.occupation || "";
  const isCustomOccupation = savedOccupation && !OCCUPATIONS.includes(savedOccupation) && !ROLES.includes(savedOccupation);
  const [pd, setPd] = useState({
    country: validator?.country || "", countryOther: "", state: validator?.state || "", stateOther: "",
    language: validator?.languages || [], languageOther: (validator?.languages || []).filter(v => !LANGUAGES.includes(v)),
    age_group: validator?.ageGroup || "", gender: validator?.gender || "", marital: validator?.marital || "",
    has_kids: validator?.hasKids || "", income: validator?.income || "", height: validator?.height || "",
    weight: validator?.weight || "", skin_tone: validator?.skinTone || "", hair_type: validator?.hairType || "",
    hair_length: validator?.hairLength || "", body_type: validator?.bodyType || "",
    occupation: isCustomOccupation ? "Other" : savedOccupation, occupationOther: isCustomOccupation ? savedOccupation : "",
    food_pref: validator?.foodPref || "", lifestyle: validator?.lifestyle || [], devices: validator?.devices || [],
    hours: validator?.hours || "", bio: validator?.bio || "", experience: validator?.experience || "",
    industry: validator?.industry || [], industryOther: (validator?.industry || []).filter(v => !INDUSTRIES.includes(v)),
    company: validator?.company || "", product_types: validator?.productTypes || [],
    tech_tools: validator?.techTools || [],
    domains: validator?.testingDomains || [], domainsOther: (validator?.testingDomains || []).filter(v => !TESTER_DOMAINS.includes(v)),
    certifications: validator?.certifications || [], certificationsOther: (validator?.certifications || []).filter(v => !CERT.includes(v)),
    linkedin_url: validator?.linkedinUrl || "", portfolio_url: validator?.portfolioUrl || "", testing_bio: validator?.testingBio || "",
  });
  const setF = (k, v) => setPd(p => ({ ...p, [k]: v }));
  const [detailsBusy, setDetailsBusy] = useState(false);
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const saveDetails = async () => {
    setDetailsBusy(true); setDetailsError(""); setDetailsSaved(false);
    try {
      // vapi.updateProfile() hits PATCH /api/v/profile (vprofile.js), a much
      // older, narrower route that only knows about name/handle/occupation/
      // industry/location/bio/specialties/address -- none of these onboarding
      // fields. /auth/profile (vauth.js) is the route the onboarding wizard
      // itself saves to and is the one that actually persists all of these.
      await vapi.patch("/auth/profile", resolveOnboardingOther(pd, t));
      await refresh();
      setDetailsSaved(true);
      setTimeout(() => setDetailsSaved(false), 3000);
    } catch (err) {
      setDetailsError(err.message || t("settings.saveFailed", null, "Couldn't save changes"));
    } finally {
      setDetailsBusy(false);
    }
  };

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

  const save = async () => {
    setBusy(true); setError(""); setSaved(false);
    try {
      // Same fix as saveDetails below -- vapi.updateProfile() (PATCH
      // /api/v/profile) doesn't handle email at all, so it was silently
      // dropped on every save before this. /auth/profile does.
      await vapi.patch("/auth/profile", { name, email, handle });
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

      {/* Account type/status chips -- top of the page, plain row (no card),
          so the upgrade/apply action reads like a banner instead of being
          buried at the bottom of the page. */}
      <div className="row gap-2 wrap" style={{ marginBottom: 24, maxWidth: 980 }}>
        <span className="pill">
          {validator?.validator_type === "user" ? t("settings.userTester", null, "User — Consumer tester") : validator?.validator_type === "tester" ? t("settings.verifiedTester", null, "Verified Tester") : t("settings.validatorPro", null, "Validator — Professional")}
        </span>

        {validator?.validator_type === "tester" && validator?.tester_status === "pending_review" && (
          <span className="pill" style={{ color: "var(--warning)" }}>⏳ {t("settings.underReview", null, "Under review")}</span>
        )}
        {validator?.validator_type === "tester" && validator?.tester_status === "approved" && (
          <span className="pill" style={{ color: "var(--success)" }}>✓ {validator?.tester_tier === "senior" ? t("settings.senior", null, "Senior") : t("settings.junior", null, "Junior")} {t("settings.verifiedTag", null, "Verified")}</span>
        )}
        {validator?.validator_type === "tester" && validator?.tester_status === "rejected" && (
          <>
            <span className="pill" style={{ color: "var(--danger)" }}>✗ {t("settings.notApproved", null, "Not approved")}</span>
            <button className="pill" style={{ cursor: "pointer" }} onClick={() => window.location.href = "/validator/onboarding"}>{t("settings.reapplyTester", null, "Reapply for Verified Tester →")}</button>
          </>
        )}
        {validator?.validator_type === "user" && (
          <button className="pill" style={{ cursor: "pointer" }} onClick={() => window.location.href = "/validator/onboarding"}>{t("settings.upgradeValidator", null, "Upgrade to Validator →")}</button>
        )}
        {validator?.validator_type === "validator" && validator?.tester_status !== "pending_review" && (
          <button className="pill" style={{ cursor: "pointer" }} onClick={() => window.location.href = "/validator/onboarding"}>{t("settings.applyTesterBtn", null, "Apply for Verified Tester →")}</button>
        )}
      </div>

      {/* Single vertical stack (was a 2-column grid) -- matches the builder
          side's own Settings layout, one full-width card at a time. */}
      <div className="col gap-5" style={{ maxWidth: 980 }}>
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
                <div className="inw has-pre"><span className="pre">@</span><input className="fin" value={handle} onChange={e => setHandle(e.target.value.toLowerCase().replace(/\s/g, ""))} /></div>
              </div>
              <div>
                <Btn variant="primary" onClick={save} disabled={busy}>
                  {busy ? t("actions.saving", null, "Saving…") : t("actions.saveChanges", null, "Save Changes")}
                </Btn>
              </div>
            </div>
          </div>

          {/* Profile Details -- everything collected during onboarding
              (age/gender/income/height/weight/... for a User, bio/role/
              experience/industry/... for a Validator, plus tester-only
              fields once tester_status is set) -- was collected but never
              shown or editable anywhere in Settings. */}
          <div className="card" style={{ padding: 24 }}>
            <div className="row gap-3" style={{ alignItems: "center", marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                <Icon name="clipboard" size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t("settings.profileDetails", null, "Profile Details")}</h3>
                <p className="faint" style={{ margin: "4px 0 0", fontSize: 13 }}>{t("settings.profileDetailsDesc", null, "Everything you shared while setting up your account.")}</p>
              </div>
            </div>

            <CountryStateFields d={pd} set={setF} />
            <FilterGroup title={t("vOnboarding.fields.languages", null, "Languages")} options={LANGUAGES.filter(o => o !== "Other")} {...filterGroupAdapter(pd.language, "language", setF)} otherEntries={pd.languageOther} trFilterLabel={(_, v) => optLabel(t, "languages")(v, LANGUAGES.indexOf(v))} initialExpanded />
            <FilterGroup title={t("onboardingFields.other", null, "Other")} options={["Other"]} {...filterGroupAdapter(pd.language, "language", setF)} otherEntries={pd.languageOther} onOtherEntriesChange={v => setF("languageOther", v)} otherValue="Other" otherPlaceholder={t("createMission.otherGenericPlaceholder", { section: "language" }, "Add your own language value")} trFilterLabel={(_, v) => v} initialExpanded />

            {validator?.validator_type === "user" ? (
              <>
                <Field label={t("vOnboarding.fields.ageGroup", null, "Age group")}><Chips options={AGE_GROUPS} value={pd.age_group} onChange={v => setF("age_group", v)} multi={false} getLabel={optLabel(t, "ageGroups")} /></Field>
                <Field label={t("vOnboarding.fields.gender", null, "Gender")}><Chips options={GENDERS} value={pd.gender} onChange={v => setF("gender", v)} multi={false} getLabel={optLabel(t, "genders")} /></Field>
                <Field label={t("vOnboarding.fields.maritalStatus", null, "Marital status")}><Chips options={["Single", "Married", "Divorced", "Widowed", "In a relationship"]} value={pd.marital} onChange={v => setF("marital", v)} multi={false} getLabel={optLabel(t, "marital")} /></Field>
                <Field label={t("vOnboarding.fields.kids", null, "Kids?")}><Chips options={["Yes", "No", "Prefer not to say"]} value={pd.has_kids} onChange={v => setF("has_kids", v)} multi={false} getLabel={optLabel(t, "kids")} /></Field>
                <Field label={t("vOnboarding.fields.income", null, "Income")}><Chips options={INCOME} value={pd.income} onChange={v => setF("income", v)} multi={false} getLabel={optLabel(t, "income")} /></Field>
                <Field label={t("vOnboarding.fields.height", null, "Height")}><Chips options={HEIGHT} value={pd.height} onChange={v => setF("height", v)} multi={false} getLabel={optLabel(t, "height")} /></Field>
                <Field label={t("vOnboarding.fields.weight", null, "Weight")}><Chips options={WEIGHT} value={pd.weight} onChange={v => setF("weight", v)} multi={false} getLabel={optLabel(t, "weight")} /></Field>
                <Field label={t("vOnboarding.fields.skinTone", null, "Skin tone")}><Chips options={SKIN_TONE} value={pd.skin_tone} onChange={v => setF("skin_tone", v)} multi={false} getLabel={optLabel(t, "skinTone")} /></Field>
                <Field label={t("vOnboarding.fields.hairType", null, "Hair type")}><Chips options={HAIR_TYPE} value={pd.hair_type} onChange={v => setF("hair_type", v)} multi={false} getLabel={optLabel(t, "hairType")} /></Field>
                <Field label={t("vOnboarding.fields.hairLength", null, "Hair length")}><Chips options={HAIR_LENGTH} value={pd.hair_length} onChange={v => setF("hair_length", v)} multi={false} getLabel={optLabel(t, "hairLength")} /></Field>
                <Field label={t("vOnboarding.fields.bodyType", null, "Body type")}><Chips options={BODY_TYPE} value={pd.body_type} onChange={v => setF("body_type", v)} multi={false} getLabel={optLabel(t, "bodyType")} /></Field>
                <Field label={t("vOnboarding.fields.occupation", null, "Occupation")}><Chips options={OCCUPATIONS} value={pd.occupation} onChange={v => setF("occupation", v)} multi={false} getLabel={optLabel(t, "occupations")} /></Field>
                {pd.occupation === "Other" && <Field label={t("onboardingFields.occupationOtherLabel", null, "Please specify occupation")}><input className="fin" value={pd.occupationOther || ""} onChange={e => setF("occupationOther", e.target.value)} placeholder={t("onboardingFields.occupationOtherPlaceholder", null, "e.g. Product Designer")} /></Field>}
                <Field label={t("vOnboarding.fields.foodPreference", null, "Food preference")}><Chips options={FOOD_PREF} value={pd.food_pref} onChange={v => setF("food_pref", v)} multi={false} getLabel={optLabel(t, "foodPref")} /></Field>
                <Field label={t("vOnboarding.fields.lifestyleInterests", null, "Lifestyle interests")} action={<SelectAllToggle options={LIFESTYLE} value={pd.lifestyle} onChange={v => setF("lifestyle", v)} />}><Chips options={LIFESTYLE} value={pd.lifestyle} onChange={v => setF("lifestyle", v)} getLabel={optLabel(t, "lifestyle")} /></Field>
                <Field label={t("vOnboarding.fields.devices", null, "Devices")} action={<SelectAllToggle options={DEVICES} value={pd.devices} onChange={v => setF("devices", v)} />}><Chips options={DEVICES} value={pd.devices} onChange={v => setF("devices", v)} getLabel={optLabel(t, "devices")} /></Field>
                <Field label={t("vOnboarding.fields.timePerWeek", null, "Time per week")}><Chips options={HOURS} value={pd.hours} onChange={v => setF("hours", v)} multi={false} getLabel={optLabel(t, "hours")} /></Field>
              </>
            ) : (
              <>
                <Field label={t("vOnboarding.fields.shortBio", null, "Short bio")}><textarea className="fin" rows={3} value={pd.bio} onChange={e => setF("bio", e.target.value)} /></Field>
                <Field label={t("vOnboarding.fields.role", null, "Role")}><Chips options={ROLES} value={pd.occupation} onChange={v => setF("occupation", v)} multi={false} getLabel={optLabel(t, "roles")} /></Field>
                {pd.occupation === "Other" && <Field label={t("onboardingFields.customRole", null, "Your role")}><input className="fin" value={pd.occupationOther || ""} onChange={e => setF("occupationOther", e.target.value)} placeholder={t("onboardingFields.customRolePlaceholder", null, "Type your role")} /></Field>}
                <Field label={t("vOnboarding.fields.experience", null, "Experience")}><Chips options={EXP} value={pd.experience} onChange={v => setF("experience", v)} multi={false} getLabel={optLabel(t, "experience")} /></Field>
                <FilterGroup title={t("vOnboarding.fields.industry", null, "Industry")} options={INDUSTRIES.filter(o => o !== "Other")} {...filterGroupAdapter(pd.industry, "industry", setF)} otherEntries={pd.industryOther} trFilterLabel={(_, v) => optLabel(t, "industries")(v, INDUSTRIES.indexOf(v))} initialExpanded />
                <FilterGroup title={t("onboardingFields.other", null, "Other")} options={["Other"]} {...filterGroupAdapter(pd.industry, "industry", setF)} otherEntries={pd.industryOther} onOtherEntriesChange={v => setF("industryOther", v)} otherValue="Other" otherPlaceholder={t("createMission.otherGenericPlaceholder", { section: "industry" }, "Add your own industry value")} trFilterLabel={(_, v) => v} initialExpanded />
                <Field label={t("vOnboarding.fields.company", null, "Company")}><input className="fin" value={pd.company} onChange={e => setF("company", e.target.value)} /></Field>
                <Field label={t("vOnboarding.fields.productTypesYouTest", null, "Product types you test")} action={<SelectAllToggle options={PRODUCT_TYPES} value={pd.product_types} onChange={v => setF("product_types", v)} />}><Chips options={PRODUCT_TYPES} value={pd.product_types} onChange={v => setF("product_types", v)} getLabel={optLabel(t, "productTypes")} /></Field>
                <Field label={t("vOnboarding.fields.toolsYouUse", null, "Tools you use")} action={<SelectAllToggle options={TECH_TOOLS} value={pd.tech_tools} onChange={v => setF("tech_tools", v)} />}><Chips options={TECH_TOOLS} value={pd.tech_tools} onChange={v => setF("tech_tools", v)} getLabel={optLabel(t, "techTools")} /></Field>
                <Field label={t("vOnboarding.fields.devices", null, "Devices")} action={<SelectAllToggle options={DEVICES} value={pd.devices} onChange={v => setF("devices", v)} />}><Chips options={DEVICES} value={pd.devices} onChange={v => setF("devices", v)} getLabel={optLabel(t, "devices")} /></Field>
                <Field label={t("vOnboarding.fields.timePerWeek", null, "Time per week")}><Chips options={HOURS} value={pd.hours} onChange={v => setF("hours", v)} multi={false} getLabel={optLabel(t, "hours")} /></Field>
                {validator?.tester_status && (
                  <>
                    <FilterGroup title={t("vOnboarding.fields.testingDomains", null, "Testing domains")} options={TESTER_DOMAINS.filter(o => o !== "Other")} {...filterGroupAdapter(pd.domains, "domains", setF)} otherEntries={pd.domainsOther} trFilterLabel={(_, v) => optLabel(t, "testerDomains")(v, TESTER_DOMAINS.indexOf(v))} initialExpanded />
                    <FilterGroup title={t("onboardingFields.other", null, "Other")} options={["Other"]} {...filterGroupAdapter(pd.domains, "domains", setF)} otherEntries={pd.domainsOther} onOtherEntriesChange={v => setF("domainsOther", v)} otherValue="Other" otherPlaceholder={t("createMission.otherGenericPlaceholder", { section: "testing domain" }, "Add your own testing domain value")} trFilterLabel={(_, v) => v} initialExpanded />
                    <FilterGroup title={t("vOnboarding.fields.certifications", null, "Certifications")} options={CERT.filter(o => o !== "Other")} {...filterGroupAdapter(pd.certifications, "certifications", setF)} otherEntries={pd.certificationsOther} trFilterLabel={(_, v) => optLabel(t, "certifications")(v, CERT.indexOf(v))} initialExpanded />
                    <FilterGroup title={t("onboardingFields.other", null, "Other")} options={["Other"]} {...filterGroupAdapter(pd.certifications, "certifications", setF)} otherEntries={pd.certificationsOther} onOtherEntriesChange={v => setF("certificationsOther", v)} otherValue="Other" otherPlaceholder={t("createMission.otherGenericPlaceholder", { section: "certification" }, "Add your own certification value")} trFilterLabel={(_, v) => v} initialExpanded />
                    <Field label={t("vOnboarding.fields.linkedinUrl", null, "LinkedIn URL")}><input className="fin" value={pd.linkedin_url} onChange={e => setF("linkedin_url", e.target.value)} /></Field>
                    <Field label={t("vOnboarding.fields.portfolioGithub", null, "Portfolio / GitHub")}><input className="fin" value={pd.portfolio_url} onChange={e => setF("portfolio_url", e.target.value)} /></Field>
                    <Field label={t("vOnboarding.fields.describeTestingExperience", null, "Describe your testing experience")}><textarea className="fin" rows={4} value={pd.testing_bio} onChange={e => setF("testing_bio", e.target.value)} /></Field>
                  </>
                )}
              </>
            )}

            {detailsError && <p style={{ color: "var(--danger)", fontSize: 13, margin: "4px 0 8px" }}>{detailsError}</p>}
            {detailsSaved && <p style={{ color: "var(--success)", fontSize: 13, margin: "4px 0 8px" }}>✓ {t("settings.changesSaved", null, "Changes saved")}</p>}
            <Btn variant="primary" onClick={saveDetails} disabled={detailsBusy}>
              {detailsBusy ? t("actions.saving", null, "Saving…") : t("actions.saveChanges", null, "Save Changes")}
            </Btn>
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
