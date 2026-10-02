/* ValidationCrew — supply side (Tester / Validator / User) · data + strength model */

/* ============ TESTER ============ */
const TESTED_PRODUCTS = [
  { v:"web",     t:"Websites",            icon:FI.monitor },
  { v:"mobile",  t:"Mobile apps",         icon:FI.mobile },
  { v:"saas",    t:"SaaS products",       icon:FI.cloud },
  { v:"ai",      t:"AI products",         icon:FI.cpu },
  { v:"api",     t:"APIs",                icon:FI.layers },
  { v:"games",   t:"Games",               icon:FI.bolt },
  { v:"ecom",    t:"E-commerce",          icon:FI.tag },
  { v:"physical",t:"Physical products",   icon:FI.package },
  { v:"hardware",t:"Hardware devices",    icon:FI.cpu },
];
const TESTING_AREAS = ["Functional","Usability","UX","Accessibility","Security","Performance","Beta","Exploratory"];
const TESTER_EXP = ["< 1 year","1–3 years","3–5 years","5–10 years","10+ years"];
const TESTER_INTERESTS = ["AI","SaaS","Fintech","EdTech","Healthcare","E-commerce","Gaming","Enterprise Software"];
const DEVICE_GROUPS = {
  Mobile: ["Android phone","iPhone","Android tablet","iPad"],
  Desktop: ["Windows","Mac","Linux"],
  Browsers: ["Chrome","Safari","Firefox","Edge"],
};

/* ============ VALIDATOR ============ */
const VALIDATOR_ROLES = ["Product Manager","Doctor","Teacher","Engineer","HR Professional","Entrepreneur","Finance Professional","Marketing Professional","Lawyer","Consultant","Other"];
const VAL_INDUSTRY = ["Technology","Healthcare","Education","Finance","Manufacturing","Government","Retail","Other"];
const VAL_EXP = ["0–2 years","3–5 years","6–10 years","10–15 years","15+ years"];
const EXPERTISE_AREAS = ["AI & Automation","Product Management","Human Resources","Marketing","Finance","Healthcare","Education","Law","Public Policy","Entrepreneurship","Consumer Behaviour"];
const VAL_INTERESTS = ["Startups","Technology","Investing","Leadership","Innovation","Business Strategy","Research"];
const VAL_PARTICIPATION = [
  { v:"surveys",   t:"Surveys",          d:"Quick & structured",   icon:FI.doc },
  { v:"interviews",t:"Interviews",       d:"In-depth 1:1s",        icon:FI.mail },
  { v:"reviews",   t:"Product reviews",  d:"Hands-on assessment",  icon:FI.box },
  { v:"focus",     t:"Focus groups",     d:"Moderated panels",     icon:FI.users },
  { v:"expert",    t:"Expert opinions",  d:"Your professional take",icon:FI.star },
  { v:"live",      t:"Live discussions", d:"Real-time sessions",   icon:FI.monitor },
];

/* ============ USER ============ */
const GENDERS_USER = ["Male","Female","Prefer not to say","Other"];
const USER_QUALS = ["School","Diploma","Graduate","Postgraduate","Doctorate"];
const USER_OCC = ["Student","Working Professional","Entrepreneur","Homemaker","Freelancer","Retired","Unemployed"];
const MARITAL = ["Single","Married","Prefer not to say"];
const HOUSEHOLD_INCOME = {
  india: ["< ₹3L","₹3–6L","₹6–12L","₹12–20L","₹20L+"],
  global:["< $20k","$20–40k","$40–75k","$75–120k","$120k+"],
};
const USER_INTERESTS = ["Shopping","Technology","Food","Travel","Fitness","Beauty","Finance","Entertainment","Parenting","Education"];
const SHOP_FREQ = ["Daily","Weekly","Monthly","Occasionally","Rarely"];
const PLATFORMS = {
  india: ["Amazon","Flipkart","Myntra","Meesho","Offline stores"],
  global:["Amazon","eBay","Walmart","Etsy","Offline stores"],
};
const HEIGHT_RANGE = ["< 150 cm","150–160 cm","160–170 cm","170–180 cm","180+ cm"];
const WEIGHT_RANGE = ["< 50 kg","50–65 kg","65–80 kg","80–95 kg","95+ kg"];
const SKIN_TYPE = ["Oily","Dry","Combination","Sensitive","Normal"];
const DIET = ["Vegetarian","Vegan","Non-vegetarian","Eggetarian","Jain"];
const FITNESS_LEVEL = ["Sedentary","Lightly active","Active","Very active","Athlete"];
const USER_PARTICIPATION = [
  { v:"trials",    t:"New product trials",  icon:FI.box },
  { v:"apptest",   t:"App testing",         icon:FI.mobile },
  { v:"webreview", t:"Website reviews",     icon:FI.monitor },
  { v:"research",  t:"Research studies",    icon:FI.flask },
  { v:"surveys",   t:"Consumer surveys",    icon:FI.doc },
  { v:"samples",   t:"Product samples",     icon:FI.package },
  { v:"packaging", t:"Packaging feedback",  icon:FI.tag },
  { v:"marketing", t:"Marketing feedback",  icon:FI.mega },
];

/* ============ rewards (region aware) ============ */
const REWARD_OPTIONS = {
  tester:    [{ v:"cash", t:"Cash" }, { v:"gift", t:"Gift cards" }, { v:"vouchers", t:"Vouchers" }, { v:"samples", t:"Product samples" }],
  validator: [{ v:"cash", t:"Cash" }, { v:"gift", t:"Gift cards" }, { v:"donations", t:"Donations" }, { v:"samples", t:"Product samples" }],
  user:      [{ v:"cash", t:"Cash" }, { v:"gift", t:"Gift cards" }, { v:"coupons", t:"Coupons" }, { v:"samples", t:"Product samples" }],
};

/* ============ money ============ */
function money(region, pair) { return region === "india" ? "₹" + pair.india.toLocaleString("en-IN") : "$" + pair.global.toLocaleString("en-US"); }
function moneyNum(region, pair) { return region === "india" ? pair.india : pair.global; }
function cur(region) { return region === "india" ? "₹" : "$"; }

/* ============ sample opportunities (payoff wizard) ============ */
const OPPORTUNITIES = [
  { id:1, title:"Onboarding test — fintech app",          type:"App testing",     reward:{india:800,global:25},  match:96, tags:["Fintech","Mobile"] },
  { id:2, title:"Review an AI writing assistant",          type:"Product review",  reward:{india:600,global:18},  match:94, tags:["AI","SaaS"] },
  { id:3, title:"Usability study — e-commerce checkout",   type:"Usability",       reward:{india:1200,global:40}, match:92, tags:["E-commerce","UX"] },
  { id:4, title:"Beta test a SaaS analytics dashboard",    type:"Beta testing",    reward:{india:1000,global:30}, match:90, tags:["SaaS","Beta"] },
  { id:5, title:"Expert opinion — telehealth product",     type:"Expert opinion",  reward:{india:2500,global:80}, match:88, tags:["Healthcare","Expert"] },
  { id:6, title:"Focus group — new beverage launch",       type:"Focus group",     reward:{india:1500,global:50}, match:86, tags:["FMCG","Panel"] },
  { id:7, title:"Packaging feedback — snack brand",        type:"Survey",          reward:{india:300,global:10},  match:84, tags:["Packaging","FMCG"] },
  { id:8, title:"Consumer survey — streaming habits",      type:"Survey",          reward:{india:250,global:8},   match:82, tags:["Media","Survey"] },
];

/* ============ profile strength model ============ */
function foStrength(signals) {
  const total = signals.reduce((s, x) => s + x.w, 0);
  const got = signals.reduce((s, x) => s + (x.done ? x.w : 0), 0);
  return Math.round((100 * got) / Math.max(1, total));
}
const STRENGTH_TIERS = [
  { min: 0,  name: "Basic Member",        tone: "faint" },
  { min: 30, name: "Verified Member",     tone: "muted" },
  { min: 55, name: "Trusted Contributor", tone: "accent" },
  { min: 80, name: "__top",               tone: "success" },
];
function strengthTier(score, role) {
  let t = STRENGTH_TIERS[0];
  for (const x of STRENGTH_TIERS) if (score >= x.min) t = x;
  let name = t.name;
  if (name === "__top") name = role === "tester" ? "Elite Tester" : role === "validator" ? "Expert Validator" : "Power Contributor";
  return { ...t, name, score };
}

Object.assign(window, {
  TESTED_PRODUCTS, TESTING_AREAS, TESTER_EXP, TESTER_INTERESTS, DEVICE_GROUPS,
  VALIDATOR_ROLES, VAL_INDUSTRY, VAL_EXP, EXPERTISE_AREAS, VAL_INTERESTS, VAL_PARTICIPATION,
  GENDERS_USER, USER_QUALS, USER_OCC, MARITAL, HOUSEHOLD_INCOME, USER_INTERESTS, SHOP_FREQ, PLATFORMS,
  HEIGHT_RANGE, WEIGHT_RANGE, SKIN_TYPE, DIET, FITNESS_LEVEL, USER_PARTICIPATION,
  REWARD_OPTIONS, money, moneyNum, cur, OPPORTUNITIES, foStrength, STRENGTH_TIERS, strengthTier,
});


--- UUID: 57addf3c-1eb9-4bf0-9dc4-c5de7205b008 | MIME: application/javascript ---

/* ValidationCrew — the matching wizard (shared across all builder types)
   "Let's find the right people" — refine → scan → results → workspace handoff. */
const { useState: wuS, useEffect: wuE, useMemo: wuM, useRef: wuR } = React;

/* score a persona against the captured audience */
function scoreValidator(p, d) {
  let s = 72;
  const ints = (d.interests || []).map((x) => x.toLowerCase());
  const occs = (d.occupations || []);
  const tagHits = p.tags.filter((t) => ints.includes(t.toLowerCase())).length;
  s += tagHits * 7;
  if ((d.ageBands || []).length && d.ageBands.includes(p.age)) s += 9;
  if (occs.length) {
    const map = { "Student": ["Student","Graduate Student","Postgrad Student"], "Working Professional": ["Engineer","Manager","Analyst","Researcher","Marketer","Designer","Pro"], "Entrepreneur": ["Founder"] };
    for (const o of occs) { if ((map[o] || []).some((k) => p.role.includes(k))) { s += 6; break; } }
  }
  s += (p.id * 7) % 9 - 4; // deterministic jitter
  return Math.max(61, Math.min(98, Math.round(s)));
}

function WizardHeader({ role, onExit }) {
  return (
    <header className="ob-top">
      <div className="ob-logo"><img src="vc-logo.png" alt="ValidationCrew" style={{ height: 32, width: "auto", display: "block" }} /></div>
      <div className="rolechip"><span className="rc-dot" /><b>{ROLE_BY_KEY[role].name}</b></div>
      <div className="ob-top-spacer" />
      <button className="btn-exit" onClick={onExit}>Skip for now</button>
    </header>
  );
}

