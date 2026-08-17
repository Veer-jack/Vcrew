import { Router } from "express";
import { db } from "../db.js";
import { validatorAuthMiddleware } from "../auth.js";
import { VTYPES } from "../vmeta.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { recalcMissionStats, getRealJoinedCount } from "../stats.js";
import { computeCheckinStatus, TRIAL_EXTRA_DAYS } from "../checkinLogic.js";
import { translateBatch } from "../translate.js";

export const router = Router();
router.use(validatorAuthMiddleware);

const UPLOADS_DIR = path.join(process.env.DB_DIR || path.join(process.cwd(), "backend", "data"), "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// A participant only ever moves accepted -> started once they've actually
// done something (first check-in, first interview acceptance, first poll
// response, first shipment received) — not just on accepting the mission
// itself. The WHERE clause makes this safe to call from every mission-type
// action route, repeatedly: it only ever affects a row still sitting at
// 'accepted', so it can never downgrade someone already further along
// (started/submitted/rewarded/etc.), and calling it again on repeat actions
// (e.g. day 2's check-in) is a harmless no-op.
async function markParticipantStarted(missionId, validatorId) {
  await db.prepare(`UPDATE participants SET stage = 'started' WHERE mission_id = ? AND validator_id = ? AND stage = 'accepted'`)
    .run(missionId, validatorId);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type. Only JPG, PNG, WebP, MP4, WebM, and MOV are allowed."));
  },
});
router.use(validatorAuthMiddleware);

