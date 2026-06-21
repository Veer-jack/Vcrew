import {
  Field, TextInput, Textarea, SelectInput, FSection, Chips, SelCards,
  ReachMeter, LocationFields, DemographicsRow, ProfileChips, VerifyRow, PersonalFields,
} from "../components/OnboardingFields";
import {
  DESIGNATIONS, COMPANY_SIZES, COMPANY_STAGES, INDUSTRIES, VALIDATION_TYPES,
  AGE_BANDS, GENDERS, OCCUPATIONS, EDUCATIONS, INTERESTS, INCOME_BANDS,
  COMPANY_INDUSTRIES, EMP_SIZES, COMPANY_LOOKING, PRODUCT_STAGES, VOLUME_COMPANY,
  RES_DESIGNATIONS, QUALIFICATIONS, RESEARCH_AREAS, SUPPORT_TYPES, ETHICS_OPTIONS,
  ADDITIONAL_FILTERS, SAMPLE_SIZES, ORG_TYPES, ORG_LEARN, GEO_AREA, ORG_TARGET, ORG_SCALE,
  OCC_SIMPLE, FREQUENCY, PREFERRED_METHODS, foReach, foLabelList,
} from "./onboarding";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  return (
    <div className="rise">
      <StepHead step="Almost done · Preferences" title="How will you use ValidationCrew?"
        sub="A couple of quick preferences so we can shape your workspace." />
      <FSection label="How often will you need feedback?" />
      <SelCards options={FREQUENCY} value={d.frequency} onChange={(v) => set("frequency", v)} cols={2} />
      <FSection label="Preferred methods" count={(d.methods || []).length ? `${d.methods.length} selected` : null} />
      <SelCards options={PREFERRED_METHODS} value={d.methods || []} onChange={(v) => set("methods", v)} multi cols={2} />
    </div>
  );
}

