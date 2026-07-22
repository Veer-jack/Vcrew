import { db } from './src/db.js';

(async () => {
  try {
    const joined = await db.prepare("SELECT * FROM v_my_missions WHERE mission_id IS NOT NULL").all();
    for (const j of joined) {
      const exists = await db.prepare("SELECT * FROM participants WHERE mission_id = ? AND validator_id = ?").get(j.mission_id, j.validator_id);
      if (!exists) {
        const val = await db.prepare("SELECT name FROM validators WHERE id = ?").get(j.validator_id);
        await db.prepare(`INSERT INTO participants (mission_id, validator_id, name, role, city, stage, reward, trust) VALUES (?, ?, ?, 'Validator', 'Unknown', 'accepted', 0, 95)`)
          .run(j.mission_id, j.validator_id, val ? val.name : "New Validator");
        console.log(`Backfilled participant ${j.validator_id} for mission ${j.mission_id}`);
      }
    }
  } catch (e) {
    console.log(e.message);
  }
  process.exit(0);
})();
