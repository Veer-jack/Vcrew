import { useState, useEffect } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { useSearchParams, Navigate, useNavigate } from "react-router-dom";

import { BrandLogoFull } from "../components/BrandMark";
import Icon from "../components/Icon";
import { Btn } from "../components/ui";
import { vapi } from "../vapi/client";
import { useVAuth } from "../vcontext/VAuthContext";
import useUnsavedChangesWarning from "../hooks/useUnsavedChangesWarning";
import { useTranslation } from "../i18n/index.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { SelectAllToggle } from "../components/OnboardingFields.jsx";
import { FilterGroup } from "../pages/CreateMissionWizard";
import countryRegionData from "country-region-data/data.json";

const COUNTRY_NAMES = countryRegionData.map(c => c.countryName).sort((a, b) => a.localeCompare(b));
const REGIONS_BY_COUNTRY = Object.fromEntries(countryRegionData.map(c => [c.countryName, c.regions.map(r => r.name)]));
// Lets State be picked before Country (Profile's address block wants that
// order) and still resolve which country it belongs to -- first country
// wins for the rare state/province name that exists in more than one
// country, since there's no other signal yet to disambiguate.
const COUNTRY_BY_STATE = {};
for (const c of countryRegionData) for (const r of c.regions) if (!(r.name in COUNTRY_BY_STATE)) COUNTRY_BY_STATE[r.name] = c.countryName;
const ALL_STATE_NAMES = Object.keys(COUNTRY_BY_STATE).sort((a, b) => a.localeCompare(b));

function isEmptyDraftValue(v) {
  return v === "" || v === undefined || v === null || (Array.isArray(v) && v.length === 0);
}

// `backfill` (used only for the per-role onboarding drafts, to fill in
// already-saved validator data) is applied on top of whatever draft comes
// back -- stored or default -- so it still works even for a draft that
// already exists in localStorage but was never actually filled in (e.g.
// this exact key got persisted blank on an earlier visit, since the persist
// effect below writes on every mount, not just on an actual edit). Only
// fields still empty in the resolved draft get backfilled, so anything the
// user has genuinely typed is never touched.
function useDraft(key, defaultState, backfill) {
  const [val, setVal] = useState(() => {
    let base = defaultState;
    try {
      const stored = localStorage.getItem(key);
      if (stored) base = JSON.parse(stored);
    } catch { /* ignore */ }
    if (backfill && base && typeof base === "object") {
      const merged = { ...base };
      for (const k in backfill) {
        if (isEmptyDraftValue(merged[k]) && !isEmptyDraftValue(backfill[k])) merged[k] = backfill[k];
      }
      return merged;
    }
    return base;
  });
  useEffect(() => {
    if (val === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(val));
  }, [val, key]);
  return [val, setVal];
}

export const TYPES = [
  { key: "user", icon: "users", title: "User", tagline: "I use everyday products", desc: "Perfect for testing physical products, food, packaging, fashion, and consumer apps. No tech experience needed.", color: "#059669", bg: "var(--success-weak)", missions: "Surveys, taste tests, packaging reviews, lifestyle products" },
  { key: "validator", icon: "shield", title: "Validator", tagline: "I have professional expertise", desc: "For professionals, domain experts, and tech-savvy users who can evaluate apps, SaaS products, and digital experiences.", color: "#4f46e5", bg: "var(--accent-weak)", missions: "App testing, UX evaluation, SaaS reviews, expert feedback" },
  { key: "tester", icon: "star", title: "Verified Tester", tagline: "I have QA / product testing experience", desc: "For experienced testers and researchers. Submit your resume or LinkedIn for admin verification. Access premium high-pay missions.", color: "#d97706", bg: "var(--warning-weak)", missions: "Premium missions, complex testing, research studies", badge: "Admin verified 72hr review" },
];

export const LANGUAGES = ["English","Hindi","Tamil","Telugu","Kannada","Malayalam","Bengali","Marathi","Gujarati","Punjabi","Odia","Urdu","Other"];
export const DEVICES = ["Android phone","iPhone","Windows PC","Mac","iPad / Tablet","Smart TV","Smartwatch"];
export const HOURS = ["< 2 hrs/week","2-5 hrs/week","5-10 hrs/week","10+ hrs/week"];
export const AGE_GROUPS = ["Under 18","18-24","25-34","35-44","45-54","55-64","65+"];
export const GENDERS = ["Male","Female","Prefer not to say"];
export const INCOME = ["Under Rs2.5L","Rs2.5L-5L","Rs5L-10L","Rs10L-20L","Rs20L-50L","Above Rs50L","Prefer not to say"];
export const HEIGHT = ["Under 5ft","5ft-5ft3in","5ft4in-5ft7in","5ft8in-5ft11in","6ft and above"];
export const WEIGHT = ["Under 45kg","45-55kg","56-65kg","66-75kg","76-90kg","91-105kg","Above 105kg"];
export const SKIN_TONE = ["Fair","Wheatish","Medium","Dusky","Dark"];
export const HAIR_TYPE = ["Straight","Wavy","Curly","Coily","Chemically treated"];
export const HAIR_LENGTH = ["Bald/Very short","Short","Medium","Long","Very long"];
export const BODY_TYPE = ["Slim/Lean","Athletic","Average","Curvy","Plus size","Prefer not to say"];
export const OCCUPATIONS = ["Student","Homemaker","Working professional","Self-employed","Business owner","Retired","Other"];
export const FOOD_PREF = ["Vegetarian","Eggetarian","Non-vegetarian","Vegan","Jain","No preference"];
export const LIFESTYLE = ["Fitness","Yoga","Outdoor activities","Cooking","Travel","Gaming","Reading","Music","Fashion","Parenting","Pets","Tech","Cinema","Sports","Social media"];
export const ROLES = ["Product Manager","UX / UI Designer","Software Engineer","Data Scientist","QA / Test Engineer","DevOps","Founder","CXO","Business Analyst","Consultant","Marketer","Content Creator","Sales","Customer Success","Doctor","Lawyer","Finance","HR","Teacher","Researcher","Freelancer","Student","Other"];
export const EXP = ["0-1 year","1-3 years","3-7 years","7-12 years","12+ years"];
export const INDUSTRIES = ["SaaS / B2B Software","Fintech","Healthcare","EdTech","E-commerce","FMCG","Automotive","Real Estate","Media","Gaming","AI / ML","Logistics","Manufacturing","Government","Non-profit","Other"];
export const PRODUCT_TYPES = ["Mobile apps iOS","Mobile apps Android","Web apps / SaaS","AI / LLM products","Fintech products","Healthcare apps","E-commerce","Developer tools","Enterprise software","Consumer apps","Physical products","Packaging","Marketing campaigns","Websites","Games"];
export const TECH_TOOLS = ["Figma","Sketch","Notion","JIRA","Postman","Selenium","VS Code","Git","SQL","Python","JavaScript","React","Node.js","AWS","Docker","Tableau","Salesforce","Google Analytics","Excel"];
export const TESTER_DOMAINS = ["Mobile app testing","Web app testing","API testing","Performance testing","Security testing","Accessibility testing","UX research","AI product evaluation","Cross-browser testing","Regression testing","Exploratory testing","Physical product evaluation","Market research","Other"];
export const CERT = ["ISTQB Foundation","ISTQB Advanced","AWS Certified","Google UX Design","Scrum / Agile","Six Sigma","PMP","None","Other"];

// Per-type step labels, used by the left rail (built once you've picked a
// type) instead of each onboarding sub-form drawing its own horizontal
// progress bar at the top of the content -- the tester's explicit ask was
// a left-side rail you can jump around in, matching the builder wizard's
// own StepRail, not a bar you can only watch.
  tester: [
    ["aboutYou", "About you"], ["verification", "Verification"], ["experience", "Experience"],
    ["professional", "Professional"], ["devices", "Devices"], ["interests", "Interests"], ["rewards", "Rewards"]
  ]
};

    ["aboutYou", "About you"], ["verification", "Verification"], ["background", "Background"],
    ["expertise", "Expertise"], ["interests", "Interests"], ["participation", "Participation"], ["rewards", "Rewards"]
  ],
  tester: [
    ["personalDetails", "Personal details"], ["experienceVerified", "Experience verified"],
    ["testingExperience", "Testing experience"], ["testingAreas", "Testing areas"],
    ["professionalInfo", "Professional info"], ["devicesAdded", "Devices added"],
    ["interests", "Interests"], ["rewardSet", "Reward set"]
  ],
};
export const stepLabelsFor = (t, type) => (STEP_DEFS[type] || []).map(([k, fb]) => t(`vOnboarding.steps.${k}`, null, fb));
// validator step set rather than replacing "Proof"/"Declaration" 1:1.
const SETTINGS_STEP_DEFS = {
  user: [["basicInfo", "Basic info"], ["demographics", "Demographics"], ["physicalProfile", "Physical profile"], ["lifestyle", "Lifestyle"]],
  validator: [["basicInfo", "Basic info"], ["professional", "Professional"], ["expertise", "Expertise"], ["availability", "Availability"]],
};
export const settingsStepsFor = (type, hasTesterFields) => {
  const base = SETTINGS_STEP_DEFS[type === "user" ? "user" : "validator"];
  return hasTesterFields ? [...base, ["verification", "Verification"]] : base;
};

