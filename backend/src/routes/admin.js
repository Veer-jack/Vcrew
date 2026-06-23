import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { db } from "../db.js";
import { sendWithdrawalUpdate } from "../email.js";
import {
  checkAdminCredentials, isAdminUsingDefaultPassword, createAdminSession, destroyAdminSession,
  adminAuthMiddleware, adminHasTotp, generateTotpSecret, confirmTotpSetup, verifyTotpCode,
  createPending2fa, checkPending2fa, consumePending2fa, consumeBackupCode, getBackupCodeCount,
} from "../auth.js";
import QRCode from "qrcode";

export const router = Router();

/* ============ Auth ============ */

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
  if (!checkAdminCredentials(email, password)) return res.status(401).json({ error: "Invalid email or password" });

  if (!adminHasTotp()) {
    // First-ever login: no 2FA configured yet -- caller must complete setup before a session is issued.
    return res.json({ needsTotpSetup: true, usingDefaultPassword: isAdminUsingDefaultPassword() });
  }

  const pendingToken = createPending2fa();
  res.json({ needsTotpCode: true, pendingToken });
});

router.post("/totp/setup/start", async (req, res) => {
  const { email, password } = req.body || {};
  if (!checkAdminCredentials(email, password)) return res.status(401).json({ error: "Invalid email or password" });
  if (adminHasTotp()) return res.status(400).json({ error: "Two-factor authentication is already configured" });

  const { uri } = generateTotpSecret();
  QRCode.toDataURL(uri, (err, dataUrl) => {
    if (err) return res.status(500).json({ error: "Could not generate QR code" });
    res.json({ uri, qrCode: dataUrl });
  });
});

router.post("/totp/setup/confirm", async (req, res) => {
  const { email, password, code } = req.body || {};
  if (!checkAdminCredentials(email, password)) return res.status(401).json({ error: "Invalid email or password" });
  const backupCodes = await confirmTotpSetup(code);
  if (!backupCodes) return res.status(400).json({ error: "Incorrect code, please try again" });

  const token = createAdminSession();
  // Backup codes returned in plaintext once only — admin must save them now
  res.json({ token, usingDefaultPassword: isAdminUsingDefaultPassword(), backupCodes });
});

// Reset TOTP using a backup code — allows admin to re-scan a fresh QR if
// they've lost access to their authenticator app.
router.post("/totp/reset", async (req, res) => {
  const { email, password, backupCode } = req.body || {};
  if (!checkAdminCredentials(email, password)) return res.status(401).json({ error: "Invalid email or password" });
  if (!consumeBackupCode(backupCode)) return res.status(401).json({ error: "Invalid or already-used backup code" });

  // Wipe the existing TOTP secret — next login will trigger setup flow again
  await db.prepare(`DELETE FROM admin_settings WHERE key IN ('totp_secret', 'totp_secret_pending')`).run();
  res.json({ ok: true, message: "Authenticator reset. Sign in again to set up a new authenticator." });
});

router.post("/totp/verify", async (req, res) => {
  const { pendingToken, code } = req.body || {};
  if (!checkPending2fa(pendingToken)) {
    return res.status(401).json({ error: "That code expired, please sign in again" });
  }
  if (!(await verifyTotpCode(code))) return res.status(401).json({ error: "Incorrect code" });

  consumePending2fa(pendingToken);
  const token = createAdminSession();
  res.json({ token, usingDefaultPassword: isAdminUsingDefaultPassword() });
});

router.post("/logout", adminAuthMiddleware, async (req, res) => {
  destroyAdminSession(req.token);
  res.json({ ok: true });
});

router.get("/me", adminAuthMiddleware, async (req, res) => {
  res.json({ ok: true, usingDefaultPassword: isAdminUsingDefaultPassword() });
});

router.use(adminAuthMiddleware);

// ---- Audit logging helper ----
async function audit(action, targetType, targetId, detail) {
  try {
    await db.prepare(`INSERT INTO admin_audit_log (action, target_type, target_id, detail) VALUES (?, ?, ?, ?)`)
      .run(action, targetType || null, targetId ? String(targetId) : null, detail || null);
  } catch { /* never let audit failure break a response */ }
}

/* ============ Dashboard ============ */


