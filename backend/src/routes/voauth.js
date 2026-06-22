import { Router } from "express";
import crypto from "node:crypto";
import { db } from "../db.js";
import { hashPassword, createValidatorSession } from "../auth.js";
import { sendValidatorWelcome } from "../email.js";
import { PROVIDERS, isConfigured, frontendUrl } from "../oauth.js";

export const router = Router();

const STATE_COOKIE = "vc_oauth_state";

// GET /api/v/auth/providers — which providers are usable (have credentials configured)
router.get("/providers", (req, res) => {
  const providers = {};
  for (const key of Object.keys(PROVIDERS)) providers[key] = isConfigured(key);
  res.json({ providers });
});

// GET /api/v/auth/:provider — kick off the redirect to the provider
router.get("/:provider", (req, res) => {
  const provider = PROVIDERS[req.params.provider];
  if (!provider || !isConfigured(req.params.provider)) {
    return res.status(404).send(`${req.params.provider} login is not configured on this server yet.`);
  }
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie(STATE_COOKIE, state, { httpOnly: true, maxAge: 10 * 60 * 1000, sameSite: "lax", secure: req.protocol === "https" });
  res.redirect(provider.authorizeUrl(state, "/api/v/auth"));
});

// GET /api/v/auth/:provider/callback
router.get("/:provider/callback", async (req, res) => {
  const key = req.params.provider;
  const provider = PROVIDERS[key];
  const FRONTEND = frontendUrl();
  if (!provider || !isConfigured(key)) {
    return res.redirect(`${FRONTEND}/validator/login?error=${encodeURIComponent("Provider not configured")}`);
  }

  const { code, state, error } = req.query;
  if (error) return res.redirect(`${FRONTEND}/validator/login?error=${encodeURIComponent(String(error))}`);

  const expectedState = req.cookies?.[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE);
  if (!code || !state || !expectedState || state !== expectedState) {
    return res.redirect(`${FRONTEND}/validator/login?error=${encodeURIComponent("Login session expired, please try again")}`);
  }

  try {
    const accessToken = await provider.exchangeCode(code, "/api/v/auth");
    const profile = await provider.fetchProfile(accessToken);

    // 1) match an existing account already linked to this provider+id
    let validator = db.prepare(`SELECT * FROM validators WHERE oauth_provider = ? AND oauth_id = ?`).get(key, profile.id);

    // 2) otherwise match by email and link this provider to that account
    if (!validator) {
      validator = db.prepare(`SELECT * FROM validators WHERE email = ?`).get(profile.email.toLowerCase());
      if (validator) {
        db.prepare(`UPDATE validators SET oauth_provider = ?, oauth_id = ? WHERE id = ?`).run(key, profile.id, validator.id);
      }
    }

    // 3) otherwise create a brand new validator account
    if (!validator) {
      const randomPassword = await hashPassword(crypto.randomBytes(24).toString("hex"));
      db.prepare(`
        INSERT INTO validators (name, handle, email, password_hash, oauth_provider, oauth_id, specialties_json)
        VALUES (?, ?, ?, ?, ?, ?, '[]')
      `).run(profile.name || profile.email.split("@")[0], profile.handle, profile.email.toLowerCase(), randomPassword, key, profile.id);
      validator = db.prepare(`SELECT * FROM validators WHERE email = ?`).get(profile.email.toLowerCase());

      db.prepare(`INSERT INTO v_notifications (validator_id, cat, icon, tone, title, body, time_label, unread) VALUES (?,'system','shield','green',?,?, 'Just now', 1)`)
        .run(validator.id, "Welcome to ValidationCrew", `Your account was created via ${provider.name}. Complete your profile to start getting matched to missions.`);
      sendValidatorWelcome({ name: validator.name, email: validator.email }).catch(() => {});
    }

    const token = createValidatorSession(validator.id);
    res.redirect(`${FRONTEND}/validator/oauth-callback?token=${token}`);
  } catch (err) {
    console.error(`${provider.name} OAuth error:`, err);
    res.redirect(`${FRONTEND}/validator/login?error=${encodeURIComponent("Login failed, please try again")}`);
  }
});
