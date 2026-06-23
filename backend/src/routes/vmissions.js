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
