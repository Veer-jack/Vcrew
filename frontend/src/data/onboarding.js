// Option sets + audience math for the Founder/Company/Researcher/Organization
// onboarding wizards. Ported from the design package's prototype data files,
// trimmed of pure visual flourish (hidden trust-score tiers, document upload,
// the literal animated radar/avatar scan) but keeping the real option lists,
// copy, validation rules, and the live audience-reach formula intact.
//
// Every option list below is a `(t) => [...]` function rather than a plain
// constant so labels can be translated. The `v` (value) on SelCards-style
// `{v,t,d}` entries stays a fixed English/canonical id — only `t`/`d`
// (display title/desc) are translated — so stored answers and equality
// checks (e.g. `d.ethics === "yes"`) never break when the UI language
// changes. Chips-style plain-string arrays don't have that value/label
// split, so their *stored* value is the translated string itself (same
// convention already used for the Job title / designation dropdown).

export const DESIGNATIONS = (t) => [
  t("onboarding.opts.designations.0", null, "Founder & CEO"),
  t("onboarding.opts.designations.1", null, "Co-founder"),
  t("onboarding.opts.designations.2", null, "Product Manager"),
  t("onboarding.opts.designations.3", null, "Head of Product"),
  t("onboarding.opts.designations.4", null, "Growth / Marketing"),
  t("onboarding.opts.designations.5", null, "Design Lead"),
  t("onboarding.opts.designations.6", null, "Engineering Lead"),
  t("onboarding.opts.designations.7", null, "Operations"),
  t("onboarding.opts.designations.8", null, "Other"),
];
export const COMPANY_SIZES = (t) => [
  { v: "solo", t: t("onboarding.opts.companySizes.solo.t", null, "Solo founder"), d: t("onboarding.opts.companySizes.solo.d", null, "Just me for now") },
  { v: "2-10", t: t("onboarding.opts.companySizes.2-10.t", null, "2–10"), d: t("onboarding.opts.companySizes.2-10.d", null, "Early team") },
  { v: "11-50", t: t("onboarding.opts.companySizes.11-50.t", null, "11–50"), d: t("onboarding.opts.companySizes.11-50.d", null, "Scaling up") },
  { v: "51-200", t: t("onboarding.opts.companySizes.51-200.t", null, "51–200"), d: t("onboarding.opts.companySizes.51-200.d", null, "Established") },
  { v: "ent", t: t("onboarding.opts.companySizes.ent.t", null, "Enterprise"), d: t("onboarding.opts.companySizes.ent.d", null, "200+ people") },
];
export const COMPANY_STAGES = (t) => [
  { v: "idea", t: t("onboarding.opts.companyStages.idea.t", null, "Idea"), d: t("onboarding.opts.companyStages.idea.d", null, "Still on paper") },
  { v: "proto", t: t("onboarding.opts.companyStages.proto.t", null, "Prototype"), d: t("onboarding.opts.companyStages.proto.d", null, "Rough build") },
  { v: "mvp", t: t("onboarding.opts.companyStages.mvp.t", null, "MVP"), d: t("onboarding.opts.companyStages.mvp.d", null, "In market") },
  { v: "growth", t: t("onboarding.opts.companyStages.growth.t", null, "Growth"), d: t("onboarding.opts.companyStages.growth.d", null, "Scaling revenue") },
  { v: "ent", t: t("onboarding.opts.companyStages.ent.t", null, "Enterprise"), d: t("onboarding.opts.companyStages.ent.d", null, "Mature org") },
];
export const INDUSTRIES = (t) => [
  t("onboarding.opts.industries.0", null, "Technology / SaaS"),
  t("onboarding.opts.industries.1", null, "Fintech"),
  t("onboarding.opts.industries.2", null, "Healthcare"),
  t("onboarding.opts.industries.3", null, "E-commerce / Retail"),
  t("onboarding.opts.industries.4", null, "AI / ML"),
  t("onboarding.opts.industries.5", null, "Consumer apps"),
  t("onboarding.opts.industries.6", null, "Education"),
  t("onboarding.opts.industries.7", null, "Media & Entertainment"),
  t("onboarding.opts.industries.8", null, "Manufacturing"),
  t("onboarding.opts.industries.9", null, "Real estate"),
  t("onboarding.opts.industries.10", null, "Logistics"),
  t("onboarding.opts.industries.11", null, "Gaming"),
  t("onboarding.opts.industries.12", null, "Other"),
];
export const VALIDATION_TYPES = (t) => [
  { v: "idea", t: t("onboarding.opts.validationTypes.idea.t", null, "Idea"), d: t("onboarding.opts.validationTypes.idea.d", null, "Concept & positioning") },
  { v: "product", t: t("onboarding.opts.validationTypes.product.t", null, "Product"), d: t("onboarding.opts.validationTypes.product.d", null, "Features & experience") },
  { v: "app", t: t("onboarding.opts.validationTypes.app.t", null, "Mobile app"), d: t("onboarding.opts.validationTypes.app.d", null, "iOS / Android flows") },
  { v: "web", t: t("onboarding.opts.validationTypes.web.t", null, "Website"), d: t("onboarding.opts.validationTypes.web.d", null, "Landing & funnel") },
  { v: "saas", t: t("onboarding.opts.validationTypes.saas.t", null, "SaaS platform"), d: t("onboarding.opts.validationTypes.saas.d", null, "Onboarding & retention") },
  { v: "ai", t: t("onboarding.opts.validationTypes.ai.t", null, "AI product"), d: t("onboarding.opts.validationTypes.ai.d", null, "Output quality & trust") },
  { v: "physical", t: t("onboarding.opts.validationTypes.physical.t", null, "Physical product"), d: t("onboarding.opts.validationTypes.physical.d", null, "Form, fit & function") },
  { v: "packaging", t: t("onboarding.opts.validationTypes.packaging.t", null, "Packaging"), d: t("onboarding.opts.validationTypes.packaging.d", null, "Shelf appeal & clarity") },
  { v: "pricing", t: t("onboarding.opts.validationTypes.pricing.t", null, "Pricing"), d: t("onboarding.opts.validationTypes.pricing.d", null, "Willingness to pay") },
  { v: "campaign", t: t("onboarding.opts.validationTypes.campaign.t", null, "Marketing campaign"), d: t("onboarding.opts.validationTypes.campaign.d", null, "Message & creative") },
  { v: "cx", t: t("onboarding.opts.validationTypes.cx.t", null, "Customer experience"), d: t("onboarding.opts.validationTypes.cx.d", null, "Support & journey") },
];

