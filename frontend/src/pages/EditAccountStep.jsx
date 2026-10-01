import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Btn } from "../components/ui";
import Icon from "../components/Icon";
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
function GenericPersonalStep({ d, set, showErrors, issue }) {
  return <PersonalFields d={d} set={set} roleField={null} showErrors={showErrors} emailLocked issue={issue} />;
}
function genericPersonalValid(d) {
  return !!(d.fullName && d.fullName.trim().length > 1) && EMAIL_RE.test(d.email || "") && isValidMobile(d.mobile) && !!d.designation;
}
// Parallel to genericPersonalValid, same reasoning as personaConfig.jsx's
// foStepIssue etc -- additive, never a source of truth for pass/fail.
function genericPersonalStepIssue(d, t) {
  const checks = [
    { id: "fullName", ok: !!(d.fullName && d.fullName.trim().length > 1), label: t("onboardingFields.fullName", null, "Full name") },
    { id: "email", ok: EMAIL_RE.test(d.email || ""), label: t("onboardingFields.email", null, "Email") },
    { id: "mobile", ok: isValidMobile(d.mobile), label: t("onboardingFields.mobileNumber", null, "Mobile number") },
    { id: "designation", ok: !!d.designation, label: t("onboardingFields.jobTitle", null, "Job title") },
  ];
  const bad = checks.find(c => !c.ok);
  return bad ? { id: bad.id, message: t("onboarding.pleaseFillField", { field: bad.label }, `Please fill in ${bad.label}.`) } : null;
}

// The new top progress bar matching the horizontal step segment design.
function TopProgressBar({ steps, current, onJump }) {
  const { t } = useTranslation();
  const pct = steps.length > 0 ? Math.round((current / steps.length) * 100) : 0;
  
  return (
    <div style={{ display: "flex", alignItems: "center", flex: 1, margin: "0 32px", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", flex: 1, gap: 12 }}>
        {steps.map((s, i) => {
          const state = i < current ? "done" : i === current ? "current" : "upcoming";
          const isCompletedOrActive = i <= current;
          
          return (
            <div key={s.key} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  height: 3,
                  borderRadius: 2,
                  background: isCompletedOrActive ? "var(--accent, #4f46e5)" : "var(--border, #e2e8f0)",
                  width: "100%",
                  transition: "background 0.2s ease"
                }}
              />
              <button
                type="button"
                onClick={() => onJump(i)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  color: state === "upcoming" ? "var(--text-muted, #94a3b8)" : "var(--text, #0f172a)",
                  fontWeight: state === "current" ? 700 : state === "done" ? 600 : 500,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                  textAlign: "left"
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    background:
                      state === "done"
                        ? "var(--success, #16a34a)"
                        : state === "current"
                        ? "var(--accent, #4f46e5)"
                        : "#ffffff",
                    border: state === "upcoming" ? "1.5px solid #cbd5e1" : "none",
                    color: state === "upcoming" ? "#94a3b8" : "#ffffff",
                    fontSize: 11,
                    fontWeight: 700
                  }}
                >
                  {state === "done" ? <Icon name="check" size={11} strokeWidth={2.6} /> : i + 1}
                </div>
                <span>{stepLabel(t, s.key, s.label)}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import StandaloneAudience from "../components/StandaloneAudience";

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
  const isAudience = stepKey === "audience" || stepKey === "participants";
  const editability = persona ? stepEditability(stepKey) : (isPersonal ? "editable" : null);
  
  const StepComponent = isAudience ? StandaloneAudience : (editability === "editable" ? (persona ? persona.components[stepKey] : (isPersonal ? GenericPersonalStep : null)) : null);

  // Always scroll to top when changing steps in edit mode,
  // preventing browser from remembering scroll position of Settings page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stepKey]);

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
    // Same rule for mobile: once a number is actually verified, that's the
    // real one -- show it here even if it differs from whatever's still
    // sitting in the profile_json snapshot (e.g. the user changed the number
    // inside the verify flow itself instead of the one they originally typed
    // during onboarding). Unverified, there's no canonical column yet, so
    // fall back to the declared value as before.
    base.mobile = builder?.phoneVerified ? builder.phone : (base.mobile ?? "");
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
  // Same "which one field, scroll to it" state as OnboardingWizard's own
  // goNext -- see there for the full reasoning.
  const [issue, setIssue] = useState(null);
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
      // Same "scroll to the one specific field" behavior as the onboarding
      // wizard's own goNext -- see there for the full reasoning.
      const foundIssue = persona ? (persona.getIssue ? persona.getIssue(stepKey, d, REGION, t) : null) : genericPersonalStepIssue(d, t);
      setShowErrors(true);
      if (foundIssue) {
        setIssue(foundIssue);
        setError("");
        requestAnimationFrame(() => {
          document.querySelector(`[data-field="${foundIssue.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      } else {
        setIssue(null);
        setError(t("onboarding.fillRequiredFields", null, "Please fill in the required fields before continuing."));
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }
    setError(""); setShowErrors(false); setIssue(null); setBusy(true);
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
    <div className="wiz-shell" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f8fafc" }}>
      <header className="wiz-top" style={{ padding: "0 24px", height: 64, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", background: "#fff" }}>
        <div style={{ flexShrink: 0, marginRight: 32, fontWeight: 800 }}>
          {t("actions.editProfile", null, "Edit profile")}
        </div>
        
        {persona && !isAudience ? (
          <TopProgressBar 
            steps={persona.steps} 
            current={persona.steps.findIndex(s => s.key === stepKey)} 
            onJump={(i) => navigate(`/settings/edit-step/${persona.steps[i].key}`)} 
          />
        ) : <div style={{ flex: 1 }} />}

        <LanguageSwitcher onSave={(lang) => api.setLanguage(lang).catch(() => {})} style={{ marginLeft: "auto" }} />
      </header>

      <div style={{ flex: 1, padding: "32px 40px", maxWidth: 1200, margin: "0 auto", width: "100%", paddingBottom: 100 }} onKeyDown={(e) => {
        if (e.key !== "Enter" || e.defaultPrevented || busy || !dirty) return;
        if (e.target.tagName !== "INPUT" || e.target.type === "checkbox") return;
        e.preventDefault();
        handleSave();
      }}>
        {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}
        <StepComponent d={d} set={set} region={REGION} showErrors={showErrors} issue={issue} isSettings={true} />
      </div>

      <footer style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 80, background: "#fff", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 40px", zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", flex: 1, maxWidth: 1120, margin: "0 auto" }}>
          <button className="btn" onClick={cancelToSettings} style={{ border: "1.5px solid var(--accent)", color: "var(--accent)", background: "transparent", minWidth: 100 }}>
            {t("actions.cancel", null, "Cancel")}
          </button>
          
          <div style={{ flex: 1 }} />
          
          <Btn variant="primary" onClick={handleSave} disabled={busy || !dirty} style={{ boxShadow: "var(--shadow-lg)" }}>
            {busy ? t("actions.saving", null, "Saving…") : t("actions.saveChanges", null, "Save changes")}
          </Btn>
        </div>
      </footer>
    </div>
  );
}
