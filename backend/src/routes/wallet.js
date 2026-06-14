import { Router } from "express";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";

export const router = Router();
router.use(authMiddleware);

router.get("/", (req, res) => {
  const bId = req.builder.id;
  const transactions = db.prepare(`SELECT * FROM transactions WHERE builder_id = ? ORDER BY id DESC`).all(bId);
  const invoices = db.prepare(`SELECT * FROM invoices WHERE builder_id = ? ORDER BY id DESC`).all(bId);
  const paymentMethods = db.prepare(`SELECT * FROM payment_methods WHERE builder_id = ? ORDER BY is_primary DESC, id ASC`).all(bId);

  res.json({
    balance: req.builder.balance,
    pending: req.builder.pending,
    monthSpend: req.builder.month_spend,
    transactions: transactions.map(t => ({
      id: t.id, date: t.date_label, description: t.description, type: t.type, amount: t.amount, missionId: t.mission_id,
    })),
    invoices: invoices.map(i => ({ id: i.id, date: i.date_label, amount: i.amount, status: i.status })),
    paymentMethods: paymentMethods.map(p => ({ id: p.id, brand: p.brand, last4: p.last4, exp: p.exp, primary: !!p.is_primary })),
  });
});

// POST /api/wallet/topup { amount }
router.post("/topup", (req, res) => {
  const amount = Math.round(Number(req.body?.amount));
  if (!amount || amount <= 0) return res.status(400).json({ error: "amount must be a positive number" });

  db.prepare(`UPDATE builders SET balance = balance + ? WHERE id = ?`).run(amount, req.builder.id);
  db.prepare(`INSERT INTO transactions (builder_id, date_label, description, type, amount, mission_id) VALUES (?,?,?,?,?,?)`)
    .run(req.builder.id, "Today", "Wallet top-up", "credit", amount, null);

  const balance = db.prepare(`SELECT balance FROM builders WHERE id = ?`).get(req.builder.id).balance;
  res.status(201).json({ balance });
});
