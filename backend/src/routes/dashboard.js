import { Router } from "express";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";
import { catOf } from "../meta.js";

export const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  const bId = req.builder.id;
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

  const activity = await db.prepare(`SELECT * FROM activity WHERE builder_id = ? ORDER BY id DESC LIMIT 12`).all(bId);

  const recentRaw = await db.prepare(`SELECT * FROM missions WHERE builder_id = ? ORDER BY created_at DESC LIMIT 6`).all(bId);
  const recent = recentRaw.map(m => ({
      id: m.id, name: m.name, category: m.category, categoryLabel: catOf(m.category).label,
      status: m.status, region: m.region, completion: m.completion,
      participants: { target: m.target, joined: m.joined, submitted: m.submitted },
      reward: { type: m.reward_type, amount: m.reward_amount },
    }));

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
