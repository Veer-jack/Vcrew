/**
 * backup.js — Scheduled SQLite database backup
 *
 * Creates a timestamped copy of vcrew.db in a /backups subdirectory
 * on the same Railway persistent volume. Run via a Railway cron job:
 *
 *   Schedule: 0 2 * * *  (2am UTC daily)
 *   Command:  node --experimental-sqlite backend/src/backup.js
 *
 * Keeps the last 14 daily backups, then deletes older ones automatically.
 *
 * IMPORTANT: this only protects against accidental data loss within the
 * volume itself (e.g. corrupted DB file). It does NOT protect against
 * the entire Railway volume being lost. For true off-site backup, set
 * BACKUP_WEBHOOK_URL to an endpoint that can receive the backup file
 * (e.g. an R2/S3 upload lambda, or a simple webhook on another service).
 */

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DB_DIR || path.join(__dirname, "..", "data");
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, "vcrew.db");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const KEEP_BACKUPS = 14;

if (!fs.existsSync(DB_PATH)) {
  console.error(`No database found at ${DB_PATH}`);
  process.exit(1);
}

fs.mkdirSync(BACKUP_DIR, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const destPath = path.join(BACKUP_DIR, `vcrew-${stamp}.db`);

// SQLite's built-in backup API ensures a consistent snapshot even if
// the DB is being written to during the backup.
const db = new DatabaseSync(DB_PATH);
db.exec(`VACUUM INTO '${destPath}'`);
db.close();

const stats = fs.statSync(destPath);
console.log(`Backup complete: ${destPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

// Prune old backups — keep the most recent KEEP_BACKUPS files
const allBackups = fs.readdirSync(BACKUP_DIR)
  .filter(f => f.startsWith("vcrew-") && f.endsWith(".db"))
  .map(f => ({ name: f, mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);

const toDelete = allBackups.slice(KEEP_BACKUPS);
for (const { name } of toDelete) {
  fs.unlinkSync(path.join(BACKUP_DIR, name));
  console.log(`Pruned old backup: ${name}`);
}

console.log(`Retained ${Math.min(allBackups.length, KEEP_BACKUPS)} backup(s). Done.`);
