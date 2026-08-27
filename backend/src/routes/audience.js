import { Router } from "express";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";
import { FILTERS } from "../meta.js";

export const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  const { q, city, verified, missionId } = req.query;
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

  // The Invite modal used to list every validator on the platform regardless
  // of what audience the mission was actually built for — this scopes it down
  // to the same real audience-matching criteria the mission's own "N matching
  // members" count and Audience tab already use, so "Invite" only ever
  // surfaces people who actually fit this mission.
  let missionAudience = null;
  let invitedMap = {};
  if (missionId) {
    const mission = await db.prepare(`SELECT audience_json FROM missions WHERE id = ? AND builder_id = ?`).get(missionId, req.builder.id);
    if (mission) {
      if (mission.audience_json) {
        try { missionAudience = JSON.parse(mission.audience_json); } catch (e) {}
      }
      if (missionAudience) {
        const { clauses, params: audienceParams } = buildAudienceClauses(missionAudience);
        if (clauses.length) {
          sql += ` AND ${clauses.join(" AND ")}`;
          params.push(...audienceParams);
        }
      }
      const invites = await db.prepare(`SELECT validator_id, status FROM mission_invitations WHERE mission_id = ? AND status != 'cancelled'`).all(missionId);
      invitedMap = Object.fromEntries(invites.map(i => [i.validator_id, i.status]));
    }
  }

  // Order by rating so highest rated real validators show up first
  sql += ` ORDER BY rating DESC`;

  const { limit } = req.query;
  if (limit) {
    sql += ` LIMIT ?`;
    params.push(parseInt(limit, 10));
  }

  // Passed as one array, not spread — db.js's flat() unwraps a lone
  // array-valued argument back into "the whole params list" (that's how
  // getRealMatchCount below always calls it), which is exactly right for a
  // multi-param list but wrongly shreds a single ANY(?) array param (e.g.
  // just one audience filter group active) back into bare scalars if spread
  // turned it into the sole argument here instead.
  const rows = await db.prepare(sql).all(params);

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
      invitedStatus: invitedMap[v.id] || null,
    };
  });

  res.json({ members: mapped, filters: FILTERS, missionAudience });
});

// Shared by getRealMatchCount (the Audience Explorer/wizard's live reach
// count) and the GET / route above (the Invite modal's mission-scoped
// candidate list) — one clause builder so both agree on exactly what "this
// person matches the mission's audience" means. Each group is AND'd
// together; values within a group are OR'd.
function buildAudienceClauses(audience) {
  const clauses = [];
  const params = [];

  for (const [group, values] of Object.entries(audience || {})) {
    if (!Array.isArray(values) || !values.length) continue;

    if (group === "Geography") {
      // "Other" is a bare marker meaning "the builder typed a custom location as
      // a separate array entry" (see StepAudience in CreateMissionWizard.jsx) —
      // it carries no location info itself, so treat it as a no-op like
      // Worldwide/Remote rather than substring-matching the literal word "other".
      const specificGeo = values.filter(v => !/worldwide|remote/i.test(v) && v.toLowerCase() !== "other");
      if (specificGeo.length === 0) continue; // matches everyone — no restriction needed
      const ors = specificGeo.map(v => {
        params.push(`%${v}%`, `%${v}%`, `%${v}%`, `%${v}%`, `%${v}%`);
        return `(city ILIKE ? OR location ILIKE ? OR address_city ILIKE ? OR address_state ILIKE ? OR address_country ILIKE ?)`;
      });
      clauses.push(`(${ors.join(" OR ")})`);
    } else if (group === "ValidationCrew Role") {
      // Same fallback as the Audience Explorer: unassigned/"User" role falls back to validator_type.
      clauses.push(`(CASE WHEN role IS NULL OR role = 'User' THEN INITCAP(validator_type) ELSE role END) = ANY(?)`);
      params.push(values);
    } else if (group === "Professional") {
      // "Other" is a bare marker (see StepAudience/FilterGroup's otherEntries)
      // with no occupation info of its own — same no-op treatment as
      // Geography's "Other"/Worldwide/Remote below, otherwise it would
      // literally match on the word "Other" instead of the custom text
      // typed alongside it (which is already appended as its own entry).
      const specificOcc = values.filter(v => v.toLowerCase() !== "other");
      if (specificOcc.length) {
        clauses.push(`occupation = ANY(?)`);
        params.push(specificOcc);
      }
    } else if (group === "Interests") {
      const specificInterests = values.filter(v => v.toLowerCase() !== "other");
      if (specificInterests.length) {
        clauses.push(`(industry = ANY(?) OR specialties_json ILIKE ANY(?))`);
        params.push(specificInterests, specificInterests.map(v => `%"${v}"%`));
      }
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

  return { clauses, params };
}

export async function getRealMatchCount(db, audience) {
  const { clauses, params } = buildAudienceClauses(audience);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const row = await db.prepare(`SELECT COUNT(*) AS c FROM validators ${where}`).get(params);
  return parseInt(row.c, 10) || 0;
}

// POST /api/audience/match-count { Geography, Demographics, Professional, Interests, "ValidationCrew Role" }
// Real, filter-aware count against the actual validators table — same audience shape and
// matching semantics as the Audience Explorer's client-side matchOption(), just done in SQL
// (a WHERE clause returning one number) instead of fetching every one of ~3,000 rows over
// the network and filtering in JS on every keystroke. Each group is AND'd together; values
// within a group are OR'd, matching the original client-side semantics exactly.
router.post("/match-count", async (req, res) => {
  const audience = req.body || {};
  const count = await getRealMatchCount(db, audience);
  res.json({ count });
});
