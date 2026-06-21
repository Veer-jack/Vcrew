// Option sets + audience math for the Founder/Company/Researcher/Organization
// onboarding wizards. Ported from the design package's prototype data files,
// trimmed of pure visual flourish (hidden trust-score tiers, document upload,
// the literal animated radar/avatar scan) but keeping the real option lists,
// copy, validation rules, and the live audience-reach formula intact.

export const DESIGNATIONS = ["Founder & CEO", "Co-founder", "Product Manager", "Head of Product", "Growth / Marketing", "Design Lead", "Engineering Lead", "Operations", "Other"];
export const COMPANY_SIZES = [
  { v: "solo", t: "Solo founder", d: "Just me for now" },
  { v: "2-10", t: "2–10", d: "Early team" },
  { v: "11-50", t: "11–50", d: "Scaling up" },
  { v: "51-200", t: "51–200", d: "Established" },
  { v: "ent", t: "Enterprise", d: "200+ people" },
];
export const COMPANY_STAGES = [
  { v: "idea", t: "Idea", d: "Still on paper" },
  { v: "proto", t: "Prototype", d: "Rough build" },
  { v: "mvp", t: "MVP", d: "In market" },
  { v: "growth", t: "Growth", d: "Scaling revenue" },
  { v: "ent", t: "Enterprise", d: "Mature org" },
];
export const INDUSTRIES = ["Technology / SaaS", "Fintech", "Healthcare", "E-commerce / Retail", "AI / ML", "Consumer apps", "Education", "Media & Entertainment", "Manufacturing", "Real estate", "Logistics", "Gaming", "Other"];
export const VALIDATION_TYPES = [
  { v: "idea", t: "Idea", d: "Concept & positioning" },
  { v: "product", t: "Product", d: "Features & experience" },
  { v: "app", t: "Mobile app", d: "iOS / Android flows" },
  { v: "web", t: "Website", d: "Landing & funnel" },
  { v: "saas", t: "SaaS platform", d: "Onboarding & retention" },
  { v: "ai", t: "AI product", d: "Output quality & trust" },
  { v: "physical", t: "Physical product", d: "Form, fit & function" },
  { v: "packaging", t: "Packaging", d: "Shelf appeal & clarity" },
  { v: "pricing", t: "Pricing", d: "Willingness to pay" },
  { v: "campaign", t: "Marketing campaign", d: "Message & creative" },
  { v: "cx", t: "Customer experience", d: "Support & journey" },
];

export const COMPANY_INDUSTRIES = ["FMCG", "SaaS", "Healthcare", "Education", "Finance", "Manufacturing", "Retail", "E-commerce", "Real Estate", "Automotive", "Other"];
export const EMP_SIZES = [
  { v: "1-10", t: "1–10", d: "Startup" },
  { v: "11-50", t: "11–50", d: "Small" },
  { v: "51-200", t: "51–200", d: "Mid-size" },
  { v: "201-1000", t: "201–1000", d: "Large" },
  { v: "1000+", t: "1000+", d: "Enterprise" },
];
export const COMPANY_LOOKING = [
  { v: "product-fb", t: "Product feedback", d: "Features & experience" },
  { v: "product-test", t: "Product testing", d: "Hands-on trials" },
  { v: "customer-fb", t: "Customer feedback", d: "From real buyers" },
  { v: "packaging", t: "Packaging evaluation", d: "Shelf appeal & clarity" },
  { v: "brand", t: "Brand perception", d: "How you're seen" },
  { v: "pricing", t: "Pricing validation", d: "Willingness to pay" },
  { v: "ad", t: "Advertising feedback", d: "Message & creative" },
  { v: "ux", t: "UX evaluation", d: "Usability & flow" },
  { v: "csat", t: "Customer satisfaction", d: "Loyalty studies" },
  { v: "market", t: "Market research", d: "Trends & demand" },
  { v: "focus", t: "Focus groups", d: "Moderated discussion" },
  { v: "interview", t: "Interview participants", d: "1:1 conversations" },
  { v: "other-c", t: "Other", d: "Something else" },
];
export const PRODUCT_STAGES = [
  { v: "concept", t: "Concept", d: "Still an idea" },
  { v: "prototype", t: "Prototype", d: "Rough build" },
  { v: "pilot", t: "Pilot", d: "Limited release" },
  { v: "ready", t: "Market ready", d: "Ready to ship" },
  { v: "existing", t: "Existing", d: "Already live" },
];
export const VOLUME_COMPANY = ["10–50", "50–100", "100–500", "500–1000", "1000+"];

