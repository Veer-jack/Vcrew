import { db } from './src/db.js';

async function run() {
  try {
    const res = await db.prepare("SELECT column_name FROM information_schema.columns WHERE table_name='email_signup_codes'").all();
    console.log(res);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
