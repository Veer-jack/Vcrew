import os

with open('src/apages/ADashboard.jsx', 'r') as f:
    code = f.read()

replacements = [
    ('import { aapi } from "../aapi/client";', 'import { aapi } from "../aapi/client";\nimport { useTranslation } from "../i18n/index.jsx";'),
    ('export default function ADashboard() {', 'export default function ADashboard() {\n  const { t } = useTranslation();'),
    ('<div className="muted">Loading…</div>', '<div className="muted">{t("actions.loading", null, "Loading…")}</div>'),
    ('<span className="eyebrow">Platform overview</span>', '<span className="eyebrow">{t("admin.platformOverview", null, "Platform overview")}</span>'),
    ('<h1>Control center</h1>', '<h1>{t("admin.controlcenter", null, "Control center")}</h1>'),
    ('<p className="lead">A real-time snapshot of ValidationCrew\'s marketplace.</p>', '<p className="lead">{t("admin.dashboardLead", null, "A real-time snapshot of ValidationCrew\'s marketplace.")}</p>'),
    ('label="Total members"', 'label={t("admin.totalMembers", null, "Total members")}'),
    ('label="Builders"', 'label={t("admin.builders", null, "Builders")}'),
    ('label="Validators"', 'label={t("admin.validators", null, "Validators")}'),
    ('label="Active missions"', 'label={t("admin.activeMissions", null, "Active missions")}'),
    ('label="Wallet top-ups (all-time)"', 'label={t("admin.walletTopUps", null, "Wallet top-ups (all-time)")}'),
    ('label="Mission spend (all-time)"', 'label={t("admin.missionSpend", null, "Mission spend (all-time)")}'),
    ('label="Open support tickets"', 'label={t("admin.openSupportTickets", null, "Open support tickets")}'),
    ('label="Withdrawal queue"', 'label={t("admin.withdrawalQueue", null, "Withdrawal queue")}'),
    ('label="Suspended accounts"', 'label={t("admin.suspendedAccounts", null, "Suspended accounts")}')
]

for old, new in replacements:
    code = code.replace(old, new)

with open('src/apages/ADashboard.jsx', 'w') as f:
    f.write(code)

print("ADashboard modified successfully")
