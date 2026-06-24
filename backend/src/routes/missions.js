import { Router } from "express";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";
import { catOf, ptypeOf, REWARDS, matchCount } from "../meta.js";
import { sendMissionPublished } from "../email.js";

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
    participants: { target: m.target, joined: m.joined, submitted: m.submitted },
    reward: { type: m.reward_type, amount: m.reward_amount },
    completion: m.completion,
    spend: m.spend,
    region: m.region,
    rating: m.rating,
    description: m.description,
    deadline: m.deadline,
    audience: JSON.parse(m.audience_json || "{}"),
    createdAt: m.created_at,
  };
}

// GET /api/missions?status=&category=&q=
router.get("/", async (req, res) => {
  const { status, category, q } = req.query;
  let sql = `SELECT * FROM missions WHERE builder_id = ?`;
  const params = [req.builder.id];
  if (status) { sql += ` AND status = ?`; params.push(status); }
  if (category) { sql += ` AND category = ?`; params.push(category); }
  if (q) { sql += ` AND name LIKE ?`; params.push(`%${q}%`); }
  sql += ` ORDER BY created_at DESC`;
  const rows = db.prepare(sql).all(...params);
  res.json({ missions: rows.map(serializeMission) });
});

// GET /api/missions/:id
router.get("/:id", async (req, res) => {
  const m = await db.prepare(`SELECT * FROM missions WHERE id = ? AND builder_id = ?`).get(req.params.id, req.builder.id);
  if (!m) return res.status(404).json({ error: "Mission not found" });

  const participants = await db.prepare(`SELECT * FROM participants WHERE mission_id = ?`).all(m.id);
  const responsesRaw = await db.prepare(`SELECT * FROM responses WHERE mission_id = ? ORDER BY id DESC`).all(m.id);
  const responses = responsesRaw
    .map(r => ({ ...r, tags: JSON.parse(r.tags_json || "[]"), attachments: JSON.parse(r.attachments_json || "[]"), flagged: !!r.flagged }));

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
  const audience = {
    matched: matchCount(audienceFilters),
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
    const activeMissions = db.prepare(
      `SELECT COUNT(*) AS n FROM missions WHERE builder_id = ? AND status = 'active'`
    ).get(req.builder.id).n;

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

  await db.prepare(`
    INSERT INTO missions (id, builder_id, name, brand, category, ptype, status, target, joined, submitted,
      reward_type, reward_amount, completion, spend, region, rating, description, audience_json, deadline)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, 0, 0, ?, 0, ?, ?, ?)
  `).run(
    id, req.builder.id, b.name, req.builder.org, b.category, b.ptype, status,
    Number(b.target) || 0, rewardType, Number(reward.amount) || 0,
    b.region || "Pan-India", b.description || "", JSON.stringify(b.audience || {}), b.deadline || null
  );

  if (status === "active") {
    await db.prepare(`INSERT INTO activity (builder_id, type, title, detail) VALUES (?,?,?,?)`)
      .run(req.builder.id, "mission_published", b.name, "Mission published and live");
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
      const activeMissions = db.prepare(
        `SELECT COUNT(*) AS n FROM missions WHERE builder_id = ? AND status = 'active'`
      ).get(req.builder.id).n;
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
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      const col = key === "name" ? "name" : key;
      updates.push(`${col} = ?`);
      params.push(req.body[key]);
    }
  }
  if (!updates.length) return res.status(400).json({ error: "No valid fields to update" });
  params.push(m.id);
  await db.prepare(`UPDATE missions SET ${updates.join(", ")} WHERE id = ?`).run(...params);

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
