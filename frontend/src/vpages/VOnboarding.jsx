import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

import { BrandLogoFull } from "../components/BrandMark";
import Icon from "../components/Icon";
import { Btn } from "../components/ui";
import { vapi } from "../vapi/client";
import { useVAuth } from "../vcontext/VAuthContext";
import useUnsavedChangesWarning from "../hooks/useUnsavedChangesWarning";
import { useTranslation } from "../i18n/index.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher";

function useDraft(key, defaultState) {
  const [val, setVal] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return defaultState;
  });
  useEffect(() => {
    if (val === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(val));
  }, [val, key]);
  return [val, setVal];
}

const TYPES = [
  { key: "user", icon: "users", title: "User", tagline: "I use everyday products", desc: "Perfect for testing physical products, food, packaging, fashion, and consumer apps. No tech experience needed.", color: "#059669", bg: "var(--success-weak)", missions: "Surveys, taste tests, packaging reviews, lifestyle products" },
  { key: "validator", icon: "shield", title: "Validator", tagline: "I have professional expertise", desc: "For professionals, domain experts, and tech-savvy users who can evaluate apps, SaaS products, and digital experiences.", color: "#4f46e5", bg: "var(--accent-weak)", missions: "App testing, UX evaluation, SaaS reviews, expert feedback" },
  { key: "tester", icon: "star", title: "Verified Tester", tagline: "I have QA / product testing experience", desc: "For experienced testers and researchers. Submit your resume or LinkedIn for admin verification. Access premium high-pay missions.", color: "#d97706", bg: "var(--warning-weak)", missions: "Premium missions, complex testing, research studies", badge: "Admin verified 72hr review" },
];

const LANGUAGES = ["English","Hindi","Tamil","Telugu","Kannada","Malayalam","Bengali","Marathi","Gujarati","Punjabi","Odia","Urdu","Other"];
const DEVICES = ["Android phone","iPhone","Windows PC","Mac","iPad / Tablet","Smart TV","Smartwatch"];
const HOURS = ["< 2 hrs/week","2-5 hrs/week","5-10 hrs/week","10+ hrs/week"];
const AGE_GROUPS = ["Under 18","18-24","25-34","35-44","45-54","55-64","65+"];
const GENDERS = ["Male","Female","Non-binary","Prefer not to say"];
const INCOME = ["Under Rs2.5L","Rs2.5L-5L","Rs5L-10L","Rs10L-20L","Rs20L-50L","Above Rs50L","Prefer not to say"];
const HEIGHT = ["Under 5ft","5ft-5ft3in","5ft4in-5ft7in","5ft8in-5ft11in","6ft and above"];
const WEIGHT = ["Under 45kg","45-55kg","56-65kg","66-75kg","76-90kg","91-105kg","Above 105kg"];
const SKIN_TONE = ["Fair","Wheatish","Medium","Dusky","Dark"];
const HAIR_TYPE = ["Straight","Wavy","Curly","Coily","Chemically treated"];
const HAIR_LENGTH = ["Bald/Very short","Short","Medium","Long","Very long"];
const BODY_TYPE = ["Slim/Lean","Athletic","Average","Curvy","Plus size","Prefer not to say"];
const OCCUPATIONS = ["Student","Homemaker","Working professional","Self-employed","Business owner","Retired","Other"];
const FOOD_PREF = ["Vegetarian","Eggetarian","Non-vegetarian","Vegan","Jain","No preference"];
const LIFESTYLE = ["Fitness","Yoga","Outdoor activities","Cooking","Travel","Gaming","Reading","Music","Fashion","Parenting","Pets","Tech","Cinema","Sports","Social media"];
const ROLES = ["Product Manager","UX / UI Designer","Software Engineer","Data Scientist","QA / Test Engineer","DevOps","Founder","CXO","Business Analyst","Consultant","Marketer","Content Creator","Sales","Customer Success","Doctor","Lawyer","Finance","HR","Teacher","Researcher","Freelancer","Student","Other"];
const EXP = ["0-1 year","1-3 years","3-7 years","7-12 years","12+ years"];
const INDUSTRIES = ["SaaS / B2B Software","Fintech","Healthcare","EdTech","E-commerce","FMCG","Automotive","Real Estate","Media","Gaming","AI / ML","Logistics","Manufacturing","Government","Non-profit","Other"];
const PRODUCT_TYPES = ["Mobile apps iOS","Mobile apps Android","Web apps / SaaS","AI / LLM products","Fintech products","Healthcare apps","E-commerce","Developer tools","Enterprise software","Consumer apps","Physical products","Packaging","Marketing campaigns","Websites","Games"];
const TECH_TOOLS = ["Figma","Sketch","Notion","JIRA","Postman","Selenium","VS Code","Git","SQL","Python","JavaScript","React","Node.js","AWS","Docker","Tableau","Salesforce","Google Analytics","Excel"];
const TESTER_DOMAINS = ["Mobile app testing","Web app testing","API testing","Performance testing","Security testing","Accessibility testing","UX research","AI product evaluation","Cross-browser testing","Regression testing","Exploratory testing","Physical product evaluation","Market research","Other"];
const CERT = ["ISTQB Foundation","ISTQB Advanced","AWS Certified","Google UX Design","Scrum / Agile","Six Sigma","PMP","None","Other"];

