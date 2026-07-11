import { Router } from "express";
import { db } from "../db.js";
import { validatorAuthMiddleware, flagFraud } from "../auth.js";
import { VTYPES, TYPE_ORDER, deadlineHours } from "../vmeta.js";

export const router = Router();
router.use(validatorAuthMiddleware);

async function serializeTask(t, savedIds, myStatus) {
  // If it's a real mission (has 'builder_id'), map it to the expected vtasks format
  if (t.builder_id) {
    return {
      id: t.id, 
      type: VTYPES[t.ptype] ? t.ptype : "mvp", 
      product: t.name, 
      tagline: t.description ? t.description.slice(0, 100) : "", 
      company: t.brand || "Independent",
      reward: t.reward_amount || 0, 
      minutes: 10, 
      match: 90, 
      spotsLeft: Math.max(0, (t.target || 0) - (t.joined || 0)), 
      spotsTotal: t.target || 0,
      deadline: t.deadline || "Soon", 
      postedH: Math.floor((Date.now() - new Date(t.created_at).getTime()) / 3600000) || 24, 
      brief: t.description || "", 
      steps: JSON.parse(t.tasks_json || "[]").map(s => typeof s === 'string' ? s : (s.title || s.description || 'Task')),
      hot: ((t.joined || 0) > ((t.target || 1) / 2)), 
      verified: true, 
      featured: false,
      saved: savedIds.has(t.id),
      myStatus: myStatus[t.id] || null,
    };
  }

  // Otherwise, it's a dummy vtasks row
  return {
    id: t.id, type: t.type, product: t.product, tagline: t.tagline, company: t.company,
    reward: t.reward, minutes: t.minutes, match: t.match_pct, spotsLeft: t.spots_left, spotsTotal: t.spots_total,
    deadline: t.deadline_label, postedH: t.posted_h, brief: t.brief, steps: JSON.parse(t.steps_json || "[]").map(s => typeof s === 'string' ? s : (s.title || s.description || 'Task')),
    hot: !!t.hot, verified: !!t.verified, featured: !!t.featured,
    saved: savedIds.has(t.id),
    myStatus: myStatus[t.id] || null,
  };
}

async function loadContext(validatorId) {
  const savedRows = await db.prepare(`SELECT task_id FROM v_saved WHERE validator_id = ?`).all(validatorId);
  const savedIds = new Set(savedRows.map(r => r.task_id));
  
  // Load my_missions (both task_id and mission_id mapping)
  const myRows = await db.prepare(`SELECT task_id, mission_id, status FROM v_my_missions WHERE validator_id = ?`).all(validatorId);
  const myStatus = Object.fromEntries(myRows.map(r => [r.mission_id || r.task_id, r.status]));
  return { savedIds, myStatus };
}