/* ---------- stage 0 · refine ---------- */
function WizRefine({ d, set, region, reach, base, onStart }) {
  const quality = reach < base * 0.18 ? { t: "Precise", tone: "success" } : reach < base * 0.45 ? { t: "Focused", tone: "accent" } : { t: "Broad", tone: "muted" };
  return (
    <div className="wiz-body">
      <div className="wiz-head rise">
        <div className="eyebrow" style={{ marginBottom: 12 }}>The matching engine</div>
        <h1 className="wiz-h">Let's find the right people</h1>
        <p className="wiz-sub">Tell us whose opinion matters. Your reach updates live as you go — the sharper you are, the higher the signal.</p>
      </div>
      <div className="wiz-refine rise">
        <div className="wiz-controls">
          <FSection label="Age" count={(d.ageBands || []).length ? null : "Pick at least one"} />
          <Chips options={AGE_BANDS} value={d.ageBands} onChange={(v) => set("ageBands", v)} />
          <FSection label="Gender" />
          <Chips options={GENDERS} value={d.genders} onChange={(v) => set("genders", v)} />
          <FSection label="Location" />
          <LocationFields region={region} d={d} set={set} />
          <FSection label="Occupation" />
          <Chips options={OCC_SIMPLE} value={d.occupations} onChange={(v) => set("occupations", v)} />
          <FSection label="Interests" />
          <Chips options={INTERESTS} value={d.interests} onChange={(v) => set("interests", v)} />
        </div>
        <div className="wiz-side">
          <div className="reach reach-lg">
            <div className="reach-top">
              <span className="r-ic">{FI.users()}</span>
              <div><div className="r-num">{reach.toLocaleString("en-US")}</div><div className="r-lab">people match right now</div></div>
            </div>
            <div className="r-bar"><i style={{ width: Math.max(4, Math.min(100, Math.round((reach / base) * 100))) + "%" }} /></div>
            <div className="wiz-quality">
              <span>Match precision</span>
              <span className={"wq-tag wq-" + quality.tone}>{quality.t}</span>
            </div>
            <button className="btn-next wiz-go" disabled={!(d.ageBands || []).length} onClick={onStart}>Find my people{FI.arrow()}</button>
            <p className="wiz-note">{FI.shield()} We invite matched people on your behalf — you never see their personal data.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- stage 1 · scanning ---------- */
function WizScan({ region, reach }) {
  const pool = region === "india" ? "184,000" : "246,000";
  const n = useCountUp(reach);
  const [msg, setMsg] = wuS(0);
  const lines = [`Scanning ${pool} validators…`, "Filtering by your audience…", "Ranking by match score…", "Almost there…"];
  wuE(() => { const id = setInterval(() => setMsg((m) => Math.min(lines.length - 1, m + 1)), 620); return () => clearInterval(id); }, []);
  const av = (region === "india" ? SAMPLE_VALIDATORS.india : SAMPLE_VALIDATORS.global);
  return (
    <div className="wiz-body wiz-scan">
      <div className="radar">
        <span className="radar-ring r1" /><span className="radar-ring r2" /><span className="radar-ring r3" />
        <span className="radar-sweep" />
        <span className="radar-core">{FI.target()}</span>
        {av.slice(0, 8).map((p, i) => (
          <span key={p.id} className="radar-av" style={{ "--i": i, background: AV_COLORS[i % AV_COLORS.length] }}>{avInitials(p.name)}</span>
        ))}
      </div>
      <div className="scan-count">{n.toLocaleString("en-US")}</div>
      <div className="scan-msg">{lines[msg]}</div>
    </div>
  );
}

/* ---------- stage 2 · results ---------- */
function WizResults({ role, d, region, reach, onFinish, onBack }) {
  const personas = region === "india" ? SAMPLE_VALIDATORS.india : SAMPLE_VALIDATORS.global;
  const scored = wuM(() => personas.map((p) => ({ ...p, match: scoreValidator(p, d) })).sort((a, b) => b.match - a.match), [d, region]);
  const top = scored.slice(0, 6);
  const avg = Math.round(top.reduce((s, p) => s + p.match, 0) / top.length);
  /* distributions */
  const locCount = {}; scored.forEach((p) => { locCount[p.loc] = (locCount[p.loc] || 0) + 1; });
  const locs = Object.entries(locCount).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const ageCount = {}; scored.forEach((p) => { ageCount[p.age] = (ageCount[p.age] || 0) + 1; });
  const ages = ["18–24", "25–34", "35–44", "45–54", "55+"].filter((a) => ageCount[a]).map((a) => [a, ageCount[a]]);
  const noun = (FO_ROLES_CONFIG[role] && FO_ROLES_CONFIG[role].noun) || "campaign";
  const maxLoc = Math.max(...locs.map((l) => l[1]), 1);

  return (
    <div className="wiz-body">
      <div className="wiz-head rise">
        <div className="wiz-found-badge">{FI.check()}</div>
        <h1 className="wiz-h">We found <span className="wiz-num">{reach.toLocaleString("en-US")}</span> people who match</h1>
        <p className="wiz-sub">Ranked by how well they fit your audience. Here's a preview of who's at the top — your {noun} can go to them the moment your workspace is ready.</p>
      </div>

      <div className="wiz-results rise">
        <div className="wiz-cards">
          <div className="wiz-cards-head"><b>Top matches</b><span className="wiz-avg">Avg match {avg}%</span></div>
          <div className="match-grid">
            {top.map((p, i) => (
              <div key={p.id} className="match-card">
                <span className="m-av" style={{ background: AV_COLORS[i % AV_COLORS.length] }}>{avInitials(p.name)}</span>
                <div className="m-meta">
                  <b>{p.name}</b>
                  <p>{p.role} · {p.loc}</p>
                  <div className="m-tags">{p.tags.slice(0, 3).map((t) => <span key={t} className="m-tag">{t}</span>)}</div>
                </div>
                <div className="m-match"><div className="m-ring" style={{ "--p": p.match }}><span>{p.match}<i>%</i></span></div></div>
              </div>
            ))}
          </div>
        </div>

        <div className="wiz-dist">
          <div className="dist-block">
            <div className="dist-h">{FI.pin()}<b>Top locations</b></div>
            {locs.map(([l, c]) => (
              <div key={l} className="dist-row"><span className="dr-l">{l}</span><span className="dr-bar"><i style={{ width: Math.round((c / maxLoc) * 100) + "%" }} /></span></div>
            ))}
          </div>
          <div className="dist-block">
            <div className="dist-h">{FI.users()}<b>Age spread</b></div>
            {ages.map(([a, c]) => (
              <div key={a} className="dist-row"><span className="dr-l">{a}</span><span className="dr-bar"><i style={{ width: Math.round((c / Math.max(...ages.map((x) => x[1]))) * 100) + "%" }} /></span></div>
            ))}
          </div>
          <div className="dist-cta">
            <button className="btn-next wiz-create" onClick={onFinish}>Create my workspace{FI.arrow()}</button>
            <button className="skip" onClick={onBack}>Refine audience</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- wizard shell ---------- */
function MatchWizard({ role, d, set, region, onExit, onFinish }) {
  const [stage, setStage] = wuS(0);
  const base = region === "india" ? 184000 : 246000;
  const reach = wuM(() => foReach(d, region), [d, region]);
  wuE(() => {
    if (stage === 1) { const id = setTimeout(() => setStage(2), 2500); return () => clearTimeout(id); }
  }, [stage]);
  return (
    <div className="wiz">
      <WizardHeader role={role} onExit={onExit} />
      {stage === 0 && <WizRefine d={d} set={set} region={region} reach={reach} base={base} onStart={() => { setStage(1); window.scrollTo({ top: 0 }); }} />}
      {stage === 1 && <WizScan region={region} reach={reach} />}
      {stage === 2 && <WizResults role={role} d={d} region={region} reach={reach} onFinish={onFinish} onBack={() => setStage(0)} />}
    </div>
  );
}

Object.assign(window, { MatchWizard });


--- UUID: 65216d9e-534c-4f81-b3df-dca1deb5af89 | MIME: application/javascript ---

/* ValidationCrew — onboarding · shared field blocks + Common Final step */
const { useState: ffuS, useRef: ffuR } = React;

/* ---- textarea ---- */
function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea className="fin" style={{ resize: "vertical", minHeight: rows * 24 + 16 + "px", lineHeight: 1.5 }}
      value={value || ""} placeholder={placeholder} rows={rows}
      onChange={(e) => onChange(e.target.value)} />
  );
}

/* ---- personal block (reused by Company / Researcher / Organization) ---- */
function PersonalFields({ d, set, region, roleField, showLinkedIn = true }) {
  const emailOk = EMAIL_RE.test(d.email || "");
  return (
    <div className="fgrid c2">
      <Field label="Full name" span>
        <TextInput lead={FI.user()} value={d.fullName} onChange={(v) => set("fullName", v)} placeholder="Ananya Sharma" />
      </Field>
      <Field label="Work email" why="private" hint={d.email && !emailOk ? null : "A work domain raises your trust tier"} error={d.email && !emailOk ? "Enter a valid email address" : null}>
        <TextInput lead={FI.mail()} type="email" value={d.email} onChange={(v) => set("email", v)} placeholder="you@org.com" valid={emailOk} bad={d.email && !emailOk} />
      </Field>
      <Field label="Mobile number" hint="Used only for verification">
        <TextInput prefix={region === "india" ? "+91" : "+1"} value={d.mobile} onChange={(v) => set("mobile", v.replace(/[^\d\s-]/g, ""))} placeholder="98765 43210" />
      </Field>
      {roleField && (roleField.free
        ? <Field label={roleField.label}><TextInput lead={FI.briefcase()} value={d[roleField.key]} onChange={(v) => set(roleField.key, v)} placeholder={roleField.placeholder} /></Field>
        : <Field label={roleField.label}><SelectInput value={d[roleField.key]} onChange={(v) => set(roleField.key, v)} options={roleField.options} placeholder={roleField.placeholder || "Select…"} /></Field>
      )}
      {showLinkedIn && (
        <Field label="LinkedIn profile" optional span={!roleField} hint="Speeds up reviewer trust">
          <TextInput lead={FI.link()} value={d.linkedin} onChange={(v) => set("linkedin", v)} placeholder="linkedin.com/in/…" />
        </Field>
      )}
    </div>
  );
}

/* ---- location block ---- */
function LocationFields({ region, d, set, withCity }) {
  const countryOpts = region === "india" ? ["India"] : Object.keys(GEO_GLOBAL);
  const stateOpts = region === "india" ? Object.keys(GEO_INDIA) : (d.country && GEO_GLOBAL[d.country]) || [];
  const districtOpts = region === "india" ? (d.state && GEO_INDIA[d.state]) || [] : [];
  return (
    <div className="fgrid c2">
      <Field label="Country">
        <SelectInput value={region === "india" ? "India" : d.country} onChange={(v) => { set("country", v); set("state", ""); set("district", ""); }} options={countryOpts} placeholder="Select country" />
      </Field>
      <Field label={region === "india" ? "State" : "State / Region"}>
        <SelectInput value={d.state} onChange={(v) => { set("state", v); set("district", ""); }} options={stateOpts} placeholder={region === "india" ? "Any state" : (d.country ? "Any region" : "Pick a country first")} />
      </Field>
      <Field label="District" optional>
        <SelectInput value={d.district} onChange={(v) => set("district", v)} options={region === "india" ? districtOpts : ["Any"]} placeholder={region === "india" ? (d.state ? "Any district" : "Pick a state first") : "—"} />
      </Field>
      {withCity && (
        <Field label="City" optional>
          <TextInput lead={FI.pin()} value={d.city} onChange={(v) => set("city", v)} placeholder="e.g. Bengaluru" />
        </Field>
      )}
    </div>
  );
}

/* ---- age + gender ---- */
function DemographicsRow({ d, set }) {
  return (
    <div className="fgrid">
      <Field label="Age range" hint="Select all that apply">
        <Chips options={AGE_BANDS} value={d.ageBands} onChange={(v) => set("ageBands", v)} />
      </Field>
      <Field label="Gender">
        <Chips options={GENDERS} value={d.genders} onChange={(v) => set("genders", v)} />
      </Field>
    </div>
  );
}

/* ---- mock upload control ---- */
function UploadField({ value, onChange, hint }) {
  const [drag, setDrag] = ffuS(false);
  const inp = ffuR();
  const pick = () => { const names = ["Ethics_Approval_2026.pdf", "IRB_Clearance.pdf", "Approval_Letter.pdf"]; onChange(names[Math.floor(Math.random() * names.length)]); };
  if (value) {
    return (
      <div className="upload done">
        <span className="up-ic">{FI.doc()}</span>
        <div className="up-meta"><b>{value}</b><p>Uploaded · 248 KB</p></div>
        <button type="button" className="up-x" onClick={() => onChange("")}>Replace</button>
      </div>
    );
  }
  return (
    <div className={"upload" + (drag ? " drag" : "")}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); pick(); }}
      onClick={() => pick()} role="button">
      <input ref={inp} type="file" hidden onChange={pick} />
      <span className="up-ic ghost">{FI.doc()}</span>
      <div className="up-meta"><b>Drop a file or click to upload</b><p>{hint || "PDF, PNG or JPG up to 10 MB"}</p></div>
    </div>
  );
}