export const RES_DESIGNATIONS = ["Student", "Research Scholar", "PhD Scholar", "Assistant Professor", "Associate Professor", "Professor", "Research Associate", "Independent Researcher"];
export const QUALIFICATIONS = ["Bachelor's", "Master's", "PhD", "Post Doctorate"];
export const RESEARCH_AREAS = ["Entrepreneurship", "Healthcare", "Education", "Technology", "AI", "Finance", "Consumer Behaviour", "Public Policy", "Social Sciences", "Psychology", "Environment", "Other"];
export const SUPPORT_TYPES = [
  { v: "survey", t: "Survey respondents", d: "Structured questionnaires" },
  { v: "interview", t: "Interview participants", d: "In-depth 1:1s" },
  { v: "focus", t: "Focus group participants", d: "Moderated groups" },
  { v: "experiment", t: "Experimental participants", d: "Controlled studies" },
  { v: "eval", t: "Product evaluation", d: "Test & assess" },
  { v: "longitudinal", t: "Longitudinal study", d: "Repeated over time" },
  { v: "case", t: "Case study participants", d: "Deep single cases" },
];
export const ETHICS_OPTIONS = [
  { v: "yes", t: "Yes", d: "Already approved" },
  { v: "process", t: "In process", d: "Under review" },
  { v: "no", t: "No", d: "Not required / yet" },
];
export const RESEARCH_PROFILES = ["Google Scholar", "ORCID", "Scopus Author ID", "ResearchGate", "LinkedIn"];
export const ADDITIONAL_FILTERS = ["Students", "Entrepreneurs", "Teachers", "Healthcare professionals", "Startup founders", "Homemakers", "Government employees", "Any"];
export const SAMPLE_SIZES = ["< 50", "50–100", "100–250", "250–500", "500–1000", "1000+"];

export const ORG_TYPES = ["NGO", "Government Department", "Foundation", "Incubator", "Accelerator", "CSR Division", "Community Organization", "International Agency", "Other"];
export const ORG_LEARN = [
  { v: "community", t: "Community feedback", d: "From the people you serve" },
  { v: "policy", t: "Policy feedback", d: "On rules & schemes" },
  { v: "opinion", t: "Public opinion", d: "Sentiment at scale" },
  { v: "awareness", t: "Awareness assessment", d: "What people know" },
  { v: "program", t: "Program evaluation", d: "Is it working?" },
  { v: "impact", t: "Impact assessment", d: "Outcomes & change" },
  { v: "beneficiary", t: "Beneficiary feedback", d: "From recipients" },
  { v: "citizen", t: "Citizen feedback", d: "Civic voices" },
  { v: "social", t: "Social research", d: "Studies & surveys" },
  { v: "needs", t: "Needs assessment", d: "Gaps & priorities" },
];
export const GEO_AREA = [
  { v: "local", t: "Local", d: "Neighbourhood / town" },
  { v: "district", t: "District", d: "A district" },
  { v: "state", t: "State", d: "State-wide" },
  { v: "national", t: "National", d: "Country-wide" },
  { v: "intl", t: "International", d: "Multiple countries" },
];
export const ORG_TARGET = ["Students", "Youth", "Women", "Farmers", "Entrepreneurs", "Teachers", "Government employees", "Healthcare workers", "General public"];
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

export const FREQUENCY = [
  { v: "once", t: "Just once", d: "A single study" },
  { v: "monthly", t: "Monthly", d: "Regular pulse" },
  { v: "quarterly", t: "Quarterly", d: "Every quarter" },
  { v: "frequent", t: "Frequently", d: "Always-on" },
];
export const PREFERRED_METHODS = [
  { v: "surveys", t: "Online surveys", d: "Quick & scalable" },
  { v: "testing", t: "Product testing", d: "Hands-on trials" },
  { v: "interviews", t: "Interviews", d: "Deep 1:1s" },
  { v: "focus", t: "Focus groups", d: "Moderated groups" },
  { v: "samples", t: "Sample distribution", d: "Ship products out" },
  { v: "video", t: "Video calls", d: "Face to face" },
  { v: "community", t: "Community discussions", d: "Ongoing threads" },
];
