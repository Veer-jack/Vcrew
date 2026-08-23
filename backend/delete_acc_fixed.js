import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { db } from './src/db.js';
import fs from 'fs';

let serviceAccount;
try {
  serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
} catch (e) {
  console.log("No serviceAccountKey.json, relying on GOOGLE_APPLICATION_CREDENTIALS");
}

initializeApp(serviceAccount ? {
  credential: cert(serviceAccount)
} : {});

const auth = getAuth();

async function run() {
  const email = 'rk.ravikiran789@gmail.com';
  console.log(`Deleting account for ${email}...`);
  try {
    const bRes = await db.prepare('DELETE FROM builders WHERE email = $1 RETURNING id').all(email);
    console.log(`Deleted builders:`, bRes);
    const vRes = await db.prepare('DELETE FROM validators WHERE email = $1 RETURNING id').all(email);
    console.log(`Deleted validators:`, vRes);
  } catch (err) {
    console.error('Error deleting from PostgreSQL:', err);
  }

  try {
    const user = await auth.getUserByEmail(email);
    await auth.deleteUser(user.uid);
    console.log(`Successfully deleted user with UID: ${user.uid} from Firebase`);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log('User not found in Firebase Auth.');
    } else {
      console.error('Error deleting user from Firebase:', err);
    }
  }
  process.exit(0);
}

run();
