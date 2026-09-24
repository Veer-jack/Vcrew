import { Router } from "express";
import { db } from "../db.js";
import { validatorAuthMiddleware } from "../auth.js";
import { isCashfreePayoutsConfigured } from "../cashfreeClient.js";

export const router = Router();

// GET /api/v/payouts/config — is real payout available
router.get("/config", async (req, res) => res.json({ configured: isCashfreePayoutsConfigured() }));

router.use(validatorAuthMiddleware);

const VPA_RE = /^[\w.\-]{2,256}@[\w.\-]{2,64}$/;

// POST /api/v/payouts/vpa { vpa } — set/update the UPI ID withdrawals go to
router.post("/vpa", async (req, res) => {
  const vpa = String(req.body?.vpa || "").trim();
  if (!VPA_RE.test(vpa)) return res.status(400).json({ error: "Enter a valid UPI ID, e.g. yourname@bank" });

  // Changing the VPA invalidates any cached Cashfree beneficiary so a fresh
  // one is created for the new VPA on the next withdrawal. (Cashfree ties a
  // beneficiary to a specific instrument, unlike Razorpay's separate
  // contact+fund-account split — one id now, not two.)
  await db.prepare(`UPDATE validators SET payout_vpa = ?, cashfree_beneficiary_id = NULL WHERE id = ?`)
    .run(vpa, req.validator.id);
  res.json({ ok: true, vpa });
});

router.post("/remove", async (req, res) => {
  await db.prepare(`UPDATE validators SET payout_vpa = NULL, cashfree_beneficiary_id = NULL WHERE id = ?`)
    .run(req.validator.id);
  res.json({ ok: true });
});

// GET /api/v/payouts/history — recent withdrawal records
router.get("/history", async (req, res) => {
  const rows = await db.prepare(`SELECT id, amount, account_json, status, note, requested_at FROM withdrawals WHERE validator_id = ? ORDER BY id DESC LIMIT 20`)
    .all(req.validator.id);
  const mapped = rows.map(r => ({
    id: r.id,
    amount: r.amount,
    vpa: (JSON.parse(r.account_json || "{}")).vpa || "",
    status: r.status,
    failure_reason: r.note,
    created_at: r.requested_at
  }));
  res.json({ withdrawals: mapped });
});
