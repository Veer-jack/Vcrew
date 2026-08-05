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
    sql += ` AND (name ILIKE ? OR location ILIKE ? OR city ILIKE ? OR bio ILIKE ?)`; 
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); 
  }
  if (city) { 
    sql += ` AND (location = ? OR city = ?)`; 
    params.push(city, city); 
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

    // Calculate Trust Score based on 5.0 scale rating (Rating * 20 = 100 max)
    const trustScore = Math.round((v.rating || 0) * 20);
    
    // Dynamically fallback role to validator_type if unassigned
    const rawType = v.validator_type ? v.validator_type.charAt(0).toUpperCase() + v.validator_type.slice(1) : "User";
    const finalRole = v.role === "User" || !v.role ? rawType : (v.role || "User");

    // Calculate a dynamic match percentage based on profile completeness and rating
    const completeness = (v.location ? 20 : 0) + (v.bio ? 20 : 0) + (expertise.length > 0 ? 30 : 0) + (v.verified ? 30 : 0);
    const match_pct = Math.min(100, 50 + completeness); 

    return {
      id: v.id, 
      name: v.name, 
      role: finalRole, 
      city: v.city || v.location || "Unknown", 
      occ: v.occupation || "Unspecified", 
      industry: v.industry || "Unspecified", 
      verified: !!v.verified, 
      expertise: expertise,
      match: match_pct,
      trust: trustScore,
      age_group: v.age_group,
      gender: v.gender,
      income: v.income_bracket,
      marital: v.marital_status,
      has_kids: v.has_kids,
      profileCompletion: v.profile_completion || 60,
    };
  });

  res.json({ members: mapped, filters: FILTERS });
});