/* ============ Common Final step (all builder types) ============ */
function StepFinal({ d, set }) {
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Almost done · Preferences</div>
        <h1 className="step-h">How will you use ValidationCrew?</h1>
        <p className="step-sub">A couple of quick preferences so we can shape your workspace and suggest the right way to collect feedback.</p>
      </div>

      <FSection label="How often will you need feedback?" />
      <SelCards options={FREQUENCY} value={d.frequency} onChange={(v) => set("frequency", v)} cols={2} />

      <FSection label="Preferred methods" count={(d.methods || []).length ? `${(d.methods || []).length} selected` : null} />
      <SelCards options={PREFERRED_METHODS} value={d.methods || []} onChange={(v) => set("methods", v)} multi cols={2} icons />
    </div>
  );
}

/* ---- shared profile chips (occupation / education / income / interests / languages) ---- */
function ProfileChips({ d, set, region, occOptions, show }) {
  const S = show || {};
  return (
    <div className="fgrid">
      {S.occupation && (
        <Field label="Occupation"><Chips options={occOptions || OCC_SIMPLE} value={d.occupations} onChange={(v) => set("occupations", v)} /></Field>
      )}
      {S.education && (
        <Field label="Education"><Chips options={EDUCATIONS} value={d.educations} onChange={(v) => set("educations", v)} /></Field>
      )}
      {S.income && (
        <Field label="Income range (annual)"><Chips options={INCOME_BANDS[region]} value={d.incomeBands} onChange={(v) => set("incomeBands", v)} /></Field>
      )}
      {S.industry && (
        <Field label="Industry"><SelectInput value={d.audIndustry} onChange={(v) => set("audIndustry", v)} options={INDUSTRIES} placeholder="Any industry" /></Field>
      )}
      {S.languages && (
        <Field label="Languages"><Chips options={LANGUAGES[region]} value={d.languages} onChange={(v) => set("languages", v)} /></Field>
      )}
      {S.interests && (
        <Field label="Interests"><Chips options={INTERESTS} value={d.interests} onChange={(v) => set("interests", v)} /></Field>
      )}
    </div>
  );
}

Object.assign(window, {
  Textarea, PersonalFields, LocationFields, DemographicsRow, UploadField, StepFinal, ProfileChips,
});


--- UUID: 89bb8edb-3187-41c6-b834-e7c783a10acc | MIME: application/javascript ---

/* ValidationCrew — Tester onboarding flow */

function TeRsPersonal({ d, set, region }) {
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 1 · About you</div>
        <h1 className="step-h">Tell us about yourself</h1>
        <p className="step-sub">This stays private. We use it to match you with testing opportunities near you and send your rewards.</p>
      </div>
      <SupplyPersonal d={d} set={set} region={region} />
    </div>
  );
}

function TeVerify({ d, set }) {
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 2 · Verification</div>
        <h1 className="step-h">Verify your experience</h1>
        <p className="step-sub">Add at least one — it's the single biggest boost to your profile strength and the opportunities you'll be offered.</p>
      </div>
      <FSection label="Add any one" />
      <VerifyRow icon={FI.link} title="LinkedIn profile"
        desc="We confirm your experience from your public profile." placeholder="linkedin.com/in/…"
        value={d.linkedin} onChange={(v) => set("linkedin", v)}
        verified={d.vWebsite} onVerify={() => set("vWebsite", true)} />
      <div style={{ marginTop: 11 }}>
        <Field label="Resume / CV" optional>
          <UploadField value={d.resume} onChange={(v) => set("resume", v)} hint="PDF or DOCX up to 10 MB" />
        </Field>
      </div>
      <FSection label="Optional links" />
      <div className="fgrid c2">
        <Field label="Portfolio website" optional><TextInput lead={FI.globe()} value={d.portfolio} onChange={(v) => set("portfolio", v)} placeholder="yoursite.com" /></Field>
        <Field label="GitHub profile" optional><TextInput lead={FI.cpu()} value={d.github} onChange={(v) => set("github", v)} placeholder="github.com/you" /></Field>
      </div>
      {!(d.vWebsite || d.resume) && <div className="optnote">{FI.info()}<span>Add your LinkedIn or a resume to continue — this is how companies trust your test results.</span></div>}
    </div>
  );
}

function TeExperience({ d, set }) {
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 3 · Testing experience</div>
        <h1 className="step-h">What have you tested?</h1>
        <p className="step-sub">Pick everything you've worked on. We use this to route you only to tests you'll do well.</p>
      </div>
      <FSection label="Products you've tested" count={(d.tested || []).length ? `${(d.tested || []).length} selected` : null} />
      <SelCards options={TESTED_PRODUCTS} value={d.tested || []} onChange={(v) => set("tested", v)} multi cols={3} icons />
      <FSection label="Testing areas" />
      <Chips options={TESTING_AREAS} value={d.testAreas} onChange={(v) => set("testAreas", v)} />
      <FSection label="Years of experience" />
      <Chips options={TESTER_EXP} value={d.testerExp} onChange={(v) => set("testerExp", v)} multi={false} />
    </div>
  );
}

function TeProfessional({ d, set }) {
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 4 · Professional</div>
        <h1 className="step-h">Your professional background</h1>
        <p className="step-sub">Helps us match you with tests in domains you know.</p>
      </div>
      <div className="fgrid c2">
        <Field label="Current job title"><TextInput lead={FI.briefcase()} value={d.jobTitle} onChange={(v) => set("jobTitle", v)} placeholder="Senior QA Engineer" /></Field>
        <Field label="Current company" optional><TextInput lead={FI.building()} value={d.company} onChange={(v) => set("company", v)} placeholder="Acme Corp" /></Field>
        <Field label="Industry"><SelectInput value={d.industry} onChange={(v) => set("industry", v)} options={INDUSTRIES} placeholder="Select industry" /></Field>
        <Field label="Highest qualification"><SelectInput value={d.qualification} onChange={(v) => set("qualification", v)} options={QUALIFICATIONS} placeholder="Select" /></Field>
      </div>
    </div>
  );
}

function TeDevices({ d, set }) {
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 5 · Devices</div>
        <h1 className="step-h">Which devices can you test on?</h1>
        <p className="step-sub">Some tests need specific devices or browsers. The more you have, the more you'll be matched to.</p>
      </div>
      <DevicePicker d={d} set={set} />
    </div>
  );
}

function TeInterests({ d, set }) {
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 6 · Interests</div>
        <h1 className="step-h">What are you into?</h1>
        <p className="step-sub">We'll prioritise tests in the areas you care about.</p>
      </div>
      <FSection label="Areas of interest" />
      <Chips options={TESTER_INTERESTS} value={d.interests} onChange={(v) => set("interests", v)} />
    </div>
  );
}

function TeRewards({ d, set, region }) {
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 7 · Rewards</div>
        <h1 className="step-h">How would you like to be rewarded?</h1>
        <p className="step-sub">Every completed test pays. Choose how you'd like to receive it.</p>
      </div>
      <RewardPicker d={d} set={set} region={region} role="tester" />
    </div>
  );
}

function teValid(key, d) {
  switch (key) {
    case "personal": return !!(d.fullName && d.fullName.trim().length > 1) && EMAIL_RE.test(d.email || "") && (d.mobile || "").replace(/\D/g, "").length >= 8 && !!d.dob;
    case "verify": return !!(d.vWebsite || d.resume);
    case "experience": return (d.tested || []).length >= 1 && (d.testAreas || []).length >= 1 && !!d.testerExp;
    case "professional": return !!(d.jobTitle && d.jobTitle.trim()) && !!d.industry;
    case "devices": return (d.devices || []).length >= 1;
    case "interests": return (d.interests || []).length >= 1;
    default: return true;
  }
}

function teStrength(d) {
  return [
    { label: "Personal details", done: !!(d.fullName && d.email && d.mobile && d.dob), w: 2 },
    { label: "Experience verified", done: !!(d.vWebsite || d.resume), w: 3 },
    { label: "Testing experience", done: (d.tested || []).length >= 1 && !!d.testerExp, w: 2 },
    { label: "Testing areas", done: (d.testAreas || []).length >= 1, w: 1 },
    { label: "Professional info", done: !!(d.jobTitle && d.industry), w: 2 },
    { label: "Devices added", done: (d.devices || []).length >= 1, w: 1 },
    { label: "Interests", done: (d.interests || []).length >= 1, w: 1 },
    { label: "Reward set", done: !!d.reward, w: 1 },
  ];
}

