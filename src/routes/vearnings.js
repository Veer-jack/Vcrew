import { Router } from "express";
import { db } from "../db.js";
import { validatorAuthMiddleware } from "../auth.js";
import { LEVELS } from "../vmeta.js";

export const router = Router();
router.use(validatorAuthMiddleware);

router.get("/", (req, res) => {
  const v = req.validator;
  const lvl = LEVELS.find(l => l.n === v.level) || LEVELS[0];
  const nextLvl = LEVELS.find(l => l.n === v.level + 1) || null;
  const lvlPct = nextLvl ? Math.min(100, Math.round(((v.completed - lvl.min) / (nextLvl.min - lvl.min)) * 100)) : 100;

  const history = db.prepare(`
    SELECT mm.*, t.product, t.type, t.reward FROM v_my_missions mm JOIN vtasks t ON t.id = mm.task_id
    WHERE mm.validator_id = ? AND mm.status IN ('submitted','completed') ORDER BY mm.updated_at DESC LIMIT 10
  `).all(v.id);

  res.json({
    weekEarnings: v.week_earnings, weekTarget: v.week_target, pending: v.pending, available: v.available, lifetime: v.lifetime,
    name: v.name, rating: v.rating, ratingCount: v.rating_count, accuracy: v.accuracy,
    level: v.level, levelName: lvl.name, nextLevelName: nextLvl?.name, toNextLevel: nextLvl ? Math.max(0, nextLvl.min - v.completed) : 0, levelPct: lvlPct,
    specialties: JSON.parse(v.specialties_json || "[]"),
    history: history.map(h => ({
      id: h.id, product: h.product, type: h.type, reward: h.reward,
      status: h.status === "completed" ? "Approved" : "In review",
      quality: h.quality || "—", when: h.status_label,
    })),
  });
});

// POST /api/v/earnings/withdraw { amount }
router.post("/withdraw", (req, res) => {
  const amount = Math.round(Number(req.body?.amount));
  if (!amount || amount <= 0) return res.status(400).json({ error: "amount must be a positive number" });
  if (amount > req.validator.available) return res.status(400).json({ error: "Amount exceeds available balance" });

  db.prepare(`UPDATE validators SET available = available - ? WHERE id = ?`).run(amount, req.validator.id);
  db.prepare(`INSERT INTO v_notifications (validator_id, cat, icon, tone, title, body, time_label, unread) VALUES (?,'reward','coin','amber',?,?, 'Just now', 1)`)
    .run(req.validator.id, "Withdrawal requested", `Your withdrawal of \u20b9${amount.toLocaleString("en-IN")} is being processed and should land within 24h.`);

  const available = db.prepare(`SELECT available FROM validators WHERE id = ?`).get(req.validator.id).available;
  res.json({ available });
});
