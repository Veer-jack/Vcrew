import { db } from "./db.js";
import { ptypeOf } from "./meta.js";
import { buildAudienceClauses } from "./routes/audience.js";

/**
 * Fires asynchronously when a builder publishes a mission.
 * Targets validators who match the mission's full audience -- Geography,
 * Professional, Interests, Demographics and ValidationCrew Role, not just
 * role. This used to only ever check role (and, when the builder set no
 * role filter at all, silently defaulted to excluding Testers "to avoid
 * spam") -- a validator who matched on every other criterion the builder
 * actually set (city, occupation, interests...) could still browse the
 * mission in Discover (which applies no audience filtering of its own) yet
 * never get notified about it. buildAudienceClauses is the same matching
 * logic already used everywhere else a builder's audience gets checked
 * against real validators (Audience Explorer, the Invite modal, the live
 * match-count on the mission wizard), so "who gets notified" now agrees
 * with "who this mission is actually for" instead of its own narrower rule.
 */
export async function notifyMatchingValidators(missionId) {
  try {
    const mission = await db.prepare(`
      SELECT m.*, b.org as builder_org
      FROM missions m
      JOIN builders b ON b.id = m.builder_id
      WHERE m.id = ?
    `).get(missionId);

    if (!mission || mission.status !== 'active') return;

    let audience = {};
    try {
      audience = JSON.parse(mission.audience_json || "{}");
    } catch (e) {}

    const { clauses, params } = buildAudienceClauses(audience);
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    // Uses ptype (Feedback Format), not category — ptype is what the validator will
    // actually do (matches the "Feedback Format" label on the mission page), while
    // category is a separate business classification a builder can pick independently
    // and inconsistently (e.g. category "Focus Group" + ptype "Live 1:1 Video Call").
    const ptypeLabel = ptypeOf(mission.ptype)?.label || "New";
    const body = `A new ${ptypeLabel} mission was just published by ${mission.builder_org}.`;

    // Insert notifications only for matching validators.
    // We use INSERT INTO ... SELECT to do this in a single fast, indexed DB query.
    await db.prepare(`
      INSERT INTO v_notifications (validator_id, cat, icon, tone, type, title, body, time_label, unread, target_id)
      SELECT id, 'mission', 'bolt', 'primary', 'new_mission', 'New Mission Match', ?, 'Just now', 1, ?
      FROM validators
      ${where}
    `).run(body, missionId, ...params);

  } catch (error) {
    console.error("notifyMatchingValidators error:", error);
  }
}

/**
 * Fires (fire-and-forget, never awaited by its caller) after a validator
 * saves their profile -- onboarding completion or any later Settings edit.
 * The reverse direction of notifyMatchingValidators: instead of one
 * published mission telling every matching validator, one validator's
 * updated attributes may now newly satisfy a mission's audience filters,
 * and the builder who's been stuck at 0 matches deserves to know.
 *
 * Deliberately NOT every mission this validator matches -- only ones that
 * were genuinely stuck (this validator is the sole match right now, a
 * decent proxy for "just went from 0 to 1" without needing to track a
 * live count per mission). A validator joining an already-healthy, broadly-
 * matching audience isn't news to that builder.
 *
 * ponytail: loops active missions in JS, ~3 small indexed queries each.
 * Fine at current scale (bounded active-mission counts); if that ever
 * grows large, batch the per-mission point-checks into one query instead.
 */
