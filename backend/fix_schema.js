import { pool } from "./src/db.js";

async function run() {
  await pool.query("ALTER TABLE builders ALTER COLUMN persona DROP DEFAULT");
  await pool.query("ALTER TABLE builders ALTER COLUMN role DROP DEFAULT");
  console.log("Dropped default for persona and role columns.");
  process.exit(0);
}
run();
