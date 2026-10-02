import { db } from './src/db.js';

async function run() {
  try {
    const email = 'rkgit7767@gmail.com';
    console.log('Looking for builder with email:', email);
    
    const b = await db.prepare("SELECT id FROM builders WHERE email = $1").get(email);
    if (b) {
      console.log('Found builder:', b.id);
      await db.prepare("DELETE FROM builders WHERE id = $1").run(b.id);
      console.log('Deleted builder successfully');
    } else {
      console.log('Builder not found in DB');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