function serializeRow(row) {
  return {
    id: row.mm_id,
    taskId: row.id,
    src: row.src,
    type: row.category ? row.type : (VTYPES[row.type] ? row.type : "mvp"), category: row.category, product: row.product, tagline: row.tagline, company: row.company,
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
           t.* FROM v_my_missions mm 
    JOIN (
      SELECT id::text, type::text, NULL as category, product::text, tagline::text, company::text, reward::int, minutes::int, match_pct::int, deadline_label::text, steps_json::text, brief::text, 'vtask' as src FROM vtasks
      UNION ALL
      SELECT id::text, ptype::text as type, category::text as category, name::text as product, description::text as tagline, brand::text as company, reward_amount::int as reward, 10::int as minutes, 90::int as match_pct, COALESCE(TO_CHAR(deadline, 'Mon DD'), 'Soon')::text as deadline_label, tasks_json::text as steps_json, description::text as brief, 'mission' as src FROM missions
    ) t ON (t.id = mm.task_id OR t.id = mm.mission_id)
    WHERE mm.validator_id = ?`;
  const params = [req.validator.id];
  if (status === "active") {
    sql += ` AND mm.status IN ('active', 'revision')`;
  } else if (status) { 
    sql += ` AND mm.status = ?`; 
    params.push(status); 
  }
  sql += ` ORDER BY mm.updated_at DESC`;
  const rows = await db.prepare(sql).all(...params);

  const interviewMissions = rows.filter(r => r.type === "interview").map(r => r.id);
  if (interviewMissions.length > 0) {
    const schedules = await db.prepare(`SELECT mission_id, status FROM interview_schedules WHERE validator_id = ? AND mission_id IN (${interviewMissions.map(()=>'?').join(',')})`)
      .all(req.validator.id, ...interviewMissions);
    const scheduleMap = {};
    for (const s of schedules) scheduleMap[s.mission_id] = s.status;
    for (const r of rows) {
      if (r.type === "interview") {
        const st = scheduleMap[r.id];
        let boost = 0;
        if (st === "proposed") boost = 10;
        else if (st === "accepted") boost = 30;
        else if (st === "completed") boost = 50;
        r.progress = boost + Math.floor((r.progress || 0) * 0.5);
      }
    }
  }

  const counts = { applied: 0, active: 0, submitted: 0, completed: 0, rejected: 0, closed: 0, declined: 0 };
  const countRows = await db.prepare(`SELECT status, COUNT(*) as c FROM v_my_missions WHERE validator_id = ? GROUP BY status`).all(req.validator.id);
  for (const r of countRows) {
    // "revision" folds into the "active" bucket alongside real 'active' rows
    // (see line 78's list filter) — always accumulate with += so it doesn't
    // matter which order Postgres returns the GROUP BY rows in.
    const bucket = r.status === "revision" ? "active" : r.status;
    if (counts[bucket] !== undefined) counts[bucket] += Number(r.c);
  }

  const missions = rows.map(serializeRow);

  const lang = req.validator.preferred_language;
  if (lang && lang !== "en") {
    const items = missions.flatMap(m => {
      const entityType = `marketplace_${m.src}`;
      const out = [
        { entityType, entityId: Number(m.taskId), field: "product", text: m.product },
        { entityType, entityId: Number(m.taskId), field: "tagline", text: m.tagline },
      ];
      if (m.reason) out.push({ entityType: "vmm_reason", entityId: m.id, field: "reason", text: m.reason });
      return out;
    });
    const translated = await translateBatch(items, lang);
    for (const m of missions) {
      const entityType = `marketplace_${m.src}`;
      m.product = translated.get(`${entityType}:${Number(m.taskId)}:product`) ?? m.product;
      m.tagline = translated.get(`${entityType}:${Number(m.taskId)}:tagline`) ?? m.tagline;
      if (m.reason) m.reason = translated.get(`vmm_reason:${m.id}:reason`) ?? m.reason;
    }
  }

  res.json({ missions, counts });
});

// GET /api/v/missions/invitations
// Must be registered before the /:taskId catch-all below, or Express matches
// "invitations" as a taskId and this route is never reached.
router.get("/invitations", async (req, res) => {
  const invites = await db.prepare(`
    SELECT i.id as invite_id, i.status as invite_status, i.created_at, m.*, b.name as builder_name, b.org as builder_org
    FROM mission_invitations i
    JOIN missions m ON m.id = i.mission_id
    JOIN builders b ON b.id = i.builder_id
    WHERE i.validator_id = ? AND i.status = 'pending'
    ORDER BY i.created_at DESC
  `).all(req.validator.id);

  res.json({ invitations: invites });
});

// GET /api/v/missions/:taskId — workspace context (task + rubric + my mission state)
router.get("/:taskId", async (req, res) => {
  let t = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.taskId);
  let isRealMission = !!t;
  if (!t) {
    t = await db.prepare(`SELECT * FROM vtasks WHERE id = ?`).get(req.params.taskId);
  }
  if (!t) return res.status(404).json({ error: "Mission not found" });

  let mm;
  if (isRealMission) {
    mm = await db.prepare(`SELECT * FROM v_my_missions WHERE validator_id = ? AND mission_id = ?`).get(req.validator.id, t.id);
  } else {
    mm = await db.prepare(`SELECT * FROM v_my_missions WHERE validator_id = ? AND task_id = ?`).get(req.validator.id, t.id);
  }

  const taskData = isRealMission
    ? { id: t.id, type: VTYPES[t.ptype] ? t.ptype : "mvp", ptype: t.ptype || null, category: t.category || null, product: t.name, tagline: t.description ? t.description.slice(0, 100) : "", company: t.brand || "Independent", reward: t.reward_amount || 0, minutes: 10, brief: t.description || "", steps: JSON.parse(t.tasks_json || "[]").map(s => typeof s === 'string' ? s : (s.title || s.description || 'Task')) }
    : { id: t.id, type: t.type, ptype: null, category: null, product: t.product, tagline: t.tagline, company: t.company, reward: t.reward, minutes: t.minutes, brief: t.brief, steps: JSON.parse(t.steps_json || "[]").map(s => typeof s === 'string' ? s : (s.title || s.description || 'Task')) };

  let scheduleStatus = null;
  if (isRealMission && t.ptype === "interview") {
    const s = await db.prepare(`SELECT status FROM interview_schedules WHERE mission_id = ? AND validator_id = ?`).get(t.id, req.validator.id);
    if (s) scheduleStatus = s.status;
  } else if (isRealMission && t.ptype === "focus") {
    const poll = await db.prepare(`SELECT * FROM focus_group_polls WHERE mission_id = ?`).get(t.id);
    if (poll) {
      const resp = await db.prepare(`SELECT slot_id FROM focus_group_responses WHERE poll_id = ? AND validator_id = ? AND slot_id = ?`).get(poll.id, req.validator.id, poll.locked_slot_id);
      if (resp) scheduleStatus = poll.status;
    }
  }

  res.json({
    task: taskData,
    rubric: VTYPES[taskData.type],
    scheduleStatus,
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
  if (mm.status !== 'active') return res.status(400).json({ error: "Mission already submitted" });

  const { ratings = {}, flags = [], notes = "", minutes = 1, score = 0 } = req.body || {};

  await db.prepare(`
    UPDATE v_my_missions SET status = 'submitted', progress = 100, ratings_json = ?, flags_json = ?, notes = ?,
      minutes_spent = ?, score = ?, status_label = 'Submitted just now', updated_at = NOW()
    WHERE id = ?
  `).run(JSON.stringify(ratings), JSON.stringify(flags), notes, minutes, score, mm.id);

  // reward becomes a pending payout while the builder reviews it
  await db.prepare(`UPDATE validators SET pending = pending + ? WHERE id = ?`).run(t.reward, req.validator.id);

  // Log Activity for Builder
  await db.prepare(`INSERT INTO activity (builder_id, type, title, detail, amount) VALUES (1, 'submission_received', ?, ?, ?)`)
    .run(t.product + " — " + t.tagline, req.validator.name, 0);

  // Evaluate day streak logic (Lazy Evaluation)
  await db.prepare(`
    UPDATE validators 
    SET streak = CASE 
          WHEN last_active_date = CURRENT_DATE - INTERVAL '1 day' THEN streak + 1 
          WHEN last_active_date = CURRENT_DATE THEN streak 
          ELSE 1 
        END,
        last_active_date = CURRENT_DATE
    WHERE id = ?
  `).run(req.validator.id);

  await db.prepare(`INSERT INTO v_notifications (validator_id, cat, icon, tone, title, body, time_label, unread, target_id) VALUES (?,?,?,?,?,?,?,1,?)`)
    .run(req.validator.id, "application", "clock", "accent", "Submission received", `Your validation for ${t.product} is now in review. \u20b9${t.reward} will clear once approved.`, "Just now", t.id);

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
  if (!m) {
    // Marketplace listings (vtasks) use a flat single-task record with no
    // steps/questions/proof shape — Resume shouldn't have sent them into
    // this multi-task workspace at all (see MyMissions.jsx's dest picker).
    // Surface a distinguishable error instead of a bare 404 so the frontend
    // can say what actually happened rather than a silent blank page.
    const vtask = await db.prepare(`SELECT id FROM vtasks WHERE id = ?`).get(req.params.id);
    if (vtask) return res.status(409).json({ error: "This mission type isn't opened from the workspace.", code: "UNSUPPORTED_WORKSPACE_TASK" });
    return res.status(404).json({ error: "Mission not found" });
  }

  let tasks = [];
  try { tasks = m.tasks_json ? JSON.parse(m.tasks_json) : []; } catch {}

  const response = await db.prepare(`SELECT data_json, status, active_seconds FROM responses WHERE mission_id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);
  let responses = null;
  let isDraft = false;
  let isRevision = false;
  let revisionReason = null;
  if (response && response.data_json) {
    try { responses = JSON.parse(response.data_json); } catch {}
    isRevision = response.status === "revision";
    isDraft = response.status === "draft" || isRevision;
  }
  if (isRevision) {
    const mm = await db.prepare(`SELECT reason FROM v_my_missions WHERE mission_id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);
    revisionReason = mm?.reason || null;
  }

  let scheduleStatus = null;
  if (m.ptype === "interview") {
    const s = await db.prepare(`SELECT status FROM interview_schedules WHERE mission_id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);
    if (s) scheduleStatus = s.status;
  } else if (m.ptype === "focus") {
    const poll = await db.prepare(`SELECT * FROM focus_group_polls WHERE mission_id = ?`).get(req.params.id);
    if (poll) {
      const resp = await db.prepare(`SELECT slot_id FROM focus_group_responses WHERE poll_id = ? AND validator_id = ? AND slot_id = ?`).get(poll.id, req.validator.id, poll.locked_slot_id);
      if (resp) scheduleStatus = poll.status;
    }
  }

  res.json({
    mission: { id: m.id, name: m.name, brand: m.brand || m.builder_name, ptype: m.ptype },
    tasks,
    responses,
    isDraft,
    isRevision,
    revisionReason,
    scheduleStatus,
    activeSeconds: response?.active_seconds || 0,
  });
});