window.FO_ROLES_CONFIG = window.FO_ROLES_CONFIG || {};
window.FO_ROLES_CONFIG.tester = {
  kind: "supply", dashboard: "Validator Experience.html", noun: "test",
  steps: [
    { key: "personal",     label: "About you",    sub: "Who you are",      icon: FI.user },
    { key: "verify",       label: "Verification", sub: "Prove experience", icon: FI.shield },
    { key: "experience",   label: "Experience",   sub: "What you've tested",icon: FI.cpu },
    { key: "professional", label: "Professional", sub: "Your background",   icon: FI.briefcase },
    { key: "devices",      label: "Devices",      sub: "What you can test", icon: FI.mobile },
    { key: "interests",    label: "Interests",    sub: "What you're into",  icon: FI.heart },
    { key: "rewards",      label: "Rewards",      sub: "Get paid",          icon: FI.bolt },
  ],
  components: { personal: TeRsPersonal, verify: TeVerify, experience: TeExperience, professional: TeProfessional, devices: TeDevices, interests: TeInterests, rewards: TeRewards },
  validate: (key, d) => teValid(key, d),
  strength: teStrength,
  workspace: (d) => d.fullName ? d.fullName.split(" ")[0] + "'s profile" : "Your profile",
};


--- UUID: f2ca163f-27c5-4c73-bfc9-f85e1ea063bc | MIME: application/javascript ---

/* ValidationCrew — Company onboarding flow */

function CoPersonal({ d, set, region }) {
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 1 · About you</div>
        <h1 className="step-h">Let's start with you</h1>
        <p className="step-sub">This stays private to your workspace. We use it to set up your account and route results to the right person.</p>
      </div>
      <PersonalFields d={d} set={set} region={region}
        roleField={{ key: "designation", label: "Job title / designation", free: true, placeholder: "Head of Product" }} />
    </div>
  );
}

function CoCompany({ d, set }) {
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 2 · Company</div>
        <h1 className="step-h">About your company</h1>
        <p className="step-sub">This shapes the benchmarks we compare your results against and helps validators recognise who they're giving feedback to.</p>
      </div>
      <div className="fgrid c2">
        <Field label="Company name">
          <TextInput lead={FI.building()} value={d.companyName} onChange={(v) => set("companyName", v)} placeholder="Acme Foods" />
        </Field>
        <Field label="Website" optional>
          <TextInput lead={FI.globe()} value={d.website} onChange={(v) => set("website", v)} placeholder="acmefoods.com" />
        </Field>
        <Field label="Industry">
          <SelectInput value={d.industry} onChange={(v) => set("industry", v)} options={COMPANY_INDUSTRIES} placeholder="Select industry" />
        </Field>
        <Field label="Year founded" optional>
          <TextInput lead={FI.clock()} value={d.yearFounded} onChange={(v) => set("yearFounded", v.replace(/\D/g, "").slice(0, 4))} placeholder="2019" />
        </Field>
        <Field label="Headquarters" optional span>
          <TextInput lead={FI.pin()} value={d.hq} onChange={(v) => set("hq", v)} placeholder="City, Country" />
        </Field>
      </div>
      <FSection label="Company size" />
      <SelCards options={EMP_SIZES} value={d.size} onChange={(v) => set("size", v)} cols={3} />
    </div>
  );
}

function CoNeeds({ d, set }) {
  const look = d.looking || [];
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 3 · Your needs</div>
        <h1 className="step-h">What are you looking for?</h1>
        <p className="step-sub">Pick everything you might want feedback on, and tell us about the product or service it's for.</p>
      </div>
      <FSection label="What are you looking for?" count={look.length ? `${look.length} selected` : null} />
      <SelCards options={COMPANY_LOOKING} value={look} onChange={(v) => set("looking", v)} multi cols={3} icons />

      <FSection label="About your product or service" />
      <div className="fgrid c2">
        <Field label="Product / service name">
          <TextInput lead={FI.box()} value={d.productName} onChange={(v) => set("productName", v)} placeholder="Acme Protein Bars" />
        </Field>
        <Field label="Category" optional>
          <TextInput lead={FI.tag()} value={d.category} onChange={(v) => set("category", v)} placeholder="Snacks / Nutrition" />
        </Field>
        <Field label="Brief description" optional span>
          <Textarea value={d.description} onChange={(v) => set("description", v)} placeholder="A few words on what it is and who it's for…" />
        </Field>
        <Field label="Product URL" optional>
          <TextInput lead={FI.link()} value={d.productUrl} onChange={(v) => set("productUrl", v)} placeholder="acmefoods.com/bars" />
        </Field>
      </div>
      <FSection label="Current stage" />
      <SelCards options={PRODUCT_STAGES} value={d.stage} onChange={(v) => set("stage", v)} cols={3} />
    </div>
  );
}

function CoAudience({ d, set, region }) {
  const base = region === "india" ? 184000 : 246000;
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 4 · Audience</div>
        <h1 className="step-h">Who would you like to hear from?</h1>
        <p className="step-sub">Describe the people whose opinion matters. The sharper you are, the higher the signal — we match you to validators who fit, we don't blast everyone.</p>
      </div>
      <ReachMeter reach={foReach(d, region)} base={base} />
      <FSection label="Demographics" />
      <DemographicsRow d={d} set={set} />
      <FSection label="Location" />
      <LocationFields region={region} d={d} set={set} withCity />
      <FSection label="Profile" />
      <ProfileChips d={d} set={set} region={region} occOptions={OCC_SIMPLE}
        show={{ occupation: true, income: true, education: true, industry: true, languages: true, interests: true }} />
      <FSection label="Expected volume" />
      <Field label="How many responses do you typically need?">
        <Chips options={VOLUME_COMPANY} value={d.volume} onChange={(v) => set("volume", v)} multi={false} />
      </Field>
    </div>
  );
}

function CoVerify({ d, set, region }) {
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 4 · Verification</div>
        <h1 className="step-h">Build trust with validators</h1>
        <p className="step-sub">Verified companies get better reviewers and faster matches. Verify what you can now — finish the rest anytime from your dashboard.</p>
      </div>
      <VerifyRow icon={FI.globe} title="Company website"
        desc="Confirms you own the domain via a meta tag or DNS record."
        placeholder={d.website || "acmefoods.com"} value={d.vWebsiteInput} onChange={(v) => set("vWebsiteInput", v)}
        verified={d.vWebsite} onVerify={() => set("vWebsite", true)} />
      <VerifyRow icon={FI.link} title="LinkedIn company page"
        desc="Links campaigns to a real, public organisation." placeholder="linkedin.com/company/…"
        value={d.vCompanyInput} onChange={(v) => set("vCompanyInput", v)}
        verified={d.vCompanyPage} onVerify={() => set("vCompanyPage", true)} />
      {region === "india" ? (
        <>
          <VerifyRow icon={FI.doc} title="GST number" optional desc="Adds a business-registry badge."
            placeholder="22AAAAA0000A1Z5" value={d.gst} onChange={(v) => set("gst", v)}
            verified={d.vRegistry} onVerify={() => set("vRegistry", true)} />
          <VerifyRow icon={FI.doc} title="CIN number" optional desc="Corporate Identification Number."
            placeholder="U15490KA2019PTC000000" value={d.cin} onChange={(v) => set("cin", v)}
            verified={false} onVerify={() => set("vRegistry", true)} />
        </>
      ) : (
        <VerifyRow icon={FI.doc} title="Business / Tax ID" optional desc="EIN, VAT or company number — adds a registry badge."
          placeholder="e.g. 12-3456789" value={d.taxId} onChange={(v) => set("taxId", v)}
          verified={d.vRegistry} onVerify={() => set("vRegistry", true)} />
      )}
      <div className="optnote">{FI.lock()}<span>Verification is optional to finish, but unverified accounts can only run limited campaigns. Documents are checked by our trust team and never shared with validators.</span></div>
    </div>
  );
}

function coValid(key, d, region) {
  switch (key) {
    case "personal": return !!(d.fullName && d.fullName.trim().length > 1) && EMAIL_RE.test(d.email || "") && (d.mobile || "").replace(/\D/g, "").length >= 8 && !!d.designation;
    case "company": return !!(d.companyName && d.companyName.trim()) && !!d.industry && !!d.size;
    case "needs": return (d.looking || []).length >= 1 && !!(d.productName && d.productName.trim());
    default: return true;
  }
}

window.FO_ROLES_CONFIG = window.FO_ROLES_CONFIG || {};
window.FO_ROLES_CONFIG.company = {
  steps: [
    { key: "personal", label: "About you",   sub: "Who's setting up",  icon: FI.user },
    { key: "company",  label: "Company",      sub: "Your business",     icon: FI.building },
    { key: "needs",    label: "Your needs",   sub: "What to learn",     icon: FI.layers },
    { key: "verify",   label: "Verification", sub: "Build trust",       icon: FI.shield },
    { key: "final",    label: "Preferences",  sub: "How you'll use it", icon: FI.bolt },
  ],
  components: { personal: CoPersonal, company: CoCompany, needs: CoNeeds, verify: CoVerify, final: StepFinal },
  validate: coValid,
  workspace: (d) => d.companyName || "Your workspace",
  noun: "campaign",
  summary: (d, region) => [
    { icon: FI.building, label: "Company", value: d.companyName || "—" },
    { icon: FI.layers, label: "Looking for", value: foLabelList(COMPANY_LOOKING, d.looking) },
    { icon: FI.users, label: "Matched audience", value: foReach(d, region).toLocaleString("en-US") + " people" },
    { icon: FI.pin, label: "Region", value: region === "india" ? "India" : (d.country || "Global") },
  ],
};

function foLabelList(opts, sel) {
  const arr = sel || [];
  if (!arr.length) return "—";
  const names = opts.filter((o) => arr.includes(o.v)).map((o) => o.t);
  return names.slice(0, 2).join(", ") + (names.length > 2 ? ` +${names.length - 2}` : "");
}
window.foLabelList = foLabelList;


--- UUID: 39f1ea20-0f3a-4f35-8f5c-e0c0134acca0 | MIME: application/javascript ---

/* ValidationCrew — Organization onboarding flow */

function OrgRep({ d, set, region }) {
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 1 · Representative</div>
        <h1 className="step-h">Who's representing the organization?</h1>
        <p className="step-sub">This stays private. We use it to set up your account and contact the right person about your initiatives.</p>
      </div>
      <PersonalFields d={d} set={set} region={region}
        roleField={{ key: "designation", label: "Your designation", free: true, placeholder: "Programme Director" }} />
    </div>
  );
}

