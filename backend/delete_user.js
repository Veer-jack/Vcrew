import { db } from "./src/db.js";

async function run() {
  const email = "s210222@rguktsklm.ac.in";
  console.log("Deleting user with email:", email);
  await db.prepare("DELETE FROM builders WHERE email = ?").run(email);
  console.log("Deleted.");
  process.exit(0);
}

run();
