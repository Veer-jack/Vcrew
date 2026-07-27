import { Router } from "express";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";
import { notifyNewMessage } from "../notificationsHelper.js";
import { upload } from "../upload.js";

export const router = Router();
router.use(authMiddleware);

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

async function serializeThread(t, withMessages) {
  const tTime = t.created_at ? timeAgo(t.created_at) : "Just now";
  const out = {
    id: t.id, name: t.name || "Validator", role: t.role || "User", mission: t.mission_name, missionId: t.mission_id, time: tTime,
  };
  
  const msgs = await db.prepare(`SELECT * FROM thread_messages WHERE thread_id = ? ORDER BY id ASC`).all(t.id);
  if (withMessages) {
    out.messages = msgs.map(m => ({
      from: m.sender_role === 'builder' ? 'me' : 'them',
      text: m.body,
      attachment: m.attachment_path ? { url: `/api/uploads/${m.attachment_path}`, name: m.attachment_name } : null,
      time: m.created_at ? timeAgo(m.created_at) : "Just now",
    }));
  } else {
    const last = msgs[msgs.length - 1];
    const lastText = last ? (last.body || (last.attachment_path ? `📎 ${last.attachment_name}` : "")) : "";
    out.last = last ? (last.sender_role === "builder" ? `You: ${lastText}` : lastText) : "";
    out.unread = last && last.sender_role === "validator" ? 1 : 0;
  }
  return out;
}

router.get("/threads", async (req, res) => {
  const threads = await db.prepare(`
    SELECT t.*, v.name, v.role, m.name as mission_name 
    FROM threads t 
    JOIN validators v ON t.validator_id = v.id 
    LEFT JOIN missions m ON t.mission_id = m.id 
    WHERE t.builder_id = ?
    ORDER BY t.created_at DESC
  `).all(req.builder.id);
  res.json({ threads: await Promise.all(threads.map(t => serializeThread(t, false))) });
});

// POST /threads { validatorId, missionId } — find or create a thread with this
// validator for this mission, so "Reply" on a submission always has somewhere to go.
router.post("/threads", async (req, res) => {
  const { validatorId, missionId } = req.body || {};
  if (!validatorId || !missionId) return res.status(400).json({ error: "validatorId and missionId are required" });

  const validator = await db.prepare(`SELECT id FROM validators WHERE id = ?`).get(validatorId);
  if (!validator) return res.status(404).json({ error: "Validator not found" });

  let t = await db.prepare(`SELECT id FROM threads WHERE builder_id = ? AND validator_id = ? AND mission_id = ?`).get(req.builder.id, validatorId, missionId);
  if (!t) {
    const mission = await db.prepare(`SELECT name FROM missions WHERE id = ?`).get(missionId);
    const ins = await db.prepare(`INSERT INTO threads (builder_id, validator_id, mission_id, subject) VALUES (?, ?, ?, ?)`).run(req.builder.id, validatorId, missionId, mission?.name || null);
    t = { id: ins.lastInsertRowid };
  }
  res.json({ threadId: t.id });
});

router.get("/threads/:id", async (req, res) => {
  const t = await db.prepare(`
    SELECT t.*, v.name, v.role, m.name as mission_name 
    FROM threads t 
    JOIN validators v ON t.validator_id = v.id 
    LEFT JOIN missions m ON t.mission_id = m.id 
    WHERE t.id = ? AND t.builder_id = ?
  `).get(req.params.id, req.builder.id);
  
  if (!t) return res.status(404).json({ error: "Thread not found" });
  res.json({ thread: await serializeThread(t, true) });
});

router.post("/threads/:id/messages", async (req, res) => {
  const t = await db.prepare(`SELECT * FROM threads WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!t) return res.status(404).json({ error: "Thread not found" });
  const text = (req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "text is required" });

  await db.prepare(`INSERT INTO thread_messages (thread_id, sender_role, sender_id, body) VALUES (?, 'builder', ?, ?)`).run(t.id, req.builder.id, text);
  await db.prepare(`UPDATE threads SET created_at = NOW() WHERE id = ?`).run(t.id);
  
  // Bridge: Trigger notification to the validator
  if (t.validator_id) {
    setImmediate(() => notifyNewMessage(t.validator_id, req.builder.name));
  }

  res.status(201).json({ message: { from: "me", text, time: "Just now" } });
});

router.post("/threads/:id/attachment", upload.single("file"), async (req, res) => {
  const t = await db.prepare(`SELECT * FROM threads WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!t) return res.status(404).json({ error: "Thread not found" });
  if (!req.file) return res.status(400).json({ error: "file is required" });

  await db.prepare(`INSERT INTO thread_messages (thread_id, sender_role, sender_id, attachment_path, attachment_name) VALUES (?, 'builder', ?, ?, ?)`)
    .run(t.id, req.builder.id, req.file.filename, req.file.originalname);
  await db.prepare(`UPDATE threads SET created_at = NOW() WHERE id = ?`).run(t.id);

  if (t.validator_id) {
    setImmediate(() => notifyNewMessage(t.validator_id, req.builder.name));
  }

  res.status(201).json({ message: { from: "me", attachment: { url: `/api/uploads/${req.file.filename}`, name: req.file.originalname }, time: "Just now" } });
});