router.get("/dashboard", async (req, res) => {
  const builders = await db.prepare(`SELECT COUNT(*) AS n FROM builders`).get().n;
  const validators = await db.prepare(`SELECT COUNT(*) AS n FROM validators`).get().n;
  const activeMissions = await db.prepare(`SELECT COUNT(*) AS n FROM missions WHERE status IN ('live','active','published')`).get().n;
  const totalMissions = await db.prepare(`SELECT COUNT(*) AS n FROM missions`).get().n;

  const gmv = await db.prepare(`SELECT COALESCE(SUM(amount),0) AS n FROM transactions WHERE type = 'credit'`).get().n;
  const spend = await db.prepare(`SELECT COALESCE(SUM(spend),0) AS n FROM missions`).get().n;

  const openTickets = await db.prepare(`
    SELECT (SELECT COUNT(*) FROM b_tickets WHERE status = 'open') + (SELECT COUNT(*) FROM v_tickets WHERE status = 'open') AS n
  `).get().n;

  const withdrawalQueue = await db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(amount),0) AS amt FROM withdrawals WHERE status IN ('queued','processing','pending')`).get();

  const suspended = await db.prepare(`
    SELECT (SELECT COUNT(*) FROM builders WHERE status = 'suspended') + (SELECT COUNT(*) FROM validators WHERE status = 'suspended') AS n
  `).get().n;

  const pendingVerifications = await db.prepare(`SELECT COUNT(*) AS n FROM verifications WHERE status = 'pending'`).get().n;
  const flaggedMissions = await db.prepare(`SELECT COUNT(*) AS n FROM missions WHERE flagged = 1`).get().n;

  res.json({
    builders, validators, totalUsers: builders + validators,
    activeMissions, totalMissions, gmv, spend,
    openTickets, suspended,
    withdrawalQueue: withdrawalQueue.n, withdrawalQueueAmount: withdrawalQueue.amt,
    pendingVerifications, flaggedMissions,
  });
});

/* ============ Members ============ */

router.get("/members", async (req, res) => {
  const q = String(req.query.q || "").toLowerCase().trim();
  const type = req.query.type; // 'builder' | 'validator' | undefined

  const builders = type === "validator" ? [] : await db.prepare(`SELECT * FROM builders ORDER BY id`).all().map(b => ({
    id: b.id, type: "builder", name: b.name, email: b.email, org: b.org, status: b.status || "active",
    balance: b.balance, phoneVerified: !!b.phone_verified, createdAt: b.created_at,
  }));
  const validators = type === "builder" ? [] : await db.prepare(`SELECT * FROM validators ORDER BY id`).all().map(v => ({
    id: v.id, type: "validator", name: v.name, email: v.email, org: v.handle || "—", status: v.status || "active",
    balance: v.available, level: v.level, lifetime: v.lifetime, rating: v.rating, phoneVerified: !!v.phone_verified, createdAt: v.created_at,
  }));

  let members = [...builders, ...validators];
  if (q) members = members.filter(m => (m.name + m.email + m.org).toLowerCase().includes(q));

  res.json({ members });
});

// PATCH /api/admin/members/:type/:id { status }
router.patch("/members/:type/:id", async (req, res) => {
  const { type, id } = req.params;
  const status = String(req.body?.status || "");
  if (!["active", "suspended"].includes(status)) return res.status(400).json({ error: "status must be 'active' or 'suspended'" });
  const table = type === "builder" ? "builders" : type === "validator" ? "validators" : null;
  if (!table) return res.status(400).json({ error: "type must be 'builder' or 'validator'" });

  const row = await db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id);
  if (!row) return res.status(404).json({ error: "Not found" });

  await db.prepare(`UPDATE ${table} SET status = ? WHERE id = ?`).run(status, id);
  audit(`member.${status}`, type, id, `Set ${type} #${id} to ${status}`);
  res.json({ ok: true, status });
});

/* ============ Support tickets ============ */

router.get("/tickets", async (req, res) => {
  const bRaw = await db.prepare(`SELECT t.*, b.name AS user_name, b.email AS user_email FROM b_tickets t JOIN builders b ON b.id = t.builder_id ORDER BY t.created_at DESC`).all();
  const b = bRaw
    .map(t => ({ ...t, userType: "builder" }));
  const vRaw = await db.prepare(`SELECT t.*, v.name AS user_name, v.email AS user_email FROM v_tickets t JOIN validators v ON v.id = t.validator_id ORDER BY t.created_at DESC`).all();
  const v = vRaw
    .map(t => ({ ...t, userType: "validator" }));

  const tickets = [...b, ...v]
    .sort((a, c) => String(c.created_at).localeCompare(String(a.created_at)))
    .map(t => ({
      id: t.id, userType: t.userType, userName: t.user_name, userEmail: t.user_email,
      subject: t.subject, category: t.category, details: t.details, status: t.status,
      priority: t.priority, reply: t.reply, updated: t.updated_label, createdAt: t.created_at,
    }));

  res.json({ tickets });
});

