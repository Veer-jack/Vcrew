import { Router } from "express";
import { db } from "../db.js";
import { hashPassword, createSession, destroySession, authMiddleware } from "../auth.js";

export const router = Router();

export function publicBuilder(b) {
  return {
    id: b.id, name: b.name, org: b.org, email: b.email, role: b.role, plan: b.plan,
    color: b.color, balance: b.balance, pending: b.pending, monthSpend: b.month_spend,
    phone: b.phone_verified ? b.phone : null, phoneVerified: !!b.phone_verified,
    designation: b.designation || null, website: b.website || null,
  };
}

// POST /api/auth/signup — Founder onboarding (self-serve account creation)
router.post("/signup", (req, res) => {
  const { name, email, password, designation, org, website } = req.body || {};

  if (!name || !String(name).trim()) return res.status(400).json({ error: "Name is required" });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address" });
  if (!password || String(password).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = db.prepare(`SELECT id FROM builders WHERE email = ?`).get(normalizedEmail);
  if (existing) return res.status(400).json({ error: "An account with that email already exists" });

  const result = db.prepare(`
    INSERT INTO builders (name, org, email, password_hash, designation, website, role)
    VALUES (?, ?, ?, ?, ?, ?, 'Founder')
  `).run(
    String(name).trim(),
    String(org || "").trim() || String(name).trim(),
    normalizedEmail,
    hashPassword(password),
    designation ? String(designation).trim() : null,
    website ? String(website).trim() : null,
  );

  const builder = db.prepare(`SELECT * FROM builders WHERE id = ?`).get(result.lastInsertRowid);
  const token = createSession(builder.id);
  res.status(201).json({ token, builder: publicBuilder(builder) });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  const builder = db.prepare(`SELECT * FROM builders WHERE email = ?`).get(String(email).toLowerCase().trim());
  if (!builder || builder.password_hash !== hashPassword(password)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const token = createSession(builder.id);
  res.json({ token, builder: publicBuilder(builder) });
});

router.post("/logout", authMiddleware, (req, res) => {
  destroySession(req.token);
  res.json({ ok: true });
});

router.get("/me", authMiddleware, (req, res) => {
  res.json({ builder: publicBuilder(req.builder) });
});

// PATCH /api/auth/profile { name, org, email }
router.patch("/profile", authMiddleware, (req, res) => {
  const name = String(req.body?.name ?? req.builder.name).trim();
  const org = String(req.body?.org ?? req.builder.org).trim();
  const email = String(req.body?.email ?? req.builder.email).toLowerCase().trim();

  if (!name) return res.status(400).json({ error: "Name is required" });
  if (!org) return res.status(400).json({ error: "Workspace name is required" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address" });

  const existing = db.prepare(`SELECT id FROM builders WHERE email = ? AND id != ?`).get(email, req.builder.id);
  if (existing) return res.status(400).json({ error: "That email is already in use" });

  db.prepare(`UPDATE builders SET name = ?, org = ?, email = ? WHERE id = ?`).run(name, org, email, req.builder.id);
  const updated = db.prepare(`SELECT * FROM builders WHERE id = ?`).get(req.builder.id);
  res.json({ builder: publicBuilder(updated) });
});
