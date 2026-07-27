import 'dotenv/config';
import { db } from './src/db.js';

async function migrate() {
  console.log("Starting unified messaging migration...");
  
  console.log("Dropping fragmented v_threads tables...");
  await db.exec(`DROP TABLE IF EXISTS v_thread_messages CASCADE`);
  await db.exec(`DROP TABLE IF EXISTS v_threads CASCADE`);
  
  console.log("Wiping corrupted mock data from threads tables...");
  await db.exec(`TRUNCATE TABLE thread_messages CASCADE`);
  await db.exec(`TRUNCATE TABLE threads CASCADE`);
  
  console.log("Altering threads table to include validator_id...");
  try {
    await db.exec(`ALTER TABLE threads ADD COLUMN validator_id INTEGER REFERENCES validators(id) ON DELETE CASCADE`);
    console.log("Successfully added validator_id column.");
  } catch (err) {
    if (err.message.includes("already exists")) {
      console.log("validator_id column already exists, skipping...");
    } else {
      console.error("Error altering table:", err.message);
    }
  }

  console.log("Migration complete!");
  process.exit(0);
}

migrate();
