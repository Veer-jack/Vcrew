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

    const tmCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='thread_messages'");
    const tmColNames = tmCols.rows.map(r => r.column_name);
    for (const col of ['attachment_path', 'attachment_name']) {
      if (!tmColNames.includes(col)) {
        await client.query(`ALTER TABLE thread_messages ADD COLUMN ${col} TEXT`);
      }
    }

    const bCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='builders'");
    const bColNames = bCols.rows.map(r => r.column_name);
    if (!bColNames.includes('status')) {
      await client.query(`ALTER TABLE builders ADD COLUMN status TEXT DEFAULT 'active'`);
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

    console.log("✅ PostgreSQL connected + schema applied");
  } finally {
    client.release();
  }
}
