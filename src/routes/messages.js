import { Router } from "express";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";

export const router = Router();
router.use(authMiddleware);

function serializeThread(t, withMessages) {
  const out = {
    id: t.id, name: t.name, role: t.role, mission: t.mission_name, missionId: t.mission_id, time: t.time_label,
  };
  if (withMessages) {
    out.messages = db.prepare(`SELECT * FROM thread_messages WHERE thread_id = ? ORDER BY id ASC`).all(t.id)
      .map(m => ({ from: m.sender, text: m.text, time: m.time_label }));
  } else {
    const last = db.prepare(`SELECT * FROM thread_messages WHERE thread_id = ? ORDER BY id DESC LIMIT 1`).get(t.id);
    out.last = last ? (last.sender === "me" ? `You: ${last.text}` : last.text) : "";
    out.unread = db.prepare(`SELECT COUNT(*) c FROM thread_messages WHERE thread_id = ? AND sender = 'them'`).get(t.id) ? 0 : 0;
  }
  return out;
}

router.get("/threads", (req, res) => {
  const threads = db.prepare(`SELECT * FROM threads WHERE builder_id = ?`).all(req.builder.id);
  res.json({ threads: threads.map(t => serializeThread(t, false)) });
});

router.get("/threads/:id", (req, res) => {
  const t = db.prepare(`SELECT * FROM threads WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!t) return res.status(404).json({ error: "Thread not found" });
  res.json({ thread: serializeThread(t, true) });
});

router.post("/threads/:id/messages", (req, res) => {
  const t = db.prepare(`SELECT * FROM threads WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!t) return res.status(404).json({ error: "Thread not found" });
  const text = (req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "text is required" });

  db.prepare(`INSERT INTO thread_messages (thread_id, sender, text, time_label) VALUES (?, 'me', ?, 'Now')`).run(t.id, text);
  db.prepare(`UPDATE threads SET time_label = 'Now' WHERE id = ?`).run(t.id);

  res.status(201).json({ message: { from: "me", text, time: "Now" } });
});
