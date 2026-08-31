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
  status TEXT DEFAULT 'active',
  preferred_language TEXT DEFAULT 'en',
  onboarding_completed_at TIMESTAMPTZ,
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
  -- Three-type onboarding fields
  validator_type TEXT DEFAULT 'validator', -- user | validator | tester
  tester_status TEXT DEFAULT 'none', -- none | pending_review | approved | rejected
  tester_tier TEXT, -- junior | senior
  tester_proof_url TEXT,
  tester_proof_name TEXT,
  city TEXT,
  city_type TEXT,
  languages_json TEXT DEFAULT '[]',
  age_group TEXT,
  gender TEXT,
  marital_status TEXT,
  has_kids TEXT,
  income_bracket TEXT,
  height TEXT,
  weight TEXT,
  skin_tone TEXT,
  hair_type TEXT,
  hair_length TEXT,
  body_type TEXT,
  occupation TEXT,
  food_preference TEXT,
  lifestyle_json TEXT DEFAULT '[]',
  shopping_preference TEXT,
  devices_json TEXT DEFAULT '[]',
  hours_per_week TEXT,
  role TEXT DEFAULT 'User' CHECK (role IN ('User', 'Tester', 'Validator')),
  experience_years TEXT,
  industry_json TEXT DEFAULT '[]',
  company TEXT,
  product_types_json TEXT DEFAULT '[]',
  tech_tools_json TEXT DEFAULT '[]',
  testing_domains_json TEXT DEFAULT '[]',
  certifications_json TEXT DEFAULT '[]',
  linkedin_url TEXT,
  portfolio_url TEXT,
  resume_path TEXT,
  testing_bio TEXT,
  -- From HEAD branch (stats and escrow)
  payout_vpa TEXT,
  razorpay_contact_id TEXT,
  razorpay_fund_account_id TEXT,
  industry TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  address_city TEXT,
  address_state TEXT,
  address_postal_code TEXT,
  address_country TEXT,
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
  flagged_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS participants (
  id SERIAL PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  validator_id INTEGER,
  name TEXT,
  email TEXT,
  role TEXT,
  city TEXT,
  stage TEXT DEFAULT 'accepted',
  reward INTEGER DEFAULT 0,
  trust INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mission_invitations (
  id SERIAL PRIMARY KEY,
  builder_id INTEGER REFERENCES builders(id) ON DELETE CASCADE,
  validator_id INTEGER REFERENCES validators(id) ON DELETE CASCADE,
  mission_id TEXT REFERENCES missions(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mission_id, validator_id)
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
  status TEXT DEFAULT 'pending',
  -- Accumulated seconds the validator actually had this task's tab visible
  -- and focused, tracked client-side and reported on every draft save and
  -- final submit — distinct from submitted_at - joined_at, which counts
  -- wall-clock time including however long the task sat open unattended.
  active_seconds INTEGER,
  -- How many times a builder has sent this response back for revision.
  -- Capped at one revision cycle: once this is >= 1, the builder's only
  -- options are Approve or Reject, not another revision request — avoids an
  -- unbounded back-and-forth with no resolution.
  revision_count INTEGER DEFAULT 0
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
  cat TEXT,
  type TEXT,
  icon TEXT,
  tone TEXT,
  title TEXT,
  body TEXT,
  time_label TEXT,
  unread INTEGER DEFAULT 1,
  read INTEGER DEFAULT 0,
  target_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_notifications (
  id SERIAL PRIMARY KEY,
  cat TEXT,
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
  validator_id INTEGER REFERENCES validators(id) ON DELETE CASCADE,
  mission_id TEXT REFERENCES missions(id) ON DELETE SET NULL,
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  builder_read_at TIMESTAMPTZ,
  validator_read_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS thread_messages (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER REFERENCES threads(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,
  sender_id INTEGER,
  body TEXT,
  attachment_path TEXT,
  attachment_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mission_files (
  id SERIAL PRIMARY KEY,
  mission_id TEXT REFERENCES missions(id) ON DELETE CASCADE,
  section TEXT DEFAULT 'brief',
  uploader_role TEXT,
  uploader_id INTEGER,
  filename TEXT,
  name TEXT,
  kind TEXT,
  file_path TEXT,
  mime_type TEXT,
  url TEXT,
  size TEXT,
  "by" TEXT,
  when_label TEXT,
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
  target_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);



-- Local mirror of support tickets created via /support and /v/support. Always written to,
-- regardless of whether Freshdesk is configured, so a ticket never silently vanishes if
-- FRESHDESK_DOMAIN/FRESHDESK_API_KEY are unset or the Freshdesk API call fails.
CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL, -- 'builder' | 'validator'
  email TEXT NOT NULL,
  name TEXT,
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  freshdesk_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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

CREATE TABLE IF NOT EXISTS sample_shipments (
  id SERIAL PRIMARY KEY,
  mission_id TEXT REFERENCES missions(id) ON DELETE CASCADE,
  validator_id INTEGER REFERENCES validators(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'awaiting_shipment' CHECK (status IN ('awaiting_shipment', 'shipped', 'received')),
  tracking_number TEXT,
  carrier TEXT,
  shipped_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_schedules (
  id SERIAL PRIMARY KEY,
  mission_id TEXT REFERENCES missions(id) ON DELETE CASCADE,
  validator_id INTEGER REFERENCES validators(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'declined', 'completed')),
  scheduled_at TIMESTAMPTZ,
  meeting_link TEXT,
  validator_notes TEXT,
  responded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (mission_id, validator_id)
);

CREATE TABLE IF NOT EXISTS focus_group_polls (
  id SERIAL PRIMARY KEY,
  mission_id TEXT REFERENCES missions(id) ON DELETE CASCADE,
  meeting_link TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked', 'completed')),
  locked_slot_id INTEGER,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (mission_id)
);

CREATE TABLE IF NOT EXISTS focus_group_slots (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER REFERENCES focus_group_polls(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS focus_group_responses (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER REFERENCES focus_group_polls(id) ON DELETE CASCADE,
  validator_id INTEGER REFERENCES validators(id) ON DELETE CASCADE,
  slot_id INTEGER REFERENCES focus_group_slots(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (poll_id, validator_id, slot_id)
);

-- Caches dynamic-content translations (mission text, notifications, etc) so
-- the same (entity, field, language) combination is only ever sent to the
-- translation API once. source_hash changes whenever the original text is
-- edited, so an edit naturally invalidates the old cache entry without any
-- explicit invalidation logic -- the new hash just won't have a match yet.
CREATE TABLE IF NOT EXISTS translation_cache (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  field TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  lang TEXT NOT NULL,
  translated TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (entity_type, entity_id, field, lang, source_hash)
);

-- ==============================================
-- PERFORMANCE INDEXES (O(log N) Lookups)
-- ==============================================
-- Composite, not a plain builder_id index — covers every existing
-- builder_id-only query via the B-tree leftmost-prefix rule (analytics,
-- dashboard summaries), while also directly serving the builder_id+status
-- queries (drafts list, active-mission cap checks) without an extra
-- in-memory filter step. One index instead of two overlapping ones, so
-- write-time maintenance cost doesn't double.
DROP INDEX IF EXISTS idx_missions_builder_id;
CREATE INDEX IF NOT EXISTS idx_missions_builder_status ON missions(builder_id, status);
CREATE INDEX IF NOT EXISTS idx_participants_mission_id ON participants(mission_id);
CREATE INDEX IF NOT EXISTS idx_participants_validator_id ON participants(validator_id);
CREATE INDEX IF NOT EXISTS idx_responses_mission_id ON responses(mission_id);
CREATE INDEX IF NOT EXISTS idx_responses_participant_id ON responses(participant_id);
CREATE INDEX IF NOT EXISTS idx_v_my_missions_validator_id ON v_my_missions(validator_id);
CREATE INDEX IF NOT EXISTS idx_v_my_missions_mission_id ON v_my_missions(mission_id);
CREATE INDEX IF NOT EXISTS idx_activity_builder_id ON activity(builder_id);
CREATE INDEX IF NOT EXISTS idx_transactions_builder_id ON transactions(builder_id);
