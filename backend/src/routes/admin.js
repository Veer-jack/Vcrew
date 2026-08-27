import { Router } from "express";
import { db } from "../db.js";
import { sendWithdrawalUpdate } from "../email.js";
import {
  checkAdminCredentials, isAdminUsingDefaultPassword, createAdminSession, destroyAdminSession,
  adminAuthMiddleware, adminHasTotp, generateTotpSecret, confirmTotpSetup, verifyTotpCode,
  createPending2fa, checkPending2fa, consumePending2fa, consumeBackupCode, getBackupCodeCount,
} from "../auth.js";
import QRCode from "qrcode";
import { levelForCompleted } from "../vmeta.js";
import { isValidEmail, isValidPassword } from "../validators.js";

export const router = Router();

/* ============ Auth ============ */

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!isValidEmail(email) || !isValidPassword(password)) return res.status(400).json({ error: "Enter a valid email and password" });
  if (!(await checkAdminCredentials(email, password))) return res.status(401).json({ error: "Invalid email or password" });

  if (!(await adminHasTotp())) {
    // First-ever login: no 2FA configured yet -- caller must complete setup before a session is issued.
    return res.json({ needsTotpSetup: true, usingDefaultPassword: await isAdminUsingDefaultPassword() });
  }

  const pendingToken = await createPending2fa();
  res.json({ needsTotpCode: true, pendingToken });
});

router.post("/totp/setup/start", async (req, res) => {
  const { email, password } = req.body || {};
  if (!(await checkAdminCredentials(email, password))) return res.status(401).json({ error: "Invalid email or password" });
  if (await adminHasTotp()) return res.status(400).json({ error: "Two-factor authentication is already configured" });

  const { uri } = await generateTotpSecret();
  QRCode.toDataURL(uri, (err, dataUrl) => {
    if (err) return res.status(500).json({ error: "Could not generate QR code" });
    res.json({ uri, qrCode: dataUrl });
  });
});

router.post("/totp/setup/confirm", async (req, res) => {
  const { email, password, code } = req.body || {};
  if (!(await checkAdminCredentials(email, password))) return res.status(401).json({ error: "Invalid email or password" });
  const backupCodes = await confirmTotpSetup(code);
  if (!backupCodes) return res.status(400).json({ error: "Incorrect code, please try again" });

  const token = await createAdminSession();
  // Backup codes returned in plaintext once only — admin must save them now
  res.json({ token, usingDefaultPassword: await isAdminUsingDefaultPassword(), backupCodes });
});

// Reset TOTP using a backup code — allows admin to re-scan a fresh QR if
// they've lost access to their authenticator app.
router.post("/totp/reset", async (req, res) => {
  const { email, password, backupCode } = req.body || {};
  if (!(await checkAdminCredentials(email, password))) return res.status(401).json({ error: "Invalid email or password" });
  if (!(await consumeBackupCode(backupCode))) return res.status(401).json({ error: "Invalid or already-used backup code" });

  // Wipe the existing TOTP secret — next login will trigger setup flow again
  await db.prepare(`DELETE FROM admin_settings WHERE key IN ('totp_secret', 'totp_secret_pending')`).run();
  res.json({ ok: true, message: "Authenticator reset. Sign in again to set up a new authenticator." });
});

router.post("/totp/verify", async (req, res) => {
  const { pendingToken, code } = req.body || {};
  if (!(await checkPending2fa(pendingToken))) {
    return res.status(401).json({ error: "That code expired, please sign in again" });
  }
  if (!(await verifyTotpCode(code))) return res.status(401).json({ error: "Incorrect code" });

  await consumePending2fa(pendingToken);
  const token = await createAdminSession();
  res.json({ token, usingDefaultPassword: await isAdminUsingDefaultPassword() });
});

router.post("/logout", adminAuthMiddleware, async (req, res) => {
  destroyAdminSession(req.token);
  res.json({ ok: true });
});

router.get("/me", adminAuthMiddleware, async (req, res) => {
  res.json({ ok: true, usingDefaultPassword: await isAdminUsingDefaultPassword() });
});

// ---- Cron Jobs (Requires CRON_SECRET) ----
// Note: these sweeps also run on an in-process interval (see server.js) so they work
// with zero external infra. This endpoint stays for manual/on-demand triggering.
import { runPeriodicSweeps } from "../jobs/sweepFailures.js";

