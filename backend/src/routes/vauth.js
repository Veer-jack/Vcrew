import { Router } from "express";
import { db } from "../db.js";
import { hashPassword, comparePassword, createValidatorSession, destroyValidatorSession, validatorAuthMiddleware, flagFraud } from "../auth.js";
import { sendValidatorWelcome } from "../email.js";
import { levelForCompleted } from "../vmeta.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

export const router = Router();

const VALID_LANGS = ["en","hi","zh","es","ar","fr","bn","pt","ru","ur"];

// Same uploads dir + unguessable-UUID-filename convention as the mission proof uploads
// (vmissions.js) and the generic /api/uploads/:filename server, just with a document
// mimetype allowlist instead of image/video — a resume is a different kind of file.
const RESUME_UPLOADS_DIR = path.join(process.env.DB_DIR || path.join(process.cwd(), "backend", "data"), "uploads");
fs.mkdirSync(RESUME_UPLOADS_DIR, { recursive: true });

const resumeUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, RESUME_UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname) || ""}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB, matches the onboarding UI's stated limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Invalid file type. Only PDF is allowed."));
  },
});

function publicValidator(v) {
  const lvl = levelForCompleted(v.missions_done);
  return {
    id: v.id, name: v.name, handle: v.handle, email: v.email,
    level: lvl.n, levelName: lvl.name,
    rating: v.rating, ratingCount: v.reviews_count, accuracy: v.accuracy, streak: v.streak,
    specialties: JSON.parse(v.specialties_json || "[]"),
    languages: JSON.parse(v.languages_json || "[]"),
    pending: v.earnings_pending, available: v.balance, lifetime: v.earnings_total,
    completed: v.missions_done,
    phone: v.phone_verified ? v.phone : null, phoneVerified: !!v.phone_verified,
    preferredLanguage: v.preferred_language || "en",
    oauthProvider: v.oauth_provider || null,
    validator_type: v.validator_type,
    tester_status: v.tester_status,
    role: v.role,
    avatar: v.avatar,
    bio: v.bio,
    city: v.city
  };
}

