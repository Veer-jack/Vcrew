import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { Btn } from "../components/ui";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { PERSONA_CONFIG, resolveActivePersonaKey, onboardingDraftKey, stepLabel, stepEditability } from "../data/personaConfig";
import { api } from "../api/client";
import useUnsavedChangesWarning from "../hooks/useUnsavedChangesWarning";
import { useTranslation } from "../i18n/index.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher";

const REGION = "india"; // same fixed value the onboarding wizard itself uses

// The full step list for context ("show every step"), navigational only --
// each editable step is its own independent page/save (see below), not one
// shared multi-step form, so jumping here never risks losing a DIFFERENT
// step's unsaved edits. Locked and personal steps render but aren't links
// into this page at all.
function StepRail({ persona, currentKey, dirty, onNavigate }) {
  const { t } = useTranslation();
  return (
    <aside className="wiz-rail">
      <div className="eyebrow" style={{ marginBottom: 14 }}>{t("onboarding.yourSetup", null, "Your setup")}</div>
      <div className="col gap-1">
        {persona.steps.map((s, i) => {
          const editability = stepEditability(s.key);
          const isCurrent = s.key === currentKey;
          const label = stepLabel(t, s.key, s.label);
          if (editability === "locked") {
            return (
              <div key={s.key} className="wiz-step" style={{ cursor: "default", opacity: 0.55 }} title={t("settings.stepLockedHint", null, "Submitted during onboarding — not editable here.")}>
                <span className="wiz-step-dot"><Icon name="lock" size={11} /></span>
                <span>{label}</span>
              </div>
            );
          }
          const targetPath = editability === "personal" ? "/settings" : `/settings/edit-step/${s.key}`;
          return (
            <button
              key={s.key} type="button"
              onClick={() => onNavigate(targetPath)}
              className={`wiz-step ${isCurrent ? "wiz-step-current" : ""}`}
            >
              <span className="wiz-step-dot">{i + 1}</span>
              <span>{label}</span>
              {editability === "personal" && <Icon name="externalLink" size={12} style={{ marginLeft: "auto", opacity: 0.6 }} />}
            </button>
          );
        })}
      </div>
      {dirty && <p className="faint" style={{ fontSize: 11.5, marginTop: 12, padding: "0 10px" }}>{t("settings.unsavedHint", null, "You have unsaved changes on this step.")}</p>}
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
  const editability = persona ? stepEditability(stepKey) : null;
  const StepComponent = persona && editability === "editable" ? persona.components[stepKey] : null;

  // Seeded from whatever's actually been saved server-side, then the local
  // in-progress draft (if any) laid on top -- for an incomplete profile nothing
  // has reached the server yet (the wizard only persists on final submit), so
  // without this an incomplete builder would see a blank form here despite
  // having already filled in real answers mid-onboarding.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately captured once per step, as the "unchanged" baseline to diff against
  const initial = useMemo(() => {
    const base = { ...(builder?.profile || {}) };
    try {
      const draft = JSON.parse(localStorage.getItem(onboardingDraftKey(builder?.id, activePersonaKey)));
      if (draft?.d) return { ...base, ...draft.d };
    } catch { /* ignore */ }
    return base;
  }, [stepKey]);
  const [d, setD] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const set = (k, v) => setD((s) => ({ ...s, [k]: v }));

  const dirty = useMemo(() => JSON.stringify(d) !== JSON.stringify(initial), [d, initial]);
  useUnsavedChangesWarning(dirty, t("settings.unsavedChangesWarning", null, "You have unsaved changes. Are you sure you want to leave?"));

  // Rail links (and Cancel) are in-app navigation, which the hook above
  // doesn't cover -- confirm here too so jumping to another step can't
  // silently drop this one's unsaved edits.
  const guardedNavigate = (path) => {
    if (dirty && !window.confirm(t("settings.unsavedChangesWarning", null, "You have unsaved changes. Are you sure you want to leave?"))) return;
    window.__bypassUnload = true;
    navigate(path);
  };

  if (!persona || !StepComponent) {
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
    if (!persona.validate(stepKey, d, REGION)) {
      setError(t("onboarding.fillRequiredFields", null, "Please fill in the required fields before continuing."));
      setShowErrors(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setError(""); setShowErrors(false); setBusy(true);
    try {
      // Only `profile` -- this editor never touches name/org/email/etc, and
      // echoing them back through as unchanged values risks tripping their
      // own validation (e.g. an incomplete profile can have a genuinely
      // empty org, which PATCH /auth/profile now only rejects when the
      // caller is actually trying to set it).
      const res = await api.updateProfile({ profile: d });
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
        <BrandMark size={28} />
        <span style={{ fontWeight: 800 }}>ValidationCrew</span>
        <div style={{ flex: 1 }} />
        <LanguageSwitcher style={{ marginRight: 16 }} />
        <button
          onClick={() => guardedNavigate("/settings")}
          className="faint" style={{ fontSize: 13, background: "none", border: "none", cursor: "pointer" }}
        >
          {t("actions.cancel", null, "Cancel")}
        </button>
      </header>
      <div className="wiz-body-grid">
        <StepRail persona={persona} currentKey={stepKey} dirty={dirty} onNavigate={guardedNavigate} />
        <div className="wiz-content">
          {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}
          <StepComponent d={d} set={set} region={REGION} showErrors={showErrors} />
        </div>
      </div>

      {/* Fixed to the right regardless of scroll, same corner-anchored
          placement as the onboarding wizard's own Continue button, instead
          of sitting inline after the step content (where its screen
          position varied with how tall each step happened to be). */}
      {dirty && (
        <div style={{ position: "fixed", bottom: 28, right: 32, zIndex: 40 }}>
          <Btn variant="primary" onClick={handleSave} disabled={busy} style={{ boxShadow: "var(--shadow-lg)" }}>
            {busy ? t("actions.saving", null, "Saving…") : t("actions.saveChanges", null, "Save changes")}
          </Btn>
        </div>
      )}
    </div>
  );
}
