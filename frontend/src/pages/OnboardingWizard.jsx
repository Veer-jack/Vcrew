import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import { BrandMark } from "../components/BrandMark";
import { Btn } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { PERSONA_CONFIG, buildAudienceQuery, onboardingDraftKey, stepLabel, getRoles, switchToRoleDraft } from "../data/personaConfig";
import { api } from "../api/client";
import useUnsavedChangesWarning from "../hooks/useUnsavedChangesWarning";
import { useTranslation } from "../i18n/index.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher";

const REGION = "india"; // ValidationCrew's primary market today; no region switcher yet.

const PERSONA_NAME_FIELD = {
  founder: "companyName",
  company: "companyName",
  researcher: "institution",
  organization: "orgName",
};

function StepRail({ steps, current, maxReached, onJump }) {
  const { t } = useTranslation();
  return (
    <aside className="wiz-rail">
      <div className="eyebrow" style={{ marginBottom: 14 }}>{t("onboarding.yourSetup", null, "Your setup")}</div>
      <div className="col gap-1">
        {steps.map((s, i) => {
          const state = i < current ? "done" : i === current ? "current" : "upcoming";
          const reachable = i <= maxReached;
          return (
            <button
              key={s.key} type="button" disabled={!reachable}
              onClick={() => reachable && onJump(i)}
              className={`wiz-step wiz-step-${state}`}
            >
              <span className="wiz-step-dot">{i < current ? <Icon name="check" size={12} /> : i + 1}</span>
              <span>{stepLabel(t, s.key, s.label)}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

// Inline role switcher — lets the user jump straight to another persona's
// onboarding without leaving to the full-page selector. Switching wipes every
// role's draft and seeds a fresh one for the picked role (same reset
// RoleSelect uses), so the dashboard's progress banner always points at
// exactly one unambiguous, freshly-created draft afterwards. A full page
// navigation (not client-side routing) is used deliberately: this component's
// step/draft state is only initialized on mount, so a same-route search-param
// change alone wouldn't pick up the new role's data.
function RoleSwitcher({ currentKey, currentName, builder }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const roles = getRoles(t);

  const pick = (key) => {
    setOpen(false);
    if (key === currentKey) return;
    window.__bypassUnload = true;
    switchToRoleDraft(builder?.id, key, builder);
    window.location.href = `/signup?role=${key}`;
  };

  return (
    <div style={{ position: "relative", marginLeft: 10 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="pill"
        style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", border: "none" }}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={t("actions.changeRole", null, "Change role")}
      >
        {currentName} <Icon name="chevronDown" size={12} />
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div
            role="listbox"
            style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50,
              background: "var(--bg)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)",
              minWidth: 260, padding: "6px 0",
            }}
          >
            {roles.map((r) => (
              <button
                key={r.key}
                type="button"
                role="option"
                aria-selected={r.key === currentKey}
                disabled={!r.live}
                onClick={() => r.live && pick(r.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "9px 14px", background: r.key === currentKey ? "var(--accent-weak)" : "none",
                  border: "none", cursor: r.live ? "pointer" : "default", textAlign: "left",
                  color: r.key === currentKey ? "var(--accent)" : "var(--text)",
                  opacity: r.live ? 1 : 0.5,
                  fontSize: 13.5, fontFamily: "inherit",
                }}
              >
                <span className="intent-ic" style={{ background: `${r.accent}1a`, color: r.accent, width: 26, height: 26, flexShrink: 0 }}>
                  <Icon name={r.icon} size={14} />
                </span>
                <span style={{ fontWeight: r.key === currentKey ? 700 : 500 }}>{r.name}</span>
                {r.key === currentKey && <Icon name="check" size={13} style={{ marginLeft: "auto", color: "var(--accent)" }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SuccessScreen({ persona, d, builder, onFinish }) {
  const { t } = useTranslation();
  const items = persona.summary(d, t);
  const [matched, setMatched] = useState(null);
  const matchedNounLabel = persona.matchedNoun === "people" ? t("onboarding.matchedNounPeople", null, "people") : t("onboarding.matchedNounValidators", null, "validators");

  useEffect(() => {
    if (!persona.matchedNoun) return;
    api.audienceMatchCount(buildAudienceQuery(d)).then(r => setMatched(r.count)).catch(() => setMatched(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allItems = persona.matchedNoun
    ? [...items, { label: t("onboarding.matchedAudience", null, "Matched audience"), value: matched === null ? t("onboarding.counting", null, "Counting…") : `${matched.toLocaleString("en-US")} ${matchedNounLabel}` }]
    : items;

  return (
    <div className="rise" style={{ textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
      <div className="brand-mark" style={{ margin: "0 auto 18px", background: "var(--success-weak)", color: "var(--success)" }}>
        <Icon name="checkCircle" size={20} />
      </div>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>{t("onboarding.youreAllSet", null, "You're all set,")} {(builder?.name || d.fullName || "").split(" ")[0] || t("onboarding.thereFallback", null, "there")}</h1>
      <p className="muted" style={{ marginBottom: 24, fontSize: 14 }}>
        {persona.workspace(d, t)} {t("onboarding.isReadyLiningUp", { noun: persona.noun === "study" ? t("onboarding.participants", null, "participants") : t("onboarding.validators", null, "validators") }, `is ready. We're already lining up ${persona.noun === "study" ? "participants" : "validators"} who match your audience.`)}
      </p>
      <div className="card" style={{ padding: 18, textAlign: "left", marginBottom: 22 }}>
        {allItems.map((it, i) => (
          <div key={i} className="row between" style={{ padding: "9px 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
            <span className="faint" style={{ fontSize: 13 }}>{it.label}</span>
            <b style={{ fontSize: 13 }}>{it.value}</b>
          </div>
        ))}
      </div>
      <Btn variant="primary" block onClick={onFinish}>{t("actions.goToDashboard", null, "Go to my dashboard")}</Btn>
    </div>
  );
}

export default function OnboardingWizard() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const role = params.get("role") || "founder";
  const persona = PERSONA_CONFIG[role];
  const { completeOnboarding, builder } = useAuth();
  const navigate = useNavigate();

  const DRAFT_KEY = onboardingDraftKey(builder?.id, role);

  const [step, setStep] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY));
      return saved ? saved.step : 0;
    } catch { return 0; }
  });
  
  const [maxReached, setMaxReached] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY));
      return saved ? saved.maxReached : 0;
    } catch { return 0; }
  });
  
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [d, setD] = useState(() => {
    // Prefill from what signup already collected instead of making the user
    // retype their own name/email. A draft (e.g. RoleSelect's placeholder
    // `{}`) is merged on top rather than replacing this wholesale, so an
    // empty/partial draft can't blank out the real account's name/email.
    const base = { fullName: builder?.name || "", email: builder?.email || "" };
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY));
      if (saved?.d) return { ...base, ...saved.d };
    } catch { /* ignore */ }
    return base;
  });

  const set = (k, v) => setD((s) => ({ ...s, [k]: v }));

  // Prevent accidental reload or back button if they've made progress
  const isDirty = !done && (step > 0 || Object.keys(d).length > 0);
  useUnsavedChangesWarning(isDirty, t("onboarding.unsavedChangesWarning", null, "You're still setting up your account. Are you sure you want to leave and lose your progress?"));

  const saveDraft = (newStep, newMaxReached, currentD) => {
    if (done) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ step: newStep, maxReached: newMaxReached, d: currentD }));
    } catch { /* ignore */ }
  };

  const stepKey = persona ? persona.steps[step].key : null;
  const StepComponent = persona ? persona.components[stepKey] : null;
  const isValid = useMemo(() => persona ? persona.validate(stepKey, d, REGION) : false, [persona, stepKey, d]);
  const isLast = persona ? step === persona.steps.length - 1 : false;

  if (!persona) {
    return (
      <div className="auth-shell">
        <div className="card auth-card rise">
          <h1>{t("onboarding.unknownRole", null, "Unknown role")}</h1>
          <p className="muted">{t("onboarding.pathNoExist", null, "That onboarding path doesn't exist.")} <a href="/get-started/feedback">{t("actions.goBack", null, "Go back")}</a></p>
        </div>
      </div>
    );
  }

  const goNext = async () => {
    if (!isValid) {
      setError(t("onboarding.fillRequiredFields", null, "Please fill in the required fields before continuing."));
      setShowErrors(true);
      // The warning banner renders at the top of the step — scroll there so
      // it's actually visible instead of silently appearing above the fold.
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setError(""); setShowErrors(false);
    if (!isLast) {
      const next = step + 1;
      const newMax = Math.max(maxReached, next);
      setStep(next);
      setMaxReached(newMax);
      saveDraft(next, newMax, d);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // final step submit
    setBusy(true);
    try {
      const nameField = PERSONA_NAME_FIELD[role];
      await completeOnboarding({
        designation: (d.designation === "Other" ? d.designationOther : d.designation) || null,
        org: d[nameField] || builder?.name,
        website: d.website || null,
        persona: role,
        profile: d,
      });
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      setDone(true);
    } catch (err) {
      setError(err.message || t("onboarding.couldntSaveProfile", null, "Couldn't save your profile"));
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    setError(""); setShowErrors(false);
    const prev = Math.max(0, step - 1);
    setStep(prev);
    saveDraft(prev, maxReached, d);
  };

  const handleJump = (i) => {
    setShowErrors(false);
    setStep(i);
    saveDraft(i, maxReached, d);
  };

  if (done) {
    return (
      <div className="auth-shell">
        <SuccessScreen persona={persona} d={d} builder={builder} onFinish={() => navigate("/", { replace: true })} />
      </div>
    );
  }

  return (
    <div className="wiz-shell">
      <header className="wiz-top">
        <BrandMark size={28} />
        <span style={{ fontWeight: 800 }}>ValidationCrew</span>
        <RoleSwitcher currentKey={role} currentName={t(`onboarding.persona.${role}.name`, null, persona.name)} builder={builder} />
        <div style={{ flex: 1 }} />
        <LanguageSwitcher style={{ marginRight: 16 }} />
        <button
          onClick={() => {
            window.__bypassUnload = true;
            // Reset (not remove) the draft: this stays on the same role, just
            // restarts progress within it, so the dashboard's "which role /
            // how far" banner stays in sync instead of reporting no role picked.
            try {
              localStorage.setItem(DRAFT_KEY, JSON.stringify({ step: 0, maxReached: 0, d: { fullName: builder?.name || "", email: builder?.email || "" } }));
            } catch { /* ignore */ }
            window.location.reload();
          }}
          className="faint"
          style={{ fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', marginRight: 16 }}
        >
          {t("actions.startOver", null, "Start over")}
        </button>
        <a href="/" onClick={() => { window.__bypassUnload = true; }} className="faint" style={{ fontSize: 13 }}>{t("actions.skipForNow", null, "Skip for now")}</a>
      </header>

      <div className="wiz-body-grid">
        <StepRail steps={persona.steps} current={step} maxReached={maxReached} onJump={handleJump} />
        <div className="wiz-content">
          {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}
          <StepComponent d={d} set={set} region={REGION} showErrors={showErrors} />
          <div className="row gap-3" style={{ marginTop: 28 }}>
            {step > 0 && <Btn variant="ghost" onClick={goBack}>{t("actions.back", null, "Back")}</Btn>}
            <Btn variant="primary" onClick={goNext} disabled={busy}>
              {busy ? t("actions.creatingAccount", null, "Creating account…") : isLast ? t("actions.createWorkspace", null, "Create my workspace") : t("actions.continue", null, "Continue")}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