// GET /api/v/marketplace?q=&types=ai,mvp&reward=mid&time=lt10&verified=true&minMatch=80&sort=match
router.get("/", async (req, res) => {
  const { q, types, reward, time, verified, minMatch, sort } = req.query;
  
  // Combine real missions and dummy vtasks
  const realMissions = await db.prepare(`SELECT * FROM missions WHERE status = 'active' OR status = 'live' OR status = 'published'`).all();
  const dummyTasks = await db.prepare(`SELECT * FROM vtasks`).all();
  let rows = [...realMissions, ...dummyTasks];
  
  const { savedIds, myStatus } = await loadContext(req.validator.id);

  let tasks = await Promise.all(rows.map(t => serializeTask(t, savedIds, myStatus)));

  if (q) {
    const needle = q.toLowerCase();
    tasks = tasks.filter(t => (t.product + t.tagline + t.company + t.brief).toLowerCase().includes(needle));
  }
  if (types) {
    const typeSet = new Set(String(types).split(",").filter(Boolean));
    if (typeSet.size) tasks = tasks.filter(t => typeSet.has(t.type));
  }
  const REWARD_TESTS = { lt100: r => r < 100, mid: r => r >= 100 && r <= 200, gt200: r => r > 200 };
  if (reward && REWARD_TESTS[reward]) tasks = tasks.filter(t => REWARD_TESTS[reward](t.reward));
  const TIME_TESTS = { lt10: m => m < 10, mid: m => m >= 10 && m <= 20, gt20: m => m > 20 };
  if (time && TIME_TESTS[time]) tasks = tasks.filter(t => TIME_TESTS[time](t.minutes));
  if (verified === "true") tasks = tasks.filter(t => t.verified);
  if (minMatch) tasks = tasks.filter(t => t.match >= Number(minMatch));

  const cmp = {
    match: (a, b) => b.match - a.match,
    reward: (a, b) => b.reward - a.reward,
    closing: (a, b) => deadlineHours(a.deadline) - deadlineHours(b.deadline),
    newest: (a, b) => a.postedH - b.postedH,
  }[sort] || ((a, b) => b.match - a.match);
  tasks.sort(cmp);

  const allTasks = await Promise.all([...realMissions, ...dummyTasks].map(t => serializeTask(t, savedIds, myStatus)));
  const categories = TYPE_ORDER.map(k => ({
    key: k, label: VTYPES[k].label, blurb: VTYPES[k].blurb,
    count: allTasks.filter(t => t.type === k).length,
  }));
  const featured = allTasks.find(t => t.featured) || null;

  res.json({ tasks, total: allTasks.length, categories, featured });
});

// GET /api/v/marketplace/:id
router.get("/:id", async (req, res) => {
  let t = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  if (!t) {
    t = await db.prepare(`SELECT * FROM vtasks WHERE id = ?`).get(req.params.id);
  }
  if (!t) return res.status(404).json({ error: "Mission not found" });
  
  const { savedIds, myStatus } = await loadContext(req.validator.id);
  const serialized = await serializeTask(t, savedIds, myStatus);
  res.json({ task: serialized, rubric: VTYPES[serialized.type] });
});

// POST /api/v/marketplace/:id/save  { saved: true|false }
router.post("/:id/save", async (req, res) => {
  let t = await db.prepare(`SELECT id FROM missions WHERE id = ?`).get(req.params.id);
  if (!t) {
    t = await db.prepare(`SELECT id FROM vtasks WHERE id = ?`).get(req.params.id);
  }
  if (!t) return res.status(404).json({ error: "Mission not found" });
  
  const saved = !!req.body?.saved;
  if (saved) {
    try {
      await db.prepare(`INSERT INTO v_saved (validator_id, task_id) VALUES (?, ?) ON CONFLICT DO NOTHING`).run(req.validator.id, t.id);
    } catch(e) {
      // Ignored for real missions due to vtasks FK constraint, unless dropped
    }
  } else {
    await db.prepare(`DELETE FROM v_saved WHERE validator_id = ? AND task_id = ?`).run(req.validator.id, t.id);
  }
  res.json({ ok: true, saved });
});

