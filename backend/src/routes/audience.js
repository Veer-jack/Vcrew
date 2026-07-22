import { Router } from "express";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";
import { FILTERS } from "../meta.js";

export const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  const { q, city, verified } = req.query;
  let sql = `SELECT * FROM validators WHERE 1=1`;
  const params = [];
  
  if (q) { 
    sql += ` AND (name ILIKE ? OR location ILIKE ? OR bio ILIKE ?)`; 
    params.push(`%${q}%`, `%${q}%`, `%${q}%`); 
  }
  if (city) { 
    sql += ` AND location = ?`; 
    params.push(city); 
  }
  if (verified === "true") { 
    sql += ` AND verified = 1`; 
  }
  
  // Order by rating so highest rated real validators show up first
  sql += ` ORDER BY rating DESC`;

  const rows = await db.prepare(sql).all(...params);
  
  const mapped = rows.map(v => {
    let expertise = [];
    try { expertise = JSON.parse(v.specialties_json || "[]"); } catch (e) {}

    // Calculate a dynamic match percentage based on profile completeness and rating
    const completeness = (v.location ? 20 : 0) + (v.bio ? 20 : 0) + (expertise.length > 0 ? 30 : 0) + (v.verified ? 30 : 0);
    // Base match is 50, scales up to 100 based on completeness
    const match_pct = Math.min(100, 50 + completeness); 

    return {
      id: v.id, 
      name: v.name, 
      role: v.role || "User", 
      city: v.location || "Unknown", 
      occ: v.occupation || "Unspecified", 
      industry: v.industry || "Unspecified", 
      verified: !!v.verified, 
      expertise: expertise,
      match: match_pct,
    };
  });

  res.json({ members: mapped, filters: FILTERS });
});