export const optLabel = (t, ns) => (o, i) => t(`vOnboarding.options.${ns}.${i}`, null, o);

export const Chips = ({ options, value, onChange, multi = true, getLabel }) => (
  <div className="chips" style={{ marginTop: 8 }}>
    {options.map((o, i) => {
      const on = multi ? (Array.isArray(value) ? value.includes(o) : false) : value === o;
      return (
        <button key={o} type="button" className={"chip " + (on ? "on" : "")} onClick={() => {
          if (multi) { const arr = Array.isArray(value) ? value : []; onChange(on ? arr.filter(x => x !== o) : [...arr, o]); }
          else { onChange(on ? "" : o); }
        }}>
          <span className={"ck" + (multi ? "" : " radio")}><Icon name="check" size={10} /></span>{getLabel ? getLabel(o, i) : o}
        </button>
export default function VOnboardingLayout({ roleName, color, steps, currentStep, maxReached, onJump, onBack, onSkip, onNext, formId, nextDisabled, nextLabel, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f8fafc", "--accent": color }}>
);

export const Field = ({ label, required, hint, info, action, children }) => (
  <div className="fld" style={{ marginBottom: 24 }}>
    <div className="row between" style={{ alignItems: "center" }}>
      <label>{label}{required && <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>}
        {info && <Icon name="info" size={13} style={{ verticalAlign: -2, marginLeft: 5, color: "var(--text-faint)", cursor: "help" }} title={info} />}
      </label>
      {action}
    </div>
    {children}
    {hint && <p className="fhint">{hint}</p>}
export const Field = ({ label, required, hint, info, action, children, invalid }) => (
  <div className={`fld${invalid ? " fld-invalid" : ""}`} style={{ marginBottom: 24 }}>
    <div className="row between" style={{ alignItems: "center", marginBottom: 8 }}>
      <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{label}{required && <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>}
        {info && <Icon name="info" size={13} style={{ verticalAlign: -2, marginLeft: 5, color: "var(--text-faint)", cursor: "help" }} title={info} />}
      </label>
      {action}
    </div>
    {children}
    {invalid && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 4, fontWeight: 500 }}>Please fill this required field.</p>}
    {hint && <p className="fhint">{hint}</p>}
  </div>
);
  const [activeIndex, setActiveIndex] = useState(0);
  const filtered = query.trim() ? options.filter(o => o.toLowerCase().includes(query.trim().toLowerCase())) : options;

  const commit = (v) => { onChange(v); setQuery(""); setOpen(false); };

  return (
    <div style={{ position: "relative" }}>
      <input
        className="fin"
        style={{ paddingRight: 36 }}
        value={open ? query : (value || "")}
        placeholder={placeholder}
        onFocus={() => { setOpen(true); setQuery(""); setActiveIndex(0); }}
        onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => {
          if (!open) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
          else if (e.key === "Enter") { e.preventDefault(); if (filtered[activeIndex]) commit(filtered[activeIndex]); }
          else if (e.key === "Escape") { setQuery(""); setOpen(false); }
        placeholder={placeholder}
        onFocus={() => { setOpen(true); setQuery(""); setActiveIndex(0); }}
        onClick={() => { setOpen(true); }}
        onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
          that rule doesn't apply, and a selected value with no dropdown
          affordance at all reads as just a text field, not a select. */}
      <Icon name="chevronDown" size={14} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", pointerEvents: "none" }} />
      {open && (
        <div className="scroll-hover" style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50, maxHeight: 260, overflowY: "auto",
          background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)", padding: 6,
        }}>
          {filtered.length === 0 && <div className="muted" style={{ padding: "8px 10px", fontSize: 13 }}>{placeholder}</div>}
          {filtered.map((o, i) => (
            <div key={o} className="menu-item" onMouseDown={e => e.preventDefault()} onClick={() => commit(o)}
              style={{
                padding: "8px 10px", cursor: "pointer", borderRadius: "var(--radius-sm)", fontSize: 13.5,
                background: i === activeIndex ? "var(--accent-weak)" : "transparent",
                color: o === value ? "var(--accent)" : "var(--text)", fontWeight: o === value ? 700 : 500,
              }}>
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Country drives which State/Region dropdown shows -- most countries have a
// known region list (country-region-data), so State stays a dropdown; a
// country without one (or "Other") falls back to free text instead of an
// empty dropdown. Both levels also carry an "Other" option for anything the
// list is missing, revealing a plain text field for that custom entry --
// same pattern PersonalFields above already uses for job title/designation.
export function CountryStateFields({ d, set, stateFirst = false, withCity = false }) {
  const { t } = useTranslation();
// same pattern PersonalFields above already uses for job title/designation.
export function CountryStateFields({ d, set, stateFirst = false, withCity = false, showErrors = false }) {
  const { t } = useTranslation();
  const hasState = d.state && d.state !== otherLabel;
  // City options come from the backend (see routes/geo.js) -- a real
  // per-country-per-state city list is a multi-MB dataset, much bigger than
  // the country/state lists bundled into the frontend, so it's fetched on
  // demand instead of shipped to every page load. An empty result (country/
  // state combo not covered, or a rare name mismatch between this and the
  // country/state data source) is exactly the signal to fall back to free
  // text -- same "no data, so it's just an input" pattern State already
  // uses when a country has no known regions.
"export function CountryStateFields({ d, set, stateFirst = false, withCity = false, showErrors = false }) {\n  const { t } = useTranslation();\n  const otherLabel = t(\"onboardingFields.other\", null, \"Other\");\n  const hasCountry = d.country && d.country !== otherLabel;\n  const hasState = d.state && d.state !== otherLabel;\n  // City options come from the backend (see routes/geo.js) -- a real\n  // per-country-per-state city list is a multi-MB dataset, much bigger than\n  // the country/state lists bundled into the frontend, so it's fetched on\n  // demand instead of shipped to every page load. An empty result (country/\n  // state combo not covered, or a rare name mismatch between this and the\n  // country/state data source) is exactly the signal to fall back to free\n  // text -- same \"no data, so it's just an input\" pattern State already\n  // uses when a country has no known regions.\n  const [cityOptions, setCityOptions] = useState([]);\n  const [cityLoading, setCityLoading] = useState(false);\n  useEffect(() => {\n    // eslint-disable-next-line react-hooks/set-state-in-effect\n    if (!withCity || !hasCountry || !hasState) { setCityOptions([]); return; }\n    let cancelled = false;\n    setCityLoading(true);\n    fetch(`/api/geo/cities?country=${encodeURIComponent(d.country)}&state=${encodeURIComponent(d.state)}`)\n      .then(r => r.json())\n      .then(data => { if (!cancelled) setCityOptions(data.cities || []); })\n      .catch(() => { if (!cancelled) setCityOptions([]); })\n      .finally(() => { if (!cancelled) setCityLoading(false); });\n    return () => { cancelled = true; };\n  }, [withCity, hasCountry, hasState, d.country, d.state]);\n  // No country picked yet -- State still gets a real dropdown (the full,\n  // cross-country list) rather than falling back to free text, so it can\n  // be picked first; selecting one below then resolves Country via\n  // COUNTRY_BY_STATE instead of leaving it blank.\n  const regions = hasCountry ? (REGIONS_BY_COUNTRY[d.country] || []) : ALL_STATE_NAMES;\n  
<truncated 2380 bytes>
          // Only relevant for the cross-country list (no country chosen
          // yet) -- once a country's own region list is showing, every
          // option already belongs to it, nothing to resolve.
          if (!hasCountry && v !== otherLabel) {
            const inferred = COUNTRY_BY_STATE[v];
            if (inferred) set("country", inferred);
          }
        }} options={[...regions, otherLabel]} placeholder={t("onboardingFields.selectState", null, "Select state")} />
      ) : (
        <input className="fin" value={d.state || ""} onChange={e => { set("state", e.target.value); set("city", ""); }} placeholder={t("onboardingFields.stateRegionPlaceholder", null, "Karnataka")} />
      )}
    </Field>
  );
      ) : (
        <input className="fin" value={d.city || ""} onChange={e => set("city", e.target.value)} placeholder={t("onboardingFields.cityPlaceholder", null, "Bengaluru")} />
      )}
    </Field>
  );
  const cityOtherField = withCity && cityOptions.length > 0 && d.city === otherLabel && (
    <Field key="cityOther" label={t("onboardingFields.customCity", null, "Your city")}>
      <input className="fin" value={d.cityOther || ""} onChange={e => set("cityOther", e.target.value)} placeholder={t("onboardingFields.customCityPlaceholder", null, "Type your city")} />
    </Field>
  );
  return stateFirst
    ? <>{stateField}{stateOtherField}{countryField}{countryOtherField}{cityField}{cityOtherField}</>
    : <>{countryField}{countryOtherField}{stateField}{stateOtherField}{cityField}{cityOtherField}</>;
}

// Adapts a plain array field (onboarding's `d`/`set` shape) to FilterGroup's
// Set+title-keyed toggle API -- same adapter LocationFields above already
// uses for Country, applied here so Languages/Industry/Testing domains/
// Certifications get FilterGroup's real "Other" subsection (separate
// collapsible section with its own Select all + "Add other", multiple
// removable custom entries) instead of a bespoke lookalike. Once adopted,
// `value` already reflects exactly what's checked -- real options or
// custom entries -- with no separate resolve-at-submit step needed, and
// Select all/Clear all can no longer drop a custom entry since FilterGroup's
// own bulk actions already include the saved custom entries as targets.
export function filterGroupAdapter(value, key, set) {
  const arr = value || [];
  const sel = new Set(arr);
  return {
    sel,
    toggle: (_, o) => set(key, sel.has(o) ? arr.filter(x => x !== o) : [...arr, o]),
    onSelectAll: (targets) => set(key, targets.every(o => sel.has(o)) ? arr.filter(x => !targets.includes(x)) : [...new Set([...arr, ...targets])]),
  };
}

// Shared by the onboarding wizard's own goNext and Settings' saveDetails --
// having Settings duplicate this (like it already duplicated Chips/Field
// wholesale from this file) is exactly how it fell out of sync with
// onboarding's Other-handling in the first place. Chips fields store the
// raw "Other" option itself when picked, not the typed custom text --
// resolve those to what was actually typed (single-select) or strip the
// derived "Other" marker FilterGroup adds alongside a checked custom
// entry's own text (multi-select, see filterGroupAdapter) -- right before
// this reaches the backend.
export function resolveOnboardingOther(data, t) {
  const otherLabel = t("onboardingFields.other", null, "Other");
  const resolveSingle = (val, otherVal) => (val === "Other" ? (otherVal || "").trim() : val);
  const resolveMulti = (arr) => (arr || []).filter(v => v !== "Other");
  const patch = { country: data.country === otherLabel ? data.countryOther : data.country, state: data.state === otherLabel ? data.stateOther : data.state };
  if ("occupation" in data) patch.occupation = resolveSingle(data.occupation, data.occupationOther);
  if ("city" in data) patch.city = resolveSingle(data.city, data.cityOther);
  if ("language" in data) patch.language = resolveMulti(data.language);
  if ("industry" in data) patch.industry = resolveMulti(data.industry);
  if ("domains" in data) patch.domains = resolveMulti(data.domains);
  if ("certifications" in data) patch.certifications = resolveMulti(data.certifications);
  return { ...data, ...patch };
}

// currentType comes from the validator's own validator_type -- reached from
// Settings' "Apply for Verified Tester"/"Upgrade to Validator" links, which
}
  };
  return (
    <div className="rise" style={{ maxWidth: 600, margin: "0 auto", background: "var(--panel)", padding: "40px", borderRadius: 16, border: "1px solid var(--border)" }}>
      {step === 0 && (
// during a previous onboarding for this same role, or fields common across
// roles when switching to a new one. useDraft only ever falls back to this
// when no draft is already sitting in localStorage for the key, so a draft
// in progress is never clobbered. Mirrors the same DB-field reconstruction
// VSettings.jsx's edit form already does (occupation/industry/etc "Other"
// values aren't stored separately -- reconstruct by checking whether the
// saved value matches a known option).
export function validatorToDraft(validator) {
  if (!validator) return {};
  const savedOccupation = validator.occupation || "";
  const isCustomOccupation = savedOccupation && !OCCUPATIONS.includes(savedOccupation) && !ROLES.includes(savedOccupation);
  return {
    name: validator.name || "", handle: validator.handle || "", city: validator.city || "",
    country: validator.country || "", state: validator.state || "",
    language: validator.languages || [], languageOther: (validator.languages || []).filter(v => !LANGUAGES.includes(v)),
    age_group: validator.ageGroup || "", gender: validator.gender || "", marital: validator.marital || "",
    has_kids: validator.hasKids || "", income: validator.income || "", height: validator.height || "",
    weight: validator.weight || "", skin_tone: validator.skinTone || "", hair_type: validator.hairType || "",
    hair_length: validator.hairLength || "", body_type: validator.bodyType || "",
    occupation: isCustomOccupation ? "Other" : savedOccupation, occupationOther: isCustomOccupation ? savedOccupation : "",
    food_pref: validator.foodPref || "", lifestyle: validator.lifestyle || [], devices: validator.devices || [],
    hours: validator.hours || "", bio: validator.bio || "", experience: validator.experience || "",
    industry: validator.industry || [], industryOther: (validator.industry || []).filter(v => !INDUSTRIES.includes(v)),
    company: validator.company || "", product_types: validator.productTypes || [],
    tech_tools: validator.techTools || [], tools: validator.techTools || [],
    domains: validator.testingDomains || [], domainsOther: (validator.testingDomains || []).filter(v => !TESTER_DOMAINS.includes(v)),
    certifications: validator.certifications || [], certificationsOther: (validator.certifications || []).filter(v => !CERT.includes(v)),
    linkedin_url: validator.linkedinUrl || "", portfolio_url: validator.portfolioUrl || "", testing_bio: validator.testingBio || "",
  };
}

function UserOnboarding({ step, onNext, vid, validator }) {
  const { t } = useTranslation();
  const [d, setD] = useDraft(`VC_V_DRAFT_USER_${vid}`, { name: "", handle: "", city: "", country: "", countryOther: "", state: "", stateOther: "", language: [], languageOther: [], age_group: "", gender: "", marital: "", has_kids: "", income: "", height: "", weight: "", skin_tone: "", hair_type: "", hair_length: "", body_type: "", occupation: "", occupationOther: "", food_pref: "", lifestyle: [], devices: [], hours: "" }, validatorToDraft(validator));
  const set = (k, v) => setD(p => ({ ...p, [k]: v }));
  const valid = [d.name.trim() && d.handle.trim() && d.city.trim(), d.age_group && d.gender && d.income, d.height && d.weight && d.skin_tone && d.body_type, d.occupation && d.hours && d.devices.length > 0];
  return (
    <div className="rise" style={{ maxWidth: 600, margin: "0 auto" }}>
      {step === 0 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>{t("vOnboarding.headers.tellUsAboutYourself", null, "Tell us about yourself")}</h2><Field label={t("vOnboarding.fields.fullName", null, "Full name")} required><input className="fin" value={d.name} onChange={e => set("name", e.target.value)} placeholder={t("vOnboarding.placeholders.yourFullName", null, "Your full name")} /></Field><Field label={t("vOnboarding.fields.handle", null, "Handle")} required hint={t("vOnboarding.hints.lowercaseNoSpaces", null, "Lowercase, no spaces")} info={t("vOnboarding.hints.handleInfo", null, "Your unique @username on ValidationCrew — shown to builders on your profile and submissions.")}><div className="inw has-pre"><span className="pre">@</span><input className="fin" value={d.handle} onChange={e => set("handle", e.target.value.toLowerCase().replace(/\s/g,""))} placeholder={t("vOnboarding.placeholders.yourHandle", null, "yourhandle")} /></div></Field><Field label={t("vOnboarding.fields.city", null, "City")} required><input className="fin" value={d.city} onChange={e => set("city", e.target.value)} placeholder={t("vOnboarding.placeholders.cityMumbaiBengaluru", null, "e.g. Mumbai, Bengaluru")} /></Field><CountryStateFields d={d} set={set} /><FilterGroup title={t("vOnboarding.fields.languages", null, "Languages")} options={LANGUAGES.filter(o => o !== "Other")} {...filterGroupAdapter(d.language, "language", set)} otherEntries={d.languageOther} trFilterLabel={(_, v) => optLabel(t, "languages")(v, LANGUAGES.indexOf(v))} initialExpanded /><FilterGroup title={t("onboardingFields.other", null, "Other")} options={["Other"]} {...filterGroupAdapter(d.language, "language", set)} otherEntries={d.languageOther} onOtherEntriesChange={v => set("languageOther", v)} otherValue="Other" otherPlaceholder={t("createMission.otherGenericPlaceholder", { section: "language" }, "Add your own language value")} trFilterLabel={(_, v) => v} initialExpanded /></>)}
      {step === 1 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>{t("vOnboarding.headers.aboutYou", null, "About you")}</h2><Field label={t("vOnboarding.fields.ageGroup", null, "Age group")} required><Chips options={AGE_GROUPS} value={d.age_group} onChange={v => set("age_group", v)} multi={false} getLabel={optLabel(t, "ageGroups")} /></Field><Field label={t("vOnboarding.fields.gender", null, "Gender")} required><Chips options={GENDERS} value={d.gender} onChange={v => set("gender", v)} multi={false} getLabel={optLabel(t, "genders")} /></Field><Field label={t("vOnboarding.fields.maritalStatus", null, "Marital status")}><Chips options={["Single","Married","Divorced","Widowed","In a relationship"]} value={d.marital} onChange={v => set("marital", v)} multi={false} getLabel={optLabel(t, "marital")} /></Field><Field label={t("vOnboarding.fields.kids", null, "Kids?")}><Chips options={["Yes","No","Prefer not to say"]} value={d.has_kids} onChange={v => set("has_kids", v)} multi={false} getLabel={optLabel(t, "kids")} /></Field><Field label={t("vOnboarding.fields.income", null, "Income")} required><Chips options={INCOME} value={d.income} onChange={v => set("income", v)} multi={false} getLabel={optLabel(t, "income")} /></Field></>)}
      {step === 2 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>{t("vOnboarding.headers.physicalProfile", null, "Physical profile")}</h2><p style={{ color: "var(--text-muted)", fontSize: 13.5, margin: "0 0 22px" }}>{t("vOnboarding.body.physicalProfileDesc", null, "Used to match you with physical product missions. Never shared without permission.")}</p><Field label={t("vOnboarding.fields.height", null, "Height")} required><Chips options={HEIGHT} value={d.height} onChange={v => set("height", v)} multi={false} getLabel={optLabel(t, "height")} /></Field><Field label={t("vOnboarding.fields.weight", null, "Weight")} required><Chips options={WEIGHT} value={d.weight} onChange={v => set("weight", v)} multi={false} getLabel={optLabel(t, "weight")} /></Field><Field label={t("vOnboarding.fields.skinTone", null, "Skin tone")} required><Chips options={SKIN_TONE} value={d.skin_tone} onChange={v => set("skin_tone", v)} multi={false} getLabel={optLabel(t, "skinTone")} /></Field><Field label={t("vOnboarding.fields.hairType", null, "Hair type")}><Chips options={HAIR_TYPE} value={d.hair_type} onChange={v => set("hair_type", v)} multi={false} getLabel={optLabel(t, "hairType")} /></Field><Field label={t("vOnboarding.fields.hairLength", null, "Hair length")}><Chips options={HAIR_LENGTH} value={d.hair_length} onChange={v => set("hair_length", v)} multi={false} getLabel={optLabel(t, "hairLength")} /></Field><Field label={t("vOnboarding.fields.bodyType", null, "Body type")} required><Chips options={BODY_TYPE} value={d.body_type} onChange={v => set("body_type", v)} multi={false} getLabel={optLabel(t, "bodyType")} /></Field></>)}
      {step === 3 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>{t("vOnboarding.headers.lifestyleAndAvailability", null, "Lifestyle and availability")}</h2><Field label={t("vOnboarding.fields.occupation", null, "Occupation")} required><Chips options={OCCUPATIONS} value={d.occupation} onChange={v => set("occupation", v)} multi={false} getLabel={optLabel(t, "occupations")} /></Field>{d.occupation === "Other" && <Field label={t("onboardingFields.occupationOtherLabel", null, "Please specify occupation")}><input className="fin" value={d.occupationOther || ""} onChange={e => set("occupationOther", e.target.value)} placeholder={t("onboardingFields.occupationOtherPlaceholder", null, "e.g. Product Designer")} /></Field>}<Field label={t("vOnboarding.fields.foodPreference", null, "Food preference")}><Chips options={FOOD_PREF} value={d.food_pref} onChange={v => set("food_pref", v)} multi={false} getLabel={optLabel(t, "foodPref")} /></Field><Field label={t("vOnboarding.fields.lifestyleInterests", null, "Lifestyle interests")} action={<SelectAllToggle options={LIFESTYLE} value={d.lifestyle} onChange={v => set("lifestyle", v)} />}><Chips options={LIFESTYLE} value={d.lifestyle} onChange={v => set("lifestyle", v)} getLabel={optLabel(t, "lifestyle")} /></Field><Field label={t("vOnboarding.fields.devices", null, "Devices")} required action={<SelectAllToggle options={DEVICES} value={d.devices} onChange={v => set("devices", v)} />}><Chips options={DEVICES} value={d.devices} onChange={v => set("devices", v)} getLabel={optLabel(t, "devices")} /></Field><Field label={t("vOnboarding.fields.timePerWeek", null, "Time per week")} required><Chips options={HOURS} value={d.hours} onChange={v => set("hours", v)} multi={false} getLabel={optLabel(t, "hours")} /></Field></>)}
      <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
        <Btn variant="primary" style={{ flex: 1, justifyContent: "center" }} disabled={!valid[step]} onClick={() => onNext(d)}>{step === 3 ? t("vOnboarding.actions.completeSetup", null, "Complete setup") : t("vOnboarding.actions.continue", null, "Continue")}</Btn>
      </div>
    </div>
  );
}

