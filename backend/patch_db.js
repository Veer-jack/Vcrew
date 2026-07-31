import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:wHFevgeDjQOrPhhzJQfFtbwTeXsMhrPY@reseau.proxy.rlwy.net:59053/railway', ssl: { rejectUnauthorized: false } });
async function run() {
  await pool.query("UPDATE notifications SET target_id = 'm_cdc85da8' WHERE type = 'schedule_accepted' AND target_id IS NULL");
  console.log('patched database');
  process.exit(0);
}
run();