// PATCH /api/v/missions/:id/workspace/draft — auto-save workspace draft
router.patch("/:id/workspace/draft", async (req, res) => {
  const { answers, curIdx, activeSeconds } = req.body || {};
  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });

  let totalTasks = 1;
  try {
    const parsedTasks = JSON.parse(m.tasks_json || "[]");
    totalTasks = parsedTasks.length || 1;
  } catch {}

  const progressPercent = Math.min(100, Math.max(0, Math.round(((curIdx || 0) / totalTasks) * 100)));

  const existing = await db.prepare(`SELECT id, status FROM responses WHERE mission_id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);

  const draftData = { answers: answers || [], curIdx: curIdx || 0 };
  const activeSecs = Number.isFinite(activeSeconds) ? Math.max(0, Math.round(activeSeconds)) : null;

  if (existing) {
    // Only update if it's currently a draft or revision (don't overwrite a submitted mission)
    if (existing.status === "draft" || existing.status === "revision") {
      await db.prepare(`UPDATE responses SET data_json = ?, submitted_at = NOW(), active_seconds = COALESCE(?, active_seconds) WHERE id = ?`)
        .run(JSON.stringify(draftData), activeSecs, existing.id);
    }
  } else {
    await db.prepare(`INSERT INTO responses (mission_id, validator_id, data_json, status, submitted_at, active_seconds) VALUES (?, ?, ?, 'draft', NOW(), ?)`)
      .run(req.params.id, req.validator.id, JSON.stringify(draftData), activeSecs);
  }

  // Atomically sync the integer progress percentage for the Dashboard
  await db.prepare(`UPDATE v_my_missions SET progress = ?, updated_at = NOW() WHERE mission_id = ? AND validator_id = ?`)
    .run(progressPercent, req.params.id, req.validator.id);

  await markParticipantStarted(req.params.id, req.validator.id);

  res.json({ ok: true, progress: progressPercent });
});

// POST /api/v/missions/:id/withdraw — Validator gracefully drops out of a mission
router.post("/:id/withdraw", async (req, res) => {
  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });

  const mm = await db.prepare(`SELECT status FROM v_my_missions WHERE mission_id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);
  if (!mm || (mm.status !== "active" && mm.status !== "revision")) {
    return res.status(400).json({ error: "You can only withdraw from active missions" });
  }

  await db.transaction(async (tx) => {
    // Lock mission to decrement safely
    const mission = await tx.prepare(`SELECT joined, target, name, builder_id FROM missions WHERE id = ? FOR UPDATE`).get(req.params.id);
    // Captured before the participant DELETE below, since afterward the
    // real joined count already reflects this withdrawal.
    const realJoinedBefore = await getRealJoinedCount(req.params.id, tx);

    // Remove the validator's footprint completely
    await tx.prepare(`DELETE FROM v_my_missions WHERE mission_id = ? AND validator_id = ?`).run(req.params.id, req.validator.id);
    await tx.prepare(`DELETE FROM participants WHERE mission_id = ? AND validator_id = ?`).run(req.params.id, req.validator.id);
    await tx.prepare(`DELETE FROM responses WHERE mission_id = ? AND validator_id = ?`).run(req.params.id, req.validator.id);
    await tx.prepare(`DELETE FROM sample_shipments WHERE mission_id = ? AND validator_id = ?`).run(req.params.id, req.validator.id);
    await tx.prepare(`DELETE FROM interview_schedules WHERE mission_id = ? AND validator_id = ?`).run(req.params.id, req.validator.id);
    await tx.prepare(`DELETE FROM focus_group_responses WHERE validator_id = ? AND poll_id IN (SELECT id FROM focus_group_polls WHERE mission_id = ?)`).run(req.validator.id, req.params.id);
    // Ignore checkins to keep historical logs, or delete them if desired.

    // Decrement joined
    const wasFull = realJoinedBefore >= mission.target && mission.target > 0;
    await tx.prepare(`UPDATE missions SET joined = GREATEST(0, joined - 1) WHERE id = ?`).run(req.params.id);

    // Notify Builder
    await tx.prepare(`INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'system', 'user_minus', 'xCircle', 'warning', ?, ?, 'Just now', 1, ?)`)
      .run(mission.builder_id, "Validator Withdrew", `${req.validator.name} has gracefully withdrawn from "${mission.name}". Their slot is now open.`, req.params.id);

    // If it was full and now isn't, notify waitlist
    if (wasFull) {
      const savedVals = await tx.prepare(`SELECT validator_id FROM v_saved WHERE task_id = ?`).all(req.params.id);
      for (const sv of savedVals) {
        await tx.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?,?,?,?,?,?,?,?,1,?)`)
          .run(sv.validator_id, "alert", "slot_available", "bell", "success", "Slot Available!", `Hurry up! A slot just opened up for "${mission.name}".`, "Just now", req.params.id);
      }
    }
  });

  res.json({ ok: true });
});

// POST /api/v/missions/:id/workspace/proof — upload a screenshot for a workspace task
router.post("/:id/workspace/proof", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  if (!m) {
    fs.unlinkSync(req.file.path);
    return res.status(404).json({ error: "Mission not found" });
  }

  const mm = await db.prepare(`SELECT status FROM v_my_missions WHERE mission_id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);
  if (!mm || mm.status !== "active") {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "Mission not active or not accepted" });
  }

  res.status(201).json({
    ok: true,
    file: { filename: req.file.filename, url: `/api/uploads/${req.file.filename}` },
  });
});

