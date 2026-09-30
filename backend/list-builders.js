import { db } from './src/db.js';

async function run() {
  try {
    const builders = await db.prepare("SELECT id, email FROM builders").all();
    console.log('Builders:', builders);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