/* ============================= FOUNDER ============================= */
function FoPersonal({ d, set, region }) {
  return (
    <div className="rise">
      <StepHead step="Step 1 · Your details" title="Let's start with you"
        sub="This stays private to your workspace. We use it to set up your account and route campaign results to the right person." />
      <PersonalFields d={d} set={set} roleField={null} />
    </div>
  );
}
function FoCompany({ d, set }) {
  return (
    <div className="rise">
      <StepHead step="Step 2 · Company" title="About your company"
        sub="This shapes the benchmarks we compare your results against." />
      <div className="fgrid c2">
        <Field label="Company / product name"><TextInput value={d.companyName} onChange={(v) => set("companyName", v)} placeholder="Helix Labs" /></Field>
        <Field label="Website" optional><TextInput value={d.website} onChange={(v) => set("website", v)} placeholder="helixlabs.com" /></Field>
        <Field label="Industry" span><SelectInput value={d.industry} onChange={(v) => set("industry", v)} options={INDUSTRIES} placeholder="Select industry" /></Field>
      </div>
      <FSection label="Company size" />
      <SelCards options={COMPANY_SIZES} value={d.size} onChange={(v) => set("size", v)} cols={3} />
      <FSection label="Stage" />
      <SelCards options={COMPANY_STAGES} value={d.stage} onChange={(v) => set("stage", v)} cols={3} />
    </div>
  );
}
function FoValidate({ d, set }) {
  const sel = d.vTypes || [];
  return (
    <div className="rise">
      <StepHead step="Step 3 · What to validate" title="What do you want to put in front of people?"
        sub="Pick everything you expect to validate — this tailors the reviewer pools we line up for you." />
      <FSection label="Validation surfaces" count={sel.length ? `${sel.length} selected` : null} />
      <SelCards options={VALIDATION_TYPES} value={sel} onChange={(v) => set("vTypes", v)} multi cols={2} />
    </div>
  );
}
function GenericAudience({ d, set, region, title, sub }) {
  const base = region === "india" ? 184000 : 246000;
  return (
    <div className="rise">
      <StepHead step="Audience" title={title} sub={sub} />
      <ReachMeter reach={foReach(d, region)} base={base} />
      <FSection label="Demographics" />
      <DemographicsRow d={d} set={set} />
      <FSection label="Location" />
      <LocationFields region={region} d={d} set={set} withCity />
      <FSection label="Profile" />
      <ProfileChips d={d} set={set} region={region} occOptions={OCCUPATIONS}
        show={{ occupation: true, education: true, income: true, languages: true, interests: true }} />
    </div>
  );
}
function FoAudience(props) {
  return <GenericAudience {...props} title="Who should weigh in?" sub="Describe the people whose opinion actually matters — we match you to validators who fit, we don't blast everyone." />;
}
function GenericVerify({ d, set, region, websiteHint, docs }) {
  return (
    <div className="rise">
      <StepHead step="Verification" title="Build trust" sub="Verified accounts get better reviewers and faster matches. Verify what you can now — finish the rest anytime from your dashboard." />
      <VerifyRow icon="browser" title="Website" desc="Confirms you own the domain via a meta tag or DNS record."
        placeholder={websiteHint} value={d.vWebsiteInput} onChange={(v) => set("vWebsiteInput", v)} verified={d.vWebsite} onVerify={() => set("vWebsite", true)} />
      <VerifyRow icon="link" title="LinkedIn page" desc="Links your campaigns to a real, public organisation."
        placeholder="linkedin.com/company/…" value={d.vCompanyInput} onChange={(v) => set("vCompanyInput", v)} verified={d.vCompanyPage} onVerify={() => set("vCompanyPage", true)} />
      {docs.map((doc) => (
        <VerifyRow key={doc.key} icon="fileText" title={doc.title} optional desc={doc.desc} placeholder={doc.placeholder}
          value={d[doc.key]} onChange={(v) => set(doc.key, v)} verified={d.vRegistry} onVerify={() => set("vRegistry", true)} />
      ))}
      <p className="faint" style={{ fontSize: 12, marginTop: 4 }}>
        Verification is optional to finish setup. Submitted details are reviewed by our trust team and never shared with validators.
      </p>
    </div>
  );
}
function FoVerify({ d, set, region }) {
  return <GenericVerify d={d} set={set} region={region} websiteHint={d.website || "helixlabs.com"}
    docs={region === "india"
      ? [{ key: "gst", title: "GST registration", desc: "Adds a business-registry badge.", placeholder: "22AAAAA0000A1Z5" }]
      : [{ key: "taxId", title: "Business / Tax ID", desc: "EIN, VAT or company number.", placeholder: "e.g. 12-3456789" }]} />;
}
function foValid(key, d) {
  switch (key) {
    case "personal": return !!(d.fullName && d.fullName.trim().length > 1) && EMAIL_RE.test(d.email || "") && (d.mobile || "").replace(/\D/g, "").length >= 8 && !!d.designation && (d.password || "").length >= 8;
    case "company": return !!(d.companyName && d.companyName.trim()) && !!d.industry && !!d.size && !!d.stage;
    case "validate": return (d.vTypes || []).length >= 1;
    case "audience": return (d.ageBands || []).length >= 1;
    default: return true;
  }
}

