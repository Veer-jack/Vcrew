import 'dotenv/config';
import { db } from './src/db.js';
import fs from 'fs';
import path from 'path';

async function migrate() {
  console.log("Creating mission_invitations table...");
  const sql = fs.readFileSync(path.join(process.cwd(), 'src', 'schema.sql'), 'utf8');
  const ddl = sql.match(/CREATE TABLE IF NOT EXISTS mission_invitations[^;]+;/)[0];
  await db.exec(ddl);
  console.log("Migration complete!");
  process.exit(0);
}

migrate();
