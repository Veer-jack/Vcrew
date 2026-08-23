import dotenv from 'dotenv';
dotenv.config();

import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

async function run() {
  const email = 'rk.ravikiran789@gmial.com';
  console.log(`Deleting Firebase account for ${email}...`);
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().deleteUser(user.uid);
    console.log(`Successfully deleted user with UID: ${user.uid}`);
    process.exit(0);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log('User not found in Firebase Auth.');
    } else {
      console.error('Error deleting user:', err);
    }
    process.exit(1);
  }
}

run();
