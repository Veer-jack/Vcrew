import { Router } from "express";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";
import { catOf } from "../meta.js";

export const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  const bId = req.builder.id;
  const missions = await db.prepare(`SELECT * FROM missions WHERE builder_id = ?`).all(bId);
  const missionIds = missions.map(m => m.id);

  let responses = [];
  if (missionIds.length) {
    const placeholders = missionIds.map(() => "?").join(",");
    responses = await db.prepare(`SELECT * FROM responses WHERE mission_id IN (${placeholders})`).all(...missionIds);
  }

  const totalResponses = missions.reduce((s, m) => s + m.submitted, 0);

  const ratedMissions = missions.filter(m => m.rating > 0);
  const avgRating = ratedMissions.length
    ? Math.round((ratedMissions.reduce((s, m) => s + m.rating, 0) / ratedMissions.length) * 10) / 10
    : 0;

  const nonDraft = missions.filter(m => m.status !== "draft");
  const completionRate = nonDraft.length
    ? Math.round(nonDraft.reduce((s, m) => s + m.completion, 0) / nonDraft.length)
    : 0;

  // Spend by category (real, from missions)
  const spendByCategory = {};
  for (const m of missions) {
    spendByCategory[m.category] = (spendByCategory[m.category] || 0) + m.spend;
  }
  const categoryBreakdown = Object.entries(spendByCategory)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, v]) => ({ category: cat, label: catOf(cat).label, spend: v }));

  // Geo distribution from the audience pool (real, shared table)
  const geoRows = await db.prepare(`
    SELECT city, COUNT(*) as cnt FROM audience_members GROUP BY city ORDER BY cnt DESC LIMIT 6
  `).all();
  const geo = geoRows.map(r => ({ l: r.city, v: r.cnt }));

  // Completion trend across missions, ordered by creation date
  const trend = missions
    .slice()
    .sort((a, b) => (a.created_at > b.created_at ? 1 : -1))
    .map(m => m.completion)
    .slice(-12);

  res.json({
    totalResponses,
    avgRating,
    completionRate,
    categoryBreakdown,
    geo,
    trend,
    recentResponses: responses.map(r => ({
      ...r, tags: JSON.parse(r.tags_json || "[]"), attachments: JSON.parse(r.attachments_json || "[]"), flagged: !!r.flagged,
    })),
  });
});
