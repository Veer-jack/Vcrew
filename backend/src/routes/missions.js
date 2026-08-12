import { Router } from "express";
import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";
import { catOf, ptypeOf, REWARDS, matchCount, buildTaskPrompt, TASK_GUIDANCE, PLATFORM_FEE_PCT } from "../meta.js";
import { getRealMatchCount } from "./audience.js";
import { fetchUrlContext } from "../urlContext.js";
import { levelForCompleted } from "../vmeta.js";
import { sendMissionPublished } from "../email.js";
import { recalcMissionStats } from "../stats.js";
import { notifyMatchingValidators } from "../notificationsHelper.js";
import { translateBatch } from "../translate.js";

// Lazy import to avoid circular dependency — admin.js imports db.js,
// missions.js imports admin.js only for the automod helper.
async function automodMission(id) {
  try {
    const { runAutomod } = await import("./admin.js");
    runAutomod(id);
  } catch { /* best effort — never block mission creation */ }
}

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
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "text/plain", "text/csv", "application/zip",
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("File type not allowed"));
  },
});

// Escrow is tracked per-slot (not as one aggregate rounded number) so each
// approval/rejection can release its own exact share from `pending` — the
// old aggregate rounding meant per-slot releases never summed back to zero.
function perSlotEscrow(rewardAmount) {
  const fee = Math.round((rewardAmount || 0) * PLATFORM_FEE_PCT);
  return { fee, cost: (rewardAmount || 0) + fee };
}

function kindFromMime(mime) {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.includes("word") || mime.includes("document")) return "doc";
  if (mime.includes("excel") || mime.includes("sheet") || mime === "text/csv") return "sheet";
  if (mime.includes("powerpoint") || mime.includes("presentation")) return "slides";
  return "doc";
}

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const router = Router();
router.use(authMiddleware);

function serializeMission(m) {
  return {
    id: m.id,
    name: m.name,
    brand: m.brand,
    category: m.category,
    categoryLabel: catOf(m.category).label,
    ptype: m.ptype,
    ptypeLabel: ptypeOf(m.ptype).label,
    status: m.status,
    participants: { 
      target: m.target, 
      joined: m.joined, 
      submitted: m.real_submitted !== undefined ? Number(m.real_submitted) : m.submitted 
    },
    reward: { type: m.reward_type, amount: m.reward_amount },
    completion: m.real_submitted !== undefined 
      ? Math.min(100, Math.round((Number(m.real_submitted) / Math.max(m.target || 1, 1)) * 100)) 
      : m.completion,
    spend: m.spend,
    region: m.region,
    rating: m.real_rating !== undefined && m.real_rating !== null 
      ? Math.round(Number(m.real_rating) * 10) / 10 
      : m.rating,
    description: m.description,
    deadline: m.deadline,
    audience: JSON.parse(m.audience_json || "{}"),
    tasks: JSON.parse(m.tasks_json || "[]"),
    durationDays: m.duration_days,
    createdAt: m.created_at,
  };
}

// GET /api/missions?status=&category=&q=
router.get("/", async (req, res) => {
  const { status, category, q, excludeValidatorId } = req.query;
  let sql = `
    SELECT m.*, 
      (SELECT COUNT(*) FROM responses r WHERE r.mission_id = m.id AND r.status NOT IN ('rejected', 'draft')) as real_submitted,
      (SELECT AVG(score/20.0) FROM v_my_missions v WHERE v.mission_id = m.id AND v.score > 0) as real_rating
    FROM missions m 
    WHERE m.builder_id = ?
  `;
  const params = [req.builder.id];
  if (status) { sql += ` AND status = ?`; params.push(status); }
  if (category) { sql += ` AND category = ?`; params.push(category); }
  if (q) { sql += ` AND name ILIKE ?`; params.push(`%${q}%`); }
  if (excludeValidatorId) { 
    sql += ` AND m.id NOT IN (SELECT mission_id FROM participants WHERE validator_id = ?)`; 
    params.push(excludeValidatorId); 
  }
  sql += ` ORDER BY created_at DESC`;
  const rows = await db.prepare(sql).all(...params);
  const missions = rows.map(serializeMission);

  const lang = req.builder.preferred_language;
  if (lang && lang !== "en") {
    const items = missions.flatMap(m => [
      { entityType: "mission", entityId: m.id, field: "name", text: m.name },
      { entityType: "mission", entityId: m.id, field: "description", text: m.description },
    ]);
    const translated = await translateBatch(items, lang);
    for (const m of missions) {
      m.name = translated.get(`mission:${m.id}:name`) ?? m.name;
      m.description = translated.get(`mission:${m.id}:description`) ?? m.description;
    }
  }

  res.json({ missions });
});

// GET /api/missions/invitations — every invite this builder has sent, newest first
router.get("/invitations", async (req, res) => {
  const { status } = req.query;
  let sql = `
    SELECT mi.id, mi.status, mi.created_at,
      mi.mission_id, m.name AS mission_name, m.status AS mission_status,
      mi.validator_id, v.name AS validator_name, v.city AS validator_city,
      (vs.validator_id IS NOT NULL) AS is_waitlist
    FROM mission_invitations mi
    JOIN missions m ON m.id = mi.mission_id
    JOIN validators v ON v.id = mi.validator_id
    LEFT JOIN v_saved vs ON vs.task_id = mi.mission_id AND vs.validator_id = mi.validator_id
    WHERE mi.builder_id = ?
  `;
  const params = [req.builder.id];
  if (status) { sql += ` AND mi.status = ?`; params.push(status); }
  sql += ` ORDER BY mi.created_at DESC`;

  const rows = await db.prepare(sql).all(...params);
  res.json({
    invitations: rows.map(r => ({
      id: r.id,
      status: r.status,
      createdAt: r.created_at,
      isWaitlist: r.is_waitlist,
      mission: { id: r.mission_id, name: r.mission_name, status: r.mission_status },
      validator: { id: r.validator_id, name: r.validator_name, city: r.validator_city },
    })),
  });
});