function ValidatorOnboarding({ step, onNext, error, vid, validator }) {
  const { t } = useTranslation();
  const [d, setD] = useDraft(`VC_V_DRAFT_VALIDATOR_${vid}`, { name: "", handle: "", city: "", country: "", countryOther: "", state: "", stateOther: "", language: [], languageOther: [], bio: "", occupation: "", occupationOther: "", experience: "", industry: [], industryOther: [], company: "", product_types: [], tech_tools: [], devices: [], hours: "" }, validatorToDraft(validator));
  const set = (k, v) => setD(p => ({ ...p, [k]: v }));
  const valid = [d.name.trim() && d.handle.trim() && d.city.trim(), (d.occupation || d.role) && d.experience && d.industry.length > 0, d.product_types.length > 0, d.hours && d.devices.length > 0];
  return (
    <div className="rise" style={{ maxWidth: 600, margin: "0 auto" }}>
      {step === 0 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>{t("vOnboarding.headers.tellUsAboutYourself", null, "Tell us about yourself")}</h2><Field label={t("vOnboarding.fields.fullName", null, "Full name")} required><input className="fin" value={d.name} onChange={e => set("name", e.target.value)} placeholder={t("vOnboarding.placeholders.yourFullName", null, "Your full name")} /></Field><Field label={t("vOnboarding.fields.handle", null, "Handle")} required hint={t("vOnboarding.hints.lowercaseNoSpaces", null, "Lowercase, no spaces")} info={t("vOnboarding.hints.handleInfo", null, "Your unique @username on ValidationCrew — shown to builders on your profile and submissions.")}><div className="inw has-pre"><span className="pre">@</span><input className="fin" value={d.handle} onChange={e => set("handle", e.target.value.toLowerCase().replace(/\s/g,""))} placeholder={t("vOnboarding.placeholders.yourHandle", null, "yourhandle")} /></div></Field><Field label={t("vOnboarding.fields.city", null, "City")} required><input className="fin" value={d.city} onChange={e => set("city", e.target.value)} placeholder={t("vOnboarding.placeholders.cityBengaluruRemote", null, "e.g. Bengaluru, Remote")} /></Field><CountryStateFields d={d} set={set} /><FilterGroup title={t("vOnboarding.fields.languages", null, "Languages")} options={LANGUAGES.filter(o => o !== "Other")} {...filterGroupAdapter(d.language, "language", set)} otherEntries={d.languageOther} trFilterLabel={(_, v) => optLabel(t, "languages")(v, LANGUAGES.indexOf(v))} initialExpanded /><FilterGroup title={t("onboardingFields.other", null, "Other")} options={["Other"]} {...filterGroupAdapter(d.language, "language", set)} otherEntries={d.languageOther} onOtherEntriesChange={v => set("languageOther", v)} otherValue="Other" otherPlaceholder={t("createMission.otherGenericPlaceholder", { section: "language" }, "Add your own language value")} trFilterLabel={(_, v) => v} initialExpanded /><Field label={t("vOnboarding.fields.shortBio", null, "Short bio")} hint={t("vOnboarding.hints.bioHint", null, "Tell builders what makes your feedback valuable")}><textarea className="fin" rows={3} value={d.bio} onChange={e => set("bio", e.target.value)} placeholder={t("vOnboarding.placeholders.bioExample", null, "e.g. Product designer with 5 years at B2B SaaS companies.")} /></Field></>)}
      {step === 1 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>{t("vOnboarding.headers.professionalBackground", null, "Professional background")}</h2><Field label={t("vOnboarding.fields.role", null, "Role")} required><Chips options={ROLES} value={d.occupation || d.role} onChange={v => set("occupation", v)} multi={false} getLabel={optLabel(t, "roles")} /></Field>{(d.occupation || d.role) === "Other" && <Field label={t("onboardingFields.customRole", null, "Your role")}><input className="fin" value={d.occupationOther || ""} onChange={e => set("occupationOther", e.target.value)} placeholder={t("onboardingFields.customRolePlaceholder", null, "Type your role")} /></Field>}<Field label={t("vOnboarding.fields.experience", null, "Experience")} required><Chips options={EXP} value={d.experience} onChange={v => set("experience", v)} multi={false} getLabel={optLabel(t, "experience")} /></Field><FilterGroup title={t("vOnboarding.fields.industry", null, "Industry")} required options={INDUSTRIES.filter(o => o !== "Other")} {...filterGroupAdapter(d.industry, "industry", set)} otherEntries={d.industryOther} trFilterLabel={(_, v) => optLabel(t, "industries")(v, INDUSTRIES.indexOf(v))} initialExpanded /><FilterGroup title={t("onboardingFields.other", null, "Other")} options={["Other"]} {...filterGroupAdapter(d.industry, "industry", set)} otherEntries={d.industryOther} onOtherEntriesChange={v => set("industryOther", v)} otherValue="Other" otherPlaceholder={t("createMission.otherGenericPlaceholder", { section: "industry" }, "Add your own industry value")} trFilterLabel={(_, v) => v} initialExpanded /><Field label={t("vOnboarding.fields.company", null, "Company")} hint={t("vOnboarding.hints.companyOptional", null, "Optional")}><input className="fin" value={d.company} onChange={e => set("company", e.target.value)} placeholder={t("vOnboarding.placeholders.companyExample", null, "e.g. Razorpay, Freelance")} /></Field></>)}
      {step === 2 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>{t("vOnboarding.headers.yourExpertise", null, "Your expertise")}</h2><Field label={t("vOnboarding.fields.productTypesYouTest", null, "Product types you test")} required action={<SelectAllToggle options={PRODUCT_TYPES} value={d.product_types} onChange={v => set("product_types", v)} />}><Chips options={PRODUCT_TYPES} value={d.product_types} onChange={v => set("product_types", v)} getLabel={optLabel(t, "productTypes")} /></Field><Field label={t("vOnboarding.fields.toolsYouUse", null, "Tools you use")} action={<SelectAllToggle options={TECH_TOOLS} value={d.tech_tools} onChange={v => set("tech_tools", v)} />}><Chips options={TECH_TOOLS} value={d.tech_tools} onChange={v => set("tech_tools", v)} getLabel={optLabel(t, "techTools")} /></Field></>)}
      {step === 3 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>{t("vOnboarding.headers.availability", null, "Availability")}</h2><Field label={t("vOnboarding.fields.devices", null, "Devices")} required action={<SelectAllToggle options={DEVICES} value={d.devices} onChange={v => set("devices", v)} />}><Chips options={DEVICES} value={d.devices} onChange={v => set("devices", v)} getLabel={optLabel(t, "devices")} /></Field><Field label={t("vOnboarding.fields.timePerWeek", null, "Time per week")} required><Chips options={HOURS} value={d.hours} onChange={v => set("hours", v)} multi={false} getLabel={optLabel(t, "hours")} /></Field></>)}
      {error && step === 3 && <div className="err-banner" style={{ marginTop: 16 }}>{error}</div>}
      <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
        <Btn variant="primary" style={{ flex: 1, justifyContent: "center" }} disabled={!valid[step]} onClick={() => onNext(d)}>{step === 3 ? t("vOnboarding.actions.completeSetup", null, "Complete setup") : t("vOnboarding.actions.continue", null, "Continue")}</Btn>
      </div>
    </div>
  );
}

