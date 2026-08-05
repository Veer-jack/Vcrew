import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BrandLogoFull } from "../components/BrandMark";
import Icon from "../components/Icon";
import { Btn } from "../components/ui";
import { vapi } from "../vapi/client";
import { useVAuth } from "../vcontext/VAuthContext";

function useDraft(key, defaultState) {
  const [val, setVal] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
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

const Chips = ({ options, value, onChange, multi = true }) => (
  <div className="chips" style={{ marginTop: 8 }}>
    {options.map(o => {
      const on = multi ? (Array.isArray(value) ? value.includes(o) : false) : value === o;
      return (
        <button key={o} type="button" className={"chip " + (on ? "on" : "")} onClick={() => {
          if (multi) { const arr = Array.isArray(value) ? value : []; onChange(on ? arr.filter(x => x !== o) : [...arr, o]); }
          else { onChange(on ? "" : o); }
        }}>
          <span className="ck"><Icon name="check" size={10} /></span>{o}
        </button>
      );
    })}
  </div>
);

const Field = ({ label, required, hint, children }) => (
  <div className="fld" style={{ marginBottom: 24 }}>
    <label>{label}{required && <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>}</label>
    {children}
    {hint && <p className="fhint">{hint}</p>}
  </div>
);

function TypeSelector({ onSelect }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div className="rise" style={{ maxWidth: 680, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Welcome to ValidationCrew</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 10px" }}>Which best describes you?</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 15, margin: 0 }}>Choose your type to see the right missions for you.</p>
      </div>
      <div style={{ display: "grid", gap: 16 }}>
        {TYPES.map(t => (
          <button key={t.key} type="button" onClick={() => onSelect(t.key)}
            onMouseEnter={() => setHovered(t.key)} onMouseLeave={() => setHovered(null)}
            style={{ display: "grid", gridTemplateColumns: "56px 1fr auto", gap: 16, alignItems: "center", padding: "20px 22px", borderRadius: "var(--radius)", textAlign: "left", cursor: "pointer", border: "1.5px solid " + (hovered === t.key ? t.color : "var(--border)"), background: hovered === t.key ? t.bg : "var(--panel)", transition: "all .15s" }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: t.bg, display: "grid", placeItems: "center" }}>
              <Icon name={t.icon} size={24} style={{ color: t.color }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{ fontWeight: 800, fontSize: 16 }}>{t.title}</span>
                <span style={{ fontSize: 12, color: "var(--text-faint)" }}>· {t.tagline}</span>
                {t.badge && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "var(--warning-weak)", color: "var(--warning)" }}>{t.badge}</span>}
              </div>
              <p style={{ margin: "0 0 6px", fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.5 }}>{t.desc}</p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-faint)" }}>Missions: {t.missions}</p>
            </div>
            <Icon name="chevRight" size={18} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
          </button>
        ))}
      </div>
    </div>
  );
}

