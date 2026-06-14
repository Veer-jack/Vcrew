import { Router } from "express";
import { db } from "../db.js";
import { hashPassword, createSession, destroySession, authMiddleware } from "../auth.js";

export const router = Router();

function publicBuilder(b) {
  return {
    id: b.id, name: b.name, org: b.org, email: b.email, role: b.role, plan: b.plan,
    color: b.color, balance: b.balance, pending: b.pending, monthSpend: b.month_spend,
  };
}

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  const builder = db.prepare(`SELECT * FROM builders WHERE email = ?`).get(String(email).toLowerCase().trim());
  if (!builder || builder.password_hash !== hashPassword(password)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const token = createSession(builder.id);
  res.json({ token, builder: publicBuilder(builder) });
});

router.post("/logout", authMiddleware, (req, res) => {
  destroySession(req.token);
  res.json({ ok: true });
});

router.get("/me", authMiddleware, (req, res) => {
  res.json({ builder: publicBuilder(req.builder) });
});