function OrgInfo({ d, set }) {
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 2 · Organization</div>
        <h1 className="step-h">About your organization</h1>
        <p className="step-sub">This helps participants recognise who they're contributing to, and lets us tailor your workspace.</p>
      </div>
      <div className="fgrid c2">
        <Field label="Organization name" span>
          <TextInput lead={FI.landmark()} value={d.orgName} onChange={(v) => set("orgName", v)} placeholder="Saksham Foundation" />
        </Field>
        <Field label="Website" optional>
          <TextInput lead={FI.globe()} value={d.website} onChange={(v) => set("website", v)} placeholder="saksham.org" />
        </Field>
        <Field label="Year established" optional>
          <TextInput lead={FI.clock()} value={d.yearFounded} onChange={(v) => set("yearFounded", v.replace(/\D/g, "").slice(0, 4))} placeholder="2012" />
        </Field>
        <Field label="Headquarters" optional span>
          <TextInput lead={FI.pin()} value={d.hq} onChange={(v) => set("hq", v)} placeholder="City, Country" />
        </Field>
      </div>
      <FSection label="Organization type" />
      <Chips options={ORG_TYPES} value={d.orgType} onChange={(v) => set("orgType", v)} multi={false} />
    </div>
  );
}

function OrgGoals({ d, set }) {
  const learn = d.learn || [];
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 3 · Goals</div>
        <h1 className="step-h">What would you like to learn?</h1>
        <p className="step-sub">Pick everything you'd like to understand, and tell us about the initiative behind it.</p>
      </div>
      <FSection label="What would you like to learn?" count={learn.length ? `${learn.length} selected` : null} />
      <SelCards options={ORG_LEARN} value={learn} onChange={(v) => set("learn", v)} multi cols={2} icons />
      <FSection label="Initiative details" />
      <div className="fgrid">
        <Field label="Initiative / program name">
          <TextInput lead={FI.spark()} value={d.initiativeName} onChange={(v) => set("initiativeName", v)} placeholder="Rural Digital Literacy Drive" />
        </Field>
        <Field label="Program description" optional>
          <Textarea value={d.programDesc} onChange={(v) => set("programDesc", v)} placeholder="A short description of the initiative and its goals…" />
        </Field>
      </div>
      <FSection label="Geographic area covered" />
      <SelCards options={GEO_AREA} value={d.geoArea} onChange={(v) => set("geoArea", v)} cols={3} />
    </div>
  );
}

function OrgAudience({ d, set, region }) {
  const base = region === "india" ? 184000 : 246000;
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 4 · Audience</div>
        <h1 className="step-h">Who would you like to hear from?</h1>
        <p className="step-sub">Define the community you want feedback from. We match you to people who fit — reaching the right voices, not just the loudest.</p>
      </div>
      <ReachMeter reach={foReach(d, region)} base={base} />
      <FSection label="Location" />
      <LocationFields region={region} d={d} set={set} withCity />
      <FSection label="Target audience" count={(d.targetGroups || []).length ? `${(d.targetGroups || []).length} selected` : null} />
      <Chips options={ORG_TARGET} value={d.targetGroups} onChange={(v) => set("targetGroups", v)} />
      <FSection label="Demographic filters" />
      <DemographicsRow d={d} set={set} />
      <ProfileChips d={d} set={set} region={region}
        show={{ income: true, education: true, languages: true }} />
      <FSection label="Scale requirements" />
      <Field label="How many participants are typically needed?">
        <Chips options={ORG_SCALE} value={d.scale} onChange={(v) => set("scale", v)} multi={false} />
      </Field>
    </div>
  );
}

function OrgVerify({ d, set }) {
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 4 · Verification</div>
        <h1 className="step-h">Build trust with participants</h1>
        <p className="step-sub">Verified organizations get higher participation and reach sensitive communities more easily.</p>
      </div>
      <VerifyRow icon={FI.globe} title="Website"
        desc="Confirms you own the domain via a meta tag or DNS record."
        placeholder={d.website || "saksham.org"} value={d.vWebsiteInput} onChange={(v) => set("vWebsiteInput", v)}
        verified={d.vWebsite} onVerify={() => set("vWebsite", true)} />
      <VerifyRow icon={FI.link} title="LinkedIn page"
        desc="Links initiatives to a real, public organisation." placeholder="linkedin.com/company/…"
        value={d.vCompanyInput} onChange={(v) => set("vCompanyInput", v)}
        verified={d.vCompanyPage} onVerify={() => set("vCompanyPage", true)} />
      <VerifyRow icon={FI.doc} title="Registration number"
        desc="NGO / society / trust registration — adds a registry badge."
        placeholder="e.g. 80G / 12A / Society reg." value={d.regNo} onChange={(v) => set("regNo", v)}
        verified={d.vRegistry} onVerify={() => set("vRegistry", true)} />
      <VerifyRow icon={FI.landmark} title="Government affiliation" optional
        desc="If applicable — department, scheme or ministry linkage."
        placeholder="e.g. Ministry of Rural Development" value={d.govAffiliation} onChange={(v) => set("govAffiliation", v)}
        verified={false} onVerify={() => set("vRegistry", true)} />
      <div className="optnote">{FI.lock()}<span>Documents are reviewed by our trust team and never shared with participants. Verified organizations can run large-scale and sensitive studies.</span></div>
    </div>
  );
}

function orgValid(key, d, region) {
  switch (key) {
    case "personal": return !!(d.fullName && d.fullName.trim().length > 1) && !!d.designation && EMAIL_RE.test(d.email || "") && (d.mobile || "").replace(/\D/g, "").length >= 8;
    case "organization": return !!(d.orgName && d.orgName.trim()) && !!d.orgType;
    case "goals": return (d.learn || []).length >= 1 && !!(d.initiativeName && d.initiativeName.trim());
    default: return true;
  }
}

window.FO_ROLES_CONFIG = window.FO_ROLES_CONFIG || {};
window.FO_ROLES_CONFIG.organization = {
  steps: [
    { key: "personal",     label: "Representative", sub: "Your details",      icon: FI.user },
    { key: "organization", label: "Organization",   sub: "About the org",     icon: FI.landmark },
    { key: "goals",        label: "Goals",          sub: "What to learn",     icon: FI.layers },
    { key: "verify",       label: "Verification",   sub: "Build trust",       icon: FI.shield },
    { key: "final",        label: "Preferences",    sub: "How you'll use it", icon: FI.bolt },
  ],
  components: { personal: OrgRep, organization: OrgInfo, goals: OrgGoals, verify: OrgVerify, final: StepFinal },
  validate: orgValid,
  workspace: (d) => d.orgName || "Your workspace",
  noun: "initiative",
  summary: (d, region) => [
    { icon: FI.landmark, label: "Organization", value: d.orgName || "—" },
    { icon: FI.layers, label: "Learning", value: foLabelList(ORG_LEARN, d.learn) },
    { icon: FI.users, label: "Matched audience", value: foReach(d, region).toLocaleString("en-US") + " people" },
    { icon: FI.pin, label: "Region", value: region === "india" ? "India" : (d.country || "Global") },
  ],
};


--- UUID: 379b8555-7659-4e63-9465-94ca472d65a1 | MIME: application/javascript ---

/* ValidationCrew — Validator onboarding flow */

function VaPersonal({ d, set, region }) {
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 1 · About you</div>
        <h1 className="step-h">Tell us about yourself</h1>
        <p className="step-sub">This stays private. We use it to match you with opportunities where your judgment is valuable.</p>
      </div>
      <SupplyPersonal d={d} set={set} region={region} />
    </div>
  );
}

function VaVerify({ d, set }) {
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 2 · Verification</div>
        <h1 className="step-h">Verify your expertise</h1>
        <p className="step-sub">Your credibility is the product. Verified experts are matched to higher-value, better-paid opportunities.</p>
      </div>
      <FSection label="Add any one" />
      <VerifyRow icon={FI.link} title="LinkedIn profile"
        desc="We confirm your role and experience from your public profile." placeholder="linkedin.com/in/…"
        value={d.linkedin} onChange={(v) => set("linkedin", v)}
        verified={d.vWebsite} onVerify={() => set("vWebsite", true)} />
      <div style={{ marginTop: 11 }}>
        <Field label="Resume / CV" optional>
          <UploadField value={d.resume} onChange={(v) => set("resume", v)} hint="PDF or DOCX up to 10 MB" />
        </Field>
      </div>
      <FSection label="Optional credentials" />
      <div className="fgrid c2">
        <Field label="Professional license" optional><TextInput lead={FI.doc()} value={d.license} onChange={(v) => set("license", v)} placeholder="License / registration no." /></Field>
        <Field label="Certification" optional><TextInput lead={FI.star()} value={d.certification} onChange={(v) => set("certification", v)} placeholder="e.g. PMP, CFA, MD" /></Field>
      </div>
      {!(d.vWebsite || d.resume) && <div className="optnote">{FI.info()}<span>Add your LinkedIn or a resume to continue — this is how companies trust your expert feedback.</span></div>}
    </div>
  );
}

function VaBackground({ d, set }) {
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 3 · Background</div>
        <h1 className="step-h">Your professional background</h1>
        <p className="step-sub">This places you in the right domain so you only see opportunities that fit your authority.</p>
      </div>
      <div className="fgrid c2">
        <Field label="Current role"><SelectInput value={d.valRole} onChange={(v) => set("valRole", v)} options={VALIDATOR_ROLES} placeholder="Select your role" /></Field>
        <Field label="Industry"><SelectInput value={d.industry} onChange={(v) => set("industry", v)} options={VAL_INDUSTRY} placeholder="Select industry" /></Field>
        <Field label="Current company" optional><TextInput lead={FI.building()} value={d.company} onChange={(v) => set("company", v)} placeholder="Acme Corp" /></Field>
      </div>
      <FSection label="Experience" />
      <Chips options={VAL_EXP} value={d.valExp} onChange={(v) => set("valExp", v)} multi={false} />
    </div>
  );
}

function VaExpertise({ d, set }) {
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 4 · Expertise</div>
        <h1 className="step-h">What can you speak to with authority?</h1>
        <p className="step-sub">Select the topics you can give meaningful, professional feedback on. This is the heart of your match quality.</p>
      </div>
      <FSection label="Expertise areas" count={(d.expertise || []).length ? `${(d.expertise || []).length} selected` : null} />
      <Chips options={EXPERTISE_AREAS} value={d.expertise} onChange={(v) => set("expertise", v)} />
    </div>
  );
}

function VaInterests({ d, set }) {
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 5 · Interests</div>
        <h1 className="step-h">What interests you?</h1>
        <p className="step-sub">We'll prioritise opportunities aligned with what you enjoy.</p>
      </div>
      <FSection label="Interests" />
      <Chips options={VAL_INTERESTS} value={d.interests} onChange={(v) => set("interests", v)} />
    </div>
  );
}

function VaParticipation({ d, set }) {
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 6 · Participation</div>
        <h1 className="step-h">How would you like to contribute?</h1>
        <p className="step-sub">Pick the formats you're open to. Different formats pay differently — experts opinions and interviews pay the most.</p>
      </div>
      <FSection label="Participation preferences" count={(d.participation || []).length ? `${(d.participation || []).length} selected` : null} />
      <SelCards options={VAL_PARTICIPATION} value={d.participation || []} onChange={(v) => set("participation", v)} multi cols={2} icons />
    </div>
  );
}

