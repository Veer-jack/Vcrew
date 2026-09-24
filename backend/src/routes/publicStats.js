import { Router } from "express";
import { db } from "../db.js";

// GET /api/public/stats — the ONLY endpoint the public marketing site
// (backend/site/*.html) is allowed to call with no login at all, since a
// random visitor has no auth context. Deliberately minimal: a couple of
// safe, read-only aggregate counts, nothing per-record or identifying.
export const router = Router();

router.get("/", async (req, res) => {
  const row = await db.prepare(`SELECT COUNT(*) as n FROM validators WHERE verified = 1`).get();
  res.json({ verifiedValidators: Number(row?.n) || 0 });
});
