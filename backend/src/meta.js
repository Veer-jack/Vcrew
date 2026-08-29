// Static taxonomy shared by the builder app. Mirrors the design system's
// category/type/reward vocabulary so the wizard + filters stay consistent.

export const CATEGORIES = [
  { id: "feedback",  label: "Product Feedback",   icon: "message", desc: "Structured opinions on a live product" },
  { id: "testing",   label: "Product Testing",    icon: "flask",   desc: "Hands-on usage with task completion" },
  { id: "website",   label: "Website Review",     icon: "browser", desc: "First-impression & usability audit" },
  { id: "app",       label: "Mobile App Testing", icon: "phone",   desc: "Install, flows & bug capture" },
  { id: "research",  label: "Research Study",     icon: "chart",   desc: "Longitudinal or diary research" },
  { id: "focus",     label: "Focus Group",        icon: "users",   desc: "Moderated group discussion" },
  { id: "interview", label: "Interview",          icon: "mic",     desc: "1:1 depth conversation" },
  { id: "trial",     label: "Product Trial",      icon: "gift",    desc: "Extended free trial w/ feedback" },
  { id: "sample",    label: "Sample Distribution",icon: "box",     desc: "Ship physical samples to homes" },
];

export const PTYPES = [
  { id: "survey",    label: "Written Survey",          icon: "list",    desc: "10–15 structured questions",  est: "8 min" },
  { id: "ptest",     label: "Guided Task Flow",        icon: "flask",   desc: "Guided tasks + feedback",      est: "25 min" },
  { id: "interview", label: "Live 1:1 Video Call",     icon: "mic",     desc: "Scheduled 1:1 call",           est: "30 min" },
  { id: "focus",     label: "Moderated Group Session", icon: "users",   desc: "Moderated 6–8 person session", est: "45 min" },
  { id: "trial",     label: "Multi-Day Diary Study",   icon: "gift",    desc: "Use over several days",        est: "7 days" },
  { id: "video",     label: "Screen Recording Walkthrough", icon: "video", desc: "Recorded walkthrough",      est: "20 min" },
  { id: "webtest",   label: "Website Navigation Audit",icon: "browser", desc: "Think-aloud browse",           est: "15 min" },
  { id: "apptest",   label: "App Install & Usage Test",icon: "phone",   desc: "Install + task flows",         est: "20 min" },
];