// GET /api/missions/:id
router.get("/:id", async (req, res) => {
  await recalcMissionStats(req.params.id);
  const m = await db.prepare(`
    SELECT m.*, 
      (SELECT COUNT(*) FROM responses r WHERE r.mission_id = m.id AND r.status NOT IN ('rejected', 'draft')) as real_submitted,
      (SELECT AVG(score/20.0) FROM v_my_missions v WHERE v.mission_id = m.id AND v.score > 0) as real_rating
    FROM missions m 
    WHERE m.id = ? AND m.builder_id = ?
  `).get(req.params.id, req.builder.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });

  const participants = await db.prepare(`SELECT * FROM participants WHERE mission_id = ?`).all(m.id);
  const responsesRaw = await db.prepare(`
    SELECT r.*, p.name, p.role, p.city, p.trust, v.rating as real_rating
    FROM responses r 
    LEFT JOIN participants p ON p.validator_id = r.validator_id AND p.mission_id = r.mission_id
    LEFT JOIN validators v ON v.id = r.validator_id
    WHERE r.mission_id = ? AND r.status != 'draft' ORDER BY r.id DESC
  `).all(m.id);
  
  const responses = responsesRaw.map(r => {
    let data = [];
    try { 
      const parsed = JSON.parse(r.data_json || "[]"); 
      data = Array.isArray(parsed) ? parsed : [parsed];
    } catch {}
    
    // Synthesize a generic quote from the JSON answers
    let synthQuote = "No feedback provided";
    let attachments = [];
    let tags = [];

    for (const ans of data) {
      if (!ans) continue;
      // Search the answer keys for anything that looks like text
      for (const [key, val] of Object.entries(ans)) {
        if (key === "_proof") {
          const arr = Array.isArray(val) ? val : [val];
          arr.filter(v => typeof v === 'string').forEach(v => attachments.push(v));
        } else if (typeof val === "string" && val.length > 10) {
          synthQuote = val;
        } else if (typeof val === "string" && val.length > 2 && val.length <= 15) {
          tags.push(val); // e.g. "Yes" or short tags
        }
      }
    }

    return {
      ...r,
      name: r.name || "Validator",
      role: r.role || "User",
      city: r.city || "Remote",
      trust: r.trust || 50,
      time_label: new Date(r.submitted_at).toLocaleDateString(),
      rating: r.real_rating || 5, // True lifetime rating from DB
      quote: synthQuote,
      tags: tags.slice(0, 3), // max 3 tags
      attachments,
      flagged: !!r.flagged
    };
  });
  // ---- Daily check-ins (trial/multiday missions only) ----
  // Deliberately NOT derived from `responses` — a validator can have
  // submitted real daily check-ins without ever having a `responses` row at
  // all (that table is for the final single-submission review, which for a
  // trial mission only exists once, if ever, after every required day is
  // done). Keying this off `responses` was the root cause of the Check-ins
  // tab showing empty for every validator still mid-streak, which is most
  // of a trial mission's lifetime.
  let checkins = [];
  if (m.ptype === "trial") {
    const allCheckins = await db.prepare(`SELECT * FROM checkins WHERE mission_id = ? ORDER BY validator_id, day_number ASC`).all(m.id).catch(() => []);
    const checkinsByValidator = {};
    for (const c of allCheckins) {
      if (!checkinsByValidator[c.validator_id]) checkinsByValidator[c.validator_id] = [];
      checkinsByValidator[c.validator_id].push({
        dayNumber: c.day_number,
        answers: (() => { try { return JSON.parse(c.answers_json || "{}"); } catch { return {}; } })(),
        screenshotUrl: c.screenshot_path ? `/api/uploads/${c.screenshot_path}` : null,
        submittedAt: c.submitted_at,
      });
    }
    checkins = participants
      .filter(p => checkinsByValidator[p.validator_id])
      .map(p => ({
        id: p.validator_id,
        name: p.name || "Validator",
        trust: p.trust || 50,
        checkins: checkinsByValidator[p.validator_id],
      }));
  }

  // ---- Audience snapshot ----
  const audienceFilters = JSON.parse(m.audience_json || "{}");
  const defn = Object.entries(audienceFilters)
    .filter(([, values]) => values && values.length)
    .map(([group, values]) => ({ group, values }));
  const roleColors = { Validator: "var(--t-feedback)", User: "var(--t-trial)", Tester: "var(--t-website)" };
  const roleCounts = participants.reduce((acc, p) => { acc[p.role] = (acc[p.role] || 0) + 1; return acc; }, {});
  const roleTotal = participants.length || 1;
  const segments = Object.entries(roleCounts).map(([role, n]) => ({
    l: role + "s", v: Math.round((n / roleTotal) * 100), c: roleColors[role] || "var(--t-research)",
  }));
  
  // Real database count instead of dummy total count
  const realCount = await getRealMatchCount(db, audienceFilters);

  const audience = {
    matched: realCount,
    invited: m.joined,
    defn,
    segments: segments.length ? segments : [{ l: "Members", v: 100, c: "var(--t-feedback)" }],
  };

  // ---- Payments snapshot (derived from participant rewards) ----
  // Approving a submission (Review page) pays instantly and moves the participant
  // straight to "rewarded" — there is no separate hold/release step, so this only
  // ever distinguishes "already paid" (rewarded) from "awaiting review" (submitted).
  const sumReward = (stage) => participants.filter(p => p.stage === stage).reduce((s, p) => s + (p.reward || m.reward_amount || 0), 0);
  const released = sumReward("rewarded");
  const review = sumReward("submitted");
  const fallbackBudget = m.target * m.reward_amount;
  const held = m.spend > 0 ? m.spend : fallbackBudget;
  const refundable = Math.max(0, held - released - review);
  const paymentRows = participants
    .filter(p => ["submitted", "rewarded"].includes(p.stage))
    .map(p => ({
      name: p.name,
      stage: p.stage.charAt(0).toUpperCase() + p.stage.slice(1),
      amount: p.reward || m.reward_amount || 0,
      status: p.stage === "rewarded" ? "paid" : "review",
    }));
  const payments = { held, released, pending: review, refundable, rows: paymentRows };

  // ---- Files ----
  const fileRows = await db.prepare(`SELECT * FROM mission_files WHERE mission_id = ?`).all(m.id);
  
  const allSubmissionsFiles = [];
  for (const r of responses) {
    for (const filepath of (r.attachments || [])) {
      const basename = filepath.split('/').pop() || "submission_file";
      const ext = basename.split('.').pop().toLowerCase();
      let kind = "document";
      if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) kind = "image";
      else if (["mp4", "webm", "mov"].includes(ext)) kind = "video";
      else if (["pdf"].includes(ext)) kind = "pdf";
      
      allSubmissionsFiles.push({
        name: basename,
        kind: kind,
        size: "—",
        by: r.name,
        when: r.time_label,
        filename: filepath
      });
    }
  }

  const files = {
    brief: fileRows.filter(f => f.section === "brief").map(f => ({ name: f.name, kind: f.kind, size: f.size, by: f.by, when: f.when_label, filename: f.file_path })),
    submissions: allSubmissionsFiles,
  };

  const mission = serializeMission(m);
  const lang = req.builder.preferred_language;
  if (lang && lang !== "en") {
    const translated = await translateBatch([
      { entityType: "mission", entityId: mission.id, field: "name", text: mission.name },
      { entityType: "mission", entityId: mission.id, field: "description", text: mission.description },
    ], lang);
    mission.name = translated.get(`mission:${mission.id}:name`) ?? mission.name;
    mission.description = translated.get(`mission:${mission.id}:description`) ?? mission.description;
  }

  res.json({
    mission,
    participants,
    responses,
    checkins,
    audience,
    payments,
    files,
  });
});