function TesterOnboarding({ step, onNext, error, vid, validator }) {
  const { t } = useTranslation();
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeUploaded, setResumeUploaded] = useState(false);
  return {
    name: validator.name || "", handle: validator.handle || "", city: validator.city || "",
    email: validator.email || "", mobile: validator.mobile || validator.phone || "", dob: validator.dob || "",
    country: validator.country || "", state: validator.state || "",
  const set = (k, v) => setD(p => ({ ...p, [k]: v }));
  const wordCount = d.testing_bio ? d.testing_bio.trim().split(/\s+/).filter(Boolean).length : 0;
  const valid = [d.name.trim() && d.handle.trim() && d.city.trim(), (d.occupation || d.role) && d.experience && d.industry.length > 0 && d.company.trim(), d.linkedin_url.trim() && resumeUploaded && wordCount >= 30, d.agreed];

  const pickResume = async (f) => {
    setResumeError("");
    if (!f) return;
    if (f.type !== "application/pdf") {
      setResumeError(t("vOnboarding.errors.onlyPdfAccepted", null, "Only PDF files are accepted."));
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setResumeError(t("vOnboarding.errors.fileTooLarge", null, "File is too large — max 5MB."));
      return;
    }
    setResumeFile(f);
    setResumeUploading(true);
    try {
      await vapi.uploadResume(f);
      set("resume_filename", f.name);
      setResumeUploaded(true);
    } catch (err) {
      setResumeError(err.message || t("vOnboarding.errors.uploadFailed", null, "Upload failed. Please try again."));
      setResumeFile(null);
    } finally {
      setResumeUploading(false);
    }
  };
    </form>
  );
}
      {step === 2 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>{t("vOnboarding.headers.proofOfExperience", null, "Proof of experience")}</h2><Field label={t("vOnboarding.fields.linkedinUrl", null, "LinkedIn URL")} required><div className="inw has-pre"><span className="pre"><Icon name="link" size={14} /></span><input className="fin" value={d.linkedin_url} onChange={e => set("linkedin_url", e.target.value)} placeholder={t("vOnboarding.placeholders.linkedinUrl", null, "https://linkedin.com/in/yourprofile")} /></div></Field><Field label={t("vOnboarding.fields.resumeCv", null, "Resume / CV")} required>{resumeUploading ? (<div style={{ padding: "12px 14px", background: "var(--panel-inset)", borderRadius: "var(--radius-sm)", fontSize: 13.5 }}>{t("vOnboarding.actions.uploading", null, "Uploading…")}</div>) : resumeUploaded ? (<div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--success-weak)", borderRadius: "var(--radius-sm)" }}><Icon name="check" size={16} style={{ color: "var(--success)" }} /><span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: "var(--success)" }}>{resumeFile?.name}</span><button className="btn btn-quiet" style={{ fontSize: 12 }} onClick={() => { setResumeFile(null); setResumeUploaded(false); set("resume_filename", ""); }}>{t("vOnboarding.actions.remove", null, "Remove")}</button></div>) : (<label style={{ display: "block", border: "2px dashed var(--border)", borderRadius: "var(--radius)", padding: 24, textAlign: "center", cursor: "pointer", background: "var(--panel-2)" }}><input type="file" accept="application/pdf" style={{ display: "none" }} onChange={e => pickResume(e.target.files[0])} /><Icon name="upload" size={22} style={{ color: "var(--text-faint)", marginBottom: 8 }} /><div style={{ fontWeight: 600 }}>{t("vOnboarding.actions.clickToUploadResume", null, "Click to upload resume")}</div><div style={{ fontSize: 12, color: "var(--text-faint)" }}>{t("vOnboarding.body.pdfOnlyMax5mb", null, "PDF only, max 5MB")}</div></label>)}{resumeError && <div className="err-banner" style={{ marginTop: 8 }}>{resumeError}</div>}</Field><Field label={t("vOnboarding.fields.portfolioGithub", null, "Portfolio / GitHub")} hint={t("vOnboarding.hints.companyOptional", null, "Optional")}><div className="inw has-pre"><span className="pre"><Icon name="link" size={14} /></span><input className="fin" value={d.portfolio_url} onChange={e => set("portfolio_url", e.target.value)} placeholder={t("vOnboarding.placeholders.portfolioUrl", null, "https://github.com/yourprofile")} /></div></Field><Field label={t("vOnboarding.fields.describeTestingExperience", null, "Describe your testing experience")} required hint={t("vOnboarding.hints.wordCount", { count: wordCount }, wordCount + " words (min 30)")}><textarea className="fin" rows={5} value={d.testing_bio} onChange={e => set("testing_bio", e.target.value)} placeholder={t("vOnboarding.placeholders.testingBio", null, "Describe products tested, bugs found, and what makes your feedback valuable.")} /></Field></>)}
      {step === 3 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>{t("vOnboarding.headers.declaration", null, "Declaration")}</h2><p style={{ color: "var(--text-muted)", fontSize: 13.5, margin: "0 0 22px" }}>{t("vOnboarding.body.adminWillReviewValidatorAccess", null, "Admin will review within 72 hours. Until verified you have Validator access.")}</p><div className="card" style={{ padding: 20, marginBottom: 16 }}>{[[t("vOnboarding.declaration.name", null, "Name"),d.name],[t("vOnboarding.fields.handle", null, "Handle"),"@"+d.handle],[t("vOnboarding.fields.role", null, "Role"),d.occupation || d.role],[t("vOnboarding.declaration.linkedin", null, "LinkedIn"),d.linkedin_url],[t("vOnboarding.declaration.resume", null, "Resume"),d.resume_filename]].map(([k,v]) => (<div key={k} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: "1px solid var(--border)", fontSize: 13.5 }}><span style={{ color: "var(--text-faint)", width: 80, flexShrink: 0 }}>{k}</span><span style={{ fontWeight: 600, wordBreak: "break-all" }}>{v||"-"}</span></div>))}</div><div style={{ padding: "14px 16px", background: "var(--warning-weak)", borderRadius: "var(--radius)", marginBottom: 20, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{t("vOnboarding.body.adminReviewOutcome", null, "Admin reviews within 72 hours. If approved: Verified Tester badge and premium missions. If rejected: Stay as Validator and reapply anytime.")}</div><div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius)", cursor: "pointer" }} onClick={() => set("agreed", !d.agreed)}><div style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, display: "grid", placeItems: "center", background: d.agreed ? "var(--warning)" : "var(--panel)", border: "1.5px solid " + (d.agreed ? "var(--warning)" : "var(--border-strong)") }}>{d.agreed && <Icon name="check" size={13} style={{ color: "#fff" }} />}</div><div style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("vOnboarding.body.confirmAccuracy", null, "I confirm all information is accurate. False information may result in permanent removal.")}</div></div></>)}
      {error && step === 3 && <div className="err-banner" style={{ marginTop: 16 }}>{error}</div>}
      <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
        <Btn variant="primary" style={{ flex: 1, justifyContent: "center" }} disabled={!valid[step]} onClick={() => onNext(d)}>{step === 3 ? t("vOnboarding.actions.submitForVerification", null, "Submit for verification") : t("vOnboarding.actions.continue", null, "Continue")}</Btn>
      </div>
"  return (\n    <form id=\"v-onboarding-form\" className=\"rise\" style={{ maxWidth: 600, margin: \"0 auto\" }} onSubmit={e => { e.preventDefault(); if (valid[step]) onNext(d); else toast.error(t(\"vOnboarding.errors.fillRequired\", null, \"Please fill all required fields.\")); }}>\n      {step === 0 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: \"0 0 22px\" }}>{t(\"vOnboarding.headers.tellUsAboutYourself\", null, \"Tell us about yourself\")}</h2><Field label={t(\"vOnboarding.fields.fullName\", null, \"Full name\")} required><input className=\"fin\" value={d.name} onChange={e => set(\"name\", e.target.value)} placeholder={t(\"vOnboarding.placeholders.yourFullName\", null, \"Your full name\")} /></Field><Field label={t(\"vOnboarding.fields.handle\", null, \"Handle\")} required hint={t(\"vOnboarding.hints.lowercaseNoSpaces\", null, \"Lowercase, no spaces\")} info={t(\"vOnboarding.hints.handleInfo\", null, \"Your unique @username on ValidationCrew — shown to builders on your profile and submissions.\")}><div className=\"inw has-pre\"><span className=\"pre\">@</span><input className=\"fin\" value={d.handle} onChange={e => set(\"handle\", e.target.value.toLowerCase().replace(/\\s/g,\"\"))} placeholder={t(\"vOnboarding.placeholders.yourHandle\", null, \"yourhandle\")} /></div></Field><Field label={t(\"vOnboarding.fields.city\", null, \"City\")} required><input className=\"fin\" value={d.city} onChange={e => set(\"city\", e.target.value)} placeholder={t(\"vOnboarding.placeholders.cityBengaluruRemote\", null, \"e.g. Bengaluru, Remote\")} /></Field><CountryStateFields d={d} set={set} /><FilterGroup title={t(\"vOnboarding.fields.languages\", null, \"Languages\")} options={LANGUAGES.filter(o => o !== \"Other\")} {...filterGroupAdapter(d.language, \"language\", set)} otherEntries={d.languageOther} trFilterLabel={(_, v) => optLabel(t, \"languages\")(v, LANGUAGES.indexOf(v))} initialExpanded /><FilterGroup title={t(\"onboardingFields.other\", null, \"Other\")} options={[\"Other\"]} {...filterGroupAdapter(d.langu
<truncated 4428 bytes>
      <p style={{ color: "var(--text-muted)", margin: "0 0 28px", fontSize: 15 }}>{t("onboarding.appSubmittedDesc", null, "Our team will review your profile within 72 hours. In the meantime you have full Validator access.")}</p>
      <Btn variant="primary" block onClick={onContinue} style={{ justifyContent: "center" }}>{t("actions.startExploringMissions", null, "Start exploring missions")}</Btn>
    </div>
  );
}

