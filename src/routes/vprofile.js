import { Router } from "express";
import { validatorAuthMiddleware } from "../auth.js";
import { LEVELS, BADGES, EXPERTISE } from "../vmeta.js";

export const router = Router();
router.use(validatorAuthMiddleware);

router.get("/", (req, res) => {
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
  });
});
