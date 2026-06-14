import { Router } from "express";
import { CATEGORIES, PTYPES, REWARDS, FILTERS } from "../meta.js";

export const router = Router();

router.get("/", (req, res) => {
  res.json({ categories: CATEGORIES, ptypes: PTYPES, rewards: REWARDS, filters: FILTERS });
});
