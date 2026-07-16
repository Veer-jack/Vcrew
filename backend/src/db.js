import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
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
    
    const valCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='validators'");
    const vCols = valCols.rows.map(r => r.column_name);
    if (!vCols.includes('payout_vpa')) await client.query('ALTER TABLE validators ADD COLUMN payout_vpa TEXT');
    if (!vCols.includes('razorpay_contact_id')) await client.query('ALTER TABLE validators ADD COLUMN razorpay_contact_id TEXT');
    if (!vCols.includes('razorpay_fund_account_id')) await client.query('ALTER TABLE validators ADD COLUMN razorpay_fund_account_id TEXT');
    if (!vCols.includes('languages_json')) await client.query("ALTER TABLE validators ADD COLUMN languages_json TEXT DEFAULT '[]'");
    if (!vCols.includes('devices_json')) await client.query("ALTER TABLE validators ADD COLUMN devices_json TEXT DEFAULT '[]'");
    if (!vCols.includes('hours_per_week')) await client.query('ALTER TABLE validators ADD COLUMN hours_per_week TEXT');
    if (!vCols.includes('occupation')) await client.query('ALTER TABLE validators ADD COLUMN occupation TEXT');
    if (!vCols.includes('industry')) await client.query('ALTER TABLE validators ADD COLUMN industry TEXT');
    if (!vCols.includes('role')) await client.query("ALTER TABLE validators ADD COLUMN role TEXT DEFAULT 'User' CHECK (role IN ('User', 'Tester', 'Validator'))");
    if (!vCols.includes('location')) await client.query('ALTER TABLE validators ADD COLUMN location TEXT');
    if (!vCols.includes('bio')) await client.query('ALTER TABLE validators ADD COLUMN bio TEXT');
    if (!vCols.includes('phone_verified')) await client.query('ALTER TABLE validators ADD COLUMN phone_verified INTEGER DEFAULT 0');

    console.log("✅ PostgreSQL connected + schema applied");
  } finally {
    client.release();
  }
}
