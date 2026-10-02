import { Navigate, useSearchParams, useNavigate } from "react-router-dom";
import VOnboardingLayout from "./VOnboardingLayout";
/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";

import Icon from "../components/Icon";
import { Btn } from "../components/ui";
import { vapi } from "../vapi/client";
import { useVAuth } from "../vcontext/VAuthContext";
import useUnsavedChangesWarning from "../hooks/useUnsavedChangesWarning";
import { useTranslation } from "../i18n/index.jsx";
import { Country, State, City } from "country-state-city";
import VOpportunitiesAnimation from "../components/VOpportunitiesAnimation";
import VOpportunitiesResults from "../components/VOpportunitiesResults";

const _allCountries = Country.getAllCountries();
const COUNTRY_NAMES = _allCountries.map(c => c.name).sort((a, b) => a.localeCompare(b));
const REGIONS_BY_COUNTRY = Object.fromEntries(_allCountries.map(c => [c.name, State.getStatesOfCountry(c.isoCode).map(r => r.name)]));
const COUNTRY_BY_STATE = {};
for (const c of _allCountries) {
  const states = State.getStatesOfCountry(c.isoCode);
  for (const r of states) {
    if (!(r.name in COUNTRY_BY_STATE)) {
      COUNTRY_BY_STATE[r.name] = c.name;
    }
  }
}
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
function useDraft(key, defaultState, backfill, forceValue) {
  const [val, setVal] = useState(() => {
    if (forceValue !== undefined && forceValue !== null) return forceValue;
    let base = defaultState;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        base = (typeof defaultState === "object" && defaultState !== null && typeof parsed === "object" && parsed !== null)
          ? { ...defaultState, ...parsed }
          : parsed;
      }
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
  { key: "user", icon: "users", title: "User", tagline: "I use everyday products", desc: "Perfect for testing physical products, food, packaging, fashion, and consumer apps. No tech experience needed.", color: "#0f9d6b", bg: "var(--success-weak)", missions: "Surveys, taste tests, packaging reviews, lifestyle products" },
  { key: "validator", icon: "shield", title: "Validator", tagline: "I have professional expertise", desc: "For professionals, domain experts, and tech-savvy users who can evaluate apps, SaaS products, and digital experiences.", color: "#c81e78", bg: "var(--accent-weak)", missions: "App testing, UX evaluation, SaaS reviews, expert feedback" },
  { key: "tester", icon: "star", title: "Verified Tester", tagline: "I have QA / product testing experience", desc: "For experienced testers and researchers. Submit your resume or LinkedIn for admin verification. Access premium high-pay missions.", color: "#7c3aed", bg: "var(--warning-weak)", missions: "Premium missions, complex testing, research studies", badge: "Admin verified 72hr review" },
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
const STEP_DEFS = {
  user: [
    ["basicInfo", "Basic info"], 
    ["education", "Education"], 
    ["occupation", "Occupation"], 
    ["household", "Household"], 
    ["lifestyle", "Lifestyle"], 
    ["bonus", "Bonus"], 
    ["participation", "Participation"], 
    ["rewards", "Rewards"]
  ],
  validator: [["aboutYou", "About you"], ["verification", "Verification"], ["background", "Background"], ["expertise", "Expertise"], ["interests", "Interests"], ["participation", "Participation"], ["rewards", "Rewards"]],
  tester: [["aboutYou", "About you"], ["verification", "Verification"], ["experience", "Experience"], ["professional", "Professional"], ["devices", "Devices"], ["interests", "Interests"], ["rewards", "Rewards"]],
};
export const stepLabelsFor = (t, type) => (STEP_DEFS[type] || []).map(([k, fb]) => t(`vOnboarding.steps.${k}`, null, fb));

const toggle = (arr, val) => arr.includes(val) ? arr.filter(i => i !== val) : [...arr, val];

// Settings' own step grouping for editing an already-onboarded profile --
// deliberately not just STEP_DEFS reused as-is: tester's onboarding steps
// "Proof"/"Declaration" are a one-time submission flow (resume upload,
// admin-review agreement checkbox), not something that makes sense to
// re-render as an editable step afterwards. A tester (or a validator whose
// tester application is pending/rejected -- validator_type stays
// "validator" until approved, see vauth.js) instead gets one extra
// "Verification" step here for the testing-domains/certifications/links
// fields that only exist once tester_status is set, appended onto the
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
      );
    })}
  </div>
);

export const Field = ({ label, required, hint, info, action, children, dataField, issue, invalid }) => {
  const isError = invalid || (issue && issue.id === dataField && dataField);
  return (
    <div className={`fld${isError ? " fld-invalid" : ""}`} style={{ marginBottom: 24 }} data-field={dataField}>
      <div className="row between" style={{ alignItems: "center" }}>
        <label style={{ fontWeight: 700, color: "#1e293b" }}>{label}{required && <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>}
          {info && <Icon name="info" size={13} style={{ verticalAlign: -2, marginLeft: 5, color: "var(--text-faint)", cursor: "help" }} title={info} />}
        </label>
        {action}
      </div>
      {children}
      {isError && issue && issue.id === dataField && <p className="ferr" style={{ color: "var(--danger)", fontSize: 13, marginTop: 4, marginBottom: 0 }}>{issue.message}</p>}
      {hint && <p className="fhint">{hint}</p>}
    </div>
  );
};

