import os

with open('src/vpages/Discover.jsx', 'r') as f:
    code = f.read()

replacements = [
    ('import { deadlineLabel, deadlineHours } from "../vutil";', 'import { deadlineLabel, deadlineHours } from "../vutil";\nimport { useTranslation } from "../i18n/index.jsx";'),
    ('function MktCard({ task, vtypes, onSave, onReport, onOpen }) {', 'function MktCard({ task, vtypes, onSave, onReport, onOpen }) {\n  const { t } = useTranslation();'),
    ('function FeaturedMission({ task, vtypes, onSave, onReport, onOpen }) {', 'function FeaturedMission({ task, vtypes, onSave, onReport, onOpen }) {\n  const { t } = useTranslation();'),
    ('export default function Discover() {', 'export default function Discover() {\n  const { t } = useTranslation();'),
    ('award" size={11} style={{ marginRight: 4 }} />Approved</span>', 'award" size={11} style={{ marginRight: 4 }} />{t("status.approved", null, "Approved")}</span>'),
    ('send" size={11} style={{ marginRight: 4 }} />Submitted</span>', 'send" size={11} style={{ marginRight: 4 }} />{t("status.submitted", null, "Submitted")}</span>'),
    ('checkCircle" size={11} style={{ marginRight: 4 }} />Accepted</span>', 'checkCircle" size={11} style={{ marginRight: 4 }} />{t("status.accepted", null, "Accepted")}</span>'),
    ('xCircle" size={11} style={{ marginRight: 4 }} />Rejected</span>', 'xCircle" size={11} style={{ marginRight: 4 }} />{t("status.rejected", null, "Rejected")}</span>'),
    ('zap" size={11} style={{ marginRight: 4 }} />Open</span>', 'zap" size={11} style={{ marginRight: 4 }} />{t("status.open", null, "Open")}</span>'),
    ('award" size={12} style={{ marginRight: 5 }} />Approved</span>', 'award" size={12} style={{ marginRight: 5 }} />{t("status.approved", null, "Approved")}</span>'),
    ('send" size={12} style={{ marginRight: 5 }} />Submitted</span>', 'send" size={12} style={{ marginRight: 5 }} />{t("status.submitted", null, "Submitted")}</span>'),
    ('checkCircle" size={12} style={{ marginRight: 5 }} />Accepted</span>', 'checkCircle" size={12} style={{ marginRight: 5 }} />{t("status.accepted", null, "Accepted")}</span>'),
    ('xCircle" size={12} style={{ marginRight: 5 }} />Rejected</span>', 'xCircle" size={12} style={{ marginRight: 5 }} />{t("status.rejected", null, "Rejected")}</span>'),
    ('zap" size={12} style={{ marginRight: 5 }} />Open</span>', 'zap" size={12} style={{ marginRight: 5 }} />{t("status.open", null, "Open")}</span>'),
    ('bolt" size={11} />Hot</span>', 'bolt" size={11} />{t("status.hot", null, "Hot")}</span>'),
    ('bolt" size={12} />Featured</span>', 'bolt" size={12} />{t("status.featured", null, "Featured")}</span>'),
    ('title="Report Mission"', 'title={t("actions.reportMission", null, "Report Mission")}'),
    ('title={task.saved ? "Saved" : "Save"}', 'title={task.saved ? t("actions.saved", null, "Saved") : t("actions.save", null, "Save")}'),
    ('title="Verified builder"', 'title={t("badge.verifiedBuilder", null, "Verified builder")}'),
    ('Verified builder</span>', '{t("badge.verifiedBuilder", null, "Verified builder")}</span>'),
    ('~{task.minutes}m', '~{task.minutes}{t("discover.minutesShort", null, "m")}'),
    ('~{task.minutes} min', '~{task.minutes} {t("discover.minutes", null, "min")}'),
    ('{task.spotsLeft} left', '{task.spotsLeft} {t("discover.spotsLeft", null, "left")}'),
    ('{task.spotsLeft} of {task.spotsTotal} spots left', '{task.spotsLeft} {t("discover.of", null, "of")} {task.spotsTotal} {t("discover.spotsLeftFull", null, "spots left")}'),
    ('on approval</span>', '{t("discover.onApproval", null, "on approval")}</span>'),
    ('on approval</div>', '{t("discover.onApproval", null, "on approval")}</div>'),
    ('task.myStatus === "completed" ? "View results" : task.myStatus === "submitted" ? "View submission" : (task.myStatus === "active" || task.myStatus === "applied") ? "Resume" : task.myStatus === "rejected" ? "View reason" : "View"', 'task.myStatus === "completed" ? t("actions.viewResults", null, "View results") : task.myStatus === "submitted" ? t("actions.viewSubmission", null, "View submission") : (task.myStatus === "active" || task.myStatus === "applied") ? t("actions.resume", null, "Resume") : task.myStatus === "rejected" ? t("actions.viewReason", null, "View reason") : t("actions.view", null, "View")'),
    ('task.myStatus === "completed" ? "View results" : task.myStatus === "submitted" ? "View submission" : (task.myStatus === "active" || task.myStatus === "applied") ? "Resume mission" : task.myStatus === "rejected" ? "View reason" : "Start validating"', 'task.myStatus === "completed" ? t("actions.viewResults", null, "View results") : task.myStatus === "submitted" ? t("actions.viewSubmission", null, "View submission") : (task.myStatus === "active" || task.myStatus === "applied") ? t("actions.resumeMission", null, "Resume mission") : task.myStatus === "rejected" ? t("actions.viewReason", null, "View reason") : t("actions.startValidating", null, "Start validating")'),
    ('window.prompt("Report this mission. Please tell us what\'s wrong:");', 'window.prompt(t("discover.reportPrompt", null, "Report this mission. Please tell us what\'s wrong:"));'),
    ('alert("Reported. Our admin team will review it promptly.");', 'alert(t("discover.reportSuccess", null, "Reported. Our admin team will review it promptly."));'),
    ('alert("Failed to report: " + (e.message || "Unknown error"));', 'alert(t("discover.reportFail", null, "Failed to report: ") + (e.message || t("errors.unknown", null, "Unknown error")));'),
    ('<div className="muted">Loading…</div>', '<div className="muted">{t("actions.loading", null, "Loading…")}</div>'),
    ('Mission marketplace', '{t("discover.eyebrow", null, "Mission marketplace")}'),
    ('Find your next mission', '{t("discover.headline", null, "Find your next mission")}'),
    ('{data.total} open missions matched to your expertise · paid on approval.', '{data.total} {t("discover.sub1", null, "open missions matched to your expertise · ")} {t("discover.sub2", null, "paid on approval.")}'),
    ('placeholder="Search products, companies, or what you\'ll validate…"', 'placeholder={t("discover.searchPlaceholder", null, "Search products, companies, or what you\'ll validate…")}'),
    ('<span className="cc">{c.count} open</span>', '<span className="cc">{c.count} {t("status.open", null, "open")}</span>'),
    ('{filtersActive ? "Results" : "All missions"}', '{filtersActive ? t("discover.results", null, "Results") : t("discover.allMissions", null, "All missions")}'),
    ('Filters{filtersActive ? " ·" : ""}', '{t("discover.filters", null, "Filters")}{filtersActive ? " ·" : ""}'),
    ('<span className="faint" style={{ fontSize: 12 }}>Sort</span>', '<span className="faint" style={{ fontSize: 12 }}>{t("discover.sort", null, "Sort")}</span>'),
    ('<b style={{ fontSize: 14, fontWeight: 800 }}>Filters</b>', '<b style={{ fontSize: 14, fontWeight: 800 }}>{t("discover.filters", null, "Filters")}</b>'),
    ('Clear all</button>', '{t("actions.clearAll", null, "Clear all")}</button>'),
    ('<span className="lbl">Validation type</span>', '<span className="lbl">{t("discover.validationType", null, "Validation type")}</span>'),
    ('<span className="lbl">Reward</span>', '<span className="lbl">{t("discover.reward", null, "Reward")}</span>'),
    ('<span className="lbl">Time required</span>', '<span className="lbl">{t("discover.timeRequired", null, "Time required")}</span>'),
    ('<span className="lbl">Minimum match · {minMatch}%</span>', '<span className="lbl">{t("discover.minMatch", null, "Minimum match")} · {minMatch}%</span>'),
    ('Verified builders only', '{t("discover.verifiedOnly", null, "Verified builders only")}'),
    ('title="No missions match"', 'title={t("discover.noMatchTitle", null, "No missions match")}'),
    ('body="Try widening your filters or clearing your search — new missions are posted throughout the day."', 'body={t("discover.noMatchBody", null, "Try widening your filters or clearing your search — new missions are posted throughout the day.")}'),
    ('Clear filters</button>', '{t("actions.clearFilters", null, "Clear filters")}</button>'),
    ('Load more missions</button>', '{t("actions.loadMore", null, "Load more missions")}</button>')
]

for old, new in replacements:
    code = code.replace(old, new)

with open('src/vpages/Discover.jsx', 'w') as f:
    f.write(code)

print("Discover modified successfully")