function UserOnboarding({ onDone, vid }) {
  const [step, setStep] = useDraft(`VC_V_STEP_USER_${vid}`, 0);
  const [d, setD] = useDraft(`VC_V_DRAFT_USER_${vid}`, { name: "", handle: "", city: "", language: [], age_group: "", gender: "", marital: "", has_kids: "", income: "", height: "", weight: "", skin_tone: "", hair_type: "", hair_length: "", body_type: "", occupation: "", food_pref: "", lifestyle: [], devices: [], hours: "" });
  const set = (k, v) => setD(p => ({ ...p, [k]: v }));
  const valid = [d.name.trim() && d.handle.trim() && d.city.trim(), d.age_group && d.gender && d.income, d.height && d.weight && d.skin_tone && d.body_type, d.occupation && d.hours && d.devices.length > 0];
  const steps = ["Basic info","Demographics","Physical profile","Lifestyle"];
  return (
    <div className="rise" style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
        {steps.map((s, i) => (<div key={i} style={{ flex: 1 }}><div style={{ height: 4, borderRadius: 20, background: i <= step ? "var(--success)" : "var(--border)" }} /><div style={{ fontSize: 11, fontWeight: 600, color: i === step ? "var(--success)" : "var(--text-faint)", marginTop: 4 }}>{s}</div></div>))}
      </div>
      {step === 0 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>Tell us about yourself</h2><Field label="Full name" required><input className="fin" value={d.name} onChange={e => set("name", e.target.value)} placeholder="Your full name" /></Field><Field label="Handle" required hint="Lowercase, no spaces"><div className="inw has-pre"><span className="pre">@</span><input className="fin" value={d.handle} onChange={e => set("handle", e.target.value.toLowerCase().replace(/\s/g,""))} placeholder="yourhandle" /></div></Field><Field label="City" required><input className="fin" value={d.city} onChange={e => set("city", e.target.value)} placeholder="e.g. Mumbai, Bengaluru" /></Field><Field label="Languages"><Chips options={LANGUAGES} value={d.language} onChange={v => set("language", v)} /></Field></>)}
      {step === 1 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>About you</h2><Field label="Age group" required><Chips options={AGE_GROUPS} value={d.age_group} onChange={v => set("age_group", v)} multi={false} /></Field><Field label="Gender" required><Chips options={GENDERS} value={d.gender} onChange={v => set("gender", v)} multi={false} /></Field><Field label="Marital status"><Chips options={["Single","Married","Divorced","Widowed","In a relationship"]} value={d.marital} onChange={v => set("marital", v)} multi={false} /></Field><Field label="Kids?"><Chips options={["Yes","No","Prefer not to say"]} value={d.has_kids} onChange={v => set("has_kids", v)} multi={false} /></Field><Field label="Income" required><Chips options={INCOME} value={d.income} onChange={v => set("income", v)} multi={false} /></Field></>)}
      {step === 2 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>Physical profile</h2><p style={{ color: "var(--text-muted)", fontSize: 13.5, margin: "0 0 22px" }}>Used to match you with physical product missions. Never shared without permission.</p><Field label="Height" required><Chips options={HEIGHT} value={d.height} onChange={v => set("height", v)} multi={false} /></Field><Field label="Weight" required><Chips options={WEIGHT} value={d.weight} onChange={v => set("weight", v)} multi={false} /></Field><Field label="Skin tone" required><Chips options={SKIN_TONE} value={d.skin_tone} onChange={v => set("skin_tone", v)} multi={false} /></Field><Field label="Hair type"><Chips options={HAIR_TYPE} value={d.hair_type} onChange={v => set("hair_type", v)} multi={false} /></Field><Field label="Hair length"><Chips options={HAIR_LENGTH} value={d.hair_length} onChange={v => set("hair_length", v)} multi={false} /></Field><Field label="Body type" required><Chips options={BODY_TYPE} value={d.body_type} onChange={v => set("body_type", v)} multi={false} /></Field></>)}
      {step === 3 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>Lifestyle and availability</h2><Field label="Occupation" required><Chips options={OCCUPATIONS} value={d.occupation} onChange={v => set("occupation", v)} multi={false} /></Field><Field label="Food preference"><Chips options={FOOD_PREF} value={d.food_pref} onChange={v => set("food_pref", v)} multi={false} /></Field><Field label="Lifestyle interests"><Chips options={LIFESTYLE} value={d.lifestyle} onChange={v => set("lifestyle", v)} /></Field><Field label="Devices" required><Chips options={DEVICES} value={d.devices} onChange={v => set("devices", v)} /></Field><Field label="Time per week" required><Chips options={HOURS} value={d.hours} onChange={v => set("hours", v)} multi={false} /></Field></>)}
      <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
        {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(s => s-1)} style={{ flex: 1 }}><Icon name="arrowLeft" size={15} /> Back</button>}
        <Btn variant="primary" style={{ flex: 2, justifyContent: "center" }} disabled={!valid[step]} onClick={() => step < 3 ? setStep(s => s+1) : onDone(d, "user")}>{step === 3 ? "Complete setup" : "Continue"}</Btn>
      </div>
    </div>
  );
}

