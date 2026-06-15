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

/* ============ Admin (single account via env vars) ============ */

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@validationcrew.app").toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

export function checkAdminCredentials(email, password) {
  return String(email).toLowerCase().trim() === ADMIN_EMAIL && password === ADMIN_PASSWORD;
}

export function isAdminUsingDefaultPassword() {
  return !process.env.ADMIN_PASSWORD;
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

  req.token = token;
  next();
}
