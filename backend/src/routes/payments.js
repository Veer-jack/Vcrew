import { Router } from "express";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";
import { isStripeConfigured, getStripe } from "../stripeClient.js";
import { frontendUrl } from "../oauth.js";

export const router = Router();

// GET /api/payments/config — is card top-up available
router.get("/config", (req, res) => res.json({ configured: isStripeConfigured() }));

router.use(authMiddleware);

// POST /api/wallet/checkout { amount } -> { url } — start a Stripe Checkout session
router.post("/checkout", async (req, res) => {
  const amount = Math.round(Number(req.body?.amount));
  if (!amount || amount <= 0) return res.status(400).json({ error: "amount must be a positive number" });
  if (amount < 100) return res.status(400).json({ error: "Minimum top-up is ₹100" });

  try {
    const stripe = getStripe();
    const base = frontendUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "inr",
          unit_amount: amount * 100, // paise
          product_data: { name: "ValidationCrew wallet top-up" },
        },
        quantity: 1,
      }],
      metadata: { builderId: String(req.builder.id), amount: String(amount) },
      success_url: `${base}/wallet?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/wallet?checkout=cancelled`,
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/wallet/checkout/:sessionId -> { balance, credited } — confirm + credit (idempotent)
router.get("/checkout/:sessionId", async (req, res) => {
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);

    if (String(session.metadata?.builderId) !== String(req.builder.id)) {
      return res.status(403).json({ error: "This checkout session doesn't belong to your account" });
    }

    const balanceRow = () => db.prepare(`SELECT balance FROM builders WHERE id = ?`).get(req.builder.id);

    if (session.payment_status !== "paid") {
      return res.json({ balance: balanceRow().balance, credited: false, status: session.payment_status });
    }

    const existing = db.prepare(`SELECT id FROM transactions WHERE stripe_session_id = ?`).get(session.id);
    if (existing) {
      return res.json({ balance: balanceRow().balance, credited: true, status: "paid" });
    }

    const amount = Math.round(Number(session.metadata?.amount || session.amount_total / 100));
    db.prepare(`UPDATE builders SET balance = balance + ? WHERE id = ?`).run(amount, req.builder.id);
    db.prepare(`INSERT INTO transactions (builder_id, date_label, description, type, amount, mission_id, stripe_session_id) VALUES (?,?,?,?,?,?,?)`)
      .run(req.builder.id, "Today", "Wallet top-up (card)", "credit", amount, null, session.id);

    res.json({ balance: balanceRow().balance, credited: true, status: "paid" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
