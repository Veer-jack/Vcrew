import * as Sentry from "@sentry/node";

process.on('unhandledRejection', (reason) => {
  console.error('=== UNHANDLED REJECTION ===', reason);
});
process.on('uncaughtException', (err) => {
  console.error('=== UNCAUGHT EXCEPTION ===', err);
});

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "production",
    tracesSampleRate: 0.2,
  });
}

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { db, initDb } from "./db.js";
import { runPeriodicSweeps } from "./jobs/sweepFailures.js";

import { router as authRouter, publicBuilder } from "./routes/auth.js";
import { router as bOAuthRouter } from "./routes/boauth.js";
import { router as dashboardRouter } from "./routes/dashboard.js";
import { router as missionsRouter } from "./routes/missions.js";
import { router as audienceRouter } from "./routes/audience.js";
import { router as analyticsRouter } from "./routes/analytics.js";
import { router as walletRouter } from "./routes/wallet.js";
import { router as supportRouter, buildSupportRouter } from "./routes/support.js";
import { router as adminRouter } from "./routes/admin.js";
import { router as paymentsRouter } from "./routes/payments.js";
import { router as notificationsRouter } from "./routes/notifications.js";
import { router as messagesRouter } from "./routes/messages.js";
import { router as metaRouter } from "./routes/meta.js";
import { router as freshdeskWebhookRouter } from "./routes/freshdeskWebhook.js";

import { router as vAuthRouter, publicValidator } from "./routes/vauth.js";
import { router as vOAuthRouter } from "./routes/voauth.js";
import { router as vMetaRouter } from "./routes/vmetaRoute.js";
import { router as vMarketplaceRouter } from "./routes/vmarketplace.js";
import { router as vMissionsRouter } from "./routes/vmissions.js";
import { router as vEarningsRouter } from "./routes/vearnings.js";
import { router as vPayoutsRouter } from "./routes/vpayouts.js";
import { router as vProfileRouter } from "./routes/vprofile.js";
import { router as vNotificationsRouter } from "./routes/vnotifications.js";
import { router as vMessagesRouter } from "./routes/vmessages.js";
import { HELP_ARTICLES as V_HELP_ARTICLES } from "./vmeta.js";

import { authMiddleware, validatorAuthMiddleware, createSession, createValidatorSession, hashPassword } from "./auth.js";
import { buildFirebaseConfigRouter, buildFirebaseLoginRouter, buildPhoneLinkRouter, buildStepUpRouter } from "./firebaseRoutes.js";

import { rateLimit } from "express-rate-limit";

// ---- Rate limiters ----
// Per-process, in-memory counters -- correct as long as this runs as a single
// instance. If this app ever runs as more than one instance at once, these
// limits need to move to a shared store (e.g. Redis) or each instance will
// count separately and the effective limit multiplies silently.
// Windows are per-minute (fast reset = forgiving to real users), but the caps
// stay sized to "how many legitimate attempts could plausibly land close
// together" (e.g. a shared office IP), not inflated just because the window
// is short — a high per-IP cap here defeats the point of rate limiting.
// Global API limiter — catches anything not covered by a specific limiter below
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 400,                  // covers one active user's dashboard/polling traffic, or a busy shared IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down" },
});

// Auth-specific limiters — tighter windows on endpoints that accept credentials
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 30,                   // generous for a shared-IP office burst, still bounds brute-force to ~43k/day/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts, please try again in a minute" },
});

const signupLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 15,                   // fewer people sign up concurrently than log in, even in a shared-IP burst
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many accounts created from this IP, please try again in a minute" },
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,                   // Allow for a few more admin login attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many admin sign-in attempts, please try again in 15 minutes" },
});

const phoneLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,  // 10 minutes
  max: 50,                   // 50 OTP requests per 10 mins (safeguards SMS budget but allows shared IPs)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP requests, please try again in 10 minutes" },
});

await initDb();

