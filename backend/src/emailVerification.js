import crypto from "node:crypto";
import { Router } from "express";
import { db } from "./db.js";
import { sendSignupCode } from "./email.js";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

// POST /send-code { name, email } -> { ok: true } | 400 { error, code: "EMAIL_EXISTS" }
// Sends a 6-digit code to `email`, good for 10 minutes, before any account
// for it exists -- mirrors the phone-exists pre-check: an already-registered
// email is turned away here with no code sent, same as an already-verified
// phone number never reaching Firebase's SMS send.
export function buildEmailCodeRouter({ table }) {
  const router = Router();
  router.post("/send-code", async (req, res) => {
    const email = String(req.body?.email || "").toLowerCase().trim();
    const name = req.body?.name ? String(req.body.name).trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address" });

    const existing = await db.prepare(`SELECT id FROM ${table} WHERE email = ?`).get(email);
    if (existing) return res.status(400).json({ error: "An account with that email already exists", code: "EMAIL_EXISTS" });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await db.prepare(`
      INSERT INTO email_signup_codes (email, code_hash, attempts, expires_at)
      VALUES (?, ?, 0, ?)
      ON CONFLICT (email) DO UPDATE SET code_hash = EXCLUDED.code_hash, attempts = 0, expires_at = EXCLUDED.expires_at
    `).run(email, hashCode(code), Date.now() + CODE_TTL_MS);

    const result = await sendSignupCode({ name, email, code });
    if (!result.ok) return res.status(502).json({ error: "Couldn't send the verification email. Please try again." });
    res.json({ ok: true });
  });
  return router;
}

// Used by the signup routes: checks the submitted code against what's stored
// for that email and consumes it on success. The account is only created by
// the caller after this returns ok -- never trust the client beyond this.
export async function verifyAndConsumeEmailCode(email, code) {
  const normalized = String(email || "").toLowerCase().trim();
  const row = await db.prepare(`SELECT * FROM email_signup_codes WHERE email = ?`).get(normalized);
  if (!row) return { ok: false, error: "Enter the code we emailed you, or request a new one." };
  if (Number(row.expires_at) < Date.now()) return { ok: false, error: "This code has expired. Please request a new one." };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "Too many incorrect attempts. Please request a new one." };
  if (hashCode(code) !== row.code_hash) {
    await db.prepare(`UPDATE email_signup_codes SET attempts = attempts + 1 WHERE email = ?`).run(normalized);
    return { ok: false, error: "Incorrect code." };
  }
  await db.prepare(`DELETE FROM email_signup_codes WHERE email = ?`).run(normalized);
  return { ok: true };
}
