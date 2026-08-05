import { Router } from "express";
import { db } from "../db.js";
import { validatorAuthMiddleware } from "../auth.js";

export const router = Router();
router.use(validatorAuthMiddleware);

router.get("/", async (req, res) => {
  const rows = await db.prepare(`SELECT * FROM v_notifications WHERE validator_id = ? ORDER BY id DESC`).all(req.validator.id);
  res.json({ notifications: rows.map(n => ({
    id: n.id, cat: n.cat, type: n.type, icon: n.icon, tone: n.tone, title: n.title, body: n.body, time: n.time_label, unread: !!n.unread, createdAt: n.created_at, target_id: n.target_id
  })) });
});

router.post("/read-all", async (req, res) => {
  await db.prepare(`UPDATE v_notifications SET unread = 0 WHERE validator_id = ?`).run(req.validator.id);
  res.json({ ok: true });
});

router.post("/clear-all", async (req, res) => {
  await db.prepare(`DELETE FROM v_notifications WHERE validator_id = ?`).run(req.validator.id);
  res.json({ ok: true });
});

router.patch("/:id", async (req, res) => {
  const n = await db.prepare(`SELECT * FROM v_notifications WHERE id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);
  if (!n) return res.status(404).json({ error: "Not found" });
  await db.prepare(`UPDATE v_notifications SET unread = 0 WHERE id = ?`).run(n.id);
  res.json({ ok: true });
});
