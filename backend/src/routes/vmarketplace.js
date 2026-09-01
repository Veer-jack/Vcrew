import { Router } from "express";
import { db } from "../db.js";
import { validatorAuthMiddleware, flagFraud } from "../auth.js";
import { VTYPES, TYPE_ORDER, deadlineHours } from "../vmeta.js";
import { translateBatch } from "../translate.js";
import { getRealJoinedCount } from "../stats.js";

export const router = Router();
router.use(validatorAuthMiddleware);

// Builder-facing `ptype` (backend/src/meta.js PTYPES) has no direct overlap with the
// Discover taxonomy (backend/src/vmeta.js VTYPES), so real missions always fell back to
// "mvp". Map by how the validation actually happens rather than forcing every ptype in.
// "ai" and "prototype" have no reliable signal in ptype/category, so they only populate
// from legacy vtasks rows or explicit future tagging — that's expected, not a bug.
const PTYPE_TO_VTYPE = {
  webtest: "landing",
  apptest: "mvp",
  ptest: "mvp",
  trial: "mvp",
  video: "mvp",
  survey: "idea",
  interview: "idea",
  focus: "idea",
};

const resolveType = (typeStr) => {
  if (!typeStr) return "mvp";
  if (VTYPES[typeStr]) return typeStr;
  if (PTYPE_TO_VTYPE[typeStr]) return PTYPE_TO_VTYPE[typeStr];
  const found = Object.values(VTYPES).find(v => (v.label || "").toLowerCase() === String(typeStr).toLowerCase() || (v.short || "").toLowerCase() === String(typeStr).toLowerCase());
  return found ? found.key : "mvp";
};

