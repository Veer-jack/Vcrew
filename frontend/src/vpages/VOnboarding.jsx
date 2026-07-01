import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrandLogoFull } from "../components/BrandMark";
import Icon from "../components/Icon";
import { Btn } from "../components/ui";
import { vapi } from "../vapi/client";
import { useVAuth } from "../vcontext/VAuthContext";

const STEPS = [
  { key: "personal", label: "About you" },
  { key: "expertise", label: "Your expertise" },
  { key: "availability", label: "Availability" },
];

const SPECIALTIES = [
  "Product & UX", "Mobile apps", "Web apps", "SaaS / B2B",
  "E-commerce", "Fintech", "Healthcare", "Food & Beverage",
  "Consumer goods", "Gaming", "Education", "AI tools",
  "Marketing & Ads", "Hardware / Physical", "Other",
];

const LANGUAGES = ["English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam", "Bengali", "Marathi", "Other"];

const HOURS = ["< 2 hrs/week", "2–5 hrs/week", "5–10 hrs/week", "10+ hrs/week"];

const DEVICES = ["Android phone", "iPhone", "Windows PC", "Mac", "iPad / Tablet", "Smart TV"];

export default function VOnboarding() {
  const navigate = useNavigate();
  const { refresh } = useVAuth();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [d, setD] = useState({
    // Personal
    handle: "",
    city: "",
    language: new Set(),
    bio: "",
    // Expertise
    specialties: new Set(),
    // Availability
    hours: "",
    devices: new Set(),
  });

  const patch = (p) => setD(prev => ({ ...prev, ...p }));
  const toggleSet = (key, val) => setD(prev => {
    const s = new Set(prev[key]);
    s.has(val) ? s.delete(val) : s.add(val);
    return { ...prev, [key]: s };
  });

  const isValid = () => {
    if (step === 0) return d.handle.trim().length >= 3 && d.city.trim().length >= 2;
    if (step === 1) return d.specialties.size >= 1;
    if (step === 2) return d.hours && d.devices.size >= 1;
    return true;
  };

  const finish = async () => {
    setBusy(true);
    setError("");
    try {
      await vapi.patch("/v/profile", {
        handle: d.handle.trim(),
        city: d.city.trim(),
        bio: d.bio.trim(),
        languages: [...d.language],
        specialties_json: JSON.stringify([...d.specialties]),
        hours_per_week: d.hours,
        devices: [...d.devices],
      });
      await refresh();
      navigate("/validator", { replace: true });
    } catch (err) {
      setError(err.message || "Couldn't save profile");
      setBusy(false);
    }
  };

  const goNext = async () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      await finish();
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "grid", gridTemplateColumns: "280px 1fr" }}>
      {/* Left rail */}
      <aside style={{ background: "var(--panel)", borderRight: "1px solid var(--border)", padding: "32px 24px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: 40 }}>
          <BrandLogoFull height={48} />
        </div>
        <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: "var(--text-faint)", textTransform: "uppercase" }}>Setup</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {STEPS.map((s, i) => {
            const state = i < step ? "done" : i === step ? "active" : "upcoming";
            return (
              <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: "var(--radius-sm)", background: state === "active" ? "var(--accent-weak)" : "transparent" }}>
                <span style={{
                  width: 26, height: 26, borderRadius: "50%", display: "grid", placeItems: "center",
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                  background: state === "done" ? "var(--success)" : state === "active" ? "var(--accent)" : "var(--panel-inset)",
                  color: state === "done" || state === "active" ? "#fff" : "var(--text-faint)",
                  border: `1.5px solid ${state === "done" ? "var(--success)" : state === "active" ? "var(--accent)" : "var(--border)"}`,
                }}>
                  {state === "done" ? <Icon name="check" size={13} /> : i + 1}
                </span>
                <span style={{ fontSize: 13.5, fontWeight: state === "active" ? 700 : 500, color: state === "upcoming" ? "var(--text-faint)" : "var(--text)" }}>{s.label}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: "auto", padding: "16px 12px", background: "var(--success-weak)", borderRadius: "var(--radius)", border: "1px solid color-mix(in srgb, var(--success) 25%, transparent)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--success)", marginBottom: 4 }}>🎉 Account created!</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>Complete your profile to start getting matched to missions and earning rewards.</div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: 560 }} className="rise">

          {/* Step 0 — Personal */}
          {step === 0 && (
            <>
              <div style={{ marginBottom: 28 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Step 1 of 3</div>
                <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 800 }}>Tell us about yourself</h2>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 15 }}>This helps founders know who's testing their product.</p>
              </div>

              <div className="fld">
                <label>Your handle <span style={{ color: "var(--danger)" }}>*</span></label>
                <div className="inw has-pre">
                  <span className="pre">@</span>
                  <input className="fin" placeholder="yourhandle" value={d.handle} onChange={e => patch({ handle: e.target.value.toLowerCase().replace(/\s/g, "") })} />
                </div>
                <p className="fhint">Visible to builders. No spaces, lowercase only.</p>
              </div>

              <div className="fld">
                <label>City / Location <span style={{ color: "var(--danger)" }}>*</span></label>
                <input className="fin" placeholder="e.g. Bengaluru, Mumbai, Remote" value={d.city} onChange={e => patch({ city: e.target.value })} />
              </div>

              <div className="fld">
                <label>Languages you're comfortable in</label>
                <div className="chips" style={{ marginTop: 8 }}>
                  {LANGUAGES.map(l => (
                    <button key={l} className={`chip ${d.language.has(l) ? "on" : ""}`} onClick={() => toggleSet("language", l)}>
                      <span className="ck"><Icon name="check" size={10} /></span>{l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fld">
                <label>Short bio <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>optional</span></label>
                <textarea className="fin" rows={3} placeholder="e.g. Product designer with 4 years experience. I use 10+ apps daily and love finding UX issues others miss." value={d.bio} onChange={e => patch({ bio: e.target.value })} />
              </div>
            </>
          )}

          {/* Step 1 — Expertise */}
          {step === 1 && (
            <>
              <div style={{ marginBottom: 28 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Step 2 of 3</div>
                <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 800 }}>What's your area of expertise?</h2>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 15 }}>We use this to match you to missions that fit your background. Pick all that apply.</p>
              </div>

              <div className="fld">
                <label>Specialties <span style={{ color: "var(--danger)" }}>*</span> <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>— pick at least one</span></label>
                <div className="chips" style={{ marginTop: 8 }}>
                  {SPECIALTIES.map(s => (
                    <button key={s} className={`chip ${d.specialties.has(s) ? "on" : ""}`} onClick={() => toggleSet("specialties", s)}>
                      <span className="ck"><Icon name="check" size={10} /></span>{s}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ padding: "14px 16px", background: "var(--accent-weak)", borderRadius: "var(--radius)", border: "1px solid color-mix(in srgb,var(--accent) 20%,transparent)", fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
                <Icon name="sparkles" size={14} style={{ marginRight: 8 }} />
                The more specific you are, the better missions you'll be matched to — including higher-paying expert missions.
              </div>
            </>
          )}

          {/* Step 2 — Availability */}
          {step === 2 && (
            <>
              <div style={{ marginBottom: 28 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Step 3 of 3</div>
                <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 800 }}>Availability & devices</h2>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 15 }}>Helps us send you the right amount of missions on the right platforms.</p>
              </div>

              <div className="fld">
                <label>How much time can you commit per week? <span style={{ color: "var(--danger)" }}>*</span></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                  {HOURS.map(h => (
                    <button key={h} onClick={() => patch({ hours: h })} style={{
                      padding: "14px 16px", borderRadius: "var(--radius-sm)", textAlign: "left", cursor: "pointer", transition: "all .13s",
                      border: `1.5px solid ${d.hours === h ? "var(--accent)" : "var(--border)"}`,
                      background: d.hours === h ? "var(--accent-weak)" : "var(--panel)",
                      fontWeight: d.hours === h ? 700 : 500, fontSize: 14,
                      color: d.hours === h ? "var(--accent)" : "var(--text)",
                    }}>{h}</button>
                  ))}
                </div>
              </div>

              <div className="fld">
                <label>Which devices do you have? <span style={{ color: "var(--danger)" }}>*</span></label>
                <div className="chips" style={{ marginTop: 8 }}>
                  {DEVICES.map(dv => (
                    <button key={dv} className={`chip ${d.devices.has(dv) ? "on" : ""}`} onClick={() => toggleSet("devices", dv)}>
                      <span className="ck"><Icon name="check" size={10} /></span>{dv}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && <p style={{ color: "var(--danger)", fontSize: 13, margin: "8px 0" }}>{error}</p>}

          {/* Navigation */}
          <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
            {step > 0 && (
              <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)} style={{ flex: 1 }}>
                <Icon name="arrowLeft" size={15} /> Back
              </button>
            )}
            <Btn variant="primary" style={{ flex: 2, justifyContent: "center" }} disabled={!isValid() || busy} onClick={goNext}>
              {busy ? "Saving…" : step === STEPS.length - 1 ? "Complete setup →" : "Continue →"}
            </Btn>
          </div>

          {step === 0 && (
            <p style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "var(--text-faint)" }}>
              Takes about 2 minutes · You can update this anytime in Settings
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
