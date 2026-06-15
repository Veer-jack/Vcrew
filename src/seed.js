import { db, migrate } from "./db.js";
import crypto from "node:crypto";

migrate();

const hash = (pw) => crypto.createHash("sha256").update(pw).digest("hex");

function reset() {
  const tables = [
    "thread_messages", "threads", "notifications", "payment_methods", "invoices",
    "transactions", "audience_members", "activity", "responses", "participants",
    "mission_files", "missions", "sessions", "builders",
    "v_thread_messages", "v_threads", "v_tickets", "v_notifications", "v_my_missions",
    "v_saved", "vtasks", "validator_sessions", "validators",
  ];
  for (const t of tables) db.exec(`DELETE FROM ${t}`);
}

reset();

// ---------- BUILDER ----------
db.prepare(`
  INSERT INTO builders (id, name, org, email, password_hash, role, plan, color, balance, pending, month_spend)
  VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run("Aarav Mehta", "Kettle & Co", "aarav@kettleand.co", hash("password123"), "Founder", "Growth", "#4f46e5", 184250, 41600, 96400);

const BUILDER_ID = 1;

// ---------- MISSIONS ----------
const MISSIONS = [
  { id: "m1", name: "Cold Brew Can — Taste Panel", brand: "Kettle & Co", category: "feedback", ptype: "ptest",
    status: "active", target: 120, joined: 96, submitted: 71, reward_type: "fixed", reward_amount: 250,
    completion: 74, spend: 30000, created_at: "2026-06-08", deadline: "21 Jun", region: "Bengaluru, Mumbai, Pune", rating: 4.6,
    description: "Generate honest taste feedback on the new Cold Brew Can SKU from real consumers in target metros." },
  { id: "m2", name: "Checkout Flow Usability", brand: "Kettle & Co", category: "website", ptype: "webtest",
    status: "active", target: 60, joined: 58, submitted: 39, reward_type: "gift", reward_amount: 300,
    completion: 67, spend: 18000, created_at: "2026-06-05", deadline: "18 Jun", region: "Pan-India", rating: 4.4,
    description: "Think-aloud usability pass over the storefront checkout flow, focused on coupon and payment steps." },
  { id: "m3", name: "Subscription App — Beta Test", brand: "Kettle & Co", category: "app", ptype: "apptest",
    status: "active", target: 200, joined: 143, submitted: 88, reward_type: "fixed", reward_amount: 400,
    completion: 62, spend: 80000, created_at: "2026-06-01", deadline: "25 Jun", region: "Metro Tier-1", rating: 4.7,
    description: "Install the subscription app beta, complete the onboarding + paywall flow and report bugs." },
  { id: "m4", name: "Founder Interviews — Café Owners", brand: "Kettle & Co", category: "interview", ptype: "interview",
    status: "active", target: 15, joined: 12, submitted: 7, reward_type: "fixed", reward_amount: 1200,
    completion: 58, spend: 18000, created_at: "2026-06-03", deadline: "20 Jun", region: "Bengaluru", rating: 4.9,
    description: "1:1 depth interviews with independent café owners about wholesale cold brew supply needs." },
  { id: "m5", name: "Hazelnut SKU — Home Sampling", brand: "Kettle & Co", category: "sample", ptype: "trial",
    status: "draft", target: 300, joined: 0, submitted: 0, reward_type: "sample", reward_amount: 0,
    completion: 0, spend: 0, created_at: "2026-06-12", deadline: "—", region: "Mumbai, Delhi NCR", rating: 0,
    description: "Ship the new Hazelnut SKU to homes for a week-long trial and gather structured feedback." },
  { id: "m6", name: "Brand Perception Focus Group", brand: "Kettle & Co", category: "focus", ptype: "focus",
    status: "draft", target: 24, joined: 0, submitted: 0, reward_type: "fixed", reward_amount: 800,
    completion: 0, spend: 0, created_at: "2026-06-11", deadline: "—", region: "Hyderabad", rating: 0,
    description: "Moderated focus groups exploring brand perception ahead of the festive campaign." },
  { id: "m7", name: "Packaging A/B — Shelf Appeal", brand: "Kettle & Co", category: "research", ptype: "survey",
    status: "closed", target: 400, joined: 412, submitted: 388, reward_type: "gift", reward_amount: 150,
    completion: 94, spend: 61800, created_at: "2026-05-12", deadline: "2 Jun", region: "Pan-India", rating: 4.5,
    description: "Survey comparing two packaging concepts for on-shelf appeal and purchase intent." },
  { id: "m8", name: "Loyalty Program Concept Test", brand: "Kettle & Co", category: "feedback", ptype: "survey",
    status: "completed", target: 250, joined: 250, submitted: 241, reward_type: "fixed", reward_amount: 100,
    completion: 96, spend: 25000, created_at: "2026-05-02", deadline: "20 May", region: "Pan-India", rating: 4.8,
    description: "Concept test for a points-based loyalty program ahead of nationwide rollout." },
  { id: "m9", name: "Reusable Cup — Product Trial", brand: "Kettle & Co", category: "trial", ptype: "trial",
    status: "completed", target: 80, joined: 80, submitted: 76, reward_type: "sample", reward_amount: 0,
    completion: 95, spend: 0, created_at: "2026-04-18", deadline: "10 May", region: "Bengaluru, Chennai", rating: 4.7,
    description: "Multi-week trial of the reusable cup program with daily-use feedback." },
  { id: "m10", name: "Storefront First-Impression", brand: "Kettle & Co", category: "website", ptype: "webtest",
    status: "completed", target: 100, joined: 100, submitted: 97, reward_type: "gift", reward_amount: 200,
    completion: 97, spend: 20000, created_at: "2026-04-01", deadline: "18 Apr", region: "Pan-India", rating: 4.6,
    description: "First-impression audit of the redesigned storefront homepage." },
  { id: "m11", name: "Holiday Gift-Box Concept", brand: "Kettle & Co", category: "feedback", ptype: "survey",
    status: "archived", target: 150, joined: 150, submitted: 144, reward_type: "fixed", reward_amount: 120,
    completion: 96, spend: 18000, created_at: "2025-12-02", deadline: "18 Dec", region: "Pan-India", rating: 4.5,
    description: "Concept feedback on a limited-edition holiday gift box." },
  { id: "m12", name: "Cold Brew — Launch Naming Test", brand: "Kettle & Co", category: "research", ptype: "survey",
    status: "archived", target: 200, joined: 200, submitted: 191, reward_type: "gift", reward_amount: 100,
    completion: 95, spend: 20000, created_at: "2025-01-10", deadline: "24 Jan", region: "Metro Tier-1", rating: 4.4,
    description: "Naming research for the cold brew line ahead of launch." },
];

const AUDIENCE_BY_MISSION = {
  m1: { Geography: ["Bengaluru", "Mumbai", "Pune"], Demographics: ["25–34", "35–44"], "ValidationCrew Role": ["Validator", "User"], Interests: ["Consumer Goods"] },
  m2: { Geography: [], Demographics: [], Professional: [], "ValidationCrew Role": ["Tester", "User"], Interests: ["Technology"] },
  m3: { Geography: ["Bengaluru", "Mumbai", "Delhi NCR", "Hyderabad"], "ValidationCrew Role": ["Tester"], Interests: ["Technology", "AI"] },
  m4: { Geography: ["Bengaluru"], Professional: ["Founder"], "ValidationCrew Role": ["Validator"], Interests: ["Consumer Goods"] },
  m5: { Geography: ["Mumbai", "Delhi NCR"], "ValidationCrew Role": ["User"], Interests: ["Consumer Goods", "Healthcare"] },
  m6: { Geography: ["Hyderabad"], "ValidationCrew Role": ["User", "Validator"], Interests: ["Consumer Goods"] },
  m7: { Geography: [], "ValidationCrew Role": ["User"], Interests: ["Consumer Goods"] },
  m8: { Geography: [], "ValidationCrew Role": ["User"], Interests: ["Consumer Goods", "Finance"] },
  m9: { Geography: ["Bengaluru", "Chennai"], "ValidationCrew Role": ["User"], Interests: ["Consumer Goods"] },
  m10: { Geography: [], "ValidationCrew Role": ["Tester"], Interests: ["Technology"] },
  m11: { Geography: [], "ValidationCrew Role": ["User"], Interests: ["Consumer Goods"] },
  m12: { Geography: ["Bengaluru", "Mumbai", "Delhi NCR", "Hyderabad"], "ValidationCrew Role": ["User"], Interests: ["Consumer Goods"] },
};

const insertMission = db.prepare(`
  INSERT INTO missions (id, builder_id, name, brand, category, ptype, status, target, joined, submitted,
    reward_type, reward_amount, completion, spend, region, rating, description, deadline, created_at, audience_json)
  VALUES (@id, @builder_id, @name, @brand, @category, @ptype, @status, @target, @joined, @submitted,
    @reward_type, @reward_amount, @completion, @spend, @region, @rating, @description, @deadline, @created_at, @audience_json)
`);
for (const m of MISSIONS) insertMission.run({ ...m, builder_id: BUILDER_ID, audience_json: JSON.stringify(AUDIENCE_BY_MISSION[m.id] || {}) });

// ---------- PARTICIPANTS (mostly attached to m1) ----------
const PARTICIPANTS = [
  { name: "Diya Krishnan", role: "Validator", city: "Bengaluru", stage: "rewarded", reward: 250, trust: 94 },
  { name: "Rohan Pillai", role: "Tester", city: "Kochi", stage: "accepted", reward: 250, trust: 88 },
  { name: "Ananya Rao", role: "User", city: "Hyderabad", stage: "submitted", reward: 250, trust: 91 },
  { name: "Kabir Shah", role: "Validator", city: "Mumbai", stage: "approved", reward: 250, trust: 96 },
  { name: "Meera Iyer", role: "Tester", city: "Chennai", stage: "invited", reward: 250, trust: 82 },
  { name: "Vivaan Nair", role: "User", city: "Pune", stage: "submitted", reward: 250, trust: 79 },
  { name: "Saanvi Desai", role: "Validator", city: "Ahmedabad", stage: "approved", reward: 250, trust: 90 },
  { name: "Arjun Reddy", role: "Tester", city: "Bengaluru", stage: "started", reward: 250, trust: 85 },
  { name: "Nisha Menon", role: "User", city: "Kochi", stage: "started", reward: 250, trust: 87 },
  { name: "Aditya Joshi", role: "Validator", city: "Delhi", stage: "invited", reward: 250, trust: 93 },
  { name: "Priya Nambiar", role: "Tester", city: "Mumbai", stage: "accepted", reward: 250, trust: 80 },
  { name: "Karthik Bose", role: "User", city: "Kolkata", stage: "rewarded", reward: 250, trust: 89 },
  { name: "Ishita Gupta", role: "Validator", city: "Jaipur", stage: "submitted", reward: 250, trust: 92 },
  { name: "Dev Sharma", role: "Tester", city: "Pune", stage: "accepted", reward: 250, trust: 84 },
];
const insertParticipant = db.prepare(`INSERT INTO participants (mission_id, name, role, city, stage, reward, trust) VALUES (?,?,?,?,?,?,?)`);
for (const p of PARTICIPANTS) insertParticipant.run("m1", p.name, p.role, p.city, p.stage, p.reward, p.trust);

// ---------- RESPONSES (m1) ----------
const RESPONSES = [
  { name: "Diya Krishnan", city: "Bengaluru", role: "Validator", trust: 94, rating: 5, time_label: "6m ago",
    quote: "The cold brew has a clean, low-acid finish — noticeably smoother than what I buy now. The can feels premium but the pull-tab was stiff. I'd pay ₹120 for a 4-pack.",
    tags: ["Taste: Excellent", "Packaging: Good", "Price-fit: High"], attachments: ["photo", "photo"], flagged: 0 },
  { name: "Ananya Rao", city: "Hyderabad", role: "User", trust: 91, rating: 4, time_label: "1h ago",
    quote: "Loved the flavour but found it slightly too sweet for daily drinking. The label storytelling is lovely. Would gift this.",
    tags: ["Taste: Good", "Sweetness: High"], attachments: ["photo"], flagged: 0 },
  { name: "Saanvi Desai", city: "Ahmedabad", role: "Validator", trust: 90, rating: 4, time_label: "6h ago",
    quote: "Refreshing and not watery like other RTD coffees. The matte can hides condensation marks well. Shelf presence is strong.",
    tags: ["Taste: Good", "Packaging: Excellent"], attachments: [], flagged: 0 },
  { name: "Vivaan Nair", city: "Pune", role: "User", trust: 79, rating: 3, time_label: "5h ago",
    quote: "It's fine but didn't stand out against my usual brand. The QR on the can didn't scan on the first two tries.",
    tags: ["Taste: Average", "QR: Broken"], attachments: ["screenshot"], flagged: 1 },
];
const insertResponse = db.prepare(`
  INSERT INTO responses (mission_id, name, city, role, trust, rating, time_label, quote, tags_json, attachments_json, flagged)
  VALUES ('m1', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
for (const r of RESPONSES) insertResponse.run(r.name, r.city, r.role, r.trust, r.rating, r.time_label, r.quote, JSON.stringify(r.tags), JSON.stringify(r.attachments), r.flagged);

// ---------- ACTIVITY ----------
const ACTIVITY = [
  { who: "Diya Krishnan", icon: "check", tone: "green", text: "submitted feedback on", mission_id: "m1", mission_name: "Cold Brew Can — Taste Panel", time_label: "6m ago" },
  { who: "Rohan Pillai", icon: "userplus", tone: "accent", text: "accepted the invite to", mission_id: "m3", mission_name: "Subscription App — Beta Test", time_label: "22m ago" },
  { who: "System", icon: "coins", tone: "amber", text: "released ₹250 reward for", mission_id: "m1", mission_name: "Cold Brew Can — Taste Panel", time_label: "41m ago" },
  { who: "Ananya Rao", icon: "star", tone: "accent", text: "left a 5★ response on", mission_id: "m2", mission_name: "Checkout Flow Usability", time_label: "1h ago" },
  { who: "Kabir Shah", icon: "check", tone: "green", text: "completed the interview for", mission_id: "m4", mission_name: "Founder Interviews — Café Owners", time_label: "2h ago" },
  { who: "Meera Iyer", icon: "userplus", tone: "accent", text: "applied to", mission_id: "m3", mission_name: "Subscription App — Beta Test", time_label: "3h ago" },
  { who: "System", icon: "flag", tone: "amber", text: "flagged 1 response for review on", mission_id: "m2", mission_name: "Checkout Flow Usability", time_label: "4h ago" },
  { who: "Vivaan Nair", icon: "check", tone: "green", text: "submitted feedback on", mission_id: "m3", mission_name: "Subscription App — Beta Test", time_label: "5h ago" },
  { who: "Saanvi Desai", icon: "star", tone: "accent", text: "left a 4★ response on", mission_id: "m1", mission_name: "Cold Brew Can — Taste Panel", time_label: "6h ago" },
];
const insertActivity = db.prepare(`INSERT INTO activity (builder_id, who, text, mission_id, mission_name, icon, tone, time_label) VALUES (?,?,?,?,?,?,?,?)`);
for (const a of ACTIVITY) insertActivity.run(BUILDER_ID, a.who, a.text, a.mission_id, a.mission_name, a.icon, a.tone, a.time_label);

// ---------- AUDIENCE ----------
const AUDIENCE = [
  { name: "Diya Krishnan", role: "Validator", city: "Bengaluru", occ: "UX Researcher", industry: "Technology", verified: 1, expertise: ["Product Feedback", "App Testing", "AI"], match: 96 },
  { name: "Rohan Pillai", role: "Tester", city: "Kochi", occ: "QA Engineer", industry: "Technology", verified: 1, expertise: ["App Testing", "Website Review"], match: 92 },
  { name: "Ananya Rao", role: "User", city: "Hyderabad", occ: "Marketing Lead", industry: "Consumer Goods", verified: 1, expertise: ["Product Feedback", "Focus Group"], match: 90 },
  { name: "Kabir Shah", role: "Validator", city: "Mumbai", occ: "Product Manager", industry: "Finance", verified: 1, expertise: ["Research Study", "Interview"], match: 95 },
  { name: "Meera Iyer", role: "Tester", city: "Chennai", occ: "Nutritionist", industry: "Healthcare", verified: 0, expertise: ["Product Trial", "Sample"], match: 81 },
  { name: "Arjun Reddy", role: "Tester", city: "Bengaluru", occ: "Barista / Café Owner", industry: "Consumer Goods", verified: 1, expertise: ["Product Testing", "Interview"], match: 88 },
  { name: "Nisha Menon", role: "User", city: "Kochi", occ: "Content Creator", industry: "Education", verified: 1, expertise: ["Website Review", "Survey"], match: 84 },
  { name: "Aditya Joshi", role: "Validator", city: "Delhi", occ: "Design Lead", industry: "Technology", verified: 1, expertise: ["Product Feedback", "App Testing", "AI"], match: 93 },
  { name: "Ishita Gupta", role: "Validator", city: "Jaipur", occ: "Data Analyst", industry: "Finance", verified: 1, expertise: ["Research Study", "Survey"], match: 89 },
  { name: "Karthik Bose", role: "User", city: "Kolkata", occ: "Student", industry: "Education", verified: 0, expertise: ["Product Trial", "Focus Group"], match: 76 },
];
const insertAudience = db.prepare(`INSERT INTO audience_members (name, role, city, occupation, industry, verified, expertise_json, match_pct) VALUES (?,?,?,?,?,?,?,?)`);
for (const a of AUDIENCE) insertAudience.run(a.name, a.role, a.city, a.occ, a.industry, a.verified, JSON.stringify(a.expertise), a.match);

// ---------- WALLET: TRANSACTIONS, INVOICES, PAYMENT METHODS ----------
const TRANSACTIONS = [
  { date_label: "12 Jun", description: "Reward payout — Cold Brew Can", type: "debit", amount: 4250, mission_id: "m1" },
  { date_label: "11 Jun", description: "Wallet top-up — UPI", type: "credit", amount: 100000, mission_id: null },
  { date_label: "10 Jun", description: "Reward payout — Subscription App", type: "debit", amount: 12800, mission_id: "m3" },
  { date_label: "8 Jun", description: "Reward payout — Checkout Flow", type: "debit", amount: 6900, mission_id: "m2" },
  { date_label: "5 Jun", description: "Platform fee — June", type: "debit", amount: 2400, mission_id: null },
  { date_label: "2 Jun", description: "Refund — Packaging A/B unused slots", type: "credit", amount: 1800, mission_id: "m7" },
  { date_label: "1 Jun", description: "Wallet top-up — Card", type: "credit", amount: 50000, mission_id: null },
];
const insertTx = db.prepare(`INSERT INTO transactions (builder_id, date_label, description, type, amount, mission_id) VALUES (?,?,?,?,?,?)`);
for (const t of TRANSACTIONS) insertTx.run(BUILDER_ID, t.date_label, t.description, t.type, t.amount, t.mission_id);

const INVOICES = [
  { id: "INV-2406-018", date_label: "1 Jun 2026", amount: 96400, status: "Paid" },
  { id: "INV-2405-009", date_label: "1 May 2026", amount: 71200, status: "Paid" },
  { id: "INV-2404-004", date_label: "1 Apr 2026", amount: 45000, status: "Paid" },
];
const insertInv = db.prepare(`INSERT INTO invoices (id, builder_id, date_label, amount, status) VALUES (?,?,?,?,?)`);
for (const i of INVOICES) insertInv.run(i.id, BUILDER_ID, i.date_label, i.amount, i.status);

const PAYMENT_METHODS = [
  { brand: "VISA", last4: "4291", exp: "08/27", is_primary: 1 },
  { brand: "UPI", last4: "@okhdfc", exp: "—", is_primary: 0 },
];
const insertPM = db.prepare(`INSERT INTO payment_methods (builder_id, brand, last4, exp, is_primary) VALUES (?,?,?,?,?)`);
for (const p of PAYMENT_METHODS) insertPM.run(BUILDER_ID, p.brand, p.last4, p.exp, p.is_primary);

// ---------- NOTIFICATIONS ----------
const NOTIFS = [
  { icon: "check", tone: "green", title: "New submission", body: "Diya Krishnan submitted feedback on Cold Brew Can — Taste Panel.", time_label: "6m", unread: 1 },
  { icon: "userplus", tone: "accent", title: "Application received", body: "Meera Iyer applied to Subscription App — Beta Test.", time_label: "3h", unread: 1 },
  { icon: "flag", tone: "amber", title: "Response flagged", body: "1 response on Checkout Flow Usability needs your review.", time_label: "4h", unread: 1 },
  { icon: "coins", tone: "accent", title: "Low wallet balance soon", body: "At current pace your balance covers ~9 more days of active missions.", time_label: "1d", unread: 0 },
  { icon: "star", tone: "accent", title: "Mission completed", body: "Loyalty Program Concept Test reached 96% completion.", time_label: "2d", unread: 0 },
];
const insertNotif = db.prepare(`INSERT INTO notifications (builder_id, icon, tone, title, body, time_label, unread) VALUES (?,?,?,?,?,?,?)`);
for (const n of NOTIFS) insertNotif.run(BUILDER_ID, n.icon, n.tone, n.title, n.body, n.time_label, n.unread);

// ---------- MESSAGE THREADS ----------
const THREADS = [
  { id: "bt-1", name: "Diya Krishnan", role: "Validator · Bengaluru", mission_id: "m1", mission_name: "Cold Brew Can — Taste Panel", time_label: "6m",
    messages: [
      { from: "me", text: "Hi Diya — thanks for joining the taste panel! Please capture the can in natural light if you can.", time_label: "1:10 PM" },
      { from: "them", text: "Submitted! Added two photos of the can in daylight. The pull-tab was a little stiff fyi.", time_label: "1:46 PM" },
    ] },
  { id: "bt-2", name: "Rohan Pillai", role: "Tester · Kochi", mission_id: "m3", mission_name: "Subscription App — Beta Test", time_label: "1h",
    messages: [
      { from: "them", text: "App crashed on the paywall screen on Android 13. Logcat attached in my submission.", time_label: "11:20 AM" },
      { from: "me", text: "Great — the crash log helps a lot, thank you!", time_label: "11:35 AM" },
    ] },
  { id: "bt-3", name: "Ananya Rao", role: "User · Hyderabad", mission_id: "m2", mission_name: "Checkout Flow Usability", time_label: "3h",
    messages: [
      { from: "them", text: "Finished the checkout walkthrough. Found the coupon field hard to spot.", time_label: "9:02 AM" },
      { from: "me", text: "Super useful — noted. Would you redo it on mobile too?", time_label: "9:30 AM" },
      { from: "them", text: "Happy to redo the second task if useful.", time_label: "9:33 AM" },
    ] },
  { id: "bt-4", name: "ValidationCrew", role: "Platform support", mission_id: null, mission_name: "Billing", time_label: "1d",
    messages: [
      { from: "them", text: "Hi Aarav — your June invoice (INV-2406-018) is now available to download from Wallet → Invoices.", time_label: "Yesterday" },
    ] },
];
const insertThread = db.prepare(`INSERT INTO threads (id, builder_id, name, role, mission_id, mission_name, time_label) VALUES (?,?,?,?,?,?,?)`);
const insertMsg = db.prepare(`INSERT INTO thread_messages (thread_id, sender, text, time_label) VALUES (?,?,?,?)`);
for (const t of THREADS) {
  insertThread.run(t.id, BUILDER_ID, t.name, t.role, t.mission_id, t.mission_name, t.time_label);
  for (const m of t.messages) insertMsg.run(t.id, m.from, m.text, m.time_label);
}

// ---------- MISSION FILES (m1) ----------
const MISSION_FILES = [
  { section: "brief", name: "Cold Brew — Tasting Guide.pdf", kind: "pdf", size: "1.2 MB", by: "You", when_label: "8 Jun" },
  { section: "brief", name: "Packaging dieline v3.fig", kind: "figma", size: "—", by: "You", when_label: "8 Jun" },
  { section: "brief", name: "Brand storefront", kind: "link", size: "kettleand.co", by: "You", when_label: "8 Jun" },
  { section: "submissions", name: "can-daylight-01.jpg", kind: "image", size: "2.4 MB", by: "Diya Krishnan", when_label: "6m ago" },
  { section: "submissions", name: "can-daylight-02.jpg", kind: "image", size: "2.1 MB", by: "Diya Krishnan", when_label: "6m ago" },
  { section: "submissions", name: "taste-notes.pdf", kind: "pdf", size: "320 KB", by: "Ananya Rao", when_label: "1h ago" },
  { section: "submissions", name: "shelf-comparison.jpg", kind: "image", size: "3.0 MB", by: "Saanvi Desai", when_label: "6h ago" },
  { section: "submissions", name: "qr-scan-issue.png", kind: "image", size: "880 KB", by: "Vivaan Nair", when_label: "5h ago" },
];
const insertFile = db.prepare(`INSERT INTO mission_files (mission_id, section, name, kind, size, by, when_label) VALUES ('m1',?,?,?,?,?,?)`);
for (const f of MISSION_FILES) insertFile.run(f.section, f.name, f.kind, f.size, f.by, f.when_label);

console.log("Seed complete. Login with aarav@kettleand.co / password123");

/* ============================================================
   VALIDATOR SIDE
   ============================================================ */

db.prepare(`
  INSERT INTO validators (id, name, handle, email, password_hash, level, rating, rating_count, accuracy, streak,
    specialties_json, week_earnings, week_target, pending, available, lifetime, completed, accept_rate)
  VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  "Riya Malhotra", "@riya.builds", "riya@validationcrew.app", hash("password123"),
  4, 4.9, 213, 96, 11, JSON.stringify(["AI products", "Dev tools", "B2B SaaS"]),
  2840, 4000, 640, 2200, 41250, 213, 92
);
const VID = 1;

// ---------- MARKETPLACE TASKS ----------
const VTASKS = [
  { id: "t-helix", type: "ai", product: "Helix", tagline: "AI sales-email writer", company: "Helix Labs",
    reward: 220, minutes: 12, match: 96, spotsLeft: 6, spotsTotal: 25, deadline: "Closes in 22h", postedH: 2, verified: 1, featured: 1, hot: 1,
    brief: "Generate 3 cold emails for different personas. Judge whether the copy is accurate to the brief, free of hallucinated claims, and genuinely usable without heavy editing.",
    steps: ["Open Helix and pick the \u201cCold outreach\u201d template", "Generate emails for 3 of the provided personas", "Rate accuracy, helpfulness, trust and launch readiness", "Flag any hallucinated claims you spot"] },
  { id: "t-brief", type: "ai", product: "Brief", tagline: "Meeting-notes summarizer", company: "Brief AI",
    reward: 200, minutes: 10, match: 93, spotsLeft: 11, spotsTotal: 25, deadline: "Closes in 2d", postedH: 7, verified: 1, featured: 0, hot: 0,
    brief: "Paste 2 sample transcripts and review the generated summaries + action items for accuracy and missed context.",
    steps: ["Paste the 2 provided transcripts", "Review summary + extracted action items", "Rate accuracy and helpfulness", "Flag any invented action items"] },
  { id: "t-cadence", type: "prototype", product: "Cadence", tagline: "Habit-tracker prototype", company: "Cadence",
    reward: 140, minutes: 8, match: 91, spotsLeft: 3, spotsTotal: 20, deadline: "Closes in 9h", postedH: 26, verified: 0, featured: 0, hot: 0,
    brief: "Complete the \u201cset up your first habit and log day one\u201d flow in the Figma prototype. Report where you hesitated.",
    steps: ["Open the prototype link", "Create your first habit", "Log day one", "Rate the flow and note friction"] },
  { id: "t-ledgerly", type: "mvp", product: "Ledgerly", tagline: "Freelance invoicing MVP", company: "Ledgerly",
    reward: 180, minutes: 15, match: 84, spotsLeft: 14, spotsTotal: 30, deadline: "Closes in 3d", postedH: 12, verified: 1, featured: 0, hot: 0,
    brief: "Sign up, create a client, send a test invoice, and mark it paid. Tell us what broke and whether you'd come back.",
    steps: ["Create an account", "Add a client + send a test invoice", "Mark the invoice as paid", "Rate onboarding, value, stability"] },
  { id: "t-northwind", type: "landing", product: "Northwind", tagline: "Series-A launch page", company: "Northwind",
    reward: 90, minutes: 5, match: 88, spotsLeft: 19, spotsTotal: 40, deadline: "Closes in 1d", postedH: 30, verified: 1, featured: 0, hot: 0,
    brief: "Five-second test, then a full read. Tell us if the value proposition lands and whether you'd sign up.",
    steps: ["Look at the page for 5 seconds", "Say what you think it does", "Read fully + find the CTA", "Rate clarity, trust, intent"] },
  { id: "t-plotpal", type: "idea", product: "Plotpal", tagline: "AI dungeon master for D&D", company: "Plotpal",
    reward: 70, minutes: 4, match: 79, spotsLeft: 22, spotsTotal: 50, deadline: "Closes in 4d", postedH: 48, verified: 0, featured: 0, hot: 0,
    brief: "Read a one-paragraph concept and a sample session. React honestly: is the problem real and would you play?",
    steps: ["Read the concept", "Skim the sample session", "Rate problem, need, differentiation", "Leave one honest reaction"] },
  { id: "t-quanta", type: "ai", product: "Quanta", tagline: "AI research assistant", company: "Quanta Labs",
    reward: 240, minutes: 14, match: 95, spotsLeft: 4, spotsTotal: 20, deadline: "Closes in 11h", postedH: 1, verified: 1, featured: 0, hot: 1,
    brief: "Run three real research questions through Quanta and judge whether the synthesised answers are accurate, well-sourced and genuinely faster than doing it yourself.",
    steps: ["Ask 3 research questions", "Check the cited sources", "Rate accuracy, helpfulness, trust", "Flag any invented citations"] },
  { id: "t-vellum", type: "ai", product: "Vellum", tagline: "Contract-review AI", company: "Vellum",
    reward: 260, minutes: 18, match: 90, spotsLeft: 8, spotsTotal: 25, deadline: "Closes in 3d", postedH: 5, verified: 1, featured: 0, hot: 0,
    brief: "Upload a sample contract and review the AI's risk flags and clause summaries for accuracy and missed issues.",
    steps: ["Upload the sample contract", "Review risk flags + summaries", "Rate accuracy and trust", "Flag any missed clauses"] },
  { id: "t-forge", type: "prototype", product: "Forge", tagline: "CI/CD pipeline builder", company: "Forge",
    reward: 150, minutes: 9, match: 89, spotsLeft: 6, spotsTotal: 20, deadline: "Closes in 1d", postedH: 9, verified: 1, featured: 0, hot: 0,
    brief: "Walk the 'create your first pipeline' prototype and report where the flow is unclear or dead-ends.",
    steps: ["Open the prototype", "Create a sample pipeline", "Rate navigation and friction", "Note any dead-ends"] },
  { id: "t-tideline", type: "mvp", product: "Tideline", tagline: "Product analytics MVP", company: "Tideline",
    reward: 190, minutes: 16, match: 86, spotsLeft: 12, spotsTotal: 30, deadline: "Closes in 2d", postedH: 16, verified: 1, featured: 0, hot: 0,
    brief: "Connect the demo data source, build a funnel, and tell us what broke and whether the core value lands.",
    steps: ["Connect demo data", "Build a funnel report", "Rate onboarding, value, stability", "Flag bugs you hit"] },
  { id: "t-mosaic", type: "landing", product: "Mosaic", tagline: "Portfolio builder launch page", company: "Mosaic",
    reward: 80, minutes: 5, match: 83, spotsLeft: 24, spotsTotal: 50, deadline: "Closes in 2d", postedH: 20, verified: 0, featured: 0, hot: 0,
    brief: "Five-second test then a full read of the new launch page. Does the value land and would you sign up?",
    steps: ["5-second first impression", "Say what it does", "Find the CTA", "Rate clarity, trust, intent"] },
  { id: "t-aperture", type: "ai", product: "Aperture", tagline: "AI photo editor", company: "Aperture",
    reward: 210, minutes: 11, match: 92, spotsLeft: 9, spotsTotal: 25, deadline: "Closes in 4d", postedH: 34, verified: 1, featured: 0, hot: 0,
    brief: "Edit three sample photos with natural-language prompts and judge output quality, accuracy and usefulness.",
    steps: ["Edit 3 photos with prompts", "Compare to your intent", "Rate accuracy and helpfulness", "Flag broken edits"] },
  { id: "t-relay", type: "mvp", product: "Relay", tagline: "Team standup automation", company: "Relay",
    reward: 170, minutes: 13, match: 81, spotsLeft: 16, spotsTotal: 35, deadline: "Closes in 5d", postedH: 40, verified: 1, featured: 0, hot: 0,
    brief: "Set up an async standup for a demo team, run one cycle, and report friction and whether you'd return.",
    steps: ["Create a demo team", "Configure + run a standup", "Rate the flow", "Note anything broken"] },
  { id: "t-sprout", type: "idea", product: "Sprout", tagline: "Kids' financial-literacy app", company: "Sprout",
    reward: 75, minutes: 4, match: 77, spotsLeft: 28, spotsTotal: 60, deadline: "Closes in 6d", postedH: 52, verified: 0, featured: 0, hot: 0,
    brief: "React to a one-paragraph concept and a sample lesson. Is the problem real and would a parent pay?",
    steps: ["Read the concept", "Skim a sample lesson", "Rate problem, need, differentiation", "Leave an honest reaction"] },
];
const insertVTask = db.prepare(`
  INSERT INTO vtasks (id, type, product, tagline, company, reward, minutes, match_pct, spots_left, spots_total,
    deadline_label, posted_h, brief, steps_json, hot, verified, featured)
  VALUES (@id, @type, @product, @tagline, @company, @reward, @minutes, @match, @spotsLeft, @spotsTotal,
    @deadline, @postedH, @brief, @steps_json, @hot, @verified, @featured)
`);
for (const t of VTASKS) {
  const { steps, ...rest } = t;
  insertVTask.run({ ...rest, steps_json: JSON.stringify(steps) });
}

// ---------- SAVED ----------
for (const id of ["t-cadence", "t-forge"]) {
  db.prepare(`INSERT INTO v_saved (validator_id, task_id) VALUES (?, ?)`).run(VID, id);
}

// ---------- MY MISSIONS ----------
const MY_MISSIONS = [
  { task_id: "t-helix",     status: "active",    progress: 40,  status_label: "Accepted 2h ago" },
  { task_id: "t-ledgerly",  status: "active",    progress: 10,  status_label: "Accepted yesterday" },
  { task_id: "t-cadence",   status: "applied",   progress: 0,   status_label: "Applied 4h ago" },
  { task_id: "t-northwind", status: "applied",   progress: 0,   status_label: "Applied 1d ago" },
  { task_id: "t-quanta",    status: "submitted", progress: 100, status_label: "Submitted today, 10:24" },
  { task_id: "t-forge",     status: "submitted", progress: 100, status_label: "Submitted 2 days ago" },
  { task_id: "t-tideline",  status: "completed", progress: 100, status_label: "Completed yesterday", quality: "High signal" },
  { task_id: "t-mosaic",    status: "completed", progress: 100, status_label: "Completed yesterday", quality: "Solid" },
  { task_id: "t-aperture",  status: "completed", progress: 100, status_label: "Completed 3 days ago", quality: "High signal" },
  { task_id: "t-vellum",    status: "rejected",  progress: 0,   status_label: "Not selected", reason: "Mission filled before your application was reviewed." },
];
const insertMM = db.prepare(`INSERT INTO v_my_missions (validator_id, task_id, status, progress, quality, reason, status_label) VALUES (?,?,?,?,?,?,?)`);
for (const m of MY_MISSIONS) insertMM.run(VID, m.task_id, m.status, m.progress, m.quality || null, m.reason || null, m.status_label);

// ---------- NOTIFICATIONS ----------
const VNOTIFS = [
  { cat: "invite", icon: "bolt", tone: "accent", title: "You've been invited", body: "Helix Labs invited you directly to validate their new onboarding flow. \u20b9260 reward.", time_label: "18m", unread: 1 },
  { cat: "application", icon: "check", tone: "green", title: "Application accepted", body: "You're in for Ledgerly \u2014 Freelance invoicing MVP. You can start now.", time_label: "2h", unread: 1 },
  { cat: "reward", icon: "coin", tone: "amber", title: "Reward released", body: "\u20b9220 for your Quanta validation has cleared to your withdrawable balance.", time_label: "5h", unread: 1 },
  { cat: "application", icon: "clock", tone: "accent", title: "Under review", body: "Cadence is reviewing applicants. You'll hear back within 24 hours.", time_label: "6h", unread: 0 },
  { cat: "system", icon: "shield", tone: "green", title: "Level up \u2014 Expert unlocked", body: "You crossed 150 approved validations. Expert missions and faster payouts are now open.", time_label: "1d", unread: 0 },
  { cat: "reward", icon: "coin", tone: "amber", title: "Reward released", body: "\u20b9180 for your Tideline validation has cleared.", time_label: "1d", unread: 0 },
  { cat: "system", icon: "star", tone: "accent", title: "New 5\u2605 rating", body: "Aperture rated your submission 5\u2605 \u2014 \u201cgenuinely actionable, caught a real bug.\u201d", time_label: "2d", unread: 0 },
];
const insertVNotif = db.prepare(`INSERT INTO v_notifications (validator_id, cat, icon, tone, title, body, time_label, unread) VALUES (?,?,?,?,?,?,?,?)`);
for (const n of VNOTIFS) insertVNotif.run(VID, n.cat, n.icon, n.tone, n.title, n.body, n.time_label, n.unread);

// ---------- MESSAGE THREADS ----------
const VTHREADS = [
  { id: "vt-1", name: "Helix Labs", role: "Builder \u00b7 AI", mission: "Helix onboarding", time_label: "12m",
    messages: [
      { from: "them", text: "Hi Riya \u2014 thanks for picking up the Helix validation! Quick heads up: the \u201cCold outreach\u201d template is the priority.", time_label: "2:30 PM" },
      { from: "them", text: "Could you also test the Hindi locale if you have time? We just shipped it.", time_label: "2:31 PM" },
    ] },
  { id: "vt-2", name: "Ledgerly", role: "Builder \u00b7 SaaS", mission: "Invoicing MVP", time_label: "1h",
    messages: [
      { from: "them", text: "Welcome aboard! Let us know if anything blocks you during the flow.", time_label: "11:02 AM" },
      { from: "me", text: "Found a bug on the invoice PDF export \u2014 the total renders as \u20b9NaN on Safari. Screenshot attached in my submission.", time_label: "11:48 AM" },
    ] },
  { id: "vt-3", name: "ValidationCrew", role: "Support", mission: "Payout query", time_label: "Yesterday",
    messages: [
      { from: "me", text: "Hi, my last withdrawal still shows pending \u2014 is that normal?", time_label: "Yesterday 4:10 PM" },
      { from: "them", text: "Hi Riya! Payouts to UPI clear within 24h. Your withdrawal of \u20b941,250 is being processed and should land tonight.", time_label: "Yesterday 4:22 PM" },
    ] },
  { id: "vt-4", name: "Quanta", role: "Builder \u00b7 AI", mission: "Research assistant", time_label: "2d",
    messages: [
      { from: "them", text: "Thanks \u2014 that was high-signal feedback. Approved! Reward on its way.", time_label: "Mon 9:15 AM" },
    ] },
];
const insertVThread = db.prepare(`INSERT INTO v_threads (id, validator_id, name, role, mission, time_label) VALUES (?,?,?,?,?,?)`);
const insertVMsg = db.prepare(`INSERT INTO v_thread_messages (thread_id, sender, text, time_label) VALUES (?,?,?,?)`);
for (const t of VTHREADS) {
  insertVThread.run(t.id, VID, t.name, t.role, t.mission, t.time_label);
  for (const m of t.messages) insertVMsg.run(t.id, m.from, m.text, m.time_label);
}

// ---------- SUPPORT TICKETS ----------
const VTICKETS = [
  { id: "TKT-4821", subject: "Withdrawal still pending after 24h", category: "Payments", status: "open", priority: "high", updated_label: "1h ago" },
  { id: "TKT-4790", subject: "Mission brief link returns 404", category: "Missions", status: "answered", priority: "normal", updated_label: "Yesterday" },
  { id: "TKT-4711", subject: "Update my UPI ID for payouts", category: "Account", status: "resolved", priority: "normal", updated_label: "3 days ago" },
];
const insertTicket = db.prepare(`INSERT INTO v_tickets (id, validator_id, subject, category, status, priority, updated_label) VALUES (?,?,?,?,?,?,?)`);
for (const t of VTICKETS) insertTicket.run(t.id, VID, t.subject, t.category, t.status, t.priority, t.updated_label);

console.log("Validator seed complete. Login with riya@validationcrew.app / password123");
