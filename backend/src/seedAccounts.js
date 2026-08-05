// Bulk-loads the ValidationCrew_Mock_Accounts.xlsx dataset (backend/src/data/mock_accounts.json,
// converted once from the .xlsx) into `validators`. Onboarding fields the spreadsheet doesn't
// cover (demographics, interests, profession, etc.) are filled with random values drawn from
// the same FILTERS enums the Audience explorer already filters by, so filter counts stay meaningful.
import { db, initDb } from "./db.js";
import { hashPassword } from "./auth.js";
import { FILTERS } from "./meta.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const accounts = JSON.parse(fs.readFileSync(path.join(__dirname, "data/mock_accounts.json"), "utf8"));

const LANGUAGES = ["English", "Hindi", "Tamil", "Telugu", "Bengali", "Marathi", "Kannada", "Malayalam", "Gujarati", "Punjabi"];
const DEVICES = ["iPhone", "Android Phone", "Windows Laptop", "MacBook", "iPad / Tablet"];
const INTEREST_TAGS = [...FILTERS.Interests.Lifestyle, ...FILTERS.Interests["Product Types"]];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, min, max) => {
  const n = Math.floor(Math.random() * (max - min + 1)) + min;
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
};
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Realistic (not uniform) demographic weights for this platform's population: a
// gig/panel audience skews younger + single vs. general census figures. [value, weight].
export const GENDER_WEIGHTS = [["Male", 48], ["Female", 48], ["Non-binary", 2], ["Prefer not to say", 2]];
export const INCOME_WEIGHTS = [["Under Rs2.5L", 30], ["Rs2.5L-5L", 28], ["Rs5L-10L", 22], ["Rs10L-20L", 12], ["Rs20L-50L", 6], ["Above Rs50L", 2]];
export const MARITAL_WEIGHTS = [["Single", 55], ["Married", 35], ["In a relationship", 6], ["Divorced", 3], ["Widowed", 1]];
export const KIDS_WEIGHTS = [["No", 65], ["Yes", 35]];
export const AGE_WEIGHTS = [["Under 18", 1], ["18-24", 26], ["25-34", 34], ["35-44", 20], ["45-54", 11], ["55-64", 6], ["65+", 2]];

export function randWeighted(weights) {
  let r = Math.random() * weights.reduce((a, [, w]) => a + w, 0);
  for (const [value, w] of weights) {
    if ((r -= w) <= 0) return value;
  }
  return weights[weights.length - 1][0];
}

function buildRow(a, sharedHash) {
  const role = a.accountType; // "Tester" | "Validator" | "User" — matches validators.role CHECK
  const isMember = role !== "User";
  const city = a.city !== "N/A" ? a.city : null;
  return {
    name: `${a.firstName} ${a.lastName}`,
    handle: `@${a.accountId.toLowerCase()}`,
    email: a.email,
    password_hash: sharedHash,
    phone: a.phone,
    validator_type: role.toLowerCase(),
    role,
    city,
    location: city || a.country,
    address_city: city,
    address_state: a.state !== "N/A" ? a.state : null,
    address_country: a.country,
    verified: Math.random() < (isMember ? 0.75 : 0.35) ? 1 : 0,
    rating: isMember ? Number((3.5 + Math.random() * 1.5).toFixed(1)) : 0,
    reviews_count: isMember ? randInt(3, 250) : 0,
    age_group: randWeighted(AGE_WEIGHTS),
    gender: randWeighted(GENDER_WEIGHTS),
    marital_status: randWeighted(MARITAL_WEIGHTS),
    has_kids: randWeighted(KIDS_WEIGHTS),
    income_bracket: randWeighted(INCOME_WEIGHTS),
    occupation: pick(FILTERS.Professional),
    industry: pick(FILTERS.Interests.Industry),
    specialties_json: JSON.stringify(pickN(INTEREST_TAGS, 1, 3)),
    languages_json: JSON.stringify([...new Set(["English", ...pickN(LANGUAGES, 1, 2)])]),
    lifestyle_json: JSON.stringify(pickN(FILTERS.Interests.Lifestyle, 1, 3)),
    devices_json: JSON.stringify(pickN(DEVICES, 1, 3)),
    product_types_json: JSON.stringify(pickN(FILTERS.Interests["Product Types"], 1, 2)),
    status: a.status.toLowerCase(),
    profile_completion: randInt(50, 75),
    created_at: a.signupDate,
  };
}

const COLUMNS = [
  "name", "handle", "email", "password_hash", "phone", "validator_type", "role", "city", "location",
  "address_city", "address_state", "address_country", "verified", "rating", "reviews_count",
  "age_group", "gender", "marital_status", "has_kids", "income_bracket", "occupation", "industry",
  "specialties_json", "languages_json", "lifestyle_json", "devices_json", "product_types_json",
  "status", "profile_completion", "created_at",
];

const BATCH_SIZE = 250;

async function main() {
  await initDb();
  const sharedHash = await hashPassword("password123");
  const rows = accounts.map((a) => buildRow(a, sharedHash));

  await db.transaction(async (tx) => {
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const valuesSql = batch.map(() => `(${COLUMNS.map(() => "?").join(",")})`).join(",");
      const params = batch.flatMap((r) => COLUMNS.map((c) => r[c]));
      await tx.prepare(`
        INSERT INTO validators (${COLUMNS.join(",")})
        VALUES ${valuesSql}
        ON CONFLICT (email) DO NOTHING
      `).run(...params);
      console.log(`Inserted ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
    }
  });

  console.log("Mock accounts seed complete. Shared login password: password123");
}

// Guard so importing this module for its exported weights/helpers (e.g. reweightDemographics.js)
// doesn't also trigger a full re-seed as a side effect.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