export default function VOnboarding() {
  const { t } = useTranslation();
  const { validator, refresh, logout } = useVAuth();
"  const [d, setD] = useDraft(`VC_V_DRAFT_TESTER_${vid}`, { name: \"\", email: \"\", mobile: \"\", dob: \"\", city: \"\", country: \"\", countryOther: \"\", state: \"\", stateOther: \"\", language: [], languageOther: [], occupation: \"\", occupationOther: \"\", experience: \"\", industry: [], industryOther: [], company: \"\", domains: [], domainsOther: [], certifications: [], certificationsOther: [], tools: [], linkedin_url: \"\", portfolio_url: \"\", resume_filename: \"\", testing_bio: \"\", agreed: false }, validatorToDraft(validator));\n  const set = (k, v) => setD(p => ({ ...p, [k]: v }));\n  const wordCount = d.testing_bio ? d.testing_bio.trim().split(/\\s+/).filter(Boolean).length : 0;\n  const valid = [d.name.trim() && d.email.trim() && d.mobile.trim() && d.city.trim(), (d.occupation || d.role) && d.experience && d.industry.length > 0 && d.company.trim(), d.linkedin_url.trim() && resumeUploaded && wordCount >= 30, d.agreed];\n\n  const pickResume = async (f) => {\n    setResumeError(\"\");\n    if (!f) return;\n    if (f.type !== \"application/pdf\") {\n      setResumeError(t(\"vOnboarding.errors.onlyPdfAccepted\", null, \"Only PDF files are accepted.\"));\n      return;\n    }\n    if (f.size > 5 * 1024 * 1024) {\n      setResumeError(t(\"vOnboarding.errors.fileTooLarge\", null, \"File is too large — max 5MB.\"));\n      return;\n    }\n    setResumeFile(f);\n    setResumeUploading(true);\n    try {\n      await vapi.uploadResume(f);\n      set(\"resume_filename\", f.name);\n      setResumeUploaded(true);\n    } catch (err) {\n      setResumeError(err.message || t(\"vOnboarding.errors.uploadFailed\", null, \"Upload failed. Please try again.\"));\n      setResumeFile(null);\n    } finally {\n      setResumeUploading(false);\n    }\n  };\n  return (\n    <div className=\"rise\" style={{ maxWidth: 600, margin: \"0 auto\" }}>\n      {step === 0 && (\n        <>\n          <h2 style={{ fontSize: 24, fontWeight: 800, margin: \"0 0 8px\" }}>Tell us about yourself</h2>\n          <p style={{ color: \"var(--text
<truncated 2048 bytes>
  // flag makes this genuinely once-ever, regardless of how many times the
  const valid = [(d.name || "").trim() && (d.email || "").trim() && (d.mobile || "").trim() && (d.city || "").trim(), (d.occupation || d.role) && d.experience && d.industry.length > 0 && (d.company || "").trim(), (d.linkedin_url || "").trim() && resumeUploaded && wordCount >= 30, d.agreed];
  useEffect(() => {
    if (!validator?.id) return;
    const key = `vc_onboarding_toast_shown_${validator.id}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    toast.success(t("onboarding.accountCreated", null, "Account created!"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validator?.id]);

    <form id="v-onboarding-form" className="rise" style={{ background: "var(--panel)", padding: "40px", borderRadius: 16, border: "1px solid var(--border)" }} onKeyDown={e => {
      if (e.key === "Enter" && e.target.tagName === "INPUT") {
        e.preventDefault();
  // Steps: 0=Basic Info, 1=Education, 2=Occupation, 3=Household, 4=Lifestyle, 5=Bonus, 6=Participation, 7=Rewards
  const valid = [
    d.name.trim() && (d.email || "").trim() && (d.mobile || "").trim() && d.dob && d.gender && d.city.trim(), // 0
    d.qualification, // 1
    d.occupation, // 2
    d.marital && d.income, // 3
    (d.lifestyle || []).length > 0 && d.shop_freq && (d.platforms || []).length > 0, // 4
    true, // 5 Bonus (optional)
    (d.participation || []).length > 0, // 6 Participation
    d.reward_pref // 7 Rewards
  ];
      localStorage.removeItem(`VC_V_MAXSTEP_${vtype.toUpperCase()}_${validator?.id}`);
      localStorage.removeItem(`VC_V_DRAFT_${vtype.toUpperCase()}_${validator?.id}`);
      await refresh();
      if (vtype === "tester") setShowPending(true);
      else {
        // The redirect below is a hard page load, so a toast fired here
        // would never get the chance to render -- VLayout (which every
export default function VOnboarding() {
  };
  return (
    <div className="rise" style={{ background: "var(--panel)", padding: "40px", borderRadius: 16, border: "1px solid var(--border)" }}>
      {step === 0 && (
        <>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Tell us about yourself</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 24px", lineHeight: 1.5 }}>
            This stays private. We use it to match you with testing opportunities near you and send your rewards.
          </p>
"  const [d, setD] = useDraft(`VC_V_DRAFT_VALIDATOR_${vid}`, { name: \"\", email: \"\", mobile: \"\", dob: \"\", city: \"\", district: \"\", country: \"\", countryOther: \"\", state: \"\", stateOther: \"\", language: [], languageOther: [], bio: \"\", occupation: \"\", occupationOther: \"\", experience: \"\", industry: [], industryOther: [], company: \"\", product_types: [], tech_tools: [], devices: [], hours: \"\" }, validatorToDraft(validator));\n  const set = (k, v) => setD(p => ({ ...p, [k]: v }));\n  const valid = [(d.name || \"\").trim() && (d.email || \"\").trim() && (d.mobile || \"\").trim() && (d.city || \"\").trim(), (d.occupation || d.role) && d.experience && d.industry.length > 0, d.product_types.length > 0, d.hours && d.devices.length > 0];\n  return (\n    <form id=\"v-onboarding-form\" className=\"rise\" style={{ maxWidth: 600, margin: \"0 auto\" }} onSubmit={e => {\n      e.preventDefault();\n      if (valid[step]) {\n        setShowErrors(false);\n        onNext(d);\n      } else {\n        setShowErrors(true);\n        requestAnimationFrame(() => {\n          const firstInvalid = document.querySelector(\".fld-invalid\");\n          if (firstInvalid) firstInvalid.scrollIntoView({ behavior: \"smooth\", block: \"center\" });\n        });\n      }\n    }}>\n      {step === 0 && (\n        <>\n          <h2 style={{ fontSize: 24, fontWeight: 800, margin: \"0 0 8px\" }}>Tell us about yourself</h2>\n          <p style={{ color: \"var(--text-muted)\", fontSize: 14, margin: \"0 0 24px\", lineHeight: 1.5 }}>\n            This stays private. We use it to match you with opportunities where your judgment is valuable.\n          </p>\n          <div style={{ height: 1, background: \"var(--border)\", margin: \"0 0 24px 0\" }} />\n\n          <Field label=\"Full name\" required invalid={showErrors && !(d.name || \"\").trim()}>\n            <div className=\"inw has-pre\">\n              <span className=\"pre\"><Icon name=\"user\" size={14} /></span>\n              <input className=\"fin\" value={d.name} onChange=
<truncated 2252 bytes>
"      )}\n      {step === 1 && (\n        <>\n          <h2 style={{ fontSize: 28, fontWeight: 800, margin: \"0 0 12px\", color: \"var(--text)\" }}>Verify your experience</h2>\n          <p style={{ color: \"var(--text-muted)\", fontSize: 15, margin: \"0 0 40px\", lineHeight: 1.5 }}>\n            Add at least one — it's the single biggest boost to your profile strength and the opportunities you'll be offered.\n          </p>\n\n          <div style={{ fontSize: 14, fontWeight: 800, color: \"var(--text)\", marginBottom: 16 }}>Add any one</div>\n          \n          <div style={{ border: \"1px solid var(--border)\", borderRadius: 12, padding: \"20px 24px\", marginBottom: 24, background: \"#fff\", display: \"flex\", flexDirection: \"column\", gap: 12, boxShadow: \"0 2px 8px rgba(0,0,0,0.02)\" }}>\n            <div style={{ fontSize: 15, fontWeight: 800, color: \"var(--text)\" }}>LinkedIn profile</div>\n            <div style={{ display: \"flex\", gap: 12, alignItems: \"center\" }}>\n              <div className=\"inw has-pre\" style={{ flex: 1, background: \"var(--panel-inset)\", border: \"1px solid var(--border)\", borderRadius: 8, overflow: \"hidden\" }}>\n                <span className=\"pre\"><Icon name=\"link\" size={16} style={{ color: \"var(--text-faint)\" }} /></span>\n                <input className=\"fin\" value={d.linkedin_url} onChange={e => set(\"linkedin_url\", e.target.value)} placeholder=\"linkedin.com/in/...\" style={{ background: \"transparent\", border: \"none\" }} />\n              </div>\n              <button type=\"button\" className=\"btn btn-quiet\" style={{ padding: \"0 16px\", height: 42, background: \"transparent\", border: \"1px solid var(--border)\", borderRadius: 8, fontWeight: 700, color: \"var(--text)\", whiteSpace: \"nowrap\" }}>\n                Submit for review\n              </button>\n            </div>\n            <div style={{ fontSize: 13, color: \"var(--text-faint)\", marginTop: 4 }}>We confirm your experience from your public profile.</div>\n          </div>\n\n    
<truncated 11699 bytes>
    <form id="v-onboarding-form" className="rise" style={{ background: "var(--panel)", padding: "40px", borderRadius: 16, border: "1px solid var(--border)" }} onSubmit={e => {
    (d.devices || []).length > 0, // Step 4: Devices
    true, // Step 5: Interests (optional for now)
    d.agreed // Step 6: Rewards / Declaration
  ];
      {step === 4 && (
        <>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 22px" }}>Devices</h2>
    (d.linkedin_url || "").trim() || resumeUploaded,
    (d.occupation === "Other" ? (typeof d.occupationOther === "string" ? d.occupationOther : "").trim() : d.occupation) && (d.industry_single === "Other" ? (typeof d.industryOther === "string" ? d.industryOther : "").trim() : d.industry_single) && d.experience,
    (d.expertise_areas || []).length > 0,
    (d.expertise_areas || []).length > 0,
    (d.interests || []).length > 0,
    (d.participation || []).length > 0,
    !!(d.reward_pref || "").trim()
"          <div style={{ border: \"1px solid var(--border)\", borderRadius: 12, padding: \"16px 20px\", marginBottom: 20, background: \"#fff\", display: \"flex\", flexDirection: \"column\", gap: 10, boxShadow: \"0 1px 4px rgba(0,0,0,0.02)\" }}>\n            <div style={{ fontSize: 14, fontWeight: 800, color: \"var(--text)\" }}>LinkedIn profile</div>\n            <div style={{ display: \"flex\", gap: 10, alignItems: \"center\" }}>\n              {linkedinSubmitted && (\n                <div style={{ width: 40, height: 40, borderRadius: 8, background: \"#ECFDF5\", display: \"grid\", placeItems: \"center\", flexShrink: 0 }}>\n                  <Icon name=\"check\" size={20} style={{ color: \"#10B981\" }} />\n                </div>\n              )}\n              <div className={linkedinSubmitted ? \"inw\" : \"inw has-pre\"} style={{ flex: 1, background: \"var(--panel-inset)\", border: \"1px solid var(--border)\", borderRadius: 8, overflow: \"hidden\" }}>\n                {!linkedinSubmitted && (\n                  <span className=\"pre\"><Icon name=\"link\" size={14} style={{ color: \"var(--text-faint)\" }} /></span>\n                )}\n                <input className=\"fin\" value={d.linkedin_url} onChange={e => { set(\"linkedin_url\", e.target.value); setLinkedinSubmitted(false); }} placeholder=\"linkedin.com/in/...\" style={{ background: \"transparent\", border: \"none\", fontSize: 14 }} disabled={linkedinSubmitting || linkedinSubmitted} />\n              </div>\n              \n              {linkedinSubmitting ? (\n                <button type=\"button\" className=\"btn\" style={{ padding: \"0 16px\", height: 38, background: \"#FEF3C7\", border: \"none\", borderRadius: 8, fontWeight: 700, color: \"#D97706\", whiteSpace: \"nowrap\", display: \"flex\", alignItems: \"center\", gap: 8 }} disabled>\n                  <div className=\"spinner\" style={{ width: 14, height: 14, border: \"2px solid #D97706\", borderTopColor: \"transparent\", borderRadius: \"50%\", animation: \"spin 1s linear infinite\" }} />\n       
<truncated 1149 bytes>
          {!((d.linkedin_url || "").trim() || resumeUploaded) && (
            <div className={showErrors ? "fld-invalid" : ""} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: showErrors ? "var(--danger-weak)" : "#f8fafc", border: showErrors ? "1px solid var(--danger)" : "1px solid var(--border)", borderRadius: 12, color: showErrors ? "var(--danger-strong)" : "var(--text-muted)", fontSize: 13, fontWeight: showErrors ? 600 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              <Icon name="info" size={18} style={{ color: showErrors ? "var(--danger-strong)" : "var(--text-faint)", flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>Add your LinkedIn or a resume to continue — this is how companies trust your test results.</span>
            </div>
          )}
        </>
          <Field label="Testing areas" required invalid={showErrors && (d.testing_areas || []).length === 0} action={<SelectAllToggle options={TESTING_AREAS} value={d.testing_areas || []} onChange={v => set("testing_areas", v)} />}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>Products you've tested</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <SelectAllToggle options={TESTER_PRODUCT_CARDS.map(c => c.id)} value={d.product_types || []} onChange={v => set("product_types", v)} />
              <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600 }}>{(d.product_types || []).length} selected</div>
            </div>
          </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600 }}>{(d.product_types || []).length} selected</div>
              <SelectAllToggle options={TESTER_PRODUCT_CARDS.map(c => c.id)} value={d.product_types || []} onChange={v => set("product_types", v)} />
            </div>
"      {step === 4 && (\n        <>\n          <div style={{ margin: \"0 0 8px\" }}>\n            <h2 style={{ fontSize: 24, fontWeight: 800 }}>Which devices can you test on?</h2>\n          </div>\n          <p style={{ color: \"var(--text-muted)\", fontSize: 14, margin: \"0 0 24px\", lineHeight: 1.5 }}>\n            Some tests need specific devices or browsers. The more you have, the more you'll be matched to.\n          </p>\n          <div style={{ height: 1, background: \"var(--border)\", margin: \"0 0 24px 0\" }} />\n\n          <div className={showErrors && (d.devices || []).length === 0 ? \"fld-invalid\" : \"\"}>\n            {[\n              { label: \"Mobile\", options: MOBILE_DEVICES },\n              { label: \"Desktop\", options: DESKTOP_DEVICES },\n              { label: \"Browsers\", options: BROWSERS }\n            ].map((section, idx) => {\n              const sectionSelected = (d.devices || []).filter(x => section.options.includes(x));\n              return (\n                <div key={section.label} style={{ marginBottom: idx === 2 ? 0 : 24 }}>\n                  <div style={{ display: \"flex\", justifyContent: \"space-between\", alignItems: \"baseline\", marginBottom: 12 }}>\n                    <div style={{ fontSize: 14, fontWeight: 800, color: \"var(--text)\" }}>{section.label}</div>\n                    <SelectAllToggle \n                      options={section.options} \n                      value={sectionSelected} \n                      onChange={newSubSelection => {\n                        const otherDevices = (d.devices || []).filter(x => !section.options.includes(x));\n                        set(\"devices\", [...otherDevices, ...newSubSelection]);\n                      }} \n                    />\n                  </div>\n                  <div style={{ display: \"flex\", flexWrap: \"wrap\", gap: 8 }}>\n                    {section.options.map(a => {\n                      const selected = (d.devices || []).includes(a);\n                      return (\n                        <d
<truncated 1188 bytes>
          <div style={{ display: "flex", alignItems: "center", margin: "24px 0 16px" }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>Areas of Interest</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)", marginLeft: 16 }} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>How would you like to be rewarded?</h2>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>What are you into?</h2>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Which devices can you test on?</h2>
          <Field label="Preferred reward">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {REWARDS.map(a => {
                const selected = d.reward_pref === a;
                return (
                  <div key={a} onClick={() => set("reward_pref", selected ? "" : a)} style={{ padding: "8px 16px", borderRadius: 30, border: selected ? "1px solid #8b5cf6" : "1px solid var(--border)", background: selected ? "#f5f3ff" : "#fff", color: selected ? "#4c1d95" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" }}>
                    {selected && (
    <form id="v-onboarding-form" className="rise" style={{ background: "var(--panel)", padding: "40px", borderRadius: 16, border: "1px solid var(--border)" }} onKeyDown={e => {
      if (e.key === "Enter" && e.target.tagName === "INPUT") {
        e.preventDefault();
        e.target.blur();
      }
    }} onSubmit={e => {
                        <Icon name="check" size={10} style={{ color: "#fff" }} strokeWidth={3} />
                      </div>
                    )}
                    {a}
                  </div>
          <div style={{ marginTop: 32, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap" }}>Location</div>
          </Field>
      nextLabel={step === totalSteps - 1 ? (validatorType === "tester" ? t("vOnboarding.actions.seeMyOpportunities", null, "See my opportunities") : t("vOnboarding.actions.completeSetup", null, "Complete setup")) : t("vOnboarding.actions.continue", null, "Continue")}
  const validatorCardSteps = validatorType === "validator" ? [
    "Personal details",
    "Expertise verified",
    "Credentials added",
    "Background",
    "Expertise areas",
    "Interests",
    "Participation",
    "Reward set"
  ] : null;

          <div style={{ height: 1, background: "var(--border)", margin: "0 0 24px 0" }} />
      roleName={roleName}
      color={layoutColor}
      steps={stepLabelsFor(t, validatorType)}
      cardSteps={validatorCardSteps}
      currentStep={step}
      maxReached={maxReached}
      onJump={jumpToStep}
      onBack={goBack}
      onSkip={skip}
      onNext={saveNow}
      formId="v-onboarding-form"
      nextLabel={step === totalSteps - 1 ? (validatorType === "tester" ? t("vOnboarding.actions.seeMyOpportunities", null, "See my opportunities") : t("vOnboarding.actions.completeSetup", null, "Complete setup")) : t("vOnboarding.actions.continue", null, "Continue")}
    >
          <div className={showErrors && !d.experience ? "fld-invalid" : ""} style={{ padding: showErrors && !d.experience ? "8px" : 0, border: showErrors && !d.experience ? "1px solid var(--danger)" : "none", borderRadius: 8, display: "flex", flexWrap: "wrap", gap: 10 }}>
            {EXP.map(a => {
              const selected = d.experience === a;
              return (
                <div key={a} onClick={() => set("experience", selected ? "" : a)} style={{ padding: "8px 16px", borderRadius: 30, border: selected ? "1px solid #ec4899" : "1px solid var(--border)", background: selected ? "#fdf2f8" : "#fff", color: selected ? "#be185d" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" }}>
          <div style={{ height: 1, background: "var(--border)", margin: "0 0 24px 0" }} />
              );
            })}
          </div>
          </div>
        </>
      )}
"          <div style={{ display: \"flex\", alignItems: \"center\", gap: 16, marginBottom: 12, marginTop: 8 }}>\n            <div style={{ fontSize: 13, fontWeight: 700, color: \"var(--text)\" }}>Expertise areas</div>\n            <div style={{ flex: 1, height: 1, background: \"var(--border)\" }} />\n            <div style={{ fontSize: 12, color: \"var(--text-faint)\", fontWeight: 600 }}>\n              {(d.expertise_areas || []).length} selected\n              <span style={{ margin: \"0 6px\" }}>•</span>\n              <span onClick={() => {\n                if ((d.expertise_areas || []).length === EXPERTISE_AREAS.length) {\n                  set(\"expertise_areas\", []);\n                } else {\n                  set(\"expertise_areas\", [...EXPERTISE_AREAS]);\n                }\n              }} style={{ color: \"#ec4899\", cursor: \"pointer\", opacity: 0.8 }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.8}>\n                {(d.expertise_areas || []).length === EXPERTISE_AREAS.length ? \"Clear all\" : \"Select all\"}\n              </span>\n            </div>\n          </div>\n          \n          <div className={showErrors && (d.expertise_areas || []).length === 0 ? \"fld-invalid\" : \"\"} style={{ padding: showErrors && (d.expertise_areas || []).length === 0 ? \"8px\" : 0, border: showErrors && (d.expertise_areas || []).length === 0 ? \"1px solid var(--danger)\" : \"none\", borderRadius: 8, display: \"flex\", flexWrap: \"wrap\", gap: 10 }}>\n            {EXPERTISE_AREAS.map(a => {\n              const selected = (d.expertise_areas || []).includes(a);\n              return (\n                <div key={a} onClick={() => {\n                  if (selected) set(\"expertise_areas\", (d.expertise_areas || []).filter(x => x !== a));\n                  else set(\"expertise_areas\", [...(d.expertise_areas || []), a]);\n                }} style={{ padding: \"8px 16px\", borderRadius: 30, border: selected ? \"1px solid #ec4899\" : \"1px solid var(--border)\", backgr
<truncated 725 bytes>
"          <div style={{ display: \"flex\", alignItems: \"center\", gap: 16, marginBottom: 12, marginTop: 8 }}>\n            <div style={{ fontSize: 13, fontWeight: 700, color: \"var(--text)\" }}>Interests</div>\n            <div style={{ flex: 1, height: 1, background: \"var(--border)\" }} />\n            <div style={{ fontSize: 12, color: \"var(--text-faint)\", fontWeight: 600 }}>\n              {(d.interests || []).length} selected\n              <span style={{ margin: \"0 6px\" }}>•</span>\n              <span onClick={() => {\n                if ((d.interests || []).length === VALIDATOR_INTERESTS.length) {\n                  set(\"interests\", []);\n                } else {\n                  set(\"interests\", [...VALIDATOR_INTERESTS]);\n                }\n              }} style={{ color: \"#ec4899\", cursor: \"pointer\", opacity: 0.8 }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.8}>\n                {(d.interests || []).length === VALIDATOR_INTERESTS.length ? \"Clear all\" : \"Select all\"}\n              </span>\n            </div>\n          </div>\n          \n          <div className={showErrors && (d.interests || []).length === 0 ? \"fld-invalid\" : \"\"} style={{ padding: showErrors && (d.interests || []).length === 0 ? \"8px\" : 0, border: showErrors && (d.interests || []).length === 0 ? \"1px solid var(--danger)\" : \"none\", borderRadius: 8, display: \"flex\", flexWrap: \"wrap\", gap: 10 }}>\n            {VALIDATOR_INTERESTS.map(a => {\n              const selected = (d.interests || []).includes(a);\n              return (\n                <div key={a} onClick={() => {\n                  if (selected) set(\"interests\", (d.interests || []).filter(x => x !== a));\n                  else set(\"interests\", [...(d.interests || []), a]);\n                }} style={{ padding: \"8px 16px\", borderRadius: 30, border: selected ? \"1px solid #ec4899\" : \"1px solid var(--border)\", background: selected ? \"#fdf2f8\" : \"#fff\", color: selected ? \"#be185d
<truncated 657 bytes>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 24px", lineHeight: 1.5 }}>
            We'll prioritise opportunities aligned with what you enjoy.
          </p>
          <div style={{ height: 1, background: "var(--border)", margin: "0 0 24px 0" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12, marginTop: 8 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 24px", lineHeight: 1.5 }}>
            Select the topics you can give meaningful, professional feedback on. This is the heart of your match quality.
          </p>
          <div style={{ height: 1, background: "var(--border)", margin: "0 0 24px 0" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12, marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12, marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Participation preferences</div>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600 }}>
              {(d.participation || []).length} selected
              <span style={{ margin: "0 6px" }}>•</span>
              <span onClick={() => {
                if ((d.participation || []).length === PARTICIPATION_FORMATS.length) {
                  set("participation", []);
                } else {
                  set("participation", PARTICIPATION_FORMATS.map(f => f.id));
                }
              }} style={{ color: "#ec4899", cursor: "pointer", opacity: 0.8 }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.8}>
                {(d.participation || []).length === PARTICIPATION_FORMATS.length ? "Clear all" : "Select all"}
              </span>
                  </select>
                </div>
              </Field>
                  <input className="fin" autoFocus value={typeof d.industryOther === 'string' ? d.industryOther : ""} onChange={e => set("industryOther", e.target.value)} placeholder="Please specify industry" />
                </div>
              )}
              {d.occupation === "Other" && (
                <div className={showErrors && !(typeof d.occupationOther === 'string' ? d.occupationOther : "").trim() ? "fld-invalid" : ""} style={{ marginTop: 8 }}>
                  <input className="fin" autoFocus value={typeof d.occupationOther === 'string' ? d.occupationOther : ""} onChange={e => set("occupationOther", e.target.value)} placeholder="Please specify your role" />
                </div>
                  </select>
                </div>
              </Field>
            </div>
                </div>
              </Field>
      }
    }} onSubmit={e => {
                  </select>
                  </select>
                  </select>
                </div>
              </Field>
                  </select>
                </div>
              </Field>
                  </select>
                </div>
              </Field>
            </div>
                  </select>
                </div>
              </Field>
            </div>
          <div style={{ marginTop: 32, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap" }}>Location</div>
          <div style={{ marginTop: 32, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap" }}>Location</div>
          <div style={{ height: 1, background: "var(--border)", margin: "0 0 24px 0" }} />