import { useEffect, useRef, useState } from "react";
import {
  Field, TextInput, Textarea, SelectInput, FSection, Chips, SelCards,
  ReachMeter, LocationFields, DemographicsRow, ProfileChips, VerifyRow, PersonalFields,
} from "../components/OnboardingFields";
import {
  COMPANY_SIZES, COMPANY_STAGES, INDUSTRIES, VALIDATION_TYPES,
  COMPANY_INDUSTRIES, EMP_SIZES, COMPANY_LOOKING, PRODUCT_STAGES,
  RES_DESIGNATIONS, QUALIFICATIONS, RESEARCH_AREAS, SUPPORT_TYPES, ETHICS_OPTIONS,
  ADDITIONAL_FILTERS, SAMPLE_SIZES, ORG_TYPES, ORG_LEARN, GEO_AREA, ORG_TARGET, ORG_SCALE,
  FREQUENCY, PREFERRED_METHODS, foLabelList,
} from "./onboarding";
import { useMeta } from "../context/MetaContext";
import { api } from "../api/client";
import { useTranslation } from "../i18n/index.jsx";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Builds the same {Geography, Demographics, Professional, Interests} shape the real
// Audience Explorer uses, from whatever subset of onboarding fields the current persona
// step collects. Geography stays free-text (city/state/country as typed) — the backend
// does a real substring match against actual validator location data.
export function buildAudienceQuery(d) {
  return {
    Geography: [d.district, d.state, ...(Array.isArray(d.country) ? d.country : [d.country])].filter(Boolean),
    Demographics: [...(d.ageBands || []), ...(d.genders || []).filter(g => g !== "Any"), ...(d.incomeBands || [])],
    Professional: (d.occupations || []),
    Interests: (d.interests || []),
    "ValidationCrew Role": (d.validatorTypes || []),
  };
}

