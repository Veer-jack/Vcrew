import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Btn } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { PERSONA_CONFIG, resolveActivePersonaKey, onboardingDraftKey, stepLabel, stepEditability, PERSONA_NAME_FIELD } from "../data/personaConfig";
import { PersonalFields } from "../components/OnboardingFields";
import { isValidMobile } from "../data/onboarding";
import { api } from "../api/client";
import useUnsavedChangesWarning from "../hooks/useUnsavedChangesWarning";
import { useTranslation } from "../i18n/index.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher";

const REGION = "india"; // same fixed value the onboarding wizard itself uses
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A builder who hasn't picked a role/persona yet still has a name/designation
// worth fixing a typo in -- this is the same "Your details" field set every
// persona's own personal-step component wraps, used directly (no persona
// context needed) so editing identity here never depends on onboarding
// having started.
function GenericPersonalStep({ d, set, showErrors }) {
  return <PersonalFields d={d} set={set} roleField={null} showErrors={showErrors} emailLocked />;
}
function genericPersonalValid(d) {
  return !!(d.fullName && d.fullName.trim().length > 1) && EMAIL_RE.test(d.email || "") && isValidMobile(d.mobile) && !!d.designation;
}

// The full step list for context ("show every step") -- d (the draft) now
// lives for the whole edit session, not reset per step (see the `initial`
// useMemo below), so jumping between steps here carries edits along instead
// of discarding them; Cancel is the only action that actually drops
// anything. Locked steps render but aren't links into this page. Cancel
// lives in this rail's own footer (wz-rail-foot), not the top header --
// same spot the real onboarding wizard's own Start over/Skip/Back live in.
function StepRail({ persona, currentKey, dirty, onNavigate, onCancel }) {
  const { t } = useTranslation();
  // Same Cancel/Back pair, same spot and styling, as the mission wizard's
  // own rail footer -- jumping between steps via the list above already
  // works, but a tester expected the same explicit Back affordance here.
  const currentIndex = persona ? persona.steps.findIndex(s => s.key === currentKey) : -1;
  const prevStep = currentIndex > 0 ? persona.steps[currentIndex - 1] : null;
  // No persona yet (role never picked) -- there's nothing to rail-navigate
  // between, just the one identity step this page is already showing.
  if (!persona) {
    return (
      <aside className="wiz-rail scroll-hover">
        <div className="eyebrow" style={{ marginBottom: 14 }}>{t("onboarding.yourSetup", null, "Your setup")}</div>
        <div className="col gap-1">
          <div className="wiz-step wiz-step-current">
            <span className="wiz-step-dot">1</span>
            <span>{stepLabel(t, "personal", "Your details")}</span>
          </div>
        </div>
        <div className="wz-rail-foot">
          <button className="backlink" onClick={onCancel} style={{ marginLeft: 8 }}>{t("actions.cancel", null, "Cancel")}</button>
        </div>
      </aside>
    );
  }
  return (
    <aside className="wiz-rail scroll-hover">
      <div className="eyebrow" style={{ marginBottom: 14 }}>{t("onboarding.yourSetup", null, "Your setup")}</div>
      <div className="col gap-1">
        {persona.steps.map((s, i) => {
          const isCurrent = s.key === currentKey;
          const label = stepLabel(t, s.key, s.label);
          return (
            <button
              key={s.key} type="button"
              onClick={() => onNavigate(`/settings/edit-step/${s.key}`)}
              className={`wiz-step ${isCurrent ? "wiz-step-current" : ""}`}
            >
              <span className="wiz-step-dot">{i + 1}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      {dirty && <p className="faint" style={{ fontSize: 11.5, marginTop: 12, padding: "0 10px" }}>{t("settings.unsavedHint", null, "You have unsaved changes.")}</p>}
      <div className="wz-rail-foot">
        {!prevStep ? (
          <button className="btn" onClick={onCancel} style={{ alignSelf: "flex-start", marginLeft: 10, border: "1.5px solid var(--accent)", color: "var(--accent)", background: "transparent", minWidth: 100 }}>{t("actions.cancel", null, "Cancel")}</button>
        ) : (
          <div className="row gap-2" style={{ alignItems: "center", marginLeft: 10 }}>
            <button className="btn" onClick={onCancel} style={{ border: "1.5px solid var(--accent)", color: "var(--accent)", background: "transparent", minWidth: 100 }}>{t("actions.cancel", null, "Cancel")}</button>
            <button className="btn" onClick={() => onNavigate(`/settings/edit-step/${prevStep.key}`)} style={{ color: "var(--accent)", background: "transparent", border: "none" }}>{t("actions.back", null, "Back")}</button>
          </div>
        )}
      </div>
    </aside>
  );
}

// Editing an already-complete field here saves via the same PATCH /auth/profile
// route Settings itself uses -- never the onboarding-completion route -- so this
// can never flip onboardingCompleted true. The Dashboard's profile-completion
// banner only clears on that dedicated signal, so it stays correct regardless
// of what gets edited from here.
export default function EditAccountStep() {
  const { t } = useTranslation();
  const { step: stepKey } = useParams();
  const navigate = useNavigate();
  const { builder, setBuilder } = useAuth();
  // A builder who never finished onboarding has no builder.persona at all --
  // it's only written by the final completion step -- so this falls back to
  // whichever persona's in-progress draft is sitting in localStorage, same as
  // the Dashboard's own profile-completion banner already does.
  const activePersonaKey = resolveActivePersonaKey(builder);
  const persona = PERSONA_CONFIG[activePersonaKey];
  const isPersonal = stepKey === "personal";
  const editability = persona ? stepEditability(stepKey) : (isPersonal ? "editable" : null);
  const StepComponent = editability === "editable" ? (persona ? persona.components[stepKey] : (isPersonal ? GenericPersonalStep : null)) : null;

  // Seeded from the local in-progress draft (if any), then whatever's
  // actually been saved server-side laid on top -- for an incomplete
  // profile nothing has reached the server yet (the wizard only persists on
  // final submit), so the draft still fills in real mid-onboarding answers
  // the server has never seen. But once something HAS reached the server
  // for a given field (e.g. fixed via a separate Settings edit since this
  // draft was last saved), that's the more authoritative, more recent value
  // -- laid on top last so it wins instead of a stale draft silently
  // resurrecting the old one.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately captured once per mount (this whole edit session, not just the step first opened -- d now persists across in-session step navigation, see below), as the "unchanged" baseline to diff against. A stale mount here previously meant a still-open edit could save one account's typed values onto whichever account is actually logged in if the session changed underneath it without navigating away -- App.jsx now remounts this whole page on that too (its route key includes the builder id, not just the path), so "once per mount" now also means "once per account".
  const initial = useMemo(() => {
    const base = { ...(builder?.profile || {}) };
    // "Your details" edits the account's real identity columns (see
    // handleSave below), which can drift ahead of the onboarding-time
    // profile_json snapshot (e.g. a name changed some other way since) --
    // start from the canonical builder columns here, not the stale copy.
    // Always applied, not just when "personal" happens to be whichever step
    // this session was first opened on -- d covers every step now.
    base.fullName = builder?.name || base.fullName || "";
    base.designation = builder?.designation ?? base.designation ?? "";
    base.email = builder?.email || base.email || "";
    try {
      const draft = JSON.parse(localStorage.getItem(onboardingDraftKey(builder?.id, activePersonaKey)));
      if (draft?.d) return { ...draft.d, ...base };
    } catch { /* ignore */ }
    return base;
  }, []);
  const [d, setD] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const set = (k, v) => setD((s) => ({ ...s, [k]: v }));

  const dirty = useMemo(() => JSON.stringify(d) !== JSON.stringify(initial), [d, initial]);
  useUnsavedChangesWarning(dirty, t("settings.unsavedChangesWarning", null, "You have unsaved changes. Are you sure you want to leave?"));

  // d now persists for the whole edit session (see the `initial` useMemo
  // above), so moving between steps here never loses anything -- only
  // Cancel actually discards the accumulated draft, hence the confirm stays
  // there but not on step-to-step navigation.
  const cancelToSettings = () => {
    if (dirty && !window.confirm(t("settings.unsavedChangesWarning", null, "You have unsaved changes. Are you sure you want to leave?"))) return;
    window.__bypassUnload = true;
    navigate("/settings");
  };

  if (!StepComponent) {
    return (
      <div className="auth-shell">
        <div className="card auth-card rise">
          <h1>{t("settings.editStepUnavailable", null, "Nothing to edit here")}</h1>
          <p className="muted">{t("settings.editStepUnavailableDesc", null, "This section isn't part of your account setup.")} <a href="/settings">{t("actions.goBack", null, "Go back")}</a></p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    const isValid = persona ? persona.validate(stepKey, d, REGION) : genericPersonalValid(d);
    if (!isValid) {
      setError(t("onboarding.fillRequiredFields", null, "Please fill in the required fields before continuing."));
      setShowErrors(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setError(""); setShowErrors(false); setBusy(true);
    try {
      // Usually just `profile` -- echoing name/org/website back unchanged
      // risks tripping their own validation (e.g. an incomplete profile can
      // have a genuinely empty org, which PATCH /auth/profile only rejects
      // when the caller is actually trying to set it). Two steps double as
      // the account's real identity fields though, so editing them here has
      // to reach the actual builder columns too, not just profile_json --
      // otherwise "Your details"/"Company details" would visibly save
      // (no error, spinner completes) while the topbar, this same Settings
      // page, and everywhere else showing that name silently kept the old
      // one. Applied unconditionally now (not gated on stepKey matching
      // "personal"/company) -- d carries every step's fields for the whole
      // session, so Save can fire from any step after editing several, and
      // gating on "is this the step currently on screen" would silently
      // skip the sync for a field that was actually changed two steps ago.
      const patch = { profile: d };
      patch.name = d.fullName;
      patch.designation = (d.designation === "Other" ? d.designationOther : d.designation) || null;
      const nameField = PERSONA_NAME_FIELD[activePersonaKey];
      if (nameField && d[nameField]) patch.org = d[nameField];
      if (d.website !== undefined) patch.website = d.website || null;
      const res = await api.updateProfile(patch);
      setBuilder(res.builder);
      window.__bypassUnload = true;
      navigate("/settings");
    } catch (err) {
      setError(err.message || t("settings.errSave", null, "Couldn't save changes"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wiz-shell">
      <header className="wiz-top">
        <span style={{ fontWeight: 800 }}>{t("actions.editProfile", null, "Edit profile")}</span>
        <div style={{ flex: 1 }} />
        {/* Every other LanguageSwitcher usage (AppLayout topbar, RoleSelect,
            IntentFork) passes onSave to persist the choice server-side --
            this one didn't, so switching here only changed the UI for the
            current session and silently reverted on the next real reload. */}
        <LanguageSwitcher onSave={(lang) => api.setLanguage(lang).catch(() => {})} style={{ marginRight: 16 }} />
      </header>
      <div className="wiz-body-grid">
        {/* Direct navigate, not guarded -- d persists across steps now, so
            jumping between them never risks losing anything (only Cancel,
            wired to cancelToSettings, actually discards the draft). */}
        <StepRail persona={persona} currentKey={stepKey} dirty={dirty} onNavigate={navigate} onCancel={cancelToSettings} />
        {/* Enter-to-save on plain text fields (State/Region, City, GST, ...)
            instead of requiring a mouse click on "Save changes". Delegated
            here rather than a <form onSubmit> wrapper -- FilterGroup's own
            chip buttons (Country/Occupation/etc.) don't all declare
            type="button" explicitly, so a real <form> would turn every chip
            click into an accidental submit. e.defaultPrevented skips the
            "Add other" input, which already handles its own Enter (adds the
            entry) via preventDefault -- without this check that same
            keydown would also bubble up and trigger a save. */}
        <div className="wiz-content" onKeyDown={(e) => {
          if (e.key !== "Enter" || e.defaultPrevented || busy || !dirty) return;
          if (e.target.tagName !== "INPUT" || e.target.type === "checkbox") return;
          e.preventDefault();
          handleSave();
        }}>
          {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}
          <StepComponent d={d} set={set} region={REGION} showErrors={showErrors} />
        </div>
      </div>

      {/* Fixed to the right regardless of scroll, same corner-anchored
          placement as the onboarding wizard's own Continue button, instead
          of sitting inline after the step content (where its screen
          position varied with how tall each step happened to be). right:110
          (not a tighter 32) clears the support-chat bubble docked in the
          same corner. */}
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