// On a fresh database (e.g. a brand new Railway volume), seed the demo data
// automatically so the deployed app isn't empty on first load.
const builderCount = (await db.prepare(`SELECT COUNT(*) c FROM builders`).get()).c;
if (builderCount === 0) {
  console.log("Empty database detected — running seed...");
  await import("./seed.js");
}

const app = express();
// Railway sits in front of the app behind a reverse proxy; without this, Express
// can't see the real client IP (X-Forwarded-For), so express-rate-limit below
// ends up treating every visitor as the same IP and rate-limits everyone at once.
app.set("trust proxy", 1);
// #9 — Tighten CORS: allow only the production domain and localhost in dev
const ALLOWED_ORIGINS = [
  "https://vcrew-production.up.railway.app",
  "https://www.validationcrew.com",
  "https://validationcrew.com",
  ...(process.env.NODE_ENV !== "production" ? ["http://localhost:5173", "http://localhost:4000"] : []),
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",").map(s => s.trim()) : []),
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin) || (process.env.NODE_ENV !== "production" && /^http:\/\/localhost:\d+$/.test(origin))) {
      return cb(null, true);
    }
    const err = new Error(`CORS: origin ${origin} not allowed`);
    err.status = 403;
    cb(err);
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use("/api", globalLimiter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

// File downloads — UUID-named files on the persistent volume.
// The UUID in the filename acts as an unguessable token (same approach
// used by Notion, Linear, etc. for simple file hosting).
app.get("/api/uploads/:filename", async (req, res) => {
  const uploadsDir = path.join(process.env.DB_DIR || path.join(__dirname, "..", "data"), "uploads");
  const filePath = path.join(uploadsDir, path.basename(req.params.filename)); // basename prevents path traversal
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
  
  const row = await db.prepare(`SELECT * FROM mission_files WHERE file_path = ?`).get(req.params.filename);
  if (row) {
    res.setHeader("Content-Disposition", `attachment; filename="${row.name}"`);
    if (row.mime_type) res.setHeader("Content-Type", row.mime_type);
  } else {
    // If it's a Validator proof image (unguessable UUID), serve it inline for the React UI.
    res.setHeader("Content-Disposition", "inline");
  }
  res.sendFile(path.resolve(filePath));
});

app.post("/api/auth/login", loginLimiter);
app.post("/api/auth/signup", signupLimiter);
app.use("/api/auth", authRouter);
app.use("/api/auth/oauth", bOAuthRouter);
app.use("/api/auth/phone-login", phoneLimiter, buildFirebaseLoginRouter({
  table: "builders", createSession, publicUser: publicBuilder, userKey: "builder",
  createUser: async (phone) => {
    const email = `${phone.replace(/[^0-9]/g, "")}@phone.validationcrew.app`;
    const randomPassword = hashPassword(crypto.randomBytes(24).toString("hex"));
    await db.prepare(`INSERT INTO builders (name, org, email, password_hash, phone, phone_verified) VALUES (?,?,?,?,?,1)`)
      .run("New Builder", "My workspace", email, randomPassword, phone);
    const builder = await db.prepare(`SELECT * FROM builders WHERE email = ?`).get(email);
    await db.prepare(`INSERT INTO notifications (builder_id, cat, icon, tone, title, body, time_label, unread) VALUES (?, 'system', 'shield','green',?,?, 'Just now', 1)`)
      .run(builder.id, "Welcome to ValidationCrew", "Your account was created via phone sign-in. Update your workspace name and email in Settings any time.");
    return builder;
  },
}));
app.use("/api/auth/phone", buildPhoneLinkRouter({ table: "builders", authMiddleware, userKey: "builder" }));
app.use("/api/wallet/stepup", buildStepUpRouter({ table: "builders", purpose: "topup", authMiddleware, userKey: "builder" }));
app.use("/api/firebase", buildFirebaseConfigRouter());
app.use("/api/dashboard", dashboardRouter);
app.use("/api/missions", missionsRouter);
app.use("/api/audience", audienceRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/support", supportRouter);
app.use("/api/freshdesk/webhook", freshdeskWebhookRouter);
app.use("/api/admin/login", adminLimiter);
app.use("/api/admin/totp", adminLimiter);
app.use("/api/admin", adminRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/meta", metaRouter);

app.post("/api/v/auth/login", loginLimiter);
app.post("/api/v/auth/signup", signupLimiter);
app.use("/api/v/auth", vAuthRouter);
app.use("/api/v/auth/oauth", vOAuthRouter);
app.use("/api/v/auth/phone-login", phoneLimiter, buildFirebaseLoginRouter({
  table: "validators", createSession: createValidatorSession, publicUser: publicValidator, userKey: "validator",
  createUser: async (phone) => {
    const email = `${phone.replace(/[^0-9]/g, "")}@phone.validationcrew.app`;
    const randomPassword = hashPassword(crypto.randomBytes(24).toString("hex"));
    await db.prepare(`INSERT INTO validators (name, handle, email, password_hash, phone, phone_verified, specialties_json) VALUES (?,?,?,?,?,1,'[]')`)
      .run("New Validator", null, email, randomPassword, phone);
    const validator = await db.prepare(`SELECT * FROM validators WHERE email = ?`).get(email);
    await db.prepare(`INSERT INTO v_notifications (validator_id, cat, icon, tone, title, body, time_label, unread) VALUES (?,'system','shield','green',?,?, 'Just now', 1)`)
      .run(validator.id, "Welcome to ValidationCrew", "Your account was created via phone sign-in. Complete your profile to start getting matched to missions.");
    return validator;
  },
}));
app.use("/api/v/auth/phone", buildPhoneLinkRouter({ table: "validators", authMiddleware: validatorAuthMiddleware, userKey: "validator" }));
app.use("/api/v/earnings/stepup", buildStepUpRouter({ table: "validators", purpose: "withdraw", authMiddleware: validatorAuthMiddleware, userKey: "validator" }));
app.use("/api/v/meta", vMetaRouter);
app.use("/api/v/marketplace", vMarketplaceRouter);
app.use("/api/v/missions", vMissionsRouter);
app.use("/api/v/earnings", vEarningsRouter);
app.use("/api/v/payouts", vPayoutsRouter);
app.use("/api/v/profile", vProfileRouter);
app.use("/api/v/notifications", vNotificationsRouter);
app.use("/api/v/messages", vMessagesRouter);
app.use("/api/v/support", buildSupportRouter({ authMiddleware: validatorAuthMiddleware, userKey: "validator", helpArticles: V_HELP_ARTICLES, isValidator: true }));

// ---- serve the built frontend (if present) ----
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.join(__dirname, "..", "..", "frontend", "dist");
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
}

// ---- serve the marketing/landing site at /site ----
const SITE_DIST = path.join(__dirname, "..", "site");
if (fs.existsSync(SITE_DIST)) {
  app.use("/site", express.static(SITE_DIST));
}

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" });
  const indexHtml = path.join(FRONTEND_DIST, "index.html");
  if (fs.existsSync(indexHtml)) return res.sendFile(indexHtml);
  res.status(404).json({ error: "Not found" });
});

// Sentry error handler must come before the generic error handler
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use((err, req, res, next) => {
  console.error("EXPRESS ERROR:", err?.stack || err?.message || err);
  res.status(500).json({ error: "Internal server error", detail: err?.message });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`ValidationCrew API listening on :${PORT}`));

// Periodic maintenance: fails trial missions whose validators went silent past the
// check-in grace period, and expires invitations nobody ever responded to. Runs
// in-process so it works with zero extra infra (no external cron / CRON_SECRET
// needed) — the previous cron-only wiring meant this never actually ran in practice.
const SWEEP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
setInterval(() => {
  runPeriodicSweeps().catch((err) => console.error("Periodic sweep error:", err));
}, SWEEP_INTERVAL_MS);