// POST /api/v/missions/:id/checkin/proof — upload today's check-in screenshot
router.post("/:id/checkin/proof", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  if (!m) {
    fs.unlinkSync(req.file.path);
    return res.status(404).json({ error: "Mission not found" });
  }
  if (m.ptype !== "trial") {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "This mission does not use daily check-ins" });
  }

  const mm = await db.prepare(`SELECT status FROM v_my_missions WHERE mission_id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);
  if (!mm || mm.status !== "active") {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "Mission not active or not accepted" });
  }

  res.status(201).json({
    ok: true,
    file: { filename: req.file.filename, url: `/api/uploads/${req.file.filename}` },
  });
});

// PATCH /api/v/missions/:id/workspace/submit — submit workspace responses
router.patch("/:id/workspace/submit", async (req, res) => {
  const { answers, activeSeconds } = req.body || {};
  const activeSecs = Number.isFinite(activeSeconds) ? Math.max(0, Math.round(activeSeconds)) : null;
  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });
  if (m.status !== "active" && m.status !== "live" && m.status !== "published") {
    return res.status(400).json({ error: "This mission is closed and no longer accepting submissions." });
  }

  const mm = await db.prepare(`SELECT status FROM v_my_missions WHERE mission_id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);
  if (!mm) return res.status(404).json({ error: "You haven't accepted this mission yet" });
  if (mm.status !== "active" && mm.status !== "revision") return res.status(400).json({ error: "Mission already submitted" });

  // Interview/focus sessions must actually have happened before the debrief can be
  // submitted for payout — otherwise a validator could get paid without attending.
  if (m.ptype === "interview") {
    const s = await db.prepare(`SELECT status FROM interview_schedules WHERE mission_id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);
    if (!s || s.status !== "completed") {
      return res.status(400).json({ error: "The builder hasn't marked your interview as completed yet." });
    }
  } else if (m.ptype === "focus") {
    const poll = await db.prepare(`SELECT * FROM focus_group_polls WHERE mission_id = ?`).get(req.params.id);
    const attended = poll && poll.status === "completed"
      ? await db.prepare(`SELECT 1 FROM focus_group_responses WHERE poll_id = ? AND validator_id = ? AND slot_id = ?`).get(poll.id, req.validator.id, poll.locked_slot_id)
      : null;
    if (!attended) {
      return res.status(400).json({ error: "The builder hasn't marked your focus group session as completed yet." });
    }
  }

  // --- Deep Schema Validation (TC 024) ---
  let tasks = [];
  try { tasks = JSON.parse(m.tasks_json || "[]"); } catch {}

  if (!Array.isArray(answers) || answers.length !== tasks.length) {
    return res.status(400).json({ error: "Invalid submission: incorrect number of task answers" });
  }

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const taskAnswers = answers[i] || {};
    
    for (const q of (task.questions || [])) {
      const ans = taskAnswers[q.id];
      if (ans === undefined || ans === null || String(ans).trim() === '') {
        return res.status(400).json({ error: `Missing required answer in Task ${i + 1}: "${task.title || 'Untitled'}" (Question: "${q.text || q.id}")` });
      }
    }

    if (task.proof) {
      const proofFile = taskAnswers._proof;
      if (!proofFile || String(proofFile).trim() === '') {
        return res.status(400).json({ error: `Missing required screenshot proof in Task ${i + 1}: "${task.title || 'Untitled'}"` });
      }
    }
  }
  // ---------------------------------------

  const existing = await db.prepare(`SELECT id, status FROM responses WHERE mission_id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);
  if (existing) {
    if (existing.status === 'revision') {
      // Notify Builder
      await db.prepare(`
        INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id)
        VALUES (?, 'application', 'submission', 'check', 'accent', 'Revision Submitted', ?, 'Just now', 1, ?)
      `).run(m.builder_id, `A validator has updated their response for ${m.name} and is ready for your review.`, req.params.id);
    } else if (existing.status === 'draft') {
      await db.prepare(`
        INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id)
        VALUES (?, 'application', 'submission', 'check', 'primary', 'Mission Submitted', ?, 'Just now', 1, ?)
      `).run(m.builder_id, `A validator has completed and submitted their response for ${m.name}.`, req.params.id);
    }
    await db.prepare(`UPDATE responses SET data_json = ?, status = 'pending', submitted_at = NOW(), active_seconds = COALESCE(?, active_seconds) WHERE id = ?`)
      .run(JSON.stringify(answers || {}), activeSecs, existing.id);
  } else {
    await db.prepare(`INSERT INTO responses (mission_id, validator_id, data_json, status, submitted_at, active_seconds) VALUES (?, ?, ?, 'pending', NOW(), ?)`)
      .run(req.params.id, req.validator.id, JSON.stringify(answers || {}), activeSecs);
    
    await db.prepare(`
      INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id)
      VALUES (?, 'application', 'submission', 'check', 'primary', 'Mission Submitted', ?, 'Just now', 1, ?)
    `).run(m.builder_id, `A validator has completed and submitted their response for ${m.name}.`, req.params.id);
    
    await recalcMissionStats(req.params.id, db);
  }

  await db.prepare(`UPDATE v_my_missions SET status = 'submitted', progress = 100, status_label = 'Submitted for review', updated_at = NOW() WHERE mission_id = ? AND validator_id = ?`)
    .run(req.params.id, req.validator.id);
    
  await db.prepare(`UPDATE participants SET stage = 'submitted' WHERE mission_id = ? AND validator_id = ?`)
    .run(req.params.id, req.validator.id);

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
  if (m.ptype !== "trial") return res.status(400).json({ error: "This mission does not use daily check-ins" });

  const p = await db.prepare(`SELECT joined_at AS accepted_at FROM participants WHERE mission_id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);
  if (!p) return res.status(403).json({ error: "Not participating" });

  const totalDays = m.duration_days || 7;
  const checkins = await db.prepare(`SELECT * FROM checkins WHERE mission_id = ? AND validator_id = ? ORDER BY day_number ASC`).all(req.params.id, req.validator.id).catch(() => []);
  const { currentCalendarDay, completedDays, alreadySubmittedToday, skippedDays, lockedOut } = computeCheckinStatus(p.accepted_at, checkins);

  const remainingExtraDays = TRIAL_EXTRA_DAYS - skippedDays;
  const currentDay = completedDays + (alreadySubmittedToday ? 0 : 1);
  const isFinished = completedDays >= totalDays;

  res.json({
    mission: { name: m.name, brand: m.brand, total_days: totalDays, reward_total: m.reward_amount || 0 },
    currentCalendarDay,
    currentDay: Math.min(currentDay, totalDays),
    completedDays,
    skippedDays,
    remainingExtraDays,
    lockedOut,
    isFinished,
    canSubmitToday: !lockedOut && !isFinished && !alreadySubmittedToday,
  });
});

// GET /api/v/missions/:id/shipment-status
router.get("/:id/shipment-status", async (req, res) => {
  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });
  if (m.category !== "sample") return res.status(400).json({ error: "This mission does not require a shipped sample" });

  const shipment = await db.prepare(`SELECT * FROM sample_shipments WHERE mission_id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);

  res.json({
    mission: { name: m.name, brand: m.brand },
    shipment: shipment
      ? { status: shipment.status, tracking_number: shipment.tracking_number, carrier: shipment.carrier, shipped_at: shipment.shipped_at, received_at: shipment.received_at }
      : { status: "awaiting_shipment", tracking_number: null, carrier: null, shipped_at: null, received_at: null },
  });
});

