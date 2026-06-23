import { Router } from "express";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";

export const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  const rows = await db.prepare(`SELECT * FROM notifications WHERE builder_id = ? ORDER BY id DESC`).all(req.builder.id);
  res.json({ notifications: rows.map(n => ({
    id: n.id, icon: n.icon, tone: n.tone, title: n.title, body: n.body, time: n.time_label, unread: !!n.unread,
  })) });
});

router.post("/read-all", async (req, res) => {
  await db.prepare(`UPDATE notifications SET unread = 0 WHERE builder_id = ?`).run(req.builder.id);
  res.json({ ok: true });
});

router.patch("/:id", async (req, res) => {
  const n = await db.prepare(`SELECT * FROM notifications WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!n) return res.status(404).json({ error: "Not found" });
  await db.prepare(`UPDATE notifications SET unread = 0 WHERE id = ?`).run(n.id);
  res.json({ ok: true });
});
