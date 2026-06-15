import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { db, migrate } from "./db.js";

import { router as authRouter, publicBuilder } from "./routes/auth.js";
import { router as bOAuthRouter } from "./routes/boauth.js";
import { router as dashboardRouter } from "./routes/dashboard.js";
import { router as missionsRouter } from "./routes/missions.js";
import { router as audienceRouter } from "./routes/audience.js";
import { router as analyticsRouter } from "./routes/analytics.js";
import { router as walletRouter } from "./routes/wallet.js";
import { router as notificationsRouter } from "./routes/notifications.js";
import { router as messagesRouter } from "./routes/messages.js";
import { router as metaRouter } from "./routes/meta.js";

import { router as vAuthRouter, publicValidator } from "./routes/vauth.js";
import { router as vOAuthRouter } from "./routes/voauth.js";
import { router as vMetaRouter } from "./routes/vmetaRoute.js";
import { router as vMarketplaceRouter } from "./routes/vmarketplace.js";
import { router as vMissionsRouter } from "./routes/vmissions.js";
import { router as vEarningsRouter } from "./routes/vearnings.js";
import { router as vProfileRouter } from "./routes/vprofile.js";
import { router as vNotificationsRouter } from "./routes/vnotifications.js";
import { router as vMessagesRouter } from "./routes/vmessages.js";
import { router as vSupportRouter } from "./routes/vsupport.js";

import { authMiddleware, validatorAuthMiddleware, createSession, createValidatorSession, hashPassword } from "./auth.js";
import { buildFirebaseConfigRouter, buildFirebaseLoginRouter, buildPhoneLinkRouter, buildStepUpRouter } from "./firebaseRoutes.js";

migrate();

// On a fresh database (e.g. a brand new Railway volume), seed the demo data
// automatically so the deployed app isn't empty on first load.
const builderCount = db.prepare(`SELECT COUNT(*) c FROM builders`).get().c;
if (builderCount === 0) {
  console.log("Empty database detected — running seed...");
  await import("./seed.js");
}

const app = express();
app.use(cors());
app.use(cookieParser());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/auth/oauth", bOAuthRouter);
app.use("/api/auth/phone-login", buildFirebaseLoginRouter({
  table: "builders", createSession, publicUser: publicBuilder, userKey: "builder",
  createUser: (phone) => {
    const email = `${phone.replace(/[^0-9]/g, "")}@phone.validationcrew.app`;
    const randomPassword = hashPassword(crypto.randomBytes(24).toString("hex"));
    db.prepare(`INSERT INTO builders (name, org, email, password_hash, phone, phone_verified) VALUES (?,?,?,?,?,1)`)
      .run("New Builder", "My workspace", email, randomPassword, phone);
    const builder = db.prepare(`SELECT * FROM builders WHERE email = ?`).get(email);
    db.prepare(`INSERT INTO notifications (builder_id, icon, tone, title, body, time_label, unread) VALUES (?,'shield','green',?,?, 'Just now', 1)`)
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
app.use("/api/notifications", notificationsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/meta", metaRouter);

app.use("/api/v/auth", vAuthRouter);
app.use("/api/v/auth/oauth", vOAuthRouter);
app.use("/api/v/auth/phone-login", buildFirebaseLoginRouter({
  table: "validators", createSession: createValidatorSession, publicUser: publicValidator, userKey: "validator",
  createUser: (phone) => {
    const email = `${phone.replace(/[^0-9]/g, "")}@phone.validationcrew.app`;
    const randomPassword = hashPassword(crypto.randomBytes(24).toString("hex"));
    db.prepare(`INSERT INTO validators (name, handle, email, password_hash, phone, phone_verified, specialties_json) VALUES (?,?,?,?,?,1,'[]')`)
      .run("New Validator", null, email, randomPassword, phone);
    const validator = db.prepare(`SELECT * FROM validators WHERE email = ?`).get(email);
    db.prepare(`INSERT INTO v_notifications (validator_id, cat, icon, tone, title, body, time_label, unread) VALUES (?,'system','shield','green',?,?, 'Just now', 1)`)
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
app.use("/api/v/profile", vProfileRouter);
app.use("/api/v/notifications", vNotificationsRouter);
app.use("/api/v/messages", vMessagesRouter);
app.use("/api/v/support", vSupportRouter);

// ---- serve the built frontend (if present) ----
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.join(__dirname, "..", "..", "frontend", "dist");
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
}

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" });
  const indexHtml = path.join(FRONTEND_DIST, "index.html");
  if (fs.existsSync(indexHtml)) return res.sendFile(indexHtml);
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`ValidationCrew API listening on :${PORT}`));
