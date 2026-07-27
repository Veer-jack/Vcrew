import { db, initDb, pool } from "./src/db.js";
await initDb();
try {
  const m = await db.prepare("SELECT * FROM missions WHERE id = 'm_b0c2c5f7'").get();
  console.log("Mission:", m.id, m.duration_days);
  const p = await db.prepare("SELECT accepted_at FROM mission_participants WHERE mission_id = 'm_b0c2c5f7' LIMIT 1").get();
  console.log("Participant:", p.accepted_at);
  const checkins = await db.prepare("SELECT * FROM checkins WHERE mission_id = 'm_b0c2c5f7' ORDER BY day_number ASC").all();
  console.log("Checkins:", checkins.length);
} catch (e) {
  console.error("Error:", e);
}
pool.end();
