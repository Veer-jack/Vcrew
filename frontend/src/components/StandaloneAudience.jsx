import React from 'react';
import { useTranslation } from '../i18n/index.jsx';
import { useMeta } from '../context/MetaContext';
import { useAudienceReach } from '../data/personaConfig';
import Icon from './Icon';
import { BrandLogoFull } from './BrandMark';
import { Field, Chips, FSection, ProfileChips, LocationFields, SelectAllToggle } from './OnboardingFields';
import AudienceResults from './AudienceResults';

export default function StandaloneAudience({ d, set, region, roleName, onSkip, onSubmit, onValidate, showErrors, issue, error, busy }) {
  const { t } = useTranslation();
  const { filters } = useMeta();
  const { reach, firstLoad } = useAudienceReach(d);
  const [viewState, setViewState] = React.useState("form");

  React.useEffect(() => {
    if (showErrors && issue) {
      setTimeout(() => setViewState("form"), 0);
    }
  }, [showErrors, issue]);

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top Navbar */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", background: "rgba(248, 250, 252, 0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <BrandLogoFull height={28} />
          {roleName && (
            <div className="pill" style={{ background: "#ffffff", border: "1px solid var(--border)", fontWeight: 600, color: "var(--text)", padding: "4px 12px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", display: "inline-block", marginRight: 6 }} />
              {roleName}
            </div>
          )}
        </div>
        <button type="button" className="btn" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-strong)", fontWeight: 600 }} onClick={onSkip}>
          {t("actions.skipForNow", null, "Skip")}
        </button>
      </div>

      {/* Main Content */}
      {viewState === "results" ? (
        <AudienceResults d={d} reach={reach} onBack={() => setViewState("form")} onCreate={onSubmit} busy={busy} />
      ) : (
        <div style={{ flex: 1, padding: "16px 32px 64px" }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
          
          {error && (
            <div className="err-banner" style={{ marginBottom: 24 }}>
              {error}
            </div>
          )}
          
          {/* Header */}
          <div style={{ marginBottom: 40, textAlign: "center" }}>
            <p className="faint" style={{ textTransform: "uppercase", letterSpacing: "1.5px", fontSize: 11, fontWeight: 700, marginBottom: 16 }}>
              {t("matchingEngine.label", null, "The matching engine")}
            </p>
            <h1 style={{ fontSize: 48, fontWeight: 800, margin: "0 0 16px 0", letterSpacing: "-0.03em", color: "var(--text-strong)" }}>
              {t("matchingEngine.title", null, "Let's find the right people")}
            </h1>
            <p className="muted" style={{ fontSize: 16, lineHeight: 1.5, maxWidth: 640, margin: "0 auto" }}>
              {t("matchingEngine.desc", null, "Tell us whose opinion matters. Your reach updates live as you go — the sharper you are, the higher the signal.")}
            </p>
          </div>

          {/* 2-column Layout */}
          <div style={{ display: "flex", gap: 64, alignItems: "flex-start" }}>
            
            {/* Left Col: Filters */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 32 }}>

              {reach === 0 && (
                <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", padding: "16px 20px", borderRadius: 8, color: "#b45309", display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <Icon name="alertTriangle" size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.5 }}>
                    No validators match this audience right now — we'll notify you the moment a matching validator joins.
                  </div>
                </div>
              )}

              <div>
                <FSection label="Validator Type" action={<SelectAllToggle options={["Validator", "Tester", "User"]} value={d.validatorType} onChange={(v) => set("validatorType", v)} />} />
                <Chips options={["Validator", "Tester", "User"]} value={d.validatorType} onChange={(v) => set("validatorType", v)} />
              </div>

              <div>
                <FSection label="Demographic filters" />
                <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 24 }}>
                  <Field label={t("onboardingFields.age", null, "Age")} required invalid={showErrors && (!d.ageBands || d.ageBands.length === 0)} dataField="ageBands" issue={issue} action={<SelectAllToggle options={filters.Demographics?.Age || ["Under 18", "18–24", "25–34", "35–44", "45–54", "55–64", "65+"]} value={d.ageBands} onChange={(v) => set("ageBands", v)} />}>
                    <Chips options={filters.Demographics?.Age || ["Under 18", "18–24", "25–34", "35–44", "45–54", "55–64", "65+"]} value={d.ageBands} onChange={(v) => set("ageBands", v)} />
                  </Field>
                  <Field label={t("onboardingFields.gender", null, "Gender")} required invalid={showErrors && (!d.genders || d.genders.length === 0)} dataField="genders" issue={issue} action={<SelectAllToggle options={filters.Demographics?.Gender || ["Any", "Female", "Male", "Non-binary", "Prefer not to say"]} value={d.genders} onChange={(v) => set("genders", v)} />}>
                    <Chips options={filters.Demographics?.Gender || ["Any", "Female", "Male", "Non-binary", "Prefer not to say"]} value={d.genders} onChange={(v) => set("genders", v)} />
                  </Field>
                </div>
              </div>
              
              <div>
                <FSection label={t("onboarding.locationSection", null, "Location")} invalid={showErrors && (!d.country || d.country.length === 0)} dataField="country" issue={issue} />
                <LocationFields region={region} d={d} set={set} withCity />
              </div>

              <ProfileChips d={d} set={set} region={region} occOptions={filters.Professional} eduOptions={filters.Demographics?.Education} show={{ occupation: true, education: true }} showErrors={showErrors} issue={issue} requireOccupation />

              <div>
                <FSection label="Income range (annual)" action={<SelectAllToggle options={["Under Rs2.5L", "Rs2.5L–5L", "Rs5L–10L", "Rs10L–20L", "Rs20L–50L", "Above Rs50L"]} value={d.income} onChange={(v) => set("income", v)} />} />
                <Chips options={["Under Rs2.5L", "Rs2.5L–5L", "Rs5L–10L", "Rs10L–20L", "Rs20L–50L", "Above Rs50L"]} value={d.income} onChange={(v) => set("income", v)} />
              </div>

              <div>
                <FSection label="Languages (optional)" action={<SelectAllToggle options={["Hindi", "English", "Tamil", "Telugu", "Kannada", "Bengali", "Marathi", "Gujarati", "Malayalam", "Punjabi"]} value={d.languages} onChange={(v) => set("languages", v)} />} />
                <Chips options={["Hindi", "English", "Tamil", "Telugu", "Kannada", "Bengali", "Marathi", "Gujarati", "Malayalam", "Punjabi"]} value={d.languages} onChange={(v) => set("languages", v)} />
                <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 16, margin: "12px 0 0 0" }}>Not yet tracked on validator profiles — doesn't affect the match count.</p>
              </div>

              <div>
                <FSection label={t("onboardingFields.interests", null, "Interests")} action={<SelectAllToggle options={["AI", "Startups", "Fitness", "Healthcare", "Education", "Finance", "Gaming", "Parenting", "Travel", "Fashion", "Food", "Sustainability"]} value={d.interests} onChange={(v) => set("interests", v)} />} />
                <Chips options={["AI", "Startups", "Fitness", "Healthcare", "Education", "Finance", "Gaming", "Parenting", "Travel", "Fashion", "Food", "Sustainability"]} value={d.interests} onChange={(v) => set("interests", v)} />
              </div>

              <div>
                <FSection label="Scale requirements" />
                <div style={{ marginTop: 24 }}>
                  <Field label="How many participants are typically needed?" invalid={showErrors && !d.sampleSize} dataField="sampleSize" issue={issue}>
                    <Chips options={["50–100", "100–500", "500–1000", "1000–5000", "5000+"]} value={d.sampleSize} onChange={(v) => set("sampleSize", v)} multi={false} hideCheck />
                  </Field>
                </div>
              </div>
            </div>

            {/* Right Col: Precision Card */}
            <div style={{ width: 380, flexShrink: 0, position: "sticky", top: 100 }}>
              <div className="card" style={{ padding: 24, background: "linear-gradient(145deg, #f0f5ff 0%, #ffffff 100%)", border: "1px solid #eef2ff", borderRadius: 16, boxShadow: "0 8px 30px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 24 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: "#ffffff", border: "1px solid #eef2ff", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                    <Icon name="users" size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, color: "#0f172a" }}>
                      {firstLoad ? "—" : reach.toLocaleString("en-US")}
                    </div>
                    <div style={{ fontSize: 13, marginTop: 6, color: "#64748b" }}>
                      {t("matchingEngine.matchText", null, "people match right now")}
                    </div>
                  </div>
                </div>

                <div style={{ height: 6, width: 16, background: "var(--accent)", borderRadius: 3, marginBottom: 24 }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#475569" }}>Match precision</span>
                  <span style={{ background: "#dcfce7", color: "#059669", padding: "4px 12px", borderRadius: 16, fontSize: 13, fontWeight: 600 }}>Precise</span>
                </div>

                <button type="button" className="btn btn-primary" style={{ width: "100%", padding: "12px 16px", fontSize: 15, fontWeight: 600, borderRadius: 8 }} onClick={() => {
                  if (onValidate && !onValidate()) return;
                  setViewState("results");
                }}>
                  {t("matchingEngine.findBtn", null, "Find my people →")}
                </button>

                <div style={{ display: "flex", gap: 12, marginTop: 16, color: "#94a3b8", alignItems: "flex-start" }}>
                  <Icon name="shieldCheck" size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                    {t("matchingEngine.privacyText", null, "We invite matched people on your behalf — you never see their personal data.")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
