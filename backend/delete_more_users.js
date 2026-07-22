import { pool } from "./src/db.js";

async function run() {
  await pool.query("DELETE FROM builders WHERE email = 'rkgit7767@gmail.com'");
  console.log("Deleted rkgit7767@gmail.com");
  await pool.query("DELETE FROM builders WHERE email = 's210676@rguktsklm.ac.in'");
  console.log("Deleted s210676@rguktsklm.ac.in");
  process.exit(0);
}
run();