export async function notifyBuilderOfNewMatch(validatorId) {
  try {
    const missions = await db.prepare(`
      SELECT id, builder_id, audience_json, ptype
      FROM missions
      WHERE status = 'active' AND joined < target
    `).all();

    for (const mission of missions) {
      const already = await db.prepare(`SELECT 1 FROM mission_match_notified WHERE mission_id = ? AND validator_id = ?`).get(mission.id, validatorId);
      if (already) continue;

      let audience = {};
      try { audience = JSON.parse(mission.audience_json || "{}"); } catch (e) {}
      const { clauses, params } = buildAudienceClauses(audience);
      const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

      // Array-typed params (bound to = ANY(?)) must go in as a single
      // wrapped params array, not spread -- same convention getRealMatchCount
      // uses just above in this same file's audience.js. Spreading here
      // double-unwraps a nested array param and sends Postgres a bare
      // string where it expects an array literal.
      const matchesThisValidator = await db.prepare(`SELECT id FROM validators WHERE id = ? ${clauses.length ? `AND ${clauses.join(" AND ")}` : ""}`).get([validatorId, ...params]);
      if (!matchesThisValidator) continue;

      const totalMatches = await db.prepare(`SELECT COUNT(*) AS c FROM validators ${whereClause}`).get(params);
      if (parseInt(totalMatches.c, 10) > 1) continue;

      await db.prepare(`INSERT INTO mission_match_notified (mission_id, validator_id) VALUES (?, ?) ON CONFLICT (mission_id, validator_id) DO NOTHING`).run(mission.id, validatorId);

      const ptypeLabel = ptypeOf(mission.ptype)?.label || "your";
      await db.prepare(`
        INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id)
        VALUES (?, 'mission', 'audience_match', 'users', 'success', ?, ?, 'Just now', 1, ?)
      `).run(mission.builder_id, "New audience match", `A validator matching your ${ptypeLabel} mission's audience just joined — invite them now.`, mission.id);
    }
  } catch (error) {
    console.error("notifyBuilderOfNewMatch error:", error);
  }
}

/**
 * Fires asynchronously when slots_filled is reduced.
 * Alerts validators who saved the mission that a slot is now open.
 */
export async function notifySavedValidators(missionId) {
  try {
    const mission = await db.prepare(`SELECT * FROM missions WHERE id = ?`).get(missionId);
    if (!mission || mission.status !== 'active') return;

    // Ensure there is actually a slot open
    if (mission.joined >= mission.target) return;

    // Find validators who saved the mission but are NOT currently participating
    await db.prepare(`
      INSERT INTO v_notifications (validator_id, cat, icon, tone, type, title, body, time_label, unread, target_id)
      SELECT s.validator_id, 'mission', 'unlock', 'success', 'slot_available', 'Slot Opened!', 'A slot just opened up for a mission you saved. Claim it before it''s gone!', 'Just now', 1, ?
      FROM v_saved s
      WHERE s.task_id = ?
      AND NOT EXISTS (
        SELECT 1 FROM participants p
        WHERE p.mission_id = ? AND p.validator_id = s.validator_id
      )
    `).run(missionId, missionId, missionId);

  } catch (error) {
    console.error("notifySavedValidators error:", error);
  }
}

// Message text as-is, truncated so a long paste doesn't blow out the
// notification list's fixed row height — matches how thread previews are
// already shortened in serializeThread's `last` field.
function notifPreview(text) {
  if (!text) return "📎 Attachment";
  return text.length > 80 ? text.slice(0, 80) + "…" : text;
}

/**
 * Fires asynchronously when a builder replies in a thread. Title is the
 * sender's name and body is the actual message (like a phone's native
 * message notification), not a generic "New Message" — so the notification
 * list reads like a chat list instead of one undifferentiated row per ping.
 */
export async function notifyNewMessage(validatorId, builderOrg, threadId, text) {
  try {
    await db.prepare(`
      INSERT INTO v_notifications (validator_id, cat, icon, tone, type, title, body, time_label, unread, target_id)
      VALUES (?, 'message', 'message', 'primary', 'new_message', ?, ?, 'Just now', 1, ?)
    `).run(validatorId, builderOrg, notifPreview(text), threadId);
  } catch (error) {
    console.error("notifyNewMessage error:", error);
  }
}

/**
 * Fires asynchronously when a validator replies in a thread.
 */
export async function notifyBuilderNewMessage(builderId, validatorName, threadId, text) {
  try {
    await db.prepare(`
      INSERT INTO notifications (builder_id, cat, icon, tone, type, title, body, time_label, unread, target_id)
      VALUES (?, 'message', 'message', 'primary', 'new_message', ?, ?, 'Just now', 1, ?)
    `).run(builderId, validatorName, notifPreview(text), threadId);
  } catch (error) {
    console.error("notifyBuilderNewMessage error:", error);
  }
}
