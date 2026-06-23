import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";
import { HELP_ARTICLES } from "../meta.js";

export const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  const tickets = await db.prepare(`SELECT * FROM b_tickets WHERE builder_id = ? ORDER BY created_at DESC`).all(req.builder.id);
  res.json({
    helpArticles: HELP_ARTICLES,
    tickets: tickets.map(t => ({ id: t.id, subject: t.subject, cat: t.category, status: t.status, priority: t.priority, updated: t.updated_label, reply: t.reply })),
  });
});

// POST /api/support/tickets { category, subject, details }
router.post("/tickets", async (req, res) => {
  const { category, subject, details } = req.body || {};
  if (!subject || !subject.trim()) return res.status(400).json({ error: "subject is required" });

  const id = "TKT-" + randomUUID().slice(0, 4).toUpperCase();
  await db.prepare(`INSERT INTO b_tickets (builder_id, subject, body, status, priority) VALUES (?,?,?, 'open', 'normal')`)
    .run(req.builder.id, subject.trim(), details || "");

  res.status(201).json({ ticket: { id, subject: subject.trim(), cat: category || "Other", status: "open", priority: "normal", updated: "Just now" } });
});
