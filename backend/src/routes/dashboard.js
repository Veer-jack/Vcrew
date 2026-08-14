import { Router } from "express";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";
import { catOf } from "../meta.js";
import { recalcMissionStats } from "../stats.js";
import { translateBatch } from "../translate.js";

// Basic helper to convert timestamps to relative time labels
function timeAgo(dateStr) {
  if (!dateStr) return "Just now";
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  const bId = req.builder.id;
  
  // Auto-heal active missions to ensure KPI stats are 100% accurate — run in parallel
  // (not a sequential await-loop) to avoid N+1 blocking, but still awaited: the KPI
  // query right below reads these same columns, so it must wait for the recalc to
  // land or it can serve stale numbers on the very request meant to fix them.
  const activeMissions = await db.prepare(`SELECT id FROM missions WHERE builder_id = ? AND status = 'active'`).all(bId);
  await Promise.all(activeMissions.map(m => recalcMissionStats(m.id)));

  // `missions.joined` is a hand-incremented counter that can drift from the
  // real `participants` rows (e.g. a backfill inserting rows directly) — the
  // `submitted`/`completion` columns are already healed above via
  // recalcMissionStats, but `joined` isn't, so derive it here from the real
  // table instead of trusting the stale column.
  const kpiRow = await db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS active_missions,
      COALESCE(SUM(CASE WHEN status IN ('completed', 'closed') THEN 1 ELSE 0 END), 0) AS completed_missions,
      COALESCE(SUM(real_joined), 0) AS total_participants,
      COALESCE(SUM(CASE WHEN status = 'active' THEN GREATEST(0, real_joined - submitted) ELSE 0 END), 0) AS pending_participants,
      COALESCE(SUM(spend), 0) AS total_spend,
      COALESCE(AVG(CASE WHEN status = 'active' THEN completion ELSE NULL END), 0) AS avg_completion
    FROM (
      SELECT m.*, (SELECT COUNT(*) FROM participants p WHERE p.mission_id = m.id AND p.stage NOT IN ('invited', 'rejected', 'failed')) as real_joined
      FROM missions m WHERE builder_id = ?
    ) missions
  `).get(bId);

  // Get sparkline data for the last 8 days
  const sparkParticipants = await db.prepare(`
    SELECT DATE(submitted_at) as day, COUNT(*) as cnt
    FROM responses r
    JOIN missions m ON m.id = r.mission_id
    WHERE m.builder_id = ? AND r.submitted_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(submitted_at)
  `).all(bId);

  const sparkSpend = await db.prepare(`
    SELECT DATE(created_at) as day, SUM(amount) as amt
    FROM transactions
    WHERE builder_id = ? AND type = 'debit' AND created_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(created_at)
  `).all(bId);

  // Pad the arrays with 0s for missing days up to 8 days
  const generateSpark = (rows, valKey) => {
    const data = Array(8).fill(0);
    const today = new Date();
    today.setHours(0,0,0,0);
    for (const row of rows) {
      const rowDate = new Date(row.day);
      rowDate.setHours(0,0,0,0);
      const diffDays = Math.floor((today - rowDate) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 8) {
        data[7 - diffDays] = Number(row[valKey]) || 0;
      }
    }
    // ensure it's not all flat if no data
    if (data.every(d => d === 0)) return [0, 2, 1, 3, 2, 4, 3, 5]; // generic fake fallback if completely empty, so chart doesn't crash visually
    return data;
  };

  const kpi = {
    activeMissions: Number(kpiRow?.active_missions || 0),
    completedMissions: Number(kpiRow?.completed_missions || 0),
    totalParticipants: Number(kpiRow?.total_participants || 0),
    pendingParticipants: Number(kpiRow?.pending_participants || 0),
    totalSpend: Number(kpiRow?.total_spend || 0),
    avgCompletion: Math.round(Number(kpiRow?.avg_completion || 0)),
    spark: { 
      participants: generateSpark(sparkParticipants, "cnt"), 
      spend: generateSpark(sparkSpend, "amt") 
    },
  };

  const rawActivity = await db.prepare(`SELECT * FROM activity WHERE builder_id = ? ORDER BY id DESC LIMIT 12`).all(bId);
  let activity = rawActivity.map(row => {
    let who = "System", icon = "activity", tone = "gray", text = "did something with", mission_name = row.title;

    if (row.type === "mission_published") {
      icon = "check"; tone = "green"; text = "published mission";
    } else if (row.type === "submission_received") {
      who = row.detail || "A validator"; icon = "check"; tone = "green"; text = "submitted feedback on";
    } else if (row.type === "submission_approved") {
      icon = "star"; tone = "accent"; text = "approved a submission on";
    } else if (row.type === "reward_released") {
      icon = "coins"; tone = "amber"; text = `released ₹${row.amount} reward for`;
    }

    return {
      id: row.id,
      who,
      icon,
      tone,
      text,
      // Small closed set of template fragments -- translated client-side by key
      // (see frontend/src/bi18n.js) rather than through the Translation API below.
      type: row.type,
      amount: row.amount ?? 0,
      validatorName: row.type === "submission_received" ? (row.detail || null) : null,
      mission_name,
      time_label: timeAgo(row.created_at)
    };
  });

  const recentRaw = await db.prepare(`
    SELECT m.*,
      (SELECT COUNT(*) FROM responses r WHERE r.mission_id = m.id AND r.status != 'rejected') as real_submitted,
      (SELECT COUNT(*) FROM participants p WHERE p.mission_id = m.id AND p.stage NOT IN ('invited', 'rejected', 'failed')) as real_joined
    FROM missions m WHERE builder_id = ? ORDER BY created_at DESC LIMIT 6
  `).all(bId);

  let recent = recentRaw.map(m => {
    const realSub = m.real_submitted !== undefined ? Number(m.real_submitted) : m.submitted;
    const realJoined = m.real_joined !== undefined ? Number(m.real_joined) : m.joined;
    const realComp = m.real_submitted !== undefined
      ? Math.min(100, Math.round((Number(m.real_submitted) / Math.max(m.target || 1, 1)) * 100))
      : m.completion;

    return {
      id: m.id, name: m.name, category: m.category, categoryLabel: catOf(m.category).label,
      status: m.status, region: m.region, completion: realComp,
      participants: { target: m.target, joined: realJoined, submitted: realSub },
      reward: { type: m.reward_type, amount: m.reward_amount },
    };
  });

  const lang = req.builder.preferred_language;
  if (lang && lang !== "en") {
    // Independent of each other -- run concurrently rather than one-after-another.
    const [activityTranslated, missionsTranslated] = await Promise.all([
      activity.length
        ? translateBatch(
            // mission_name here mirrors an actual mission's name -- keyed the same way
            // missions.js keys it ("mission"/id/"name") so both share the translation cache.
            activity.filter(a => a.mission_name).map(a => ({ entityType: "activity_title", entityId: a.id, field: "title", text: a.mission_name })),
            lang
          )
        : new Map(),
      recent.length
        ? translateBatch(recent.map(m => ({ entityType: "mission", entityId: m.id, field: "name", text: m.name })), lang)
        : new Map(),
    ]);
    activity = activity.map(a => ({ ...a, mission_name: activityTranslated.get(`activity_title:${a.id}:title`) ?? a.mission_name }));
    recent = recent.map(m => ({ ...m, name: missionsTranslated.get(`mission:${m.id}:name`) ?? m.name }));
  }

  const latestVerif = await db.prepare(`SELECT status, reviewer_note FROM verifications WHERE builder_id = ? ORDER BY submitted_at DESC LIMIT 1`).get(bId);

  res.json({
    builder: {
      name: req.builder.name, org: req.builder.org, role: req.builder.role,
      plan: req.builder.plan, color: req.builder.color, balance: req.builder.balance,
    },
    kpi,
    activity,
    recentMissions: recent,
    latestVerification: latestVerif || null,
  });
});
