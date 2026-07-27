import { db } from "./db.js";
import { catOf } from "./meta.js";

/**
 * Fires asynchronously when a builder publishes a mission.
 * Targets validators whose role perfectly matches the mission audience.
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

    // Parse the audience json to see what roles they want
    let audience = {};
    try {
      audience = JSON.parse(mission.audience_json || "{}");
    } catch (e) {}

    const targetRoles = audience.role || [];
    let roleFilter = "";
    let roleParams = [];

    if (targetRoles.length > 0) {
      roleFilter = `AND role IN (${targetRoles.map(() => '?').join(',')})`;
      roleParams = [...targetRoles];
    } else {
      // If no specific role is targeted, we default to notifying standard Users and Validators,
      // but maybe skip Testers unless explicitly asked, to avoid spam.
      roleFilter = `AND role IN ('User', 'Validator')`;
    }

    const catLabel = catOf(mission.category)?.label || "New";
    const body = `A new ${catLabel} mission was just published by ${mission.builder_org}.`;

    // Insert notifications only for matching validators.
    // We use INSERT INTO ... SELECT to do this in a single fast, indexed DB query.
    await db.prepare(`
      INSERT INTO v_notifications (validator_id, cat, icon, tone, type, title, body, time_label, unread)
      SELECT id, 'mission', 'zap', 'primary', 'new_mission', 'New Mission Match', ?, 'Just now', 1
      FROM validators
      WHERE 1=1 ${roleFilter}
    `).run(body, ...roleParams);

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
      INSERT INTO v_notifications (validator_id, cat, icon, tone, type, title, body, time_label, unread)
      SELECT s.validator_id, 'system', 'unlock', 'success', 'slot_opened', 'Slot Opened!', 'A slot just opened up for a mission you saved. Claim it before it''s gone!', 'Just now', 1
      FROM v_saved s
      WHERE s.task_id = ?
      AND NOT EXISTS (
        SELECT 1 FROM participants p
        WHERE p.mission_id = ? AND p.validator_id = s.validator_id
      )
    `).run(missionId, missionId);

  } catch (error) {
    console.error("notifySavedValidators error:", error);
  }
}

/**
 * Fires asynchronously when a builder replies in a thread.
 */
export async function notifyNewMessage(validatorId, builderOrg) {
  try {
    await db.prepare(`
      INSERT INTO v_notifications (validator_id, cat, icon, tone, type, title, body, time_label, unread)
      VALUES (?, 'message', 'messageCircle', 'primary', 'new_message', 'New Message', ?, 'Just now', 1)
    `).run(validatorId, `You have a new message from ${builderOrg}.`);
  } catch (error) {
    console.error("notifyNewMessage error:", error);
  }
}

/**
 * Fires asynchronously when a validator replies in a thread.
 */
export async function notifyBuilderNewMessage(builderId, validatorName) {
  try {
    await db.prepare(`
      INSERT INTO notifications (builder_id, cat, icon, tone, type, title, body, time_label, unread)
      VALUES (?, 'system', 'messageCircle', 'primary', 'new_message', 'New Message', ?, 'Just now', 1)
    `).run(builderId, `You have a new message from ${validatorName}.`);
  } catch (error) {
    console.error("notifyBuilderNewMessage error:", error);
  }
}