// POST /api/missions  — create from the Create Mission wizard
router.post("/", async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.category || !b.ptype) {
    return res.status(400).json({ error: "name, category and ptype are required" });
  }

  // Verification gating — unverified builders are limited in how many
  // missions they can run and how many participants they can target.
  const builder = await db.prepare(`SELECT verified_at FROM builders WHERE id = ?`).get(req.builder.id);
  const isVerified = !!(builder && builder.verified_at);
  const UNVERIFIED_MISSION_LIMIT = 3;
  const UNVERIFIED_PARTICIPANT_LIMIT = 25;

  if (!isVerified) {
    const activeMissions = Number((await db.prepare(`SELECT COUNT(*) AS n FROM missions WHERE builder_id = ? AND status = 'active'`).get(req.builder.id)).n);

    if (activeMissions >= UNVERIFIED_MISSION_LIMIT) {
      return res.status(403).json({
        error: `Unverified accounts can run a maximum of ${UNVERIFIED_MISSION_LIMIT} active missions. Verify your website to unlock unlimited campaigns.`,
        code: "VERIFICATION_REQUIRED",
        limit: "missions",
      });
    }

    const requestedTarget = Number(b.target) || 0;
    if (requestedTarget > UNVERIFIED_PARTICIPANT_LIMIT) {
      return res.status(403).json({
        error: `Unverified accounts can target a maximum of ${UNVERIFIED_PARTICIPANT_LIMIT} participants per mission. Verify your website to unlock larger campaigns.`,
        code: "VERIFICATION_REQUIRED",
        limit: "participants",
      });
    }
  }
  const reward = b.reward || {};
  const rewardType = REWARDS.find(r => r.id === reward.type) ? reward.type : "free";
  const id = "m_" + randomUUID().slice(0, 8);
  const status = b.status === "active" ? "active" : "draft";
  const target = Number(b.target) || 0;
  const rewardAmount = Number(reward.amount) || 0;

  try {
    await db.transaction(async (tx) => {
      let spend = 0;
      if (status === "active" && rewardType !== "free" && rewardAmount > 0 && target > 0) {
        const totalCost = perSlotEscrow(rewardAmount).cost * target;

        const updateRes = await tx.prepare(`UPDATE builders SET balance = balance - ?, pending = pending + ? WHERE id = ? AND balance >= ?`).run(totalCost, totalCost, req.builder.id, totalCost);
        if (updateRes.changes === 0) {
          throw new Error(`Insufficient funds to publish. Mission costs ₹${totalCost} (incl. ${Math.round(PLATFORM_FEE_PCT * 100)}% fee). Please top up your wallet.`);
        }
        spend = totalCost;

        const invRes = await tx.prepare(`INSERT INTO invoices (builder_id, amount, status, due_at, paid_at) VALUES (?, ?, 'paid', NOW(), NOW()) RETURNING id`).get(req.builder.id, totalCost);
        await tx.prepare(`INSERT INTO transactions (builder_id, type, amount, status, ref, detail) VALUES (?, ?, ?, 'completed', ?, ?)`).run(req.builder.id, "debit", totalCost, `INV-${invRes.id}`, `Mission escrow for ${b.name} (incl. ${Math.round(PLATFORM_FEE_PCT * 100)}% fee)`);
      }

      const durationDays = Math.min(30, Math.max(2, Number(b.durationDays) || 7));

      await tx.prepare(`
        INSERT INTO missions (id, builder_id, name, brand, category, ptype, status, target, joined, submitted,
          reward_type, reward_amount, completion, spend, region, rating, description, audience_json, tasks_json, deadline, duration_days)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, 0, ?, ?, 0, ?, ?, ?, ?, ?)
      `).run(
        id, req.builder.id, b.name, req.builder.org, b.category, b.ptype, status,
        target, rewardType, rewardAmount, spend,
        b.region || "Pan-India", b.description || "", JSON.stringify(b.audience || {}), JSON.stringify(b.tasks || []), b.deadline || null, durationDays
      );

      if (status === "active") {
        await tx.prepare(`INSERT INTO activity (builder_id, type, title, detail) VALUES (?,?,?,?)`)
          .run(req.builder.id, "mission_published", b.name, "Mission published and live");
      }
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  if (status === "active") {
    sendMissionPublished({
      builderName: req.builder.name, builderEmail: req.builder.email,
      missionName: b.name, missionId: id,
    }).catch(() => {});
    automodMission(id); // fire-and-forget, never blocks
    setImmediate(() => notifyMatchingValidators(id));
  }

  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(id);
  res.status(201).json({ mission: serializeMission(m) });
});

// PATCH /api/missions/:id  — update status / fields
router.patch("/:id", async (req, res) => {
  const m = await db.prepare(`SELECT * FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });

  const newStatus = req.body.status !== undefined ? req.body.status : m.status;
  const newTarget = req.body.target !== undefined ? Number(req.body.target) : m.target;

  // The edit-mission modal already blocks these client-side, but this route has
  // no other validation at all otherwise — anything sent here gets written
  // straight to the row, so these need to hold even if a request bypasses the UI.
  if (req.body.target !== undefined && (!Number.isFinite(newTarget) || newTarget < 1)) {
    return res.status(400).json({ error: "Target participants must be at least 1" });
  }
  if (req.body.name !== undefined && !String(req.body.name).trim()) {
    return res.status(400).json({ error: "Name is required" });
  }
  if (req.body.deadline) {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (String(req.body.deadline).slice(0, 10) < todayStr) {
      return res.status(400).json({ error: "Deadline can't be in the past" });
    }
  }

  // Gate publishing (draft → active) AND any target increase on an already-active
  // mission the same way as creating an active mission — gated on the REQUESTED
  // target, not the stale pre-update one, so a single publish+upsize request (or a
  // later upsize) can't dodge the unverified-account participant cap.
  const isPublishing = newStatus === "active" && m.status !== "active";
  const isUpsizingActive = m.status === "active" && newStatus === "active" && newTarget > m.target;
  if (isPublishing || isUpsizingActive) {
    const builder = await db.prepare(`SELECT verified_at FROM builders WHERE id = ?`).get(req.builder.id);
    const isVerified = !!(builder && builder.verified_at);
    if (!isVerified) {
      if (isPublishing) {
        const activeMissions = Number((await db.prepare(`SELECT COUNT(*) AS n FROM missions WHERE builder_id = ? AND status = 'active'`).get(req.builder.id)).n);
        if (activeMissions >= 3) {
          return res.status(403).json({
            error: "Unverified accounts can run a maximum of 3 active missions. Verify your website to unlock unlimited campaigns.",
            code: "VERIFICATION_REQUIRED", limit: "missions",
          });
        }
      }
      if (newTarget > 25) {
        return res.status(403).json({
          error: "Unverified accounts can target a maximum of 25 participants per mission. Reduce the target or verify your website.",
          code: "VERIFICATION_REQUIRED", limit: "participants",
        });
      }
    }
  }

  // Category/ptype/reward/tasks/duration are only editable while the mission
  // is still a draft — once active, changing reward/target goes through the
  // escrow-aware branches above, and category/ptype/tasks are locked in.
  const allowed = ["name", "status", "target", "deadline", "region", "description", "audience"];
  if (m.status === "draft") allowed.push("category", "ptype", "tasks", "durationDays", "reward");
  const updates = [];
  const params = [];
  let spendDelta = 0;
  
  try {
    await db.transaction(async (tx) => {
      // If moving from draft to active, we need to charge them
      if (newStatus === "active" && m.status === "draft" && m.reward_type !== "free" && m.reward_amount > 0 && newTarget > 0) {
        const totalCost = perSlotEscrow(m.reward_amount).cost * newTarget;

        const updateRes = await tx.prepare(`UPDATE builders SET balance = balance - ?, pending = pending + ? WHERE id = ? AND balance >= ?`).run(totalCost, totalCost, req.builder.id, totalCost);
        if (updateRes.changes === 0) {
          throw new Error(`Insufficient funds to publish. Mission costs ₹${totalCost} (incl. ${Math.round(PLATFORM_FEE_PCT * 100)}% fee). Please top up your wallet.`);
        }
        spendDelta = totalCost;

        const invRes = await tx.prepare(`INSERT INTO invoices (builder_id, amount, status, due_at, paid_at) VALUES (?, ?, 'paid', NOW(), NOW()) RETURNING id`).get(req.builder.id, totalCost);
        await tx.prepare(`INSERT INTO transactions (builder_id, type, amount, status, ref, detail) VALUES (?, ?, ?, 'completed', ?, ?)`).run(req.builder.id, "debit", totalCost, `INV-${invRes.id}`, `Mission escrow for ${m.name} (incl. ${Math.round(PLATFORM_FEE_PCT * 100)}% fee)`);
      } else if (m.status === "active" && newStatus === "active" && req.body.target !== undefined && newTarget !== m.target) {
        // Rescaling target on an already-active mission. Upscaling must charge escrow
        // for the new slots right now — publish-time escrow only ever covered the
        // target that existed at that moment. Downscaling can only remove capacity
        // nobody has joined yet (never touches an approved/rejected slot's escrow),
        // and refunds exactly that — using the same perSlotEscrow() the approve/reject
        // routes use, so this can't drift into a second, disagreeing accounting rule.
        if (newTarget < m.joined) {
          throw new Error(`Cannot reduce target below ${m.joined} — that many validators have already joined this mission.`);
        }
        if (m.reward_type !== "free" && m.reward_amount > 0) {
          const perSlot = perSlotEscrow(m.reward_amount).cost;
          const costDelta = perSlot * (newTarget - m.target);

          if (costDelta > 0) {
            const updateRes = await tx.prepare(`UPDATE builders SET balance = balance - ?, pending = pending + ? WHERE id = ? AND balance >= ?`).run(costDelta, costDelta, req.builder.id, costDelta);
            if (updateRes.changes === 0) {
              throw new Error(`Insufficient funds to add ${newTarget - m.target} slot(s). Additional escrow needed: ₹${costDelta}. Please top up your wallet.`);
            }
            const invRes = await tx.prepare(`INSERT INTO invoices (builder_id, amount, status, due_at, paid_at) VALUES (?, ?, 'paid', NOW(), NOW()) RETURNING id`).get(req.builder.id, costDelta);
            await tx.prepare(`INSERT INTO transactions (builder_id, type, amount, status, ref, detail) VALUES (?, 'debit', ?, 'completed', ?, ?)`)
              .run(req.builder.id, costDelta, `INV-${invRes.id}`, `Escrow top-up for ${newTarget - m.target} additional slot(s) on ${m.name}`);
          } else {
            const refund = -costDelta;
            await tx.prepare(`UPDATE builders SET balance = balance + ?, pending = pending - ? WHERE id = ?`).run(refund, refund, req.builder.id);
            await tx.prepare(`INSERT INTO transactions (builder_id, type, amount, status, ref, detail) VALUES (?, 'credit', ?, 'completed', ?, ?)`)
              .run(req.builder.id, refund, null, `Escrow refund for ${m.target - newTarget} removed slot(s) on ${m.name}`);
          }
          spendDelta = costDelta;
        }
      }

      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          if (key === "audience") {
            // Re-targeting only affects future matching (notifyMatchingValidators, Audience
            // Explorer) — already-joined participants are untouched, by design.
            updates.push(`audience_json = ?`);
            params.push(JSON.stringify(req.body.audience || {}));
          } else if (key === "tasks") {
            updates.push(`tasks_json = ?`);
            params.push(JSON.stringify(req.body.tasks || []));
          } else if (key === "durationDays") {
            updates.push(`duration_days = ?`);
            params.push(Math.min(30, Math.max(2, Number(req.body.durationDays) || 7)));
          } else if (key === "reward") {
            const reward = req.body.reward || {};
            const rewardType = REWARDS.find(r => r.id === reward.type) ? reward.type : "free";
            updates.push(`reward_type = ?, reward_amount = ?`);
            params.push(rewardType, Number(reward.amount) || 0);
          } else {
            updates.push(`${key} = ?`);
            params.push(req.body[key]);
          }
        }
      }
      if (spendDelta !== 0) {
        updates.push(`spend = spend + ?`);
        params.push(spendDelta);
      }
      
      if (!updates.length) throw new Error("No valid fields to update");
      params.push(m.id);
      await tx.prepare(`UPDATE missions SET ${updates.join(", ")} WHERE id = ?`).run(...params);
      
      if (newStatus === "active" && m.status === "draft") {
        await tx.prepare(`INSERT INTO activity (builder_id, type, title, detail) VALUES (?,?,?,?)`)
          .run(req.builder.id, "mission_published", m.name, "Mission published and live");
      }

      // Escrow Refund Logic for terminating missions
      const terminalStates = ["closed", "completed", "archived"];
      if (terminalStates.includes(newStatus) && !terminalStates.includes(m.status)) {
        // Approved slots already released their own escrow share (reward + fee) at
        // approval time (see the approve route) — everything else (never submitted,
        // still pending review, or rejected and not yet refilled) still owes a refund,
        // since a rejected slot's escrow stays parked in pending in case it gets refilled.
        const approved = await tx.prepare(`SELECT COUNT(*) as c FROM responses WHERE mission_id = ? AND status = 'approved'`).get(m.id);
        const alreadyReleased = (parseInt(approved.c, 10) || 0) * perSlotEscrow(m.reward_amount).cost;
        const refund = Math.max(0, (m.spend || 0) - alreadyReleased);
        if (refund > 0) {
          await tx.prepare(`UPDATE builders SET balance = balance + ?, pending = pending - ? WHERE id = ?`).run(refund, refund, req.builder.id);
          await tx.prepare(`INSERT INTO transactions (builder_id, type, amount, status, ref, detail) VALUES (?, 'credit', ?, 'completed', ?, ?)`)
            .run(req.builder.id, refund, null, `Escrow refund for closed mission ${m.name}`);
          
          // Set spend to exactly what was released so future transitions don't double refund
          await tx.prepare(`UPDATE missions SET spend = ? WHERE id = ?`).run(alreadyReleased, m.id);
        }

        // Anyone still mid-flow (never submitted, or asked for a revision)
        // stops being "active" the moment the mission itself terminates —
        // otherwise they keep showing up under the Active tab with a working
        // Resume button, and the poll/workspace routes they can still reach
        // have no idea the mission is over.
        const closedReason = newStatus === "completed"
          ? `The mission "${m.name}" was marked completed by the builder before you finished.`
          : newStatus === "archived"
          ? `The mission "${m.name}" was archived by the builder before you finished.`
          : `The mission "${m.name}" was closed by the builder before you finished.`;
        await tx.prepare(`UPDATE v_my_missions SET status = 'closed', reason = ? WHERE mission_id = ? AND status IN ('active', 'revision')`)
          .run(closedReason, m.id);
      }

      // Notify saved users when mission completes or closes
      if ((newStatus === "completed" && m.status !== "completed") || (newStatus === "closed" && m.status !== "closed")) {
        const isCompleted = newStatus === "completed";
        const title = isCompleted ? "Mission Completed" : "Mission Closed";
        const body = isCompleted 
          ? `The mission "${m.name}" you saved has been completed by the builder.` 
          : `The mission "${m.name}" you saved has been closed by the builder. We'll meet you in another mission!`;
        const icon = isCompleted ? "checkCircle" : "flag";
        
        // Find everyone who saved it or is participating
        const validatorsToNotify = await tx.prepare(`
          SELECT DISTINCT validator_id 
          FROM (
            SELECT validator_id FROM v_saved WHERE task_id = ?
            UNION
            SELECT validator_id FROM v_my_missions WHERE mission_id = ?
          ) as combined
        `).all(m.id, m.id);
        
        for (const sv of validatorsToNotify) {
          // Send polite notification
          await tx.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'mission', 'mission_completed', ?, 'muted', ?, ?, 'Just now', 1, ?)`)
            .run(sv.validator_id, icon, title, body, m.id);
        }
      }

      // Notify active validators if mission details change
      if (m.status === "active" && newStatus === "active" && updates.length > 0) {
        // Skip if only audience changed
        const onlyAudience = updates.length === 1 && updates[0].includes("audience_json");
        if (!onlyAudience) {
          const activeValidators = await tx.prepare(`SELECT validator_id FROM v_my_missions WHERE mission_id = ? AND status IN ('active', 'revision')`).all(m.id);
          for (const av of activeValidators) {
            await tx.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'mission', 'mission_updated', 'info', 'primary', ?, ?, 'Just now', 1, ?)`)
              .run(av.validator_id, "Mission Updated", `The builder has updated the requirements or details for "${m.name}". Please review them.`, m.id);
          }
        }
      }
    });
  } catch (err) {
    if (err.message === "No valid fields to update") return res.status(400).json({ error: err.message });
    return res.status(400).json({ error: err.message });
  }
  
  if (newStatus === "active" && m.status === "draft") {
    sendMissionPublished({
      builderName: req.builder.name, builderEmail: req.builder.email,
      missionName: m.name, missionId: m.id,
    }).catch(() => {});
    automodMission(m.id);
    setImmediate(() => notifyMatchingValidators(m.id));
  }

  const updated = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(m.id);
  res.json({ mission: serializeMission(updated) });
});