// Real, live match count against the actual validators table — replaces the old
// hardcoded-pool formula (foReach) that never touched real data. `base` is the true
// total (no filters) so the meter's fill percentage means something real too.
// `reach` deliberately keeps showing the last known number while a refetch is in
// flight (never drops to 0/blank mid-typing) — `loading` tells the caller a fetch
// is running so it can show a subtle "Updating…" cue instead of a jarring reset.
function useAudienceReach(d) {
  const [reach, setReach] = useState(null);
  const [base, setBase] = useState(null);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef(null);

  useEffect(() => {
    api.audienceMatchCount({}).then(r => { setBase(r.count); setReach(r.count); }).catch(() => { setBase(0); setReach(0); }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      api.audienceMatchCount(buildAudienceQuery(d)).then(r => setReach(r.count)).catch(() => {}).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify([d.ageBands, d.genders, d.incomeBands, d.occupations, d.interests, d.country, d.state, d.district, d.validatorTypes])]);

  return { reach: reach ?? 0, base: base ?? 1, firstLoad: reach === null, updating: loading && reach !== null };
}

function StepHead({ step, title, sub }) {
  return (
    <div className="rise" style={{ marginBottom: 18 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{step}</div>
      <h1 style={{ fontSize: 22, margin: "0 0 6px" }}>{title}</h1>
      <p className="muted" style={{ fontSize: 13.5, maxWidth: 560 }}>{sub}</p>
    </div>
  );
}

// shared final "preferences" step, used by all 4 personas
function StepFinal({ d, set }) {
  const { t } = useTranslation();
  return (
    <div className="rise">
      <StepHead step={t("onboarding.final.step", null, "Almost done · Preferences")} title={t("onboarding.final.title", null, "How will you use ValidationCrew?")}
        sub={t("onboarding.final.sub", null, "A couple of quick preferences so we can shape your workspace.")} />
      <FSection label={t("onboarding.final.frequencyLabel", null, "How often will you need feedback?")} />
      <SelCards options={FREQUENCY(t)} value={d.frequency} onChange={(v) => set("frequency", v)} cols={2} />
      <FSection label={t("onboarding.final.methodsLabel", null, "Preferred methods")} count={(d.methods || []).length ? t("onboarding.selectedCount", { count: d.methods.length }, `${d.methods.length} selected`) : null} />
      <SelCards options={PREFERRED_METHODS(t)} value={d.methods || []} onChange={(v) => set("methods", v)} multi cols={2} />
    </div>
  );
}

/* ============================= FOUNDER ============================= */
function FoPersonal({ d, set, showErrors }) {
  const { t } = useTranslation();
  return (
    <div className="rise">
      <StepHead step={t("onboarding.founder.personal.step", null, "Step 1 · Your details")} title={t("onboarding.founder.personal.title", null, "Let's start with you")}
        sub={t("onboarding.founder.personal.sub", null, "This stays private to your workspace. We use it to set up your account and route campaign results to the right person.")} />
      <PersonalFields d={d} set={set} roleField={null} showErrors={showErrors} emailLocked />
    </div>
  );
}
function FoCompany({ d, set, showErrors }) {
  const { t } = useTranslation();
  const industryOptions = INDUSTRIES(t);
  const isOtherIndustry = d.industry === industryOptions[industryOptions.length - 1];
  return (
    <div className="rise">
      <StepHead step={t("onboarding.founder.company.step", null, "Step 2 · Company")} title={t("onboarding.founder.company.title", null, "About your company")}
        sub={t("onboarding.founder.company.sub", null, "This shapes the benchmarks we compare your results against.")} />
      <div className="fgrid c2">
        <Field label={t("onboarding.founder.company.nameLabel", null, "Company / product name")}><TextInput value={d.companyName} onChange={(v) => set("companyName", v)} placeholder="Helix Labs" /></Field>
        <Field label={t("onboarding.founder.company.websiteLabel", null, "Website")} optional><TextInput value={d.website} onChange={(v) => set("website", v)} placeholder="helixlabs.com" /></Field>
        <Field label={t("onboarding.founder.company.industryLabel", null, "Industry")} span><SelectInput value={d.industry} onChange={(v) => set("industry", v)} options={industryOptions} placeholder={t("onboarding.founder.company.industryPlaceholder", null, "Select industry")} /></Field>
        {isOtherIndustry && (
          <Field label={t("onboarding.founder.company.industryOtherLabel", null, "Please specify industry")} span invalid={showErrors && !(d.industryOther || "").trim()}>
            <TextInput value={d.industryOther} onChange={(v) => set("industryOther", v)} placeholder={t("onboarding.founder.company.industryOtherPlaceholder", null, "e.g. Agritech")} />
          </Field>
        )}
      </div>
      <FSection label={t("onboarding.founder.company.sizeSection", null, "Company size")} required />
      <SelCards options={COMPANY_SIZES(t)} value={d.size} onChange={(v) => set("size", v)} cols={3} />
      <FSection label={t("onboarding.founder.company.stageSection", null, "Stage")} required />
      <SelCards options={COMPANY_STAGES(t)} value={d.stage} onChange={(v) => set("stage", v)} cols={3} />
    </div>
  );
}
function FoValidate({ d, set }) {
  const { t } = useTranslation();
  const sel = d.vTypes || [];
  return (
    <div className="rise">
      <StepHead step={t("onboarding.founder.validate.step", null, "Step 3 · What to validate")} title={t("onboarding.founder.validate.title", null, "What do you want to put in front of people?")}
        sub={t("onboarding.founder.validate.sub", null, "Pick everything you expect to validate — this tailors the reviewer pools we line up for you.")} />
      <FSection label={t("onboarding.founder.validate.surfacesSection", null, "Validation surfaces")} count={sel.length ? t("onboarding.selectedCount", { count: sel.length }, `${sel.length} selected`) : null} />
      <SelCards options={VALIDATION_TYPES(t)} value={sel} onChange={(v) => set("vTypes", v)} multi cols={2} />
    </div>
  );
}
function GenericAudience({ d, set, region, title, sub, showErrors }) {
  const { t } = useTranslation();
  const { filters } = useMeta();
  const { reach, base, firstLoad, updating } = useAudienceReach(d);
  const interestOptions = [...(filters.Interests?.Lifestyle || []), ...(filters.Interests?.Industry || []), ...(filters.Interests?.["Product Types"] || [])];
  return (
    <div className="rise">
      <StepHead step={t("onboarding.audienceStep", null, "Audience")} title={title} sub={sub} />
      <ReachMeter reach={reach} base={base} firstLoad={firstLoad} updating={updating} />
      <FSection label={t("onboarding.validatorTypeSection", null, "Validator Type")} />
      <Chips options={filters["ValidationCrew Role"] || []} value={d.validatorTypes} onChange={(v) => set("validatorTypes", v)} multi />
      <FSection label={t("onboarding.demographicsSection", null, "Demographics")} />
      <DemographicsRow d={d} set={set} ageOptions={filters.Demographics?.Age} genderOptions={filters.Demographics?.Gender} />
      <FSection label={t("onboarding.locationSection", null, "Location")} />
      <LocationFields region={region} d={d} set={set} withCity showErrors={showErrors} />
      <FSection label={t("onboarding.profileSection", null, "Profile")} />
      <ProfileChips d={d} set={set} region={region} occOptions={filters.Professional}
        incomeOptions={filters.Demographics?.["Income Bracket"]} interestOptions={interestOptions}
        show={{ occupation: true, education: true, income: true, languages: true, interests: true }} />
    </div>
  );
}
function FoAudience(props) {
  const { t } = useTranslation();
  return <GenericAudience {...props} title={t("onboarding.founder.audience.title", null, "Who should weigh in?")} sub={t("onboarding.founder.audience.sub", null, "Describe the people whose opinion actually matters — we match you to validators who fit, we don't blast everyone.")} />;
}
function GenericVerify({ d, set, region, websiteHint, docs }) {
  const { t } = useTranslation();
  return (
    <div className="rise">
      <StepHead step={t("onboarding.verify.step", null, "Verification")} title={t("onboarding.verify.title", null, "Build trust")} sub={t("onboarding.verify.sub", null, "Verified accounts get better reviewers and faster matches. Verify what you can now — finish the rest anytime from your dashboard.")} />
      <VerifyRow icon="browser" title={t("onboarding.verify.websiteTitle", null, "Website")} optional desc={t("onboarding.verify.websiteDesc", null, "Confirms you own the domain via a meta tag or DNS record.")}
        placeholder={websiteHint} value={d.vWebsiteInput} onChange={(v) => set("vWebsiteInput", v)} verified={d.vWebsite} onVerify={() => set("vWebsite", true)} onUnverify={() => set("vWebsite", false)} />
      <VerifyRow icon="link" title={t("onboarding.verify.linkedinTitle", null, "LinkedIn page")} optional desc={t("onboarding.verify.linkedinDescCampaigns", null, "Links your campaigns to a real, public organisation.")}
        placeholder="linkedin.com/company/…" value={d.vCompanyInput} onChange={(v) => set("vCompanyInput", v)} verified={d.vCompanyPage} onVerify={() => set("vCompanyPage", true)} onUnverify={() => set("vCompanyPage", false)} />
      {docs.map((doc) => (
        <VerifyRow key={doc.key} icon="fileText" title={doc.title} optional desc={doc.desc} placeholder={doc.placeholder}
          value={d[doc.key]} onChange={(v) => set(doc.key, v)} verified={d.vRegistry} onVerify={() => set("vRegistry", true)} onUnverify={() => set("vRegistry", false)} />
      ))}
      <p className="faint" style={{ fontSize: 12, marginTop: 4 }}>
        {t("onboarding.verify.optionalFooter", null, "Verification is optional to finish setup. Submitted details are reviewed by our trust team and never shared with validators.")}
      </p>
    </div>
  );
}
function FoVerify({ d, set, region }) {
  const { t } = useTranslation();
  return <GenericVerify d={d} set={set} region={region} websiteHint={d.website || "helixlabs.com"}
    docs={region === "india"
      ? [{ key: "gst", title: t("onboarding.verify.gstTitle", null, "GST registration"), desc: t("onboarding.verify.registryBadgeDesc", null, "Adds a business-registry badge."), placeholder: "22AAAAA0000A1Z5" }]
      : [{ key: "taxId", title: t("onboarding.verify.taxIdTitle", null, "Business / Tax ID"), desc: t("onboarding.verify.taxIdDesc", null, "EIN, VAT or company number."), placeholder: "e.g. 12-3456789" }]} />;
}
function foValid(key, d) {
  switch (key) {
    case "personal": return !!(d.fullName && d.fullName.trim().length > 1) && EMAIL_RE.test(d.email || "") && (d.mobile || "").replace(/\D/g, "").length >= 8 && !!d.designation;
    case "company": return !!(d.companyName && d.companyName.trim()) && !!d.industry && !!d.size && !!d.stage && (d.industry !== "Other" || !!(d.industryOther && d.industryOther.trim()));
    case "validate": return (d.vTypes || []).length >= 1;
    case "audience": return (d.ageBands || []).length >= 1;
    default: return true;
  }
}

/* ============================= COMPANY ============================= */
function CoPersonal({ d, set, showErrors }) {
  const { t } = useTranslation();
  return (
    <div className="rise">
      <StepHead step={t("onboarding.company.personal.step", null, "Step 1 · About you")} title={t("onboarding.company.personal.title", null, "Let's start with you")} sub={t("onboarding.company.personal.sub", null, "This stays private to your workspace.")} />
      <PersonalFields d={d} set={set} roleField={{ label: t("onboarding.company.personal.roleLabel", null, "Job title / designation") }} showErrors={showErrors} emailLocked />
    </div>
  );
}
function CoCompany({ d, set, showErrors }) {
  const { t } = useTranslation();
  const industryOptions = COMPANY_INDUSTRIES(t);
  const isOtherIndustry = d.industry === industryOptions[industryOptions.length - 1];
  return (
    <div className="rise">
      <StepHead step={t("onboarding.company.company.step", null, "Step 2 · Company")} title={t("onboarding.company.company.title", null, "About your company")} sub={t("onboarding.company.company.sub", null, "This helps validators recognise who they're giving feedback to.")} />
      <div className="fgrid c2">
        <Field label={t("onboarding.company.company.nameLabel", null, "Company name")}><TextInput value={d.companyName} onChange={(v) => set("companyName", v)} placeholder="Acme Foods" /></Field>
        <Field label={t("onboarding.company.company.websiteLabel", null, "Website")} optional><TextInput value={d.website} onChange={(v) => set("website", v)} placeholder="acmefoods.com" /></Field>
        <Field label={t("onboarding.company.company.industryLabel", null, "Industry")}><SelectInput value={d.industry} onChange={(v) => set("industry", v)} options={industryOptions} placeholder={t("onboarding.founder.company.industryPlaceholder", null, "Select industry")} /></Field>
        <Field label={t("onboarding.company.company.yearFoundedLabel", null, "Year founded")} optional><TextInput value={d.yearFounded} onChange={(v) => set("yearFounded", v.replace(/\D/g, "").slice(0, 4))} placeholder="2019" /></Field>
        <Field label={t("onboarding.company.company.hqLabel", null, "Headquarters")} optional span><TextInput value={d.hq} onChange={(v) => set("hq", v)} placeholder="City, Country" /></Field>
        {isOtherIndustry && (
          <Field label={t("onboarding.founder.company.industryOtherLabel", null, "Please specify industry")} span invalid={showErrors && !(d.industryOther || "").trim()}>
            <TextInput value={d.industryOther} onChange={(v) => set("industryOther", v)} placeholder={t("onboarding.founder.company.industryOtherPlaceholder", null, "e.g. Agritech")} />
          </Field>
        )}
      </div>
      <FSection label={t("onboarding.founder.company.sizeSection", null, "Company size")} required />
      <SelCards options={EMP_SIZES(t)} value={d.size} onChange={(v) => set("size", v)} cols={3} />
    </div>
  );
}
function CoNeeds({ d, set, showErrors }) {
  const { t } = useTranslation();
  const look = d.looking || [];
  const isOtherLooking = look.includes("other-c");
  return (
    <div className="rise">
      <StepHead step={t("onboarding.company.needs.step", null, "Step 3 · Your needs")} title={t("onboarding.company.needs.title", null, "What are you looking for?")} sub={t("onboarding.company.needs.sub", null, "Pick everything you might want feedback on.")} />
      <FSection label={t("onboarding.company.needs.title", null, "What are you looking for?")} count={look.length ? t("onboarding.selectedCount", { count: look.length }, `${look.length} selected`) : null} required />
      <SelCards options={COMPANY_LOOKING(t)} value={look} onChange={(v) => set("looking", v)} multi cols={2} />
      {isOtherLooking && (
        <div style={{ marginTop: 14, maxWidth: 360 }}>
          <Field label={t("onboarding.company.needs.otherLabel", null, "Please specify")} invalid={showErrors && !(d.lookingOther || "").trim()}>
            <TextInput value={d.lookingOther} onChange={(v) => set("lookingOther", v)} placeholder={t("onboarding.company.needs.otherPlaceholder", null, "e.g. Accessibility audit")} />
          </Field>
        </div>
      )}
      <FSection label={t("onboarding.company.needs.aboutProductSection", null, "About your product or service")} />
      <div className="fgrid c2">
        <Field label={t("onboarding.company.needs.productNameLabel", null, "Product / service name")}><TextInput value={d.productName} onChange={(v) => set("productName", v)} placeholder="Acme Protein Bars" /></Field>
        <Field label={t("onboarding.company.needs.categoryLabel", null, "Category")} optional><TextInput value={d.category} onChange={(v) => set("category", v)} placeholder="Snacks / Nutrition" /></Field>
        <Field label={t("onboarding.company.needs.descLabel", null, "Brief description")} optional span><Textarea value={d.description} onChange={(v) => set("description", v)} placeholder="A few words on what it is and who it's for…" /></Field>
      </div>
      <FSection label={t("onboarding.company.needs.stageSection", null, "Current stage")} />
      <SelCards options={PRODUCT_STAGES(t)} value={d.stage} onChange={(v) => set("stage", v)} cols={3} />
    </div>
  );
}
function CoAudience(props) {
  const { t } = useTranslation();
  return <GenericAudience {...props} title={t("onboarding.company.audience.title", null, "Who would you like to hear from?")} sub={t("onboarding.company.audience.sub", null, "The sharper you are, the higher the signal — we match you to validators who fit.")} />;
}
function CoVerify({ d, set, region }) {
  const { t } = useTranslation();
  return <GenericVerify d={d} set={set} region={region} websiteHint={d.website || "acmefoods.com"}
    docs={region === "india"
      ? [{ key: "gst", title: t("onboarding.verify.gstNumberTitle", null, "GST number"), desc: t("onboarding.verify.registryBadgeDesc", null, "Adds a business-registry badge."), placeholder: "22AAAAA0000A1Z5" }]
      : [{ key: "taxId", title: t("onboarding.verify.taxIdTitle", null, "Business / Tax ID"), desc: t("onboarding.verify.taxIdDesc", null, "EIN, VAT or company number."), placeholder: "e.g. 12-3456789" }]} />;
}
function coValid(key, d) {
  switch (key) {
    case "personal": return !!(d.fullName && d.fullName.trim().length > 1) && EMAIL_RE.test(d.email || "") && (d.mobile || "").replace(/\D/g, "").length >= 8 && !!d.designation;
    case "company": return !!(d.companyName && d.companyName.trim()) && !!d.industry && !!d.size && (d.industry !== "Other" || !!(d.industryOther && d.industryOther.trim()));
    case "needs": return (d.looking || []).length >= 1 && !!(d.productName && d.productName.trim()) && (!(d.looking || []).includes("other-c") || !!(d.lookingOther && d.lookingOther.trim()));
    case "audience": return (d.ageBands || []).length >= 1;
    default: return true;
  }
}

/* ============================= RESEARCHER ============================= */
function ResPersonal({ d, set, showErrors }) {
  const { t } = useTranslation();
  return (
    <div className="rise">
      <StepHead step={t("onboarding.researcher.personal.step", null, "Step 1 · About you")} title={t("onboarding.company.personal.title", null, "Let's start with you")} sub={t("onboarding.researcher.personal.sub", null, "This stays private. We use it to set up your researcher account.")} />
      <PersonalFields d={d} set={set} roleField={{ label: t("onboarding.researcher.personal.roleLabel", null, "Designation"), options: RES_DESIGNATIONS(t) }} showErrors={showErrors} emailLocked />
    </div>
  );
}
function ResAcademic({ d, set }) {
  const { t } = useTranslation();
  return (
    <div className="rise">
      <StepHead step={t("onboarding.researcher.academic.step", null, "Step 2 · Academic")} title={t("onboarding.researcher.academic.title", null, "Your academic background")} sub={t("onboarding.researcher.academic.sub", null, "This helps us verify you as a researcher.")} />
      <div className="fgrid c2">
        <Field label={t("onboarding.researcher.academic.institutionLabel", null, "University / institution")} span><TextInput value={d.institution} onChange={(v) => set("institution", v)} placeholder="Indian Institute of Science" /></Field>
        <Field label={t("onboarding.researcher.academic.departmentLabel", null, "Department")} optional><TextInput value={d.department} onChange={(v) => set("department", v)} placeholder="Management Studies" /></Field>
        <Field label={t("onboarding.researcher.personal.roleLabel", null, "Designation")}><SelectInput value={d.designation} onChange={(v) => set("designation", v)} options={RES_DESIGNATIONS(t)} placeholder={t("onboarding.researcher.academic.designationPlaceholder", null, "Select designation")} /></Field>
        <Field label={t("onboarding.researcher.academic.qualificationLabel", null, "Highest qualification")} span><Chips options={QUALIFICATIONS(t)} value={d.qualification} onChange={(v) => set("qualification", v)} multi={false} /></Field>
      </div>
    </div>
  );
}
function ResResearch({ d, set, showErrors }) {
  const { t } = useTranslation();
  const support = d.support || [];
  const areaOptions = RESEARCH_AREAS(t);
  const otherAreaLabel = areaOptions[areaOptions.length - 1];
  const isOtherArea = (d.areas || []).includes(otherAreaLabel);
  return (
    <div className="rise">
      <StepHead step={t("onboarding.researcher.research.step", null, "Step 3 · Research")} title={t("onboarding.researcher.research.title", null, "Tell us about your research")} sub={t("onboarding.researcher.research.sub", null, "Enough to match you with participants who genuinely fit it.")} />
      <div className="fgrid c2">
        <Field label={t("onboarding.researcher.research.titleLabel", null, "Research title")} span><TextInput value={d.researchTitle} onChange={(v) => set("researchTitle", v)} placeholder="Adoption of AI tools among early-stage founders" /></Field>
        <Field label={t("onboarding.researcher.research.objectivesLabel", null, "Research objective(s)")} optional span><Textarea value={d.objectives} onChange={(v) => set("objectives", v)} placeholder="What are you trying to find out?" /></Field>
        <Field label={t("onboarding.researcher.research.completionLabel", null, "Expected completion")} optional><TextInput value={d.completion} onChange={(v) => set("completion", v)} placeholder="e.g. Dec 2026" /></Field>
      </div>
      <FSection label={t("onboarding.researcher.research.areaSection", null, "Research area")} count={(d.areas || []).length ? t("onboarding.selectedCount", { count: d.areas.length }, `${d.areas.length} selected`) : null} required />
      <Chips options={areaOptions} value={d.areas} onChange={(v) => set("areas", v)} />
      {isOtherArea && (
        <div style={{ marginTop: 14, maxWidth: 360 }}>
          <Field label={t("onboarding.researcher.research.areaOtherLabel", null, "Please specify")} invalid={showErrors && !(d.areasOther || "").trim()}>
            <TextInput value={d.areasOther} onChange={(v) => set("areasOther", v)} placeholder={t("onboarding.researcher.research.areaOtherPlaceholder", null, "e.g. Urban planning")} />
          </Field>
        </div>
      )}
      <FSection label={t("onboarding.researcher.research.supportSection", null, "What kind of support do you need?")} count={support.length ? t("onboarding.selectedCount", { count: support.length }, `${support.length} selected`) : null} required />
      <SelCards options={SUPPORT_TYPES(t)} value={support} onChange={(v) => set("support", v)} multi cols={2} />
    </div>
  );
}
function ResParticipants({ d, set, region, showErrors }) {
  const { t } = useTranslation();
  const { filters } = useMeta();
  const { reach, base, firstLoad, updating } = useAudienceReach(d);
  return (
    <div className="rise">
      <StepHead step={t("onboarding.researcher.participants.step", null, "Step 4 · Participants")} title={t("onboarding.researcher.participants.title", null, "Who should take part?")} sub={t("onboarding.researcher.participants.sub", null, "Define your sample — we match you to participants who fit your criteria.")} />
      <ReachMeter reach={reach} base={base} firstLoad={firstLoad} updating={updating} />
      <FSection label={t("onboarding.researcher.participants.sampleSizeSection", null, "Sample size needed")} />
      <Field label={t("onboarding.researcher.participants.sampleSizeLabel", null, "How many participants?")}><Chips options={SAMPLE_SIZES} value={d.sampleSize} onChange={(v) => set("sampleSize", v)} multi={false} /></Field>
      <FSection label={t("onboarding.locationSection", null, "Location")} />
      <LocationFields region={region} d={d} set={set} showErrors={showErrors} />
      <FSection label={t("onboarding.demographicsSection", null, "Demographics")} required />
      <DemographicsRow d={d} set={set} ageOptions={filters.Demographics?.Age} genderOptions={filters.Demographics?.Gender} />
      <ProfileChips d={d} set={set} region={region} occOptions={filters.Professional} incomeOptions={filters.Demographics?.["Income Bracket"]} show={{ occupation: true, education: true, income: true }} />
      <FSection label={t("onboarding.researcher.participants.additionalFiltersSection", null, "Additional filters")} />
      <Chips options={ADDITIONAL_FILTERS(t)} value={d.filters} onChange={(v) => set("filters", v)} />
    </div>
  );
}
function ResEthics({ d, set, showErrors }) {
  const { t } = useTranslation();
  return (
    <div className="rise">
      <StepHead step={t("onboarding.researcher.ethics.step", null, "Step 5 · Ethics & verification")} title={t("onboarding.researcher.ethics.title", null, "Ethics & verification")} sub={t("onboarding.researcher.ethics.sub", null, "Approved, transparent studies get higher participation.")} />
      <FSection label={t("onboarding.researcher.ethics.approvalSection", null, "Does your study have institutional approval?")} required />
      <SelCards options={ETHICS_OPTIONS(t)} value={d.ethics} onChange={(v) => set("ethics", v)} cols={3} />
      {d.ethics === "yes" && (
        <div style={{ marginTop: 14 }}>
          <Field label={t("onboarding.researcher.ethics.refLabel", null, "Approval reference")} optional><TextInput value={d.ethicsRef} onChange={(v) => set("ethicsRef", v)} placeholder="IRB / ethics committee reference number" /></Field>
        </div>
      )}
      <FSection label={t("onboarding.researcher.ethics.verifySection", null, "Verify your identity")} />
      <VerifyRow icon="message" title={t("onboarding.researcher.ethics.uniEmailTitle", null, "University email")} showErrors={showErrors} desc={t("onboarding.researcher.ethics.uniEmailDesc", null, "Confirms your academic affiliation via a .edu / .ac domain.")}
        placeholder={d.email || "you@university.ac.in"} value={d.vWebsiteInput} onChange={(v) => set("vWebsiteInput", v)} verified={d.vWebsite} onVerify={() => set("vWebsite", true)} onUnverify={() => set("vWebsite", false)} />
      <VerifyRow icon="flask" title={t("onboarding.researcher.ethics.scholarlyTitle", null, "Scholarly profile")} optional desc={t("onboarding.researcher.ethics.scholarlyDesc", null, "Google Scholar, ORCID, Scopus, ResearchGate or LinkedIn.")}
        placeholder="Profile URL" value={d.researchProfile} onChange={(v) => set("researchProfile", v)} verified={d.vRegistry} onVerify={() => set("vRegistry", true)} onUnverify={() => set("vRegistry", false)} />
    </div>
  );
}
function resValid(key, d) {
  switch (key) {
    case "personal": return !!(d.fullName && d.fullName.trim().length > 1) && EMAIL_RE.test(d.email || "") && (d.mobile || "").replace(/\D/g, "").length >= 8;
    case "academic": return !!(d.institution && d.institution.trim()) && !!d.designation && !!d.qualification;
    case "research": return !!(d.researchTitle && d.researchTitle.trim()) && (d.areas || []).length >= 1 && (d.support || []).length >= 1 && (!(d.areas || []).includes("Other") || !!(d.areasOther && d.areasOther.trim()));
    case "participants": return !!d.sampleSize && (d.ageBands || []).length >= 1;
    case "ethics": return !!d.ethics;
    default: return true;
  }
}

/* ============================= ORGANIZATION ============================= */
function OrgRep({ d, set, showErrors }) {
  const { t } = useTranslation();
  return (
    <div className="rise">
      <StepHead step={t("onboarding.org.rep.step", null, "Step 1 · Representative")} title={t("onboarding.org.rep.title", null, "Who's representing the organization?")} sub={t("onboarding.org.rep.sub", null, "This stays private. We use it to set up your account.")} />
      <PersonalFields d={d} set={set} roleField={{ label: t("onboarding.org.rep.roleLabel", null, "Your designation") }} showErrors={showErrors} emailLocked />
    </div>
  );
}
function OrgInfo({ d, set, showErrors }) {
  const { t } = useTranslation();
  const isOtherType = d.orgType === t("onboarding.opts.orgTypes.8", null, "Other");
  return (
    <div className="rise">
      <StepHead step={t("onboarding.org.info.step", null, "Step 2 · Organization")} title={t("onboarding.org.info.title", null, "About your organization")} sub={t("onboarding.org.info.sub", null, "This helps participants recognise who they're contributing to.")} />
      <div className="fgrid c2">
        <Field label={t("onboarding.org.info.nameLabel", null, "Organization name")} span><TextInput value={d.orgName} onChange={(v) => set("orgName", v)} placeholder="Saksham Foundation" /></Field>
        <Field label={t("onboarding.founder.company.websiteLabel", null, "Website")} optional><TextInput value={d.website} onChange={(v) => set("website", v)} placeholder="saksham.org" /></Field>
        <Field label={t("onboarding.org.info.yearLabel", null, "Year established")} optional><TextInput value={d.yearFounded} onChange={(v) => set("yearFounded", v.replace(/\D/g, "").slice(0, 4))} placeholder="2012" /></Field>
        <Field label={t("onboarding.company.company.hqLabel", null, "Headquarters")} optional span><TextInput value={d.hq} onChange={(v) => set("hq", v)} placeholder="City, Country" /></Field>
      </div>
      <FSection label={t("onboarding.org.info.typeSection", null, "Organization type")} required />
      <Chips options={ORG_TYPES(t)} value={d.orgType} onChange={(v) => set("orgType", v)} multi={false} />
      {isOtherType && (
        <div style={{ marginTop: 14, maxWidth: 360 }}>
          <Field label={t("onboarding.org.info.specifyLabel", null, "Please specify")} invalid={showErrors && !(d.orgTypeOther || "").trim()}>
            <TextInput value={d.orgTypeOther} onChange={(v) => set("orgTypeOther", v)} placeholder={t("onboarding.org.info.specifyPlaceholder", null, "e.g. Cooperative society")} />
          </Field>
        </div>
      )}
    </div>
  );
}
function OrgGoals({ d, set }) {
  const { t } = useTranslation();
  const learn = d.learn || [];
  return (
    <div className="rise">
      <StepHead step={t("onboarding.org.goals.step", null, "Step 3 · Goals")} title={t("onboarding.org.goals.title", null, "What would you like to learn?")} sub={t("onboarding.org.goals.sub", null, "Pick everything you'd like to understand.")} />
      <FSection label={t("onboarding.org.goals.title", null, "What would you like to learn?")} count={learn.length ? t("onboarding.selectedCount", { count: learn.length }, `${learn.length} selected`) : null} required />
      <SelCards options={ORG_LEARN(t)} value={learn} onChange={(v) => set("learn", v)} multi cols={2} />
      <FSection label={t("onboarding.org.goals.initiativeSection", null, "Initiative details")} />
      <Field label={t("onboarding.org.goals.initiativeNameLabel", null, "Initiative / program name")}><TextInput value={d.initiativeName} onChange={(v) => set("initiativeName", v)} placeholder="Rural Digital Literacy Drive" /></Field>
      <Field label={t("onboarding.org.goals.programDescLabel", null, "Program description")} optional><Textarea value={d.programDesc} onChange={(v) => set("programDesc", v)} placeholder="A short description of the initiative and its goals…" /></Field>
      <FSection label={t("onboarding.org.goals.geoAreaSection", null, "Geographic area covered")} />
      <SelCards options={GEO_AREA(t)} value={d.geoArea} onChange={(v) => set("geoArea", v)} cols={3} />
    </div>
  );
}
function OrgAudience(props) {
  const { t } = useTranslation();
  const { d, set, region, showErrors } = props;
  const { filters } = useMeta();
  const { reach, base, firstLoad, updating } = useAudienceReach(d);
  return (
    <div className="rise">
      <StepHead step={t("onboarding.org.audience.step", null, "Step 4 · Audience")} title={t("onboarding.company.audience.title", null, "Who would you like to hear from?")} sub={t("onboarding.org.audience.sub", null, "Define the community you want feedback from.")} />
      <ReachMeter reach={reach} base={base} firstLoad={firstLoad} updating={updating} />
      <FSection label={t("onboarding.locationSection", null, "Location")} />
      <LocationFields region={region} d={d} set={set} withCity showErrors={showErrors} />
      <FSection label={t("onboarding.org.audience.targetSection", null, "Target audience")} count={(d.targetGroups || []).length ? t("onboarding.selectedCount", { count: d.targetGroups.length }, `${d.targetGroups.length} selected`) : null} />
      <Chips options={ORG_TARGET(t)} value={d.targetGroups} onChange={(v) => set("targetGroups", v)} />
      <FSection label={t("onboarding.org.audience.demographicFiltersSection", null, "Demographic filters")} />
      <DemographicsRow d={d} set={set} ageOptions={filters.Demographics?.Age} genderOptions={filters.Demographics?.Gender} />
      <ProfileChips d={d} set={set} region={region} incomeOptions={filters.Demographics?.["Income Bracket"]} show={{ income: true, languages: true }} />
      <FSection label={t("onboarding.org.audience.scaleSection", null, "Scale requirements")} />
      <Field label={t("onboarding.org.audience.scaleLabel", null, "How many participants are typically needed?")}><Chips options={ORG_SCALE} value={d.scale} onChange={(v) => set("scale", v)} multi={false} /></Field>
    </div>
  );
}
function OrgVerify({ d, set, showErrors }) {
  const { t } = useTranslation();
  return (
    <div className="rise">
      <StepHead step={t("onboarding.org.verify.step", null, "Step 5 · Verification")} title={t("onboarding.org.verify.title", null, "Build trust with participants")} sub={t("onboarding.org.verify.sub", null, "Verified organizations get higher participation.")} />
      <VerifyRow icon="browser" title={t("onboarding.verify.websiteTitle", null, "Website")} showErrors={showErrors} desc={t("onboarding.org.verify.websiteDesc", null, "Confirms you own the domain.")} placeholder={d.website || "saksham.org"}
        value={d.vWebsiteInput} onChange={(v) => set("vWebsiteInput", v)} verified={d.vWebsite} onVerify={() => set("vWebsite", true)} onUnverify={() => set("vWebsite", false)} />
      <VerifyRow icon="link" title={t("onboarding.verify.linkedinTitle", null, "LinkedIn page")} showErrors={showErrors} desc={t("onboarding.org.verify.linkedinDesc", null, "Links initiatives to a real, public organisation.")} placeholder="linkedin.com/company/…"
        value={d.vCompanyInput} onChange={(v) => set("vCompanyInput", v)} verified={d.vCompanyPage} onVerify={() => set("vCompanyPage", true)} onUnverify={() => set("vCompanyPage", false)} />
      <VerifyRow icon="fileText" title={t("onboarding.org.verify.regNoTitle", null, "Registration number")} showErrors={showErrors} desc={t("onboarding.org.verify.regNoDesc", null, "NGO / society / trust registration.")} placeholder="e.g. 80G / 12A / Society reg."
        value={d.regNo} onChange={(v) => set("regNo", v)} verified={d.vRegistry} onVerify={() => set("vRegistry", true)} onUnverify={() => set("vRegistry", false)} />
      <VerifyRow icon="building" title={t("onboarding.org.verify.govTitle", null, "Government affiliation")} optional desc={t("onboarding.org.verify.govDesc", null, "If applicable — department, scheme or ministry linkage.")} placeholder="e.g. Ministry of Rural Development"
        value={d.govAffiliation} onChange={(v) => set("govAffiliation", v)} verified={!!d.govAffiliation && d.vRegistry} onVerify={() => set("vRegistry", true)} onUnverify={() => set("vRegistry", false)} />
    </div>
  );
}
function orgValid(key, d) {
  switch (key) {
    case "personal": return !!(d.fullName && d.fullName.trim().length > 1) && !!d.designation && EMAIL_RE.test(d.email || "") && (d.mobile || "").replace(/\D/g, "").length >= 8;
    case "organization": return !!(d.orgName && d.orgName.trim()) && !!d.orgType && (d.orgType !== "Other" || !!(d.orgTypeOther && d.orgTypeOther.trim()));
    case "goals": return (d.learn || []).length >= 1 && !!(d.initiativeName && d.initiativeName.trim());
    case "audience": return (d.targetGroups || []).length >= 1 || (d.ageBands || []).length >= 1;
    case "verify": return !!d.vWebsite && !!d.vCompanyPage && !!d.vRegistry;
    default: return true;
  }
}

// Scoped per-builder so switching accounts on the same browser never shows
// one builder's in-progress onboarding draft (name, email, ...) to another.
export const onboardingDraftKey = (builderId, role) => `vc_onboarding_draft_${builderId || "anon"}_${role}`;

// Role metadata (icon, name, description, accent colour) shared between the
// full-page role selector and the in-wizard role-switcher dropdown, so both
// stay in sync with a single source of truth.
export const getRoles = (t) => [
  {
    key: "founder", icon: "rocket", name: t("roles.founder", null, "Founder / Startup"), live: true,
    desc: t("roles.founderDesc", null, "Validate your startup — product feedback, user opinions, beta testing, idea & pricing validation."),
    accent: "#4f46e5",
  },
  {
    key: "company", icon: "building", name: t("roles.company", null, "Company"), live: true,
    desc: t("roles.companyDesc", null, "Evaluate products, packaging, pricing, brand perception and customer experience."),
    accent: "#0891b2",
  },
  {
    key: "researcher", icon: "flask", name: t("roles.researcher", null, "Researcher"), live: true,
    desc: t("roles.researcherDesc", null, "Recruit participants for academic, social, healthcare, or scientific research."),
    accent: "#0d9488",
  },
  {
    key: "organization", icon: "building", name: t("roles.organization", null, "Organization"), live: true,
    desc: t("roles.orgDesc", null, "Gather community, policy and programme feedback — impact assessment and awareness studies."),
    accent: "#c2710c",
  },
];

// Wipes every role's draft then seeds a fresh, immediately-detectable one for
// `key` — same reset used when picking a role on the full-page selector and
// when switching roles mid-onboarding, so the dashboard's "which role / how
// far" banner is never left pointing at a stale or ambiguous draft.
export function switchToRoleDraft(builderId, key, builder) {
  Object.keys(PERSONA_CONFIG).forEach((k) => {
    try { localStorage.removeItem(onboardingDraftKey(builderId, k)); } catch { /* ignore */ }
  });
  try {
    localStorage.setItem(onboardingDraftKey(builderId, key), JSON.stringify({
      step: 0, maxReached: 0, d: { fullName: builder?.name || "", email: builder?.email || "" },
    }));
  } catch { /* ignore */ }
}

// Step-rail labels are shared across personas (several personas reuse "Your
// details"/"Audience"/etc), so they're translated through one shared key per
// label rather than per-persona, to avoid translating the same word 4x over.
const STEP_LABEL_KEYS = {
  personal: ["onboarding.step.yourDetails", "Your details"],
  company: ["onboarding.step.company", "Company"],
  validate: ["onboarding.step.validate", "Validate"],
  audience: ["onboarding.step.audience", "Audience"],
  verify: ["onboarding.step.verification", "Verification"],
  final: ["onboarding.step.preferences", "Preferences"],
  needs: ["onboarding.step.yourNeeds", "Your needs"],
  academic: ["onboarding.step.academic", "Academic"],
  research: ["onboarding.step.research", "Research"],
  participants: ["onboarding.step.participants", "Participants"],
  ethics: ["onboarding.step.ethics", "Ethics"],
  organization: ["onboarding.step.organization", "Organization"],
  goals: ["onboarding.step.goals", "Goals"],
};
export function stepLabel(t, key, fallback) {
  const entry = STEP_LABEL_KEYS[key];
  return entry ? t(entry[0], null, entry[1]) : (fallback || key);
}

/* ============================= PERSONA REGISTRY ============================= */
// `name`/`steps[].label` are used both as plain strings (e.g. localStorage-free
// contexts) and as translation fallbacks — components that render them call
// t(key, null, PERSONA_CONFIG[x].name) etc, so the raw English here still needs
// to stay accurate as the fallback text.
export const PERSONA_CONFIG = {
  founder: {
    name: "Founder",
    steps: [
      { key: "personal", label: "Your details" },
      { key: "company", label: "Company" },
      { key: "validate", label: "Validate" },
      { key: "audience", label: "Audience" },
      { key: "verify", label: "Verification" },
      { key: "final", label: "Preferences" },
    ],
    components: { personal: FoPersonal, company: FoCompany, validate: FoValidate, audience: FoAudience, verify: FoVerify, final: StepFinal },
    validate: foValid,
    workspace: (d, t) => d.companyName || t("onboarding.yourWorkspace", null, "Your workspace"),
    noun: "campaign",
    matchedNoun: "validators",
    summary: (d, t) => [
      { label: t("onboarding.summary.company", null, "Company"), value: d.companyName || "—" },
      { label: t("onboarding.summary.validating", null, "Validating"), value: foLabelList(VALIDATION_TYPES(t), d.vTypes) },
    ],
  },
  company: {
    name: "Company",
    steps: [
      { key: "personal", label: "Your details" },
      { key: "company", label: "Company" },
      { key: "needs", label: "Your needs" },
      { key: "audience", label: "Audience" },
      { key: "verify", label: "Verification" },
      { key: "final", label: "Preferences" },
    ],
    components: { personal: CoPersonal, company: CoCompany, needs: CoNeeds, audience: CoAudience, verify: CoVerify, final: StepFinal },
    validate: coValid,
    workspace: (d, t) => d.companyName || t("onboarding.yourWorkspace", null, "Your workspace"),
    noun: "campaign",
    matchedNoun: "people",
    summary: (d, t) => [
      { label: t("onboarding.summary.company", null, "Company"), value: d.companyName || "—" },
      { label: t("onboarding.summary.lookingFor", null, "Looking for"), value: foLabelList(COMPANY_LOOKING(t), d.looking) },
    ],
  },
  researcher: {
    name: "Researcher",
    steps: [
      { key: "personal", label: "Your details" },
      { key: "academic", label: "Academic" },
      { key: "research", label: "Research" },
      { key: "participants", label: "Participants" },
      { key: "ethics", label: "Ethics" },
      { key: "final", label: "Preferences" },
    ],
    components: { personal: ResPersonal, academic: ResAcademic, research: ResResearch, participants: ResParticipants, ethics: ResEthics, final: StepFinal },
    validate: resValid,
    workspace: (d, t) => d.institution || t("onboarding.yourResearchWorkspace", null, "Your research workspace"),
    noun: "study",
    summary: (d, t) => [
      { label: t("onboarding.summary.study", null, "Study"), value: d.researchTitle || "—" },
      { label: t("onboarding.summary.institution", null, "Institution"), value: d.institution || "—" },
      { label: t("onboarding.summary.ethics", null, "Ethics"), value: d.ethics === "yes" ? t("onboarding.summary.ethicsApproved", null, "Approved") : d.ethics === "process" ? t("onboarding.summary.ethicsInProcess", null, "In process") : t("onboarding.summary.ethicsNotRequired", null, "Not required") },
    ],
  },
  organization: {
    name: "Organization",
    steps: [
      { key: "personal", label: "Your details" },
      { key: "organization", label: "Organization" },
      { key: "goals", label: "Goals" },
      { key: "audience", label: "Audience" },
      { key: "verify", label: "Verification" },
      { key: "final", label: "Preferences" },
    ],
    components: { personal: OrgRep, organization: OrgInfo, goals: OrgGoals, audience: OrgAudience, verify: OrgVerify, final: StepFinal },
    validate: orgValid,
    workspace: (d, t) => d.orgName || t("onboarding.yourWorkspace", null, "Your workspace"),
    noun: "initiative",
    matchedNoun: "people",
    summary: (d, t) => [
      { label: t("onboarding.summary.organization", null, "Organization"), value: d.orgName || "—" },
      { label: t("onboarding.summary.learning", null, "Learning"), value: foLabelList(ORG_LEARN(t), d.learn) },
    ],
  },
};
