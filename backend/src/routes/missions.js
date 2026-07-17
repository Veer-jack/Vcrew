import { Router } from "express";
import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";
import { catOf, ptypeOf, REWARDS, matchCount } from "../meta.js";
import { sendMissionPublished } from "../email.js";
import { recalcMissionStats } from "../stats.js";

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
    createdAt: m.created_at,
  };
}

// GET /api/missions?status=&category=&q=
router.get("/", async (req, res) => {
  const { status, category, q } = req.query;
  let sql = `
    SELECT m.*, 
      (SELECT COUNT(*) FROM responses r WHERE r.mission_id = m.id AND r.status != 'rejected') as real_submitted,
      (SELECT AVG(score/20.0) FROM v_my_missions v WHERE v.mission_id = m.id AND v.score > 0) as real_rating
    FROM missions m 
    WHERE m.builder_id = ?
  `;
  const params = [req.builder.id];
  if (status) { sql += ` AND status = ?`; params.push(status); }
  if (category) { sql += ` AND category = ?`; params.push(category); }
  if (q) { sql += ` AND name ILIKE ?`; params.push(`%${q}%`); }
  sql += ` ORDER BY created_at DESC`;
  const rows = await db.prepare(sql).all(...params);
  res.json({ missions: rows.map(serializeMission) });
});