// PATCH /api/missions/:id/participants/:pid — move kanban stage
// Stages a builder can set by hand on the Kanban board. "rewarded" is deliberately
// excluded — it must only be reached by actually approving a submission (which pays
// the validator atomically), never by a manual drag that moves no money.
const MANUAL_PARTICIPANT_STAGES = ["invited", "accepted", "started", "submitted"];

router.patch("/:id/participants/:pid", async (req, res) => {
  const m = await db.prepare(`SELECT id FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });
  const { stage } = req.body || {};
  if (!stage) return res.status(400).json({ error: "stage is required" });
  if (!MANUAL_PARTICIPANT_STAGES.includes(stage)) {
    return res.status(400).json({ error: "This stage can only be reached by approving the validator's submission." });
  }

  const p = await db.prepare(`SELECT * FROM participants WHERE id = ? AND mission_id = ?`).get(req.params.pid, m.id);
  if (!p) return res.status(404).json({ error: "Participant not found" });

  await db.prepare(`UPDATE participants SET stage = ? WHERE id = ?`).run(stage, p.id);
  
  await db.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread) VALUES (?, 'mission', 'stage_update', 'info', 'primary', ?, ?, 'Just now', 1)`)
    .run(p.validator_id, "Status Updated", `Your status for ${m.name} was changed to: ${stage}.`);

  res.json({ participant: { ...p, stage } });
});

// PATCH /api/missions/:id/responses/:rid — toggle flag
router.patch("/:id/responses/:rid", async (req, res) => {
  const m = await db.prepare(`SELECT id FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });
  const r = await db.prepare(`SELECT * FROM responses WHERE id = ? AND mission_id = ?`).get(req.params.rid, m.id);
  if (!r) return res.status(404).json({ error: "Response not found" });

  const flagged = req.body.flagged ? 1 : 0;
  await db.prepare(`UPDATE responses SET flagged = ? WHERE id = ?`).run(flagged, r.id);
  res.json({ ok: true, flagged: !!flagged });
});

// POST /api/missions/:id/files?section=brief — upload a file to a mission
router.post("/:id/files", upload.single("file"), async (req, res) => {
  const m = await db.prepare(`SELECT * FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!m) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(404).json({ error: "Mission not found" });
  }
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const section = ["brief", "submissions"].includes(req.query.section) ? req.query.section : "brief";
  const kind = kindFromMime(req.file.mimetype);
  const size = humanSize(req.file.size);
  const now = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  await db.prepare(`
    INSERT INTO mission_files (mission_id, section, name, kind, size, by, when_label, file_path, mime_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(m.id, section, req.file.originalname, kind, size, req.builder.name, now, req.file.filename, req.file.mimetype);

  res.status(201).json({
    ok: true,
    file: { name: req.file.originalname, kind, size, by: req.builder.name, when: now, filename: req.file.filename },
  });
});

// DELETE /api/missions/:id/files/:filename — delete a brief file
router.delete("/:id/files/:filename", async (req, res) => {
  const m = await db.prepare(`SELECT id FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });

  const row = await db.prepare(`SELECT * FROM mission_files WHERE mission_id = ? AND file_path = ?`).get(m.id, req.params.filename);
  if (!row) return res.status(404).json({ error: "File not found" });

  await db.prepare(`DELETE FROM mission_files WHERE id = ?`).run(row.id);
  const filePath = path.join(UPLOADS_DIR, req.params.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  res.json({ ok: true });
});

// POST /api/missions/generate-tasks — AI test case generator
router.post("/generate-tasks", authMiddleware, async (req, res) => {
  const { description, url, platform, goals, targetUsers, category, ptype, urlContext } = req.body || {};
  if (!description && !url) return res.status(400).json({ error: "Description or URL required" });

  const prompt = buildTaskPrompt({ description, url, platform, goals, targetUsers, category, ptype, urlContext });

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message.content.trim();
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    // AI generation failed (network/parse/quota error) — degrade to a
    // type-appropriate hand-written fallback instead of a hard error, so the
    // wizard always shows something useful. "ptest" is the closest thing to
    // a generic hands-on mission, used when ptype is missing/unrecognized.
    const fallbackTasks = TASK_GUIDANCE[ptype]?.fallback || TASK_GUIDANCE.ptest.fallback;
    res.json({ tasks: fallbackTasks, fallback: true });
  }
});

// POST /api/missions/fetch-url-context — fetch and extract basic context from a product URL
router.post("/fetch-url-context", authMiddleware, async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "URL required" });
  const context = await fetchUrlContext(url);
  res.json({ context });
});

