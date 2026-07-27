import { Router } from "express";
import { CATEGORIES, PTYPES, REWARDS, FILTERS, PLATFORM_FEE_PCT } from "../meta.js";

export const router = Router();

router.get("/", async (req, res) => {
  res.json({ categories: CATEGORIES, ptypes: PTYPES, rewards: REWARDS, filters: FILTERS, platformFeePct: PLATFORM_FEE_PCT });
});
