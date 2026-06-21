import { Router } from "express";
import { db } from "../db.js";
import {
  checkAdminCredentials, isAdminUsingDefaultPassword, createAdminSession, destroyAdminSession,
  adminAuthMiddleware, adminHasTotp, generateTotpSecret, confirmTotpSetup, verifyTotpCode,
  createPending2fa, checkPending2fa, consumePending2fa,
} from "../auth.js";
import QRCode from "qrcode";

export const router = Router();

/* ============ Auth ============ */

router.post("/login", (req, res) => {
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

router.post("/totp/setup/start", (req, res) => {
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
  if (!(await confirmTotpSetup(code))) return res.status(400).json({ error: "Incorrect code, please try again" });

  const token = createAdminSession();
  res.json({ token, usingDefaultPassword: isAdminUsingDefaultPassword() });
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

router.post("/logout", adminAuthMiddleware, (req, res) => {
  destroyAdminSession(req.token);
  res.json({ ok: true });
});

router.get("/me", adminAuthMiddleware, (req, res) => {
  res.json({ ok: true, usingDefaultPassword: isAdminUsingDefaultPassword() });
});

router.use(adminAuthMiddleware);

/* ============ Dashboard ============ */


router.get("/dashboard", (req, res) => {
  const builders = db.prepare(`SELECT COUNT(*) AS n FROM builders`).get().n;
  const validators = db.prepare(`SELECT COUNT(*) AS n FROM validators`).get().n;
  const activeMissions = db.prepare(`SELECT COUNT(*) AS n FROM missions WHERE status IN ('live','active','published')`).get().n;
  const totalMissions = db.prepare(`SELECT COUNT(*) AS n FROM missions`).get().n;

  const gmv = db.prepare(`SELECT COALESCE(SUM(amount),0) AS n FROM transactions WHERE type = 'credit'`).get().n;
  const spend = db.prepare(`SELECT COALESCE(SUM(spend),0) AS n FROM missions`).get().n;

  const openTickets = db.prepare(`
    SELECT (SELECT COUNT(*) FROM b_tickets WHERE status = 'open') + (SELECT COUNT(*) FROM v_tickets WHERE status = 'open') AS n
  `).get().n;

  const withdrawalQueue = db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(amount),0) AS amt FROM withdrawals WHERE status IN ('queued','processing','pending')`).get();

  const suspended = db.prepare(`
    SELECT (SELECT COUNT(*) FROM builders WHERE status = 'suspended') + (SELECT COUNT(*) FROM validators WHERE status = 'suspended') AS n
  `).get().n;

  const pendingVerifications = db.prepare(`SELECT COUNT(*) AS n FROM verifications WHERE status = 'pending'`).get().n;
  const flaggedMissions = db.prepare(`SELECT COUNT(*) AS n FROM missions WHERE flagged = 1`).get().n;

  res.json({
    builders, validators, totalUsers: builders + validators,
    activeMissions, totalMissions, gmv, spend,
    openTickets, suspended,
    withdrawalQueue: withdrawalQueue.n, withdrawalQueueAmount: withdrawalQueue.amt,
    pendingVerifications, flaggedMissions,
  });
});

/* ============ Members ============ */

router.get("/members", (req, res) => {
  const q = String(req.query.q || "").toLowerCase().trim();
  const type = req.query.type; // 'builder' | 'validator' | undefined

  const builders = type === "validator" ? [] : db.prepare(`SELECT * FROM builders ORDER BY id`).all().map(b => ({
    id: b.id, type: "builder", name: b.name, email: b.email, org: b.org, status: b.status || "active",
    balance: b.balance, phoneVerified: !!b.phone_verified, createdAt: b.created_at,
  }));
  const validators = type === "builder" ? [] : db.prepare(`SELECT * FROM validators ORDER BY id`).all().map(v => ({
    id: v.id, type: "validator", name: v.name, email: v.email, org: v.handle || "—", status: v.status || "active",
    balance: v.available, level: v.level, lifetime: v.lifetime, rating: v.rating, phoneVerified: !!v.phone_verified, createdAt: v.created_at,
  }));

  let members = [...builders, ...validators];
  if (q) members = members.filter(m => (m.name + m.email + m.org).toLowerCase().includes(q));

  res.json({ members });
});

// PATCH /api/admin/members/:type/:id { status }
router.patch("/members/:type/:id", (req, res) => {
  const { type, id } = req.params;
  const status = String(req.body?.status || "");
  if (!["active", "suspended"].includes(status)) return res.status(400).json({ error: "status must be 'active' or 'suspended'" });
  const table = type === "builder" ? "builders" : type === "validator" ? "validators" : null;
  if (!table) return res.status(400).json({ error: "type must be 'builder' or 'validator'" });

  const row = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id);
  if (!row) return res.status(404).json({ error: "Not found" });

  db.prepare(`UPDATE ${table} SET status = ? WHERE id = ?`).run(status, id);
  res.json({ ok: true, status });
});

/* ============ Support tickets ============ */

router.get("/tickets", (req, res) => {
  const b = db.prepare(`SELECT t.*, b.name AS user_name, b.email AS user_email FROM b_tickets t JOIN builders b ON b.id = t.builder_id ORDER BY t.created_at DESC`).all()
    .map(t => ({ ...t, userType: "builder" }));
  const v = db.prepare(`SELECT t.*, v.name AS user_name, v.email AS user_email FROM v_tickets t JOIN validators v ON v.id = t.validator_id ORDER BY t.created_at DESC`).all()
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
router.patch("/tickets/:type/:id", (req, res) => {
  const { type, id } = req.params;
  const table = type === "builder" ? "b_tickets" : type === "validator" ? "v_tickets" : null;
  if (!table) return res.status(400).json({ error: "type must be 'builder' or 'validator'" });

  const row = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id);
  if (!row) return res.status(404).json({ error: "Not found" });

  const status = req.body?.status;
  const reply = req.body?.reply;
  if (status && !["open", "answered", "resolved"].includes(status)) return res.status(400).json({ error: "Invalid status" });

  if (status) db.prepare(`UPDATE ${table} SET status = ?, updated_label = 'Just now' WHERE id = ?`).run(status, id);
  if (reply !== undefined) db.prepare(`UPDATE ${table} SET reply = ?, status = 'answered', updated_label = 'Just now' WHERE id = ?`).run(reply, id);

  res.json({ ok: true });
});

/* ============ Withdrawals ============ */

router.get("/withdrawals", (req, res) => {
  const rows = db.prepare(`
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
router.patch("/withdrawals/:id", (req, res) => {
  const status = String(req.body?.status || "");
  if (!["queued", "processing", "processed", "failed", "rejected", "reversed"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const row = db.prepare(`SELECT * FROM withdrawals WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });

  db.prepare(`UPDATE withdrawals SET status = ?, failure_reason = ? WHERE id = ?`).run(status, req.body?.failureReason || null, req.params.id);

  // If marking as failed/rejected/reversed, return funds to the validator's available balance.
  if (["failed", "rejected", "reversed"].includes(status) && !["failed", "rejected", "reversed"].includes(row.status)) {
    db.prepare(`UPDATE validators SET available = available + ? WHERE id = ?`).run(row.amount, row.validator_id);
  }

  res.json({ ok: true });
});

/* ============ Verification queue ============ */

router.get("/verifications", (req, res) => {
  const status = req.query.status || "pending";
  const rows = db.prepare(`
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

router.patch("/verifications/:id", (req, res) => {
  const status = String(req.body?.status || "");
  if (!["approved", "rejected"].includes(status)) return res.status(400).json({ error: "status must be 'approved' or 'rejected'" });

  const row = db.prepare(`SELECT * FROM verifications WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });

  db.prepare(`UPDATE verifications SET status = ?, reviewed_at = datetime('now') WHERE id = ?`).run(status, req.params.id);
  res.json({ ok: true, status });
});

/* ============ Mission moderation (post-publish flagging, not a pre-publish gate) ============ */

router.get("/missions", (req, res) => {
  const filter = req.query.filter || "flagged"; // 'flagged' | 'all'
  const where = filter === "flagged" ? "WHERE m.flagged = 1" : "";
  const rows = db.prepare(`
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
router.patch("/missions/:id", (req, res) => {
  const { action, reason } = req.body || {};
  const row = db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });

  if (action === "flag") {
    db.prepare(`UPDATE missions SET flagged = 1, flag_reason = ?, flagged_at = datetime('now') WHERE id = ?`)
      .run(reason ? String(reason).trim() : null, req.params.id);
  } else if (action === "unflag") {
    db.prepare(`UPDATE missions SET flagged = 0, flag_reason = NULL, flagged_at = NULL WHERE id = ?`).run(req.params.id);
  } else if (action === "remove") {
    db.prepare(`UPDATE missions SET status = 'removed', flagged = 0 WHERE id = ?`).run(req.params.id);
  } else {
    return res.status(400).json({ error: "action must be 'flag', 'unflag', or 'remove'" });
  }
  res.json({ ok: true });
});

/* ============ Platform analytics ============ */

router.get("/analytics", (req, res) => {
  // Last 12 months of real signup/mission growth, grouped from actual timestamps.
  const months = db.prepare(`
    WITH RECURSIVE seq(n) AS (SELECT 0 UNION ALL SELECT n+1 FROM seq WHERE n < 11)
    SELECT strftime('%Y-%m', date('now', '-' || n || ' months')) AS ym FROM seq ORDER BY ym ASC
  `).all().map(r => r.ym);

  const userGrowth = months.map((ym) => {
    const b = db.prepare(`SELECT COUNT(*) AS n FROM builders WHERE strftime('%Y-%m', created_at) <= ?`).get(ym).n;
    const v = db.prepare(`SELECT COUNT(*) AS n FROM validators WHERE strftime('%Y-%m', created_at) <= ?`).get(ym).n;
    return b + v;
  });
  const missionGrowth = months.map(ym => db.prepare(`SELECT COUNT(*) AS n FROM missions WHERE strftime('%Y-%m', created_at) <= ?`).get(ym).n);
  const revenueByMonth = months.map(ym => db.prepare(`
    SELECT COALESCE(SUM(amount),0) AS n FROM transactions WHERE type = 'credit' AND strftime('%Y-%m', created_at) <= ?
  `).get(ym).n);

  const byCategory = db.prepare(`SELECT category, COUNT(*) AS n FROM missions GROUP BY category ORDER BY n DESC`).all();
  const byPersona = db.prepare(`SELECT COALESCE(persona,'founder') AS persona, COUNT(*) AS n FROM builders GROUP BY persona ORDER BY n DESC`).all();

  res.json({ months, userGrowth, missionGrowth, revenueByMonth, byCategory, byPersona });
});
