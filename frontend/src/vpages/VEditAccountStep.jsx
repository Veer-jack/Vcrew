import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useVAuth } from "../vcontext/VAuthContext";
import { vapi } from "../vapi/client";
import { Btn } from "../components/ui";
import Icon from "../components/Icon";
import { useTranslation } from "../i18n/index.jsx";
import useUnsavedChangesWarning from "../hooks/useUnsavedChangesWarning";
import {
  Chips, Field, optLabel, AGE_GROUPS, GENDERS, INCOME, HEIGHT, WEIGHT, SKIN_TONE, HAIR_TYPE, HAIR_LENGTH, BODY_TYPE,
  OCCUPATIONS, FOOD_PREF, LIFESTYLE, DEVICES, HOURS, ROLES, EXP, INDUSTRIES, PRODUCT_TYPES, TECH_TOOLS, TESTER_DOMAINS, CERT,
  LANGUAGES, CountryStateFields, filterGroupAdapter, resolveOnboardingOther, validatorToDraft, settingsStepsFor,
} from "./VOnboarding.jsx";
import { SelectAllToggle } from "../components/OnboardingFields.jsx";
import { FilterGroup } from "../pages/CreateMissionWizard";

// Same numbered-circle rail look as the onboarding wizard's own StepRail
// (VOnboarding.jsx) -- this is a separate, editing-only rail (every step is
// always reachable, no maxReached gating, and it carries a Cancel/Back
// footer instead of Start over/Skip/Save) so it isn't just reusing that
// component outright.
function StepRail({ steps, currentKey, dirty, onNavigate, onCancel }) {
  const { t } = useTranslation();
  const currentIndex = steps.findIndex(([k]) => k === currentKey);
  const prevStep = currentIndex > 0 ? steps[currentIndex - 1] : null;
  return (
    <aside style={{ background: "var(--panel)", borderRight: "1px solid var(--border)", padding: "28px 20px", display: "flex", flexDirection: "column", width: 260, flexShrink: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 14 }}>{t("onboarding.yourSetup", null, "Your setup")}</div>
      <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
        {steps.map(([key, fallback], i) => {
          const isCurrent = key === currentKey;
          const label = t(`vOnboarding.steps.${key}`, null, fallback);
          return (
            <button key={key} type="button" onClick={() => onNavigate(`/validator/settings/edit-step/${key}`)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: "var(--radius-sm)", background: isCurrent ? "var(--accent-weak)" : "transparent", border: "none", width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
              <span style={{ width: 24, height: 24, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, background: isCurrent ? "var(--accent)" : "var(--panel-inset)", color: isCurrent ? "#fff" : "var(--text-faint)" }}>{i + 1}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
            </button>
          );
        })}
      </div>
      {dirty && <p className="faint" style={{ fontSize: 11.5, padding: "0 10px" }}>{t("settings.unsavedHint", null, "You have unsaved changes.")}</p>}
      <div style={{ marginTop: "auto", paddingTop: 16 }}>
        {!prevStep ? (
          <button className="btn" onClick={onCancel} style={{ border: "1.5px solid var(--accent)", color: "var(--accent)", background: "transparent", minWidth: 100 }}>{t("actions.cancel", null, "Cancel")}</button>
        ) : (
          <div className="row gap-2" style={{ alignItems: "center" }}>
            <button className="btn" onClick={onCancel} style={{ border: "1.5px solid var(--accent)", color: "var(--accent)", background: "transparent", minWidth: 100 }}>{t("actions.cancel", null, "Cancel")}</button>
            <button className="btn btn-ghost" onClick={() => onNavigate(`/validator/settings/edit-step/${prevStep[0]}`)}>{t("actions.back", null, "Back")}</button>
          </div>
        )}
      </div>
    </aside>
  );
}

// Editing an already-saved profile here saves via the same PATCH
// /auth/profile route Settings' old inline form used -- every field this
// page can touch is one resolveOnboardingOther(d, t) + vapi.patch call away
// from persisted, same as before, just spread across steps now instead of
// one long scrolling card.
export default function VEditAccountStep() {
  const { t } = useTranslation();
  const { step: stepKey } = useParams();
  const navigate = useNavigate();
  const { validator, refresh } = useVAuth();
  const type = validator?.validator_type;
  // tester_status defaults to the literal string "none" (see schema.sql),
  // not null/empty -- see the same fix in VSettings.jsx.
  const hasTesterFields = !!validator?.tester_status && validator.tester_status !== "none";
  const steps = useMemo(() => settingsStepsFor(type, hasTesterFields), [type, hasTesterFields]);
  const isUser = type === "user";

  // Captured once per mount (see App.jsx's key={validator?.id} on this
  // route) as the "unchanged" baseline -- d then persists across every step
  // navigated to within this same edit session, so jumping between steps
  // never loses an edit the way the old builder Settings bug did (see
  // App.jsx's route-key fix). Only Cancel actually discards it.
  const initial = useMemo(() => validatorToDraft(validator), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [d, setD] = useState(initial);
  const set = (k, v) => setD(s => ({ ...s, [k]: v }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const dirty = useMemo(() => JSON.stringify(d) !== JSON.stringify(initial), [d, initial]);
  useUnsavedChangesWarning(dirty, t("settings.unsavedChangesWarning", null, "You have unsaved changes. Are you sure you want to leave?"));

  const cancelToSettings = () => {
    if (dirty && !window.confirm(t("settings.unsavedChangesWarning", null, "You have unsaved changes. Are you sure you want to leave?"))) return;
    window.__bypassUnload = true;
    navigate("/validator/settings");
  };

  const handleSave = async () => {
    setError(""); setBusy(true);
    try {
      await vapi.patch("/auth/profile", resolveOnboardingOther(d, t));
      await refresh();
      window.__bypassUnload = true;
      navigate("/validator/settings");
    } catch (err) {
      setError(err.message || t("settings.saveFailed", null, "Couldn't save changes"));
    } finally {
      setBusy(false);
    }
  };

  const stepValid = steps.some(([k]) => k === stepKey);
  if (!stepValid) {
    return (
      <div className="auth-shell">
        <div className="card auth-card rise">
          <h1>{t("settings.editStepUnavailable", null, "Nothing to edit here")}</h1>
          <p className="muted">{t("settings.editStepUnavailableDesc", null, "This section isn't part of your account setup.")} <a href="/validator/settings">{t("actions.goBack", null, "Go back")}</a></p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex" }}>
      <StepRail steps={steps} currentKey={stepKey} dirty={dirty} onNavigate={navigate} onCancel={cancelToSettings} />
      <div style={{ flex: 1, padding: "40px 32px", overflowY: "auto" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>{t("actions.editProfile", null, "Edit profile")}</h1>
          {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}

          {stepKey === "basicInfo" && (
            <>
              <CountryStateFields d={d} set={set} />
              <FilterGroup title={t("vOnboarding.fields.languages", null, "Languages")} options={LANGUAGES.filter(o => o !== "Other")} {...filterGroupAdapter(d.language, "language", set)} otherEntries={d.languageOther} trFilterLabel={(_, v) => optLabel(t, "languages")(v, LANGUAGES.indexOf(v))} initialExpanded />
              <FilterGroup title={t("onboardingFields.other", null, "Other")} options={["Other"]} {...filterGroupAdapter(d.language, "language", set)} otherEntries={d.languageOther} onOtherEntriesChange={v => set("languageOther", v)} otherValue="Other" otherPlaceholder={t("createMission.otherGenericPlaceholder", { section: "language" }, "Add your own language value")} trFilterLabel={(_, v) => v} initialExpanded />
              {!isUser && (
                <Field label={t("vOnboarding.fields.shortBio", null, "Short bio")}><textarea className="fin" rows={3} value={d.bio} onChange={e => set("bio", e.target.value)} /></Field>
              )}
            </>
          )}

          {stepKey === "demographics" && (
            <>
              <Field label={t("vOnboarding.fields.ageGroup", null, "Age group")}><Chips options={AGE_GROUPS} value={d.age_group} onChange={v => set("age_group", v)} multi={false} getLabel={optLabel(t, "ageGroups")} /></Field>
              <Field label={t("vOnboarding.fields.gender", null, "Gender")}><Chips options={GENDERS} value={d.gender} onChange={v => set("gender", v)} multi={false} getLabel={optLabel(t, "genders")} /></Field>
              <Field label={t("vOnboarding.fields.maritalStatus", null, "Marital status")}><Chips options={["Single", "Married", "Divorced", "Widowed", "In a relationship"]} value={d.marital} onChange={v => set("marital", v)} multi={false} getLabel={optLabel(t, "marital")} /></Field>
              <Field label={t("vOnboarding.fields.kids", null, "Kids?")}><Chips options={["Yes", "No", "Prefer not to say"]} value={d.has_kids} onChange={v => set("has_kids", v)} multi={false} getLabel={optLabel(t, "kids")} /></Field>
              <Field label={t("vOnboarding.fields.income", null, "Income")}><Chips options={INCOME} value={d.income} onChange={v => set("income", v)} multi={false} getLabel={optLabel(t, "income")} /></Field>
            </>
          )}

          {stepKey === "physicalProfile" && (
            <>
              <Field label={t("vOnboarding.fields.height", null, "Height")}><Chips options={HEIGHT} value={d.height} onChange={v => set("height", v)} multi={false} getLabel={optLabel(t, "height")} /></Field>
              <Field label={t("vOnboarding.fields.weight", null, "Weight")}><Chips options={WEIGHT} value={d.weight} onChange={v => set("weight", v)} multi={false} getLabel={optLabel(t, "weight")} /></Field>
              <Field label={t("vOnboarding.fields.skinTone", null, "Skin tone")}><Chips options={SKIN_TONE} value={d.skin_tone} onChange={v => set("skin_tone", v)} multi={false} getLabel={optLabel(t, "skinTone")} /></Field>
              <Field label={t("vOnboarding.fields.hairType", null, "Hair type")}><Chips options={HAIR_TYPE} value={d.hair_type} onChange={v => set("hair_type", v)} multi={false} getLabel={optLabel(t, "hairType")} /></Field>
              <Field label={t("vOnboarding.fields.hairLength", null, "Hair length")}><Chips options={HAIR_LENGTH} value={d.hair_length} onChange={v => set("hair_length", v)} multi={false} getLabel={optLabel(t, "hairLength")} /></Field>
              <Field label={t("vOnboarding.fields.bodyType", null, "Body type")}><Chips options={BODY_TYPE} value={d.body_type} onChange={v => set("body_type", v)} multi={false} getLabel={optLabel(t, "bodyType")} /></Field>
            </>
          )}

          {stepKey === "lifestyle" && (
            <>
              <Field label={t("vOnboarding.fields.occupation", null, "Occupation")}><Chips options={OCCUPATIONS} value={d.occupation} onChange={v => set("occupation", v)} multi={false} getLabel={optLabel(t, "occupations")} /></Field>
              {d.occupation === "Other" && <Field label={t("onboardingFields.occupationOtherLabel", null, "Please specify occupation")}><input className="fin" value={d.occupationOther || ""} onChange={e => set("occupationOther", e.target.value)} placeholder={t("onboardingFields.occupationOtherPlaceholder", null, "e.g. Product Designer")} /></Field>}
              <Field label={t("vOnboarding.fields.foodPreference", null, "Food preference")}><Chips options={FOOD_PREF} value={d.food_pref} onChange={v => set("food_pref", v)} multi={false} getLabel={optLabel(t, "foodPref")} /></Field>
              <Field label={t("vOnboarding.fields.lifestyleInterests", null, "Lifestyle interests")} action={<SelectAllToggle options={LIFESTYLE} value={d.lifestyle} onChange={v => set("lifestyle", v)} />}><Chips options={LIFESTYLE} value={d.lifestyle} onChange={v => set("lifestyle", v)} getLabel={optLabel(t, "lifestyle")} /></Field>
              <Field label={t("vOnboarding.fields.devices", null, "Devices")} action={<SelectAllToggle options={DEVICES} value={d.devices} onChange={v => set("devices", v)} />}><Chips options={DEVICES} value={d.devices} onChange={v => set("devices", v)} getLabel={optLabel(t, "devices")} /></Field>
              <Field label={t("vOnboarding.fields.timePerWeek", null, "Time per week")}><Chips options={HOURS} value={d.hours} onChange={v => set("hours", v)} multi={false} getLabel={optLabel(t, "hours")} /></Field>
            </>
          )}

          {stepKey === "professional" && (
            <>
              <Field label={t("vOnboarding.fields.role", null, "Role")}><Chips options={ROLES} value={d.occupation} onChange={v => set("occupation", v)} multi={false} getLabel={optLabel(t, "roles")} /></Field>
              {d.occupation === "Other" && <Field label={t("onboardingFields.customRole", null, "Your role")}><input className="fin" value={d.occupationOther || ""} onChange={e => set("occupationOther", e.target.value)} placeholder={t("onboardingFields.customRolePlaceholder", null, "Type your role")} /></Field>}
              <Field label={t("vOnboarding.fields.experience", null, "Experience")}><Chips options={EXP} value={d.experience} onChange={v => set("experience", v)} multi={false} getLabel={optLabel(t, "experience")} /></Field>
              <FilterGroup title={t("vOnboarding.fields.industry", null, "Industry")} options={INDUSTRIES.filter(o => o !== "Other")} {...filterGroupAdapter(d.industry, "industry", set)} otherEntries={d.industryOther} trFilterLabel={(_, v) => optLabel(t, "industries")(v, INDUSTRIES.indexOf(v))} initialExpanded />
              <FilterGroup title={t("onboardingFields.other", null, "Other")} options={["Other"]} {...filterGroupAdapter(d.industry, "industry", set)} otherEntries={d.industryOther} onOtherEntriesChange={v => set("industryOther", v)} otherValue="Other" otherPlaceholder={t("createMission.otherGenericPlaceholder", { section: "industry" }, "Add your own industry value")} trFilterLabel={(_, v) => v} initialExpanded />
              <Field label={t("vOnboarding.fields.company", null, "Company")}><input className="fin" value={d.company} onChange={e => set("company", e.target.value)} /></Field>
            </>
          )}

          {stepKey === "expertise" && (
            <>
              <Field label={t("vOnboarding.fields.productTypesYouTest", null, "Product types you test")} action={<SelectAllToggle options={PRODUCT_TYPES} value={d.product_types} onChange={v => set("product_types", v)} />}><Chips options={PRODUCT_TYPES} value={d.product_types} onChange={v => set("product_types", v)} getLabel={optLabel(t, "productTypes")} /></Field>
              <Field label={t("vOnboarding.fields.toolsYouUse", null, "Tools you use")} action={<SelectAllToggle options={TECH_TOOLS} value={d.tech_tools} onChange={v => set("tech_tools", v)} />}><Chips options={TECH_TOOLS} value={d.tech_tools} onChange={v => set("tech_tools", v)} getLabel={optLabel(t, "techTools")} /></Field>
            </>
          )}

          {stepKey === "availability" && (
            <>
              <Field label={t("vOnboarding.fields.devices", null, "Devices")} action={<SelectAllToggle options={DEVICES} value={d.devices} onChange={v => set("devices", v)} />}><Chips options={DEVICES} value={d.devices} onChange={v => set("devices", v)} getLabel={optLabel(t, "devices")} /></Field>
              <Field label={t("vOnboarding.fields.timePerWeek", null, "Time per week")}><Chips options={HOURS} value={d.hours} onChange={v => set("hours", v)} multi={false} getLabel={optLabel(t, "hours")} /></Field>
            </>
          )}

          {stepKey === "verification" && (
            <>
              <FilterGroup title={t("vOnboarding.fields.testingDomains", null, "Testing domains")} options={TESTER_DOMAINS.filter(o => o !== "Other")} {...filterGroupAdapter(d.domains, "domains", set)} otherEntries={d.domainsOther} trFilterLabel={(_, v) => optLabel(t, "testerDomains")(v, TESTER_DOMAINS.indexOf(v))} initialExpanded />
              <FilterGroup title={t("onboardingFields.other", null, "Other")} options={["Other"]} {...filterGroupAdapter(d.domains, "domains", set)} otherEntries={d.domainsOther} onOtherEntriesChange={v => set("domainsOther", v)} otherValue="Other" otherPlaceholder={t("createMission.otherGenericPlaceholder", { section: "testing domain" }, "Add your own testing domain value")} trFilterLabel={(_, v) => v} initialExpanded />
              <FilterGroup title={t("vOnboarding.fields.certifications", null, "Certifications")} options={CERT.filter(o => o !== "Other")} {...filterGroupAdapter(d.certifications, "certifications", set)} otherEntries={d.certificationsOther} trFilterLabel={(_, v) => optLabel(t, "certifications")(v, CERT.indexOf(v))} initialExpanded />
              <FilterGroup title={t("onboardingFields.other", null, "Other")} options={["Other"]} {...filterGroupAdapter(d.certifications, "certifications", set)} otherEntries={d.certificationsOther} onOtherEntriesChange={v => set("certificationsOther", v)} otherValue="Other" otherPlaceholder={t("createMission.otherGenericPlaceholder", { section: "certification" }, "Add your own certification value")} trFilterLabel={(_, v) => v} initialExpanded />
              <Field label={t("vOnboarding.fields.linkedinUrl", null, "LinkedIn URL")}><input className="fin" value={d.linkedin_url} onChange={e => set("linkedin_url", e.target.value)} /></Field>
              <Field label={t("vOnboarding.fields.portfolioGithub", null, "Portfolio / GitHub")}><input className="fin" value={d.portfolio_url} onChange={e => set("portfolio_url", e.target.value)} /></Field>
              <Field label={t("vOnboarding.fields.describeTestingExperience", null, "Describe your testing experience")}><textarea className="fin" rows={4} value={d.testing_bio} onChange={e => set("testing_bio", e.target.value)} /></Field>
            </>
          )}
        </div>
      </div>

      {/* Fixed corner-anchored Save, same spot the builder's own
          EditAccountStep and the onboarding wizard's Continue button use. */}
      {dirty && (
        <div style={{ position: "fixed", bottom: 28, right: 110, zIndex: 40 }}>
          <Btn variant="primary" onClick={handleSave} disabled={busy} style={{ boxShadow: "var(--shadow-lg)" }}>
            {busy ? t("actions.saving", null, "Saving…") : t("actions.saveChanges", null, "Save changes")}
          </Btn>
        </div>
      )}
    </div>
  );
}
