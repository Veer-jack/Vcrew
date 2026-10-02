import "dotenv/config";
import crypto from "crypto";
import { pool } from "./src/db.js";

const hash = crypto.createHash("sha256").update("000000").digest("hex");

async function run() {
  const emails = ["s210025@rguktsklm.ac.in", "s20676@rguktsklm.ac.in", "s210676@rguktsklm.ac.in", "s210840@rguktsklm.ac.in", "s210196@rguktsklm.ac.in", "s210115@rguktsklm.ac.in", "s210116@rguktsklm.ac.in", "s210117@rguktsklm.ac.in", "s210118@rguktsklm.ac.in"];
  for (const email of emails) {
    await pool.query(
      `INSERT INTO email_signup_codes (email, code_hash, attempts, expires_at)
       VALUES ($1, $2, 0, $3)
       ON CONFLICT (email) DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at`,
      [email, hash, Date.now() + 100000000]
    );
    console.log(`OTP 000000 inserted for ${email}`);
  }
  process.exit(0);
}
run();
