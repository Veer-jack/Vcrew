// One-off fix: the initial seedAccounts.js run used uniform random picks for
// gender/income/marital/has_kids, producing an unrealistic even split across buckets.
// Re-rolls those 4 fields on the already-seeded mock rows using the weighted
// distributions in seedAccounts.js, without touching anything else or re-inserting.
import { db, initDb } from "./db.js";
import { GENDER_WEIGHTS, INCOME_WEIGHTS, MARITAL_WEIGHTS, KIDS_WEIGHTS, AGE_WEIGHTS, randWeighted } from "./seedAccounts.js";

const BATCH_SIZE = 250;

async function main() {
  await initDb();
  const rows = await db.prepare(
    `SELECT id FROM validators WHERE email LIKE '%@validationcrew.com' OR email LIKE '%@validationcrew2.com'`
  ).all();
  console.log(`Reweighting ${rows.length} mock accounts...`);

  await db.transaction(async (tx) => {
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const valuesSql = batch.map(() => `(?::int,?,?,?,?,?)`).join(",");
      const params = batch.flatMap((r) => [
        r.id, randWeighted(GENDER_WEIGHTS), randWeighted(INCOME_WEIGHTS), randWeighted(MARITAL_WEIGHTS), randWeighted(KIDS_WEIGHTS), randWeighted(AGE_WEIGHTS),
      ]);
      await tx.prepare(`
        UPDATE validators AS t SET gender = v.gender, income_bracket = v.income_bracket,
          marital_status = v.marital_status, has_kids = v.has_kids, age_group = v.age_group
        FROM (VALUES ${valuesSql}) AS v(id, gender, income_bracket, marital_status, has_kids, age_group)
        WHERE t.id = v.id
      `).run(...params);
      console.log(`Updated ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
    }
  });

  console.log("Reweight complete.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
