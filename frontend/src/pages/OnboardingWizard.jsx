import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import { BrandMark } from "../components/BrandMark";
import { Btn } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { PERSONA_CONFIG } from "../data/personaConfig";

const REGION = "india"; // ValidationCrew's primary market today; no region switcher yet.

const PERSONA_NAME_FIELD = {
  founder: "companyName",
  company: "companyName",
  researcher: "institution",
  organization: "orgName",
};

function StepRail({ steps, current, maxReached, onJump }) {
  return (
    <aside className="wiz-rail">
      <div className="eyebrow" style={{ marginBottom: 14 }}>Your setup</div>
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
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function SuccessScreen({ persona, d, onFinish }) {
  const items = persona.summary(d, REGION);
  return (
    <div className="rise" style={{ textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
      <div className="brand-mark" style={{ margin: "0 auto 18px", background: "var(--success-weak)", color: "var(--success)" }}>
        <Icon name="checkCircle" size={20} />
      </div>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>You're all set, {(d.fullName || "").split(" ")[0] || "there"}</h1>
      <p className="muted" style={{ marginBottom: 24, fontSize: 14 }}>
        {persona.workspace(d)} is ready. We're already lining up {persona.noun === "study" ? "participants" : "validators"} who match your audience.
      </p>
      <div className="card" style={{ padding: 18, textAlign: "left", marginBottom: 22 }}>
        {items.map((it, i) => (
          <div key={i} className="row between" style={{ padding: "9px 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
            <span className="faint" style={{ fontSize: 13 }}>{it.label}</span>
            <b style={{ fontSize: 13 }}>{it.value}</b>
          </div>
        ))}
      </div>
      <Btn variant="primary" block onClick={onFinish}>Go to my dashboard</Btn>
    </div>
  );
}

export default function OnboardingWizard() {
  const [params] = useSearchParams();
  const role = params.get("role") || "founder";
  const persona = PERSONA_CONFIG[role];
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [d, setD] = useState({});

  const set = (k, v) => setD((s) => ({ ...s, [k]: v }));

  if (!persona) {
    return (
      <div className="auth-shell">
        <div className="card auth-card rise">
          <h1>Unknown role</h1>
          <p className="muted">That onboarding path doesn't exist. <a href="/get-started/feedback">Go back</a></p>
        </div>
      </div>
    );
  }

  const stepKey = persona.steps[step].key;
  const StepComponent = persona.components[stepKey];
  const isValid = useMemo(() => persona.validate(stepKey, d, REGION), [persona, stepKey, d]);
  const isLast = step === persona.steps.length - 1;

  const goNext = async () => {
    if (!isValid) { setError("Please fill in the required fields before continuing."); return; }
    setError("");
    if (!isLast) {
      const next = step + 1;
      setStep(next);
      setMaxReached((m) => Math.max(m, next));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // final step submit
    setBusy(true);
    try {
      const nameField = PERSONA_NAME_FIELD[role];
      await signup({
        name: d.fullName,
        email: d.email,
        password: d.password,
        designation: d.designation || null,
        org: d[nameField] || d.fullName,
        website: d.website || null,
        persona: role,
        profile: d,
      });
      setDone(true);
    } catch (err) {
      setError(err.message || "Couldn't create your account");
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => { setError(""); setStep((s) => Math.max(0, s - 1)); };

  if (done) {
    return (
      <div className="auth-shell">
        <SuccessScreen persona={persona} d={d} onFinish={() => navigate("/", { replace: true })} />
      </div>
    );
  }

  return (
    <div className="wiz-shell">
      <header className="wiz-top">
        <BrandMark size={28} />
        <span style={{ fontWeight: 800 }}>ValidationCrew</span>
        <span className="pill" style={{ marginLeft: 10 }}>{persona.name}</span>
        <div style={{ flex: 1 }} />
        <a href="/" className="faint" style={{ fontSize: 13 }}>Skip for now</a>
      </header>

      <div className="wiz-body-grid">
        <StepRail steps={persona.steps} current={step} maxReached={maxReached} onJump={(i) => setStep(i)} />
        <div className="wiz-content">
          {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}
          <StepComponent d={d} set={set} region={REGION} />
          <div className="row gap-3" style={{ marginTop: 28 }}>
            {step > 0 && <Btn variant="ghost" onClick={goBack}>Back</Btn>}
            <Btn variant="primary" onClick={goNext} disabled={busy}>
              {busy ? "Creating account…" : isLast ? "Create my workspace" : "Continue"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
