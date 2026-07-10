import { db } from './src/db.js';
(async () => {
  try {
    await db.prepare('ALTER TABLE v_saved DROP CONSTRAINT IF EXISTS v_saved_task_id_fkey').run();
    console.log("Dropped v_saved FK");
  } catch(e) { console.log(e.message); }
  try {
    await db.prepare('ALTER TABLE v_my_missions DROP CONSTRAINT IF EXISTS v_my_missions_task_id_fkey').run();
    console.log("Dropped v_my_missions task_id FK");
  } catch(e) { console.log(e.message); }
  console.log('Done');
  process.exit(0);
})();