const optLabel = (t, ns) => (o, i) => t(`vOnboarding.options.${ns}.${i}`, null, o);

const Chips = ({ options, value, onChange, multi = true, getLabel }) => (
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

const Field = ({ label, required, hint, info, children }) => (
  <div className="fld" style={{ marginBottom: 24 }}>
    <label>{label}{required && <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>}
      {info && <Icon name="info" size={13} style={{ verticalAlign: -2, marginLeft: 5, color: "var(--text-faint)", cursor: "help" }} title={info} />}
    </label>
    {children}
    {hint && <p className="fhint">{hint}</p>}
  </div>
);

function TypeSelector({ onSelect }) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(null);
  return (
    <div className="rise" style={{ maxWidth: 680, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>{t("onboarding.welcome", null, "Welcome to ValidationCrew")}</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 10px" }}>{t("onboarding.whichBestDescribesYou", null, "Which best describes you?")}</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 15, margin: 0 }}>{t("onboarding.chooseTypeDesc", null, "Choose your type to see the right missions for you.")}</p>
      </div>
      <div style={{ display: "grid", gap: 16 }}>
        {TYPES.map(ty => (
          <button key={ty.key} type="button" onClick={() => onSelect(ty.key)}
            onMouseEnter={() => setHovered(ty.key)} onMouseLeave={() => setHovered(null)}
            style={{ display: "grid", gridTemplateColumns: "56px 1fr auto", gap: 16, alignItems: "center", padding: "20px 22px", borderRadius: "var(--radius)", textAlign: "left", cursor: "pointer", border: "1.5px solid " + (hovered === ty.key ? ty.color : "var(--border)"), background: hovered === ty.key ? ty.bg : "var(--panel)", transition: "all .15s" }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: ty.bg, display: "grid", placeItems: "center" }}>
              <Icon name={ty.icon} size={24} style={{ color: ty.color }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{ fontWeight: 800, fontSize: 16 }}>{t(`vOnboarding.types.${ty.key}.title`, null, ty.title)}</span>
                <span style={{ fontSize: 12, color: "var(--text-faint)" }}>· {t(`vOnboarding.types.${ty.key}.tagline`, null, ty.tagline)}</span>
                {ty.badge && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "var(--warning-weak)", color: "var(--warning)" }}>{t(`vOnboarding.types.${ty.key}.badge`, null, ty.badge)}</span>}
              </div>
              <p style={{ margin: "0 0 6px", fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.5 }}>{t(`vOnboarding.types.${ty.key}.desc`, null, ty.desc)}</p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-faint)" }}>{t("onboarding.missions", null, "Missions:")} {t(`vOnboarding.types.${ty.key}.missions`, null, ty.missions)}</p>
            </div>
            <Icon name="chevronRight" size={18} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
          </button>
        ))}
      </div>
    </div>
  );
}

