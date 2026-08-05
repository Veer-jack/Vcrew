import { db, pool } from "../src/db.js";

async function run() {
  const m = await db.prepare("SELECT id, reward_amount, target, spend FROM missions WHERE id = 'm_5c1305e0'").get();
  console.log("Mission:", m);
  const p = await db.prepare("SELECT * FROM participants WHERE mission_id = 'm_5c1305e0'").all();
  console.log("Participants:", p);
  pool.end();
}
run();
