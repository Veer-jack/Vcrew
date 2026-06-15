import { Router } from "express";
import { db } from "../db.js";
import { validatorAuthMiddleware } from "../auth.js";
import { isRazorpayXConfigured } from "../razorpayClient.js";

export const router = Router();

// GET /api/v/payouts/config — is real payout available
router.get("/config", (req, res) => res.json({ configured: isRazorpayXConfigured() }));

router.use(validatorAuthMiddleware);

const VPA_RE = /^[\w.\-]{2,256}@[\w.\-]{2,64}$/;

// POST /api/v/payouts/vpa { vpa } — set/update the UPI ID withdrawals go to
router.post("/vpa", (req, res) => {
  const vpa = String(req.body?.vpa || "").trim();
  if (!VPA_RE.test(vpa)) return res.status(400).json({ error: "Enter a valid UPI ID, e.g. yourname@bank" });

  // Changing the VPA invalidates any cached Razorpay contact/fund account so a
  // fresh one is created for the new VPA on the next withdrawal.
  db.prepare(`UPDATE validators SET payout_vpa = ?, razorpay_contact_id = NULL, razorpay_fund_account_id = NULL WHERE id = ?`)
    .run(vpa, req.validator.id);
  res.json({ ok: true, vpa });
});

router.post("/remove", (req, res) => {
  db.prepare(`UPDATE validators SET payout_vpa = NULL, razorpay_contact_id = NULL, razorpay_fund_account_id = NULL WHERE id = ?`)
    .run(req.validator.id);
  res.json({ ok: true });
});

// GET /api/v/payouts/history — recent withdrawal records
router.get("/history", (req, res) => {
  const rows = db.prepare(`SELECT id, amount, vpa, status, failure_reason, created_at FROM withdrawals WHERE validator_id = ? ORDER BY id DESC LIMIT 20`)
    .all(req.validator.id);
  res.json({ withdrawals: rows });
});