function VaRewards({ d, set, region }) {
  return (
    <div className="rise">
      <div className="step-head">
        <div className="eyebrow step-eyebrow">Step 7 · Rewards</div>
        <h1 className="step-h">How would you like to be rewarded?</h1>
        <p className="step-sub">Every contribution pays. Choose how you'd like to receive it — or donate it.</p>
      </div>
      <RewardPicker d={d} set={set} region={region} role="validator" />
    </div>
  );
}

function vaValid(key, d) {
  switch (key) {
    case "personal": return !!(d.fullName && d.fullName.trim().length > 1) && EMAIL_RE.test(d.email || "") && (d.mobile || "").replace(/\D/g, "").length >= 8 && !!d.dob;
    case "verify": return !!(d.vWebsite || d.resume);
    case "background": return !!d.valRole && !!d.industry && !!d.valExp;
    case "expertise": return (d.expertise || []).length >= 1;
    case "interests": return (d.interests || []).length >= 1;
    case "participation": return (d.participation || []).length >= 1;
    default: return true;
  }
}

function vaStrength(d) {
  return [
    { label: "Personal details", done: !!(d.fullName && d.email && d.mobile && d.dob), w: 2 },
    { label: "Expertise verified", done: !!(d.vWebsite || d.resume), w: 3 },
    { label: "Credentials added", done: !!(d.license || d.certification), w: 1 },
    { label: "Background", done: !!(d.valRole && d.industry && d.valExp), w: 2 },
    { label: "Expertise areas", done: (d.expertise || []).length >= 1, w: 2 },
    { label: "Interests", done: (d.interests || []).length >= 1, w: 1 },
    { label: "Participation", done: (d.participation || []).length >= 1, w: 1 },
    { label: "Reward set", done: !!d.reward, w: 1 },
  ];
}

window.FO_ROLES_CONFIG = window.FO_ROLES_CONFIG || {};
window.FO_ROLES_CONFIG.validator = {
  kind: "supply", dashboard: "Validator Experience.html", noun: "opportunity",
  steps: [
    { key: "personal",      label: "About you",     sub: "Who you are",       icon: FI.user },
    { key: "verify",        label: "Verification",  sub: "Prove expertise",   icon: FI.shield },
    { key: "background",    label: "Background",    sub: "Your profession",   icon: FI.briefcase },
    { key: "expertise",     label: "Expertise",     sub: "What you know",     icon: FI.star },
    { key: "interests",     label: "Interests",     sub: "What you enjoy",    icon: FI.heart },
    { key: "participation", label: "Participation", sub: "How you'll help",   icon: FI.users },
    { key: "rewards",       label: "Rewards",       sub: "Get paid",          icon: FI.bolt },
  ],
  components: { personal: VaPersonal, verify: VaVerify, background: VaBackground, expertise: VaExpertise, interests: VaInterests, participation: VaParticipation, rewards: VaRewards },
  validate: (key, d) => vaValid(key, d),
  strength: vaStrength,
  workspace: (d) => d.fullName ? d.fullName.split(" ")[0] + "'s profile" : "Your profile",
};


--- UUID: 10cc3e9f-89a9-42f8-bc2e-73bb78998adc | MIME: application/javascript ---

/* ValidationCrew — Founder onboarding · data + icons */

/* ---------- icons ---------- */
const FI = {
  spark:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>,
  user:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.2 3.1-5.5 7-5.5s7 2.3 7 5.5"/></svg>,
  building:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="3" width="11" height="18" rx="1.5"/><path d="M15 8h5v13H4M8 7h3M8 11h3M8 15h3"/></svg>,
  layers:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5M3 17l9 5 9-5" opacity=".55"/></svg>,
  target:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>,
  shield:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>,
  mail:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/></svg>,
  phone:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18h2"/></svg>,
  link:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 15 15 9M10.5 6.5l1.2-1.2a4 4 0 0 1 5.7 5.7l-1.2 1.2M13.5 17.5l-1.2 1.2a4 4 0 0 1-5.7-5.7l1.2-1.2"/></svg>,
  globe:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18"/></svg>,
  briefcase:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7M3 12h18"/></svg>,
  cap:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m2 8 10-4 10 4-10 4L2 8Z"/><path d="M6 10v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/></svg>,
  pin:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></svg>,
  arrow:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  back:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M19 12H5M11 6l-6 6 6 6"/></svg>,
  check:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m4 12 5 5L20 6"/></svg>,
  lock:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>,
  info:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>,
  users:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/><path d="M16 5.2A3 3 0 0 1 16 11M21 19c0-2.3-1.4-4-3.5-4.6"/></svg>,
  idea:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.3 1 2.5h6c0-1.2.3-1.8 1-2.5A6 6 0 0 0 12 3Z"/></svg>,
  box:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/></svg>,
  mobile:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/></svg>,
  monitor:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>,
  cloud:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17 9.5a3.5 3.5 0 0 1 .5 6.98"/><path d="M6.5 18h11" opacity=".5"/></svg>,
  cpu:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="6" y="6" width="12" height="12" rx="2.5"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2"/></svg>,
  package:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5v-7Z"/><path d="M3 8.5 12 13l9-4.5M7.5 6.2 16.5 11M12 13v7"/></svg>,
  tag:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 12V4h8l9 9-7 7-9-9Z"/><circle cx="7.5" cy="7.5" r="1.4" fill="currentColor"/></svg>,
  mega:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 10v4a1 1 0 0 0 1 1h2l7 4V5L7 9H5a1 1 0 0 0-1 1Z"/><path d="M18 8a5 5 0 0 1 0 8"/></svg>,
  heart:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 20s-7-4.4-7-9.5A3.8 3.8 0 0 1 12 7a3.8 3.8 0 0 1 7 3.5C19 15.6 12 20 12 20Z"/></svg>,
  doc:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v4h4M9 13h6M9 17h6"/></svg>,
  bolt:(p)=><svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/></svg>,
  star:(p)=><svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="m12 2 2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 18.8 6.1 21l1.2-6.6L2.5 9l6.6-.9L12 2Z"/></svg>,
  clock:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  rocket:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 15c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2 0-2.8a2 2 0 0 0-3 .8Z"/><path d="M9 13a14 14 0 0 1 7-9c2.4 0 4 1.6 4 4a14 14 0 0 1-9 7l-2-2Z"/><path d="M9 13 7 11M11 15l2-2"/><circle cx="15" cy="9" r="1.4"/></svg>,
  flask:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 3h6M10 3v6.5L4.5 18a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 9.5V3"/><path d="M7.5 14h9"/></svg>,
  landmark:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 21h18M4 10h16M12 3 4 7h16l-8-4ZM6 10v8M10 10v8M14 10v8M18 10v8"/></svg>,
};

/* ---------- step meta ---------- */
const FO_STEPS = [
  { key:"personal",   label:"Your details",        sub:"Who's setting this up",        icon:FI.user },
  { key:"company",    label:"Company",             sub:"Where you build",              icon:FI.building },
  { key:"validate",   label:"Validate",            sub:"Pick your surfaces",           icon:FI.layers },
  { key:"verify",     label:"Verification",        sub:"Build trust",                  icon:FI.shield },
];

/* ---------- option sets ---------- */
const DESIGNATIONS = ["Founder & CEO","Co-founder","Product Manager","Head of Product","Growth / Marketing","Design Lead","Engineering Lead","Operations","Other"];
const COMPANY_SIZES = [
  { v:"solo",  t:"Solo founder",   d:"Just me for now" },
  { v:"2-10",  t:"2–10",           d:"Early team" },
  { v:"11-50", t:"11–50",          d:"Scaling up" },
  { v:"51-200",t:"51–200",         d:"Established" },
  { v:"ent",   t:"Enterprise",     d:"200+ people" },
];
const COMPANY_STAGES = [
  { v:"idea",   t:"Idea",      d:"Still on paper" },
  { v:"proto",  t:"Prototype", d:"Rough build" },
  { v:"mvp",    t:"MVP",       d:"In market" },
  { v:"growth", t:"Growth",    d:"Scaling revenue" },
  { v:"ent",    t:"Enterprise",d:"Mature org" },
];
const INDUSTRIES = ["Technology / SaaS","Fintech","Healthcare","E-commerce / Retail","AI / ML","Consumer apps","Education","Media & Entertainment","Manufacturing","Real estate","Logistics","Gaming","Other"];

const VALIDATION_TYPES = [
  { v:"idea",     t:"Idea",              d:"Concept & positioning",     icon:FI.idea },
  { v:"product",  t:"Product",           d:"Features & experience",     icon:FI.box },
  { v:"app",      t:"Mobile app",        d:"iOS / Android flows",       icon:FI.mobile },
  { v:"web",      t:"Website",           d:"Landing & funnel",          icon:FI.monitor },
  { v:"saas",     t:"SaaS platform",     d:"Onboarding & retention",    icon:FI.cloud },
  { v:"ai",       t:"AI product",        d:"Output quality & trust",    icon:FI.cpu },
  { v:"physical", t:"Physical product",  d:"Form, fit & function",      icon:FI.package },
  { v:"packaging",t:"Packaging",         d:"Shelf appeal & clarity",    icon:FI.tag },
  { v:"pricing",  t:"Pricing",           d:"Willingness to pay",        icon:FI.tag },
  { v:"campaign", t:"Marketing campaign",d:"Message & creative",        icon:FI.mega },
  { v:"cx",       t:"Customer experience",d:"Support & journey",        icon:FI.heart },
];

/* ---------- audience option sets ---------- */
const AGE_BANDS = ["18–24","25–34","35–44","45–54","55+"];
const GENDERS = ["Any","Female","Male","Non-binary"];
const OCCUPATIONS = ["Students","Software engineers","Product managers","Designers","Founders","Marketers","Researchers","Healthcare pros","Educators","Finance pros","Homemakers","Retired"];
const EDUCATIONS = ["High school","Diploma","Undergraduate","Postgraduate","PhD / Doctorate"];
const INTERESTS = ["AI","Startups","Fitness","Healthcare","Education","Finance","Gaming","Parenting","Travel","Fashion","Food","Sustainability"];

const INCOME_BANDS = {
  india: ["< ₹3L","₹3–6L","₹6–12L","₹12–25L","₹25L–1Cr","₹1Cr+"],
  global:["< $25k","$25–50k","$50–100k","$100–200k","$200k+"],
};