// GET /api/missions/:id
router.get("/:id", async (req, res) => {
  await recalcMissionStats(req.params.id);
  const m = await db.prepare(`
    SELECT m.*, 
      (SELECT COUNT(*) FROM responses r WHERE r.mission_id = m.id AND r.status != 'rejected') as real_submitted,
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
    WHERE r.mission_id = ? ORDER BY r.id DESC
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
          attachments.push(val);
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
  
  // Real database count instead of dummy matchCount()
  const realCountRaw = await db.prepare(`SELECT COUNT(*) as c FROM validators`).get();
  const realCount = Number(realCountRaw.c) || 0;

  const audience = {
    matched: realCount,
    invited: m.joined,
    defn,
    segments: segments.length ? segments : [{ l: "Members", v: 100, c: "var(--t-feedback)" }],
  };

  // ---- Payments snapshot (derived from participant rewards) ----
  const sumReward = (stage) => participants.filter(p => p.stage === stage).reduce((s, p) => s + (p.reward || 0), 0);
  const released = sumReward("rewarded");
  const queued = sumReward("approved");
  const review = sumReward("submitted");
  const fallbackBudget = m.target * m.reward_amount;
  const held = m.spend > 0 ? m.spend : fallbackBudget;
  const refundable = Math.max(0, held - released - queued - review);
  const paymentRows = participants
    .filter(p => ["submitted", "approved", "rewarded"].includes(p.stage))
    .map(p => ({
      name: p.name,
      stage: p.stage.charAt(0).toUpperCase() + p.stage.slice(1),
      amount: p.reward,
      status: p.stage === "rewarded" ? "paid" : p.stage === "approved" ? "queued" : "review",
    }));
  const payments = { held, released, pending: queued + review, refundable, rows: paymentRows };

  // ---- Files ----
  const fileRows = await db.prepare(`SELECT * FROM mission_files WHERE mission_id = ?`).all(m.id);
  const files = {
    brief: fileRows.filter(f => f.section === "brief").map(f => ({ name: f.name, kind: f.kind, size: f.size, by: f.by, when: f.when_label, filename: f.file_path })),
    submissions: fileRows.filter(f => f.section === "submissions").map(f => ({ name: f.name, kind: f.kind, size: f.size, by: f.by, when: f.when_label, filename: f.file_path })),
  };

  res.json({
    mission: serializeMission(m),
    participants,
    responses,
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
        const platformFee = Math.round((target * rewardAmount) * 0.12);
        const totalCost = (target * rewardAmount) + platformFee;
        
        const updateRes = await tx.prepare(`UPDATE builders SET balance = balance - ?, pending = pending + ? WHERE id = ? AND balance >= ?`).run(totalCost, totalCost, req.builder.id, totalCost);
        if (updateRes.changes === 0) {
          throw new Error(`Insufficient funds to publish. Mission costs ₹${totalCost} (incl. 12% fee). Please top up your wallet.`);
        }
        spend = totalCost;
        
        const invRes = await tx.prepare(`INSERT INTO invoices (builder_id, amount, status, due_at, paid_at) VALUES (?, ?, 'paid', NOW(), NOW()) RETURNING id`).get(req.builder.id, totalCost);
        await tx.prepare(`INSERT INTO transactions (builder_id, type, amount, status, ref, detail) VALUES (?, ?, ?, 'completed', ?, ?)`).run(req.builder.id, "debit", totalCost, `INV-${invRes.id}`, `Mission escrow for ${b.name} (incl. 12% fee)`);
      }

      await tx.prepare(`
        INSERT INTO missions (id, builder_id, name, brand, category, ptype, status, target, joined, submitted,
          reward_type, reward_amount, completion, spend, region, rating, description, audience_json, tasks_json, deadline)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, 0, ?, ?, 0, ?, ?, ?, ?)
      `).run(
        id, req.builder.id, b.name, req.builder.org, b.category, b.ptype, status,
        target, rewardType, rewardAmount, spend,
        b.region || "Pan-India", b.description || "", JSON.stringify(b.audience || {}), JSON.stringify(b.tasks || []), b.deadline || null
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
  }

  const m = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(id);
  res.status(201).json({ mission: serializeMission(m) });
});

// PATCH /api/missions/:id  — update status / fields
router.patch("/:id", async (req, res) => {
  const m = await db.prepare(`SELECT * FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });

  // Gate publishing (draft → active) the same way as creating an active mission
  if (req.body.status === "active" && m.status !== "active") {
    const builder = await db.prepare(`SELECT verified_at FROM builders WHERE id = ?`).get(req.builder.id);
    const isVerified = !!(builder && builder.verified_at);
    if (!isVerified) {
      const activeMissions = Number((await db.prepare(`SELECT COUNT(*) AS n FROM missions WHERE builder_id = ? AND status = 'active'`).get(req.builder.id)).n);
      if (activeMissions >= 3) {
        return res.status(403).json({
          error: "Unverified accounts can run a maximum of 3 active missions. Verify your website to unlock unlimited campaigns.",
          code: "VERIFICATION_REQUIRED", limit: "missions",
        });
      }
      if (m.target > 25) {
        return res.status(403).json({
          error: "Unverified accounts can target a maximum of 25 participants per mission. Reduce the target or verify your website.",
          code: "VERIFICATION_REQUIRED", limit: "participants",
        });
      }
    }
  }

  const allowed = ["name", "status", "target", "deadline", "region", "description"];
  const updates = [];
  const params = [];
  
  const newStatus = req.body.status !== undefined ? req.body.status : m.status;
  const newTarget = req.body.target !== undefined ? Number(req.body.target) : m.target;
  let spendDelta = 0;
  
  try {
    await db.transaction(async (tx) => {
      // If moving from draft to active, we need to charge them
      if (newStatus === "active" && m.status === "draft" && m.reward_type !== "free" && m.reward_amount > 0 && newTarget > 0) {
        const platformFee = Math.round((newTarget * m.reward_amount) * 0.12);
        const totalCost = (newTarget * m.reward_amount) + platformFee;
        
        const updateRes = await tx.prepare(`UPDATE builders SET balance = balance - ?, pending = pending + ? WHERE id = ? AND balance >= ?`).run(totalCost, totalCost, req.builder.id, totalCost);
        if (updateRes.changes === 0) {
          throw new Error(`Insufficient funds to publish. Mission costs ₹${totalCost} (incl. 12% fee). Please top up your wallet.`);
        }
        spendDelta = totalCost;
        
        const invRes = await tx.prepare(`INSERT INTO invoices (builder_id, amount, status, due_at, paid_at) VALUES (?, ?, 'paid', NOW(), NOW()) RETURNING id`).get(req.builder.id, totalCost);
        await tx.prepare(`INSERT INTO transactions (builder_id, type, amount, status, ref, detail) VALUES (?, ?, ?, 'completed', ?, ?)`).run(req.builder.id, "debit", totalCost, `INV-${invRes.id}`, `Mission escrow for ${m.name} (incl. 12% fee)`);
      }

      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          const col = key === "name" ? "name" : key;
          updates.push(`${col} = ?`);
          params.push(req.body[key]);
        }
      }
      if (spendDelta > 0) {
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
  }

  const updated = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(m.id);
  res.json({ mission: serializeMission(updated) });
});

