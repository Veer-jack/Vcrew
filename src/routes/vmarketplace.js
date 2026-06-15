import { Router } from "express";
import { db } from "../db.js";
import { validatorAuthMiddleware } from "../auth.js";
import { VTYPES, TYPE_ORDER, deadlineHours } from "../vmeta.js";

export const router = Router();
router.use(validatorAuthMiddleware);

function serializeTask(t, savedIds, myStatus) {
  return {
    id: t.id, type: t.type, product: t.product, tagline: t.tagline, company: t.company,
    reward: t.reward, minutes: t.minutes, match: t.match_pct, spotsLeft: t.spots_left, spotsTotal: t.spots_total,
    deadline: t.deadline_label, postedH: t.posted_h, brief: t.brief, steps: JSON.parse(t.steps_json || "[]"),
    hot: !!t.hot, verified: !!t.verified, featured: !!t.featured,
    saved: savedIds.has(t.id),
    myStatus: myStatus[t.id] || null,
  };
}

function loadContext(validatorId) {
  const savedRows = db.prepare(`SELECT task_id FROM v_saved WHERE validator_id = ?`).all(validatorId);
  const savedIds = new Set(savedRows.map(r => r.task_id));
  const myRows = db.prepare(`SELECT task_id, status FROM v_my_missions WHERE validator_id = ?`).all(validatorId);
  const myStatus = Object.fromEntries(myRows.map(r => [r.task_id, r.status]));
  return { savedIds, myStatus };
}

// GET /api/v/marketplace?q=&types=ai,mvp&reward=mid&time=lt10&verified=true&minMatch=80&sort=match
router.get("/", (req, res) => {
  const { q, types, reward, time, verified, minMatch, sort } = req.query;
  let rows = db.prepare(`SELECT * FROM vtasks`).all();
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

  const allTasks = db.prepare(`SELECT * FROM vtasks`).all().map(t => serializeTask(t, savedIds, myStatus));
  const categories = TYPE_ORDER.map(k => ({
    key: k, label: VTYPES[k].label, blurb: VTYPES[k].blurb,
    count: allTasks.filter(t => t.type === k).length,
  }));
  const featured = allTasks.find(t => t.featured) || null;

  res.json({ tasks, total: allTasks.length, categories, featured });
});

// GET /api/v/marketplace/:id
router.get("/:id", (req, res) => {
  const t = db.prepare(`SELECT * FROM vtasks WHERE id = ?`).get(req.params.id);
  if (!t) return res.status(404).json({ error: "Mission not found" });
  const { savedIds, myStatus } = loadContext(req.validator.id);
  res.json({ task: serializeTask(t, savedIds, myStatus), rubric: VTYPES[t.type] });
});

// POST /api/v/marketplace/:id/save  { saved: true|false }
router.post("/:id/save", (req, res) => {
  const t = db.prepare(`SELECT id FROM vtasks WHERE id = ?`).get(req.params.id);
  if (!t) return res.status(404).json({ error: "Mission not found" });
  const saved = !!req.body?.saved;
  if (saved) {
    db.prepare(`INSERT OR IGNORE INTO v_saved (validator_id, task_id) VALUES (?, ?)`).run(req.validator.id, t.id);
  } else {
    db.prepare(`DELETE FROM v_saved WHERE validator_id = ? AND task_id = ?`).run(req.validator.id, t.id);
  }
  res.json({ ok: true, saved });
});

// POST /api/v/marketplace/:id/apply — apply & immediately start (matches "Apply -> Accepted -> Start now" flow)
router.post("/:id/apply", (req, res) => {
  const t = db.prepare(`SELECT * FROM vtasks WHERE id = ?`).get(req.params.id);
  if (!t) return res.status(404).json({ error: "Mission not found" });

  const existing = db.prepare(`SELECT * FROM v_my_missions WHERE validator_id = ? AND task_id = ?`).get(req.validator.id, t.id);
  if (existing) return res.json({ myMission: existing });

  db.prepare(`INSERT INTO v_my_missions (validator_id, task_id, status, progress, status_label) VALUES (?, ?, 'active', 0, 'Accepted just now')`)
    .run(req.validator.id, t.id);
  const myMission = db.prepare(`SELECT * FROM v_my_missions WHERE validator_id = ? AND task_id = ?`).get(req.validator.id, t.id);
  res.status(201).json({ myMission });
});