/* ============================= COMPANY ============================= */
function CoPersonal({ d, set }) {
  return (
    <div className="rise">
      <StepHead step="Step 1 · About you" title="Let's start with you" sub="This stays private to your workspace." />
      <PersonalFields d={d} set={set} roleField={{ key: "designation", label: "Job title / designation", free: true, placeholder: "Head of Product" }} />
    </div>
  );
}
function CoCompany({ d, set }) {
  return (
    <div className="rise">
      <StepHead step="Step 2 · Company" title="About your company" sub="This helps validators recognise who they're giving feedback to." />
      <div className="fgrid c2">
        <Field label="Company name"><TextInput value={d.companyName} onChange={(v) => set("companyName", v)} placeholder="Acme Foods" /></Field>
        <Field label="Website" optional><TextInput value={d.website} onChange={(v) => set("website", v)} placeholder="acmefoods.com" /></Field>
        <Field label="Industry"><SelectInput value={d.industry} onChange={(v) => set("industry", v)} options={COMPANY_INDUSTRIES} placeholder="Select industry" /></Field>
        <Field label="Year founded" optional><TextInput value={d.yearFounded} onChange={(v) => set("yearFounded", v.replace(/\D/g, "").slice(0, 4))} placeholder="2019" /></Field>
        <Field label="Headquarters" optional span><TextInput value={d.hq} onChange={(v) => set("hq", v)} placeholder="City, Country" /></Field>
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
      <StepHead step="Step 3 · Your needs" title="What are you looking for?" sub="Pick everything you might want feedback on." />
      <FSection label="What are you looking for?" count={look.length ? `${look.length} selected` : null} />
      <SelCards options={COMPANY_LOOKING} value={look} onChange={(v) => set("looking", v)} multi cols={2} />
      <FSection label="About your product or service" />
      <div className="fgrid c2">
        <Field label="Product / service name"><TextInput value={d.productName} onChange={(v) => set("productName", v)} placeholder="Acme Protein Bars" /></Field>
        <Field label="Category" optional><TextInput value={d.category} onChange={(v) => set("category", v)} placeholder="Snacks / Nutrition" /></Field>
        <Field label="Brief description" optional span><Textarea value={d.description} onChange={(v) => set("description", v)} placeholder="A few words on what it is and who it's for…" /></Field>
      </div>
      <FSection label="Current stage" />
      <SelCards options={PRODUCT_STAGES} value={d.stage} onChange={(v) => set("stage", v)} cols={3} />
    </div>
  );
}
function CoAudience(props) {
  return <GenericAudience {...props} title="Who would you like to hear from?" sub="The sharper you are, the higher the signal — we match you to validators who fit." />;
}
function CoVerify({ d, set, region }) {
  return <GenericVerify d={d} set={set} region={region} websiteHint={d.website || "acmefoods.com"}
    docs={region === "india"
      ? [{ key: "gst", title: "GST number", desc: "Adds a business-registry badge.", placeholder: "22AAAAA0000A1Z5" }]
      : [{ key: "taxId", title: "Business / Tax ID", desc: "EIN, VAT or company number.", placeholder: "e.g. 12-3456789" }]} />;
}
function coValid(key, d) {
  switch (key) {
    case "personal": return !!(d.fullName && d.fullName.trim().length > 1) && EMAIL_RE.test(d.email || "") && (d.mobile || "").replace(/\D/g, "").length >= 8 && !!d.designation && (d.password || "").length >= 8;
    case "company": return !!(d.companyName && d.companyName.trim()) && !!d.industry && !!d.size;
    case "needs": return (d.looking || []).length >= 1 && !!(d.productName && d.productName.trim());
    case "audience": return (d.ageBands || []).length >= 1;
    default: return true;
  }
}

