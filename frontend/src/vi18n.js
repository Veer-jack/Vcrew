// Translates the small static vmeta vocabulary (vtypes, levels, badges, expertise,
// reward/time bands, sorts, help categories/articles) that ships as English-only
// data from the backend (backend/src/vmeta.js). Lookups are keyed by each item's
// stable id (vtype.key, level.n, badge/expertise English label, help article index)
// so they work regardless of which endpoint returned the object.

const BADGE_IDS = {
  "Identity verified": "identity",
  "AI specialist": "aiSpecialist",
  "30-day streak": "streak30",
  "Top 5% rated": "top5",
  "SaaS expert": "saasExpert",
  "Perfectionist": "perfectionist",
};

const EXPERTISE_IDS = {
  "AI products": "aiProducts",
  "Dev tools & SaaS": "devTools",
  "Landing pages": "landingPages",
  "Prototypes": "prototypes",
};

const HELP_CAT_IDS = {
  Payments: "payments",
  Missions: "missions",
  Reputation: "reputation",
  Quality: "quality",
  Account: "account",
  Other: "other",
};

export const vtLabel = (t, vt) => t(`vtype.${vt.key}.label`, null, vt.label);
export const levelName = (t, n, fallback) => t(`level.${n}.name`, null, fallback);
export const levelPerks = (t, n, fallback) => t(`level.${n}.perks`, null, fallback);
export const badgeLabel = (t, label) => t(`badge.${BADGE_IDS[label] || label}.label`, null, label);
export const badgeDesc = (t, label, desc) => t(`badge.${BADGE_IDS[label] || label}.desc`, null, desc);
export const expertiseLabel = (t, label) => t(`expertise.${EXPERTISE_IDS[label] || label}`, null, label);
export const helpCatLabel = (t, cat) => t(`helpCat.${HELP_CAT_IDS[cat] || cat.toLowerCase()}`, null, cat);
export const rewardBandLabel = (t, k, fallback) => t(`rewardBand.${k}`, null, fallback);
export const timeBandLabel = (t, k, fallback) => t(`timeBand.${k}`, null, fallback);
export const sortLabel = (t, k, fallback) => t(`sort.${k}`, null, fallback);
export const helpArticleField = (t, idx, field, fallback) => t(`helpArticle.${idx}.${field}`, null, fallback);
