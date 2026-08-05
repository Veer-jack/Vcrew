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

// POST /api/audience/match-count { Geography, Demographics, Professional, Interests, "ValidationCrew Role" }
// Real, filter-aware count against the actual validators table — same audience shape and
// matching semantics as the Audience Explorer's client-side matchOption(), just done in SQL
// (a WHERE clause returning one number) instead of fetching every one of ~3,000 rows over
// the network and filtering in JS on every keystroke. Each group is AND'd together; values
// within a group are OR'd, matching the original client-side semantics exactly.
router.post("/match-count", async (req, res) => {
  const audience = req.body || {};
  const clauses = [];
  const params = [];

  for (const [group, values] of Object.entries(audience)) {
    if (!Array.isArray(values) || !values.length) continue;

    if (group === "Geography") {
      if (values.some(v => /worldwide|remote/i.test(v))) continue; // matches everyone — no restriction needed
      const ors = values.map(v => {
        params.push(`%${v}%`, `%${v}%`, `%${v}%`, `%${v}%`, `%${v}%`);
        return `(city ILIKE ? OR location ILIKE ? OR address_city ILIKE ? OR address_state ILIKE ? OR address_country ILIKE ?)`;
      });
      clauses.push(`(${ors.join(" OR ")})`);
    } else if (group === "ValidationCrew Role") {
      // Same fallback as the Audience Explorer: unassigned/"User" role falls back to validator_type.
      clauses.push(`(CASE WHEN role IS NULL OR role = 'User' THEN INITCAP(validator_type) ELSE role END) = ANY(?)`);
      params.push(values);
    } else if (group === "Professional") {
      clauses.push(`occupation = ANY(?)`);
      params.push(values);
    } else if (group === "Interests") {
      clauses.push(`(industry = ANY(?) OR specialties_json ILIKE ANY(?))`);
      params.push(values, values.map(v => `%"${v}"%`));
    } else if (group === "Demographics") {
      const demoClauses = [];
      const ages = values.filter(v => FILTERS.Demographics.Age.includes(v));
      if (ages.length) { demoClauses.push(`age_group = ANY(?)`); params.push(ages); }

      const genders = values.filter(v => FILTERS.Demographics.Gender.includes(v));
      if (genders.length) { demoClauses.push(`gender = ANY(?)`); params.push(genders); }

      const incomes = values.filter(v => FILTERS.Demographics["Income Bracket"].includes(v));
      if (incomes.length) { demoClauses.push(`income_bracket = ANY(?)`); params.push(incomes); }

      const maritals = values.filter(v => FILTERS.Demographics["Marital Status"].includes(v));
      if (maritals.length) { demoClauses.push(`marital_status = ANY(?)`); params.push(maritals); }

      const kids = values.filter(v => FILTERS.Demographics["Has Kids"].includes(v));
      if (kids.length) { demoClauses.push(`has_kids = ANY(?)`); params.push(kids); }

      if (demoClauses.length) {
        clauses.push(`(${demoClauses.join(" AND ")})`);
      }
    }
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  // Passed as a single array, not spread: db.js's param-flattening helper unwraps a
  // *single* array-valued bind param (our `= ANY(?)` case) when spread produces exactly
  // one argument — this call shape is what that helper actually expects instead.
  const row = await db.prepare(`SELECT COUNT(*) AS c FROM validators ${where}`).get(params);

  res.json({ count: parseInt(row.c, 10) || 0 });
});
