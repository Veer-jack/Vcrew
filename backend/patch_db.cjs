const Database = require('better-sqlite3');
const db = new Database('./data/db.sqlite');
db.prepare("UPDATE notifications SET target_id = 'm_cdc85da8' WHERE type = 'schedule_accepted' AND target_id IS NULL;").run();
console.log("Done");
