import { Router } from "express";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";
import { catOf } from "../meta.js";
import { translateBatch } from "../translate.js";

export const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  const bId = req.builder.id;
  const rawMissions = await db.prepare(`
    SELECT m.*, 
      (SELECT COUNT(*) FROM responses r WHERE r.mission_id = m.id AND r.status NOT IN ('rejected', 'draft')) as real_submitted,
      (SELECT AVG(score/20.0) FROM v_my_missions v WHERE v.mission_id = m.id AND v.score > 0) as real_rating
    FROM missions m WHERE builder_id = ?
  `).all(bId);
  
  const missions = rawMissions.map(m => ({
    ...m,
    submitted: m.real_submitted !== undefined ? Number(m.real_submitted) : m.submitted,
    completion: m.real_submitted !== undefined 
      ? Math.min(100, Math.round((Number(m.real_submitted) / Math.max(m.target || 1, 1)) * 100)) 
      : m.completion,
    rating: m.real_rating !== undefined && m.real_rating !== null 
      ? Math.round(Number(m.real_rating) * 10) / 10 
      : m.rating,
  }));
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
    SELECT location as city, COUNT(*) as cnt 
    FROM validators 
    WHERE location IS NOT NULL AND location != ''
    GROUP BY location 
    ORDER BY cnt DESC 
    LIMIT 6
  `).all();
  const geo = geoRows.map(r => ({ l: r.city, v: r.cnt }));
  // City names are free text (whatever the validator typed in their profile),
  // not a fixed list with static i18n keys -- same mechanism used for mission
  // names/descriptions elsewhere, cached per unique city name so translating
  // "Rajamundry" once serves every builder's Analytics view after that.
  const lang = req.builder.preferred_language;
  if (lang && lang !== "en" && geo.length) {
    const translated = await translateBatch(
      geo.map(g => ({ entityType: "city", entityId: g.l, field: "name", text: g.l })),
      lang
    );
    for (const g of geo) {
      const hit = translated.get(`city:${g.l}:name`);
      if (hit) g.l = hit;
    }
  }

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
