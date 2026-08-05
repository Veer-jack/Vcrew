import { db } from "./db.js";

/**
 * Recalculates and updates the submitted count, completion percentage, and 
 * average rating for a mission. This ensures data integrity by driving the 
 * stats dynamically from the responses table.
 */
export async function recalcMissionStats(missionId, optionalTx) {
  const tx = optionalTx || db;

  const m = await tx.prepare(`SELECT target, submitted, builder_id, name FROM missions WHERE id = ?`).get(missionId);
  if (!m) return;

  const target = Math.max(m.target || 1, 1);

  const responses = await tx.prepare(`
    SELECT COUNT(*) as c FROM responses
    WHERE mission_id = ? AND status != 'rejected'
  `).get(missionId);
  const submitted = parseInt(responses.c || 0, 10);

  const completion = Math.min(100, Math.round((submitted / target) * 100));

  const rated = await tx.prepare(`
    SELECT AVG(score) as avg_score FROM v_my_missions
    WHERE mission_id = ? AND score > 0
  `).get(missionId);
  const avgRating = rated && rated.avg_score ? Math.round((Number(rated.avg_score) / 20) * 10) / 10 : 0;

  await tx.prepare(`
    UPDATE missions
    SET submitted = ?, completion = ?, rating = ?
    WHERE id = ?
  `).run(submitted, completion, avgRating, missionId);

  // Fire once, exactly at the crossing point — not on every recalc, so builders
  // aren't re-notified on subsequent revision/reject churn once already full.
  if ((m.submitted || 0) < target && submitted >= target) {
    await tx.prepare(`INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'mission', 'mission_full_submissions', 'checkCircle', 'success', 'All responses are in', ?, 'Just now', 1, ?)`)
      .run(m.builder_id, `All ${target} response(s) for "${m.name}" are in — head to Review to approve or reject them.`, missionId);
  }
}
