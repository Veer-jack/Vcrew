import { Router } from "express";
import crypto from "node:crypto";
import { db } from "./db.js";
import { verifyPhoneToken, publicFirebaseConfig } from "./firebaseAdmin.js";

const STEP_UP_TTL_MS = 10 * 60 * 1000;

// GET /api/firebase/config — public web config + whether phone auth is usable
export function buildFirebaseConfigRouter() {
  const router = Router();
  router.get("/config", (req, res) => res.json(publicFirebaseConfig()));
  return router;
}

// Passwordless login for an existing, phone-verified account.
// POST / { idToken } -> { token, [userKey]: ... }
export function buildFirebaseLoginRouter({ table, createSession, publicUser, userKey }) {
  const router = Router();

  router.post("/", async (req, res) => {
    try {
      const phone = await verifyPhoneToken(req.body?.idToken);
      const user = db.prepare(`SELECT * FROM ${table} WHERE phone = ? AND phone_verified = 1`).get(phone);
      if (!user) return res.status(404).json({ error: "No account found for that phone number" });
      const token = createSession(user.id);
      res.json({ token, [userKey]: publicUser(user) });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}

// Add / remove a verified phone number on the logged-in account ("phone setup").
// POST /link { idToken }, POST /remove
export function buildPhoneLinkRouter({ table, authMiddleware, userKey }) {
  const router = Router();
  router.use(authMiddleware);

  router.post("/link", async (req, res) => {
    try {
      const phone = await verifyPhoneToken(req.body?.idToken);
      const existing = db.prepare(`SELECT id FROM ${table} WHERE phone = ? AND phone_verified = 1 AND id != ?`).get(phone, req[userKey].id);
      if (existing) return res.status(400).json({ error: "This phone number is already linked to another account" });

      db.prepare(`UPDATE ${table} SET phone = ?, phone_verified = 1 WHERE id = ?`).run(phone, req[userKey].id);
      res.json({ ok: true, phone });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post("/remove", (req, res) => {
    db.prepare(`UPDATE ${table} SET phone = NULL, phone_verified = 0 WHERE id = ?`).run(req[userKey].id);
    res.json({ ok: true });
  });

  return router;
}

// Step-up verification ("are you sure it's you") before a sensitive action.
// POST /verify { idToken } -> { stepUpToken }
export function buildStepUpRouter({ table, purpose, authMiddleware, userKey }) {
  const router = Router();
  router.use(authMiddleware);

  router.post("/verify", async (req, res) => {
    const user = req[userKey];
    if (!user.phone || !user.phone_verified) {
      return res.status(400).json({ error: "Add and verify a phone number in your profile first", code: "PHONE_REQUIRED" });
    }
    try {
      const phone = await verifyPhoneToken(req.body?.idToken);
      if (phone !== user.phone) return res.status(400).json({ error: "That phone number doesn't match your account" });

      const token = crypto.randomBytes(24).toString("hex");
      db.prepare(`INSERT INTO step_up_tokens (token, table_name, user_id, purpose, expires_at, created_at) VALUES (?,?,?,?,?,?)`)
        .run(token, table, user.id, purpose, Date.now() + STEP_UP_TTL_MS, Date.now());
      res.json({ ok: true, stepUpToken: token });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}

// Used by sensitive endpoints (withdraw, top-up) to check + consume a step-up token.
export function consumeStepUpToken({ table, userId, purpose, token }) {
  if (!token) return false;
  const row = db.prepare(`SELECT * FROM step_up_tokens WHERE token = ? AND table_name = ? AND user_id = ? AND purpose = ? AND used = 0`)
    .get(token, table, userId, purpose);
  if (!row || row.expires_at < Date.now()) return false;
  db.prepare(`UPDATE step_up_tokens SET used = 1 WHERE token = ?`).run(token);
  return true;
}
