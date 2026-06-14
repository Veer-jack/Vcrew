// Static taxonomy for the validator marketplace.

export const VTYPES = {
  ai: {
    key: "ai", label: "AI Product", short: "AI", icon: "cpu",
    blurb: "Stress-test an AI feature for accuracy, safety and usefulness.",
    accentVar: "--vt-ai",
    rubric: [
      { id: "accuracy", label: "Accuracy", help: "Are the outputs factually correct and on-task?" },
      { id: "helpful", label: "Helpfulness", help: "Did it actually solve what you came to do?" },
      { id: "trust", label: "Trust & safety", help: "Did anything feel unsafe, biased, or off?" },
      { id: "readiness", label: "Launch readiness", help: "Your overall confidence this is ready for users." },
    ],
    flags: ["Hallucinated a fact", "Ignored my instruction", "Unsafe / biased reply", "Made up a source", "Refused a reasonable ask"],
    askFlags: true,
  },
  mvp: {
    key: "mvp", label: "MVP", short: "MVP", icon: "cube",
    blurb: "Use a shipped product end-to-end and report what breaks.",
    accentVar: "--vt-mvp",
    rubric: [
      { id: "onboarding", label: "Onboarding", help: "How smooth was getting to first value?" },
      { id: "corevalue", label: "Core value", help: "Did the main job-to-be-done land?" },
      { id: "stability", label: "Stability", help: "Bugs, slowness, broken states." },
      { id: "retention", label: "Would you return?", help: "Likelihood you'd use it again next week." },
    ],
    flags: ["Hit a bug", "Got confused / stuck", "Slow or unresponsive", "Broken link or state"],
    askFlags: true,
  },
  prototype: {
    key: "prototype", label: "Prototype", short: "Proto", icon: "frame",
    blurb: "Walk a clickable prototype and grade the experience.",
    accentVar: "--vt-proto",
    rubric: [
      { id: "completion", label: "Task completion", help: "Could you finish the intended task?" },
      { id: "navigation", label: "Navigation clarity", help: "Was it obvious where to go next?" },
      { id: "friction", label: "Low friction", help: "Few dead-ends, taps, or confusion." },
      { id: "delight", label: "Delight", help: "Did anything feel genuinely good to use?" },
    ],
    flags: ["Dead-end / no path", "Confusing label", "Expected something else", "Too many steps"],
    askFlags: false,
  },
  landing: {
    key: "landing", label: "Landing Page", short: "Page", icon: "layout",
    blurb: "First-impression test on a marketing page.",
    accentVar: "--vt-landing",
    rubric: [
      { id: "clarity", label: "Value clarity (5s)", help: "After 5 seconds, did you get what it does?" },
      { id: "trust", label: "Visual trust", help: "Does it look credible enough to try?" },
      { id: "cta", label: "CTA clarity", help: "Was the next action obvious?" },
      { id: "intent", label: "Sign-up intent", help: "How likely would you be to sign up?" },
    ],
    flags: ["Didn't get the value", "Looked untrustworthy", "Couldn't find the CTA", "Too much text"],
    askFlags: false,
  },
  idea: {
    key: "idea", label: "Idea", short: "Idea", icon: "lightbulb",
    blurb: "React to a raw concept before anything is built.",
    accentVar: "--vt-idea",
    rubric: [
      { id: "problem", label: "Problem clarity", help: "Is the problem real and well-defined?" },
      { id: "need", label: "Market need", help: "Do people actually want this solved?" },
      { id: "diff", label: "Differentiation", help: "Is there a reason to pick this over alternatives?" },
      { id: "interest", label: "Personal interest", help: "Would you, specifically, use it?" },
    ],
    flags: ["Problem unclear", "Already solved well", "Wouldn't pay", "Niche too small"],
    askFlags: false,
  },
};

export const TYPE_ORDER = ["ai", "mvp", "prototype", "landing", "idea"];