export const COMPANY_INDUSTRIES = (t) => [
  t("onboarding.opts.companyIndustries.0", null, "FMCG"),
  t("onboarding.opts.companyIndustries.1", null, "SaaS"),
  t("onboarding.opts.companyIndustries.2", null, "Healthcare"),
  t("onboarding.opts.companyIndustries.3", null, "Education"),
  t("onboarding.opts.companyIndustries.4", null, "Finance"),
  t("onboarding.opts.companyIndustries.5", null, "Manufacturing"),
  t("onboarding.opts.companyIndustries.6", null, "Retail"),
  t("onboarding.opts.companyIndustries.7", null, "E-commerce"),
  t("onboarding.opts.companyIndustries.8", null, "Real Estate"),
  t("onboarding.opts.companyIndustries.9", null, "Automotive"),
  t("onboarding.opts.companyIndustries.10", null, "Other"),
];
export const EMP_SIZES = (t) => [
  { v: "1-10", t: t("onboarding.opts.empSizes.1-10.t", null, "1–10"), d: t("onboarding.opts.empSizes.1-10.d", null, "Startup") },
  { v: "11-50", t: t("onboarding.opts.empSizes.11-50.t", null, "11–50"), d: t("onboarding.opts.empSizes.11-50.d", null, "Small") },
  { v: "51-200", t: t("onboarding.opts.empSizes.51-200.t", null, "51–200"), d: t("onboarding.opts.empSizes.51-200.d", null, "Mid-size") },
  { v: "201-1000", t: t("onboarding.opts.empSizes.201-1000.t", null, "201–1000"), d: t("onboarding.opts.empSizes.201-1000.d", null, "Large") },
  { v: "1000+", t: t("onboarding.opts.empSizes.1000plus.t", null, "1000+"), d: t("onboarding.opts.empSizes.1000plus.d", null, "Enterprise") },
];
export const COMPANY_LOOKING = (t) => [
  { v: "product-fb", t: t("onboarding.opts.companyLooking.productFb.t", null, "Product feedback"), d: t("onboarding.opts.companyLooking.productFb.d", null, "Features & experience") },
  { v: "product-test", t: t("onboarding.opts.companyLooking.productTest.t", null, "Product testing"), d: t("onboarding.opts.companyLooking.productTest.d", null, "Hands-on trials") },
  { v: "customer-fb", t: t("onboarding.opts.companyLooking.customerFb.t", null, "Customer feedback"), d: t("onboarding.opts.companyLooking.customerFb.d", null, "From real buyers") },
  { v: "packaging", t: t("onboarding.opts.companyLooking.packaging.t", null, "Packaging evaluation"), d: t("onboarding.opts.companyLooking.packaging.d", null, "Shelf appeal & clarity") },
  { v: "brand", t: t("onboarding.opts.companyLooking.brand.t", null, "Brand perception"), d: t("onboarding.opts.companyLooking.brand.d", null, "How you're seen") },
  { v: "pricing", t: t("onboarding.opts.companyLooking.pricing.t", null, "Pricing validation"), d: t("onboarding.opts.companyLooking.pricing.d", null, "Willingness to pay") },
  { v: "ad", t: t("onboarding.opts.companyLooking.ad.t", null, "Advertising feedback"), d: t("onboarding.opts.companyLooking.ad.d", null, "Message & creative") },
  { v: "ux", t: t("onboarding.opts.companyLooking.ux.t", null, "UX evaluation"), d: t("onboarding.opts.companyLooking.ux.d", null, "Usability & flow") },
  { v: "csat", t: t("onboarding.opts.companyLooking.csat.t", null, "Customer satisfaction"), d: t("onboarding.opts.companyLooking.csat.d", null, "Loyalty studies") },
  { v: "market", t: t("onboarding.opts.companyLooking.market.t", null, "Market research"), d: t("onboarding.opts.companyLooking.market.d", null, "Trends & demand") },
  { v: "focus", t: t("onboarding.opts.companyLooking.focus.t", null, "Focus groups"), d: t("onboarding.opts.companyLooking.focus.d", null, "Moderated discussion") },
  { v: "interview", t: t("onboarding.opts.companyLooking.interview.t", null, "Interview participants"), d: t("onboarding.opts.companyLooking.interview.d", null, "1:1 conversations") },
  { v: "other-c", t: t("onboarding.opts.companyLooking.other.t", null, "Other"), d: t("onboarding.opts.companyLooking.other.d", null, "Something else") },
];
export const PRODUCT_STAGES = (t) => [
  { v: "concept", t: t("onboarding.opts.productStages.concept.t", null, "Concept"), d: t("onboarding.opts.productStages.concept.d", null, "Still an idea") },
  { v: "prototype", t: t("onboarding.opts.productStages.prototype.t", null, "Prototype"), d: t("onboarding.opts.productStages.prototype.d", null, "Rough build") },
  { v: "pilot", t: t("onboarding.opts.productStages.pilot.t", null, "Pilot"), d: t("onboarding.opts.productStages.pilot.d", null, "Limited release") },
  { v: "ready", t: t("onboarding.opts.productStages.ready.t", null, "Market ready"), d: t("onboarding.opts.productStages.ready.d", null, "Ready to ship") },
  { v: "existing", t: t("onboarding.opts.productStages.existing.t", null, "Existing"), d: t("onboarding.opts.productStages.existing.d", null, "Already live") },
];
export const VOLUME_COMPANY = ["10–50", "50–100", "100–500", "500–1000", "1000+"];

