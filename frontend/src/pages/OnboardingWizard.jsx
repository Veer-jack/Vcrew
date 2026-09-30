import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import { BrandMark } from "../components/BrandMark";
import { Btn } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { PERSONA_CONFIG, buildAudienceQuery, onboardingDraftKey, stepLabel, getRoles, switchToRoleDraft, PERSONA_NAME_FIELD } from "../data/personaConfig";
import { api } from "../api/client";
import useUnsavedChangesWarning from "../hooks/useUnsavedChangesWarning";
import { useTranslation } from "../i18n/index.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher";
import StandaloneAudience from "../components/StandaloneAudience";

const REGION = "india"; // ValidationCrew's primary market today; no region switcher yet.

// The new top progress bar matching the horizontal step segment design.
// Displays individual top line segments above step labels/icons and allows jumping to completed steps.
function TopProgressBar({ steps, current, maxReached, onJump }) {
  const { t } = useTranslation();
  // Calculate percentage: completed steps / total steps
  const pct = steps.length > 0 ? Math.round((current / steps.length) * 100) : 0;
  
  return (
    <div style={{ display: "flex", alignItems: "center", flex: 1, margin: "0 32px", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", flex: 1, gap: 12 }}>
        {steps.map((s, i) => {
          const state = i < current ? "done" : i === current ? "current" : "upcoming";
          const reachable = i <= maxReached;
          const isCompletedOrActive = i <= current;
          
          return (
            <div key={s.key} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              {/* Top progress segment line above the step text/icon */}
              <div
                style={{
                  height: 3,
                  borderRadius: 2,
                  background: isCompletedOrActive ? "var(--accent, #4f46e5)" : "var(--border, #e2e8f0)",
                  width: "100%",
                  transition: "background 0.2s ease"
                }}
              />
              {/* Step indicator button */}
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onJump(i)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: reachable ? "pointer" : "default",
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

      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text, #0f172a)", minWidth: 36, textAlign: "right" }}>
        {pct}%
      </div>
    </div>
  );
}

// Inline role switcher dropdown styled seamlessly as "{Role} setup" next to vertical divider
function RoleSwitcher({ currentKey, currentName, builder }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const roles = getRoles(t);

  const pick = (key) => {
    setOpen(false);
    if (key === currentKey) return;
    // eslint-disable-next-line react-hooks/immutability
    window.__bypassUnload = true;
    switchToRoleDraft(builder?.id, key, builder);
    // eslint-disable-next-line react-hooks/immutability
    window.location.href = `/signup?role=${key}`;
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer",
          background: "transparent", border: "none", padding: 0,
          fontWeight: 700, fontSize: 14, color: "var(--text)"
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={t("actions.changeRole", null, "Change role")}
      >
        {currentName} <Icon name="chevronDown" size={12} style={{ color: "var(--text-muted)", marginLeft: 2 }} />
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div
            role="listbox"
            style={{
              position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 50,
              background: "var(--bg, #ffffff)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)",
              minWidth: 240, padding: "6px 0",
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

function SuccessScreen({ persona, d, builder, onFinish, onReview, busy, error }) {
  const { t } = useTranslation();
  const items = persona.summary(d, t);
  const [matched, setMatched] = useState(null);
  const matchedNounLabel = persona.matchedNoun === "people" 
    ? t("onboarding.matchedNounPeople", null, "people") 
    : persona.matchedNoun === "participants" 
      ? t("onboarding.matchedNounParticipants", null, "participants")
      : t("onboarding.matchedNounValidators", null, "validators");

  useEffect(() => {
    if (!persona.matchedNoun) return;
    api.audienceMatchCount(buildAudienceQuery(d)).then(r => setMatched(r.count)).catch(() => setMatched(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allItems = persona.matchedNoun
    ? [...items, { 
        icon: "users", 
        label: persona.matchedNoun === "participants" ? t("onboarding.matchedParticipants", null, "Matched participants") : t("onboarding.matchedAudience", null, "Matched audience"), 
        value: matched === null ? t("onboarding.counting", null, "Counting…") : `${matched.toLocaleString("en-US")} ${matchedNounLabel}` 
      }]
    : items;
    
  if (d.region) {
    allItems.push({ icon: "mapPin", label: "Region", value: "India" });
  }

  const name = (builder?.name || d.fullName || "").split(" ")[0] || "there";

  return (
    <div className="rise" style={{ textAlign: "center", maxWidth: 640, margin: "40px auto 0" }}>
      <div style={{ margin: "0 auto 24px", width: 80, height: 80, borderRadius: "50%", background: "var(--accent-weak)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#ffffff", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <Icon name="shieldCheck" size={24} />
        </div>
      </div>
      
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16, color: "#0f172a", letterSpacing: "-0.02em" }}>
        Submitted for verification, {name}
      </h1>
      
      <p style={{ fontSize: 15, color: "#64748b", maxWidth: 500, margin: "0 auto 48px", lineHeight: 1.6 }}>
        Our trust team is reviewing your details. You don't have to wait — you can publish up to 3 missions before your account is verified.
      </p>
      
      {/* Stepper */}
      <div style={{ display: "flex", alignItems: "flex-start", position: "relative", marginBottom: 48 }}>
        {/* Background line connecting centers (16.66% to 83.33%) */}
        <div style={{ position: "absolute", top: 12, left: "16.66%", width: "66.66%", height: 2, background: "#f1f5f9", zIndex: 0 }} />
        {/* Green line from 1 to 2 (16.66% to 50%) */}
        <div style={{ position: "absolute", top: 12, left: "16.66%", width: "33.33%", height: 2, background: "#10b981", zIndex: 1 }} />
        {/* Accent line from 2 to 3 (50% to 83.33%) */}
        <div style={{ position: "absolute", top: 12, left: "50%", width: "33.33%", height: 2, background: "var(--accent)", zIndex: 1 }} />
        
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, flex: 1 }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#10b981", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="check" size={14} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Details submitted</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Received just now</div>
          </div>
        </div>
        
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, flex: 1 }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
            2
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Admin verification</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Usually within 24 hours</div>
          </div>
        </div>
        
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, flex: 1 }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#fff", border: "2px solid #e2e8f0", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
            3
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 4 }}>Account activated</div>
            <div style={{ fontSize: 12, color: "#cbd5e1" }}>Unlocks after approval</div>
          </div>
        </div>
      </div>
      
      {/* Summary Card */}
      <div style={{ background: "#ffffff", border: "1px solid #f1f5f9", borderRadius: 16, padding: "8px 24px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", marginBottom: 32 }}>
        {allItems.map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderTop: i ? "1px solid #f1f5f9" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {it.icon && (
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent-weak)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={it.icon} size={16} />
                </div>
              )}
              <span style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>{it.label}</span>
            </div>
            <b style={{ fontSize: 14, color: "#0f172a", fontWeight: 700 }}>{it.value}</b>
          </div>
        ))}
      </div>
      
      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        {error && <div style={{ color: "#ef4444", fontSize: 13, background: "#fef2f2", padding: "8px 16px", borderRadius: 8 }}>{error}</div>}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <button type="button" disabled={busy} onClick={onFinish} style={{ background: "var(--accent)", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 8, fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}>
            {busy && <Icon name="loader" size={16} className="spin" />}
            {t("onboarding.createFirst", { noun: persona.noun || "initiative" }, `Create first ${persona.noun || "initiative"}`)} 
            {!busy && <Icon name="arrowRight" size={16} />}
          </button>
          <button type="button" disabled={busy} onClick={onReview} style={{ background: "transparent", color: "#0f172a", border: "none", padding: "12px 24px", borderRadius: 8, fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}>
            <Icon name="arrowLeft" size={16} /> Review answers
          </button>
        </div>
      </div>

      <p style={{ marginTop: 24, fontSize: 13, color: "#94a3b8" }}>
        Prototype: approve or reject this in Admin → Verification — this screen updates live.
      </p>
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
  
  const [done, setDone] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY));
      return saved ? !!saved.done : false;
    } catch { return false; }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  
  useEffect(() => {
    if (builder?.onboardingCompleted && !done) {
      navigate("/", { replace: true });
      return;
    }
    if (role) {
      document.documentElement.setAttribute("data-role", role);
      return () => document.documentElement.removeAttribute("data-role");
    }
  }, [role, builder?.onboardingCompleted, done, navigate]);

  // The single field Continue actually rejected on this step, if any -- see
  // goNext below. Drives both the scroll target and the inline message next
  // to that one field, replacing the old "scroll to top, generic banner"
  // behavior with something that points at the actual problem.
  const [issue, setIssue] = useState(null);
  const [d, setD] = useState(() => {
    // Prefill from what signup already collected instead of making the user
    // retype their own name/email. A draft (e.g. RoleSelect's placeholder
    // `{}`) is merged on top rather than replacing this wholesale, so an
    // empty/partial draft can't blank out the real account's name/email.
    const base = { fullName: builder?.name || "", email: builder?.email || "" };
    let merged = base;
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY));
      if (saved?.d) merged = { ...base, ...saved.d };
    } catch { /* ignore */ }
    // Anything already saved server-side (e.g. a field fixed via Settings
    // while setup was still incomplete) is more authoritative than a stale
    // local draft that predates that edit -- overlaid last so it wins
    // per-field, while any field only the draft has (genuine in-progress,
    // never-submitted work) still comes through untouched.
    const result = { ...merged, ...(builder?.profile || {}) };
    // A phone-signup account already has a real verified number before
    // onboarding even starts (profile_json doesn't exist yet at that point) --
    // show it here instead of leaving the field blank and making the user
    // retype a number they just proved seconds ago. Same rule already applied
    // in EditAccountStep.jsx for editing after onboarding is done.
    if (builder?.phoneVerified) result.mobile = builder.phone;
    return result;
  });

  const set = (k, v) => {
    setError("");
    setIssue(null);
    setD((s) => ({ ...s, [k]: v }));
  };

  // Prevent accidental reload or back button if they've made progress
  const isDirty = !done && (step > 0 || Object.keys(d).length > 0);
  useUnsavedChangesWarning(isDirty, t("onboarding.unsavedChangesWarning", null, "You're still setting up your account. Are you sure you want to leave and lose your progress?"));

  const saveDraft = (newStep, newMaxReached, currentD, isDone = done) => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ step: newStep, maxReached: newMaxReached, d: currentD, done: isDone }));
    } catch { /* ignore */ }
  };

  // Belt-and-suspenders for the explicit saveDraft() calls below: those only
  // fire at step transitions (Continue/Back/rail-jump), so anything typed on
  // the CURRENT step was invisible to localStorage until the next transition
  // — leaving it to survive only Continue/Back and be silently dropped by
  // any other way of leaving (Skip's window.location.href, closing the tab
  // past the unsaved-changes warning, the browser's own back button). This
  // keeps the saved draft caught up with every keystroke instead, so no exit
  // path can lose more than what the debounce hasn't flushed yet.
  useEffect(() => {
    const timer = setTimeout(() => saveDraft(step, maxReached, d, done), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, maxReached, d, done]);

  const stepKey = persona ? (step < persona.steps.length ? persona.steps[step].key : "standalone_audience") : null;
  const StepComponent = persona && step < persona.steps.length ? persona.components[stepKey] : null;
  // If at standalone audience, use persona validate for audience/participants if available
  const isValid = useMemo(() => {
    if (!persona) return false;
    if (step < persona.steps.length) return persona.validate(stepKey, d, REGION);
    // Standalone audience validation
    if (persona.components.audience) return persona.validate("audience", d, REGION);
    if (persona.components.participants) return persona.validate("participants", d, REGION);
    return true;
  }, [persona, step, stepKey, d]);

  const isPreferencesStep = persona ? step === persona.steps.length - 1 : false;
  const isAudienceStep = persona ? step === persona.steps.length : false;

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
      let foundIssue = null;
      if (step < persona.steps.length && persona.getIssue) {
        foundIssue = persona.getIssue(stepKey, d, REGION, t);
      } else if (isAudienceStep && persona.getIssue) {
        if (persona.components.audience) foundIssue = persona.getIssue("audience", d, REGION, t);
        else if (persona.components.participants) foundIssue = persona.getIssue("participants", d, REGION, t);
      }
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
        requestAnimationFrame(() => {
          const firstInvalid = document.querySelector(".fld-invalid, .fsection-invalid");
          if (firstInvalid) {
            firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        });
      }
      return;
    }
    setError(""); setShowErrors(false); setIssue(null);
    if (!isAudienceStep) {
      const next = step + 1;
      const newMax = Math.max(maxReached, next);
      setStep(next);
      setMaxReached(newMax);
      saveDraft(next, newMax, d);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // final step submit (from standalone audience)
    setDone(true);
    saveDraft(step, maxReached, d, true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFinalSubmit = async () => {
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
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || t("onboarding.couldntSaveProfile", null, "Couldn't save your profile"));
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    setError(""); setShowErrors(false); setIssue(null);
    if (step === 0) {
      saveDraft(step, maxReached, d);
      navigate(`/get-started/feedback?current=${role}`);
      return;
    }
    const prev = step - 1;
    setStep(prev);
    saveDraft(prev, maxReached, d);
  };

  const handleJump = (i) => {
    setShowErrors(false);
    setIssue(null);
    setStep(i);
    saveDraft(i, maxReached, d);
  };

  // Reset (not remove) the draft: this stays on the same role, just restarts
  // progress within it, so the dashboard's "which role / how far" banner
  // stays in sync instead of reporting no role picked.
  // eslint-disable-next-line no-unused-vars
  const startFresh = () => {
    window.__bypassUnload = true;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ step: 0, maxReached: 0, d: { fullName: builder?.name || "", email: builder?.email || "" } }));
    } catch { /* ignore */ }
    window.location.reload();
  };

  const handleSkip = () => {
    saveDraft(step, maxReached, d);
    window.__bypassUnload = true;
    window.location.href = "/";
  };

  if (done) {
    return (
      <div className="auth-shell">
        <SuccessScreen 
          persona={persona} 
          d={d} 
          builder={builder} 
          onFinish={handleFinalSubmit} 
          onReview={() => { setDone(false); setStep(0); saveDraft(0, maxReached, d, false); }} 
          busy={busy}
          error={error}
        />
      </div>
    );
  }

  const handleValidateAudience = () => {
    if (!isValid) {
      goNext();
      return false;
    }
    return true;
  };

  if (isAudienceStep) {
    return <StandaloneAudience d={d} set={set} region={REGION} roleName={persona.name} accent={persona.accent} onSkip={handleSkip} onSubmit={goNext} onValidate={handleValidateAudience} showErrors={showErrors} issue={issue} error={error} busy={busy} />;
  }

  return (
    <div className="wiz-shell" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f8fafc" }}>
      <header className="wiz-top" style={{ padding: "0 24px", height: 64, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", background: "#fff" }}>
        <BrandMark size={36} />
        <span style={{ color: "#cbd5e1", margin: "0 14px", fontSize: 14, fontWeight: 300 }}>|</span>
        <RoleSwitcher currentKey={role} currentName={`${t(`onboarding.persona.${role}.name`, null, persona.name)} setup`} builder={builder} />
        
        <TopProgressBar steps={persona.steps} current={step} maxReached={maxReached} onJump={handleJump} />
        
        <LanguageSwitcher onSave={(lang) => api.setLanguage(lang).catch(() => {})} />
      </header>

      <div style={{ flex: 1, padding: "32px 40px", maxWidth: 1200, margin: "0 auto", width: "100%", paddingBottom: 100 }}>
        {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}
        <StepComponent d={d} set={set} region={REGION} showErrors={showErrors} issue={issue} />
      </div>

      {/* New Footer replacing the rail buttons and floating right button */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid var(--border)", zIndex: 40 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", padding: "16px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="row gap-3" style={{ alignItems: "center" }}>
            <button className="btn" onClick={goBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--border)", color: "var(--text)", padding: "8px 14px", borderRadius: 8, fontWeight: 500 }}>
              <Icon name="arrowLeft" size={14} /> {step === 0 ? t("actions.roles", null, "Roles") : t("actions.back", null, "Back")}
            </button>
            <button className="btn" onClick={handleSkip} style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontWeight: 500, padding: "8px 14px" }}>
              {t("actions.skip", null, "Skip")}
            </button>
          </div>
          <Btn variant="primary" onClick={goNext} disabled={busy} style={{ boxShadow: "var(--shadow-sm)", padding: "10px 24px", borderRadius: 8 }}>
            {busy ? t("actions.creatingAccount", null, "Creating account…") : isPreferencesStep ? t("actions.createWorkspace", null, "Find my people \u2192") : t("actions.continueArrow", null, "Continue →")}
          </Btn>
        </div>
      </div>
    </div>
  );
}