// Per-participation-type guidance for AI task generation: how tasks of this
// type should read, whether proof is required by default, and a hand-written
// fallback task set used if AI generation fails (see generate-tasks route).
export const TASK_GUIDANCE = {
  survey: {
    promptFragment: "This mission is a SURVEY. Generate direct questionnaire-style tasks — no hands-on product interaction steps. Each task is a short thematic section containing only questions. Steps should just say to read and answer the questions. Do not require screenshot proof.",
    proofDefault: null,
    taskCount: [3, 5],
    // Each section = a topic area the AI should consider covering.
    // "required: true" sections MUST appear. Others are picked based on
    // product complexity, up to taskCount max.
    sections: [
      {
        id: "first_impressions",
        label: "First impressions & appeal",
        required: true,
        questionTypes: ["rating", "text"],
      },
      {
        id: "problem_fit",
        label: "Problem fit — does this solve a real problem",
        required: false,
        questionTypes: ["likert", "text"],
      },
      {
        id: "pricing_positioning",
        label: "Pricing & positioning",
        required: false,
        questionTypes: ["multiple_choice", "ranking", "fill_in_blank"],
      },
      {
        id: "sentiment_recommend",
        label: "Overall sentiment & likelihood to recommend",
        required: true,
        questionTypes: ["rating", "text", "yes_no_detail"],
      },
    ],
    fallback: [
      {
        id: 1, title: "Product awareness & first impressions", severity: "imp", section: "first_impressions",
        steps: ["Read the product description provided", "Answer the following questions based on your honest first impression"],
        questions: [
          { id: "q1", text: "How appealing does this product sound to you?", type: "rating", scale: 5 },
          { id: "q2", text: "Would you consider using this today?", type: "multiple_choice", options: ["Yes, definitely", "Maybe", "No"] },
          { id: "q3", text: "What's the first thing that comes to mind when you read this?", type: "text" },
        ],
        proof: null, min_time_seconds: 180,
      },
      {
        id: 2, title: "Willingness to pay & positioning", severity: "imp", section: "pricing_positioning",
        steps: ["Consider the pricing or value described", "Answer honestly about what you'd realistically pay"],
        questions: [
          { id: "q4", text: "What's a fair price for this?", type: "multiple_choice", options: ["I wouldn't pay for it", "Low price", "Mid-range price", "Premium price"] },
          { id: "q5", text: "Would you recommend this to a friend?", type: "yes_no_detail" },
          { id: "q6", text: "How well does this solve a real problem for you?", type: "rating", scale: 5 },
        ],
        proof: null, min_time_seconds: 150,
      },
    ],
  },

  ptest: {
    promptFragment: "This mission is hands-on PRODUCT TESTING. Generate tasks with concrete step-by-step actions the validator must physically perform in the product, and require screenshot proof for each task.",
    proofDefault: "screenshot",
    taskCount: [4, 6],
    sections: [
      {
        id: "first_impression",
        label: "First impression before doing anything",
        required: true,
        questionTypes: ["rating", "text"],
      },
      {
        id: "core_flow",
        label: "Core flow — complete the primary action",
        required: true,
        questionTypes: ["yes_no_detail", "rating", "text"],
      },
      {
        id: "edge_cases_errors",
        label: "Edge cases & error handling",
        required: true,
        questionTypes: ["yes_no_detail", "text"],
      },
      {
        id: "trust_credibility",
        label: "Trust, pricing & data-handling signals",
        required: false,
        questionTypes: ["likert", "multiple_choice"],
      },
      {
        id: "feature_depth",
        label: "Secondary features beyond the core loop",
        required: false,
        questionTypes: ["rating", "text"],
      },
      {
        id: "sentiment_recommend",
        label: "Overall verdict & what would kill the deal",
        required: true,
        questionTypes: ["rating", "text"],
      },
    ],
    fallback: [
      {
        id: 1, title: "Complete the core product flow", severity: "crit", section: "core_flow",
        steps: ["Open the product", "Complete the primary action it's designed for (e.g. sign up, create, purchase)", "Note anywhere you got stuck or confused"],
        questions: [
          { id: "q1", text: "How intuitive was the core flow?", type: "rating", scale: 5 },
          { id: "q2", text: "Did you hit any errors or dead ends?", type: "yes_no_detail" },
          { id: "q3", text: "What would you change first?", type: "text" },
        ],
        proof: "screenshot", min_time_seconds: 240,
      },
      {
        id: 2, title: "Edge case & error handling", severity: "imp", section: "edge_cases_errors",
        steps: ["Try an invalid input somewhere in the flow (blank field, wrong format)", "Try navigating away mid-flow and returning", "Note what happens"],
        questions: [
          { id: "q4", text: "Did the product handle your invalid input gracefully?", type: "yes_no_detail" },
          { id: "q5", text: "How clear were any error messages?", type: "rating", scale: 5 },
        ],
        proof: "screenshot", min_time_seconds: 200,
      },
    ],
  },

  interview: {
    promptFragment: "This mission is a 1:1 INTERVIEW. Generate open-ended, conversational tasks written as if the validator is answering an interviewer's questions in detail. Prioritize text questions over multiple choice or rating. Do not require screenshot proof — there is no live call recording in this flow.",
    proofDefault: null,
    taskCount: [3, 4],
    sections: [
      {
        id: "background_context",
        label: "Background & current behavior",
        required: true,
        questionTypes: ["text"],
      },
      {
        id: "problem_validation",
        label: "Do they actually have this problem today",
        required: true,
        questionTypes: ["text", "likert"],
      },
      {
        id: "reaction_to_solution",
        label: "Gut reaction once shown the product/idea",
        required: false,
        questionTypes: ["text", "rating"],
      },
      {
        id: "sentiment_recommend",
        label: "Would they adopt it — dealbreakers",
        required: true,
        questionTypes: ["text", "rating"],
      },
    ],
    fallback: [
      {
        id: 1, title: "Background & context", severity: "imp", section: "background_context",
        steps: ["Answer based on your real day-to-day experience"],
        questions: [
          { id: "q1", text: "Walk me through how you currently handle this problem, step by step.", type: "text" },
          { id: "q2", text: "What tools or workarounds do you use today?", type: "text" },
        ],
        proof: null, min_time_seconds: 180,
      },
      {
        id: 2, title: "Reaction & willingness to adopt", severity: "imp", section: "sentiment_recommend",
        steps: ["Consider the product/idea described", "Answer candidly, including any hesitations"],
        questions: [
          { id: "q3", text: "What's the single biggest reason you would NOT adopt this?", type: "text" },
          { id: "q4", text: "How likely are you to actually switch from your current approach?", type: "rating", scale: 5 },
        ],
        proof: null, min_time_seconds: 200,
      },
    ],
  },
};