// PATCH /api/admin/tickets/:type/:id { status?, reply? }
router.patch("/tickets/:type/:id", async (req, res) => {
  const { type, id } = req.params;
  const table = type === "builder" ? "b_tickets" : type === "validator" ? "v_tickets" : null;
  if (!table) return res.status(400).json({ error: "type must be 'builder' or 'validator'" });

  const row = await db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id);
  if (!row) return res.status(404).json({ error: "Not found" });

  const status = req.body?.status;
  const reply = req.body?.reply;
  if (status && !["open", "answered", "resolved"].includes(status)) return res.status(400).json({ error: "Invalid status" });

  if (status) await db.prepare(`UPDATE ${table} SET status = ?, updated_at = NOW() WHERE id = ?`).run(status, id);
  if (reply !== undefined) await db.prepare(`UPDATE ${table} SET body = CONCAT(body, '

---
Admin reply: ', ?), status = 'answered', updated_at = NOW() WHERE id = ?`).run(reply, id);

  res.json({ ok: true });
});

/* ============ Withdrawals ============ */

router.get("/withdrawals", async (req, res) => {
  const rows = await db.prepare(`
    SELECT w.*, v.name AS validator_name, v.email AS validator_email
    FROM withdrawals w JOIN validators v ON v.id = w.validator_id
    ORDER BY w.id DESC LIMIT 100
  `).all();
  res.json({ withdrawals: rows.map(w => ({
    id: w.id, validatorName: w.validator_name, validatorEmail: w.validator_email,
    amount: w.amount, vpa: w.vpa, razorpayPayoutId: w.razorpay_payout_id,
    status: w.status, failureReason: w.failure_reason, createdAt: w.created_at,
  })) });
});

// PATCH /api/admin/withdrawals/:id { status, failureReason? }
router.patch("/withdrawals/:id", async (req, res) => {
  const status = String(req.body?.status || "");
  if (!["queued", "processing", "processed", "failed", "rejected", "reversed"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const row = await db.prepare(`SELECT * FROM withdrawals WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });

  await db.prepare(`UPDATE withdrawals SET status = ?, failure_reason = ? WHERE id = ?`).run(status, req.body?.failureReason || null, req.params.id);

  if (["failed", "rejected", "reversed"].includes(status) && !["failed", "rejected", "reversed"].includes(row.status)) {
    await db.prepare(`UPDATE validators SET available = available + ? WHERE id = ?`).run(row.amount, row.validator_id);
  }

  // Email the validator about their withdrawal status
  const v = await db.prepare(`SELECT name, email FROM validators WHERE id = ?`).get(row.validator_id);
  if (v && ["processed", "failed", "rejected"].includes(status)) {
    sendWithdrawalUpdate({
      validatorName: v.name, validatorEmail: v.email,
      amount: row.amount, status, failureReason: req.body?.failureReason || null,
    }).catch(() => {});
  }

  audit(`withdrawal.${status}`, "withdrawal", req.params.id, `₹${row.amount / 100} withdrawal marked ${status}`);
  res.json({ ok: true });
});

/* ============ Verification queue ============ */

router.get("/verifications", async (req, res) => {
  const status = req.query.status || "pending";
  const rows = await db.prepare(`
    SELECT v.*, b.name AS builder_name, b.org, b.email, b.persona
    FROM verifications v JOIN builders b ON b.id = v.builder_id
    WHERE v.status = ? ORDER BY v.created_at ASC
  `).all(status);
  res.json({ verifications: rows.map(v => ({
    id: v.id, builderId: v.builder_id, builderName: v.builder_name, org: v.org, email: v.email,
    persona: v.persona, kind: v.kind, subject: v.subject, status: v.status, note: v.note,
    createdAt: v.created_at, reviewedAt: v.reviewed_at,
  })) });
});

router.patch("/verifications/:id", async (req, res) => {
  const status = String(req.body?.status || "");
  if (!["approved", "rejected"].includes(status)) return res.status(400).json({ error: "status must be 'approved' or 'rejected'" });

  const row = await db.prepare(`SELECT * FROM verifications WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });

  await db.prepare(`UPDATE verifications SET status = ?, reviewed_at = NOW() WHERE id = ?`).run(status, req.params.id);

  // If a website verification is approved, mark the builder as verified
  if (status === "approved" && row.kind === "website") {
    await db.prepare(`UPDATE builders SET verified_at = NOW() WHERE id = ? AND verified_at IS NULL`).run(row.builder_id);
  }

  audit(`verification.${status}`, "verification", req.params.id, `${row.kind} claim for builder #${row.builder_id} ${status}`);
  res.json({ ok: true, status });
});

/* ============ Mission moderation (post-publish flagging, not a pre-publish gate) ============ */

router.get("/missions", async (req, res) => {
  const filter = req.query.filter || "flagged"; // 'flagged' | 'all'
  const where = filter === "flagged" ? "WHERE m.flagged = 1" : "";
  const rows = await db.prepare(`
    SELECT m.*, b.name AS builder_name, b.org
    FROM missions m JOIN builders b ON b.id = m.builder_id
    ${where} ORDER BY m.flagged DESC, m.created_at DESC LIMIT 200
  `).all();
  res.json({ missions: rows.map(m => ({
    id: m.id, name: m.name, builderName: m.builder_name, org: m.org, category: m.category,
    status: m.status, flagged: !!m.flagged, flagReason: m.flag_reason, flaggedAt: m.flagged_at,
    rewardAmount: m.reward_amount, joined: m.joined, target: m.target, createdAt: m.created_at,
  })) });
});

// PATCH /api/admin/missions/:id { action: 'flag'|'unflag'|'remove', reason? }
router.patch("/missions/:id", async (req, res) => {
  const { action, reason } = req.body || {};
  const row = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });

  if (action === "flag") {
    await db.prepare(`UPDATE missions SET flagged = 1, flag_reason = ?, flagged_at = NOW() WHERE id = ?`)
      .run(reason ? String(reason).trim() : null, req.params.id);
    audit("mission.flagged", "mission", req.params.id, reason || "No reason given");
  } else if (action === "unflag") {
    await db.prepare(`UPDATE missions SET flagged = 0, flag_reason = NULL, flagged_at = NULL WHERE id = ?`).run(req.params.id);
    audit("mission.unflagged", "mission", req.params.id, null);
  } else if (action === "remove") {
    await db.prepare(`UPDATE missions SET status = 'removed', flagged = 0 WHERE id = ?`).run(req.params.id);
    audit("mission.removed", "mission", req.params.id, `Mission: ${row.name}`);
  } else {
    return res.status(400).json({ error: "action must be 'flag', 'unflag', or 'remove'" });
  }
  res.json({ ok: true });
});