/* ---------- geography ---------- */
const GEO_INDIA = {
  "Karnataka":["Bengaluru Urban","Mysuru","Mangaluru","Hubli–Dharwad"],
  "Maharashtra":["Mumbai","Pune","Nagpur","Nashik"],
  "Delhi (NCT)":["New Delhi","South Delhi","North Delhi","West Delhi"],
  "Tamil Nadu":["Chennai","Coimbatore","Madurai","Salem"],
  "Telangana":["Hyderabad","Rangareddy","Warangal","Karimnagar"],
  "Gujarat":["Ahmedabad","Surat","Vadodara","Rajkot"],
  "West Bengal":["Kolkata","Howrah","Siliguri","Durgapur"],
  "Uttar Pradesh":["Gautam Buddha Nagar (Noida)","Lucknow","Kanpur","Ghaziabad"],
  "Rajasthan":["Jaipur","Jodhpur","Udaipur","Kota"],
  "Kerala":["Ernakulam (Kochi)","Thiruvananthapuram","Kozhikode","Thrissur"],
};
const GEO_GLOBAL = {
  "United States":["California","New York","Texas","Washington","Massachusetts","Other"],
  "United Kingdom":["England","Scotland","Wales","Northern Ireland"],
  "Canada":["Ontario","British Columbia","Quebec","Alberta"],
  "Germany":["Bavaria","Berlin","North Rhine-Westphalia","Hamburg"],
  "France":["Île-de-France","Auvergne-Rhône-Alpes","Occitanie","Other"],
  "Netherlands":["North Holland","South Holland","Utrecht","Other"],
  "Singapore":["Central","East","North-East","West"],
  "Australia":["New South Wales","Victoria","Queensland","Western Australia"],
  "United Arab Emirates":["Dubai","Abu Dhabi","Sharjah","Other"],
  "Brazil":["São Paulo","Rio de Janeiro","Minas Gerais","Other"],
};

/* ---------- hidden score model (never shown as a number) ---------- */
/* Verification badge slots — the only thing surfaced is qualitative state. */
function foTrustBadges(d) {
  const emailOk = /\S+@\S+\.\S+/.test(d.email || "");
  const corporate = emailOk && !/gmail|yahoo|outlook|hotmail|proton|icloud/i.test((d.email||"").split("@")[1]||"");
  return [
    { key:"identity",  label:"Identity",         hint:"Email + mobile",        done: emailOk && (d.mobile||"").replace(/\D/g,"").length>=8 },
    { key:"corporate", label:"Work email",       hint:"Company domain",        done: corporate },
    { key:"linkedin",  label:"LinkedIn",          hint:"Verified profile",      done: !!d.linkedin && d.linkedin.length>4 },
    { key:"domain",    label:"Domain",            hint:"Website ownership",     done: !!d.vWebsite },
    { key:"page",      label:"Company page",      hint:"LinkedIn company",      done: !!d.vCompanyPage },
    { key:"registry",  label:"Business registry", hint:"GST / CIN / Tax ID",    done: !!d.vRegistry },
  ];
}
/* hidden composite — used only to pick a tier label, calculation never exposed */
const TRUST_TIERS = [
  { min:0, name:"Unverified", tone:"faint" },
  { min:2, name:"Basic",      tone:"muted" },
  { min:3, name:"Verified",   tone:"accent" },
  { min:5, name:"Trusted",    tone:"success" },
];
function foTrustTier(badges){
  const n = badges.filter(b=>b.done).length;
  let t = TRUST_TIERS[0];
  for (const tier of TRUST_TIERS) if (n >= tier.min) t = tier;
  return { ...t, count:n, total:badges.length };
}

/* ---------- live audience reach estimate (matching, not testing) ---------- */
function foReach(d, region){
  let pool = region === "india" ? 184000 : 246000;
  const f = (sel, strength) => { if (sel && sel.length) pool *= Math.max(0.12, 1 - strength*(1 - sel.length/ (sel._domain||8))); };
  // simple multiplicative narrowing
  const narrow = (arr, perPick, floor) => { if(arr&&arr.length){ pool *= Math.max(floor, Math.min(1, arr.length*perPick)); } };
  narrow(d.ageBands, 0.26, 0.18);
  if (d.genders && d.genders.length && !d.genders.includes("Any")) pool *= 0.55;
  if (d.country) pool *= 0.62;
  if (d.state) pool *= 0.4;
  if (d.district) pool *= 0.55;
  narrow(d.occupations, 0.2, 0.12);
  if (d.audIndustry) pool *= 0.5;
  narrow(d.educations, 0.34, 0.3);
  narrow(d.incomeBands, 0.3, 0.22);
  narrow(d.interests, 0.22, 0.16);
  narrow(d.languages, 0.34, 0.4);
  if ((d.filters && d.filters.length) || (d.targetGroups && d.targetGroups.length)) pool *= 0.62;
  return Math.max(120, Math.round(pool));
}

Object.assign(window, {
  FI, FO_STEPS, DESIGNATIONS, COMPANY_SIZES, COMPANY_STAGES, INDUSTRIES,
  VALIDATION_TYPES, AGE_BANDS, GENDERS, OCCUPATIONS, EDUCATIONS, INTERESTS,
  INCOME_BANDS, GEO_INDIA, GEO_GLOBAL, foTrustBadges, foTrustTier, foReach,
});


--- UUID: 702d5c17-7876-4148-a653-1e0c91ee88c7 | MIME: application/javascript ---

/* ValidationCrew — supply side · shared field blocks + strength UI */

/* ---- date of birth ---- */
function DOBField({ value, onChange }) {
  return (
    <input className="fin" type="date" max="2008-12-31" min="1940-01-01"
      value={value || ""} onChange={(e) => onChange(e.target.value)} style={{ colorScheme: "light" }} />
  );
}

/* ---- shared personal block for supply (name/email/mobile/dob + location) ---- */
function SupplyPersonal({ d, set, region, withGender }) {
  const emailOk = EMAIL_RE.test(d.email || "");
  return (
    <>
      <div className="fgrid c2">
        <Field label="Full name" span>
          <TextInput lead={FI.user()} value={d.fullName} onChange={(v) => set("fullName", v)} placeholder="Ananya Sharma" />
        </Field>
        <Field label="Email address" error={d.email && !emailOk ? "Enter a valid email address" : null}>
          <TextInput lead={FI.mail()} type="email" value={d.email} onChange={(v) => set("email", v)} placeholder="you@email.com" valid={emailOk} bad={d.email && !emailOk} />
        </Field>
        <Field label="Mobile number">
          <TextInput prefix={region === "india" ? "+91" : "+1"} value={d.mobile} onChange={(v) => set("mobile", v.replace(/[^\d\s-]/g, ""))} placeholder="98765 43210" />
        </Field>
        <Field label="Date of birth">
          <DOBField value={d.dob} onChange={(v) => set("dob", v)} />
        </Field>
        {withGender && (
          <Field label="Gender">
            <SelectInput value={d.gender} onChange={(v) => set("gender", v)} options={GENDERS_USER} placeholder="Select" />
          </Field>
        )}
      </div>
      <FSection label="Location" />
      <LocationFields region={region} d={d} set={set} withCity />
    </>
  );
}

/* ---- device picker (grouped) ---- */
function DevicePicker({ d, set }) {
  return (
    <div className="devgroups">
      {Object.entries(DEVICE_GROUPS).map(([group, items]) => (
        <div className="devgroup" key={group}>
          <div className="devgroup-h">{group}</div>
          <Chips options={items} value={d.devices} onChange={(v) => set("devices", v)} />
        </div>
      ))}
    </div>
  );
}

/* ---- reward picker + payout ---- */
function RewardPicker({ d, set, region, role }) {
  return (
    <>
      <FSection label="Preferred reward" />
      <Chips options={REWARD_OPTIONS[role]} value={d.reward} onChange={(v) => set("reward", v)} multi={false} />
      <FSection label={region === "india" ? "Payout details" : "Payout details"} />
      <Field label={region === "india" ? "UPI ID" : "PayPal / bank email"} optional hint="Where we'll send your rewards. You can add this later.">
        <TextInput lead={FI.bolt()} value={d.payout} onChange={(v) => set("payout", v)} placeholder={region === "india" ? "yourname@upi" : "you@paypal.com"} />
      </Field>
    </>
  );
}

/* ---- optional bonus banner (User physical attributes) ---- */
function BonusBanner({ children }) {
  return (
    <div className="bonus-banner">
      <span className="bb-ic">{FI.bolt()}</span>
      <div><b>Unlock better-paid matches</b><p>{children}</p></div>
      <span className="bb-tag">Optional</span>
    </div>
  );
}

/* ---- profile-strength ring ---- */
function StrengthRing({ score, size = 92 }) {
  return (
    <div className="strength-ring" style={{ "--p": score, width: size, height: size }}>
      <div className="sr-inner">
        <span className="sr-num">{score}</span>
        <span className="sr-of">/100</span>
      </div>
    </div>
  );
}

