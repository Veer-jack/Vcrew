import { Router } from "express";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";
import { isCashfreeConfigured, createOrder, getOrder } from "../cashfreeClient.js";

export const router = Router();

// GET /api/payments/config — is card top-up available on this server.
// No public key needed for Cashfree's hosted checkout (unlike Razorpay) —
// the frontend uses the payment_session_id returned from /order instead.
router.get("/config", async (req, res) => res.json({ configured: isCashfreeConfigured() }));

router.use(authMiddleware);

// POST /api/payments/order { amount } -> { orderId, amount, currency, paymentSessionId }
// Creates a Cashfree order. The frontend uses paymentSessionId to open
// Cashfree's hosted checkout (Cashfree.js SDK or redirect) — there is no
// separate "keyId" needed on the client side with Cashfree.
router.post("/order", async (req, res) => {
  const amount = Math.round(Number(req.body?.amount));
  if (!amount || amount <= 0) return res.status(400).json({ error: "amount must be a positive number" });
  if (amount < 100) return res.status(400).json({ error: "Minimum top-up is ₹100" });

  try {
    const orderId = `topup_${req.builder.id}_${Date.now()}`;
    const order = await createOrder(amount, orderId, {
      id: String(req.builder.id),
      name: req.builder.name,
      email: req.builder.email,
      phone: req.builder.phone,
    });
    res.json({
      orderId: order.order_id,
      amount,
      currency: "INR",
      paymentSessionId: order.payment_session_id,
    });
  } catch (err) {
    return handlePaymentGatewayError(err, res);
  }
});

// POST /api/payments/verify { orderId, amount } -> { balance, credited } — verify + credit (idempotent)
//
// IMPORTANT DIFFERENCE FROM RAZORPAY: Cashfree's hosted checkout does NOT
// return a client-side signature to verify. After payment, the customer is
// redirected to return_url with only ?order_id=... in the query string.
// The only trustworthy way to confirm payment is to ask Cashfree directly
// via getOrder() — never trust a client-submitted "it succeeded" claim.
// This is actually safer than the old signature-based flow, but it does
// mean this endpoint now makes an outbound call to Cashfree instead of a
// local HMAC check.
router.post("/verify", async (req, res) => {
  const { orderId, amount } = req.body || {};
  if (!orderId) return res.status(400).json({ error: "orderId required" });

  let order;
  try {
    order = await getOrder(orderId);
  } catch (err) {
    return handlePaymentGatewayError(err, res);
  }

  if (order.order_status !== "PAID") {
    return res.status(400).json({ error: `Payment not completed (status: ${order.order_status})` });
  }

  const balanceRow = async () => await db.prepare(`SELECT balance FROM builders WHERE id = ?`).get(req.builder.id);

  const existing = await db.prepare(`SELECT id FROM transactions WHERE ref = ?`).get(orderId);
  if (existing) {
    return res.json({ balance: (await balanceRow()).balance, credited: true });
  }

  // Trust Cashfree's own order_amount over whatever the client sent, as a
  // second line of defense against a tampered amount in the request body.
  const credit = Math.round(Number(order.order_amount ?? amount));
  if (!credit || credit <= 0) return res.status(400).json({ error: "Invalid amount" });

  await db.prepare(`UPDATE builders SET balance = balance + ? WHERE id = ?`).run(credit, req.builder.id);
  await db.prepare(`INSERT INTO transactions (builder_id, type, amount, status, ref, detail) VALUES (?,?,?,?,?,?)`)
    .run(req.builder.id, "credit", credit, "completed", orderId, "Wallet top-up via card");

  res.json({ balance: (await balanceRow()).balance, credited: true });
});
