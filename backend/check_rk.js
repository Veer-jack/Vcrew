import { pool } from "./src/db.js";

async function run() {
  const res = await pool.query("SELECT email, persona, role FROM builders WHERE email = 'rk.ravikiran789@gmail.com'");
  console.log(res.rows);
  process.exit(0);
}
run();
