import { Router } from "express";
import { db } from "../db.js";
import { validatorAuthMiddleware, flagFraud } from "../auth.js";
import { VTYPES, TYPE_ORDER, deadlineHours } from "../vmeta.js";

export const router = Router();
router.use(validatorAuthMiddleware);

async function serializeTask(t, savedIds, myStatus) {
  return {
    id: t.id, type: t.type, product: t.product, tagline: t.tagline, company: t.company,
    reward: t.reward, minutes: t.minutes, match: t.match_pct, spotsLeft: t.spots_left, spotsTotal: t.spots_total,
    deadline: t.deadline_label, postedH: t.posted_h, brief: t.brief, steps: JSON.parse(t.steps_json || "[]"),
    hot: !!t.hot, verified: !!t.verified, featured: !!t.featured,
    saved: savedIds.has(t.id),
    myStatus: myStatus[t.id] || null,
  };
}

async function loadContext(validatorId) {
  const savedRows = await db.prepare(`SELECT task_id FROM v_saved WHERE validator_id = ?`).all(validatorId);
  const savedIds = new Set(savedRows.map(r => r.task_id));
  const myRows = await db.prepare(`SELECT task_id, status FROM v_my_missions WHERE validator_id = ?`).all(validatorId);
  const myStatus = Object.fromEntries(myRows.map(r => [r.task_id, r.status]));
  return { savedIds, myStatus };
}

// GET /api/v/marketplace?q=&types=ai,mvp&reward=mid&time=lt10&verified=true&minMatch=80&sort=match
router.get("/", async (req, res) => {
  const { q, types, reward, time, verified, minMatch, sort } = req.query;
  let rows = await db.prepare(`SELECT * FROM vtasks`).all();
  const { savedIds, myStatus } = loadContext(req.validator.id);

  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter(t => (t.product + t.tagline + t.company + t.brief).toLowerCase().includes(needle));
  }
  if (types) {
    const typeSet = new Set(String(types).split(",").filter(Boolean));
    if (typeSet.size) rows = rows.filter(t => typeSet.has(t.type));
  }
  const REWARD_TESTS = { lt100: r => r < 100, mid: r => r >= 100 && r <= 200, gt200: r => r > 200 };
  if (reward && REWARD_TESTS[reward]) rows = rows.filter(t => REWARD_TESTS[reward](t.reward));
  const TIME_TESTS = { lt10: m => m < 10, mid: m => m >= 10 && m <= 20, gt20: m => m > 20 };
  if (time && TIME_TESTS[time]) rows = rows.filter(t => TIME_TESTS[time](t.minutes));
  if (verified === "true") rows = rows.filter(t => t.verified);
  if (minMatch) rows = rows.filter(t => t.match_pct >= Number(minMatch));

  const tasks = rows.map(t => serializeTask(t, savedIds, myStatus));
  const cmp = {
    match: (a, b) => b.match - a.match,
    reward: (a, b) => b.reward - a.reward,
    closing: (a, b) => deadlineHours(a.deadline) - deadlineHours(b.deadline),
    newest: (a, b) => a.postedH - b.postedH,
  }[sort] || ((a, b) => b.match - a.match);
  tasks.sort(cmp);

  const allTasks = await db.prepare(`SELECT * FROM vtasks`).all().map(t => serializeTask(t, savedIds, myStatus));
  const categories = TYPE_ORDER.map(k => ({
    key: k, label: VTYPES[k].label, blurb: VTYPES[k].blurb,
    count: allTasks.filter(t => t.type === k).length,
  }));
  const featured = allTasks.find(t => t.featured) || null;

  res.json({ tasks, total: allTasks.length, categories, featured });
});

// GET /api/v/marketplace/:id
router.get("/:id", async (req, res) => {
  const t = await db.prepare(`SELECT * FROM vtasks WHERE id = ?`).get(req.params.id);
  if (!t) return res.status(404).json({ error: "Mission not found" });
  const { savedIds, myStatus } = loadContext(req.validator.id);
  res.json({ task: serializeTask(t, savedIds, myStatus), rubric: VTYPES[t.type] });
});

// POST /api/v/marketplace/:id/save  { saved: true|false }
router.post("/:id/save", async (req, res) => {
  const t = await db.prepare(`SELECT id FROM vtasks WHERE id = ?`).get(req.params.id);
  if (!t) return res.status(404).json({ error: "Mission not found" });
  const saved = !!req.body?.saved;
  if (saved) {
    await db.prepare(`INSERT OR IGNORE INTO v_saved (validator_id, task_id) VALUES (?, ?)`).run(req.validator.id, t.id);
  } else {
    await db.prepare(`DELETE FROM v_saved WHERE validator_id = ? AND task_id = ?`).run(req.validator.id, t.id);
  }
  res.json({ ok: true, saved });
});

// POST /api/v/marketplace/:id/apply — apply & immediately start (matches "Apply -> Accepted -> Start now" flow)
router.post("/:id/apply", async (req, res) => {
  const t = await db.prepare(`SELECT * FROM vtasks WHERE id = ?`).get(req.params.id);
  if (!t) return res.status(404).json({ error: "Mission not found" });

  const existing = await db.prepare(`SELECT * FROM v_my_missions WHERE validator_id = ? AND task_id = ?`).get(req.validator.id, t.id);
  if (existing) return res.json({ myMission: existing });

  await db.prepare(`INSERT INTO v_my_missions (validator_id, task_id, status, progress, status_label) VALUES (?, ?, 'active', 0, 'Accepted just now')`)
    .run(req.validator.id, t.id);

  // Velocity check: flag if this validator has applied to an unusually high number of missions today
  const dailyCount = db.prepare(
    `SELECT COUNT(*) AS n FROM v_my_missions WHERE validator_id = ? AND created_at > NOW() - INTERVAL '24 hours'`
  ).get(req.validator.id)?.n || 0;
  if (dailyCount > 15) {
    flagFraud("high_velocity_applications", "validator", req.validator.id,
      `${dailyCount} mission applications in the last 24 hours`, "medium");
  }

  const myMission = await db.prepare(`SELECT * FROM v_my_missions WHERE validator_id = ? AND task_id = ?`).get(req.validator.id, t.id);
  res.status(201).json({ myMission });
});

// POST /api/v/marketplace/:id/report — validator reports a mission for review
// This feeds the admin's Mission Review queue without pre-blocking the mission.
router.post("/:id/report", async (req, res) => {
  const { reason } = req.body || {};
  if (!reason || !String(reason).trim()) return res.status(400).json({ error: "A reason is required to report a mission" });

  const mission = await db.prepare(`SELECT id, name, flagged FROM missions WHERE id = ?`).get(req.params.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });

  // Flag the mission for admin review; if already flagged, append the new reason
  const existingReason = mission.flagged
    ? `${mission.flag_reason || ""}\nValidator report: ${String(reason).trim()}`
    : `Validator report: ${String(reason).trim()}`;

  await db.prepare(`UPDATE missions SET flagged = 1, flag_reason = ?, flagged_at = NOW() WHERE id = ?`)
    .run(existingReason.trim(), mission.id);

  res.json({ ok: true });
});
