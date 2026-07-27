import 'dotenv/config';
import { pool } from "./src/db.js";

async function run() {
  try {
    await pool.query(`ALTER TABLE interview_schedules ADD COLUMN validator_notes TEXT;`);
    console.log("Successfully added validator_notes to interview_schedules");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

run();
