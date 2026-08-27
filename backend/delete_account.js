import dotenv from 'dotenv';
dotenv.config();

import { db } from './src/db.js';

async function run() {
  const email = 'rk.ravikiran789@gmial.com';
  console.log(`Deleting account for ${email}...`);
  try {
    const bRes = await db.prepare('DELETE FROM builders WHERE email = $1 RETURNING id').all(email);
    console.log(`Deleted builders:`, bRes);
    const vRes = await db.prepare('DELETE FROM validators WHERE email = $1 RETURNING id').all(email);
    console.log(`Deleted validators:`, vRes);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
