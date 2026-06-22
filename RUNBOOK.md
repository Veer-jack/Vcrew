# ValidationCrew — Operational Runbook

Quick reference for the most common incidents. Keep this open in a tab when deploying.

---

## Rollback a bad deploy (#13)

If a deployment breaks something, Railway redeploys from the last known-good commit:

**Option A — Railway dashboard (fastest)**
1. Go to Railway → vcrew-production → Deployments tab
2. Find the last successful deployment (green)
3. Click the three-dot menu → **Redeploy**

Railway reruns that exact build. Takes ~2 minutes.

**Option B — Git revert + push**
```bash
cd ~/Downloads/vcrew_app
git log --oneline -10          # find the bad commit hash
git revert <bad-commit-hash>   # creates a new revert commit
git push origin main           # Railway auto-deploys
```

Use Option B if the bad code introduced a DB migration you also need to undo — a revert commit gives you a clean audit trail. Note: DB migrations (`ALTER TABLE`) cannot be automatically undone; you'd need to run a manual SQL command via Railway's SQLite console.

---

## Common incidents

### 🔴 App is down / returning 500s
1. Check Railway → vcrew-production → **Deploy Logs** — look for an uncaught exception at startup
2. Check **Build Logs** — a failed `npm run build` or `npm install` will cause the server not to start
3. If the server started but is erroring: check `/api/health` — if that returns 200, it's a route-specific issue; if it 500s or times out, the server is truly down
4. If the DB is corrupted: stop the service, copy `/data/vcrew.db` to `/data/vcrew-corrupted.db`, then restore from the latest backup at `/data/backups/`
5. Rollback using Option A above while you investigate

### 🟡 Admin console locked out (lost 2FA device)
1. You need a **backup code** — these were shown once when you first set up 2FA. If you saved them, use one:
   ```
   POST /api/admin/totp/reset
   { "email": "<ADMIN_EMAIL>", "password": "<ADMIN_PASSWORD>", "backupCode": "<code>" }
   ```
   This wipes the TOTP secret; next login will show a fresh QR code.

2. If you don't have backup codes: you'll need direct DB access via Railway Shell:
   ```sql
   DELETE FROM admin_settings WHERE key IN ('totp_secret', 'totp_secret_pending', 'backup_codes_json');
   ```
   Next login will trigger fresh TOTP setup.

### 🟡 Payout failed / withdrawal stuck
1. Go to `/admin/withdrawals` → find the withdrawal → mark as **failed** (this returns funds to the validator's balance automatically)
2. Contact RazorpayX support with the withdrawal ID
3. Once resolved, the validator can re-request the withdrawal

### 🟡 Razorpay payments not working
1. Check https://status.razorpay.com for an active incident
2. The app will return a user-friendly outage message (not a generic 500) — builders will be told to try again
3. No action needed if it's a Razorpay-side outage; monitor their status page
4. If it's a config issue: verify `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set correctly in Railway Variables

### 🟡 Firebase phone auth not working
1. Check https://status.firebase.google.com
2. Users can still sign in via email/password or OAuth (Google, GitHub, LinkedIn)
3. The app returns a user-friendly message suggesting alternatives
4. If it's a config issue: verify all `FIREBASE_*` env vars are set in Railway Variables

### 🟡 Validator can't withdraw (RazorpayX blocked)
Known issue — RazorpayX account activation is pending. Validators can request withdrawals but they'll queue until activation is resolved. Keep the `status = 'queued'` record and process manually once activated.

### 🟠 High fraud signal volume in `/admin/fraud-signals`
1. Don't panic — signals are soft flags, not blocks
2. Common false positives: team members at the same company both signing up (same IP), or an active validator applying to many missions legitimately
3. For genuine collusion suspicion: cross-reference the flagged builder and validator accounts, check their mission and earnings history, then suspend via `/admin/members` if confirmed
4. Run a full automod scan: `POST /api/admin/automod/run`

### 🟠 Database is filling up (approaching 500MB volume limit)
1. Check current DB size via Railway Shell: `ls -lh /data/vcrew.db`
2. Check backups size: `du -sh /data/backups/`
3. If backups are taking up space, prune old ones manually: `ls -t /data/backups/ | tail -n +8 | xargs -I{} rm /data/backups/{}`
4. If the DB itself is large: run `VACUUM;` via SQLite to reclaim space from deleted rows
5. If genuinely near the limit: upgrade the Railway volume size (Live resize, no downtime) or consider migrating to Postgres

---

## Environment variables reference

| Variable | Required | Notes |
|---|---|---|
| `DB_DIR` | Yes | Must point to `/data` (mounted volume) |
| `APP_URL` | Yes | `https://vcrew-production.up.railway.app` — used in email reset links |
| `ADMIN_EMAIL` | Yes | Operator login email |
| `ADMIN_PASSWORD` | Yes | Operator login password — must be set, never use the default |
| `RAZORPAY_KEY_ID` | For payments | Public Razorpay key |
| `RAZORPAY_KEY_SECRET` | For payments | Secret Razorpay key |
| `FIREBASE_PROJECT_ID` | For phone auth | Firebase project |
| `FIREBASE_PRIVATE_KEY` | For phone auth | Service account key |
| `FIREBASE_CLIENT_EMAIL` | For phone auth | Service account email |
| `FIREBASE_API_KEY` | For phone auth | Web API key |
| `FIREBASE_APP_ID` | For phone auth | Web app ID |
| `FIREBASE_AUTH_DOMAIN` | For phone auth | Auth domain |
| `RESEND_API_KEY` | For emails | From resend.com — silently skipped if not set |
| `SENTRY_DSN` | For error tracking | From sentry.io — silently skipped if not set |
| `VITE_SENTRY_DSN` | For frontend error tracking | Same DSN, different env var prefix |
| `ALLOWED_ORIGINS` | Optional | Comma-separated extra CORS origins (e.g. custom domain) |

---

## Daily backup cron (Railway)

Set up once if not already done:
- **Service**: vcrew-production (or a separate cron service)
- **Schedule**: `0 2 * * *` (2am UTC daily)  
- **Command**: `node --experimental-sqlite backend/src/backup.js`
- **Same env vars** as the main service

Backups land at `/data/backups/vcrew-YYYY-MM-DDTHH-MM-SS.db`. The last 14 are kept automatically.
