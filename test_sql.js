const sql1 = `SELECT * FROM missions WHERE id = ? AND builder_id = ? FOR UPDATE`;
const sql2 = `SELECT validator_id FROM responses WHERE id = ? AND mission_id = ? FOR UPDATE`;
const sql3 = `UPDATE responses SET status = 'rejected', data_json = data_json WHERE id = ? AND mission_id = ?`;
const sql4 = `UPDATE v_my_missions SET status = 'rejected' WHERE mission_id = ? AND validator_id = ?`;
const sql5 = `UPDATE participants SET stage = 'rejected' WHERE mission_id = ? AND validator_id = ?`;
const sql6 = `SELECT rating, reviews_count FROM validators WHERE id = ?`;
const sql7 = `UPDATE validators SET rating = ?, reviews_count = ? WHERE id = ?`;
const sql8 = `INSERT INTO v_notifications (validator_id, cat, icon, tone, title, body, time_label, unread) VALUES (?,?,?,?,?,?,?,1)`;

function toPostgres(sql) {
  let inString = false;
  let result = '';
  let paramIndex = 0;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (c === "'") inString = !inString;
    if (c === '?' && !inString) {
      result += `$${++paramIndex}`;
    } else {
      result += c;
    }
  }
  return result;
}

const queries = [sql1, sql2, sql3, sql4, sql5, sql6, sql7, sql8];
queries.forEach(sql => {
  const pgSql = toPostgres(sql);
  const isInsert = /^\s*INSERT/i.test(sql);
  const hasIdCol = !/INTO sessions|INTO validator_sessions|INTO admin_sessions|INTO admin_settings|INTO admin_pending_2fa|INTO v_saved|INTO step_up_tokens|INTO password_reset_tokens/i.test(sql);
  const finalSql = isInsert && hasIdCol && !/RETURNING/i.test(pgSql) ? `${pgSql} RETURNING id` : pgSql;
  console.log("SQL:", finalSql);
});