router.post("/cron/sweep-failures", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!process.env.CRON_SECRET) {
    return res.status(500).json({ error: "CRON_SECRET not configured" });
  }
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized cron request" });
  }

  try {
    const result = await runPeriodicSweeps();
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error("Cron sweep error:", error);
    res.status(500).json({ error: "Sweep failed", detail: error.message });
  }
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
  const builders = (await db.prepare(`SELECT COUNT(*) AS n FROM builders`).get()).n;
  const validators = (await db.prepare(`SELECT COUNT(*) AS n FROM validators`).get()).n;
  const activeMissions = (await db.prepare(`SELECT COUNT(*) AS n FROM missions WHERE status IN ('live','active','published')`).get()).n;
  const totalMissions = (await db.prepare(`SELECT COUNT(*) AS n FROM missions`).get()).n;

  const gmv = (await db.prepare(`SELECT COALESCE(SUM(amount),0) AS n FROM transactions WHERE type = 'credit'`).get()).n;
  const spend = (await db.prepare(`SELECT COALESCE(SUM(spend),0) AS n FROM missions`).get()).n;

  const openTickets = (await db.prepare(`SELECT COUNT(*) AS n FROM support_tickets WHERE status = 'open'`).get()).n;

  const withdrawalQueue = await db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(amount),0) AS amt FROM withdrawals WHERE status IN ('queued','processing','pending')`).get();

  const suspended = (await db.prepare(`
    SELECT (SELECT COUNT(*) FROM builders WHERE status = 'suspended') + (SELECT COUNT(*) FROM validators WHERE status = 'suspended') AS n
  `).get()).n;

  const pendingVerifications = (await db.prepare(`SELECT COUNT(*) AS n FROM verifications WHERE status = 'pending'`).get()).n;
  const pendingTesterApplications = (await db.prepare(`SELECT COUNT(*) AS n FROM validators WHERE tester_status = 'pending_review'`).get()).n;
  const flaggedMissions = (await db.prepare(`SELECT COUNT(*) AS n FROM missions WHERE flagged = 1`).get()).n;

  res.json({
    builders: Number(builders), validators: Number(validators), totalUsers: Number(builders) + Number(validators),
    activeMissions: Number(activeMissions), totalMissions: Number(totalMissions), gmv: Number(gmv), spend: Number(spend),
    openTickets: Number(openTickets), suspended: Number(suspended),
    withdrawalQueue: Number(withdrawalQueue.n), withdrawalQueueAmount: Number(withdrawalQueue.amt),
    pendingVerifications, pendingTesterApplications, flaggedMissions,
  });
});

/* ============ Notifications ============ */

router.get("/notifications", async (req, res) => {
  const rows = await db.prepare(`SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 50`).all();
  res.json({ notifications: rows.map(r => ({
    id: r.id, cat: r.cat, type: r.type, icon: r.icon, tone: r.tone,
    title: r.title, body: r.body, timeLabel: r.time_label,
    unread: !!r.unread, createdAt: r.created_at
  })) });
});

router.patch("/notifications/:id/read", async (req, res) => {
  if (req.params.id === "all") {
    await db.prepare(`UPDATE admin_notifications SET unread = 0, read = 1 WHERE unread = 1`).run();
  } else {
    await db.prepare(`UPDATE admin_notifications SET unread = 0, read = 1 WHERE id = ?`).run(req.params.id);
  }
  res.json({ ok: true });
});

/* ============ Members ============ */

// Server-side paginated + filtered, unlike the old load-everything-then-filter-in-JS
// version — with 3000+ seeded validators, fetching every row on every keystroke was a
// real cost. Sorted by created_at since builder/validator ids aren't comparable across
// the two tables, so it's the only stable ordering once you're paginating across both.
router.get("/members", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const type = req.query.type; // 'builder' | 'validator' | undefined
  const filterStatus = req.query.status; // 'suspended' | undefined
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = Math.max(0, Number(req.query.offset) || 0);

  const branches = [];
  if (type !== "validator") {
    branches.push(`SELECT id, 'builder' as type, name, email, org, COALESCE(status,'active') as status, balance, phone_verified, created_at, NULL::int as missions_done, NULL::int as lifetime, NULL::real as rating FROM builders`);
  }
  if (type !== "builder") {
    branches.push(`SELECT id, 'validator' as type, name, email, COALESCE(handle,'—') as org, COALESCE(status,'active') as status, balance, phone_verified, created_at, missions_done, earnings_total as lifetime, rating FROM validators`);
  }
  const union = branches.join(" UNION ALL ");

  const conditions = [];
  const whereParams = [];
  if (q) {
    conditions.push(`(name ILIKE ? OR email ILIKE ? OR org ILIKE ?)`);
    whereParams.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (filterStatus === "suspended") {
    conditions.push(`status = 'suspended'`);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRow = await db.prepare(`SELECT COUNT(*) as c FROM (${union}) t ${where}`).get(...whereParams);
  const rows = await db.prepare(`SELECT * FROM (${union}) t ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`).all(...whereParams, limit, offset);

  const members = rows.map(m => ({
    id: m.id, type: m.type, name: m.name, email: m.email, org: m.org, status: m.status,
    balance: m.balance, phoneVerified: !!m.phone_verified, createdAt: m.created_at,
    ...(m.type === "validator" ? { level: levelForCompleted(m.missions_done).n, lifetime: m.lifetime, rating: m.rating } : {}),
  }));

  res.json({ members, total: parseInt(countRow.c, 10) || 0, offset, limit });
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

// PATCH /api/admin/members/validator/:id/verify
router.patch("/members/validator/:id/verify", async (req, res) => {
  const v = await db.prepare(`SELECT * FROM validators WHERE id = ?`).get(req.params.id);
  if (!v) return res.status(404).json({ error: "Validator not found" });

  await db.prepare(`UPDATE validators SET verified = 1, verification_status = 'verified' WHERE id = ?`).run(v.id);
  
  await db.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread) VALUES (?, 'system', 'verified', 'shield', 'success', ?, ?, 'Just now', 1)`)
    .run(v.id, "Account Verified", "Congratulations! Your account has been manually verified by our team. You can now access Verified missions.");

  audit(`validator.verify`, "validator", v.id, `Manually verified validator #${v.id}`);
  res.json({ ok: true });
});

