const fs = require('fs');

let code = fs.readFileSync('src/vpages/Discover.jsx', 'utf8');

code = code.replace(
  'import { deadlineLabel, deadlineHours } from "../vutil";',
  'import { deadlineLabel, deadlineHours } from "../vutil";\nimport { useTranslation } from "../i18n/index.jsx";'
);

code = code.replace(
  'function MktCard({ task, vtypes, onSave, onReport, onOpen }) {',
  'function MktCard({ task, vtypes, onSave, onReport, onOpen }) {\n  const { t } = useTranslation();'
);

code = code.replace(
  'function FeaturedMission({ task, vtypes, onSave, onReport, onOpen }) {',
  'function FeaturedMission({ task, vtypes, onSave, onReport, onOpen }) {\n  const { t } = useTranslation();'
);

code = code.replace(
  'export default function Discover() {',
  'export default function Discover() {\n  const { t } = useTranslation();'
);

code = code.replace(
  'award" size={11} style={{ marginRight: 4 }} />Approved</span>',
  'award" size={11} style={{ marginRight: 4 }} />{t("status.approved", null, "Approved")}</span>'
);

code = code.replace(
  'send" size={11} style={{ marginRight: 4 }} />Submitted</span>',
  'send" size={11} style={{ marginRight: 4 }} />{t("status.submitted", null, "Submitted")}</span>'
);

code = code.replace(
  'checkCircle" size={11} style={{ marginRight: 4 }} />Accepted</span>',
  'checkCircle" size={11} style={{ marginRight: 4 }} />{t("status.accepted", null, "Accepted")}</span>'
);

code = code.replace(
  'xCircle" size={11} style={{ marginRight: 4 }} />Rejected</span>',
  'xCircle" size={11} style={{ marginRight: 4 }} />{t("status.rejected", null, "Rejected")}</span>'
);

code = code.replace(
  'zap" size={11} style={{ marginRight: 4 }} />Open</span>',
  'zap" size={11} style={{ marginRight: 4 }} />{t("status.open", null, "Open")}</span>'
);

code = code.replace(
  'award" size={12} style={{ marginRight: 5 }} />Approved</span>',
  'award" size={12} style={{ marginRight: 5 }} />{t("status.approved", null, "Approved")}</span>'
);

code = code.replace(
  'send" size={12} style={{ marginRight: 5 }} />Submitted</span>',
  'send" size={12} style={{ marginRight: 5 }} />{t("status.submitted", null, "Submitted")}</span>'
);

code = code.replace(
  'checkCircle" size={12} style={{ marginRight: 5 }} />Accepted</span>',
  'checkCircle" size={12} style={{ marginRight: 5 }} />{t("status.accepted", null, "Accepted")}</span>'
);

code = code.replace(
  'xCircle" size={12} style={{ marginRight: 5 }} />Rejected</span>',
  'xCircle" size={12} style={{ marginRight: 5 }} />{t("status.rejected", null, "Rejected")}</span>'
);

code = code.replace(
  'zap" size={12} style={{ marginRight: 5 }} />Open</span>',
  'zap" size={12} style={{ marginRight: 5 }} />{t("status.open", null, "Open")}</span>'
);

code = code.replace(
  'bolt" size={11} />Hot</span>',
  'bolt" size={11} />{t("status.hot", null, "Hot")}</span>'
);

code = code.replace(
  'bolt" size={12} />Featured</span>',
  'bolt" size={12} />{t("status.featured", null, "Featured")}</span>'
);

code = code.replace(
  'title="Report Mission"',
  'title={t("actions.reportMission", null, "Report Mission")}'
);
code = code.replace(
  'title="Report Mission"',
  'title={t("actions.reportMission", null, "Report Mission")}'
);

code = code.replace(
  'title={task.saved ? "Saved" : "Save"}',
  'title={task.saved ? t("actions.saved", null, "Saved") : t("actions.save", null, "Save")}'
);

code = code.replace(
  'title="Verified builder"',
  'title={t("badge.verifiedBuilder", null, "Verified builder")}'
);

code = code.replace(
  'Verified builder</span>',
  '{t("badge.verifiedBuilder", null, "Verified builder")}</span>'
);

code = code.replace(
  '~{task.minutes}m',
  '~{task.minutes}{t("discover.minutesShort", null, "m")}'
);

code = code.replace(
  '~{task.minutes} min',
  '~{task.minutes} {t("discover.minutes", null, "min")}'
);

code = code.replace(
  '{task.spotsLeft} left',
  '{task.spotsLeft} {t("discover.spotsLeft", null, "left")}'
);

code = code.replace(
  '{task.spotsLeft} of {task.spotsTotal} spots left',
  '{task.spotsLeft} {t("discover.of", null, "of")} {task.spotsTotal} {t("discover.spotsLeftFull", null, "spots left")}'
);

code = code.replace(
  'on approval</span>',
  '{t("discover.onApproval", null, "on approval")}</span>'
);

code = code.replace(
  'on approval</div>',
  '{t("discover.onApproval", null, "on approval")}</div>'
);