export const RES_DESIGNATIONS = (t) => [
  t("onboarding.opts.resDesignations.0", null, "Student"),
  t("onboarding.opts.resDesignations.1", null, "Research Scholar"),
  t("onboarding.opts.resDesignations.2", null, "PhD Scholar"),
  t("onboarding.opts.resDesignations.3", null, "Assistant Professor"),
  t("onboarding.opts.resDesignations.4", null, "Associate Professor"),
  t("onboarding.opts.resDesignations.5", null, "Professor"),
  t("onboarding.opts.resDesignations.6", null, "Research Associate"),
  t("onboarding.opts.resDesignations.7", null, "Independent Researcher"),
];
export const QUALIFICATIONS = (t) => [
  t("onboarding.opts.qualifications.0", null, "Bachelor's"),
  t("onboarding.opts.qualifications.1", null, "Master's"),
  t("onboarding.opts.qualifications.2", null, "PhD"),
  t("onboarding.opts.qualifications.3", null, "Post Doctorate"),
];
export const RESEARCH_AREAS = (t) => [
  t("onboarding.opts.researchAreas.0", null, "Entrepreneurship"),
  t("onboarding.opts.researchAreas.1", null, "Healthcare"),
  t("onboarding.opts.researchAreas.2", null, "Education"),
  t("onboarding.opts.researchAreas.3", null, "Technology"),
  t("onboarding.opts.researchAreas.4", null, "AI"),
  t("onboarding.opts.researchAreas.5", null, "Finance"),
  t("onboarding.opts.researchAreas.6", null, "Consumer Behaviour"),
  t("onboarding.opts.researchAreas.7", null, "Public Policy"),
  t("onboarding.opts.researchAreas.8", null, "Social Sciences"),
  t("onboarding.opts.researchAreas.9", null, "Psychology"),
  t("onboarding.opts.researchAreas.10", null, "Environment"),
  t("onboarding.opts.researchAreas.11", null, "Other"),
];
export const SUPPORT_TYPES = (t) => [
  { v: "survey", t: t("onboarding.opts.supportTypes.survey.t", null, "Survey respondents"), d: t("onboarding.opts.supportTypes.survey.d", null, "Structured questionnaires") },
  { v: "interview", t: t("onboarding.opts.supportTypes.interview.t", null, "Interview participants"), d: t("onboarding.opts.supportTypes.interview.d", null, "In-depth 1:1s") },
  { v: "focus", t: t("onboarding.opts.supportTypes.focus.t", null, "Focus group participants"), d: t("onboarding.opts.supportTypes.focus.d", null, "Moderated groups") },
  { v: "experiment", t: t("onboarding.opts.supportTypes.experiment.t", null, "Experimental participants"), d: t("onboarding.opts.supportTypes.experiment.d", null, "Controlled studies") },
  { v: "eval", t: t("onboarding.opts.supportTypes.eval.t", null, "Product evaluation"), d: t("onboarding.opts.supportTypes.eval.d", null, "Test & assess") },
  { v: "longitudinal", t: t("onboarding.opts.supportTypes.longitudinal.t", null, "Longitudinal study"), d: t("onboarding.opts.supportTypes.longitudinal.d", null, "Repeated over time") },
  { v: "case", t: t("onboarding.opts.supportTypes.case.t", null, "Case study participants"), d: t("onboarding.opts.supportTypes.case.d", null, "Deep single cases") },
];
export const ETHICS_OPTIONS = (t) => [
  { v: "yes", t: t("onboarding.opts.ethics.yes.t", null, "Yes"), d: t("onboarding.opts.ethics.yes.d", null, "Already approved") },
  { v: "process", t: t("onboarding.opts.ethics.process.t", null, "In process"), d: t("onboarding.opts.ethics.process.d", null, "Under review") },
  { v: "no", t: t("onboarding.opts.ethics.no.t", null, "No"), d: t("onboarding.opts.ethics.no.d", null, "Not required / yet") },
];
export const RESEARCH_PROFILES = ["Google Scholar", "ORCID", "Scopus Author ID", "ResearchGate", "LinkedIn"];
export const ADDITIONAL_FILTERS = (t) => [
  t("onboarding.opts.additionalFilters.0", null, "Students"),
  t("onboarding.opts.additionalFilters.1", null, "Entrepreneurs"),
  t("onboarding.opts.additionalFilters.2", null, "Teachers"),
  t("onboarding.opts.additionalFilters.3", null, "Healthcare professionals"),
  t("onboarding.opts.additionalFilters.4", null, "Startup founders"),
  t("onboarding.opts.additionalFilters.5", null, "Homemakers"),
  t("onboarding.opts.additionalFilters.6", null, "Government employees"),
  t("onboarding.opts.additionalFilters.7", null, "Any"),
];
export const SAMPLE_SIZES = ["< 50", "50–100", "100–250", "250–500", "500–1000", "1000+"];