function UserOnboarding({ onDone, onBack, vid }) {
  const { t } = useTranslation();
  const [step, setStep] = useDraft(`VC_V_STEP_USER_${vid}`, 0);
  const [d, setD] = useDraft(`VC_V_DRAFT_USER_${vid}`, { name: "", handle: "", city: "", language: [], age_group: "", gender: "", marital: "", has_kids: "", income: "", height: "", weight: "", skin_tone: "", hair_type: "", hair_length: "", body_type: "", occupation: "", food_pref: "", lifestyle: [], devices: [], hours: "" });
  const set = (k, v) => setD(p => ({ ...p, [k]: v }));
  const valid = [d.name.trim() && d.handle.trim() && d.city.trim(), d.age_group && d.gender && d.income, d.height && d.weight && d.skin_tone && d.body_type, d.occupation && d.hours && d.devices.length > 0];
  const steps = [t("vOnboarding.steps.basicInfo", null, "Basic info"), t("vOnboarding.steps.demographics", null, "Demographics"), t("vOnboarding.steps.physicalProfile", null, "Physical profile"), t("vOnboarding.steps.lifestyle", null, "Lifestyle")];
  return (
    <div className="rise" style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
        {steps.map((s, i) => (<div key={i} style={{ flex: 1 }}><div style={{ height: 4, borderRadius: 20, background: i <= step ? "var(--accent)" : "var(--border)" }} /><div style={{ fontSize: 11, fontWeight: 600, color: i === step ? "var(--accent)" : "var(--text-faint)", marginTop: 4 }}>{s}</div></div>))}
      </div>
      {step === 0 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>{t("vOnboarding.headers.tellUsAboutYourself", null, "Tell us about yourself")}</h2><Field label={t("vOnboarding.fields.fullName", null, "Full name")} required><input className="fin" value={d.name} onChange={e => set("name", e.target.value)} placeholder={t("vOnboarding.placeholders.yourFullName", null, "Your full name")} /></Field><Field label={t("vOnboarding.fields.handle", null, "Handle")} required hint={t("vOnboarding.hints.lowercaseNoSpaces", null, "Lowercase, no spaces")} info={t("vOnboarding.hints.handleInfo", null, "Your unique @username on ValidationCrew — shown to builders on your profile and submissions.")}><div className="inw has-pre"><span className="pre">@</span><input className="fin" value={d.handle} onChange={e => set("handle", e.target.value.toLowerCase().replace(/\s/g,""))} placeholder={t("vOnboarding.placeholders.yourHandle", null, "yourhandle")} /></div></Field><Field label={t("vOnboarding.fields.city", null, "City")} required><input className="fin" value={d.city} onChange={e => set("city", e.target.value)} placeholder={t("vOnboarding.placeholders.cityMumbaiBengaluru", null, "e.g. Mumbai, Bengaluru")} /></Field><Field label={t("vOnboarding.fields.languages", null, "Languages")}><Chips options={LANGUAGES} value={d.language} onChange={v => set("language", v)} getLabel={optLabel(t, "languages")} /></Field></>)}
      {step === 1 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>{t("vOnboarding.headers.aboutYou", null, "About you")}</h2><Field label={t("vOnboarding.fields.ageGroup", null, "Age group")} required><Chips options={AGE_GROUPS} value={d.age_group} onChange={v => set("age_group", v)} multi={false} getLabel={optLabel(t, "ageGroups")} /></Field><Field label={t("vOnboarding.fields.gender", null, "Gender")} required><Chips options={GENDERS} value={d.gender} onChange={v => set("gender", v)} multi={false} getLabel={optLabel(t, "genders")} /></Field><Field label={t("vOnboarding.fields.maritalStatus", null, "Marital status")}><Chips options={["Single","Married","Divorced","Widowed","In a relationship"]} value={d.marital} onChange={v => set("marital", v)} multi={false} getLabel={optLabel(t, "marital")} /></Field><Field label={t("vOnboarding.fields.kids", null, "Kids?")}><Chips options={["Yes","No","Prefer not to say"]} value={d.has_kids} onChange={v => set("has_kids", v)} multi={false} getLabel={optLabel(t, "kids")} /></Field><Field label={t("vOnboarding.fields.income", null, "Income")} required><Chips options={INCOME} value={d.income} onChange={v => set("income", v)} multi={false} getLabel={optLabel(t, "income")} /></Field></>)}
      {step === 2 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>{t("vOnboarding.headers.physicalProfile", null, "Physical profile")}</h2><p style={{ color: "var(--text-muted)", fontSize: 13.5, margin: "0 0 22px" }}>{t("vOnboarding.body.physicalProfileDesc", null, "Used to match you with physical product missions. Never shared without permission.")}</p><Field label={t("vOnboarding.fields.height", null, "Height")} required><Chips options={HEIGHT} value={d.height} onChange={v => set("height", v)} multi={false} getLabel={optLabel(t, "height")} /></Field><Field label={t("vOnboarding.fields.weight", null, "Weight")} required><Chips options={WEIGHT} value={d.weight} onChange={v => set("weight", v)} multi={false} getLabel={optLabel(t, "weight")} /></Field><Field label={t("vOnboarding.fields.skinTone", null, "Skin tone")} required><Chips options={SKIN_TONE} value={d.skin_tone} onChange={v => set("skin_tone", v)} multi={false} getLabel={optLabel(t, "skinTone")} /></Field><Field label={t("vOnboarding.fields.hairType", null, "Hair type")}><Chips options={HAIR_TYPE} value={d.hair_type} onChange={v => set("hair_type", v)} multi={false} getLabel={optLabel(t, "hairType")} /></Field><Field label={t("vOnboarding.fields.hairLength", null, "Hair length")}><Chips options={HAIR_LENGTH} value={d.hair_length} onChange={v => set("hair_length", v)} multi={false} getLabel={optLabel(t, "hairLength")} /></Field><Field label={t("vOnboarding.fields.bodyType", null, "Body type")} required><Chips options={BODY_TYPE} value={d.body_type} onChange={v => set("body_type", v)} multi={false} getLabel={optLabel(t, "bodyType")} /></Field></>)}
      {step === 3 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>{t("vOnboarding.headers.lifestyleAndAvailability", null, "Lifestyle and availability")}</h2><Field label={t("vOnboarding.fields.occupation", null, "Occupation")} required><Chips options={OCCUPATIONS} value={d.occupation} onChange={v => set("occupation", v)} multi={false} getLabel={optLabel(t, "occupations")} /></Field><Field label={t("vOnboarding.fields.foodPreference", null, "Food preference")}><Chips options={FOOD_PREF} value={d.food_pref} onChange={v => set("food_pref", v)} multi={false} getLabel={optLabel(t, "foodPref")} /></Field><Field label={t("vOnboarding.fields.lifestyleInterests", null, "Lifestyle interests")}><Chips options={LIFESTYLE} value={d.lifestyle} onChange={v => set("lifestyle", v)} getLabel={optLabel(t, "lifestyle")} /></Field><Field label={t("vOnboarding.fields.devices", null, "Devices")} required><Chips options={DEVICES} value={d.devices} onChange={v => set("devices", v)} getLabel={optLabel(t, "devices")} /></Field><Field label={t("vOnboarding.fields.timePerWeek", null, "Time per week")} required><Chips options={HOURS} value={d.hours} onChange={v => set("hours", v)} multi={false} getLabel={optLabel(t, "hours")} /></Field></>)}
      <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
        <button className="btn btn-ghost" onClick={() => step > 0 ? setStep(s => s-1) : onBack()} style={{ flex: 1 }}><Icon name="arrowLeft" size={15} /> {t("vOnboarding.actions.back", null, "Back")}</button>
        <Btn variant="primary" style={{ flex: 2, justifyContent: "center" }} disabled={!valid[step]} onClick={() => step < 3 ? setStep(s => s+1) : onDone(d, "user")}>{step === 3 ? t("vOnboarding.actions.completeSetup", null, "Complete setup") : t("vOnboarding.actions.continue", null, "Continue")}</Btn>
      </div>
    </div>
  );
}