code = code.replace(
  'task.myStatus === "completed" ? "View results" : task.myStatus === "submitted" ? "View submission" : (task.myStatus === "active" || task.myStatus === "applied") ? "Resume" : task.myStatus === "rejected" ? "View reason" : "View"',
  'task.myStatus === "completed" ? t("actions.viewResults", null, "View results") : task.myStatus === "submitted" ? t("actions.viewSubmission", null, "View submission") : (task.myStatus === "active" || task.myStatus === "applied") ? t("actions.resume", null, "Resume") : task.myStatus === "rejected" ? t("actions.viewReason", null, "View reason") : t("actions.view", null, "View")'
);

code = code.replace(
  'task.myStatus === "completed" ? "View results" : task.myStatus === "submitted" ? "View submission" : (task.myStatus === "active" || task.myStatus === "applied") ? "Resume mission" : task.myStatus === "rejected" ? "View reason" : "Start validating"',
  'task.myStatus === "completed" ? t("actions.viewResults", null, "View results") : task.myStatus === "submitted" ? t("actions.viewSubmission", null, "View submission") : (task.myStatus === "active" || task.myStatus === "applied") ? t("actions.resumeMission", null, "Resume mission") : task.myStatus === "rejected" ? t("actions.viewReason", null, "View reason") : t("actions.startValidating", null, "Start validating")'
);

code = code.replace(
  'window.prompt("Report this mission. Please tell us what\'s wrong:");',
  'window.prompt(t("discover.reportPrompt", null, "Report this mission. Please tell us what\\'s wrong:"));'
);

code = code.replace(
  'alert("Reported. Our admin team will review it promptly.");',
  'alert(t("discover.reportSuccess", null, "Reported. Our admin team will review it promptly."));'
);

code = code.replace(
  'alert("Failed to report: " + (e.message || "Unknown error"));',
  'alert(t("discover.reportFail", null, "Failed to report: ") + (e.message || t("errors.unknown", null, "Unknown error")));'
);

code = code.replace(
  '<div className="muted">Loading…</div>',
  '<div className="muted">{t("actions.loading", null, "Loading…")}</div>'
);

code = code.replace(
  'Mission marketplace',
  '{t("discover.eyebrow", null, "Mission marketplace")}'
);

code = code.replace(
  'Find your next mission',
  '{t("discover.headline", null, "Find your next mission")}'
);

code = code.replace(
  '{data.total} open missions matched to your expertise · paid on approval.',
  '{data.total} {t("discover.sub1", null, "open missions matched to your expertise · ")} {t("discover.sub2", null, "paid on approval.")}'
);

code = code.replace(
  'placeholder="Search products, companies, or what you\'ll validate…"',
  'placeholder={t("discover.searchPlaceholder", null, "Search products, companies, or what you\\'ll validate…")}'
);

code = code.replace(
  '<span className="cc">{c.count} open</span>',
  '<span className="cc">{c.count} {t("status.open", null, "open")}</span>'
);

code = code.replace(
  '{filtersActive ? "Results" : "All missions"}',
  '{filtersActive ? t("discover.results", null, "Results") : t("discover.allMissions", null, "All missions")}'
);

code = code.replace(
  'Filters{filtersActive ? " ·" : ""}',
  '{t("discover.filters", null, "Filters")}{filtersActive ? " ·" : ""}'
);

code = code.replace(
  '<span className="faint" style={{ fontSize: 12 }}>Sort</span>',
  '<span className="faint" style={{ fontSize: 12 }}>{t("discover.sort", null, "Sort")}</span>'
);

code = code.replace(
  '<b style={{ fontSize: 14, fontWeight: 800 }}>Filters</b>',
  '<b style={{ fontSize: 14, fontWeight: 800 }}>{t("discover.filters", null, "Filters")}</b>'
);

code = code.replace(
  'Clear all</button>',
  '{t("actions.clearAll", null, "Clear all")}</button>'
);

code = code.replace(
  '<span className="lbl">Validation type</span>',
  '<span className="lbl">{t("discover.validationType", null, "Validation type")}</span>'
);

code = code.replace(
  '<span className="lbl">Reward</span>',
  '<span className="lbl">{t("discover.reward", null, "Reward")}</span>'
);

code = code.replace(
  '<span className="lbl">Time required</span>',
  '<span className="lbl">{t("discover.timeRequired", null, "Time required")}</span>'
);

code = code.replace(
  '<span className="lbl">Minimum match · {minMatch}%</span>',
  '<span className="lbl">{t("discover.minMatch", null, "Minimum match")} · {minMatch}%</span>'
);

code = code.replace(
  'Verified builders only',
  '{t("discover.verifiedOnly", null, "Verified builders only")}'
);

code = code.replace(
  'title="No missions match"',
  'title={t("discover.noMatchTitle", null, "No missions match")}'
);

code = code.replace(
  'body="Try widening your filters or clearing your search — new missions are posted throughout the day."',
  'body={t("discover.noMatchBody", null, "Try widening your filters or clearing your search — new missions are posted throughout the day.")}'
);

code = code.replace(
  'Clear filters</button>',
  '{t("actions.clearFilters", null, "Clear filters")}</button>'
);

code = code.replace(
  'Load more missions</button>',
  '{t("actions.loadMore", null, "Load more missions")}</button>'
);

fs.writeFileSync('src/vpages/Discover.jsx', code);
console.log("Discover modified successfully");
