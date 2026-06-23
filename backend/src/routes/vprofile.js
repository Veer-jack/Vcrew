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

  res.json({
    name: v.name, handle: v.handle, level: v.level, levelName: lvl.name,
    rating: v.rating, ratingCount: v.rating_count, accuracy: v.accuracy, streak: v.streak,
    specialties: JSON.parse(v.specialties_json || "[]"),
    acceptRate: v.accept_rate, completed: v.completed, lifetime: v.lifetime,
    levelPct: lvlPct, nextLevel: nextLvl,
    levels: LEVELS, badges: BADGES, expertise: EXPERTISE,
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
