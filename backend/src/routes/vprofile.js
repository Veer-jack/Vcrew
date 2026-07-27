import { Router } from "express";
import { db } from "../db.js";
import { validatorAuthMiddleware } from "../auth.js";
import { LEVELS, BADGES, EXPERTISE, levelForCompleted } from "../vmeta.js";

export const router = Router();
router.use(validatorAuthMiddleware);

router.get("/", async (req, res) => {
  const v = req.validator;
  const missionsDone = v.missions_done || 0;
  const lvl = levelForCompleted(missionsDone);
  const nextLvl = LEVELS.find(l => l.n === lvl.n + 1) || null;
  const lvlPct = nextLvl ? Math.min(100, Math.round(((missionsDone - lvl.min) / (nextLvl.min - lvl.min)) * 100)) : 100;

  // Role Promotion Logic (User -> Tester -> Validator)
  let calcRole = "User";
  
  const statsRow = await db.prepare(`
    SELECT
      COUNT(*) as total_graded,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as total_approved
    FROM responses
    WHERE validator_id = ? AND status IN ('approved', 'rejected')
  `).get(v.id);

  let accuracy = 100;
  if (statsRow && statsRow.total_graded > 0) {
    accuracy = Math.round((Number(statsRow.total_approved) / Number(statsRow.total_graded)) * 100);
  }
  const streak = v.streak || 0;
  
  if (missionsDone >= 5 && accuracy >= 90) calcRole = "Tester";
  if (v.verified && v.occupation) calcRole = "Validator";

  if (calcRole !== v.role) {
    await db.prepare(`UPDATE validators SET role = ? WHERE id = ?`).run(calcRole, v.id);
    v.role = calcRole;
  }

  // Dynamically evaluate badges
  const dynamicBadges = BADGES.map(b => {
    let got = false;
    if (b.label === "Identity verified") got = !!v.phone_verified;
    if (b.label === "AI specialist") got = (missionsDone >= 50 && accuracy >= 90);
    if (b.label === "30-day streak") got = (streak >= 4);
    if (b.label === "Top 5% rated") got = (v.rating >= 4.8 && (v.reviews_count || 0) >= 50);
    if (b.label === "SaaS expert") got = (missionsDone >= 25);
    if (b.label === "Perfectionist") got = (accuracy >= 98 && missionsDone >= 30);
    return { ...b, got };
  });

  // Calculate true expertise based on actual category history
  const categoryCounts = await db.prepare(`
    SELECT m.ptype, COUNT(*) as c
    FROM v_my_missions vmm
    JOIN missions m ON vmm.mission_id = m.id
    WHERE vmm.validator_id = ? AND vmm.status = 'completed'
    GROUP BY m.ptype
  `).all(v.id);

  let countAi = 0, countDev = 0, countLanding = 0, countProto = 0;
  for (const row of categoryCounts) {
    if (row.ptype === 'ai') countAi += row.c;
    else if (row.ptype === 'landing') countLanding += row.c;
    else if (row.ptype === 'prototype') countProto += row.c;
    else countDev += row.c; // mvp, idea, or others fallback
  }

  const dynamicExpertise = [
    { l: "AI products", v: Math.min(99, 40 + (countAi * 5) + (v.rating >= 4.5 && countAi > 0 ? 5 : 0)) },
    { l: "Dev tools & SaaS", v: Math.min(99, 40 + (countDev * 5)) },
    { l: "Landing pages", v: Math.min(99, 40 + (countLanding * 5)) },
    { l: "Prototypes", v: Math.min(99, 40 + (countProto * 5)) }
  ];

  const earningsAgg = await db.prepare(`
    SELECT SUM(m.reward_amount) as lifetime
    FROM v_my_missions vmm
    JOIN missions m ON vmm.mission_id = m.id
    WHERE vmm.validator_id = ? AND vmm.status = 'completed'
  `).get(v.id);

  res.json({
    name: v.name, handle: v.handle, level: lvl.n, levelName: lvl.name,
    rating: v.rating, ratingCount: v.reviews_count || 0, accuracy: accuracy, streak: streak,
    specialties: JSON.parse(v.specialties_json || "[]"),
    acceptRate: 100, completed: missionsDone, lifetime: earningsAgg?.lifetime || 0,
    levelPct: lvlPct, nextLevel: nextLvl,
    levels: LEVELS, badges: dynamicBadges, expertise: dynamicExpertise,
    phone: v.phone_verified ? v.phone : null, phoneVerified: !!v.phone_verified,
    payoutVpa: v.payout_vpa || null,
    role: v.role, occupation: v.occupation, 
    industry: v.industry || (v.industry_json && v.industry_json !== '[]' ? JSON.parse(v.industry_json).join(", ") : ""),
    location: v.location || v.city, bio: v.bio,
    address: {
      line1: v.address_line1 || "", line2: v.address_line2 || "",
      city: v.address_city || "", state: v.address_state || "",
      postalCode: v.address_postal_code || "", country: v.address_country || "",
    }
  });
});

// PATCH / { name, handle, occupation, industry, location, bio, specialties }
router.patch("/", async (req, res) => {
  const v = req.validator;
  const name = String(req.body?.name ?? v.name).trim();
  let handle = req.body?.handle === undefined ? v.handle : String(req.body.handle).trim();
  let occupation = req.body?.occupation === undefined ? v.occupation : String(req.body.occupation).trim();
  let industry = req.body?.industry === undefined ? v.industry : String(req.body.industry).trim();
  let location = req.body?.location === undefined ? v.location : String(req.body.location).trim();
  let bio = req.body?.bio === undefined ? v.bio : String(req.body.bio).trim();
  let specialties = req.body?.specialties === undefined ? JSON.parse(v.specialties_json || "[]") : req.body.specialties;
  const addr = req.body?.address || {};
  const addressLine1 = addr.line1 === undefined ? v.address_line1 : String(addr.line1).trim();
  const addressLine2 = addr.line2 === undefined ? v.address_line2 : String(addr.line2).trim();
  const addressCity = addr.city === undefined ? v.address_city : String(addr.city).trim();
  const addressState = addr.state === undefined ? v.address_state : String(addr.state).trim();
  const addressPostalCode = addr.postalCode === undefined ? v.address_postal_code : String(addr.postalCode).trim();
  const addressCountry = addr.country === undefined ? v.address_country : String(addr.country).trim();

  if (!name) return res.status(400).json({ error: "Name is required" });
  if (handle && !handle.startsWith("@")) handle = `@${handle}`;
  if (!Array.isArray(specialties)) return res.status(400).json({ error: "Specialties must be a list" });
  specialties = specialties.map(s => String(s).trim()).filter(Boolean).slice(0, 6);

  await db.prepare(`UPDATE validators SET name = ?, handle = ?, occupation = ?, industry = ?, location = ?, bio = ?, specialties_json = ?,
      address_line1 = ?, address_line2 = ?, address_city = ?, address_state = ?, address_postal_code = ?, address_country = ? WHERE id = ?`)
    .run(name, handle || null, occupation || null, industry || null, location || null, bio || null, JSON.stringify(specialties),
      addressLine1 || null, addressLine2 || null, addressCity || null, addressState || null, addressPostalCode || null, addressCountry || null, v.id);

  res.json({
    name, handle: handle || null, occupation: occupation || null, industry: industry || null, location: location || null, bio: bio || null, specialties,
    address: { line1: addressLine1 || "", line2: addressLine2 || "", city: addressCity || "", state: addressState || "", postalCode: addressPostalCode || "", country: addressCountry || "" }
  });
});
