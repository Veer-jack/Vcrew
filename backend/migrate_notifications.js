import 'dotenv/config';
import { db } from './src/db.js';

async function migrate() {
  console.log("Starting notification schema migration...");
  
  console.log("Altering notifications table to include cat...");
  try {
    await db.exec(`ALTER TABLE notifications ADD COLUMN cat TEXT`);
    console.log("Successfully added cat column.");
  } catch (err) {
    if (err.message.includes("already exists")) {
      console.log("cat column already exists, skipping...");
    } else {
      console.error("Error altering table:", err.message);
    }
  }

  console.log("Backfilling missing cat values to 'system'...");
  await db.exec(`UPDATE notifications SET cat = 'system' WHERE cat IS NULL`);
  console.log("Successfully updated existing mock notifications.");

  console.log("Migration complete!");
  process.exit(0);
}

migrate();
