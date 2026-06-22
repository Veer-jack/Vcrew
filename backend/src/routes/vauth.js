import { Router } from "express";
import { db } from "../db.js";
import { hashPassword, comparePassword, createValidatorSession, destroyValidatorSession, validatorAuthMiddleware } from "../auth.js";
import { sendValidatorWelcome } from "../email.js";
import { LEVELS } from "../vmeta.js";

export const router = Router();

function publicValidator(v) {
  const lvl = LEVELS.find(l => l.n === v.level) || LEVELS[0];
  return {
    id: v.id, name: v.name, handle: v.handle, email: v.email,
    level: v.level, levelName: lvl.name,
    rating: v.rating, ratingCount: v.rating_count, accuracy: v.accuracy, streak: v.streak,
    specialties: JSON.parse(v.specialties_json || "[]"),
    weekEarnings: v.week_earnings, weekTarget: v.week_target,
    pending: v.pending, available: v.available, lifetime: v.lifetime,
    completed: v.completed, acceptRate: v.accept_rate,
    phone: v.phone_verified ? v.phone : null, phoneVerified: !!v.phone_verified,
  };
}

router.post("/signup", async (req, res) => {
  const { name, email, password, expertise } = req.body || {};

  if (!name || !String(name).trim()) return res.status(400).json({ error: "Name is required" });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address" });
  if (!password || String(password).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = db.prepare(`SELECT id FROM validators WHERE email = ?`).get(normalizedEmail);
  if (existing) return res.status(400).json({ error: "An account with that email already exists" });

  const specialties = expertise && String(expertise).trim() ? [String(expertise).trim()] : [];
  const handle = "@" + String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "");

  const result = db.prepare(`
    INSERT INTO validators (name, handle, email, password_hash, specialties_json)
    VALUES (?, ?, ?, ?, ?)
  `).run(String(name).trim(), handle, normalizedEmail, await hashPassword(password), JSON.stringify(specialties));

  const v = db.prepare(`SELECT * FROM validators WHERE id = ?`).get(result.lastInsertRowid);
  const token = createValidatorSession(v.id);
  sendValidatorWelcome({ name: v.name, email: v.email }).catch(() => {});
  res.status(201).json({ token, validator: publicValidator(v) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  const v = db.prepare(`SELECT * FROM validators WHERE email = ?`).get(String(email).toLowerCase().trim());
  if (!v || !v.password_hash) return res.status(401).json({ error: "Invalid email or password" });

  const { valid, needsRehash } = await comparePassword(password, v.password_hash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  if (needsRehash) {
    db.prepare(`UPDATE validators SET password_hash = ? WHERE id = ?`).run(await hashPassword(password), v.id);
  }

  const token = createValidatorSession(v.id);
  res.json({ token, validator: publicValidator(v) });
});

router.post("/logout", validatorAuthMiddleware, (req, res) => {
  destroyValidatorSession(req.token);
  res.json({ ok: true });
});

router.get("/me", validatorAuthMiddleware, (req, res) => {
  res.json({ validator: publicValidator(req.validator) });
});

export { publicValidator };

import crypto from "node:crypto";
import { sendPasswordReset } from "../email.js";

// POST /api/v/auth/forgot-password { email }
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email is required" });

  const v = db.prepare(`SELECT * FROM validators WHERE email = ?`).get(String(email).toLowerCase().trim());
  if (!v || !v.password_hash) return res.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  db.prepare(`DELETE FROM password_reset_tokens WHERE role = 'validator' AND user_id = ?`).run(v.id);
  db.prepare(`INSERT INTO password_reset_tokens (token, role, user_id, expires_at) VALUES (?, 'validator', ?, ?)`)
    .run(token, v.id, expiresAt);

  await sendPasswordReset({ name: v.name, email: v.email, token, role: "validator" });
  res.json({ ok: true });
});

// POST /api/v/auth/reset-password { token, password }
router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password || String(password).length < 8) {
    return res.status(400).json({ error: "Valid token and a password of at least 8 characters are required" });
  }

  const row = db.prepare(`SELECT * FROM password_reset_tokens WHERE token = ? AND role = 'validator' AND used = 0`).get(token);
  if (!row || new Date(row.expires_at) < new Date()) {
    return res.status(400).json({ error: "This reset link has expired or already been used" });
  }

  db.prepare(`UPDATE validators SET password_hash = ? WHERE id = ?`).run(await hashPassword(password), row.user_id);
  db.prepare(`UPDATE password_reset_tokens SET used = 1 WHERE token = ?`).run(token);
  db.prepare(`DELETE FROM validator_sessions WHERE validator_id = ?`).run(row.user_id);

  res.json({ ok: true });
});