// GET /api/missions/:id/shipments — builder views sample-shipment status for their mission
router.get("/:id/shipments", authMiddleware, async (req, res) => {
  const mission = await db.prepare(`SELECT id, category FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });

  const rows = await db.prepare(`
    SELECT p.validator_id, v.name,
      v.address_line1, v.address_line2, v.address_city, v.address_state, v.address_postal_code, v.address_country,
      s.status, s.tracking_number, s.carrier, s.shipped_at, s.received_at
    FROM participants p
    JOIN validators v ON v.id = p.validator_id
    LEFT JOIN sample_shipments s ON s.mission_id = p.mission_id AND s.validator_id = p.validator_id
    WHERE p.mission_id = ?
    ORDER BY p.joined_at ASC
  `).all(req.params.id);

  res.json({
    shipments: rows.map(r => ({
      validatorId: r.validator_id, name: r.name,
      address: { line1: r.address_line1, line2: r.address_line2, city: r.address_city, state: r.address_state, postalCode: r.address_postal_code, country: r.address_country },
      status: r.status || "awaiting_shipment",
      tracking_number: r.tracking_number, carrier: r.carrier, shipped_at: r.shipped_at, received_at: r.received_at,
    })),
  });
});

// POST /api/missions/:id/shipments/:validatorId/ship — builder marks a sample shipped
router.post("/:id/shipments/:validatorId/ship", authMiddleware, async (req, res) => {
  const mission = await db.prepare(`SELECT id FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });

  const { trackingNumber, carrier } = req.body || {};
  const updateRes = await db.prepare(`UPDATE sample_shipments SET status = 'shipped', tracking_number = ?, carrier = ?, shipped_at = NOW() WHERE mission_id = ? AND validator_id = ? AND status = 'awaiting_shipment'`)
    .run(trackingNumber || null, carrier || null, req.params.id, req.params.validatorId);
  if (updateRes.changes === 0) return res.status(400).json({ error: "This shipment is not awaiting shipment (already shipped, or the validator hasn't accepted this mission)" });

  await db.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread) VALUES (?, 'system', 'shipped', 'truck', 'primary', ?, ?, 'Just now', 1)`)
    .run(req.params.validatorId, "Sample Shipped", `The sample for ${mission.name} has been shipped! Tracking: ${trackingNumber || "N/A"}`);

  res.json({ ok: true });
});

// GET /api/missions/:id/schedules — builder views interview-schedule status for their mission
router.get("/:id/schedules", authMiddleware, async (req, res) => {
  const mission = await db.prepare(`SELECT id, ptype FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });

  const rows = await db.prepare(`
    SELECT p.validator_id, v.name, s.status, s.scheduled_at, s.meeting_link, s.validator_notes
    FROM participants p
    JOIN validators v ON v.id = p.validator_id
    LEFT JOIN interview_schedules s ON s.mission_id = p.mission_id AND s.validator_id = p.validator_id
    WHERE p.mission_id = ?
    ORDER BY p.joined_at ASC
  `).all(req.params.id);

  const schedules = rows.map(r => ({
    validatorId: r.validator_id, name: r.name,
    status: r.status || null, scheduled_at: r.scheduled_at, meeting_link: r.meeting_link,
    notes: r.validator_notes ? JSON.parse(r.validator_notes) : null
  }));

  const lang = req.builder.preferred_language;
  const withReason = schedules.filter(s => s.notes?.reason);
  if (lang && lang !== "en" && withReason.length) {
    const idOf = (s) => `${req.params.id}_${s.validatorId}`;
    const translated = await translateBatch(
      withReason.map(s => ({ entityType: "interview_decline_reason", entityId: idOf(s), field: "reason", text: s.notes.reason })),
      lang
    );
    for (const s of withReason) {
      s.notes.reason = translated.get(`interview_decline_reason:${idOf(s)}:reason`) ?? s.notes.reason;
    }
  }

  res.json({ schedules });
});

