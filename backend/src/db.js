import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => console.error("PG pool error:", err));

// Convert SQLite ? placeholders → PostgreSQL $1, $2, ...
function toPostgres(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
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
};

export async function initDb() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  const client = await pool.connect();
  try {
    await client.query(schema);
    console.log("✅ PostgreSQL connected + schema applied");
  } finally {
    client.release();
  }
}