/* ---- rail card (replaces trust card for supply) ---- */
function StrengthCard({ score, tier, signals }) {
  return (
    <div className="trustcard strengthcard">
      <div className="strength-top">
        <StrengthRing score={score} size={70} />
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Profile strength</div>
          <b className={"strength-tier strength-" + tier.tone}>{tier.name}</b>
        </div>
      </div>
      <div className="tc-grid" style={{ marginTop: 12 }}>
        {signals.map((s) => (
          <div key={s.label} className={"tc-badge" + (s.done ? " on" : "")}>
            <span className="b-tick">{FI.check()}</span>
            <span className="b-l">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- top-bar pill for supply ---- */
function StrengthPill({ score, tier }) {
  return (
    <div className="trustpill" title={`Profile strength ${score}/100 · ${tier.name}`}>
      <span className="tp-ic">{FI.star()}</span>
      <div>
        <b>{tier.name}</b>
        <div className="tp-meter"><i style={{ width: score + "%" }} /></div>
      </div>
    </div>
  );
}

Object.assign(window, {
  DOBField, SupplyPersonal, DevicePicker, RewardPicker, BonusBanner, StrengthRing, StrengthCard, StrengthPill,
});


--- UUID: 6fd92f52-e290-4708-be16-5d9d9dd3b2db | MIME: application/javascript ---

/* ValidationCrew — onboarding · option sets for Company / Researcher / Organization
   + Common Final screen + sample validators for the matching wizard. */

/* ============ COMPANY ============ */
const COMPANY_INDUSTRIES = ["FMCG","SaaS","Healthcare","Education","Finance","Manufacturing","Retail","E-commerce","Real Estate","Automotive","Other"];
const EMP_SIZES = [
  { v:"1-10",     t:"1–10",      d:"Startup" },
  { v:"11-50",    t:"11–50",     d:"Small" },
  { v:"51-200",   t:"51–200",    d:"Mid-size" },
  { v:"201-1000", t:"201–1000",  d:"Large" },
  { v:"1000+",    t:"1000+",     d:"Enterprise" },
];
const COMPANY_LOOKING = [
  { v:"product-fb",  t:"Product feedback",        d:"Features & experience",   icon:FI.box },
  { v:"product-test",t:"Product testing",         d:"Hands-on trials",         icon:FI.cpu },
  { v:"customer-fb", t:"Customer feedback",        d:"From real buyers",        icon:FI.heart },
  { v:"packaging",   t:"Packaging evaluation",     d:"Shelf appeal & clarity",  icon:FI.package },
  { v:"brand",       t:"Brand perception",         d:"How you're seen",         icon:FI.spark },
  { v:"pricing",     t:"Pricing validation",       d:"Willingness to pay",      icon:FI.tag },
  { v:"ad",          t:"Advertising feedback",     d:"Message & creative",      icon:FI.mega },
  { v:"ux",          t:"UX evaluation",            d:"Usability & flow",        icon:FI.monitor },
  { v:"csat",        t:"Customer satisfaction",    d:"Loyalty studies",         icon:FI.star },
  { v:"market",      t:"Market research",          d:"Trends & demand",         icon:FI.target },
  { v:"focus",       t:"Focus groups",             d:"Moderated discussion",    icon:FI.users },
  { v:"interview",   t:"Interview participants",   d:"1:1 conversations",       icon:FI.mail },
  { v:"other-c",     t:"Other",                    d:"Something else",          icon:FI.idea },
];
const PRODUCT_STAGES = [
  { v:"concept",  t:"Concept",        d:"Still an idea" },
  { v:"prototype",t:"Prototype",      d:"Rough build" },
  { v:"pilot",    t:"Pilot",          d:"Limited release" },
  { v:"ready",    t:"Market ready",   d:"Ready to ship" },
  { v:"existing", t:"Existing",       d:"Already live" },
];
const VOLUME_COMPANY = ["10–50","50–100","100–500","500–1000","1000+"];

/* ============ RESEARCHER ============ */
const RES_DESIGNATIONS = ["Student","Research Scholar","PhD Scholar","Assistant Professor","Associate Professor","Professor","Research Associate","Independent Researcher"];
const QUALIFICATIONS = ["Bachelor's","Master's","PhD","Post Doctorate"];
const RESEARCH_AREAS = ["Entrepreneurship","Healthcare","Education","Technology","AI","Finance","Consumer Behaviour","Public Policy","Social Sciences","Psychology","Environment","Other"];
const SUPPORT_TYPES = [
  { v:"survey",     t:"Survey respondents",     d:"Structured questionnaires", icon:FI.doc },
  { v:"interview",  t:"Interview participants",  d:"In-depth 1:1s",            icon:FI.mail },
  { v:"focus",      t:"Focus group participants",d:"Moderated groups",         icon:FI.users },
  { v:"experiment", t:"Experimental participants",d:"Controlled studies",      icon:FI.cpu },
  { v:"eval",       t:"Product evaluation",      d:"Test & assess",            icon:FI.box },
  { v:"longitudinal",t:"Longitudinal study",     d:"Repeated over time",       icon:FI.clock },
  { v:"case",       t:"Case study participants", d:"Deep single cases",        icon:FI.flask },
];
const ETHICS_OPTIONS = [
  { v:"yes",     t:"Yes",        d:"Already approved" },
  { v:"process", t:"In process", d:"Under review" },
  { v:"no",      t:"No",         d:"Not required / yet" },
];
const RESEARCH_PROFILES = ["Google Scholar","ORCID","Scopus Author ID","ResearchGate","LinkedIn"];
const ADDITIONAL_FILTERS = ["Students","Entrepreneurs","Teachers","Healthcare professionals","Startup founders","Homemakers","Government employees","Any"];
const SAMPLE_SIZES = ["< 50","50–100","100–250","250–500","500–1000","1000+"];

/* ============ ORGANIZATION ============ */
const ORG_TYPES = ["NGO","Government Department","Foundation","Incubator","Accelerator","CSR Division","Community Organization","International Agency","Other"];
const ORG_LEARN = [
  { v:"community",  t:"Community feedback",   d:"From the people you serve", icon:FI.users },
  { v:"policy",     t:"Policy feedback",      d:"On rules & schemes",        icon:FI.doc },
  { v:"opinion",    t:"Public opinion",       d:"Sentiment at scale",        icon:FI.mega },
  { v:"awareness",  t:"Awareness assessment", d:"What people know",          icon:FI.idea },
  { v:"program",    t:"Program evaluation",   d:"Is it working?",            icon:FI.target },
  { v:"impact",     t:"Impact assessment",    d:"Outcomes & change",         icon:FI.spark },
  { v:"beneficiary",t:"Beneficiary feedback", d:"From recipients",           icon:FI.heart },
  { v:"citizen",    t:"Citizen feedback",     d:"Civic voices",              icon:FI.landmark },
  { v:"social",     t:"Social research",      d:"Studies & surveys",         icon:FI.flask },
  { v:"needs",      t:"Needs assessment",     d:"Gaps & priorities",         icon:FI.info },
];
const GEO_AREA = [
  { v:"local",   t:"Local",        d:"Neighbourhood / town" },
  { v:"district",t:"District",     d:"A district" },
  { v:"state",   t:"State",        d:"State-wide" },
  { v:"national",t:"National",     d:"Country-wide" },
  { v:"intl",    t:"International", d:"Multiple countries" },
];
const ORG_TARGET = ["Students","Youth","Women","Farmers","Entrepreneurs","Teachers","Government employees","Healthcare workers","General public"];
const ORG_SCALE = ["50–100","100–500","500–1000","1000–5000","5000+"];

/* ============ shared / final ============ */
const OCC_SIMPLE = ["Student","Working Professional","Entrepreneur","Homemaker","Retired","Any"];
const LANGUAGES = {
  india: ["Hindi","English","Tamil","Telugu","Kannada","Bengali","Marathi","Gujarati","Malayalam","Punjabi"],
  global:["English","Spanish","French","German","Mandarin","Arabic","Portuguese","Japanese"],
};
const FREQUENCY = [
  { v:"once",      t:"Just once",  d:"A single study" },
  { v:"monthly",   t:"Monthly",    d:"Regular pulse" },
  { v:"quarterly", t:"Quarterly",  d:"Every quarter" },
  { v:"frequent",  t:"Frequently", d:"Always-on" },
];
const PREFERRED_METHODS = [
  { v:"surveys",   t:"Online surveys",        d:"Quick & scalable",     icon:FI.doc },
  { v:"testing",   t:"Product testing",       d:"Hands-on trials",      icon:FI.cpu },
  { v:"interviews",t:"Interviews",            d:"Deep 1:1s",            icon:FI.mail },
  { v:"focus",     t:"Focus groups",          d:"Moderated groups",     icon:FI.users },
  { v:"samples",   t:"Sample distribution",   d:"Ship products out",    icon:FI.package },
  { v:"video",     t:"Video calls",           d:"Face to face",         icon:FI.monitor },
  { v:"community",  t:"Community discussions", d:"Ongoing threads",      icon:FI.mega },
];

/* ============ sample validators (matching wizard) ============ */
const AV_COLORS = ["#4f46e5","#0d9488","#c2710c","#c81e78","#2563eb","#7c3aed","#0f9d6b","#db2777"];
const SAMPLE_VALIDATORS = {
  india: [
    { id:1, name:"Aarav Mehta",   role:"Product Manager",     loc:"Bengaluru",  age:"25–34", tags:["SaaS","AI","Startups"] },
    { id:2, name:"Diya Nair",     role:"Product Designer",    loc:"Kochi",      age:"25–34", tags:["Design","Fashion","UX"] },
    { id:3, name:"Rohan Gupta",   role:"Software Engineer",   loc:"Pune",       age:"18–24", tags:["Technology","AI","Gaming"] },
    { id:4, name:"Sara Khan",     role:"Growth Marketer",     loc:"Mumbai",     age:"25–34", tags:["Marketing","Food","Travel"] },
    { id:5, name:"Vikram Reddy",  role:"Startup Founder",     loc:"Hyderabad",  age:"35–44", tags:["Startups","Finance","SaaS"] },
    { id:6, name:"Ananya Iyer",   role:"Postgrad Student",    loc:"Chennai",    age:"18–24", tags:["Education","AI","Fitness"] },
    { id:7, name:"Karthik Rao",   role:"Healthcare Pro",      loc:"Bengaluru",  age:"35–44", tags:["Healthcare","Fitness"] },
    { id:8, name:"Meera Joshi",   role:"Homemaker",           loc:"Jaipur",     age:"35–44", tags:["Food","Parenting","Fashion"] },
    { id:9, name:"Aditya Verma",  role:"Finance Analyst",     loc:"Gurugram",   age:"25–34", tags:["Finance","Startups"] },
    { id:10,name:"Priya Sharma",  role:"UX Researcher",       loc:"Bengaluru",  age:"25–34", tags:["Design","AI","Education"] },
  ],
  global: [
    { id:1, name:"Emma Carter",   role:"Product Manager",     loc:"San Francisco", age:"25–34", tags:["SaaS","AI","Startups"] },
    { id:2, name:"Liam O'Brien",  role:"Product Designer",    loc:"London",        age:"25–34", tags:["Design","UX","Gaming"] },
    { id:3, name:"Sofia Rossi",   role:"Software Engineer",   loc:"Berlin",        age:"18–24", tags:["Technology","AI","Sustainability"] },
    { id:4, name:"Noah Williams", role:"Growth Marketer",     loc:"New York",      age:"35–44", tags:["Marketing","Travel","Food"] },
    { id:5, name:"Olivia Chen",   role:"Startup Founder",     loc:"Singapore",     age:"35–44", tags:["Startups","Finance","SaaS"] },
    { id:6, name:"Mason Lee",     role:"Graduate Student",    loc:"Toronto",       age:"18–24", tags:["Education","Gaming","AI"] },
    { id:7, name:"Ava Patel",     role:"Healthcare Pro",      loc:"Sydney",        age:"25–34", tags:["Healthcare","Fitness"] },
    { id:8, name:"Lucas Müller",  role:"Researcher",          loc:"Amsterdam",     age:"45–54", tags:["Education","Technology"] },
    { id:9, name:"Isabella Gomez",role:"Finance Analyst",     loc:"Madrid",        age:"25–34", tags:["Finance","Startups"] },
    { id:10,name:"James Wright",  role:"UX Researcher",       loc:"Austin",        age:"25–34", tags:["Design","AI","Education"] },
  ],
};

function avInitials(name){ return name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase(); }

Object.assign(window, {
  COMPANY_INDUSTRIES, EMP_SIZES, COMPANY_LOOKING, PRODUCT_STAGES, VOLUME_COMPANY,
  RES_DESIGNATIONS, QUALIFICATIONS, RESEARCH_AREAS, SUPPORT_TYPES, ETHICS_OPTIONS,
  RESEARCH_PROFILES, ADDITIONAL_FILTERS, SAMPLE_SIZES,
  ORG_TYPES, ORG_LEARN, GEO_AREA, ORG_TARGET, ORG_SCALE,
  OCC_SIMPLE, LANGUAGES, FREQUENCY, PREFERRED_METHODS,
  AV_COLORS, SAMPLE_VALIDATORS, avInitials,
});
