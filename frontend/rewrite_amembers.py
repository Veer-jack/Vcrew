import os

with open('src/apages/AMembers.jsx', 'r') as f:
    code = f.read()

replacements = [
    ('import { aapi } from "../aapi/client";', 'import { aapi } from "../aapi/client";\nimport { useTranslation } from "../i18n/index.jsx";'),
    ('const TABS = [\n  { k: "all", l: "All" },\n  { k: "builder", l: "Builders" },\n  { k: "validator", l: "Validators" },\n  { k: "suspended", l: "Suspended" },\n];', '// TABS defined in component'),
    ('export default function AMembers() {', 'export default function AMembers() {\n  const { t } = useTranslation();\n  const TABS = [\n    { k: "all", l: t("admin.tabAll", null, "All") },\n    { k: "builder", l: t("admin.tabBuilders", null, "Builders") },\n    { k: "validator", l: t("admin.tabValidators", null, "Validators") },\n    { k: "suspended", l: t("admin.tabSuspended", null, "Suspended") },\n  ];'),
    ('Couldn\'t update status', 't("admin.errUpdateStatus", null, "Couldn\'t update status")'),
    ('<span className="eyebrow">Operations</span>', '<span className="eyebrow">{t("admin.operations", null, "Operations")}</span>'),
    ('<h1>Members</h1>', '<h1>{t("admin.membersTitle", null, "Members")}</h1>'),
    ('<p className="lead">Search builders and validators, and manage account status.</p>', '<p className="lead">{t("admin.membersLead", null, "Search builders and validators, and manage account status.")}</p>'),
    ('placeholder="Search name, email, org…"', 'placeholder={t("admin.searchMembersPlaceholder", null, "Search name, email, org…")}'),
    ('<th>Name</th>', '<th>{t("admin.thName", null, "Name")}</th>'),
    ('<th>Type</th>', '<th>{t("admin.thType", null, "Type")}</th>'),
    ('<th>Org / handle</th>', '<th>{t("admin.thOrgHandle", null, "Org / handle")}</th>'),
    ('<th>Status</th>', '<th>{t("admin.thStatus", null, "Status")}</th>'),
    ('<th style={{ textAlign: "right" }}>Balance</th>', '<th style={{ textAlign: "right" }}>{t("admin.thBalance", null, "Balance")}</th>'),
    ('Loading…</td></tr>', '{t("actions.loading", null, "Loading…")}</td></tr>'),
    ('{tab === "suspended" && !q ? "No accounts are suspended." : "No members match your search."}', '{tab === "suspended" && !q ? t("admin.noSuspended", null, "No accounts are suspended.") : t("admin.noMembersMatch", null, "No members match your search.")}'),
    ('{m.type === "builder" ? "Builder" : "Validator"}', '{m.type === "builder" ? t("admin.builder", null, "Builder") : t("admin.validator", null, "Validator")}'),
    ('{m.status === "active" ? "Active" : "Suspended"}', '{m.status === "active" ? t("admin.active", null, "Active") : t("admin.suspended", null, "Suspended")}'),
    ('{m.status === "active" ? "Suspend" : "Reactivate"}', '{m.status === "active" ? t("admin.suspend", null, "Suspend") : t("admin.reactivate", null, "Reactivate")}'),
    ('{loadingMore ? "Loading…" : "Load more members"}', '{loadingMore ? t("actions.loading", null, "Loading…") : t("actions.loadMoreMembers", null, "Load more members")}')
]

for old, new in replacements:
    code = code.replace(old, new)

with open('src/apages/AMembers.jsx', 'w') as f:
    f.write(code)

print("AMembers modified successfully")
