import { Router } from "express";
import { db } from "../db.js";
import { validatorAuthMiddleware } from "../auth.js";
import { VTYPES } from "../vmeta.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { recalcMissionStats } from "../stats.js";

export const router = Router();
router.use(validatorAuthMiddleware);

const UPLOADS_DIR = path.join(process.env.DB_DIR || path.join(process.cwd(), "backend", "data"), "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

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
  const t = row;
  return {
    id: row.mm_id,
    taskId: row.id,
    type: VTYPES[row.type] ? row.type : "mvp", category: row.category, product: row.product, tagline: row.tagline, company: row.company,
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
      SELECT id::text, type::text, NULL as category, product::text, tagline::text, company::text, reward::int, minutes::int, match_pct::int, deadline_label::text, steps_json::text, brief::text FROM vtasks
      UNION ALL
      SELECT id::text, ptype::text as type, category::text as category, name::text as product, description::text as tagline, brand::text as company, reward_amount::int as reward, 10::int as minutes, 90::int as match_pct, 'Soon'::text as deadline_label, tasks_json::text as steps_json, description::text as brief FROM missions
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

  const counts = { applied: 0, active: 0, submitted: 0, completed: 0, rejected: 0 };
  const countRows = await db.prepare(`SELECT status, COUNT(*) as c FROM v_my_missions WHERE validator_id = ? GROUP BY status`).all(req.validator.id);
  for (const r of countRows) {
    if (r.status === "revision") counts.active += Number(r.c);
    else if (counts[r.status] !== undefined) counts[r.status] = Number(r.c);
  }

  res.json({ missions: rows.map(serializeRow), counts });
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

  res.json({
    task: taskData,
    rubric: VTYPES[taskData.type],
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

  const response = await db.prepare(`SELECT data_json, status FROM responses WHERE mission_id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);
  let responses = null;
  let isDraft = false;
  if (response && response.data_json) {
    try { responses = JSON.parse(response.data_json); } catch {}
    isDraft = response.status === "draft" || response.status === "revision";
  }

  res.json({
    mission: { id: m.id, name: m.name, brand: m.brand || m.builder_name, ptype: m.ptype },
    tasks,
    responses,
    isDraft,
  });
});

// PATCH /api/v/missions/:id/workspace/draft — auto-save workspace draft
router.patch("/:id/workspace/draft", async (req, res) => {
  const { answers, curIdx } = req.body || {};
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
  
  if (existing) {
    // Only update if it's currently a draft or revision (don't overwrite a submitted mission)
    if (existing.status === "draft" || existing.status === "revision") {
      await db.prepare(`UPDATE responses SET data_json = ?, submitted_at = NOW() WHERE id = ?`)
        .run(JSON.stringify(draftData), existing.id);
    }
  } else {
    await db.prepare(`INSERT INTO responses (mission_id, validator_id, data_json, status, submitted_at) VALUES (?, ?, ?, 'draft', NOW())`)
      .run(req.params.id, req.validator.id, JSON.stringify(draftData));
  }

  // Atomically sync the integer progress percentage for the Dashboard
  await db.prepare(`UPDATE v_my_missions SET progress = ?, updated_at = NOW() WHERE mission_id = ? AND validator_id = ?`)
    .run(progressPercent, req.params.id, req.validator.id);

  res.json({ ok: true, progress: progressPercent });
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
  const { answers } = req.body || {};
  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });

  const mm = await db.prepare(`SELECT status FROM v_my_missions WHERE mission_id = ? AND validator_id = ?`).get(req.params.id, req.validator.id);
  if (!mm) return res.status(404).json({ error: "You haven't accepted this mission yet" });
  if (mm.status !== "active" && mm.status !== "revision") return res.status(400).json({ error: "Mission already submitted" });

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
      await db.prepare(`
        INSERT INTO notifications (builder_id, type, icon, tone, title, body, time_label, unread)
        VALUES (?, 'submission', 'check', 'accent', 'Revision Submitted', ?, 'Just now', 1)
      `).run(m.builder_id, `A validator has updated their response for ${m.name} and is ready for your review.`);
    }
    await db.prepare(`UPDATE responses SET data_json = ?, status = 'pending', submitted_at = NOW() WHERE id = ?`)
      .run(JSON.stringify(answers || {}), existing.id);
  } else {
    await db.prepare(`INSERT INTO responses (mission_id, validator_id, data_json, status, submitted_at) VALUES (?, ?, ?, 'pending', NOW())`)
      .run(req.params.id, req.validator.id, JSON.stringify(answers || {}));
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

  const checkins = await db.prepare(`SELECT * FROM checkins WHERE mission_id = ? AND validator_id = ? ORDER BY day_number ASC`).all(req.params.id, req.validator.id).catch(() => []);
  const last = checkins[checkins.length - 1];
  const hoursSinceLast = last ? (Date.now() - new Date(last.submitted_at).getTime()) / 3600000 : 999;
  const locked = hoursSinceLast < 20;

  res.json({
    mission: { name: m.name, brand: m.brand, total_days: m.duration_days || 7, reward_total: m.reward_amount || 0 },
    checkins: Array.from({ length: m.duration_days || 7 }).map((_, i) => !!checkins[i]),
    locked,
    hoursUntilNext: locked ? Math.max(0, 20 - hoursSinceLast) : 0,
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

  res.json({ ok: true });
});

// POST /api/v/missions/:id/schedule/decline — validator declines the proposed interview time
router.post("/:id/schedule/decline", async (req, res) => {
  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });
  if (m.ptype !== "interview") return res.status(400).json({ error: "This mission does not use scheduled interviews" });

  const updateRes = await db.prepare(`UPDATE interview_schedules SET status = 'declined', responded_at = NOW() WHERE mission_id = ? AND validator_id = ? AND status = 'proposed'`)
    .run(req.params.id, req.validator.id);
  if (updateRes.changes === 0) return res.status(400).json({ error: "No pending time proposal to decline" });

  res.json({ ok: true });
});

// GET /api/v/missions/:id/poll-status
router.get("/:id/poll-status", async (req, res) => {
  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });
  if (m.ptype !== "focus") return res.status(400).json({ error: "This mission does not use focus group scheduling" });

  const poll = await db.prepare(`SELECT * FROM focus_group_polls WHERE mission_id = ?`).get(req.params.id);
  if (!poll) return res.json({ mission: { name: m.name, brand: m.brand }, poll: null });

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
    },
  });
});

// POST /api/v/missions/:id/poll/respond — validator submits their full availability (replace-all)
router.post("/:id/poll/respond", async (req, res) => {
  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });
  if (m.ptype !== "focus") return res.status(400).json({ error: "This mission does not use focus group scheduling" });

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

  await db.transaction(async (tx) => {
    await tx.prepare(`DELETE FROM focus_group_responses WHERE poll_id = ? AND validator_id = ?`).run(poll.id, req.validator.id);
    for (const slotId of slotIds) {
      await tx.prepare(`INSERT INTO focus_group_responses (poll_id, validator_id, slot_id) VALUES (?, ?, ?)`).run(poll.id, req.validator.id, slotId);
    }
  });

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

  // Time gate — must be 20h since last checkin
  const last = await db.prepare(`SELECT submitted_at FROM checkins WHERE mission_id = ? AND validator_id = ? ORDER BY submitted_at DESC LIMIT 1`).get(req.params.id, req.validator.id).catch(() => null);
  if (last) {
    const hours = (Date.now() - new Date(last.submitted_at).getTime()) / 3600000;
    if (hours < 20) return res.status(400).json({ error: "Too early — come back in " + Math.ceil(20 - hours) + " hours" });
  }

  await db.prepare(`INSERT INTO checkins (mission_id, validator_id, day_number, answers_json, screenshot_path, submitted_at) VALUES (?, ?, ?, ?, ?, NOW())`)
    .run(req.params.id, req.validator.id, day || 1, JSON.stringify(answers || {}), screenshot_path || null).catch(async () => {
      // table might not exist yet — create it
      await db.exec(`CREATE TABLE IF NOT EXISTS checkins (id SERIAL PRIMARY KEY, mission_id TEXT, validator_id INTEGER, day_number INTEGER, answers_json TEXT DEFAULT '{}', screenshot_path TEXT, submitted_at TIMESTAMPTZ DEFAULT NOW())`);
      await db.prepare(`INSERT INTO checkins (mission_id, validator_id, day_number, answers_json, screenshot_path, submitted_at) VALUES (?, ?, ?, ?, ?, NOW())`).run(req.params.id, req.validator.id, day || 1, JSON.stringify(answers || {}), screenshot_path || null);
    });

  res.json({ ok: true });
});
