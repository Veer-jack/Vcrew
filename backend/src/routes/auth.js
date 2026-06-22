import { Router } from "express";
import { db } from "../db.js";
import { hashPassword, comparePassword, createSession, destroySession, authMiddleware, flagFraud } from "../auth.js";
import { sendBuilderWelcome } from "../email.js";

export const router = Router();

export function publicBuilder(b) {
  let profile = null;
  if (b.profile_json) {
    try { profile = JSON.parse(b.profile_json); } catch { profile = null; }
  }
  return {
    id: b.id, name: b.name, org: b.org, email: b.email, role: b.role, plan: b.plan,
    color: b.color, balance: b.balance, pending: b.pending, monthSpend: b.month_spend,
    phone: b.phone_verified ? b.phone : null, phoneVerified: !!b.phone_verified,
    designation: b.designation || null, website: b.website || null,
    persona: b.persona || "founder", profile,
    verified: !!b.verified_at, verifiedAt: b.verified_at || null,
    preferredLanguage: b.preferred_language || "en",
  };
}

// POST /api/auth/signup — Founder onboarding (self-serve account creation)
const PERSONA_LABELS = { founder: "Founder", company: "Company", researcher: "Researcher", organization: "Organization" };

router.post("/signup", async (req, res) => {
  const { name, email, password, designation, org, website, persona, profile } = req.body || {};

  if (!name || !String(name).trim()) return res.status(400).json({ error: "Name is required" });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address" });
  if (!password || String(password).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = db.prepare(`SELECT id FROM builders WHERE email = ?`).get(normalizedEmail);
  if (existing) return res.status(400).json({ error: "An account with that email already exists" });

  const personaKey = PERSONA_LABELS[persona] ? persona : "founder";
  let profileJson = null;
  if (profile && typeof profile === "object") {
    const serialized = JSON.stringify(profile);
    if (serialized.length > 20000) return res.status(400).json({ error: "Profile data is too large" });
    profileJson = serialized;
  }

  const result = db.prepare(`
    INSERT INTO builders (name, org, email, password_hash, designation, website, role, persona, profile_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    String(name).trim(),
    String(org || "").trim() || String(name).trim(),
    normalizedEmail,
    await hashPassword(password),
    designation ? String(designation).trim() : null,
    website ? String(website).trim() : null,
    PERSONA_LABELS[personaKey],
    personaKey,
    profileJson,
  );

  const builder = db.prepare(`SELECT * FROM builders WHERE id = ?`).get(result.lastInsertRowid);

  // Surface the onboarding wizard's "Verify" step submissions as real,
  // admin-reviewable queue items. The wizard only records a claim (it doesn't
  // fake instant verification) -- this is what turns that claim into
  // something an operator can actually act on.
  if (profile && typeof profile === "object") {
    const claims = [
      { field: "vWebsiteInput", kind: "website" },
      { field: "vCompanyInput", kind: "linkedin" },
      { field: "gst", kind: "registry" },
      { field: "taxId", kind: "registry" },
      { field: "regNo", kind: "registry" },
      { field: "researchProfile", kind: "academic" },
      { field: "govAffiliation", kind: "registry" },
    ];
    const insertVerif = db.prepare(`
      INSERT INTO verifications (builder_id, kind, subject, note) VALUES (?, ?, ?, ?)
    `);
    for (const { field, kind } of claims) {
      const value = profile[field];
      if (value && String(value).trim()) {
        insertVerif.run(builder.id, kind, String(value).trim(), `Submitted at signup (${personaKey})`);
      }
    }
  }

  const ip = req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim();
  const ua = req.headers["user-agent"] || null;

  const token = createSession(builder.id, ip, ua);

  // Fraud signal: check if another builder or validator was recently created from this IP
  if (ip) {
    const sameIpValidator = db.prepare(
      `SELECT v.id, v.email FROM validator_sessions vs
       JOIN validators v ON v.id = vs.validator_id
       WHERE vs.ip = ? AND vs.created_at > datetime('now', '-7 days')
       LIMIT 1`
    ).get(ip);
    if (sameIpValidator) {
      flagFraud("same_ip_builder_validator", "builder", builder.id,
        `New builder ${builder.email} shares IP ${ip} with validator ${sameIpValidator.email}`, "medium");
    }
  }

  sendBuilderWelcome({ name: builder.name, email: builder.email, org: builder.org }).catch(() => {});
  res.status(201).json({ token, builder: publicBuilder(builder) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  const builder = db.prepare(`SELECT * FROM builders WHERE email = ?`).get(String(email).toLowerCase().trim());
  if (!builder || !builder.password_hash) return res.status(401).json({ error: "Invalid email or password" });

  const { valid, needsRehash } = await comparePassword(password, builder.password_hash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  // Silently upgrade legacy SHA-256 hashes to bcrypt on next login
  if (needsRehash) {
    db.prepare(`UPDATE builders SET password_hash = ? WHERE id = ?`).run(await hashPassword(password), builder.id);
  }

  const token = createSession(builder.id, req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim(), req.headers["user-agent"]);
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

import crypto from "node:crypto";
import { sendPasswordReset } from "../email.js";

// POST /api/auth/forgot-password { email }
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email is required" });

  const builder = db.prepare(`SELECT * FROM builders WHERE email = ?`).get(String(email).toLowerCase().trim());
  // Always return success to avoid leaking whether an email is registered
  if (!builder || !builder.password_hash) return res.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  db.prepare(`DELETE FROM password_reset_tokens WHERE role = 'builder' AND user_id = ?`).run(builder.id);
  db.prepare(`INSERT INTO password_reset_tokens (token, role, user_id, expires_at) VALUES (?, 'builder', ?, ?)`)
    .run(token, builder.id, expiresAt);

  await sendPasswordReset({ name: builder.name, email: builder.email, token, role: "builder" });
  res.json({ ok: true });
});

// POST /api/auth/reset-password { token, password }
router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password || String(password).length < 8) {
    return res.status(400).json({ error: "Valid token and a password of at least 8 characters are required" });
  }

  const row = db.prepare(`SELECT * FROM password_reset_tokens WHERE token = ? AND role = 'builder' AND used = 0`).get(token);
  if (!row || new Date(row.expires_at) < new Date()) {
    return res.status(400).json({ error: "This reset link has expired or already been used" });
  }

  db.prepare(`UPDATE builders SET password_hash = ? WHERE id = ?`).run(await hashPassword(password), row.user_id);
  db.prepare(`UPDATE password_reset_tokens SET used = 1 WHERE token = ?`).run(token);
  db.prepare(`DELETE FROM sessions WHERE builder_id = ?`).run(row.user_id); // invalidate all existing sessions

  res.json({ ok: true });
});

// PATCH /api/auth/language { lang } — save preferred language for builder
router.patch("/language", authMiddleware, (req, res) => {
  const { lang } = req.body || {};
  const VALID = ["en","hi","zh","es","ar","fr","bn","pt","ru","ur"];
  if (!VALID.includes(lang)) return res.status(400).json({ error: "Unsupported language code" });
  db.prepare(`UPDATE builders SET preferred_language = ? WHERE id = ?`).run(lang, req.builder.id);
  res.json({ ok: true, lang });
});
