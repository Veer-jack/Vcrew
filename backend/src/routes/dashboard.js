import { Router } from "express";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";
import { catOf } from "../meta.js";

export const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  const bId = req.builder.id;
  const missions = await db.prepare(`SELECT * FROM missions WHERE builder_id = ?`).all(bId);

  const activeMissions = missions.filter(m => m.status === "active");
  const completedMissions = missions.filter(m => m.status === "completed" || m.status === "closed");
  const totalParticipants = missions.reduce((s, m) => s + m.joined, 0);
  const pendingParticipants = activeMissions.reduce((s, m) => s + Math.max(0, m.joined - m.submitted), 0);
  const totalSpend = missions.reduce((s, m) => s + m.spend, 0);
  const avgCompletion = activeMissions.length
    ? Math.round(activeMissions.reduce((s, m) => s + m.completion, 0) / activeMissions.length)
    : 0;

  const kpi = {
    activeMissions: activeMissions.length,
    completedMissions: completedMissions.length,
    totalParticipants,
    pendingParticipants,
    totalSpend,
    avgCompletion,
    spark: { participants: [18, 24, 22, 30, 28, 41, 38, 52], spend: [12, 19, 16, 24, 30, 27, 38, 44] },
  };

  const activity = await db.prepare(`SELECT * FROM activity WHERE builder_id = ? ORDER BY id DESC LIMIT 12`).all(bId);

  const recent = await db.prepare(`SELECT * FROM missions WHERE builder_id = ? ORDER BY created_at DESC LIMIT 6`).all(bId)
    .map(m => ({
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
