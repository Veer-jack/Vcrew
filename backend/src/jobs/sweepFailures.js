import { db } from "../db.js";
import { notifySavedValidators } from "../notificationsHelper.js";
import { computeCheckinStatus } from "../checkinLogic.js";
import { getRealJoinedCount } from "../stats.js";

/**
 * Sweeps all active trial missions and fails validators who have exceeded their extra days limit.
 * Frees up mission slots by decrementing slots_filled on the mission.
 */
export async function runSweepFailures() {
  // 1. Get all active trial missions
  const activeTrials = await db.prepare(`
    SELECT mm.id as mm_id, mm.validator_id, mm.mission_id, p.joined_at, m.name as mission_name, m.builder_id
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
        await tx.prepare(`INSERT INTO v_notifications (validator_id, cat, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'system', 'alertTriangle', 'danger', 'Mission Failed', 'You have been removed from a trial mission due to inactivity (missing too many daily check-ins).', 'Just now', 1, ?)`).run(trial.validator_id, trial.mission_id);

        // 5. Notify the builder too — the inline (self-triggered) checkin-lockout path
        // already does this; this sweep-triggered path was silently skipping it.
        await tx.prepare(`INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'application', 'mission_failed', 'xCircle', 'danger', 'Mission Failed', ?, 'Just now', 1, ?)`)
          .run(trial.builder_id, `A validator failed the mission "${trial.mission_name}" due to missed check-ins.`, trial.mission_id);
      });

      setImmediate(() => notifySavedValidators(trial.mission_id));
      failedCount++;
    }

    // Yield the event loop to prevent blocking if there are many active trials
    await new Promise(resolve => setImmediate(resolve));
  }

  return { scanned: activeTrials.length, failed: failedCount };
}

const INVITE_EXPIRY_DAYS = 7;

/**
 * Expires mission invitations nobody ever responded to, so they stop showing as
 * "pending" forever and the builder finds out their invite went unanswered.
 */
export async function sweepStaleInvitations() {
  const stale = await db.prepare(`
    SELECT i.id, i.validator_id, m.name as mission_name, m.builder_id
    FROM mission_invitations i
    JOIN missions m ON m.id = i.mission_id
    WHERE i.status = 'pending' AND i.created_at < NOW() - INTERVAL '${INVITE_EXPIRY_DAYS} days'
  `).all();

  for (const invite of stale) {
    await db.transaction(async (tx) => {
      await tx.prepare(`UPDATE mission_invitations SET status = 'expired' WHERE id = ? AND status = 'pending'`).run(invite.id);
      await tx.prepare(`INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread) VALUES (?, 'application', 'invite_expired', 'clock', 'warning', 'Invite Expired', ?, 'Just now', 1)`)
        .run(invite.builder_id, `Your invitation for "${invite.mission_name}" went unanswered for ${INVITE_EXPIRY_DAYS} days and has expired. Invite someone else to fill the slot.`);
    });
  }

  return { expired: stale.length };
}

const PENDING_APPLICATION_TIMEOUT_HOURS = 48;

/**
 * A "require approval" mission's open application (participants.stage =
 * 'pending') that the builder never acted on shouldn't leave the applicant
 * stuck indefinitely — auto-accepts it after the timeout, exactly as if the
 * builder had clicked Accept (same participants/v_my_missions/joined
 * writes, same notification copy as POST .../participants/:pid/review).
 * If the mission filled up from other applicants in the meantime, this
 * accepts nobody past target — it auto-rejects instead, so the applicant at
 * least gets a real answer rather than waiting on a slot that's gone.
 */
export async function sweepStalePendingApplications() {
  const stale = await db.prepare(`
    SELECT p.id as participant_id, p.mission_id, p.validator_id, m.name as mission_name, m.target, m.category, m.builder_id
    FROM participants p
    JOIN missions m ON m.id = p.mission_id
    WHERE p.stage = 'pending' AND p.joined_at < NOW() - INTERVAL '${PENDING_APPLICATION_TIMEOUT_HOURS} hours'
  `).all();

  let accepted = 0, rejected = 0;
  for (const app of stale) {
    const isFull = app.target > 0 && (await getRealJoinedCount(app.mission_id)) >= app.target;
    await db.transaction(async (tx) => {
      if (isFull) {
        await tx.prepare(`UPDATE participants SET stage = 'not_selected' WHERE id = ?`).run(app.participant_id);
        await tx.prepare(`UPDATE v_my_missions SET status = 'not_selected', status_label = 'Not accepted' WHERE mission_id = ? AND validator_id = ?`).run(app.mission_id, app.validator_id);
        await tx.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'invite', 'application_rejected', 'xCircle', 'warning', ?, ?, 'Just now', 1, ?)`)
          .run(app.validator_id, "Not Selected This Time", `Your application for "${app.mission_name}" wasn't accepted — the mission filled up before the builder got to it. Keep an eye out for other missions that match your profile.`, app.mission_id);
        rejected++;
      } else {
        await tx.prepare(`UPDATE participants SET stage = 'accepted' WHERE id = ?`).run(app.participant_id);
        await tx.prepare(`UPDATE missions SET joined = joined + 1 WHERE id = ?`).run(app.mission_id);
        await tx.prepare(`UPDATE v_my_missions SET status = 'active', status_label = 'Accepted just now' WHERE mission_id = ? AND validator_id = ?`).run(app.mission_id, app.validator_id);
        if (app.category === "sample") {
          await tx.prepare(`INSERT INTO sample_shipments (mission_id, validator_id, status) VALUES (?, ?, 'awaiting_shipment')`).run(app.mission_id, app.validator_id);
        }
        await tx.prepare(`INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'invite', 'application_accepted', 'checkCircle', 'success', ?, ?, 'Just now', 1, ?)`)
          .run(app.validator_id, "You're In — Start Now", `Your application for "${app.mission_name}" was accepted. Head to the mission to get started.`, app.mission_id);
        // The builder gets a heads-up too — this happened without them, unlike
        // a manual accept where they already know.
        await tx.prepare(`INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'application', 'application_auto_accepted', 'clock', 'primary', ?, ?, 'Just now', 1, ?)`)
          .run(app.builder_id, "Application Auto-Accepted", `An applicant for "${app.mission_name}" was automatically accepted after ${PENDING_APPLICATION_TIMEOUT_HOURS}h of no response — review your Pending queue sooner to decide yourself next time.`, app.mission_id);
        accepted++;
      }
    });
  }

  return { scanned: stale.length, accepted, rejected };
}

/** Runs every periodic maintenance sweep once. Called on an in-process interval from server.js. */
export async function runPeriodicSweeps() {
  const failures = await runSweepFailures();
  const invites = await sweepStaleInvitations();
  const pendingApplications = await sweepStalePendingApplications();
  return { failures, invites, pendingApplications };
}
