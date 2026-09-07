import { useState } from "react";
import Icon from "./Icon";
import { PasswordInput } from "./ui";
import { useTranslation } from "../i18n/index.jsx";
import { COUNTRIES } from "./auth/countries";
import { FilterGroup } from "../pages/CreateMissionWizard";
import { isValidMobile } from "../data/onboarding";

const COUNTRY_NAMES = COUNTRIES.map(([, , name]) => name);

export function Field({ label, optional, span, hint, invalid, children }) {
  return (
    <div className={`fld${span ? " fld-span" : ""}${invalid ? " fld-invalid" : ""}`}>
      <label>{label} {optional ? <span className="faint">(optional)</span> : <span className="req-star" aria-hidden="true"> *</span>}</label>
      {children}
      {hint && <p className="fhint">{hint}</p>}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, type = "text", disabled, maxLength }) {
  if (type === "password") {
    return <PasswordInput className="fin" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
  }
  return <input className="fin" type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} maxLength={maxLength} />;
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

export function FSection({ label, count, required }) {
  return (
    <div className="row between" style={{ margin: "18px 0 10px" }}>
      <div className="eyebrow" style={{ fontSize: 12 }}>{label}{required && <span className="req-star" aria-hidden="true"> *</span>}</div>
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

// Same `.reach`/`.r-*` classes and layout CreateMissionWizard's own
// StepAudience reach banner uses (see builder.css) -- previously a plain
// `.card` with its own bespoke markup, which is the "why doesn't this look
// like the mission-creation audience step" gap the tester flagged.
export function ReachMeter({ reach, base, firstLoad, updating }) {
  const { t } = useTranslation();
  const pct = firstLoad ? 0 : Math.max(4, Math.min(100, Math.round((reach / base) * 100)));
  return (
    <div className="reach" style={{ marginBottom: 16 }}>
      <div className="reach-top">
        <span className="r-ic"><Icon name="users" size={22} /></span>
        <div style={{ flex: 1, opacity: updating ? 0.5 : 1, transition: "opacity .2s" }}>
          <div className="r-num">{firstLoad ? "—" : reach.toLocaleString("en-US")}</div>
          <div className="r-lab">{firstLoad ? t("onboardingFields.findingAudience", null, "Finding your audience…") : t("onboardingFields.peopleMatchNow", null, "people match right now")}</div>
        </div>
        {updating ? (
          <span className="pill" style={{ background: "var(--panel)", color: "var(--text-muted)", border: "none" }}><Icon name="clock" size={13} /> {t("onboardingFields.updating", null, "Updating…")}</span>
        ) : (
          <span className="pill" style={{ background: "var(--success-weak)", color: "var(--success)", border: "none" }}><Icon name="bolt" size={13} /> {t("createMission.live", null, "Live")}</span>
        )}
      </div>
      <div className="r-bar"><i style={{ width: Math.max(4, pct) + "%" }} /></div>
      <div className="r-foot"><span>{t("createMission.narrowerHigherQuality", null, "Narrower = higher quality")}</span><span>{t("createMission.pctOfTotalPool", { pct }, `${pct}% of total pool`)}</span></div>
    </div>
  );
}

export function LocationFields({ d, set, withCity, showErrors }) {
  const { t } = useTranslation();
  // Older saved profiles still have `country` as a single string — coerce
  // to an array so this keeps working for builders who onboarded before
  // Country became multi-select.
  const rawCountry = d.country;
  const countries = Array.isArray(rawCountry) ? rawCountry : (rawCountry ? [rawCountry] : []);
  const countrySel = new Set(countries);
  return (
    <div className="fgrid c2">
      <div className={`fld${showErrors && countries.length === 0 ? " fld-invalid" : ""}`} style={{ gridColumn: "1 / -1" }}>
        <FilterGroup
          title={t("onboardingFields.country", null, "Country")}
          required
          options={COUNTRY_NAMES}
          sel={countrySel}
          toggle={(_, o) => set("country", countrySel.has(o) ? countries.filter(c => c !== o) : [...countries, o])}
          onSelectAll={(opts) => set("country", opts.every(o => countrySel.has(o)) ? [] : [...opts])}
          trFilterLabel={(t, v) => v}
        />
      </div>
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
  
  const [occInput, setOccInput] = useState("");
  const [intInput, setIntInput] = useState("");

  const defaultOccOptions = occOptions || [t("onboardingFields.occStudent", null, "Student"), t("onboardingFields.occWorkingProfessional", null, "Working Professional"), t("onboardingFields.occEntrepreneur", null, "Entrepreneur"), t("onboardingFields.occHomemaker", null, "Homemaker"), t("onboardingFields.occRetired", null, "Retired"), t("onboardingFields.any", null, "Any")];
  const customOccs = (d.occupations || []).filter(o => !defaultOccOptions.includes(o) && o !== "Other");
  const occupationOptions = defaultOccOptions;
  
  const isOtherOccupation = !!occOptions && (d.occupations || []).includes("Other");

  const saveOcc = () => {
    const val = occInput.trim();
    if (!val) return;
    set("occupations", [...(d.occupations || []).filter(o => o !== "Other"), val]);
    setOccInput("");
  };
  const cancelOcc = () => {
    set("occupations", (d.occupations || []).filter(o => o !== "Other"));
    setOccInput("");
  };
  const removeCustomOcc = (val) => set("occupations", (d.occupations || []).filter(o => o !== val));

  const defaultIntOptions = interestOptions || [t("onboardingFields.intAI", null, "AI"), t("onboardingFields.intStartups", null, "Startups"), t("onboardingFields.intFitness", null, "Fitness"), t("onboardingFields.intHealthcare", null, "Healthcare"), t("onboardingFields.intEducation", null, "Education"), t("onboardingFields.intFinance", null, "Finance"), t("onboardingFields.intGaming", null, "Gaming"), t("onboardingFields.intParenting", null, "Parenting"), t("onboardingFields.intTravel", null, "Travel"), t("onboardingFields.intFashion", null, "Fashion"), t("onboardingFields.intFood", null, "Food"), t("onboardingFields.intSustainability", null, "Sustainability")];
  const customInts = (d.interests || []).filter(o => !defaultIntOptions.includes(o) && o !== "Other");
  const intHasOther = defaultIntOptions.includes("Other");
  const finalIntOptions = defaultIntOptions;
  
  const isOtherInterest = intHasOther && (d.interests || []).includes("Other");

  const saveInt = () => {
    const val = intInput.trim();
    if (!val) return;
    set("interests", [...(d.interests || []).filter(o => o !== "Other"), val]);
    setIntInput("");
  };
  const cancelInt = () => {
    set("interests", (d.interests || []).filter(o => o !== "Other"));
    setIntInput("");
  };
  const removeCustomInt = (val) => set("interests", (d.interests || []).filter(o => o !== val));

  return (
    <div className="col gap-3">
      {show.occupation && (
        <Field label={t("onboardingFields.occupation", null, "Occupation")}>
          <Chips options={occupationOptions} value={d.occupations} onChange={(v) => set("occupations", v)} />
          {customOccs.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="eyebrow" style={{ fontSize: 11, marginBottom: 6 }}>{t("onboardingFields.other", null, "Other")}</div>
              <div className="row gap-2" style={{ flexWrap: "wrap" }}>
                {customOccs.map(o => (
                  <div key={o} className="chip on" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {o}
                    <button type="button" onClick={() => removeCustomOcc(o)} style={{ background: "none", border: "none", padding: 0, margin: 0, cursor: "pointer", color: "inherit", display: "flex" }}>
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Field>
      )}
      {show.occupation && isOtherOccupation && (
        <Field label={t("onboardingFields.occupationOtherLabel", null, "Please specify occupation")}>
          <div className="row gap-2">
            <TextInput value={occInput} onChange={setOccInput} placeholder={t("onboardingFields.occupationOtherPlaceholder", null, "e.g. Product Designer")} />
            <button type="button" className="btn" disabled={!occInput.trim()} onClick={saveOcc}>{t("actions.save", null, "Save")}</button>
            <button type="button" className="btn btn-ghost" onClick={cancelOcc}>{t("actions.cancel", null, "Cancel")}</button>
          </div>
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
          <Chips options={finalIntOptions} value={d.interests} onChange={(v) => set("interests", v)} />
          {customInts.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="eyebrow" style={{ fontSize: 11, marginBottom: 6 }}>{t("onboardingFields.other", null, "Other")}</div>
              <div className="row gap-2" style={{ flexWrap: "wrap" }}>
                {customInts.map(o => (
                  <div key={o} className="chip on" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {o}
                    <button type="button" onClick={() => removeCustomInt(o)} style={{ background: "none", border: "none", padding: 0, margin: 0, cursor: "pointer", color: "inherit", display: "flex" }}>
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Field>
      )}
      {show.interests && isOtherInterest && (
        <Field label={t("onboardingFields.interestOtherLabel", null, "Please specify interest")}>
          <div className="row gap-2">
            <TextInput value={intInput} onChange={setIntInput} placeholder={t("onboardingFields.interestOtherPlaceholder", null, "e.g. Photography")} />
            <button type="button" className="btn" disabled={!intInput.trim()} onClick={saveInt}>{t("actions.save", null, "Save")}</button>
            <button type="button" className="btn btn-ghost" onClick={cancelInt}>{t("actions.cancel", null, "Cancel")}</button>
          </div>
        </Field>
      )}
    </div>
  );
}

// "Verify" steps record a claim for manual review — there is no automated
// DNS/domain-ownership or document verification pipeline today. This used to
// hide the input behind a Submit button and a "Submitted" pill once clicked,
// which meant the value you'd just typed vanished from view with no way to
// see it again short of hitting Edit — same shape as every other field in
// the wizard now: a plain, always-visible, always-editable input with its
// error (if any) shown live underneath, no separate submit step.
export function VerifyRow({ icon, title, desc, placeholder, value, onChange, optional, showErrors, validate }) {
  const trimmed = (value || "").trim();
  const liveError = validate ? validate(value) : null;
  const missingRequired = showErrors && !optional && !trimmed;
  const invalid = missingRequired || (!!trimmed && !!liveError);

  return (
    <div className="card" style={{ padding: 14, marginBottom: 10, display: "flex", gap: 12, alignItems: "flex-start", border: invalid ? "1px solid var(--danger)" : undefined }}>
      <span className="intent-ic" style={{ background: "var(--accent-weak)", color: "var(--accent)", flex: "none" }}>
        <Icon name={icon} size={16} />
      </span>
      <div style={{ flex: 1 }}>
        <b style={{ fontSize: 13.5 }}>{title} {optional ? <span className="faint" style={{ fontWeight: 400 }}>(optional)</span> : <span className="req-star" aria-hidden="true"> *</span>}</b>
        <p className="faint" style={{ fontSize: 12, margin: "2px 0 8px" }}>{desc}</p>
        <input className={`fin ${invalid ? "fin-invalid" : ""}`} style={{ width: "100%" }} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        {trimmed && liveError && <div className="err" style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>{liveError}</div>}
      </div>
    </div>
  );
}

export function PersonalFields({ d, set, roleField, showErrors, emailLocked }) {
  const { t } = useTranslation();
  const otherLabel = t("onboardingFields.roleOther", null, "Other");
  const defaultOptions = [t("onboardingFields.roleFounderCeo", null, "Founder & CEO"), t("onboardingFields.roleCofounder", null, "Co-founder"), t("onboardingFields.roleProductManager", null, "Product Manager"), t("onboardingFields.roleHeadOfProduct", null, "Head of Product"), t("onboardingFields.roleGrowthMarketing", null, "Growth / Marketing"), t("onboardingFields.roleDesignLead", null, "Design Lead"), t("onboardingFields.roleEngineeringLead", null, "Engineering Lead"), t("onboardingFields.roleOperations", null, "Operations"), otherLabel];
  const roleOptions = roleField?.options ? [...roleField.options, otherLabel] : defaultOptions;
  const isOther = d.designation === otherLabel;
  return (
    <div className="fgrid c2">
      <Field label={t("onboardingFields.fullName", null, "Full name")} invalid={showErrors && !(d.fullName || "").trim()}>
        <TextInput value={d.fullName} onChange={(v) => set("fullName", v)} placeholder={t("onboardingFields.fullNamePlaceholder", null, "Aarav Mehta")} />
      </Field>
      <Field label={t("onboardingFields.email", null, "Email")} invalid={showErrors && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || "")}>
        <TextInput type="email" value={d.email} onChange={(v) => set("email", v)} placeholder={t("onboardingFields.emailPlaceholder", null, "you@company.com")} disabled={emailLocked} />
      </Field>
      <Field
        label={t("onboardingFields.mobileNumber", null, "Mobile number")}
        invalid={showErrors && !isValidMobile(d.mobile)}
        hint={t("onboardingFields.mobileNumberHint", null, "A 10-digit Indian mobile number, or add a country code (e.g. +1 555 123 4567) if you're outside India.")}
      >
        <TextInput value={d.mobile} onChange={(v) => set("mobile", v.replace(/[^\d+ ]/g, "").slice(0, 15))} maxLength={15} placeholder={t("onboardingFields.mobileNumberPlaceholder", null, "+91 98765 43210")} />
      </Field>
      <Field label={roleField?.label || t("onboardingFields.jobTitle", null, "Job title")} invalid={showErrors && !d.designation}>
        <SelectInput value={d.designation} onChange={(v) => set("designation", v)} options={roleOptions} placeholder={t("onboardingFields.selectRole", null, "Select role")} />
      </Field>
      {isOther && (
        <Field label={t("onboardingFields.customRole", null, "Your role")} span invalid={showErrors && !(d.designationOther || "").trim()}>
          <TextInput value={d.designationOther} onChange={(v) => set("designationOther", v)} placeholder={t("onboardingFields.customRolePlaceholder", null, "Type your role")} />
        </Field>
      )}
    </div>
  );
}
