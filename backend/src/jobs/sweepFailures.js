import { db } from "../db.js";
import { notifySavedValidators } from "../notificationsHelper.js";
import { computeCheckinStatus } from "../checkinLogic.js";

/**
 * Sweeps all active trial missions and fails validators who have exceeded their extra days limit.
 * Frees up mission slots by decrementing slots_filled on the mission.
 */
export async function runSweepFailures() {
  // 1. Get all active trial missions
  const activeTrials = await db.prepare(`
    SELECT mm.id as mm_id, mm.validator_id, mm.mission_id, p.joined_at
    FROM v_my_missions mm
    JOIN missions m ON m.id = mm.mission_id
    JOIN participants p ON p.mission_id = mm.mission_id AND p.validator_id = mm.validator_id
    WHERE mm.status = 'active' AND m.ptype = 'trial'
  `).all();

  let failedCount = 0;

  for (const trial of activeTrials) {
    // Get their completed check-ins
    const checkins = await db.prepare(`SELECT submitted_at FROM checkins WHERE mission_id = ? AND validator_id = ? ORDER BY day_number ASC`).all(trial.mission_id, trial.validator_id).catch(() => []);
    const { lockedOut } = computeCheckinStatus(trial.joined_at, checkins);

    if (lockedOut) {
      await db.transaction(async (tx) => {
        // 1. Fail the mission for this validator
        await tx.prepare(`UPDATE v_my_missions SET status = 'failed', status_label = 'Failed (Inactivity)', updated_at = NOW() WHERE id = ?`).run(trial.mm_id);

        // 2. Update participant stage
        await tx.prepare(`UPDATE participants SET stage = 'failed' WHERE mission_id = ? AND validator_id = ?`).run(trial.mission_id, trial.validator_id);

        // 3. Decrement joined count on the mission to free up the spot
        await tx.prepare(`UPDATE missions SET joined = GREATEST(0, joined - 1) WHERE id = ?`).run(trial.mission_id);

        // 4. Notify the validator
        await tx.prepare(`INSERT INTO v_notifications (validator_id, cat, icon, tone, title, body, time_label, unread) VALUES (?, 'system', 'alertTriangle', 'danger', 'Mission Failed', 'You have been removed from a trial mission due to inactivity (missing too many daily check-ins).', 'Just now', 1)`).run(trial.validator_id);
      });

      setImmediate(() => notifySavedValidators(trial.mission_id));
      failedCount++;
    }

    // Yield the event loop to prevent blocking if there are many active trials
    await new Promise(resolve => setImmediate(resolve));
  }

  return { scanned: activeTrials.length, failed: failedCount };
}