/* ============ Platform analytics ============ */

router.get("/analytics", async (req, res) => {
  // Last 12 months of real signup/mission growth, grouped from actual timestamps.
  const monthRows = await db.prepare(`
    SELECT TO_CHAR(DATE_TRUNC('month', NOW()) - (n || ' months')::INTERVAL, 'YYYY-MM') AS ym
    FROM generate_series(0, 11) AS n ORDER BY ym ASC
  `).all();
  const months = monthRows.map(r => r.ym);

  const userGrowth = await Promise.all(months.map(async (ym) => {
    const b = (await db.prepare(`SELECT COUNT(*) AS n FROM builders WHERE TO_CHAR(created_at, 'YYYY-MM') <= ?`).get(ym)).n;
    const v = (await db.prepare(`SELECT COUNT(*) AS n FROM validators WHERE TO_CHAR(created_at, 'YYYY-MM') <= ?`).get(ym)).n;
    return Number(b) + Number(v);
  }));
  const missionGrowth = await Promise.all(months.map(async ym =>
    Number((await db.prepare(`SELECT COUNT(*) AS n FROM missions WHERE TO_CHAR(created_at, 'YYYY-MM') <= ?`).get(ym)).n)
  ));
  const revenueByMonth = await Promise.all(months.map(async ym =>
    Number((await db.prepare(`SELECT COALESCE(SUM(amount),0) AS n FROM transactions WHERE type = 'credit' AND TO_CHAR(created_at, 'YYYY-MM') <= ?`).get(ym)).n)
  ));

  const byCategory = await db.prepare(`SELECT category, COUNT(*) AS n FROM missions GROUP BY category ORDER BY n DESC`).all();
  const byPersona = await db.prepare(`SELECT COALESCE(persona,'founder') AS persona, COUNT(*) AS n FROM builders GROUP BY persona ORDER BY n DESC`).all();

  res.json({ months, userGrowth, missionGrowth, revenueByMonth, byCategory, byPersona });
});

/* ============ Audit log ============ */

router.get("/audit-log", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const rows = db.prepare(
    `SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT ?`
  ).all(limit);
  res.json({ log: rows });
});

/* ============ On-demand backup ============ */

