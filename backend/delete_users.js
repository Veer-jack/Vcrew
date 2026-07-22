import { pool } from "./src/db.js";

async function run() {
  await pool.query("DELETE FROM builders WHERE email = 's210222@rguktsklm.ac.in'");
  console.log("Deleted Mouni");
  await pool.query("DELETE FROM builders WHERE email = 'rk.ravikiran789@gmail.com'");
  console.log("Deleted RK");
  process.exit(0);
}
run();
