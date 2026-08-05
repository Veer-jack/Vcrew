import os

with open('src/pages/Analytics.jsx', 'r') as f:
    code = f.read()

replacements = [
    ('import { exportCSV, exportXls } from "../exportUtils";', 'import { exportCSV, exportXls } from "../exportUtils";\nimport { useTranslation } from "../i18n/index.jsx";'),
    ('export default function Analytics() {', 'export default function Analytics() {\n  const { t } = useTranslation();'),
    ('<div className="muted">Loading…</div>', '<div className="muted">{t("actions.loading", null, "Loading…")}</div>'),
    ('const reportHeaders = ["Mission", "Responses", "Avg rating", "Completion %"];', 'const reportHeaders = [t("analytics.thMission", null, "Mission"), t("analytics.thResponses", null, "Responses"), t("analytics.thAvgRating", null, "Avg rating"), t("analytics.thCompletion", null, "Completion %")];'),
    ('total responses', '{t("analytics.totalResponsesLower", null, "total responses")}'),
    ('completion', '{t("analytics.completionLower", null, "completion")}'),
    ('<span className="eyebrow">Reports</span>', '<span className="eyebrow">{t("analytics.reports", null, "Reports")}</span>'),
    ('<h1>Analytics &amp; Reports</h1>', '<h1>{t("analytics.title", null, "Analytics & Reports")}</h1>'),
    ('<p className="lead">Aggregate insight across every mission you\'ve run.</p>', '<p className="lead">{t("analytics.lead", null, "Aggregate insight across every mission you\'ve run.")}</p>'),
    ('label="Total Responses"', 'label={t("analytics.totalResponses", null, "Total Responses")}'),
    ('label="Completion Rate"', 'label={t("analytics.completionRate", null, "Completion Rate")}'),
    ('label="Average Rating"', 'label={t("analytics.averageRating", null, "Average Rating")}'),
    ('<h3 className="h-md">Completion across missions</h3>', '<h3 className="h-md">{t("analytics.completionAcross", null, "Completion across missions")}</h3>'),
    ('<span className="pill" style={{ fontSize: 11 }}>Chronological</span>', '<span className="pill" style={{ fontSize: 11 }}>{t("analytics.chronological", null, "Chronological")}</span>'),
    ('<h3 className="h-md">Spend by category</h3>', '<h3 className="h-md">{t("analytics.spendByCategory", null, "Spend by category")}</h3>'),
    ('No spend recorded yet.', '{t("analytics.noSpend", null, "No spend recorded yet.")}'),
    ('<h3 className="h-md">Audience pool by city</h3>', '<h3 className="h-md">{t("analytics.audienceByCity", null, "Audience pool by city")}</h3>'),
    ('Not enough audience data yet.', '{t("analytics.notEnoughData", null, "Not enough audience data yet.")}'),
    ('<h2 className="h-lg">By mission</h2>', '<h2 className="h-lg">{t("analytics.byMission", null, "By mission")}</h2>'),
    ('<th>Mission</th>', '<th>{t("analytics.thMission", null, "Mission")}</th>'),
    ('<th style={{ textAlign: "right" }}>Responses</th>', '<th style={{ textAlign: "right" }}>{t("analytics.thResponses", null, "Responses")}</th>'),
    ('<th style={{ textAlign: "right" }}>Avg rating</th>', '<th style={{ textAlign: "right" }}>{t("analytics.thAvgRating", null, "Avg rating")}</th>'),
    ('<th style={{ width: 150 }}>Completion</th>', '<th style={{ width: 150 }}>{t("analytics.thCompletion", null, "Completion")}</th>')
]

for old, new in replacements:
    code = code.replace(old, new)

with open('src/pages/Analytics.jsx', 'w') as f:
    f.write(code)

print("Analytics modified successfully")