// POST /api/missions/:id/schedules/:validatorId/propose — builder proposes (or re-proposes) an interview time
router.post("/:id/schedules/:validatorId/propose", authMiddleware, async (req, res) => {
  const mission = await db.prepare(`SELECT id FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });

  const { scheduledAt, meetingLink } = req.body || {};
  if (!scheduledAt) return res.status(400).json({ error: "A scheduled time is required" });

  const result = await db.prepare(`
    INSERT INTO interview_schedules (mission_id, validator_id, status, scheduled_at, meeting_link)
    VALUES (?, ?, 'proposed', ?, ?)
    ON CONFLICT (mission_id, validator_id) DO UPDATE
      SET status = 'proposed', scheduled_at = EXCLUDED.scheduled_at, meeting_link = EXCLUDED.meeting_link, responded_at = NULL, completed_at = NULL
      WHERE interview_schedules.status = 'declined'
  `).run(req.params.id, req.params.validatorId, scheduledAt, meetingLink || null);
  if (result.changes === 0) return res.status(400).json({ error: "This validator already has a pending or completed interview schedule" });

  const m = await db.prepare(`SELECT name, builder_id FROM missions WHERE id = ?`).get(req.params.id);
  const b = await db.prepare(`SELECT org FROM builders WHERE id = ?`).get(m.builder_id);
  await db.prepare(`
    INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread, target_id)
    VALUES (?, 'invite', 'schedule_proposed', 'calendar', 'primary', 'Interview Scheduled', ?, 'Just now', 1, ?)
  `).run(req.params.validatorId, `${b?.org || 'The builder'} has proposed a time for an interview for "${m?.name || 'Unknown'}". Please check your workspace.`, req.params.id);

  res.json({ ok: true });
});

// POST /api/missions/:id/schedules/:validatorId/complete — builder marks the interview as having happened
router.post("/:id/schedules/:validatorId/complete", authMiddleware, async (req, res) => {
  const mission = await db.prepare(`SELECT id, name FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });

  const updateRes = await db.prepare(`UPDATE interview_schedules SET status = 'completed', completed_at = NOW() WHERE mission_id = ? AND validator_id = ? AND status = 'accepted'`)
    .run(req.params.id, req.params.validatorId);
  if (updateRes.changes === 0) return res.status(400).json({ error: "This interview is not in an accepted state" });

  await db.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'mission', 'interview_completed', 'checkCircle', 'success', 'Interview Marked Complete', ?, 'Just now', 1, ?)`)
    .run(req.params.validatorId, `Your interview for "${mission.name}" is marked as done — submit your debrief in the workspace to get paid.`, req.params.id);

  res.json({ ok: true });
});

// DELETE /api/missions/:id/participants/:validatorId — remove a participant from a mission
router.delete("/:id/participants/:validatorId", authMiddleware, async (req, res) => {
  const mission = await db.prepare(`SELECT id, name FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });

  try {
    await db.transaction(async (tx) => {
      const del = await tx.prepare(`DELETE FROM participants WHERE mission_id = ? AND validator_id = ?`).run(req.params.id, req.params.validatorId);
      if (del.changes === 0) throw new Error("Participant not found");

      await tx.prepare(`UPDATE v_my_missions SET status = 'rejected', reason = 'Removed by builder due to inactivity' WHERE mission_id = ? AND validator_id = ?`)
        .run(req.params.id, req.params.validatorId);

      await tx.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread) VALUES (?, 'mission', 'removed', 'xCircle', 'danger', 'Removed from Mission', ?, 'Just now', 1)`)
        .run(req.params.validatorId, `You have been removed from the mission "${mission.name}" for not completing required steps (e.g. scheduling).`);

      const m = await tx.prepare(`SELECT joined, target FROM missions WHERE id = ? FOR UPDATE`).get(req.params.id);
      if (m) {
        const wasFull = m.joined >= m.target && m.target > 0;
        await tx.prepare(`UPDATE missions SET joined = GREATEST(0, joined - 1) WHERE id = ?`).run(req.params.id);

        if (wasFull) {
          const savedVals = await tx.prepare(`SELECT validator_id FROM v_saved WHERE task_id = ?`).all(req.params.id);
          for (const sv of savedVals) {
            await tx.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?,?,?,?,?,?,?,?,1,?)`)
              .run(sv.validator_id, "mission", "slot_available", "bell", "success", "Slot Available!", `Hurry up! A slot just opened up for "${mission.name}".`, "Just now", req.params.id);
          }
        }
      }

      await recalcMissionStats(req.params.id, tx);
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/missions/:id/poll — builder views the focus-group poll for their mission
router.get("/:id/poll", authMiddleware, async (req, res) => {
  const mission = await db.prepare(`SELECT id FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });

  const poll = await db.prepare(`SELECT * FROM focus_group_polls WHERE mission_id = ?`).get(req.params.id);
  if (!poll) return res.json({ poll: null });

  const slots = await db.prepare(`
    SELECT s.id, s.scheduled_at, COUNT(r.id) as tally,
           COALESCE(json_agg(json_build_object('id', v.id, 'name', v.name)) FILTER (WHERE v.id IS NOT NULL), '[]') as voters_json
    FROM focus_group_slots s
    LEFT JOIN focus_group_responses r ON r.slot_id = s.id
    LEFT JOIN validators v ON r.validator_id = v.id
    WHERE s.poll_id = ?
    GROUP BY s.id, s.scheduled_at
    ORDER BY s.scheduled_at ASC
  `).all(poll.id);

  const missingParticipants = await db.prepare(`
    SELECT p.validator_id as id, p.name 
    FROM participants p
    LEFT JOIN focus_group_responses r ON r.validator_id = p.validator_id AND r.poll_id = ?
    WHERE p.mission_id = ? AND p.stage != 'rejected' AND r.id IS NULL
  `).all(poll.id, req.params.id);

  res.json({
    poll: {
      status: poll.status,
      meetingLink: poll.meeting_link,
      lockedSlotId: poll.locked_slot_id,
      missing: missingParticipants.map(p => ({ id: p.id, name: p.name })),
      slots: slots.map(s => {
        let parsed = [];
        try { parsed = typeof s.voters_json === "string" ? JSON.parse(s.voters_json) : s.voters_json; } catch {}
        return { id: s.id, scheduledAt: s.scheduled_at, tally: Number(s.tally), voters: parsed };
      }),
    },
  });
});

// POST /api/missions/:id/poll — builder creates the poll (once per mission)
router.post("/:id/poll", authMiddleware, async (req, res) => {
  const mission = await db.prepare(`SELECT id, name, status, focus_group_poll_restarted_at FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });
  if (mission.status !== "active") return res.status(400).json({ error: "This mission is no longer active — scheduling is closed." });

  const { meetingLink, slots } = req.body || {};
  if (!Array.isArray(slots) || slots.length < 2 || slots.length > 4) return res.status(400).json({ error: "Between 2 and 4 candidate time slots are required" });

  // A restart leaves the "restarted, not yet replaced" flag set on the
  // mission until this moment — this new poll IS that replacement, so it
  // carries the fact forward (validators see a "new times" banner on it)
  // and the flag is cleared since the gap it tracked is now filled.
  const isRestart = !!mission.focus_group_poll_restarted_at;

  let pollId;
  try {
    await db.transaction(async (tx) => {
      const pollRes = await tx.prepare(`INSERT INTO focus_group_polls (mission_id, meeting_link, status, is_restart) VALUES (?, ?, 'open', ?)`).run(req.params.id, meetingLink || null, isRestart);
      pollId = pollRes.lastInsertRowid;
      for (const scheduledAt of slots) {
        await tx.prepare(`INSERT INTO focus_group_slots (poll_id, scheduled_at) VALUES (?, ?)`).run(pollId, scheduledAt);
      }
      if (isRestart) {
        await tx.prepare(`UPDATE missions SET focus_group_poll_restarted_at = NULL WHERE id = ?`).run(mission.id);
      }

      // Notify all active validators to select their availability
      const activeValidators = await tx.prepare(`SELECT validator_id FROM v_my_missions WHERE mission_id = ? AND status = 'active'`).all(mission.id);
      const title = isRestart ? "New Focus Group Times" : "Focus Group Scheduling";
      const body = isRestart
        ? `The builder restarted scheduling for "${mission.name}" with new proposed times — please vote again.`
        : `Please select your availability for the focus group: "${mission.name}".`;
      for (const av of activeValidators) {
        await tx.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'mission', 'poll_created', 'calendar', 'primary', ?, ?, 'Just now', 1, ?)`)
          .run(av.validator_id, title, body, mission.id);
      }
    });
  } catch {
    return res.status(400).json({ error: "A poll already exists for this mission" });
  }

  res.json({ ok: true, pollId });
});

// DELETE /api/missions/:id/poll — builder deletes/restarts a focus group poll
router.delete("/:id/poll", authMiddleware, async (req, res) => {
  const mission = await db.prepare(`SELECT id, name, status FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });
  if (mission.status !== "active") return res.status(400).json({ error: "This mission is no longer active — scheduling is closed." });

  await db.transaction(async (tx) => {
    await tx.prepare(`DELETE FROM focus_group_polls WHERE mission_id = ?`).run(req.params.id);
    await tx.prepare(`UPDATE missions SET focus_group_poll_restarted_at = NOW() WHERE id = ?`).run(mission.id);

    // Whoever had already voted on the poll that just got wiped deserves to
    // know why it vanished, before the new one (if any) shows up.
    const activeValidators = await tx.prepare(`SELECT validator_id FROM v_my_missions WHERE mission_id = ? AND status = 'active'`).all(mission.id);
    for (const av of activeValidators) {
      await tx.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'mission', 'poll_restarted', 'refresh', 'muted', ?, ?, 'Just now', 1, ?)`)
        .run(av.validator_id, "Focus Group Poll Restarted", `The builder restarted scheduling for "${mission.name}". New times are coming soon.`, mission.id);
    }
  });

  res.json({ ok: true });
});

// POST /api/missions/:id/poll/lock — builder locks in a candidate slot
router.post("/:id/poll/lock", authMiddleware, async (req, res) => {
  const mission = await db.prepare(`SELECT id, name, status FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });
  if (mission.status !== "active") return res.status(400).json({ error: "This mission is no longer active — scheduling is closed." });

  const { slotId } = req.body || {};
  if (!slotId) return res.status(400).json({ error: "slotId is required" });

  // Read-only, purely to give a specific error message — the actual
  // enforcement is the `scheduled_at > NOW()` guard baked into the atomic
  // UPDATE below, so a slot can't slip past this check and still get locked
  // in the gap between this SELECT and that write.
  const targetSlot = await db.prepare(`SELECT scheduled_at FROM focus_group_slots WHERE id = ?`).get(slotId);
  if (targetSlot && new Date(targetSlot.scheduled_at) < new Date()) {
    return res.status(400).json({ error: "This time has already passed — pick a different slot or restart the poll." });
  }

  let updateRes;
  await db.transaction(async (tx) => {
    updateRes = await tx.prepare(`
      UPDATE focus_group_polls SET status = 'locked', locked_slot_id = ?
      WHERE mission_id = ? AND status = 'open'
        AND EXISTS (SELECT 1 FROM focus_group_slots WHERE id = ? AND poll_id = focus_group_polls.id AND scheduled_at > NOW())
    `).run(slotId, req.params.id, slotId);
    
    if (updateRes.changes > 0) {
      const poll = await tx.prepare(`SELECT id FROM focus_group_polls WHERE mission_id = ?`).get(req.params.id);
      const activeValidators = await tx.prepare(`SELECT validator_id FROM v_my_missions WHERE mission_id = ? AND status = 'active'`).all(mission.id);
      const selectedValidators = await tx.prepare(`SELECT validator_id FROM focus_group_responses WHERE poll_id = ? AND slot_id = ?`).all(poll.id, slotId);
      const selectedSet = new Set(selectedValidators.map(v => v.validator_id));

      for (const av of activeValidators) {
        if (selectedSet.has(av.validator_id)) {
          await tx.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'mission', 'poll_locked', 'calendar', 'success', ?, ?, 'Just now', 1, ?)`)
            .run(av.validator_id, "Focus Group Scheduled", `You have been selected for the focus group: "${mission.name}". Check the time and meeting link!`, mission.id);
        } else {
          await tx.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'mission', 'poll_locked', 'info', 'muted', ?, ?, 'Just now', 1, ?)`)
            .run(av.validator_id, "Focus Group Scheduled", `The focus group for "${mission.name}" has been scheduled, but your availability was not a match this time.`, mission.id);
        }
      }
    }
  });

  if (!updateRes || updateRes.changes === 0) return res.status(400).json({ error: "Cannot lock this poll (already locked, the slot doesn't belong to this poll, or its time has passed)" });

  res.json({ ok: true });
});

// POST /api/missions/:id/poll/complete — builder marks the focus group session as having happened
router.post("/:id/poll/complete", authMiddleware, async (req, res) => {
  const mission = await db.prepare(`SELECT id, name, status FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });
  if (mission.status !== "active") return res.status(400).json({ error: "This mission is no longer active — scheduling is closed." });

  const poll = await db.prepare(`UPDATE focus_group_polls SET status = 'completed', completed_at = NOW() WHERE mission_id = ? AND status = 'locked' RETURNING id, locked_slot_id`)
    .get(req.params.id);
  if (!poll) return res.status(400).json({ error: "This poll is not in a locked state" });

  const attendees = await db.prepare(`SELECT validator_id FROM focus_group_responses WHERE poll_id = ? AND slot_id = ?`).all(poll.id, poll.locked_slot_id);
  for (const a of attendees) {
    await db.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'mission', 'focus_completed', 'checkCircle', 'success', 'Focus Group Marked Complete', ?, 'Just now', 1, ?)`)
      .run(a.validator_id, `Your focus group session for "${mission.name}" is marked as done — submit your debrief in the workspace to get paid.`, req.params.id);
  }

  res.json({ ok: true });
});

