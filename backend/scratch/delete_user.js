import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const { pool } = await import("./src/db.js");

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query("DELETE FROM validators WHERE email = $1", ["rk.ravikiran789@gmail.com"]);
    console.log(`Deleted ${res.rowCount} row(s)`);
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}
run();
