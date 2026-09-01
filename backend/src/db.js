import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // The DB instance caps at 100 total connections shared across everything
  // that talks to it (this app, admin tooling, etc.) -- 20 leaves generous
  // headroom under that real ceiling. Node's async I/O means a modest pool
  // handles high concurrency fine; the bottleneck is query time and the DB
  // server's own CPU, not connection count. If real load testing shows this
  // is actually the bottleneck, reach for PgBouncer before just raising this.
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
});

pool.on("error", (err) => console.error("PG pool error:", err));

// Convert SQLite ? placeholders → PostgreSQL $1, $2, ... safely
function toPostgres(sql) {
  let inString = false;
  let result = '';
  let paramIndex = 0;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (c === "'") inString = !inString;
    if (c === '?' && !inString) {
      result += `$${++paramIndex}`;
    } else {
      result += c;
    }
  }
  return result;
}

// Flatten params — some callers use .run(a, b), some use .run([a, b])
function flat(params) {
  if (params.length === 1 && Array.isArray(params[0])) return params[0];
  return params;
}

async function query(sql, params = []) {
  const pgSql = toPostgres(sql);
  const client = await pool.connect();
  try {
    const res = await client.query(pgSql, params);
    return { rows: res.rows, rowCount: res.rowCount };
  } finally {
    client.release();
  }
}

// Async drop-in for better-sqlite3's prepare() API.
// All callers must await: await db.prepare(`...`).get(id)
export const db = {
  prepare: (sql) => ({
    get: async (...params) => {
      const { rows } = await query(sql, flat(params));
      return rows[0] ?? null;
    },
    all: async (...params) => {
      const { rows } = await query(sql, flat(params));
      return rows;
    },
    run: async (...params) => {
      const isInsert = /^\s*INSERT/i.test(sql);
      // Only append RETURNING id for tables that have a serial id column
      const hasIdCol = !/INTO sessions|INTO validator_sessions|INTO admin_sessions|INTO admin_settings|INTO admin_pending_2fa|INTO v_saved|INTO step_up_tokens|INTO password_reset_tokens/i.test(sql);
      const finalSql = isInsert && hasIdCol && !/RETURNING/i.test(sql) ? `${sql} RETURNING id` : sql;
      const { rows, rowCount } = await query(finalSql, flat(params));
      return { changes: rowCount, lastInsertRowid: rows[0]?.id ?? null };
    },
  }),
  exec: async (sql) => {
    await query(sql, []);
  },
  transaction: async (cb) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tDb = {
        prepare: (sql) => ({
          get: async (...params) => { const r = await client.query(toPostgres(sql), flat(params)); return r.rows[0] ?? null; },
          all: async (...params) => { const r = await client.query(toPostgres(sql), flat(params)); return r.rows; },
          run: async (...params) => {
            const pgSql = toPostgres(sql);
            const isInsert = /^\s*INSERT/i.test(sql);
            const hasIdCol = !/INTO sessions|INTO validator_sessions|INTO admin_sessions|INTO admin_settings|INTO admin_pending_2fa|INTO v_saved|INTO step_up_tokens|INTO password_reset_tokens/i.test(sql);
            const finalSql = isInsert && hasIdCol && !/RETURNING/i.test(pgSql) ? `${pgSql} RETURNING id` : pgSql;
            const r = await client.query(finalSql, flat(params));
            return { changes: r.rowCount, lastInsertRowid: r.rows[0]?.id ?? null };
          }
        }),
        exec: async (sql) => client.query(toPostgres(sql))
      };
      const result = await cb(tDb);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
};

