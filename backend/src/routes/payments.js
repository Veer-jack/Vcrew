import { Router } from "express";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";
import { isRazorpayConfigured, razorpayKeyId, createOrder, verifySignature } from "../razorpayClient.js";
import { handleRazorpayError } from "../outage.js";

export const router = Router();

// GET /api/payments/config — is card top-up available, and the public key for the checkout widget
router.get("/config", async (req, res) => res.json({ configured: isRazorpayConfigured(), keyId: razorpayKeyId() }));

router.use(authMiddleware);

// POST /api/payments/order { amount } -> { orderId, amount, currency, keyId } — create a Razorpay order
router.post("/order", async (req, res) => {
  const amount = Math.round(Number(req.body?.amount));
  if (!amount || amount <= 0) return res.status(400).json({ error: "amount must be a positive number" });
  if (amount < 100) return res.status(400).json({ error: "Minimum top-up is ₹100" });

  try {
    const order = await createOrder(amount, `topup_${req.builder.id}_${Date.now()}`);
    res.json({ orderId: order.id, amount, currency: "INR", keyId: razorpayKeyId() });
  } catch (err) {
    return handleRazorpayError(err, res);
  }
});

// POST /api/payments/verify { orderId, paymentId, signature, amount } -> { balance, credited } — verify + credit (idempotent)
router.post("/verify", async (req, res) => {
  const { orderId, paymentId, signature, amount } = req.body || {};
  if (!verifySignature({ orderId, paymentId, signature })) {
    return res.status(400).json({ error: "Payment verification failed" });
  }

  const balanceRow = async () => await db.prepare(`SELECT balance FROM builders WHERE id = ?`).get(req.builder.id);

  const existing = await db.prepare(`SELECT id FROM transactions WHERE payment_ref = ?`).get(orderId);
  if (existing) {
    return res.json({ balance: balanceRow().balance, credited: true });
  }

  const credit = Math.round(Number(amount));
  if (!credit || credit <= 0) return res.status(400).json({ error: "Invalid amount" });

  await db.prepare(`UPDATE builders SET balance = balance + ? WHERE id = ?`).run(credit, req.builder.id);
  await db.prepare(`INSERT INTO transactions (builder_id, date_label, description, type, amount, mission_id, payment_ref) VALUES (?,?,?,?,?,?,?)`)
    .run(req.builder.id, "Today", "Wallet top-up (card)", "credit", credit, null, orderId);

  res.json({ balance: balanceRow().balance, credited: true });
});