export const ORG_TYPES = (t) => [
  t("onboarding.opts.orgTypes.0", null, "NGO"),
  t("onboarding.opts.orgTypes.1", null, "Government Department"),
  t("onboarding.opts.orgTypes.2", null, "Foundation"),
  t("onboarding.opts.orgTypes.3", null, "Incubator"),
  t("onboarding.opts.orgTypes.4", null, "Accelerator"),
  t("onboarding.opts.orgTypes.5", null, "CSR Division"),
  t("onboarding.opts.orgTypes.6", null, "Community Organization"),
  t("onboarding.opts.orgTypes.7", null, "International Agency"),
  t("onboarding.opts.orgTypes.8", null, "Other"),
];
export const ORG_LEARN = (t) => [
  { v: "community", t: t("onboarding.opts.orgLearn.community.t", null, "Community feedback"), d: t("onboarding.opts.orgLearn.community.d", null, "From the people you serve") },
  { v: "policy", t: t("onboarding.opts.orgLearn.policy.t", null, "Policy feedback"), d: t("onboarding.opts.orgLearn.policy.d", null, "On rules & schemes") },
  { v: "opinion", t: t("onboarding.opts.orgLearn.opinion.t", null, "Public opinion"), d: t("onboarding.opts.orgLearn.opinion.d", null, "Sentiment at scale") },
  { v: "awareness", t: t("onboarding.opts.orgLearn.awareness.t", null, "Awareness assessment"), d: t("onboarding.opts.orgLearn.awareness.d", null, "What people know") },
  { v: "program", t: t("onboarding.opts.orgLearn.program.t", null, "Program evaluation"), d: t("onboarding.opts.orgLearn.program.d", null, "Is it working?") },
  { v: "impact", t: t("onboarding.opts.orgLearn.impact.t", null, "Impact assessment"), d: t("onboarding.opts.orgLearn.impact.d", null, "Outcomes & change") },
  { v: "beneficiary", t: t("onboarding.opts.orgLearn.beneficiary.t", null, "Beneficiary feedback"), d: t("onboarding.opts.orgLearn.beneficiary.d", null, "From recipients") },
  { v: "citizen", t: t("onboarding.opts.orgLearn.citizen.t", null, "Citizen feedback"), d: t("onboarding.opts.orgLearn.citizen.d", null, "Civic voices") },
  { v: "social", t: t("onboarding.opts.orgLearn.social.t", null, "Social research"), d: t("onboarding.opts.orgLearn.social.d", null, "Studies & surveys") },
  { v: "needs", t: t("onboarding.opts.orgLearn.needs.t", null, "Needs assessment"), d: t("onboarding.opts.orgLearn.needs.d", null, "Gaps & priorities") },
];
export const GEO_AREA = (t) => [
  { v: "local", t: t("onboarding.opts.geoArea.local.t", null, "Local"), d: t("onboarding.opts.geoArea.local.d", null, "Neighbourhood / town") },
  { v: "district", t: t("onboarding.opts.geoArea.district.t", null, "District"), d: t("onboarding.opts.geoArea.district.d", null, "A district") },
  { v: "state", t: t("onboarding.opts.geoArea.state.t", null, "State"), d: t("onboarding.opts.geoArea.state.d", null, "State-wide") },
  { v: "national", t: t("onboarding.opts.geoArea.national.t", null, "National"), d: t("onboarding.opts.geoArea.national.d", null, "Country-wide") },
  { v: "intl", t: t("onboarding.opts.geoArea.intl.t", null, "International"), d: t("onboarding.opts.geoArea.intl.d", null, "Multiple countries") },
];
export const ORG_TARGET = (t) => [
  t("onboarding.opts.orgTarget.0", null, "Students"),
  t("onboarding.opts.orgTarget.1", null, "Youth"),
  t("onboarding.opts.orgTarget.2", null, "Women"),
  t("onboarding.opts.orgTarget.3", null, "Farmers"),
  t("onboarding.opts.orgTarget.4", null, "Entrepreneurs"),
  t("onboarding.opts.orgTarget.5", null, "Teachers"),
  t("onboarding.opts.orgTarget.6", null, "Government employees"),
  t("onboarding.opts.orgTarget.7", null, "Healthcare workers"),
  t("onboarding.opts.orgTarget.8", null, "General public"),
];
export const ORG_SCALE = ["50–100", "100–500", "500–1000", "1000–5000", "5000+"];