function ValidatorOnboarding({ onDone, onBack, error, vid }) {
  const { t } = useTranslation();
  const [step, setStep] = useDraft(`VC_V_STEP_VALIDATOR_${vid}`, 0);
  const [d, setD] = useDraft(`VC_V_DRAFT_VALIDATOR_${vid}`, { name: "", handle: "", city: "", language: [], bio: "", occupation: "", experience: "", industry: [], company: "", product_types: [], tech_tools: [], devices: [], hours: "" });
  const set = (k, v) => setD(p => ({ ...p, [k]: v }));
  const valid = [d.name.trim() && d.handle.trim() && d.city.trim(), (d.occupation || d.role) && d.experience && d.industry.length > 0, d.product_types.length > 0, d.hours && d.devices.length > 0];
  const steps = [t("vOnboarding.steps.basicInfo", null, "Basic info"), t("vOnboarding.steps.professional", null, "Professional"), t("vOnboarding.steps.expertise", null, "Expertise"), t("vOnboarding.steps.availability", null, "Availability")];
  return (
    <div className="rise" style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
        {steps.map((s, i) => (<div key={i} style={{ flex: 1 }}><div style={{ height: 4, borderRadius: 20, background: i <= step ? "var(--accent)" : "var(--border)" }} /><div style={{ fontSize: 11, fontWeight: 600, color: i === step ? "var(--accent)" : "var(--text-faint)", marginTop: 4 }}>{s}</div></div>))}
      </div>
      {step === 0 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>{t("vOnboarding.headers.tellUsAboutYourself", null, "Tell us about yourself")}</h2><Field label={t("vOnboarding.fields.fullName", null, "Full name")} required><input className="fin" value={d.name} onChange={e => set("name", e.target.value)} placeholder={t("vOnboarding.placeholders.yourFullName", null, "Your full name")} /></Field><Field label={t("vOnboarding.fields.handle", null, "Handle")} required hint={t("vOnboarding.hints.lowercaseNoSpaces", null, "Lowercase, no spaces")} info={t("vOnboarding.hints.handleInfo", null, "Your unique @username on ValidationCrew — shown to builders on your profile and submissions.")}><div className="inw has-pre"><span className="pre">@</span><input className="fin" value={d.handle} onChange={e => set("handle", e.target.value.toLowerCase().replace(/\s/g,""))} placeholder={t("vOnboarding.placeholders.yourHandle", null, "yourhandle")} /></div></Field><Field label={t("vOnboarding.fields.city", null, "City")} required><input className="fin" value={d.city} onChange={e => set("city", e.target.value)} placeholder={t("vOnboarding.placeholders.cityBengaluruRemote", null, "e.g. Bengaluru, Remote")} /></Field><Field label={t("vOnboarding.fields.languages", null, "Languages")}><Chips options={LANGUAGES} value={d.language} onChange={v => set("language", v)} getLabel={optLabel(t, "languages")} /></Field><Field label={t("vOnboarding.fields.shortBio", null, "Short bio")} hint={t("vOnboarding.hints.bioHint", null, "Tell builders what makes your feedback valuable")}><textarea className="fin" rows={3} value={d.bio} onChange={e => set("bio", e.target.value)} placeholder={t("vOnboarding.placeholders.bioExample", null, "e.g. Product designer with 5 years at B2B SaaS companies.")} /></Field></>)}
      {step === 1 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>{t("vOnboarding.headers.professionalBackground", null, "Professional background")}</h2><Field label={t("vOnboarding.fields.role", null, "Role")} required><Chips options={ROLES} value={d.occupation || d.role} onChange={v => set("occupation", v)} multi={false} getLabel={optLabel(t, "roles")} /></Field><Field label={t("vOnboarding.fields.experience", null, "Experience")} required><Chips options={EXP} value={d.experience} onChange={v => set("experience", v)} multi={false} getLabel={optLabel(t, "experience")} /></Field><Field label={t("vOnboarding.fields.industry", null, "Industry")} required><Chips options={INDUSTRIES} value={d.industry} onChange={v => set("industry", v)} getLabel={optLabel(t, "industries")} /></Field><Field label={t("vOnboarding.fields.company", null, "Company")} hint={t("vOnboarding.hints.companyOptional", null, "Optional")}><input className="fin" value={d.company} onChange={e => set("company", e.target.value)} placeholder={t("vOnboarding.placeholders.companyExample", null, "e.g. Razorpay, Freelance")} /></Field></>)}
      {step === 2 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>{t("vOnboarding.headers.yourExpertise", null, "Your expertise")}</h2><Field label={t("vOnboarding.fields.productTypesYouTest", null, "Product types you test")} required><Chips options={PRODUCT_TYPES} value={d.product_types} onChange={v => set("product_types", v)} getLabel={optLabel(t, "productTypes")} /></Field><Field label={t("vOnboarding.fields.toolsYouUse", null, "Tools you use")}><Chips options={TECH_TOOLS} value={d.tech_tools} onChange={v => set("tech_tools", v)} getLabel={optLabel(t, "techTools")} /></Field></>)}
      {step === 3 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>{t("vOnboarding.headers.availability", null, "Availability")}</h2><Field label={t("vOnboarding.fields.devices", null, "Devices")} required><Chips options={DEVICES} value={d.devices} onChange={v => set("devices", v)} getLabel={optLabel(t, "devices")} /></Field><Field label={t("vOnboarding.fields.timePerWeek", null, "Time per week")} required><Chips options={HOURS} value={d.hours} onChange={v => set("hours", v)} multi={false} getLabel={optLabel(t, "hours")} /></Field></>)}
      {error && step === 3 && <div className="err-banner" style={{ marginTop: 16 }}>{error}</div>}
      <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
        <button className="btn btn-ghost" onClick={() => step > 0 ? setStep(s => s-1) : onBack()} style={{ flex: 1 }}><Icon name="arrowLeft" size={15} /> {t("vOnboarding.actions.back", null, "Back")}</button>
        <Btn variant="primary" style={{ flex: 2, justifyContent: "center" }} disabled={!valid[step]} onClick={() => step < 3 ? setStep(s => s+1) : onDone({ ...d, occupation: d.occupation || d.role }, "validator")}>{step === 3 ? t("vOnboarding.actions.completeSetup", null, "Complete setup") : t("vOnboarding.actions.continue", null, "Continue")}</Btn>
      </div>
    </div>
  );
}

