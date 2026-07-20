import { pool } from "./src/db.js";

async function run() {
  const res = await pool.query("SELECT column_name, column_default FROM information_schema.columns WHERE table_name = 'builders'");
  console.log(res.rows);
  process.exit(0);
}
run();
