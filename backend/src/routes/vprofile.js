import { Router } from "express";
import { db } from "../db.js";
import { validatorAuthMiddleware } from "../auth.js";
import { LEVELS, BADGES, EXPERTISE } from "../vmeta.js";

export const router = Router();
router.use(validatorAuthMiddleware);

router.get("/", async (req, res) => {
  const v = req.validator;
  const lvl = LEVELS.find(l => l.n === v.level) || LEVELS[0];
  const nextLvl = LEVELS.find(l => l.n === v.level + 1) || null;
  const lvlPct = nextLvl ? Math.min(100, Math.round(((v.completed - lvl.min) / (nextLvl.min - lvl.min)) * 100)) : 100;

  // Dynamically evaluate badges
  const dynamicBadges = BADGES.map(b => {
    let got = false;
    if (b.label === "Identity verified") got = !!v.phone_verified;
    if (b.label === "AI specialist") got = (v.completed >= 50 && v.accuracy >= 90);
    if (b.label === "30-day streak") got = (v.streak >= 4);
    if (b.label === "Top 5% rated") got = (v.rating >= 4.8 && v.rating_count >= 50);
    if (b.label === "SaaS expert") got = (v.completed >= 25);
    if (b.label === "Perfectionist") got = (v.accuracy >= 98 && v.completed >= 30);
    return { ...b, got };
  });

  // Calculate generic expertise based on completed count to replace dummy data
  const baseScore = Math.min(99, 40 + (v.completed * 2));
  const dynamicExpertise = [
    { l: "AI products", v: Math.min(99, baseScore + (v.rating >= 4.5 ? 10 : 0)) },
    { l: "Dev tools & SaaS", v: Math.min(99, baseScore) },
    { l: "Landing pages", v: Math.min(99, baseScore - 5) },
    { l: "Prototypes", v: Math.min(99, baseScore + 2) }
  ];

  res.json({
    name: v.name, handle: v.handle, level: v.level, levelName: lvl.name,
    rating: v.rating, ratingCount: v.rating_count, accuracy: v.accuracy, streak: v.streak,
    specialties: JSON.parse(v.specialties_json || "[]"),
    acceptRate: v.accept_rate, completed: v.completed, lifetime: v.lifetime,
    levelPct: lvlPct, nextLevel: nextLvl,
    levels: LEVELS, badges: dynamicBadges, expertise: dynamicExpertise,
    phone: v.phone_verified ? v.phone : null, phoneVerified: !!v.phone_verified,
    payoutVpa: v.payout_vpa || null,
  });
});

// PATCH / { name, handle, specialties }
router.patch("/", async (req, res) => {
  const v = req.validator;
  const name = String(req.body?.name ?? v.name).trim();
  let handle = req.body?.handle === undefined ? v.handle : String(req.body.handle).trim();
  let specialties = req.body?.specialties === undefined ? JSON.parse(v.specialties_json || "[]") : req.body.specialties;

  if (!name) return res.status(400).json({ error: "Name is required" });
  if (handle && !handle.startsWith("@")) handle = `@${handle}`;
  if (!Array.isArray(specialties)) return res.status(400).json({ error: "Specialties must be a list" });
  specialties = specialties.map(s => String(s).trim()).filter(Boolean).slice(0, 6);

  await db.prepare(`UPDATE validators SET name = ?, handle = ?, specialties_json = ? WHERE id = ?`)
    .run(name, handle || null, JSON.stringify(specialties), v.id);

  res.json({ name, handle: handle || null, specialties });
});
