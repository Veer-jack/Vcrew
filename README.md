# ValidationCrew — Builder & Validator Experiences

A full-stack rebuild of the ValidationCrew prototype, covering both sides of the marketplace:
- **Backend**: Node.js + Express + SQLite (uses Node's built-in `node:sqlite`, no native deps to compile)
- **Frontend**: Vite + React + react-router, using the original Atlas design system

## Requirements
- Node.js 22.5+ (for built-in `node:sqlite`)

## 1. Backend setup

```bash
cd backend
npm install
npm run seed     # creates backend/data/vcrew.db and seeds demo data
npm start        # starts the API on http://localhost:4000
```

## 2. Frontend setup

In a second terminal:

```bash
cd frontend
npm install
npm run dev      # starts the dev server on http://localhost:5173
```

The Vite dev server proxies `/api/*` requests to `http://localhost:4000`, so just open:

http://localhost:5173

## Demo logins

**Builder** (http://localhost:5173)
- **Email**: aarav@kettleand.co
- **Password**: password123

**Validator** (http://localhost:5173/validator)
- **Email**: riya@validationcrew.app
- **Password**: password123

## What's included

### Builder
- Dashboard with live KPIs, activity feed, recent missions
- Missions list with status tabs
- Mission detail: Overview, Audience, Participants (drag-and-drop kanban), Responses
  (with flagging), Files, Payments
- Create Mission wizard (5 steps, publishes a real mission to the database)
- Audience Explorer with filters
- Analytics (real aggregates from your mission data)
- Wallet (balance, transactions, invoices, payment methods, top-up)
- Messages (threaded conversations)

### Validator
- Discover: searchable/filterable mission marketplace with categories, featured
  spotlight, saved missions
- Mission details with apply flow
- Validation workspace: adaptive rubric by mission type, flags, write-up, live score
- Submission confirmation with "up next" recommendation
- My missions (applied / active / submitted / completed / rejected)
- Earnings & reputation, including a working withdraw flow
- Profile: reputation ladder, expertise scores, verification badges
- Messages (threaded conversations)
- Help center: searchable articles + support tickets

## Not yet built

- Builder Support / ticket center
- Admin console and marketing-site experiences from the original design prototype

## Notes

- The database file lives at `backend/data/vcrew.db`. Re-run `npm run seed` at any time
  to reset to the original demo data (this wipes and recreates all tables).
- To run the production build of the frontend: `npm run build` in `frontend/`, then
  serve `frontend/dist` with any static file server (you'll need to point `/api` at
  the backend separately, e.g. via a reverse proxy, since the dev proxy only applies
  to `npm run dev`).

## Validator social login

The Validator login page can show "Continue with GitHub / Google / LinkedIn" buttons.
Each is **independent and hidden until configured** — the app calls
`/api/v/auth/oauth/providers` to check, so you can enable them one at a time in
any order.

Signing in with any provider creates a new validator account automatically on
first use (or links to an existing account with the same email), starting at
Level 1 with empty stats — a real "new validator" experience, separate from the
seeded demo account.

For **all** providers, the callback URL pattern is:
```
https://vcrew-production.up.railway.app/api/v/auth/oauth/<provider>/callback
```
(replace `<provider>` with `github`, `google`, or `linkedin`, and use your actual domain)

And every provider needs the shared `APP_URL` variable set once:
- `APP_URL` = `https://vcrew-production.up.railway.app` (your actual domain, no trailing slash)

### GitHub

1. https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**
2. Homepage URL: your app URL. Authorization callback URL: as above with `github`.
3. **Register application** → **Generate a new client secret**.
4. Railway → Variables: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.

### Google

1. https://console.cloud.google.com/ → create/select a project.
2. **APIs & Services → OAuth consent screen** — set up an "External" app (name, support email). For testing, you can leave it in "Testing" mode and add your own Google account as a test user.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → Application type: **Web application**.
4. Under **Authorized redirect URIs**, add the callback URL above with `google`.
5. Copy the **Client ID** and **Client secret**.
6. Railway → Variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

### LinkedIn

1. https://www.linkedin.com/developers/apps → **Create app**. LinkedIn requires
   linking the app to a **LinkedIn Company Page** — if you don't have one, you can
   create a free company page in a couple of clicks during this step.
2. On the new app's **Products** tab, add **"Sign In with LinkedIn using OpenID Connect"**.
3. On the **Auth** tab, add the callback URL above with `linkedin` under **Authorized redirect URLs**.
4. Copy the **Client ID** and **Client Secret** from the Auth tab.
5. Railway → Variables: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`.

After adding any of these variables, Railway redeploys automatically and the
matching button appears on `/validator/login`.

## Deploying to Railway

This repo is set up to deploy as a **single Railway service** — the Express backend
serves both the API and the built React frontend from one URL.

1. **Push this code to a GitHub repo**, then in Railway: New Project → Deploy from GitHub repo.
2. Railway will detect `nixpacks.toml` / `railway.json` at the repo root and:
   - install Node 22 (required for `node:sqlite`)
   - run `npm run build` (builds the frontend, installs backend deps)
   - run `npm start` (starts the Express server, which serves the built frontend + API)
3. **Add a persistent volume** so your data survives redeploys:
   - In the service → Settings → Volumes → add a volume, mount it at e.g. `/data`.
   - Add an environment variable `DB_DIR=/data`.
   - On first boot with an empty database, the app **automatically seeds** the demo
     data (Aarav Mehta / Riya Malhotra accounts) — no manual step needed.
4. Railway assigns a public domain automatically (Settings → Networking → Generate Domain).
   The app reads `PORT` from the environment, which Railway sets for you.
5. Open the generated URL — both `/` (Builder login) and `/validator` (Validator login)
   will work from the same domain, with no CORS issues since everything is same-origin.

### Before using this for real users

This is demo-grade: a single hardcoded seeded account per side, unsalted password
hashing, no session expiry, and wallet/earnings numbers are just rows in the database
(no real payment processor). See the conversation for a fuller list — treat this as a
solid foundation to harden incrementally, not a finished product to put real money
through yet.
