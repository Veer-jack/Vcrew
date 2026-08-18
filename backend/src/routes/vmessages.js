import { Router } from "express";
import { db } from "../db.js";
import { validatorAuthMiddleware } from "../auth.js";
import { notifyBuilderNewMessage } from "../notificationsHelper.js";
import { upload } from "../upload.js";
import { translateBatch } from "../translate.js";

export const router = Router();
router.use(validatorAuthMiddleware);

// Basic helper to convert timestamps to relative time labels
function timeAgo(dateStr) {
  if (!dateStr) return "Just now";
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

async function serializeThread(t, withMessages, lang) {
  const tTime = t.created_at ? timeAgo(t.created_at) : "Just now";
  const out = { id: t.id, name: t.name || "Builder", role: t.role || "Builder", mission: t.mission, time: tTime };

  const msgs = await db.prepare(`SELECT * FROM thread_messages WHERE thread_id = ? ORDER BY id ASC`).all(t.id);
  const doTranslate = lang && lang !== "en" && msgs.length;
  const translated = doTranslate
    ? await translateBatch(msgs.filter(m => m.body).map(m => ({ entityType: "thread_message", entityId: m.id, field: "body", text: m.body })), lang)
    : null;
  const bodyOf = (m) => (translated ? translated.get(`thread_message:${m.id}:body`) ?? m.body : m.body);

  if (withMessages) {
    out.messages = msgs.map(m => ({
      from: m.sender_role === 'validator' ? 'me' : 'them',
      text: bodyOf(m),
      attachment: m.attachment_path ? { url: `/api/uploads/${m.attachment_path}`, name: m.attachment_name } : null,
      time: m.created_at ? timeAgo(m.created_at) : "Just now",
    }));
  } else {
    const last = msgs[msgs.length - 1];
    const lastText = last ? (bodyOf(last) || (last.attachment_path ? `📎 ${last.attachment_name}` : "")) : "";
    out.last = last ? (last.sender_role === "validator" ? `You: ${lastText}` : lastText) : "";
  }
  return out;
}

router.get("/threads", async (req, res) => {
  const threads = await db.prepare(`
    SELECT t.*, b.org as name, 'Builder' as role, m.name as mission 
    FROM threads t 
    JOIN builders b ON t.builder_id = b.id 
    LEFT JOIN missions m ON t.mission_id = m.id 
    WHERE t.validator_id = ?
    ORDER BY t.created_at DESC
  `).all(req.validator.id);
  res.json({ threads: await Promise.all(threads.map(t => serializeThread(t, false, req.validator.preferred_language))) });
});

router.get("/threads/:id", async (req, res) => {
  const t = await db.prepare(`
    SELECT t.*, b.org as name, 'Builder' as role, m.name as mission 
    FROM threads t 
    JOIN builders b ON t.builder_id = b.id 
    LEFT JOIN missions m ON t.mission_id = m.id 
    WHERE t.id = ? AND t.validator_id = ?
  `).get(req.params.id, req.validator.id);
  
  if (!t) return res.status(404).json({ error: "Thread not found" });
  res.json({ thread: await serializeThread(t, true, req.validator.preferred_language) });
});

router.post("/threads/:id/messages", async (req, res) => {
  const t = await db.prepare(`SELECT * FROM threads WHERE id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);
  if (!t) return res.status(404).json({ error: "Thread not found" });
  const text = (req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "text is required" });

  await db.prepare(`INSERT INTO thread_messages (thread_id, sender_role, sender_id, body) VALUES (?, 'validator', ?, ?)`).run(t.id, req.validator.id, text);
  await db.prepare(`UPDATE threads SET created_at = NOW() WHERE id = ?`).run(t.id);

  // Notify the Builder
  setImmediate(() => notifyBuilderNewMessage(t.builder_id, req.validator.name, t.id));
  
  res.status(201).json({ message: { from: "me", text, time: "Just now" } });
});

router.post("/threads/:id/attachment", upload.single("file"), async (req, res) => {
  const t = await db.prepare(`SELECT * FROM threads WHERE id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);
  if (!t) return res.status(404).json({ error: "Thread not found" });
  if (!req.file) return res.status(400).json({ error: "file is required" });

  await db.prepare(`INSERT INTO thread_messages (thread_id, sender_role, sender_id, attachment_path, attachment_name) VALUES (?, 'validator', ?, ?, ?)`)
    .run(t.id, req.validator.id, req.file.filename, req.file.originalname);
  await db.prepare(`UPDATE threads SET created_at = NOW() WHERE id = ?`).run(t.id);

  setImmediate(() => notifyBuilderNewMessage(t.builder_id, req.validator.name, t.id));

  res.status(201).json({ message: { from: "me", attachment: { url: `/api/uploads/${req.file.filename}`, name: req.file.originalname }, time: "Just now" } });
});
