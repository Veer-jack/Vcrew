import { db } from "./src/db.js";

async function test() {
  console.log("=== Builder Dashboard Serialization ===");
  const m = await db.prepare("SELECT * FROM missions LIMIT 1").get();
  if (m) {
    const builderTask = {
      id: m.id,
      name: m.name,
      status: m.status,
      target: m.target,
      reward: { type: m.reward_type, amount: m.reward_amount }
    };
    console.log("Builder serialized:", builderTask);
  } else {
    console.log("No missions found in DB.");
  }
  
  console.log("\n=== Validator Discover CTE ===");
  const baseCTE = `
    WITH base_tasks AS (
      SELECT id::text, COALESCE(ptype, 'mvp')::text as raw_type, name::text as product, description::text as tagline, COALESCE(brand, 'Independent')::text as company, 
             COALESCE(reward_amount, 0)::int as reward, 10::int as minutes, 90::int as match_pct, GREATEST(0, COALESCE(target, 0) - COALESCE(joined, 0))::int as spots_left, 
             COALESCE(target, 0)::int as spots_total, COALESCE(deadline::text, 'Soon')::text as deadline_label, FLOOR(EXTRACT(EPOCH FROM (NOW() - created_at))/3600)::int as posted_h, 
             description::text as brief, tasks_json::text as steps_json, (COALESCE(joined,0) > COALESCE(target,1)/2)::boolean as hot, true::boolean as verified, 
             false::boolean as featured, 'missions' as source
      FROM missions WHERE status IN ('active','live','published')
      UNION ALL
      SELECT id::text, type::text as raw_type, product::text, tagline::text, company::text, reward::int, minutes::int, match_pct::int, spots_left::int, 
             spots_total::int, deadline_label::text, posted_h::int, brief::text, steps_json::text, hot::boolean, verified::boolean, featured::boolean, 'vtasks' as source
      FROM vtasks
    )
    SELECT * FROM base_tasks LIMIT 1;
  `;
  try {
    const res = await db.prepare(baseCTE).get();
    console.log("CTE result:", res);
  } catch(e) {
    console.error("CTE error:", e.message);
  }

  process.exit();
}
test();
