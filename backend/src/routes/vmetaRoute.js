import { Router } from "express";
import { VTYPES, TYPE_ORDER, LEVELS, BADGES, EXPERTISE, NOTIF_CATS, HELP_ARTICLES, REWARD_BANDS, TIME_BANDS, SORTS } from "../vmeta.js";

export const router = Router();

router.get("/", (req, res) => {
  res.json({ vtypes: VTYPES, typeOrder: TYPE_ORDER, levels: LEVELS, badges: BADGES, expertise: EXPERTISE, notifCats: NOTIF_CATS, helpArticles: HELP_ARTICLES, rewardBands: REWARD_BANDS, timeBands: TIME_BANDS, sorts: SORTS });
});