export async function initDb() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  const client = await pool.connect();
  try {
    await client.query(schema);
    // Column migrations
    const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='missions'");
    const mCols = cols.rows.map(r => r.column_name);
    if (!mCols.includes('tasks_json')) await client.query('ALTER TABLE missions ADD COLUMN tasks_json TEXT');
    if (!mCols.includes('brief_url')) await client.query('ALTER TABLE missions ADD COLUMN brief_url TEXT');
    if (!mCols.includes('brief_credentials')) await client.query('ALTER TABLE missions ADD COLUMN brief_credentials TEXT');
    if (!mCols.includes('duration_days')) await client.query('ALTER TABLE missions ADD COLUMN duration_days INTEGER DEFAULT 7');
    // Set when a builder restarts a focus group poll, cleared once the
    // replacement poll is created — lets validators be told "restarted,
    // new times coming soon" instead of the generic first-time-waiting copy.
    if (!mCols.includes('focus_group_poll_restarted_at')) await client.query('ALTER TABLE missions ADD COLUMN focus_group_poll_restarted_at TIMESTAMPTZ');
    // The AI test-case-generation form (description/URL/platform/goals/
    // target users) and the inputs the current tasks were actually generated
    // from — never part of the mission's own fields, only ever wizard state,
    // so resuming a draft/editing a mission had nothing to rehydrate the
    // Define-the-Test form from and it came back empty even though the
    // already-generated tasks themselves loaded fine.
    if (!mCols.includes('test_case_form_json')) await client.query('ALTER TABLE missions ADD COLUMN test_case_form_json TEXT');
    // Set once, the moment status actually becomes 'completed' (see the
    // PATCH /:id handler) -- powers the Missions "All" tab's Completed Date
    // column, distinct from deadline (a planned date, not when it actually happened).
    if (!mCols.includes('completed_at')) await client.query('ALTER TABLE missions ADD COLUMN completed_at TIMESTAMPTZ');
    // Same idea as completed_at, for when status actually becomes 'closed' --
    // powers the Missions Closed tab's Closed Date column.
    if (!mCols.includes('closed_at')) await client.query('ALTER TABLE missions ADD COLUMN closed_at TIMESTAMPTZ');
    const rCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='responses'");
    const rColNames = rCols.rows.map(r => r.column_name);
    if (!rColNames.includes('active_seconds')) await client.query('ALTER TABLE responses ADD COLUMN active_seconds INTEGER');
    if (!rColNames.includes('revision_count')) await client.query('ALTER TABLE responses ADD COLUMN revision_count INTEGER DEFAULT 0');
    // Validator type migrations and other new columns
    const vCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='validators'");
    const vColNames = vCols.rows.map(r => r.column_name);
    const newVCols = [
      ['validator_type', 'TEXT DEFAULT \'validator\''],
      ['tester_status', 'TEXT DEFAULT \'none\''],
      ['tester_tier', 'TEXT'],
      ['city', 'TEXT'],
      ['city_type', 'TEXT'],
      ['languages_json', "TEXT DEFAULT '[]'"],
      ['age_group', 'TEXT'],
      ['gender', 'TEXT'],
      ['marital_status', 'TEXT'],
      ['has_kids', 'TEXT'],
      ['income_bracket', 'TEXT'],
      ['height', 'TEXT'],
      ['weight', 'TEXT'],
      ['skin_tone', 'TEXT'],
      ['hair_type', 'TEXT'],
      ['hair_length', 'TEXT'],
      ['body_type', 'TEXT'],
      ['occupation', 'TEXT'],
      ['food_preference', 'TEXT'],
      ['lifestyle_json', "TEXT DEFAULT '[]'"],
      ['shopping_preference', 'TEXT'],
      ['devices_json', "TEXT DEFAULT '[]'"],
      ['hours_per_week', 'TEXT'],
      ['role', "TEXT DEFAULT 'User' CHECK (role IN ('User', 'Tester', 'Validator'))"],
      ['experience_years', 'TEXT'],
      ['industry_json', "TEXT DEFAULT '[]'"],
      ['company', 'TEXT'],
      ['product_types_json', "TEXT DEFAULT '[]'"],
      ['tech_tools_json', "TEXT DEFAULT '[]'"],
      ['testing_domains_json', "TEXT DEFAULT '[]'"],
      ['certifications_json', "TEXT DEFAULT '[]'"],
      ['linkedin_url', 'TEXT'],
      ['portfolio_url', 'TEXT'],
      ['resume_path', 'TEXT'],
      ['resume_filename', 'TEXT'],
      ['testing_bio', 'TEXT'],
      // From HEAD branch (stats and escrow)
      ['payout_vpa', 'TEXT'],
      ['razorpay_contact_id', 'TEXT'],
      ['razorpay_fund_account_id', 'TEXT'],
      ['industry', 'TEXT'],
      ['location', 'TEXT'],
      ['bio', 'TEXT'],
      ['phone_verified', 'INTEGER DEFAULT 0'],
      ['address_line1', 'TEXT'],
      ['address_line2', 'TEXT'],
      ['address_city', 'TEXT'],
      ['address_state', 'TEXT'],
      ['address_postal_code', 'TEXT'],
      ['address_country', 'TEXT'],
      ['status', "TEXT DEFAULT 'active'"],
      ['streak', 'INTEGER DEFAULT 0'],
      ['last_active_date', 'DATE'],
      ['profile_completion', 'INTEGER DEFAULT 60'],
      ['preferred_language', "TEXT DEFAULT 'en'"]
    ];
    for (const [col, def] of newVCols) {
      if (!vColNames.includes(col)) {
        await client.query(`ALTER TABLE validators ADD COLUMN ${col} ${def}`);
      }
    }

    const vmmCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='v_my_missions'");
    const vmmColNames = vmmCols.rows.map(r => r.column_name);
    const newVmmCols = [
      ['progress', 'INTEGER DEFAULT 0'],
      ['quality', 'TEXT'],
      ['reason', 'TEXT'],
      ['status_label', 'TEXT'],
      ['score', 'REAL DEFAULT 0'],
      ['created_at', 'TIMESTAMPTZ DEFAULT NOW()'],
      ['updated_at', 'TIMESTAMPTZ DEFAULT NOW()']
    ];
    for (const [col, def] of newVmmCols) {
      if (!vmmColNames.includes(col)) {
        await client.query(`ALTER TABLE v_my_missions ADD COLUMN ${col} ${def}`);
      }
    }

    // vs.id was never a real column (v_saved's PK is validator_id+task_id) —
    // the "Saved" tab's ORDER BY vs.id was broken from day one, just never
    // hit until now. saved_at gives it a real, meaningful sort key instead.
    const vsCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='v_saved'");
    if (!vsCols.rows.some(r => r.column_name === 'saved_at')) {
      await client.query('ALTER TABLE v_saved ADD COLUMN saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
    }

    const tmCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='thread_messages'");
    const tmColNames = tmCols.rows.map(r => r.column_name);
    for (const col of ['attachment_path', 'attachment_name']) {
      if (!tmColNames.includes(col)) {
        await client.query(`ALTER TABLE thread_messages ADD COLUMN ${col} TEXT`);
      }
    }

    // threads.builder_read_at/validator_read_at power the real per-side
    // unread tracking in messages.js/vmessages.js. schema.sql only creates
    // them on a brand-new install (CREATE TABLE IF NOT EXISTS doesn't touch
    // an existing table), so any environment whose `threads` table predates
    // this column needs the same backfill every other column migration here gets.
    const trCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='threads'");
    const trColNames = trCols.rows.map(r => r.column_name);
    for (const col of ['builder_read_at', 'validator_read_at']) {
      if (!trColNames.includes(col)) {
        await client.query(`ALTER TABLE threads ADD COLUMN ${col} TIMESTAMPTZ`);
      }
    }

    const bCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='builders'");
    const bColNames = bCols.rows.map(r => r.column_name);
    if (!bColNames.includes('status')) {
      await client.query(`ALTER TABLE builders ADD COLUMN status TEXT DEFAULT 'active'`);
    }
    if (!bColNames.includes('onboarding_completed_at')) {
      await client.query(`ALTER TABLE builders ADD COLUMN onboarding_completed_at TIMESTAMPTZ`);
      // Backfill: profile_json alone doesn't prove real onboarding happened —
      // Settings' partial-field save (e.g. just Company Details) populates it
      // too, which used to make "!builder.profile" wrongly read as "onboarded"
      // for an account that never actually went through the wizard. Verified
      // accounts and anyone who's published a mission have unambiguously been
      // through it for real; created_at approximates when, since no exact
      // timestamp exists pre-migration. Everyone else stays NULL on purpose —
      // that's what correctly re-shows the "complete your profile" nudge for
      // an account that only ever touched Settings.
      await client.query(`
        UPDATE builders SET onboarding_completed_at = created_at
        WHERE onboarding_completed_at IS NULL
          AND (verified_at IS NOT NULL OR EXISTS (
            SELECT 1 FROM missions WHERE missions.builder_id = builders.id AND missions.status != 'draft'
          ))
      `);
    }

    await client.query(`
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
      )
    `);

    const vnCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='v_notifications'");
    const vnColNames = vnCols.rows.map(r => r.column_name);
    if (!vnColNames.includes('target_id')) {
      await client.query(`ALTER TABLE v_notifications ADD COLUMN target_id TEXT`);
    }

    const fgpCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='focus_group_polls'");
    const fgpColNames = fgpCols.rows.map(r => r.column_name);
    if (!fgpColNames.includes('is_restart')) {
      await client.query(`ALTER TABLE focus_group_polls ADD COLUMN is_restart BOOLEAN DEFAULT FALSE`);
    }

    console.log("✅ PostgreSQL connected + schema applied");
  } finally {
    client.release();
  }
}