router.post("/signup", async (req, res) => {
  const { name, email, password, expertise, lang } = req.body || {};
  const preferredLanguage = VALID_LANGS.includes(lang) ? lang : "en";

  if (!name || !String(name).trim()) return res.status(400).json({ error: "Name is required" });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address" });
  if (!password || String(password).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await db.prepare(`SELECT id FROM validators WHERE email = ?`).get(normalizedEmail);
  if (existing) return res.status(400).json({ error: "An account with that email already exists" });

  const specialties = expertise && String(expertise).trim() ? [String(expertise).trim()] : [];
  const baseHandle = "@" + String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  let handle = baseHandle;
  let handleExists = await db.prepare(`SELECT id FROM validators WHERE handle = ?`).get(handle);
  if (handleExists) handle = baseHandle + Math.floor(Math.random() * 9000 + 1000);

  const result = await db.prepare(`
    INSERT INTO validators (name, handle, email, password_hash, specialties_json, preferred_language)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(String(name).trim(), handle, normalizedEmail, await hashPassword(password), JSON.stringify(specialties), preferredLanguage);

  const v = await db.prepare(`SELECT * FROM validators WHERE id = ?`).get(result.lastInsertRowid);
  const ip = req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim();
  const ua = req.headers["user-agent"] || null;
  const token = await createValidatorSession(v.id, ip, ua);

  // Fraud signal: check if a builder was recently created from this IP
  if (ip) {
    const sameIpBuilder = db.prepare(
      `SELECT b.id, b.email FROM sessions s
       JOIN builders b ON b.id = s.builder_id
       WHERE s.ip = ? AND s.created_at > NOW() - INTERVAL '7 days'
       LIMIT 1`
    ).get(ip);
    if (sameIpBuilder) {
      flagFraud("same_ip_builder_validator", "validator", v.id,
        `New validator ${v.email} shares IP ${ip} with builder ${sameIpBuilder.email}`, "medium");
    }
  }

  sendValidatorWelcome({ name: v.name, email: v.email }).catch(() => {});

  await db.prepare(`INSERT INTO admin_notifications (cat, type, icon, tone, title, body, time_label, unread) VALUES ('system', 'registration', 'userPlus', 'info', 'New Validator Registered', ?, 'Just now', 1)`).run(`${v.name} (${v.email}) joined as a validator.`);

  res.status(201).json({ token, validator: publicValidator(v) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  const v = await db.prepare(`SELECT * FROM validators WHERE email = ?`).get(String(email).toLowerCase().trim());
  if (!v || !v.password_hash) return res.status(401).json({ error: "Invalid email or password" });

  const { valid, needsRehash } = await comparePassword(password, v.password_hash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  if (needsRehash) {
    await db.prepare(`UPDATE validators SET password_hash = ? WHERE id = ?`).run(await hashPassword(password), v.id);
  }

  const token = await createValidatorSession(v.id, req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim(), req.headers["user-agent"]);
  res.json({ token, validator: publicValidator(v) });
});

router.post("/logout", validatorAuthMiddleware, async (req, res) => {
  await destroyValidatorSession(req.token);
  res.json({ ok: true });
});

router.get("/me", validatorAuthMiddleware, async (req, res) => {
  res.json({ validator: publicValidator(req.validator) });
});

export { publicValidator };

import crypto from "node:crypto";
import { sendPasswordReset } from "../email.js";

// POST /api/v/auth/forgot-password { email }
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email is required" });

  const v = await db.prepare(`SELECT * FROM validators WHERE email = ?`).get(String(email).toLowerCase().trim());
  if (!v || !v.password_hash) return res.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await db.prepare(`DELETE FROM password_reset_tokens WHERE role = 'validator' AND user_id = ?`).run(v.id);
  await db.prepare(`INSERT INTO password_reset_tokens (token, role, user_id, expires_at) VALUES (?, 'validator', ?, ?)`)
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

  const row = await db.prepare(`SELECT * FROM password_reset_tokens WHERE token = ? AND role = 'validator' AND used = 0`).get(token);
  if (!row || new Date(row.expires_at) < new Date()) {
    return res.status(400).json({ error: "This reset link has expired or already been used" });
  }

  await db.prepare(`UPDATE validators SET password_hash = ? WHERE id = ?`).run(await hashPassword(password), row.user_id);
  await db.prepare(`UPDATE password_reset_tokens SET used = 1 WHERE token = ?`).run(token);
  await db.prepare(`DELETE FROM validator_sessions WHERE validator_id = ?`).run(row.user_id);

  res.json({ ok: true });
});

// POST /api/v/auth/change-password { currentPassword, newPassword }
router.post("/change-password", validatorAuthMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  
  if (req.validator.oauth_provider) {
    return res.status(400).json({ error: "Users registered via Google/GitHub cannot change passwords here." });
  }

  if (!currentPassword || !newPassword || String(newPassword).length < 8) {
    return res.status(400).json({ error: "Current password and a new password (min 8 characters) are required." });
  }

  const { valid } = await comparePassword(currentPassword, req.validator.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Incorrect current password." });
  }

  await db.prepare(`UPDATE validators SET password_hash = ? WHERE id = ?`).run(await hashPassword(newPassword), req.validator.id);
  res.json({ ok: true });
});

// PATCH /api/v/auth/language { lang } — save preferred language for validator
router.patch("/language", validatorAuthMiddleware, async (req, res) => {
  const { lang } = req.body || {};
  const VALID = ["en","hi","zh","es","ar","fr","bn","pt","ru","ur"];
  if (!VALID.includes(lang)) return res.status(400).json({ error: "Unsupported language code" });
  await db.prepare(`UPDATE validators SET preferred_language = ? WHERE id = ?`).run(lang, req.validator.id);
  res.json({ ok: true, lang });
});

// PATCH /api/v/profile — update validator profile after onboarding
router.patch("/profile", validatorAuthMiddleware, async (req, res) => {
  const b = req.body || {};
  try {
    await db.prepare(`
      UPDATE validators SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        handle = COALESCE($3, handle),
        bio = COALESCE($4, bio),
        city = COALESCE($5, city),
        city_type = COALESCE($6, city_type),
        languages_json = COALESCE($7, languages_json),
        validator_type = COALESCE($8, validator_type),
        tester_status = COALESCE($9, tester_status),
        age_group = COALESCE($10, age_group),
        gender = COALESCE($11, gender),
        marital_status = COALESCE($12, marital_status),
        has_kids = COALESCE($13, has_kids),
        income_bracket = COALESCE($14, income_bracket),
        height = COALESCE($15, height),
        weight = COALESCE($16, weight),
        skin_tone = COALESCE($17, skin_tone),
        hair_type = COALESCE($18, hair_type),
        hair_length = COALESCE($19, hair_length),
        body_type = COALESCE($20, body_type),
        occupation = COALESCE($21, occupation),
        food_preference = COALESCE($22, food_preference),
        lifestyle_json = COALESCE($23, lifestyle_json),
        shopping_preference = COALESCE($24, shopping_preference),
        devices_json = COALESCE($25, devices_json),
        hours_per_week = COALESCE($26, hours_per_week),
        role = COALESCE($27, role),
        experience_years = COALESCE($28, experience_years),
        industry_json = COALESCE($29, industry_json),
        company = COALESCE($30, company),
        product_types_json = COALESCE($31, product_types_json),
        tech_tools_json = COALESCE($32, tech_tools_json),
        testing_domains_json = COALESCE($33, testing_domains_json),
        certifications_json = COALESCE($34, certifications_json),
        linkedin_url = COALESCE($35, linkedin_url),
        portfolio_url = COALESCE($36, portfolio_url),
        testing_bio = COALESCE($37, testing_bio),
        specialties_json = COALESCE($38, specialties_json)
      WHERE id = $39
    `).run(
      b.name || null, b.email ? String(b.email).toLowerCase().trim() : null,
      b.handle || null, b.bio || null, b.city || null, b.city_type || null,
      b.language ? JSON.stringify(b.language) : null,
      // Applying as a tester is a claim, not a grant — stay "validator" (full validator
      // access, as the onboarding copy promises) until an admin approves the application.
      // /admin/tester-applications flips this to 'tester' on approval.
      b.validator_type === 'tester' ? 'validator' : (b.validator_type || null),
      b.validator_type === 'tester' ? 'pending_review' : null,
      b.age_group || null, b.gender || null, b.marital || null, b.has_kids || null,
      b.income || null, b.height || null, b.weight || null, b.skin_tone || null,
      b.hair_type || null, b.hair_length || null, b.body_type || null,
      b.occupation || null, b.food_pref || null,
      b.lifestyle ? JSON.stringify(b.lifestyle) : null,
      b.shopping_pref || null,
      b.devices ? JSON.stringify(b.devices) : null,
      b.hours || null, b.role || null, b.experience || null,
      b.industry ? JSON.stringify(b.industry) : null,
      b.company || null,
      b.product_types ? JSON.stringify(b.product_types) : null,
      b.tech_tools ? JSON.stringify(b.tech_tools) : null,
      b.domains ? JSON.stringify(b.domains) : null,
      b.certifications ? JSON.stringify(b.certifications) : null,
      b.linkedin_url || null, b.portfolio_url || null, b.testing_bio || null,
      b.specialties_json || null,
      req.validator.id
    );
  } catch (err) {
    if (err.message.includes("unique constraint") && err.message.includes("handle")) {
      return res.status(400).json({ error: "That handle is already taken. Please choose another one." });
    }
    throw err;
  }

  // Notify admin if tester application. (Previously this also inserted into the regular
  // `notifications` table with builder_id hardcoded to 1 — a real builder's inbox, not any
  // admin channel. admin_notifications is the only correct destination for this.)
  if (b.validator_type === 'tester') {
    await db.prepare(`INSERT INTO admin_notifications (cat, type, icon, tone, title, body, time_label, unread) VALUES ('application', 'tester_application', 'star', 'accent', 'New Tester Application', ?, 'Just now', 1)`)
      .run(`${b.name || 'A validator'} has applied for Verified Tester status. Review within 72 hours.`).catch(() => {});
  }

  const v = await db.prepare(`SELECT * FROM validators WHERE id = $1`).get(req.validator.id);
  res.json({ validator: v });
});

// POST /api/v/auth/profile/resume — upload the tester-application resume (PDF only)
router.post("/profile/resume", validatorAuthMiddleware, (req, res, next) => {
  resumeUpload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  await db.prepare(`UPDATE validators SET resume_path = ?, resume_filename = ? WHERE id = ?`)
    .run(req.file.filename, req.file.originalname, req.validator.id);

  res.status(201).json({ ok: true, resume_filename: req.file.originalname });
});