/* ============================= RESEARCHER ============================= */
function ResPersonal({ d, set }) {
  return (
    <div className="rise">
      <StepHead step="Step 1 · About you" title="Let's start with you" sub="This stays private. We use it to set up your researcher account." />
      <PersonalFields d={d} set={set} roleField={{ key: "designation", label: "Designation", free: false }} />
    </div>
  );
}
function ResAcademic({ d, set }) {
  return (
    <div className="rise">
      <StepHead step="Step 2 · Academic" title="Your academic background" sub="This helps us verify you as a researcher." />
      <div className="fgrid c2">
        <Field label="University / institution" span><TextInput value={d.institution} onChange={(v) => set("institution", v)} placeholder="Indian Institute of Science" /></Field>
        <Field label="Department" optional><TextInput value={d.department} onChange={(v) => set("department", v)} placeholder="Management Studies" /></Field>
        <Field label="Designation"><SelectInput value={d.designation} onChange={(v) => set("designation", v)} options={RES_DESIGNATIONS} placeholder="Select designation" /></Field>
        <Field label="Highest qualification" span><Chips options={QUALIFICATIONS} value={d.qualification} onChange={(v) => set("qualification", v)} multi={false} /></Field>
      </div>
    </div>
  );
}
function ResResearch({ d, set }) {
  const support = d.support || [];
  return (
    <div className="rise">
      <StepHead step="Step 3 · Research" title="Tell us about your research" sub="Enough to match you with participants who genuinely fit it." />
      <div className="fgrid c2">
        <Field label="Research title" span><TextInput value={d.researchTitle} onChange={(v) => set("researchTitle", v)} placeholder="Adoption of AI tools among early-stage founders" /></Field>
        <Field label="Research objective(s)" optional span><Textarea value={d.objectives} onChange={(v) => set("objectives", v)} placeholder="What are you trying to find out?" /></Field>
        <Field label="Expected completion" optional><TextInput value={d.completion} onChange={(v) => set("completion", v)} placeholder="e.g. Dec 2026" /></Field>
      </div>
      <FSection label="Research area" count={(d.areas || []).length ? `${d.areas.length} selected` : null} />
      <Chips options={RESEARCH_AREAS} value={d.areas} onChange={(v) => set("areas", v)} />
      <FSection label="What kind of support do you need?" count={support.length ? `${support.length} selected` : null} />
      <SelCards options={SUPPORT_TYPES} value={support} onChange={(v) => set("support", v)} multi cols={2} />
    </div>
  );
}
function ResParticipants({ d, set, region }) {
  const base = region === "india" ? 184000 : 246000;
  return (
    <div className="rise">
      <StepHead step="Step 4 · Participants" title="Who should take part?" sub="Define your sample — we match you to participants who fit your criteria." />
      <ReachMeter reach={foReach(d, region)} base={base} />
      <FSection label="Sample size needed" />
      <Field label="How many participants?"><Chips options={SAMPLE_SIZES} value={d.sampleSize} onChange={(v) => set("sampleSize", v)} multi={false} /></Field>
      <FSection label="Location" />
      <LocationFields region={region} d={d} set={set} />
      <FSection label="Demographics" />
      <DemographicsRow d={d} set={set} />
      <ProfileChips d={d} set={set} region={region} occOptions={OCC_SIMPLE} show={{ occupation: true, education: true, income: true }} />
      <FSection label="Additional filters" />
      <Chips options={ADDITIONAL_FILTERS} value={d.filters} onChange={(v) => set("filters", v)} />
    </div>
  );
}
function ResEthics({ d, set }) {
  return (
    <div className="rise">
      <StepHead step="Step 5 · Ethics & verification" title="Ethics & verification" sub="Approved, transparent studies get higher participation." />
      <FSection label="Does your study have institutional approval?" />
      <SelCards options={ETHICS_OPTIONS} value={d.ethics} onChange={(v) => set("ethics", v)} cols={3} />
      {d.ethics === "yes" && (
        <div style={{ marginTop: 14 }}>
          <Field label="Approval reference" optional><TextInput value={d.ethicsRef} onChange={(v) => set("ethicsRef", v)} placeholder="IRB / ethics committee reference number" /></Field>
        </div>
      )}
      <FSection label="Verify your identity" />
      <VerifyRow icon="message" title="University email" desc="Confirms your academic affiliation via a .edu / .ac domain."
        placeholder={d.email || "you@university.ac.in"} value={d.vWebsiteInput} onChange={(v) => set("vWebsiteInput", v)} verified={d.vWebsite} onVerify={() => set("vWebsite", true)} />
      <VerifyRow icon="flask" title="Scholarly profile" optional desc="Google Scholar, ORCID, Scopus, ResearchGate or LinkedIn."
        placeholder="Profile URL" value={d.researchProfile} onChange={(v) => set("researchProfile", v)} verified={d.vRegistry} onVerify={() => set("vRegistry", true)} />
    </div>
  );
}
function resValid(key, d) {
  switch (key) {
    case "personal": return !!(d.fullName && d.fullName.trim().length > 1) && EMAIL_RE.test(d.email || "") && (d.mobile || "").replace(/\D/g, "").length >= 8 && (d.password || "").length >= 8;
    case "academic": return !!(d.institution && d.institution.trim()) && !!d.designation && !!d.qualification;
    case "research": return !!(d.researchTitle && d.researchTitle.trim()) && (d.areas || []).length >= 1 && (d.support || []).length >= 1;
    case "participants": return !!d.sampleSize && (d.ageBands || []).length >= 1;
    case "ethics": return !!d.ethics;
    default: return true;
  }
}

