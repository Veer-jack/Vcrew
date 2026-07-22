import { pool } from "./src/db.js";

async function run() {
  const emails = [
    'rk.ravikiran789@gmail.com',
    's210222@rguktsklm.ac.in',
    'rkgit7767@gmail.com',
    's210676@rguktsklm.ac.in'
  ];
  
  for (const email of emails) {
    await pool.query("DELETE FROM builders WHERE email = $1", [email]);
    console.log(`Deleted ${email}`);
  }
  
  process.exit(0);
}
run();
