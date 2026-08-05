import os

with open('src/pages/Missions.jsx', 'r') as f:
    code = f.read()

replacements = [
    ('import { api } from "../api/client";', 'import { api } from "../api/client";\nimport { useTranslation } from "../i18n/index.jsx";'),
    ('const TABS = [\n  { k: "active", l: "Active" },\n  { k: "draft", l: "Draft" },\n  { k: "closed", l: "Closed" },\n  { k: "completed", l: "Completed" },\n  { k: "archived", l: "Archived" },\n];', 
     '// Tabs defined dynamically inside component to use translations'),
    ('export default function Missions() {', 'export default function Missions() {\n  const { t } = useTranslation();\n  const TABS = [\n    { k: "active", l: t("missions.tabActive", null, "Active") },\n    { k: "draft", l: t("missions.tabDraft", null, "Draft") },\n    { k: "closed", l: t("missions.tabClosed", null, "Closed") },\n    { k: "completed", l: t("missions.tabCompleted", null, "Completed") },\n    { k: "archived", l: t("missions.tabArchived", null, "Archived") }\n  ];'),
    ('if (window.confirm("Are you sure you want to delete this mission?")) {', 'if (window.confirm(t("missions.deleteConfirm", null, "Are you sure you want to delete this mission?"))) {'),
    ('setToast("Mission deleted successfully");', 'setToast(t("missions.deleteSuccess", null, "Mission deleted successfully"));'),
    ('<span className="eyebrow">Mission management</span>', '<span className="eyebrow">{t("missions.eyebrow", null, "Mission management")}</span>'),
    ('<h1>Missions</h1>', '<h1>{t("missions.title", null, "Missions")}</h1>'),
    ('<p className="lead">Every study you\'ve run, in flight, or drafted.</p>', '<p className="lead">{t("missions.lead", null, "Every study you\'ve run, in flight, or drafted.")}</p>'),
    ('Create Mission</Btn>', '{t("actions.createMission", null, "Create Mission")}</Btn>'),
    ('placeholder="Search missions…"', 'placeholder={t("missions.searchPlaceholder", null, "Search missions…")}'),
    ('<div className="muted" style={{ padding: 24 }}>Loading…</div>', '<div className="muted" style={{ padding: 24 }}>{t("actions.loading", null, "Loading…")}</div>'),
    ('title={`No ${tab} missions`}', 'title={`${t("missions.no", null, "No")} ${tab} ${t("missions.missionsLower", null, "missions")}`}'),
    ('Create your first mission</Btn>', '{t("actions.createFirstMission", null, "Create your first mission")}</Btn>'),
    ('{tab === "completed" ? "Completed missions will appear here once they wrap." : "Nothing here yet."}</Empty>', '{tab === "completed" ? t("missions.completedEmpty", null, "Completed missions will appear here once they wrap.") : t("missions.emptyDefault", null, "Nothing here yet.")}</Empty>'),
    ('Load more missions</Btn>', '{t("actions.loadMore", null, "Load more missions")}</Btn>')
]

for old, new in replacements:
    code = code.replace(old, new)

with open('src/pages/Missions.jsx', 'w') as f:
    f.write(code)

print("Missions modified successfully")