/* --------------------------------------------------------------------------
   buildTaskPrompt — now section-driven instead of a bare task count.
   The model is told: here are the candidate topic areas for this mission
   type, some are mandatory, pick from the rest based on how complex the
   product is, and stay within the taskCount range. This guarantees
   structural coverage (no more "5 tasks that all probe the same flow")
   while keeping the flexible task count you asked for.
-------------------------------------------------------------------------- */
export function buildTaskPrompt({ description, url, platform, goals, targetUsers, category, ptype, urlContext }) {
  const cat = CATEGORIES.find(c => c.id === category);
  const guidance = Object.prototype.hasOwnProperty.call(TASK_GUIDANCE, ptype) ? TASK_GUIDANCE[ptype] : undefined;

  const catLine = cat ? `\nMISSION CATEGORY: ${cat.label} — ${cat.desc}` : "";
  const typeLine = guidance ? `\nMISSION TYPE GUIDANCE: ${guidance.promptFragment}` : "";
  const [minCount, maxCount] = guidance ? guidance.taskCount : [5, 7];

  const hasUrlContext = urlContext && (urlContext.title || urlContext.description || (urlContext.headings && urlContext.headings.length > 0));
  const urlContextLine = hasUrlContext
    ? `\n\nWEBSITE CONTEXT (fetched from the provided URL):\nTitle: "${urlContext.title || "Not available"}"\nDescription: "${urlContext.description || "Not available"}"\nKey sections: ${urlContext.headings && urlContext.headings.length ? urlContext.headings.join(", ") : "Not available"}`
    : "";

  // Build the section menu the model must choose from.
  const sections = guidance?.sections || [];
  const requiredSections = sections.filter(s => s.required);
  const optionalSections = sections.filter(s => !s.required);

  const sectionMenuLines = sections.length
    ? sections.map(s =>
        `- "${s.id}" (${s.required ? "REQUIRED" : "optional"}): ${s.label}. Preferred question types: ${s.questionTypes.join(", ")}.`
      ).join("\n")
    : "";

  const sectionInstructions = sections.length
    ? `\n\nTOPIC AREAS (sections) TO DRAW FROM:
${sectionMenuLines}

SECTION RULES:
- You MUST include one task for every REQUIRED section (${requiredSections.map(s => s.id).join(", ") || "none"}).
- Choose additional OPTIONAL sections ONLY if they are genuinely relevant to this specific product — do not include a section just to hit a higher count. A simple product should get fewer tasks; a complex product can use more.
- Total tasks must stay between ${minCount} and ${maxCount}.
- Each task's "section" field in the output JSON must be the exact section id it corresponds to.
- Never generate two tasks for the same section.
- For each task, choose question types primarily from that section's "Preferred question types" list — but you may mix in a text/open-ended question anywhere the product specifics call for it.`
    : `\n\nGenerate ${minCount}-${maxCount} tasks covering the product's core flow, first impressions, edge cases, and overall sentiment.`;

  return `You are a Principal QA Engineer with 15+ years of experience. You think like a seasoned tester who probes edge cases, data integrity issues, UX dead-ends, and moments where the product breaks trust with the user.

A founder needs expert validation for:

PRODUCT: ${description || "Not provided"}
URL: ${url || "Not provided"}
PLATFORM: ${platform || "Web"}
VALIDATION GOALS: ${goals || "Core flow, UX, edge cases"}
TARGET USERS: ${targetUsers || "General users"}${catLine}${typeLine}${urlContextLine}${sectionInstructions}

Generate PROFESSIONAL test cases a seasoned QA engineer would run. NOT beginner tasks like "open the app and browse". These are structured, methodical scenarios that stress-test the product deeply, matching the mission type guidance above.

RULES:
1. Task title must name the SPECIFIC flow or feature - never generic titles
2. Steps must match the mission type guidance above (e.g. a survey has no hands-on steps, a product test does)
3. Questions must be expert-level - not "was it easy" but "where specifically did friction occur"
4. Match each task to exactly one section id from the menu above

QUESTION QUALITY EXAMPLES:
BAD: "Was signup easy?" GOOD: "At which exact step did friction first occur and what caused it?"
BAD: "Did you like the design?" GOOD: "Which UI element felt most inconsistent with expectations?"

QUESTION TYPE REFERENCE:
- rating: numeric scale (needs "scale", e.g. 5 or 10)
- likert: agree/disagree style statement (needs "scale", typically 5)
- multiple_choice: single-select from options (needs "options" array)
- multiple_select: multi-select from options (needs "options" array)
- yes_no_detail: yes/no forced to explain why
- text: open-ended free response
- fill_in_blank: a sentence with a blank for the tester to complete (needs "prompt" with "___" marking the blank)
- ranking: order a list of items by preference (needs "options" array to rank)

Return ONLY valid JSON. No markdown, no backticks, no explanation. Use this exact schema:
{
  "tasks": [
    {
      "id": 1,
      "section": "section_id_from_menu",
      "title": "Task title",
      "severity": "crit",
      "steps": ["Step 1", "Step 2"],
      "questions": [
        { "id": "q1", "text": "Question text", "type": "rating", "scale": 5 },
        { "id": "q2", "text": "Question text", "type": "multiple_choice", "options": ["Option A", "Option B"] },
        { "id": "q3", "text": "Question text", "type": "yes_no_detail" },
        { "id": "q4", "text": "Complete this sentence honestly:", "type": "fill_in_blank", "prompt": "I almost didn't sign up because ___" },
        { "id": "q5", "text": "Rank these by importance to you", "type": "ranking", "options": ["Speed", "Price", "Design"] }
      ],
      "proof": "screenshot",
      "min_time_seconds": 180
    }
  ]
}

severity must be one of: crit, imp, nice
proof: "screenshot" or null — follow the mission type guidance's proof default above
Include 3-5 questions per task mixing types per that section's preferred types. Make tasks specific to the product described.`;
}