// POST /api/v/marketplace/:id/apply — apply & immediately start (matches "Apply -> Accepted -> Start now" flow)
router.post("/:id/apply", async (req, res) => {
  let t = await db.prepare(`SELECT id, builder_id FROM missions WHERE id = ?`).get(req.params.id);
  let isRealMission = !!t;
  if (!t) {
    t = await db.prepare(`SELECT id FROM vtasks WHERE id = ?`).get(req.params.id);
  }
  if (!t) return res.status(404).json({ error: "Mission not found" });

  let existing;
  if (isRealMission) {
    existing = await db.prepare(`SELECT * FROM v_my_missions WHERE validator_id = ? AND mission_id = ?`).get(req.validator.id, t.id);
  } else {
    existing = await db.prepare(`SELECT * FROM v_my_missions WHERE validator_id = ? AND task_id = ?`).get(req.validator.id, t.id);
  }
  
  if (existing) return res.json({ myMission: existing });

  if (isRealMission) {
    // Atomic check and increment for capacity. target = 0 means unlimited.
    const updateRes = await db.prepare(`UPDATE missions SET joined = joined + 1 WHERE id = ? AND (target = 0 OR joined < target)`).run(t.id);
    if (updateRes.rowCount === 0) {
      return res.status(400).json({ error: "Mission has reached its maximum capacity and is no longer available" });
    }

    try {
      // If two requests pass the 'existing' check, we rely on a manual check right before inserting
      // to avoid constraint violations if DB doesn't have them. But to be safe we'll re-check existing inside
      const doubleCheck = await db.prepare(`SELECT id FROM v_my_missions WHERE validator_id = ? AND mission_id = ?`).get(req.validator.id, t.id);
      if (doubleCheck) throw new Error("Duplicate");

      await db.prepare(`INSERT INTO v_my_missions (validator_id, mission_id, status, progress, status_label) VALUES (?, ?, 'active', 0, 'Accepted just now')`)
        .run(req.validator.id, t.id);
      
      const val = await db.prepare(`SELECT name FROM validators WHERE id = ?`).get(req.validator.id);
      await db.prepare(`INSERT INTO participants (mission_id, validator_id, name, role, city, stage, reward, trust) VALUES (?, ?, ?, 'Validator', 'Unknown', 'accepted', 0, 95)`)
        .run(t.id, req.validator.id, val ? val.name : "New Validator");
    } catch (err) {
      // Revert the increment if the insertion failed for any reason (duplicate/race condition)
      await db.prepare(`UPDATE missions SET joined = joined - 1 WHERE id = ?`).run(t.id);
      return res.status(400).json({ error: "You have already accepted this mission" });
    }
  } else {
    const doubleCheck = await db.prepare(`SELECT id FROM v_my_missions WHERE validator_id = ? AND task_id = ?`).get(req.validator.id, t.id);
    if (!doubleCheck) {
      await db.prepare(`INSERT INTO v_my_missions (validator_id, task_id, status, progress, status_label) VALUES (?, ?, 'active', 0, 'Accepted just now')`)
        .run(req.validator.id, t.id);
    }
  }

  // Velocity check
  const dailyCount = Number((await db.prepare(`SELECT COUNT(*) AS n FROM v_my_missions WHERE validator_id = ? AND created_at > NOW() - INTERVAL '24 hours'`).get(req.validator.id)).n);
  if (dailyCount >= 15) {
    const { flagFraud } = await import("../admin.js"); // Ensure this is imported properly if used
    if (typeof flagFraud === 'function') {
      flagFraud("high_velocity_applications", "validator", req.validator.id,
        `${dailyCount} mission applications in the last 24 hours`, "medium");
    }
  }

  let myMission;
  if (isRealMission) {
    myMission = await db.prepare(`SELECT * FROM v_my_missions WHERE validator_id = ? AND mission_id = ?`).get(req.validator.id, t.id);
  } else {
    myMission = await db.prepare(`SELECT * FROM v_my_missions WHERE validator_id = ? AND task_id = ?`).get(req.validator.id, t.id);
  }
  
  res.status(201).json({ myMission });
});

// POST /api/v/marketplace/:id/report — validator reports a mission for review
router.post("/:id/report", async (req, res) => {
  const { reason } = req.body || {};
  if (!reason || !String(reason).trim()) return res.status(400).json({ error: "A reason is required to report a mission" });

  const mission = await db.prepare(`SELECT id, name, flagged FROM missions WHERE id = ?`).get(req.params.id);
  if (!mission) {
    const t = await db.prepare(`SELECT id FROM vtasks WHERE id = ?`).get(req.params.id);
    if (t) return res.json({ ok: true }); // Mock tasks just return ok
    return res.status(404).json({ error: "Mission not found" });
  }

  // Flag the mission for admin review; if already flagged, append the new reason
  const existingReason = mission.flagged
    ? `${mission.flag_reason || ""}\nValidator report: ${String(reason).trim()}`
    : `Validator report: ${String(reason).trim()}`;

  await db.prepare(`UPDATE missions SET flagged = 1, flag_reason = ?, flagged_at = NOW() WHERE id = ?`)
    .run(existingReason.trim(), mission.id);

  res.json({ ok: true });
});
