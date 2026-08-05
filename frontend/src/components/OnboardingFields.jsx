import Icon from "./Icon";
import { PasswordInput } from "./ui";
import { useTranslation } from "../i18n/index.jsx";

export function Field({ label, optional, span, hint, children }) {
  return (
    <div className={`fld${span ? " fld-span" : ""}`}>
      <label>{label} {optional && <span className="faint">(optional)</span>}</label>
      {children}
      {hint && <p className="fhint">{hint}</p>}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, type = "text" }) {
  if (type === "password") {
    return <PasswordInput className="fin" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
  }
  return <input className="fin" type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}

export function Textarea({ value, onChange, placeholder }) {
  return <textarea className="fin" rows={3} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}

export function SelectInput({ value, onChange, options, placeholder }) {
  const { t } = useTranslation();
  return (
    <select className="fin" value={value || ""} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>{placeholder || t("onboardingFields.selectPlaceholder", null, "Select…")}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export function FSection({ label, count }) {
  return (
    <div className="row between" style={{ margin: "18px 0 10px" }}>
      <div className="eyebrow" style={{ fontSize: 12 }}>{label}</div>
      {count && <span className="faint" style={{ fontSize: 12 }}>{count}</span>}
    </div>
  );
}

// Single or multi-select pill chips, used for plain string option lists.
export function Chips({ options, value, onChange, multi = true }) {
  const sel = value || (multi ? [] : "");
  const isOn = (o) => (multi ? sel.includes(o) : sel === o);
  const toggle = (o) => {
    if (!multi) { onChange(sel === o ? "" : o); return; }
    onChange(sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o]);
  };
  return (
    <div className="row gap-2" style={{ flexWrap: "wrap" }}>
      {options.map((o) => (
        <button key={o} type="button" className={`chip${isOn(o) ? " on" : ""}`} onClick={() => toggle(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

// Card-style options with title + description, single or multi-select.
export function SelCards({ options, value, onChange, multi = false, cols = 2 }) {
  const sel = value || (multi ? [] : "");
  const isOn = (v) => (multi ? sel.includes(v) : sel === v);
  const toggle = (v) => {
    if (!multi) { onChange(v); return; }
    onChange(sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v]);
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }} className="selcard-grid">
      {options.map((o) => (
        <button key={o.v} type="button" className={`card selcard${isOn(o.v) ? " selcard-on" : ""}`}
          style={{ textAlign: "left", padding: 14, cursor: "pointer" }} onClick={() => toggle(o.v)}>
          <b style={{ fontSize: 13.5 }}>{o.t}</b>
          <p className="faint" style={{ fontSize: 12, margin: "3px 0 0" }}>{o.d}</p>
        </button>
      ))}
    </div>
  );
}

export function ReachMeter({ reach, base, firstLoad, updating }) {
  const { t } = useTranslation();
  const pct = firstLoad ? 0 : Math.max(4, Math.min(100, Math.round((reach / base) * 100)));
  return (
    <div className="card" style={{ padding: 16, marginBottom: 6 }}>
      <div className="row between" style={{ alignItems: "center" }}>
        <div className="row gap-2" style={{ alignItems: "center" }}>
          <Icon name="users" size={16} />
          {firstLoad ? (
            <div className="faint" style={{ fontSize: 13.5 }}>{t("onboardingFields.findingAudience", null, "Finding your audience…")}</div>
          ) : (
            <div>
              <div className="row gap-2" style={{ alignItems: "baseline" }}>
                <div style={{ fontWeight: 700, fontSize: 18, fontFamily: "var(--mono)", opacity: updating ? 0.5 : 1, transition: "opacity .15s" }}>
                  {reach.toLocaleString("en-US")}
                </div>
                {updating && <span className="faint" style={{ fontSize: 11 }}>{t("onboardingFields.updating", null, "Updating…")}</span>}
              </div>
              <div className="faint" style={{ fontSize: 11.5 }}>{t("onboardingFields.peopleMatchNow", null, "people match right now")}</div>
            </div>
          )}
        </div>
      </div>
      <div style={{ height: 6, borderRadius: 6, background: "var(--border)", marginTop: 10, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 6, transition: "width .25s" }} />
      </div>
    </div>
  );
}

export function LocationFields({ region, d, set, withCity }) {
  const { t } = useTranslation();
  return (
    <div className="fgrid c2">
      <Field label={t("onboardingFields.country", null, "Country")}>
        <TextInput value={d.country} onChange={(v) => set("country", v)} placeholder={region === "india" ? t("onboardingFields.countryIndia", null, "India") : t("onboardingFields.countryUS", null, "United States")} />
      </Field>
      <Field label={t("onboardingFields.stateRegion", null, "State / Region")} optional>
        <TextInput value={d.state} onChange={(v) => set("state", v)} placeholder={t("onboardingFields.stateRegionPlaceholder", null, "Karnataka")} />
      </Field>
      {withCity && (
        <Field label={t("onboardingFields.city", null, "City")} optional>
          <TextInput value={d.district} onChange={(v) => set("district", v)} placeholder={t("onboardingFields.cityPlaceholder", null, "Bengaluru")} />
        </Field>
      )}
    </div>
  );
}

export function DemographicsRow({ d, set, ageOptions, genderOptions }) {
  const { t } = useTranslation();
  return (
    <div className="fgrid c2">
      <Field label={t("onboardingFields.age", null, "Age")}>
        <Chips options={ageOptions || ["18–24", "25–34", "35–44", "45–54", "55+"]} value={d.ageBands} onChange={(v) => set("ageBands", v)} />
      </Field>
      <Field label={t("onboardingFields.gender", null, "Gender")}>
        <Chips options={genderOptions || [t("onboardingFields.any", null, "Any"), t("onboardingFields.genderFemale", null, "Female"), t("onboardingFields.genderMale", null, "Male"), t("onboardingFields.genderNonBinary", null, "Non-binary")]} value={d.genders} onChange={(v) => set("genders", v)} />
      </Field>
    </div>
  );
}

export function ProfileChips({ d, set, region, show = {}, occOptions, incomeOptions, interestOptions }) {
  const { t } = useTranslation();
  const notYetTrackedHint = t("onboardingFields.notYetTrackedHint", null, "Not yet tracked on validator profiles — doesn't affect the match count.");
  return (
    <div className="col gap-3">
      {show.occupation && (
        <Field label={t("onboardingFields.occupation", null, "Occupation")}>
          <Chips options={occOptions || [t("onboardingFields.occStudent", null, "Student"), t("onboardingFields.occWorkingProfessional", null, "Working Professional"), t("onboardingFields.occEntrepreneur", null, "Entrepreneur"), t("onboardingFields.occHomemaker", null, "Homemaker"), t("onboardingFields.occRetired", null, "Retired"), t("onboardingFields.any", null, "Any")]} value={d.occupations} onChange={(v) => set("occupations", v)} />
        </Field>
      )}
      {show.education && (
        <Field label={t("onboardingFields.education", null, "Education")} optional hint={notYetTrackedHint}>
          <Chips options={[t("onboardingFields.eduHighSchool", null, "High school"), t("onboardingFields.eduDiploma", null, "Diploma"), t("onboardingFields.eduUndergraduate", null, "Undergraduate"), t("onboardingFields.eduPostgraduate", null, "Postgraduate"), t("onboardingFields.eduPhd", null, "PhD / Doctorate")]} value={d.educations} onChange={(v) => set("educations", v)} />
        </Field>
      )}
      {show.income && (
        <Field label={t("onboardingFields.incomeBand", null, "Income band")} optional>
          <Chips options={incomeOptions || (region === "india" ? ["< ₹3L", "₹3–6L", "₹6–12L", "₹12–25L", "₹25L–1Cr", "₹1Cr+"] : ["< $25k", "$25–50k", "$50–100k", "$100–200k", "$200k+"])} value={d.incomeBands} onChange={(v) => set("incomeBands", v)} />
        </Field>
      )}
      {show.languages && (
        <Field label={t("onboardingFields.languages", null, "Languages")} optional hint={notYetTrackedHint}>
          <Chips options={region === "india" ? [t("onboardingFields.langHindi", null, "Hindi"), t("onboardingFields.langEnglish", null, "English"), t("onboardingFields.langTamil", null, "Tamil"), t("onboardingFields.langTelugu", null, "Telugu"), t("onboardingFields.langKannada", null, "Kannada"), t("onboardingFields.langBengali", null, "Bengali"), t("onboardingFields.langMarathi", null, "Marathi"), t("onboardingFields.langGujarati", null, "Gujarati"), t("onboardingFields.langMalayalam", null, "Malayalam"), t("onboardingFields.langPunjabi", null, "Punjabi")] : [t("onboardingFields.langEnglish", null, "English"), t("onboardingFields.langSpanish", null, "Spanish"), t("onboardingFields.langFrench", null, "French"), t("onboardingFields.langGerman", null, "German"), t("onboardingFields.langMandarin", null, "Mandarin"), t("onboardingFields.langArabic", null, "Arabic"), t("onboardingFields.langPortuguese", null, "Portuguese"), t("onboardingFields.langJapanese", null, "Japanese")]} value={d.languages} onChange={(v) => set("languages", v)} />
        </Field>
      )}
      {show.interests && (
        <Field label={t("onboardingFields.interests", null, "Interests")} optional>
          <Chips options={interestOptions || [t("onboardingFields.intAI", null, "AI"), t("onboardingFields.intStartups", null, "Startups"), t("onboardingFields.intFitness", null, "Fitness"), t("onboardingFields.intHealthcare", null, "Healthcare"), t("onboardingFields.intEducation", null, "Education"), t("onboardingFields.intFinance", null, "Finance"), t("onboardingFields.intGaming", null, "Gaming"), t("onboardingFields.intParenting", null, "Parenting"), t("onboardingFields.intTravel", null, "Travel"), t("onboardingFields.intFashion", null, "Fashion"), t("onboardingFields.intFood", null, "Food"), t("onboardingFields.intSustainability", null, "Sustainability")]} value={d.interests} onChange={(v) => set("interests", v)} />
        </Field>
      )}
    </div>
  );
}

// "Verify" steps store a claim for manual review — there is no automated
// DNS/domain-ownership or document verification pipeline today, so this
// records intent rather than pretending to confirm it instantly.
export function VerifyRow({ icon, title, desc, placeholder, value, onChange, verified, onVerify, optional }) {
  const { t } = useTranslation();
  return (
    <div className="card" style={{ padding: 14, marginBottom: 10, display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span className="intent-ic" style={{ background: "var(--accent-weak)", color: "var(--accent)", flex: "none" }}>
        <Icon name={icon} size={16} />
      </span>
      <div style={{ flex: 1 }}>
        <div className="row between" style={{ alignItems: "center" }}>
          <b style={{ fontSize: 13.5 }}>{title} {optional && <span className="faint" style={{ fontWeight: 400 }}>(optional)</span>}</b>
          {verified && <span className="pill" style={{ color: "var(--success)", fontSize: 11 }}><Icon name="check" size={12} /> {t("onboardingFields.submitted", null, "Submitted")}</span>}
        </div>
        <p className="faint" style={{ fontSize: 12, margin: "2px 0 8px" }}>{desc}</p>
        {!verified && (
          <div className="row gap-2">
            <input className="fin" style={{ flex: 1 }} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
            <button type="button" className="btn btn-ghost" style={{ fontSize: 12.5 }} disabled={!value} onClick={onVerify}>{t("onboardingFields.submit", null, "Submit")}</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function PersonalFields({ d, set, roleField }) {
  const { t } = useTranslation();
  return (
    <div className="fgrid c2">
      <Field label={t("onboardingFields.fullName", null, "Full name")}>
        <TextInput value={d.fullName} onChange={(v) => set("fullName", v)} placeholder={t("onboardingFields.fullNamePlaceholder", null, "Aarav Mehta")} />
      </Field>
      <Field label={t("onboardingFields.email", null, "Email")}>
        <TextInput type="email" value={d.email} onChange={(v) => set("email", v)} placeholder={t("onboardingFields.emailPlaceholder", null, "you@company.com")} />
      </Field>
      <Field label={t("onboardingFields.mobileNumber", null, "Mobile number")}>
        <TextInput value={d.mobile} onChange={(v) => set("mobile", v)} placeholder={t("onboardingFields.mobileNumberPlaceholder", null, "+91 98765 43210")} />
      </Field>
      <Field label={roleField ? roleField.label : t("onboardingFields.jobTitle", null, "Job title")}>
        {roleField?.free
          ? <TextInput value={d[roleField.key]} onChange={(v) => set(roleField.key, v)} placeholder={roleField.placeholder} />
          : <SelectInput value={d.designation} onChange={(v) => set("designation", v)} options={[t("onboardingFields.roleFounderCeo", null, "Founder & CEO"), t("onboardingFields.roleCofounder", null, "Co-founder"), t("onboardingFields.roleProductManager", null, "Product Manager"), t("onboardingFields.roleHeadOfProduct", null, "Head of Product"), t("onboardingFields.roleGrowthMarketing", null, "Growth / Marketing"), t("onboardingFields.roleDesignLead", null, "Design Lead"), t("onboardingFields.roleEngineeringLead", null, "Engineering Lead"), t("onboardingFields.roleOperations", null, "Operations"), t("onboardingFields.roleOther", null, "Other")]} placeholder={t("onboardingFields.selectRole", null, "Select role")} />}
      </Field>

    </div>
  );
}