router.post("/backup", async (req, res) => {
  try {
    const dataDir = process.env.DB_DIR || path.join(process.cwd(), "backend", "data");
    const dbPath = process.env.DB_PATH || path.join(dataDir, "vcrew.db");
    const backupDir = path.join(dataDir, "backups");
    if (!fs.existsSync(dbPath)) return res.status(503).json({ error: "Database file not found" });
    fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const destPath = path.join(backupDir, `vcrew-manual-${stamp}.db`);
    db.exec(`VACUUM INTO '${destPath}'`);
    const stats = fs.statSync(destPath);
    audit("backup.created", "system", null, `Manual backup: vcrew-manual-${stamp}.db (${(stats.size / 1024).toFixed(0)} KB)`);
    res.json({ ok: true, file: `vcrew-manual-${stamp}.db`, sizeKb: Math.round(stats.size / 1024) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============ Fraud signals ============ */

router.get("/fraud-signals", async (req, res) => {
  const reviewed = req.query.reviewed === "true" ? 1 : 0;
  const rows = db.prepare(
    `SELECT * FROM fraud_signals WHERE reviewed = ? ORDER BY created_at DESC LIMIT 200`
  ).all(reviewed);
  res.json({ signals: rows });
});

router.patch("/fraud-signals/:id", async (req, res) => {
  const { reviewed } = req.body || {};
  await db.prepare(`UPDATE fraud_signals SET reviewed = ? WHERE id = ?`).run(reviewed ? 1 : 0, req.params.id);
  audit("fraud_signal.reviewed", "fraud_signal", req.params.id, null);
  res.json({ ok: true });
});

/* ============ Auto-moderation rule engine ============ */
// Runs on demand (POST /api/admin/automod/run) or can be called
// after mission creation. Flags missions matching suspicious patterns.

const AUTOMOD_RULES = [
  {
    id: "excessive_reward",
    desc: "Unusually high reward per participant (>₹500)",
    check: (m) => m.reward_amount > 50000, // stored in paise
    reason: "Reward amount is unusually high (>₹500 per participant) — possible payout farming",
    severity: "high",
  },
  {
    id: "zero_reward_high_target",
    desc: "High participant count with zero reward",
    check: (m) => m.reward_type === "free" && m.target > 50,
    reason: "Zero-reward mission with >50 participants — possible data harvesting",
    severity: "medium",
  },
  {
    id: "very_short_deadline",
    desc: "Deadline set in the past or very near future",
    check: (m) => {
      if (!m.deadline || m.deadline === "—") return false;
      const d = new Date(m.deadline);
      if (isNaN(d)) return false;
      const hoursUntil = (d - Date.now()) / 3600000;
      return hoursUntil < 2 && hoursUntil > -24; // already passed or <2h away
    },
    reason: "Mission deadline is set in the past or less than 2 hours away",
    severity: "low",
  },
  {
    id: "new_builder_large_mission",
    desc: "Brand-new builder running a large mission",
    check: (m, builderCreatedAt) => {
      const ageHours = (Date.now() - new Date(builderCreatedAt + "Z").getTime()) / 3600000;
      return ageHours < 24 && m.target > 20;
    },
    reason: "Builder account is less than 24 hours old and targeting >20 participants",
    severity: "medium",
  },
];

async function runAutomod(missionId) {
  const m = await db.prepare(`
    SELECT mi.*, b.created_at AS builder_created_at
    FROM missions mi JOIN builders b ON b.id = mi.builder_id
    WHERE mi.id = ? AND mi.status = 'active' AND mi.flagged = 0
  `).get(missionId);
  if (!m) return 0;

  let flagged = 0;
  for (const rule of AUTOMOD_RULES) {
    const triggered = rule.check(m, m.builder_created_at);
    if (triggered) {
      await db.prepare(`UPDATE missions SET flagged = 1, flag_reason = ?, flagged_at = NOW() WHERE id = ?`)
        .run(`[automod:${rule.id}] ${rule.reason}`, m.id);
      audit("mission.automod_flagged", "mission", m.id, `Rule: ${rule.id}`);
      flagged++;
      break; // one flag reason at a time — avoid overwriting
    }
  }
  return flagged;
}

export { runAutomod };

// Run automod across all active unflagged missions
router.post("/automod/run", async (req, res) => {
  const missions = await db.prepare(`SELECT id FROM missions WHERE status = 'active' AND flagged = 0`).all();
  let flagged = 0;
  for (const { id } of missions) flagged += runAutomod(id);
  audit("automod.run", "system", null, `Scanned ${missions.length} missions, flagged ${flagged}`);
  res.json({ ok: true, scanned: missions.length, flagged });
});
