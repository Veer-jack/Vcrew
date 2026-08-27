import { Router } from "express";
import { db } from "../db.js";
import { validatorAuthMiddleware } from "../auth.js";
import { consumeStepUpToken } from "../firebaseRoutes.js";
import { isCashfreePayoutsConfigured, createBeneficiary, createTransfer } from "../cashfreeClient.js";
import { LEVELS, levelForCompleted } from "../vmeta.js";

export const router = Router();
router.use(validatorAuthMiddleware);

router.get("/", async (req, res) => {
  const v = req.validator;
  const lvl = levelForCompleted(v.missions_done);
  const nextLvl = LEVELS.find(l => l.n === lvl.n + 1) || null;
  const lvlPct = nextLvl ? Math.min(100, Math.round((((v.missions_done || 0) - lvl.min) / (nextLvl.min - lvl.min)) * 100)) : 100;

  const history = await db.prepare(`
    SELECT mm.*, t.product, t.type, t.reward FROM v_my_missions mm 
    JOIN (
      SELECT id::text, type::text, product::text, reward::int FROM vtasks
      UNION ALL
      SELECT id::text, ptype::text as type, name::text as product, reward_amount::int as reward FROM missions
    ) t ON (t.id = mm.task_id OR t.id = mm.mission_id)
    WHERE mm.validator_id = ? AND mm.status IN ('submitted','completed') ORDER BY mm.updated_at DESC LIMIT 10
  `).all(v.id);

  const earningsAgg = await db.prepare(`
    SELECT 
      SUM(CASE WHEN vmm.status = 'completed' THEN m.reward_amount ELSE 0 END) as lifetime,
      SUM(CASE WHEN vmm.status = 'completed' AND vmm.updated_at >= NOW() - INTERVAL '7 days' THEN m.reward_amount ELSE 0 END) as week_earnings,
      SUM(CASE WHEN vmm.status = 'submitted' THEN m.reward_amount ELSE 0 END) as pending
    FROM v_my_missions vmm
    JOIN missions m ON vmm.mission_id = m.id
    WHERE vmm.validator_id = ?
  `).get(v.id);

  res.json({
    weekEarnings: earningsAgg?.week_earnings || 0,
    weekTarget: 2000, 
    pending: earningsAgg?.pending || 0,
    available: v.balance || 0,
    lifetime: earningsAgg?.lifetime || 0,
    name: v.name, rating: v.rating, ratingCount: v.reviews_count, accuracy: v.accuracy || 100,
    level: lvl.n, levelName: lvl.name, nextLevelName: nextLvl?.name, toNextLevel: nextLvl ? Math.max(0, nextLvl.min - (v.missions_done || 0)) : 0, levelPct: lvlPct,
    specialties: JSON.parse(v.specialties_json || "[]"),
    history: history.map(h => ({
      id: h.id, product: h.product, type: h.type, reward: h.reward,
      status: h.status === "completed" ? "Approved" : "In review",
      quality: h.quality || "—", when: h.status_label,
    })),
  });
});