// GET /api/missions/:id/submissions — founder reviews submissions
router.get("/:id/submissions", authMiddleware, async (req, res) => {
  const mission = await db.prepare(`SELECT * FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });

  const responses = await db.prepare(`
    SELECT r.*, v.name, v.handle, v.rating as trust_score, p.joined_at
    FROM responses r
    LEFT JOIN validators v ON v.id = r.validator_id
    LEFT JOIN participants p ON p.mission_id = r.mission_id AND p.validator_id = r.validator_id
    WHERE r.mission_id = ? AND r.status != 'draft'
    ORDER BY r.submitted_at DESC
  `).all(req.params.id);

  let missionTasks = [];
  try {
    missionTasks = mission.tasks_json ? JSON.parse(mission.tasks_json) : [];
  } catch {}

  let checkinsByValidator = {};
  if (mission.ptype === "trial") {
    const allCheckins = await db.prepare(`SELECT * FROM checkins WHERE mission_id = ? ORDER BY validator_id, day_number ASC`).all(req.params.id).catch(() => []);
    for (const c of allCheckins) {
      if (!checkinsByValidator[c.validator_id]) checkinsByValidator[c.validator_id] = [];
      checkinsByValidator[c.validator_id].push({
        dayNumber: c.day_number,
        answers: (() => { try { return JSON.parse(c.answers_json || "{}"); } catch { return {}; } })(),
        screenshotUrl: c.screenshot_path ? `/api/uploads/${c.screenshot_path}` : null,
        submittedAt: c.submitted_at,
      });
    }
  }

  res.json({
    mission: { id: mission.id, name: mission.name, target: mission.target },
    submissions: responses.map(r => {
      let data = [];
      try { 
        const parsed = r.data_json ? JSON.parse(r.data_json) : []; 
        data = Array.isArray(parsed) ? parsed : [parsed];
      } catch {}
      
      const breakdown = data.map((ans, i) => {
        let taskTitle = `Task ${i + 1}`;
        if (missionTasks[i] && missionTasks[i].title) {
          taskTitle = missionTasks[i].title;
        } else if (missionTasks[i] && missionTasks[i].prompt) {
          taskTitle = missionTasks[i].prompt;
        } else if (typeof missionTasks[i] === "string") {
          taskTitle = missionTasks[i];
        }

        if (typeof ans === 'string') {
          return {
            t: taskTitle,
            rating: 0,
            ans,
            details: [],
            attachments: [],
          };
        }

        let attachments = [];
        let details = [];
        for (const [key, val] of Object.entries(ans)) {
          if (key === "_proof") {
            const arr = Array.isArray(val) ? val : [val];
            attachments = arr.filter(v => typeof v === 'string').map(v => v.startsWith("/api") ? v : `/api/uploads/${v}`);
            continue;
          }

          let displayLabel = key;
          let displayValue = String(val);

          if (typeof val === "object" && val !== null) {
            if (val._detail) {
              const baseVal = Object.keys(val).filter(k => !isNaN(k)).map(k => val[k]).join("");
              displayValue = baseVal ? `${baseVal} (Detail: ${val._detail})` : val._detail;
            } else {
              displayValue = JSON.stringify(val);
            }
          }

          if (missionTasks[i] && Array.isArray(missionTasks[i].questions)) {
            const isDetail = key.endsWith("_detail");
            const baseKey = isDetail ? key.replace("_detail", "") : key;
            const qMatch = missionTasks[i].questions.find(q => q.id === baseKey);
            
            if (qMatch) {
              displayLabel = isDetail ? `Detail: ${qMatch.text}` : qMatch.text;
            }
          }
          
          details.push({ label: displayLabel, value: displayValue });
        }

        return {
          t: taskTitle,
          rating: 0, // builders will rate it overall
          details,
          attachments: attachments.filter(Boolean),
        };
      }).filter(Boolean);

      return {
        id: r.id,
        name: r.name || "Validator",
        city: "Remote",
        trust: Math.round((r.trust_score || 0) * 10),
        status: r.status || "pending",
        quality: r.flagged ? "flagged" : "medium",
        date: new Date(r.submitted_at).toLocaleDateString(),
        mins: r.joined_at ? Math.max(1, Math.round((new Date(r.submitted_at) - new Date(r.joined_at)) / 60000)) : 20,
        tasks: breakdown.length > 0 ? `${breakdown.length}/${breakdown.length}` : "All",
        breakdown,
        data,
        checkins: checkinsByValidator[r.validator_id] || [],
      };
    }),
  });
});

// POST /api/missions/:id/submissions/:responseId/approved
router.post("/:id/submissions/:responseId/approved", authMiddleware, async (req, res) => {
  const rating = Number(req.body.rating) || 5;
  if (rating < 1 || rating > 5) return res.status(400).json({ error: "Rating must be between 1 and 5" });

  await db.transaction(async (tx) => {
    const mission = await tx.prepare(`SELECT * FROM missions WHERE id = ? AND builder_id = ? FOR UPDATE`).get(req.params.id, req.builder.id);
    if (!mission) throw new Error("Mission not found");
    
    const response = await tx.prepare(`SELECT validator_id, status FROM responses WHERE id = ? AND mission_id = ? FOR UPDATE`).get(req.params.responseId, req.params.id);
    if (!response) throw new Error("Submission not found");
    if (response.status === 'approved') throw new Error("Submission already approved");

    let reward = mission.reward_amount || 0;
    const slotCost = perSlotEscrow(reward).cost; // reward + this slot's share of the platform fee

    if (reward > 0) {
      // Release this slot's full escrow (reward + fee) from pending — the fee is
      // realized as platform revenue here, not left sitting in pending until the
      // mission is eventually closed (balance was already deducted at publish).
      const updateRes = await tx.prepare(`UPDATE builders SET pending = pending - ? WHERE id = ? AND pending >= ?`).run(slotCost, req.builder.id, slotCost);
      if (updateRes.changes === 0) {
        // Fallback for missions that were already active before this escrow system was implemented
        const legacyRes = await tx.prepare(`UPDATE builders SET balance = balance - ? WHERE id = ? AND balance >= ?`).run(reward, req.builder.id, reward);
        if (legacyRes.changes === 0) throw new Error("Insufficient funds in escrow and wallet");
      }
    }

    await tx.prepare(`UPDATE responses SET status = 'approved' WHERE id = ? AND mission_id = ?`).run(req.params.responseId, req.params.id);
    
    if (reward > 0) {
      await tx.prepare(`UPDATE validators SET balance = balance + ?, earnings_total = earnings_total + ? WHERE id = ?`).run(reward, reward, response.validator_id);
    }
    
    const feedbackNote = req.body.note || "";
    const scoreVal = rating * 20; // convert 1-5 to 20-100
    await tx.prepare(`UPDATE v_my_missions SET status = 'completed', score = ?, reason = ? WHERE mission_id = ? AND validator_id = ?`).run(scoreVal, feedbackNote, req.params.id, response.validator_id);
    await tx.prepare(`UPDATE participants SET stage = 'rewarded', reward = ? WHERE mission_id = ? AND validator_id = ?`).run(reward, req.params.id, response.validator_id);

    // Reputation Engine Update (O(1) Rolling Average)
    const v = await tx.prepare(`SELECT rating, reviews_count, missions_done FROM validators WHERE id = ?`).get(response.validator_id);
    if (v) {
      const count = v.reviews_count || 0;
      const oldRating = v.rating || 5;
      const newRating = Math.round(((oldRating * count + rating) / (count + 1)) * 10) / 10;
      const oldCompleted = v.missions_done || 0;
      const completed = oldCompleted + 1;

      await tx.prepare(`UPDATE validators SET rating = ?, reviews_count = ?, missions_done = ? WHERE id = ?`)
        .run(newRating, count + 1, completed, response.validator_id);

      // Milestone check
      const oldLvl = levelForCompleted(oldCompleted).n;
      const newLvlEntry = levelForCompleted(completed);

      if (newLvlEntry.n > oldLvl) {
        await tx.prepare(`INSERT INTO v_notifications (validator_id, cat, icon, tone, title, body, time_label, unread) VALUES (?,?,?,?,?,?,?,1)`)
          .run(response.validator_id, "system", "star", "success", "Level Up!", `Congratulations! You've reached Level ${newLvlEntry.n} (${newLvlEntry.name}).`, "Just now");
      }
    }
    
    await tx.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread) VALUES (?,?,?,?,?,?,?,?,1)`)
      .run(response.validator_id, "reward", "submission_approved", "checkCircle", "success", "Mission Approved!", `Your submission for ${mission.name} was approved! ₹${reward} has been added to your wallet.`, "Just now");

    // Log Activity for Builder
    await tx.prepare(`INSERT INTO activity (builder_id, type, title, detail, amount) VALUES (?,?,?,?,?)`)
      .run(req.builder.id, "submission_approved", mission.name, response.name, 0);
    if (reward > 0) {
      await tx.prepare(`INSERT INTO activity (builder_id, type, title, detail, amount) VALUES (?,?,?,?,?)`)
        .run(req.builder.id, "reward_released", mission.name, "", reward);
    }

    await recalcMissionStats(req.params.id, tx);
  }).catch(err => {
    return res.status(400).json({ error: err.message });
  });
  
  if (!res.headersSent) res.json({ ok: true });
});

// POST /api/missions/:id/submissions/:responseId/rejected
router.post("/:id/submissions/:responseId/rejected", authMiddleware, async (req, res) => {
  const rating = Number(req.body.rating) || 1;
  if (rating < 1 || rating > 5) return res.status(400).json({ error: "Rating must be between 1 and 5" });

  await db.transaction(async (tx) => {
    const mission = await tx.prepare(`SELECT * FROM missions WHERE id = ? AND builder_id = ? FOR UPDATE`).get(req.params.id, req.builder.id);
    if (!mission) throw new Error("Mission not found");
    
    const response = await tx.prepare(`SELECT validator_id FROM responses WHERE id = ? AND mission_id = ? FOR UPDATE`).get(req.params.responseId, req.params.id);
    if (!response) throw new Error("Submission not found");

    await tx.prepare(`UPDATE responses SET status = 'rejected', data_json = data_json WHERE id = ? AND mission_id = ?`).run(req.params.responseId, req.params.id);

    await tx.prepare(`UPDATE v_my_missions SET status = 'rejected' WHERE mission_id = ? AND validator_id = ?`).run(req.params.id, response.validator_id);
    await tx.prepare(`UPDATE participants SET stage = 'rejected' WHERE mission_id = ? AND validator_id = ?`).run(req.params.id, response.validator_id);

    // Free up the slot since they are rejected
    const updatedMission = await tx.prepare(`UPDATE missions SET joined = GREATEST(0, joined - 1) WHERE id = ? RETURNING joined, target, name`).get(req.params.id);
    if (updatedMission && updatedMission.joined === Math.max(0, updatedMission.target - 1)) {
      // The mission just opened up 1 slot from being full! Notify waitlisted validators
      const savedVals = await tx.prepare(`SELECT validator_id FROM v_saved WHERE task_id = ?`).all(req.params.id);
      for (const sv of savedVals) {
        await tx.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?,?,?,?,?,?,?,?,1,?)`)
          .run(sv.validator_id, "mission", "slot_available", "bell", "success", "Slot Available!", `Hurry up! A slot just opened up for ${updatedMission.name}.`, "Just now", req.params.id);
      }
    }

    // Reputation Engine Update
    const v = await tx.prepare(`SELECT rating, reviews_count FROM validators WHERE id = ?`).get(response.validator_id);
    if (v) {
      const count = v.reviews_count || 0;
      const oldRating = v.rating || 5;
      const newRating = Math.round(((oldRating * count + rating) / (count + 1)) * 10) / 10;

      await tx.prepare(`UPDATE validators SET rating = ?, reviews_count = ? WHERE id = ?`)
        .run(newRating, count + 1, response.validator_id);
    }
    
    await tx.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread) VALUES (?,?,?,?,?,?,?,?,1)`)
      .run(response.validator_id, "alert", "submission_rejected", "alertTriangle", "critical", "Mission Rejected", `Your submission for ${mission.name} was rejected. Reason: ${req.body.note || 'Did not meet requirements.'}`, "Just now");

    await recalcMissionStats(req.params.id, tx);
  }).catch(err => {
    return res.status(400).json({ error: err.message });
  });

  if (!res.headersSent) res.json({ ok: true });
});

// POST /api/missions/:id/submissions/:responseId/revision
router.post("/:id/submissions/:responseId/revision", authMiddleware, async (req, res) => {
  const mission = await db.prepare(`SELECT * FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });
  
  const response = await db.prepare(`SELECT validator_id FROM responses WHERE id = ? AND mission_id = ?`).get(req.params.responseId, req.params.id);
  if (!response) return res.status(404).json({ error: "Submission not found" });

  await db.prepare(`UPDATE responses SET status = 'revision' WHERE id = ? AND mission_id = ?`).run(req.params.responseId, req.params.id);
  await db.prepare(`UPDATE v_my_missions SET status = 'revision', status_label = 'Revision Requested', reason = ? WHERE mission_id = ? AND validator_id = ?`).run(req.body.note || "Please review and fix the requested items.", req.params.id, response.validator_id);
  
  await db.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread) VALUES (?,?,?,?,?,?,?,?,1)`)
    .run(response.validator_id, "alert", "submission_revision", "edit", "warning", "Revision Requested", `The builder requested a revision for ${mission.name}. Note: ${req.body.note}`, "Just now");

  await recalcMissionStats(req.params.id);

  res.json({ ok: true });
});

// DELETE /api/missions/:id
router.delete("/:id", authMiddleware, async (req, res) => {
  const mission = await db.prepare(`SELECT * FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });

  await db.transaction(async (tx) => {
    // Refund whatever escrow wasn't already released (as reward + fee) via approvals
    const approved = await tx.prepare(`SELECT COUNT(*) as c FROM responses WHERE mission_id = ? AND status = 'approved'`).get(mission.id);
    const alreadyReleased = (parseInt(approved.c, 10) || 0) * perSlotEscrow(mission.reward_amount).cost;
    const refund = Math.max(0, (mission.spend || 0) - alreadyReleased);

    if (refund > 0) {
      await tx.prepare(`UPDATE builders SET balance = balance + ?, pending = pending - ? WHERE id = ?`).run(refund, refund, req.builder.id);
      await tx.prepare(`INSERT INTO transactions (builder_id, type, amount, status, ref, detail) VALUES (?, 'credit', ?, 'completed', ?, ?)`)
        .run(req.builder.id, refund, null, `Escrow refund for deleted mission ${mission.name}`);
    }

    await tx.prepare(`DELETE FROM v_my_missions WHERE mission_id = ?`).run(mission.id);
    await tx.prepare(`DELETE FROM participants WHERE mission_id = ?`).run(mission.id);
    await tx.prepare(`DELETE FROM missions WHERE id = ?`).run(mission.id);
  });

  res.json({ ok: true });
});