function ValidatorOnboarding({ onDone, error, vid }) {
  const [step, setStep] = useDraft(`VC_V_STEP_VALIDATOR_${vid}`, 0);
  const [d, setD] = useDraft(`VC_V_DRAFT_VALIDATOR_${vid}`, { name: "", handle: "", city: "", language: [], bio: "", occupation: "", experience: "", industry: [], company: "", product_types: [], tech_tools: [], devices: [], hours: "" });
  const set = (k, v) => setD(p => ({ ...p, [k]: v }));
  const valid = [d.name.trim() && d.handle.trim() && d.city.trim(), (d.occupation || d.role) && d.experience && d.industry.length > 0, d.product_types.length > 0, d.hours && d.devices.length > 0];
  const steps = ["Basic info","Professional","Expertise","Availability"];
  return (
    <div className="rise" style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
        {steps.map((s, i) => (<div key={i} style={{ flex: 1 }}><div style={{ height: 4, borderRadius: 20, background: i <= step ? "var(--accent)" : "var(--border)" }} /><div style={{ fontSize: 11, fontWeight: 600, color: i === step ? "var(--accent)" : "var(--text-faint)", marginTop: 4 }}>{s}</div></div>))}
      </div>
      {step === 0 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>Tell us about yourself</h2><Field label="Full name" required><input className="fin" value={d.name} onChange={e => set("name", e.target.value)} placeholder="Your full name" /></Field><Field label="Handle" required><div className="inw has-pre"><span className="pre">@</span><input className="fin" value={d.handle} onChange={e => set("handle", e.target.value.toLowerCase().replace(/\s/g,""))} placeholder="yourhandle" /></div></Field><Field label="City" required><input className="fin" value={d.city} onChange={e => set("city", e.target.value)} placeholder="e.g. Bengaluru, Remote" /></Field><Field label="Languages"><Chips options={LANGUAGES} value={d.language} onChange={v => set("language", v)} /></Field><Field label="Short bio" hint="Tell builders what makes your feedback valuable"><textarea className="fin" rows={3} value={d.bio} onChange={e => set("bio", e.target.value)} placeholder="e.g. Product designer with 5 years at B2B SaaS companies." /></Field></>)}
      {step === 1 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>Professional background</h2><Field label="Role" required><Chips options={ROLES} value={d.occupation || d.role} onChange={v => set("occupation", v)} multi={false} /></Field><Field label="Experience" required><Chips options={EXP} value={d.experience} onChange={v => set("experience", v)} multi={false} /></Field><Field label="Industry" required><Chips options={INDUSTRIES} value={d.industry} onChange={v => set("industry", v)} /></Field><Field label="Company" hint="Optional"><input className="fin" value={d.company} onChange={e => set("company", e.target.value)} placeholder="e.g. Razorpay, Freelance" /></Field></>)}
      {step === 2 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>Your expertise</h2><Field label="Product types you test" required><Chips options={PRODUCT_TYPES} value={d.product_types} onChange={v => set("product_types", v)} /></Field><Field label="Tools you use"><Chips options={TECH_TOOLS} value={d.tech_tools} onChange={v => set("tech_tools", v)} /></Field></>)}
      {step === 3 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>Availability</h2><Field label="Devices" required><Chips options={DEVICES} value={d.devices} onChange={v => set("devices", v)} /></Field><Field label="Time per week" required><Chips options={HOURS} value={d.hours} onChange={v => set("hours", v)} multi={false} /></Field></>)}
      {error && step === 3 && <div className="err-banner" style={{ marginTop: 16 }}>{error}</div>}
      <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
        {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(s => s-1)} style={{ flex: 1 }}><Icon name="arrowLeft" size={15} /> Back</button>}
        <Btn variant="primary" style={{ flex: 2, justifyContent: "center" }} disabled={!valid[step]} onClick={() => step < 3 ? setStep(s => s+1) : onDone({ ...d, occupation: d.occupation || d.role }, "validator")}>{step === 3 ? "Complete setup" : "Continue"}</Btn>
      </div>
    </div>
  );
}

