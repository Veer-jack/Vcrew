import { Router } from "express";
import { db } from "../db.js";
import { validatorAuthMiddleware } from "../auth.js";

export const router = Router();
router.use(validatorAuthMiddleware);

async function serializeThread(t, withMessages) {
  const out = { id: t.id, name: t.name, role: t.role, mission: t.mission, time: t.time_label };
  const msgs = await db.prepare(`SELECT * FROM v_thread_messages WHERE thread_id = ? ORDER BY id ASC`).all(t.id);
  if (withMessages) {
    out.messages = msgs.map(m => ({ from: m.sender, text: m.text, time: m.time_label }));
  } else {
    const last = msgs[msgs.length - 1];
    out.last = last ? (last.sender === "me" ? `You: ${last.text}` : last.text) : "";
  }
  return out;
}

router.get("/threads", async (req, res) => {
  const threads = await db.prepare(`SELECT * FROM v_threads WHERE validator_id = ?`).all(req.validator.id);
  res.json({ threads: threads.map(t => serializeThread(t, false)) });
});

router.get("/threads/:id", async (req, res) => {
  const t = await db.prepare(`SELECT * FROM v_threads WHERE id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);
  if (!t) return res.status(404).json({ error: "Thread not found" });
  res.json({ thread: serializeThread(t, true) });
});

router.post("/threads/:id/messages", async (req, res) => {
  const t = await db.prepare(`SELECT * FROM v_threads WHERE id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);
  if (!t) return res.status(404).json({ error: "Thread not found" });
  const text = (req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "text is required" });

  await db.prepare(`INSERT INTO v_thread_messages (thread_id, sender, text, time_label) VALUES (?, 'me', ?, 'Now')`).run(t.id, text);
  await db.prepare(`UPDATE v_threads SET time_label = 'Now' WHERE id = ?`).run(t.id);

  res.status(201).json({ message: { from: "me", text, time: "Now" } });
});
