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
    promptFragment: "This mission is a SURVEY. Generate direct questionnaire-style tasks — no hands-on product interaction steps. Each task is a short thematic section (e.g. 'First impressions', 'Pricing & positioning') containing only questions. Steps should just say to read and answer the questions. Do not require screenshot proof.",
    proofDefault: null,
    taskCount: [3, 5],
    fallback: [
      {
        id: 1, title: "Product awareness & first impressions", severity: "imp",
        steps: ["Read the product description provided", "Answer the following questions based on your honest first impression"],
        questions: [
          { id: "q1", text: "How appealing does this product sound to you?", type: "rating", scale: 5 },
          { id: "q2", text: "Would you consider using this today?", type: "multiple_choice", options: ["Yes, definitely", "Maybe", "No"] },
          { id: "q3", text: "What's the first thing that comes to mind when you read this?", type: "text" },
        ],
        proof: null, min_time_seconds: 180,
      },
      {
        id: 2, title: "Willingness to pay & positioning", severity: "imp",
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
    fallback: [
      {
        id: 1, title: "Complete the core product flow", severity: "crit",
        steps: ["Open the product", "Complete the primary action it's designed for (e.g. sign up, create, purchase)", "Note anywhere you got stuck or confused"],
        questions: [
          { id: "q1", text: "How intuitive was the core flow?", type: "rating", scale: 5 },
          { id: "q2", text: "Did you hit any errors or dead ends?", type: "yes_no_detail" },
          { id: "q3", text: "What would you change first?", type: "text" },
        ],
        proof: "screenshot", min_time_seconds: 240,
      },
      {
        id: 2, title: "Edge case & error handling", severity: "imp",
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
    fallback: [
      {
        id: 1, title: "Background & context", severity: "imp",
        steps: ["Reflect on your current workflow or habits related to this product's problem space", "Answer in as much detail as possible, as if speaking to an interviewer"],
        questions: [
          { id: "q1", text: "Walk me through how you currently handle this problem, step by step.", type: "text" },
          { id: "q2", text: "What tools or workarounds do you use today?", type: "text" },
        ],
        proof: null, min_time_seconds: 300,
      },
      {
        id: 2, title: "Deep reaction to the product", severity: "crit",
        steps: ["Review the product or concept provided", "Respond as you would in a live interview — be specific and detailed"],
        questions: [
          { id: "q3", text: "What's your gut reaction, and why?", type: "text" },
          { id: "q4", text: "What would make you say no to this immediately?", type: "text" },
          { id: "q5", text: "How well does this fit into your life as-is?", type: "rating", scale: 5 },
        ],
        proof: null, min_time_seconds: 300,
      },
    ],
  },
  focus: {
    promptFragment: "This mission is a FOCUS GROUP discussion. Generate tasks framed as discussion prompts where the validator writes out what they would contribute in a group conversation (comparing opinions, reacting to hypothetical alternative views). Do not require screenshot proof.",
    proofDefault: null,
    taskCount: [3, 4],
    fallback: [
      {
        id: 1, title: "Group discussion: initial reactions", severity: "imp",
        steps: ["Imagine you're in a room with 5-6 other people discussing this product for the first time", "Write out what you'd say when asked to share your first reaction"],
        questions: [
          { id: "q1", text: "What's your unfiltered first reaction?", type: "text" },
          { id: "q2", text: "Which best describes your overall reaction?", type: "multiple_choice", options: ["Excited", "Curious", "Skeptical", "Indifferent"] },
        ],
        proof: null, min_time_seconds: 240,
      },
      {
        id: 2, title: "Group discussion: comparing alternatives", severity: "imp",
        steps: ["Think about what you currently use instead of this product", "Write your contribution as if debating the pros and cons with the group"],
        questions: [
          { id: "q3", text: "How does this compare to what you use today?", type: "text" },
          { id: "q4", text: "Would this replace your current solution?", type: "yes_no_detail" },
        ],
        proof: null, min_time_seconds: 240,
      },
    ],
  },
  trial: {
    promptFragment: "This mission is an extended PRODUCT TRIAL used over several days. Generate tasks that reflect usage over time (daily habits, evolving opinion) rather than a single session, and include at least one task specifically about whether the validator would continue using the product after the trial ends. Require screenshot proof.",
    proofDefault: "screenshot",
    taskCount: [3, 4],
    fallback: [
      {
        id: 1, title: "Day-to-day usage log", severity: "imp",
        steps: ["Use the product as part of your normal routine for the trial period", "Keep brief notes each time you use it"],
        questions: [
          { id: "q1", text: "Describe how you actually used it (not how you think you should).", type: "text" },
          { id: "q2", text: "How well did it fit into your existing routine?", type: "rating", scale: 5 },
        ],
        proof: "screenshot", min_time_seconds: 200,
      },
      {
        id: 2, title: "Extended trial reflection", severity: "crit",
        steps: ["Reflect on your usage across the whole trial period", "Consider whether you'd keep using it after the trial ends"],
        questions: [
          { id: "q3", text: "Did your opinion change from day 1 to now?", type: "yes_no_detail" },
          { id: "q4", text: "Would you continue using this after the trial?", type: "multiple_choice", options: ["Yes", "No", "Maybe, if it improved"] },
        ],
        proof: null, min_time_seconds: 200,
      },
    ],
  },
  video: {
    promptFragment: "This mission requires a RECORDED VIDEO WALKTHROUGH. Generate tasks that instruct the validator to record themselves narrating their actions out loud, and require proof for each task (they will upload the recording as proof).",
    proofDefault: "screenshot",
    taskCount: [2, 3],
    fallback: [
      {
        id: 1, title: "Recorded walkthrough of first use", severity: "crit",
        steps: ["Record yourself (screen and voice) using the product for the first time", "Narrate your thoughts out loud as you go — don't filter yourself"],
        questions: [
          { id: "q1", text: "Summarize your recording — what moments stood out?", type: "text" },
          { id: "q2", text: "How natural did the experience feel?", type: "rating", scale: 5 },
        ],
        proof: "screenshot", min_time_seconds: 300,
      },
      {
        id: 2, title: "Key feature deep-dive recording", severity: "imp",
        steps: ["Pick the single most important feature", "Record a short walkthrough demonstrating how you'd use it, explaining your reasoning aloud"],
        questions: [
          { id: "q3", text: "What did you struggle to explain or demonstrate?", type: "text" },
          { id: "q4", text: "How confident do you feel using this feature?", type: "rating", scale: 5 },
        ],
        proof: "screenshot", min_time_seconds: 300,
      },
    ],
  },
  webtest: {
    promptFragment: "This mission is WEBSITE TESTING via think-aloud browsing. Generate tasks about navigation, findability, and visual or layout issues specific to a website, and require screenshot proof. If real website context is provided below (fetched page title, description, or section headings), reference it directly — name actual page sections or the site's stated purpose — rather than writing generic placeholder tasks.",
    proofDefault: "screenshot",
    taskCount: [3, 5],
    fallback: [
      {
        id: 1, title: "Homepage first impression & navigation", severity: "crit",
        steps: ["Land on the homepage without prior context", "Try to find a key piece of information or page using only navigation, no search", "Note every click you make"],
        questions: [
          { id: "q1", text: "How easy was navigation?", type: "rating", scale: 5 },
          { id: "q2", text: "Did you find what you were looking for?", type: "yes_no_detail" },
          { id: "q3", text: "What confused you most about the layout?", type: "text" },
        ],
        proof: "screenshot", min_time_seconds: 200,
      },
      {
        id: 2, title: "Responsive & broken-link check", severity: "imp",
        steps: ["Resize your browser window or check on mobile view", "Click through at least 5 links or buttons across the site", "Note anything broken, slow, or misaligned"],
        questions: [
          { id: "q4", text: "Did you find any broken links or layout issues?", type: "yes_no_detail" },
          { id: "q5", text: "List anything that looked visually off.", type: "text" },
        ],
        proof: "screenshot", min_time_seconds: 220,
      },
    ],
  },
  apptest: {
    promptFragment: "This mission is MOBILE APP TESTING. Generate tasks about install flow, permissions, and app-specific behaviors (backgrounding, notifications, offline mode), and require screenshot proof. Tailor steps to the specific platform(s) named above — iOS and Android differ in back-navigation, permission dialogs, and gesture patterns — and if the platform is \"Both\", include at least one task comparing behavior across platforms.",
    proofDefault: "screenshot",
    taskCount: [3, 5],
    fallback: [
      {
        id: 1, title: "Install & first launch", severity: "crit",
        steps: ["Install the app from the provided link", "Complete the first-launch or onboarding experience", "Note install time and any permission prompts"],
        questions: [
          { id: "q1", text: "How smooth was install and first launch?", type: "rating", scale: 5 },
          { id: "q2", text: "Did any permission prompts feel unnecessary or unclear?", type: "yes_no_detail" },
        ],
        proof: "screenshot", min_time_seconds: 180,
      },
      {
        id: 2, title: "Core task flow + interruption test", severity: "imp",
        steps: ["Complete the app's main task flow", "Midway through, background the app (press home) and reopen it", "Check whether your progress was preserved"],
        questions: [
          { id: "q3", text: "Was your progress preserved after backgrounding the app?", type: "yes_no_detail" },
          { id: "q4", text: "How reliable did the app feel overall?", type: "rating", scale: 5 },
        ],
        proof: "screenshot", min_time_seconds: 220,
      },
    ],
  },
};

// Builds the OpenAI prompt for POST /api/missions/generate-tasks. Category and
// ptype are optional — omitting either (or passing an id that doesn't match
// CATEGORIES/PTYPES) falls back to the original generic framing so the route
// stays backward compatible for any caller that doesn't send them.
export function buildTaskPrompt({ description, url, platform, goals, targetUsers, category, ptype, urlContext }) {
  const cat = CATEGORIES.find(c => c.id === category);
  const guidance = Object.prototype.hasOwnProperty.call(TASK_GUIDANCE, ptype) ? TASK_GUIDANCE[ptype] : undefined;

  const catLine = cat ? `\nMISSION CATEGORY: ${cat.label} — ${cat.desc}` : "";
  const typeLine = guidance ? `\nMISSION TYPE GUIDANCE: ${guidance.promptFragment}` : "";
  const countPhrase = guidance ? `${guidance.taskCount[0]}-${guidance.taskCount[1]}` : "5-7";
  const hasUrlContext = urlContext && (urlContext.title || urlContext.description || (urlContext.headings && urlContext.headings.length > 0));
  const urlContextLine = hasUrlContext
    ? `\n\nWEBSITE CONTEXT (fetched from the provided URL):\nTitle: "${urlContext.title || "Not available"}"\nDescription: "${urlContext.description || "Not available"}"\nKey sections: ${urlContext.headings && urlContext.headings.length ? urlContext.headings.join(", ") : "Not available"}`
    : "";

  return `You are a Principal QA Engineer with 15+ years of experience. You think like a seasoned tester who probes edge cases, data integrity issues, UX dead-ends, and moments where the product breaks trust with the user.

A founder needs expert validation for:

PRODUCT: ${description || "Not provided"}
URL: ${url || "Not provided"}
PLATFORM: ${platform || "Web"}
VALIDATION GOALS: ${goals || "Core flow, UX, edge cases"}
TARGET USERS: ${targetUsers || "General users"}${catLine}${typeLine}${urlContextLine}

Generate ${countPhrase} PROFESSIONAL test cases a seasoned QA engineer would run. NOT beginner tasks like "open the app and browse". These are structured, methodical scenarios that stress-test the product deeply, matching the mission type guidance above if given.

RULES:
1. Task title must name the SPECIFIC flow or feature - never generic titles
2. Steps must match the mission type guidance above (e.g. a survey has no hands-on steps, a product test does)
3. Include at least one task testing error/failure states, unless the mission type guidance says otherwise (e.g. surveys/interviews)
4. Final task must capture overall sentiment and what would stop them recommending the product
5. Questions must be expert-level - not "was it easy" but "where specifically did friction occur"

QUESTION QUALITY EXAMPLES:
BAD: "Was signup easy?" GOOD: "At which exact step did friction first occur and what caused it?"
BAD: "Did you like the design?" GOOD: "Which UI element felt most inconsistent with expectations?"

Return ONLY valid JSON. No markdown, no backticks, no explanation. Use this exact schema:
{
  "tasks": [
    {
      "id": 1,
      "title": "Task title",
      "severity": "crit",
      "steps": ["Step 1", "Step 2"],
      "questions": [
        { "id": "q1", "text": "Question text", "type": "rating", "scale": 5 },
        { "id": "q2", "text": "Question text", "type": "multiple_choice", "options": ["Option A", "Option B"] },
        { "id": "q3", "text": "Question text", "type": "yes_no_detail" }
      ],
      "proof": "screenshot",
      "min_time_seconds": 180
    }
  ]
}

severity must be one of: crit, imp, nice
question types: rating (needs scale), multiple_choice (needs options), yes_no_detail, text
proof: "screenshot" or null — follow the mission type guidance's proof default above if given
Include 3-5 questions per task mixing types. Make tasks specific to the product described.`;
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
    "Lifestyle": ["Fitness", "Yoga", "Outdoor activities", "Cooking", "Travel", "Gaming", "Reading", "Music", "Fashion", "Parenting", "Pets", "Tech", "Cinema", "Sports", "Social media"],
    "Industry": ["SaaS / B2B Software", "Fintech", "Healthcare", "EdTech", "E-commerce", "FMCG", "Automotive", "Real Estate", "Media", "AI / ML", "Logistics", "Manufacturing", "Government", "Non-profit"],
    "Product Types": ["Mobile apps iOS", "Mobile apps Android", "Web apps / SaaS", "AI / LLM products", "Fintech products", "Healthcare apps", "Developer tools", "Enterprise software", "Consumer apps", "Physical products", "Packaging", "Marketing campaigns", "Websites"]
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
  { q: "How do I add funds to my wallet?", a: "Go to Wallet → Add funds. If card/UPI payments are configured, you can pay directly via Razorpay; otherwise funds are added for demo purposes.", cat: "Payments" },
  { q: "How are validators matched to my mission?", a: "Missions are matched to validators based on their expertise tags, past accuracy, and availability. You can also send direct invites from the Audience tab.", cat: "Missions" },
  { q: "What happens if I'm not satisfied with a submission?", a: "You can request changes or reject a submission with feedback before it's marked complete — this won't affect your wallet balance until you approve payment.", cat: "Missions" },
  { q: "How is pricing calculated for a mission?", a: "Pricing depends on mission type, number of participants, and turnaround time. You'll see an estimate before publishing, and funds are held in escrow until completion.", cat: "Payments" },
  { q: "Can I edit my workspace name or email?", a: "Yes — go to Settings → Edit profile to update your name, workspace name, and email address.", cat: "Account" },
  { q: "How do I add a phone number for sign-in?", a: "Go to Settings → Phone number → Add phone. Once verified, you can sign in with a code sent via SMS, and it's used for extra verification on wallet top-ups.", cat: "Account" },
];
