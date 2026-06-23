import { Router } from "express";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";
import { FILTERS } from "../meta.js";

export const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  const { q, city, role, industry, verified } = req.query;
  let sql = `SELECT * FROM audience_members WHERE 1=1`;
  const params = [];
  if (q) { sql += ` AND name LIKE ?`; params.push(`%${q}%`); }
  if (city) { sql += ` AND city = ?`; params.push(city); }
  if (role) { sql += ` AND role = ?`; params.push(role); }
  if (industry) { sql += ` AND industry = ?`; params.push(industry); }
  if (verified === "true") { sql += ` AND verified = 1`; }
  sql += ` ORDER BY match_pct DESC`;

  const rows = db.prepare(sql).all(...params).map(a => ({
    id: a.id, name: a.name, role: a.role, city: a.city, occ: a.occupation,
    industry: a.industry, verified: !!a.verified, expertise: JSON.parse(a.expertise_json || "[]"),
    match: a.match_pct,
  }));

  res.json({ members: rows, filters: FILTERS });
});