// POST /api/v/earnings/withdraw { amount, stepUpToken? }
router.post("/withdraw", async (req, res) => {
  const MIN_WITHDRAWAL_AMOUNT = 500;
  const amount = Math.round(Number(req.body?.amount));
  if (!amount || amount <= 0) return res.status(400).json({ error: "amount must be a positive number" });
  if (amount < MIN_WITHDRAWAL_AMOUNT) return res.status(400).json({ error: `Minimum withdrawal amount is \u20b9${MIN_WITHDRAWAL_AMOUNT}` });
  if (amount > req.validator.balance) return res.status(400).json({ error: "Amount exceeds available balance" });

  if (req.validator.phone_verified) {
    const ok = await consumeStepUpToken({ table: "validators", userId: req.validator.id, purpose: "withdraw", token: req.body?.stepUpToken });
    if (!ok) return res.status(403).json({ error: "Please verify with the code sent to your phone", code: "STEP_UP_REQUIRED" });
  }

  if (!req.validator.payout_vpa) {
    return res.status(400).json({ error: "Add a UPI ID for payouts in your profile first", code: "PAYOUT_DETAILS_REQUIRED" });
  }

  const reserve = await db.prepare(`UPDATE validators SET balance = balance - ? WHERE id = ? AND balance >= ?`).run(amount, req.validator.id, amount);
  if (reserve.changes === 0) return res.status(400).json({ error: "Amount exceeds available balance" });
  const refundReservation = () => db.prepare(`UPDATE validators SET balance = balance + ? WHERE id = ?`).run(amount, req.validator.id);

  if (isCashfreePayoutsConfigured()) {
    try {
      let beneficiaryId = req.validator.cashfree_beneficiary_id;

      // Cashfree beneficiary ids are caller-assigned (unlike Razorpay's
      // contact id, which Razorpay generated for you) — use a deterministic
      // id per validator so this is naturally idempotent across retries.
      if (!beneficiaryId) {
        beneficiaryId = `validator_${req.validator.id}`;
        try {
          await createBeneficiary({
            beneficiaryId,
            name: req.validator.name,
            email: req.validator.email,
            phone: req.validator.phone || "9999999999",
            vpa: req.validator.payout_vpa,
          });
        } catch (err) {
          // If the beneficiary already exists at Cashfree (e.g. a previous
          // attempt created it but the DB write below failed before caching
          // it), that's fine — re-use it rather than treating it as fatal.
          const alreadyExists = /already exists|BENEFICIARY_ALREADY_EXISTS/i.test(err.message || "");
          if (!alreadyExists) throw err;
        }
        await db.prepare(`UPDATE validators SET cashfree_beneficiary_id = ? WHERE id = ?`).run(beneficiaryId, req.validator.id);
      }

      const transferId = `withdraw_${req.validator.id}_${Date.now()}`;
      const transfer = await createTransfer({
        beneficiaryId,
        amountRupees: amount,
        transferId,
      });

      await db.prepare(`INSERT INTO withdrawals (validator_id, amount, method, account_json, status) VALUES (?,?,?,?,?)`)
        .run(req.validator.id, amount, 'cashfree', JSON.stringify({ vpa: req.validator.payout_vpa, transfer_id: transferId, cf_transfer_id: transfer.cf_transfer_id }), transfer.status || 'RECEIVED');

      await db.prepare(`INSERT INTO v_notifications (validator_id, cat, icon, tone, title, body, time_label, unread) VALUES (?,'system','coin','amber',?,?, 'Just now', 1)`)
        .run(req.validator.id, "Withdrawal requested", `Your withdrawal of \u20b9${amount.toLocaleString("en-IN")} to ${req.validator.payout_vpa} is ${transfer.status || "queued"} and should land within 24h.`);

      await db.prepare(`INSERT INTO admin_notifications (cat, type, icon, tone, title, body, time_label, unread) VALUES ('system', 'payout', 'coin', 'amber', 'New Withdrawal Request', ?, 'Just now', 1)`)
        .run(`${req.validator.name} requested a live Cashfree withdrawal of \u20b9${amount.toLocaleString("en-IN")}.`);

      const availRow = await db.prepare(`SELECT balance FROM validators WHERE id = ?`).get(req.validator.id);
      return res.json({ available: availRow.balance, payoutStatus: transfer.status });
    } catch (err) {
      await refundReservation();
      return res.status(400).json({ error: err.message });
    }
  }

  // Simulated fallback when Cashfree Payouts isn't configured.
  await db.prepare(`INSERT INTO withdrawals (validator_id, amount, method, account_json, status) VALUES (?,?,?,?,?)`)
    .run(req.validator.id, amount, 'manual', JSON.stringify({ vpa: req.validator.payout_vpa }), 'pending');

  await db.prepare(`INSERT INTO v_notifications (validator_id, cat, icon, tone, title, body, time_label, unread) VALUES (?,'system','coin','amber',?,?, 'Just now', 1)`)
    .run(req.validator.id, "Withdrawal requested", `Your withdrawal of \u20b9${amount.toLocaleString("en-IN")} to ${req.validator.payout_vpa} is queued for review and should land within 24h.`);

  await db.prepare(`INSERT INTO admin_notifications (cat, type, icon, tone, title, body, time_label, unread) VALUES ('system', 'payout', 'coin', 'amber', 'New Withdrawal Request', ?, 'Just now', 1)`)
    .run(`${req.validator.name} requested a manual withdrawal of \u20b9${amount.toLocaleString("en-IN")}.`);

  const availRow = await db.prepare(`SELECT balance FROM validators WHERE id = ?`).get(req.validator.id);
  res.json({ available: availRow.balance });
});
