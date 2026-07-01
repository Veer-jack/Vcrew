import { Router } from "express";
import { db } from "../db.js";
import { validatorAuthMiddleware } from "../auth.js";
import { VTYPES } from "../vmeta.js";

export const router = Router();
router.use(validatorAuthMiddleware);

function serializeRow(row) {
  const t = row;
  return {
    id: row.mm_id,
    taskId: row.id,
    type: row.type, product: row.product, tagline: row.tagline, company: row.company,
    reward: row.reward, minutes: row.minutes, match: row.match_pct,
    deadline: row.deadline_label,
    status: row.status, progress: row.progress, quality: row.quality, reason: row.reason,
    statusLabel: row.status_label,
  };
}

// GET /api/v/missions?status=active
router.get("/", async (req, res) => {
  const { status } = req.query;
  let sql = `
    SELECT mm.id as mm_id, mm.status, mm.progress, mm.quality, mm.reason, mm.status_label, mm.score, mm.created_at, mm.updated_at,
           t.* FROM v_my_missions mm JOIN vtasks t ON t.id = mm.task_id
    WHERE mm.validator_id = ?`;
  const params = [req.validator.id];
  if (status) { sql += ` AND mm.status = ?`; params.push(status); }
  sql += ` ORDER BY mm.updated_at DESC`;
  const rows = db.prepare(sql).all(...params);

  const counts = {};
  for (const s of ["applied", "active", "submitted", "completed", "rejected"]) {
    counts[s] = await db.prepare(`SELECT COUNT(*) c FROM v_my_missions WHERE validator_id = ? AND status = ?`).get(req.validator.id, s).c;
  }

  res.json({ missions: rows.map(serializeRow), counts });
});

// GET /api/v/missions/:taskId — workspace context (task + rubric + my mission state)
router.get("/:taskId", async (req, res) => {
  const t = await db.prepare(`SELECT * FROM vtasks WHERE id = ?`).get(req.params.taskId);
  if (!t) return res.status(404).json({ error: "Mission not found" });
  const mm = await db.prepare(`SELECT * FROM v_my_missions WHERE validator_id = ? AND task_id = ?`).get(req.validator.id, t.id);

  res.json({
    task: { id: t.id, type: t.type, product: t.product, tagline: t.tagline, company: t.company, reward: t.reward, minutes: t.minutes, brief: t.brief, steps: JSON.parse(t.steps_json || "[]") },
    rubric: VTYPES[t.type],
    myMission: mm ? {
      status: mm.status, progress: mm.progress, score: mm.score,
      ratings: mm.ratings_json ? JSON.parse(mm.ratings_json) : {},
      flags: mm.flags_json ? JSON.parse(mm.flags_json) : [],
      notes: mm.notes || "",
    } : null,
  });
});

// POST /api/v/missions/:taskId/submit  { ratings, flags, notes, minutes, score }
router.post("/:taskId/submit", async (req, res) => {
  const t = await db.prepare(`SELECT * FROM vtasks WHERE id = ?`).get(req.params.taskId);
  if (!t) return res.status(404).json({ error: "Mission not found" });
  const mm = await db.prepare(`SELECT * FROM v_my_missions WHERE validator_id = ? AND task_id = ?`).get(req.validator.id, t.id);
  if (!mm) return res.status(404).json({ error: "You haven't accepted this mission yet" });

  const { ratings = {}, flags = [], notes = "", minutes = 1, score = 0 } = req.body || {};

  await db.prepare(`
    UPDATE v_my_missions SET status = 'submitted', progress = 100, ratings_json = ?, flags_json = ?, notes = ?,
      minutes_spent = ?, score = ?, status_label = 'Submitted just now', updated_at = NOW()
    WHERE id = ?
  `).run(JSON.stringify(ratings), JSON.stringify(flags), notes, minutes, score, mm.id);

  // reward becomes a pending payout while the builder reviews it
  await db.prepare(`UPDATE validators SET pending = pending + ? WHERE id = ?`).run(t.reward, req.validator.id);

  await db.prepare(`INSERT INTO v_notifications (validator_id, cat, icon, tone, title, body, time_label, unread) VALUES (?,?,?,?,?,?,?,1)`)
    .run(req.validator.id, "application", "clock", "accent", "Submission received", `Your validation for ${t.product} is now in review. \u20b9${t.reward} will clear once approved.`, "Just now");

  const updated = await db.prepare(`
    SELECT mm.id as mm_id, mm.status, mm.progress, mm.quality, mm.reason, mm.status_label, mm.score, t.*
    FROM v_my_missions mm JOIN vtasks t ON t.id = mm.task_id WHERE mm.id = ?
  `).get(mm.id);

  res.json({ mission: serializeRow(updated), score, flags, minutes });
});