// PATCH /api/missions/:id/participants/:pid — move kanban stage
router.patch("/:id/participants/:pid", async (req, res) => {
  const m = await db.prepare(`SELECT id FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });
  const { stage } = req.body || {};
  if (!stage) return res.status(400).json({ error: "stage is required" });

  const p = await db.prepare(`SELECT * FROM participants WHERE id = ? AND mission_id = ?`).get(req.params.pid, m.id);
  if (!p) return res.status(404).json({ error: "Participant not found" });

  await db.prepare(`UPDATE participants SET stage = ? WHERE id = ?`).run(stage, p.id);
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
  const { description, url, platform, goals, targetUsers } = req.body || {};
  if (!description && !url) return res.status(400).json({ error: "Description or URL required" });

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `You are a Principal QA Engineer with 15+ years of experience. You think like a seasoned tester who probes edge cases, data integrity issues, UX dead-ends, and moments where the product breaks trust with the user.\n\nA founder needs expert validation for:\n\nPRODUCT: ${description || 'Not provided'}\nURL: ${url || 'Not provided'}\nPLATFORM: ${platform || 'Web'}\nVALIDATION GOALS: ${goals || 'Core flow, UX, edge cases'}\nTARGET USERS: ${targetUsers || 'General users'}\n\nGenerate 5-7 PROFESSIONAL test cases a seasoned QA engineer would run. NOT beginner tasks like open the app and browse. These are structured, methodical scenarios that stress-test the product deeply.\n\nRULES:\n1. Task title must name the SPECIFIC flow or feature - never generic titles\n2. Steps must include adversarial actions: wrong inputs, blank fields, mid-flow navigation\n3. Include at least one task testing error/failure states\n4. Include at least one task testing data persistence (close and reopen - is data saved?)\n5. Final task must capture NPS and what would stop them using the product again\n6. Questions must be expert-level - not was it easy but where specifically did friction occur\n\nQUESTION QUALITY EXAMPLES:\nBAD: Was signup easy? GOOD: At which exact step did friction first occur and what caused it?\nBAD: Did you like the design? GOOD: Which UI element felt most inconsistent with expectations?\n\nReturn ONLY valid JSON. No markdown, no backticks, no explanation:\n{tasks: [{id:1, title:string, severity:crit|imp|nice, steps:[string], questions:[{id,text,type,scale?,options?}], proof:screenshot|null, min_time_seconds:number}]}\n\nTypes: rating(scale:5), multiple_choice(options[]), yes_no_detail, text\nmin_time_seconds minimum 300. Make every task specific to this exact product.

Product description: ${description || "Not provided"}
URL: ${url || "Not provided"}
Platform: ${platform || "Web"}
Validation goals: ${goals || "Core flow, UX"}
Target users: ${targetUsers || "General users"}

Generate 4-6 structured test cases. Return ONLY valid JSON with no markdown, no backticks, no preamble. Use this exact schema:
{
  "tasks": [
    {
      "id": 1,
      "title": "Task title",
      "severity": "crit",
      "steps": ["Step 1", "Step 2"],
      "questions": [
        { "id": "q1", "text": "Question text", "type": "rating", "scale": 5 },
        { "id": "q2", "text": "Question text", "type": "multiple_choice", "options": ["Option A", "Option B"] },
        { "id": "q3", "text": "Question text", "type": "yes_no_detail" }
      ],
      "proof": "screenshot",
      "min_time_seconds": 180
    }
  ]
}

severity must be one of: crit, imp, nice
question types: rating (needs scale), multiple_choice (needs options), yes_no_detail, text
proof: "screenshot" or null
Include 3-5 questions per task mixing types. Make tasks specific to the product described.`;

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
    res.status(400).json({ error: err.message });
  }
});

// GET /api/missions/:id/submissions — founder reviews submissions
router.get("/:id/submissions", authMiddleware, async (req, res) => { console.log("HITTING SUBMISSIONS ROUTE FOR", req.params.id);
  const mission = await db.prepare(`SELECT * FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });

  const responses = await db.prepare(`
    SELECT r.*, v.name, v.handle, v.rating as trust_score
    FROM responses r
    LEFT JOIN validators v ON v.id = r.validator_id
    WHERE r.mission_id = ?
    ORDER BY r.submitted_at DESC
  `).all(req.params.id);

  let missionTasks = [];
  try {
    missionTasks = mission.tasks_json ? JSON.parse(mission.tasks_json) : [];
  } catch {}

  res.json({
    mission: { id: mission.id, name: mission.name, target: mission.target },
    submissions: responses.map(r => {
      let data = [];
      try { 
        const parsed = r.data_json ? JSON.parse(r.data_json) : []; 
        data = Array.isArray(parsed) ? parsed : [parsed];
      } catch {}
      
      const breakdown = data.map((ans, i) => {
        if (!ans) return null;
        let attachments = [];
        let details = [];
        for (const [key, val] of Object.entries(ans)) {
          if (key === "_proof") {
            const arr = Array.isArray(val) ? val : [val];
            attachments = arr.map(v => v.startsWith("/api") ? v : `/api/uploads/${v}`);
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
        
        let taskTitle = `Task ${i + 1}`;
        if (missionTasks[i] && missionTasks[i].title) {
          taskTitle = missionTasks[i].title;
        } else if (missionTasks[i] && missionTasks[i].prompt) {
          taskTitle = missionTasks[i].prompt;
        } else if (typeof missionTasks[i] === "string") {
          taskTitle = missionTasks[i];
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
        mins: 20,
        tasks: breakdown.length > 0 ? `${breakdown.length}/${breakdown.length}` : "All",
        breakdown,
        data,
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

    const reward = mission.reward_amount || 0;
    if (reward > 0) {
      // Deduct reward ONLY from pending escrow (balance was already deducted at publish)
      const updateRes = await tx.prepare(`UPDATE builders SET pending = pending - ? WHERE id = ? AND pending >= ?`).run(reward, req.builder.id, reward);
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
    await tx.prepare(`UPDATE participants SET stage = 'rewarded' WHERE mission_id = ? AND validator_id = ?`).run(req.params.id, response.validator_id);

    // Reputation Engine Update (O(1) Rolling Average)
    const v = await tx.prepare(`SELECT rating, reviews_count, missions_done FROM validators WHERE id = ?`).get(response.validator_id);
    if (v) {
      const count = v.reviews_count || 0;
      const oldRating = v.rating || 5;
      const newRating = Math.round(((oldRating * count + rating) / (count + 1)) * 10) / 10;
      const completed = (v.missions_done || 0) + 1;

      await tx.prepare(`UPDATE validators SET rating = ?, reviews_count = ?, missions_done = ? WHERE id = ?`)
        .run(newRating, count + 1, completed, response.validator_id);
    }
    
    await tx.prepare(`INSERT INTO v_notifications (validator_id, cat, icon, tone, title, body, time_label, unread) VALUES (?,?,?,?,?,?,?,1)`)
      .run(response.validator_id, "application", "checkCircle", "success", "Mission Approved!", `Your submission for ${mission.name} was approved! \u20b9${reward} has been added to your wallet.`, "Just now");

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

    // Reputation Engine Update
    const v = await tx.prepare(`SELECT rating, reviews_count FROM validators WHERE id = ?`).get(response.validator_id);
    if (v) {
      const count = v.reviews_count || 0;
      const oldRating = v.rating || 5;
      const newRating = Math.round(((oldRating * count + rating) / (count + 1)) * 10) / 10;

      await tx.prepare(`UPDATE validators SET rating = ?, reviews_count = ? WHERE id = ?`)
        .run(newRating, count + 1, response.validator_id);
    }
    
    await tx.prepare(`INSERT INTO v_notifications (validator_id, cat, icon, tone, title, body, time_label, unread) VALUES (?,?,?,?,?,?,?,1)`)
      .run(response.validator_id, "alert", "alertTriangle", "critical", "Mission Rejected", `Your submission for ${mission.name} was rejected. Reason: ${req.body.note || 'Did not meet requirements.'}`, "Just now");

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
  
  await db.prepare(`INSERT INTO v_notifications (validator_id, cat, icon, tone, title, body, time_label, unread) VALUES (?,?,?,?,?,?,?,1)`)
    .run(response.validator_id, "alert", "edit", "warning", "Revision Requested", `The builder requested a revision for ${mission.name}. Note: ${req.body.note}`, "Just now");

  await recalcMissionStats(req.params.id);

  res.json({ ok: true });
});

// DELETE /api/missions/:id
router.delete("/:id", authMiddleware, async (req, res) => {
  const mission = await db.prepare(`SELECT * FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });
  
  await db.prepare(`DELETE FROM v_my_missions WHERE mission_id = ?`).run(req.params.id);
  await db.prepare(`DELETE FROM participants WHERE mission_id = ?`).run(req.params.id);
  await db.prepare(`DELETE FROM missions WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});
