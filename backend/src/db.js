import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DB_DIR || path.join(__dirname, "..", "data");
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, "vcrew.db");

export const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

export function migrate() {
  db.exec(`
  CREATE TABLE IF NOT EXISTS builders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    org TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    oauth_provider TEXT,
    oauth_id TEXT,
    phone TEXT,
    phone_verified INTEGER DEFAULT 0,
    role TEXT DEFAULT 'Founder',
    plan TEXT DEFAULT 'Growth',
    color TEXT DEFAULT '#4f46e5',
    balance INTEGER DEFAULT 0,
    pending INTEGER DEFAULT 0,
    month_spend INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    builder_id INTEGER NOT NULL REFERENCES builders(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    token TEXT PRIMARY KEY,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admin_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS admin_pending_2fa (
    token TEXT PRIMARY KEY,
    attempts INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admin_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    detail TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS missions (
    id TEXT PRIMARY KEY,
    builder_id INTEGER NOT NULL REFERENCES builders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT NOT NULL,
    ptype TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    target INTEGER DEFAULT 0,
    joined INTEGER DEFAULT 0,
    submitted INTEGER DEFAULT 0,
    reward_type TEXT DEFAULT 'fixed',
    reward_amount INTEGER DEFAULT 0,
    completion INTEGER DEFAULT 0,
    spend INTEGER DEFAULT 0,
    region TEXT,
    rating REAL DEFAULT 0,
    description TEXT,
    audience_json TEXT DEFAULT '{}',
    deadline TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,
    city TEXT,
    stage TEXT,
    reward INTEGER DEFAULT 0,
    trust INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    city TEXT,
    role TEXT,
    trust INTEGER DEFAULT 0,
    rating INTEGER DEFAULT 0,
    time_label TEXT,
    quote TEXT,
    tags_json TEXT DEFAULT '[]',
    attachments_json TEXT DEFAULT '[]',
    flagged INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    builder_id INTEGER NOT NULL REFERENCES builders(id) ON DELETE CASCADE,
    who TEXT,
    text TEXT,
    mission_id TEXT REFERENCES missions(id) ON DELETE SET NULL,
    mission_name TEXT,
    icon TEXT,
    tone TEXT,
    time_label TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audience_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    city TEXT,
    occupation TEXT,
    industry TEXT,
    verified INTEGER DEFAULT 0,
    expertise_json TEXT DEFAULT '[]',
    match_pct INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    builder_id INTEGER NOT NULL REFERENCES builders(id) ON DELETE CASCADE,
    date_label TEXT,
    description TEXT,
    type TEXT CHECK(type IN ('credit','debit')) NOT NULL,
    amount INTEGER NOT NULL,
    mission_id TEXT REFERENCES missions(id) ON DELETE SET NULL,
    payment_ref TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    builder_id INTEGER NOT NULL REFERENCES builders(id) ON DELETE CASCADE,
    date_label TEXT,
    amount INTEGER,
    status TEXT DEFAULT 'Paid'
  );

  CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    builder_id INTEGER NOT NULL REFERENCES builders(id) ON DELETE CASCADE,
    brand TEXT,
    last4 TEXT,
    exp TEXT,
    is_primary INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    builder_id INTEGER NOT NULL REFERENCES builders(id) ON DELETE CASCADE,
    icon TEXT,
    tone TEXT,
    title TEXT,
    body TEXT,
    time_label TEXT,
    unread INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY,
    builder_id INTEGER NOT NULL REFERENCES builders(id) ON DELETE CASCADE,
    name TEXT,
    role TEXT,
    mission_id TEXT REFERENCES missions(id) ON DELETE SET NULL,
    mission_name TEXT,
    time_label TEXT
  );

  CREATE TABLE IF NOT EXISTS thread_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    sender TEXT CHECK(sender IN ('me','them')) NOT NULL,
    text TEXT NOT NULL,
    time_label TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS mission_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    section TEXT CHECK(section IN ('brief','submissions')) NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    size TEXT,
    by TEXT,
    when_label TEXT,
    file_path TEXT,
    mime_type TEXT
  );

  /* ============ VALIDATOR SIDE ============ */

  CREATE TABLE IF NOT EXISTS validators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    handle TEXT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    oauth_provider TEXT,
    oauth_id TEXT,
    phone TEXT,
    phone_verified INTEGER DEFAULT 0,
    payout_vpa TEXT,
    razorpay_contact_id TEXT,
    razorpay_fund_account_id TEXT,
    level INTEGER DEFAULT 1,
    rating REAL DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    accuracy INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    specialties_json TEXT DEFAULT '[]',
    week_earnings INTEGER DEFAULT 0,
    week_target INTEGER DEFAULT 0,
    pending INTEGER DEFAULT 0,
    available INTEGER DEFAULT 0,
    lifetime INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    accept_rate INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS validator_sessions (
    token TEXT PRIMARY KEY,
    validator_id INTEGER NOT NULL REFERENCES validators(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now'))
  );

  /* marketplace listings */
  CREATE TABLE IF NOT EXISTS vtasks (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    product TEXT NOT NULL,
    tagline TEXT,
    company TEXT,
    reward INTEGER DEFAULT 0,
    minutes INTEGER DEFAULT 0,
    match_pct INTEGER DEFAULT 0,
    spots_left INTEGER DEFAULT 0,
    spots_total INTEGER DEFAULT 0,
    deadline_label TEXT,
    posted_h INTEGER DEFAULT 0,
    brief TEXT,
    steps_json TEXT DEFAULT '[]',
    hot INTEGER DEFAULT 0,
    verified INTEGER DEFAULT 0,
    featured INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS v_saved (
    validator_id INTEGER NOT NULL REFERENCES validators(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL REFERENCES vtasks(id) ON DELETE CASCADE,
    PRIMARY KEY (validator_id, task_id)
  );

  /* a validator's relationship to a task: applied/active/submitted/completed/rejected */
  CREATE TABLE IF NOT EXISTS v_my_missions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    validator_id INTEGER NOT NULL REFERENCES validators(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL REFERENCES vtasks(id) ON DELETE CASCADE,
    status TEXT CHECK(status IN ('applied','active','submitted','completed','rejected')) NOT NULL,
    progress INTEGER DEFAULT 0,
    quality TEXT,
    reason TEXT,
    score INTEGER,
    ratings_json TEXT,
    flags_json TEXT,
    notes TEXT,
    minutes_spent INTEGER,
    status_label TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS v_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    validator_id INTEGER NOT NULL REFERENCES validators(id) ON DELETE CASCADE,
    cat TEXT,
    icon TEXT,
    tone TEXT,
    title TEXT,
    body TEXT,
    time_label TEXT,
    unread INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS v_threads (
    id TEXT PRIMARY KEY,
    validator_id INTEGER NOT NULL REFERENCES validators(id) ON DELETE CASCADE,
    name TEXT,
    role TEXT,
    mission TEXT,
    time_label TEXT
  );

  CREATE TABLE IF NOT EXISTS v_thread_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id TEXT NOT NULL REFERENCES v_threads(id) ON DELETE CASCADE,
    sender TEXT CHECK(sender IN ('me','them')) NOT NULL,
    text TEXT NOT NULL,
    time_label TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS b_tickets (
    id TEXT PRIMARY KEY,
    builder_id INTEGER NOT NULL REFERENCES builders(id) ON DELETE CASCADE,
    subject TEXT,
    category TEXT,
    details TEXT,
    status TEXT CHECK(status IN ('open','answered','resolved')) DEFAULT 'open',
    priority TEXT DEFAULT 'normal',
    updated_label TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS v_tickets (
    id TEXT PRIMARY KEY,
    validator_id INTEGER NOT NULL REFERENCES validators(id) ON DELETE CASCADE,
    subject TEXT,
    category TEXT,
    details TEXT,
    status TEXT CHECK(status IN ('open','answered','resolved')) DEFAULT 'open',
    priority TEXT DEFAULT 'normal',
    updated_label TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  /* ============ PHONE VERIFICATION (Firebase Phone Auth) ============ */

  CREATE TABLE IF NOT EXISTS step_up_tokens (
    token TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    purpose TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  /* ============ PAYOUTS ============ */

  CREATE TABLE IF NOT EXISTS withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    validator_id INTEGER NOT NULL REFERENCES validators(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    vpa TEXT,
    razorpay_payout_id TEXT,
    status TEXT DEFAULT 'queued',
    failure_reason TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  `);

  // Migrations for databases created before OAuth support was added.
  const builderCols = db.prepare(`PRAGMA table_info(builders)`).all().map(c => c.name);
  if (!builderCols.includes("oauth_provider")) {
    db.exec(`ALTER TABLE builders ADD COLUMN oauth_provider TEXT`);
  }
  if (!builderCols.includes("oauth_id")) {
    db.exec(`ALTER TABLE builders ADD COLUMN oauth_id TEXT`);
  }
  if (!builderCols.includes("phone")) {
    db.exec(`ALTER TABLE builders ADD COLUMN phone TEXT`);
  }
  if (!builderCols.includes("phone_verified")) {
    db.exec(`ALTER TABLE builders ADD COLUMN phone_verified INTEGER DEFAULT 0`);
  }
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_builders_oauth ON builders(oauth_provider, oauth_id) WHERE oauth_provider IS NOT NULL`);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_builders_phone ON builders(phone) WHERE phone_verified = 1`);

  const validatorCols = db.prepare(`PRAGMA table_info(validators)`).all().map(c => c.name);
  if (!validatorCols.includes("oauth_provider")) {
    db.exec(`ALTER TABLE validators ADD COLUMN oauth_provider TEXT`);
  }
  if (!validatorCols.includes("oauth_id")) {
    db.exec(`ALTER TABLE validators ADD COLUMN oauth_id TEXT`);
  }
  if (!validatorCols.includes("phone")) {
    db.exec(`ALTER TABLE validators ADD COLUMN phone TEXT`);
  }
  if (!validatorCols.includes("phone_verified")) {
    db.exec(`ALTER TABLE validators ADD COLUMN phone_verified INTEGER DEFAULT 0`);
  }
  if (!validatorCols.includes("payout_vpa")) {
    db.exec(`ALTER TABLE validators ADD COLUMN payout_vpa TEXT`);
  }
  if (!validatorCols.includes("razorpay_contact_id")) {
    db.exec(`ALTER TABLE validators ADD COLUMN razorpay_contact_id TEXT`);
  }
  if (!validatorCols.includes("razorpay_fund_account_id")) {
    db.exec(`ALTER TABLE validators ADD COLUMN razorpay_fund_account_id TEXT`);
  }
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_validators_oauth ON validators(oauth_provider, oauth_id) WHERE oauth_provider IS NOT NULL`);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_validators_phone ON validators(phone) WHERE phone_verified = 1`);

  const txnCols = db.prepare(`PRAGMA table_info(transactions)`).all().map(c => c.name);
  if (!txnCols.includes("payment_ref")) {
    db.exec(`ALTER TABLE transactions ADD COLUMN payment_ref TEXT`);
  }
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_payment_ref ON transactions(payment_ref) WHERE payment_ref IS NOT NULL`);

  // ---- Admin console support ----
  if (!builderCols.includes("status")) {
    db.exec(`ALTER TABLE builders ADD COLUMN status TEXT DEFAULT 'active'`);
  }
  if (!validatorCols.includes("status")) {
    db.exec(`ALTER TABLE validators ADD COLUMN status TEXT DEFAULT 'active'`);
  }
  for (const table of ["b_tickets", "v_tickets"]) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
    if (!cols.includes("reply")) db.exec(`ALTER TABLE ${table} ADD COLUMN reply TEXT`);
  }

  // ---- Founder onboarding (self-serve signup) ----
  if (!builderCols.includes("designation")) {
    db.exec(`ALTER TABLE builders ADD COLUMN designation TEXT`);
  }
  if (!builderCols.includes("website")) {
    db.exec(`ALTER TABLE builders ADD COLUMN website TEXT`);
  }
  if (!builderCols.includes("verified_at")) {
    db.exec(`ALTER TABLE builders ADD COLUMN verified_at TEXT`);
  }
  if (!builderCols.includes("persona")) {
    db.exec(`ALTER TABLE builders ADD COLUMN persona TEXT DEFAULT 'founder'`);
  }
  if (!builderCols.includes("profile_json")) {
    db.exec(`ALTER TABLE builders ADD COLUMN profile_json TEXT`);
  }

  // ---- Admin: verification queue ----
  db.exec(`
    CREATE TABLE IF NOT EXISTS verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      builder_id INTEGER NOT NULL REFERENCES builders(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      subject TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      reviewed_at TEXT
    );
  `);

  // ---- Admin: mission flagging (post-publish moderation, not a pre-publish gate) ----
  const missionCols = db.prepare(`PRAGMA table_info(missions)`).all().map(c => c.name);
  if (!missionCols.includes("flagged")) {
    db.exec(`ALTER TABLE missions ADD COLUMN flagged INTEGER DEFAULT 0`);
  }
  if (!missionCols.includes("flag_reason")) {
    db.exec(`ALTER TABLE missions ADD COLUMN flag_reason TEXT`);
  }
  if (!missionCols.includes("flagged_at")) {
    db.exec(`ALTER TABLE missions ADD COLUMN flagged_at TEXT`);
  }
}

migrate();
