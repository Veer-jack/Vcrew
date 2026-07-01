-- ValidationCrew PostgreSQL Schema
-- Run on every startup — all statements are idempotent (IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS builders (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  org TEXT NOT NULL DEFAULT '',
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL DEFAULT '',
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
  designation TEXT,
  website TEXT,
  persona TEXT DEFAULT 'founder',
  profile_json TEXT,
  verified_at TIMESTAMPTZ,
  preferred_language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  builder_id INTEGER NOT NULL REFERENCES builders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip TEXT,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS admin_pending_2fa (
  token TEXT PRIMARY KEY,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,
  builder_id INTEGER NOT NULL REFERENCES builders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT NOT NULL DEFAULT '',
  ptype TEXT NOT NULL DEFAULT '',
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
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  flagged INTEGER DEFAULT 0,
  flag_reason TEXT,
  flagged_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS participants (
  id SERIAL PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  validator_id INTEGER,
  name TEXT,
  email TEXT,
  status TEXT DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS responses (
  id SERIAL PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  participant_id INTEGER REFERENCES participants(id) ON DELETE CASCADE,
  validator_id INTEGER,
  data_json TEXT DEFAULT '{}',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  score REAL,
  flagged INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS activity (
  id SERIAL PRIMARY KEY,
  builder_id INTEGER REFERENCES builders(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT,
  detail TEXT,
  amount INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audience_members (
  id SERIAL PRIMARY KEY,
  builder_id INTEGER REFERENCES builders(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  tags_json TEXT DEFAULT '[]',
  meta_json TEXT DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  builder_id INTEGER REFERENCES builders(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  ref TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  builder_id INTEGER REFERENCES builders(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'draft',
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id SERIAL PRIMARY KEY,
  builder_id INTEGER REFERENCES builders(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  last4 TEXT,
  brand TEXT,
  is_default INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  builder_id INTEGER REFERENCES builders(id) ON DELETE CASCADE,
  type TEXT,
  icon TEXT,
  tone TEXT,
  title TEXT,
  body TEXT,
  time_label TEXT,
  unread INTEGER DEFAULT 1,
  read INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS threads (
  id SERIAL PRIMARY KEY,
  builder_id INTEGER REFERENCES builders(id) ON DELETE CASCADE,
  mission_id TEXT REFERENCES missions(id) ON DELETE SET NULL,
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS thread_messages (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER REFERENCES threads(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,
  sender_id INTEGER,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mission_files (
  id SERIAL PRIMARY KEY,
  mission_id TEXT REFERENCES missions(id) ON DELETE CASCADE,
  uploader_role TEXT,
  uploader_id INTEGER,
  filename TEXT,
  name TEXT,
  file_path TEXT,
  mime_type TEXT,
  url TEXT,
  size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS validators (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  handle TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  oauth_provider TEXT,
  oauth_id TEXT,
  phone TEXT,
  phone_verified INTEGER DEFAULT 0,
  bio TEXT,
  avatar TEXT,
  specialties_json TEXT DEFAULT '[]',
  location TEXT,
  verified INTEGER DEFAULT 0,
  verification_status TEXT DEFAULT 'unverified',
  rating REAL DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  missions_done INTEGER DEFAULT 0,
  earnings_total INTEGER DEFAULT 0,
  earnings_pending INTEGER DEFAULT 0,
  earnings_paid INTEGER DEFAULT 0,
  balance INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS validator_sessions (
  token TEXT PRIMARY KEY,
  validator_id INTEGER NOT NULL REFERENCES validators(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip TEXT,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS fraud_signals (
  id SERIAL PRIMARY KEY,
  signal TEXT NOT NULL,
  role TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  detail TEXT,
  severity TEXT DEFAULT 'low',
  reviewed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS v_my_missions (
  id SERIAL PRIMARY KEY,
  validator_id INTEGER NOT NULL REFERENCES validators(id) ON DELETE CASCADE,
  mission_id TEXT REFERENCES missions(id) ON DELETE SET NULL,
  task_id TEXT REFERENCES vtasks(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'applied',
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  reward INTEGER DEFAULT 0,
  submission_json TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS v_notifications (
  id SERIAL PRIMARY KEY,
  validator_id INTEGER NOT NULL REFERENCES validators(id) ON DELETE CASCADE,
  cat TEXT,
  icon TEXT,
  tone TEXT,
  type TEXT,
  title TEXT,
  body TEXT,
  time_label TEXT,
  unread INTEGER DEFAULT 1,
  read INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS v_threads (
  id SERIAL PRIMARY KEY,
  validator_id INTEGER REFERENCES validators(id) ON DELETE CASCADE,
  mission_id TEXT REFERENCES missions(id) ON DELETE SET NULL,
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS v_thread_messages (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER REFERENCES v_threads(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,
  sender_id INTEGER,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS b_tickets (
  id SERIAL PRIMARY KEY,
  builder_id INTEGER REFERENCES builders(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS v_tickets (
  id SERIAL PRIMARY KEY,
  validator_id INTEGER REFERENCES validators(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS step_up_tokens (
  token TEXT PRIMARY KEY,
  builder_id INTEGER REFERENCES builders(id) ON DELETE CASCADE,
  purpose TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id SERIAL PRIMARY KEY,
  validator_id INTEGER REFERENCES validators(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  method TEXT,
  account_json TEXT DEFAULT '{}',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  note TEXT
);

CREATE TABLE IF NOT EXISTS verifications (
  id SERIAL PRIMARY KEY,
  validator_id INTEGER REFERENCES validators(id) ON DELETE CASCADE,
  builder_id INTEGER REFERENCES builders(id) ON DELETE CASCADE,
  type TEXT,
  kind TEXT,
  subject TEXT,
  note TEXT,
  status TEXT DEFAULT 'pending',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewer_note TEXT,
  data_json TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS checkins (
  id SERIAL PRIMARY KEY,
  mission_id TEXT REFERENCES missions(id) ON DELETE CASCADE,
  validator_id INTEGER REFERENCES validators(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL DEFAULT 1,
  answers_json TEXT DEFAULT '{}',
  screenshot_path TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
