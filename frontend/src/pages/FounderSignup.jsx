import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Btn } from "../components/ui";
import { useAuth } from "../context/AuthContext";

const STEPS = ["About you", "Your company", "Set a password"];

export default function FounderSignup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [d, setD] = useState({
    name: "", designation: "", email: "",
    org: "", website: "",
    password: "", confirm: "",
  });

  const set = (k, v) => setD((s) => ({ ...s, [k]: v }));

  const validateStep = () => {
    if (step === 0) {
      if (!d.name.trim()) return "Your name is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return "Enter a valid email address";
    }
    if (step === 1) {
      if (!d.org.trim()) return "Company / workspace name is required";
    }
    if (step === 2) {
      if (d.password.length < 8) return "Password must be at least 8 characters";
      if (d.password !== d.confirm) return "Passwords don't match";
    }
    return "";
  };

  const next = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => { setError(""); setStep((s) => Math.max(s - 1, 0)); };

  const submit = async (e) => {
    e.preventDefault();
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(""); setBusy(true);
    try {
      await signup({
        name: d.name.trim(),
        email: d.email.trim(),
        password: d.password,
        designation: d.designation.trim() || null,
        org: d.org.trim(),
        website: d.website.trim() || null,
      });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Couldn't create your account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card rise" style={{ maxWidth: 460 }}>
        <div className="brand-mark" style={{ marginBottom: 14 }}><Icon name="rocket" size={18} /></div>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Step {step + 1} of {STEPS.length} · {STEPS[step]}</div>
        <h1>Create your Founder account</h1>
        <p className="muted" style={{ margin: "0 0 22px", fontSize: 14 }}>
          We'll set up your ValidationCrew builder workspace.
        </p>

        <div className="row gap-2" style={{ marginBottom: 22 }}>
          {STEPS.map((_, i) => (
            <span key={i} style={{
              flex: 1, height: 4, borderRadius: 4,
              background: i <= step ? "var(--accent)" : "var(--border)",
              transition: "background .2s",
            }} />
          ))}
        </div>

        {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={step === STEPS.length - 1 ? submit : (e) => { e.preventDefault(); next(); }} className="col gap-4">
          {step === 0 && (
            <>
              <div className="fld">
                <label>Full name</label>
                <input className="fin" value={d.name} onChange={e => set("name", e.target.value)} placeholder="Aarav Mehta" required autoFocus />
              </div>
              <div className="fld">
                <label>Job title <span className="faint">(optional)</span></label>
                <input className="fin" value={d.designation} onChange={e => set("designation", e.target.value)} placeholder="Founder & CEO" />
              </div>
              <div className="fld">
                <label>Email</label>
                <input className="fin" type="email" value={d.email} onChange={e => set("email", e.target.value)} placeholder="you@company.com" required />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="fld">
                <label>Company / workspace name</label>
                <input className="fin" value={d.org} onChange={e => set("org", e.target.value)} placeholder="Acme Foods" required autoFocus />
              </div>
              <div className="fld">
                <label>Website <span className="faint">(optional)</span></label>
                <input className="fin" value={d.website} onChange={e => set("website", e.target.value)} placeholder="acmefoods.com" />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="fld">
                <label>Password</label>
                <input className="fin" type="password" value={d.password} onChange={e => set("password", e.target.value)} placeholder="At least 8 characters" required autoFocus />
              </div>
              <div className="fld">
                <label>Confirm password</label>
                <input className="fin" type="password" value={d.confirm} onChange={e => set("confirm", e.target.value)} placeholder="••••••••" required />
              </div>
            </>
          )}

          <div className="row gap-3" style={{ marginTop: 4 }}>
            {step > 0 && <Btn variant="ghost" onClick={back} type="button">Back</Btn>}
            {step < STEPS.length - 1 ? (
              <Btn variant="primary" type="submit" block>Continue</Btn>
            ) : (
              <Btn variant="primary" type="submit" block disabled={busy}>{busy ? "Creating account…" : "Create account"}</Btn>
            )}
          </div>
        </form>

        <p className="faint" style={{ marginTop: 18, fontSize: 12.5 }}>
          Already have an account? <a href="/login">Sign in</a>
        </p>
      </div>
    </div>
  );
}
