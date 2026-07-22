import { db } from "./db.js";

async function cleanup() {
  await db.prepare(`DELETE FROM v_my_missions WHERE mission_id IS NULL OR mission_id NOT IN (SELECT id FROM missions)`).run();
  console.log("Cleaned up orphaned records!");
  process.exit(0);
}

cleanup();