function TesterOnboarding({ onDone, error, vid }) {
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
      setResumeError("Only PDF files are accepted.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setResumeError("File is too large — max 5MB.");
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
  const steps = ["Basic info","Professional","Proof","Declaration"];
  return (
    <div className="rise" style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
        {steps.map((s, i) => (<div key={i} style={{ flex: 1 }}><div style={{ height: 4, borderRadius: 20, background: i <= step ? "var(--warning)" : "var(--border)" }} /><div style={{ fontSize: 11, fontWeight: 600, color: i === step ? "var(--warning)" : "var(--text-faint)", marginTop: 4 }}>{s}</div></div>))}
      </div>
      {step === 0 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>Tell us about yourself</h2><div style={{ padding: "10px 14px", background: "var(--warning-weak)", borderRadius: "var(--radius-sm)", fontSize: 13, color: "var(--warning)", fontWeight: 600, marginBottom: 22 }}>Admin reviews your profile within 72 hours.</div><Field label="Full name" required><input className="fin" value={d.name} onChange={e => set("name", e.target.value)} placeholder="Your full name" /></Field><Field label="Handle" required><div className="inw has-pre"><span className="pre">@</span><input className="fin" value={d.handle} onChange={e => set("handle", e.target.value.toLowerCase().replace(/\s/g,""))} placeholder="yourhandle" /></div></Field><Field label="City" required><input className="fin" value={d.city} onChange={e => set("city", e.target.value)} placeholder="e.g. Bengaluru, Hyderabad" /></Field><Field label="Languages"><Chips options={LANGUAGES} value={d.language} onChange={v => set("language", v)} /></Field></>)}
      {step === 1 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 22px" }}>Professional background</h2><Field label="Role" required><Chips options={ROLES} value={d.occupation || d.role} onChange={v => set("occupation", v)} multi={false} /></Field><Field label="Experience" required><Chips options={EXP} value={d.experience} onChange={v => set("experience", v)} multi={false} /></Field><Field label="Current company" required hint="Required for verification"><input className="fin" value={d.company} onChange={e => set("company", e.target.value)} placeholder="e.g. Infosys, Freelance QA" /></Field><Field label="Industry" required><Chips options={INDUSTRIES} value={d.industry} onChange={v => set("industry", v)} /></Field><Field label="Testing domains"><Chips options={TESTER_DOMAINS} value={d.domains} onChange={v => set("domains", v)} /></Field><Field label="Certifications"><Chips options={CERT} value={d.certifications} onChange={v => set("certifications", v)} /></Field><Field label="Tools"><Chips options={TECH_TOOLS} value={d.tools} onChange={v => set("tools", v)} /></Field></>)}
      {step === 2 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>Proof of experience</h2><Field label="LinkedIn URL" required><div className="inw has-pre"><span className="pre"><Icon name="link" size={14} /></span><input className="fin" value={d.linkedin_url} onChange={e => set("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/yourprofile" /></div></Field><Field label="Resume / CV" required>{resumeUploading ? (<div style={{ padding: "12px 14px", background: "var(--panel-inset)", borderRadius: "var(--radius-sm)", fontSize: 13.5 }}>Uploading…</div>) : resumeUploaded ? (<div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--success-weak)", borderRadius: "var(--radius-sm)" }}><Icon name="check" size={16} style={{ color: "var(--success)" }} /><span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: "var(--success)" }}>{resumeFile?.name}</span><button className="btn btn-quiet" style={{ fontSize: 12 }} onClick={() => { setResumeFile(null); setResumeUploaded(false); set("resume_filename", ""); }}>Remove</button></div>) : (<label style={{ display: "block", border: "2px dashed var(--border)", borderRadius: "var(--radius)", padding: 24, textAlign: "center", cursor: "pointer", background: "var(--panel-2)" }}><input type="file" accept="application/pdf" style={{ display: "none" }} onChange={e => pickResume(e.target.files[0])} /><Icon name="upload" size={22} style={{ color: "var(--text-faint)", marginBottom: 8 }} /><div style={{ fontWeight: 600 }}>Click to upload resume</div><div style={{ fontSize: 12, color: "var(--text-faint)" }}>PDF only, max 5MB</div></label>)}{resumeError && <div className="err-banner" style={{ marginTop: 8 }}>{resumeError}</div>}</Field><Field label="Portfolio / GitHub" hint="Optional"><div className="inw has-pre"><span className="pre"><Icon name="link" size={14} /></span><input className="fin" value={d.portfolio_url} onChange={e => set("portfolio_url", e.target.value)} placeholder="https://github.com/yourprofile" /></div></Field><Field label="Describe your testing experience" required hint={wordCount + " words (min 30)"}><textarea className="fin" rows={5} value={d.testing_bio} onChange={e => set("testing_bio", e.target.value)} placeholder="Describe products tested, bugs found, and what makes your feedback valuable." /></Field></>)}
      {step === 3 && (<><h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>Declaration</h2><p style={{ color: "var(--text-muted)", fontSize: 13.5, margin: "0 0 22px" }}>Admin will review within 72 hours. Until verified you have Validator access.</p><div className="card" style={{ padding: 20, marginBottom: 16 }}>{[["Name",d.name],["Handle","@"+d.handle],["Role",d.occupation || d.role],["LinkedIn",d.linkedin_url],["Resume",d.resume_filename]].map(([k,v]) => (<div key={k} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: "1px solid var(--border)", fontSize: 13.5 }}><span style={{ color: "var(--text-faint)", width: 80, flexShrink: 0 }}>{k}</span><span style={{ fontWeight: 600, wordBreak: "break-all" }}>{v||"-"}</span></div>))}</div><div style={{ padding: "14px 16px", background: "var(--warning-weak)", borderRadius: "var(--radius)", marginBottom: 20, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>Admin reviews within 72 hours. If approved: Verified Tester badge and premium missions. If rejected: Stay as Validator and reapply anytime.</div><div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius)", cursor: "pointer" }} onClick={() => set("agreed", !d.agreed)}><div style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, display: "grid", placeItems: "center", background: d.agreed ? "var(--warning)" : "var(--panel)", border: "1.5px solid " + (d.agreed ? "var(--warning)" : "var(--border-strong)") }}>{d.agreed && <Icon name="check" size={13} style={{ color: "#fff" }} />}</div><div style={{ fontSize: 13, color: "var(--text-muted)" }}>I confirm all information is accurate. False information may result in permanent removal.</div></div></>)}
      {error && step === 3 && <div className="err-banner" style={{ marginTop: 16 }}>{error}</div>}
      <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
        {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(s => s-1)} style={{ flex: 1 }}><Icon name="arrowLeft" size={15} /> Back</button>}
        <Btn variant="primary" style={{ flex: 2, justifyContent: "center" }} disabled={!valid[step]} onClick={() => step < 3 ? setStep(s => s+1) : onDone({ ...d, occupation: d.occupation || d.role }, "tester")}>{step === 3 ? "Submit for verification" : "Continue"}</Btn>
      </div>
    </div>
  );
}

function PendingScreen({ onContinue }) {
  return (
    <div className="rise" style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
      <div style={{ width: 80, height: 80, borderRadius: 24, background: "var(--warning-weak)", display: "grid", placeItems: "center", margin: "0 auto 22px" }}>
        <Icon name="clock" size={36} style={{ color: "var(--warning)" }} />
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 10px" }}>Application submitted!</h2>
      <p style={{ color: "var(--text-muted)", margin: "0 0 28px", fontSize: 15 }}>Our team will review your profile within 72 hours. In the meantime you have full Validator access.</p>
      <Btn variant="primary" block onClick={onContinue} style={{ justifyContent: "center" }}>Start exploring missions</Btn>
    </div>
  );
}

export default function VOnboarding() {
  const navigate = useNavigate();
  const { validator, refresh } = useVAuth();
  const [validatorType, setValidatorType] = useDraft(`VC_V_TYPE_${validator?.id}`, null);
  const [showPending, setShowPending] = useState(false);
  const [error, setError] = useState("");
  const type = TYPES.find(t => t.key === validatorType);

  useEffect(() => {
    if (!validatorType || showPending) return;
    const handleBeforeUnload = (e) => {
      if (window.__bypassUnload) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [validatorType, showPending]);

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
      setError(err.message || "Could not save profile. Please try again.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "grid", gridTemplateColumns: "260px 1fr" }}>
      <aside style={{ background: "var(--panel)", borderRight: "1px solid var(--border)", padding: "28px 20px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: 36 }}><BrandLogoFull height={48} /></div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 8 }}>Setup</div>
        <div style={{ display: "grid", gap: 6, marginBottom: 24 }}>
          {[{ l: "Choose your type", done: !!validatorType }, { l: "Complete profile", done: false }].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: "var(--radius-sm)", background: (i === 0 && !validatorType) || (i === 1 && validatorType && !showPending) ? "var(--accent-weak)" : "transparent" }}>
              <span style={{ width: 24, height: 24, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, background: s.done ? "var(--success)" : (i === 0 && !validatorType) || (i === 1 && validatorType) ? "var(--accent)" : "var(--panel-inset)", color: s.done || (i === 0 && !validatorType) || (i === 1 && validatorType) ? "#fff" : "var(--text-faint)" }}>{s.done ? <Icon name="check" size={12} /> : i + 1}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{s.l}</span>
            </div>
          ))}
        </div>
        {type && <div style={{ padding: 14, background: type.bg, borderRadius: "var(--radius)", marginBottom: 16, border: "1px solid " + type.color + "44" }}><div style={{ fontWeight: 700, fontSize: 13, color: type.color, marginBottom: 4 }}>{type.title}</div><div style={{ fontSize: 12, color: "var(--text-muted)" }}>{type.missions}</div></div>}
        <div style={{ marginTop: "auto", padding: "14px 12px", background: "var(--success-weak)", borderRadius: "var(--radius)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--success)", marginBottom: 4 }}>Account created!</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>Complete your profile to start getting matched to missions.</div>
        </div>
        {validatorType && !showPending && (
          <button className="btn btn-ghost" style={{ marginTop: 12, justifyContent: "center", color: "var(--text-muted)" }} onClick={() => {
            if (window.confirm("Are you sure you want to change your role? This will clear all your progress.")) {
              localStorage.removeItem(`VC_V_STEP_${validatorType.toUpperCase()}_${validator?.id}`);
              localStorage.removeItem(`VC_V_DRAFT_${validatorType.toUpperCase()}_${validator?.id}`);
              setValidatorType(null);
            }
          }}>Change role (Start over)</button>
        )}
      </aside>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", overflowY: "auto" }}>
        {showPending ? <PendingScreen onContinue={() => window.location.href = "/validator"} /> : !validatorType ? <TypeSelector onSelect={setValidatorType} /> : validatorType === "user" ? <UserOnboarding vid={validator?.id} onDone={handleDone} /> : validatorType === "validator" ? <ValidatorOnboarding vid={validator?.id} onDone={handleDone} error={error} /> : <TesterOnboarding vid={validator?.id} onDone={handleDone} error={error} />}
      </div>
    </div>
  );
}
