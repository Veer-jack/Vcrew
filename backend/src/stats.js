import { db } from "./db.js";

/**
 * Recalculates and updates the submitted count, completion percentage, and 
 * average rating for a mission. This ensures data integrity by driving the 
 * stats dynamically from the responses table.
 */
export async function recalcMissionStats(missionId, optionalTx) {
  const tx = optionalTx || db;
  
  const m = await tx.prepare(`SELECT target FROM missions WHERE id = ?`).get(missionId);
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
}
