import { Router } from "express";
import crypto from "node:crypto";
import { db } from "../db.js";
import { hashPassword, createSession } from "../auth.js";
import { sendBuilderWelcome } from "../email.js";
import { PROVIDERS, isConfigured, frontendUrl } from "../oauth.js";

export const router = Router();

const STATE_COOKIE = "vc_oauth_state_b";
const BASE_PATH = "/api/auth";

// GET /api/auth/oauth/providers — which providers are usable (have credentials configured)
router.get("/providers", async (req, res) => {
  const providers = {};
  for (const key of Object.keys(PROVIDERS)) providers[key] = isConfigured(key);
  res.json({ providers });
});

// GET /api/auth/oauth/:provider — kick off the redirect to the provider
router.get("/:provider", async (req, res) => {
  const provider = PROVIDERS[req.params.provider];
  if (!provider || !isConfigured(req.params.provider)) {
    return res.status(404).send(`${req.params.provider} login is not configured on this server yet.`);
  }
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie(STATE_COOKIE, state, { httpOnly: true, maxAge: 10 * 60 * 1000, sameSite: "none", secure: true });
  res.redirect(provider.authorizeUrl(state, BASE_PATH));
});

// GET /api/auth/oauth/:provider/callback
router.get("/:provider/callback", async (req, res) => {
  const key = req.params.provider;
  const provider = PROVIDERS[key];
  const FRONTEND = frontendUrl();
  if (!provider || !isConfigured(key)) {
    return res.redirect(`${FRONTEND}/login?error=${encodeURIComponent("Provider not configured")}`);
  }

  const { code, state, error } = req.query;
  if (error) return res.redirect(`${FRONTEND}/login?error=${encodeURIComponent(String(error))}`);

  const expectedState = req.cookies?.[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE);
  if (!code || !state || !expectedState || state !== expectedState) {
    return res.redirect(`${FRONTEND}/login?error=${encodeURIComponent("Login session expired, please try again")}`);
  }

  try {
    const accessToken = await provider.exchangeCode(code, BASE_PATH);
    const profile = await provider.fetchProfile(accessToken);

    // 1) match an existing account already linked to this provider+id
    let builder = await db.prepare(`SELECT * FROM builders WHERE oauth_provider = ? AND oauth_id = ?`).get(key, profile.id);

    // 2) otherwise match by email and link this provider to that account
    if (!builder) {
      builder = await db.prepare(`SELECT * FROM builders WHERE email = ?`).get(profile.email.toLowerCase());
      if (builder) {
        await db.prepare(`UPDATE builders SET oauth_provider = ?, oauth_id = ? WHERE id = ?`).run(key, profile.id, builder.id);
      }
    }

    // 3) otherwise create a brand new builder account
    if (!builder) {
      const randomPassword = await hashPassword(crypto.randomBytes(24).toString("hex"));
      const name = profile.name || profile.email.split("@")[0];
      await db.prepare(`
        INSERT INTO builders (name, org, email, password_hash, oauth_provider, oauth_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(name, `${name}'s workspace`, profile.email.toLowerCase(), randomPassword, key, profile.id);
      builder = await db.prepare(`SELECT * FROM builders WHERE email = ?`).get(profile.email.toLowerCase());

      await db.prepare(`INSERT INTO notifications (builder_id, icon, tone, title, body, time_label, unread) VALUES (?,'shield','green',?,?, 'Just now', 1)`)
        .run(builder.id, "Welcome to ValidationCrew", `Your account was created via ${provider.name}. Update your workspace name in Settings any time.`);
      sendBuilderWelcome({ name: builder.name, email: builder.email, org: builder.org }).catch(() => {});
    }

    const token = createSession(builder.id, req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim(), req.headers["user-agent"]);
    res.redirect(`${FRONTEND}/oauth-callback?token=${token}`);
  } catch (err) {
    console.error(`${provider.name} OAuth error:`, err);
    res.redirect(`${FRONTEND}/login?error=${encodeURIComponent("Login failed, please try again")}`);
  }
});
