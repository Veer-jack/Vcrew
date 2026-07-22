import { db } from "./src/db.js";
async function test() {
  const res = await db.prepare("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'validators'").all();
  console.log(res);
  process.exit();
}
test();