// GET /api/v/missions/:id/workspace — get mission with tasks for workspace
router.get("/:id/workspace", async (req, res) => {
  const m = await db.prepare(`
    SELECT m.*, b.name as builder_name, b.org as brand
    FROM missions m
    JOIN builders b ON b.id = m.builder_id
    WHERE m.id = ?
  `).get(req.params.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });

  let tasks = [];
  try { tasks = m.tasks_json ? JSON.parse(m.tasks_json) : []; } catch {}

  res.json({
    mission: { id: m.id, name: m.name, brand: m.brand || m.builder_name, ptype: m.ptype },
    tasks,
  });
});

// PATCH /api/v/missions/:id/workspace/submit — submit workspace responses
router.patch("/:id/workspace/submit", async (req, res) => {
  const { answers } = req.body || {};
  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });

  const existing = await db.prepare(`SELECT id FROM responses WHERE mission_id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);
  if (existing) {
    await db.prepare(`UPDATE responses SET data_json = ?, status = 'pending', submitted_at = NOW() WHERE id = ?`)
      .run(JSON.stringify(answers || {}), existing.id);
  } else {
    await db.prepare(`INSERT INTO responses (mission_id, validator_id, data_json, status, submitted_at) VALUES (?, ?, ?, 'pending', NOW())`)
      .run(req.params.id, req.validator.id, JSON.stringify(answers || {}));
    await db.prepare(`UPDATE missions SET submitted = submitted + 1 WHERE id = ?`).run(req.params.id);
  }

  res.json({ ok: true });
});

// GET /api/v/missions/:id/brief — secure brief delivery
router.get("/:id/brief", async (req, res) => {
  const accepted = await db.prepare(`SELECT * FROM v_my_missions WHERE mission_id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);
  if (!accepted) return res.status(403).json({ error: "Accept this mission first" });

  const m = await db.prepare(`
    SELECT m.*, b.name as builder_name, b.org as brand
    FROM missions m
    JOIN builders b ON b.id = m.builder_id
    WHERE m.id = ?
  `).get(req.params.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });

  let tasks = [];
  try { tasks = m.tasks_json ? JSON.parse(m.tasks_json) : []; } catch {}

  res.json({
    mission: {
      id: m.id, name: m.name, brand: m.brand || m.builder_name,
      description: m.description, ptype: m.ptype,
      brief_url: m.brief_url || null,
      brief_credentials: m.brief_credentials || null,
    },
    tasks: tasks.map(t => ({ id: t.id, title: t.title, severity: t.severity, min_time_seconds: t.min_time_seconds })),
  });
});

// GET /api/v/missions/:id/checkin-status
router.get("/:id/checkin-status", async (req, res) => {
  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });

  const checkins = await db.prepare(`SELECT * FROM checkins WHERE mission_id = ? AND validator_id = ? ORDER BY day_number ASC`).all(req.params.id, req.validator.id).catch(() => []);
  const last = checkins[checkins.length - 1];
  const hoursSinceLast = last ? (Date.now() - new Date(last.submitted_at).getTime()) / 3600000 : 999;
  const locked = hoursSinceLast < 20;

  res.json({
    mission: { name: m.name, brand: m.brand, total_days: m.duration_days || 7, reward_per_day: m.reward_amount || 150 },
    checkins: Array.from({ length: m.duration_days || 7 }).map((_, i) => !!checkins[i]),
    locked,
    hoursUntilNext: locked ? Math.max(0, 20 - hoursSinceLast) : 0,
  });
});

// POST /api/v/missions/:id/checkin
router.post("/:id/checkin", async (req, res) => {
  const { day, answers } = req.body || {};
  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });

  // Time gate — must be 20h since last checkin
  const last = await db.prepare(`SELECT submitted_at FROM checkins WHERE mission_id = ? AND validator_id = ? ORDER BY submitted_at DESC LIMIT 1`).get(req.params.id, req.validator.id).catch(() => null);
  if (last) {
    const hours = (Date.now() - new Date(last.submitted_at).getTime()) / 3600000;
    if (hours < 20) return res.status(400).json({ error: "Too early — come back in " + Math.ceil(20 - hours) + " hours" });
  }

  await db.prepare(`INSERT INTO checkins (mission_id, validator_id, day_number, answers_json, submitted_at) VALUES (?, ?, ?, ?, NOW())`)
    .run(req.params.id, req.validator.id, day || 1, JSON.stringify(answers || {})).catch(async () => {
      // table might not exist yet — create it
      await db.exec(`CREATE TABLE IF NOT EXISTS checkins (id SERIAL PRIMARY KEY, mission_id TEXT, validator_id INTEGER, day_number INTEGER, answers_json TEXT DEFAULT '{}', submitted_at TIMESTAMPTZ DEFAULT NOW())`);
      await db.prepare(`INSERT INTO checkins (mission_id, validator_id, day_number, answers_json, submitted_at) VALUES (?, ?, ?, ?, NOW())`).run(req.params.id, req.validator.id, day || 1, JSON.stringify(answers || {}));
    });

  res.json({ ok: true });
});
