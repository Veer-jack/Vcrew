// Translates the small static builder-side vocabulary (mission categories,
// participation types, reward types, activity-feed template fragments, help
// categories/articles) that ships as English-only data from the backend
// (backend/src/meta.js). Lookups are keyed by each item's stable id, mirroring
// frontend/src/vi18n.js's approach for the validator side.
import { helpCatLabel } from "./vi18n";

export const categoryLabel = (t, cat) => t(`cat.${cat.id}.label`, null, cat.label);
export const categoryDesc = (t, cat) => t(`cat.${cat.id}.desc`, null, cat.desc);
export const ptypeLabel = (t, ptype) => t(`ptype.${ptype.id}.label`, null, ptype.label);
export const ptypeDesc = (t, ptype) => t(`ptype.${ptype.id}.desc`, null, ptype.desc);
export const rewardLabel = (t, reward) => t(`rewardType.${reward.id}.label`, null, reward.label);
export const rewardDesc = (t, reward) => t(`rewardType.${reward.id}.desc`, null, reward.desc);
export const builderHelpArticleField = (t, idx, field, fallback) => t(`builderHelpArticle.${idx}.${field}`, null, fallback);
export { helpCatLabel };

const ACTIVITY_KEY = {
  mission_published: { key: "missionPublished", fallback: "published mission" },
  submission_received: { key: "submissionReceived", fallback: "submitted feedback on" },
  submission_approved: { key: "submissionApproved", fallback: "approved a submission on" },
  reward_released: { key: "rewardReleased", fallback: "released ₹{{amount}} reward for" },
};

export const activityWho = (t, item) => {
  if (item.validatorName) return item.validatorName;
  return item.type === "submission_received"
    ? t("activity.aValidator", null, "A validator")
    : t("activity.system", null, "System");
};

export const activityText = (t, item) => {
  const entry = ACTIVITY_KEY[item.type];
  if (!entry) return t("activity.default", null, "did something with");
  return t(`activity.${entry.key}`, { amount: item.amount }, entry.fallback.replace("{{amount}}", item.amount));
};