/* ============================= ORGANIZATION ============================= */
function OrgRep({ d, set }) {
  return (
    <div className="rise">
      <StepHead step="Step 1 · Representative" title="Who's representing the organization?" sub="This stays private. We use it to set up your account." />
      <PersonalFields d={d} set={set} roleField={{ key: "designation", label: "Your designation", free: true, placeholder: "Programme Director" }} />
    </div>
  );
}
function OrgInfo({ d, set }) {
  return (
    <div className="rise">
      <StepHead step="Step 2 · Organization" title="About your organization" sub="This helps participants recognise who they're contributing to." />
      <div className="fgrid c2">
        <Field label="Organization name" span><TextInput value={d.orgName} onChange={(v) => set("orgName", v)} placeholder="Saksham Foundation" /></Field>
        <Field label="Website" optional><TextInput value={d.website} onChange={(v) => set("website", v)} placeholder="saksham.org" /></Field>
        <Field label="Year established" optional><TextInput value={d.yearFounded} onChange={(v) => set("yearFounded", v.replace(/\D/g, "").slice(0, 4))} placeholder="2012" /></Field>
        <Field label="Headquarters" optional span><TextInput value={d.hq} onChange={(v) => set("hq", v)} placeholder="City, Country" /></Field>
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
      <StepHead step="Step 3 · Goals" title="What would you like to learn?" sub="Pick everything you'd like to understand." />
      <FSection label="What would you like to learn?" count={learn.length ? `${learn.length} selected` : null} />
      <SelCards options={ORG_LEARN} value={learn} onChange={(v) => set("learn", v)} multi cols={2} />
      <FSection label="Initiative details" />
      <Field label="Initiative / program name"><TextInput value={d.initiativeName} onChange={(v) => set("initiativeName", v)} placeholder="Rural Digital Literacy Drive" /></Field>
      <Field label="Program description" optional><Textarea value={d.programDesc} onChange={(v) => set("programDesc", v)} placeholder="A short description of the initiative and its goals…" /></Field>
      <FSection label="Geographic area covered" />
      <SelCards options={GEO_AREA} value={d.geoArea} onChange={(v) => set("geoArea", v)} cols={3} />
    </div>
  );
}
function OrgAudience(props) {
  const { d, set, region } = props;
  const base = region === "india" ? 184000 : 246000;
  return (
    <div className="rise">
      <StepHead step="Step 4 · Audience" title="Who would you like to hear from?" sub="Define the community you want feedback from." />
      <ReachMeter reach={foReach(d, region)} base={base} />
      <FSection label="Location" />
      <LocationFields region={region} d={d} set={set} withCity />
      <FSection label="Target audience" count={(d.targetGroups || []).length ? `${d.targetGroups.length} selected` : null} />
      <Chips options={ORG_TARGET} value={d.targetGroups} onChange={(v) => set("targetGroups", v)} />
      <FSection label="Demographic filters" />
      <DemographicsRow d={d} set={set} />
      <ProfileChips d={d} set={set} region={region} show={{ income: true, languages: true }} />
      <FSection label="Scale requirements" />
      <Field label="How many participants are typically needed?"><Chips options={ORG_SCALE} value={d.scale} onChange={(v) => set("scale", v)} multi={false} /></Field>
    </div>
  );
}
function OrgVerify({ d, set }) {
  return (
    <div className="rise">
      <StepHead step="Step 5 · Verification" title="Build trust with participants" sub="Verified organizations get higher participation." />
      <VerifyRow icon="browser" title="Website" desc="Confirms you own the domain." placeholder={d.website || "saksham.org"}
        value={d.vWebsiteInput} onChange={(v) => set("vWebsiteInput", v)} verified={d.vWebsite} onVerify={() => set("vWebsite", true)} />
      <VerifyRow icon="link" title="LinkedIn page" desc="Links initiatives to a real, public organisation." placeholder="linkedin.com/company/…"
        value={d.vCompanyInput} onChange={(v) => set("vCompanyInput", v)} verified={d.vCompanyPage} onVerify={() => set("vCompanyPage", true)} />
      <VerifyRow icon="fileText" title="Registration number" desc="NGO / society / trust registration." placeholder="e.g. 80G / 12A / Society reg."
        value={d.regNo} onChange={(v) => set("regNo", v)} verified={d.vRegistry} onVerify={() => set("vRegistry", true)} />
      <VerifyRow icon="building" title="Government affiliation" optional desc="If applicable — department, scheme or ministry linkage." placeholder="e.g. Ministry of Rural Development"
        value={d.govAffiliation} onChange={(v) => set("govAffiliation", v)} verified={!!d.govAffiliation && d.vRegistry} onVerify={() => set("vRegistry", true)} />
    </div>
  );
}
function orgValid(key, d) {
  switch (key) {
    case "personal": return !!(d.fullName && d.fullName.trim().length > 1) && !!d.designation && EMAIL_RE.test(d.email || "") && (d.mobile || "").replace(/\D/g, "").length >= 8 && (d.password || "").length >= 8;
    case "organization": return !!(d.orgName && d.orgName.trim()) && !!d.orgType;
    case "goals": return (d.learn || []).length >= 1 && !!(d.initiativeName && d.initiativeName.trim());
    case "audience": return (d.targetGroups || []).length >= 1 || (d.ageBands || []).length >= 1;
    default: return true;
  }
}