// Single source of truth for the platform fee charged on top of reward spend when a
// mission is published — read this instead of hardcoding 0.12 anywhere else.
export const PLATFORM_FEE_PCT = 0.12;

export const REWARDS = [
  { id: "free",   label: "Free",           icon: "heart", desc: "Goodwill / community love",  needsAmt: false },
  { id: "fixed",  label: "Fixed Reward",   icon: "coins", desc: "Cash to each participant",    needsAmt: true },
  { id: "sample", label: "Product Sample", icon: "box",   desc: "Ship the product itself",     needsAmt: false },
  { id: "gift",   label: "Gift Card",      icon: "gift",  desc: "Amazon / Flipkart voucher",   needsAmt: true },
];

export const FILTERS = {
  "ValidationCrew Role": [
    "Validator", "Tester", "User"
  ],
  Geography: {
    "Global & Remote": ["Worldwide", "Remote / Online only"],
    "India - 9 cities": ["India", "Bengaluru", "Mumbai", "Delhi NCR", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad", "Jaipur"],
    "Asia Pacific": ["Singapore", "Indonesia", "Malaysia", "Philippines", "Vietnam", "Thailand", "Japan", "South Korea", "Australia", "New Zealand"],
    "Americas": ["USA", "Canada", "Mexico", "Brazil", "Argentina", "Colombia"],
    "EMEA": ["UK", "Germany", "France", "Netherlands", "Spain", "Italy", "Sweden", "Denmark", "Poland", "UAE", "Saudi Arabia", "Israel", "Nigeria", "Kenya", "South Africa"],
    "Other": ["Other"]
  },
  Demographics: {
    "Age": ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
    "Gender": ["Male", "Female", "Non-binary", "Prefer not to say"],
    "Income Bracket": ["Under Rs2.5L", "Rs2.5L-5L", "Rs5L-10L", "Rs10L-20L", "Rs20L-50L", "Above Rs50L"],
    "Marital Status": ["Single", "Married", "Divorced", "Widowed", "In a relationship"],
    "Has Kids": ["Yes", "No"]
  },
  Professional: [
    "Product Manager", "UX / UI Designer", "Software Engineer", "Data Scientist", "QA / Test Engineer", 
    "DevOps", "Founder", "CXO", "Business Analyst", "Consultant", "Marketer", "Content Creator", "Sales", 
    "Customer Success", "Doctor", "Lawyer", "Finance", "HR", "Teacher", "Researcher", "Freelancer", "Student", "Other"
  ],
  Interests: {
    "Lifestyle": ["Fitness", "Yoga", "Outdoor activities", "Cooking", "Travel", "Gaming", "Reading", "Music", "Fashion", "Parenting", "Pets", "Tech", "Cinema", "Sports", "Social media", "Other"],
    "Industry": ["SaaS / B2B Software", "Fintech", "Healthcare", "EdTech", "E-commerce", "FMCG", "Automotive", "Real Estate", "Media", "AI / ML", "Logistics", "Manufacturing", "Government", "Non-profit", "Other"],
    "Product Types": ["Mobile apps iOS", "Mobile apps Android", "Web apps / SaaS", "AI / LLM products", "Fintech products", "Healthcare apps", "Developer tools", "Enterprise software", "Consumer apps", "Physical products", "Packaging", "Marketing campaigns", "Websites", "Other"]
  }
};

export const catOf = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[0];
export const ptypeOf = (id) => PTYPES.find(p => p.id === id) || PTYPES[0];

/* Simulated live audience pool — mirrors the wizard's live-matching estimate.
   `audience` is a map of filter group -> array of selected option strings. */
export function matchCount(audience = {}) {
  const POOL = 1284000;
  const groupFactor = (key, weight) => {
    const n = audience?.[key]?.length || 0;
    if (!n) return 1;
    return Math.min(1, weight * n + 0.06);
  };
  let f = POOL;
  f *= groupFactor("Geography", 0.11);
  f *= groupFactor("Demographics", 0.16);
  f *= groupFactor("Professional", 0.14);
  f *= groupFactor("ValidationCrew Role", 0.34);
  f *= groupFactor("Interests", 0.2);
  return Math.max(45, Math.round(f / 5) * 5);
}

export const HELP_ARTICLES = [
  { q: "How do I add funds to my wallet?", a: "Go to Wallet → Add funds. If card/UPI payments are configured, you can pay directly via card, UPI, or netbanking; otherwise funds are added for demo purposes.", cat: "Payments" },
  { q: "How are validators matched to my mission?", a: "Missions are matched to validators based on their expertise tags, past accuracy, and availability. You can also send direct invites from the Audience tab.", cat: "Missions" },
  { q: "What happens if I'm not satisfied with a submission?", a: "You can request changes or reject a submission with feedback before it's marked complete — this won't affect your wallet balance until you approve payment.", cat: "Missions" },
  { q: "How is pricing calculated for a mission?", a: "Pricing depends on mission type, number of participants, and turnaround time. You'll see an estimate before publishing, and funds are held in escrow until completion.", cat: "Payments" },
  { q: "Can I edit my workspace name or email?", a: "Yes — go to Settings → Edit profile to update your name, workspace name, and email address.", cat: "Account" },
  { q: "How do I add a phone number for sign-in?", a: "Go to Settings → Phone number → Add phone. Once verified, you can sign in with a code sent via SMS, and it's used for extra verification on wallet top-ups.", cat: "Account" },
];