// POST /api/missions/:id/invite/:validatorId
router.post("/:id/invite/:validatorId", authMiddleware, async (req, res) => {
  const mission = await db.prepare(`SELECT * FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });

  const validator = await db.prepare(`SELECT id, name FROM validators WHERE id = ?`).get(req.params.validatorId);
  if (!validator) return res.status(404).json({ error: "Validator not found" });

  // Prevent multiple invites
  const existing = await db.prepare(`SELECT * FROM mission_invitations WHERE mission_id = ? AND validator_id = ?`).get(req.params.id, req.params.validatorId);
  if (existing) return res.status(400).json({ error: "Validator has already been invited to this mission." });

  // Prevent inviting if they already joined
  const participant = await db.prepare(`SELECT * FROM participants WHERE mission_id = ? AND validator_id = ?`).get(req.params.id, req.params.validatorId);
  if (participant) return res.status(400).json({ error: "Validator has already joined this mission." });

  const isWaitlist = await db.prepare(`SELECT 1 FROM v_saved WHERE task_id = ? AND validator_id = ?`).get(req.params.id, req.params.validatorId);

  await db.transaction(async (tx) => {
    await tx.prepare(`INSERT INTO mission_invitations (builder_id, validator_id, mission_id, status) VALUES (?, ?, ?, 'pending')`)
      .run(req.builder.id, req.params.validatorId, req.params.id);

    if (isWaitlist) {
      await tx.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'invite', 'waitlist_invite', 'star', 'accent', ?, ?, 'Just now', 1, ?)`)
        .run(req.params.validatorId, "Waitlist Slot Opened!", `A slot opened up! You've been invited to the mission you saved: ${mission.name}`, req.params.id);
    } else {
      await tx.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'invite', 'mission_invite', 'userplus', 'primary', ?, ?, 'Just now', 1, ?)`)
        .run(req.params.validatorId, "New Mission Invitation", `${req.builder.org || req.builder.name} has invited you to their mission: ${mission.name}`, req.params.id);
    }
  });

  res.json({ ok: true, invited: true, isWaitlist: !!isWaitlist });
});

// GET /api/missions/:id/waitlist — get validators who saved this mission
router.get("/:id/waitlist", authMiddleware, async (req, res) => {
  const mission = await db.prepare(`SELECT id FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });

  const waitlist = await db.prepare(`
    SELECT v.id, v.name, v.avatar, v.rating, v.reviews_count, v.specialties_json,
      COALESCE((SELECT trust FROM participants WHERE validator_id = v.id ORDER BY joined_at DESC LIMIT 1), 50) as trust
    FROM v_saved vs
    JOIN validators v ON v.id = vs.validator_id
    WHERE vs.task_id = ?
    AND NOT EXISTS (SELECT 1 FROM participants p WHERE p.mission_id = vs.task_id AND p.validator_id = v.id)
    AND NOT EXISTS (SELECT 1 FROM mission_invitations i WHERE i.mission_id = vs.task_id AND i.validator_id = v.id AND i.status = 'pending')
  `).all(req.params.id);

  res.json({ waitlist: waitlist.map(w => ({
    ...w,
    specialties: w.specialties_json ? JSON.parse(w.specialties_json) : []
  }))});
});

// DELETE /api/missions/:id/invite/:validatorId — withdraw a pending invite
router.delete("/:id/invite/:validatorId", async (req, res) => {
  const invite = await db.prepare(`
    SELECT * FROM mission_invitations
    WHERE mission_id = ? AND validator_id = ? AND builder_id = ? AND status = 'pending'
  `).get(req.params.id, req.params.validatorId, req.builder.id);
  if (!invite) return res.status(404).json({ error: "Pending invite not found" });

  const mission = await db.prepare(`SELECT name FROM missions WHERE id = ?`).get(req.params.id);

  await db.transaction(async (tx) => {
    await tx.prepare(`UPDATE mission_invitations SET status = 'cancelled' WHERE id = ?`).run(invite.id);
    await tx.prepare(`
      INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread, target_id)
      VALUES (?, 'invite', 'invite_cancelled', 'xCircle', 'muted', ?, ?, 'Just now', 1, ?)
    `).run(req.params.validatorId, "Invitation Withdrawn", `${req.builder.org || req.builder.name} withdrew your invitation to "${mission?.name || "a mission"}".`, req.params.id);
  });

  res.json({ ok: true, cancelled: true });
});
