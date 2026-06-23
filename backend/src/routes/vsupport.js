import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { validatorAuthMiddleware } from "../auth.js";
import { HELP_ARTICLES } from "../vmeta.js";

export const router = Router();
router.use(validatorAuthMiddleware);

router.get("/", async (req, res) => {
  const tickets = await db.prepare(`SELECT * FROM v_tickets WHERE validator_id = ? ORDER BY created_at DESC`).all(req.validator.id);
  res.json({
    helpArticles: HELP_ARTICLES,
    tickets: tickets.map(t => ({ id: t.id, subject: t.subject, cat: t.category, status: t.status, priority: t.priority, updated: t.updated_label, reply: t.reply })),
  });
});

// POST /api/v/support/tickets  { category, subject, details }
router.post("/tickets", async (req, res) => {
  const { category, subject, details } = req.body || {};
  if (!subject || !subject.trim()) return res.status(400).json({ error: "subject is required" });

  const id = "TKT-" + randomUUID().slice(0, 4).toUpperCase();
  await db.prepare(`INSERT INTO v_tickets (id, validator_id, subject, category, details, status, priority, updated_label) VALUES (?,?,?,?,?, 'open', 'normal', 'Just now')`)
    .run(id, req.validator.id, subject.trim(), category || "Other", details || "");

  res.status(201).json({ ticket: { id, subject: subject.trim(), cat: category || "Other", status: "open", priority: "normal", updated: "Just now" } });
});
