import { Router } from "express";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";
import { catOf } from "../meta.js";
import { recalcMissionStats } from "../stats.js";

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
  
  // Auto-heal active missions to ensure KPI stats are 100% accurate
  const activeMissions = await db.prepare(`SELECT id FROM missions WHERE builder_id = ? AND status = 'active'`).all(bId);
  for (const m of activeMissions) {
    await recalcMissionStats(m.id);
  }

  const kpiRow = await db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS active_missions,
      COALESCE(SUM(CASE WHEN status IN ('completed', 'closed') THEN 1 ELSE 0 END), 0) AS completed_missions,
      COALESCE(SUM(joined), 0) AS total_participants,
      COALESCE(SUM(CASE WHEN status = 'active' THEN GREATEST(0, joined - submitted) ELSE 0 END), 0) AS pending_participants,
      COALESCE(SUM(spend), 0) AS total_spend,
      COALESCE(AVG(CASE WHEN status = 'active' THEN completion ELSE NULL END), 0) AS avg_completion
    FROM missions
    WHERE builder_id = ?
  `).get(bId);

  const kpi = {
    activeMissions: Number(kpiRow?.active_missions || 0),
    completedMissions: Number(kpiRow?.completed_missions || 0),
    totalParticipants: Number(kpiRow?.total_participants || 0),
    pendingParticipants: Number(kpiRow?.pending_participants || 0),
    totalSpend: Number(kpiRow?.total_spend || 0),
    avgCompletion: Math.round(Number(kpiRow?.avg_completion || 0)),
    spark: { participants: [18, 24, 22, 30, 28, 41, 38, 52], spend: [12, 19, 16, 24, 30, 27, 38, 44] },
  };

  const rawActivity = await db.prepare(`SELECT * FROM activity WHERE builder_id = ? ORDER BY id DESC LIMIT 12`).all(bId);
  const activity = rawActivity.map(row => {
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
      mission_name,
      time_label: timeAgo(row.created_at)
    };
  });

  const recentRaw = await db.prepare(`
    SELECT m.*, 
      (SELECT COUNT(*) FROM responses r WHERE r.mission_id = m.id AND r.status != 'rejected') as real_submitted
    FROM missions m WHERE builder_id = ? ORDER BY created_at DESC LIMIT 6
  `).all(bId);
  
  const recent = recentRaw.map(m => {
    const realSub = m.real_submitted !== undefined ? Number(m.real_submitted) : m.submitted;
    const realComp = m.real_submitted !== undefined 
      ? Math.min(100, Math.round((Number(m.real_submitted) / Math.max(m.target || 1, 1)) * 100)) 
      : m.completion;
      
    return {
      id: m.id, name: m.name, category: m.category, categoryLabel: catOf(m.category).label,
      status: m.status, region: m.region, completion: realComp,
      participants: { target: m.target, joined: m.joined, submitted: realSub },
      reward: { type: m.reward_type, amount: m.reward_amount },
    };
  });

  res.json({
    builder: {
      name: req.builder.name, org: req.builder.org, role: req.builder.role,
      plan: req.builder.plan, color: req.builder.color, balance: req.builder.balance,
    },
    kpi,
    activity,
    recentMissions: recent,
  });
});
