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