/* ============================= PERSONA REGISTRY ============================= */
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
    workspace: (d) => d.companyName || "Your workspace",
    noun: "campaign",
    summary: (d, region) => [
      { label: "Company", value: d.companyName || "—" },
      { label: "Validating", value: foLabelList(VALIDATION_TYPES, d.vTypes) },
      { label: "Matched audience", value: foReach(d, region).toLocaleString("en-US") + " validators" },
    ],
  },
  company: {
    name: "Company",
    steps: [
      { key: "personal", label: "About you" },
      { key: "company", label: "Company" },
      { key: "needs", label: "Your needs" },
      { key: "audience", label: "Audience" },
      { key: "verify", label: "Verification" },
      { key: "final", label: "Preferences" },
    ],
    components: { personal: CoPersonal, company: CoCompany, needs: CoNeeds, audience: CoAudience, verify: CoVerify, final: StepFinal },
    validate: coValid,
    workspace: (d) => d.companyName || "Your workspace",
    noun: "campaign",
    summary: (d, region) => [
      { label: "Company", value: d.companyName || "—" },
      { label: "Looking for", value: foLabelList(COMPANY_LOOKING, d.looking) },
      { label: "Matched audience", value: foReach(d, region).toLocaleString("en-US") + " people" },
    ],
  },
  researcher: {
    name: "Researcher",
    steps: [
      { key: "personal", label: "About you" },
      { key: "academic", label: "Academic" },
      { key: "research", label: "Research" },
      { key: "participants", label: "Participants" },
      { key: "ethics", label: "Ethics" },
      { key: "final", label: "Preferences" },
    ],
    components: { personal: ResPersonal, academic: ResAcademic, research: ResResearch, participants: ResParticipants, ethics: ResEthics, final: StepFinal },
    validate: resValid,
    workspace: (d) => d.institution || "Your research workspace",
    noun: "study",
    summary: (d) => [
      { label: "Study", value: d.researchTitle || "—" },
      { label: "Institution", value: d.institution || "—" },
      { label: "Ethics", value: d.ethics === "yes" ? "Approved" : d.ethics === "process" ? "In process" : "Not required" },
    ],
  },
  organization: {
    name: "Organization",
    steps: [
      { key: "personal", label: "Representative" },
      { key: "organization", label: "Organization" },
      { key: "goals", label: "Goals" },
      { key: "audience", label: "Audience" },
      { key: "verify", label: "Verification" },
      { key: "final", label: "Preferences" },
    ],
    components: { personal: OrgRep, organization: OrgInfo, goals: OrgGoals, audience: OrgAudience, verify: OrgVerify, final: StepFinal },
    validate: orgValid,
    workspace: (d) => d.orgName || "Your workspace",
    noun: "initiative",
    summary: (d, region) => [
      { label: "Organization", value: d.orgName || "—" },
      { label: "Learning", value: foLabelList(ORG_LEARN, d.learn) },
      { label: "Matched audience", value: foReach(d, region).toLocaleString("en-US") + " people" },
    ],
  },
};
