import { db } from './src/db.js';

(async () => {
  try {
    await db.prepare('ALTER TABLE participants ADD COLUMN IF NOT EXISTS role TEXT').run();
    await db.prepare('ALTER TABLE participants ADD COLUMN IF NOT EXISTS city TEXT').run();
    await db.prepare('ALTER TABLE participants ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT \'accepted\'').run();
    await db.prepare('ALTER TABLE participants ADD COLUMN IF NOT EXISTS reward INTEGER DEFAULT 0').run();
    await db.prepare('ALTER TABLE participants ADD COLUMN IF NOT EXISTS trust INTEGER DEFAULT 0').run();
    console.log("Added missing columns to participants");
  } catch (e) {
    console.log(e.message);
  }
  process.exit(0);
})();