// A single-value dropdown with filter-as-you-type -- checked first: nothing
// like this already existed in the codebase (no combobox library installed
// either), every existing text-input+filtered-list pattern here is
// multi-select. Country/State/City lists run into the hundreds or
// thousands, making a plain <select>'s native scroll genuinely painful, so
// this was worth building once and reusing across all three. Same search-
// box-over-a-list visual pattern Missions.jsx's own "Filter by Type"
// popover already uses, just single-select-and-close instead of checkboxes.
function SearchableSelect({ value, onChange, options, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const filtered = query.trim() ? options.filter(o => o.toLowerCase().includes(query.trim().toLowerCase())) : options;

  const commit = (v) => { onChange(v); setQuery(""); setOpen(false); };

  return (
    <div style={{ position: "relative" }}>
      <input
        className="fin"
        style={{ paddingRight: 36, opacity: disabled ? 0.6 : 1, cursor: disabled ? "not-allowed" : "text" }}
        disabled={disabled}
        value={open ? query : (value || "")}
        placeholder={placeholder}
        autoComplete="new-password"
        onFocus={() => { setOpen(true); setQuery(""); setActiveIndex(0); }}
        onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => {
          if (!open) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
          else if (e.key === "Enter") { e.preventDefault(); if (filtered[activeIndex]) commit(filtered[activeIndex]); }
          else if (e.key === "Escape") { setQuery(""); setOpen(false); }
        }}
      />
      {/* Same chevron a native select.fin gets from its own CSS
          (background-image, see builder.css) -- this is a plain input, so
          that rule doesn't apply, and a selected value with no dropdown
          affordance at all reads as just a text field, not a select. */}
      <svg width="10" height="7" viewBox="0 0 10 7" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fill: "#94a3b8", pointerEvents: "none" }}><path d="M0 0L5 6L10 0Z" /></svg>
      {open && (
        <div className="scroll-hover" style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50, maxHeight: 260, overflowY: "auto",
          background: "var(--bg)", border: "1px solid var(--primary-weak)", borderRadius: 8, boxShadow: "var(--shadow-md)", padding: "4px 0",
        }}>
          {filtered.length === 0 && <div className="muted" style={{ padding: "8px 10px", fontSize: 13 }}>{placeholder}</div>}
          {filtered.map((o, i) => (
            <div key={o} className="menu-item" onMouseDown={e => e.preventDefault()} onClick={() => commit(o)}
              style={{
                padding: "8px 16px", cursor: "pointer", fontSize: 14,
                background: i === activeIndex ? "var(--primary)" : "transparent",
                color: i === activeIndex ? "#fff" : "var(--text)", fontWeight: 400,
              }}>
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VerificationField({ icon, label, value, onChange, placeholder, description, defaultSubmitted }) {
  const [input, setInput] = useState(value || '');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(defaultSubmitted || !!value);

  const handleSubmit = () => {
    if (!input.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      onChange(input);
    }, 1500);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: submitted ? 'var(--success-weak)' : 'var(--panel-inset)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icon name={submitted ? 'check' : icon} size={20} style={{ color: submitted ? 'var(--success)' : 'var(--text-muted)' }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{label}</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <input className="fin" value={input} onChange={e => { setInput(e.target.value); setSubmitted(false); }} placeholder={placeholder} style={{ flex: 1, background: 'var(--panel-inset)', border: 'none' }} />
          {loading ? (
            <button type="button" className="btn" disabled style={{ padding: '0 16px', background: '#fef3c7', color: '#d97706', border: 'none', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="loader" size={14} className="spin" /> Submitting...
            </button>
          ) : submitted ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px', borderRadius: 8, background: 'var(--warning-weak)', color: 'var(--warning)', fontWeight: 600, fontSize: 13 }}>
              <Icon name="clock" size={14} /> Sent for review
            </div>
          ) : (
            <button type="button" onClick={handleSubmit} className="btn" style={{ padding: '0 16px', background: '#f1f5f9', color: 'var(--text)', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Submit for review
            </button>
          )}
        </div>
        {description && <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 8 }}>{description}</div>}
      </div>
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
  const otherLabel = t("onboardingFields.other", null, "Other");
  const hasCountry = d.country && d.country !== otherLabel;
  const hasState = d.state && d.state !== otherLabel;
  // City options come from the backend (see routes/geo.js) -- a real
  // per-country-per-state city list is a multi-MB dataset, much bigger than
  // the country/state lists bundled into the frontend, so it's fetched on
  // demand instead of shipped to every page load. An empty result (country/
  // state combo not covered, or a rare name mismatch between this and the
  // country/state data source) is exactly the signal to fall back to free
  // text -- same "no data, so it's just an input" pattern State already
  // uses when a country has no known regions.
  const cityOptions = useMemo(() => {
    if (!withCity || !hasCountry || !hasState) return [];
    const cData = Country.getAllCountries().find(c => c.name === d.country);
    if (!cData) return [];
    const sData = State.getStatesOfCountry(cData.isoCode).find(s => s.name === d.state);
    if (!sData) return [];
    return City.getCitiesOfState(cData.isoCode, sData.isoCode).map(c => c.name);
  }, [withCity, hasCountry, hasState, d.country, d.state]);
  // No country picked yet -- State still gets a real dropdown (the full,
  // cross-country list) rather than falling back to free text, so it can
  // be picked first; selecting one below then resolves Country via
  // COUNTRY_BY_STATE instead of leaving it blank.
  const regions = hasCountry ? (REGIONS_BY_COUNTRY[d.country] || []) : ALL_STATE_NAMES;
  const hasStates = regions.length > 0;
  // Settings loads a validator's already-saved country/state, which (for
  // anyone who picked "Other" during onboarding) is the typed custom text
  // itself, not the "Other" sentinel -- normalize that into the same
  // sentinel+*Other-field shape a fresh "Other" pick produces, once, so the
  // dropdown shows "Other" selected and the reveal field isn't blank
  // instead of the value looking silently lost. Onboarding's own draft
  // always starts blank, so this is a no-op there.
  useEffect(() => {
    if (d.country && d.country !== otherLabel && !COUNTRY_NAMES.includes(d.country) && !d.countryOther) {
      set("country", otherLabel);
      set("countryOther", d.country);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!d.country || d.country === otherLabel) return;
    const knownRegions = REGIONS_BY_COUNTRY[d.country] || [];
    if (d.state && d.state !== otherLabel && knownRegions.length > 0 && !knownRegions.includes(d.state) && !d.stateOther) {
      set("state", otherLabel);
      set("stateOther", d.state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const countryField = (
    <Field key="country" label={t("onboardingFields.country", null, "Country")}>
      <SearchableSelect value={d.country} onChange={v => { set("country", v); set("state", ""); }} options={[...COUNTRY_NAMES, otherLabel]} placeholder={t("onboardingFields.selectCountry", null, "Select country")} />
    </Field>
  );
  const countryOtherField = d.country === otherLabel && (
    <Field key="countryOther" label={t("onboardingFields.customCountry", null, "Your country")}>
      <input className="fin" value={d.countryOther || ""} onChange={e => set("countryOther", e.target.value)} placeholder={t("onboardingFields.customCountryPlaceholder", null, "Type your country")} />
    </Field>
  );
  const stateField = (
    <Field key="state" label={t("onboardingFields.state", null, "State")}>
      {hasStates ? (
        <SearchableSelect value={d.state} onChange={v => {
          set("state", v);
          // Only relevant for the cross-country list (no country chosen
          // yet) -- once a country's own region list is showing, every
          // option already belongs to it, nothing to resolve.
          if (!hasCountry && v !== otherLabel) {
            const inferred = COUNTRY_BY_STATE[v];
            if (inferred) set("country", inferred);
          }
        }} options={[...regions, otherLabel]} placeholder={t("onboardingFields.selectState", null, "Select state")} />
      ) : (
        <input className="fin" value={d.state || ""} onChange={e => set("state", e.target.value)} placeholder={t("onboardingFields.stateRegionPlaceholder", null, "Karnataka")} />
      )}
    </Field>
  );
  const stateOtherField = hasStates && d.state === otherLabel && (
    <Field key="stateOther" label={t("onboardingFields.customState", null, "Your state")}>
      <input className="fin" value={d.stateOther || ""} onChange={e => set("stateOther", e.target.value)} placeholder={t("onboardingFields.customStatePlaceholder", null, "Type your state")} />
    </Field>
  );
  const cityField = withCity && (
    <Field key="city" label={t("onboardingFields.city", null, "City")}>
      <SearchableSelect value={d.city} onChange={v => set("city", v)} options={[...cityOptions, otherLabel]} placeholder={t("onboardingFields.selectCity", null, "Select city")} disabled={!d.country || !d.state} />
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
  const resolveMulti = (arr) => (Array.isArray(arr) ? arr : []).filter(v => v !== "Other");
  const patch = { country: data.country === otherLabel ? data.countryOther : data.country, state: data.state === otherLabel ? data.stateOther : data.state };
  if ("occupation" in data) patch.occupation = resolveSingle(data.occupation, data.occupationOther);
  if ("city" in data) patch.city = resolveSingle(data.city, data.cityOther);
  if ("language" in data) patch.language = resolveMulti(data.language);
  if ("industry" in data) patch.industry = resolveMulti(data.industry);
  if ("domains" in data) patch.domains = resolveMulti(data.domains);
  if ("certifications" in data) patch.certifications = resolveMulti(data.certifications);
  return { ...data, ...patch };
}

// Fills onboarding fields from data the validator already saved -- either
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


const getUserIssue = (step, d) => {
  if (step === 0) {
    if (!d.name?.trim()) return { id: "name", message: "Please fill in Full name." };
    if (!d.email?.trim()) return { id: "email", message: "Please fill in Email address." };
    if (!d.mobile?.trim()) return { id: "mobile", message: "Please fill in Mobile number." };
    if (!d.dob) return { id: "dob", message: "Please fill in Date of birth." };
    if (!d.gender) return { id: "gender", message: "Please fill in Gender." };
    if (!d.country) return { id: "country", message: "Please fill in Country." };
    if (!d.state) return { id: "state", message: "Please fill in State." };
  } else if (step === 1) {
    if (!d.education) return { id: "education", message: "Please fill in Highest qualification." };
  } else if (step === 2) {
    if (!d.occupation) return { id: "occupation", message: "Please fill in Occupation." };
  } else if (step === 3) {
    if (!d.marital) return { id: "marital", message: "Please fill in Marital status." };
    if (!d.income) return { id: "income", message: "Please fill in Household income." };
  } else if (step === 4) {
    if (!d.interests?.length) return { id: "interests", message: "Please select Interests." };
    if (!d.shopping_freq) return { id: "shopping_freq", message: "Please select Shopping frequency." };
    if (!d.platforms?.length) return { id: "platforms", message: "Please select E-commerce platforms." };
  } else if (step === 6) {
    if (!d.participation?.length) return { id: "participation", message: "Please select Participation preferences." };
  } else if (step === 7) {
    if (!d.reward_pref?.length) return { id: "reward_pref", message: "Please select Reward preferences." };
  }
  return null;
};

const getValidatorIssue = (step, d) => {
  if (step === 0) {
    if (!d.name?.trim()) return { id: "name", message: "Please fill in Full name." };
    if (!d.email?.trim()) return { id: "email", message: "Please fill in Email address." };
    if (!d.mobile?.trim()) return { id: "mobile", message: "Please fill in Mobile number." };
    if (!d.dob) return { id: "dob", message: "Please fill in Date of birth." };
    if (!d.country) return { id: "country", message: "Please fill in Country." };
    if (!d.state) return { id: "state", message: "Please fill in State." };
  } else if (step === 1) {
    if (!d.education) return { id: "education", message: "Please fill in Highest qualification." };
    if (!d.occupation) return { id: "occupation", message: "Please fill in Current role." };
    if (!d.industry) return { id: "industry", message: "Please fill in Industry." };
  } else if (step === 2) {
    if (!d.verification_method) return { id: "verification_method", message: "Please select Verification method." };
  } else if (step === 3) {
    if (!d.expertise_areas?.length) return { id: "expertise_areas", message: "Please select Expertise areas." };
  } else if (step === 4) {
    if (!d.interests?.length) return { id: "interests", message: "Please select Interests." };
  } else if (step === 5) {
    if (!d.participation?.length) return { id: "participation", message: "Please select Participation preferences." };
  } else if (step === 6) {
    if (!d.reward_pref?.length) return { id: "reward_pref", message: "Please select Reward preferences." };
  }
  return null;
};

const getTesterIssue = (step, d) => {
  if (step === 0) {
    if (!d.name?.trim()) return { id: "name", message: "Please fill in Full name." };
    if (!d.email?.trim()) return { id: "email", message: "Please fill in Email address." };
    if (!d.mobile?.trim()) return { id: "mobile", message: "Please fill in Mobile number." };
    if (!d.dob) return { id: "dob", message: "Please fill in Date of birth." };
    if (!d.country) return { id: "country", message: "Please fill in Country." };
    if (!d.state) return { id: "state", message: "Please fill in State." };
  } else if (step === 1) {
    // verification is optional
  } else if (step === 2) {
    if (!d.products_tested?.length) return { id: "products_tested", message: "Please select Products you've tested." };
    if (!d.testing_areas?.length) return { id: "testing_areas", message: "Please select Testing areas." };
    if (!d.experience_years) return { id: "experience_years", message: "Please select Years of experience." };
  } else if (step === 3) {
    if (!d.job_title?.trim()) return { id: "job_title", message: "Please fill in Current job title." };
    if (!d.industry) return { id: "industry", message: "Please fill in Industry." };
    if (!d.qualification) return { id: "qualification", message: "Please fill in Highest qualification." };
  } else if (step === 4) {
    if (!d.devices_mobile?.length && !d.devices_desktop?.length && !d.devices_browser?.length) return { id: "devices_mobile", message: "Please select at least one device or browser." };
  } else if (step === 5) {
    if (!d.interests?.length) return { id: "interests", message: "Please select Interests." };
  } else if (step === 6) {
    if (!d.reward_pref?.length) return { id: "reward_pref", message: "Please select Reward preferences." };
  }
  return null;
};

function UserOnboarding({ step, onNext, vid, validator }) {
  const [showErrors, setShowErrors] = useState(false);
  const [d, setD] = useDraft(`VC_V_DRAFT_USER_${vid}`, { 
    name: "", email: validator?.email || "", mobile: "", dob: "", gender: "", country: "", state: "", district: "", city: "",
    education: "", occupation: "", marital: "", children: "", income: "",
    interests: [], shopping_freq: "", platforms: [],
    height: "", weight: "", skin_type: "", diet: "", fitness: "",
    participation: [], reward_pref: "", upi_id: ""
  }, validatorToDraft(validator));
  const issue = showErrors ? getUserIssue(step, d) : null;
  
  const set = (k, v) => { setD(p => ({ ...p, [k]: v })); };
  
  

  const EDUCATION_ARR = ["School", "Diploma", "Graduate", "Postgraduate", "Doctorate"];
  const OCCUPATIONS_ARR = ["Student", "Working Professional", "Entrepreneur", "Homemaker", "Freelancer", "Retired", "Unemployed"];
  const INCOME_ARR = ["< ₹3L", "₹3-6L", "₹6-12L", "₹12-20L", "₹20L+"];
  
  const LIFESTYLE_INTERESTS = ["Shopping", "Technology", "Food", "Travel", "Fitness", "Beauty", "Finance", "Entertainment", "Parenting", "Education"];
  const SHOPPING_FREQ = ["Daily", "Weekly", "Monthly", "Occasionally", "Rarely"];
  const PLATFORMS = ["Amazon", "Flipkart", "Myntra", "Meesho", "Offline stores"];

  const PARTICIPATION_CARDS = [
    { id: "new_product_trials", name: "New product trials", icon: "box" },
    { id: "app_testing", name: "App testing", icon: "smartphone" },
    { id: "website_reviews", name: "Website reviews", icon: "monitor" },
    { id: "research_studies", name: "Research studies", icon: "flaskConical" },
    { id: "consumer_surveys", name: "Consumer surveys", icon: "fileText" },
    { id: "product_samples", name: "Product samples", icon: "package" },
    { id: "packaging_feedback", name: "Packaging feedback", icon: "tag" },
    { id: "marketing_feedback", name: "Marketing feedback", icon: "volume2" }
  ];

  const REWARDS_ARR = ["Cash", "Gift cards", "Coupons", "Product samples"];

  return (
    <form id="v-onboarding-form" onSubmit={(e) => { 
  e.preventDefault(); 
  const err = getUserIssue(step, d);
  if (err) {
    setShowErrors(true);
    requestAnimationFrame(() => {
      document.querySelector(`[data-field="${err.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  } else {
    setShowErrors(false);
    onNext(d);
  }
}} className="rise" style={{ maxWidth: 720, margin: "0 auto", background: "var(--panel)", borderRadius: 16, border: "1px solid var(--border)", padding: "40px" }}>
      {step === 0 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Let's get to know you</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              This stays private. We use it to match you with products and studies that actually fit your life — and to send your rewards.
            </p>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0 0 28px 0" }} />
          
          <Field label="Full name" required dataField="name" issue={issue} invalid={showErrors && !d.name?.trim()}>
            <div className="inw has-pre">
              <span className="pre"><Icon name="user" size={14} /></span>
              <input className="fin" value={d.name} onChange={e => set("name", e.target.value)} placeholder="Your full name" style={{ background: "var(--panel-inset)", border: "none" }} />
            </div>
          </Field>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <Field label="Email address" required dataField="email" issue={issue} invalid={showErrors && !d.email?.trim()}>
              <div className="inw has-pre">
                <span className="pre"><Icon name="mail" size={14} /></span>
                <input className="fin" type="email" value={d.email} onChange={e => set("email", e.target.value)} placeholder="your@email.com" style={{ background: "var(--panel-inset)", border: "none" }} />
                {d.email && <span className="suf"><Icon name="check" size={16} style={{ color: "var(--success)" }} /></span>}
              </div>
            </Field>
            <Field label="Mobile number" required dataField="mobile" issue={issue} invalid={showErrors && !d.mobile?.trim()}>
              <div className="inw has-pre">
                <span className="pre" style={{ fontWeight: 600 }}>+91</span>
                <input className="fin" value={d.mobile} onChange={e => set("mobile", e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" style={{ background: "var(--panel-inset)", border: "none" }} />
              </div>
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <Field label="Date of birth" required dataField="dob" issue={issue} invalid={showErrors && !d.dob}>
              <div className="inw has-pre">
                <span className="pre"><Icon name="calendar" size={14} /></span>
                <input className="fin" type="date" value={d.dob} onChange={e => set("dob", e.target.value)} style={{ background: "var(--panel-inset)", border: "none" }} />
              </div>
            </Field>
            <Field label="Gender" required dataField="gender" issue={issue} invalid={showErrors && !d.gender}>
              <select className="fin" value={d.gender} onChange={e => set("gender", e.target.value)} style={{ background: "var(--panel-inset)", border: "none", width: "100%", padding: "12px 16px", borderRadius: 8 }}>
                <option value="" disabled>Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </Field>
          </div>

          <div style={{ display: "flex", alignItems: "center", fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 12, gap: 12 }}><span>Location</span><div style={{ flex: 1, height: 1, background: "var(--border)" }} /></div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <Field label="Country" required dataField="country" issue={issue} invalid={showErrors && !d.country}>
              <select className="fin" value={d.country} onChange={e => set("country", e.target.value)} style={{ background: "var(--panel-inset)", border: "none", width: "100%", padding: "12px 16px", borderRadius: 8 }}>
                <option value="" disabled>Select country</option>
                <option value="India">India</option>
              </select>
            </Field>
            <Field label="State" required dataField="state" issue={issue} invalid={showErrors && !d.state}>
              <select className="fin" value={d.state} onChange={e => set("state", e.target.value)} style={{ background: "var(--panel-inset)", border: "none", width: "100%", padding: "12px 16px", borderRadius: 8 }}>
                <option value="" disabled>Select state</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Delhi">Delhi</option>
              </select>
            </Field>
            <Field label={<>District <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>optional</span></>}>
              <select className="fin" value={d.district} onChange={e => set("district", e.target.value)} style={{ background: "var(--panel-inset)", border: "none", width: "100%", padding: "12px 16px", borderRadius: 8 }}>
                <option value="" disabled>Select district</option>
                <option value="Madurai">Madurai</option>
                <option value="Chennai">Chennai</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Bengaluru">Bengaluru</option>
              </select>
            </Field>
            <Field label={<>City <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>optional</span></>}>
              <div className="inw has-pre">
                <span className="pre"><Icon name="mapPin" size={14} /></span>
                <input className="fin" value={d.city} onChange={e => set("city", e.target.value)} placeholder="e.g. Madurai" style={{ background: "var(--panel-inset)", border: "none" }} />
              </div>
            </Field>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Your education</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              A quick one — it helps with relevant matching.
            </p>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0 0 28px 0" }} />
          
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
            <span style={{ display: "inline-block", marginRight: 12 }}>Highest qualification</span>
            <span style={{ height: 1, background: "var(--border)", display: "inline-block", verticalAlign: "middle", width: "calc(100% - 150px)" }} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {EDUCATION_ARR.map(e => (
              <button
                key={e} type="button" onClick={() => set("education", e)}
                style={{ padding: "8px 16px", borderRadius: 20, border: d.education === e ? "2px solid var(--primary)" : "1px solid var(--border)", background: d.education === e ? "var(--primary-weak)" : "#fff", color: d.education === e ? "var(--primary)" : "var(--text)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >{e}</button>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>What do you do?</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              Pick what fits best — we'll ask one or two follow-ups based on your choice.
            </p>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0 0 28px 0" }} />
          
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
            <span style={{ display: "inline-block", marginRight: 12 }}>Occupation</span>
            <span style={{ height: 1, background: "var(--border)", display: "inline-block", verticalAlign: "middle", width: "calc(100% - 100px)" }} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {OCCUPATIONS_ARR.map(o => (
              <button
                key={o} type="button" onClick={() => set("occupation", o)}
                style={{ padding: "8px 16px", borderRadius: 20, border: d.occupation === o ? "2px solid var(--primary)" : "1px solid var(--border)", background: d.occupation === o ? "var(--primary-weak)" : "#fff", color: d.occupation === o ? "var(--primary)" : "var(--text)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >{o}</button>
            ))}
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Your household</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              Brands often match by household profile — this unlocks family and lifestyle studies.
            </p>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0 0 28px 0" }} />
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <Field label="Marital status" required dataField="marital" issue={issue} invalid={showErrors && !d.marital}>
              <select className="fin" value={d.marital} onChange={e => set("marital", e.target.value)} style={{ background: "var(--panel-inset)", border: "none", width: "100%", padding: "12px 16px", borderRadius: 8 }}>
                <option value="" disabled>Select</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
              </select>
            </Field>
            <Field label={<>Number of children <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>optional</span></>}>
              <select className="fin" value={d.children} onChange={e => set("children", e.target.value)} style={{ background: "var(--panel-inset)", border: "none", width: "100%", padding: "12px 16px", borderRadius: 8 }}>
                <option value="">None</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3+">3+</option>
              </select>
            </Field>
          </div>
          
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Household income (annual)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {INCOME_ARR.map(i => (
              <button
                key={i} type="button" onClick={() => set("income", i)}
                style={{ padding: "8px 16px", borderRadius: 20, border: d.income === i ? "2px solid var(--primary)" : "1px solid var(--border)", background: d.income === i ? "var(--primary-weak)" : "#fff", color: d.income === i ? "var(--primary)" : "var(--text)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >{i}</button>
            ))}
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>What are you into?</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              The more we know about your tastes and habits, the better the products we'll match you with.
            </p>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0 0 28px 0" }} />
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              <span style={{ display: "inline-block", marginRight: 12 }}>Interests</span>
              <span style={{ height: 1, background: "var(--border)", display: "inline-block", verticalAlign: "middle", width: "100%", position: "absolute", zIndex: -1, left: 75, right: 100 }} />
            </div>
            <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, background: "var(--panel)", paddingLeft: 8 }}>{d.interests.length} selected</div>
          </div>
          <div data-field="interests" style={{marginBottom:10}}>{showErrors && (!d.interests || d.interests.length===0) && <span style={{color:"var(--danger)", fontSize:13, fontWeight:400, textTransform:"none"}}>* Please select Interests.</span>}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
            {LIFESTYLE_INTERESTS.map(a => {
              const active = d.interests.includes(a);
              return (
                <button
                  key={a} type="button" onClick={() => set("interests", toggle(d.interests, a))}
                  style={{ padding: "8px 16px", borderRadius: 20, border: active ? "2px solid var(--primary)" : "1px solid var(--border)", background: active ? "var(--primary-weak)" : "#fff", color: active ? "var(--primary)" : "var(--text)", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                >
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: active ? "none" : "2px solid var(--panel-inset)", background: active ? "var(--primary)" : "transparent", display: "grid", placeItems: "center" }}>
                    {active && <Icon name="check" size={10} style={{ color: "#fff" }} />}
                  </div>
                  {a}
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
            <span style={{ display: "inline-block", marginRight: 12 }}>How often do you shop online?</span>
            <span style={{ height: 1, background: "var(--border)", display: "inline-block", verticalAlign: "middle", width: "calc(100% - 220px)" }} />
          </div>
          <div data-field="shopping_freq" style={{marginBottom:10}}>{showErrors && !d.shopping_freq && <span style={{color:"var(--danger)", fontSize:13, fontWeight:400, textTransform:"none"}}>* Please select Shopping frequency.</span>}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
            {SHOPPING_FREQ.map(f => (
              <button
                key={f} type="button" onClick={() => set("shopping_freq", f)}
                style={{ padding: "8px 16px", borderRadius: 20, border: d.shopping_freq === f ? "2px solid var(--primary)" : "1px solid var(--border)", background: d.shopping_freq === f ? "var(--primary-weak)" : "#fff", color: d.shopping_freq === f ? "var(--primary)" : "var(--text)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >{f}</button>
            ))}
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
            <span style={{ display: "inline-block", marginRight: 12 }}>Platforms you use</span>
            <span style={{ height: 1, background: "var(--border)", display: "inline-block", verticalAlign: "middle", width: "calc(100% - 140px)" }} />
          </div>
          <div data-field="platforms" style={{marginBottom:10}}>{showErrors && (!d.platforms || d.platforms.length===0) && <span style={{color:"var(--danger)", fontSize:13, fontWeight:400, textTransform:"none"}}>* Please select E-commerce platforms.</span>}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {PLATFORMS.map(p => {
              const active = d.platforms.includes(p);
              return (
                <button
                  key={p} type="button" onClick={() => set("platforms", toggle(d.platforms, p))}
                  style={{ padding: "8px 16px", borderRadius: 20, border: active ? "2px solid var(--primary)" : "1px solid var(--border)", background: active ? "var(--primary-weak)" : "#fff", color: active ? "var(--primary)" : "var(--text)", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                >
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: active ? "none" : "2px solid var(--panel-inset)", background: active ? "var(--primary)" : "transparent", display: "grid", placeItems: "center" }}>
                    {active && <Icon name="check" size={10} style={{ color: "#fff" }} />}
                  </div>
                  {p}
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Unlock better matches</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              Completely optional — share a little more and we'll match you to higher-paying fashion, beauty, food and fitness studies. Skip anything you'd rather not answer.
            </p>
          </div>
          
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, background: "var(--success-weak)", border: "1px solid var(--success)", padding: "16px", borderRadius: 12, marginBottom: 28 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--success)", display: "grid", placeItems: "center", flexShrink: 0, color: "#fff" }}>
              <Icon name="zap" size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Unlock better-paid matches</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)" }}>These are used only for matching and are never shown to brands as personal data.</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid var(--success)", color: "var(--success)", fontWeight: 700, fontSize: 12, padding: "4px 12px", borderRadius: 20 }}>Optional</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <Field label={<>Height range <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>optional</span></>}>
              <select className="fin" value={d.height} onChange={e => set("height", e.target.value)} style={{ background: "var(--panel-inset)", border: "none", width: "100%", padding: "12px 16px", borderRadius: 8 }}>
                <option value="">Prefer not to say</option>
                <option value="< 5'0&quot;">&lt; 5'0&quot;</option>
                <option value="5'0&quot; - 5'5&quot;">5'0&quot; - 5'5&quot;</option>
                <option value="5'5&quot; - 6'0&quot;">5'5&quot; - 6'0&quot;</option>
                <option value="> 6'0&quot;">&gt; 6'0&quot;</option>
              </select>
            </Field>
            <Field label={<>Weight range <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>optional</span></>}>
              <select className="fin" value={d.weight} onChange={e => set("weight", e.target.value)} style={{ background: "var(--panel-inset)", border: "none", width: "100%", padding: "12px 16px", borderRadius: 8 }}>
                <option value="">Prefer not to say</option>
                <option value="< 50kg">&lt; 50kg</option>
                <option value="50-70kg">50-70kg</option>
                <option value="70-90kg">70-90kg</option>
                <option value="> 90kg">&gt; 90kg</option>
              </select>
            </Field>
            <Field label={<>Skin type <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>optional</span></>}>
              <select className="fin" value={d.skin_type} onChange={e => set("skin_type", e.target.value)} style={{ background: "var(--panel-inset)", border: "none", width: "100%", padding: "12px 16px", borderRadius: 8 }}>
                <option value="">Prefer not to say</option>
                <option value="Oily">Oily</option>
                <option value="Dry">Dry</option>
                <option value="Combination">Combination</option>
                <option value="Normal">Normal</option>
              </select>
            </Field>
            <Field label={<>Dietary preference <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>optional</span></>}>
              <select className="fin" value={d.diet} onChange={e => set("diet", e.target.value)} style={{ background: "var(--panel-inset)", border: "none", width: "100%", padding: "12px 16px", borderRadius: 8 }}>
                <option value="">Prefer not to say</option>
                <option value="Vegetarian">Vegetarian</option>
                <option value="Non-Vegetarian">Non-Vegetarian</option>
                <option value="Vegan">Vegan</option>
              </select>
            </Field>
            <Field label={<>Fitness level <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>optional</span></>}>
              <select className="fin" value={d.fitness} onChange={e => set("fitness", e.target.value)} style={{ background: "var(--panel-inset)", border: "none", width: "100%", padding: "12px 16px", borderRadius: 8 }}>
                <option value="">Prefer not to say</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </Field>
          </div>
        </>
      )}

      {step === 6 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>What would you like to take part in?</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              Pick everything you're open to — you can change this anytime.
            </p>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0 0 28px 0" }} />
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              <span style={{ display: "inline-block", marginRight: 12 }}>Participation preferences</span>
              <span style={{ height: 1, background: "var(--border)", display: "inline-block", verticalAlign: "middle", width: "100%", position: "absolute", zIndex: -1, left: 200, right: 100 }} />
            </div>
            <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, background: "var(--panel)", paddingLeft: 8 }}>{d.participation.length} selected</div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {PARTICIPATION_CARDS.map(f => {
              const active = d.participation.includes(f.id);
              return (
                <button
                  key={f.id} type="button" onClick={() => set("participation", toggle(d.participation, f.id))}
                  style={{ textAlign: "left", padding: "16px", borderRadius: 12, border: active ? "2px solid var(--primary)" : "1px solid var(--border)", background: active ? "var(--primary-weak)" : "#fff", cursor: "pointer", display: "flex", flexDirection: "column", gap: 16, position: "relative" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ color: active ? "var(--primary)" : "var(--text-muted)" }}>
                      <Icon name={f.icon} size={20} />
                    </div>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: active ? "none" : "2px solid var(--border)", background: active ? "var(--primary)" : "transparent", display: "grid", placeItems: "center" }}>
                      {active && <Icon name="check" size={10} style={{ color: "#fff" }} />}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>{f.name}</div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === 7 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>How would you like to be rewarded?</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              Every survey, trial and review pays. Choose how you'd like to receive it.
            </p>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0 0 28px 0" }} />
          
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
            <span style={{ display: "inline-block", marginRight: 12 }}>Preferred reward</span>
            <span style={{ height: 1, background: "var(--border)", display: "inline-block", verticalAlign: "middle", width: "calc(100% - 130px)" }} />
          </div>
          
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
            {REWARDS_ARR.map(r => (
              <button
                key={r} type="button" onClick={() => set("reward_pref", toggle(d.reward_pref, r))}
                style={{ padding: "8px 16px", borderRadius: 20, border: d.reward_pref.includes(r) ? "2px solid var(--primary)" : "1px solid var(--border)", background: d.reward_pref.includes(r) ? "var(--primary-weak)" : "#fff", color: d.reward_pref.includes(r) ? "var(--primary)" : "var(--text)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                {r}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
            <span style={{ display: "inline-block", marginRight: 12 }}>Payout details</span>
            <span style={{ height: 1, background: "var(--border)", display: "inline-block", verticalAlign: "middle", width: "calc(100% - 110px)" }} />
          </div>
          
          <Field label={<>UPI ID <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>optional</span></>} hint="Where we'll send your rewards. You can add this later.">
            <div className="inw has-pre">
              <span className="pre"><Icon name="zap" size={14} /></span>
              <input className="fin" value={d.upi_id || ""} onChange={e => set("upi_id", e.target.value)} placeholder="yourname@upi" style={{ background: "var(--panel-inset)", border: "none" }} />
            </div>
          </Field>
        </>
      )}
    </form>
  );
}

function ValidatorOnboarding({ step, onNext, error, vid, validator }) {
  const [showErrors, setShowErrors] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  
  const [d, setD] = useDraft(`VC_V_DRAFT_VALIDATOR_${vid}`, { 
    name: "", email: validator?.email || "", mobile: "", dob: "", country: "", state: "", district: "", city: "",
    linkedin_url: "", resume_filename: "", professional_license: "", certification: "",
    current_role: "", industry: "", company: "", experience: "",
    expertise_areas: [],
    interests: [], participation: [], reward_pref: ""
  }, validatorToDraft(validator));
  const issue = showErrors ? getValidatorIssue(step, d) : null;
  const set = (k, v) => { setD(p => ({ ...p, [k]: v })); };
  
  

  const pickResume = async (f) => {
    setResumeError("");
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.endsWith(".docx")) {
      setResumeError("Only PDF or DOCX files are accepted.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setResumeError("File is too large — max 10MB.");
      return;
    }
    setResumeFile(f);
    setResumeUploading(true);
    setTimeout(() => {
      set("resume_filename", f.name);
      setResumeUploading(false);
      setResumeUploaded(true);
    }, 800);
  };

  const EXPERTISE_AREAS = [
    "AI & Automation", "Product Management", "Human Resources", "Marketing", 
    "Finance", "Healthcare", "Education", "Law", "Public Policy", 
    "Entrepreneurship", "Consumer Behaviour"
  ];
  
  const INTERESTS_ARR = [
    "Startups", "Technology", "Investing", "Leadership", "Innovation", 
    "Business Strategy", "Research"
  ];

  const PARTICIPATION_FORMATS = [
    { id: "surveys", name: "Surveys", desc: "Quick & structured", icon: "fileText" },
    { id: "interviews", name: "Interviews", desc: "In-depth 1:1s", icon: "mail" },
    { id: "product_reviews", name: "Product reviews", desc: "Hands-on assessment", icon: "box" },
    { id: "focus_groups", name: "Focus groups", desc: "Moderated panels", icon: "users" },
    { id: "expert_opinions", name: "Expert opinions", desc: "Your professional take", icon: "star" },
    { id: "live_discussions", name: "Live discussions", desc: "Real-time sessions", icon: "monitor" }
  ];

  const REWARDS_ARR = ["Cash", "Gift cards", "Donations", "Product samples"];

  const ROLES_ARR = ["Product Manager", "Designer", "Engineer", "Researcher", "Executive", "Other"];

  return (
    <form id="v-onboarding-form" onSubmit={(e) => { 
  e.preventDefault(); 
  const err = getValidatorIssue(step, d);
  if (err) {
    setShowErrors(true);
    requestAnimationFrame(() => {
      document.querySelector(`[data-field="${err.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  } else {
    setShowErrors(false);
    onNext(d);
  }
}} className="rise" style={{ maxWidth: 720, margin: "0 auto", background: "var(--panel)", borderRadius: 16, border: "1px solid var(--border)", padding: "40px" }}>
      {step === 0 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Tell us about yourself</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              This stays private. We use it to match you with opportunities where your judgment is valuable.
            </p>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0 0 28px 0" }} />
          
          <Field label="Full name" required dataField="name" issue={issue} invalid={showErrors && !d.name?.trim()}>
            <div className="inw has-pre">
              <span className="pre"><Icon name="user" size={14} /></span>
              <input className="fin" value={d.name} onChange={e => set("name", e.target.value)} placeholder="Your full name" style={{ background: "var(--panel-inset)", border: "none" }} />
            </div>
          </Field>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <Field label="Email address" required dataField="email" issue={issue} invalid={showErrors && !d.email?.trim()}>
              <div className="inw has-pre">
                <span className="pre"><Icon name="mail" size={14} /></span>
                <input className="fin" type="email" value={d.email} onChange={e => set("email", e.target.value)} placeholder="you@example.com" style={{ background: "var(--panel-inset)", border: "none" }} />
                {d.email && <span style={{ position: "absolute", right: 12, top: 12, color: "var(--success)" }}><Icon name="check" size={14} /></span>}
              </div>
            </Field>
            <Field label="Mobile number" required dataField="mobile" issue={issue} invalid={showErrors && !d.mobile?.trim()}>
              <div className="inw has-pre">
                <span className="pre" style={{ fontWeight: 600 }}>+91</span>
                <input className="fin" value={d.mobile} onChange={e => set("mobile", e.target.value)} placeholder="1234567890" style={{ background: "var(--panel-inset)", border: "none" }} />
              </div>
            </Field>
          </div>
          
          <Field label="Date of birth" required dataField="dob" issue={issue} invalid={showErrors && !d.dob}>
            <div className="inw has-pre" style={{ width: "50%" }}>
              <input className="fin" type="date" value={d.dob} onChange={e => set("dob", e.target.value)} style={{ background: "var(--panel-inset)", border: "none" }} />
            </div>
          </Field>
          
          <div style={{ display: "flex", alignItems: "center", fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 12, marginTop: 24, gap: 12 }}><span>Location</span><div style={{ flex: 1, height: 1, background: "var(--border)" }} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <Field label="Country" required dataField="country" issue={issue} invalid={showErrors && !d.country}>
              <SearchableSelect value={d.country} onChange={v => set("country", v)} options={["India", "United States", "United Kingdom", "Canada"]} placeholder="Select country" />
            </Field>
            <Field label="State" required dataField="state" issue={issue} invalid={showErrors && !d.state}>
              <SearchableSelect value={d.state} onChange={v => set("state", v)} options={["Tamil Nadu", "Maharashtra", "Karnataka", "Delhi"]} placeholder="Select state" />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label={<>District <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>optional</span></>}>
              <SearchableSelect value={d.district} onChange={v => set("district", v)} options={["Madurai", "Chennai", "Coimbatore"]} placeholder="Select district" />
            </Field>
            <Field label={<>City <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>optional</span></>}>
              <div className="inw has-pre">
                <span className="pre"><Icon name="mapPin" size={14} /></span>
                <input className="fin" value={d.city} onChange={e => set("city", e.target.value)} placeholder="Your city" style={{ background: "var(--panel-inset)", border: "none" }} />
              </div>
            </Field>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Verify your expertise</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              Your credibility is the product. Verified experts are matched to higher-value, better-paid opportunities.
            </p>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0 0 28px 0" }} />
          
          <div style={{ display: "flex", alignItems: "center", fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 12, gap: 12 }}><span>Add any one</span><div style={{ flex: 1, height: 1, background: "var(--border)" }} /></div>
          <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <VerificationField
              icon="link"
              label="LinkedIn profile"
              value={d.linkedin_url}
              onChange={v => set("linkedin_url", v)}
              placeholder="linkedin.com/in/_"
              description="We confirm your role and experience from your public profile."
              defaultSubmitted={!!d.linkedin_url}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 12, gap: 12 }}><span>Resume / CV <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>optional</span></span><div style={{ flex: 1, height: 1, background: "var(--border)" }} /></div>
          {resumeUploaded ? (
            <div style={{ border: "1px solid var(--success)", borderRadius: 12, padding: 20, marginBottom: 32, background: "var(--success-weak)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <Icon name="fileText" size={20} style={{ color: "var(--success)" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>{resumeFile?.name || d.resume_filename || "Approval_Letter.pdf"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Uploaded - {resumeFile ? Math.round(resumeFile.size / 1024) : 248} KB</div>
                </div>
                <button type="button" className="btn" style={{ padding: "8px 16px", background: "#fff", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, fontWeight: 600, fontSize: 13 }} onClick={() => { setResumeFile(null); setResumeUploaded(false); set("resume_filename", ""); }}>Replace</button>
              </div>
            </div>
          ) : (
            <label style={{ display: "block", border: "2px dashed var(--border)", borderRadius: 12, padding: 24, marginBottom: 32, cursor: "pointer", background: "var(--panel-2)" }}>
              <input type="file" accept="application/pdf,.docx" style={{ display: "none" }} onChange={e => pickResume(e.target.files[0])} />
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: "#fff", border: "1px solid var(--border)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  {resumeUploading ? <Icon name="clock" size={20} style={{ color: "var(--warning)" }} /> : <Icon name="fileText" size={20} style={{ color: "var(--text-muted)" }} />}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{resumeUploading ? "Uploading..." : "Drop a file or click to upload"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)" }}>PDF or DOCX up to 10 MB</div>
                </div>
              </div>
            </label>
          )}
          {resumeError && <div className="err-banner" style={{ marginTop: 8, marginBottom: 24 }}>{resumeError}</div>}

          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0 0 24px 0" }} />
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Optional credentials</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <Field label={<>Professional license <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>optional</span></>}>
              <div className="inw has-pre">
                <span className="pre"><Icon name="fileText" size={14} /></span>
                <input className="fin" value={d.professional_license} onChange={e => set("professional_license", e.target.value)} placeholder="License / registration no." style={{ background: "var(--panel-inset)", border: "none" }} />
              </div>
            </Field>
            <Field label={<>Certification <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>optional</span></>}>
              <div className="inw has-pre">
                <span className="pre"><Icon name="star" size={14} /></span>
                <input className="fin" value={d.certification} onChange={e => set("certification", e.target.value)} placeholder="e.g. PMP, CFA, MD" style={{ background: "var(--panel-inset)", border: "none" }} />
              </div>
            </Field>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Your professional background</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              This places you in the right domain so you only see opportunities that fit your authority.
            </p>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0 0 28px 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <Field label="Current role" required dataField="occupation" issue={issue} invalid={showErrors && !d.occupation}>
              <SearchableSelect value={d.current_role} onChange={v => set("current_role", v)} options={ROLES_ARR} placeholder="Select role" />
            </Field>
            <Field label="Industry" required dataField="industry" issue={issue} invalid={showErrors && !d.industry}>
              <SearchableSelect value={d.industry} onChange={v => set("industry", v)} options={INDUSTRIES} placeholder="Select industry" />
            </Field>
          </div>
          <Field label={<>Current company <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>optional</span></>}>
            <div className="inw has-pre">
              <span className="pre"><Icon name="home" size={14} /></span>
              <input className="fin" value={d.company} onChange={e => set("company", e.target.value)} placeholder="e.g. Google" style={{ background: "var(--panel-inset)", border: "none" }} />
            </div>
          </Field>
          
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>
            <span style={{ display: "inline-block", marginRight: 12 }}>Experience</span>
            <span style={{ flex: 1, height: 1, background: "var(--border)", display: "inline-block", verticalAlign: "middle", width: "100%" }} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {["0-2 years", "3-5 years", "6-10 years", "10-15 years", "15+ years"].map(y => (
              <button
                key={y}
                type="button"
                onClick={() => set("experience", y)}
                style={{ padding: "8px 16px", borderRadius: 20, border: d.experience === y ? "2px solid var(--primary)" : "1px solid var(--border)", background: d.experience === y ? "var(--primary-weak)" : "#fff", color: d.experience === y ? "var(--primary)" : "var(--text)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                {y}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>What can you speak to with authority?</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              Select the topics you can give meaningful, professional feedback on. This is the heart of your match quality.
            </p>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0 0 28px 0" }} />
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Expertise areas</div>
            <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600 }}>{d.expertise_areas.length} selected</div>
          </div>
          <div data-field="expertise_areas" style={{marginBottom:10}}>{showErrors && (!d.expertise_areas || d.expertise_areas.length===0) && <span style={{color:"var(--danger)", fontSize:13, fontWeight:400, textTransform:"none"}}>* Please select Expertise areas.</span>}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {EXPERTISE_AREAS.map(a => {
              const active = d.expertise_areas.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => set("expertise_areas", toggle(d.expertise_areas, a))}
                  style={{ padding: "8px 16px", borderRadius: 20, border: active ? "2px solid var(--primary)" : "1px solid var(--border)", background: active ? "var(--primary-weak)" : "#fff", color: active ? "var(--primary)" : "var(--text)", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                >
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: active ? "none" : "2px solid var(--panel-inset)", background: active ? "var(--primary)" : "transparent", display: "grid", placeItems: "center" }}>
                    {active && <Icon name="check" size={10} style={{ color: "#fff" }} />}
                  </div>
                  {a}
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>What interests you?</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              We'll prioritise opportunities aligned with what you enjoy.
            </p>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0 0 28px 0" }} />
          
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
            <span style={{ display: "inline-block", marginRight: 12 }}>Interests</span>
            <span style={{ height: 1, background: "var(--border)", display: "inline-block", verticalAlign: "middle", width: "calc(100% - 70px)" }} />
          </div>
          
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {INTERESTS_ARR.map(a => {
              const active = d.interests.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => set("interests", toggle(d.interests, a))}
                  style={{ padding: "8px 16px", borderRadius: 20, border: active ? "2px solid var(--primary)" : "1px solid var(--border)", background: active ? "var(--primary-weak)" : "#fff", color: active ? "var(--primary)" : "var(--text)", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                >
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: active ? "none" : "2px solid var(--panel-inset)", background: active ? "var(--primary)" : "transparent", display: "grid", placeItems: "center" }}>
                    {active && <Icon name="check" size={10} style={{ color: "#fff" }} />}
                  </div>
                  {a}
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>How would you like to contribute?</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              Pick the formats you're open to. Different formats pay differently — experts opinions and interviews pay the most.
            </p>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0 0 28px 0" }} />
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              <span style={{ display: "inline-block", marginRight: 12 }}>Participation preferences</span>
              <span style={{ height: 1, background: "var(--border)", display: "inline-block", verticalAlign: "middle", width: "100%", position: "absolute", zIndex: -1, left: 160, right: 100 }} />
            </div>
            <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, background: "var(--panel)", paddingLeft: 8 }}>{d.participation.length} selected</div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {PARTICIPATION_FORMATS.map(f => {
              const active = d.participation.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => set("participation", toggle(d.participation, f.id))}
                  style={{ textAlign: "left", padding: "16px", borderRadius: 12, border: active ? "2px solid var(--primary)" : "1px solid var(--border)", background: active ? "var(--primary-weak)" : "#fff", cursor: "pointer", display: "flex", flexDirection: "column", gap: 16, position: "relative" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ color: active ? "var(--primary)" : "var(--text-muted)" }}>
                      <Icon name={f.icon} size={20} />
                    </div>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: active ? "none" : "2px solid var(--border)", background: active ? "var(--primary)" : "transparent", display: "grid", placeItems: "center" }}>
                      {active && <Icon name="check" size={10} style={{ color: "#fff" }} />}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>{f.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{f.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === 6 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>How would you like to be rewarded?</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              Every contribution pays. Choose how you'd like to receive it — or donate it.
            </p>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0 0 28px 0" }} />
          
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
            <span style={{ display: "inline-block", marginRight: 12 }}>Preferred reward</span>
            <span style={{ height: 1, background: "var(--border)", display: "inline-block", verticalAlign: "middle", width: "calc(100% - 130px)" }} />
          </div>
          
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
            {REWARDS_ARR.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => set("reward_pref", toggle(d.reward_pref, r))}
                style={{ padding: "8px 16px", borderRadius: 20, border: d.reward_pref.includes(r) ? "2px solid var(--primary)" : "1px solid var(--border)", background: d.reward_pref.includes(r) ? "var(--primary-weak)" : "#fff", color: d.reward_pref.includes(r) ? "var(--primary)" : "var(--text)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                {r}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
            <span style={{ display: "inline-block", marginRight: 12 }}>Payout details</span>
            <span style={{ height: 1, background: "var(--border)", display: "inline-block", verticalAlign: "middle", width: "calc(100% - 110px)" }} />
          </div>
          
          <Field label={<>UPI ID <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>optional</span></>} hint="Where we'll send your rewards. You can add this later.">
            <div className="inw has-pre">
              <span className="pre"><Icon name="zap" size={14} /></span>
              <input className="fin" value={d.upi_id || ""} onChange={e => set("upi_id", e.target.value)} placeholder="yourname@upi" style={{ background: "var(--panel-inset)", border: "none" }} />
            </div>
          </Field>
        </>
      )}

      {error && <div className="err-banner" style={{ marginTop: 16 }}>{error}</div>}
    </form>
  );
}

function TesterOnboarding({ step, onNext, error, vid, validator }) {
  const [showErrors, setShowErrors] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [d, setD] = useDraft(`VC_V_DRAFT_TESTER_${vid}`, { 
    name: "", email: validator?.email || "", mobile: "", dob: "", city: "", country: "", state: "", 
    linkedin_url: "", portfolio_url: "", github_url: "", resume_filename: "",
    products_tested: [], testing_areas: [], experience_years: "",
    job_title: "", company: "", industry: "", qualification: "",
    devices_mobile: [], devices_desktop: [], devices_browser: [],
    interests: [], reward_pref: "", upi_id: ""
  }, validatorToDraft(validator));
  const issue = showErrors ? getTesterIssue(step, d) : null;
  
  const cityOptions = useMemo(() => {
    if (!d.country || !d.state) return [];
    const cData = Country.getAllCountries().find(c => c.name === d.country);
    if (!cData) return [];
    const sData = State.getStatesOfCountry(cData.isoCode).find(s => s.name === d.state);
    if (!sData) return [];
    return City.getCitiesOfState(cData.isoCode, sData.isoCode).map(c => c.name);
  }, [d.country, d.state]);

  const set = (k, v) => { setD(p => ({ ...p, [k]: v })); };
  
  

  const pickResume = async (f) => {
    setResumeError("");
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.endsWith(".docx")) {
      setResumeError("Only PDF or DOCX files are accepted.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setResumeError("File is too large — max 10MB.");
      return;
    }
    setResumeFile(f);
    setResumeUploading(true);
    try {
      await vapi.uploadResume(f);
      set("resume_filename", f.name);
      setResumeUploaded(true);
    } catch (err) {
      setResumeError(err.message || "Upload failed. Please try again.");
      setResumeFile(null);
    } finally {
      setResumeUploading(false);
    }
  };

  const PROD_TESTED = [
    { id: "Websites", icon: "monitor" },
    { id: "Mobile apps", icon: "smartphone" },
    { id: "SaaS products", icon: "cloud" },
    { id: "AI products", icon: "settings" },
    { id: "APIs", icon: "layers" },
    { id: "Games", icon: "zap" },
    { id: "E-commerce", icon: "tag" },
    { id: "Physical products", icon: "box" },
    { id: "Hardware devices", icon: "cpu" }
  ];

  const TESTING_AREAS = ["Functional", "Usability", "UX", "Accessibility", "Security", "Performance", "Beta", "Exploratory"];
  const EXP_YEARS = ["< 1 year", "1-3 years", "3-5 years", "5-10 years", "10+ years"];
  const QUALIFICATIONS = ["High School", "Bachelor's", "Master's", "PhD", "Other"];
  const INTERESTS = ["AI", "SaaS", "Fintech", "EdTech", "Healthcare", "E-commerce", "Gaming", "Enterprise Software"];
  const REWARD_PREFS = ["Cash", "Gift cards", "Vouchers", "Product samples"];

  const toggle = (arr, val) => arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  return (
    <form id="v-onboarding-form" onSubmit={(e) => { 
  e.preventDefault(); 
  const err = getTesterIssue(step, d);
  if (err) {
    setShowErrors(true);
    requestAnimationFrame(() => {
      document.querySelector(`[data-field="${err.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  } else {
    setShowErrors(false);
    onNext(d);
  }
}} className="rise" style={{ maxWidth: 720, margin: "0 auto", background: "var(--panel)", borderRadius: 16, border: "1px solid var(--border)", padding: "40px" }}>
      {step === 0 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Tell us about yourself</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              This stays private. We use it to match you with testing opportunities near you and send your rewards.
            </p>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0 0 28px 0" }} />

          <Field label="Full name" required dataField="name" issue={issue} invalid={showErrors && !d.name?.trim()}>
            <div className="inw has-pre">
              <span className="pre"><Icon name="user" size={14} /></span>
              <input className="fin" value={d.name} onChange={e => set("name", e.target.value)} />
            </div>
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Email address" required dataField="email" issue={issue} invalid={showErrors && !d.email?.trim()}>
              <div className="inw has-pre has-post">
                <span className="pre"><Icon name="mail" size={14} /></span>
                <input className="fin" type="email" value={d.email} onChange={e => set("email", e.target.value)} />
                <span className="post"><Icon name="check" size={14} style={{ color: "var(--success)" }} /></span>
              </div>
            </Field>
            <Field label="Mobile number" required dataField="mobile" issue={issue} invalid={showErrors && !d.mobile?.trim()}>
              <div className="inw has-pre">
                <span className="pre" style={{ fontWeight: 600, color: "var(--text-muted)" }}>+91</span>
                <input className="fin" type="tel" value={d.mobile} onChange={e => set("mobile", e.target.value)} />
              </div>
            </Field>
          </div>

          <div style={{ maxWidth: "50%", paddingRight: 8 }}>
            <Field label="Date of birth" required dataField="dob" issue={issue} invalid={showErrors && !d.dob}>
              <div className="inw has-post">
                <input className="fin" type="date" value={d.dob} onChange={e => set("dob", e.target.value)} />
              </div>
            </Field>
          </div>

          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", alignItems: "center", fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 12, gap: 12 }}><span>Location</span><div style={{ flex: 1, height: 1, background: "var(--border)" }} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Country" required dataField="country" issue={issue} invalid={showErrors && !d.country}>
                <SearchableSelect value={d.country} onChange={v => { set("country", v); set("state", ""); set("city", ""); }} options={COUNTRY_NAMES} placeholder="" />
              </Field>
              <Field label="State" required dataField="state" issue={issue} invalid={showErrors && !d.state}>
                <SearchableSelect value={d.state} onChange={v => { set("state", v); set("city", ""); }} options={REGIONS_BY_COUNTRY[d.country] || []} placeholder="" />
              </Field>
              <Field label="City optional" dataField="city">
                  <SearchableSelect value={d.city} onChange={v => set("city", v)} options={cityOptions} placeholder="Select city" disabled={!d.country || !d.state} />
              </Field>
            </div>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Verify your experience</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              Add at least one — it's the single biggest boost to your profile strength and the opportunities you'll be offered.
            </p>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0 0 28px 0" }} />

          <div style={{ display: "flex", alignItems: "center", fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 12, gap: 12 }}><span>Add any one</span><div style={{ flex: 1, height: 1, background: "var(--border)" }} /></div>
          
          <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <VerificationField
              icon="link"
              label="LinkedIn profile"
              value={d.linkedin_url}
              onChange={v => set("linkedin_url", v)}
              placeholder="linkedin.com/in/_"
              description="We confirm your experience from your public profile."
              defaultSubmitted={!!d.linkedin_url}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 12, gap: 12 }}><span>Resume / CV <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>optional</span></span><div style={{ flex: 1, height: 1, background: "var(--border)" }} /></div>
          
          {resumeUploaded ? (
            <div style={{ border: "1px solid var(--success)", borderRadius: 12, padding: 20, marginBottom: 32, background: "var(--success-weak)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <Icon name="fileText" size={20} style={{ color: "var(--success)" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>{resumeFile?.name || d.resume_filename || "Approval_Letter.pdf"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Uploaded - {resumeFile ? Math.round(resumeFile.size / 1024) : 248} KB</div>
                </div>
                <button type="button" className="btn" style={{ padding: "8px 16px", background: "#fff", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, fontWeight: 600, fontSize: 13 }} onClick={() => { setResumeFile(null); setResumeUploaded(false); set("resume_filename", ""); }}>Replace</button>
              </div>
            </div>
          ) : (
            <label style={{ display: "block", border: "2px dashed var(--border)", borderRadius: 12, padding: 24, marginBottom: 32, cursor: "pointer", background: "var(--panel-2)" }}>
              <input type="file" accept="application/pdf,.docx" style={{ display: "none" }} onChange={e => pickResume(e.target.files[0])} />
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: "#fff", border: "1px solid var(--border)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  {resumeUploading ? <Icon name="clock" size={20} style={{ color: "var(--warning)" }} /> : <Icon name="fileText" size={20} style={{ color: "var(--text-muted)" }} />}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{resumeUploading ? "Uploading..." : "Drop a file or click to upload"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)" }}>PDF or DOCX up to 10 MB</div>
                </div>
              </div>
            </label>
          )}
          {resumeError && <div className="err-banner" style={{ marginTop: 8, marginBottom: 24 }}>{resumeError}</div>}

          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0 0 24px 0" }} />
          <div style={{ display: "flex", alignItems: "center", fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 12, gap: 12 }}><span>Optional links</span><div style={{ flex: 1, height: 1, background: "var(--border)" }} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <Field label={<>Portfolio website <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>optional</span></>}>
              <div className="inw has-pre">
                <span className="pre"><Icon name="globe" size={14} /></span>
                <input className="fin" value={d.portfolio_url} onChange={e => set("portfolio_url", e.target.value)} placeholder="yoursite.com" style={{ background: "var(--panel-inset)", border: "none" }} />
              </div>
            </Field>
            <Field label={<>GitHub profile <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>optional</span></>}>
              <div className="inw has-pre">
                <span className="pre"><Icon name="github" size={14} /></span>
                <input className="fin" value={d.github_url} onChange={e => set("github_url", e.target.value)} placeholder="github.com/you" style={{ background: "var(--panel-inset)", border: "none" }} />
              </div>
            </Field>
          </div>

          {!(d.linkedin_url || resumeUploaded) && (
            <div style={{ padding: "14px 16px", background: "var(--panel-inset)", borderRadius: 8, fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="info" size={16} />
              Add your LinkedIn or a resume to continue — this is how companies trust your test results.
            </div>
          )}
        </>
      )}

      {step === 2 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>What have you tested?</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              Pick everything you've worked on. We use this to route you only to tests you'll do well.
            </p>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0 0 28px 0" }} />
          
          <div data-field="products_tested">
            <div style={{ display: "flex", alignItems: "center", fontSize: 14, fontWeight: 700, color: showErrors && !d.products_tested?.length ? "var(--danger)" : "#1e293b", marginBottom: 16, gap: 12 }}>
              <span>Products you've tested <span className="req" style={{ color: "var(--danger)" }}>*</span></span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600 }}>{d.products_tested.length} selected</span>
              <button type="button" onClick={() => set("products_tested", d.products_tested.length === PROD_TESTED.length ? [] : PROD_TESTED.map(p => p.id))} style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>
                {d.products_tested.length === PROD_TESTED.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: (showErrors && issue?.id === "products_tested") ? 8 : 32 }}>
              {PROD_TESTED.map(p => {
                const active = d.products_tested.includes(p.id);
                return (
                  <div key={p.id} onClick={() => set("products_tested", toggle(d.products_tested, p.id))} style={{ border: active ? "2px solid var(--primary)" : "1px solid var(--border)", background: active ? "var(--primary-weak)" : "#fff", borderRadius: 12, padding: 16, cursor: "pointer", display: "flex", flexDirection: "column", position: "relative", gap: 32 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: active ? "var(--primary)" : "var(--panel-inset)", color: active ? "#fff" : "var(--text-muted)", display: "grid", placeItems: "center" }}>
                      <Icon name={p.icon} size={20} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{p.id}</div>
                    <div style={{ position: "absolute", top: 12, right: 12, width: 20, height: 20, borderRadius: "50%", border: active ? "none" : "2px solid var(--panel-inset)", background: active ? "var(--primary)" : "transparent", display: "grid", placeItems: "center" }}>
                      {active && <Icon name="check" size={12} style={{ color: "#fff" }} />}
                    </div>
                  </div>
                );
              })}
            </div>
            {showErrors && issue?.id === "products_tested" && <p className="ferr" style={{ marginTop: 0, marginBottom: 32 }}><Icon name="alertCircle" size={12} /> {issue.message}</p>}
          </div>

          <div data-field="testing_areas">
            <div style={{ display: "flex", alignItems: "center", fontSize: 14, fontWeight: 700, color: showErrors && !d.testing_areas?.length ? "var(--danger)" : "#1e293b", marginBottom: 12, gap: 12 }}>
              <span>Testing areas <span className="req" style={{ color: "var(--danger)" }}>*</span></span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600 }}>{d.testing_areas.length} selected</span>
              <button type="button" onClick={() => set("testing_areas", d.testing_areas.length === TESTING_AREAS.length ? [] : [...TESTING_AREAS])} style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>
                {d.testing_areas.length === TESTING_AREAS.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: (showErrors && issue?.id === "testing_areas") ? 8 : 32 }}>
              {TESTING_AREAS.map(a => {
                const active = d.testing_areas.includes(a);
                return (
                  <div key={a} onClick={() => set("testing_areas", toggle(d.testing_areas, a))} style={{ padding: "8px 16px", borderRadius: 20, border: active ? "2px solid var(--primary)" : "1px solid var(--border)", background: active ? "var(--primary-weak)" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: active ? "none" : "2px solid var(--panel-inset)", background: active ? "var(--primary)" : "transparent", display: "grid", placeItems: "center" }}>
                      {active && <Icon name="check" size={10} style={{ color: "#fff" }} />}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: active ? "var(--primary-dark)" : "var(--text)" }}>{a}</span>
                  </div>
                );
              })}
            </div>
            {showErrors && issue?.id === "testing_areas" && <p className="ferr" style={{ marginTop: 0, marginBottom: 32 }}><Icon name="alertCircle" size={12} /> {issue.message}</p>}
          </div>

          <div data-field="experience_years">
            <div style={{ display: "flex", alignItems: "center", fontSize: 14, fontWeight: 700, color: showErrors && !d.experience_years ? "var(--danger)" : "#1e293b", marginBottom: 12, gap: 12 }}>
              <span>Years of experience <span className="req" style={{ color: "var(--danger)" }}>*</span></span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: (showErrors && issue?.id === "experience_years") ? 8 : 0 }}>
              {EXP_YEARS.map(y => {
                const active = d.experience_years === y;
                return (
                  <div key={y} onClick={() => set("experience_years", y)} style={{ padding: "8px 16px", borderRadius: 20, border: active ? "2px solid var(--primary)" : "1px solid var(--border)", background: active ? "var(--primary-weak)" : "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, color: active ? "var(--primary-dark)" : "var(--text)" }}>
                    {y}
                  </div>
                );
              })}
            </div>
            {showErrors && issue?.id === "experience_years" && <p className="ferr" style={{ marginTop: 0 }}><Icon name="alertCircle" size={12} /> {issue.message}</p>}
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Your professional background</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              Helps us match you with tests in domains you know.
            </p>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0 0 28px 0" }} />
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Current job title" required dataField="job_title" issue={issue} invalid={showErrors && !d.job_title?.trim()}>
              <div className="inw has-pre">
                <span className="pre"><Icon name="briefcase" size={14} /></span>
                <input className="fin" value={d.job_title} onChange={e => set("job_title", e.target.value)} />
              </div>
            </Field>
            <Field label={<>Current company <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>optional</span></>}>
              <div className="inw has-pre">
                <span className="pre"><Icon name="fileText" size={14} /></span>
                <input className="fin" value={d.company} onChange={e => set("company", e.target.value)} />
              </div>
            </Field>
            <Field label="Industry" required dataField="industry" issue={issue} invalid={showErrors && !d.industry}>
              <SearchableSelect value={d.industry} onChange={v => set("industry", v)} options={INDUSTRIES.filter(o => o !== "Other")} placeholder="" />
            </Field>
            <Field label="Highest qualification" required dataField="education" issue={issue} invalid={showErrors && !d.education}>
              <SearchableSelect value={d.qualification} onChange={v => set("qualification", v)} options={QUALIFICATIONS} placeholder="" />
            </Field>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Which devices can you test on?</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              Some tests need specific devices or browsers. The more you have, the more you'll be<br />matched to.
            </p>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0 0 28px 0" }} />
          {showErrors && (!d.devices_mobile?.length && !d.devices_desktop?.length && !d.devices_browser?.length) && <div style={{color:"var(--danger)", fontSize:13, fontWeight:400, marginBottom: 24}}>* Please select at least one device or browser.</div>}
          
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Mobile</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {["Android phone", "iPhone", "Android tablet", "iPad"].map(m => {
                const active = d.devices_mobile.includes(m);
                return (
                  <div key={m} onClick={() => set("devices_mobile", toggle(d.devices_mobile, m))} style={{ padding: "8px 16px", borderRadius: 20, border: active ? "2px solid var(--primary)" : "1px solid var(--border)", background: active ? "var(--primary-weak)" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: active ? "none" : "2px solid var(--panel-inset)", background: active ? "var(--primary)" : "transparent", display: "grid", placeItems: "center" }}>
                      {active && <Icon name="check" size={10} style={{ color: "#fff" }} />}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: active ? "var(--primary-dark)" : "var(--text)" }}>{m}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Desktop</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {["Windows", "Mac", "Linux"].map(m => {
                const active = d.devices_desktop.includes(m);
                return (
                  <div key={m} onClick={() => set("devices_desktop", toggle(d.devices_desktop, m))} style={{ padding: "8px 16px", borderRadius: 20, border: active ? "2px solid var(--primary)" : "1px solid var(--border)", background: active ? "var(--primary-weak)" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: active ? "none" : "2px solid var(--panel-inset)", background: active ? "var(--primary)" : "transparent", display: "grid", placeItems: "center" }}>
                      {active && <Icon name="check" size={10} style={{ color: "#fff" }} />}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: active ? "var(--primary-dark)" : "var(--text)" }}>{m}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Browsers</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {["Chrome", "Safari", "Firefox", "Edge"].map(m => {
                const active = d.devices_browser.includes(m);
                return (
                  <div key={m} onClick={() => set("devices_browser", toggle(d.devices_browser, m))} style={{ padding: "8px 16px", borderRadius: 20, border: active ? "2px solid var(--primary)" : "1px solid var(--border)", background: active ? "var(--primary-weak)" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: active ? "none" : "2px solid var(--panel-inset)", background: active ? "var(--primary)" : "transparent", display: "grid", placeItems: "center" }}>
                      {active && <Icon name="check" size={10} style={{ color: "#fff" }} />}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: active ? "var(--primary-dark)" : "var(--text)" }}>{m}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>What are you into?</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              We'll prioritise tests in the areas you care about.
            </p>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0 0 28px 0" }} />
          {showErrors && (!d.interests || d.interests.length === 0) && <div style={{color:"var(--danger)", fontSize:13, fontWeight:400, marginBottom: 24}}>* Please select Areas of interest.</div>}
          
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12, gap: 12 }}>
    <span>Areas of Interest</span>
    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    <span style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>{d.interests.length} selected</span>
    <button type="button" onClick={() => set('interests', d.interests.length === INTERESTS.length ? [] : [...INTERESTS])} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
      {d.interests.length === INTERESTS.length ? 'Clear all' : 'Select all'}
    </button>
  </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {INTERESTS.map(m => {
              const active = d.interests.includes(m);
              return (
                <div key={m} onClick={() => set("interests", toggle(d.interests, m))} style={{ padding: "8px 16px", borderRadius: 20, border: active ? "2px solid var(--primary)" : "1px solid var(--border)", background: active ? "var(--primary-weak)" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", border: active ? "none" : "2px solid var(--panel-inset)", background: active ? "var(--primary)" : "transparent", display: "grid", placeItems: "center" }}>
                    {active && <Icon name="check" size={10} style={{ color: "#fff" }} />}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: active ? "var(--primary-dark)" : "var(--text)" }}>{m}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {step === 6 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>How would you like to be rewarded?</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              Every completed test pays. Choose how you'd like to receive it.
            </p>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0 0 28px 0" }} />
          {showErrors && (!d.reward_pref || d.reward_pref.length === 0) && <div style={{color:"var(--danger)", fontSize:13, fontWeight:400, marginBottom: 24}}>* Please select Preferred reward.</div>}
          
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12, gap: 12 }}>
    <span>Preferred reward</span>
    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
  </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
            {REWARD_PREFS.map(m => {
              const active = d.reward_pref === m;
              return (
                <div key={m} onClick={() => set("reward_pref", m)} style={{ padding: "8px 16px", borderRadius: 20, border: active ? "2px solid var(--primary)" : "1px solid var(--border)", background: active ? "var(--primary-weak)" : "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, color: active ? "var(--primary-dark)" : "var(--text)" }}>
                  {m}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12, gap: 12 }}>
    <span>Payout details</span>
    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
  </div>
          <Field label={<>UPI ID <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>optional</span></>} hint="Where we'll send your rewards. You can add this later.">
            <div className="inw has-pre">
              <span className="pre"><Icon name="zap" size={14} /></span>
              <input className="fin" value={d.upi_id} onChange={e => set("upi_id", e.target.value)} />
            </div>
          </Field>
        </>
      )}
      
      {error && <div className="err-banner" style={{ marginTop: 16 }}>{error}</div>}
    </form>
  );
}
function PendingScreen({ onContinue }) {
  const { t } = useTranslation();
  return (
    <div className="rise" style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
      <div style={{ width: 80, height: 80, borderRadius: 24, background: "var(--warning-weak)", display: "grid", placeItems: "center", margin: "0 auto 22px" }}>
        <Icon name="clock" size={36} style={{ color: "var(--warning)" }} />
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 10px" }}>{t("onboarding.appSubmitted", null, "Application submitted!")}</h2>
      <p style={{ color: "var(--text-muted)", margin: "0 0 28px", fontSize: 15 }}>{t("onboarding.appSubmittedDesc", null, "Our team will review your profile within 72 hours. In the meantime you have full Validator access.")}</p>
      <Btn variant="primary" block onClick={onContinue} style={{ justifyContent: "center" }}>{t("actions.startExploringMissions", null, "Start exploring missions")}</Btn>
    </div>
  );
}

export default function VOnboarding() {
  const { t } = useTranslation();
  const { validator, refresh } = useVAuth();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get("role");
  const [validatorType, setValidatorType] = useDraft(`VC_V_TYPE_${validator?.id}`, null, null, initialRole);
  const [showPending, setShowPending] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState("form"); // "form" | "animation" | "opportunities"
  const navigate = useNavigate();
  useEffect(() => {
    const role = searchParams.get("role");
    if (role && role !== validatorType) {
      setValidatorType(role);
    }
  }, [searchParams, validatorType, setValidatorType]);

  const type = TYPES.find(t => t.key === validatorType);

  // Lifted up from each per-type sub-form so the left rail (built from
  // STEP_DEFS below) can drive which step is showing and jump between
  // already-reached ones, instead of each sub-form drawing its own
  // unclickable horizontal bar. maxReached (not just step) is what actually
  // gates a rail entry as clickable -- same "can revisit, can't skip ahead
  // to something unanswered" rule the builder wizard's own rail uses.
  const typeKey = (validatorType || "NONE").toUpperCase();
  const [step, setStep] = useDraft(`VC_V_STEP_${typeKey}_${validator?.id}`, 0);
  const [maxReached, setMaxReached] = useDraft(`VC_V_MAXSTEP_${typeKey}_${validator?.id}`, 0);
  const totalSteps = STEP_DEFS[validatorType]?.length || 0;

  // An account that's already completed onboarding once (matches
  // RequireVAuth's own "already set up" check) has nothing to lose by
  // just reviewing that same role again -- but switching to a role they
  // haven't finished setting up yet is a genuine in-progress edit (only
  // saved to localStorage, not the DB, until Complete Setup), so that
  // case still warns same as first-time setup.
  const currentRole = validator?.tester_status === "approved" ? "tester" : validator?.validator_type;
  const alreadyOnboarded = !!(validator?.validator_type && validator?.city);
  const isSwitchingRole = !!validatorType && validatorType !== currentRole;
  const isDirty = !!validatorType && !showPending && (!alreadyOnboarded || isSwitchingRole);
  useUnsavedChangesWarning(isDirty, t("vOnboarding.unsavedChangesWarning", null, "You're still setting up your account. Are you sure you want to leave and lose your progress?"));

  const handleDone = async (data, vtype, skipRedirect = false) => {
    setError("");
    try {
      const wasRoleSwitch = alreadyOnboarded && vtype !== currentRole;
      await vapi.patch("/auth/profile", { ...data, validator_type: vtype, specialties_json: JSON.stringify(data.product_types || data.specialties || []) });
      localStorage.removeItem(`VC_V_TYPE_${validator?.id}`);
      localStorage.removeItem(`VC_V_STEP_${vtype.toUpperCase()}_${validator?.id}`);
      localStorage.removeItem(`VC_V_MAXSTEP_${vtype.toUpperCase()}_${validator?.id}`);
      localStorage.removeItem(`VC_V_DRAFT_${vtype.toUpperCase()}_${validator?.id}`);
      await refresh();
      if (!skipRedirect) {
        if (vtype === "tester") setShowPending(true);
        else {
          if (wasRoleSwitch) localStorage.setItem("vc_role_changed_toast", TYPES.find(x => x.key === vtype)?.title || vtype);
          window.__bypassUnload = true;
          window.location.href = "/validator";
        }
      }
    } catch (err) {
      setError(err.message || t("vOnboarding.errors.couldNotSaveProfile", null, "Could not save profile. Please try again."));
      throw err;
    }
  };

  // Role choice was already skippable (Skip below always worked, whatever
  // screen you were on) -- the occupation/role merge that used to happen at
  // each sub-form's own final Continue click now happens once, here, right
  // before the profile actually gets saved.
  const goNext = (data) => {
    if (step < totalSteps - 1) {
      const n = step + 1;
      setStep(n);
      setMaxReached(m => Math.max(m, n));
    } else {
      let finalData = (validatorType === "validator" || validatorType === "tester") ? { ...data, occupation: data.occupation || data.role } : data;
      finalData = resolveOnboardingOther(finalData, t);
      
      // Save data, but don't redirect yet. 
      // User requested animation for every role at the last step.
      handleDone(finalData, validatorType, true)
        .then(() => setPhase("animation"))
        .catch(console.error);
    }
  };
  const goBack = () => {
    if (step > 0) setStep(s => s - 1);
    else {
      window.__bypassUnload = true;
      navigate("/validator/get-started", { replace: true });
    }
  };
  const jumpToStep = (i) => { if (i <= maxReached) setStep(i); };


  // The draft is already persisted continuously (useDraft's own effect
  // writes on every change) -- this exists purely so "Save" is a real,
  // visible action a builder-flow-trained user expects to find, not a
  // second save path.
  const saveNow = () => toast.success(t("vOnboarding.progressSaved", null, "Progress saved"));
  const skip = () => {
    window.__bypassUnload = true;
    window.location.href = "/validator";
  };

  const roleName = type ? t("vOnboarding.types." + validatorType + ".title", null, type.title) : "";
  const layoutColor = type?.color || "var(--accent)";

  const finishFlow = () => {
    window.__bypassUnload = true;
    if (validator?.id) {
      const key = `vc_onboarding_toast_shown_${validator.id}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, "1");
        toast.success(t("onboarding.accountCreated", null, "Account created! 🎉"));
        // Give the toast 1.2s to render before navigating away
        setTimeout(() => navigate("/validator"), 1200);
        return;
      }
    }
    navigate("/validator");
  };

  let memberType = "Basic Member";
  if (roleName === "Tester" || roleName === "Verified Tester") memberType = "Elite Tester";
  else if (roleName === "Validator") memberType = "Expert Validator";
  else if (roleName === "User") memberType = "Power Contributor";

  if (phase === "animation") {
    return <VOpportunitiesAnimation roleName={roleName} color={layoutColor} onFinish={() => setPhase("opportunities")} onSkip={finishFlow} onBack={() => setPhase("form")} />;
  }

  if (phase === "opportunities") {
    return <VOpportunitiesResults roleName={roleName} color={layoutColor} memberType={memberType} onComplete={finishFlow} onSkip={finishFlow} />;
  }

  if (!validatorType) {
    return <Navigate to="/validator/get-started" replace />;
  }

  return (
    <VOnboardingLayout
      roleName={roleName}
      color={layoutColor}
      steps={stepLabelsFor(t, validatorType)}
      currentStep={step}
      maxReached={maxReached}
      onJump={jumpToStep}
      onBack={goBack}
      onSkip={skip}
      onNext={saveNow}
      formId="v-onboarding-form"
      nextLabel={step === totalSteps - 1 ? (validatorType === "tester" || validatorType === "validator" ? t("vOnboarding.actions.seeMyOpportunities", null, "See my opportunities") : t("vOnboarding.actions.completeSetup", null, "Complete setup")) : t("vOnboarding.actions.continue", null, "Continue")}
    >
      {showPending ? <PendingScreen onContinue={() => window.location.href = "/validator"} />
        : validatorType === "user" ? <UserOnboarding vid={validator?.id} validator={validator} step={step} onNext={goNext} />
        : validatorType === "validator" ? <ValidatorOnboarding vid={validator?.id} validator={validator} step={step} onNext={goNext} error={error} />
        : <TesterOnboarding vid={validator?.id} validator={validator} step={step} onNext={goNext} error={error} />}
    </VOnboardingLayout>
  );
}
