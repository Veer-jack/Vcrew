// Verifies Firebase ID tokens issued after the client completes Phone Auth.
// Needs FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (service
// account credentials) for the Admin SDK, and FIREBASE_API_KEY / FIREBASE_AUTH_DOMAIN
// / FIREBASE_APP_ID (public web app config, safe to expose to the browser).

import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY;

let app = null;

export function isFirebaseConfigured() {
  return !!(PROJECT_ID && CLIENT_EMAIL && PRIVATE_KEY);
}

function getApp_() {
  if (!isFirebaseConfigured()) throw new Error("Phone login isn't configured on this server yet");
  if (!app) {
    app = getApps().length ? getApp() : initializeApp({
      credential: cert({
        projectId: PROJECT_ID,
        clientEmail: CLIENT_EMAIL,
        // Railway env vars store the key with literal \n — convert back to real newlines.
        privateKey: PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  }
  return app;
}

// Verifies a Firebase ID token from the client and returns its phone number
// (E.164 format, e.g. +14155551234), or throws if invalid/missing.
export async function verifyPhoneToken(idToken) {
  if (!idToken) throw new Error("Missing verification token");
  const decoded = await getAuth(getApp_()).verifyIdToken(idToken);
  if (!decoded.phone_number) throw new Error("That sign-in method didn't include a phone number");
  return decoded.phone_number;
}

// Public web config the frontend needs to initialize the Firebase JS SDK.
export function publicFirebaseConfig() {
  return {
    configured: isFirebaseConfigured() && !!(process.env.FIREBASE_API_KEY && process.env.FIREBASE_APP_ID),
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || (PROJECT_ID ? `${PROJECT_ID}.firebaseapp.com` : undefined),
    projectId: PROJECT_ID,
    appId: process.env.FIREBASE_APP_ID,
  };
}
