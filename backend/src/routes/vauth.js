import { Router } from "express";
import { db } from "../db.js";
import { hashPassword, createValidatorSession, destroyValidatorSession, validatorAuthMiddleware } from "../auth.js";
import { LEVELS } from "../vmeta.js";

export const router = Router();

function publicValidator(v) {
  const lvl = LEVELS.find(l => l.n === v.level) || LEVELS[0];
  return {
    id: v.id, name: v.name, handle: v.handle, email: v.email,
    level: v.level, levelName: lvl.name,
    rating: v.rating, ratingCount: v.rating_count, accuracy: v.accuracy, streak: v.streak,
    specialties: JSON.parse(v.specialties_json || "[]"),
    weekEarnings: v.week_earnings, weekTarget: v.week_target,
    pending: v.pending, available: v.available, lifetime: v.lifetime,
    completed: v.completed, acceptRate: v.accept_rate,
  };
}

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  const v = db.prepare(`SELECT * FROM validators WHERE email = ?`).get(String(email).toLowerCase().trim());
  if (!v || v.password_hash !== hashPassword(password)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const token = createValidatorSession(v.id);
  res.json({ token, validator: publicValidator(v) });
});

router.post("/logout", validatorAuthMiddleware, (req, res) => {
  destroyValidatorSession(req.token);
  res.json({ ok: true });
});

router.get("/me", validatorAuthMiddleware, (req, res) => {
  res.json({ validator: publicValidator(req.validator) });
});

export { publicValidator };