export const OCC_SIMPLE = ["Student", "Working Professional", "Entrepreneur", "Homemaker", "Retired", "Any"];
export const LANGUAGES = {
  india: ["Hindi", "English", "Tamil", "Telugu", "Kannada", "Bengali", "Marathi", "Gujarati", "Malayalam", "Punjabi"],
  global: ["English", "Spanish", "French", "German", "Mandarin", "Arabic", "Portuguese", "Japanese"],
};

export const AGE_BANDS = ["18–24", "25–34", "35–44", "45–54", "55+"];
export const GENDERS = ["Any", "Female", "Male", "Non-binary"];
export const OCCUPATIONS = ["Students", "Software engineers", "Product managers", "Designers", "Founders", "Marketers", "Researchers", "Healthcare pros", "Educators", "Finance pros", "Homemakers", "Retired"];
export const EDUCATIONS = ["High school", "Diploma", "Undergraduate", "Postgraduate", "PhD / Doctorate"];
export const INTERESTS = ["AI", "Startups", "Fitness", "Healthcare", "Education", "Finance", "Gaming", "Parenting", "Travel", "Fashion", "Food", "Sustainability"];
export const INCOME_BANDS = {
  india: ["< ₹3L", "₹3–6L", "₹6–12L", "₹12–25L", "₹25L–1Cr", "₹1Cr+"],
  global: ["< $25k", "$25–50k", "$50–100k", "$100–200k", "$200k+"],
};
export const GEO_INDIA = {
  "Karnataka": ["Bengaluru Urban", "Mysuru", "Mangaluru", "Hubli–Dharwad"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik"],
  "Delhi (NCT)": ["New Delhi", "South Delhi", "North Delhi", "West Delhi"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem"],
  "Telangana": ["Hyderabad", "Rangareddy", "Warangal", "Karimnagar"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
  "West Bengal": ["Kolkata", "Howrah", "Siliguri", "Durgapur"],
  "Uttar Pradesh": ["Gautam Buddha Nagar (Noida)", "Lucknow", "Kanpur", "Ghaziabad"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota"],
  "Kerala": ["Ernakulam (Kochi)", "Thiruvananthapuram", "Kozhikode", "Thrissur"],
};
export const GEO_GLOBAL = {
  "United States": ["California", "New York", "Texas", "Washington", "Massachusetts", "Other"],
  "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland"],
  "Canada": ["Ontario", "British Columbia", "Quebec", "Alberta"],
  "Germany": ["Bavaria", "Berlin", "North Rhine-Westphalia", "Hamburg"],
  "France": ["Île-de-France", "Auvergne-Rhône-Alpes", "Occitanie", "Other"],
  "Netherlands": ["North Holland", "South Holland", "Utrecht", "Other"],
  "Singapore": ["Central", "East", "North-East", "West"],
  "Australia": ["New South Wales", "Victoria", "Queensland", "Western Australia"],
  "United Arab Emirates": ["Dubai", "Abu Dhabi", "Sharjah", "Other"],
  "Brazil": ["São Paulo", "Rio de Janeiro", "Minas Gerais", "Other"],
};

// Live audience-reach estimate — ported verbatim from the design package's
// foReach() formula. This narrows a base pool multiplicatively as filters
// are added; it's a UX device to make targeting feel responsive, not a
// query against real validator records (ValidationCrew has no live pool to
// match against yet for these new personas).
export function foReach(d, region) {
  let pool = region === "india" ? 184000 : 246000;
  const narrow = (arr, perPick, floor) => { if (arr && arr.length) pool *= Math.max(floor, Math.min(1, arr.length * perPick)); };
  narrow(d.ageBands, 0.26, 0.18);
  if (d.genders && d.genders.length && !d.genders.includes("Any")) pool *= 0.55;
  if (d.country) pool *= 0.62;
  if (d.state) pool *= 0.4;
  if (d.district) pool *= 0.55;
  narrow(d.occupations, 0.2, 0.12);
  narrow(d.educations, 0.34, 0.3);
  narrow(d.incomeBands, 0.3, 0.22);
  narrow(d.interests, 0.22, 0.16);
  narrow(d.languages, 0.34, 0.4);
  if ((d.filters && d.filters.length) || (d.targetGroups && d.targetGroups.length)) pool *= 0.62;
  return Math.max(120, Math.round(pool));
}

export function foLabelList(opts, sel) {
  const arr = sel || [];
  if (!arr.length) return "—";
  const names = opts.filter((o) => arr.includes(o.v)).map((o) => o.t);
  return names.slice(0, 2).join(", ") + (names.length > 2 ? ` +${names.length - 2}` : "");
}

export const FREQUENCY = (t) => [
  { v: "once", t: t("onboarding.opts.frequency.once.t", null, "Just once"), d: t("onboarding.opts.frequency.once.d", null, "A single study") },
  { v: "monthly", t: t("onboarding.opts.frequency.monthly.t", null, "Monthly"), d: t("onboarding.opts.frequency.monthly.d", null, "Regular pulse") },
  { v: "quarterly", t: t("onboarding.opts.frequency.quarterly.t", null, "Quarterly"), d: t("onboarding.opts.frequency.quarterly.d", null, "Every quarter") },
  { v: "frequent", t: t("onboarding.opts.frequency.frequent.t", null, "Frequently"), d: t("onboarding.opts.frequency.frequent.d", null, "Always-on") },
];
export const PREFERRED_METHODS = (t) => [
  { v: "surveys", t: t("onboarding.opts.preferredMethods.surveys.t", null, "Online surveys"), d: t("onboarding.opts.preferredMethods.surveys.d", null, "Quick & scalable") },
  { v: "testing", t: t("onboarding.opts.preferredMethods.testing.t", null, "Product testing"), d: t("onboarding.opts.preferredMethods.testing.d", null, "Hands-on trials") },
  { v: "interviews", t: t("onboarding.opts.preferredMethods.interviews.t", null, "Interviews"), d: t("onboarding.opts.preferredMethods.interviews.d", null, "Deep 1:1s") },
  { v: "focus", t: t("onboarding.opts.preferredMethods.focus.t", null, "Focus groups"), d: t("onboarding.opts.preferredMethods.focus.d", null, "Moderated groups") },
  { v: "samples", t: t("onboarding.opts.preferredMethods.samples.t", null, "Sample distribution"), d: t("onboarding.opts.preferredMethods.samples.d", null, "Ship products out") },
  { v: "video", t: t("onboarding.opts.preferredMethods.video.t", null, "Video calls"), d: t("onboarding.opts.preferredMethods.video.d", null, "Face to face") },
  { v: "community", t: t("onboarding.opts.preferredMethods.community.t", null, "Community discussions"), d: t("onboarding.opts.preferredMethods.community.d", null, "Ongoing threads") },
];
