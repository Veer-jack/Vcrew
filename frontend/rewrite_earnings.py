import os

with open('src/vpages/Earnings.jsx', 'r') as f:
    code = f.read()

replacements = [
    ('import { vapi } from "../vapi/client";', 'import { vapi } from "../vapi/client";\nimport { useTranslation } from "../i18n/index.jsx";'),
    ('export default function Earnings() {', 'export default function Earnings() {\n  const { t } = useTranslation();'),
    ('<div className="muted">Loading…</div>', '<div className="muted">{t("actions.loading", null, "Loading…")}</div>'),
    ('Earnings &amp; reputation', '{t("earnings.title", null, "Earnings & reputation")}'),
    ('You\'ve earned ₹{(data.lifetime || 0).toLocaleString("en-IN")} all-time', '{t("earnings.lifetime", null, "You\'ve earned")} ₹{(data.lifetime || 0).toLocaleString("en-IN")} {t("earnings.allTime", null, "all-time")}'),
    ('<div className="eyebrow">This week</div>', '<div className="eyebrow">{t("earnings.thisWeek", null, "This week")}</div>'),
    ('<div className="faint" style={{ fontSize: 12 }}>Goal</div>', '<div className="faint" style={{ fontSize: 12 }}>{t("earnings.goal", null, "Goal")}</div>'),
    ('{weekPct}% of weekly goal', '{weekPct}% {t("earnings.ofWeeklyGoal", null, "of weekly goal")}'),
    (' to go</span>', ' {t("earnings.toGo", null, "to go")}</span>'),
    ('<div className="faint" style={{ fontSize: 12 }}>Pending</div>', '<div className="faint" style={{ fontSize: 12 }}>{t("earnings.pending", null, "Pending")}</div>'),
    ('<div className="faint" style={{ fontSize: 12 }}>Available</div>', '<div className="faint" style={{ fontSize: 12 }}>{t("earnings.available", null, "Available")}</div>'),
    ('Withdraw</button>', '{t("actions.withdraw", null, "Withdraw")}</button>'),
    ('add one in your profile</Link>', '{t("earnings.addProfile", null, "add one in your profile")}</Link>'),
    ('<label>Amount to withdraw</label>', '<label>{t("earnings.amountWithdraw", null, "Amount to withdraw")}</label>'),
    ('placeholder={`Up to ${data.available}`}', 'placeholder={`${t("earnings.upTo", null, "Up to")} ${data.available}`}'),
    ('{busy ? "Processing…" : "Confirm withdrawal"}', '{busy ? t("actions.processing", null, "Processing…") : t("actions.confirmWithdrawal", null, "Confirm withdrawal")}'),
    ('Cancel</button>', '{t("actions.cancel", null, "Cancel")}</button>'),
    ('Minimum withdrawal is ₹200. Funds land in your linked UPI/bank within 24h.', '{t("earnings.disclaimer", null, "Minimum withdrawal is ₹200. Funds land in your linked UPI/bank within 24h.")}'),
    ('title="Verify withdrawal"', 'title={t("earnings.verifyTitle", null, "Verify withdrawal")}'),
    ('<div className="eyebrow">Reputation</div>', '<div className="eyebrow">{t("earnings.reputation", null, "Reputation")}</div>'),
    ('Level {data.level}', '{t("badge.level", null, "Level")} {data.level}'),
    ('{data.accuracy}% accuracy', '{data.accuracy}% {t("badge.accuracy", null, "accuracy")}'),
    (' validations to <b', ' {t("earnings.validationsTo", null, "validations to")} <b'),
    ('Recent withdrawals</div>', '{t("earnings.recentWithdrawals", null, "Recent withdrawals")}</div>'),
    ('Load more</button>', '{t("actions.loadMore", null, "Load more")}</button>'),
    ('Recent validations</div>', '{t("earnings.recentValidations", null, "Recent validations")}</div>'),
    ('No validations yet.</div>', '{t("earnings.noValidations", null, "No validations yet.")}</div>'),
    ('Load more validations</button>', '{t("actions.loadMoreValidations", null, "Load more validations")}</button>')
]

for old, new in replacements:
    code = code.replace(old, new)

with open('src/vpages/Earnings.jsx', 'w') as f:
    f.write(code)

print("Earnings modified successfully")
