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
  { id: "survey",    label: "Survey",          icon: "list",    desc: "10–15 structured questions",  est: "8 min" },
  { id: "ptest",     label: "Product Testing", icon: "flask",   desc: "Guided tasks + feedback",      est: "25 min" },
  { id: "interview", label: "Interview",       icon: "mic",     desc: "Scheduled 1:1 call",           est: "30 min" },
  { id: "focus",     label: "Focus Group",     icon: "users",   desc: "Moderated 6–8 person session", est: "45 min" },
  { id: "trial",     label: "Product Trial",   icon: "gift",    desc: "Use over several days",        est: "7 days" },
  { id: "video",     label: "Video Call",      icon: "video",   desc: "Recorded walkthrough",         est: "20 min" },
  { id: "webtest",   label: "Website Testing", icon: "browser", desc: "Think-aloud browse",           est: "15 min" },
  { id: "apptest",   label: "App Testing",     icon: "phone",   desc: "Install + task flows",         est: "20 min" },
];

export const REWARDS = [
  { id: "free",   label: "Free",           icon: "heart", desc: "Goodwill / community love",  needsAmt: false },
  { id: "fixed",  label: "Fixed Reward",   icon: "coins", desc: "Cash to each participant",    needsAmt: true },
  { id: "sample", label: "Product Sample", icon: "box",   desc: "Ship the product itself",     needsAmt: false },
  { id: "gift",   label: "Gift Card",      icon: "gift",  desc: "Amazon / Flipkart voucher",   needsAmt: true },
];

export const FILTERS = {
  Geography: [
    "Worldwide", "Remote / Online only",
    "India", "Bengaluru", "Mumbai", "Delhi NCR", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad", "Jaipur",
    "Singapore", "Indonesia", "Malaysia", "Philippines", "Vietnam", "Thailand", "Japan", "South Korea", "Australia", "New Zealand",
    "USA", "Canada", "Mexico",
    "UK", "Germany", "France", "Netherlands", "Spain", "Italy", "Sweden", "Denmark", "Poland",
    "UAE", "Saudi Arabia", "Israel", "Nigeria", "Kenya", "South Africa",
    "Brazil", "Argentina", "Colombia",
    "Other"
  ],
  Demographics: [
    "18-24", "25-34", "35-44", "45-54", "55+",
    "Male", "Female", "Non-binary", "Prefer not to say",
    "Low income", "Middle income", "Upper-middle income", "High income",
    "Student", "Early career", "Mid career", "Senior professional", "Retired",
    "Single", "Married / partnered", "Parent", "Empty nester"
  ],
  Professional: [
    "Software Engineer", "Data Scientist / Analyst", "Product Manager", "UX / UI Designer", "DevOps / Infrastructure",
    "Founder / Entrepreneur", "CXO / C-suite", "Business Analyst", "Consultant", "Operations",
    "Marketer", "Content Creator", "Designer", "Brand Manager", "PR / Comms",
    "Sales", "Customer Success", "Account Manager",
    "Doctor / Healthcare", "Lawyer / Legal", "Finance / Accounting", "HR / People", "Teacher / Educator",
    "Freelancer", "Student", "Researcher", "Other"
  ],
  Interests: [
    "Artificial Intelligence", "Technology", "Gaming", "Cybersecurity", "Blockchain / Web3",
    "Finance & Investing", "Entrepreneurship", "E-commerce", "Real Estate",
    "Healthcare", "Fitness & Sports", "Food & Beverage", "Travel", "Parenting",
    "Media & Entertainment", "Music", "Books & Literature", "Fashion & Beauty",
    "Education", "Environment & Sustainability", "Politics & Policy", "Social Impact",
    "Consumer Goods", "Automotive", "Home & Living", "Other"
  ],
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
