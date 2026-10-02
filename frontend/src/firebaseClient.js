import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

let authInstance = null;
let initPromise = null;

// `fetchConfig` is api.firebaseConfig / vapi.firebaseConfig — returns
// { configured, apiKey, authDomain, projectId, appId }. Returns null if
// phone auth isn't configured on the server.
export async function getFirebaseAuth(fetchConfig) {
  if (authInstance) return authInstance;
  if (!initPromise) {
    initPromise = fetchConfig().then(cfg => {
      if (!cfg.configured) return null;
      const app = getApps().length ? getApp() : initializeApp({
        apiKey: cfg.apiKey,
        authDomain: cfg.authDomain,
        projectId: cfg.projectId,
        appId: cfg.appId,
      });
      authInstance = getAuth(app);
      return authInstance;
    }).catch(() => null);
  }
  return initPromise;
}

export { RecaptchaVerifier, signInWithPhoneNumber };