// POST /api/v/missions/:id/shipment/received — validator confirms the sample arrived
router.post("/:id/shipment/received", async (req, res) => {
  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });
  if (m.category !== "sample") return res.status(400).json({ error: "This mission does not require a shipped sample" });

  const updateRes = await db.prepare(`UPDATE sample_shipments SET status = 'received', received_at = NOW() WHERE mission_id = ? AND validator_id = ? AND status = 'shipped'`)
    .run(req.params.id, req.validator.id);
  if (updateRes.changes === 0) return res.status(400).json({ error: "This sample hasn't been marked as shipped yet" });
  await markParticipantStarted(req.params.id, req.validator.id);

  await db.prepare(`INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'system', 'shipment_received', 'package', 'success', ?, ?, 'Just now', 1, ?)`)
    .run(m.builder_id, "Sample Received", `${req.validator.name} has received the sample for ${m.name}.`, req.params.id);

  res.json({ ok: true });
});

// GET /api/v/missions/:id/schedule-status
router.get("/:id/schedule-status", async (req, res) => {
  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });
  if (m.ptype !== "interview") return res.status(400).json({ error: "This mission does not use scheduled interviews" });

  const schedule = await db.prepare(`SELECT * FROM interview_schedules WHERE mission_id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);

  res.json({
    mission: { name: m.name, brand: m.brand },
    schedule: schedule
      ? { status: schedule.status, scheduled_at: schedule.scheduled_at, meeting_link: schedule.meeting_link }
      : null,
  });
});

// POST /api/v/missions/:id/schedule/accept — validator accepts the proposed interview time
router.post("/:id/schedule/accept", async (req, res) => {
  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });
  if (m.ptype !== "interview") return res.status(400).json({ error: "This mission does not use scheduled interviews" });

  const updateRes = await db.prepare(`UPDATE interview_schedules SET status = 'accepted', responded_at = NOW() WHERE mission_id = ? AND validator_id = ? AND status = 'proposed'`)
    .run(req.params.id, req.validator.id);
  if (updateRes.changes === 0) return res.status(400).json({ error: "No pending time proposal to accept" });
  await markParticipantStarted(req.params.id, req.validator.id);

  const val = await db.prepare(`SELECT name FROM validators WHERE id = ?`).get(req.validator.id);
  await db.prepare(`
    INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id)
    VALUES (?, 'application', 'schedule_accepted', 'calendar', 'success', 'Interview Accepted', ?, 'Just now', 1, ?)
  `).run(m.builder_id, `${val ? val.name : 'A validator'} has accepted the interview time for "${m.name}".`, req.params.id);

  res.json({ ok: true });
});

// POST /api/v/missions/:id/schedule/decline — validator declines the proposed interview time
router.post("/:id/schedule/decline", async (req, res) => {
  const { reason, timeRange } = req.body || {};
  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });
  if (m.ptype !== "interview") return res.status(400).json({ error: "This mission does not use scheduled interviews" });

  const notes = JSON.stringify({ reason: reason || "", timeRange: timeRange || "" });

  const updateRes = await db.prepare(`UPDATE interview_schedules SET status = 'declined', validator_notes = ?, responded_at = NOW() WHERE mission_id = ? AND validator_id = ? AND status = 'proposed'`)
    .run(notes, req.params.id, req.validator.id);
  if (updateRes.changes === 0) return res.status(400).json({ error: "No pending time proposal to decline" });

  await db.prepare(`INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'system', 'schedule_declined', 'xCircle', 'warning', ?, ?, 'Just now', 1, ?)`)
    .run(m.builder_id, "Interview Declined", `${req.validator.name} declined the proposed interview time for ${m.name}.`, req.params.id);

  res.json({ ok: true });
});

// GET /api/v/missions/:id/poll-status
router.get("/:id/poll-status", async (req, res) => {
  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });
  if (m.ptype !== "focus") return res.status(400).json({ error: "This mission does not use focus group scheduling" });

  const poll = await db.prepare(`SELECT * FROM focus_group_polls WHERE mission_id = ?`).get(req.params.id);
  if (!poll) return res.json({ mission: { name: m.name, brand: m.brand }, poll: null, restarted: !!m.focus_group_poll_restarted_at });

  const slots = await db.prepare(`SELECT id, scheduled_at FROM focus_group_slots WHERE poll_id = ? ORDER BY scheduled_at ASC`).all(poll.id);
  const myResponses = await db.prepare(`SELECT slot_id FROM focus_group_responses WHERE poll_id = ? AND validator_id = ?`).all(poll.id, req.validator.id);
  const mySlotIds = myResponses.map(r => r.slot_id);

  let outcome = null;
  if (poll.status === "locked" || poll.status === "completed") {
    outcome = mySlotIds.includes(poll.locked_slot_id) ? "confirmed" : "not_selected";
  }

  res.json({
    mission: { name: m.name, brand: m.brand },
    poll: {
      status: poll.status,
      meetingLink: poll.meeting_link,
      slots: slots.map(s => ({ id: s.id, scheduledAt: s.scheduled_at })),
      mySlotIds,
      lockedSlotId: poll.locked_slot_id,
      outcome,
      isRestart: !!poll.is_restart,
    },
  });
});

// POST /api/v/missions/:id/poll/respond — validator submits their full availability (replace-all)
router.post("/:id/poll/respond", async (req, res) => {
  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });
  if (m.ptype !== "focus") return res.status(400).json({ error: "This mission does not use focus group scheduling" });
  if (m.status !== "active") return res.status(400).json({ error: "This mission is no longer active — scheduling is closed." });

  const poll = await db.prepare(`SELECT * FROM focus_group_polls WHERE mission_id = ? AND status = 'open'`).get(req.params.id);
  if (!poll) return res.status(400).json({ error: "No open poll to respond to" });

  const { slotIds } = req.body || {};
  if (!Array.isArray(slotIds)) return res.status(400).json({ error: "slotIds must be a list" });

  if (slotIds.length > 0) {
    const placeholders = slotIds.map(() => "?").join(",");
    const validSlots = await db.prepare(`SELECT id FROM focus_group_slots WHERE poll_id = ? AND id IN (${placeholders})`).all(poll.id, ...slotIds);
    if (validSlots.length !== new Set(slotIds).size) {
      return res.status(400).json({ error: "One or more slotIds do not belong to this poll" });
    }
  }

  const previousResponses = await db.prepare(`SELECT 1 FROM focus_group_responses WHERE poll_id = ? AND validator_id = ? LIMIT 1`).get(poll.id, req.validator.id);
  const isUpdate = !!previousResponses;

  await db.transaction(async (tx) => {
    await tx.prepare(`DELETE FROM focus_group_responses WHERE poll_id = ? AND validator_id = ?`).run(poll.id, req.validator.id);
    for (const slotId of slotIds) {
      await tx.prepare(`INSERT INTO focus_group_responses (poll_id, validator_id, slot_id) VALUES (?, ?, ?)`).run(poll.id, req.validator.id, slotId);
    }
  });
  await markParticipantStarted(req.params.id, req.validator.id);

  if (!isUpdate) {
    await db.prepare(`
      INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id)
      VALUES (?, 'application', 'submission', 'calendar', 'primary', 'Focus Group Availability', ?, 'Just now', 1, ?)
    `).run(m.builder_id, `${req.validator.name} has submitted their availability for the focus group in "${m.name}".`, m.id);
  }

  res.json({ ok: true });
});

// POST /api/v/missions/:id/checkin
router.post("/:id/checkin", async (req, res) => {
  const { day, answers, screenshot_path } = req.body || {};
  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });
  if (m.ptype !== "trial") return res.status(400).json({ error: "This mission does not use daily check-ins" });

  const mm = await db.prepare(`SELECT status FROM v_my_missions WHERE mission_id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);
  if (!mm || mm.status !== "active") return res.status(400).json({ error: "Mission not active or not accepted" });

  const p = await db.prepare(`SELECT joined_at AS accepted_at FROM participants WHERE mission_id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);
  if (!p) return res.status(403).json({ error: "Not participating" });

  const totalDays = m.duration_days || 7;
  const checkins = await db.prepare(`SELECT * FROM checkins WHERE mission_id = ? AND validator_id = ? ORDER BY day_number ASC`).all(req.params.id, req.validator.id).catch(() => []);
  const { completedDays, alreadySubmittedToday, lockedOut } = computeCheckinStatus(p.accepted_at, checkins);

  if (lockedOut) {
    await db.prepare(`UPDATE v_my_missions SET status = 'failed', status_label = 'Failed (Missed Check-ins)', updated_at = NOW() WHERE mission_id = ? AND validator_id = ?`).run(req.params.id, req.validator.id);
    await db.prepare(`UPDATE participants SET stage = 'failed' WHERE mission_id = ? AND validator_id = ?`).run(req.params.id, req.validator.id);
    
    await db.prepare(`
      INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id)
      VALUES (?, 'application', 'mission_failed', 'xCircle', 'danger', 'Mission Failed', ?, 'Just now', 1, ?)
    `).run(m.builder_id, `A validator failed the mission "${m.name}" due to missed check-ins.`, req.params.id);

    await db.prepare(`
      INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread, target_id)
      VALUES (?, 'system', 'mission_failed', 'xCircle', 'danger', 'Mission Failed', ?, 'Just now', 1, ?)
    `).run(req.validator.id, `You failed the mission "${m.name}" because you missed too many daily check-ins.`, req.params.id);

    return res.status(400).json({ error: "Mission failed due to too many missed check-ins." });
  }
  if (completedDays >= totalDays) return res.status(400).json({ error: "All required check-ins are already complete." });
  if (alreadySubmittedToday) return res.status(400).json({ error: "Already submitted for today." });

  // In the elastic model, the day_number recorded is simply the sequential day (completedDays + 1)
  const sequentialDay = completedDays + 1;

  await db.prepare(`INSERT INTO checkins (mission_id, validator_id, day_number, answers_json, screenshot_path, submitted_at) VALUES (?, ?, ?, ?, ?, NOW())`)
    .run(req.params.id, req.validator.id, sequentialDay, JSON.stringify(answers || {}), screenshot_path || null).catch(async () => {
      // table might not exist yet — create it
      await db.exec(`CREATE TABLE IF NOT EXISTS checkins (id SERIAL PRIMARY KEY, mission_id TEXT, validator_id INTEGER, day_number INTEGER, answers_json TEXT DEFAULT '{}', screenshot_path TEXT, submitted_at TIMESTAMPTZ DEFAULT NOW())`);
      await db.prepare(`INSERT INTO checkins (mission_id, validator_id, day_number, answers_json, screenshot_path, submitted_at) VALUES (?, ?, ?, ?, ?, NOW())`).run(req.params.id, req.validator.id, day || 1, JSON.stringify(answers || {}), screenshot_path || null);
    });
  await markParticipantStarted(req.params.id, req.validator.id);

  const val = await db.prepare(`SELECT name FROM validators WHERE id = ?`).get(req.validator.id);
  await db.prepare(`
    INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id)
    VALUES (?, 'application', 'checkin', 'check', 'accent', 'Review Completed', ?, 'Just now', 1, ?)
  `).run(m.builder_id, `Day ${sequentialDay} review completed by ${val ? val.name : 'a validator'} for mission "${m.name}".`, req.params.id);

  res.json({ ok: true });
});

// POST /api/v/missions/invitations/:id/accept
router.post("/invitations/:id/accept", async (req, res) => {
  // Same gate as marketplace apply — see comment there. A validator invited
  // straight off a bare signup shouldn't be able to accept before their
  // profile has any actual data in it.
  if (!req.validator.occupation) {
    return res.status(403).json({ error: "Complete your profile before accepting an invite.", code: "ONBOARDING_REQUIRED" });
  }
  const invite = await db.prepare(`SELECT * FROM mission_invitations WHERE id = ? AND validator_id = ? AND status = 'pending'`).get(req.params.id, req.validator.id);
  if (!invite) return res.status(404).json({ error: "Invite not found or already processed" });

  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(invite.mission_id);
  if (!m) return res.status(404).json({ error: "Mission not found" });

  // Join logic
  try {
    await db.transaction(async (tx) => {
      // Lock the mission row to prevent concurrent acceptances exceeding the slot limit
      const m = await tx.prepare(`SELECT * FROM missions WHERE id = ? FOR UPDATE`).get(invite.mission_id);
      if (!m) throw new Error("Mission not found");
      if ((await getRealJoinedCount(m.id, tx)) >= m.target) {
        throw new Error("MISSION_FULL");
      }

      await tx.prepare(`UPDATE mission_invitations SET status = 'accepted' WHERE id = ?`).run(invite.id);
      // The invite step already creates an 'invited' participants row (see
      // POST /missions/:id/invite) — flip it to accepted instead of inserting
      // a second row for the same person. Marketplace-style direct joins
      // (no prior invite) still fall through to the INSERT.
      const invitedRow = await tx.prepare(`SELECT id FROM participants WHERE mission_id = ? AND validator_id = ?`).get(m.id, req.validator.id);
      if (invitedRow) {
        await tx.prepare(`UPDATE participants SET stage = 'accepted', status = 'active' WHERE id = ?`).run(invitedRow.id);
      } else {
        await tx.prepare(`INSERT INTO participants (mission_id, validator_id, name, email, role, city) VALUES (?, ?, ?, ?, ?, ?)`)
          .run(m.id, req.validator.id, req.validator.name, req.validator.email, req.validator.role || 'User', req.validator.city || 'Remote');
      }
      // A prior decline (see POST /marketplace/:id/decline) left a
      // 'declined' row here — a fresh invite shouldn't silently bypass
      // that, so update it in place rather than inserting a second row,
      // and reject if the validator hasn't explicitly undone the decline.
      const existingMy = await tx.prepare(`SELECT id, status FROM v_my_missions WHERE validator_id = ? AND mission_id = ?`).get(req.validator.id, m.id);
      if (existingMy?.status === "declined") throw new Error("DECLINED_MISSION");
      if (existingMy) {
        await tx.prepare(`UPDATE v_my_missions SET status = 'active' WHERE id = ?`).run(existingMy.id);
      } else {
        await tx.prepare(`INSERT INTO v_my_missions (validator_id, mission_id, status) VALUES (?, ?, 'active')`)
          .run(req.validator.id, m.id);
      }

      const newJoined = m.joined + 1;
      await tx.prepare(`UPDATE missions SET joined = ? WHERE id = ?`).run(newJoined, m.id);
      
      // Notify Builder
      await tx.prepare(`INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'application', 'participant_joined', 'userplus', 'primary', ?, ?, 'Just now', 1, ?)`)
        .run(m.builder_id, "Invite Accepted", `${req.validator.name} has accepted your invitation and joined ${m.name}.`, m.id);

      // If the mission is now completely full, notify all other pending invitees
      if (newJoined >= m.target) {
        const pending = await tx.prepare(`SELECT * FROM mission_invitations WHERE mission_id = ? AND status = 'pending'`).all(m.id);
        for (const p of pending) {
          // Close their invitation so they can no longer accept it
          await tx.prepare(`UPDATE mission_invitations SET status = 'closed' WHERE id = ?`).run(p.id);
          // Send notification prompting them to click and save
          await tx.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'invite', 'mission_full', 'alertCircle', 'warning', ?, ?, 'Just now', 1, ?)`)
            .run(p.validator_id, "Mission Slots Full", `The mission "${m.name}" has reached its maximum participants. Click here to save it for future updates.`, m.id);
        }
      }
    });
    res.json({ ok: true });
  } catch (err) {
    if (err.message === "MISSION_FULL") {
      return res.status(400).json({ error: "Sorry, this mission has just filled all available slots." });
    }
    if (err.message === "DECLINED_MISSION") {
      return res.status(400).json({ error: "You declined this mission. Undo that from My Missions if you'd like to accept it." });
    }
    throw err;
  }
});

// POST /api/v/missions/invitations/:id/decline
router.post("/invitations/:id/decline", async (req, res) => {
  const invite = await db.prepare(`SELECT * FROM mission_invitations WHERE id = ? AND validator_id = ? AND status = 'pending'`).get(req.params.id, req.validator.id);
  if (!invite) return res.status(404).json({ error: "Invite not found or already processed" });

  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(invite.mission_id);

  await db.transaction(async (tx) => {
    await tx.prepare(`UPDATE mission_invitations SET status = 'declined' WHERE id = ?`).run(invite.id);
    await tx.prepare(`DELETE FROM participants WHERE mission_id = ? AND validator_id = ? AND stage = 'invited'`).run(invite.mission_id, req.validator.id);
    if (m) {
      await tx.prepare(`INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'application', 'invite_declined', 'xCircle', 'warning', ?, ?, 'Just now', 1, ?)`)
        .run(m.builder_id, "Invite Declined", `${req.validator.name} has declined your invitation for ${m.name}.`, m.id);
    }
  });

  res.json({ ok: true });
});