export const LEVELS = [
  { n: 1, name: "Trial", min: 0, perks: "Browse & apply to open missions" },
  { n: 2, name: "Verified", min: 10, perks: "Direct invites + saved niches" },
  { n: 3, name: "Trusted", min: 50, perks: "Higher-reward missions" },
  { n: 4, name: "Expert", min: 150, perks: "Premium missions + 24h payouts" },
  { n: 5, name: "Elite", min: 400, perks: "Top placement + concierge support" },
];

export const BADGES = [
  { icon: "shield", label: "Identity verified", got: true, desc: "LinkedIn + phone confirmed" },
  { icon: "cpu", label: "AI specialist", got: true, desc: "50+ AI validations at ≥90% accuracy" },
  { icon: "flame", label: "30-day streak", got: true, desc: "Active every week this month" },
  { icon: "star", label: "Top 5% rated", got: true, desc: "4.9 average over 200+ reviews" },
  { icon: "cube", label: "SaaS expert", got: false, desc: "Reach 50 dev-tool validations" },
  { icon: "target", label: "Perfectionist", got: false, desc: "Hit 98% accuracy over 90 days" },
];

export const EXPERTISE = [
  { l: "AI products", v: 96 },
  { l: "Dev tools & SaaS", v: 88 },
  { l: "Landing pages", v: 81 },
  { l: "Prototypes", v: 74 },
];

export const NOTIF_CATS = [
  { k: "all", l: "All" },
  { k: "invite", l: "Invitations" },
  { k: "application", l: "Applications" },
  { k: "reward", l: "Rewards" },
  { k: "system", l: "System" },
];

export const HELP_ARTICLES = [
  { q: "When do my rewards become withdrawable?", a: "Rewards clear to your withdrawable balance once the builder approves your submission — usually within 48 hours. Expert-level validators get 24h payouts.", cat: "Payments" },
  { q: "Why was my application not selected?", a: "Builders pick a limited number of participants per mission based on match score, verification level and past quality. Keep your profile strong to improve your odds.", cat: "Missions" },
  { q: "How is my Trust Score calculated?", a: "Trust Score blends your approval rate, rating, accuracy, response time and verification level. High-signal, honest feedback raises it fastest.", cat: "Reputation" },
  { q: "What counts as a low-effort submission?", a: "Vague one-line answers, skipped rubric items, or feedback that ignores the brief. Repeated low-effort work lowers your Trust Score and can pause your account.", cat: "Quality" },
  { q: "How do I withdraw my earnings?", a: "Go to Earnings → Withdraw. Link a UPI ID or bank account, complete KYC once, and request a payout of any amount above ₹200.", cat: "Payments" },
  { q: "Can I work on multiple missions at once?", a: "Yes. There's no cap, but focus on quality — your rating per mission matters more than volume.", cat: "Missions" },
];

export const REWARD_BANDS = [
  { k: "any", l: "Any reward" },
  { k: "lt100", l: "Under ₹100", test: r => r < 100 },
  { k: "mid", l: "₹100 – ₹200", test: r => r >= 100 && r <= 200 },
  { k: "gt200", l: "₹200+", test: r => r > 200 },
];
export const TIME_BANDS = [
  { k: "any", l: "Any length" },
  { k: "lt10", l: "Under 10 min", test: m => m < 10 },
  { k: "mid", l: "10 – 20 min", test: m => m >= 10 && m <= 20 },
  { k: "gt20", l: "20 min+", test: m => m > 20 },
];
export const SORTS = [
  { k: "match", l: "Best match" },
  { k: "reward", l: "Highest reward" },
  { k: "closing", l: "Closing soon" },
  { k: "newest", l: "Newest" },
];

export function deadlineHours(deadline) {
  const m = /(\d+)\s*([hd])/.exec(deadline || "");
  if (!m) return 999;
  return m[2] === "d" ? +m[1] * 24 : +m[1];
}
