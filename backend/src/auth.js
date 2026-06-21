import crypto from "node:crypto";
import { db } from "./db.js";

export const hashPassword = (pw) => crypto.createHash("sha256").update(pw).digest("hex");

export function createSession(builderId) {
  const token = crypto.randomBytes(24).toString("hex");
  db.prepare(`INSERT INTO sessions (token, builder_id) VALUES (?, ?)`).run(token, builderId);
  return token;
}

export function destroySession(token) {
  db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const session = db.prepare(`SELECT * FROM sessions WHERE token = ?`).get(token);
  if (!session) return res.status(401).json({ error: "Invalid or expired session" });

  const builder = db.prepare(`SELECT * FROM builders WHERE id = ?`).get(session.builder_id);
  if (!builder) return res.status(401).json({ error: "Account not found" });

  req.builder = builder;
  req.token = token;
  next();
}

/* ---- validator-side session helpers ---- */

export function createValidatorSession(validatorId) {
  const token = crypto.randomBytes(24).toString("hex");
  db.prepare(`INSERT INTO validator_sessions (token, validator_id) VALUES (?, ?)`).run(token, validatorId);
  return token;
}

export function destroyValidatorSession(token) {
  db.prepare(`DELETE FROM validator_sessions WHERE token = ?`).run(token);
}

export function validatorAuthMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const session = db.prepare(`SELECT * FROM validator_sessions WHERE token = ?`).get(token);
  if (!session) return res.status(401).json({ error: "Invalid or expired session" });

  const validator = db.prepare(`SELECT * FROM validators WHERE id = ?`).get(session.validator_id);
  if (!validator) return res.status(401).json({ error: "Account not found" });

  req.validator = validator;
  req.token = token;
  next();
}

/* ============ Admin (single account via env vars, + TOTP 2FA) ============ */
import { generateSecret, generateURI, verify } from "otplib";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@validationcrew.app").toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const ADMIN_SESSION_HOURS = 12;
const PENDING_2FA_MINUTES = 5;
const PENDING_2FA_MAX_ATTEMPTS = 6;

export function checkAdminCredentials(email, password) {
  return String(email).toLowerCase().trim() === ADMIN_EMAIL && password === ADMIN_PASSWORD;
}

export function isAdminUsingDefaultPassword() {
  return !process.env.ADMIN_PASSWORD;
}

function getAdminSetting(key) {
  const row = db.prepare(`SELECT value FROM admin_settings WHERE key = ?`).get(key);
  return row ? row.value : null;
}
function setAdminSetting(key, value) {
  db.prepare(`INSERT INTO admin_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, value);
}

export function adminHasTotp() {
  return !!getAdminSetting("totp_secret");
}

// Called after a fresh, unconfirmed setup -- not active until confirmTotp() succeeds.
export function generateTotpSecret() {
  const secret = generateSecret();
  setAdminSetting("totp_secret_pending", secret);
  const uri = generateURI({ issuer: "ValidationCrew Admin", label: ADMIN_EMAIL, secret, type: "totp" });
  return { secret, uri };
}

async function checkTotp(secret, code) {
  if (!secret || !code) return false;
  try {
    const result = await verify({ secret, token: String(code), type: "totp" });
    return !!(result && result.valid);
  } catch {
    return false;
  }
}

export async function confirmTotpSetup(code) {
  const pending = getAdminSetting("totp_secret_pending");
  if (!pending) return false;
  if (!(await checkTotp(pending, code))) return false;
  setAdminSetting("totp_secret", pending);
  db.prepare(`DELETE FROM admin_settings WHERE key = 'totp_secret_pending'`).run();
  return true;
}

export async function verifyTotpCode(code) {
  const secret = getAdminSetting("totp_secret");
  if (!secret) return false;
  return checkTotp(secret, code);
}

// Step 1 of login (email+password correct, TOTP enabled): issue a short-lived
// pending token that only unlocks a real session via verifyTotpCode + createAdminSession.
export function createPending2fa() {
  const token = crypto.randomBytes(24).toString("hex");
  db.prepare(`INSERT INTO admin_pending_2fa (token) VALUES (?)`).run(token);
  return token;
}

// Validates the token exists, hasn't expired, and hasn't exceeded its attempt
// cap -- without consuming it, so a mistyped code doesn't force the admin
// back through the password step. Each call here counts as one attempt.
export function checkPending2fa(token) {
  const row = db.prepare(`SELECT * FROM admin_pending_2fa WHERE token = ?`).get(token);
  if (!row) return false;
  const ageMin = (Date.now() - new Date(row.created_at + "Z").getTime()) / 60000;
  if (ageMin > PENDING_2FA_MINUTES || row.attempts >= PENDING_2FA_MAX_ATTEMPTS) {
    db.prepare(`DELETE FROM admin_pending_2fa WHERE token = ?`).run(token);
    return false;
  }
  db.prepare(`UPDATE admin_pending_2fa SET attempts = attempts + 1 WHERE token = ?`).run(token);
  return true;
}

export function consumePending2fa(token) {
  db.prepare(`DELETE FROM admin_pending_2fa WHERE token = ?`).run(token);
}

export function createAdminSession() {
  const token = crypto.randomBytes(24).toString("hex");
  db.prepare(`INSERT INTO admin_sessions (token) VALUES (?)`).run(token);
  return token;
}

export function destroyAdminSession(token) {
  db.prepare(`DELETE FROM admin_sessions WHERE token = ?`).run(token);
}

export function adminAuthMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const session = db.prepare(`SELECT * FROM admin_sessions WHERE token = ?`).get(token);
  if (!session) return res.status(401).json({ error: "Invalid or expired session" });

  const ageHours = (Date.now() - new Date(session.created_at + "Z").getTime()) / 3600000;
  if (ageHours > ADMIN_SESSION_HOURS) {
    db.prepare(`DELETE FROM admin_sessions WHERE token = ?`).run(token);
    return res.status(401).json({ error: "Session expired, please sign in again" });
  }

  req.token = token;
  next();
}