function TesterOnboarding({ onDone, onBack, error, vid }) {
  const { t } = useTranslation();
  const [step, setStep] = useDraft(`VC_V_STEP_TESTER_${vid}`, 0);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [d, setD] = useDraft(`VC_V_DRAFT_TESTER_${vid}`, { name: "", handle: "", city: "", language: [], occupation: "", experience: "", industry: [], company: "", domains: [], certifications: [], tools: [], linkedin_url: "", portfolio_url: "", resume_filename: "", testing_bio: "", agreed: false });
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
  const steps = [t("vOnboarding.steps.basicInfo", null, "Basic info"), t("vOnboarding.steps.professional", null, "Professional"), t("vOnboarding.steps.proof", null, "Proof"), t("vOnboarding.steps.declaration", null, "Declaration")];
  return (
    <div className="rise" style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
        {steps.map((s, i) => (<div key={i} style={{ flex: 1 }}><div style={{ height: 4, borderRadius: 20, background: i <= step ? "var(--accent)" : "var(--border)" }} /><div style={{ fontSize: 11, fontWeight: 600, color: i === step ? "var(--accent)" : "var(--text-faint)", marginTop: 4 }}>{s}</div></div>))}
      </div>
      {step === 0 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>{t("vOnboarding.headers.tellUsAboutYourself", null, "Tell us about yourself")}</h2><div style={{ padding: "10px 14px", background: "var(--warning-weak)", borderRadius: "var(--radius-sm)", fontSize: 13, color: "var(--warning)", fontWeight: 600, marginBottom: 22 }}>{t("vOnboarding.body.adminReviewsProfile72h", null, "Admin reviews your profile within 72 hours.")}</div><Field label={t("vOnboarding.fields.fullName", null, "Full name")} required><input className="fin" value={d.name} onChange={e => set("name", e.target.value)} placeholder={t("vOnboarding.placeholders.yourFullName", null, "Your full name")} /></Field><Field label={t("vOnboarding.fields.handle", null, "Handle")} required hint={t("vOnboarding.hints.lowercaseNoSpaces", null, "Lowercase, no spaces")} info={t("vOnboarding.hints.handleInfo", null, "Your unique @username on ValidationCrew — shown to builders on your profile and submissions.")}><div className="inw has-pre"><span className="pre">@</span><input className="fin" value={d.handle} onChange={e => set("handle", e.target.value.toLowerCase().replace(/\s/g,""))} placeholder={t("vOnboarding.placeholders.yourHandle", null, "yourhandle")} /></div></Field><Field label={t("vOnboarding.fields.city", null, "City")} required><input className="fin" value={d.city} onChange={e => set("city", e.target.value)} placeholder={t("vOnboarding.placeholders.cityBengaluruHyderabad", null, "e.g. Bengaluru, Hyderabad")} /></Field><Field label={t("vOnboarding.fields.languages", null, "Languages")}><Chips options={LANGUAGES} value={d.language} onChange={v => set("language", v)} getLabel={optLabel(t, "languages")} /></Field></>)}
      {step === 1 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>{t("vOnboarding.headers.professionalBackground", null, "Professional background")}</h2><Field label={t("vOnboarding.fields.role", null, "Role")} required><Chips options={ROLES} value={d.occupation || d.role} onChange={v => set("occupation", v)} multi={false} getLabel={optLabel(t, "roles")} /></Field><Field label={t("vOnboarding.fields.experience", null, "Experience")} required><Chips options={EXP} value={d.experience} onChange={v => set("experience", v)} multi={false} getLabel={optLabel(t, "experience")} /></Field><Field label={t("vOnboarding.fields.currentCompany", null, "Current company")} required hint={t("vOnboarding.hints.companyRequiredVerification", null, "Required for verification")}><input className="fin" value={d.company} onChange={e => set("company", e.target.value)} placeholder={t("vOnboarding.placeholders.companyExampleTester", null, "e.g. Infosys, Freelance QA")} /></Field><Field label={t("vOnboarding.fields.industry", null, "Industry")} required><Chips options={INDUSTRIES} value={d.industry} onChange={v => set("industry", v)} getLabel={optLabel(t, "industries")} /></Field><Field label={t("vOnboarding.fields.testingDomains", null, "Testing domains")}><Chips options={TESTER_DOMAINS} value={d.domains} onChange={v => set("domains", v)} getLabel={optLabel(t, "testerDomains")} /></Field><Field label={t("vOnboarding.fields.certifications", null, "Certifications")}><Chips options={CERT} value={d.certifications} onChange={v => set("certifications", v)} getLabel={optLabel(t, "certifications")} /></Field><Field label={t("vOnboarding.fields.tools", null, "Tools")}><Chips options={TECH_TOOLS} value={d.tools} onChange={v => set("tools", v)} getLabel={optLabel(t, "techTools")} /></Field></>)}
      {step === 2 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>{t("vOnboarding.headers.proofOfExperience", null, "Proof of experience")}</h2><Field label={t("vOnboarding.fields.linkedinUrl", null, "LinkedIn URL")} required><div className="inw has-pre"><span className="pre"><Icon name="link" size={14} /></span><input className="fin" value={d.linkedin_url} onChange={e => set("linkedin_url", e.target.value)} placeholder={t("vOnboarding.placeholders.linkedinUrl", null, "https://linkedin.com/in/yourprofile")} /></div></Field><Field label={t("vOnboarding.fields.resumeCv", null, "Resume / CV")} required>{resumeUploading ? (<div style={{ padding: "12px 14px", background: "var(--panel-inset)", borderRadius: "var(--radius-sm)", fontSize: 13.5 }}>{t("vOnboarding.actions.uploading", null, "Uploading…")}</div>) : resumeUploaded ? (<div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--success-weak)", borderRadius: "var(--radius-sm)" }}><Icon name="check" size={16} style={{ color: "var(--success)" }} /><span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: "var(--success)" }}>{resumeFile?.name}</span><button className="btn btn-quiet" style={{ fontSize: 12 }} onClick={() => { setResumeFile(null); setResumeUploaded(false); set("resume_filename", ""); }}>{t("vOnboarding.actions.remove", null, "Remove")}</button></div>) : (<label style={{ display: "block", border: "2px dashed var(--border)", borderRadius: "var(--radius)", padding: 24, textAlign: "center", cursor: "pointer", background: "var(--panel-2)" }}><input type="file" accept="application/pdf" style={{ display: "none" }} onChange={e => pickResume(e.target.files[0])} /><Icon name="upload" size={22} style={{ color: "var(--text-faint)", marginBottom: 8 }} /><div style={{ fontWeight: 600 }}>{t("vOnboarding.actions.clickToUploadResume", null, "Click to upload resume")}</div><div style={{ fontSize: 12, color: "var(--text-faint)" }}>{t("vOnboarding.body.pdfOnlyMax5mb", null, "PDF only, max 5MB")}</div></label>)}{resumeError && <div className="err-banner" style={{ marginTop: 8 }}>{resumeError}</div>}</Field><Field label={t("vOnboarding.fields.portfolioGithub", null, "Portfolio / GitHub")} hint={t("vOnboarding.hints.companyOptional", null, "Optional")}><div className="inw has-pre"><span className="pre"><Icon name="link" size={14} /></span><input className="fin" value={d.portfolio_url} onChange={e => set("portfolio_url", e.target.value)} placeholder={t("vOnboarding.placeholders.portfolioUrl", null, "https://github.com/yourprofile")} /></div></Field><Field label={t("vOnboarding.fields.describeTestingExperience", null, "Describe your testing experience")} required hint={t("vOnboarding.hints.wordCount", { count: wordCount }, wordCount + " words (min 30)")}><textarea className="fin" rows={5} value={d.testing_bio} onChange={e => set("testing_bio", e.target.value)} placeholder={t("vOnboarding.placeholders.testingBio", null, "Describe products tested, bugs found, and what makes your feedback valuable.")} /></Field></>)}
      {step === 3 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>{t("vOnboarding.headers.declaration", null, "Declaration")}</h2><p style={{ color: "var(--text-muted)", fontSize: 13.5, margin: "0 0 22px" }}>{t("vOnboarding.body.adminWillReviewValidatorAccess", null, "Admin will review within 72 hours. Until verified you have Validator access.")}</p><div className="card" style={{ padding: 20, marginBottom: 16 }}>{[[t("vOnboarding.declaration.name", null, "Name"),d.name],[t("vOnboarding.fields.handle", null, "Handle"),"@"+d.handle],[t("vOnboarding.fields.role", null, "Role"),d.occupation || d.role],[t("vOnboarding.declaration.linkedin", null, "LinkedIn"),d.linkedin_url],[t("vOnboarding.declaration.resume", null, "Resume"),d.resume_filename]].map(([k,v]) => (<div key={k} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: "1px solid var(--border)", fontSize: 13.5 }}><span style={{ color: "var(--text-faint)", width: 80, flexShrink: 0 }}>{k}</span><span style={{ fontWeight: 600, wordBreak: "break-all" }}>{v||"-"}</span></div>))}</div><div style={{ padding: "14px 16px", background: "var(--warning-weak)", borderRadius: "var(--radius)", marginBottom: 20, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{t("vOnboarding.body.adminReviewOutcome", null, "Admin reviews within 72 hours. If approved: Verified Tester badge and premium missions. If rejected: Stay as Validator and reapply anytime.")}</div><div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius)", cursor: "pointer" }} onClick={() => set("agreed", !d.agreed)}><div style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, display: "grid", placeItems: "center", background: d.agreed ? "var(--warning)" : "var(--panel)", border: "1.5px solid " + (d.agreed ? "var(--warning)" : "var(--border-strong)") }}>{d.agreed && <Icon name="check" size={13} style={{ color: "#fff" }} />}</div><div style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("vOnboarding.body.confirmAccuracy", null, "I confirm all information is accurate. False information may result in permanent removal.")}</div></div></>)}
      {error && step === 3 && <div className="err-banner" style={{ marginTop: 16 }}>{error}</div>}
      <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
        <button className="btn btn-ghost" onClick={() => step > 0 ? setStep(s => s-1) : onBack()} style={{ flex: 1 }}><Icon name="arrowLeft" size={15} /> {t("vOnboarding.actions.back", null, "Back")}</button>
        <Btn variant="primary" style={{ flex: 2, justifyContent: "center" }} disabled={!valid[step]} onClick={() => step < 3 ? setStep(s => s+1) : onDone({ ...d, occupation: d.occupation || d.role }, "tester")}>{step === 3 ? t("vOnboarding.actions.submitForVerification", null, "Submit for verification") : t("vOnboarding.actions.continue", null, "Continue")}</Btn>
      </div>
    </div>
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
  const { validator, refresh, logout } = useVAuth();
  const [validatorType, setValidatorType] = useDraft(`VC_V_TYPE_${validator?.id}`, null);
  const [showPending, setShowPending] = useState(false);
  const [error, setError] = useState("");
  const type = TYPES.find(t => t.key === validatorType);

  const isDirty = !!validatorType && !showPending;
  useUnsavedChangesWarning(isDirty, t("vOnboarding.unsavedChangesWarning", null, "You're still setting up your account. Are you sure you want to leave and lose your progress?"));

  useEffect(() => {
    toast.success(t("onboarding.accountCreated", null, "Account created!"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDone = async (data, vtype) => {
    setError("");
    try {
      await vapi.patch("/auth/profile", { ...data, validator_type: vtype, specialties_json: JSON.stringify(data.product_types || data.specialties || []) });
      localStorage.removeItem(`VC_V_TYPE_${validator?.id}`);
      localStorage.removeItem(`VC_V_STEP_${vtype.toUpperCase()}_${validator?.id}`);
      localStorage.removeItem(`VC_V_DRAFT_${vtype.toUpperCase()}_${validator?.id}`);
      await refresh();
      if (vtype === "tester") setShowPending(true);
      else {
        window.__bypassUnload = true;
        window.location.href = "/validator";
      }
    } catch (err) {
      setError(err.message || t("vOnboarding.errors.couldNotSaveProfile", null, "Could not save profile. Please try again."));
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "grid", gridTemplateColumns: "260px 1fr" }}>
      <aside style={{ background: "var(--panel)", borderRight: "1px solid var(--border)", padding: "28px 20px", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <BrandLogoFull height={48} />
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: 6, color: "var(--text-faint)" }}
            title={t("vLayout.logOut", null, "Log out")}
            onClick={async () => { await logout(); window.location.href = "/validator/login"; }}
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
        {/* Kept right below the logo, before Setup/step-rail — this was the tester's
            explicit complaint: buried at the bottom of the sidebar meant scrolling
            (or a smaller screen) to find the one control that lets you switch type. */}
        {type && <div style={{ padding: 14, background: type.bg, borderRadius: "var(--radius)", marginBottom: 10, border: "1px solid " + type.color + "44" }}><div style={{ fontWeight: 700, fontSize: 13, color: type.color, marginBottom: 4 }}>{t(`vOnboarding.types.${type.key}.title`, null, type.title)}</div><div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t(`vOnboarding.types.${type.key}.missions`, null, type.missions)}</div></div>}
        {validatorType && !showPending && (
          <button className="btn btn-ghost" style={{ justifyContent: "center", color: "var(--text-muted)", marginBottom: 16 }} onClick={() => {
            if (window.confirm(t("vOnboarding.confirmChangeRole", null, "Are you sure you want to change your role? This will clear all your progress."))) {
              localStorage.removeItem(`VC_V_STEP_${validatorType.toUpperCase()}_${validator?.id}`);
              localStorage.removeItem(`VC_V_DRAFT_${validatorType.toUpperCase()}_${validator?.id}`);
              setValidatorType(null);
            }
          }}>{t("actions.changeRoleStartOver", null, "Change role (Start over)")}</button>
        )}
        <div style={{ marginBottom: 16 }}><LanguageSwitcher /></div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 8 }}>{t("onboarding.setup", null, "Setup")}</div>
        <div style={{ display: "grid", gap: 6, marginBottom: 16 }}>
          {[{ l: t("onboarding.chooseYourType", null, "Choose your type"), done: !!validatorType }, { l: t("onboarding.completeProfile", null, "Complete profile"), done: false }].map((s, i) => {
            const clickable = i === 0 && !!validatorType && !showPending;
            return (
              <button
                key={i}
                type="button"
                disabled={!clickable}
                onClick={() => clickable && setValidatorType(null)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: "var(--radius-sm)", background: (i === 0 && !validatorType) || (i === 1 && validatorType && !showPending) ? "var(--accent-weak)" : "transparent", border: "none", width: "100%", textAlign: "left", cursor: clickable ? "pointer" : "default", fontFamily: "inherit" }}
              >
                <span style={{ width: 24, height: 24, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, background: s.done ? "var(--success)" : (i === 0 && !validatorType) || (i === 1 && validatorType) ? "var(--accent)" : "var(--panel-inset)", color: s.done || (i === 0 && !validatorType) || (i === 1 && validatorType) ? "#fff" : "var(--text-faint)" }}>{s.done ? <Icon name="check" size={12} /> : i + 1}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{s.l}</span>
              </button>
            );
          })}
        </div>
      </aside>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", overflowY: "auto" }}>
        {showPending ? <PendingScreen onContinue={() => window.location.href = "/validator"} /> : !validatorType ? <TypeSelector onSelect={setValidatorType} /> : validatorType === "user" ? <UserOnboarding vid={validator?.id} onDone={handleDone} onBack={() => setValidatorType(null)} /> : validatorType === "validator" ? <ValidatorOnboarding vid={validator?.id} onDone={handleDone} onBack={() => setValidatorType(null)} error={error} /> : <TesterOnboarding vid={validator?.id} onDone={handleDone} onBack={() => setValidatorType(null)} error={error} />}
      </div>
    </div>
  );
}