/* ============ Support tickets ============ */
// Read-only mirror of support_tickets (real tickets live in Freshdesk once configured,
// or locally-only when it isn't — see freshdesk.js/freshdeskWebhook.js). Admin can see
// and triage status here; actual replies happen in Freshdesk, which notifies the user
// in-app via the webhook receiver when an agent responds.

router.get("/tickets", async (req, res) => {
  const rows = await db.prepare(`SELECT * FROM support_tickets ORDER BY created_at DESC`).all();
  res.json({ tickets: rows.map(t => ({
    id: t.id, userType: t.role, userName: t.name, userEmail: t.email,
    subject: t.subject, details: t.description, status: t.status,
    freshdeskId: t.freshdesk_id, updated: t.updated_at, createdAt: t.created_at,
  })) });
});

// PATCH /api/admin/tickets/:id { status }
router.patch("/tickets/:id", async (req, res) => {
  const status = req.body?.status;
  if (!status || !["open", "answered", "resolved"].includes(status)) return res.status(400).json({ error: "Invalid status" });

  const row = await db.prepare(`SELECT * FROM support_tickets WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });

  await db.prepare(`UPDATE support_tickets SET status = ?, updated_at = NOW() WHERE id = ?`).run(status, req.params.id);

  const user = row.role === "builder"
    ? await db.prepare(`SELECT id FROM builders WHERE email = ?`).get(row.email)
    : await db.prepare(`SELECT id FROM validators WHERE email = ?`).get(row.email);
  if (user) {
    const notifyTable = row.role === "builder" ? "notifications" : "v_notifications";
    const userIdCol = row.role === "builder" ? "builder_id" : "validator_id";
    await db.prepare(`INSERT INTO ${notifyTable} (${userIdCol}, cat, type, icon, tone, title, body, time_label, unread) VALUES (?, 'system', 'ticket_update', 'life', 'primary', 'Support Update', 'Your support ticket status was updated by the admin team.', 'Just now', 1)`).run(user.id);
  }

  audit(`ticket.${status}`, "ticket", req.params.id, `Ticket #${req.params.id} marked ${status}`);
  res.json({ ok: true });
});

/* ============ Withdrawals ============ */

router.get("/withdrawals", async (req, res) => {
  const rows = await db.prepare(`
    SELECT w.*, v.name AS validator_name, v.email AS validator_email
    FROM withdrawals w JOIN validators v ON v.id = w.validator_id
    ORDER BY w.id DESC LIMIT 100
  `).all();
  res.json({ withdrawals: rows.map(w => {
    let account = {};
    try { account = JSON.parse(w.account_json || "{}"); } catch { /* ignore malformed json */ }
    return {
      id: w.id, validatorName: w.validator_name, validatorEmail: w.validator_email,
      amount: w.amount, vpa: account.vpa || null, cashfreeTransferId: account.transfer_id || null,
      status: w.status, failureReason: w.note, createdAt: w.requested_at,
    };
  }) });
});

// PATCH /api/admin/withdrawals/:id { status, failureReason? }
router.patch("/withdrawals/:id", async (req, res) => {
  const status = String(req.body?.status || "");
  if (!["queued", "processing", "processed", "failed", "rejected", "reversed"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const row = await db.prepare(`SELECT * FROM withdrawals WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });

  await db.prepare(`UPDATE withdrawals SET status = ?, note = ?, processed_at = NOW() WHERE id = ?`).run(status, req.body?.failureReason || row.note, req.params.id);

  if (["failed", "rejected", "reversed"].includes(status) && !["failed", "rejected", "reversed"].includes(row.status)) {
    await db.prepare(`UPDATE validators SET balance = balance + ? WHERE id = ?`).run(row.amount, row.validator_id);
  }

  // Notify the validator about their withdrawal status
  const v = await db.prepare(`SELECT name, email FROM validators WHERE id = ?`).get(row.validator_id);
  if (v && ["processed", "failed", "rejected"].includes(status)) {
    const tone = status === "processed" ? "success" : "warning";
    const icon = status === "processed" ? "checkCircle" : "xCircle";
    const title = status === "processed" ? "Withdrawal Processed" : "Withdrawal Failed";
    const body = status === "processed" 
      ? `Your withdrawal of ₹${row.amount} has been successfully processed.` 
      : `Your withdrawal of ₹${row.amount} failed or was rejected. The amount has been refunded to your wallet.`;
      
    await db.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread) VALUES (?, 'system', 'payout', ?, ?, ?, ?, 'Just now', 1)`)
      .run(row.validator_id, icon, tone, title, body);

    sendWithdrawalUpdate({
      validatorName: v.name, validatorEmail: v.email,
      amount: row.amount, status, failureReason: req.body?.failureReason || null,
    }).catch(() => {});
  }

  audit(`withdrawal.${status}`, "withdrawal", req.params.id, `₹${row.amount} withdrawal marked ${status}`);
  res.json({ ok: true });
});

/* ============ Verification queue ============ */

router.get("/verifications", async (req, res) => {
  const status = req.query.status || "pending";
  let query = `
    SELECT v.*, b.name AS builder_name, b.org, b.email, b.persona
    FROM verifications v JOIN builders b ON b.id = v.builder_id
  `;
  const params = [];
  if (status !== "all") {
    query += ` WHERE v.status = ?`;
    params.push(status);
  }
  query += ` ORDER BY v.submitted_at DESC`;
  const rows = await db.prepare(query).all(...params);
  res.json({ verifications: rows.map(v => ({
    id: v.id, builderId: v.builder_id, builderName: v.builder_name, org: v.org, email: v.email,
    persona: v.persona, kind: v.kind, subject: v.subject, status: v.status, note: v.note,
    createdAt: v.submitted_at, reviewedAt: v.reviewed_at,
  })) });
});

router.patch("/verifications/:id", async (req, res) => {
  const status = String(req.body?.status || "");
  const note = req.body?.note ? String(req.body.note).trim() : null;
  if (!["approved", "rejected"].includes(status)) return res.status(400).json({ error: "status must be 'approved' or 'rejected'" });

  const row = await db.prepare(`SELECT * FROM verifications WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });

  await db.prepare(`UPDATE verifications SET status = ?, reviewer_note = ?, reviewed_at = NOW() WHERE id = ?`).run(status, note, req.params.id);

  // If a verification is approved, mark the builder as verified
  if (status === "approved") {
    await db.prepare(`UPDATE builders SET verified_at = NOW() WHERE id = ? AND verified_at IS NULL`).run(row.builder_id);
  }

  // Notify builder
  const title = status === "approved" ? "Verification Approved" : "Verification Declined";
  const body = status === "approved" 
    ? `Your ${row.kind} verification claim has been approved by our team.`
    : `Your ${row.kind} verification claim was declined. Reason: ${note || 'Please try again with different proof.'}`;
  const tone = status === "approved" ? "success" : "warning";
  const icon = status === "approved" ? "checkCircle" : "xCircle";
  
  await db.prepare(`INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread) VALUES (?, 'system', 'verification', ?, ?, ?, ?, 'Just now', 1)`)
    .run(row.builder_id, icon, tone, title, body);

  audit(`verification.${status}`, "verification", req.params.id, `${row.kind} claim for builder #${row.builder_id} ${status}`);
  res.json({ ok: true, status });
});

/* ============ Tester applications (separate queue from builder verifications above —
   different data shape: resume/LinkedIn/testing bio, not website/registry claims) ============ */

router.get("/tester-applications", async (req, res) => {
  const rows = await db.prepare(`
    SELECT id, name, email, city, occupation, experience_years, industry_json, company,
           linkedin_url, portfolio_url, testing_bio, resume_path, resume_filename, created_at, tester_status
    FROM validators WHERE tester_status != 'none' ORDER BY created_at DESC
  `).all();
  res.json({ applications: rows.map(v => ({
    id: v.id, name: v.name, email: v.email, city: v.city, occupation: v.occupation,
    experience: v.experience_years, industry: JSON.parse(v.industry_json || "[]"), company: v.company,
    linkedinUrl: v.linkedin_url, portfolioUrl: v.portfolio_url, testingBio: v.testing_bio,
    resumeUrl: v.resume_path ? `/api/uploads/${v.resume_path}` : null, resumeFilename: v.resume_filename,
    createdAt: v.created_at, status: v.tester_status,
  })) });
});

router.patch("/tester-applications/:id", async (req, res) => {
  const status = String(req.body?.status || "");
  if (!["approved", "rejected"].includes(status)) return res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
  const tier = req.body?.tier;
  if (status === "approved" && !["junior", "senior"].includes(tier)) {
    return res.status(400).json({ error: "tier must be 'junior' or 'senior' when approving" });
  }

  const row = await db.prepare(`SELECT id, name FROM validators WHERE id = ? AND tester_status = 'pending_review'`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "No pending application found for this validator" });

  if (status === "approved") {
    await db.prepare(`UPDATE validators SET tester_status = 'approved', tester_tier = ?, validator_type = 'tester' WHERE id = ?`)
      .run(tier, row.id);
  } else {
    // Rejected — validator_type was never changed off 'validator' on submission, stays as-is.
    // No cooldown: nothing suggests reapply abuse is a real problem yet (YAGNI) — they can
    // reapply immediately via the onboarding flow, same as today.
    await db.prepare(`UPDATE validators SET tester_status = 'rejected' WHERE id = ?`).run(row.id);
  }

  const title = status === "approved" ? "Verified Tester Approved!" : "Tester Application Declined";
  const body = status === "approved"
    ? `Congratulations — you're now a Verified ${tier === "senior" ? "Senior" : "Junior"} Tester. Premium missions are unlocked.`
    : "Your Verified Tester application wasn't approved this time. You can reapply anytime from Settings.";
  await db.prepare(`INSERT INTO v_notifications (validator_id, cat, icon, tone, title, body, time_label, unread) VALUES (?, 'system', ?, ?, ?, ?, 'Just now', 1)`)
    .run(row.id, status === "approved" ? "star" : "xCircle", status === "approved" ? "success" : "warning", title, body);

  audit(`tester_application.${status}`, "validator", row.id, `Tester application ${status}${status === "approved" ? ` (${tier})` : ""} for ${row.name}`);
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

  const byCategoryRaw = await db.prepare(`SELECT category, COUNT(*) AS n FROM missions GROUP BY category ORDER BY n DESC`).all();
  const byCategory = byCategoryRaw.map(r => ({ ...r, n: Number(r.n) }));
  const byPersonaRaw = await db.prepare(`SELECT COALESCE(persona,'founder') AS persona, COUNT(*) AS n FROM builders GROUP BY COALESCE(persona,'founder') ORDER BY n DESC`).all();
  const byPersona = byPersonaRaw.map(r => ({ ...r, n: Number(r.n) }));

  res.json({ months, userGrowth, missionGrowth, revenueByMonth, byCategory, byPersona });
});

/* ============ Audit log ============ */

router.get("/audit-log", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const rows = await db.prepare(
    `SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT ?`
  ).all(limit);
  res.json({ log: rows });
});

/* ============ Fraud signals ============ */

router.get("/fraud-signals", async (req, res) => {
  const reviewed = req.query.reviewed === "true" ? 1 : 0;
  const rows = await db.prepare(
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
  for (const { id } of missions) flagged += await runAutomod(id);
  audit("automod.run", "system", null, `Scanned ${missions.length} missions, flagged ${flagged}`);
  res.json({ ok: true, scanned: missions.length, flagged });
});