async function serializeTask(t, savedIds, myContext, inviteContext) {
  const normType = resolveType(t.ptype || t.type || t.raw_type);
  const product = t.product || t.name || "";
  const tagline = t.tagline || (t.description ? t.description.slice(0, 100) : "");
  const company = t.company || t.brand || "Independent";
  const reward = t.reward ?? t.reward_amount ?? 0;
  const minutes = t.minutes ?? 10;
  const spotsTotal = t.spots_total ?? t.spotsTotal ?? t.target ?? 0;
  const spotsLeft = t.spots_left ?? t.spotsLeft ?? Math.max(0, spotsTotal - (t.joined || 0));
  // deadline_label is precomputed (TO_CHAR ... 'Mon DD') by the list queries
  // that already know to do it -- this single-fetch route's plain SELECT *
  // doesn't, so t.deadline was leaking through as a raw, unformatted
  // timestamp (e.g. "2026-09-18T00:00:00.000Z") instead of a real label.
  // Format it here too so every caller is covered, not just the ones that
  // remember to precompute it in SQL.
  const deadline = t.deadline_label || (t.deadline ? new Date(t.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Soon");
  
  let postedH = t.posted_h ?? t.postedH;
  if (postedH === undefined && t.created_at) {
    postedH = Math.floor((Date.now() - new Date(t.created_at).getTime()) / 3600000);
  }
  postedH = postedH || 24;
  
  const brief = t.brief || t.description || "";
  const stepsRaw = t.steps_json || t.tasks_json || "[]";
  let steps = [];
  try { steps = JSON.parse(stepsRaw).map(s => typeof s === 'string' ? s : (s.title || s.description || 'Task')); } catch {}
  
  const hot = t.hot !== undefined ? !!t.hot : ((t.joined || 0) > ((t.target || 1) / 2));
  const verified = t.verified !== undefined ? !!t.verified : true;
  const featured = !!t.featured;

  return {
    id: t.id, type: normType, ptype: t.ptype || null, category: t.category || null, product, tagline, company,
    reward, minutes, match: t.match_pct || t.match || 90, spotsLeft, spotsTotal,
    deadline, postedH, brief, steps,
    hot, verified, featured,
    saved: savedIds.has(t.id), 
    status: t.status || "active",
    myStatus: myContext[t.id]?.status || null,
    myScore: myContext[t.id]?.score || null,
    myReason: myContext[t.id]?.reason || null,
    inviteId: inviteContext ? inviteContext[t.id] : null,
  };
}

async function loadContext(validatorId) {
  const savedRows = await db.prepare(`SELECT task_id FROM v_saved WHERE validator_id = ?`).all(validatorId);
  const savedIds = new Set(savedRows.map(r => r.task_id));
  const myRows = await db.prepare(`SELECT task_id, mission_id, status, score, reason FROM v_my_missions WHERE validator_id = ?`).all(validatorId);
  const myContext = Object.fromEntries(myRows.map(r => [r.mission_id || r.task_id, { status: r.status, score: r.score, reason: r.reason }]));
  const inviteRows = await db.prepare(`SELECT id, mission_id FROM mission_invitations WHERE validator_id = ? AND status = 'pending'`).all(validatorId);
  const inviteContext = Object.fromEntries(inviteRows.map(r => [r.mission_id, r.id]));
  return { savedIds, myContext, inviteContext };
}

router.get("/", async (req, res) => {
  const { q, types, reward, time, verified, minMatch, sort } = req.query;
  const { savedIds, myContext, inviteContext } = await loadContext(req.validator.id);

  // We use a CTE to unify the schema so we can filter at the DB level, preventing Node.js OOM
  const baseCTE = `
    WITH base_tasks AS (
      SELECT id::text, COALESCE(ptype, 'mvp')::text as raw_type, name::text as product, description::text as tagline, COALESCE(brand, 'Independent')::text as company, 
             COALESCE(reward_amount, 0)::int as reward, 10::int as minutes, 90::int as match_pct, GREATEST(0, COALESCE(target, 0) - COALESCE(joined, 0))::int as spots_left, 
             COALESCE(target, 0)::int as spots_total, COALESCE(TO_CHAR(deadline, 'Mon DD'), 'Soon')::text as deadline_label, FLOOR(EXTRACT(EPOCH FROM (NOW() - created_at))/3600)::int as posted_h,
             description::text as brief, tasks_json::text as steps_json, (COALESCE(joined,0) > COALESCE(target,1)/2)::boolean as hot, true::boolean as verified, 
             false::boolean as featured, 'missions' as source, status::text as status
      FROM missions WHERE status IN ('active','live','published')
      UNION ALL
      SELECT id::text, type::text as raw_type, product::text, tagline::text, company::text, reward::int, minutes::int, match_pct::int, spots_left::int, 
             spots_total::int, deadline_label::text, posted_h::int, brief::text, steps_json::text, hot::boolean, verified::boolean, featured::boolean, 'vtasks' as source, 'active' as status
      FROM vtasks
    )
  `;

  // Normalization logic in JS is safer for mapping the exact strings, but filtering is pushed down where possible.
  const rawRows = await db.prepare(baseCTE + ` SELECT * FROM base_tasks`).all();
  const sourceById = new Map(rawRows.map(t => [t.id, t.source]));
  let tasks = await Promise.all(rawRows.map(t => serializeTask(t, savedIds, myContext, inviteContext)));

  // Calculate un-filtered totals for categories (normalized)
  const categories = TYPE_ORDER.map(k => ({
    key: k, label: VTYPES[k].label, blurb: VTYPES[k].blurb,
    count: tasks.filter(t => t.type === k).length,
  }));
  const total = tasks.length;
  const featured = tasks.find(t => t.featured) || null;

  if (q) {
    const needle = q.toLowerCase();
    tasks = tasks.filter(t => (t.product + t.tagline + t.company + t.brief).toLowerCase().includes(needle));
  }
  if (types) {
    const typeSet = new Set(String(types).split(",").filter(Boolean));
    if (typeSet.size) tasks = tasks.filter(t => typeSet.has(t.type));
  }
  const REWARD_TESTS = { lt100: r => r < 100, mid: r => r >= 100 && r <= 200, gt200: r => r > 200 };
  if (reward && REWARD_TESTS[reward]) tasks = tasks.filter(t => REWARD_TESTS[reward](t.reward));
  const TIME_TESTS = { lt10: m => m < 10, mid: m => m >= 10 && m <= 20, gt20: m => m > 20 };
  if (time && TIME_TESTS[time]) tasks = tasks.filter(t => TIME_TESTS[time](t.minutes));
  if (verified === "true") tasks = tasks.filter(t => t.verified);
  if (minMatch) tasks = tasks.filter(t => t.match >= Number(minMatch));

  const cmp = {
    match: (a, b) => b.match - a.match,
    reward: (a, b) => b.reward - a.reward,
    closing: (a, b) => deadlineHours(a.deadline) - deadlineHours(b.deadline),
    newest: (a, b) => a.postedH - b.postedH,
  }[sort] || ((a, b) => b.match - a.match);
  tasks.sort(cmp);

  const lang = req.validator.preferred_language;
  if (lang && lang !== "en") {
    const items = [];
    for (const t of tasks) {
      const entityType = `marketplace_${sourceById.get(String(t.id)) || "task"}`;
      items.push({ entityType, entityId: Number(t.id), field: "product", text: t.product });
      items.push({ entityType, entityId: Number(t.id), field: "tagline", text: t.tagline });
      items.push({ entityType, entityId: Number(t.id), field: "brief", text: t.brief });
    }
    const translated = await translateBatch(items, lang);
    for (const t of tasks) {
      const entityType = `marketplace_${sourceById.get(String(t.id)) || "task"}`;
      t.product = translated.get(`${entityType}:${Number(t.id)}:product`) ?? t.product;
      t.tagline = translated.get(`${entityType}:${Number(t.id)}:tagline`) ?? t.tagline;
      t.brief = translated.get(`${entityType}:${Number(t.id)}:brief`) ?? t.brief;
    }
  }

  res.json({ tasks, total, categories, featured });
});

// GET /api/v/marketplace/:id
router.get("/:id", async (req, res) => {
  let t = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(req.params.id);
  let source = "mission";
  if (!t) {
    t = await db.prepare(`SELECT * FROM vtasks WHERE id = ?`).get(req.params.id);
    source = "vtask";
  }
  if (!t) return res.status(404).json({ error: "Mission not found" });

  const { savedIds, myContext, inviteContext } = await loadContext(req.validator.id);
  const serialized = await serializeTask(t, savedIds, myContext, inviteContext);

  const lang = req.validator.preferred_language;
  if (lang && lang !== "en") {
    const entityType = `marketplace_${source}`;
    const entityId = Number(serialized.id);
    const items = [
      { entityType, entityId, field: "product", text: serialized.product },
      { entityType, entityId, field: "tagline", text: serialized.tagline },
      { entityType, entityId, field: "brief", text: serialized.brief },
      ...serialized.steps.map((s, i) => ({ entityType, entityId, field: `steps.${i}`, text: s })),
    ];
    const translated = await translateBatch(items, lang);
    serialized.product = translated.get(`${entityType}:${entityId}:product`) ?? serialized.product;
    serialized.tagline = translated.get(`${entityType}:${entityId}:tagline`) ?? serialized.tagline;
    serialized.brief = translated.get(`${entityType}:${entityId}:brief`) ?? serialized.brief;
    serialized.steps = serialized.steps.map((s, i) => translated.get(`${entityType}:${entityId}:steps.${i}`) ?? s);
  }

  res.json({ task: { ...serialized, src: source }, rubric: VTYPES[serialized.type] });
});

// POST /api/v/marketplace/:id/save  { saved: true|false }
router.post("/:id/save", async (req, res) => {
  let t = await db.prepare(`SELECT id FROM missions WHERE id = ?`).get(req.params.id);
  if (!t) {
    t = await db.prepare(`SELECT id FROM vtasks WHERE id = ?`).get(req.params.id);
  }
  if (!t) return res.status(404).json({ error: "Mission not found" });
  
  const saved = !!req.body?.saved;
  if (saved) {
    try {
      await db.prepare(`INSERT INTO v_saved (validator_id, task_id) VALUES (?, ?) ON CONFLICT DO NOTHING`).run(req.validator.id, t.id);
    } catch(e) {
      // Ignored for real missions due to vtasks FK constraint, unless dropped
    }
  } else {
    await db.prepare(`DELETE FROM v_saved WHERE validator_id = ? AND task_id = ?`).run(req.validator.id, t.id);
  }
  res.json({ ok: true, saved });
});

// POST /api/v/marketplace/:id/apply — apply & immediately start (matches "Apply -> Accepted -> Start now" flow)
router.post("/:id/apply", async (req, res) => {
  // A bare signup only captures name/email/password — occupation (along with
  // every other demographic/professional field builders actually filter on)
  // stays empty until onboarding, which isn't otherwise enforced. Without this
  // gate, a validator could join and submit work before the profile Audience
  // Builder is supposed to be matching against has any real data in it.
  if (!req.validator.occupation) {
    return res.status(403).json({ error: "Complete your profile before joining a mission.", code: "ONBOARDING_REQUIRED" });
  }
  let t = await db.prepare(`SELECT id, builder_id, status FROM missions WHERE id = ?`).get(req.params.id);
  let isRealMission = !!t;
  if (!t) {
    t = await db.prepare(`SELECT id, 'active' as status FROM vtasks WHERE id = ?`).get(req.params.id);
  }
  if (!t) return res.status(404).json({ error: "Mission not found" });
  if (t.status !== "active" && t.status !== "live" && t.status !== "published") {
    return res.status(400).json({ error: "This mission is no longer accepting participants." });
  }

  let existing;
  if (isRealMission) {
    existing = await db.prepare(`SELECT * FROM v_my_missions WHERE validator_id = ? AND mission_id = ?`).get(req.validator.id, t.id);
  } else {
    existing = await db.prepare(`SELECT * FROM v_my_missions WHERE validator_id = ? AND task_id = ?`).get(req.validator.id, t.id);
  }

  if (existing?.status === "declined") {
    return res.status(400).json({ error: "You declined this mission. Undo that from My Missions if you'd like to apply." });
  }
  if (existing) return res.json({ myMission: existing });

  if (isRealMission) {
    try {
      const val = await db.prepare(`SELECT name FROM validators WHERE id = ?`).get(req.validator.id);
      const missionCategory = await db.prepare(`SELECT name, category FROM missions WHERE id = ?`).get(t.id);

      await db.transaction(async (tx) => {
        // Lock the mission row so a concurrent apply can't pass the capacity
        // check before this one's participant row actually commits — the
        // check and the reservation now happen in the same transaction as
        // the insert itself, instead of a separate pre-step a failed insert
        // then has to manually compensate for (the old revert-on-failure
        // path could leave `joined` permanently drifted if the process died
        // between the increment and the compensating decrement).
        const mission = await tx.prepare(`SELECT target FROM missions WHERE id = ? FOR UPDATE`).get(t.id);
        if (!mission) throw new Error("MISSION_NOT_FOUND");

        // If two requests pass the 'existing' check above, re-check inside the
        // lock to avoid a duplicate participants row.
        const doubleCheck = await tx.prepare(`SELECT id FROM v_my_missions WHERE validator_id = ? AND mission_id = ?`).get(req.validator.id, t.id);
        if (doubleCheck) throw new Error("DUPLICATE");

        if (mission.target > 0) {
          const realJoined = await getRealJoinedCount(t.id, tx);
          if (realJoined >= mission.target) throw new Error("MISSION_FULL");
        }

        await tx.prepare(`UPDATE missions SET joined = joined + 1 WHERE id = ?`).run(t.id);

        await tx.prepare(`INSERT INTO v_my_missions (validator_id, mission_id, status, progress, status_label) VALUES (?, ?, 'active', 0, 'Accepted just now')`)
          .run(req.validator.id, t.id);

        await tx.prepare(`INSERT INTO participants (mission_id, validator_id, name, role, city, stage, reward, trust) VALUES (?, ?, ?, 'Validator', 'Unknown', 'accepted', 0, 95)`)
          .run(t.id, req.validator.id, val ? val.name : "New Validator");

        if (missionCategory?.category === "sample") {
          await tx.prepare(`INSERT INTO sample_shipments (mission_id, validator_id, status) VALUES (?, ?, 'awaiting_shipment')`)
            .run(t.id, req.validator.id);
        }

        await tx.prepare(`
          INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id)
          VALUES (?, 'application', 'participant_joined', 'userplus', 'primary', ?, ?, 'Just now', 1, ?)
        `).run(t.builder_id, "New Participant Joined", `${val ? val.name : "A new validator"} has joined your mission "${missionCategory?.name || 'Unknown'}".`, t.id);
      });

    } catch (err) {
      if (err.message === "MISSION_FULL") {
        return res.status(400).json({ error: "Mission has reached its maximum capacity and is no longer available" });
      }
      if (err.message === "MISSION_NOT_FOUND") {
        return res.status(404).json({ error: "Mission not found" });
      }
      // DUPLICATE, or any other unexpected failure inside the transaction.
      return res.status(400).json({ error: "You have already accepted this mission" });
    }
  } else {
    const doubleCheck = await db.prepare(`SELECT id FROM v_my_missions WHERE validator_id = ? AND task_id = ?`).get(req.validator.id, t.id);
    if (!doubleCheck) {
      await db.prepare(`INSERT INTO v_my_missions (validator_id, task_id, status, progress, status_label) VALUES (?, ?, 'active', 0, 'Accepted just now')`)
        .run(req.validator.id, t.id);
    }
  }

  // Velocity check
  const dailyCount = Number((await db.prepare(`SELECT COUNT(*) AS n FROM v_my_missions WHERE validator_id = ? AND created_at > NOW() - INTERVAL '24 hours'`).get(req.validator.id)).n);
  if (dailyCount >= 15) {
    flagFraud("high_velocity_applications", "validator", req.validator.id,
      `${dailyCount} mission applications in the last 24 hours`, "medium");
  }

  let myMission;
  if (isRealMission) {
    myMission = await db.prepare(`SELECT * FROM v_my_missions WHERE validator_id = ? AND mission_id = ?`).get(req.validator.id, t.id);
  } else {
    myMission = await db.prepare(`SELECT * FROM v_my_missions WHERE validator_id = ? AND task_id = ?`).get(req.validator.id, t.id);
  }
  
  res.status(201).json({ myMission });
});

// POST /api/v/marketplace/:id/decline — validator declines a mission, whether
// they were invited to it or just browsing it in Discover. Declining blocks
// re-applying/re-accepting (see the existing check in POST /:id/apply and
// POST /missions/invitations/:id/accept) until explicitly undone below.
router.post("/:id/decline", async (req, res) => {
  let t = await db.prepare(`SELECT id, builder_id, name FROM missions WHERE id = ?`).get(req.params.id);
  const isRealMission = !!t;
  if (!t) t = await db.prepare(`SELECT id FROM vtasks WHERE id = ?`).get(req.params.id);
  if (!t) return res.status(404).json({ error: "Mission not found" });

  const existing = isRealMission
    ? await db.prepare(`SELECT * FROM v_my_missions WHERE validator_id = ? AND mission_id = ?`).get(req.validator.id, t.id)
    : await db.prepare(`SELECT * FROM v_my_missions WHERE validator_id = ? AND task_id = ?`).get(req.validator.id, t.id);

  if (existing && existing.status !== "declined") {
    return res.status(400).json({ error: "You're already participating in this mission." });
  }

  await db.transaction(async (tx) => {
    if (!existing) {
      if (isRealMission) {
        await tx.prepare(`INSERT INTO v_my_missions (validator_id, mission_id, status, status_label) VALUES (?, ?, 'declined', 'Declined')`).run(req.validator.id, t.id);
      } else {
        await tx.prepare(`INSERT INTO v_my_missions (validator_id, task_id, status, status_label) VALUES (?, ?, 'declined', 'Declined')`).run(req.validator.id, t.id);
      }
    }

    // A pending invitation for this mission gets declined too, in the same
    // action — this replaces the old invitation-only decline endpoint's
    // effect, unified under one Decline button regardless of entry point.
    if (isRealMission) {
      const invite = await tx.prepare(`SELECT * FROM mission_invitations WHERE mission_id = ? AND validator_id = ? AND status = 'pending'`).get(t.id, req.validator.id);
      if (invite) {
        await tx.prepare(`UPDATE mission_invitations SET status = 'declined' WHERE id = ?`).run(invite.id);
        // A real stage, not a delete -- see the same change in
        // vmissions.js's invitations/:id/decline for why.
        await tx.prepare(`UPDATE participants SET stage = 'declined' WHERE mission_id = ? AND validator_id = ? AND stage = 'invited'`).run(t.id, req.validator.id);
        await tx.prepare(`INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'application', 'invite_declined', 'xCircle', 'warning', ?, ?, 'Just now', 1, ?)`)
          .run(t.builder_id, "Invite Declined", `${req.validator.name} has declined your invitation for ${t.name}.`, t.id);
      }
    }
  });

  res.json({ ok: true });
});

// POST /api/v/marketplace/:id/undecline — reverses a decline, letting the
// validator apply/get invited to this mission again like normal.
router.post("/:id/undecline", async (req, res) => {
  let t = await db.prepare(`SELECT id FROM missions WHERE id = ?`).get(req.params.id);
  const isRealMission = !!t;
  if (!t) t = await db.prepare(`SELECT id FROM vtasks WHERE id = ?`).get(req.params.id);
  if (!t) return res.status(404).json({ error: "Mission not found" });

  if (isRealMission) {
    await db.prepare(`DELETE FROM v_my_missions WHERE validator_id = ? AND mission_id = ? AND status = 'declined'`).run(req.validator.id, t.id);
  } else {
    await db.prepare(`DELETE FROM v_my_missions WHERE validator_id = ? AND task_id = ? AND status = 'declined'`).run(req.validator.id, t.id);
  }

  res.json({ ok: true });
});

// POST /api/v/marketplace/:id/report — validator reports a mission for review
router.post("/:id/report", async (req, res) => {
  const { reason } = req.body || {};
  if (!reason || !String(reason).trim()) return res.status(400).json({ error: "A reason is required to report a mission" });

  const mission = await db.prepare(`SELECT id, name, flagged FROM missions WHERE id = ?`).get(req.params.id);
  if (!mission) {
    const t = await db.prepare(`SELECT id FROM vtasks WHERE id = ?`).get(req.params.id);
    if (t) return res.json({ ok: true }); // Mock tasks just return ok
    return res.status(404).json({ error: "Mission not found" });
  }

  // Flag the mission for admin review; if already flagged, append the new reason
  const existingReason = mission.flagged
    ? `${mission.flag_reason || ""}\nValidator report: ${String(reason).trim()}`
    : `Validator report: ${String(reason).trim()}`;

  await db.prepare(`UPDATE missions SET flagged = 1, flag_reason = ?, flagged_at = NOW() WHERE id = ?`)
    .run(existingReason.trim(), mission.id);

  res.json({ ok: true });
});
